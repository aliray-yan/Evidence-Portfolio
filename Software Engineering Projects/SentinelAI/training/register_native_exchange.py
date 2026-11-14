"""Record unchanged native execution and original reserved predictions; no inference claim."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path

from sentinel_ml.exchange_bundle import validate_assets
from sentinel_ml.exchange_runtime import (NATIVE_CONFIG, NATIVE_PROFILE, native_libraries,
                                         predictions_hash, sha, bounded_json)
from .evaluate_exchange_runtime import check_predictions, identity, measured_report
from .train_exchange import report


def register(bundle, output):
    root, _, manifest = validate_assets(bundle)
    if output.exists():
        raise ValueError('Preserve earlier runtime records')
    predictions = json.loads((root / 'test_predictions.json').read_text())
    rows = [r for r in bounded_json(root / 'inventory.json', 8*1024**2)['rows'] if r['split'] == 'test']
    check_predictions(rows, predictions)
    if report(rows, [p['score'] for p in predictions], manifest['threshold']) != bounded_json(root / 'test.json'):
        raise ValueError('Original prediction file does not reproduce the hash-verified held-out report')
    output.mkdir(parents=True)
    receipt = {'schema': 1, 'profile': NATIVE_PROFILE, 'config': NATIVE_CONFIG,
               'source_manifest_sha256': sha(root / 'manifest.json'),
               'source_encoder_sha256': manifest['files']['encoder.pt'], 'files': {},
               'libraries': native_libraries(), 'predictions_sha256': predictions_hash(predictions),
               'created_at': datetime.now(timezone.utc).isoformat(),
               'scope': 'Original trained Torch encoder/head and preprocessing. No conversion or quantization.',
               'limits': 'Original reserved scores reused from cached training-time embeddings; no new held-out inference run.'}
    (output / 'runtime.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    heldout = {**identity(root, output, manifest), 'status': 'completed', 'predictions': predictions,
               'provenance': 'Exact original cached-feature held-out predictions, not a new inference run.'}
    measured_report(root, output, heldout)
    (output / 'heldout.json').write_text(json.dumps(heldout, indent=2), encoding='utf-8')
    return receipt


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--bundle',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    print(json.dumps(register(a.bundle,a.output),indent=2))
