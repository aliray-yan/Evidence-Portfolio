"""Strict local loading and bounded temporal inference for learned exchanges."""
from collections import deque
import hashlib
import json
import math
from pathlib import Path
import time

import cv2
import numpy as np
import torch

from .exchange import CONTRACT, Encoder, TemporalHead, preprocess
from .exchange_profiles import profile


def validate_assets(directory):
    root = Path(directory).resolve()
    if (root / 'DISCARDED_PREPROCESSING.json').exists():
        raise ValueError('This experiment was discarded for incorrect preprocessing')
    manifest_path = root / 'manifest.json'
    if manifest_path.stat().st_size > 256 * 1024:
        raise ValueError('Oversized exchange manifest')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    spec = profile(manifest.get('contract', {}).get('architecture'))
    if manifest.get('schema') != 1 or manifest.get('contract') != spec.CONTRACT or manifest.get('purpose') != 'research_trained':
        raise ValueError('Unsupported exchange training contract')
    threshold = manifest.get('threshold')
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)) or not math.isfinite(threshold) or not .05 <= threshold <= .99:
        raise ValueError('Invalid exchange threshold')
    encoder_limit = 96 * 1024**2 if spec.CONTRACT['architecture'] == 'dinov2-small-gru-v1' else 8 * 1024**2
    for name, maximum in [('encoder.pt', encoder_limit), ('head.pt', 2 * 1024**2),
                          ('inventory.json', 8 * 1024**2), ('test.json', 256 * 1024)]:
        path = root / name
        if not path.is_file() or path.is_symlink() or path.resolve().parent != root or path.stat().st_size > maximum:
            raise ValueError('Invalid exchange bundle file')
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if manifest.get('files', {}).get(name) != actual:
            raise ValueError('Exchange bundle checksum mismatch')
    return root, spec, manifest


def load(directory, *, research=False):
    # A manifest flag alone can never enable operational inference.
    if not research:
        raise ValueError('This research bundle is not approved for operational activation; evaluate it first.')
    root, spec, manifest = validate_assets(directory)
    encoder, head = spec.Encoder().eval(), spec.TemporalHead().eval()
    encoder.load_state_dict(torch.load(root / 'encoder.pt', map_location='cpu', weights_only=True), strict=True)
    head.load_state_dict(torch.load(root / 'head.pt', map_location='cpu', weights_only=True), strict=True)
    if any(not torch.isfinite(p).all() for model in (encoder, head) for p in model.parameters()):
        raise ValueError('Nonfinite exchange weights')
    return encoder, head, manifest


class ResearchExchange:
    """Original frame times retained; missing samples reset, never pad a gap."""
    def __init__(self, directory, runtime=None):
        torch.set_num_threads(2)
        cv2.setNumThreads(1)
        if runtime is None:
            self.encoder, self.head, self.manifest = load(directory, research=True)
        else:
            from .exchange_runtime import load_cpu
            self.encoder, self.head, self.manifest = load_cpu(directory, runtime)
        self.spec = profile(self.manifest['contract']['architecture'])
        self.frames = deque(maxlen=CONTRACT['frames'])
        self.previous = None

    def fork(self):
        """Independent bounded temporal state; immutable encoder/head are shared."""
        child = object.__new__(type(self))
        child.__dict__ = self.__dict__.copy()
        child.frames = deque(maxlen=self.manifest['contract']['frames'])
        child.previous = None
        return child

    def reset(self):
        self.frames.clear()
        self.previous = None

    def observe(self, rgb, seconds, rtp=None):
        if not math.isfinite(seconds) or self.previous is not None and seconds <= self.previous:
            raise ValueError('Exchange samples require increasing source timestamps')
        if self.previous is not None and seconds - self.previous > .4:
            self.reset()
        self.previous = seconds
        started = time.perf_counter()
        with torch.inference_mode():
            convert = self.spec.preprocess if hasattr(self, 'spec') else preprocess
            feature = self.encoder(convert(rgb).unsqueeze(0))[0]
            self.frames.append((float(seconds), rtp, feature))
            if len(self.frames) < CONTRACT['frames']:
                return None
            value = float(self.head(torch.stack([f[2] for f in self.frames]).unsqueeze(0)).softmax(1)[0, 1])
        if not math.isfinite(value):
            raise ValueError('Nonfinite exchange prediction')
        return {'start': self.frames[0][0], 'end': self.frames[-1][0],
                'sampled_seconds': [f[0] for f in self.frames], 'sampled_rtp': [f[1] for f in self.frames],
                'score': value, 'flagged': value >= self.manifest['threshold'], 'boxes': [],
                'inference_seconds': time.perf_counter() - started,
                'detail': 'Learned window classification; precise transfer onset and spatial localization are unknown.'}

    def analyze(self, path):
        self.reset()
        # FFmpeg's automatic decoder pool otherwise competes with the two
        # inference workers on a four-core laptop. Decode once on one thread.
        cap = cv2.VideoCapture(str(path), cv2.CAP_FFMPEG,
                              [cv2.CAP_PROP_N_THREADS, 1,
                               cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000,
                               cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000])
        cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 1)
        fps, count = cap.get(cv2.CAP_PROP_FPS), int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if not math.isfinite(fps) or fps <= 0 or not 1 <= count / fps <= 120:
            cap.release()
            raise ValueError('Expected a decodable 1–120 second video')
        predictions = []
        sampled = 0
        try:
            wanted = set(np.arange(0, count, fps / CONTRACT['sample_hz']).round().astype(int))
            # Decode forward once; repeated seeks re-decode the same GOPs.
            # Keep the original selected frame indices and presentation times.
            for index in range(count):
                if not cap.grab():
                    raise ValueError('Cannot decode an exchange frame')
                if index not in wanted:
                    continue
                ok, bgr = cap.retrieve()
                if not ok:
                    raise ValueError('Cannot decode an exchange sample')
                sampled += 1
                result = self.observe(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), index / fps)
                if result:
                    predictions.append(result)
        finally:
            cap.release()
        self.last_analysis = {'sampled_frames': sampled, 'duration': count / fps}
        return predictions
