"""Pretrained landmarks and neutral geometric observations, never intent or guilt."""
from contextlib import ExitStack
import math
import time
from pathlib import Path
import cv2
import numpy as np
from .ai_models import model_identity, local_mediapipe
from sentinel_ml.video import video_info

SAMPLE_HZ = 2
GESTURES = {"Open_Palm": "Open palm", "Closed_Fist": "Closed hand", "Pointing_Up": "Upward-pointing index finger",
            "Thumb_Up": "Thumb up", "Thumb_Down": "Thumb down", "Victory": "Two fingers extended", "ILoveYou": "Extended thumb, index and little finger"}


def valid_points(points, indices):
    return all(i < len(points) and all(math.isfinite(float(getattr(points[i], a))) for a in ("x", "y", "z"))
               and 0 <= points[i].x <= 1 and 0 <= points[i].y <= 1 for i in indices)


def pose_observations(points):
    """Only image-plane geometry; no emotion, intent, distance or actor identity."""
    indices = [11, 12, 15, 16, 23, 24]
    if not valid_points(points, indices) or any((getattr(points[i], "visibility", 0) or 0) < .7 for i in indices):
        return []
    output = []
    if points[15].y < points[11].y - .05 and points[16].y < points[12].y - .05:
        output.append(("Both wrists above shoulders", "Landmark geometry places both wrists above the shoulders in this image. This can occur in routine movement; intent is unknown."))
    shoulders = np.array([(points[11].x+points[12].x)/2, (points[11].y+points[12].y)/2])
    hips = np.array([(points[23].x+points[24].x)/2, (points[23].y+points[24].y)/2])
    if abs(shoulders[0]-hips[0]) > abs(shoulders[1]-hips[1]) and np.linalg.norm(shoulders-hips) > .1:
        output.append(("Torso tilted in image", "The shoulder-to-hip axis is tilted more than 45 degrees in the image. Camera angle, bending and routine activity can explain this; it is not a fall or injury diagnosis."))
    return output


class LocalPerception:
    def __init__(self, gesture_model="", pose_model=""):
        self.gesture_model, self.pose_model = gesture_model, pose_model
        self.identities = {k: model_identity(v) for k, v in (("gestures", gesture_model), ("pose", pose_model)) if v}
        self.last_report = {}

    def analyze(self, path):
        mp = local_mediapipe()
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
        fps, count = video_info(path)
        duration = count/fps
        if duration > 120.1:
            raise ValueError("Perception supports up to 120 seconds.")
        started, events, sampled, hand_frames, pose_frames = time.perf_counter(), [], 0, 0, 0
        with ExitStack() as stack:
            hands = stack.enter_context(vision.GestureRecognizer.create_from_options(vision.GestureRecognizerOptions(
                base_options=python.BaseOptions(model_asset_path=self.gesture_model), running_mode=vision.RunningMode.VIDEO,
                num_hands=4, min_hand_detection_confidence=.6, min_hand_presence_confidence=.6))) if self.gesture_model else None
            poses = stack.enter_context(vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
                base_options=python.BaseOptions(model_asset_path=self.pose_model), running_mode=vision.RunningMode.VIDEO,
                num_poses=4, min_pose_detection_confidence=.6, min_pose_presence_confidence=.6))) if self.pose_model else None
            cap = cv2.VideoCapture(str(path), cv2.CAP_FFMPEG)
            stack.callback(cap.release)
            for t in np.arange(0, duration, 1/SAMPLE_HZ):
                cap.set(cv2.CAP_PROP_POS_FRAMES, min(count-1, int(t*fps)))
                ok, frame = cap.read()
                if not ok:
                    raise ValueError("Perception could not decode a sampled frame.")
                height, width = frame.shape[:2]
                if width > 640:
                    frame = cv2.resize(frame, (640, max(1, round(height*640/width))))
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
                sampled += 1
                observations = []
                if hands:
                    result = hands.recognize_for_video(image, round(float(t)*1000))
                    hand_frames += bool(result.hand_landmarks)
                    for categories in result.gestures:
                        if categories and categories[0].category_name in GESTURES and categories[0].score >= .65:
                            name = GESTURES[categories[0].category_name]
                            observations.append(("gesture", name, f"Pretrained hand-shape classification: {name.lower()}. This is a neutral observation, not a money request, threat or determination of intent.", float(categories[0].score), "model"))
                if poses:
                    result = poses.detect_for_video(image, round(float(t)*1000))
                    pose_frames += bool(result.pose_landmarks)
                    for points in result.pose_landmarks:
                        for title, detail in pose_observations(points):
                            observations.append(("body", title, detail, None, "landmark_rule"))
                # Merge contiguous observations by type, without claiming stable person IDs.
                for kind, title, detail, confidence, source in set(observations):
                    previous = next((e for e in reversed(events) if e["title"] == title and e["end"] >= float(t)-.01), None)
                    if previous:
                        previous["end"] = min(duration, float(t)+1/SAMPLE_HZ)
                        if confidence is not None:
                            previous["confidence"] = max(previous["confidence"], round(confidence, 5))
                    else:
                        events.append({"start": float(t), "end": min(duration, float(t)+1/SAMPLE_HZ), "kind": kind,
                                       "title": title, "detail": detail + " Sampled at 2 fps; people are not identified or tracked across events.",
                                       "confidence": round(confidence, 5) if confidence is not None else None,
                                       "source": source, "references": [], "signals": {}})
        self.last_report = {"status": "completed", "models": self.identities, "sample_hz": SAMPLE_HZ,
                            "sampled_frames": sampled, "frames_with_hands": hand_frames, "frames_with_poses": pose_frames,
                            "observations": len(events), "elapsed_seconds": round(time.perf_counter()-started, 3),
                            "scope": "Neutral hand shapes and pose geometry. No money-rubbing, aggression, blocking, physical-distance or intent classifier. Neutral observations add no risk points."}
        return events
