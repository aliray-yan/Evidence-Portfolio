"""Bounded frozen-model execution experiment; no fitting or threshold changes."""
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import statistics
import time

import cv2
import psutil
import torch

from sentinel_ml.exchange_bundle import ResearchExchange
from .exchange_sources import digest


def benchmark(bundle, controls, output):
    if output.exists():
        raise ValueError('Keep previous measurements; use a new report path')
    output.parent.mkdir(parents=True, exist_ok=True)
    model = ResearchExchange(bundle)
    images = []
    sources = {}
    cv2.setNumThreads(1)
    for name in ('cash', 'document', 'handshake', 'normal'):
        path = controls / (name + '.mp4')
        receipt = json.loads((Path('evaluation/visual-controls') / (name + '.source.json')).read_text())
        sources[name] = digest(path)
        if sources[name] != receipt['sha256']:
            raise ValueError('Control source changed')
        cap = cv2.VideoCapture(str(path), cv2.CAP_FFMPEG)
        try:
            for seconds in (1., 2.):
                cap.set(cv2.CAP_PROP_POS_MSEC, seconds * 1000)
                ok, frame = cap.read()
                if not ok:
                    raise ValueError('Cannot decode timing fixture')
                images.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        finally:
            cap.release()
    process = psutil.Process()
    report = {'schema': 1, 'created_at': datetime.now(timezone.utc).isoformat(),
              'manifest_sha256': digest(bundle / 'manifest.json'), 'sources': sources,
              'torch': torch.__version__, 'cpu_threads': psutil.cpu_count(),
              'profiles': [], 'status': 'running',
              'protocol': 'Two fixed rounds, threads 2/1/3 then 3/1/2; eight warmup and 48 measured forwards each. '
                          'Preprocessing, frozen RGB encoding and GRU included; decode and concurrent fight excluded. '
                          'Repeated-frame head input is for timing/equivalence only, not behavioral evaluation.'}
    def save():
        output.write_text(json.dumps(report, indent=2), encoding='utf-8')
    try:
        with torch.inference_mode():
            reference = [model.encoder(model.spec.preprocess(rgb).unsqueeze(0)) for rgb in images]
            for round_index, threads in enumerate((2, 1, 3, 3, 1, 2)):
                torch.set_num_threads(threads)
                times, errors = [], []
                for index in range(56):
                    started = time.perf_counter()
                    features = model.encoder(model.spec.preprocess(images[index % 8]).unsqueeze(0))
                    model.head(features.repeat(1, 8, 1)).softmax(1)[0, 1].item()
                    elapsed = time.perf_counter() - started
                    if index >= 8:
                        times.append(elapsed)
                    errors.append(float((features - reference[index % 8]).abs().max()))
                record = {'round': round_index // 3 + 1, 'threads': threads, 'samples': len(times),
                          'median_seconds': statistics.median(times),
                          'p95_seconds': sorted(times)[math.ceil(.95 * len(times)) - 1],
                          'maximum_feature_difference': max(errors),
                          'rss_bytes': process.memory_info().rss}
                report['profiles'].append(record)
                save()
                print(json.dumps(record), flush=True)
                if max(errors) > 1e-4:
                    raise ValueError('Numerical agreement tolerance failed')
        report['status'] = 'completed'
    except Exception as exc:
        report.update(status='failed', error=f'{type(exc).__name__}: {exc}')
        raise
    finally:
        save()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--controls', type=Path, default=Path('.local/visual-exchange-evaluation'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    benchmark(args.bundle, args.controls, args.output)
