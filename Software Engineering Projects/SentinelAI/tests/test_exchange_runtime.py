"""Research CPU runtime integrity, privacy and calibration isolation checks."""
from collections import deque
from importlib.metadata import PackageNotFoundError, version
import json
import subprocess
import sys
import textwrap

import numpy as np
import pytest
import torch

from sentinel_ml.exchange_bundle import ResearchExchange
from sentinel_ml.exchange_runtime import CPU_CONFIG, PROFILE, CPUEncoder, bounded_json, runtime_receipt, sha
from training.quantize_exchange import calibration_rows


@pytest.fixture
def runtime_files(tmp_path):
    bundle, runtime = tmp_path / 'bundle', tmp_path / 'runtime'
    bundle.mkdir()
    runtime.mkdir()
    (bundle / 'manifest.json').write_text(json.dumps({'files': {'encoder.pt': 'frozen-encoder'}}))
    for name in ('encoder.xml', 'encoder.bin'):
        (runtime / name).write_bytes(b'fixture, not an executable model')
    record = {'schema': 1, 'profile': PROFILE, 'config': CPU_CONFIG,
              'source_manifest_sha256': sha(bundle / 'manifest.json'),
              'source_encoder_sha256': 'frozen-encoder', 'equivalence': {'passed': True},
              'files': {name: sha(runtime / name) for name in ('encoder.xml', 'encoder.bin')}}
    (runtime / 'runtime.json').write_text(json.dumps(record))
    return bundle, runtime, record


def test_verified_runtime_receipt_is_bound_to_source(runtime_files):
    bundle, runtime, record = runtime_files
    assert runtime_receipt(bundle, runtime) == record
    (bundle / 'manifest.json').write_text(json.dumps({'files': {'encoder.pt': 'other-encoder'}}))
    with pytest.raises(ValueError, match='does not match'):
        runtime_receipt(bundle, runtime)


@pytest.mark.parametrize('change', ['profile', 'config', 'equivalence', 'source', 'files', 'weights'])
def test_runtime_rejects_changed_or_unapproved_artifacts(runtime_files, change):
    bundle, runtime, record = runtime_files
    if change == 'profile':
        record['profile'] = 'openvino-int8-dino-v1'  # Not evaluated or supported yet.
    elif change == 'config':
        record['config'] = {**CPU_CONFIG, 'INFERENCE_PRECISION_HINT': 'f16'}
    elif change == 'equivalence':
        record['equivalence'] = {'passed': False}
    elif change == 'source':
        record['source_encoder_sha256'] = 'different'
    elif change == 'files':
        record['files'] = []
    else:
        (runtime / 'encoder.bin').write_bytes(b'modified')
    (runtime / 'runtime.json').write_text(json.dumps(record))
    with pytest.raises(ValueError):
        runtime_receipt(bundle, runtime)


def test_runtime_json_is_bounded_and_requires_an_object(tmp_path):
    path = tmp_path / 'record.json'
    path.write_text('[]')
    with pytest.raises(ValueError, match='JSON object'):
        bounded_json(path)
    path.write_text(' ' * 20)
    with pytest.raises(ValueError, match='Invalid runtime record'):
        bounded_json(path, maximum=10)


def test_cpu_encoder_rejects_invalid_inputs_and_nonfinite_outputs():
    encoder = CPUEncoder.__new__(CPUEncoder)
    encoder.compiled = lambda value: [np.zeros((1, 768), np.float32)]
    assert encoder(torch.zeros(1, 3, 224, 224)).shape == (1, 768)
    for tensor in (torch.zeros(2, 3, 224, 224), torch.zeros(1, 3, 224, 224).double(),
                   torch.full((1, 3, 224, 224), float('nan'))):
        with pytest.raises(ValueError, match='RGB tensor'):
            encoder(tensor)
    encoder.compiled = lambda value: [np.full((1, 768), np.nan, np.float32)]
    with pytest.raises(ValueError, match='Invalid CPU encoder result'):
        encoder(torch.zeros(1, 3, 224, 224))


