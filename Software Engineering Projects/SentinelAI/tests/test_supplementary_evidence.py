from backend.db import now


def upload(client, parent, content=b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00supplement'):
    return client.post('/api/cases/upload',data={'title':'Consented additional recording','consent':'true','parent_case_id':parent},files={'file':('supplement.mp4',content,'video/mp4')})


def test_requested_evidence_links_preserve_owner_history_and_deduplicate(application,login,fresh_case):
    supervisor=login();citizen=login('citizen');officer=login('officer')
    assert upload(citizen,fresh_case).status_code==409
    assert upload(officer,fresh_case).status_code==404
    version=supervisor.get('/api/cases/'+fresh_case).json()['version']
    assert supervisor.post('/api/cases/'+fresh_case+'/review',json={'action':'request_evidence','reason':'Please submit the missing beginning of this interaction.','version':version}).status_code==200
    before=citizen.get('/api/cases/'+fresh_case).json()
    response=upload(supervisor,fresh_case)
    assert response.status_code==201,response.text
    child=response.json()['id']
    supplement=citizen.get('/api/cases/'+child).json()
    assert supplement['owner_id']=='demo-citizen'
    assert supplement['processing_status']=='queued'
    assert supplement['related'][0]['relation']=='parent'
    assert officer.get('/api/cases/'+child).status_code==404
    parent=citizen.get('/api/cases/'+fresh_case).json()
    assert parent['related'][0]['id']==child
    assert parent['version']==before['version']+1
    assert parent['status']=='evidence_requested'
    assert parent['reviews']==before['reviews']
    assert upload(supervisor,fresh_case).json()=={'id':child,'duplicate':True}
    parent=citizen.get('/api/cases/'+fresh_case).json()
    assert len(parent['related'])==1 and parent['version']==before['version']+1
    assert any(a['action']=='evidence.supplement_received' for a in parent['audit'])
    # A decision prepared before the additional recording arrived is stale.
    stale=supervisor.post('/api/cases/'+fresh_case+'/review',json={'action':'confirm','reason':'Review before additional recording arrived.','version':before['version']})
    assert stale.status_code==409
    assert citizen.get('/api/cases/'+fresh_case+'/report').json()['related'][0]['id']==child


def test_corrupted_encrypted_media_fails_closed(application,login,fresh_case):
    with application.state.db.transaction() as con:
        con.execute("UPDATE cases SET privacy_status='full_frame_blurred' WHERE id=?",(fresh_case,))
        evidence_id=application.state.storage.put(con,fresh_case,'frame',b'test artifact','image/jpeg','redacted')
        row=con.execute('SELECT * FROM evidence WHERE id=?',(evidence_id,)).fetchone()
    application.state.storage.path(row['storage_name']).write_bytes(b'corrupted ciphertext')
    result=login('citizen').get('/api/evidence/'+evidence_id)
    assert result.status_code==503
    assert 'integrity verification failed' in result.json()['detail']
    assert b'corrupted ciphertext' not in result.content
