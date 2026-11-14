"""Shared retention procedure: explicit administrator run or opted-in maintenance."""
from datetime import datetime, timedelta, timezone
import json
from .db import now, encode


def candidates(con, db, at=None):
    at = at or datetime.now(timezone.utc)
    policy = db.setting(con, 'retention')['value']
    cutoff = (at-timedelta(days=policy['days'])).isoformat()
    quarantine = (at-timedelta(days=policy['quarantine_days'])).isoformat()
    cases = [dict(r) for r in con.execute("SELECT id,title,created_at FROM cases WHERE created_at<? AND legal_hold=0 AND status!='deleted' AND processing_status NOT IN ('processing','queued')",(cutoff,))]
    expired_ids = {c['id'] for c in cases}
    originals = [dict(r) for r in con.execute("SELECT e.* FROM evidence e JOIN cases c ON c.id=e.case_id WHERE e.kind='original' AND e.created_at<? AND c.legal_hold=0 AND c.processing_status='failed'",(quarantine,)) if r['case_id'] not in expired_ids]
    return cases, originals


def purge(con, db, storage, actor_id, reason, at=None):
    expired, raw = candidates(con, db, at)
    for case in expired:
        for evidence in con.execute('SELECT * FROM evidence WHERE case_id=?',(case['id'],)).fetchall():
            storage.delete(evidence)
        con.execute("UPDATE alerts SET event_id=NULL,status='resolved' WHERE case_id=?",(case['id'],))
        # Response notes may contain personal details too; erase them with case content.
        con.execute("UPDATE alert_history SET reason='Erased under retention policy' WHERE alert_id IN (SELECT id FROM alerts WHERE case_id=?)",(case['id'],))
        for table in ('search_indexes','reading_guides','evidence','segments','events','notes','reviews','jobs'):
            con.execute(f'DELETE FROM {table} WHERE case_id=?',(case['id'],))
        con.execute('DELETE FROM live_segments WHERE case_id=?', (case['id'],))
        con.execute('DELETE FROM live_results WHERE case_id=?', (case['id'],))
        con.execute("UPDATE cases SET title='Deleted under retention policy',description='',location='',latitude=NULL,longitude=NULL,status='deleted',assessment='{}',stages='[]',sha256=NULL,privacy_status='deleted',risk_label='Unassessed',risk_score=NULL,processing_status='deleted',processing_error=NULL,version=version+1,updated_at=? WHERE id=?",(now(),case['id']))
        db.audit(con,actor_id,'retention.deleted',case['id'],{'reason':reason})
    for evidence in raw:
        storage.delete(evidence)
        con.execute('DELETE FROM evidence WHERE id=?',(evidence['id'],))
        db.audit(con,actor_id,'retention.quarantine_deleted',evidence['case_id'])
    cutoff = ((at or datetime.now(timezone.utc))-timedelta(days=db.setting(con,'retention')['value']['days'])).isoformat()
    for session in con.execute("SELECT id FROM live_sessions WHERE created_at<? AND status NOT IN ('active','deleted') AND NOT EXISTS(SELECT 1 FROM live_segments WHERE session_id=live_sessions.id) AND NOT EXISTS(SELECT 1 FROM live_results r JOIN cases c ON c.id=r.case_id WHERE r.session_id=live_sessions.id AND c.legal_hold=1)", (cutoff,)).fetchall():
        con.execute("UPDATE live_sessions SET title='Deleted under retention policy',stop_reason='',status='deleted' WHERE id=?", (session['id'],))
        con.execute('DELETE FROM live_results WHERE session_id=?',(session['id'],))
        db.audit(con, actor_id, 'retention.live_deleted', session['id'])
    result={'deleted_cases':len(expired),'deleted_originals':len(raw)}
    db.audit(con,actor_id,'retention.run','retention',{**result,'reason':reason})
    return result


def run_scheduled(db, storage, at=None):
    at = at or datetime.now(timezone.utc)
    with db.transaction() as con:
        policy = db.setting(con,'maintenance')
        if not policy['value']['retention_enabled']:
            return None
        row = con.execute("SELECT value FROM settings WHERE key='maintenance_state'").fetchone()
        previous = json.loads(row['value']) if row else {}
        if previous.get('last_retention_at') and at < datetime.fromisoformat(previous['last_retention_at'])+timedelta(hours=policy['value']['interval_hours']):
            return None
        result = purge(con,db,storage,None,f"Scheduled retention authorized by maintenance policy v{policy['version']}",at)
        state = {'last_retention_at':at.isoformat(), **result}
        con.execute("INSERT INTO settings(key,value) VALUES ('maintenance_state',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,version=version+1",(encode(state),))
        return state
