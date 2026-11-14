"""Public UT-Interaction negatives for local educational transfer research.

All of this small dataset is training-only. The publisher does not identify
actors across sequences, so a random clip split would not establish independence.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import stat
import zipfile

import cv2
import numpy as np
import requests

from .exchange_sources import digest, download, extract_member

PAGE = 'https://cvrc.ece.utexas.edu/SDHA2010/Human_Interaction.html'
BASE = 'https://cvrc.ece.utexas.edu/SDHA2010/videos/competition_1/'
ARCHIVES = {1: 13265124, 2: 16423456}


def parse_name(name):
    match = re.fullmatch(r'segmented_set([12])/(\d+)_(\d+)_(\d)\.avi', name)
    if not match:
        raise ValueError('Unexpected UT segmented recording name')
    subset, example, sequence, category = map(int, match.groups())
    if not 0 <= category <= 5 or not 1 <= sequence <= 20:
        raise ValueError('Unexpected UT sequence or action code')
    return subset, example, sequence, category


def acquire(destination):
    root = Path(destination).resolve()
    root.mkdir(parents=True, exist_ok=True)
    response = requests.get(PAGE, timeout=30)
    response.raise_for_status()
    if 'please cite the following reference' not in response.text:
        raise ValueError('Inspect changed publisher attribution requirements')
    (root / 'publisher.html').write_bytes(response.content)
    records, archives = [], []
    for subset, expected_bytes in ARCHIVES.items():
        name = f'ut-interaction_segmented_set{subset}.zip'
        path = root / name
        if not path.exists():
            download(BASE + name, path, maximum=32 * 1024**2)
        if path.stat().st_size != expected_bytes:
            raise ValueError('Publisher archive size changed; review before using')
        with zipfile.ZipFile(path) as archive:
            # Publisher set 2 includes a Windows thumbnail cache, not evidence.
            selected = [m for m in archive.infolist() if not m.is_dir()
                        and m.filename != f'segmented_set{subset}/Thumbs.db']
            if len(selected) != 60:
                raise ValueError('Expected sixty publisher-trimmed actions per set')
            for member in selected:
                parsed = parse_name(member.filename)
                if parsed[0] != subset or stat.S_ISLNK(member.external_attr >> 16):
                    raise ValueError('Invalid UT archive entry')
                records.append(extract_member(archive, member, root / 'rgb'))
        archives.append({'url': BASE + name, 'bytes': path.stat().st_size, 'sha256': digest(path)})
        print(json.dumps({'ut_subset': subset, 'recordings': len(records)}), flush=True)
    report = {'schema': 1, 'complete': True, 'dataset': 'UT-Interaction segmented sets 1 and 2',
              'source': PAGE, 'archives': archives, 'files': records,
              'credit': 'M. S. Ryoo and J. K. Aggarwal, UT-Interaction Dataset, ICPR SDHA 2010.',
              'terms': 'Publisher provides research challenge downloads and requires citation. No open redistribution/commercial license asserted.',
              'purpose': 'Local educational research: annotated interactions are negatives for visible object transfer, not negatives for violence.',
              'partition': 'Entire dataset training-only; actor identities across sequences are not supplied.',
              'integrity': 'ZIP CRC and local SHA-256; no publisher cryptographic checksum supplied.'}
    (root / 'source.json').write_text(json.dumps(report, indent=2), encoding='utf-8')


def inventory(root):
    root = Path(root).resolve()
    folder = root / 'ut'
    source_path = folder / 'source.json'
    source = json.loads(source_path.read_text(encoding='utf-8'))
    if not source.get('complete') or len(source.get('files', [])) != 120:
        raise ValueError('UT source download is incomplete')
    rows, excluded, hashes = [], [], set()
    for item in source['files']:
        relative = item['relative']
        subset, example, sequence, category = parse_name(relative)
        path = (folder / 'rgb' / relative).resolve()
        if not path.is_relative_to(folder) or digest(path) != item['sha256']:
            raise ValueError('UT source bytes changed')
        if item['sha256'] in hashes:
            raise ValueError('Duplicate UT recording')
        hashes.add(item['sha256'])
        cap = cv2.VideoCapture(str(path))
        fps, total = cap.get(cv2.CAP_PROP_FPS), int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()
        if not np.isfinite(fps) or fps < 4 or total / fps < 1.9:
            excluded.append({'source': relative, 'reason': 'Too short for eight distinct 4 Hz samples; not padded'})
            continue
        duration = total / fps
        # A single central window avoids overweighting long clips/backgrounds.
        start = max(.05, (duration - 2) / 2)
        indices = (int(np.ceil(start * fps)) + np.arange(8) * fps / 4).round().astype(int)
        if indices[-1] >= total or not np.all(np.diff(indices) > 0):
            raise ValueError('Invalid UT sampled frames')
        rows.append({'id': f'ut/{subset}/{example}', 'dataset': 'ut', 'split': 'train',
                     'group': 'ut-all-training', 'path': path.relative_to(root).as_posix(),
                     'kind': 'video', 'sha256': item['sha256'], 'label': 0,
                     'category': f'published_nontransfer_action_{category}',
                     'source_sequence': f'{subset}/{sequence}',
                     'sampling': 'consecutive-4hz', 'frame_indices': indices.tolist(),
                     'upright_from_container': True, 'start': float(indices[0] / fps),
                     'end': min(duration, float((indices[-1] + 1) / fps)),
                     'annotation': 'Publisher-trimmed shake/point/hug/push/kick/punch; no transfer class. Training only.'})
    return {'rows': rows, 'excluded': excluded, 'source_sha256': digest(source_path),
            'counts': dict(Counter(row['category'] for row in rows))}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, required=True)
    acquire(parser.parse_args().destination)
