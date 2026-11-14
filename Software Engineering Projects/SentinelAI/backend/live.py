"""Single-host continuous capture: ephemeral previews and durable, ordered clips.

Original previews are available only to reviewers. Neither preview is stored on
disk. Actual clips use the same encrypted evidence/analysis path as uploads.
"""
from datetime import datetime, timedelta, timezone
import hashlib
import threading
import time
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import Field
from starlette.concurrency import run_in_threadpool
from .db import now, uid
from .schemas import Input
from .security import user, require, REVIEWERS
from .security import token_hash
from .submission import Submission, accept_submission

router = APIRouter(prefix='/api/live')
MAX_SECONDS = 1800
MAX_CLIP_BYTES = 12 * 1024 * 1024
MAX_SESSION_BYTES = 500 * 1024 * 1024
MAX_PENDING = 12
FRAME_TTL = 5


class Start(Input):
    title: str = Field(min_length=5, max_length=140)
    consent: bool
    test_recording: bool = False


class Stop(Input):
    reason: str = Field(default='Stopped by operator', min_length=3, max_length=240)


class Previews:
    def __init__(self):
        self.lock = threading.Lock()
        self.frames = {}
        self.reads = {}
        self.peers = {}

    def clear(self, ident):
        with self.lock:
            self.frames.pop(ident, None)
            self.peers = {k: v for k, v in self.peers.items() if v['session_id'] != ident}

    def current(self, ident):
        with self.lock:
            for key, item in list(self.frames.items()):
                if time.monotonic() - item['clock'] > FRAME_TTL:
                    del self.frames[key]
            return self.frames.get(ident)

    def audit_due(self, actor, ident, view):
        with self.lock:
            clock = time.monotonic()
            self.reads = {k: v for k, v in self.reads.items() if clock-v < 60}
            key = (actor, ident, view)
            if key in self.reads:
                return False
            self.reads[key] = clock
            return True


def visible(actor, alias='s'):
    if actor['role'] in REVIEWERS:
        return '1=1', []
    # A responder may inspect the associated alert's case, not unrelated live
    # intervals belonging to the same session.
    return f'{alias}.owner_id=?', [actor['id']]


def access(con, actor, ident, owner=False):
    clause, params = visible(actor)
    row = con.execute(f"SELECT s.* FROM live_sessions s WHERE s.id=? AND s.status!='deleted' AND {clause}", [ident, *params]).fetchone()
    if not row:
        raise HTTPException(404, 'Live session not found or access has not been granted.')
    if owner and row['owner_id'] != actor['id']:
        raise HTTPException(403, 'Only the broadcasting account can send frames or clips.')
    return dict(row)


def end_session(con, db, previews, ident, actor, reason, status='ended'):
    changed = con.execute("UPDATE live_sessions SET status=?,ended_at=?,stop_reason=? WHERE id=? AND status='active'", (status, now(), reason, ident)).rowcount
    previews.clear(ident)
    if changed:
        db.audit(con, actor, 'live.' + status, ident, {'reason': reason})


def sweep(con, db, previews, restart=False):
    at = datetime.now(timezone.utc)
    for row in con.execute("SELECT * FROM live_sessions WHERE status='active'").fetchall():
        age = (at-datetime.fromisoformat(row['created_at'])).total_seconds()
        quiet = (at-datetime.fromisoformat(row['last_seen_at'])).total_seconds()
        if restart or age > MAX_SECONDS + 30 or quiet > 60:
            reason = 'Server restarted' if restart else 'Session time limit reached' if age > MAX_SECONDS else 'No preview received for 60 seconds'
            end_session(con, db, previews, row['id'], None, reason, 'interrupted')


