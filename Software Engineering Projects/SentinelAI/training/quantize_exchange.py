"""Training-only fixed calibration experiment; no threshold tuning or activation."""
import argparse
from collections import defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import random
import time

import numpy as np
import torch

from sentinel_ml.exchange_dino import preprocess
from sentinel_ml.exchange_bundle import validate_assets
from sentinel_ml.exchange_runtime import private_openvino, sha, CPU_CONFIG, runtime_receipt
from .exchange_data import load_rgb, verify_inventory


def calibration_rows(rows, count=32, seed=42):
    if isinstance(count, bool) or not isinstance(count, int) or count < 1:
        raise ValueError('Calibration window count must be a positive integer')
    identifiers = [row['id'] for row in rows]
    if len(set(identifiers)) != len(identifiers):
        raise ValueError('Duplicate inventory window IDs')
    groups = defaultdict(list)
    for row in sorted(rows, key=lambda row: row['id']):
        if row['split'] == 'train':
            groups[(row['dataset'], row['label'])].append(row)
    rng = random.Random(seed)
    for values in groups.values():
        rng.shuffle(values)
    chosen = []
    keys = sorted(groups)
    while len(chosen) < count:
        before = len(chosen)
        for key in keys:
            if groups[key] and len(chosen) < count:
                chosen.append(groups[key].pop())
        if len(chosen) == before:
            raise ValueError('Insufficient distinct training calibration windows')
    return chosen


def quantize(bundle, runtime, dataset, output):
    if output.exists():
        raise ValueError('Keep earlier candidates; use a new output directory')
    ov = private_openvino()
    import nncf
    if nncf.__version__ != '2.18.0':
        raise ValueError('Use the declared NNCF 2.18.0 calibration version')
    validate_assets(bundle)
    receipt = runtime_receipt(bundle, runtime)
    inventory = json.loads((bundle / 'inventory.json').read_text())
    verify_inventory(dataset, inventory)
    selected = calibration_rows(inventory['rows'])
    output.mkdir(parents=True)
    torch.set_num_threads(2)
    inputs = []
    for row in selected:
        for rgb in load_rgb(dataset, row):
            inputs.append(preprocess(rgb).unsqueeze(0).numpy())
    if len(inputs) != 256 or not all(np.isfinite(value).all() for value in inputs):
        raise ValueError('Expected exactly 256 finite training-only calibration frames')
    protocol = {'seed': 42, 'inventory_sha256': sha(bundle / 'inventory.json'),
                'windows': [{'id': row['id'], 'split': row['split'], 'dataset': row['dataset'],
                             'label': row['label']} for row in selected], 'frames': len(inputs)}
    (output / 'calibration.json').write_text(json.dumps(protocol, indent=2), encoding='utf-8')
    print(json.dumps({'calibration_ready': True, 'frames': len(inputs)}), flush=True)
    started = time.perf_counter()
    core = ov.Core()
    graph = core.read_model(str(runtime / 'encoder.xml'), str(runtime / 'encoder.bin'))
    quantized = nncf.quantize(graph, nncf.Dataset(inputs), subset_size=256,
                             model_type=nncf.ModelType.TRANSFORMER,
                             preset=nncf.QuantizationPreset.MIXED,
                             target_device=nncf.TargetDevice.CPU)
    ov.serialize(quantized, str(output / 'encoder.xml'), str(output / 'encoder.bin'))
    # Calibration creates a candidate only; full model quality is evaluated later.
    record = {'schema': 1, 'profile': 'openvino-int8-dino-v1', 'config': CPU_CONFIG,
              'created_at': datetime.now(timezone.utc).isoformat(),
              'source_manifest_sha256': receipt['source_manifest_sha256'],
              'source_encoder_sha256': receipt['source_encoder_sha256'],
              'source_fp32_runtime_sha256': sha(runtime / 'runtime.json'),
              'openvino': ov.__version__, 'nncf': nncf.__version__,
              'files': {name: sha(output / name) for name in ('encoder.xml', 'encoder.bin')},
              'calibration': {'sha256': sha(output / 'calibration.json'), 'frames': 256,
                              'training_only': True, 'inventory_sha256': protocol['inventory_sha256']},
              'seconds': time.perf_counter() - started,
              'limitations': ['Quantized output differs from FP32; full reserved-set evaluation required.',
                              'Original head, decision threshold and RGB/temporal sampling unchanged.',
                              'Candidate only; not approved for activation.']}
    (output / 'runtime.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
    print(json.dumps({'exported': str(output), 'seconds': record['seconds']}), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('bundle', 'runtime', 'dataset', 'output'):
        p.add_argument('--' + name, type=Path, required=True)
    a = p.parse_args()
    quantize(a.bundle, a.runtime, a.dataset, a.output)
