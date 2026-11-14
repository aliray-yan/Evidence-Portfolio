"""Isolated installed-model vision pipeline check; never changes the user's database."""
import argparse
from pathlib import Path
from dataclasses import replace
import json
import tempfile
import time
from fastapi.testclient import TestClient
from .config import Config, ROOT
from .main import create_app


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--video',default=str(ROOT/'.local/visual-exchange-evaluation/cash.mp4'))
    parser.add_argument('--output', type=Path, help='New report path; existing reports are preserved.')
    parser.add_argument('--expect-learned-transfer', action='store_true',
                        help='Require a real learned-model transfer event on this known positive control.')
    args=parser.parse_args();video=Path(args.video)
    directory=ROOT/'.local/ai-verification';directory.mkdir(parents=True,exist_ok=True)
    output=args.output or directory/'vision-only-pipeline.json'
    if output.exists():raise ValueError('Preserve the earlier report; choose a new --output path.')
    data=Path(tempfile.mkdtemp(prefix='vision-only-pipeline-',dir=directory))
    config=replace(Config.from_env(),data_dir=data,demo=True,encryption_key='',workers=False,
                   openrouter_key='',allowed_hosts=('localhost','127.0.0.1','testserver'))
    app=create_app(config)
    with TestClient(app) as client:
        auth=client.post('/api/auth/demo',json={'user_id':'demo-citizen'}).json()
        client.headers['X-CSRF-Token']=auth['csrf']
        response=client.post('/api/cases/upload',data={'title':'Stock visual control - technical test, not an incident',
            'consent':'true','test_recording':'true','description':'Stock evaluation. No accusation about the depicted people.'},
            files={'file':('technical-control.mp4',video.read_bytes(),'video/mp4')})
        assert response.status_code==201,response.text
        case_id=response.json()['id'];started=time.perf_counter();app.state.processor.run_once()
        elapsed=time.perf_counter()-started
        case=client.get('/api/cases/'+case_id).json()
        assert case['processing_status']=='partial',case.get('processing_error')
        assert not case['segments'] and case['assessment']['method']=='vision-only-review-v1'
        assert not any(k in case['assessment'] for k in ('speech','acoustics','diarization','phrase_rules'))
        assert case['assessment']['exchange']['sampled_frames']>0
        if args.expect_learned_transfer:
            exchange=case['assessment']['exchange']
            assert exchange['scored_windows']>0 and exchange['events'], exchange
            assert all(e['source']=='learned-visual-transfer' and not e['boxes']
                       and e['human_review_required'] and not e['currency_identified']
                       for e in exchange['events']), exchange
        assert case['assessment']['vision']['windows']
        assert not any(e['kind']=='face_preview' for e in case['evidence'])
        auth=client.post('/api/auth/demo',json={'user_id':'demo-supervisor'}).json()
        client.headers['X-CSRF-Token']=auth['csrf']
        case=client.get('/api/cases/'+case_id).json()
        for evidence in case['evidence']:
            assert client.get('/api/evidence/'+evidence['id']).status_code==200
        with app.state.db.connect() as con:
            assert not con.execute("SELECT 1 FROM evidence WHERE case_id=? AND kind='original'",(case_id,)).fetchone()
            assert app.state.db.verify_audit(con)['valid']
        report={'scope':'Actual installed-model technical test, not exchange accuracy.', 'case_id':case_id,
            'data_dir':str(data),'source':str(video),'elapsed_seconds':round(elapsed,3),'segments':len(case['segments']),
            'events':case['events'],'assessment':case['assessment'],'original_deleted':True,'audit_valid':True,
            'evidence_count':len(case['evidence']),'status':case['processing_status']}
        output.parent.mkdir(parents=True,exist_ok=True)
        output.write_text(json.dumps(report,indent=2),encoding='utf-8')
        print(json.dumps({k:v for k,v in report.items() if k not in ('events','assessment','source','data_dir')}),flush=True)


if __name__=='__main__':main()