def describe(con, previews, row):
    value = dict(row)
    value['elapsed_seconds'] = max(0, (datetime.now(timezone.utc)-datetime.fromisoformat(row['created_at'])).total_seconds())
    frame = previews.current(row['id']) if row['status'] == 'active' else None
    value['preview_age_seconds'] = round(time.monotonic()-frame['clock'], 2) if frame else None
    value['preview_at'] = frame['received_at'] if frame else None
    value['segments'] = [dict(r) for r in con.execute("SELECT l.sequence,l.case_id,l.start_seconds,l.end_seconds,l.gap_seconds,l.received_at,l.lane,c.processing_status,c.processing_error,c.risk_label,c.status,c.duration,c.assessment,(SELECT COUNT(*) FROM events e WHERE e.case_id=c.id AND e.source!='synthetic') AS event_count FROM live_segments l JOIN cases c ON c.id=l.case_id WHERE l.session_id=? ORDER BY l.sequence DESC", (row['id'],))]
    import json
    for segment in value['segments']:
        assessment = json.loads(segment.pop('assessment'))
        segment['vision'] = assessment.get('vision')
        segment['speech'] = assessment.get('speech')
        segment['events'] = [dict(e) for e in con.execute('SELECT id,start,end,title,detail,source,confidence FROM events WHERE case_id=? ORDER BY start', (segment['case_id'],))]
        segment['review_video'] = next((dict(e) for e in con.execute("SELECT id,kind FROM evidence WHERE case_id=? AND kind='live_review'", (segment['case_id'],))), None)
    value['pending'] = sum(r['processing_status'] in ('queued', 'processing') for r in value['segments'])
    value['can_broadcast'] = row['status'] == 'active'
    return value


@router.get('')
def listing(request: Request, page: int = Query(1, ge=1), actor=Depends(user)):
    db, previews = request.app.state.db, request.app.state.previews
    with db.transaction() as con:
        sweep(con, db, previews)
        clause, params = visible(actor)
        total = con.execute(f"SELECT COUNT(*) FROM live_sessions s WHERE s.status!='deleted' AND {clause}", params).fetchone()[0]
        rows = con.execute(f"SELECT s.* FROM live_sessions s WHERE s.status!='deleted' AND {clause} ORDER BY s.created_at DESC LIMIT 20 OFFSET ?", [*params, (page-1)*20]).fetchall()
        if previews.audit_due(actor['id'], 'sessions', 'list'):
            db.audit(con, actor['id'], 'live.list', 'live_sessions', {'page': page})
        return {'items': [describe(con, previews, r) for r in rows], 'total': total, 'page': page,
                'limits': {'session_seconds': MAX_SECONDS, 'clip_seconds': 20, 'vision_seconds': 5, 'pending_clips': MAX_PENDING, 'preview_ttl_seconds': FRAME_TTL}}


@router.post('', status_code=201)
def start(body: Start, request: Request, actor=Depends(user)):
    require(actor, {'citizen', 'officer', *REVIEWERS})
    if not body.consent:
        raise HTTPException(422, 'Confirm authorization for recording and clear live access by authorized reviewers.')
    db, previews = request.app.state.db, request.app.state.previews
    with db.transaction() as con:
        sweep(con, db, previews)
        if con.execute("SELECT 1 FROM live_sessions WHERE owner_id=? AND status='active'", (actor['id'],)).fetchone():
            raise HTTPException(409, 'This account already has an active session. Open and stop it before starting another.')
        if con.execute("SELECT COUNT(*) FROM live_sessions WHERE status='active'").fetchone()[0] >= 3:
            raise HTTPException(429, 'Three sessions are already active. Stop one before starting another.')
        ident, stamp = uid('live_'), now()
        con.execute('INSERT INTO live_sessions(id,owner_id,title,created_at,last_seen_at,test_recording) VALUES (?,?,?,?,?,?)', (ident, actor['id'], body.title, stamp, stamp, int(body.test_recording or request.app.state.config.test_uploads or actor['demo'])))
        db.audit(con, actor['id'], 'live.started', ident, {'consent': True, 'clear_preview_roles': sorted(REVIEWERS)})
        return describe(con, previews, con.execute('SELECT * FROM live_sessions WHERE id=?', (ident,)).fetchone())


@router.get('/{ident}')
def detail(ident: str, request: Request, actor=Depends(user)):
    db, previews = request.app.state.db, request.app.state.previews
    with db.transaction() as con:
        sweep(con, db, previews)
        row = access(con, actor, ident)
        if previews.audit_due(actor['id'], ident, 'detail'):
            db.audit(con, actor['id'], 'live.view', ident)
        return describe(con, previews, row)


@router.post('/{ident}/stop')
def stop(ident: str, body: Stop, request: Request, actor=Depends(user)):
    db, previews = request.app.state.db, request.app.state.previews
    with db.transaction() as con:
        row = access(con, actor, ident)
        if row['owner_id'] != actor['id']:
            require(actor, REVIEWERS)
        end_session(con, db, previews, ident, actor['id'], body.reason)
        status=con.execute('SELECT status FROM live_sessions WHERE id=?', (ident,)).fetchone()[0]
    request.app.state.streaming.close_session(ident)
    return {'status':status}


