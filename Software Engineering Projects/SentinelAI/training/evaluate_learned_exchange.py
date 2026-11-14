"""Locked external visual controls, separate from model/threshold selection."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import statistics
import time
import platform
import psutil

from sentinel_ml.exchange_bundle import ResearchExchange
from .exchange_sources import digest


def evaluate(bundle, controls, output, runtime=None, reference=None):
    if output.exists():
        raise ValueError('Preserve earlier evaluation; select a new output file')
    model = ResearchExchange(bundle, runtime=runtime)
    def host():
        battery = psutil.sensors_battery()
        return {'platform': platform.platform(), 'logical_cpus': psutil.cpu_count(),
                'power_plugged': battery.power_plugged if battery else None,
                'available_ram_mb': round(psutil.virtual_memory().available / 1024**2, 1)}
    host_start = host()
    records = []
    for name, positive in [('cash', True), ('document', True), ('handshake', False), ('normal', False)]:
        path = controls / (name + '.mp4')
        source = json.loads((Path('evaluation/visual-controls') / (name + '.source.json')).read_text(encoding='utf-8'))
        # Source manifests are inspected data, never executable code.
        expected = source['sha256']
        if digest(path) != expected:
            raise ValueError(f'Control content differs from the locked source manifest: {name}')
        started = time.perf_counter()
        predictions = model.analyze(path)
        scores = [p['score'] for p in predictions]
        records.append({'control': name, 'expected_visible_transfer': positive, 'sha256': expected,
                        'detected': any(p['flagged'] for p in predictions), 'windows': len(predictions),
                        'maximum_score': max(scores, default=None),
                        'wall_seconds': time.perf_counter() - started, 'predictions': predictions})
        print(json.dumps({k: v for k, v in records[-1].items() if k != 'predictions'}), flush=True)
    latencies = [p['inference_seconds'] for r in records for p in r['predictions']]
    result = {'schema': 1, 'version': model.manifest['version'], 'threshold': model.manifest['threshold'],
              'model_manifest_sha256': digest(bundle / 'manifest.json'),
              'evaluated_at': datetime.now(timezone.utc).isoformat(),
              'host_start': host_start, 'host_end': host(),
              'controls': records, 'all_four_clip_checks_pass': all(r['detected'] == r['expected_visible_transfer'] for r in records),
              'latency': {'count': len(latencies), 'median_seconds': statistics.median(latencies), 'maximum_seconds': max(latencies)},
              'limits': ['Four convenience controls are not a field-accuracy estimate.',
                         'A document exchange is a transfer, not evidence of bribery.',
                         'Any flagged window counts as a clip hit; action-onset localization is not evaluated.',
                         'No runtime activation or threshold retuning is performed.']}
    if runtime:
        result['runtime_sha256'] = digest(runtime / 'runtime.json')
    if reference:
        previous = json.loads(reference.read_text(encoding='utf-8'))
        if previous['model_manifest_sha256'] != result['model_manifest_sha256']:
            raise ValueError('Numerical reference must use the same frozen weights')
        differences = []
        for actual, expected in zip(records, previous['controls'], strict=True):
            if actual['control'] != expected['control'] or actual['sha256'] != expected['sha256']:
                raise ValueError('Reference source differs')
            for a, b in zip(actual['predictions'], expected['predictions'], strict=True):
                if a['sampled_seconds'] != b['sampled_seconds'] or a['flagged'] != b['flagged']:
                    raise ValueError('Optimized runtime changed timing or classification')
                differences.append(abs(a['score'] - b['score']))
        if not differences or max(differences) > 1e-4:
            raise ValueError('Optimized scores failed numerical agreement')
        result['equivalence'] = {'reference_sha256': digest(reference), 'predictions': len(differences),
                                 'maximum_score_difference': max(differences), 'passed': True}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--controls', type=Path, default=Path('.local/visual-exchange-evaluation'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runtime', type=Path)
    parser.add_argument('--reference', type=Path)
    args = parser.parse_args()
    evaluate(args.bundle, args.controls, args.output, args.runtime, args.reference)
