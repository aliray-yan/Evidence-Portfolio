"""Private MediaMTX process and cookie-authorized WHIP/WHEP leases.

Only ICE media ports listen on the LAN. Signaling and control bind to loopback;
browser callers never receive the internal service credential/resource secret.
"""
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import secrets
import socket
import subprocess
import threading
import time
from urllib.parse import urlparse
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import Response
from .config import ROOT
from .db import now, uid
from .live import access, bounded_body
from .security import user, require, REVIEWERS, token_hash
from .setup_streaming import DESTINATION

router=APIRouter(prefix='/api/live')


def free_port(udp=False):
    with socket.socket(socket.AF_INET,socket.SOCK_DGRAM if udp else socket.SOCK_STREAM) as listener:
        listener.bind(('127.0.0.1',0))
        return listener.getsockname()[1]


class Streaming:
    def __init__(self,config,db,storage,processor):
        self.config,self.db,self.storage=config,db,storage
        self.processor=processor
        self.process=None
        self.error='Live streaming is disabled.'
        self.lock=threading.RLock()
        self.leases={}
        self.readers={}
        self.password=secrets.token_urlsafe(32)
        self.http_port,self.rtsp_port,self.ice_port=free_port(),free_port(),free_port(udp=True)
        self.base=f'http://127.0.0.1:{self.http_port}'
        self.auth=httpx.BasicAuth('sentinel',self.password)

    def start(self):
        if not self.config.streaming:
            return
        binary=DESTINATION/'mediamtx.exe'
        try:
            if any(importlib.util.find_spec(name) is None for name in ('av','psutil')):
                raise ValueError('Install requirements-streaming.txt to enable original-stream decoding and measurement.')
            if not (ROOT/'.local/tools/sentinel-stream-bridge.exe').is_file():
                raise ValueError('Build the local timestamp adapter with python -m backend.setup_streaming --bridge.')
            manifest=json.loads((DESTINATION/'install.json').read_text())
            if hashlib.sha256(binary.read_bytes()).hexdigest()!=manifest['executable_sha256']:
                raise ValueError('Streaming executable checksum failed.')
            hosts=['127.0.0.1',*[h for h in self.config.allowed_hosts if re.fullmatch(r'(?:\d{1,3}\.){3}\d{1,3}',h) and h!='127.0.0.1']]
            settings={'logLevel':'error','logDestinations':['stdout'],'readTimeout':'10s','writeTimeout':'10s','writeQueueSize':128,
                'authMethod':'internal','authInternalUsers':[{'user':'sentinel','pass':self.password,'ips':['127.0.0.1'],'permissions':[{'action':'publish','path':'~^live_[0-9a-f]{16}$'},{'action':'read','path':'~^live_[0-9a-f]{16}$'}]}],
                'api':False,'metrics':False,'pprof':False,'playback':False,
                'rtsp':True,'rtspAddress':f'127.0.0.1:{self.rtsp_port}','rtspTransports':['tcp'],
                'rtmp':False,'hls':False,'srt':False,'moq':False,
                'webrtc':True,'webrtcAddress':f'127.0.0.1:{self.http_port}','webrtcAllowOrigins':[],
                'webrtcLocalUDPAddress':f':{self.ice_port}','webrtcIPsFromInterfaces':False,'webrtcAdditionalHosts':hosts,'webrtcICEServers2':[],
                'pathDefaults':{'source':'publisher','maxReaders':4,'useAbsoluteTimestamp':True,'record':False,'overridePublisher':False},
                'paths':{'~^live_[0-9a-f]{16}$':{}}}
            directory=self.config.data_dir/'streaming'
            directory.mkdir(exist_ok=True)
            self.settings_path=directory/('settings-'+secrets.token_hex(6)+'.json')
            self.settings_path.write_text(json.dumps(settings),encoding='utf-8')
            self.process=subprocess.Popen([str(binary),str(self.settings_path)],cwd=directory,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
            for _ in range(40):
                if self.process.poll() is not None:
                    raise ValueError('MediaMTX did not start. Check port availability and the installed version.')
                try:
                    with socket.create_connection(('127.0.0.1',self.http_port),timeout=.15):
                        self.error=''
                        return
                except OSError:
                    time.sleep(.1)
            raise ValueError('MediaMTX startup timed out.')
        except (OSError,ValueError,KeyError) as exc:
            self.error=str(exc) if isinstance(exc,ValueError) else 'The verified streaming runtime is missing. Run python -m backend.setup_streaming --bridge.'
            self.stop()

    @property
    def available(self):
        return bool(self.process and self.process.poll() is None and not self.error)

    def close_lease(self,key):
        with self.lock:
            lease=self.leases.pop(key,None)
        if not lease:
            return
        if lease['direction']=='publish':
            reader=self.readers.get(lease['session_id'])
            if reader:reader.stop()
        if not lease['location']:return
        try:
            with httpx.Client(timeout=3,trust_env=False,auth=self.auth) as client:
                result=client.delete(self.base+lease['location'])
                if result.status_code not in (200,204,404):
                    raise ValueError('Could not revoke streaming access.')
        except (httpx.HTTPError,ValueError):
            # A failed revocation must not leave an unauthorized clear feed alive.
            if self.process and self.process.poll() is None:
                self.process.terminate()
            self.error='Streaming stopped because access revocation could not be confirmed.'
        with self.db.transaction() as con:
            self.db.audit(con,None,'stream.connection_closed',lease['session_id'],{'connection':key,'direction':lease['direction']})

    def close_session(self,ident):
        with self.lock:
            keys=[k for k,v in self.leases.items() if v['session_id']==ident]
            reader=self.readers.get(ident)
        for key in keys:
            self.close_lease(key)
        if reader:
            reader.stop()

    def sweep(self):
        with self.lock:
            leases=list(self.leases.items())
        stale=[]
        with self.db.connect() as con:
            for key,lease in leases:
                actor=con.execute('SELECT u.id,u.role,u.active,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?',(lease['token'],)).fetchone()
                session=con.execute('SELECT status,owner_id FROM live_sessions WHERE id=?',(lease['session_id'],)).fetchone()
                if time.monotonic()-lease['seen']>(15 if lease['location'] else 30) or not actor or not actor['active'] or actor['expires_at']<=now() or not session or session['status']!='active' or (lease['direction']=='view' and actor['role'] not in REVIEWERS) or (lease['direction']=='publish' and actor['id']!=session['owner_id']):
                    stale.append(key)
        for key in stale:
            self.close_lease(key)
        with self.lock:
            for ident,reader in list(self.readers.items()):
                reader.ring.expire()
                if reader.stopped_at and time.monotonic()-reader.stopped_at>60:
                    reader.ring.clear()
                    del self.readers[ident]

    def stop(self):
        for reader in list(self.readers.values()):
            reader.stop()
        self.readers.clear()
        self.leases.clear()
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:self.process.kill()
        if getattr(self,'settings_path',None):
            self.settings_path.unlink(missing_ok=True)

    def status(self,ident):
        with self.lock:
            reader=self.readers.get(ident)
            published=any(v['session_id']==ident and v['direction']=='publish' for v in self.leases.values())
        return {'available':self.available,'error':self.error,'published':published,'transport':'MediaMTX / WHIP / WHEP',
                'requested_buffer_ms':2500,'maximum_buffer_ms':4000,
                'analysis':reader.snapshot() if reader else {'status':'waiting','detail':'Waiting for the original camera stream.'}}


@router.get('/{ident}/stream')
def status(ident:str,request:Request,actor=Depends(user)):
    with request.app.state.db.connect() as con:
        access(con,actor,ident)
    return request.app.state.streaming.status(ident)


@router.post('/{ident}/transport/{direction}',status_code=201)
async def connect(ident:str,direction:str,request:Request,actor=Depends(user)):
    if direction not in ('publish','view'):
        raise HTTPException(404,'Unknown streaming direction.')
    engine=request.app.state.streaming
    if not engine.available:
        raise HTTPException(503,engine.error or 'The streaming service is unavailable.')
    with engine.db.connect() as con:
        row=access(con,actor,ident,owner=direction=='publish')
        if direction=='view':require(actor,REVIEWERS)
        if row['status']!='active':raise HTTPException(409,'This camera session has ended.')
    body=await bounded_body(request,64000)
    if not body.startswith(b'v=0'):
        raise HTTPException(415,'A valid WebRTC session offer is required.')
    key=uid('stream_')
    with engine.lock:
        # The CPU profile intentionally accepts one publisher, not an untested
        # number of cameras whose inference queues could grow without bound.
        if direction=='publish' and any(v['direction']=='publish' for v in engine.leases.values()):
            raise HTTPException(409,'This CPU profile supports one live camera. End the current camera session first.')
        if direction=='view' and sum(v['session_id']==ident and v['direction']=='view' for v in engine.leases.values())>=3:
            raise HTTPException(429,'Three reviewers are already watching this session.')
        engine.leases[key]={'session_id':ident,'direction':direction,'actor':actor['id'],'token':token_hash(request.cookies.get('sentinel_session','')),'seen':time.monotonic(),'location':''}
    try:
        async with httpx.AsyncClient(timeout=15,auth=engine.auth,trust_env=False) as client:
            result=await client.post(engine.base+'/'+ident+('/whip' if direction=='publish' else '/whep'),content=body,headers={'Content-Type':'application/sdp'})
        if result.status_code!=201:
            raise HTTPException(409 if result.status_code==404 else 502,'The camera stream is not ready or codec negotiation failed. Start the phone camera and retry.')
        location=urlparse(result.headers.get('location',''))
        if location.netloc and location.netloc!=urlparse(engine.base).netloc or not location.path.startswith('/'+ident+'/') or '..' in location.path:
            raise HTTPException(502,'The streaming service returned an invalid session resource.')
        with engine.lock:
            if key not in engine.leases:
                raise HTTPException(409,'The streaming request expired. Reconnect.')
            engine.leases[key]['location']=location.path
        with engine.db.transaction() as con:
            engine.db.audit(con,actor['id'],'stream.'+direction+'_started',ident,{'connection':key,'clear':True,'source':'original WebRTC stream'})
        if direction=='publish':
            from .stream_analysis import StreamAnalysis
            reader=StreamAnalysis(engine,ident,actor)
            with engine.lock:
                previous=engine.readers.get(ident)
                if previous:previous.stop();previous.ring.clear()
                engine.readers[ident]=reader
            reader.start()
        return {'sdp':result.text,'connection':key}
    except Exception:
        with engine.lock:
            lease=engine.leases.pop(key,None)
        if lease and lease['location']:
            with engine.lock:engine.leases[key]=lease
            engine.close_lease(key)
        raise


@router.post('/{ident}/connections/{key}/heartbeat')
def heartbeat(ident:str,key:str,request:Request,actor=Depends(user)):
    engine=request.app.state.streaming
    with engine.db.transaction() as con:
        row=access(con,actor,ident)
        with engine.lock:
            lease=engine.leases.get(key)
            if not lease or lease['session_id']!=ident or lease['token']!=token_hash(request.cookies.get('sentinel_session','')):
                raise HTTPException(404,'This streaming connection expired.')
            if row['status']!='active':raise HTTPException(409,'This camera session has ended.')
            if lease['direction']=='view':require(actor,REVIEWERS)
            lease['seen']=time.monotonic()
            if lease['direction']=='publish':con.execute('UPDATE live_sessions SET last_seen_at=? WHERE id=?',(now(),ident))
    return engine.status(ident)


@router.delete('/{ident}/connections/{key}')
def disconnect(ident:str,key:str,request:Request,actor=Depends(user)):
    engine=request.app.state.streaming
    with engine.db.connect() as con:
        row=access(con,actor,ident)
    with engine.lock:
        lease=engine.leases.get(key)
        if lease and (lease['session_id']!=ident or lease['actor']!=actor['id'] and row['owner_id']!=actor['id']):
            raise HTTPException(403,'This streaming connection belongs to another account.')
    engine.close_lease(key)
    return {'ok':True}


@router.get('/{ident}/results')
def results(ident:str,request:Request,after:int=Query(0,ge=0),actor=Depends(user)):
    engine=request.app.state.streaming
    require(actor,REVIEWERS)
    with engine.db.transaction() as con:
        access(con,actor,ident)
        rows=con.execute('SELECT seq,payload,case_id FROM live_results WHERE session_id=? AND seq>? ORDER BY seq LIMIT 100',(ident,after)).fetchall()
        if request.app.state.previews.audit_due(actor['id'],ident,'stream_results'):
            engine.db.audit(con,actor['id'],'stream.results_access',ident)
    return {'items':[{**json.loads(engine.storage.cipher.decrypt(row['payload'].encode())), 'seq':row['seq'],'case_id':row['case_id']} for row in rows]}


def replay_data(engine,con,actor,ident,result_id):
    access(con,actor,ident)
    row=con.execute('SELECT * FROM live_results WHERE session_id=? AND id=?',(ident,result_id)).fetchone()
    if not row:raise HTTPException(404,'Finding not found.')
    reader=engine.readers.get(ident)
    if not reader:raise HTTPException(410,'The rolling replay expired. Only explicitly preserved evidence remains.')
    payload=json.loads(engine.storage.cipher.decrypt(row['payload'].encode()))
    if payload.get('epoch')!=reader.epoch:raise HTTPException(410,'This finding belongs to an earlier camera connection whose rolling replay expired.')
    try:data,metadata=reader.ring.replay(payload['start_rtp'],payload['end_rtp'])
    except ValueError as exc:raise HTTPException(410,str(exc))
    return row,data,metadata


@router.get('/{ident}/results/{result_id}/replay')
def replay(ident:str,result_id:str,request:Request,actor=Depends(user)):
    require(actor,REVIEWERS)
    engine=request.app.state.streaming
    with engine.db.transaction() as con:
        _,data,metadata=replay_data(engine,con,actor,ident,result_id)
        engine.db.audit(con,actor['id'],'stream.clear_replay',ident,{'result':result_id,**metadata})
    return Response(data,media_type='video/mp4',headers={'Cache-Control':'no-store','X-Replay-Start-RTP':str(metadata['start_rtp']),'X-Replay-Audio':str(metadata['audio']).lower()})


@router.post('/{ident}/results/{result_id}/preserve',status_code=201)
def preserve(ident:str,result_id:str,request:Request,actor=Depends(user)):
    from .submission import Submission,accept_submission
    require(actor,REVIEWERS)
    engine=request.app.state.streaming
    with engine.db.transaction() as con:
        row=con.execute('SELECT case_id FROM live_results WHERE session_id=? AND id=?',(ident,result_id)).fetchone()
        access(con,actor,ident)
        if row and row['case_id']:return {'id':row['case_id'],'duplicate':True}
        session=con.execute('SELECT * FROM live_sessions WHERE id=?',(ident,)).fetchone()
        row,data,metadata=replay_data(engine,con,actor,ident,result_id)
        submission=Submission(title=('Live review: '+session['title'])[:160],consent=True,test_recording=bool(session['test_recording']))
        result=accept_submission(con,engine.db,engine.storage,actor,submission,data,'.mp4',force_test=bool(session['test_recording']))
        provenance={'finding':json.loads(engine.storage.cipher.decrypt(row['payload'].encode())),'replay':metadata,
                    'scope':'Original live result and source-clock mapping. Subsequent case analysis may use different keyframe-aligned windows.'}
        engine.storage.put(con,result['id'],'live_finding',json.dumps(provenance).encode(),'application/json','original_stream_provenance')
        con.execute('UPDATE live_results SET case_id=? WHERE id=?',(result['id'],result_id))
        engine.db.audit(con,actor['id'],'stream.preserved',result['id'],{'session':ident,'result':result_id,**metadata})
    engine.processor.wake_event.set()
    return result
