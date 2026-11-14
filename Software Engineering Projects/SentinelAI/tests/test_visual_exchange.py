"""Logic fixtures are synthetic detector observations, not model accuracy tests."""
import numpy as np
import pytest
from backend.visual_exchange import ExchangeTracker,rectangular_proposals,TITLE


PEOPLE=[{'box':[.05,.1,.4,.9],'confidence':.9},{'box':[.6,.1,.95,.9],'confidence':.9}]
def hand(x):return {'box':[x-.025,.45,x+.025,.55],'wrist':[x,.53]}
def observations(mode='transfer'):
    # Independent before, contact, and withdrawal frames. No identity labels are supplied.
    for i,(left,right,obj) in enumerate([(.3,.8,.3),(.33,.75,.33),(.4,.66,.4),(.46,.54,.49),(.4,.6,.6),(.32,.67,.67),(.3,.72,.72)]):
        objects=[] if mode=='handshake' else [{'box':[obj-.03,.46,obj+.03,.50],'appearance':[.6,.6,.6],'label':'Unidentified rectangular object candidate'}]
        yield i*.5,PEOPLE,[hand(left),hand(right)],objects,i*45000


def test_transfer_requires_before_contact_after_and_never_claims_currency():
    tracker=ExchangeTracker();events=[]
    for frame in observations():events+=tracker.observe(*frame)
    assert len(events)==1
    event=events[0]
    assert event['title']==TITLE and not event['currency_identified']
    assert event['human_review_required'] and 'heuristic' in event['confidence_type']
    assert event['end']>event['start'] and all(b['rtp'] is not None for b in event['boxes'])


@pytest.mark.parametrize('mode',['handshake','normal','single_frame','gap','one_person','document'])
def test_visual_boundaries_and_document_uncertainty(mode):
    tracker=ExchangeTracker();events=[]
    for index,frame in enumerate(observations('handshake' if mode=='handshake' else 'transfer')):
        stamp,people,hands,objects,rtp=frame
        if mode=='single_frame' and index!=3:continue
        if mode=='normal':hands=[hand(.3),hand(.8)];objects=[]
        if mode=='gap':stamp=index*2
        if mode=='one_person':people=[{'box':[0,.1,1,.9],'confidence':.9}]
        events+=tracker.observe(stamp,people,hands,objects,rtp)
    if mode=='document':
        # Geometrically identical paper transfers CANNOT be declared money/bribery.
        assert events and all(not e['currency_identified'] and 'ordinary document' in e['detail'] for e in events)
    else:assert not events


def test_real_pixel_proposals_are_geometry_and_need_a_hand():
    import cv2
    rgb=np.zeros((360,640,3),np.uint8);cv2.rectangle(rgb,(240,150),(300,175),(230,230,230),-1)
    assert not rectangular_proposals(rgb,[])
    result=rectangular_proposals(rgb,[{'box':[.35,.4,.48,.52]}])
    assert result and all('Unidentified' in r['label'] for r in result)


def test_configuration_ignores_retired_audio_env(monkeypatch):
    from backend.config import Config
    monkeypatch.setenv('SENTINEL_WHISPER_MODEL','must-never-load')
    monkeypatch.setenv('SENTINEL_ACOUSTIC_MODEL','must-never-load')
    monkeypatch.setenv('SENTINEL_DIARIZATION_MODEL','must-never-load')
    config=Config.from_env()
    assert config.whisper_model==config.acoustic_model==config.diarization_model==''