def test_calibration_uses_only_distinct_training_windows_reproducibly():
    rows = [{'id': f'{split}-{dataset}-{label}-{i}', 'split': split,
             'dataset': dataset, 'label': label}
            for split in ('train', 'dev', 'test') for dataset in ('a', 'b')
            for label in (0, 1) for i in range(12)]
    selected = calibration_rows(rows)
    assert len(selected) == len({row['id'] for row in selected}) == 32
    assert all(row['split'] == 'train' for row in selected)
    assert selected == calibration_rows(list(reversed(rows)))
    assert all(sum(r['dataset'] == d and r['label'] == y for r in selected) == 8
               for d in ('a', 'b') for y in (0, 1))
    with pytest.raises(ValueError, match='Duplicate'):
        calibration_rows(rows + [rows[0]])
    with pytest.raises(ValueError, match='Insufficient'):
        calibration_rows([r for r in rows if r['split'] != 'train'])
    with pytest.raises(ValueError, match='positive integer'):
        calibration_rows(rows, count=0)


def test_fork_keeps_stream_history_independent():
    model = ResearchExchange.__new__(ResearchExchange)
    model.encoder, model.head = object(), object()
    model.manifest = {'contract': {'frames': 8}}
    model.frames, model.previous = deque([(1., 90000, 'feature')], maxlen=8), 1.
    child = model.fork()
    assert child.encoder is model.encoder and child.head is model.head
    assert child.previous is None and not child.frames and child.frames.maxlen == 8
    child.frames.append((2., 180000, 'new'))
    assert list(model.frames) == [(1., 90000, 'feature')]


def test_changed_runtime_cannot_inherit_original_heldout_report(tmp_path):
    from training.exchange_report import screening
    (tmp_path / 'manifest.json').write_text('{}')
    external = tmp_path / 'external.json'
    external.write_text(json.dumps({'runtime_sha256': 'different-runtime'}))
    with pytest.raises(ValueError, match='Runtime-specific held-out'):
        screening(tmp_path, external)


def test_vendor_import_declines_telemetry_without_network_or_host_consent_changes():
    try:
        installed = (version('openvino'), version('openvino-telemetry'))
    except PackageNotFoundError:
        pytest.skip('Optional OpenVINO runtime is not installed')
    if installed != ('2025.4.1', '2025.2.0'):
        pytest.skip('This privacy compatibility test requires the pinned optional runtime')
    script = textwrap.dedent('''
        import socket
        from openvino_telemetry.utils.opt_in_checker import OptInChecker, ConsentCheckResult
        from openvino_telemetry.main import Telemetry
        def forbidden(*args, **kwargs):
            raise AssertionError('Vendor import attempted network, consent write or prompt')
        socket.socket.connect = forbidden
        socket.socket.connect_ex = forbidden
        socket.create_connection = forbidden
        OptInChecker.create_or_check_consent_dir = forbidden
        OptInChecker.update_result = forbidden
        OptInChecker.opt_in_dialog = forbidden
        from sentinel_ml.exchange_runtime import private_openvino
        ov = private_openvino()
        assert private_openvino() is ov
        assert OptInChecker().check() == ConsentCheckResult.DECLINED
        telemetry = Telemetry('sentinel-regression', '1', 'test', enable_opt_in_dialog=False)
        assert telemetry.consent is False
        telemetry.send_event('test', 'import-check', 'no-evidence-or-identities')
        print('private-import-ok')
    ''')
    result = subprocess.run([sys.executable, '-c', script], capture_output=True, text=True, timeout=45)
    assert result.returncode == 0, result.stderr
    assert 'private-import-ok' in result.stdout


def test_unreviewed_vendor_version_is_rejected(monkeypatch):
    import sentinel_ml.exchange_runtime as runtime
    monkeypatch.setattr(runtime, 'version', lambda _: 'unsupported')
    with pytest.raises(ValueError, match='pinned'):
        runtime.private_openvino()


def int8_fixture(bundle, runtime, record):
    rows = [{'id': str(i), 'split': 'train', 'dataset': 'example', 'label': i % 2} for i in range(32)]
    (bundle / 'inventory.json').write_text(json.dumps({'rows': rows}))
    inventory_hash = sha(bundle / 'inventory.json')
    (bundle / 'manifest.json').write_text(json.dumps({'files': {'encoder.pt': 'frozen-encoder',
                                                              'inventory.json': inventory_hash}}))
    protocol = {'seed': 42, 'frames': 256, 'inventory_sha256': inventory_hash, 'windows': rows}
    (runtime / 'calibration.json').write_text(json.dumps(protocol))
    record.update(profile='openvino-int8-dino-v1', nncf='2.18.0',
                  source_manifest_sha256=sha(bundle / 'manifest.json'),
                  calibration={'sha256': sha(runtime / 'calibration.json'), 'frames': 256,
                               'training_only': True, 'inventory_sha256': inventory_hash})
    (runtime / 'runtime.json').write_text(json.dumps(record))
    return protocol


