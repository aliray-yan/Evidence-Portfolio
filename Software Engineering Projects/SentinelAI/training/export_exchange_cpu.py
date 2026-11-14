"""Convert a verified fixed DINO encoder to full-precision OpenVINO CPU IR."""
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import statistics
import time

import cv2
import numpy as np
import psutil
import torch

from sentinel_ml.exchange_bundle import ResearchExchange
from .exchange_sources import digest
from sentinel_ml.exchange_runtime import CPU_CONFIG, private_openvino


def export(bundle, encoder_source, destination):
    ov = private_openvino()
    if destination.exists():
        raise ValueError('Preserve prior exports; choose a new directory')
    receipt = json.loads((encoder_source / 'onnx-benchmark.json').read_text())
    manifest = json.loads((bundle / 'manifest.json').read_text())
    if (receipt['onnx_sha256'] != digest(encoder_source / 'encoder.onnx')
            or receipt['encoder_sha256'] != manifest['files']['encoder.pt']):
        raise ValueError('ONNX source does not match this trained encoder')
    model = ResearchExchange(bundle)
    if model.spec.CONTRACT['architecture'] != 'dinov2-small-gru-v1':
        raise ValueError('Only the fixed DINO profile is supported')
    destination.mkdir(parents=True)
    started = time.perf_counter()
    core = ov.Core()
    # Runtime ONNX reader, not the telemetry-enabled OVC conversion CLI.
    graph = core.read_model(str(encoder_source / 'encoder.onnx'))
    graph.reshape([1, 3, 224, 224])
    ov.serialize(graph, str(destination / 'encoder.xml'), str(destination / 'encoder.bin'))
    compiled = core.compile_model(graph, 'CPU', CPU_CONFIG)
    images = []
    for name in ('cash', 'document', 'handshake', 'normal'):
        path = Path('.local/visual-exchange-evaluation') / (name + '.mp4')
        source = json.loads((Path('evaluation/visual-controls') / (name + '.source.json')).read_text())
        if digest(path) != source['sha256']:
            raise ValueError('Control source changed')
        cap = cv2.VideoCapture(str(path), cv2.CAP_FFMPEG)
        try:
            for seconds in (1., 2.):
                cap.set(cv2.CAP_PROP_POS_MSEC, seconds * 1000)
                ok, bgr = cap.read()
                if not ok:
                    raise ValueError('Cannot decode equivalence frame')
                images.append(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        finally:
            cap.release()
    times, errors = [], []
    cv2.setNumThreads(1)
    with torch.inference_mode():
        for rgb in images:
            value = model.spec.preprocess(rgb).unsqueeze(0)
            expected = model.encoder(value).numpy()
            actual = compiled(value.numpy())[0]
            errors.append(float(np.max(np.abs(actual - expected))))
            if not np.allclose(actual, expected, rtol=1e-4, atol=1e-4):
                raise ValueError('Full-precision conversion failed numerical agreement')
        for i in range(72):
            begin = time.perf_counter()
            value = model.spec.preprocess(images[i % 8]).unsqueeze(0)
            feature = torch.from_numpy(compiled(value.numpy())[0].copy())
            model.head(feature.repeat(1, 8, 1)).softmax(1)[0, 1].item()
            if i >= 8:
                times.append(time.perf_counter() - begin)
    report = {'schema': 1, 'profile': 'openvino-fp32-dino-v1',
              'created_at': datetime.now(timezone.utc).isoformat(),
              'source_manifest_sha256': digest(bundle / 'manifest.json'),
              'source_encoder_sha256': manifest['files']['encoder.pt'],
              'source_onnx_sha256': receipt['onnx_sha256'], 'openvino': ov.__version__,
              'config': CPU_CONFIG,
              'files': {name: digest(destination / name) for name in ('encoder.xml', 'encoder.bin')},
              'equivalence': {'maximum_absolute_feature_error': max(errors), 'frames': len(errors),
                              'rtol': 1e-4, 'atol': 1e-4, 'passed': True},
              'benchmark': {'samples': len(times), 'median_seconds': statistics.median(times),
                            'p95_seconds': sorted(times)[math.ceil(.95 * len(times)) - 1],
                            'rss_bytes': psutil.Process().memory_info().rss},
              'seconds': time.perf_counter() - started,
              'limits': ['No fitting, quantization, threshold or preprocessing change.',
                         'Timing includes preprocess/encoder/head, excludes decode and concurrent fight.',
                         'Complete control scoring and integration verification still required.']}
    (destination / 'runtime.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--bundle', type=Path, required=True)
    p.add_argument('--encoder-source', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    export(a.bundle, a.encoder_source, a.output)
