from types import SimpleNamespace as NS
import json
import numpy as np
import pytest
from backend.db import DEFAULT_SETTINGS, encode
from backend.intelligence import PHRASES, phrase_events, fuse
from backend.perception import pose_observations
from backend.redaction import redact_frame
from backend.speech import LocalWhisper


def phrases(texts):
    segments = [dict(id=f'tr_{i}', start=i*4, end=i*4+3, text=text) for i,text in enumerate(texts)]
    library = [dict(phrase=p,category=c,language=l,explanation=e) for p,c,l,e in PHRASES]
    return phrase_events(segments, library)


@pytest.mark.parametrize('text', ['بھائی محبت کرو', 'ایف آئی آر کاٹ لینی ہے', 'رسید کی ضرورت نہیں', 'کچھ انتظام کر دو'])
def test_urdu_real_script_has_contextual_indicators(text):
    events = phrases([text])
    assert events
    assert fuse(events, DEFAULT_SETTINGS['thresholds'])['label'] == 'Ambiguous'


def test_clarifying_context_is_cited_without_clearing_concern():
    result = phrases(['Yahan se settle kar do', 'Receipt lena, challan online jama karo'])
    ambiguous = next(e for e in result if 'Ambiguous' in e['title'])
    assert ambiguous['references'] == ['tr_0', 'tr_1']
    assert 'conflicting' in ambiguous['detail']
    assert fuse(result, DEFAULT_SETTINGS['thresholds'])['label'] == 'Ambiguous'


@pytest.mark.parametrize('text', ['No officer needs help', 'The example officer needs help', 'ہنگامی مدد نہیں چاہیے'])
def test_explicitly_negated_safety_phrase_retains_review_without_dispatch(text):
    events = phrases([text])
    assert events and not any(e['signals'].get('safety') for e in events)
    assert fuse(events, DEFAULT_SETTINGS['thresholds'])['label'] == 'Ambiguous'


def test_pose_geometry_not_intent_and_requires_visible_landmarks():
    points = [NS(x=.5,y=.5,z=0,visibility=.9) for _ in range(33)]
    points[15].y = points[16].y = .2
    points[23].y = points[24].y = .8
    assert pose_observations(points)[0][0] == 'Both wrists above shoulders'
    points[15].visibility = .2
    assert pose_observations(points) == []


def test_redaction_falls_back_and_masks_expanded_face_region():
    pixels = np.random.default_rng(42).integers(0, 256, (240,320,3), dtype=np.uint8)
    blurred, fallback = redact_frame(pixels, [])
    assert fallback and blurred.std() < pixels.std()/3
    masked, fallback = redact_frame(pixels, [(100,60,50,60)])
    assert not fallback and masked[60:120,100:150].std() < pixels[60:120,100:150].std()/2
    assert np.array_equal(masked[:20], pixels[:20])


def fake_speech(segments):
    speech = LocalWhisper.__new__(LocalWhisper)
    speech.identity = {'name':'test-double'}
    speech.model = NS(transcribe=lambda *a,**k: (iter(segments), NS(language='ur',language_probability=.8,duration=3)))
    return speech


def test_speech_output_has_honest_provenance():
    speech = fake_speech([NS(start=.1,end=2,text=' چالان جمع کریں ',avg_logprob=-1.5,no_speech_prob=.1)])
    result = speech.transcribe('test.wav')
    assert result[0]['speaker'] is None and result[0]['language'] == 'ur'
    assert speech.last_report['warnings'] and 'hypothesis' in speech.last_report['scope']
    assert result[0]['uncertain']


def test_low_likelihood_safety_words_cannot_create_automatic_emergency():
    library = [dict(phrase=p,category=c,language=l,explanation=e) for p,c,l,e in PHRASES]
    result = phrase_events([dict(id='uncertain',start=0,end=2,text='officer needs help',uncertain=True)], library)
    assert result and not any(e['signals'].get('safety') for e in result)
    assert fuse(result, DEFAULT_SETTINGS['thresholds'])['label'] == 'Ambiguous'


def test_unsupported_mediapipe_is_rejected_before_import(monkeypatch):
    from backend.ai_models import local_mediapipe
    monkeypatch.setattr('importlib.metadata.version', lambda _: '0.10.35')
    with pytest.raises(ValueError, match='telemetry'):
        local_mediapipe()


