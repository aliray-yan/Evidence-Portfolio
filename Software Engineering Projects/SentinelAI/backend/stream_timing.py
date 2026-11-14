"""Source-clock sampling, bounded original packet retention, and replay muxing."""
from collections import deque
from fractions import Fraction
import io
import math
import threading
import time
import numpy as np
from sentinel_ml.video import PREPROCESS


def rtp_delta(value, origin):
    return ((int(value)-int(origin)+2**31) % 2**32)-2**31


def clip_tensor(frames, start, end):
    """Same 16 RGB samples / resize / crop / normalization as trained weights.

    Frames are already resized to 171x128 RGB by the receive thread. Selection
    uses presentation times instead of assuming the network has constant FPS.
    """
    if len(frames)<16 or not 4.5 <= end-start <= 5.5:
        raise ValueError('A complete five-second window with at least 16 decoded frames is required.')
    times=np.array([f['seconds'] for f in frames])
    if not np.isfinite(times).all() or np.any(np.diff(times)<=0) or np.max(np.diff(times))>.5:
        raise ValueError('Video timing is discontinuous; this window cannot be assessed reliably.')
    if times[0]<start-.001 or times[0]-start>.15 or end-times[-1]>.15 or times[-1]>=end:
        raise ValueError('The beginning or end of this five-second window is missing; no score was inferred.')
    targets=np.linspace(times[0],times[-1],PREPROCESS['frames'])
    indices=np.abs(times[:,None]-targets[None,:]).argmin(axis=0)
    values=np.stack([frames[i]['rgb'][8:120,29:141] for i in indices]).astype(np.float32)/255
    values=(values-np.array(PREPROCESS['mean'],np.float32))/np.array(PREPROCESS['std'],np.float32)
    return np.ascontiguousarray(values.transpose(3,0,1,2)),[int(frames[i]['rtp']) for i in indices],float(np.max(np.abs(times[indices]-targets)))


class PacketRing:
    """Original encoded units, capped by both time and bytes, only in RAM."""
    def __init__(self,max_bytes=24*1024*1024,max_seconds=60):
        self.items=deque();self.bytes=0;self.max_bytes=max_bytes;self.max_seconds=max_seconds
        self.lock=threading.Lock()

    def append(self,item):
        size=len(item['data'])
        if size>self.max_bytes:return
        with self.lock:
            self.items.append(item);self.bytes+=size
            while self.items and (self.bytes>self.max_bytes or item['received']-self.items[0]['received']>self.max_seconds):
                self.bytes-=len(self.items.popleft()['data'])

    def clear(self):
        with self.lock:self.items.clear();self.bytes=0

    def expire(self,at=None):
        cutoff=(time.time() if at is None else at)-self.max_seconds
        with self.lock:
            while self.items and self.items[0]['received']<cutoff:
                self.bytes-=len(self.items.popleft()['data'])

    def replay(self,start_rtp,end_rtp):
        import av
        self.expire()
        with self.lock:items=list(self.items)
        video=[p for p in items if p['kind']=='video']
        keys=[p for p in video if p.get('key') and -10 <= rtp_delta(p['rtp'],start_rtp)/90000 <= 0]
        if not keys:raise ValueError('The replay keyframe has expired or is not yet available.')
        first=keys[-1]
        video=[p for p in video if rtp_delta(p['rtp'],first['rtp'])>=0 and rtp_delta(p['rtp'],end_rtp)<=0]
        if len(video)<2:raise ValueError('This replay interval is incomplete.')
        if rtp_delta(end_rtp,video[-1]['rtp'])/90000>.15:
            raise ValueError('The end of this replay interval has not arrived or contains a source gap.')
        if any(p.get('bridge_dropped',0)!=first.get('bridge_dropped',0) for p in video):
            raise ValueError('The retained interval contains a transport gap. Preserve another interval.')
        # Browser H264 has no B-frames. MP4 remuxing preserves the compressed
        # original; it does not run the violence model or re-encode the picture.
        output=io.BytesIO()
        container=av.open(output,'w',format='mp4',options={'movflags':'frag_keyframe+empty_moov'})
        stream=container.add_stream('h264',rate=15)
        stream.width=int(first.get('width',640));stream.height=int(first.get('height',360))
        stream.time_base=Fraction(1,90000)
        stream.codec_context.extradata=first.get('config',b'')
        audio=[]
        first_ntp=first.get('ntp',0)
        if first_ntp:
            end_ntp=first_ntp+rtp_delta(video[-1]['rtp'],first['rtp'])/90000
            audio=[p for p in items if p['kind']=='audio' and first_ntp<=p.get('ntp',0)<=end_ntp]
        audio_stream=None
        if audio:
            import struct
            channels=max(1,min(2,int(audio[0].get('channels',2))))
            audio_stream=container.add_stream('opus',rate=48000)
            audio_stream.layout='mono' if channels==1 else 'stereo'
            audio_stream.time_base=Fraction(1,48000)
            audio_stream.codec_context.extradata=b'OpusHead'+bytes([1,channels])+struct.pack('<HIhB',0,48000,0,0)
        packets=[]
        for item in video:
            packet=av.Packet(item['data']);packet.stream=stream
            packet.pts=packet.dts=rtp_delta(item['rtp'],first['rtp']);packet.time_base=Fraction(1,90000);packet.is_keyframe=bool(item.get('key'))
            packets.append((packet.pts/90000,packet))
        if audio_stream:
            for item in audio:
                packet=av.Packet(item['data']);packet.stream=audio_stream
                packet.pts=packet.dts=round((item['ntp']-first_ntp)*48000);packet.time_base=Fraction(1,48000)
                packets.append((packet.pts/48000,packet))
        try:
            for _,packet in sorted(packets,key=lambda pair:pair[0]):container.mux(packet)
        finally:container.close()
        return output.getvalue(),{'start_rtp':first['rtp'],'requested_start_rtp':int(start_rtp),'end_rtp':video[-1]['rtp'],'duration':rtp_delta(video[-1]['rtp'],first['rtp'])/90000,'audio':bool(audio),'clock':90000}
