import hashlib
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from backend.main import create_app
from backend.uploads import CHUNK_SIZE, sweep_expired


@pytest.fixture
def transfer_client(application, login):
    with application.state.db.transaction() as con:
        con.execute("DELETE FROM upload_sessions")
        previous_jobs = {r[0] for r in con.execute("SELECT id FROM jobs")}
    yield login("citizen")
    # This shared test app deliberately has no worker. Do not leave structural
    # (signature-only) fixtures queued for unrelated real-media tests.
    with application.state.db.transaction() as con:
        for row in con.execute("SELECT id FROM jobs").fetchall():
            if row["id"] not in previous_jobs:
                con.execute("DELETE FROM jobs WHERE id=?", (row["id"],))


def content(size=CHUNK_SIZE + 43):
    # Container signature only; tests of actual decode/processing are separate.
    import os
    return b"\x00\x00\x00\x18ftypisom" + os.urandom(size - 12)


def start(client, data, **metadata):
    response = client.post("/api/uploads", json={"metadata": {"title": "Resumable authorized fixture", "consent": True, **metadata},
                                                "extension": ".mp4", "size": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    assert response.status_code == 200, response.text
    return response.json()


def send(client, session, data, offset=0):
    return client.put(f"/api/uploads/{session['id']}?offset={offset}", content=data, headers={"Content-Type": "application/octet-stream"})


def test_resume_after_server_restart_creates_one_encrypted_case(application, transfer_client):
    client = transfer_client
    data = content()
    session = start(client, data)
    first = send(client, session, data[:CHUNK_SIZE])
    assert first.status_code == 200 and first.json()["received"] == CHUNK_SIZE
    with application.state.db.connect() as con:
        stored = con.execute("SELECT * FROM upload_chunks WHERE upload_id=?", (session["id"],)).fetchone()
        assert stored["ciphertext"] != data[:CHUNK_SIZE]
        assert application.state.storage.cipher.decrypt(stored["ciphertext"]) == data[:CHUNK_SIZE]
    # A fresh application instance reads durable state and the same session cookie.
    restarted = create_app(application.state.config)
    with TestClient(restarted) as second:
        second.cookies.update(client.cookies)
        second.headers.update({"X-CSRF-Token": client.headers["X-CSRF-Token"]})
        assert start(second, data)["id"] == session["id"]
        assert second.get("/api/uploads/" + session["id"]).json()["received"] == CHUNK_SIZE
        assert send(second, session, data[:CHUNK_SIZE]).json()["received"] == CHUNK_SIZE
        assert send(second, session, data[CHUNK_SIZE:], CHUNK_SIZE).status_code == 200
        result = second.post(f"/api/uploads/{session['id']}/complete")
        assert result.status_code == 200, result.text
        again = second.post(f"/api/uploads/{session['id']}/complete")
        assert again.json() == result.json()
        assert start(second, data)["case_id"] == result.json()["id"]
    with application.state.db.connect() as con:
        case_id = result.json()["id"]
        assert con.execute("SELECT COUNT(*) FROM jobs WHERE case_id=?", (case_id,)).fetchone()[0] == 1
        assert not con.execute("SELECT 1 FROM upload_chunks WHERE upload_id=?", (session["id"],)).fetchone()
        original = con.execute("SELECT * FROM evidence WHERE case_id=? AND kind='original'", (case_id,)).fetchone()
        assert application.state.storage.read(original) == data
        actions = {r[0] for r in con.execute("SELECT action FROM audit WHERE resource=?", (session["id"],))}
        assert {"upload_session.created", "upload_session.resumed", "upload_session.part_received", "upload_session.completed"} <= actions
        assert application.state.db.verify_audit(con)["valid"]


def test_private_mobile_environment_labels_even_changed_test_bytes(application,transfer_client,monkeypatch):
    monkeypatch.setattr(application.state.config,'test_uploads',True)
    data=content(100)
    session=start(transfer_client,data,test_recording=False)
    assert send(transfer_client,session,data).status_code==200
    response=transfer_client.post(f"/api/uploads/{session['id']}/complete")
    assert response.status_code==200,response.text
    record=transfer_client.get('/api/cases/'+response.json()['id']).json()
    assert record['test_recording']==1 and record['synthetic']==0


@pytest.mark.parametrize("role", ["officer", "supervisor", "admin", "responder"])
def test_upload_sessions_are_private_to_initiating_account(transfer_client, login, role):
    data = content(100)
    session = start(transfer_client, data)
    other = login(role)
    expected = 403 if role == "responder" else 404
    for response in (other.get("/api/uploads/" + session["id"]), send(other, session, data),
                     other.post(f"/api/uploads/{session['id']}/complete"), other.delete("/api/uploads/" + session["id"])):
        assert response.status_code == expected


def test_chunk_validation_and_incomplete_completion(transfer_client):
    client = transfer_client
    data = content()
    session = start(client, data)
    assert client.post(f"/api/uploads/{session['id']}/complete").status_code == 409
    assert send(client, session, data[CHUNK_SIZE:], CHUNK_SIZE).status_code == 409
    assert send(client, session, data[:100]).status_code == 409
    assert send(client, session, data[:CHUNK_SIZE + 1]).status_code == 413
    assert send(client, session, data[:CHUNK_SIZE]).status_code == 200
    assert send(client, session, b"different data").status_code == 409


def test_checksum_corruption_cannot_become_a_case(application, transfer_client):
    data = content(100)
    session = start(transfer_client, data)
    altered = data[:-1] + bytes([data[-1] ^ 1])
    assert send(transfer_client, session, altered).status_code == 200
    assert transfer_client.post(f"/api/uploads/{session['id']}/complete").status_code == 409
    with application.state.db.transaction() as con:
        assert con.execute("SELECT case_id FROM upload_sessions WHERE id=?", (session["id"],)).fetchone()[0] is None
        con.execute("UPDATE upload_chunks SET ciphertext=? WHERE upload_id=?", (b"corrupted ciphertext", session["id"]))
    assert transfer_client.post(f"/api/uploads/{session['id']}/complete").status_code == 409


def test_discard_and_expiry_remove_parts_and_metadata(application, transfer_client):
    data = content()
    session = start(transfer_client, data)
    send(transfer_client, session, data[:CHUNK_SIZE])
    assert transfer_client.delete("/api/uploads/" + session["id"]).status_code == 200
    assert transfer_client.get("/api/uploads/" + session["id"]).status_code == 404
    session = start(transfer_client, data)
    send(transfer_client, session, data[:CHUNK_SIZE])
    with application.state.db.transaction() as con:
        con.execute("UPDATE upload_sessions SET expires_at=? WHERE id=?", ((datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat(), session["id"]))
    assert transfer_client.get("/api/uploads/" + session["id"]).status_code == 410
    assert sweep_expired(application.state.db) == 1
    with application.state.db.connect() as con:
        assert not con.execute("SELECT 1 FROM upload_chunks").fetchone()
        assert not con.execute("SELECT 1 FROM upload_sessions").fetchone()


def test_capacity_and_metadata_validation(transfer_client):
    data = content(100)
    for index in range(3):
        start(transfer_client, data, title=f"Pending transfer {index}")
    payload = {"metadata": {"title": "Fourth pending transfer", "consent": True}, "extension": ".mp4", "size": 100, "sha256": hashlib.sha256(data).hexdigest()}
    assert transfer_client.post("/api/uploads", json=payload).status_code == 429
    payload["metadata"]["consent"] = False
    assert transfer_client.post("/api/uploads", json=payload).status_code == 422
    payload["metadata"]["consent"] = True
    payload["metadata"]["latitude"] = 25
    assert transfer_client.post("/api/uploads", json=payload).status_code == 422
    payload["size"] = 101 * 1024**2
    assert transfer_client.post("/api/uploads", json=payload).status_code == 422


def test_concurrent_finalization_is_idempotent(transfer_client, application):
    data = content(100)
    session = start(transfer_client, data)
    send(transfer_client, session, data)
    def finish(_):
        with TestClient(application) as other:
            other.cookies.update(transfer_client.cookies)
            other.headers["X-CSRF-Token"] = transfer_client.headers["X-CSRF-Token"]
            return other.post(f"/api/uploads/{session['id']}/complete")
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(finish, range(2)))
    assert all(r.status_code == 200 for r in results)
    assert results[0].json() == results[1].json()


def test_supplement_request_rechecked_when_upload_completes(application, transfer_client, fresh_case):
    with application.state.db.transaction() as con:
        con.execute("UPDATE cases SET status='evidence_requested' WHERE id=?", (fresh_case,))
    data = content(100)
    session = start(transfer_client, data, parent_case_id=fresh_case)
    send(transfer_client, session, data)
    with application.state.db.transaction() as con:
        con.execute("UPDATE cases SET status='dismissed' WHERE id=?", (fresh_case,))
    assert transfer_client.post(f"/api/uploads/{session['id']}/complete").status_code == 409


def test_session_authentication_csrf_and_signature(application, transfer_client):
    data = content(100)
    session = start(transfer_client, data)
    with TestClient(application) as anonymous:
        assert anonymous.get("/api/uploads/" + session["id"]).status_code == 401
    token = transfer_client.headers.pop("X-CSRF-Token")
    assert send(transfer_client, session, data).status_code == 403
    transfer_client.headers["X-CSRF-Token"] = token
    assert send(transfer_client, session, bytes(100)).status_code == 415
