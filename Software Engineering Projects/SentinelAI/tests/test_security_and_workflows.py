import hashlib
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import pytest
from backend.db import now, uid
from backend.security import hash_password, verify_password


@pytest.mark.parametrize('path',['/api/cases','/api/dashboard','/api/cases/SA-26-1042','/api/alerts','/api/admin/users','/api/admin/settings','/api/health','/api/admin/audit','/api/cases/SA-26-1042/report'])
def test_auth_required(application,path):
    assert TestClient(application).get(path).status_code==401

@pytest.mark.parametrize('role',['citizen','officer','supervisor','responder'])
@pytest.mark.parametrize('path',['/api/admin/users','/api/admin/settings','/api/admin/audit','/api/admin/devices','/api/admin/phrases'])
def test_admin_boundary(login,role,path):
    assert login(role).get(path).status_code==403

def test_citizen_scope_and_protected_media(login):
    citizen=login('citizen'); officer=login('officer')
    rows=citizen.get('/api/cases').json()['items']
    assert all(c['owner_id']=='demo-citizen' for c in rows)
    assert citizen.get('/api/cases/SA-26-1041').status_code==404
    media=officer.get('/api/cases/SA-26-1041').json()['evidence'][0]['id']
    assert citizen.get('/api/evidence/'+media).status_code==404
    assert citizen.get('/api/cases/SA-26-1041/report').status_code==404

def test_responder_only_alert_cases(login):
    client=login('responder')
    assert client.get('/api/cases/SA-26-1039').status_code==404
    assert client.get('/api/cases/SA-26-1041').status_code==200

def test_csrf_and_origin(login,fresh_case):
    client=login()
    client.headers.pop('X-CSRF-Token')
    assert client.post(f'/api/cases/{fresh_case}/notes',json={'body':'A meaningful observation'}).status_code==403
    assert client.post('/api/auth/demo',json={'user_id':'demo-admin'},headers={'origin':'https://hostile.example'}).status_code==403

def test_review_version_and_required_reason(login,fresh_case):
    client=login()
    assert client.post(f'/api/cases/{fresh_case}/review',json={'action':'dismiss','reason':'no','version':1}).status_code==422
    response=client.post(f'/api/cases/{fresh_case}/review',json={'action':'dismiss','reason':'Full context supports a routine interaction.','version':1})
    assert response.status_code==200,response.text
    assert client.post(f'/api/cases/{fresh_case}/review',json={'action':'confirm','reason':'A conflicting duplicate action.','version':1}).status_code==409
    c=client.get(f'/api/cases/{fresh_case}').json()
    assert c['status']=='dismissed' and c['version']==2
    assert c['reviews'][0]['reason'].startswith('Full context')
    assert any(a['action']=='review.dismiss' for a in c['audit'])

def test_review_role_boundary(login,fresh_case):
    assert login('citizen').post(f'/api/cases/{fresh_case}/review',json={'action':'confirm','reason':'This must be denied by the backend.','version':1}).status_code==403

def test_appeal_independent_reviewer(login,fresh_case):
    supervisor,citizen,senior=login(),login('citizen'),login('senior')
    assert supervisor.post(f'/api/cases/{fresh_case}/review',json={'action':'confirm','reason':'Concern requires documented follow-up.','version':1}).status_code==200
    assert citizen.post(f'/api/cases/{fresh_case}/review',json={'action':'appeal','reason':'The surrounding context was not considered.','version':2}).status_code==200
    assert supervisor.post(f'/api/cases/{fresh_case}/review',json={'action':'dismiss','reason':'I cannot decide my own previous decision appeal.','version':3}).status_code==403
    assert senior.post(f'/api/cases/{fresh_case}/review',json={'action':'dismiss','reason':'Independent review finds insufficient supporting evidence.','version':3}).status_code==200

def test_assignment_validation(login,fresh_case):
    client=login()
    body={'action':'assign','reason':'Assign to an authorized reviewer.','version':1,'assigned_to':'demo-citizen'}
    assert client.post(f'/api/cases/{fresh_case}/review',json=body).status_code==422
    body['assigned_to']='demo-senior'
    assert client.post(f'/api/cases/{fresh_case}/review',json=body).status_code==200

