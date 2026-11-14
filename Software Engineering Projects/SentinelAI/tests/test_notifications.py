import httpx
import pytest
from backend.config import Config
from backend import notifications
from backend.pipeline import create_alert


@pytest.mark.parametrize('url',['https://[bad','https://gateway.example:bad/','http://gateway.example/','https://user:pass@gateway.example/'])
def test_invalid_provider_configuration_is_unavailable(tmp_path,url):
    config=Config(tmp_path,demo=False,notification_url=url,notification_secret='x'*32)
    assert notifications.delivery_status(config)['status']=='unavailable'


def test_demo_never_contacts_provider(application,login,monkeypatch):
    monkeypatch.setattr(application.state.config,'notification_url','https://gateway.example.invalid/receive')
    monkeypatch.setattr(application.state.config,'notification_secret','x'*32)
    def forbidden(*args):raise AssertionError('Demo attempted external delivery')
    monkeypatch.setattr(notifications,'dispatch',forbidden)
    client=login('supervisor')
    assert client.get('/api/notifications/status').json()['enabled'] is False
    assert client.post('/api/alerts/any/notify',json={'reason':'Test must never send from a demonstration.'}).status_code==409


def test_webhook_acceptance_is_not_recipient_delivery(application,login,fresh_case,monkeypatch):
    with application.state.db.transaction() as con:
        create_alert(con,application.state.db,fresh_case,None,'test_notify','Ambiguous')
        alert_id=con.execute('SELECT id FROM alerts WHERE case_id=?',(fresh_case,)).fetchone()[0]
    client=login('supervisor');citizen=login('citizen')
    # Use distinct real-account sessions; demo sessions are deliberately revoked
    # by the authentication boundary when demonstration mode is disabled.
    from backend.db import now,uid
    from backend.security import hash_password
    from fastapi.testclient import TestClient
    with application.state.db.transaction() as con:
        ident=uid('usr_')
        con.execute("INSERT INTO users(id,name,email,role,password_hash,created_at) VALUES (?,?,?,'supervisor',?,?)",(ident,'Webhook tester',ident+'@example.invalid',hash_password('test-password-with-entropy'),now()))
    client=TestClient(application)
    auth=client.post('/api/auth/login',json={'email':ident+'@example.invalid','password':'test-password-with-entropy'}).json()
    client.headers['X-CSRF-Token']=auth['csrf']
    monkeypatch.setattr(application.state.config,'demo',False)
    monkeypatch.setattr(application.state.config,'notification_url','https://gateway.example.invalid/receive')
    monkeypatch.setattr(application.state.config,'notification_secret','x'*32)
    attempts=[]
    def gateway(config,key,payload):
        attempts.append((key,payload))
        if len(attempts)==1:raise httpx.ReadTimeout('test timeout')
        return 202
    monkeypatch.setattr(notifications,'dispatch',gateway)
    url=f'/api/alerts/{alert_id}/notify';body={'reason':'Manual test of notification retry and acceptance.'}
    assert citizen.post(url,json=body).status_code==403
    assert client.post(url,json=body).json()['status']=='delivery_unknown'
    accepted=client.post(url,json=body).json()
    assert accepted['status']=='accepted_by_provider' and 'not confirmed' in accepted['detail']
    assert client.post(url,json=body).json()['status']=='accepted_by_provider'
    assert len(attempts)==2 and attempts[0][0]==attempts[1][0]
    assert not {'location','transcript','name','media'} & attempts[0][1].keys()
    client.close()
