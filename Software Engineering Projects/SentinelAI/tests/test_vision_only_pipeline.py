import copy
import numpy as np
import pytest
from backend.visual_exchange import TITLE
from backend.pipeline import run_ffmpeg


@pytest.mark.parametrize('learned', [False, True])
def test_video_with_audio_creates_only_visual_evidence_and_review_alert(application,login,tmp_path,monkeypatch,learned):
    """Injected visual observations test plumbing; they are not genuine predictions."""
    from backend.pipeline import Processor
    from backend.perception import LocalPerception
    source=tmp_path/'visual-with-audio.mp4'
    run_ffmpeg(['-f','lavfi','-i','testsrc2=size=320x240:rate=15','-f','lavfi','-i',f'sine=frequency={550 if learned else 440}:sample_rate=16000','-t','3','-c:v','libx264','-c:a','aac',str(source)])
    config=copy.copy(application.state.config)
    config.exchange_model='injected-test-model';config.gesture_model='injected-test-hands'
    if learned:
        config.exchange_model=config.gesture_model=''
        config.learned_exchange_model='injected-learned-unit-fixture'
    config.whisper_model=config.acoustic_model=config.diarization_model='must-not-load'
    event={'start':.5,'end':2,'kind':'visual_exchange','title':TITLE,'detail':'Synthetic transfer observation for API integration only.',
        'confidence':.7,'confidence_type':'heuristic support','source':'synthetic_test','references':[],
        'signals':{'context':50},'boxes':[{'seconds':2,'rtp':None,'xyxy':[.1,.2,.3,.4],'label':'Test object'}]}
    if learned:
        event.update(source='learned-visual-transfer',confidence_type='uncalibrated learned window score',boxes=[])
    class Exchange:
        last_report={'status':'experimental','events':[event],'scope':'Injected detector observations; not model accuracy.'}
        def analyze(self,path):return [event]
    class Perception:
        last_report={}
        def analyze(self,path):return []
    processor=Processor(application.state.db,application.state.storage,config)
    processor.exchange=Exchange();processor.perception=Perception()
    client=login('citizen')
    response=client.post('/api/cases/upload',data={'title':'Vision-only audio invariance fixture','consent':'true','test_recording':'true'},files={'file':('fixture.mp4',source.read_bytes(),'video/mp4')})
    assert response.status_code==201,response.text
    ident=response.json()['id'];processor.process(ident)
    case=client.get('/api/cases/'+ident).json()
    assert not case['segments'] and case['assessment']['method']=='vision-only-review-v1'
    assert not any(k in case['assessment'] for k in ('speech','phrase_rules','diarization','acoustics'))
    assert case['events'][0]['title']==TITLE
    assert bool(case['events'][0]['boxes']) is (not learned)
    if learned: assert case['events'][0]['source']=='learned-visual-transfer'
    assert case['risk_label']=='Ambiguous'
    assert case['alerts'][0]['kind']=='visual_exchange'
    assert {'video','frame','clip'} <= {e['kind'] for e in case['evidence']}
    assert len(case['events'][0]['references'])==3


def test_phrase_mutations_cannot_reenable_audio_detection(login):
    admin=login('admin')
    assert admin.post('/api/admin/phrases',json={'phrase':'cash please','category':'ambiguous','language':'English','explanation':'Removed vision-only scope'}).status_code==410
    assert admin.post('/api/admin/phrases/unused/toggle',json={'reason':'Cannot enable removed analysis'}).status_code==410
