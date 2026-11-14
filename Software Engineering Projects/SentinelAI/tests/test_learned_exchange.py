"""Learned adapter/stream integration with explicit synthetic classifier fixtures."""
from collections import deque
from types import SimpleNamespace
import numpy as np
import pytest
import torch

from backend.exchange_adapter import configured, sample_hz, create_exchange
from backend.learned_exchange import LearnedExchange
from backend.stream_analysis import FrameCadence
from backend.live_evidence import preserved_exchange
from sentinel_ml.exchange_bundle import ResearchExchange


def detector():
    model = ResearchExchange.__new__(ResearchExchange)
    model.manifest = {'threshold': .6, 'contract': {'frames': 8}, 'version': 'synthetic-unit-fixture'}
    model.frames, model.previous = deque(maxlen=8), None
    model.encoder = lambda _: torch.zeros(1, 576)
    model.head = lambda _: torch.tensor([[0., 2.]])
    adapter = LearnedExchange.__new__(LearnedExchange)
    adapter.model, adapter.identity = model, {'name': 'synthetic-unit-fixture'}
    return adapter


def test_learned_adapter_requires_temporal_evidence_and_bounds_alert_rate():
    adapter=detector(); tracker=adapter.new_tracker(); rgb=np.zeros((40,60,3),np.uint8)
    emitted=[]
    for i in range(24):
        events,coverage=adapter.frame(rgb,i/4,tracker,100+i*22500)
        emitted.extend(events)
        if i<7: assert not events and coverage['status']=='warming_up'
    assert len(emitted)==3 and coverage['completed_windows']==17
    first=emitted[0]
    assert first['start']==0 and first['end']==1.75 and first['frames'][0]['rtp']==100
    assert first['boxes']==[] and first['currency_identified'] is False and first['human_review_required']
    assert first['confidence_type']=='uncalibrated learned window score'
    events,coverage=adapter.frame(rgb,10,tracker,900100)
    assert not events and coverage['gap_resets']==1 and coverage['buffered_frames']==1


def test_source_cadence_does_not_drift_at_15_fps_or_catch_up_with_duplicates():
    cadence=FrameCadence(4)
    selected=[i/15 for i in range(150) if cadence.take(i/15)]
    assert len(selected)==40
    assert all(abs(stamp-i/4)<1/15+1e-6 for i,stamp in enumerate(selected))
    assert cadence.take(100) and not cadence.take(100)
    assert cadence.take(100.25)


def test_unapproved_learned_selection_fails_instead_of_falling_back(tmp_path):
    config=SimpleNamespace(learned_exchange_model=str(tmp_path),exchange_model='legacy',gesture_model='legacy')
    assert configured(config) and sample_hz(config)==4
    with pytest.raises(ValueError):create_exchange(config)
    config.learned_exchange_model=''
    assert configured(config) and sample_hz(config)==2


def test_failed_screening_cannot_install_or_change_selection(tmp_path, monkeypatch):
    import backend.exchange_import as importer
    monkeypatch.setattr(importer, 'screen', lambda *_: {'screening_pass': False})
    with pytest.raises(ValueError, match='failed detection or performance'):
        importer.install(tmp_path, tmp_path, tmp_path, [], root=tmp_path, activate=True)
    assert not (tmp_path / '.local').exists()


def test_preserved_model_finding_keeps_model_provenance_and_no_boxes():
    data={'finding':{'kind':'visual_exchange','flagged':True,'start_rtp':90000,'end_rtp':247500,
                    'detail':'Synthetic learned test fixture.', 'confidence':.8,
                    'confidence_type':'uncalibrated learned window score',
                    'inference_source':'learned-visual-transfer','model':{'name':'test'},'boxes':[]},
          'replay':{'start_rtp':0}}
    event=preserved_exchange(data,'evidence',4)
    assert event['source']=='preserved-learned-visual-transfer'
    assert event['model']['name']=='test' and event['boxes']==[]


def test_sequential_runtime_decoder_retains_the_original_uniform_samples(tmp_path):
    import cv2
    path=tmp_path/'timed.avi'
    writer=cv2.VideoWriter(str(path),cv2.VideoWriter_fourcc(*'MJPG'),15.,(64,48))
    for i in range(45): writer.write(np.full((48,64,3),i*4,np.uint8))
    writer.release()
    expected=[]; cap=cv2.VideoCapture(str(path))
    indices=np.arange(0,45,15/4).round().astype(int)
    for i in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES,int(i)); ok,frame=cap.read(); assert ok
        expected.append(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB))
    cap.release()
    observer=ResearchExchange.__new__(ResearchExchange)
    observer.frames,observer.previous=deque(maxlen=8),None
    actual=[]
    observer.observe=lambda rgb,stamp: actual.append((rgb,stamp))
    observer.analyze(path)
    assert observer.last_analysis['sampled_frames']==12
    assert all(np.array_equal(a[0],b) and a[1]==i/15 for a,b,i in zip(actual,expected,indices))
