"""CPU transfer-learning experiment; held-out predictions never select weights.

Frozen official MobileNet RGB encoder, learned ordered-frame GRU head. Saved
bundles are experimental and cannot claim currency recognition or field accuracy.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import random
import shutil
import time

import numpy as np
import torch

from sentinel_ml.exchange import CONTRACT
from sentinel_ml.exchange_profiles import profile
from .exchange_data import inventory, load_rgb, verify_inventory
from .exchange_sources import digest
from .data import metrics


def report(rows, scores, threshold):
    def measured(items):
        indices = [i for i, row in enumerate(rows) if items(row)]
        return metrics([rows[i]['label'] for i in indices], [float(scores[i]) for i in indices], threshold)
    return {'overall': measured(lambda row: True),
            'datasets': {name: measured(lambda row: row['dataset'] == name) for name in sorted({r['dataset'] for r in rows})},
            'categories': {name: measured(lambda row: f"{row['dataset']}/{row['category']}" == name)
                           for name in sorted({f"{r['dataset']}/{r['category']}" for r in rows})}}


def select_threshold(rows, scores):
    # Equal weight to datasets, so many Cornell phase windows cannot conceal
    # failure on SBU handshakes/exchanges. Development only, fixed search grid.
    choices = []
    for threshold in np.arange(.1, .951, .025):
        result = report(rows, scores, float(threshold))
        qualities = []
        for name, measured in result['datasets'].items():
            if {r['label'] for r in rows if r['dataset'] == name} == {0}:
                # A negative-only hard-negative source cannot measure recall.
                tn, fp = measured['confusion_matrix'][0]
                qualities.append(tn / (tn + fp))
            else:
                qualities.append(measured['f1'])
        value = sum(qualities) / len(qualities)
        choices.append((value, float(threshold), result))
    return max(choices, key=lambda item: (item[0], item[1]))


def features(root, rows, encoder_path, cache, spec=None):
    spec = spec or profile()
    contract = spec.CONTRACT
    cache.mkdir(parents=True, exist_ok=True)
    encoder = spec.Encoder().eval()
    encoder.load_state_dict(torch.load(encoder_path, map_location='cpu', weights_only=True), strict=True)
    identity = digest(encoder_path)
    values = []
    cached = 0
    started = time.perf_counter()
    with torch.inference_mode():
        for number, row in enumerate(rows, 1):
            import hashlib
            key = hashlib.sha256(json.dumps({'row': row, 'encoder': identity, 'contract': contract}, sort_keys=True).encode()).hexdigest()
            file = cache / (key + '.npz')
            if file.exists():
                with np.load(file, allow_pickle=False) as stored:
                    value = stored['features']
                cached += 1
            else:
                frames = load_rgb(root, row)
                original = torch.stack([spec.preprocess(frame) for frame in frames])
                flipped = torch.stack([spec.preprocess(frame[:, ::-1].copy()) for frame in frames])
                value = torch.stack([encoder(original), encoder(flipped)]).numpy()
                if value.shape != (2, 8, contract['feature_dim']) or not np.isfinite(value).all():
                    raise ValueError('Invalid encoder output; no completed cache entry written')
                temporary = file.with_suffix('.part')
                with temporary.open('wb') as output:
                    np.savez_compressed(output, features=value)
                temporary.replace(file)
            if value.shape != (2, 8, contract['feature_dim']) or not np.isfinite(value).all():
                raise ValueError('Invalid cached RGB features; remove the affected cache entry')
            values.append(value)
            if number % 40 == 0 or number == len(rows):
                print(json.dumps({'features_complete': number, 'total': len(rows),
                                  'features_cached': cached, 'features_prepared_this_run': number - cached,
                                  'seconds': round(time.perf_counter()-started, 1)}), flush=True)
    return torch.from_numpy(np.stack(values))


def train(args):
    spec = profile(args.backbone)
    torch.set_num_threads(2)
    import cv2
    cv2.setNumThreads(1)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    np.random.seed(args.seed)
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    if any(output.iterdir()):
        raise ValueError('Choose a new empty experiment folder; never overwrite a measured result')
    started = time.perf_counter()
    if args.inventory:
        data = json.loads(args.inventory.read_text(encoding='utf-8'))
        saved_contract = data.get('contract', {})
        saved_spec = profile(saved_contract.get('architecture'))
        if data.get('schema') != 1 or saved_contract != saved_spec.CONTRACT or not data.get('rows'):
            raise ValueError('Incompatible saved inventory')
        verify_inventory(args.dataset, data)
        # This resumes a just-created, locally verified inventory. Keep its
        # byte identity in the bundle; no split regeneration or relabeling.
        print(json.dumps({'resumed_inventory_sha256': digest(args.inventory)}), flush=True)
    else:
        data = inventory(args.dataset)
    # Sample count/cadence is shared; encoder preprocessing has its own cache key.
    data['contract'] = spec.CONTRACT
    if args.cap_hard_negatives:
        if any(row['dataset'] == 'cap' for row in data['rows']):
            raise ValueError('CAP is already present in this inventory')
        from .cap_data import inventory as cap_inventory
        extra = cap_inventory(args.dataset)
        data['rows'].extend(extra['rows'])
        data['excluded'].extend(extra['excluded'])
        data['cap_partitions'] = extra['cap_partitions']
        data['cap_source_sha256'] = extra['source_sha256']
        data['limits'].extend(['CAP supplies only annotated non-transfer intervals, not transfer recall.',
                               'SBU/Cornell test and stock controls were already evaluated on version 1; follow-up results reuse them.'])
        print(json.dumps({'cap_hard_negative_windows': extra['counts']}), flush=True)
    if args.ut_hard_negatives:
        if any(row['dataset'] == 'ut' for row in data['rows']):
            raise ValueError('UT is already present in this inventory')
        from .ut_controls import inventory as ut_inventory
        extra = ut_inventory(args.dataset)
        data['rows'].extend(extra['rows'])
        data['excluded'].extend(extra['excluded'])
        data['ut_source_sha256'] = extra['source_sha256']
        data['limits'].append('UT-Interaction is entirely training-only; actor-disjoint evaluation cannot be inferred from its sequence IDs.')
        print(json.dumps({'ut_hard_negative_windows': extra['counts']}), flush=True)
    (output / 'inventory.json').write_text(json.dumps(data, indent=2), encoding='utf-8')
    rows = data['rows']
    print(json.dumps({'inventory': {s: Counter(r['dataset'] + '/' + str(r['label']) for r in rows if r['split'] == s)
                                   for s in ('train', 'dev', 'test')}, 'excluded': len(data['excluded'])}), flush=True)
    x = features(args.dataset, rows, args.encoder, args.cache, spec)
    y = torch.tensor([r['label'] for r in rows], dtype=torch.long)
    train_ids = torch.tensor([i for i, r in enumerate(rows) if r['split'] == 'train'])
    dev_ids = torch.tensor([i for i, r in enumerate(rows) if r['split'] == 'dev'])
    dev_rows = [rows[i] for i in dev_ids.tolist()]
    counts = Counter((rows[i]['dataset'], rows[i]['label']) for i in train_ids.tolist())
    weights = torch.tensor([1 / counts[(rows[i]['dataset'], rows[i]['label'])] for i in train_ids.tolist()])
    model = spec.TemporalHead()
    optimizer = torch.optim.AdamW(model.parameters(), lr=.001, weight_decay=.02)
    best, stale, history = -1, 0, []
    for epoch in range(args.epochs):
        model.train()
        indices = train_ids[torch.multinomial(weights, len(train_ids), replacement=True)]
        loss_sum = 0.
        for batch in indices.split(32):
            augmented = torch.randint(0, 2, (len(batch),))
            inputs, targets = x[batch, augmented].clone(), y[batch].clone()
            if args.static_negative_fraction:
                stationary = torch.rand(len(batch)) < args.static_negative_fraction
                selected_frame = torch.randint(0, 8, (len(batch),))
                frozen = inputs[torch.arange(len(batch)), selected_frame]
                inputs[stationary] = frozen[stationary, None, :].expand(-1, 8, -1)
                targets[stationary] = 0
            logits = model(inputs)
            loss = torch.nn.functional.cross_entropy(logits, targets)
            if not torch.isfinite(loss):
                raise ValueError('Nonfinite loss; no usable bundle will be exported')
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.)
            optimizer.step()
            loss_sum += float(loss.detach()) * len(batch)
        model.eval()
        with torch.inference_mode():
            scores = model(x[dev_ids, 0]).softmax(1)[:, 1].tolist()
        quality, threshold, measured = select_threshold(dev_rows, scores)
        record = {'epoch': epoch + 1, 'loss': loss_sum / len(indices), 'development_selection_score': quality,
                  'threshold': threshold, 'development': measured['datasets']}
        history.append(record)
        print(json.dumps(record), flush=True)
        if quality > best + 1e-6:
            best, stale = quality, 0
            torch.save(model.state_dict(), output / 'head.pt')
            (output / 'development.json').write_text(json.dumps(measured, indent=2))
            (output / 'selection.json').write_text(json.dumps({'epoch': epoch + 1, 'threshold': threshold, 'development_selection_score': quality}))
        else:
            stale += 1
        (output / 'history.json').write_text(json.dumps(history, indent=2))
        if stale >= 12:
            break
    model.load_state_dict(torch.load(output / 'head.pt', map_location='cpu', weights_only=True))
    model.eval()
    selection = json.loads((output / 'selection.json').read_text())
    # The first test prediction happens only after weights/threshold are frozen.
    test_ids = torch.tensor([i for i, r in enumerate(rows) if r['split'] == 'test'])
    test_rows = [rows[i] for i in test_ids.tolist()]
    with torch.inference_mode():
        scores = model(x[test_ids, 0]).softmax(1)[:, 1].tolist()
    test_report = report(test_rows, scores, selection['threshold'])
    (output / 'test.json').write_text(json.dumps(test_report, indent=2))
    (output / 'test_predictions.json').write_text(json.dumps([{'id': row['id'], 'label': row['label'], 'score': score}
                                                            for row, score in zip(test_rows, scores)], indent=2))
    shutil.copyfile(args.encoder, output / 'encoder.pt')
    manifest = {'schema': 1, 'version': args.version, 'purpose': 'research_trained', 'contract': spec.CONTRACT,
                'threshold': selection['threshold'], 'confidence_type': 'uncalibrated learned clip score',
                'files': {name: digest(output / name) for name in ('encoder.pt', 'head.pt', 'inventory.json', 'test.json')},
                'training': {'seed': args.seed, 'epochs_run': len(history), 'selected_epoch': selection['epoch'],
                             'seconds': round(time.perf_counter()-started, 3), 'device': 'cpu',
                             'encoder': 'Official Torchvision MobileNet V3 Small ImageNet1K V1, frozen' if args.backbone == CONTRACT['architecture'] else 'Official Meta DINOv2 Small, frozen; CLS plus mean patch features',
                             'head': 'Learned GRU over eight ordered RGB embeddings',
                             'static_negative_fraction': args.static_negative_fraction,
                             'cap_hard_negatives': any(r['dataset'] == 'cap' for r in rows),
                             'ut_hard_negatives': any(r['dataset'] == 'ut' for r in rows),
                             'selection': 'Mean development dataset F1 (negative-only sources use specificity); threshold grid 0.10 to 0.95 by 0.025'},
                'test': test_report, 'deployment_approved': False,
                'limitations': data['limits'] + ['Research-only SBU data: not a commercial deployment license.',
                    'No spatial localization; no action bounding boxes.', 'No currency, bribery, identity, speech or intent classifier.',
                    'Short training clips are resampled to eight ordered frames; live-domain generalization needs separate evaluation.',
                    'External cash/envelope/handshake/normal controls and CPU measurements must be checked before activation.']}
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps({'export': str(output), 'test': test_report['datasets'], 'deployment_approved': False}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, required=True)
    parser.add_argument('--encoder', type=Path, required=True)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--version', default='exchange-mnv3-gru-v1')
    parser.add_argument('--backbone', choices=['mobilenet-v3-small-gru-v1', 'dinov2-small-gru-v1'], default='mobilenet-v3-small-gru-v1')
    parser.add_argument('--inventory', type=Path, help='Resume the exact previously verified local inventory; source files must remain unchanged')
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--epochs', type=int, default=80)
    parser.add_argument('--cap-hard-negatives', action='store_true', help='Add the verified CAP negative-action adaptation set')
    parser.add_argument('--ut-hard-negatives', action='store_true', help='Add UT-Interaction only to training, never a random actor-leaking split')
    parser.add_argument('--static-negative-fraction', type=float, default=0., help='Fraction of stationary synthetic negative sequences in training batches')
    arguments = parser.parse_args()
    if arguments.epochs < 1:
        parser.error('Epochs must be positive')
    if not 0 <= arguments.static_negative_fraction <= .5:
        parser.error('Static-negative fraction must be between zero and one half')
    train(arguments)
