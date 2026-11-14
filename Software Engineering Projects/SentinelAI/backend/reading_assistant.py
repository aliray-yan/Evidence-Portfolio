"""Manual, previewed cloud excerpt selection with protected case access and audit."""
from datetime import datetime, timedelta, timezone
import hashlib
import json
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from .db import encode, now, uid
from .security import user, require, REVIEWERS, case_access
from .reading_model import select_sources, free_model, FOLLOW_UPS, ProviderFailure

router = APIRouter()


class GenerateGuide(BaseModel):
    model_config = ConfigDict(extra='forbid')
    source_hash: str = Field(pattern=r'^[0-9a-f]{64}$')
    version: int = Field(ge=1)
    reviewed_external_transfer: Literal[True]


def source_packet(con, case):
    rows = [dict(r) for r in con.execute('SELECT id,text,start,source FROM segments WHERE case_id=? ORDER BY start,id', (case['id'],))]
    for row in rows:
        row['kind'] = 'transcript'
    events = [dict(r) for r in con.execute('SELECT id,detail AS text,start,source,kind FROM events WHERE case_id=? ORDER BY start,id', (case['id'],))]
    for row in events:
        row['kind'] = 'event: ' + row['kind']
    rows += events
    rows.sort(key=lambda r: (r['start'], r['id']))
    # Notes, identities, location, media, case title and reviewer conclusions are
    # never sent. Synthetic cases include only their authored synthetic sources.
    if case['synthetic']:
        rows = [r for r in rows if r['source'] == 'synthetic']
    sources = []
    for index, row in enumerate(rows[:24]):
        sources.append({**row, 'alias': 's' + str(index + 1), 'text': row['text'][:600], 'excerpted': len(row['text']) > 600})
    packet = {'sources': sources, 'synthetic': bool(case['synthetic']), 'omitted_count': max(0, len(rows) - len(sources))}
    packet['source_hash'] = hashlib.sha256(encode(packet).encode()).hexdigest()
    return packet


def availability(config, case, packet):
    if case['status'] == 'deleted' or case['processing_status'] not in ('ready', 'partial', 'completed', 'demo'):
        return False, 'Wait for processing to finish; deleted cases cannot use this feature.'
    if not packet['sources']:
        return False, 'No eligible transcript or event excerpts are available.'
    if not config.openrouter_key:
        return False, 'OpenRouter is not configured. Run the private key setup and restart SentinelAI.'
    if not free_model(config.openrouter_model):
        return False, 'An explicit free model must be configured on the server.'
    if not case['synthetic'] and config.openrouter_model.lower().startswith('nvidia/'):
        return False, 'The free NVIDIA provider is restricted to authored synthetic scenarios; its terms exclude personal and confidential data.'
    if not case['synthetic'] and not config.openrouter_real_cases:
        return False, 'Cloud use is limited to synthetic scenarios. Real-case transfer requires administrator configuration and authorization.'
    return True, 'Preview the excerpts and confirm before sending them to OpenRouter and its model provider.'


def present(record, packet, case):
    if record is None:
        return None
    result = json.loads(record['result_json'])
    stale = record['source_hash'] != packet['source_hash'] or record['case_version'] != case['version']
    selected = result.get('selection', {})
    by_alias = {s['alias']: s for s in packet['sources']}
    return {'id': record['id'], 'status': 'obsolete' if stale else record['status'], 'created_at': record['created_at'],
            'requested_model': record['requested_model'], 'actual_model': result.get('actual_model'),
            'provider': result.get('provider'), 'elapsed_seconds': result.get('elapsed_seconds'),
            'error_code': record['error_code'],
            'selected_sources': [] if stale else [by_alias[a] for a in selected.get('source_ids', []) if a in by_alias],
            'follow_ups': [] if stale else [FOLLOW_UPS[c] for c in selected.get('follow_up_codes', []) if c in FOLLOW_UPS]}


@router.get('/api/cases/{case_id}/reading-guide')
def preview(case_id: str, request: Request, actor=Depends(user)):
    require(actor, REVIEWERS)
    db, config = request.app.state.db, request.app.state.config
    with db.transaction() as con:
        case = case_access(con, actor, case_id)
        packet = source_packet(con, case)
        enabled, detail = availability(config, case, packet)
        record = con.execute('SELECT * FROM reading_guides WHERE case_id=? ORDER BY created_at DESC LIMIT 1', (case_id,)).fetchone()
        db.audit(con, actor['id'], 'reading_guide.preview', case_id, {'source_hash': packet['source_hash']})
    return {'enabled': enabled, 'detail': detail, 'model': config.openrouter_model, 'version': case['version'],
            'packet': packet, 'guide': present(record, packet, case), 'real_cases_enabled': config.openrouter_real_cases}


