import json
import pytest
from evaluation.metrics import classification,text_error,event_matches,summarize
from evaluation.run import load_manifest
from sentinel_ml.video import sha256
from evaluation.metrics import speaker_error, reviewer_agreement

def test_overlapping_events_use_maximum_one_to_one_matching():
    expected=[{'label':'palm','start':0,'end':4},{'label':'palm','start':0,'end':2}]
    predicted=[{'label':'palm','start':0,'end':4},{'label':'palm','start':2,'end':4}]
    assert event_matches(expected,predicted)=={'tp':2,'fp':0,'fn':0}
    assert event_matches(expected[::-1],predicted)=={'tp':2,'fp':0,'fn':0}

def test_speaker_metric_maps_anonymous_labels_and_counts_overlap():
    pytest.importorskip('scipy')
    ref=[{'speaker':'A','start':0,'end':2},{'speaker':'B','start':1,'end':3}]
    hyp=[{'speaker':'X','start':0,'end':2},{'speaker':'Y','start':1,'end':3}]
    assert speaker_error(ref,hyp)=={'reference_seconds':4.,'missed_seconds':0.,'false_alarm_seconds':0.,'confusion_seconds':0.}
    assert speaker_error(ref,hyp[:1])['missed_seconds']==2
    false_alarm=speaker_error([],hyp)
    assert false_alarm['reference_seconds']==0 and false_alarm['false_alarm_seconds']==4

def test_speaker_confusion_and_missing_prediction_are_not_success():
    pytest.importorskip('scipy')
    ref=[{'speaker':'A','start':0,'end':2},{'speaker':'B','start':2,'end':4}]
    hyp=[{'speaker':'X','start':0,'end':4}]
    assert speaker_error(ref,hyp)['confusion_seconds']==2
    row={'clip_id':'a','sha256':'hash','speaker_turns':ref}
    prediction={'clip_id':'a','sha256':'hash','status':'partial','speaker_turns':None}
    with pytest.raises(ValueError,match='Speaker analysis was not run'):summarize([row],[prediction])
    assert summarize([row],[{**prediction,'speaker_turns':hyp}])['speaker_diarization']['der']==.5

def test_independent_annotation_agreement_has_honest_denominators():
    result=reviewer_agreement(['Normal','Normal','Ambiguous','Ambiguous'],['Normal','Ambiguous','Ambiguous','Normal'])
    assert result['observed_agreement']==.5 and result['cohen_kappa']==0
    assert reviewer_agreement(['Normal'],['Normal'])['cohen_kappa'] is None
    with pytest.raises(ValueError):reviewer_agreement(['Normal'],[])

def test_metrics_count_false_positives_and_omissions():
    result=classification(['Normal','Normal','Ambiguous','Ambiguous'],['Normal','Ambiguous','Ambiguous','Normal'])
    assert result['accuracy']==.5
    assert result['per_class']['Ambiguous']['false_positive_rate']==.5
    assert text_error('keep the receipt','keep receipt')['word_errors']==1
    assert text_error('چالان جمع کریں','چالان جمع کریں')['word_errors']==0

def test_event_matching_is_one_to_one():
    event={'label':'Open palm','start':1,'end':3}
    assert event_matches([event],[event,event])=={'tp':1,'fp':1,'fn':0}

def test_missing_speech_not_counted_as_success():
    row={'clip_id':'a','sha256':'hash','reference_transcript':'hello'}
    pred={'clip_id':'a','sha256':'hash','status':'partial','transcript':None}
    with pytest.raises(ValueError,match='Speech was not run'):summarize([row],[pred])
    result=summarize([row],[{**pred,'transcript':'hello'}])
    assert result['speech']['wer']==0 and not result['fyp_50_clip_collection_reached']
    assert result['review_priority'] is None

def test_evaluation_checks_authorization_and_source_split_leakage(tmp_path):
    for i in range(2):(tmp_path/f'{i}.mp4').write_bytes(bytes([i])*10)
    rows=[{'clip_id':str(i),'file':f'{i}.mp4','sha256':sha256(tmp_path/f'{i}.mp4'),'authorized':True,'source_group':'same-session','split':split} for i,split in enumerate(['train','test'])]
    path=tmp_path/'manifest.json';path.write_text(json.dumps({'schema':1,'clips':rows}))
    with pytest.raises(ValueError,match='crosses'):load_manifest(path)
    rows[0]['source_group']='independent'
    rows[1]['authorized']=False
    path.write_text(json.dumps({'schema':1,'clips':rows}))
    with pytest.raises(ValueError,match='authorized'):load_manifest(path)
