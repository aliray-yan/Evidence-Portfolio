"""Explicit local FYP installation of a screened runtime; no API accepts models."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import tempfile

from .config import ROOT
from sentinel_ml.exchange_bundle import validate_assets
from sentinel_ml.exchange_runtime import bounded_json, runtime_receipt, sha, NATIVE_PROFILE
from training.screen_exchange_runtime import screen

COMMON_FILES = {'manifest.json': 256*1024, 'encoder.pt': 96*1024**2, 'head.pt': 2*1024**2,
         'inventory.json': 8*1024**2, 'test.json': 256*1024,
         'runtime/runtime.json': 1024**2,
         'heldout.json': 8*1024**2, 'control-1.json': 8*1024**2,
         'control-2.json': 8*1024**2, 'control-3.json': 8*1024**2,
         'screening.json': 1024**2}


def installation_files(runtime):
    record=bounded_json(Path(runtime)/'runtime.json')
    if record.get('profile') == NATIVE_PROFILE:
        return dict(COMMON_FILES)
    return {**COMMON_FILES, 'runtime/encoder.xml':8*1024**2,
            'runtime/encoder.bin':96*1024**2, 'runtime/calibration.json':1024**2}


def verify_installation(directory):
    root = Path(directory).resolve()
    files=installation_files(root/'runtime')
    record = bounded_json(root / 'installation.json')
    if (record.get('schema') != 1 or record.get('scope') != 'local_fyp_review'
            or not isinstance(record.get('files'), dict) or set(record['files']) != set(files)):
        raise ValueError('A completed screened local-review installation is required')
    for name, maximum in files.items():
        path = root / name
        if (path.is_symlink() or any(p.is_symlink() for p in path.parents if p != root and p.is_relative_to(root))
                or not path.is_file() or not path.resolve().is_relative_to(root)
                or path.stat().st_size > maximum or sha(path) != record['files'][name]):
            raise ValueError('Installed exchange artifact integrity check failed')
    _, _, manifest = validate_assets(root)
    receipt = runtime_receipt(root, root / 'runtime')
    measured = screen(root, root / 'runtime', root / 'heldout.json',
                      [root / f'control-{i}.json' for i in (1, 2, 3)])
    if not measured['screening_pass'] or bounded_json(root / 'screening.json') != measured:
        raise ValueError('Installed runtime did not pass the fixed screening gates')
    return {'name': manifest['version'], 'profile': receipt['profile'], 'files': record['files'],
            'source': 'Locally trained visual-transfer model; reused laboratory/stock screening only',
            'scope': record['scope'], 'threshold': manifest['threshold'],
            'runtime_sha256': sha(root / 'runtime/runtime.json')}


def install(bundle, runtime, heldout, external, *, root=ROOT, activate=False):
    verdict = screen(bundle, runtime, heldout, external)
    if not verdict['screening_pass']:
        raise ValueError('Do not install: runtime failed detection or performance screening')
    root = Path(root).resolve()
    models = root / '.local/models'
    models.mkdir(parents=True, exist_ok=True)
    target = models / ('exchange-reviewed-' + sha(runtime / 'runtime.json')[:12])
    if target.exists():
        raise ValueError('Preserve the previous installation; do not overwrite it')
    with tempfile.TemporaryDirectory(prefix='exchange-install-', dir=models) as temporary:
        staging = Path(temporary)
        (staging / 'runtime').mkdir()
        for name in ('manifest.json', 'encoder.pt', 'head.pt', 'inventory.json', 'test.json'):
            shutil.copyfile(bundle / name, staging / name)
        files=installation_files(runtime)
        for name in files:
            if name.startswith('runtime/'):
                shutil.copyfile(runtime / name.removeprefix('runtime/'), staging / name)
        shutil.copyfile(heldout, staging / 'heldout.json')
        for i, source in enumerate(external, 1):
            shutil.copyfile(source, staging / f'control-{i}.json')
        (staging / 'screening.json').write_text(json.dumps(verdict, indent=2), encoding='utf-8')
        record = {'schema': 1, 'scope': 'local_fyp_review',
                  'installed_at': datetime.now(timezone.utc).isoformat(),
                  'files': {name: sha(staging / name) for name in files},
                  'limits': 'Local operator trust, not signed certification. No field accuracy or bribery confirmation.'}
        (staging / 'installation.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
        identity = verify_installation(staging)
        # Atomic rename after verification. Temporary directory cleanup handles errors.
        staging.rename(target)
    if activate:
        selection_path = root / '.local/ai-selection.json'
        selection = json.loads(selection_path.read_text()) if selection_path.exists() else {'models': {}}
        previous = selection_path.with_name('ai-selection.before-learned-exchange.json')
        if selection_path.exists() and not previous.exists():
            shutil.copyfile(selection_path, previous)
        selection.setdefault('models', {})['learned_exchange_model'] = {
            'path': target.relative_to(root).as_posix(), 'files': identity['files'],
            'source': identity['source'], 'revision': identity['runtime_sha256']}
        temporary = selection_path.with_suffix('.tmp')
        temporary.write_text(json.dumps(selection, indent=2), encoding='utf-8')
        temporary.replace(selection_path)
    return target, identity


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('bundle', 'runtime', 'heldout'):
        p.add_argument('--' + name, type=Path, required=True)
    p.add_argument('--external', type=Path, required=True, nargs=3)
    p.add_argument('--activate', action='store_true')
    args = p.parse_args()
    target, identity = install(args.bundle, args.runtime, args.heldout, args.external, activate=args.activate)
    print(json.dumps({'installed': str(target), 'selected_for_next_start': args.activate, 'identity': identity}, indent=2))
