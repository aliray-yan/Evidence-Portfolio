"""Explicit local installation of historical-evidence retrieval."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tarfile
from .config import ROOT
from .db import now
from .setup_models import download

E5_REVISION = '614241f622f53c4eeff9890bdc4f31cfecc418b3'
E5_FILES = {
    'model.onnx': ('onnx/model.onnx', 'ca456c06b3a9505ddfd9131408916dd79290368331e7d76bb621f1cba6bc8665', 480_000_000),
    'tokenizer.json': ('onnx/tokenizer.json', '0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39', 18_000_000),
}


def install(only):
    selection = ROOT / '.local/ai-selection.json'
    previous = json.loads(selection.read_text(encoding='utf-8')) if selection.exists() else {'schema': 1, 'models': {}}
    additions = {}
    if only in ('all', 'retrieval'):
        folder = ROOT / '.local/models/multilingual-e5-small'
        folder.mkdir(parents=True, exist_ok=True)
        hashes = {}
        for name, (remote, expected, maximum) in E5_FILES.items():
            print('Downloading/verifying multilingual retrieval: ' + name, flush=True)
            hashes[name] = download(f'https://huggingface.co/intfloat/multilingual-e5-small/resolve/{E5_REVISION}/{remote}', folder / name, maximum, expected)
        manifest = {'schema': 1, 'kind': 'multilingual_retrieval', 'files': hashes,
                    'source': 'https://huggingface.co/intfloat/multilingual-e5-small', 'revision': E5_REVISION,
                    'license': 'MIT', 'dimensions': 384, 'created_at': now()}
        (folder / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        additions['retrieval_model'] = {**manifest, 'path': folder.relative_to(ROOT).as_posix()}
    # Re-read to preserve unrelated model selections changed during the download.
    current = json.loads(selection.read_text(encoding='utf-8')) if selection.exists() else {'schema': 1, 'models': {}}
    current['models'].update(additions)
    current['created_at'] = now()
    temporary = selection.with_suffix('.tmp')
    temporary.write_text(json.dumps(current, indent=2), encoding='utf-8')
    os.replace(temporary, selection)
    print('Selected local models. Restart SentinelAI to activate them.', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true', required=True)
    parser.add_argument('--only', choices=['all', 'retrieval'], default='all')
    install(parser.parse_args().only)


if __name__ == '__main__':
    main()
