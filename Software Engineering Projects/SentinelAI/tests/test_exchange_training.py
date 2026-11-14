"""Training/data isolation and research inference safeguards, not accuracy tests."""
from collections import deque
import io
import json
from pathlib import Path
import zipfile

import numpy as np
import pytest
import torch

from sentinel_ml.exchange import CONTRACT, TemporalHead, preprocess
from sentinel_ml.exchange_bundle import ResearchExchange, load
from training.exchange_data import SBU_CLASSES, SBU_ACTORS, sbu_split, cornell_split, load_rgb, verify_inventory
from training.exchange_sources import HTTPRangeFile, safe_target, extract_member
from training.train_exchange import select_threshold
from training.exchange_report import validate_controls, EXPECTED_CONTROLS


def test_actor_partitions_are_disjoint_and_reverse_pairs_stay_together():
    sets = list(SBU_ACTORS.values())
    assert all(not a & b for i, a in enumerate(sets) for b in sets[i+1:])
    assert sbu_split('s01s02') == sbu_split('s02s01') == 'train'
    assert sbu_split('s03s05') == 'dev'
    assert sbu_split('s06s04') == 'test'
    assert sbu_split('s01s03') is None
    assert cornell_split('P21_P22') == 'train'
    assert cornell_split('P23_P24') == 'dev'
    assert cornell_split('P27_P28') == 'test'
    assert SBU_CLASSES['07'] == 'exchange'
    assert SBU_CLASSES['05'] == 'handshake'


@pytest.mark.parametrize('name', ['../outside', '/absolute', 'C:/secret', 'a\\..\\b'])
def test_archive_paths_cannot_escape(tmp_path, name):
    with pytest.raises(ValueError):
        safe_target(tmp_path, name)


def test_bounded_remote_zip_reads_and_crc(tmp_path):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('pair/video.mp4', b'example bytes only')
    payload = buffer.getvalue()

    class Response:
        status_code = 206
        headers = {'Content-Range': f'bytes 0-{len(payload)-1}/{len(payload)}'}
        raw = io.BytesIO(payload)

        def raise_for_status(self):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

    class Session:
        def get(self, *_, **kwargs):
            assert kwargs['headers']['Range'] == f'bytes=0-{len(payload)-1}'
            return Response()

    stream = HTTPRangeFile('https://example.invalid/public.zip', len(payload), Session())
    with zipfile.ZipFile(stream) as archive:
        receipt = extract_member(archive, archive.infolist()[0], tmp_path)
    assert (tmp_path / receipt['relative']).read_bytes() == b'example bytes only'
    assert stream.downloaded == len(payload)
    assert len(stream.cache) <= 4
    with pytest.raises(ValueError):
        stream.seek(-1)


def test_preprocess_preserves_rgb_and_rejects_unexpected_input():
    frame = np.zeros((120, 200, 3), dtype=np.uint8)
    frame[:, :, 0] = 255
    tensor = preprocess(frame)
    assert tensor.shape == (3, 160, 160)
    assert torch.isfinite(tensor).all()
    assert tensor[0, 80, 80] > tensor[2, 80, 80]
    with pytest.raises(ValueError):
        preprocess(frame.astype(np.float32))


def test_server_cannot_replace_range_request_with_unbounded_download():
    class Response:
        status_code = 200
        headers = {}

        def raise_for_status(self):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

    class Session:
        def get(self, *_, **kwargs):
            return Response()

    stream = HTTPRangeFile('https://example.invalid/large.zip', 10**10, Session())
    with pytest.raises(ValueError, match='exact bounded byte range'):
        stream.read(1)
    assert stream.downloaded == 0


def test_temporal_head_requires_ordered_eight_frame_shape():
    head = TemporalHead().eval()
    assert head(torch.zeros(2, 8, 576)).shape == (2, 2)
    with pytest.raises(ValueError):
        head(torch.zeros(2, 1, 576))


def test_exact_source_times_and_gap_abstention():
    model = ResearchExchange.__new__(ResearchExchange)
    model.frames = deque(maxlen=8)
    model.previous = None
    model.manifest = {'threshold': .7}
    model.encoder = lambda frames: torch.zeros(1, 576)
    model.head = lambda features: torch.tensor([[0., 2.]])
    rgb = np.zeros((20, 20, 3), dtype=np.uint8)
    for i in range(7):
        assert model.observe(rgb, i / 4, 123 + i * 22500) is None
    result = model.observe(rgb, 1.75, 157623)
    assert result['start'] == 0 and result['end'] == 1.75
    assert result['sampled_rtp'][0] == 123
    assert result['boxes'] == []  # Clip classifier must not invent localization.
    assert model.observe(rgb, 3., 270123) is None
    assert len(model.frames) == 1
    with pytest.raises(ValueError):
        model.observe(rgb, 3.)