@router.post('/api/cases/{case_id}/reading-guide')
def generate(case_id: str, body: GenerateGuide, request: Request, actor=Depends(user)):
    require(actor, REVIEWERS)
    db, config = request.app.state.db, request.app.state.config
    with db.transaction() as con:
        case = case_access(con, actor, case_id)
        packet = source_packet(con, case)
        enabled, detail = availability(config, case, packet)
        if not enabled:
            raise HTTPException(409, detail)
        if body.source_hash != packet['source_hash'] or body.version != case['version']:
            raise HTTPException(409, 'The case or its excerpts changed. Refresh and preview them again.')
        existing = con.execute("SELECT * FROM reading_guides WHERE case_id=? AND source_hash=? AND case_version=? AND requested_model=? AND status='completed' ORDER BY created_at DESC LIMIT 1", (case_id, packet['source_hash'], case['version'], config.openrouter_model)).fetchone()
        if existing:
            db.audit(con, actor['id'], 'reading_guide.cached', case_id, {'guide_id': existing['id']})
            return {'guide': present(existing, packet, case), 'cached': True}
        if con.execute("SELECT 1 FROM reading_guides WHERE status='running'").fetchone():
            raise HTTPException(409, 'A reading guide is already being generated. Wait for it to finish.')
        recent = datetime.now(timezone.utc)
        if con.execute('SELECT COUNT(*) FROM reading_guides WHERE created_at>?', ((recent - timedelta(days=1)).isoformat(),)).fetchone()[0] >= 20:
            raise HTTPException(429, 'The local limit of 20 cloud reading-guide attempts per day was reached.')
        if con.execute('SELECT 1 FROM reading_guides WHERE created_at>?', ((recent - timedelta(seconds=30)).isoformat(),)).fetchone():
            raise HTTPException(429, 'Wait 30 seconds between cloud attempts. Existing evidence summaries remain available.')
        ident, stamp = uid('guide_'), now()
        con.execute('INSERT INTO reading_guides(id,case_id,actor_id,source_hash,case_version,requested_model,status,created_at,updated_at) VALUES (?,?,?,?,?,?,\'running\',?,?)',
                    (ident, case_id, actor['id'], packet['source_hash'], case['version'], config.openrouter_model, stamp, stamp))
        db.audit(con, actor['id'], 'reading_guide.requested', case_id,
                 {'guide_id': ident, 'source_hash': packet['source_hash'], 'source_count': len(packet['sources']),
                  'synthetic': packet['synthetic'], 'model': config.openrouter_model, 'transfer_confirmed': True})
    try:
        result = select_sources(config, packet)
    except ProviderFailure as exc:
        with db.transaction() as con:
            con.execute("UPDATE reading_guides SET status='failed',error_code=?,updated_at=? WHERE id=?", (exc.code, now(), ident))
            db.audit(con, actor['id'], 'reading_guide.failed', case_id, {'guide_id': ident, 'error_code': exc.code})
        raise HTTPException(502, str(exc)) from None
    with db.transaction() as con:
        current = con.execute('SELECT * FROM cases WHERE id=?', (case_id,)).fetchone()
        retained = con.execute('SELECT 1 FROM reading_guides WHERE id=?', (ident,)).fetchone()
        if not retained or not current or current['status'] == 'deleted':
            raise HTTPException(409, 'The case was deleted during generation. No guide was retained.')
        if current['version'] != case['version'] or source_packet(con, current)['source_hash'] != packet['source_hash']:
            con.execute("UPDATE reading_guides SET status='obsolete',updated_at=? WHERE id=?", (now(), ident))
            db.audit(con, actor['id'], 'reading_guide.obsolete', case_id, {'guide_id': ident})
            # Commit the obsolete state before returning the conflict below.
            stale = True
        else:
            stale = False
            con.execute("UPDATE reading_guides SET status='completed',result_json=?,updated_at=? WHERE id=?", (encode(result), now(), ident))
            db.audit(con, actor['id'], 'reading_guide.completed', case_id,
                     {'guide_id': ident, 'actual_model': result['actual_model'], 'elapsed_seconds': result['elapsed_seconds']})
            record = con.execute('SELECT * FROM reading_guides WHERE id=?', (ident,)).fetchone()
    if stale:
        raise HTTPException(409, 'The case changed during generation. Preview its current evidence before trying again.')
    return {'guide': present(record, packet, case), 'cached': False}
