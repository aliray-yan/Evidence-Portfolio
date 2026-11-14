"""Opt-in official YOLO26n feasibility check. Does not activate a server model.

Download official release bytes with their GitHub SHA-256 digest before loading
the trusted vendor checkpoint. No user media leaves this computer.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.request
from .config import ROOT


def download():
    directory=ROOT/'.local/models/yolo26n-evaluation'
    directory.mkdir(parents=True,exist_ok=True)
    release='https://api.github.com/repos/ultralytics/assets/releases/tags/v8.4.0'
    request=urllib.request.Request(release,headers={'User-Agent':'SentinelAI-local-model-evaluation'})
    with urllib.request.urlopen(request,timeout=30) as response:metadata=json.load(response)
    asset=next(a for a in metadata['assets'] if a['name']=='yolo26n.pt')
    digest=asset.get('digest','')
    if not digest.startswith('sha256:'):raise ValueError('Official asset has no published SHA-256 digest; manual provenance review required.')
    target=directory/'yolo26n.pt'
    if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest()!=digest[7:]:
        with urllib.request.urlopen(asset['browser_download_url'],timeout=90) as response:data=response.read(30*1024*1024)
        if len(data)!=asset['size'] or hashlib.sha256(data).hexdigest()!=digest[7:]:raise ValueError('Official checkpoint checksum/size failed.')
        target.write_bytes(data)
    (directory/'source.json').write_text(json.dumps({'url':asset['browser_download_url'],'sha256':digest[7:],
        'bytes':asset['size'],'license':'Ultralytics AGPL-3.0 / Enterprise; see https://www.ultralytics.com/license',
        'activation':'evaluation only; not selected by the application'},indent=2),encoding='utf-8')
    return target


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download',action='store_true')
    parser.add_argument('--video',help='An explicitly authorized local video; not uploaded or modified.')
    args=parser.parse_args()
    weights=download() if args.download else ROOT/'.local/models/yolo26n-evaluation/yolo26n.pt'
    if not args.video:
        print('Verified evaluation checkpoint:',weights.name);return
    # Set offline before importing the vendor package, including its telemetry init.
    os.environ['YOLO_OFFLINE']='1'
    os.environ['YOLO_AUTOINSTALL']='false'
    os.environ['YOLO_CONFIG_DIR']=str(ROOT/'.local/yolo-evaluation-config')
    (Path(os.environ['YOLO_CONFIG_DIR'])/'Ultralytics').mkdir(parents=True,exist_ok=True)
    import cv2
    import numpy as np
    import torch
    from ultralytics import YOLO,settings
    settings.update({'sync':False,'wandb':False,'mlflow':False,'comet':False,'clearml':False})
    cv2.setNumThreads(1)
    model=YOLO(str(weights))
    capture=cv2.VideoCapture(str(Path(args.video)),cv2.CAP_FFMPEG)
    fps,count=capture.get(cv2.CAP_PROP_FPS),capture.get(cv2.CAP_PROP_FRAME_COUNT)
    if fps<=0 or count<=0:raise ValueError('Video has no usable frame timing.')
    frames=[]
    try:
        for second in range(0,min(35,int(count/fps)),5):
            capture.set(cv2.CAP_PROP_POS_MSEC,second*1000)
            ok,frame=capture.read()
            if ok:frames.append((second,frame))
    finally:capture.release()
    if not frames:raise ValueError('No video frames could be decoded.')
    model.predict(frames[0][1],imgsz=320,device='cpu',classes=[0,43,76],conf=.4,max_det=20,verbose=False,save=False)
    torch.set_num_threads(2)
    times=[];detections=[]
    for iteration in range(3):
        for second,frame in frames:
            start=time.perf_counter()
            result=model.predict(frame,imgsz=320,device='cpu',classes=[0,43,76],conf=.4,max_det=20,verbose=False,save=False)[0]
            times.append((time.perf_counter()-start)*1000)
            if iteration==0:
                detections.append({'seconds':second,'objects':[{'category':model.names[int(box.cls[0])],
                    'confidence':float(box.conf[0]),'xyxy_normalized':box.xyxyn[0].tolist()} for box in result.boxes]})
    import psutil
    report={'model':'YOLO26n','device':'CPU','threads':torch.get_num_threads(),'input_size':320,'calls':len(times),
        'median_ms':float(np.median(times)),'p95_ms':float(np.percentile(times,95)),
        'process_rss_mb':psutil.Process().memory_info().rss/1024**2,'detections':detections,
        'limits':['Sample-video feasibility only, not independent object accuracy evaluation.',
            'Boxes identify model object hypotheses, never a violent person or misconduct.',
            'No speech, bribery, firearms or temporal action classifier in this checkpoint.',
            'No application activation or licensing change performed.']}
    output=ROOT/'.local/ai-verification/yolo26n-feasibility.json';output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='detections'},indent=2))


if __name__=='__main__':main()
