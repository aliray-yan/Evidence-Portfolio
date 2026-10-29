import json
import logging
import subprocess
import tempfile
import threading
from pathlib import Path
import cv2
import imageio_ffmpeg
from .db import now, uid, encode
from .intelligence import phrase_events, fuse, LocalWhisper, capabilities

log = logging.getLogger("sentinel.pipeline")
STAGES = ["Upload received", "Media validation", "Audio analysis", "Video analysis", "Multimodal fusion", "Evidence summary", "Ready for review"]


def run_ffmpeg(args, timeout=180):
    result = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-nostdin", "-hide_banner", "-loglevel", "error", "-y", *args],
                            capture_output=True, timeout=timeout, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    if result.returncode:
        # Do not expose raw subprocess paths or uploaded metadata to clients/logs.
        raise ValueError("Media conversion failed. Re-export as an H.264 MP4 and upload again.")


def inspect_media(path, max_duration):
    cap = cv2.VideoCapture(str(path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        width, height = cap.get(cv2.CAP_PROP_FRAME_WIDTH), cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        ok, _ = cap.read()
        if not ok or fps <= 0 or frames <= 0 or width <= 0 or height <= 0:
            raise ValueError("The uploaded file has no decodable video track.")
        duration = frames / fps
        if duration > max_duration + .1 or duration < .2:
            raise ValueError(f"Video must be between 0.2 and {max_duration} seconds.")
        if width > 3840 or height > 2160 or fps > 120:
            raise ValueError("Video exceeds 3840 × 2160 or 120 fps. Export a smaller MP4.")
        return duration
    finally:
        cap.release()


def create_alert(con, db, case_id, event_id, kind, severity):
    if con.execute("SELECT 1 FROM alerts WHERE case_id=? AND kind=?", (case_id, kind)).fetchone():
        if event_id:
            con.execute("UPDATE alerts SET event_id=? WHERE case_id=? AND kind=?", (event_id, case_id, kind))
        return
    alert_id, stamp = uid("al_"), now()
    con.execute("INSERT INTO alerts(id,case_id,event_id,kind,severity,created_at,updated_at) VALUES (?,?,?,?,?,?,?)", (alert_id, case_id, event_id, kind, severity, stamp, stamp))
    con.execute("INSERT INTO notifications VALUES (?,?,?,?,?,?)", (uid("nt_"), alert_id, "dashboard", "recorded", "Recorded in the local alert center.", stamp))
    con.execute("INSERT INTO notifications VALUES (?,?,?,?,?,?)", (uid("nt_"), alert_id, "external", "unavailable", "No external delivery provider configured. No real-world dispatch.", stamp))
    con.execute("INSERT INTO alert_history VALUES (?,?,?,?,?,?)", (uid("ah_"), alert_id, None, "created", "Evidence indicator requires human assessment.", stamp))
    db.audit(con, None, "alert.created", case_id, {"alert_id": alert_id, "kind": kind})


class Processor:
    def __init__(self, db, storage, config):
        self.db, self.storage, self.config = db, storage, config
        self.stop_event, self.wake_event = threading.Event(), threading.Event()
        self.thread = None

    def start(self):
        with self.db.transaction() as con:
            con.execute("UPDATE jobs SET status='queued' WHERE status='running'")
        self.thread = threading.Thread(target=self.loop, name="sentinel-media-worker", daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        self.wake_event.set()
        if self.thread:
            self.thread.join(timeout=5)

    def loop(self):
        while not self.stop_event.is_set():
            try:
                if self.run_once():
                    continue
            except Exception:
                log.exception("Worker failure outside case processing")
            self.wake_event.wait(2)
            self.wake_event.clear()

    def stage(self, case_id, index, status="completed", detail=""):
        with self.db.transaction() as con:
            row = con.execute("SELECT stages FROM cases WHERE id=?", (case_id,)).fetchone()
            stages = json.loads(row[0]) if row else []
            stages = [s for s in stages if s["name"] != STAGES[index]]
            stages.append({"name": STAGES[index], "status": status, "detail": detail, "at": now()})
            con.execute("UPDATE cases SET stages=?,updated_at=? WHERE id=?", (encode(stages), now(), case_id))

    def run_once(self):
        with self.db.transaction() as con:
            job = con.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1").fetchone()
            if not job:
                return False
            case_id = job["case_id"]
            con.execute("UPDATE jobs SET status='running',attempts=attempts+1,updated_at=? WHERE id=?", (now(), job["id"]))
            con.execute("UPDATE cases SET processing_status='processing',processing_error=NULL WHERE id=?", (case_id,))
        try:
            self.process(case_id)
        except Exception as exc:
            detail = str(exc) if isinstance(exc, ValueError) else "Processing could not finish. Check system health and retry, or upload a compatible MP4."
            with self.db.transaction() as con:
                con.execute("UPDATE jobs SET status='failed',updated_at=? WHERE case_id=?", (now(), case_id))
                row=con.execute("SELECT stages FROM cases WHERE id=?",(case_id,)).fetchone()
                stages=json.loads(row[0])
                for stage in stages:
                    if stage['status']=='running':
                        stage.update({'status':'failed','detail':detail,'at':now()})
                con.execute("UPDATE cases SET processing_status='failed',processing_error=?,stages=?,updated_at=? WHERE id=?", (detail,encode(stages),now(),case_id))
                self.db.audit(con, None, "processing.failed", case_id, {"error_type": type(exc).__name__})
            log.warning("Case %s processing failed: %s", case_id, type(exc).__name__)
        return True

    def process(self, case_id):
        with self.db.connect() as con:
            original = con.execute("SELECT * FROM evidence WHERE case_id=? AND kind='original'", (case_id,)).fetchone()
        if not original:
            raise ValueError("Original source is unavailable or expired. Upload a new recording.")
        # Temporary plaintext is restricted to processing, deleted on exit; deploy on an
        # encrypted volume to protect temp files and SQLite as well as encrypted media.
        temp_root = self.config.data_dir / "processing"
        temp_root.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=temp_root) as tmp:
            source, redacted = Path(tmp) / "source.mp4", Path(tmp) / "redacted.mp4"
            source.write_bytes(self.storage.read(original))
            self.stage(case_id, 1, "running")
            duration = inspect_media(source, self.config.max_duration)
            self.stage(case_id, 1, detail=f"Validated {duration:.1f} seconds of video.")
            self.stage(case_id, 2, "running")
            segments, asr_detail = [], "Speech model unavailable; no transcript inferred."
            asr_ran = False
            if capabilities(self.config)[1]["status"] == "configured":
                wav = Path(tmp) / "speech.wav"
                try:
                    run_ffmpeg(["-i", str(source), "-vn", "-ar", "16000", "-ac", "1", str(wav)])
                    segments = LocalWhisper(self.config.whisper_model).transcribe(str(wav))
                    asr_ran = True
                    asr_detail = "Local Whisper transcription completed; speakers unknown."
                except Exception:
                    asr_detail = "Configured speech analysis failed or audio is absent. Review is incomplete."
            self.stage(case_id, 2, "completed" if asr_ran else "unavailable", asr_detail)
            self.stage(case_id, 3, "running", "Creating a silent, fully blurred review copy.")
            run_ffmpeg(["-i", str(source), "-map", "0:v:0", "-vf", "scale=640:-2,boxblur=24:3", "-r", "15", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "25", "-movflags", "+faststart", str(redacted)])
            frame, clip = Path(tmp) / "frame.jpg", Path(tmp) / "clip.mp4"
            run_ffmpeg(["-i", str(redacted), "-frames:v", "1", str(frame)])
            run_ffmpeg(["-i", str(redacted), "-t", str(min(duration, 12)), "-c", "copy", str(clip)])
            self.stage(case_id, 3, detail="Video, frame and first 12-second excerpt redacted. Gesture, body-language and safety detectors unavailable.")
            self.stage(case_id, 4, "running")
            with self.db.transaction() as con:
                # Retry replaces only derived artifacts, never duplicates events or alerts.
                old = con.execute("SELECT * FROM evidence WHERE case_id=? AND kind!='original'", (case_id,)).fetchall()
                for row in old:
                    self.storage.delete(row)
                con.execute("DELETE FROM evidence WHERE case_id=? AND kind!='original'", (case_id,))
                con.execute("DELETE FROM segments WHERE case_id=?", (case_id,))
                con.execute("UPDATE alerts SET event_id=NULL WHERE case_id=?", (case_id,))
                con.execute("DELETE FROM events WHERE case_id=?", (case_id,))
                self.storage.put(con, case_id, "video", redacted.read_bytes(), "video/mp4", "redacted", end=duration)
                self.storage.put(con, case_id, "frame", frame.read_bytes(), "image/jpeg", "redacted")
                self.storage.put(con, case_id, "clip", clip.read_bytes(), "video/mp4", "redacted", end=min(duration, 12))
                for s in segments:
                    s["id"] = uid("tr_")
                    con.execute("INSERT INTO segments VALUES (?,?,?,?,?,?,?,?)", (s["id"], case_id, s["start"], s["end"], s["text"], s["language"], s["speaker"], s["source"]))
                phrases = [dict(r) for r in con.execute("SELECT * FROM phrases WHERE active=1")]
                events = phrase_events(segments, phrases)
                for event in events:
                    event["id"] = uid("evt_")
                    con.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?)", (event["id"], case_id, event["start"], event["end"], event["kind"], event["title"], event["detail"], event["confidence"], event["source"], encode(event["references"]), encode(event["signals"])))
                policy = self.db.setting(con, "thresholds")
                # Even an empty ASR result cannot clear unobserved visual modalities.
                assessment = fuse(events, policy["value"], policy["version"], assessed=False)
                if assessment["label"] in ("Normal", "Low Risk"):
                    assessment.update({"score": None, "label": "Unassessed", "review_required": True})
                assessment["policy"] = policy["value"]
                assessment["missing"] = ["gesture", "body language", "violence", "weapon detection", "speaker identity"] + ([] if asr_ran else ["transcription"])
                con.execute("UPDATE cases SET assessment=?,risk_score=?,risk_label=?,duration=?,privacy_status='full_frame_blurred',updated_at=? WHERE id=?", (encode(assessment), assessment["score"], assessment["label"], duration, now(), case_id))
                if assessment["label"] in ("Emergency", "High Risk"):
                    create_alert(con, self.db, case_id, events[0]["id"] if events else None, "safety" if assessment["label"] == "Emergency" else "review", assessment["label"])
            self.stage(case_id, 4, detail="Versioned rule-based assessment persisted; missing modalities disclosed.")
            self.stage(case_id, 5, detail="Evidence references indexed for deterministic summary.")
            self.stage(case_id, 6, detail="Ready for human review with partial analysis.")
            with self.db.transaction() as con:
                con.execute("UPDATE cases SET processing_status='partial',status='awaiting_review',updated_at=? WHERE id=?", (now(), case_id))
                con.execute("UPDATE jobs SET status='completed',updated_at=? WHERE case_id=?", (now(), case_id))
                con.execute("DELETE FROM evidence WHERE id=?", (original["id"],))
                self.db.audit(con, None, "processing.completed", case_id, {"partial": True, "original_deleted": True})
            self.storage.delete(original)
