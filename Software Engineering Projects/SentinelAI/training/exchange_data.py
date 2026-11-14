"""Observable transfer labels, participant-disjoint splits and RGB-only samples."""
import csv
import hashlib
import json
from pathlib import Path
import re

import cv2
import numpy as np

from sentinel_ml.exchange import CONTRACT, preprocess
from .exchange_sources import SBU_ACTORS, digest

SBU_CLASSES = {'01': 'approach', '02': 'depart', '03': 'kick', '04': 'push',
               '05': 'handshake', '06': 'hug', '07': 'exchange', '08': 'punch'}
CORNELL_PAIRS = [f'P{i:02}_P{i+1:02}' for i in range(7, 31, 2)]


def sbu_split(pair):
    actors = set(re.findall(r's(\d{2})', pair))
    if len(actors) != 2:
        raise ValueError('Invalid SBU participant pair')
    return next((split for split, members in SBU_ACTORS.items() if actors <= members), None)


def cornell_split(pair):
    index = CORNELL_PAIRS.index(pair)
    return 'train' if index < 8 else 'dev' if index < 10 else 'test'


def inventory(root):
    root = Path(root).resolve()
    rows, rejected = [], []
    source = json.loads((root / 'sbu/source.json').read_text())
    if not source['complete']:
        raise ValueError('SBU selected-source download is incomplete')
    for folder in sorted((root / 'sbu/rgb').glob('s*/[0-9][0-9]/*')):
        files = sorted(folder.glob('rgb_*.png'))
        pair, category, sequence = folder.parts[-3:]
        split = sbu_split(pair)
        if not files or split is None:
            continue
        if category not in SBU_CLASSES:
            raise ValueError('Unknown SBU category')
        if len(files) < 8:
            rejected.append({'source': folder.relative_to(root).as_posix(), 'reason': 'Fewer than eight RGB frames'})
            continue
        # Dataset contains temporally segmented image sequences, not container PTS.
        # Whole-sequence labels must not be presented as precise action timestamps.
        combined = hashlib.sha256(''.join(digest(p) for p in files).encode()).hexdigest()
        rows.append({'id': f'sbu/{pair}/{category}/{sequence}', 'dataset': 'sbu',
                     'split': split, 'group': pair, 'actors': re.findall(r's(\d{2})', pair),
                     'path': folder.relative_to(root).as_posix(), 'kind': 'frames',
                     'label': int(category == '07'), 'category': SBU_CLASSES[category],
                     'sha256': combined, 'frames': len(files), 'annotation': 'Published whole-sequence class; no precise event onset'})
        if len(rows) % 25 == 0:
            print(json.dumps({'inventory_sbu_sequences': len(rows)}), flush=True)
    source = json.loads((root / 'cornell/source.json').read_text())
    if not source['complete']:
        raise ValueError('Cornell selected-source download is incomplete')
    base = root / 'cornell/raw/Bimanual Handovers Dataset'
    for number, path in enumerate(sorted(base.glob('P*/Kinect_*/*.mp4')), 1):
        pair = path.parts[-3]
        try:
            annotation = path.parent.parent / 'OptiTrack_Local_Frame' / (path.stem + '.csv')
            with annotation.open(newline='', encoding='utf-8-sig') as stream:
                values = list(csv.DictReader(stream))
            times = np.array([float(r['Time']) for r in values])
            transfer = np.array([r['Giver'] == 'transfer' or r['Receiver'] == 'transfer' for r in values])
            if not transfer.any() or not np.isfinite(times).all() or np.any(np.diff(times) <= 0):
                raise ValueError('Missing or invalid published phase annotations')
            cap = cv2.VideoCapture(str(path))
            fps, count = cap.get(cv2.CAP_PROP_FPS), int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            ok, first = cap.read()
            cap.release()
            if not ok or not 1 <= fps <= 120 or count < 8:
                raise ValueError('Unreadable RGB video')
            duration = count / fps
            if abs(duration - times[-1]) > .5:
                raise ValueError('RGB/phase duration mismatch exceeds 0.5 seconds; alignment not assumed')
            begin, end = float(times[transfer][0]), float(times[transfer][-1])
            # Positive context includes reach/contact/release; limited to two seconds.
            center = (begin + end) / 2
            start, stop = max(0, center - 1), min(duration, center + 1)
            windows = [('exchange', start, stop, 1)]
            # Only phases well away from contact serve as negatives. No synthetic labels.
            if begin - .15 >= .4:
                windows.append(('reach', max(0, begin - 2), begin - .15, 0))
            if duration - end - .15 >= .4:
                windows.append(('retreat', end + .15, min(duration, end + 2), 0))
            for category, start, stop, label in windows:
                rows.append({'id': f'cornell/{pair}/{path.parent.name}/{path.stem}/{category}',
                    'dataset': 'cornell', 'split': cornell_split(pair), 'group': pair,
                    'actors': re.findall(r'P(\d{2})', pair), 'path': path.relative_to(root).as_posix(),
                    'kind': 'video', 'label': label, 'category': category, 'sha256': digest(path),
                    'start': start, 'end': stop, 'phase_start': begin, 'phase_end': end,
                    'annotation': 'Published motion-derived phase times; RGB duration checked, no sensor features used'})
        except (ValueError, OSError, KeyError) as exc:
            rejected.append({'source': path.relative_to(root).as_posix(), 'reason': str(exc)})
        if number % 60 == 0:
            print(json.dumps({'inventory_cornell_videos': number, 'excluded': len(rejected)}), flush=True)
    hashes = {}
    for row in rows:
        old = hashes.get(row['sha256'])
        if old and old['split'] != row['split']:
            raise ValueError(f'Exact content crosses split boundary: {old["id"]} / {row["id"]}')
        hashes[row['sha256']] = row
    for dataset in ('sbu', 'cornell'):
        for split in ('train', 'dev', 'test'):
            if {r['label'] for r in rows if r['dataset'] == dataset and r['split'] == split} != {0, 1}:
                raise ValueError(f'{dataset}/{split} needs positive and negative examples')
    return {'schema': 1, 'contract': CONTRACT, 'rows': rows, 'excluded': rejected,
            'limits': ['SBU has whole-sequence labels, not container timestamps.',
                       'Cornell phase labels are derived from motion trajectories, not manual RGB boxes.',
                       'Same laboratory backgrounds remain across participant splits.',
                       'No cash, banknote, bribery or police-domain labels.']}


