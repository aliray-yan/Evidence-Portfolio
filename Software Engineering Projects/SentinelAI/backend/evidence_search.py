"""Authorized, local-only case search. Queries never enter URLs or audit plaintext."""
from datetime import datetime, timedelta, timezone
import hmac
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from typing import Literal
from .db import now
from .security import user, case_access
from .retrieval import sources as read_sources, source_hash, model_hash, keyword_search

router = APIRouter(prefix='/api/cases')


def sources(con, case_id):
    try:
        return read_sources(con, case_id)
    except ValueError:
        raise HTTPException(422, 'This case exceeds the supported search size of 2,000 sources.') from None


class SearchQuery(BaseModel):
    query: str = Field(min_length=1, max_length=400)
    mode: Literal['keyword', 'semantic'] = 'keyword'
    limit: int = Field(default=8, ge=1, le=20, strict=True)

    @field_validator('query')
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError('Enter words to search for.')
        return value.strip()


def available_hash(config):
    try:
        return model_hash(config.retrieval_model) if config.retrieval_model else None
    except (OSError, ValueError, KeyError):
        return None


def accessible(con, actor, case_id):
    case = case_access(con, actor, case_id)
    if case['status'] == 'deleted':
        raise HTTPException(410, 'This case has been deleted under the retention policy.')
    if case['processing_status'] in ('queued', 'processing', 'failed'):
        raise HTTPException(409, 'Wait for successful evidence processing before searching this case.')
    return case


def snapshot(con, case_id, rows, fingerprint):
    row = con.execute('SELECT status,source_hash,model_hash,total,processed,error_code,updated_at FROM search_indexes WHERE case_id=?', (case_id,)).fetchone()
    index = dict(row) if row else {'status': 'not_prepared', 'total': 0, 'processed': 0}
    if row and row['status'] == 'ready' and (row['source_hash'] != source_hash(rows) or row['model_hash'] != fingerprint):
        index['status'] = 'stale'
    index.pop('source_hash', None)
    index.pop('model_hash', None)
    return {'available': bool(fingerprint), 'source_count': len(rows), 'index': index}


@router.get('/{case_id}/search')
def status(case_id: str, request: Request, actor=Depends(user)):
    state = request.app.state
    with state.db.connect() as con:
        accessible(con, actor, case_id)
        result = snapshot(con, case_id, sources(con, case_id), available_hash(state.config))
    return {**result, 'worker_enabled': state.config.workers}


@router.post('/{case_id}/search/index')
def prepare(case_id: str, request: Request, actor=Depends(user)):
    state = request.app.state
    with state.db.transaction() as con:
        accessible(con, actor, case_id)
        fingerprint = available_hash(state.config)
        if not fingerprint:
            raise HTTPException(409, 'The local semantic-search model is unavailable. Keyword search is still available.')
        rows = sources(con, case_id)
        if not rows:
            raise HTTPException(409, 'No transcript or event text is available to index.')
        current = snapshot(con, case_id, rows, fingerprint)
        if current['index']['status'] not in ('queued', 'running', 'ready'):
            if con.execute("SELECT COUNT(*) FROM search_indexes WHERE status IN ('queued','running')").fetchone()[0] >= 10:
                raise HTTPException(429, 'Ten cases are already queued for indexing. Try again after they finish.')
            con.execute('DELETE FROM search_indexes WHERE case_id=?', (case_id,))
            con.execute("INSERT INTO search_indexes(case_id,source_hash,model_hash,status,actor_id,created_at,updated_at) VALUES (?,?,?,'queued',?,?,?)", (case_id, source_hash(rows), fingerprint, actor['id'], now(), now()))
            state.db.audit(con, actor['id'], 'evidence_index.queued', case_id, {'sources': len(rows), 'model_hash': fingerprint})
        result = snapshot(con, case_id, rows, fingerprint)
    state.processor.wake_event.set()
    return {**result, 'worker_enabled': state.config.workers}


@router.post('/{case_id}/search')
def search(case_id: str, body: SearchQuery, request: Request, actor=Depends(user)):
    state = request.app.state
    with state.db.transaction() as con:
        accessible(con, actor, case_id)
        since = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        if con.execute("SELECT COUNT(*) FROM audit WHERE actor_id=? AND action='evidence.search' AND created_at>?", (actor['id'], since)).fetchone()[0] >= 30:
            raise HTTPException(429, 'Search limit reached. Wait one minute and try again.')
        rows = sources(con, case_id)
        expected = source_hash(rows)
        stored = []
        if body.mode == 'semantic':
            fingerprint = available_hash(state.config)
            if not fingerprint or snapshot(con, case_id, rows, fingerprint)['index']['status'] != 'ready':
                raise HTTPException(409, 'Prepare the current evidence index before searching by meaning.')
            stored = [dict(r) for r in con.execute('SELECT * FROM search_chunks WHERE case_id=? ORDER BY ordinal', (case_id,))]
            if not stored:
                raise HTTPException(409, 'The evidence index is empty. Prepare it again.')
        digest = hmac.new(state.db.audit_key, body.query.encode(), 'sha256').hexdigest()
        state.db.audit(con, actor['id'], 'evidence.search', case_id, {'query_digest': digest, 'mode': body.mode})
    try:
        results = state.search.search(rows, stored, body.query, body.limit) if body.mode == 'semantic' else keyword_search(rows, body.query, body.limit)
    except BlockingIOError:
        raise HTTPException(503, 'The local search model is busy. Retry shortly.') from None
    except Exception as exc:
        with state.db.transaction() as con:
            if body.mode == 'semantic':
                con.execute("UPDATE search_indexes SET status='failed',error_code=?,updated_at=? WHERE case_id=?", (type(exc).__name__, now(), case_id))
            state.db.audit(con, actor['id'], 'evidence.search_failed', case_id, {'error_type': type(exc).__name__})
        raise HTTPException(503, 'Search could not finish. Refresh its status and prepare the index again if needed.') from None
    # Recheck access and source consistency after potentially slow inference.
    current_actor = user(request)
    with state.db.transaction() as con:
        accessible(con, current_actor, case_id)
        if source_hash(sources(con, case_id)) != expected:
            raise HTTPException(409, 'Evidence changed during this search. Refresh and search again.')
        state.db.audit(con, current_actor['id'], 'evidence.search_results', case_id, {'mode': body.mode, 'count': len(results)})
    return {'mode': body.mode, 'results': results, 'source_hash': expected,
            'detail': 'Exact stored excerpts. Similarity orders results; it is not confidence, misconduct risk, or proof. Read surrounding context.'}
