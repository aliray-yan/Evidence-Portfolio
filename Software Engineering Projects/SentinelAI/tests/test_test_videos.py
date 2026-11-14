import hashlib
import json
import secrets
import pytest
from fastapi.testclient import TestClient
from backend import test_videos, notifications
from backend.db import now, uid
from backend.pipeline import create_alert
from backend.security import hash_password


@pytest.fixture
def pack(tmp_path,monkeypatch):
    content=b'\x00\x00\x00\x18ftypisom'+secrets.token_bytes(50)
    row={'id':'EN-01','filename':'SentinelAI-EN-01.mp4','title':'Synthetic test only','duration':3.0,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest(),'expected':'private reference annotation'}
    (tmp_path/row['filename']).write_bytes(content)
    (tmp_path/'manifest.json').write_text(json.dumps({'schema':1,'origin':'authored_synthetic_tts','videos':[row]}))
    monkeypatch.setattr(test_videos,'TEST_VIDEO_ROOT',tmp_path)
    return content,row,tmp_path


def test_authenticated_catalog_and_integrity_checked_download(application,login,pack):
    data,row,root=pack
    with TestClient(application) as anon:assert anon.get('/api/test-videos').status_code==401
    client=login('citizen')
    listing=client.get('/api/test-videos').json()
    assert listing['available'] and 'expected' not in listing['videos'][0]
    response=client.get('/api/test-videos/EN-01')
    assert response.status_code==200 and response.content==data
    assert 'attachment' in response.headers['content-disposition']
    assert client.get('/api/test-videos/unknown').status_code==404
    with application.state.db.connect() as con:
        assert con.execute("SELECT 1 FROM audit WHERE action='test_video.download' AND resource='EN-01'").fetchone()
    (root/row['filename']).write_bytes(b'changed')
    assert client.get('/api/test-videos/EN-01').status_code==503


def test_bad_manifest_is_unavailable_not_an_arbitrary_file_download(login,pack):
    _,_,root=pack
    (root/'manifest.json').write_text('{"schema":1,"origin":"authored_synthetic_tts","videos":[{"id":"EN-01","filename":"../private.mp4"}]}')
    assert login().get('/api/test-videos').json()=={'available':False,'videos':[]}
    assert login().get('/api/test-videos/EN-01').status_code==404


@pytest.mark.parametrize('recognized,declared,forced',[(True,False,False),(False,True,False),(False,False,False),(False,False,True)])
def test_test_provenance_persists_in_upload_queue_alerts_and_export(application,login,pack,recognized,declared,forced,monkeypatch):
    monkeypatch.setattr(application.state.config,'test_uploads',forced)
    data,_,_=pack
    if not recognized:data+=secrets.token_bytes(5)
    client=login('citizen');reviewer=login('supervisor')
    response=client.post('/api/cases/upload',data={'title':'Uploaded provenance fixture','consent':'true','test_recording':str(declared).lower()},files={'file':('test.mp4',data,'video/mp4')})
    assert response.status_code==201,response.text
    ident=response.json()['id'];expected=recognized or declared or forced
    try:
        record=reviewer.get('/api/cases/'+ident).json()
        assert bool(record['test_recording']) is expected and not record['synthetic']
        assert bool(reviewer.get('/api/cases/'+ident+'/report').json()['test_recording']) is expected
        with application.state.db.transaction() as con:create_alert(con,application.state.db,ident,None,'test_provenance','Ambiguous')
        alerts=reviewer.get('/api/alerts').json()['items']
        assert bool(next(a for a in alerts if a['case_id']==ident)['test_recording']) is expected
    finally:
        # Signature-only fixtures are never passed off as valid media processing tests.
        with application.state.db.transaction() as con:con.execute('DELETE FROM jobs WHERE case_id=?',(ident,))


def test_marked_test_cannot_send_even_when_live_provider_is_configured(application,fresh_case,monkeypatch):
    ident=uid('usr_');password=secrets.token_urlsafe(24)
    with application.state.db.transaction() as con:
        con.execute("INSERT INTO users(id,name,email,role,password_hash,created_at) VALUES (?,?,?,'supervisor',?,?)",(ident,'Test reviewer',ident+'@example.test',hash_password(password),now()))
        con.execute('UPDATE cases SET test_recording=1 WHERE id=?',(fresh_case,))
        create_alert(con,application.state.db,fresh_case,None,'test','Emergency')
        alert=con.execute('SELECT id FROM alerts WHERE case_id=?',(fresh_case,)).fetchone()[0]
    monkeypatch.setattr(application.state.config,'demo',False)
    monkeypatch.setattr(application.state.config,'notification_url','https://example.invalid/receive')
    monkeypatch.setattr(application.state.config,'notification_secret','x'*32)
    def forbidden(*args):raise AssertionError('Test recording attempted external delivery')
    monkeypatch.setattr(notifications,'dispatch',forbidden)
    with TestClient(application) as client:
        auth=client.post('/api/auth/login',json={'email':ident+'@example.test','password':password}).json()
        client.headers['X-CSRF-Token']=auth['csrf']
        assert client.get('/api/notifications/status').json()['enabled']
        response=client.post('/api/alerts/'+alert+'/notify',json={'reason':'Synthetic test must never reach the provider.'})
        assert response.status_code==409 and 'test recordings' in response.text
        assert client.get('/api/test-videos').json()['available'] is False
        assert client.get('/api/test-videos/EN-01').status_code==404
