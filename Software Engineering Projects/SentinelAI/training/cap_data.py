"""Explicit non-transfer annotations; no unannotated video is labeled safe."""
from collections import Counter
import hashlib
import json
import math
from pathlib import Path

import cv2
import numpy as np

from .exchange_sources import digest

NEGATIVE_ACTIONS = {
    'person_shakes_hand', 'person_holds_hand', 'person_embraces_person',
    'person_talks_to_person', 'person_laughs_with_person', 'person_waves_at_person',
    'person_nudges_person_with_elbow', 'person_touches_back_of_person',
    'person_touches_face_of_person', 'person_pounds_shoulders_of_person',
    'person_sits_down', 'person_stands_up', 'person_stands_up_from_floor',
    'person_washes_hands', 'person_crosses_arms', 'person_crosses_legs',
    'person_reads_book', 'person_talks_on_phone', 'person_texts_on_phone',
    'person_texts_on_phone_while_sitting', 'person_interacts_with_laptop',
    'person_rubs_eyes', 'person_rubs_neck', 'person_scratches_face',
    'person_strokes_chin', 'person_strokes_hair', 'person_yawns',
    'person_looks_at_wristwatch', 'person_covers_face_with_hands',
}
NEGATIVE_PREFIXES = ('person_gestures_', 'person_puts_on_', 'person_takes_off_',
                     'person_opens_', 'person_closes_', 'person_picks_up_object_from_',
                     'person_puts_down_object_on_', 'person_puts_object_in',
                     'person_takes_object_from_', 'person_drinks_from_',
                     'person_eats_with_', 'person_stretches_', 'person_folds_')

# Reviewed upright 5.3–7.5 s frames on 10 November: the published handshake
# interval is only 1.206 s, so a two-second context requires explicit review.
# This source group is training-only; it is not a new evaluation control.
REVIEWED_HANDSHAKE = '5c013deb3aa35003c32b19ebcc15d7e34ab9a459e9fcac5d40868e72b3939998'


def allowed(label):
    return label in NEGATIVE_ACTIONS or label.startswith(NEGATIVE_PREFIXES)


def assign_groups(scenes):
    """Connected collectors AND subjects remain together, with opaque IDs."""
    parent = {}

    def find(key):
        parent.setdefault(key, key)
        if parent[key] != key:
            parent[key] = find(parent[key])
        return parent[key]

    identities = {}
    for key, scene in scenes.items():
        attributes = scene['attributes']
        subjects = attributes.get('subject_ids')
        collector = attributes.get('collector_id')
        if not isinstance(collector, str) or not collector or not isinstance(subjects, list) or not subjects or any(not isinstance(v, str) or not v for v in subjects):
            raise ValueError('CAP records require nonempty collector and subject IDs')
        ids = ['collector:' + collector] + ['subject:' + value for value in subjects]
        identities[key] = ids
        for value in ids[1:]:
            parent[find(value)] = find(ids[0])
    components = {}
    for value in list(parent):
        components.setdefault(find(value), []).append(value)
    opaque = {root: hashlib.sha256('|'.join(sorted(values)).encode()).hexdigest() for root, values in components.items()}
    groups = {key: opaque[find(values[0])] for key, values in identities.items()}
    handshake = {groups[key] for key, scene in scenes.items()
                 if any(a['label'] == 'person_shakes_hand' for a in scene['activities'].values())}
    ordered = sorted(set(groups.values()) - handshake, key=lambda g: hashlib.sha256(('42:' + g).encode()).hexdigest())
    if len(ordered) < 5:
        raise ValueError('Insufficient independent CAP groups for training/development/test')
    total = len(ordered) + len(handshake)
    training = max(1, round(total * .6) - len(handshake))
    development = max(1, round(total * .2))
    splits = {group: 'train' if i < training else 'dev' if i < training + development else 'test'
              for i, group in enumerate(ordered)}
    splits.update({group: 'train' for group in handshake})
    return groups, splits


