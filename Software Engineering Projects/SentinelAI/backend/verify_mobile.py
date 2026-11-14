"""Exercise the live private HTTPS server. Credentials arrive over stdin, never argv/logs."""
import hashlib
import json
from pathlib import Path
import ssl
import sys
import time
import httpx


def main():
    directory=Path(sys.argv[1]).resolve()
    credentials=json.load(sys.stdin)
    context=ssl.create_default_context(cafile=str(directory/'phone-trust.crt'))
    url=credentials['url']
    output=directory/'verification.json'
    results=[]
    with httpx.Client(base_url=url,verify=context,trust_env=False,timeout=60) as phone, httpx.Client(base_url=url,verify=context,trust_env=False,timeout=60) as desk, httpx.Client(base_url=url,verify=context,trust_env=False,timeout=60) as anon:
        assert anon.post('/api/auth/demo',json={'user_id':'demo-citizen'}).status_code==403
        assert anon.get('/api/test-videos').status_code==401
        for client,role in ((phone,'citizen'),(desk,'admin')):
            account=next(a for a in credentials['accounts'] if a['role']==role)
            response=client.post('/api/auth/login',json={'email':account['email'],'password':account['password']})
            assert response.status_code==200, 'Password login failed'
            assert 'Secure' in response.headers['set-cookie'] and 'HttpOnly' in response.headers['set-cookie']
            client.headers['X-CSRF-Token']=response.json()['csrf']
        assert desk.get('/api/notifications/status').json()['enabled'] is False
        for ident in ('EN-01','EN-02'):
            video=phone.get('/api/test-videos/'+ident);video.raise_for_status()
            data=video.content;digest=hashlib.sha256(data).hexdigest()
            metadata={'title':'LAN verification '+ident,'consent':True,'test_recording':False}
            # Supplied-pack checksums must force the test label even if the selector was missed.
            response=phone.post('/api/uploads',json={'metadata':metadata,'extension':'.mp4','size':len(data),'sha256':digest})
            response.raise_for_status();session=response.json()
            for offset in range(session['received'],len(data),1024*1024):
                part=phone.put(f"/api/uploads/{session['id']}?offset={offset}",content=data[offset:offset+1024*1024],headers={'Content-Type':'application/octet-stream'})
                part.raise_for_status()
            response=phone.post(f"/api/uploads/{session['id']}/complete");response.raise_for_status();case_id=response.json()['id']
            assert phone.post(f"/api/uploads/{session['id']}/complete").json()['id']==case_id
            start=time.perf_counter();last_stage=None
            while time.perf_counter()-start<600:
                response=desk.get('/api/cases/'+case_id);response.raise_for_status();case=response.json()
                state=case['processing_status']
                if state!=last_stage:
                    print(json.dumps({'fixture':ident,'state':state}),flush=True);last_stage=state
                if state in ('completed','partial','failed'):break
                time.sleep(3)
            assert case['processing_status'] in ('completed','partial'),case.get('processing_error')
            assert case['test_recording'] and not case['synthetic']
            assert case['privacy_status']=='full_frame_blurred' and case['segments']
            media=next(e for e in case['evidence'] if e['kind']=='video')
            assert anon.get('/api/evidence/'+media['id']).status_code==401
            assert desk.get('/api/evidence/'+media['id'],headers={'Range':'bytes=0-1023'}).status_code in (200,206)
            report=desk.get('/api/cases/'+case_id+'/report?format=json');report.raise_for_status()
            assert report.json()['test_recording']
            assert phone.post('/api/cases/'+case_id+'/review',json={'action':'dismiss','reason':'Must be denied for an uploader account.','version':case['version']}).status_code==403
            results.append({'fixture':ident,'case_id':case_id,'sha256':digest,'processing_status':case['processing_status'],'risk_label':case['risk_label'],'test_recording':bool(case['test_recording']),'segments':len(case['segments']),'events':len(case['events']),'privacy_status':case['privacy_status'],'assessment':case['assessment'],'seconds_waited':round(time.perf_counter()-start,3)})
        for client in (phone,desk):client.post('/api/auth/logout')
    output.write_text(json.dumps({'scope':'Two software HTTP clients on this PC using the Wi-Fi IP and CA-verified TLS. Physical Android not tested by this script.','verified':['password login and secure cookies','anonymous media/download denied','resumable upload and idempotent completion','desktop reads uploader case','actual configured local models','test-pack checksum recognition','role-restricted review','export test label','external notifications disabled'],'cases':results},indent=2),encoding='utf-8')
    print('HTTPS workflow verified; report: '+str(output),flush=True)


if __name__=='__main__':main()
