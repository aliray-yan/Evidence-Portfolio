"""Screen a frozen CPU runtime against its own held-out predictions and three runs."""
import argparse
import json
from pathlib import Path

from sentinel_ml.exchange_runtime import bounded_json, runtime_receipt, sha, NATIVE_PROFILE
from .evaluate_exchange_runtime import measured_report
from .exchange_report import validate_controls


def screen(bundle, runtime, heldout, external):
    if len(external) != 3 or len({p.resolve() for p in external}) != 3:
        raise ValueError('Exactly three distinct declared timing runs are required')
    receipt = runtime_receipt(bundle, runtime)
    manifest = bounded_json(bundle / 'manifest.json')
    result = bounded_json(heldout, 8 * 1024**2)
    test = measured_report(bundle, runtime, result)
    if set(test['datasets']) != {'sbu', 'cornell', 'cap'}:
        raise ValueError('Missing reserved source evaluations')
    checks = {}
    for name in ('sbu', 'cornell'):
        checks[name + '_precision'] = test['datasets'][name]['precision'] >= .8
        checks[name + '_recall'] = test['datasets'][name]['recall'] >= .7
    tn, fp = test['datasets']['cap']['confusion_matrix'][0]
    checks['cap_negative_specificity'] = tn / max(1, tn + fp) >= .95
    rounds = []
    for i, path in enumerate(external, 1):
        controls = bounded_json(path, 8 * 1024**2)
        if receipt['profile'] == NATIVE_PROFILE:
            if 'runtime_sha256' in controls:
                raise ValueError('Native screening requires original unconverted execution')
        elif controls.get('runtime_sha256') != sha(runtime / 'runtime.json'):
            raise ValueError('Controls evaluated a different runtime')
        p95 = validate_controls(controls, manifest, sha(bundle / 'manifest.json'))
        for item in controls['controls']:
            source = bounded_json(Path(__file__).resolve().parents[1] / 'evaluation' /
                                  'visual-controls' / (item['control'] + '.source.json'))
            if item.get('sha256') != source['sha256']:
                raise ValueError('Control video differs from the declared source')
            checks[f"round_{i}_{item['control']}"] = item['detected'] == item['expected_visible_transfer']
        checks[f'round_{i}_cpu_p95_under_250ms'] = p95 < .25
        rounds.append({'report_sha256': sha(path), 'p95_seconds': p95})
    return {'schema': 1, 'purpose': 'research_integration_screening', 'profile': receipt['profile'],
            'model_manifest_sha256': sha(bundle / 'manifest.json'),
            'runtime_sha256': sha(runtime / 'runtime.json'), 'heldout_sha256': sha(heldout),
            'threshold': manifest['threshold'], 'screening_pass': all(checks.values()),
            'checks': checks, 'test': test, 'timing_rounds': rounds,
            'limits': ['Passing allows integration testing, not automatic activation or field approval.',
                       'Native execution reuses exact original reserved predictions; converted runtimes require their own predictions.',
                       'All evaluation sources reused; SBU has only four positive reserved examples.',
                       'Latency excludes decoding, transport and concurrent fight inference.',
                       'No currency, intent, guilt, exact action onset or spatial boxes.']}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('bundle', 'runtime', 'heldout', 'output'):
        p.add_argument('--' + name, type=Path, required=True)
    p.add_argument('--external', type=Path, required=True, nargs=3)
    a = p.parse_args()
    if a.output.exists():
        raise ValueError('Preserve earlier screening results')
    result = screen(a.bundle, a.runtime, a.heldout, a.external)
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({'screening_pass': result['screening_pass'], 'checks': result['checks']}, indent=2))
