# RETIRED 2026-11-05: historical research regression code only; not imported by application inference.
"""Generic audio-event hypotheses; never emotion, intent or automatic dispatch."""
import math
import time
import wave
import numpy as np
from .ai_models import local_mediapipe, model_identity

TARGETS = {'Screaming': 'Scream-like sound', 'Shatter': 'Shattering-like sound'}
THRESHOLD = .7
WINDOW_SECONDS = .975


def observations(results, duration):
    events, windows = [], []
    for result in results:
        start = result.timestamp_ms / 1000
        if not math.isfinite(start) or not 0 <= start < duration:
            raise ValueError('Audio event model returned invalid timing.')
        end = min(duration, start + WINDOW_SECONDS)
        hits = []
        for head in result.classifications:
            for category in head.categories:
                score = float(category.score)
                if not math.isfinite(score) or not 0 <= score <= 1:
                    raise ValueError('Audio event model returned an invalid score.')
                if category.category_name not in TARGETS or score < THRESHOLD:
                    continue
                hits.append({'label': category.category_name, 'score': round(score, 5)})
                title = TARGETS[category.category_name]
                previous = next((e for e in reversed(events) if e['title'] == title and e['end'] >= start - .01), None)
                if previous:
                    previous['end'] = end
                    previous['confidence'] = max(previous['confidence'], score)
                else:
                    events.append({'start': start, 'end': end, 'kind': 'audio', 'title': title,
                                   'detail': 'Generic YAMNet sound-class hypothesis, not a verified event or evidence of violence. Media, play, machinery and recording artifacts can produce false positives. Source audio is not retained under the default privacy policy; the linked video is silent. Obtain authorized corroborating evidence before a conclusion.',
                                   'confidence': score, 'source': 'model', 'references': [], 'signals': {'context': 40}})
        windows.append({'start': start, 'end': end, 'candidates': hits})
    return events, windows


class LocalAcoustics:
    def __init__(self, path):
        self.path = path
        self.identity = model_identity(path)
        self.last_report = {}

    def analyze(self, path):
        local_mediapipe()
        from mediapipe.tasks.python import audio, BaseOptions
        from mediapipe.tasks.python.components.containers.audio_data import AudioData
        with wave.open(str(path), 'rb') as source:
            if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (1, 2, 16000):
                raise ValueError('Audio events require mono 16-bit PCM at 16 kHz.')
            duration = source.getnframes() / source.getframerate()
            if not 0 < duration <= 120.1:
                raise ValueError('Audio events support recordings up to 120 seconds.')
            samples = np.frombuffer(source.readframes(source.getnframes()), dtype='<i2').astype(np.float32) / 32768
        started = time.perf_counter()
        options = audio.AudioClassifierOptions(base_options=BaseOptions(model_asset_path=self.path),
                                               category_allowlist=list(TARGETS), score_threshold=THRESHOLD)
        with audio.AudioClassifier.create_from_options(options) as classifier:
            results = classifier.classify(AudioData.create_from_array(samples, sample_rate=16000))
        events, windows = observations(results, duration)
        if not windows:
            raise ValueError('Audio event model produced no analyzed windows.')
        self.last_report = {'status': 'completed', 'model': self.identity, 'threshold': THRESHOLD,
                            'threshold_source': 'Unvalidated review threshold, not a calibrated probability.',
                            'window_seconds': WINDOW_SECONDS, 'analyzed_windows': len(windows), 'windows': windows,
                            'elapsed_seconds': round(time.perf_counter() - started, 3),
                            'scope': 'Generic scream/shattering sound candidates only; no speaker, emotion, aggression, injury or officer-danger inference. Original audio is not retained; silent video cannot corroborate an acoustic hypothesis.'}
        return events
