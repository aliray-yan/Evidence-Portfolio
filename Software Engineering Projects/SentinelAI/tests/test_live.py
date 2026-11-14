"""Authorization, evidence continuity, privacy and actual clip processing."""
from datetime import datetime, timedelta, timezone
import secrets
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend.config import Config
from backend.main import create_app
from backend.live import sweep, MAX_SESSION_BYTES


@pytest.fixture
def live(tmp_path):
    app = create_app(Config(tmp_path, workers=False))
    with TestClient(app) as client:
        def sign_in(role):
            peer = TestClient(app)
            result = peer.post('/api/auth/demo', json={'user_id': 'demo-'+role})
            peer.headers['X-CSRF-Token'] = result.json()['csrf']
            return peer
        yield app, sign_in('citizen'), sign_in('supervisor'), sign_in('officer'), client


def begin(client):
    response = client.post('/api/live', json={'title': 'Synthetic live test', 'consent': True})
    assert response.status_code == 201, response.text
    return response.json()['id']


def jpeg():
    rng = np.random.default_rng(14)
    return cv2.imencode('.jpg', rng.integers(0, 256, (180, 320, 3), dtype=np.uint8))[1].tobytes()


def clip(client, ident, seq=1, data=None, start=0, end=1):
    # Container signature only for ingestion tests; not a model fixture.
    return client.post(f'/api/live/{ident}/segments/{seq}', params={'start_seconds': start, 'end_seconds': end, 'extension': '.mp4'}, content=data or b'\0\0\0\x18ftypisom'+secrets.token_bytes(30))


def test_frames_are_private_expiring_and_clear_only_for_reviewers(live):
    app, owner, reviewer, other, anonymous = live
    ident = begin(owner)
    assert anonymous.get('/api/live').status_code == 401
    assert other.get('/api/live/'+ident).status_code == 404
    assert reviewer.post(f'/api/live/{ident}/frame?sequence=1', content=jpeg()).status_code == 403
    assert owner.post(f'/api/live/{ident}/frame?sequence=1', content=jpeg()).status_code == 200
    assert owner.get(f'/api/live/{ident}/frame?view=clear').status_code == 403
    assert other.get(f'/api/live/{ident}/frame').status_code == 404
    clear = reviewer.get(f'/api/live/{ident}/frame?view=clear')
    protected = owner.get(f'/api/live/{ident}/frame')
    assert clear.status_code == protected.status_code == 200
    assert clear.content != protected.content
    assert clear.headers['cache-control'] == 'no-store'
    assert cv2.imdecode(np.frombuffer(clear.content,np.uint8),1).shape == (180,320,3)
    with app.state.db.connect() as con:
        rows = con.execute("SELECT metadata FROM audit WHERE action='live.preview_access' AND resource=?", (ident,)).fetchall()
        assert len(rows) == 2
        assert app.state.db.verify_audit(con)['valid']
    app.state.previews.frames[ident]['clock'] -= 6
    assert reviewer.get(f'/api/live/{ident}/frame?view=clear').status_code == 204
    assert ident not in app.state.previews.frames


def test_input_csrf_and_resource_limits(live, monkeypatch):
    app, owner, reviewer, _, _ = live
    assert owner.post('/api/live', json={'title':'No consent','consent':False}).status_code == 422
    ident = begin(owner)
    assert owner.post('/api/live', json={'title':'Second session','consent':True}).status_code == 409
    assert owner.post(f'/api/live/{ident}/frame?sequence=1', content=b'bad').status_code == 415
    assert owner.post(f'/api/live/{ident}/frame?sequence=1', content=b'x'*(300*1024+1)).status_code == 413
    big = bytearray(jpeg()); pos = big.index(b'\xff\xc0'); big[pos+5:pos+7] = (8000).to_bytes(2, 'big')
    assert owner.post(f'/api/live/{ident}/frame?sequence=1', content=bytes(big)).status_code == 413
    csrf = owner.headers.pop('X-CSRF-Token')
    assert clip(owner, ident).status_code == 403
    owner.headers['X-CSRF-Token'] = csrf
    assert clip(owner, ident, end=35).status_code == 422
    assert clip(owner, ident, end=float('inf')).status_code == 422
    assert clip(reviewer, ident).status_code == 403
    monkeypatch.setattr('backend.live.MAX_PENDING', 0)
    assert clip(owner, ident).status_code == 429
    with app.state.db.connect() as con:
        assert con.execute('SELECT next_sequence FROM live_sessions WHERE id=?',(ident,)).fetchone()[0] == 1


def test_ordered_idempotent_clips_and_stop_recovery(live):
    app, owner, reviewer, _, _ = live
    ident = begin(owner)
    data = b'\0\0\0\x18ftypisom'+secrets.token_bytes(32)
    assert clip(owner,ident,seq=2).status_code == 409
    first = clip(owner,ident,data=data)
    assert first.status_code == 201, first.text
    duplicate = clip(owner,ident,data=data)
    assert duplicate.json()['duplicate'] and duplicate.json()['id'] == first.json()['id']
    assert clip(owner,ident).status_code == 409
    assert clip(owner,ident,data=data,end=2).status_code == 409
    assert clip(owner,ident,seq=2,start=.5,end=1.5).status_code == 422
    assert reviewer.post(f'/api/live/{ident}/stop',json={'reason':'Authorized operator stop'}).status_code == 200
    assert owner.post(f'/api/live/{ident}/frame?sequence=2',content=jpeg()).status_code == 409
    second = clip(owner,ident,seq=2,start=1.2,end=2)
    assert second.status_code == 201, second.text
    details = reviewer.get('/api/live/'+ident).json()
    assert details['status'] == 'ended' and details['pending'] == 2
    assert details['segments'][0]['gap_seconds'] == pytest.approx(.2)
    record = reviewer.get('/api/cases/'+first.json()['id']).json()
    assert record['test_recording'] == 1 and record['processing_status'] == 'queued'
    with app.state.db.connect() as con:
        assert con.execute('SELECT COUNT(*) FROM live_segments WHERE session_id=?',(ident,)).fetchone()[0] == 2
        assert app.state.db.verify_audit(con)['valid']


