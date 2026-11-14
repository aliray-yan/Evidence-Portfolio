"""Exactly the same RGB sampling and preprocessing in Kaggle and the server."""
from pathlib import Path
import hashlib
import cv2
import numpy as np

PREPROCESS = {"frames": 16, "window_seconds": 5.0, "resize": [128, 171],
              "crop": 112, "mean": [0.43216, 0.394666, 0.37645],
              "std": [0.22803, 0.22145, 0.216989], "sampling": "uniform-v1"}


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def video_info(path):
    cap = cv2.VideoCapture(str(path), cv2.CAP_FFMPEG,
                           [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000, cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000])
    try:
        fps, count = cap.get(cv2.CAP_PROP_FPS), int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if not np.isfinite(fps) or fps <= 0 or count < 1:
            raise ValueError("Video has no usable frame timing.")
        return fps, count
    finally:
        cap.release()


def windows(duration):
    if not np.isfinite(duration) or not 0 < duration <= 120.1:
        raise ValueError("Analysis supports videos up to 120 seconds.")
    return [(float(start), min(float(start + 5), duration)) for start in range(0, int(np.ceil(duration)), 5)]


def read_clip(path, start=0.0, end=None):
    fps, count = video_info(path)
    duration = count / fps
    end = min(duration, start + 5.0) if end is None else min(end, duration)
    if not np.isfinite(start) or not np.isfinite(end) or not 0 <= start < end:
        raise ValueError("Invalid clip interval.")
    first, last = min(count - 1, int(start * fps)), min(count - 1, max(0, int(np.ceil(end * fps)) - 1))
    indices = np.linspace(first, last, PREPROCESS["frames"]).round().astype(int)
    cap, frames = cv2.VideoCapture(str(path), cv2.CAP_FFMPEG,
                                  [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000, cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000]), []
    try:
        previous, frame = -1, None
        for index in indices:
            if index != previous:
                cap.set(cv2.CAP_PROP_POS_FRAMES, int(index))
                ok, frame = cap.read()
                if not ok:
                    raise ValueError("A sampled video frame could not be decoded.")
                previous = index
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb = cv2.resize(rgb, (171, 128), interpolation=cv2.INTER_LINEAR)
            frames.append(rgb[8:120, 29:141])
    finally:
        cap.release()
    values = np.stack(frames).astype(np.float32) / 255.0
    values = (values - np.array(PREPROCESS["mean"], np.float32)) / np.array(PREPROCESS["std"], np.float32)
    return np.ascontiguousarray(values.transpose(3, 0, 1, 2))
