"""Repeatable, explicitly synthetic fixtures. No real people or footage."""
from datetime import datetime, timezone, timedelta
from pathlib import Path
import tempfile
import cv2
import numpy as np
from .db import uid, now, encode
from .intelligence import PHRASES, fuse
from .pipeline import create_alert, run_ffmpeg, STAGES

DEMO_USERS = [
    ("demo-supervisor", "Ayesha · Demo reviewer", "supervisor"),
    ("demo-senior", "Bilal · Demo senior reviewer", "supervisor"),
    ("demo-citizen", "Citizen · Demo participant", "citizen"),
    ("demo-officer", "Officer · Demo participant", "officer"),
    ("demo-responder", "Control room · Demo responder", "responder"),
    ("demo-admin", "Administrator · Demo account", "admin"),
]

# Signals are scripted annotations, not outputs from a trained model.
SCENARIOS = [
    ("Unofficial payment concern", "Lahore · Gulberg", "payment", "demo-citizen", [
        (2, "Officer (script)", "License dikha dein.", "Roman Urdu"),
        (8, "Officer (script)", "Chai pani ka intezam kar do. Receipt ki zaroorat nahi.", "Roman Urdu"),
        (16, "Citizen (script)", "Official challan aur receipt de dein, please.", "Mixed")],
        [(8, "speech", "Undocumented payment indicator", "Scripted request without receipt; context requires review.", {"speech":95,"context":95,"temporal":85}),
         (9, "gesture", "Simulated handover gesture", "Scenario annotation describes a handover; this title-card video does not depict a person.", {"gesture":80,"body":70})]),
    ("Officer assistance requested", "Rawalpindi · Saddar", "officer_safety", "demo-officer", [
        (3,"Officer (script)","Aram se baat karo.","Roman Urdu"),
        (10,"Officer (script)","Madad, emergency. Officer needs help.","Mixed")],
        [(10,"safety","Scripted assistance request","Simulated officer-danger indicator. Verify safety and coordinate human response.",{"speech":90,"body":85,"context":90,"temporal":95,"safety":True})]),
    ("FIR procedure needs context", "Karachi · Clifton", "procedure", "demo-citizen", [
        (3,"Citizen (script)","Is ki procedure kya hai?","Roman Urdu"),
        (9,"Officer (script)","FIR kaat leni hai. Statement pehle likhwa dein.","Roman Urdu")],
        [(9,"speech","Ambiguous procedural phrase","FIR reference may be procedural. No payment request is present in this script.",{"speech":50,"context":40})]),
    ("Routine traffic challan", "Islamabad · F-8", "traffic", "demo-officer", [
        (2,"Officer (script)","Please show your license. The challan is Rs. 500.","English"),
        (10,"Officer (script)","براہ کرم چالان جمع کریں۔","Urdu"),
        (17,"Citizen (script)","Thank you. I will pay at the official counter.","English")],
        [(10,"speech","Routine payment procedure","Scripted official payment guidance; no adverse finding.",{"speech":5,"context":5})]),
    ("Unclear hand gesture", "Lahore · Model Town", "gesture", "demo-citizen", [
        (3,"Citizen (script)","Ji, document yeh hain.","Roman Urdu"),
        (12,"Officer (script)","Ek minute rukain.","Roman Urdu")],
        [(12,"gesture","Gesture-only uncertainty","Simulated finger-rubbing annotation; no payment language. Not proof of intent.",{"gesture":70,"context":25})]),
    ("Receipt changes the context", "Faisalabad · Civil Lines", "payment", "demo-officer", [
        (3,"Officer (script)","Yahan se settle kar do.","Roman Urdu"),
        (11,"Officer (script)","Official counter par payment karein. Receipt lena zaroori hai.","Roman Urdu")],
        [(3,"speech","Ambiguous phrase with later clarification","Review the later official-counter and receipt instruction before drawing a conclusion.",{"speech":55,"context":30})]),
    ("Threat and blocking concern", "Multan · Cantt", "coercion", "demo-citizen", [
        (3,"Citizen (script)","Main procedure samajhna chahta hoon.","Roman Urdu"),
        (10,"Officer (script)","Idhar aa, warna bike andar kar dunga.","Roman Urdu")],
        [(10,"speech","Conditional threat indicator","Scripted conditional threat. Requires assessment of the complete interaction.",{"speech":90,"context":85,"temporal":75}),
         (11,"body","Simulated path obstruction","Scripted blocking annotation. No real pose inference has run.",{"body":85,"gesture":75})]),
    ("Possible weapon safety exercise", "Peshawar · University Road", "weapon", "demo-officer", [
        (3,"Officer (script)","Please keep your hands visible.","English"),
        (10,"Bystander (script)","Koi cheez haath mein hai. Door rahain.","Roman Urdu")],
        [(10,"safety","Simulated weapon-like object","Scenario annotation only; object identity is unverified. No trained detector ran.",{"body":80,"context":90,"temporal":90,"safety":True})]),
    ("Calm roadside explanation", "Gujranwala · GT Road", "traffic", "demo-citizen", [
        (3,"Officer (script)","License wikhao ji.","Punjabi"),
        (10,"Officer (script)","Challan online jama kar dein. Receipt sambhal ke rakhna.","Mixed")],
        [(10,"speech","Procedural explanation","Scripted official payment instructions; routine contextual indicator.",{"speech":20,"context":20,"temporal":10})]),
    ("Physical altercation safety exercise", "Karachi · Shahrah-e-Faisal", "violence", "demo-officer", [
        (4,"Bystander (script)","Please step back.","English"),
        (12,"Officer (script)","Madad, emergency.","Roman Urdu")],
        [(12,"safety","Simulated physical altercation","Scripted safety exercise. No actual violence footage or automated violence prediction.",{"body":95,"context":90,"temporal":95,"safety":True})]),
]


