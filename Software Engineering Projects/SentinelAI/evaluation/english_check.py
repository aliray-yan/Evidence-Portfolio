"""Measure actual local ASR/rules on authored development videos, never claim held-out quality."""
import json
import tempfile
import time
from pathlib import Path
from backend.config import Config,ROOT
from backend.speech import LocalWhisper
from backend.pipeline import run_ffmpeg
from backend.intelligence import PHRASES,phrase_events,fuse
from backend.db import DEFAULT_SETTINGS
from sentinel_ml.video import sha256
from .metrics import text_error


def main():
    folder=ROOT/'.local/test-videos'; config=Config.from_env()
    manifest=json.loads((folder/'manifest.json').read_text())
    target=ROOT/'.local/ai-verification/english-development-check.json'
    if target.exists():raise ValueError('Preserve the earlier report; move it to an experiment archive before a new run.')
    transcriber=LocalWhisper(config.whisper_model)
    library=[dict(phrase=p,category=c,language=l,explanation=e) for p,c,l,e in PHRASES]
    rows=[]; started=time.perf_counter()
    with tempfile.TemporaryDirectory(dir=folder) as tmp:
        for clip in manifest['videos']:
            video=folder/clip['filename']
            assert sha256(video)==clip['sha256']
            wav=Path(tmp)/'audio.wav'
            run_ffmpeg(['-i',str(video),'-vn','-ar','16000','-ac','1','-c:a','pcm_s16le',str(wav)])
            tick=time.perf_counter(); segments=transcriber.transcribe(wav)
            for i,s in enumerate(segments):s['id']=f'tr_{i}'
            events=phrase_events(segments,library); result=fuse(events,DEFAULT_SETTINGS['thresholds'])
            transcript=' '.join(s['text'] for s in segments)
            routing='safety_review' if result['label']=='Emergency' else 'review' if result['label'] in ('Ambiguous','High Risk') else 'no_payment_concern'
            rows.append({'id':clip['id'],'sha256':clip['sha256'],'expected':clip['expected'],'actual_routing':routing,'matches_authored_expectation':routing==clip['expected'],
                         'transcript':transcript,'text_error':text_error(clip['reference_transcript'],transcript),'events':events,'speech_report':transcriber.last_report,'seconds':round(time.perf_counter()-tick,3)})
            print(json.dumps({'id':clip['id'],'expected':clip['expected'],'actual':routing,'seconds':rows[-1]['seconds']}),flush=True)
    words=sum(r['text_error']['reference_words'] for r in rows); errors=sum(r['text_error']['word_errors'] for r in rows)
    report={'scope':'Authored development fixtures generated while improving the rules. Not independent, not a police-domain accuracy study, and not comparable to Urdu/Punjabi without equivalent reference recordings.',
            'model':'Local Whisper small CPU int8','clips':len(rows),'matching_authored_routing':sum(r['matches_authored_expectation'] for r in rows),'word_errors':errors,'reference_words':words,'wer':errors/words if words else None,'elapsed_seconds':round(time.perf_counter()-started,3),'results':rows}
    target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='results'}),flush=True)


if __name__=='__main__':main()