def inventory(root):
    base = Path(root).resolve()
    source = json.loads((base / 'cap/source.json').read_text(encoding='utf-8'))
    if source.get('complete') is not True or source.get('license') != 'CC BY 4.0':
        raise ValueError('CAP download is incomplete or terms differ')
    files, scenes = {}, {}
    for record in source['files']:
        path = (base / 'cap' / record['path']).resolve()
        if path.parent != base / 'cap' or digest(path) != record['sha256']:
            raise ValueError('CAP source bytes differ from verified receipt')
        files[record['member']] = record
        if record['kind'] == 'annotation':
            objects = json.loads(path.read_text(encoding='utf-8'))
            if len(objects) != 1 or set(objects[0]) != {"<class 'vipy.video.Scene'>"}:
                raise ValueError('Unexpected CAP annotation schema')
            scene = next(iter(objects[0].values()))
            scenes[record['member']] = json.loads(scene) if isinstance(scene, str) else scene
    groups, splits = assign_groups(scenes)
    rows, excluded = [], []
    for key, scene in sorted(scenes.items()):
        filename = scene['filename']
        if not filename.startswith('../videos/'):
            raise ValueError('Unexpected CAP video reference')
        video = files['cap_detection_handheld_val/' + filename[3:]]
        path = base / 'cap' / video['path']
        cap = cv2.VideoCapture(str(path))
        try:
            fps, count = cap.get(cv2.CAP_PROP_FPS), int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            ok, _ = cap.read()
        finally:
            cap.release()
        if not ok or not math.isfinite(fps) or fps < 4 or not 1 < count / fps < 120:
            raise ValueError('CAP source has unusable timing')
        for identifier, activity in sorted(scene['activities'].items()):
            label = activity['label']
            if not allowed(label):
                continue
            hz = float(activity['framerate'])
            begin, end = activity['startframe'] / hz, activity['endframe'] / hz
            reviewed = video['sha256'] == REVIEWED_HANDSHAKE and label == 'person_shakes_hand'
            if reviewed:
                begin, end = 5.3, 7.5
            if not 0 <= begin < end <= count / fps + .2:
                excluded.append({'source': video['path'], 'category': label, 'reason': 'Interval too short or outside source timing'})
                continue
            # Stay inside both the annotation and the actual container; leave
            # a margin for source timing/rounding differences. Do not pad EOF.
            begin, end = begin + .1, min(end, count / fps) - .1
            if end - begin < 1.95:
                excluded.append({'source': video['path'], 'category': label, 'reason': 'Insufficient annotated duration after timing margins'})
                continue
            for number, start in enumerate(np.linspace(begin + .025, end - 1.9 - .025, min(3, max(1, int((end-begin)/1.9))))):
                selected = (int(np.ceil(start * fps)) + np.arange(8) * fps / 4).round().astype(int)
                if selected[-1] >= count or selected[-1] / fps >= end or len(set(selected)) != 8:
                    excluded.append({'source': video['path'], 'category': label, 'reason': 'Eight distinct timed samples do not fit the annotation'})
                    continue
                rows.append({'id': 'cap/' + video['path'] + '/' + identifier + '/' + str(number),
                             'dataset': 'cap', 'split': splits[groups[key]], 'group': groups[key],
                             'path': 'cap/' + video['path'], 'kind': 'video', 'label': 0,
                             'category': label, 'sha256': video['sha256'], 'start': float(selected[0] / fps),
                             'end': float((selected[-1] + .5) / fps), 'sampling': 'consecutive-4hz',
                             'frame_indices': selected.tolist(),
                             'upright_from_container': True,
                             'annotation': 'Published handshake plus visually reviewed short context, training only' if reviewed else
                                 'Published CAP non-transfer activity interval; not a field safety clearance'})
    if {row['split'] for row in rows} != {'train', 'dev', 'test'}:
        raise ValueError('CAP needs annotated examples in each partition')
    return {'rows': rows, 'excluded': excluded, 'cap_partitions': splits,
            'counts': dict(Counter(row['split'] for row in rows)),
            'source_sha256': digest(base / 'cap/source.json')}
