"""Run the real pipeline on an authorized holdout, or score saved predictions."""
import argparse
from dataclasses import replace
import json
from pathlib import Path
import tempfile
import time
from sentinel_ml.video import sha256
from backend.config import Config
from backend.db import Database, now, uid
from backend.storage import Storage
from backend.pipeline import Processor
from backend.seed import seed
from .metrics import summarize


def load_manifest(path):
    path=Path(path).resolve()
    data=json.loads(path.read_text(encoding='utf-8'))
    rows=data['clips']
    if data.get('schema')!=1 or not rows:raise ValueError('Expected schema 1 and a nonempty clips list.')
    seen,groups,ids=set(),{},set()
    for row in rows:
        if row.get('authorized') is not True or not row.get('source_group') or row.get('split') not in ('train','dev','test'):
            raise ValueError('Every clip requires confirmed authorized use, a source/session group, and an explicit split.')
        if row['clip_id'] in ids:raise ValueError('Duplicate clip ID.')
        ids.add(row['clip_id'])
        file=(path.parent/row['file']).resolve()
        if not file.is_relative_to(path.parent):raise ValueError('Clip paths must stay within the manifest folder.')
        if not file.is_file() or sha256(file)!=row['sha256']:raise ValueError('Clip checksum mismatch or missing file.')
        if row['sha256'] in seen:raise ValueError('Duplicate clip content. Curate before evaluation.')
        seen.add(row['sha256'])
        if row['source_group'] in groups and groups[row['source_group']]!=row['split']:
            raise ValueError('A source/session group crosses dataset splits.')
        groups[row['source_group']]=row['split']
        row['_path']=file
    test=[r for r in rows if r['split']=='test']
    if not test:raise ValueError('No held-out test recordings supplied.')
    return test


def predict(rows):
    config=Config.from_env()
    with tempfile.TemporaryDirectory(dir=config.data_dir.parent,prefix='evaluation-') as tmp:
        config=replace(config,data_dir=Path(tmp),demo=True,workers=False,encryption_key='')
        storage=Storage(config);db=Database(config.data_dir/'sentinel.db',storage.audit_key)
        # Seed phrase library without creating fictional cases or model observations.
        seed(db,storage,replace(config,demo=False))
        with db.transaction() as con:
            con.execute("INSERT INTO users(id,name,email,role,created_at) VALUES ('evaluation','Evaluation','evaluation@example.invalid','admin',?)",(now(),))
        processor=Processor(db,storage,config)
        result=[]
        for row in rows:
            case_id=uid('EVAL-');stamp=now()
            with db.transaction() as con:
                con.execute('INSERT INTO cases(id,title,owner_id,created_at,updated_at) VALUES (?,?,?,?,?)',(case_id,'Authorized evaluation','evaluation',stamp,stamp))
                storage.put(con,case_id,'original',row['_path'].read_bytes(),'video/mp4','authorized_evaluation')
                con.execute('INSERT INTO jobs(id,case_id,created_at,updated_at) VALUES (?,?,?,?)',(uid(),case_id,stamp,stamp))
            start=time.perf_counter();processor.run_once();elapsed=time.perf_counter()-start
            with db.connect() as con:
                case=con.execute('SELECT * FROM cases WHERE id=?',(case_id,)).fetchone()
                assessment=json.loads(case['assessment'])
                segments=[r['text'] for r in con.execute('SELECT text FROM segments WHERE case_id=? ORDER BY start',(case_id,))]
                events=[{'label':r['title'],'start':r['start'],'end':r['end']} for r in con.execute("SELECT title,start,end FROM events WHERE case_id=? AND kind IN ('gesture','body')",(case_id,))]
                turns=[{'speaker':r['title'].split(' · ')[0],'start':r['start'],'end':r['end']} for r in con.execute("SELECT title,start,end FROM events WHERE case_id=? AND kind='speaker_turn'",(case_id,))]
                result.append({'clip_id':row['clip_id'],'sha256':row['sha256'],'status':case['processing_status'],'review_priority':case['risk_label'],
                               'transcript':' '.join(segments) if assessment.get('speech',{}).get('status')=='completed' else None,
                               'gestures':events if assessment.get('perception') else None,'elapsed_seconds':round(elapsed,3),
                               'speaker_turns':turns if assessment.get('diarization',{}).get('status')=='completed' else None,
                               'models':{k:assessment[k] for k in ('speech','vision','perception','objects','acoustics','diarization') if k in assessment}})
            print(f"Processed {row['clip_id']}: {case['processing_status']}",flush=True)
        return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',required=True);parser.add_argument('--predictions');parser.add_argument('--output',required=True)
    args=parser.parse_args()
    output=Path(args.output)
    if output.exists():raise ValueError('Choose a new report file to preserve previous measurements.')
    rows=load_manifest(args.manifest)
    predictions=json.loads(Path(args.predictions).read_text(encoding='utf-8')) if args.predictions else predict(rows)
    report=summarize(rows,predictions)
    report['model_runs']=[{'clip_id':p['clip_id'],'models':p.get('models',{})} for p in predictions]
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
