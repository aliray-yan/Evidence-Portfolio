import pytest
from backend.db import DEFAULT_SETTINGS
from backend.intelligence import PHRASES, phrase_events, fuse

LIBRARY = [dict(phrase=p,category=c,language=l,explanation=e) for p,c,l,e in PHRASES]


def analyze(text, uncertain=False):
    events=phrase_events([{'id':'tr_test','start':0,'end':8,'text':text,'uncertain':uncertain}],LIBRARY)
    return events,fuse(events,DEFAULT_SETTINGS['thresholds'])


@pytest.mark.parametrize('text',[
    'Pay me cash and I will make the ticket disappear.',
    'You can pay me directly. No receipt is needed.',
    'Give me cash. Keep this off the record.',
    'Give me money or I will hold your permit.',
    'Perhaps you can do something for me and we can forget about the ticket.',
    'Do not pay me cash, but pay me cash after the camera is off.',
    'The published fee is ten dollars. Pay me directly and no receipt is needed.',
])
def test_payment_indicators_require_review_never_guilt(text):
    events,result=analyze(text)
    assert events and result['label']=='Ambiguous'
    assert result['review_required'] and all(e['confidence'] is None and e['references']==['tr_test'] for e in events)
    assert not any(e['signals'].get('safety') for e in events)


@pytest.mark.parametrize('text',[
    'Please pay the fine online and keep your official receipt.',
    'Please pay at the counter. The published fee is twenty dollars.',
    'I will never accept a bribe.',
    'Do not offer a bribe. Follow the official procedure.',
    "I won't pay a bribe. Please give me the official receipt.",
    'I refuse to pay me cash.',  # Grammatical oddity must not turn a local denial affirmative.
    'The parcel is under the table. Please collect it.',
    'I paid cash at the supermarket yesterday.',
])
def test_routine_payments_and_direct_refusals_not_affirmative_demands(text):
    _,result=analyze(text)
    assert result['label'] in ('Normal','Low Risk')


@pytest.mark.parametrize('text',[
    'He said pay me cash, so I am reporting what happened.',
    'The training example: pay me cash and keep this off the record.',
    'The officer said send an ambulance yesterday. I am reading the report.',
    'Do not send an ambulance.',
])
def test_quotations_reports_and_negation_withhold_emergency(text):
    events,result=analyze(text)
    assert events and result['label']=='Ambiguous'
    assert not any(e['signals'].get('safety') for e in events)


def test_real_safety_request_and_uncertain_asr_differ():
    assert analyze('Officer down. Send an ambulance.')[1]['label']=='Emergency'
    assert analyze('Officer down. Send an ambulance.',True)[1]['label']=='Ambiguous'


def test_disabled_english_library_entry_remains_disabled():
    assert phrase_events([{'id':'tr_test','start':0,'end':2,'text':'Pay me cash'}],[{**LIBRARY[0],'phrase':'pay me cash','category':'coercive','language':'English','active':False}])==[]
