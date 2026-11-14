# RETIRED 2026-11-05: historical research regression code only; not imported by application inference.
"""Local anonymous speaker turns; no enrollment, identity or cross-case matching."""
import argparse
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
import wave
from .language_assets import bundle_identity

SCOPE = 'Estimated anonymous voices within this recording only, not identities or officer/citizen roles. Overlap and speaker changes can leave transcript labels unknown. Voices and embeddings are not retained.'


def validate_turns(turns, duration):
    if not isinstance(turns, list) or len(turns) > 2000:
        raise ValueError('Speaker output exceeds the supported turn count.')
    result, labels = [], {}
    for turn in sorted(turns, key=lambda t: (t['start'], t['end'])):
        if not all(isinstance(turn[k], (int, float)) and not isinstance(turn[k], bool) and math.isfinite(turn[k]) for k in ('start', 'end')):
            raise ValueError('Invalid speaker interval.')
        if not 0 <= turn['start'] < turn['end'] <= duration + .25:
            raise ValueError('Speaker interval exceeds recording bounds.')
        raw = turn['speaker']
        if not isinstance(raw, int) or isinstance(raw, bool) or not 0 <= raw < 100:
            raise ValueError('Invalid anonymous speaker cluster.')
        if raw not in labels:
            labels[raw] = 'Speaker ' + str(len(labels) + 1)
        end = min(turn['end'], duration)
        if end > turn['start']:
            result.append({'start': round(turn['start'], 4), 'end': round(end, 4), 'speaker': labels[raw]})
    return result


def attribute_segments(segments, turns):
    """Label a whole ASR segment only when one voice covers >=80%, rivals <=10%."""
    results = []
    for segment in segments:
        start, end = segment['start'], segment['end']
        points = sorted({start, end, *[max(start, min(end, t[k])) for t in turns for k in ('start', 'end')]})
        coverage, overlap = {}, 0.
        for left, right in zip(points, points[1:]):
            middle = (left + right) / 2
            active = {t['speaker'] for t in turns if t['start'] <= middle < t['end']}
            if len(active) > 1:
                overlap += right - left
            elif active:
                speaker = next(iter(active))
                coverage[speaker] = coverage.get(speaker, 0) + right - left
        label = None
        if coverage and end > start:
            chosen = max(coverage, key=coverage.get)
            duration = end - start
            rivals = sum(v for k, v in coverage.items() if k != chosen) + overlap
            if coverage[chosen] / duration >= .8 and rivals / duration <= .1:
                label = chosen + ' (estimated)'
        results.append({**segment, 'speaker': label})
    return results


def analyze(wav_path, model_path):
    import numpy as np
    import sherpa_onnx
    identity = bundle_identity(model_path, 'anonymous_diarization', ('model.onnx', 'speaker.onnx'))
    started = time.perf_counter()
    with wave.open(str(wav_path), 'rb') as wav:
        if wav.getnchannels() != 1 or wav.getframerate() != 16000 or wav.getsampwidth() != 2:
            raise ValueError('Speaker analysis requires 16 kHz mono PCM16 audio.')
        duration = wav.getnframes() / 16000
        if not 0 < duration <= 120.25:
            raise ValueError('Speaker analysis supports recordings up to 120 seconds.')
        samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(np.float32) / 32768
    config = sherpa_onnx.OfflineSpeakerDiarizationConfig(
        segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
            pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(model=str(Path(model_path) / 'model.onnx')),
            num_threads=2, provider='cpu', debug=False),
        embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(Path(model_path) / 'speaker.onnx'), num_threads=2, provider='cpu', debug=False),
        clustering=sherpa_onnx.FastClusteringConfig(num_clusters=-1, threshold=.5),
        min_duration_on=.3, min_duration_off=.5)
    if not config.validate():
        raise ValueError('Local speaker model configuration is invalid.')
    diarizer = sherpa_onnx.OfflineSpeakerDiarization(config)
    if diarizer.sample_rate != 16000:
        raise ValueError('Unexpected model sample rate.')
    raw = diarizer.process(samples).sort_by_start_time()
    turns = validate_turns([{'start': float(t.start), 'end': float(t.end), 'speaker': int(t.speaker)} for t in raw], duration)
    return {'turns': turns, 'report': {'status': 'completed', 'model': identity, 'scope': SCOPE,
            'speakers': len({t['speaker'] for t in turns}), 'turns': len(turns), 'cluster_threshold': .5,
            'attribution_minimum_coverage': .8, 'duration_seconds': round(duration, 3),
            'runtime': sherpa_onnx.__version__, 'elapsed_seconds': round(time.perf_counter() - started, 3)}}


def run_diarization(wav_path, model_path, duration):
    """Bound native inference in a child process so a crash cannot kill the worker."""
    output = Path(wav_path).with_name('speaker-turns.json')
    environment = {k: v for k, v in os.environ.items() if k not in ('OPENROUTER_API_KEY', 'SENTINEL_NOTIFICATION_SECRET', 'SENTINEL_ENCRYPTION_KEY')}
    subprocess.run([sys.executable, '-m', 'backend.diarization', '--audio', str(wav_path), '--model', str(model_path), '--output', str(output)],
                   check=True, capture_output=True, timeout=max(60, duration * 4), env=environment,
                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    if output.stat().st_size > 1_000_000:
        raise ValueError('Speaker output exceeds its size limit.')
    value = json.loads(output.read_text(encoding='utf-8'))
    output.unlink()
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audio', required=True); parser.add_argument('--model', required=True); parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = Path(args.output)
    if output.exists():
        raise ValueError('Choose a new speaker-output file.')
    output.write_text(json.dumps(analyze(args.audio, args.model)), encoding='utf-8')


if __name__ == '__main__':
    main()
