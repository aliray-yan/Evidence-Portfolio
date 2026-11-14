"""Generate a measured screening verdict; this never activates a model."""
import argparse
from collections import Counter
import json
import math
from pathlib import Path

from .exchange_sources import digest

EXPECTED_CONTROLS = {'cash': True, 'document': True, 'handshake': False, 'normal': False}


def validate_controls(controls, manifest, manifest_hash):
    """Incomplete or differently weighted experiments cannot pass screening."""
    if (controls.get('schema') != 1 or controls.get('model_manifest_sha256') != manifest_hash
            or controls.get('version') != manifest['version']
            or controls.get('threshold') != manifest['threshold']):
        raise ValueError('Evaluation does not match the frozen model/threshold')
    records = controls.get('controls', [])
    if len(records) != 4 or {r.get('control') for r in records} != set(EXPECTED_CONTROLS):
        raise ValueError('Screening requires all four unique external controls')
    latencies = []
    for record in records:
        if record.get('expected_visible_transfer') is not EXPECTED_CONTROLS[record['control']]:
            raise ValueError('External control label changed')
        predictions = record.get('predictions', [])
        if not predictions or record.get('windows') != len(predictions):
            raise ValueError('External control has no complete predictions')
        for prediction in predictions:
            score, elapsed = prediction.get('score'), prediction.get('inference_seconds')
            if (isinstance(score, bool) or not isinstance(score, (int, float))
                    or not math.isfinite(score) or not 0 <= score <= 1
                    or isinstance(elapsed, bool) or not isinstance(elapsed, (int, float))
                    or not math.isfinite(elapsed) or elapsed < 0):
                raise ValueError('Invalid score or latency in external predictions')
            if prediction.get('flagged') is not (score >= manifest['threshold']):
                raise ValueError('External prediction disagrees with frozen threshold')
            latencies.append(elapsed)
        if record.get('detected') is not any(p['flagged'] for p in predictions):
            raise ValueError('External detection summary disagrees with predictions')
    return sorted(latencies)[math.ceil(.95 * len(latencies)) - 1]


def screening(bundle, external):
    manifest = json.loads((bundle / 'manifest.json').read_text(encoding='utf-8'))
    controls = json.loads(external.read_text(encoding='utf-8'))
    if 'runtime_sha256' in controls:
        raise ValueError('Runtime-specific held-out evaluation is required; do not reuse the original encoder test report')
    sample_p95 = validate_controls(controls, manifest, digest(bundle / 'manifest.json'))
    inventory = json.loads((bundle / 'inventory.json').read_text(encoding='utf-8'))
    test = json.loads((bundle / 'test.json').read_text())
    if digest(bundle / 'test.json') != manifest['files']['test.json']:
        raise ValueError('Held-out report checksum mismatch')
    if digest(bundle / 'inventory.json') != manifest['files']['inventory.json']:
        raise ValueError('Inventory checksum mismatch')
    if not {'cornell', 'sbu'} <= set(test.get('datasets', {})) or set(test['datasets']) - {'cornell', 'sbu', 'cap'}:
        raise ValueError('Both held-out datasets must be evaluated')
    checks = {f'{name}_precision': test['datasets'][name]['precision'] >= .8 for name in ('sbu', 'cornell')}
    checks.update({f'{name}_recall': test['datasets'][name]['recall'] >= .7 for name in ('sbu', 'cornell')})
    if 'cap' in test['datasets']:
        tn, fp = test['datasets']['cap']['confusion_matrix'][0]
        checks['cap_negative_specificity'] = tn / max(1, tn + fp) >= .95
    checks.update({f"control_{r['control']}": r['detected'] == r['expected_visible_transfer'] for r in controls['controls']})
    checks['cpu_sample_p95_under_250ms'] = sample_p95 < .25
    return {'schema': 1, 'version': manifest['version'], 'model_manifest_sha256': digest(bundle / 'manifest.json'),
            'external_report_sha256': digest(external), 'screening_pass': all(checks.values()),
            'checks': checks, 'test': test, 'training': manifest['training'],
            'cpu_sample_p95_seconds': sample_p95, 'percentile_method': 'nearest rank',
            'counts': {s: dict(Counter(r['dataset'] + '/' + str(r['label']) for r in inventory['rows'] if r['split'] == s))
                       for s in ('train', 'dev', 'test')}, 'excluded_source_files': len(inventory['excluded']),
            'external_controls': [{k: v for k, v in r.items() if k != 'predictions'} for r in controls['controls']],
            'conclusion': 'Eligible for application integration tests; still research-only.' if all(checks.values()) else
                          'Do not activate: one or more predeclared quality/performance checks failed.',
            'limitations': ['Participant-held-out laboratory windows are correlated within recordings and camera views.',
                            'SBU test includes only four positive sequences; estimates have substantial uncertainty.',
                            'Four external controls are a screening check, not a validated field benchmark.',
                            'No banknote identity, intent, guilt, spatial action boxes or measured false alarms per hour.',
                            'Physical Android retesting is postponed.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--external', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Do not overwrite a screening result')
    result = screening(args.bundle, args.external)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({'checks': result['checks'], 'conclusion': result['conclusion']}, indent=2))
