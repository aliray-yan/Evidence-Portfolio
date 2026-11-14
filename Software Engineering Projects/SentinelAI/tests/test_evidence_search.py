import json
import numpy as np
import pytest
from backend.db import uid
from backend.retrieval import chunks, keyword_search, model_hash, source_hash, sources


@pytest.fixture
def indexed_case(application, fresh_case, tmp_path, monkeypatch):
    folder = tmp_path / 'retrieval'
    folder.mkdir()
    (folder / 'manifest.json').write_text(json.dumps({'kind': 'multilingual_retrieval', 'files': {'model.onnx': 'test-double'}}))
    monkeypatch.setattr(application.state.config, 'retrieval_model', str(folder))
    class Embedder:
        fingerprint = model_hash(folder)
        def embed(self, texts, query=False):
            vectors = np.zeros((len(texts), 384), dtype='<f4')
            for i, text in enumerate(texts):
                vectors[i, 0 if 'receipt' in text.casefold() else 1] = 1
            return vectors
    monkeypatch.setattr(application.state.search, 'model', Embedder())
    ids = [uid('tr_'), uid('tr_')]
    with application.state.db.transaction() as con:
        for i, text in enumerate(('Keep the official receipt for your payment.', 'The weather is sunny.')):
            con.execute('INSERT INTO segments VALUES (?,?,?,?,?,?,?,?)', (ids[i], fresh_case, i * 3, i * 3 + 2, text, 'en', None, 'synthetic'))
    return fresh_case, ids


def test_exact_chunks_cover_text_and_preserve_unicode():
    text = 'سرکاری رسید محفوظ رکھیں ' * 40
    row = {'id': 'tr1', 'text': text, 'kind': 'transcript', 'source': 'synthetic', 'start': 1, 'end': 3}
    spans = chunks([row])
    assert all(s['text'] == text[s['start_char']:s['end_char']] for s in spans)
    assert spans[0]['start_char'] == 0 and spans[-1]['end_char'] == len(text)
    assert all(b['start_char'] <= a['end_char'] for a, b in zip(spans, spans[1:]))
    found = keyword_search([row], 'رسید', 5)
    assert len(found) == 1 and found[0]['id'] == 'tr1' and found[0]['excerpted']
    assert keyword_search([row], 'missing', 5) == []


def test_keyword_access_validation_and_audit(application, login, indexed_case):
    case_id, ids = indexed_case
    client = login('citizen')
    for body in ({'query': ' '}, {'query': 'a' * 401}, {'query': 'receipt', 'mode': 'cloud'}, {'query': 'receipt', 'limit': 0}):
        assert client.post(f'/api/cases/{case_id}/search', json=body).status_code == 422
    result = client.post(f'/api/cases/{case_id}/search', json={'query': 'receipt'})
    assert result.status_code == 200, result.text
    assert result.json()['results'][0]['id'] == ids[0]
    for role in ('officer', 'responder'):
        other = login(role)
        assert other.get(f'/api/cases/{case_id}/search').status_code == 404
        assert other.post(f'/api/cases/{case_id}/search/index').status_code == 404
        assert other.post(f'/api/cases/{case_id}/search', json={'query': 'receipt'}).status_code == 404
    client.headers.pop('X-CSRF-Token')
    assert client.post(f'/api/cases/{case_id}/search', json={'query': 'receipt'}).status_code == 403
    with application.state.db.connect() as con:
        audit = con.execute("SELECT metadata FROM audit WHERE action='evidence.search' AND resource=?", (case_id,)).fetchone()[0]
        assert 'receipt' not in audit and 'query_digest' in audit
        assert application.state.db.verify_audit(con)['valid']


def prepare(application, client, case_id):
    url = f'/api/cases/{case_id}/search'
    queued = client.post(url + '/index')
    assert queued.status_code == 200, queued.text
    assert client.post(url + '/index').json()['index']['status'] == 'queued'
    assert application.state.search.run_once()
    assert client.get(url).json()['index']['status'] == 'ready'
    return url


def test_persisted_encrypted_semantic_index_and_stale_sources(application, login, indexed_case):
    case_id, ids = indexed_case
    client = login()
    url = prepare(application, client, case_id)
    before = client.get('/api/cases/' + case_id).json()
    found = client.post(url, json={'query': 'receipt', 'mode': 'semantic', 'limit': 1})
    assert found.status_code == 200, found.text
    assert found.json()['results'][0]['id'] == ids[0]
    with application.state.db.connect() as con:
        stored = con.execute('SELECT vector FROM search_chunks WHERE case_id=?', (case_id,)).fetchone()[0]
        assert stored.startswith(b'gAAAA')
        assert len(application.state.storage.cipher.decrypt(stored)) == 384 * 4
    assert client.post(url + '/index').json()['index']['status'] == 'ready'
    after = client.get('/api/cases/' + case_id).json()
    assert [before[k] for k in ('risk_score', 'version', 'status')] == [after[k] for k in ('risk_score', 'version', 'status')]
    with application.state.db.transaction() as con:
        con.execute('UPDATE segments SET text=? WHERE id=?', ('Changed source', ids[0]))
    assert client.get(url).json()['index']['status'] == 'stale'
    assert client.post(url, json={'query': 'receipt', 'mode': 'semantic'}).status_code == 409
    prepare(application, client, case_id)