def load_rgb(root, row):
    base = Path(root).resolve()
    path = (base / row['path']).resolve()
    if not path.is_relative_to(base):
        raise ValueError('Dataset path escapes its root')
    count = CONTRACT['frames']
    if row['kind'] == 'frames':
        paths = sorted(path.glob('rgb_*.png'))
        # Published SBU capture cadence is 15 Hz. Keep the central <=2 seconds
        # of the publisher's trimmed action; original images remain untouched.
        if len(paths) > 30:
            first = (len(paths) - 30) // 2
            paths = paths[first:first + 30]
        selected = np.linspace(0, len(paths) - 1, count).round().astype(int)
        frames = [cv2.imread(str(paths[i])) for i in selected]
    else:
        cap = cv2.VideoCapture(str(path))
        if row.get('upright_from_container'):
            cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 1)
        fps, total = cap.get(cv2.CAP_PROP_FPS), int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if row.get('frame_indices') is not None:
            selected = np.asarray(row['frame_indices'], dtype=int)
            if selected.shape != (count,) or not np.all(np.diff(selected) > 0):
                cap.release()
                raise ValueError('Expected eight distinct ordered source frames')
        else:
            selected = (int(np.ceil(row['start'] * fps)) + np.arange(count) * fps / 4).round().astype(int) if row.get('sampling') == 'consecutive-4hz' else np.linspace(int(row['start'] * fps), min(total - 1, int(row['end'] * fps) - 1), count).round().astype(int)
        if selected[0] < 0 or selected[-1] >= total or selected[-1] / fps >= row['end']:
            cap.release()
            raise ValueError('Selected frames exceed the annotated interval')
        frames = []
        try:
            # Decode forward once. Seeking eight times repeatedly decodes GOPs
            # and is particularly expensive for the 1080p source videos.
            wanted = set(int(i) for i in selected)
            decoded = {}
            first = int(selected[0]) if row.get('sampling') == 'consecutive-4hz' else 0
            if first:
                cap.set(cv2.CAP_PROP_POS_FRAMES, first)
            for index in range(first, int(selected[-1]) + 1):
                if not cap.grab():
                    raise ValueError(f'Cannot decode training frame: {row["id"]}')
                if index in wanted:
                    ok, frame = cap.retrieve()
                    if not ok:
                        raise ValueError(f'Cannot retrieve training frame: {row["id"]}')
                    decoded[index] = frame
            frames = [decoded[int(i)] for i in selected]
        finally:
            cap.release()
    if len(frames) != count or any(f is None for f in frames):
        raise ValueError('Missing training RGB frame')
    return [cv2.cvtColor(f, cv2.COLOR_BGR2RGB) for f in frames]


def verify_inventory(root, data):
    """A resumed inventory never excuses changed bytes or split leakage."""
    base = Path(root).resolve()
    verified = {}
    for row in data['rows']:
        path = (base / row['path']).resolve()
        if not path.is_relative_to(base):
            raise ValueError('Dataset path escapes its root')
        if row['dataset'] == 'ut':
            if row['group'] != 'ut-all-training' or row['label'] != 0:
                raise ValueError('UT records must remain non-transfer training examples')
            expected_split = 'train'
        elif row['dataset'] == 'cap':
            expected_split = data.get('cap_partitions', {}).get(row['group'])
        elif row['dataset'] in ('sbu', 'cornell'):
            expected_split = sbu_split(row['group']) if row['dataset'] == 'sbu' else cornell_split(row['group'])
        else:
            raise ValueError('Unknown dataset in saved inventory')
        if row['split'] != expected_split:
            raise ValueError('Saved inventory changes the preregistered actor split')
        if path not in verified:
            if row['kind'] == 'frames':
                verified[path] = hashlib.sha256(''.join(digest(p) for p in sorted(path.glob('rgb_*.png'))).encode()).hexdigest()
            else:
                verified[path] = digest(path)
        if verified[path] != row['sha256']:
            raise ValueError('Source bytes changed after inventory creation')
