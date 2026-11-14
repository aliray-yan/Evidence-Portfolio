"""Strict research CPU execution; no runtime network or automatic activation."""
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import sys

import numpy as np
import torch

CPU_CONFIG = {'PERFORMANCE_HINT': 'LATENCY', 'INFERENCE_NUM_THREADS': 2,
              'NUM_STREAMS': 1, 'INFERENCE_PRECISION_HINT': 'f32',
              'ENABLE_CPU_PINNING': False}
PROFILE = 'openvino-fp32-dino-v1'
INT8_PROFILE = 'openvino-int8-dino-v1'
NATIVE_PROFILE = 'torch-native-dino-v1'
NATIVE_CONFIG = {'torch_threads': 2, 'opencv_threads': 1, 'decoder_threads': 1}
_private_import_completed = False


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def bounded_json(path, maximum=1024 * 1024):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > maximum:
        raise ValueError('Invalid runtime record')
    value = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(value, dict):
        raise ValueError('Runtime record must be a JSON object')
    return value


def private_openvino():
    # This pinned vendor release imports usage telemetry even for normal import.
    # Enforce declined consent before importing it, without writing host settings
    # or allowing a first-run opt-in prompt. No sensitive requests may opt in.
    global _private_import_completed
    if version('openvino') != '2025.4.1' or version('openvino-telemetry') != '2025.2.0':
        raise ValueError('Use the reviewed pinned OpenVINO runtime and telemetry versions')
    if 'openvino' in sys.modules and not _private_import_completed:
        raise ValueError('Import OpenVINO through the privacy adapter first in a fresh process')
    from openvino_telemetry.utils.opt_in_checker import OptInChecker, ConsentCheckResult
    OptInChecker.check = lambda self, *args, **kwargs: ConsentCheckResult.DECLINED
    import openvino
    _private_import_completed = True
    return openvino


def runtime_receipt(bundle, directory):
    root = Path(directory).resolve()
    record = bounded_json(root / 'runtime.json')
    manifest = bounded_json(Path(bundle) / 'manifest.json')
    if not isinstance(record.get('files'), dict) or not isinstance(manifest.get('files'), dict):
        raise ValueError('Missing runtime/model checksums')
    native = record.get('profile') == NATIVE_PROFILE
    if (record.get('schema') != 1 or record.get('profile') not in (PROFILE, INT8_PROFILE, NATIVE_PROFILE)
            or record.get('config') != (NATIVE_CONFIG if native else CPU_CONFIG)
            or record.get('source_manifest_sha256') != sha(Path(bundle) / 'manifest.json')
            or record.get('source_encoder_sha256') != manifest['files'].get('encoder.pt')):
        raise ValueError('Runtime does not match the verified source model')
    if native:
        if (record['files'] != {} or record.get('libraries') != native_libraries()
                or not isinstance(record.get('predictions_sha256'), str)
                or len(record['predictions_sha256']) != 64):
            raise ValueError('Native runtime library or evaluation identity changed')
        return record
    if record['profile'] == PROFILE:
        if not isinstance(record.get('equivalence'), dict) or record['equivalence'].get('passed') is not True:
            raise ValueError('Full-precision runtime requires numerical agreement')
    else:
        validate_calibration(bundle, root, record, manifest)
    for name, limit in [('encoder.xml', 8 * 1024**2), ('encoder.bin', 96 * 1024**2)]:
        path = root / name
        if (path.is_symlink() or not path.is_file() or path.resolve().parent != root
                or path.stat().st_size > limit or sha(path) != record['files'].get(name)):
            raise ValueError('Runtime artifact checksum or size mismatch')
    return record


def native_libraries():
    return {name: version(name) for name in ('torch', 'transformers', 'opencv-python')}


def predictions_hash(predictions):
    return hashlib.sha256(json.dumps(predictions, sort_keys=True, separators=(',', ':'),
                                     allow_nan=False).encode()).hexdigest()


def validate_calibration(bundle, root, record, manifest):
    """Verify training-only provenance, not model quality or approval."""
    calibration = bounded_json(root / 'calibration.json')
    inventory_path = Path(bundle) / 'inventory.json'
    inventory_hash = sha(inventory_path)
    meta = record.get('calibration', {})
    if (record.get('nncf') != '2.18.0' or not isinstance(meta, dict)
            or meta.get('sha256') != sha(root / 'calibration.json')
            or meta.get('training_only') is not True or meta.get('frames') != 256
            or calibration.get('frames') != 256 or calibration.get('seed') != 42
            or calibration.get('inventory_sha256') != inventory_hash
            or meta.get('inventory_sha256') != inventory_hash
            or manifest['files'].get('inventory.json') != inventory_hash):
        raise ValueError('Invalid calibration provenance')
    inventory = bounded_json(inventory_path, maximum=8 * 1024**2)
    rows = inventory.get('rows', [])
    by_id = {r['id']: r for r in rows}
    chosen = calibration.get('windows', [])
    if (len(by_id) != len(rows) or len(chosen) != 32
            or len({r['id'] for r in chosen}) != 32):
        raise ValueError('Expected 32 distinct calibration windows')
    for row in chosen:
        expected = by_id.get(row.get('id'))
        if (not expected or expected.get('split') != 'train'
                or row != {k: expected[k] for k in ('id', 'split', 'dataset', 'label')}):
            raise ValueError('Calibration must contain only verified training windows')


class CPUEncoder:
    def __init__(self, directory):
        ov = private_openvino()
        root = Path(directory)
        core = ov.Core()
        graph = core.read_model(str(root / 'encoder.xml'), str(root / 'encoder.bin'))
        if (len(graph.inputs) != 1 or list(graph.input().shape) != [1, 3, 224, 224]
                or len(graph.outputs) != 1 or list(graph.output().shape) != [1, 768]):
            raise ValueError('Invalid fixed CPU graph shape')
        self.compiled = core.compile_model(graph, 'CPU', CPU_CONFIG)

    def __call__(self, frames):
        if (list(frames.shape) != [1, 3, 224, 224] or frames.dtype != torch.float32
                or not torch.isfinite(frames).all()):
            raise ValueError('Expected one full-precision 224-pixel RGB tensor')
        value = self.compiled(frames.detach().cpu().numpy())[0].copy()
        if value.shape != (1, 768) or not np.isfinite(value).all():
            raise ValueError('Invalid CPU encoder result')
        return torch.from_numpy(value)


def load_cpu(bundle, directory):
    from .exchange_bundle import validate_assets
    root, spec, manifest = validate_assets(bundle)
    if spec.CONTRACT['architecture'] != 'dinov2-small-gru-v1':
        raise ValueError('Unsupported CPU runtime architecture')
    receipt = runtime_receipt(root, directory)
    if receipt['profile'] == NATIVE_PROFILE:
        from .exchange_bundle import load
        return load(root, research=True)
    head = spec.TemporalHead().eval()
    head.load_state_dict(torch.load(root / 'head.pt', map_location='cpu', weights_only=True), strict=True)
    if any(not torch.isfinite(p).all() for p in head.parameters()):
        raise ValueError('Nonfinite temporal head')
    return CPUEncoder(directory), head, manifest