async def bounded_body(request, limit):
    chunks, size = [], 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > limit:
            raise HTTPException(413, 'This live upload exceeds its size limit. Stop and lower capture resolution.')
        chunks.append(chunk)
    return b''.join(chunks)


def jpeg_dimensions(data):
    """Read JPEG SOF dimensions before any pixel allocation; reject other codecs."""
    if data[:2] != b'\xff\xd8':
        raise HTTPException(415, 'A JPEG preview is required.')
    offset = 2
    while offset+4 <= len(data):
        if data[offset] != 255:
            break
        while offset < len(data) and data[offset] == 255:
            offset += 1
        if offset >= len(data):
            break
        marker = data[offset]
        offset += 1
        if marker in (0xD9, 0xDA):
            break
        length = int.from_bytes(data[offset:offset+2], 'big')
        if length < 2 or offset+length > len(data):
            break
        if marker in (0xC0, 0xC1, 0xC2):
            if length < 8:
                break
            height = int.from_bytes(data[offset+3:offset+5], 'big')
            width = int.from_bytes(data[offset+5:offset+7], 'big')
            if not (1 <= width <= 1280 and 1 <= height <= 720):
                raise HTTPException(413, 'Preview dimensions must not exceed 1280 × 720.')
            return width, height
        offset += length
    raise HTTPException(415, 'The JPEG preview is malformed.')


def preview_copies(data):
    import cv2
    import numpy as np
    width, height = jpeg_dimensions(data)
    pixels = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if pixels is None or pixels.shape[:2] != (height, width):
        raise HTTPException(415, 'The JPEG preview could not be decoded.')
    # Re-encoding drops uploader metadata. The full-frame protected view makes
    # no claim to perfect face detection. Clear copy never leaves reviewer access.
    size = (min(640, width), max(1, round(height * min(1, 640/width))))
    pixels = cv2.resize(pixels, size)
    small = cv2.resize(pixels, (16, 9), interpolation=cv2.INTER_AREA)
    protected = cv2.GaussianBlur(cv2.resize(small, size), (31, 31), 0)
    return {key: cv2.imencode('.jpg', value, [cv2.IMWRITE_JPEG_QUALITY, 70])[1].tobytes() for key, value in [('clear', pixels), ('protected', protected)]}


@router.post('/{ident}/frame')
async def publish_frame(ident: str, request: Request, sequence: int = Query(ge=1), actor=Depends(user)):
    db, previews = request.app.state.db, request.app.state.previews
    with db.connect() as con:
        row = access(con, actor, ident, owner=True)
        if row['status'] != 'active':
            raise HTTPException(409, 'This live session has ended.')
    frame = previews.current(ident)
    if frame and time.monotonic()-frame['clock'] < .35:
        raise HTTPException(429, 'Preview rate exceeded; wait before sending another frame.')
    data = await bounded_body(request, 300 * 1024)
    copies = await run_in_threadpool(preview_copies, data)
    with db.transaction() as con:
        sweep(con, db, previews)
        row = access(con, actor, ident, owner=True)
        if row['status'] != 'active':
            raise HTTPException(409, 'This live session has ended.')
        stamp = now()
        with previews.lock:
            previous = previews.frames.get(ident)
            if previous and sequence <= previous['sequence']:
                raise HTTPException(409, 'Preview sequence must increase.')
            previews.frames[ident] = {**copies, 'sequence': sequence, 'received_at': stamp, 'clock': time.monotonic()}
        con.execute('UPDATE live_sessions SET last_seen_at=? WHERE id=?', (stamp, ident))
        if previews.audit_due(actor['id'], ident, 'publish'):
            db.audit(con, actor['id'], 'live.preview_received', ident)
    return {'sequence': sequence, 'received_at': stamp}


@router.get('/{ident}/frame')
def read_frame(ident: str, request: Request, view: str = 'protected', actor=Depends(user)):
    if view not in ('clear', 'protected'):
        raise HTTPException(422, 'Choose a clear or protected preview.')
    if view == 'clear':
        require(actor, REVIEWERS)
    db, previews = request.app.state.db, request.app.state.previews
    with db.transaction() as con:
        row = access(con, actor, ident)
        frame = previews.current(ident) if row['status'] == 'active' else None
        if not frame:
            return Response(status_code=204)
        if previews.audit_due(actor['id'], ident, view):
            db.audit(con, actor['id'], 'live.preview_access', ident, {'view': view, 'audit_interval_seconds': 60})
        return Response(frame[view], media_type='image/jpeg', headers={'X-Frame-Received-At': frame['received_at'], 'X-Frame-Sequence': str(frame['sequence'])})