def test_notes_and_report(login,fresh_case):
    client=login('citizen')
    assert client.post(f'/api/cases/{fresh_case}/notes',json={'body':'Document uncertainty without assigning guilt.'}).status_code==200
    c=client.get(f'/api/cases/{fresh_case}').json()
    assert c['notes'][0]['body'].startswith('Document')
    report=client.get(f'/api/cases/{fresh_case}/report')
    assert report.status_code==200 and 'owner_id' not in report.json()
    assert 'latitude' not in report.json()
    assert client.get(f'/api/cases/{fresh_case}/report?format=html').headers['content-type'].startswith('text/html')
    assert client.get(f'/api/cases/{fresh_case}/report?format=exe').status_code==422

def test_escalation_and_alert_lifecycle(login,fresh_case):
    reviewer,responder=login(),login('responder')
    assert reviewer.post(f'/api/cases/{fresh_case}/review',json={'action':'escalate','reason':'Human safety concern requires a control-room assessment.','version':1}).status_code==200
    alert=next(a for a in responder.get('/api/alerts').json()['items'] if a['case_id']==fresh_case)
    url=f"/api/alerts/{alert['id']}/action"
    assert responder.post(url,json={'action':'resolve','reason':'Cannot resolve an unacknowledged alert.','version':1}).status_code==409
    assert responder.post(url,json={'action':'acknowledge','reason':'Responder has reviewed the local alert.','version':1}).status_code==200
    assert responder.post(url,json={'action':'assign','reason':'Assign to the on-duty demonstration responder.','version':2,'assigned_to':'demo-responder'}).status_code==200
    assert responder.post(url,json={'action':'resolve','reason':'Local exercise completed with no external dispatch.','version':3}).status_code==200
    final=next(a for a in responder.get('/api/alerts').json()['items'] if a['id']==alert['id'])
    assert final['status']=='resolved' and len(final['history'])==4
    assert {n['status'] for n in final['notifications']}=={'recorded','unavailable'}

def test_upload_type_consent_duplicate_and_raw_protection(login,application):
    client=login('citizen')
    assert client.post('/api/cases/upload',data={'title':'My video recording','consent':'true'},files={'file':('bad.mp4',b'not a video','video/mp4')}).status_code==415
    data=b'\x00\x00\x00\x18ftypmp42'+b'0'*100
    fields={'title':'My video recording','consent':'false'}
    assert client.post('/api/cases/upload',data=fields,files={'file':('test.mp4',data,'video/mp4')}).status_code==422
    fields['consent']='true'
    first=client.post('/api/cases/upload',data=fields,files={'file':('../../outside.mp4',data,'video/mp4')})
    assert first.status_code==201,first.text
    second=client.post('/api/cases/upload',data=fields,files={'file':('test.mp4',data,'video/mp4')})
    assert second.status_code==200 and second.json()['duplicate'] and first.json()['id']==second.json()['id']
    case_id=first.json()['id']
    with application.state.db.connect() as con:
        source=con.execute("SELECT * FROM evidence WHERE case_id=?",(case_id,)).fetchone()
        assert application.state.storage.path(source['storage_name']).read_bytes()!=data
        assert application.state.storage.read(source)==data
        assert client.get('/api/evidence/'+source['id']).status_code==404
    application.state.processor.run_once()
    case=client.get('/api/cases/'+case_id).json()
    assert case['processing_status']=='failed' and case['risk_label']=='Unassessed' and case['can_retry']

def test_byte_ranges_and_audit(login):
    client=login()
    evidence=client.get('/api/cases/SA-26-1042').json()['evidence'][0]
    result=client.get('/api/evidence/'+evidence['id'],headers={'Range':'bytes=0-99'})
    assert result.status_code==206 and len(result.content)==100
    assert result.headers['content-range'].startswith('bytes 0-99/')
    assert client.get('/api/evidence/'+evidence['id'],headers={'Range':'bytes=999999999-'}).status_code==416

