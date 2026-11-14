"""Explicitly select the verified YOLO person model for visual transfer research."""
import json
import hashlib
from pathlib import Path
from .config import ROOT
from .evaluate_yolo import download


def main():
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download',action='store_true',help='Allow downloading the verified public person model if missing')
    args=parser.parse_args()
    target=ROOT/'.local/models/yolo26n-evaluation/yolo26n.pt'
    if not target.is_file() or not target.with_name('source.json').is_file():
        if not args.download:raise ValueError('Person model is missing. Run backend.setup_exchange --download explicitly.')
        target=download()
    source=json.loads(target.with_name('source.json').read_text(encoding='utf-8'))
    if hashlib.sha256(target.read_bytes()).hexdigest()!=source['sha256']:raise ValueError('Restore the official person checkpoint: checksum mismatch.')
    selection=ROOT/'.local/ai-selection.json'
    state=json.loads(selection.read_text(encoding='utf-8')) if selection.exists() else {'schema':1,'models':{}}
    if not state['models'].get('gesture_model'):
        raise ValueError('Install the local MediaPipe hand model first with backend.setup_models --download --only visual.')
    state['models']['exchange_model']={'path':target.relative_to(ROOT).as_posix(),'files':{target.name:source['sha256']},
        'source':source['url'],'license':source['license'],'scope':'Person boxes only, combined with experimental visual-transfer rules. Not a bribery or currency classifier.'}
    temporary=selection.with_suffix('.tmp');temporary.write_text(json.dumps(state,indent=2),encoding='utf-8');temporary.replace(selection)
    print('Selected verified person and hand models for experimental vision-only exchange review. No audio models are activated.')


if __name__=='__main__':main()