@router.post('/{ident}/segments/{sequence}', status_code=201)
async def receive_segment(ident: str, sequence: int, request: Request,
                          start_seconds: float = Query(ge=0, le=MAX_SECONDS, allow_inf_nan=False),
                          end_seconds: float = Query(gt=0, le=MAX_SECONDS+5, allow_inf_nan=False),
                          extension: str = '.webm', lane: str = 'context', actor=Depends(user)):
    if lane not in ('vision', 'context'):
        raise HTTPException(422, 'Choose a vision or context recording lane.')
    if sequence < 1 or sequence > 500 or not .2 <= end_seconds-start_seconds <= (7 if lane == 'vision' else 30):
        raise HTTPException(422, 'Clips must be 0.2–30 seconds with a valid sequence number.')
    db, previews = request.app.state.db, request.app.state.previews
    with db.connect() as con:
        access(con, actor, ident, owner=True)
    data = await bounded_body(request, MAX_CLIP_BYTES)
    digest = hashlib.sha256(data).hexdigest()
    with db.transaction() as con:
        row = access(con, actor, ident, owner=True)
        previous = con.execute('SELECT * FROM live_segments WHERE session_id=? AND sequence=?', (ident, sequence)).fetchone()
        if previous:
            if previous['sha256'] != digest or previous['start_seconds'] != start_seconds or previous['end_seconds'] != end_seconds or previous['lane'] != lane:
                raise HTTPException(409, 'This sequence already contains different evidence or timestamps.')
            return {'id': previous['case_id'], 'sequence': sequence, 'duplicate': True}
        if sequence != row['next_sequence']:
            raise HTTPException(409, f"Send clip {row['next_sequence']} first; no interval may be silently skipped.")
        at = datetime.now(timezone.utc)
        created = datetime.fromisoformat(row['created_at'])
        deadline = datetime.fromisoformat(row['ended_at']) if row['ended_at'] else at
        if end_seconds > (deadline-created).total_seconds()+5 or at-created > timedelta(hours=24):
            raise HTTPException(422, 'Clip timing is outside the session or the 24-hour recovery period.')
        last = con.execute('SELECT end_seconds FROM live_segments WHERE session_id=? AND lane=? ORDER BY sequence DESC LIMIT 1', (ident,lane)).fetchone()
        gap = start_seconds-(last[0] if last else 0)
        if gap < -.1:
            raise HTTPException(422, 'Clip times overlap or move backwards.')
        pending = con.execute("SELECT COUNT(*) FROM live_segments l JOIN jobs j ON j.case_id=l.case_id WHERE j.status IN ('queued','running')").fetchone()[0]
        if pending >= MAX_PENDING:
            raise HTTPException(429, 'Analysis has reached its 12-clip backlog limit. Recording must pause; retry this clip when the queue drains.')
        if row['bytes_received']+len(data) > MAX_SESSION_BYTES:
            raise HTTPException(413, 'This session reached its 500 MB limit. Stop and start a new session later.')
        metadata = Submission(title=f"{row['title']} · {lane} {sequence}", consent=True, test_recording=bool(row['test_recording']), captured_at=(created+timedelta(seconds=start_seconds)).isoformat())
        result = accept_submission(con, db, request.app.state.storage, actor, metadata, data, extension, force_test=bool(row['test_recording']))
        # Content deduplication must not relabel an older genuine recording.
        if result['duplicate'] and row['test_recording']:
            existing = con.execute('SELECT test_recording FROM cases WHERE id=?', (result['id'],)).fetchone()
            if not existing[0]:
                raise HTTPException(409, 'This clip matches an existing non-test case; it cannot be reused in a test session.')
        con.execute('INSERT INTO live_segments(session_id,sequence,case_id,sha256,start_seconds,end_seconds,gap_seconds,received_at,lane) VALUES (?,?,?,?,?,?,?,?,?)', (ident, sequence, result['id'], digest, start_seconds, end_seconds, max(0, gap), now(), lane))
        con.execute('UPDATE live_sessions SET next_sequence=next_sequence+1,bytes_received=bytes_received+? WHERE id=?', (len(data), ident))
        db.audit(con, actor['id'], 'live.clip_received', ident, {'sequence': sequence, 'case_id': result['id'], 'start_seconds': start_seconds, 'end_seconds': end_seconds, 'gap_seconds': max(0, gap), 'timing_source': 'browser_reported'})
        request.app.state.processor.wake_event.set()
        return {**result, 'sequence': sequence}


