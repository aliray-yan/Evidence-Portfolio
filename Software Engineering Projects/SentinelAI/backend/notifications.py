"""Manually requested, signed webhook delivery. Demonstrations cannot send externally."""
import hashlib
import hmac
from urllib.parse import urlparse
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from .db import uid, now, encode
from .schemas import Reason
from .security import user, require, RESPONDERS

router=APIRouter()


def delivery_status(config):
    try:
        url=urlparse(config.notification_url)
        configured=url.scheme=='https' and bool(url.hostname) and (url.port is None or 1<=url.port<=65535) and not url.username and not url.password and not url.fragment and len(config.notification_secret)>=32
    except ValueError:
        configured=False
    return {'enabled':bool(configured and not config.demo),
            'status':'disabled_in_demo' if config.demo else 'configured' if configured else 'unavailable',
            'detail':'External delivery is disabled in demonstration mode.' if config.demo else 'Signed webhook configured; sending requires a responder action. Provider acceptance is not recipient delivery.' if configured else 'Configure an HTTPS webhook and a signing secret of at least 32 characters. SMS, push and dispatch require a downstream provider.'}


def dispatch(config,key,payload):
    body=encode(payload).encode()
    signature=hmac.new(config.notification_secret.encode(),body,hashlib.sha256).hexdigest()
    # Do not follow redirects or use machine proxy credentials. Do not send media,
    # location, transcript, participant names, session cookies or credentials.
    with httpx.Client(timeout=10,follow_redirects=False,trust_env=False) as client:
        response=client.post(config.notification_url,content=body,headers={'Content-Type':'application/json','Idempotency-Key':key,'X-Sentinel-Signature':'sha256='+signature})
    return response.status_code


@router.get('/api/notifications/status')
def status(request:Request,actor=Depends(user)):
    require(actor,RESPONDERS)
    return delivery_status(request.app.state.config)


@router.post('/api/alerts/{alert_id}/notify')
def notify(alert_id:str,body:Reason,request:Request,actor=Depends(user)):
    require(actor,RESPONDERS)
    db,config=request.app.state.db,request.app.state.config
    if not delivery_status(config)['enabled']:
        raise HTTPException(409,delivery_status(config)['detail'])
    with db.transaction() as con:
        alert=con.execute('SELECT a.*,c.synthetic,c.test_recording,c.status AS case_status FROM alerts a JOIN cases c ON c.id=a.case_id WHERE a.id=?',(alert_id,)).fetchone()
        if not alert:raise HTTPException(404,'Alert not found.')
        if alert['synthetic'] or alert['test_recording'] or alert['case_status']=='deleted' or alert['status']=='resolved':
            raise HTTPException(409,'Synthetic scenarios, test recordings, deleted or resolved cases cannot send external notifications.')
        row=con.execute('SELECT * FROM outbound_notifications WHERE alert_id=?',(alert_id,)).fetchone()
        if row and row['status']=='accepted_by_provider':return {'status':row['status'],'detail':'This provider already accepted the notification. Recipient delivery is unconfirmed.'}
        if row and row['status']=='sending':raise HTTPException(409,'Delivery is already in progress. Refresh the response log shortly.')
        ident=row['id'] if row else uid('delivery_')
        con.execute("INSERT INTO outbound_notifications VALUES (?,?, 'sending',1,?,?,NULL) ON CONFLICT(alert_id) DO UPDATE SET status='sending',attempts=attempts+1,updated_at=excluded.updated_at,error_type=NULL",(ident,alert_id,now(),now()))
        payload={'schema':1,'notification_id':ident,'alert_id':alert_id,'case_id':alert['case_id'],'severity':alert['severity'],'event_time':alert['created_at'],'human_review_required':True}
        con.execute("UPDATE notifications SET status='sending',detail='Manual webhook request in progress; delivery is not confirmed.' WHERE alert_id=? AND channel='external'",(alert_id,))
        db.audit(con,actor['id'],'notification.requested',alert['case_id'],{'notification_id':ident,'reason':body.reason})
    try:
        code=dispatch(config,ident,payload)
        state='accepted_by_provider' if 200<=code<300 else 'rejected_by_provider'
        detail='Webhook provider accepted the request. Recipient delivery, SMS, push and dispatch are not confirmed.' if state=='accepted_by_provider' else f'Webhook provider rejected the request (HTTP {code}). Review provider configuration before retrying.'
        error=None if state=='accepted_by_provider' else 'HTTP'+str(code)
    except (httpx.HTTPError,OSError):
        state,detail,error='delivery_unknown','No confirmed response from the webhook provider. It may have received the request; retries use the same idempotency key.','network_error'
    with db.transaction() as con:
        con.execute('UPDATE outbound_notifications SET status=?,updated_at=?,error_type=? WHERE id=?',(state,now(),error,ident))
        con.execute("UPDATE notifications SET status=?,detail=? WHERE alert_id=? AND channel='external'",(state,detail,alert_id))
        db.audit(con,actor['id'],'notification.'+state,alert['case_id'],{'notification_id':ident})
    return {'status':state,'detail':detail}
