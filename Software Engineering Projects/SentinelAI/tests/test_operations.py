from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
from cryptography.fernet import InvalidToken, Fernet
import pytest
from backend.backup import backup, restore
from backend.config import Config
from backend.db import Database, encode, now
from backend.storage import Storage
from backend.retention import run_scheduled


def test_scheduled_retention_opt_in_holds_and_cadence(application, fresh_case):
    db=application.state.db
    at=datetime.now(timezone.utc)
    with db.transaction() as con:
        con.execute('UPDATE cases SET created_at=?,legal_hold=1 WHERE id=?',((at-timedelta(days=400)).isoformat(),fresh_case))
    assert run_scheduled(db,application.state.storage,at) is None
    try:
        with db.transaction() as con:
            con.execute("UPDATE settings SET value=? WHERE key='maintenance'",(encode({'retention_enabled':True,'interval_hours':24}),))
        assert run_scheduled(db,application.state.storage,at)['deleted_cases']==0
        with db.transaction() as con:
            con.execute('UPDATE cases SET legal_hold=0 WHERE id=?',(fresh_case,))
        assert run_scheduled(db,application.state.storage,at+timedelta(hours=2)) is None
        result=run_scheduled(db,application.state.storage,at+timedelta(hours=25))
        assert result['deleted_cases']==1
        with db.connect() as con:
            assert con.execute('SELECT status FROM cases WHERE id=?',(fresh_case,)).fetchone()[0]=='deleted'
            assert db.verify_audit(con)['valid']
    finally:
        with db.transaction() as con:
            con.execute("UPDATE settings SET value=? WHERE key='maintenance'",(encode({'retention_enabled':False,'interval_hours':24}),))
            con.execute("DELETE FROM settings WHERE key='maintenance_state'")


def test_maintenance_settings_are_admin_validated_and_audited(login):
    citizen=login('citizen');admin=login('admin')
    data=admin.get('/api/admin/settings').json()
    body={'value':{'retention_enabled':False,'interval_hours':12},'version':data['maintenance']['version'],'reason':'Test scheduled retention configuration while disabled.'}
    assert citizen.put('/api/admin/settings/maintenance',json=body).status_code==403
    assert admin.put('/api/admin/settings/maintenance',json={**body,'value':{'retention_enabled':'yes','interval_hours':0}}).status_code==422
    assert admin.put('/api/admin/settings/maintenance',json=body).status_code==200
    assert admin.put('/api/admin/settings/maintenance',json=body).status_code==409


def test_encrypted_backup_restore_and_session_revocation(tmp_path):
    config=Config(tmp_path/'source',workers=False)
    storage=Storage(config);db=Database(config.data_dir/'sentinel.db',storage.audit_key)
    with db.transaction() as con:
        con.execute("INSERT INTO users(id,name,email,role,created_at) VALUES ('u','Tester','test@example.invalid','admin',?)",(now(),))
        con.execute("INSERT INTO sessions VALUES ('session','u','csrf',?)",(now(),))
        con.execute("INSERT INTO cases(id,title,owner_id,created_at,updated_at) VALUES ('c','Private case','u',?,?)",(now(),now()))
        evidence=storage.put(con,'c','video',b'private test payload','video/mp4','test')
        db.audit(con,'u','test.created','c')
    output=tmp_path/'snapshot.sab'
    backup(config,output)
    assert b'Private case' not in output.read_bytes()
    key=(config.data_dir/'media.key').read_bytes()
    with pytest.raises(InvalidToken):
        restore(output,tmp_path/'wrong',Fernet.generate_key())
    result=restore(output,tmp_path/'restored',key)
    assert result['sessions_revoked'] and result['media_verified']==1
    restored_storage=Storage(Config(tmp_path/'restored'))
    restored_db=Database(tmp_path/'restored/sentinel.db',restored_storage.audit_key)
    with restored_db.connect() as con:
        assert con.execute('SELECT count(*) FROM sessions').fetchone()[0]==0
        assert restored_storage.read(con.execute('SELECT * FROM evidence WHERE id=?',(evidence,)).fetchone())==b'private test payload'
        assert restored_db.verify_audit(con)['valid']
    with pytest.raises(ValueError,match='must not exist'):
        restore(output,tmp_path/'restored',key)
    with pytest.raises(ValueError,match='new backup'):
        backup(config,output)