def test_quantized_research_runtime_requires_training_provenance(runtime_files):
    bundle, runtime, record = runtime_files
    protocol = int8_fixture(bundle, runtime, record)
    assert runtime_receipt(bundle, runtime)['profile'] == 'openvino-int8-dino-v1'
    protocol['windows'][0]['split'] = 'test'
    (runtime / 'calibration.json').write_text(json.dumps(protocol))
    record['calibration']['sha256'] = sha(runtime / 'calibration.json')
    (runtime / 'runtime.json').write_text(json.dumps(record))
    with pytest.raises(ValueError, match='only verified training'):
        runtime_receipt(bundle, runtime)


@pytest.mark.parametrize('bad', ['missing', 'duplicate', 'wrong_label', 'nan', 'wrong_order', 'train'])
def test_runtime_predictions_cover_exact_reserved_rows(bad):
    from training.evaluate_exchange_runtime import check_predictions
    rows = [{'id': 'a', 'label': 1, 'split': 'test'}, {'id': 'b', 'label': 0, 'split': 'test'}]
    predictions = [{'id': 'a', 'label': 1, 'score': .8}, {'id': 'b', 'label': 0, 'score': .2}]
    check_predictions(rows, predictions)
    if bad == 'missing': predictions.pop()
    elif bad == 'duplicate': predictions[1] = predictions[0]
    elif bad == 'wrong_label': predictions[0]['label'] = 0
    elif bad == 'nan': predictions[0]['score'] = float('nan')
    elif bad == 'wrong_order': predictions.reverse()
    else: rows[0]['split'] = 'train'
    with pytest.raises(ValueError):
        check_predictions(rows, predictions)


def test_partial_runtime_evaluation_is_explicit_and_bounded():
    from training.evaluate_exchange_runtime import check_predictions
    rows = [{'id': 'a', 'label': 0, 'split': 'test'}]
    check_predictions(rows, [], complete=False)
    with pytest.raises(ValueError):
        check_predictions(rows, [])
    with pytest.raises(ValueError):
        check_predictions([], [{'id': 'a', 'label': 0, 'score': .1}], complete=False)


def test_runtime_screen_requires_three_distinct_runs(tmp_path):
    from training.screen_exchange_runtime import screen
    with pytest.raises(ValueError, match='three distinct'):
        screen(tmp_path, tmp_path, tmp_path, [tmp_path] * 3)


def test_native_receipt_is_bound_to_original_encoder_and_installed_libraries(runtime_files):
    from sentinel_ml.exchange_runtime import NATIVE_CONFIG, NATIVE_PROFILE, native_libraries, predictions_hash
    from backend.exchange_import import installation_files
    bundle,runtime,record=runtime_files
    record.update(profile=NATIVE_PROFILE,config=NATIVE_CONFIG,files={},libraries=native_libraries(),
                  predictions_sha256=predictions_hash([{'id':'test','label':1,'score':.8}]))
    (runtime/'runtime.json').write_text(json.dumps(record))
    assert runtime_receipt(bundle,runtime)['profile']==NATIVE_PROFILE
    assert 'runtime/encoder.xml' not in installation_files(runtime)
    record['libraries']['torch']='different-runtime'
    (runtime/'runtime.json').write_text(json.dumps(record))
    with pytest.raises(ValueError,match='library or evaluation'):
        runtime_receipt(bundle,runtime)


def test_prediction_fingerprint_binds_scores_and_order():
    from sentinel_ml.exchange_runtime import predictions_hash
    values=[{'id':'a','label':1,'score':.8},{'id':'b','label':0,'score':.2}]
    assert predictions_hash(values)!=predictions_hash(values[::-1])
    changed=[dict(row) for row in values];changed[0]['score']=.9
    assert predictions_hash(values)!=predictions_hash(changed)
    with pytest.raises(ValueError):predictions_hash([{'score':float('nan')}])
