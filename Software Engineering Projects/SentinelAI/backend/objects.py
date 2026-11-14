"""Limited COCO object candidates. No firearm class, weapon use or intent inference."""
import math
import time
import cv2
import numpy as np
from .ai_models import model_identity
from sentinel_ml.video import video_info

CLASSES={49:'Knife-like object',87:'Scissors-like object'}


def candidates(prediction, threshold=.65):
    found=[]
    for label,score,box in zip(prediction['labels'].tolist(),prediction['scores'].tolist(),prediction['boxes'].tolist()):
        if not math.isfinite(score) or not 0<=score<=1 or len(box)!=4 or not all(math.isfinite(v) for v in box):
            raise ValueError('Object detector returned an invalid prediction.')
        if label in CLASSES and score>=threshold and box[2]>box[0] and box[3]>box[1]:
            found.append({'label':label,'score':round(score,5),'box':[round(v,2) for v in box]})
    return found


class LocalObjects:
    def __init__(self,path):
        import torch
        from torchvision.models.detection import ssdlite320_mobilenet_v3_large
        torch.set_num_threads(min(4,torch.get_num_threads()))
        self.identity=model_identity(path)
        self.model=ssdlite320_mobilenet_v3_large(weights=None,weights_backbone=None)
        self.model.load_state_dict(torch.load(path,map_location='cpu',weights_only=True))
        self.model.eval()
        self.last_report={}

    def analyze(self,path):
        import torch
        fps,count=video_info(path)
        duration=count/fps
        if not .2<=duration<=120.1:
            raise ValueError('Object analysis supports clips up to 120 seconds.')
        start=time.perf_counter()
        cap=cv2.VideoCapture(str(path),cv2.CAP_FFMPEG)
        events,observations=[],[]
        sampled=0
        try:
            with torch.inference_mode():
                for t in np.arange(0,duration,.5):
                    cap.set(cv2.CAP_PROP_POS_FRAMES,min(count-1,int(t*fps)))
                    ok,frame=cap.read()
                    if not ok:
                        raise ValueError('Object analysis could not decode a sampled frame.')
                    h,w=frame.shape[:2]
                    frame=cv2.resize(frame,(640,max(1,round(h*640/w))))
                    tensor=torch.from_numpy(np.ascontiguousarray(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB).transpose(2,0,1))).float()/255
                    output=self.model([tensor])[0]
                    sampled+=1
                    for item in candidates(output):
                        observations.append({'time':float(t),**item,'coordinate_space':[frame.shape[1],frame.shape[0]]})
                        title=CLASSES[item['label']]
                        previous=next((e for e in reversed(events) if e['title']==title and e['end']>=float(t)-.01),None)
                        if previous:
                            previous['end']=min(duration,float(t)+.5)
                            previous['confidence']=max(previous['confidence'],item['score'])
                        else:
                            events.append({'start':float(t),'end':min(duration,float(t)+.5),'kind':'object','title':title,
                                           'detail':'Generic COCO object-model candidate. The object may be an ordinary utensil or a false positive. No weapon use, threat, actor identity or intent is established. Human context review is required; this never triggers automatic emergency dispatch.',
                                           'confidence':item['score'],'source':'model','references':[],'signals':{'context':40}})
        finally:
            cap.release()
        self.last_report={'status':'completed','model':self.identity,'sample_hz':2,'sampled_frames':sampled,'threshold':.65,
                          'threshold_source':'Unvalidated review-candidate threshold; not calibrated probability.',
                          'detections':observations,'elapsed_seconds':round(time.perf_counter()-start,3),
                          'scope':'COCO knife and scissors candidates only. No firearm, injury, accident, weapon-use or officer-role classifier. Requires local-domain evaluation.'}
        return events
