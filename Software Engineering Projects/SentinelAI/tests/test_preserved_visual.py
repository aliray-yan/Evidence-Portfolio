import json
import pytest
from backend.live_evidence import preserved_exchange
from backend.stream_analysis import StreamAnalysis
from backend.visual_exchange import TITLE


def test_preserved_exchange_maps_rtp_wrap_and_retains_uncertainty():
    origin=2**32-90000
    data={'finding':{'kind':'visual_exchange','flagged':True,'start_rtp':0,'end_rtp':90000,
         'detail':'Unidentified object transfer.','confidence':.7,
         'boxes':[{'rtp':90000,'seconds':111,'xyxy':[.1,.2,.3,.4],'label':'Object'}]},'replay':{'start_rtp':origin}}
    event=preserved_exchange(data,'artifact',3)
    assert event['start']==1 and event['end']==2 and event['boxes'][0]['seconds']==2
    assert event['title']==TITLE and event['references']==['artifact'] and not event['currency_identified']
    with pytest.raises(ValueError):preserved_exchange(data,'artifact',1)


def test_clear_preserved_provenance_is_reviewer_only(application,login,fresh_case):
    with application.state.db.transaction() as con:
        con.execute("UPDATE cases SET privacy_status='full_frame_blurred' WHERE id=?",(fresh_case,))
        artifact=application.state.storage.put(con,fresh_case,'live_finding',b'{"snapshot_jpeg":"clear image"}','application/json','original_stream_provenance')
    citizen,reviewer=login('citizen'),login('supervisor')
    assert citizen.get('/api/evidence/'+artifact).status_code==403
    assert all(e['id']!=artifact for e in citizen.get('/api/cases/'+fresh_case).json()['evidence'])
    assert reviewer.get('/api/evidence/'+artifact).status_code==200


def test_live_visual_alerts_require_reviewer_and_do_not_return_clear_snapshot(application,login):
    owner,reviewer=login('citizen'),login('supervisor')
    with application.state.db.transaction() as con:
        con.execute("UPDATE live_sessions SET status='ended' WHERE owner_id='demo-citizen'")
    ident=owner.post('/api/live',json={'title':'Visual exchange alert fixture','consent':True}).json()['id']
    reader=StreamAnalysis(application.state.streaming,ident,{'id':'demo-citizen'})
    result=reader.result('visual_exchange',{'flagged':True,'title':TITLE,'snapshot_jpeg':'private-image',
        'start_seconds':1,'end_seconds':3,'confidence':.7,'confidence_type':'heuristic support'})
    assert owner.get('/api/live-review-alerts').status_code==403
    item=next(e for e in reviewer.get('/api/live-review-alerts').json()['items'] if e['id']==result)
    assert item['title']==TITLE and 'snapshot_jpeg' not in item
    with application.state.db.connect() as con:
        assert application.state.db.verify_audit(con)['valid']


def test_reprocessing_keeps_original_live_exchange_when_new_model_is_unavailable(application,login,tmp_path):
    from backend.pipeline import run_ffmpeg
    path=tmp_path/'retained.mp4'
    run_ffmpeg(['-f','lavfi','-i','color=lime:size=160x120:rate=15','-t','3','-c:v','libx264',str(path)])
    client=login('citizen')
    response=client.post('/api/cases/upload',data={'title':'Preserved finding integration fixture','consent':'true'},files={'file':('retained.mp4',path.read_bytes(),'video/mp4')})
    ident=response.json()['id']
    provenance={'finding':{'kind':'visual_exchange','flagged':True,'start_rtp':45000,'end_rtp':180000,
        'detail':'Synthetic retained exchange observation.','confidence':.7,
        'boxes':[{'rtp':180000,'xyxy':[.1,.2,.3,.4],'label':'Synthetic object'}]},'replay':{'start_rtp':0}}
    with application.state.db.transaction() as con:
        artifact=application.state.storage.put(con,ident,'live_finding',json.dumps(provenance).encode(),'application/json','original_stream_provenance')
    application.state.processor.process(ident)
    case=login('supervisor').get('/api/cases/'+ident).json()
    assert case['processing_status']=='partial' and case['assessment']['exchange']['status']=='preserved_only'
    event=next(e for e in case['events'] if e['kind']=='visual_exchange')
    assert event['start']==.5 and event['end']==2 and event['boxes'][0]['seconds']==2
    assert artifact in event['references'] and event['source'].startswith('preserved-')
    assert any(e['id']==artifact for e in case['evidence'])
    assert case['alerts'][0]['kind']=='visual_exchange'