def test_health_discloses_unusable_mediapipe_runtime(monkeypatch,tmp_path):
    from backend.config import Config
    from backend.intelligence import capabilities
    asset=tmp_path/'model.task'; asset.write_bytes(b'test')
    config=Config(tmp_path,gesture_model=str(asset),face_model=str(asset))
    monkeypatch.setattr('importlib.metadata.version', lambda _: '0.10.35')
    status={row['name']:row['status'] for row in capabilities(config)}
    assert status['Hand shapes & pose observations']=='unavailable'
    assert status['Selective face-redaction review']=='unavailable'


@pytest.mark.parametrize('start,end', [(float('nan'),1),(0,6),(-1,2),(2,1)])
def test_speech_rejects_invalid_timestamps(start,end):
    speech = fake_speech([NS(start=start,end=end,text='hello',avg_logprob=-.2,no_speech_prob=.1)])
    with pytest.raises(ValueError,match='timestamp'):
        speech.transcribe('test.wav')


def test_privacy_preview_is_role_guarded_and_release_revocable(application,login,fresh_case):
    db, storage = application.state.db, application.state.storage
    with db.transaction() as con:
        con.execute("UPDATE cases SET privacy_status='full_frame_blurred' WHERE id=?", (fresh_case,))
        evidence = storage.put(con,fresh_case,'face_preview',b'private masked video','video/mp4','face_redaction_pending_review')
    citizen, reviewer = login('citizen'), login('supervisor')
    assert citizen.get('/api/evidence/'+evidence).status_code == 403
    assert not citizen.get('/api/cases/'+fresh_case).json()['evidence']
    assert reviewer.get('/api/evidence/'+evidence).status_code == 200
    url = '/api/cases/'+fresh_case+'/privacy-review'
    body = {'action':'approve','version':1,'reason':'Entire test derivative reviewed; no identifiers in this fixture.'}
    assert citizen.post(url,json=body).status_code == 403
    assert reviewer.post(url,json={**body,'reason':'short'}).status_code == 422
    assert reviewer.post(url,json=body).status_code == 200
    assert reviewer.post(url,json=body).status_code == 409
    assert citizen.get('/api/evidence/'+evidence).status_code == 200
    assert len(citizen.get('/api/cases/'+fresh_case).json()['evidence']) == 1
    assert reviewer.post(url,json={**body,'action':'revoke','version':2}).status_code == 200
    assert citizen.get('/api/evidence/'+evidence).status_code == 403
    with db.connect() as con:
        assert {r[0] for r in con.execute("SELECT action FROM audit WHERE resource=?", (fresh_case,))} >= {'privacy.approve','privacy.revoke'}
        assert db.verify_audit(con)['valid']


def test_retired_speech_configuration_never_probes_audio(application,login,tmp_path,monkeypatch):
    from backend.pipeline import run_ffmpeg
    from backend import speech
    path=tmp_path/'sound.mp4'
    run_ffmpeg(['-f','lavfi','-i','color=black:size=160x120:rate=15','-f','lavfi','-i','sine=frequency=440','-t','1','-c:v','libx264','-c:a','aac',str(path)])
    client=login('citizen')
    case=client.post('/api/cases/upload',data={'title':'Configured speech failure recovery','consent':'true'},files={'file':('clip.mp4',path.read_bytes(),'video/mp4')}).json()['id']
    processor=application.state.processor
    monkeypatch.setattr(processor.config,'whisper_model','missing-model')
    probes=[]
    monkeypatch.setattr(speech,'has_audio',lambda path: probes.append(path) or True)
    processor.run_once()
    result=client.get('/api/cases/'+case).json()
    assert result['processing_status']=='partial' and not result['processing_error']
    assert probes == [] and not result['segments'] and 'speech' not in result['assessment']


def test_object_candidates_do_not_create_automatic_emergency():
    import torch
    from backend.objects import candidates
    prediction={'labels':torch.tensor([49,87,1]),'scores':torch.tensor([.8,.2,.9]),'boxes':torch.tensor([[1,2,20,30],[2,3,10,12],[0,0,50,50]])}
    result=candidates(prediction)
    assert len(result)==1 and result[0]['label']==49
    assessment=fuse([{'id':'object','start':0,'kind':'object','signals':{'context':40}}],DEFAULT_SETTINGS['thresholds'])
    assert assessment['label']=='Ambiguous' and assessment['review_required']
    prediction['scores'][0]=float('nan')
    with pytest.raises(ValueError,match='invalid prediction'):candidates(prediction)