def test_restart_stale_and_byte_limit_are_visible(live):
    app, owner, reviewer, _, _ = live
    ident = begin(owner)
    with app.state.db.transaction() as con:
        con.execute('UPDATE live_sessions SET bytes_received=? WHERE id=?',(MAX_SESSION_BYTES,ident))
    assert clip(owner,ident).status_code == 413
    with app.state.db.transaction() as con:
        sweep(con,app.state.db,app.state.previews,restart=True)
    record = reviewer.get('/api/live/'+ident).json()
    assert record['status'] == 'interrupted' and record['stop_reason'] == 'Server restarted'
    second = begin(owner)
    with app.state.db.transaction() as con:
        old = (datetime.now(timezone.utc)-timedelta(seconds=65)).isoformat()
        con.execute('UPDATE live_sessions SET last_seen_at=? WHERE id=?',(old,second))
    assert reviewer.get('/api/live/'+second).json()['status'] == 'interrupted'


def test_real_live_clip_reaches_privacy_and_review_pipeline(live, tmp_path):
    from backend.pipeline import run_ffmpeg
    app, owner, reviewer, _, _ = live
    path = tmp_path/'test.mp4'
    run_ffmpeg(['-f','lavfi','-i','testsrc2=size=160x120:rate=15','-t','1','-c:v','libx264','-pix_fmt','yuv420p',str(path)])
    ident = begin(owner)
    received = clip(owner,ident,data=path.read_bytes())
    assert received.status_code == 201, received.text
    assert app.state.processor.run_once()
    result = reviewer.get('/api/live/'+ident).json()['segments'][0]
    assert result['processing_status'] == 'partial' and result['risk_label'] == 'Unassessed'
    case = reviewer.get('/api/cases/'+received.json()['id']).json()
    assert case['privacy_status'] == 'full_frame_blurred'
    assert all(e['kind'] != 'original' for e in case['evidence'])
    clear = next(e for e in case['evidence'] if e['kind']=='live_review')
    assert owner.get('/api/evidence/'+clear['id']).status_code == 403
    assert reviewer.get('/api/evidence/'+clear['id'],headers={'Range':'bytes=0-31'}).status_code == 206
    assert all(e['kind']!='live_review' for e in owner.get('/api/cases/'+received.json()['id']).json()['evidence'])
    with app.state.db.transaction() as con:
        con.execute('UPDATE evidence SET created_at=? WHERE id=?',((datetime.now(timezone.utc)-timedelta(minutes=61)).isoformat(),clear['id']))
    assert reviewer.get('/api/evidence/'+clear['id']).status_code in (404,410)


def test_clear_webrtc_signaling_requires_reviewer_and_revokes_on_logout(live):
    app, owner, reviewer, other, _ = live
    ident = begin(owner)
    payload={'sdp':'v=0\r\n'+'synthetic-signaling-test'*4}
    assert owner.post('/api/live/'+ident+'/watch',json=payload).status_code == 403
    watch = reviewer.post('/api/live/'+ident+'/watch',json=payload)
    assert watch.status_code == 201,watch.text
    peer=watch.json()['peer']
    assert other.get(f'/api/live/{ident}/peers').status_code == 404
    assert reviewer.get(f'/api/live/{ident}/peers').status_code == 403
    assert owner.get(f'/api/live/{ident}/peers').json()['peers'][0]['offer'] == payload['sdp']
    assert owner.post(f'/api/live/{ident}/peers/{peer}/answer',json=payload).status_code == 200
    assert reviewer.get(f'/api/live/{ident}/peers/{peer}').json()['answer'] == payload['sdp']
    assert owner.get(f'/api/live/{ident}/peers/{peer}').status_code == 403
    assert reviewer.post('/api/auth/logout').status_code == 200
    assert owner.get(f'/api/live/{ident}/peers').json()['peers'] == []
    with app.state.db.connect() as con:
        audit=con.execute("SELECT metadata FROM audit WHERE action='live.clear_watch_started' AND resource=?",(ident,)).fetchone()[0]
        assert 'synthetic-signaling-test' not in audit


def test_vision_and_context_windows_can_overlap_but_not_within_one_lane(live):
    app, owner, _, _, _ = live
    ident=begin(owner)
    params={'start_seconds':0,'end_seconds':1,'lane':'vision','extension':'.mp4'}
    result=owner.post(f'/api/live/{ident}/segments/1',params=params,content=b'\0\0\0\x18ftypisom'+secrets.token_bytes(40))
    assert result.status_code==201,result.text
    assert clip(owner,ident,seq=2,start=0,end=1).status_code==201
    result=owner.post(f'/api/live/{ident}/segments/3',params=params,content=b'\0\0\0\x18ftypisom'+secrets.token_bytes(40))
    assert result.status_code==422
    with app.state.db.connect() as con:
        assert len(con.execute('SELECT * FROM live_segments WHERE session_id=?',(ident,)).fetchall())==2
