import pytest
from backend.db import DEFAULT_SETTINGS
from backend.intelligence import PHRASES, phrase_events, fuse

POLICY=DEFAULT_SETTINGS['thresholds']

def assess(events,assessed=True):
    return fuse([dict(e,id=str(i)) for i,e in enumerate(events)],POLICY,assessed=assessed)

def event(kind='speech',start=0,**signals):
    return {'kind':kind,'start':start,'signals':signals}

@pytest.mark.parametrize('text',[
    'Please show your license. The challan is Rs. 500.', 'You can pay the challan online or at the counter.',
    'Receipt lena zaroori hai.', 'How do I pay at the official counter?', 'Please follow traffic rules.',
    'Challan online jama kar dein.', 'I cannot accept your money. Please use the official counter.',
    'براہ کرم چالان جمع کریں۔', 'License wikhao ji.', 'Aram se baat karo.',
    'CHALLAN ONLINE JAMA KARO', 'Challan, online jama karo.', 'Normal crowd movement.',
    'Thank you for explaining the procedure.', 'Please collect your official receipt.',
])
def test_routine_language_never_bribery(text):
    phrases=[dict(phrase=p,category=c,language=l,explanation=e) for p,c,l,e in PHRASES]
    events=phrase_events([{'id':'tr_1','start':0,'end':4,'text':text}],phrases)
    result=assess(events)
    assert result['label'] in ('Normal','Low Risk')

@pytest.mark.parametrize('text',['Bhai, muhabbat karo.','Kuch arrange kar do','FIR kaat leni hai','Tumhein pata hai main kaun hoon?','Yahan se settle kar do','Receipt ki zaroorat nahi','Chai pani ka intezam kar do','Idhar aa, warna bike andar kar dunga','Chup raho zyada mat bolo'])
def test_single_phrase_requires_context(text):
    phrases=[dict(phrase=p,category=c,language=l,explanation=e) for p,c,l,e in PHRASES]
    events=phrase_events([{'id':'tr_1','start':0,'end':4,'text':text}],phrases)
    result=assess(events)
    assert result['label']=='Ambiguous' and result['review_required']

def test_missing_evidence_not_normal():
    result=assess([],False)
    assert result['score'] is None and result['label']=='Unassessed' and result['review_required']

def test_gesture_alone_not_proof():
    result=assess([event('gesture',gesture=100,context=40)])
    assert result['label']=='Ambiguous'

def test_aligned_multimodal_high_risk():
    result=assess([event(speech=90,context=90,temporal=80),event('body',start=2,body=90,gesture=80)])
    assert result['label']=='High Risk'

def test_distant_signals_not_fused():
    result=assess([event(speech=90,context=90,temporal=80),event('body',start=30,body=90,gesture=80)])
    assert result['label']=='Ambiguous'

@pytest.mark.parametrize('kind',['officer_danger','violence','weapon_like','emergency_keyword'])
def test_supported_safety_annotation_routes_review(kind):
    result=assess([event(kind,safety=True,body=90,context=90)])
    assert result['label']=='Emergency' and result['review_required']

def test_confidence_not_manufactured():
    phrases=[dict(phrase=p,category=c,language=l,explanation=e) for p,c,l,e in PHRASES]
    events=phrase_events([{'id':'tr_1','start':2,'end':5,'text':'Bhai muhabbat karo'}],phrases)
    assert events[0]['confidence'] is None and events[0]['references']==['tr_1']

def test_disabled_phrase_has_no_effect():
    assert not phrase_events([{'id':'x','start':0,'end':4,'text':'bad phrase'}],[{'phrase':'bad phrase','category':'coercive','explanation':'Disabled','active':False}])


def test_eight_second_window_does_not_span_sixteen_seconds():
    result=assess([event(speech=100,context=100,temporal=100),event('routine',start=8),event('body',start=16,body=100,gesture=100)])
    assert result['label']=='Ambiguous'


def test_safety_override_keeps_its_supporting_references():
    result=assess([event(speech=100,context=100,temporal=100),event('body',start=1,body=100,gesture=100),event('officer_danger',start=30,safety=True)])
    assert result['label']=='Emergency'
    assert result['references']==['2']
    assert result['score']==POLICY['emergency']