def test_manifest_cannot_self_approve_deployment(tmp_path):
    (tmp_path / 'manifest.json').write_text(json.dumps({'schema': 1, 'contract': CONTRACT,
        'purpose': 'research_trained', 'threshold': .7, 'deployment_approved': True}))
    with pytest.raises(ValueError, match='not approved'):
        load(tmp_path)
    with pytest.raises(ValueError, match='bundle file'):
        load(tmp_path, research=True)


def test_threshold_selection_balances_datasets_not_large_source_count():
    rows = [{'dataset': 'a', 'category': 'exchange', 'label': 1},
            {'dataset': 'a', 'category': 'handshake', 'label': 0},
            {'dataset': 'b', 'category': 'exchange', 'label': 1},
            {'dataset': 'b', 'category': 'reach', 'label': 0}]
    quality, threshold, result = select_threshold(rows, [.9, .2, .8, .1])
    assert quality == 1
    assert .2 < threshold <= .8
    assert result['categories']['a/handshake']['confusion_matrix'][0][1] == 0


def test_sequential_decoder_preserves_the_selected_frames(tmp_path):
    import cv2
    path = tmp_path / 'known.avi'
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*'MJPG'), 10., (64, 48))
    assert writer.isOpened()
    for index in range(20):
        writer.write(np.full((48, 64, 3), index * 10, dtype=np.uint8))
    writer.release()
    actual = load_rgb(tmp_path, {'path': path.name, 'kind': 'video', 'start': .3, 'end': 1.5, 'id': 'synthetic-codec-test'})
    expected = []
    cap = cv2.VideoCapture(str(path))
    for index in np.linspace(3, 14, 8).round().astype(int):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(index))
        ok, bgr = cap.read()
        assert ok
        expected.append(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    cap.release()
    assert all(np.array_equal(a, b) for a, b in zip(actual, expected))


def test_resumed_inventory_rejects_modified_data_and_changed_split(tmp_path):
    from training.exchange_sources import digest
    path = tmp_path / 'data.mp4'
    path.write_bytes(b'original fixture')
    row = {'path': path.name, 'kind': 'video', 'sha256': digest(path),
           'dataset': 'cornell', 'group': 'P07_P08', 'split': 'train'}
    verify_inventory(tmp_path, {'rows': [row]})
    with pytest.raises(ValueError, match='actor split'):
        verify_inventory(tmp_path, {'rows': [{**row, 'split': 'test'}]})
    path.write_bytes(b'changed fixture')
    with pytest.raises(ValueError, match='bytes changed'):
        verify_inventory(tmp_path, {'rows': [row]})


def control_report():
    return {'schema': 1, 'model_manifest_sha256': 'frozen-manifest', 'version': 'test', 'threshold': .6,
            'controls': [{'control': name, 'expected_visible_transfer': positive,
                          'windows': 1, 'detected': positive,
                          'predictions': [{'score': .8 if positive else .2, 'flagged': positive,
                                           'inference_seconds': .05}]}
                         for name, positive in EXPECTED_CONTROLS.items()]}


def test_complete_screening_preserves_measured_latency():
    assert validate_controls(control_report(), {'version': 'test', 'threshold': .6}, 'frozen-manifest') == .05


@pytest.mark.parametrize('corruption', ['missing', 'duplicate', 'wrong_model', 'empty', 'nan', 'summary', 'threshold', 'label'])
def test_screening_rejects_incomplete_or_misleading_evaluations(corruption):
    report = control_report()
    first = report['controls'][0]
    if corruption == 'missing':
        report['controls'].pop()
    elif corruption == 'duplicate':
        report['controls'][-1] = first
    elif corruption == 'wrong_model':
        report['model_manifest_sha256'] = 'different-weights'
    elif corruption == 'empty':
        first['predictions'] = []
        first['windows'] = 0
    elif corruption == 'nan':
        first['predictions'][0]['score'] = float('nan')
    elif corruption == 'summary':
        first['detected'] = False
    elif corruption == 'threshold':
        first['predictions'][0]['flagged'] = False
    elif corruption == 'label':
        first['expected_visible_transfer'] = False
    with pytest.raises(ValueError):
        validate_controls(report, {'version': 'test', 'threshold': .6}, 'frozen-manifest')


def test_cap_subject_or_collector_overlap_cannot_cross_partitions():
    from training.cap_data import assign_groups, allowed
    scenes = {str(i): {'attributes': {'collector_id': f'collector{i}', 'subject_ids': [f'subject{i}']},
                      'activities': {'a': {'label': 'person_shakes_hand' if i == 0 else 'person_sits_down'}}}
              for i in range(12)}
    scenes['1']['attributes']['subject_ids'] = ['subject0']
    scenes['2']['attributes']['collector_id'] = 'collector1'
    groups, splits = assign_groups(scenes)
    assert groups['0'] == groups['1'] == groups['2']
    assert splits[groups['0']] == 'train'
    assert set(splits.values()) == {'train', 'dev', 'test'}
    assert allowed('person_shakes_hand')
    assert not allowed('person_catches_object_from_person')
    assert not allowed('person_transfers_object_to_person')


def test_negative_only_development_source_uses_specificity():
    rows = [{'dataset': 'transfer', 'category': 'exchange', 'label': 1},
            {'dataset': 'transfer', 'category': 'handshake', 'label': 0},
            {'dataset': 'cap', 'category': 'normal', 'label': 0}]
    quality, threshold, _ = select_threshold(rows, [.9, .2, .3])
    assert quality == 1 and .3 < threshold <= .9


def test_cap_filenames_are_portable_without_extracting_paths():
    from training.cap_controls import member_name
    name = member_name('dataset/Who is here?/video.mp4')
    assert '?' not in name and '/' not in name and name.endswith('.mp4')
    with pytest.raises(ValueError):
        member_name('../outside.mp4')


def test_consecutive_four_hz_sampling_uses_actual_video_frames(tmp_path):
    import cv2
    path = tmp_path / 'timed.avi'
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*'MJPG'), 20., (64, 48))
    for index in range(70):
        writer.write(np.full((48, 64, 3), index * 3, dtype=np.uint8))
    writer.release()
    row = {'path': path.name, 'kind': 'video', 'sampling': 'consecutive-4hz',
           'start': 1., 'end': 2.8, 'id': 'synthetic-four-hz-check'}
    actual = load_rgb(tmp_path, row)
    cap = cv2.VideoCapture(str(path))
    expected = []
    for index in range(20, 56, 5):
        cap.set(cv2.CAP_PROP_POS_FRAMES, index)
        ok, frame = cap.read()
        assert ok
        expected.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    cap.release()
    assert len(actual) == 8 and all(np.array_equal(a, b) for a, b in zip(actual, expected))


