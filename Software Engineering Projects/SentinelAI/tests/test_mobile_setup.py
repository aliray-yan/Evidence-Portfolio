import ipaddress
import socket
import ssl
import threading
import pytest
from cryptography import x509
from backend.mobile import prepare, configure, private_ip
from backend.config import Config


@pytest.mark.parametrize("address", ["0.0.0.0", "8.8.8.8", "127.0.0.1", "::1", "example.com"])
def test_mobile_setup_rejects_public_and_wildcard_hosts(address):
    with pytest.raises(ValueError):
        private_ip(address)


def test_certificate_real_tls_handshake_and_secure_config(tmp_path, monkeypatch):
    directory = tmp_path/"mobile"
    result = prepare(directory, "192.168.1.10")
    assert len(result["fingerprint"]) == 64
    assert not (directory/"ca.key").exists()
    cert = x509.load_pem_x509_certificate((directory/"server.crt").read_bytes())
    assert ipaddress.ip_address("192.168.1.10") in cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value.get_values_for_type(x509.IPAddress)
    # Real local TLS negotiation with explicit CA trust. No machine trust changes.
    server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    server_context.load_cert_chain(directory/"server.crt", directory/"server.key")
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    listener.listen(1)
    listener.settimeout(5)
    errors = []
    def serve():
        try:
            conn, _ = listener.accept()
            with server_context.wrap_socket(conn, server_side=True) as secure:
                assert secure.recv(4) == b"ping"
                secure.sendall(b"pong")
        except Exception as exc:
            errors.append(exc)
        finally:
            listener.close()
    thread = threading.Thread(target=serve, daemon=True)
    port = listener.getsockname()[1]
    thread.start()
    context = ssl.create_default_context(cafile=str(directory/"phone-trust.crt"))
    with context.wrap_socket(socket.create_connection(("127.0.0.1", port), timeout=5), server_hostname="localhost") as conn:
        conn.sendall(b"ping")
        assert conn.recv(4) == b"pong"
    thread.join(5)
    assert not thread.is_alive() and not errors
    for key in ("SENTINEL_DATA_DIR", "SENTINEL_DEMO", "SENTINEL_SECURE_COOKIE", "SENTINEL_ALLOWED_HOSTS", "SENTINEL_ENCRYPTION_KEY", "SENTINEL_TEST_VIDEOS", "SENTINEL_TEST_UPLOADS", "SENTINEL_NOTIFICATION_URL", "SENTINEL_NOTIFICATION_SECRET", "OPENROUTER_API_KEY", "SENTINEL_OPENROUTER_REAL_CASES"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv('SENTINEL_NOTIFICATION_URL','https://provider.example.invalid')
    monkeypatch.setenv('OPENROUTER_API_KEY','test-never-a-real-secret')
    assert configure(directory) == "192.168.1.10"
    config = Config.from_env()
    assert not config.demo and config.secure_cookie and config.encryption_key
    assert config.test_videos and config.test_uploads and not config.notification_url and not config.notification_secret and not config.openrouter_key and not config.openrouter_real_cases
    assert config.allowed_hosts == ("192.168.1.10", "localhost", "127.0.0.1")
    with pytest.raises(ValueError, match="empty"):
        prepare(directory, "192.168.1.11")


def test_two_authenticated_clients_share_uploaded_case(tmp_path):
    from fastapi.testclient import TestClient
    from cryptography.fernet import Fernet
    from backend.main import create_app
    from backend.db import now
    from backend.security import hash_password
    from backend.pipeline import run_ffmpeg
    from training.smoke import make_fixture
    config = Config(tmp_path/"app", demo=False, workers=False, secure_cookie=True,
                    encryption_key=Fernet.generate_key().decode())
    app = create_app(config)
    # Temporary test credentials only; these accounts never enter the user's database.
    password = "Synthetic-test-only-password"
    with app.state.db.transaction() as con:
        for role in ("citizen", "supervisor"):
            con.execute("INSERT INTO users(id,name,email,role,password_hash,created_at) VALUES (?,?,?,?,?,?)",
                        (role, role, role+"@example.test", role, hash_password(password), now()))
    make_fixture(tmp_path/"clips")
    source = tmp_path/"sample.mp4"
    run_ffmpeg(["-i", str(tmp_path/"clips/train/NonFight/synthetic-0.avi"), "-c:v", "libx264", str(source)])
    with TestClient(app, base_url="https://testserver") as phone, TestClient(app, base_url="https://testserver") as desktop:
        assert phone.post("/api/auth/demo", json={"user_id": "demo-citizen"}).status_code == 403
        for client, role in ((phone, "citizen"), (desktop, "supervisor")):
            response = client.post("/api/auth/login", json={"email": role+"@example.test", "password": password})
            assert response.status_code == 200, response.text
            assert "Secure" in response.headers["set-cookie"] and "HttpOnly" in response.headers["set-cookie"]
            client.headers["X-CSRF-Token"] = response.json()["csrf"]
        upload = phone.post("/api/cases/upload", data={"title": "Phone transfer test fixture", "consent": "true"}, files={"file": ("sample.mp4", source.read_bytes(), "video/mp4")})
        assert upload.status_code == 201, upload.text
        ident = upload.json()["id"]
        while app.state.processor.run_once():
            pass
        record = desktop.get("/api/cases/"+ident).json()
        assert record["processing_status"] == "partial" and record["owner_id"] == "citizen"
        decision = desktop.post(f"/api/cases/{ident}/review", json={"action": "request_evidence", "reason": "Please provide a consented follow-up recording.", "version": record["version"]})
        assert decision.status_code == 200, decision.text
        assert phone.get("/api/cases/"+ident).json()["status"] == "evidence_requested"
        assert desktop.get("/api/evidence/"+record["evidence"][0]["id"]).status_code == 200
