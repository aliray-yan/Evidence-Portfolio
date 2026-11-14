"""Vision-only experimental transfer candidates. No audio, currency or intent model.

YOLO people + MediaPipe hands + rectangular-region proposals + temporal rules.
The proposals are deliberately named unidentified objects: paper and banknotes
cannot be distinguished by this baseline. All findings require human review.
"""
from collections import deque
import hashlib
import json
import math
import os
from pathlib import Path
import time
import cv2
import numpy as np
from .config import ROOT
from .ai_models import local_mediapipe, model_identity
from sentinel_ml.video import video_info

TITLE = 'Possible Bribery / Suspicious Visual Exchange – Pending Human Review'
VERSION = 'visual-transfer-rules-v1'
SAMPLE_HZ = 2
SCOPE = ('Experimental visual transfer heuristic, not a trained bribery or currency classifier. '
         'Rectangular patches may be documents, cash, clothing or background. Ordinary lawful exchanges can trigger review. '
         'No voice, transcript, keyword, conversation, identity or intent analysis.')


def center(box):
    return np.array([(box[0]+box[2])/2,(box[1]+box[3])/2])


def area(box):
    return max(0,box[2]-box[0])*max(0,box[3]-box[1])


def iou(a,b):
    overlap=area([max(a[0],b[0]),max(a[1],b[1]),min(a[2],b[2]),min(a[3],b[3])])
    return overlap/max(1e-9,area(a)+area(b)-overlap)


def distance_to_box(point,box):
    return float(np.linalg.norm(np.maximum([box[0]-point[0],box[1]-point[1]],0)+np.minimum([box[2]-point[0],box[3]-point[1]],0)))