def seed(db, storage, config):
    with db.transaction() as con:
        for phrase, category, language, explanation in PHRASES:
            con.execute("INSERT OR IGNORE INTO phrases VALUES (?,?,?,?,?,1)", (uid("ph_"), phrase, category, language, explanation))
        if not config.demo:
            return
        for user_id, name, role in DEMO_USERS:
            con.execute("INSERT OR IGNORE INTO users(id,name,email,role,demo,created_at) VALUES (?,?,?,?,1,?)", (user_id,name,f"{user_id}@demo.invalid",role,now()))
        if con.execute("SELECT 1 FROM cases WHERE synthetic=1").fetchone():
            return
    with tempfile.TemporaryDirectory(dir=config.data_dir) as tmp:
        raw, video, frame = Path(tmp)/"fixture.mp4", Path(tmp)/"review.mp4", Path(tmp)/"frame.jpg"
        writer = cv2.VideoWriter(str(raw), cv2.VideoWriter_fourcc(*"mp4v"), 4, (960,540))
        for index in range(96):
            canvas = np.full((540,960,3), (35,31,21), dtype=np.uint8)
            cv2.putText(canvas,"SENTINEL / SCENARIO REPLAY",(60,175),cv2.FONT_HERSHEY_SIMPLEX,.9,(220,230,230),2)
            cv2.putText(canvas,"SYNTHETIC TIMELINE FIXTURE",(60,235),cv2.FONT_HERSHEY_SIMPLEX,.65,(143,195,179),1)
            cv2.putText(canvas,"No real footage. No audio. No model inference.",(60,285),cv2.FONT_HERSHEY_SIMPLEX,.55,(200,200,200),1)
            cv2.putText(canvas,f"{index/4:05.2f} / 24.00 seconds",(60,390),cv2.FONT_HERSHEY_SIMPLEX,.65,(220,230,230),1)
            cv2.line(canvas,(60,430),(60+int(840*index/96),430),(143,195,179),3)
            writer.write(canvas)
            if index == 32:
                cv2.imwrite(str(frame),canvas)
        writer.release()
        run_ffmpeg(["-i",str(raw),"-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart",str(video)])
        video_data, frame_data = video.read_bytes(),frame.read_bytes()
        with db.transaction() as con:
            policy = db.setting(con,"thresholds")
            for index, (title, location, category, owner, transcript, annotations) in enumerate(SCENARIOS):
                case_id = f"SA-26-{1042-index}"
                stamp = (datetime.now(timezone.utc)-timedelta(hours=index*17+1)).isoformat()
                con.execute("INSERT INTO cases(id,title,description,owner_id,location,category,created_at,updated_at,synthetic,status,processing_status,privacy_status,assigned_to,duration) VALUES (?,?,?,?,?,?,?,?,1,'awaiting_review','demo','synthetic_no_people',?,24)",
                            (case_id,title,"Synthetic Pakistani interaction exercise. Transcript and event annotations are authored fixtures; the video is a timed title card, not a depiction of the events.",owner,location,category,stamp,stamp,"demo-supervisor"))
                media_id = storage.put(con,case_id,"video",video_data,"video/mp4","synthetic",end=24)
                storage.put(con,case_id,"frame",frame_data,"image/jpeg","synthetic",start=8)
                segments=[]
                for start,speaker,text,language in transcript:
                    sid=uid("tr_")
                    segments.append({"id":sid,"start":start,"end":start+5})
                    con.execute("INSERT INTO segments VALUES (?,?,?,?,?,?,?,?)",(sid,case_id,start,start+5,text,language,speaker,"synthetic"))
                events=[]
                for start,kind,event_title,detail,signals in annotations:
                    event={"id":uid("evt_"),"start":start,"end":start+3,"kind":kind,"title":event_title,"detail":detail,"confidence":None,"source":"synthetic","references":[s["id"] for s in segments if abs(s["start"]-start)<=3],"signals":signals}
                    events.append(event)
                    con.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?)",(event["id"],case_id,start,start+3,kind,event_title,detail,None,"synthetic",encode(event["references"]),encode(signals)))
                assessment=fuse(events,policy["value"],policy["version"])
                assessment.update({"policy":policy["value"],"missing":["Real encounter footage", "Real audio", "Genuine model predictions"],"synthetic":True})
                stages=[{"name":name,"status":"simulated","detail":"Authored demo fixture; not an inference job.","at":stamp} for name in STAGES]
                con.execute("UPDATE cases SET assessment=?,risk_label=?,risk_score=?,stages=? WHERE id=?",(encode(assessment),assessment["label"],assessment["score"],encode(stages),case_id))
                con.execute("INSERT INTO notes VALUES (?,?,?,?,?)",(uid("no_"),case_id,"demo-supervisor","Synthetic exercise: inspect all context before confirming or dismissing the concern.",stamp))
                if assessment["label"] in ("Emergency","High Risk"):
                    create_alert(con,db,case_id,events[0]["id"],category,assessment["label"])
                db.audit(con,None,"demo.seeded",case_id,{"synthetic":True,"media_id":media_id})
            # A documented false-positive decision gives the timeline a real persisted review.
            case_id="SA-26-1037"
            con.execute("UPDATE cases SET status='dismissed' WHERE id=?",(case_id,))
            con.execute("INSERT INTO reviews VALUES (?,?,?,?,?,?,?,?)",(uid("rv_"),case_id,"demo-supervisor","dismiss","Synthetic review: the later official receipt instruction resolves the phrase concern. No misconduct conclusion.","awaiting_review","dismissed",now()))
            db.audit(con,"demo-supervisor","review.dismiss",case_id,{"synthetic":True})
