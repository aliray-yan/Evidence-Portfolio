"""Run installed visual-only models on attributed local clips; no accuracy claims."""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np
from .config import Config
from .visual_exchange import LocalVisualExchange
from sentinel_ml.video import sha256


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory',required=True)
    parser.add_argument('--clip',choices=('cash','handshake','normal','document'),help='Evaluate only this control and save its separate report')
    args=parser.parse_args();directory=Path(args.directory)
    config=Config.from_env()
    model=LocalVisualExchange(config.exchange_model,config.gesture_model)
    reports=[]
    try:
        for source in sorted(directory.glob('*.source.json')):
            if args.clip and source.name!=args.clip+'.source.json':continue
            video=source.with_suffix('').with_suffix('.mp4')
            if not video.is_file():continue
            provenance=json.loads(source.read_text(encoding='utf-8'))
            if sha256(video)!=provenance['sha256']:
                raise ValueError('Evaluation video differs from its attributed source checksum: '+video.name)
            events=model.analyze(video);report=model.last_report
            record={'file':video.name,'source':provenance,'findings':events,'report':report}
            reports.append(record)
            print(json.dumps({'file':video.name,'findings':len(events),'frames':report['sampled_frames'],'seconds':report['elapsed_seconds'],
                'frames_with_two_people':sum(x['people']>=2 for x in report['coverage']),'frames_with_two_hands':sum(x['hands']>=2 for x in report['coverage']),
                'frames_with_object_proposals':sum(x['object_proposals']>0 for x in report['coverage'])}),flush=True)
            cap=cv2.VideoCapture(str(video),cv2.CAP_FFMPEG);count=cap.get(cv2.CAP_PROP_FRAME_COUNT);frames=[]
            for index in np.linspace(0,max(0,count-1),6).astype(int):
                cap.set(cv2.CAP_PROP_POS_FRAMES,int(index));ok,frame=cap.read()
                if ok:frames.append(cv2.resize(frame,(320,180)))
            cap.release()
            if len(frames)==6:cv2.imwrite(str(directory/(video.stem+'-contact.jpg')),np.concatenate([np.concatenate(frames[:3],axis=1),np.concatenate(frames[3:],axis=1)],axis=0))
    finally:model.close()
    report_name='evaluation-'+args.clip+'.json' if args.clip else 'evaluation.json'
    (directory/report_name).write_text(json.dumps({'scope':'Actual inference on stock controls; no fine-tuning. Not independent test accuracy. Scene annotations require visual inspection.','results':reports},indent=2),encoding='utf-8')


if __name__=='__main__':main()