def test_admin_user_login_and_revocation(login,application):
    admin=login('admin');email=uid()+'@example.test'
    created=admin.post('/api/admin/users',json={'name':'Test reviewer','email':email,'role':'supervisor','password':'A-long-local-password-42'})
    assert created.status_code==200,created.text
    user_id=created.json()['id'];client=TestClient(application)
    assert client.post('/api/auth/login',json={'email':email,'password':'wrong'}).status_code==401
    result=client.post('/api/auth/login',json={'email':email,'password':'A-long-local-password-42'})
    assert result.status_code==200
    assert client.get('/api/cases').status_code==200
    assert admin.patch('/api/admin/users/'+user_id,json={'role':'citizen','active':True,'reason':'Reduce scope to participant access.'}).status_code==200
    assert client.get('/api/cases').status_code==401

def test_login_rate_limit(application):
    client=TestClient(application)
    for i in range(5):
        assert client.post('/api/auth/login',json={'email':'unknown@example.test','password':'wrong'}).status_code==401
    assert client.post('/api/auth/login',json={'email':'unknown@example.test','password':'wrong'}).status_code==429

def test_policy_version_and_history(login):
    admin=login('admin');prior=admin.get('/api/cases/SA-26-1042').json()['assessment']
    policy=admin.get('/api/admin/settings').json()['thresholds']
    value=policy['value'];value['weights']['speech']=.99
    assert admin.put('/api/admin/settings/thresholds',json={'value':value,'version':policy['version'],'reason':'Invalid weights must be rejected.'}).status_code==422
    value['weights']['speech']=.3;value['high']=61
    assert admin.put('/api/admin/settings/thresholds',json={'value':value,'version':policy['version'],'reason':'Versioned threshold change for testing.'}).status_code==200
    assert admin.get('/api/cases/SA-26-1042').json()['assessment']==prior
    assert admin.put('/api/admin/settings/thresholds',json={'value':value,'version':policy['version'],'reason':'Stale change must be rejected.'}).status_code==409

def test_append_only_hash_chain(login,application):
    with application.state.db.connect() as con:
        with pytest.raises(sqlite3.IntegrityError): con.execute("UPDATE audit SET action='changed' WHERE seq=1")
        with pytest.raises(sqlite3.IntegrityError): con.execute("DELETE FROM audit WHERE seq=1")
    result=login('admin').get('/api/admin/audit').json()
    assert result['integrity']['valid'] and result['integrity']['entries']>10

def test_retention_hold_and_deletion(login,application,fresh_case):
    admin=login('admin')
    with application.state.db.transaction() as con:
        con.execute("UPDATE cases SET created_at=? WHERE id=?",((datetime.now(timezone.utc)-timedelta(days=400)).isoformat(),fresh_case))
    assert admin.post(f'/api/cases/{fresh_case}/hold',json={'enabled':True,'reason':'Preserve pending independent review.'}).status_code==200
    assert fresh_case not in [c['id'] for c in admin.get('/api/admin/retention-preview').json()['cases']]
    assert admin.post(f'/api/cases/{fresh_case}/hold',json={'enabled':False,'reason':'Independent review is complete.'}).status_code==200
    assert fresh_case in [c['id'] for c in admin.get('/api/admin/retention-preview').json()['cases']]
    assert admin.post('/api/admin/retention-run',json={'reason':'Run policy after reviewing eligible evidence.'}).status_code==200
    assert admin.get('/api/cases/'+fresh_case).json()['status']=='deleted'
    assert admin.get(f'/api/cases/{fresh_case}/report').status_code==410

def test_device_and_library(login):
    admin=login('admin');ident='CAM-'+uid()
    device=admin.post('/api/admin/devices',json={'name':'Test camera','identifier':ident})
    assert device.status_code==200
    assert admin.post(f"/api/admin/devices/{device.json()['id']}/revoke",json={'reason':'Device retired after testing.'}).status_code==200
    phrase=admin.post('/api/admin/phrases',json={'phrase':'procedural '+uid(),'category':'routine','language':'Roman Urdu','explanation':'Test phrase only; no inference claim.'})
    assert phrase.status_code==200
    assert admin.post(f"/api/admin/phrases/{phrase.json()['id']}/toggle",json={'reason':'Disable test-only phrase entry.'}).status_code==200

def test_password_hash():
    digest=hash_password('secure local password')
    assert verify_password('secure local password',digest)
    assert not verify_password('wrong password',digest)
    assert 'secure local password' not in digest
