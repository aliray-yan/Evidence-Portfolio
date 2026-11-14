"""Selective redaction is an unreleased review derivative, never default evidence."""
import time
from pathlib import Path
import cv2
import numpy as np
from .ai_models import model_identity, local_mediapipe


def redact_frame(frame, boxes):
    result = frame.copy()
    height, width = frame.shape[:2]
    if not boxes:
        return cv2.GaussianBlur(result, (61, 61), 30), True
    applied = 0
    for x, y, w, h in boxes:
        # Cover more than the detected face box; masks do not imply anonymity.
        x1, y1 = max(0, int(x-w*.35)), max(0, int(y-h*.45))
        x2, y2 = min(width, int(x+w*1.35)), min(height, int(y+h*1.35))
        if x2 <= x1 or y2 <= y1:
            continue
        roi = result[y1:y2, x1:x2]
        mosaic = cv2.resize(roi, (max(1, roi.shape[1]//24), max(1, roi.shape[0]//24)), interpolation=cv2.INTER_AREA)
        result[y1:y2, x1:x2] = cv2.resize(mosaic, (roi.shape[1], roi.shape[0]), interpolation=cv2.INTER_NEAREST)
        applied += 1
    if not applied:
        return cv2.GaussianBlur(result, (61, 61), 30), True
    return result, False


def face_review_copy(source, output, model_path, temporary):
    mp = local_mediapipe()
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    from .pipeline import run_ffmpeg
    identity = model_identity(model_path)
    started = time.perf_counter()
    normalized, masked = Path(temporary)/"face-input.mp4", Path(temporary)/"face-masked.mp4"
    run_ffmpeg(["-i", str(source), "-vf", "scale=640:-2", "-r", "15", "-an", "-c:v", "libx264", "-preset", "fast", str(normalized)])
    cap = cv2.VideoCapture(str(normalized), cv2.CAP_FFMPEG)
    width, height, total = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)), int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    writer = cv2.VideoWriter(str(masked), cv2.VideoWriter_fourcc(*"mp4v"), 15, (width, height))
    frames, fallback, faces = 0, 0, 0
    try:
        if not writer.isOpened() or not 1 <= total <= 1802:
            raise ValueError("Could not create the privacy review copy.")
        options = vision.FaceDetectorOptions(base_options=python.BaseOptions(model_asset_path=str(model_path)),
                                             running_mode=vision.RunningMode.VIDEO, min_detection_confidence=.35)
        with vision.FaceDetector.create_from_options(options) as detector:
            while frames < total:
                ok, frame = cap.read()
                if not ok:
                    raise ValueError("Privacy processing stopped before all frames were redacted.")
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
                result = detector.detect_for_video(image, round(frames*1000/15))
                boxes = [(d.bounding_box.origin_x, d.bounding_box.origin_y, d.bounding_box.width, d.bounding_box.height) for d in result.detections]
                redacted, used_fallback = redact_frame(frame, boxes)
                fallback += used_fallback
                faces += len(boxes)
                writer.write(redacted)
                frames += 1
    finally:
        cap.release()
        writer.release()
    run_ffmpeg(["-i", str(masked), "-an", "-c:v", "libx264", "-crf", "23", "-preset", "fast", "-movflags", "+faststart", str(output)])
    return {"model": identity, "status": "awaiting_privacy_review", "frames": frames, "face_boxes": faces,
            "full_blur_frames": fallback, "elapsed_seconds": round(time.perf_counter()-started, 3),
            "scope": "Faces are mosaicked with expanded margins. Frames with no detected face are fully blurred. Detection can miss people; other identifiers remain. A supervisor must review the entire silent copy before release. Default evidence remains fully blurred."}
