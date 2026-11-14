"""Bounded, independent analysis of the original H264/Opus source stream.

No MediaRecorder uploads and no completed file is required for inference.
RTP is the video presentation clock. Audio packets are ignored by analysis.
"""
import base64
from collections import deque
from fractions import Fraction
import json
import math
import queue
import subprocess
import threading
import time
import numpy as np
from .config import ROOT
from .db import now, uid
from .stream_timing import PacketRing, clip_tensor, rtp_delta
from .exchange_adapter import configured as exchange_configured, sample_hz, create_exchange


class FrameCadence:
    """Source-time cadence without cumulative rounding drift at 15/30 camera fps."""
    def __init__(self, hz):
        self.period = 1 / hz
        self.next = None

    def take(self, seconds):
        if self.next is None:
            self.next = seconds
        if seconds + 1e-6 < self.next:
            return False
        steps = max(1, math.floor((seconds - self.next + 1e-6) / self.period) + 1)
        self.next += steps * self.period
        return True


class StreamAnalysis:
    def __init__(self, engine, ident, actor):
        self.engine, self.ident, self.actor = engine, ident, dict(actor)
        self.processor = engine.processor
        self.stop_event = threading.Event()
        self.lock = threading.RLock()
        self.ring = PacketRing()
        # One source second of learned samples absorbs short fight-inference
        # bursts without discarding the temporal history after one missed frame.
        # Overflow still replaces the oldest sample; it never stretches time.
        exchange_capacity = 4 if getattr(engine.config, 'learned_exchange_model', '') else 1
        self.vision_queue, self.exchange_queue = queue.Queue(1), queue.Queue(exchange_capacity)
        self.process = None
        self.started = time.monotonic()
        self.stopped_at = None
        self.video_anchor = None
        self.video_origin = None
        self.latencies = deque(maxlen=120)
        self.exchange_latencies = deque(maxlen=120)
        self.exchange_inferences = deque(maxlen=120)
        import psutil
        self.host_process=psutil.Process()
        self.host_process.cpu_percent()
        self.resource_at=0
        self.resource_stats={}
        self.epoch=uid('clock_')
        self.state = {'status':'connecting', 'detail':'Waiting for source packets.', 'decoded_frames':0,
            'decode_errors':0, 'bridge_dropped':0, 'skipped_video_windows':0, 'skipped_exchange_frames':0,
            'video_windows':0, 'exchange_frames':0,
            'vision':'waiting' if engine.config.violence_model else 'unavailable',
            'exchange':'waiting' if exchange_configured(engine.config) else 'unavailable',
            'exchange_sample_hz': sample_hz(engine.config),
            'exchange_queue_capacity': exchange_capacity,
            'exchange_method': 'learned windows' if getattr(engine.config, 'learned_exchange_model', '') else 'temporal rules',
            'scope':'Five-second fight/nonfight classification; no violence boxes, identity or guilt inference. Visual exchanges are experimental review indicators; no currency or bribery confirmation. No audio inference.'}

    def start(self):
        self.processor.live_active.set()
        for target, name in ((self.receive,'receive'),(self.vision,'vision'),(self.exchange,'exchange')):
            threading.Thread(target=target, name='stream-'+name, daemon=True).start()

    def stop(self):
        self.stop_event.set()
        if self.process and self.process.poll() is None:
            self.process.terminate()
        self.stopped_at = self.stopped_at or time.monotonic()
        self.processor.live_active.clear()
        with self.lock:self.state['status']='stopped'

    def snapshot(self):
        if time.monotonic()-self.resource_at>=1:
            import psutil
            memory=psutil.virtual_memory()
            self.resource_stats={'backend_rss_mb':round(self.host_process.memory_info().rss/1024**2,1),
                'backend_cpu_percent':round(self.host_process.cpu_percent()/psutil.cpu_count(),1),
                'system_ram_percent':memory.percent,'system_available_mb':round(memory.available/1024**2,1)}
            self.resource_at=time.monotonic()
        with self.lock:
            value = dict(self.state)
            value.update(ring_bytes=self.ring.bytes, elapsed_seconds=round(time.monotonic()-self.started,2),
                video_pending=self.vision_queue.qsize(), exchange_pending=self.exchange_queue.qsize(),epoch=self.epoch,resources=self.resource_stats)
            if self.latencies:
                value['vision_latency_p95_seconds']=round(float(np.percentile(self.latencies,95)),3)
                # This is a recommendation, never a promise to finish before playback.
                value['recommended_buffer_ms']=min(4000,max(2000,round(np.percentile(self.latencies,95)*1000+500)))
            if self.exchange_latencies:
                value['exchange_latency_p95_seconds']=round(float(np.percentile(self.exchange_latencies,95)),3)
                value['exchange_inference_p95_seconds']=round(float(np.percentile(self.exchange_inferences,95)),3)
                value['recommended_buffer_ms']=min(4000,max(value.get('recommended_buffer_ms',2000),
                    round(np.percentile(self.exchange_latencies,95)*1000+500)))
        return value

    def result(self, kind, payload):
        if self.stop_event.is_set():return
        ident=uid('lr_')
        payload.update(id=ident,kind=kind,created_at=now(),clock_rate=90000,epoch=self.epoch,source='original_webrtc_stream')
        encrypted=self.engine.storage.cipher.encrypt(json.dumps(payload,allow_nan=False).encode()).decode()
        with self.engine.db.transaction() as con:
            con.execute('INSERT INTO live_results(id,session_id,kind,payload,created_at) VALUES (?,?,?,?,?)',
                        (ident,self.ident,kind,encrypted,payload['created_at']))
            if payload.get('flagged'):
                self.engine.db.audit(con,None,'stream.finding',self.ident,{'result':ident,'kind':kind,'human_review_required':True})
        return ident

    def enqueue(self, target, item, counter):
        try:target.put_nowait(item)
        except queue.Full:
            try:target.get_nowait()
            except queue.Empty:pass
            with self.lock:self.state[counter]+=1
            target.put_nowait(item)

    def receive(self):
        import av
        import cv2
        binary=ROOT/'.local/tools/sentinel-stream-bridge.exe'
        decoder=av.CodecContext.create('h264','r')
        decoder.thread_count=1
        cv2.setNumThreads(1)
        frames=[]; cadence=FrameCadence(sample_hz(self.engine.config))
        origin=None; window_start=0.; video_ssrc=None; last_drop=0
        need_key=True
        try:
            # WHIP returns before ICE and publication are fully ready.
            for attempt in range(20):
                if self.stop_event.is_set():return
                self.process=subprocess.Popen([str(binary)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,
                    creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
                url=f'rtsp://sentinel:{self.engine.password}@127.0.0.1:{self.engine.rtsp_port}/{self.ident}'
                self.process.stdin.write((json.dumps({'url':url})+'\n').encode());self.process.stdin.close()
                first=self.process.stdout.readline(3*1024*1024)
                if first:break
                self.process.wait(timeout=2)
                self.stop_event.wait(.5)
            else:raise ValueError('The original stream could not be opened for analysis.')
            def units():
                yield first
                while not self.stop_event.is_set():
                    line=self.process.stdout.readline(3*1024*1024)
                    if not line:return
                    yield line
            for raw in units():
                item=json.loads(raw)
                item['data']=base64.b64decode(item['data'],validate=True)
                item['config']=base64.b64decode(item.get('config',''),validate=True)
                dropped=item.get('bridge_dropped',0)
                if dropped!=last_drop:
                    frames=[];need_key=True
                    decoder=av.CodecContext.create('h264','r')
                    decoder.thread_count=1
                    with self.lock:self.state['bridge_dropped']=dropped
                    last_drop=dropped
                if item['kind']=='video':
                    if video_ssrc is not None and video_ssrc!=item['ssrc']:
                        raise ValueError('The source clock changed. Restart the camera session to establish a new timeline.')
                    video_ssrc=item['ssrc']
                    if origin is None:
                        origin=item['rtp'];self.video_origin=origin
                    seconds=rtp_delta(item['rtp'],origin)/90000
                    if item['ntp']:
                        self.video_anchor=(item['ntp'],item['rtp'])
                    if need_key and not item['key']:continue
                    if item['key']:
                        need_key=False
                        if item['config']:decoder.extradata=item['config']
                    packet=av.Packet(item['data']);packet.pts=packet.dts=rtp_delta(item['rtp'],origin);packet.time_base=Fraction(1,90000)
                    try:decoded=decoder.decode(packet)
                    except av.FFmpegError:
                        with self.lock:self.state['decode_errors']+=1
                        frames=[];need_key=True;continue
                    for frame in decoded:
                        if frame.width>1280 or frame.height>720:raise ValueError('Live analysis accepts cameras up to 1280 × 720.')
                        pts=int(frame.pts) if frame.pts is not None else packet.pts
                        frame_seconds=pts/90000
                        frame_rtp=(origin+pts)%(2**32)
                        item.update(width=frame.width,height=frame.height)
                        if frame_seconds>=window_start+5:
                            closed_windows=math.floor(frame_seconds/5)-math.floor(window_start/5)
                            if frames and self.engine.config.violence_model:
                                self.enqueue(self.vision_queue,{'frames':frames,'start':window_start,'end':window_start+5,
                                    'completed_at':time.monotonic(),'received':item['received']},'skipped_video_windows')
                            if self.engine.config.violence_model:
                                with self.lock:self.state['skipped_video_windows']+=max(0,closed_windows-(1 if frames else 0))
                            frames=[];window_start=math.floor(frame_seconds/5)*5
                        original_rgb=frame.to_ndarray(format='rgb24')
                        if exchange_configured(self.engine.config) and cadence.take(frame_seconds):
                            exchange_rgb=original_rgb
                            if not getattr(self.engine.config,'learned_exchange_model',''):
                                eh,ew=original_rgb.shape[:2]
                                exchange_rgb=cv2.resize(original_rgb,(min(640,ew),max(1,round(eh*min(1,640/ew)))))
                            self.enqueue(self.exchange_queue,{'rgb':exchange_rgb,'seconds':frame_seconds,'rtp':frame_rtp,'received':time.monotonic()},'skipped_exchange_frames')
                        rgb=cv2.resize(original_rgb,(171,128),interpolation=cv2.INTER_LINEAR)
                        frames.append({'seconds':frame_seconds,'rtp':frame_rtp,'rgb':rgb})
                        # Bound even a malformed or frozen source clock.
                        if len(frames)>180:raise ValueError('Source timing exceeded the bounded live frame window.')
                        with self.lock:
                            self.state.update(status='receiving',detail='Original video stream; vision-only analysis does not delay playback.',
                                decoded_frames=self.state['decoded_frames']+1,last_video_rtp=frame_rtp,last_video_seconds=round(frame_seconds,3))
                else:
                    # Even an older client sending audio cannot activate ASR.
                    continue
                self.ring.append(item)
            if not self.stop_event.is_set():raise ValueError('The original stream disconnected; analysis stopped.')
        except Exception as exc:
            with self.lock:
                self.state.update(status='failed',detail=str(exc) if isinstance(exc,ValueError) else 'Stream decoding failed. Check the local bridge and codec; reconnect the camera.')
        finally:
            if self.process and self.process.poll() is None:self.process.terminate()

    def vision(self):
        while not self.stop_event.is_set():
            try:item=self.vision_queue.get(timeout=.5)
            except queue.Empty:continue
            try:
                tensor,samples,error=clip_tensor(item['frames'],item['start'],item['end'])
                import torch
                with self.processor.vision_lock:
                    if self.processor.vision is None:
                        from .vision import LocalViolence
                        self.processor.vision=LocalViolence(self.engine.config.violence_model)
                    torch.set_num_threads(2)
                    model=self.processor.vision
                    started=time.monotonic()
                    with torch.inference_mode():score=float(model.model(torch.from_numpy(tensor).unsqueeze(0)).softmax(1)[0,1])
                    if not math.isfinite(score):raise ValueError('The model returned a nonfinite score.')
                    inference=time.monotonic()-started
                latency=time.monotonic()-item['completed_at']
                flagged=score>=model.manifest['threshold']
                self.result('violence',{'category':'possible_physical_conflict' if flagged else 'below_model_threshold',
                    'flagged':flagged,'confidence':score,'confidence_type':'uncalibrated clip score',
                    'threshold':model.manifest['threshold'],'model':model.manifest['version'],'sha256':model.manifest['sha256'],
                    'start_rtp':samples[0],'end_rtp':samples[-1],'start_seconds':item['start'],'end_seconds':item['end'],
                    'sampled_rtp':samples,'sampling_error_seconds':error,'inference_seconds':inference,
                    'result_latency_seconds':latency,'boxes':[],
                    'detail':'Five-second clip classification. Exact action frame and spatial location are unknown. A below-threshold score is not proof of safety.'})
                with self.lock:
                    self.latencies.append(latency)
                    self.state.update(vision='running',video_windows=self.state['video_windows']+1,last_inference_seconds=round(inference,3))
                    self.state.pop('vision_error',None)
            except Exception as exc:
                with self.lock:
                    self.state.update(vision='degraded',vision_error=str(exc) if isinstance(exc,ValueError) else 'The configured model could not finish this window.')
                    self.state['skipped_video_windows']+=1

    def exchange(self):
        from .visual_exchange import ExchangeTracker,TITLE
        import cv2
        tracker=None
        while not self.stop_event.is_set():
            try:item=self.exchange_queue.get(timeout=.5)
            except queue.Empty:continue
            try:
                started=time.monotonic()
                with self.processor.exchange_lock:
                    if self.processor.exchange is None:
                        self.processor.exchange=create_exchange(self.engine.config)
                    if tracker is None:
                        tracker=self.processor.exchange.new_tracker() if hasattr(self.processor.exchange,'new_tracker') else ExchangeTracker()
                    findings,coverage=self.processor.exchange.frame(item['rgb'],item['seconds'],tracker,item['rtp'])
                inference=time.monotonic()-started
                for finding in findings:
                    ok,jpeg=cv2.imencode('.jpg',cv2.cvtColor(item['rgb'],cv2.COLOR_RGB2BGR),[cv2.IMWRITE_JPEG_QUALITY,75])
                    if not ok:raise ValueError('The visual evidence snapshot could not be encoded.')
                    self.result('visual_exchange',{'category':'possible_visual_exchange','title':TITLE,'flagged':True,
                        'start_rtp':finding['frames'][0]['rtp'],'end_rtp':item['rtp'],
                        'start_seconds':finding['start'],'end_seconds':finding['end'],
                        'confidence':finding['confidence'],'confidence_type':finding['confidence_type'],
                        'boxes':finding['boxes'],'detail':finding['detail'],'currency_identified':False,
                        'human_review_required':True,'model':self.processor.exchange.identity,
                        'inference_source':finding.get('source','visual-transfer-rules-v1'),
                        'threshold':finding.get('threshold'),
                        'sampled_rtp':[f['rtp'] for f in finding['frames']],
                        'sampled_seconds':[f['seconds'] for f in finding['frames']],
                        'snapshot_jpeg':base64.b64encode(jpeg).decode(),'snapshot_rtp':item['rtp'],
                        'snapshot_width':item['rgb'].shape[1],'snapshot_height':item['rgb'].shape[0],
                        'inference_seconds':inference,'result_latency_seconds':time.monotonic()-item['received']})
                with self.lock:
                    self.exchange_latencies.append(time.monotonic()-item['received'])
                    self.exchange_inferences.append(inference)
                    self.state.update(exchange='experimental',exchange_frames=self.state['exchange_frames']+1,
                        exchange_last_inference_seconds=round(inference,3),exchange_coverage=coverage)
                    self.state.pop('exchange_error',None)
            except Exception:
                if tracker is not None:tracker.reset()
                with self.lock:
                    self.state.update(exchange='degraded',exchange_error='Visual exchange analysis could not finish this sample. Check the selected local detector; no negative finding was inferred.')
                    self.state['skipped_exchange_frames']+=1
