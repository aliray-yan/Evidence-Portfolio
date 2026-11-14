import io
import json
import time
from pathlib import Path
from types import SimpleNamespace
import numpy as np
import pytest
from backend.stream_timing import clip_tensor,rtp_delta,PacketRing
from backend.stream_analysis import StreamAnalysis
from backend.db import now


def test_sampling_and_clock_wrap():
    assert rtp_delta(100,2**32-96)==196
    frames=[{'seconds':i/15,'rtp':(2**32-100+i*6000)%2**32,'rgb':np.full((128,171,3),i,dtype=np.uint8)} for i in range(75)]
    tensor,samples,error=clip_tensor(frames,0,5)
    assert tensor.shape==(3,16,112,112) and tensor.flags.c_contiguous
    expected=np.linspace(0,74,16).round().astype(int)
    assert samples==[frames[i]['rtp'] for i in expected]
    assert error<=1/30+.001
    with pytest.raises(ValueError):clip_tensor(frames[:14],0,5)
    with pytest.raises(ValueError):clip_tensor(frames[:20]+frames[40:],0,5)
    with pytest.raises(ValueError):clip_tensor(frames[20:],0,5)
    with pytest.raises(ValueError):clip_tensor(frames[:-10],0,5)
    with pytest.raises(ValueError):clip_tensor(frames,0,1)


def test_ring_is_bounded_by_time_and_memory():
    ring=PacketRing(max_bytes=10,max_seconds=2)
    for i in range(10):ring.append({'data':b'abcd','received':i})
    assert ring.bytes==8 and len(ring.items)==2
    ring.append({'data':b'a','received':20})
    assert ring.bytes==1 and len(ring.items)==1
    ring.clear();assert ring.bytes==0


def test_actual_original_h264_can_be_replayed_without_inference(tmp_path):
    import av
    from backend.pipeline import run_ffmpeg
    path=tmp_path/'source.h264'
    run_ffmpeg(['-f','lavfi','-i','testsrc2=size=320x240:rate=15','-t','6','-c:v','libx264','-preset','ultrafast','-tune','zerolatency','-g','15','-f','h264',str(path)])
    ring=PacketRing()
    origin=time.time()-6
    with av.open(str(path)) as container:
        for i,p in enumerate(container.demux(video=0)):
            if not p.size:continue
            ring.append({'data':bytes(p),'kind':'video','received':origin+i/15,'ntp':origin+i/15,'rtp':i*6000,'key':p.is_keyframe,'config':container.streams.video[0].codec_context.extradata or b'', 'width':320,'height':240})
    audio=tmp_path/'microphone.ogg'
    run_ffmpeg(['-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','6','-c:a','libopus',str(audio)])
    with av.open(str(audio)) as container:
        for p in container.demux(audio=0):
            if not p.size or p.pts is None or p.pts<0:continue
            stamp=origin+float(p.pts*p.time_base)
            ring.append({'data':bytes(p),'kind':'audio','received':stamp,'ntp':stamp,'rtp':p.pts,'channels':1})
    data,meta=ring.replay(96000,420000)
    assert meta['start_rtp']<=96000 and meta['duration']>=3.6
    with av.open(io.BytesIO(data)) as replay:
        frames=list(replay.decode(video=0))
        assert len(frames)>50 and frames[0].width==320 and frames[0].height==240
    assert meta['audio']
    with av.open(io.BytesIO(data)) as replay:
        samples=list(replay.decode(audio=0))
        assert sum(f.samples for f in samples)>3*48000


def test_encrypted_results_require_reviewer_and_preserve_audit(application,login):
    owner,reviewer=login('citizen'),login('supervisor')
    # End only this test account's older sessions in the shared fixture.
    with application.state.db.transaction() as con:
        con.execute("UPDATE live_sessions SET status='ended' WHERE owner_id='demo-citizen'")
    ident=owner.post('/api/live',json={'title':'Stream privacy verification','consent':True}).json()['id']
    engine=application.state.streaming
    reader=StreamAnalysis(engine,ident,{'id':'demo-citizen'})
    result=reader.result('violence',{'flagged':True,'start_rtp':10,'end_rtp':20,'detail':'sensitive fixture phrase'})
    with engine.db.connect() as con:
        assert 'sensitive fixture phrase' not in con.execute('SELECT payload FROM live_results WHERE id=?',(result,)).fetchone()[0]
    assert owner.get(f'/api/live/{ident}/results').status_code==403
    assert reviewer.get(f'/api/live/{ident}/results').json()['items'][0]['id']==result
    assert owner.get(f'/api/live/{ident}/results/{result}/replay').status_code==403
    assert reviewer.get(f'/api/live/{ident}/results/{result}/replay').status_code==410
    with engine.db.connect() as con:assert engine.db.verify_audit(con)['valid']


