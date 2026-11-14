"""Build fresh, clearly labeled TTS test videos; no real encounter footage."""
import json
from pathlib import Path
import textwrap
import wave
import zipfile
import cv2
import numpy as np
from backend.config import ROOT
from backend.pipeline import run_ffmpeg
from sentinel_ml.video import sha256


def main():
    examples=json.loads((ROOT/'evaluation/english_examples.json').read_text())
    audio=ROOT/'.local/english-test-audio'
    output=ROOT/'.local/test-videos'
    output.mkdir(parents=True,exist_ok=True)
    if (output/'manifest.json').exists():
        raise ValueError('This pack already exists. Preserve it and use the existing files.')
    rows=[]
    for clip in examples['clips']:
        wav=output/(clip['id']+'.wav'); intervals=[]; duration=1.
        with wave.open(str(wav),'wb') as target:
            target.setparams((1,2,16000,0,'NONE','not compressed'))
            target.writeframes(b'\0'*32000)
            for i,line in enumerate(clip['lines']):
                with wave.open(str(audio/(clip['id']+f'-{i}.wav')),'rb') as source:
                    assert (source.getnchannels(),source.getsampwidth(),source.getframerate())==(1,2,16000)
                    frames=source.readframes(source.getnframes()); length=len(frames)/32000
                    target.writeframes(frames)
                intervals.append({'start':duration,'end':duration+length,'text':line})
                target.writeframes(b'\0'*16000); duration+=length+.5
            target.writeframes(b'\0'*32000); duration+=1
        temporary=output/(clip['id']+'-silent.mp4')
        writer=cv2.VideoWriter(str(temporary),cv2.VideoWriter_fourcc(*'mp4v'),15,(640,360))
        if not writer.isOpened():raise RuntimeError('The video encoder could not start.')
        try:
            for f in range(int(np.ceil(duration*15))):
                seconds=f/15; frame=np.full((360,640,3),(45,35,16),np.uint8)
                cv2.putText(frame,'SYNTHETIC AUDIO TEST - NOT AN INCIDENT',(24,36),cv2.FONT_HERSHEY_SIMPLEX,.55,(125,220,220),1,cv2.LINE_AA)
                cv2.putText(frame,clip['id']+' | '+clip['title'],(24,78),cv2.FONT_HERSHEY_SIMPLEX,.55,(255,255,255),1,cv2.LINE_AA)
                active=next((r for r in intervals if r['start']<=seconds<r['end']),None)
                for j,line in enumerate(textwrap.wrap(active['text'] if active else 'Fictional dialogue with computer-generated voices.',62)):
                    cv2.putText(frame,line,(24,145+j*29),cv2.FONT_HERSHEY_SIMPLEX,.48,(235,235,235),1,cv2.LINE_AA)
                cv2.putText(frame,'No people, gestures, or model predictions are depicted.',(24,310),cv2.FONT_HERSHEY_SIMPLEX,.44,(200,200,200),1,cv2.LINE_AA)
                cv2.rectangle(frame,(24,335),(24+int(590*seconds/duration),339),(150,190,80),-1)
                writer.write(frame)
        finally:writer.release()
        filename='SentinelAI-'+clip['id']+'.mp4'; target=output/filename
        run_ffmpeg(['-i',str(temporary),'-i',str(wav),'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-shortest',str(target)])
        temporary.unlink(); wav.unlink()
        rows.append({**clip,'filename':filename,'sha256':sha256(target),'bytes':target.stat().st_size,'duration':round(duration,3),'reference_transcript':' '.join(clip['lines'])})
        print('Created '+filename,flush=True)
    note='Fresh English synthetic test pack, 2 November 2026. Ten fictional scripts and Windows TTS voices. Not real footage or an independent accuracy benchmark. No visuals of people or actions. Upload via Capture & upload, choose Existing video, and mark it as a test recording. Expected routing is documented in manifest.json; inference is never supplied that answer. Review means Ambiguous human review, not a bribery verdict. No-payment-concern means no affirmative payment flag, not proof of safety. Safety review means local human review, never real dispatch.\n'
    (output/'README.txt').write_text(note,encoding='utf-8')
    manifest={'schema':1,'origin':'authored_synthetic_tts','scope':examples['scope'],'videos':rows}
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    with zipfile.ZipFile(output/'SentinelAI-English-Test-Pack.zip','w',zipfile.ZIP_DEFLATED) as archive:
        for path in [output/r['filename'] for r in rows]+[output/'README.txt',output/'manifest.json']:
            archive.write(path,path.name)
    print('Test pack ready: '+str(output),flush=True)


if __name__=='__main__':main()
