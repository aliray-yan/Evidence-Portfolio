"""Explicit pinned download and CPU feasibility check for RGB-only research."""
import argparse
import json
from pathlib import Path
import time

import numpy as np
import psutil
import torch

from sentinel_ml.exchange_dino import Encoder, CONTRACT
from .exchange_sources import digest, download

REVISION = 'ed25f3a31f01632728cabb09d1542f84ab7b0056'
SHA256 = 'ae1e99fcefd534ed978cdeb8326f08030c96e28b7a81ffcbc98a857c84d14be1'
URL = f'https://huggingface.co/facebook/dinov2-small/resolve/{REVISION}/model.safetensors'


def prepare(destination):
    root = Path(destination).resolve()
    root.mkdir(parents=True, exist_ok=True)
    weights = root / 'model.safetensors'
    if not weights.exists():
        download(URL, weights, maximum=90 * 1024**2)
    if weights.stat().st_size != 88249960 or digest(weights) != SHA256:
        raise ValueError('Official DINOv2 checkpoint checksum mismatch')
    torch.set_num_threads(2)
    from safetensors.torch import load_file
    encoder = Encoder().eval()
    encoder.model.load_state_dict(load_file(str(weights)), strict=True)
    torch.save(encoder.state_dict(), root / 'encoder.pt')
    process = psutil.Process()
    elapsed = []
    with torch.inference_mode():
        frame = torch.zeros(1, 3, CONTRACT['size'], CONTRACT['size'])
        for number in range(25):
            start = time.perf_counter()
            result = encoder(frame)
            if result.shape != (1, 768) or not torch.isfinite(result).all():
                raise ValueError('Invalid DINO features')
            if number >= 5:
                elapsed.append(time.perf_counter() - start)
        start = time.perf_counter()
        encoder(frame.expand(8, -1, -1, -1))
        batch_seconds = time.perf_counter() - start
    report = {'schema': 1, 'source': URL, 'revision': REVISION, 'source_sha256': SHA256,
              'encoder_sha256': digest(root / 'encoder.pt'), 'contract': CONTRACT,
              'license': 'Apache-2.0', 'credit': 'Oquab et al., DINOv2: Learning Robust Visual Features without Supervision, 2023; Meta AI.',
              'benchmark': {'input': 'synthetic zero tensors, timing only; not accuracy', 'threads': 2,
                            'warmup': 5, 'samples': len(elapsed),
                            'median_seconds': float(np.median(elapsed)),
                            'p95_seconds_nearest_rank': sorted(elapsed)[18],
                            'eight_frame_batch_seconds': batch_seconds,
                            'rss_bytes_after_batch': process.memory_info().rss},
              'limitations': ['Image features only; no pretrained transfer/currency/bribery classifier.',
                             'No streaming, decoder, concurrent fight model or sustained-load measurement.']}
    (root / 'source.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report['benchmark'], indent=2), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, required=True)
    prepare(parser.parse_args().destination)