def test_queue_replaces_whole_windows_instead_of_accumulating(application):
    reader=StreamAnalysis(application.state.streaming,'unused',{'id':'demo-citizen'})
    for i in range(4):reader.enqueue(reader.vision_queue,{'window':i},'skipped_video_windows')
    assert reader.vision_queue.qsize()==1 and reader.vision_queue.get()['window']==3
    assert reader.snapshot()['skipped_video_windows']==3


def test_replay_expires_even_when_camera_stops():
    ring=PacketRing(max_seconds=60)
    ring.append({'data':b'packet','received':100})
    ring.expire(at=161)
    assert not ring.items and ring.bytes==0


def test_live_has_no_audio_analysis_lane(application):
    reader=StreamAnalysis(application.state.streaming,'unused',{'id':'demo-citizen'})
    assert not hasattr(reader,'speech') and not hasattr(reader,'audio_queue')
    assert 'speech' not in reader.snapshot()
    assert reader.exchange_queue.maxsize==1


def test_exchange_latency_is_bounded_and_informs_buffer_without_waiting_playback(application):
    reader=StreamAnalysis(application.state.streaming,'unused',{'id':'demo-citizen'})
    assert reader.exchange_latencies.maxlen==120 and reader.exchange_inferences.maxlen==120
    reader.exchange_latencies.extend([.4]*120)
    reader.exchange_inferences.extend([.2]*120)
    state=reader.snapshot()
    assert state['exchange_latency_p95_seconds']==.4
    assert state['exchange_inference_p95_seconds']==.2
    assert state['recommended_buffer_ms']==2000
    reader.exchange_latencies.extend([8.]*120)
    assert reader.snapshot()['recommended_buffer_ms']==4000


def test_learned_queue_absorbs_one_source_second_and_discards_oldest_when_full(application):
    from types import SimpleNamespace
    from dataclasses import replace
    engine=SimpleNamespace(processor=application.state.streaming.processor,
                           config=replace(application.state.config,learned_exchange_model='unit-fixture'))
    reader=StreamAnalysis(engine,'unused',{'id':'demo-citizen'})
    assert reader.exchange_queue.maxsize==4
    for i in range(6):reader.enqueue(reader.exchange_queue,{'sample':i},'skipped_exchange_frames')
    assert [reader.exchange_queue.get()['sample'] for _ in range(4)]==[2,3,4,5]
    assert reader.snapshot()['skipped_exchange_frames']==2
    assert reader.snapshot()['exchange_queue_capacity']==4


def test_transport_role_boundaries_and_logout_revoke_leases(application,login,monkeypatch):
    from backend.security import token_hash
    engine=application.state.streaming
    monkeypatch.setattr(type(engine),'available',property(lambda self:True))
    owner,reviewer,other=login('citizen'),login('supervisor'),login('officer')
    with engine.db.transaction() as con:con.execute("UPDATE live_sessions SET status='ended' WHERE owner_id='demo-citizen'")
    ident=owner.post('/api/live',json={'title':'Transport permission fixture','consent':True}).json()['id']
    assert owner.post(f'/api/live/{ident}/transport/view',content='v=0\r\n').status_code==403
    assert reviewer.post(f'/api/live/{ident}/transport/publish',content='v=0\r\n').status_code==403
    assert other.post(f'/api/live/{ident}/transport/publish',content='v=0\r\n').status_code==404
    assert reviewer.post(f'/api/live/{ident}/transport/view',content='not an SDP').status_code==415
    engine.leases['test-lease']={'session_id':ident,'direction':'view','actor':'demo-supervisor','token':token_hash(reviewer.cookies.get('sentinel_session')),'seen':time.monotonic(),'location':''}
    assert owner.post(f'/api/live/{ident}/connections/test-lease/heartbeat').status_code==404
    assert reviewer.post(f'/api/live/{ident}/connections/test-lease/heartbeat').status_code==200
    reviewer.post('/api/auth/logout');engine.sweep()
    assert 'test-lease' not in engine.leases