def test_model_change_and_corrupt_vectors_fail_closed(application, login, indexed_case, monkeypatch):
    case_id, _ = indexed_case
    client = login()
    url = prepare(application, client, case_id)
    with application.state.db.transaction() as con:
        con.execute("UPDATE search_chunks SET vector=? WHERE case_id=?", (b'invalid', case_id))
    result = client.post(url, json={'query': 'receipt', 'mode': 'semantic'})
    assert result.status_code == 503 and 'invalid' not in result.text
    assert client.get(url).json()['index']['status'] == 'failed'
    prepare(application, client, case_id)
    monkeypatch.setattr(application.state.config, 'retrieval_model', '')
    assert client.get(url).json()['index']['status'] == 'stale'
    assert client.post(url, json={'query': 'receipt', 'mode': 'semantic'}).status_code == 409
    assert client.post(url, json={'query': 'receipt'}).status_code == 200


def test_busy_and_access_revoked_during_inference(application, login, indexed_case, monkeypatch):
    case_id, _ = indexed_case
    client = login('citizen')
    url = prepare(application, client, case_id)
    with application.state.search.lock:
        assert client.post(url, json={'query': 'receipt', 'mode': 'semantic'}).status_code == 503
    original = application.state.search.model.embed
    def revoke(texts, query=False):
        with application.state.db.transaction() as con:
            con.execute("UPDATE cases SET owner_id='demo-officer' WHERE id=?", (case_id,))
        return original(texts, query)
    monkeypatch.setattr(application.state.search.model, 'embed', revoke)
    assert client.post(url, json={'query': 'receipt', 'mode': 'semantic'}).status_code == 404


def test_retention_erases_vectors_and_worker_does_not_recreate(application, login, indexed_case, monkeypatch):
    from backend.retention import purge
    case_id, _ = indexed_case
    client = login('admin')
    client.post(f'/api/cases/{case_id}/search/index')
    original = application.state.search.model.embed
    def erase(texts, query=False):
        with application.state.db.transaction() as con:
            con.execute("UPDATE cases SET created_at='2000-01-01T00:00:00+00:00' WHERE id=?", (case_id,))
            purge(con, application.state.db, application.state.storage, 'demo-admin', 'Test retention erasure')
        return original(texts, query)
    monkeypatch.setattr(application.state.search.model, 'embed', erase)
    assert application.state.search.run_once()
    assert client.get(f'/api/cases/{case_id}/search').status_code == 410
    with application.state.db.connect() as con:
        assert con.execute('SELECT COUNT(*) FROM search_chunks WHERE case_id=?', (case_id,)).fetchone()[0] == 0
        assert con.execute('SELECT COUNT(*) FROM search_indexes WHERE case_id=?', (case_id,)).fetchone()[0] == 0


def test_failed_embedding_does_not_announce_completion(application, login, indexed_case, monkeypatch):
    case_id, _ = indexed_case
    client = login()
    client.post(f'/api/cases/{case_id}/search/index')
    monkeypatch.setattr(application.state.search.model, 'embed', lambda *a, **k: np.full((1, 384), np.nan))
    assert application.state.search.run_once()
    assert client.get(f'/api/cases/{case_id}/search').json()['index']['status'] == 'failed'
    assert client.post(f'/api/cases/{case_id}/search', json={'query': 'receipt', 'mode': 'semantic'}).status_code == 409


def test_empty_case_and_unconfigured_model(login, fresh_case):
    client = login()
    url = f'/api/cases/{fresh_case}/search'
    assert client.get(url).json()['source_count'] == 0
    assert client.post(url, json={'query': 'receipt'}).json()['results'] == []
    assert client.post(url + '/index').status_code == 409


def test_health_index_jobs_follow_case_scope_and_restart_recovers(application, login, indexed_case):
    from backend.main import create_app
    from fastapi.testclient import TestClient
    case_id, _ = indexed_case
    client = login('citizen')
    prepare(application, client, case_id)
    assert any(j['case_id'] == case_id for j in client.get('/api/health').json()['search_jobs'])
    assert not any(j['case_id'] == case_id for j in login('officer').get('/api/health').json()['search_jobs'])
    with application.state.db.transaction() as con:
        con.execute("UPDATE search_indexes SET status='running' WHERE case_id=?", (case_id,))
    with TestClient(create_app(application.state.config)):
        with application.state.db.connect() as con:
            assert con.execute('SELECT status FROM search_indexes WHERE case_id=?', (case_id,)).fetchone()[0] == 'queued'
            assert con.execute("SELECT 1 FROM audit WHERE resource=? AND action='evidence_index.interrupted'", (case_id,)).fetchone()
    # Leave the shared test database without queued work for a subsequent fixture.
    assert application.state.search.run_once()


def test_oversized_sources_return_actionable_validation(application, login, fresh_case):
    with application.state.db.transaction() as con:
        con.executemany('INSERT INTO segments VALUES (?,?,?,?,?,?,?,?)', [(uid('tr_'), fresh_case, 0, 1, 'fixture', 'en', None, 'synthetic') for _ in range(2001)])
    result = login().get(f'/api/cases/{fresh_case}/search')
    assert result.status_code == 422 and '2,000 sources' in result.text
