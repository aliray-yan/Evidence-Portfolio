"""Explicit operator download of public pretrained models; never called by a job."""
import argparse
import hashlib
import json
from pathlib import Path
import os
import tempfile
import urllib.request
from .config import ROOT
from .db import now

GOOGLE_MODELS = {
    "gesture_model": ("gesture_recognizer.task", "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"),
    "pose_model": ("pose_landmarker_lite.task", "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"),
    "face_model": ("blaze_face_short_range.tflite", "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"),
}


def download(url, target, limit, expected=None):
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and expected and hashlib.sha256(target.read_bytes()).hexdigest() == expected:
        return expected
    fd, temporary = tempfile.mkstemp(prefix="download-", suffix=".part", dir=target.parent)
    digest, size = hashlib.sha256(), 0
    try:
        with os.fdopen(fd, "wb") as out, urllib.request.urlopen(url, timeout=60) as response:
            while chunk := response.read(1024 * 1024):
                size += len(chunk)
                if size > limit:
                    raise ValueError("Model download exceeds its configured size limit.")
                digest.update(chunk)
                out.write(chunk)
        value = digest.hexdigest()
        if expected and value != expected:
            raise ValueError("Downloaded model checksum differs from publisher metadata.")
        os.replace(temporary, target)
        return value
    finally:
        Path(temporary).unlink(missing_ok=True)


def install(only="all"):
    directory = ROOT / ".local/models/pretrained"
    directory.mkdir(parents=True, exist_ok=True)
    selection_file = ROOT / ".local/ai-selection.json"
    previous = json.loads(selection_file.read_text()) if selection_file.exists() else {}
    manifest = {"schema": 1, "created_at": now(), "models": previous.get('models',{})}
    if only in ('all','objects'):
        name='ssdlite320_mobilenet_v3_large_coco-a79551df.pth'
        url='https://download.pytorch.org/models/'+name
        prior=previous.get('models',{}).get('object_model',{}).get('files',{}).get(name)
        digest=download(url,directory/name,20_000_000,prior)
        if not digest.startswith('a79551df'):
            raise ValueError('Object model differs from the publisher filename hash.')
        manifest['models']['object_model']={'path':(directory/name).relative_to(ROOT).as_posix(),'files':{name:digest},'source':url,'license':'Torchvision pretrained COCO weights; see model documentation.'}
        print('Verified lightweight COCO object detector',flush=True)
    if only == 'objects':
        temp=selection_file.with_suffix('.tmp')
        temp.write_text(json.dumps(manifest,indent=2),encoding='utf-8')
        os.replace(temp,selection_file)
        return
    for key, (name, url) in GOOGLE_MODELS.items():
        target = directory / name
        prior = previous.get("models", {}).get(key, {})
        digest = download(url, target, 40_000_000, prior.get("files", {}).get(name))
        manifest["models"][key] = {"path": target.relative_to(ROOT).as_posix(), "files": {name: digest}, "source": url,
                                  "license": "See Google MediaPipe model card and distribution terms."}
        print(f"Verified {name}", flush=True)
    temp = selection_file.with_suffix(".tmp")
    temp.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    os.replace(temp, selection_file)
    print("Local pretrained models selected. Restart with the project runtime to use them.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", required=True, help="Explicitly download public vision model files")
    parser.add_argument('--only',choices=['all','objects','visual'],default='all')
    args=parser.parse_args()
    install(args.only)


if __name__ == "__main__":
    main()
