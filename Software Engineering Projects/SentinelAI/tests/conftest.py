from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import pytest
from fastapi.testclient import TestClient
from backend.config import Config
from backend.main import create_app


@pytest.fixture(scope="session")
def application(tmp_path_factory):
    config=Config(tmp_path_factory.mktemp("sentinel"),workers=False)
    app=create_app(config)
    with TestClient(app) as client:
        yield app


@pytest.fixture
def login(application):
    clients=[]
    def sign_in(role="supervisor"):
        client=TestClient(application)
        result=client.post('/api/auth/demo',json={'user_id':'demo-'+role})
        assert result.status_code==200,result.text
        client.headers['X-CSRF-Token']=result.json()['csrf']
        clients.append(client)
        return client
    yield sign_in
    for client in clients:
        client.close()


@pytest.fixture
def fresh_case(application):
    from backend.db import now,uid
    with application.state.db.transaction() as con:
        ident=uid('TEST-')
        con.execute("INSERT INTO cases(id,title,owner_id,created_at,updated_at,status,processing_status,risk_label,risk_score) VALUES (?,?,?,?,?,'awaiting_review','partial','Ambiguous',30)",(ident,'Authorized test interaction','demo-citizen',now(),now()))
    return ident