class Offer(Input):
    sdp: str = Field(min_length=20, max_length=64000)


def live_peers(con, previews):
    """Caller holds the preview lock. Lease revocation is polled by broadcaster."""
    clock = time.monotonic()
    for key, peer in list(previews.peers.items()):
        account = con.execute("SELECT u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1", (peer['token'],now())).fetchone()
        active = con.execute("SELECT 1 FROM live_sessions WHERE id=? AND status='active'", (peer['session_id'],)).fetchone()
        if clock-peer['seen'] > 15 or not account or account['role'] not in REVIEWERS or not active:
            del previews.peers[key]


@router.post('/{ident}/watch', status_code=201)
def watch(ident: str, body: Offer, request: Request, actor=Depends(user)):
    require(actor, REVIEWERS)
    db, previews = request.app.state.db, request.app.state.previews
    with db.transaction() as con:
        row = access(con, actor, ident)
        if row['status'] != 'active':
            raise HTTPException(409, 'This session has ended. Use recorded playback.')
        with previews.lock:
            live_peers(con, previews)
            if sum(p['session_id']==ident for p in previews.peers.values()) >= 3:
                raise HTTPException(429, 'Three reviewers are already watching this camera.')
            peer = uid('peer_')
            previews.peers[peer] = {'session_id':ident,'viewer':actor['id'],'token':token_hash(request.cookies.get('sentinel_session','')), 'offer':body.sdp,'answer':None,'seen':time.monotonic()}
        db.audit(con, actor['id'], 'live.clear_watch_started', ident, {'peer':peer,'transport':'WebRTC, same LAN, lease renewed every 2 seconds'})
        return {'peer':peer}


@router.get('/{ident}/peers')
def offers(ident: str, request: Request, actor=Depends(user)):
    db, previews = request.app.state.db, request.app.state.previews
    with db.connect() as con:
        access(con, actor, ident, owner=True)
        with previews.lock:
            live_peers(con, previews)
            return {'peers':[{'id':key,'offer':peer['offer'],'answered':bool(peer['answer'])} for key,peer in previews.peers.items() if peer['session_id']==ident]}


@router.post('/{ident}/peers/{peer_id}/answer')
def answer(ident: str, peer_id: str, body: Offer, request: Request, actor=Depends(user)):
    db, previews = request.app.state.db, request.app.state.previews
    with db.connect() as con:
        access(con, actor, ident, owner=True)
        with previews.lock:
            live_peers(con, previews)
            peer = previews.peers.get(peer_id)
            if not peer or peer['session_id'] != ident:
                raise HTTPException(404, 'This viewing connection expired.')
            peer['answer'] = body.sdp
    return {'ok':True}


@router.get('/{ident}/peers/{peer_id}')
def peer_status(ident: str, peer_id: str, request: Request, actor=Depends(user)):
    require(actor, REVIEWERS)
    db, previews = request.app.state.db, request.app.state.previews
    with db.connect() as con:
        access(con, actor, ident)
        with previews.lock:
            live_peers(con, previews)
            peer = previews.peers.get(peer_id)
            if not peer or peer['session_id'] != ident or peer['token'] != token_hash(request.cookies.get('sentinel_session','')):
                raise HTTPException(404, 'This viewing connection expired. Reconnect to the camera.')
            peer['seen'] = time.monotonic()
            return {'answer':peer['answer']}


@router.delete('/{ident}/peers/{peer_id}')
def disconnect(ident: str, peer_id: str, request: Request, actor=Depends(user)):
    db, previews = request.app.state.db, request.app.state.previews
    with db.transaction() as con:
        row = access(con, actor, ident)
        with previews.lock:
            peer = previews.peers.get(peer_id)
            if peer and peer['session_id']==ident:
                if peer['viewer'] != actor['id'] and row['owner_id'] != actor['id']:
                    raise HTTPException(403, 'This connection belongs to another viewer.')
                del previews.peers[peer_id]
                db.audit(con, actor['id'], 'live.watch_stopped', ident, {'peer':peer_id})
    return {'ok':True}
