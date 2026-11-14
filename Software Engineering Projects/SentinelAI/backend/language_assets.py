"""Verify local, fixed-format ONNX bundles without remote code or downloads."""
import hashlib
import json
from pathlib import Path
from .config import ROOT
from .db import encode
from sentinel_ml.video import sha256


def bundle_identity(directory, kind, filenames):
    folder = Path(directory).resolve()
    manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('schema') != 1 or manifest.get('kind') != kind or set(manifest.get('files', {})) != set(filenames):
        raise ValueError('Unexpected local language-model bundle.')
    hashes = {name: sha256(folder / name) for name in filenames}
    if hashes != manifest['files']:
        raise ValueError('Language-model checksum mismatch. Reinstall the selected model.')
    selection = ROOT / '.local/ai-selection.json'
    if selection.exists():
        for item in json.loads(selection.read_text(encoding='utf-8'))['models'].values():
            if (ROOT / item['path']).resolve() == folder and hashes != item['files']:
                raise ValueError('Language-model bundle differs from its activation record.')
    return {'name': folder.name, 'files': hashes, 'source': manifest['source'], 'revision': manifest.get('revision'),
            'fingerprint': hashlib.sha256(encode({'kind': kind, 'files': hashes}).encode()).hexdigest()}
