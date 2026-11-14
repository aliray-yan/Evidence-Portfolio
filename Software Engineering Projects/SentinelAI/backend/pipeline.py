import json
import logging
import math
import subprocess
import tempfile
import threading
import time
from pathlib import Path
import cv2
import imageio_ffmpeg
from .db import now, uid, encode
from .intelligence import capabilities
from .visual_exchange import SCOPE as EXCHANGE_SCOPE
from .exchange_adapter import configured as exchange_configured, create_exchange

log = logging.getLogger("sentinel.pipeline")
STAGES = ["Upload received", "Media validation", "Visual exchange analysis", "Video analysis", "Visual review assessment", "Evidence summary", "Ready for review"]


def run_ffmpeg(args, timeout=180):
    result = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-nostdin", "-hide_banner", "-loglevel", "error", "-y", *args],
                            capture_output=True, timeout=timeout, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    if result.returncode:
        # Do not expose raw subprocess paths or uploaded metadata to clients/logs.
        raise ValueError("Media conversion failed. Re-export as an H.264 MP4 and upload again.")


def inspect_media(path, max_duration):
    # Do not fall back to Windows device APIs for an uploaded file. In particular,
    # an audio-only MediaRecorder MP4 can stall the default MSMF backend.
    cap = cv2.VideoCapture(str(path), cv2.CAP_FFMPEG,
                           [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000, cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000])
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