def test_display_rotation_is_honored_in_training_and_research_inference(tmp_path):
    import cv2
    import imageio_ffmpeg
    import subprocess
    source, rotated = tmp_path / 'source.mp4', tmp_path / 'rotated.mp4'
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([exe, '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                    '-f', 'lavfi', '-i', 'testsrc=size=64x48:rate=20:duration=2',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(source)], check=True, timeout=30)
    subprocess.run([exe, '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                    '-display_rotation:v:0', '90', '-i', str(source), '-c', 'copy',
                    str(rotated)], check=True, timeout=30)
    cap = cv2.VideoCapture(str(rotated))
    assert cap.get(cv2.CAP_PROP_ORIENTATION_META) in (90, 270)
    cap.release()
    row = {'path': rotated.name, 'kind': 'video', 'sampling': 'consecutive-4hz',
           'upright_from_container': True, 'start': 0., 'end': 1.9, 'id': 'rotation-test'}
    frames = load_rgb(tmp_path, row)
    assert all(frame.shape[:2] == (64, 48) for frame in frames)
    observer = ResearchExchange.__new__(ResearchExchange)
    observer.frames, observer.previous = deque(maxlen=8), None
    seen = []
    observer.observe = lambda rgb, seconds: seen.append(rgb.shape[:2])
    observer.analyze(rotated)
    assert seen and all(shape == (64, 48) for shape in seen)


def test_discarded_experiment_cannot_be_loaded_for_research(tmp_path):
    (tmp_path / 'DISCARDED_PREPROCESSING.json').write_text('{}')
    with pytest.raises(ValueError, match='discarded'):
        load(tmp_path, research=True)


def test_ut_names_and_entire_source_remain_training_only(tmp_path):
    from training.ut_controls import parse_name
    from training.exchange_sources import digest
    assert parse_name('segmented_set2/17_13_0.avi') == (2, 17, 13, 0)
    for name in ['../segmented_set1/0_1_0.avi', 'segmented_set1/0_1_9.avi',
                 'segmented_set1/0_1_0.exe', 'segmented_set3/0_1_0.avi']:
        with pytest.raises(ValueError):
            parse_name(name)
    path = tmp_path / 'known.avi'
    path.write_bytes(b'fixture bytes, not a training recording')
    row = {'path': path.name, 'kind': 'video', 'sha256': digest(path),
           'dataset': 'ut', 'group': 'ut-all-training', 'split': 'train', 'label': 0}
    verify_inventory(tmp_path, {'rows': [row]})
    with pytest.raises(ValueError, match='actor split'):
        verify_inventory(tmp_path, {'rows': [{**row, 'split': 'test'}]})
    with pytest.raises(ValueError, match='non-transfer training'):
        verify_inventory(tmp_path, {'rows': [{**row, 'label': 1}]})


def test_encoder_profiles_do_not_guess_architectures_or_mix_feature_dimensions():
    from sentinel_ml.exchange_profiles import profile
    mobile = profile()
    dino = profile('dinov2-small-gru-v1')
    assert mobile.CONTRACT == CONTRACT
    rgb = np.zeros((90, 160, 3), dtype=np.uint8)
    assert mobile.preprocess(rgb).shape == (3, 160, 160)
    assert dino.preprocess(rgb).shape == (3, 224, 224)
    assert dino.TemporalHead().eval()(torch.zeros(1, 8, 768)).shape == (1, 2)
    with pytest.raises(ValueError, match='ordered frame'):
        dino.TemporalHead()(torch.zeros(1, 8, 576))
    with pytest.raises(ValueError, match='Unsupported exchange architecture'):
        profile('untrusted.module.from.manifest')


def test_long_run_monitor_detects_interruption_and_has_a_deadline(tmp_path):
    from training.complete_exchange_run import wait_for_manifest
    with pytest.raises(RuntimeError, match='without a completed bundle'):
        wait_for_manifest(tmp_path, lambda: False, 100)
    moments = iter([0, 2])
    with pytest.raises(TimeoutError, match='no completion'):
        wait_for_manifest(tmp_path, lambda: True, 1, clock=lambda: next(moments))
    (tmp_path / 'manifest.json').write_text('{}')
    # A manifest only ends the wait; the strict bundle loader still validates it.
    wait_for_manifest(tmp_path, lambda: False, 1)


def test_resume_reuses_completed_features_and_never_redecodes_them(tmp_path, monkeypatch):
    from types import SimpleNamespace
    import training.train_exchange as training
    class SmallEncoder(torch.nn.Module):
        def forward(self, frames):
            return torch.ones(len(frames), 576)
    weights = tmp_path / 'encoder.pt'
    torch.save(SmallEncoder().state_dict(), weights)
    spec = SimpleNamespace(Encoder=SmallEncoder, CONTRACT=CONTRACT, preprocess=preprocess)
    rows = [{'id': 'synthetic-cache-plumbing-only'}]
    monkeypatch.setattr(training, 'load_rgb', lambda *_: [np.zeros((8, 8, 3), np.uint8)] * 8)
    first = training.features(tmp_path, rows, weights, tmp_path / 'cache', spec)
    def unexpected_decode(*_):
        raise AssertionError('Resumption must reuse the completed cached features')
    monkeypatch.setattr(training, 'load_rgb', unexpected_decode)
    resumed = training.features(tmp_path, rows, weights, tmp_path / 'cache', spec)
    assert torch.equal(first, resumed)
    assert len(list((tmp_path / 'cache').glob('*.npz'))) == 1
    assert not list((tmp_path / 'cache').glob('*.part'))


def test_progress_viewer_cannot_report_a_dead_job_as_running():
    from training.job_status import phase
    waiting = {'stage': 'waiting_for_training'}
    assert phase(waiting, False, False) == 'training_stopped_check_saved_results'
    assert phase(waiting, True, False) == 'training_running_evaluation_monitor_stopped'
    assert phase({'stage': 'evaluating_frozen_model'}, False, False) == 'evaluation_interrupted'
    rejected = {'stage': 'screening_failed_do_not_activate'}
    assert phase(rejected, False, False) == 'screening_failed_do_not_activate'
