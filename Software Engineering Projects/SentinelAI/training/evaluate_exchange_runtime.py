"""Frozen-runtime evaluation on every reserved row; resumable, never tunes a model."""
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import time

import cv2
import torch

from sentinel_ml.exchange_bundle import validate_assets
from sentinel_ml.exchange_runtime import bounded_json, load_cpu, runtime_receipt, sha, NATIVE_PROFILE, predictions_hash
from .exchange_data import load_rgb, verify_inventory
from .train_exchange import report


def identity(bundle, runtime, manifest):
    return {'schema': 1, 'model_manifest_sha256': sha(bundle / 'manifest.json'),
            'runtime_sha256': sha(runtime / 'runtime.json'),
            'inventory_sha256': sha(bundle / 'inventory.json'),
            'version': manifest['version'], 'threshold': manifest['threshold']}


def check_predictions(rows, predictions, *, complete=True):
    if len(predictions) > len(rows) or complete and len(predictions) != len(rows):
        raise ValueError('Runtime evaluation must cover every reserved row exactly once')
    if len({r['id'] for r in rows}) != len(rows):
        raise ValueError('Duplicate inventory window IDs')
    for row, prediction in zip(rows, predictions):
        score = prediction.get('score')
        if (prediction.get('id') != row['id'] or type(prediction.get('label')) is not int
                or prediction['label'] != row['label'] or row['split'] != 'test'
                or isinstance(score, bool) or not isinstance(score, (float, int))
                or not math.isfinite(score) or not 0 <= score <= 1):
            raise ValueError('Runtime prediction ID/label/score does not match the reserved inventory')


def measured_report(bundle, runtime, result):
    _, _, manifest = validate_assets(bundle)
    receipt = runtime_receipt(bundle, runtime)
    expected = identity(bundle, runtime, manifest)
    if any(result.get(k) != v for k, v in expected.items()) or result.get('status') != 'completed':
        raise ValueError('Held-out evaluation belongs to a different or incomplete runtime')
    rows = [r for r in bounded_json(bundle / 'inventory.json', 8 * 1024**2)['rows'] if r['split'] == 'test']
    predictions = result.get('predictions', [])
    check_predictions(rows, predictions)
    measured = report(rows, [p['score'] for p in predictions], manifest['threshold'])
    if receipt['profile'] == NATIVE_PROFILE:
        if (predictions_hash(predictions) != receipt['predictions_sha256']
                or measured != bounded_json(bundle / 'test.json')):
            raise ValueError('Native runtime must retain the original exact reserved predictions and metrics')
    return measured


def save(path, value):
    temporary = path.with_suffix(path.suffix + '.part')
    temporary.write_text(json.dumps(value, indent=2), encoding='utf-8')
    temporary.replace(path)


def evaluate(bundle, runtime, dataset, output, resume=False):
    if output.exists():
        raise ValueError('Preserve completed evaluation; choose a new output')
    root, spec, manifest = validate_assets(bundle)
    runtime_receipt(root, runtime)
    inventory = bounded_json(root / 'inventory.json', 8 * 1024**2)
    verify_inventory(dataset, inventory)
    rows = [r for r in inventory['rows'] if r['split'] == 'test']
    if not rows or set(r['dataset'] for r in rows) != {'sbu', 'cornell', 'cap'}:
        raise ValueError('Expected all three reserved evaluation sources')
    progress = output.with_suffix('.progress.json')
    result = {**identity(root, runtime, manifest), 'status': 'running', 'predictions': [],
              'created_at': datetime.now(timezone.utc).isoformat(),
              'limits': ['Reused reserved laboratory windows; not independent field evaluation.',
                         'Quantized encoder evaluated directly; original threshold/head unchanged.']}
    if progress.exists():
        if not resume:
            raise ValueError('Progress exists; explicitly resume the identical frozen runtime')
        previous = bounded_json(progress, 8 * 1024**2)
        if any(previous.get(k) != v for k, v in identity(root, runtime, manifest).items()):
            raise ValueError('Cannot resume a changed model/runtime/inventory')
        check_predictions(rows, previous.get('predictions', []), complete=False)
        result['predictions'] = previous['predictions']
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(2)
    cv2.setNumThreads(1)
    encoder, head, _ = load_cpu(root, runtime)
    started = time.perf_counter()
    save(progress, result)
    with torch.inference_mode():
        for row in rows[len(result['predictions']):]:
            rgb = load_rgb(dataset, row)
            features = torch.cat([encoder(spec.preprocess(frame).unsqueeze(0)) for frame in rgb])
            score = float(head(features.unsqueeze(0)).softmax(1)[0, 1])
            prediction = {'id': row['id'], 'label': row['label'], 'score': score}
            check_predictions([row], [prediction])
            result['predictions'].append(prediction)
            if len(result['predictions']) % 10 == 0:
                save(progress, result)
                print(json.dumps({'completed': len(result['predictions']), 'total': len(rows),
                                  'this_run_seconds': round(time.perf_counter()-started, 1)}), flush=True)
    result.update(status='completed', completed_at=datetime.now(timezone.utc).isoformat())
    result['metrics'] = measured_report(root, runtime, result)
    save(output, result)
    save(progress, result)
    print(json.dumps({'complete': True, 'datasets': result['metrics']['datasets']}), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('bundle', 'runtime', 'dataset', 'output'):
        p.add_argument('--' + name, type=Path, required=True)
    p.add_argument('--resume', action='store_true')
    args = p.parse_args()
    evaluate(args.bundle, args.runtime, args.dataset, args.output, args.resume)