def prepare_media(source, temporary_directory, max_duration):
    """Normalize browser containers lacking duration/frame metadata, with a bound.

    MediaRecorder WebM may report a 1000 Hz timebase as FPS and a negative frame
    count. Decode it with FFmpeg to a temporary 30fps H.264 timeline before analysis.
    The extra second makes over-limit uploads fail validation instead of silently
    accepting a truncated recording. Audio-only files fail before conversion.
    """
    cap = cv2.VideoCapture(str(source), cv2.CAP_FFMPEG,
                           [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000, cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000])
    try:
        fps, count = cap.get(cv2.CAP_PROP_FPS), cap.get(cv2.CAP_PROP_FRAME_COUNT)
        width, height = cap.get(cv2.CAP_PROP_FRAME_WIDTH), cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        ok, _ = cap.read()
        if not ok or width <= 0 or height <= 0:
            raise ValueError("The uploaded file has no decodable video track.")
        if width > 3840 or height > 2160:
            raise ValueError("Video exceeds 3840 × 2160. Export a smaller MP4.")
    finally:
        cap.release()
    if math.isfinite(count) and count > 0 and math.isfinite(fps) and fps > 0:
        return source
    normalized = Path(temporary_directory)/"normalized.mp4"
    run_ffmpeg(["-i", str(source), "-t", str(max_duration+1), "-map", "0:v:0", "-an",
                "-r", "30", "-c:v", "libx264", "-preset", "fast", "-crf", "18", str(normalized)])
    return normalized


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
        self.live_thread = None
        self.vision_lock = threading.Lock()
        self.exchange_lock = threading.Lock()
        self.live_active = threading.Event()
        self.vision = None
        self.exchange = None
        self.perception = None
        self.objects = None
        from .retrieval import SearchService
        self.search = SearchService(db, storage, config)

    def start(self):
        with self.db.transaction() as con:
            con.execute("UPDATE jobs SET status='queued' WHERE status='running'")
        self.thread = threading.Thread(target=self.loop, name="sentinel-media-worker", daemon=True)
        self.thread.start()
        self.live_thread = threading.Thread(target=lambda: self.loop('vision'), name='sentinel-live-vision', daemon=True)
        self.live_thread.start()

    def stop(self):
        self.stop_event.set()
        self.wake_event.set()
        if self.thread:
            self.thread.join(timeout=5)
        if self.live_thread:
            self.live_thread.join(timeout=5)

    def loop(self, lane='regular'):
        from .uploads import sweep_expired
        from .retention import run_scheduled
        last_sweep = 0
        while not self.stop_event.is_set():
            if self.live_active.is_set():
                self.stop_event.wait(.5)
                continue
            try:
                if lane == 'regular' and time.monotonic() - last_sweep >= 60:
                    sweep_expired(self.db)
                    run_scheduled(self.db, self.storage)
                    last_sweep = time.monotonic()
                if self.run_once(lane):
                    continue
                if lane == 'regular' and self.search.run_once(self.stop_event):
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

    def run_once(self, lane='all'):
        with self.db.transaction() as con:
            live_clause = "EXISTS(SELECT 1 FROM live_segments l WHERE l.case_id=jobs.case_id AND l.lane='vision')"
            clause = '1=1' if lane == 'all' else live_clause if lane == 'vision' else 'NOT '+live_clause
            job = con.execute(f"SELECT * FROM jobs WHERE status='queued' AND {clause} ORDER BY created_at LIMIT 1").fetchone()
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
            live = con.execute('SELECT lane FROM live_segments WHERE case_id=? LIMIT 1', (case_id,)).fetchone()
        live_lane = live['lane'] if live else None
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
            source = prepare_media(source, tmp, self.config.max_duration)
            duration = inspect_media(source, self.config.max_duration)
            from .live_evidence import preserved_exchange
            with self.db.connect() as con:
                preserved = con.execute("SELECT * FROM evidence WHERE case_id=? AND kind='live_finding'", (case_id,)).fetchall()
            retained_events = [event for row in preserved if (event := preserved_exchange(json.loads(self.storage.read(row)), row['id'], duration))]
            self.stage(case_id, 1, detail=f"Validated {duration:.1f} seconds of video." + (" Browser container timing normalized to 30fps before analysis." if source.name == "normalized.mp4" else ""))
            self.stage(case_id, 2, "running")
            exchange_events, exchange_report = [], None
            if exchange_configured(self.config):
                try:
                    with self.exchange_lock:
                        if self.exchange is None:
                            self.exchange = create_exchange(self.config)
                        exchange_events = self.exchange.analyze(str(source))
                        exchange_report = self.exchange.last_report
                except Exception as exc:
                    raise ValueError('Configured visual exchange analysis failed. Check the selected local detector and retry; no negative result was inferred.') from exc
            if retained_events:
                # Preserve the original live decision even if the replay's sampling differs.
                exchange_events = retained_events + [e for e in exchange_events if not any(abs(e['end']-r['end']) < 1 for r in retained_events)]
                exchange_report = {**(exchange_report or {'status':'preserved_only','scope':EXCHANGE_SCOPE}), 'events':exchange_events}
            self.stage(case_id, 2, "completed" if exchange_report else "unavailable", exchange_report.get('scope', EXCHANGE_SCOPE) if exchange_report else "Visual exchange models unavailable. No audio analysis is performed.")
            self.stage(case_id, 3, "running", "Creating a silent, fully blurred review copy.")
            visual_events, vision_report = [], None
            perception_events, perception_report = [], None
            object_events, object_report = [], None
            if self.config.violence_model:
                try:
                    from .vision import LocalViolence
                    with self.vision_lock:
                        if self.vision is None:
                            self.vision = LocalViolence(self.config.violence_model)
                        visual_events = self.vision.analyze(str(source))
                        vision_report = self.vision.last_report
                except Exception as exc:
                    # Preserve the encrypted source for retry; never silently replace a
                    # configured detector failure with a negative result.
                    raise ValueError("Configured vision analysis failed. Verify the model bundle with backend.model_check, restart the server and retry this case before the source expires.") from exc
            if (self.config.gesture_model or self.config.pose_model) and not live_lane:
                try:
                    from .perception import LocalPerception
                    if self.perception is None:
                        self.perception = LocalPerception(self.config.gesture_model, self.config.pose_model)
                    perception_events = self.perception.analyze(str(source))
                    perception_report = self.perception.last_report
                except Exception as exc:
                    raise ValueError("Configured hand/pose analysis failed. Verify local models and runtime, restart and retry before the source expires.") from exc
            if self.config.object_model and not live_lane:
                try:
                    from .objects import LocalObjects
                    if self.objects is None:
                        self.objects = LocalObjects(self.config.object_model)
                    object_events = self.objects.analyze(str(source))
                    object_report = self.objects.last_report
                except Exception as exc:
                    raise ValueError("Configured object analysis failed. Verify the local detector, restart and retry before the source expires.") from exc
            run_ffmpeg(["-i", str(source), "-map", "0:v:0", "-vf", "scale=640:-2,boxblur=24:3", "-r", "15", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "25", "-movflags", "+faststart", str(redacted)])
            face_preview, privacy_report = None, None
            if self.config.face_model and not live_lane:
                from .redaction import face_review_copy
                face_preview = Path(tmp)/"face-review.mp4"
                privacy_report = face_review_copy(source, face_preview, self.config.face_model, tmp)
            frame, clip = Path(tmp) / "frame.jpg", Path(tmp) / "clip.mp4"
            focus = exchange_events[0] if exchange_events else max(visual_events + object_events, key=lambda e: e["confidence"]) if visual_events or object_events else None
            frame_at = focus["end"] if focus and focus["kind"] == "visual_exchange" else (focus["start"] + focus["end"]) / 2 if focus else 0
            clip_start = max(0, focus["start"] - 1) if focus else 0
            clip_end = min(duration, focus["end"] + 1) if focus else min(duration, 12)
            run_ffmpeg(["-i", str(redacted), "-ss", str(frame_at), "-frames:v", "1", str(frame)])
            run_ffmpeg(["-i", str(redacted), "-ss", str(clip_start), "-t", str(clip_end-clip_start), "-c:v", "libx264", "-an", str(clip)])
            self.stage(case_id, 3, detail=("Research fight classifier ran. " if vision_report else "Fight model unavailable. ") + ("Hand/pose observations recorded. " if perception_report else "Hand/pose models unavailable. ") + "Default evidence is fully blurred and silent." + (" Selective face copy awaits privacy review." if face_preview else ""))
            self.stage(case_id, 4, "running")
            with self.db.transaction() as con:
                # Retry replaces only derived artifacts, never duplicates events or alerts.
                old = con.execute("SELECT * FROM evidence WHERE case_id=? AND kind NOT IN ('original','live_finding')", (case_id,)).fetchall()
                for row in old:
                    self.storage.delete(row)
                con.execute("DELETE FROM evidence WHERE case_id=? AND kind NOT IN ('original','live_finding')", (case_id,))
                con.execute("DELETE FROM segments WHERE case_id=?", (case_id,))
                con.execute('DELETE FROM search_indexes WHERE case_id=?', (case_id,))
                con.execute("UPDATE alerts SET event_id=NULL WHERE case_id=?", (case_id,))
                con.execute("DELETE FROM events WHERE case_id=?", (case_id,))
                video_id = self.storage.put(con, case_id, "video", redacted.read_bytes(), "video/mp4", "redacted", end=duration)
                if live_lane == 'context':
                    # Explicit live-session consent covers a short-lived encrypted
                    # clear buffer for authorized reviewers and aligned playback.
                    self.storage.put(con, case_id, 'live_review', source.read_bytes(), 'video/mp4', 'live_clear_buffer_60_minutes', end=duration)
                frame_id = self.storage.put(con, case_id, "frame", frame.read_bytes(), "image/jpeg", "redacted", start=frame_at)
                clip_id = self.storage.put(con, case_id, "clip", clip.read_bytes(), "video/mp4", "redacted", start=clip_start, end=clip_end)
                if face_preview:
                    self.storage.put(con, case_id, "face_preview", face_preview.read_bytes(), "video/mp4", "face_redaction_pending_review", end=duration)
                for event in visual_events + perception_events + object_events + exchange_events:
                    event["references"] = [video_id, *event['references']] if event.get('preserved') else [video_id]
                    if event is focus:
                        event["references"].extend([frame_id, clip_id])
                events = visual_events + perception_events + object_events + exchange_events
                for event in events:
                    event["id"] = uid("evt_")
                    con.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?)", (event["id"], case_id, event["start"], event["end"], event["kind"], event["title"], event["detail"], event["confidence"], event["source"], encode(event["references"]), encode(event["signals"])))
                policy = self.db.setting(con, "thresholds")
                # Versioned visual-only review priority; audio cannot enter this calculation.
                flagged = [e for e in events if e['kind'] in ('visual_exchange','visual','object')]
                assessment = {"score": policy["value"]["ambiguous"] if flagged else None,
                    "label": "Ambiguous" if flagged else "Unassessed", "review_required": True,
                    "contributions": {"visual_review": policy["value"]["ambiguous"]} if flagged else {},
                    "references": [e['id'] for e in flagged], "version": policy["version"],
                    "policy": policy["value"], "method": "vision-only-review-v1",
                    "limitations": "Visual review priority, not a probability or determination of bribery. No audio analysis.",
                    "missing": ["currency-vs-document recognition", "intent or illegality determination", "independent exchange accuracy validation"] + ([] if vision_report else ["violence"])}
                assessment["exchange"] = exchange_report or {"status":"unavailable","scope":EXCHANGE_SCOPE}
                if vision_report:assessment["vision"] = vision_report
                if perception_report:
                    assessment["perception"] = perception_report
                if privacy_report:
                    assessment["privacy"] = privacy_report
                if object_report:
                    assessment["objects"] = object_report
                    assessment["missing"] = [m for m in assessment["missing"] if m != 'weapon detection'] + ['firearm/weapon-use detection']
                con.execute("UPDATE cases SET assessment=?,risk_score=?,risk_label=?,duration=?,privacy_status='full_frame_blurred',updated_at=? WHERE id=?", (encode(assessment), assessment["score"], assessment["label"], duration, now(), case_id))
                if assessment["label"] in ("Emergency", "High Risk"):
                    create_alert(con, self.db, case_id, assessment["references"][0] if assessment["references"] else None, "safety" if assessment["label"] == "Emergency" else "review", assessment["label"])
                elif assessment['label'] == 'Ambiguous':
                    create_alert(con, self.db, case_id, assessment['references'][0] if assessment['references'] else None, "visual_exchange" if exchange_events else "possible_conflict" if visual_events else "visual_review", "Ambiguous")
            self.stage(case_id, 4, detail="Vision-only assessment persisted; no speech or audio-video fusion was performed.")
            self.stage(case_id, 5, detail="Evidence references indexed for deterministic summary.")
            self.stage(case_id, 6, detail="Ready for human review with partial analysis.")
            with self.db.transaction() as con:
                con.execute("UPDATE cases SET processing_status='partial',status='awaiting_review',updated_at=? WHERE id=?", (now(), case_id))
                con.execute("UPDATE jobs SET status='completed',updated_at=? WHERE case_id=?", (now(), case_id))
                con.execute("DELETE FROM evidence WHERE id=?", (original["id"],))
                self.db.audit(con, None, "processing.completed", case_id, {"partial": True, "original_deleted": True, "vision_model": vision_report["sha256"] if vision_report else None})
            self.storage.delete(original)