def rectangular_proposals(rgb,hands):
    """Observable geometry, NOT a money detector. A patch must touch a hand."""
    h,w=rgb.shape[:2]
    gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
    edges=cv2.Canny(cv2.GaussianBlur(gray,(3,3),0),50,140)
    contours,_=cv2.findContours(edges,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    found=[]
    for contour in contours:
        perimeter=cv2.arcLength(contour,True)
        quad=cv2.approxPolyDP(contour,.025*perimeter,True)
        if len(quad)!=4 or not cv2.isContourConvex(quad):continue
        x,y,bw,bh=cv2.boundingRect(quad)
        rect=cv2.minAreaRect(quad);rw,rh=rect[1]
        if min(rw,rh)<5 or not 1.2<=max(rw,rh)/min(rw,rh)<=4.5:continue
        fraction=abs(cv2.contourArea(quad))/(w*h)
        if not .0005<=fraction<=.08:continue
        box=[x/w,y/h,min(1,(x+bw)/w),min(1,(y+bh)/h)]
        if not any(distance_to_box(center(hand['box']),box)<.07 for hand in hands):continue
        if any(iou(box,item['box'])>.5 for item in found):continue
        patch=rgb[y:y+bh,x:x+bw]
        if not patch.size:continue
        # Broad appearance agreement helps reject track swaps; it is not identity.
        appearance=(np.mean(patch,axis=(0,1))/255).tolist()
        found.append({'box':box,'appearance':appearance,'label':'Unidentified rectangular object candidate'})
    return sorted(found,key=lambda item:area(item['box']),reverse=True)[:12]


class ExchangeTracker:
    """Short local track IDs; discontinuities discard incomplete hypotheses."""
    def __init__(self):
        self.people={};self.objects={};self.hand_tracks=[];self.next_id=0;self.previous=None

    def reset(self):
        self.people.clear();self.objects.clear();self.hand_tracks=[];self.previous=None

    def observe(self,stamp,people,hands,objects,rtp=None):
        if not math.isfinite(stamp) or self.previous is not None and stamp<=self.previous:
            raise ValueError('Visual exchange frames require increasing timestamps.')
        if self.previous is not None and stamp-self.previous>.8:self.reset()
        self.previous=stamp
        available=dict(self.people);tracked={}
        for person in people[:8]:
            ranked=sorted([(iou(person['box'],old['box']),key) for key,old in available.items()],reverse=True)
            if ranked and ranked[0][0]>.25 and (len(ranked)<2 or ranked[0][0]-ranked[1][0]>.12):
                key=ranked[0][1];available.pop(key)
            else:self.next_id+=1;key=self.next_id
            tracked[key]=person
        self.people=tracked
        owned=[];previous_hands=list(self.hand_tracks)
        for hand in hands[:4]:
            p=np.array(hand.get('wrist',center(hand['box'])))
            ranked=sorted([(distance_to_box(p,person['box'])+float(np.linalg.norm(p-center(person['box'])))*.15,key) for key,person in tracked.items()])
            matched=sorted([(float(np.linalg.norm(center(hand['box'])-center(old['box']))),i) for i,old in enumerate(previous_hands) if old['person'] in tracked])
            # Carry only an unambiguous, nearby hand track into the contact phase.
            # A crossed/occluded hand with two equally plausible matches abstains.
            if matched and matched[0][0]<.13 and (len(matched)<2 or matched[1][0]-matched[0][0]>.025):
                old=previous_hands.pop(matched[0][1]);owned.append({**hand,'person':old['person']})
            elif ranked and ranked[0][0]<.13 and (len(ranked)<2 or ranked[1][0]-ranked[0][0]>.025):
                owned.append({**hand,'person':ranked[0][1]})
        self.hand_tracks=owned
        old={key:value for key,value in self.objects.items() if stamp-value['last']<=.8}
        updated={};events=[]
        for obj in objects[:12]:
            ranked=[]
            for key,track in old.items():
                movement=float(np.linalg.norm(center(obj['box'])-center(track['box'])))
                ratio=area(obj['box'])/max(1e-9,area(track['box']))
                appearance=float(np.linalg.norm(np.array(obj.get('appearance',[0,0,0]))-np.array(track['appearance'])))
                if movement<.15 and .4<ratio<2.5 and appearance<.35:ranked.append((movement+appearance*.1,key))
            ranked.sort()
            if ranked and (len(ranked)<2 or ranked[1][0]-ranked[0][0]>.015):
                key=ranked[0][1];track=old.pop(key)
            else:
                self.next_id+=1;key=self.next_id
                track={'owner':None,'stable':0,'contact':None,'done':False,'history':deque(maxlen=20),'first':stamp}
            holders={h['person'] for h in owned if distance_to_box(center(h['box']),obj['box'])<.065}
            boxes=[{'xyxy':obj['box'],'label':obj['label'],'seconds':stamp,'rtp':rtp}]
            boxes += [{'xyxy':tracked[p]['box'],'label':'Person track '+str(p),'seconds':stamp,'rtp':rtp} for p in sorted(holders)]
            track['history'].append({'seconds':stamp,'rtp':rtp,'boxes':boxes,'holders':sorted(holders)})
            if len(holders)==1:
                owner=next(iter(holders))
                if owner==track['owner']:
                    track['stable']+=1
                    if track['contact'] and stamp-track['contact']['time']>3:track['contact']=None
                elif track['contact'] and owner in track['contact']['pair'] and owner!=track['owner']:
                    contact=track['contact']
                    contact['after']=contact.get('after',0)+1
                    moved=float(np.linalg.norm(center(obj['box'])-contact['center']))>.025
                    if contact['after']>=2 and moved and stamp-contact['time']<=3 and not track['done']:
                        track['done']=True
                        history=list(track['history'])
                        support=min(.9,.5+.04*len(history))
                        events.append({'start':history[0]['seconds'],'end':stamp,'kind':'visual_exchange','title':TITLE,
                            'detail':'An unidentified rectangular visual patch was tracked near one person’s hand, near two people’s hands, then near the other person’s hand across consecutive samples. This may be an ordinary document or object transfer; cash and bribery are not established.',
                            'confidence':round(support,3),'confidence_type':'heuristic temporal support, not a calibrated model probability',
                            'source':VERSION,'references':[],'signals':{'context':50,'temporal':50},
                            'frames':history,'boxes':[b for f in history for b in f['boxes']],
                            'currency_identified':False,'human_review_required':True})
                else:
                    track.update(owner=owner,stable=1,contact=None,first=stamp)
                    track['history'].clear();track['history'].append({'seconds':stamp,'rtp':rtp,'boxes':boxes,'holders':[owner]})
            elif len(holders)==2 and track['owner'] in holders and track['stable']>=2:
                if not track['contact']:track['contact']={'pair':holders,'time':stamp,'center':center(obj['box']),'after':0}
            else:
                track.update(owner=None,stable=0,contact=None)
            track.update(box=obj['box'],appearance=obj.get('appearance',[0,0,0]),last=stamp)
            updated[key]=track
        self.objects=updated
        return events


class LocalVisualExchange:
    def __init__(self,person_model,hand_model):
        path=Path(person_model)
        provenance=json.loads(path.with_name('source.json').read_text(encoding='utf-8'))
        if hashlib.sha256(path.read_bytes()).hexdigest()!=provenance['sha256']:
            raise ValueError('Visual exchange person model checksum mismatch.')
        os.environ['YOLO_OFFLINE']='1';os.environ['YOLO_AUTOINSTALL']='false'
        os.environ['YOLO_CONFIG_DIR']=str(ROOT/'.local/yolo-evaluation-config')
        (Path(os.environ['YOLO_CONFIG_DIR'])/'Ultralytics').mkdir(parents=True,exist_ok=True)
        import torch
        from ultralytics import YOLO,settings
        settings.update({'sync':False,'wandb':False,'mlflow':False,'comet':False,'clearml':False})
        self.person=YOLO(str(path));torch.set_num_threads(2);cv2.setNumThreads(1)
        self.mp=local_mediapipe()
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
        self.hands=vision.GestureRecognizer.create_from_options(vision.GestureRecognizerOptions(
            base_options=python.BaseOptions(model_asset_path=hand_model),running_mode=vision.RunningMode.IMAGE,
            num_hands=4,min_hand_detection_confidence=.6,min_hand_presence_confidence=.6))
        self.identity={'person':provenance,'hands':model_identity(hand_model),'rules':VERSION}
        self.last_report={}

    def frame(self,rgb,stamp,tracker,rtp=None):
        h,w=rgb.shape[:2]
        if w>640:rgb=cv2.resize(rgb,(640,max(1,round(h*640/w))))
        prediction=self.person.predict(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),imgsz=320,device='cpu',classes=[0],conf=.5,max_det=8,verbose=False,save=False)[0]
        people=[{'box':b.xyxyn[0].tolist(),'confidence':float(b.conf[0])} for b in prediction.boxes]
        image=self.mp.Image(image_format=self.mp.ImageFormat.SRGB,data=np.ascontiguousarray(rgb))
        result=self.hands.recognize(image)
        hands=[]
        for points in result.hand_landmarks:
            if not all(math.isfinite(p.x) and math.isfinite(p.y) for p in points):continue
            xs=[max(0,min(1,p.x)) for p in points];ys=[max(0,min(1,p.y)) for p in points]
            hands.append({'box':[min(xs),min(ys),max(xs),max(ys)],'wrist':[points[0].x,points[0].y]})
        proposals=rectangular_proposals(rgb,hands)
        return tracker.observe(stamp,people,hands,proposals,rtp),{'people':len(people),'hands':len(hands),'object_proposals':len(proposals)}

    def analyze(self,path):
        fps,count=video_info(path);duration=count/fps
        if not .2<=duration<=120.1:raise ValueError('Visual exchange analysis supports 0.2–120 second videos.')
        tracker=ExchangeTracker();events=[];coverage=[];started=time.perf_counter()
        cap=cv2.VideoCapture(str(path),cv2.CAP_FFMPEG)
        try:
            for index in range(0,count,max(1,round(fps/SAMPLE_HZ))):
                cap.set(cv2.CAP_PROP_POS_FRAMES,index);ok,bgr=cap.read()
                if not ok:raise ValueError('A visual exchange sample could not be decoded.')
                stamp=index/fps
                found,details=self.frame(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB),stamp,tracker)
                events.extend(found);coverage.append({'seconds':stamp,**details})
        finally:cap.release()
        self.last_report={'status':'experimental','model':self.identity,'version':VERSION,'sample_hz':SAMPLE_HZ,
            'sampled_frames':len(coverage),'coverage':coverage,'events':events,'elapsed_seconds':round(time.perf_counter()-started,3),'scope':SCOPE}
        return events

    def close(self):
        self.hands.close()
