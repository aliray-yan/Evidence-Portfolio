"""Evaluate an offline CPU acceleration path before changing any model contract."""
import argparse
import json
from pathlib import Path
import time

import numpy as np
import onnxruntime as ort
import torch

from sentinel_ml.exchange_dino import Encoder
from .exchange_sources import digest


def benchmark(root):
    root = Path(root).resolve()
    receipt = json.loads((root / 'source.json').read_text())
    if digest(root / 'encoder.pt') != receipt['encoder_sha256']:
        raise ValueError('Encoder checksum changed')
    torch.set_num_threads(2)
    model = Encoder().eval()
    model.load_state_dict(torch.load(root / 'encoder.pt', weights_only=True, map_location='cpu'), strict=True)
    torch.manual_seed(13)
    example = torch.rand(1, 3, 224, 224)
    target = root / 'encoder.onnx'
    torch.onnx.export(model, example, str(target), input_names=['rgb'], output_names=['features'],
                      dynamic_axes={'rgb': {0: 'batch'}, 'features': {0: 'batch'}},
                      opset_version=17, dynamo=False)
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2
    opts.inter_op_num_threads = 1
    session = ort.InferenceSession(str(target), sess_options=opts, providers=['CPUExecutionProvider'])
    times, errors = [], []
    with torch.inference_mode():
        for batch in (1, 8):
            tensor = torch.rand(batch, 3, 224, 224)
            expected = model(tensor).numpy()
            start = time.perf_counter()
            actual = session.run(['features'], {'rgb': tensor.numpy()})[0]
            times.append({'batch': batch, 'seconds': time.perf_counter() - start})
            errors.append(float(np.max(np.abs(expected - actual))))
            if not np.allclose(actual, expected, rtol=1e-4, atol=1e-4):
                raise ValueError('ONNX export changed encoder features')
        samples = []
        for i in range(25):
            start = time.perf_counter()
            session.run(['features'], {'rgb': example.numpy()})
            if i >= 5:
                samples.append(time.perf_counter() - start)
    report = {'schema': 1, 'encoder_sha256': receipt['encoder_sha256'], 'onnx_sha256': digest(target),
              'provider': session.get_providers(), 'threads': 2, 'onnxruntime': ort.__version__,
              'largest_absolute_errors': errors, 'batch_timings': times,
              'p95_seconds': sorted(samples)[18], 'median_seconds': float(np.median(samples)),
              'input': 'Seeded synthetic RGB tensors, numerical equivalence and timing only; not accuracy.'}
    (root / 'onnx-benchmark.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    benchmark(parser.parse_args().directory)
