import {api,post} from './api';

export type LiveSession={id:string;owner_id:string;title:string;created_at:string;status:string;stop_reason:string;test_recording:boolean};
export type Finding={epoch?:string;arrivalTiming?:string;id:string;seq:number;kind:string;created_at:string;category:string;snapshot_jpeg?:string;snapshot_rtp?:number;snapshot_width?:number;snapshot_height?:number;flagged:boolean;start_rtp:number;end_rtp:number;start_seconds?:number;end_seconds?:number;confidence?:number;confidence_type?:string;detail:string;inference_seconds:number;result_latency_seconds:number;case_id?:string;boxes?:{rtp:number;xyxy:[number,number,number,number];label:string}[];segments?:{id:string;start_rtp:number;end_rtp:number;text:string;uncertain:boolean}[];events?:{title:string;detail:string;references:string[]}[]};
export type StreamStatus={available:boolean;error:string;published:boolean;analysis:Record<string,any>};
export const rtpDelta=(value:number,origin:number)=>((value-origin+2147483648)>>>0)-2147483648;
export function timing(result:Pick<Finding,'start_rtp'|'end_rtp'>,rtp?:number){
 if(rtp===undefined)return 'unknown';
 if(rtpDelta(rtp,result.end_rtp)>0)return 'late';
 return rtpDelta(rtp,result.start_rtp)>=0?'aligned':'ahead';
}
export function boxesAt(results:Finding[],rtp?:number){return rtp===undefined?[]:results.flatMap(r=>r.boxes||[]).filter(b=>b.rtp===rtp&&b.xyxy.length===4&&b.xyxy.every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&b.xyxy[2]>b.xyxy[0]&&b.xyxy[3]>b.xyxy[1]);}

export async function gathered(pc:RTCPeerConnection){
 if(pc.iceGatheringState==='complete')return;
 await new Promise<void>((resolve,reject)=>{
  const done=()=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',change);};
  const change=()=>{if(pc.iceGatheringState==='complete'){done();resolve();}};
  const timer=window.setTimeout(()=>{done();reject(new Error('Camera connection timed out. Check that both devices use the same Wi-Fi.'));},8000);
  pc.addEventListener('icegatheringstatechange',change);
 });
}

export class LiveConnection{
 pc=new RTCPeerConnection({iceServers:[]});stream:MediaStream|null=null;key='';closed=false;
 timer:ReturnType<typeof setTimeout>|undefined;buffer=2500;
 constructor(public id:string,public direction:'publish'|'view',private feedback:(state:string)=>void){}
 setBuffer(milliseconds:number){
  this.buffer=Math.max(0,Math.min(4000,milliseconds));let supported=true;
  for(const receiver of this.pc.getReceivers()){
   if('jitterBufferTarget' in receiver)(receiver as RTCRtpReceiver&{jitterBufferTarget:number}).jitterBufferTarget=this.buffer;
   else supported=false;
  }
  return supported;
 }
 async start(video:HTMLVideoElement){
  try{
   if(this.direction==='publish'){
    this.stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640,max:1280},height:{ideal:360,max:720},frameRate:{ideal:15,max:30},facingMode:{ideal:'environment'}},audio:false});
    if(this.closed){this.stream.getTracks().forEach(t=>t.stop());return;}
    video.srcObject=this.stream;
    this.stream.getTracks().forEach(track=>{this.pc.addTrack(track,this.stream!);track.onended=()=>{this.feedback('Camera permission ended. Reconnect to resume.');void this.close();};});
   }else{
    this.pc.addTransceiver('video',{direction:'recvonly'});
    const remote=new MediaStream();video.srcObject=remote;
    this.pc.ontrack=event=>{remote.addTrack(event.track);this.setBuffer(this.buffer);void video.play().catch(()=>this.feedback('Press play to start the live picture.'));};
   }
   const codecs=RTCRtpSender.getCapabilities('video')?.codecs.filter(c=>c.mimeType.toLowerCase()==='video/h264');
   if(!codecs?.length)throw new Error('This browser cannot publish the required H.264 stream. Try current Chrome on Android.');
   this.pc.getTransceivers().filter(t=>t.receiver.track.kind==='video').forEach(t=>t.setCodecPreferences(codecs));
   this.pc.onconnectionstatechange=()=>{
    if(this.closed)return;
    if(this.pc.connectionState==='connected')this.feedback('Connected');
    if(['failed','disconnected'].includes(this.pc.connectionState)){this.feedback('Stream interrupted. Reconnect the camera or viewer.');void this.close();}
   };
   this.setBuffer(this.buffer);
   await this.pc.setLocalDescription(await this.pc.createOffer());await gathered(this.pc);
   if(this.closed)return;
   const response=await api<{sdp:string;connection:string}>(`/live/${this.id}/transport/${this.direction}`,{method:'POST',headers:{'Content-Type':'application/sdp'},body:this.pc.localDescription!.sdp,signal:AbortSignal.timeout(20000)});
   this.key=response.connection;
   if(this.closed){await api(`/live/${this.id}/connections/${this.key}`,{method:'DELETE'});return;}
   await this.pc.setRemoteDescription({type:'answer',sdp:response.sdp});
   video.playbackRate=1;await video.play().catch(()=>{});
   const heartbeat=async()=>{if(this.closed)return;try{await post(`/live/${this.id}/connections/${this.key}/heartbeat`);}catch(e){this.feedback((e as Error).message);await this.close();return;}this.timer=setTimeout(heartbeat,3000);};
   void heartbeat();
  }catch(e){await this.close();throw e;}
 }
 async close(){
  if(this.closed)return;this.closed=true;clearTimeout(this.timer);this.pc.close();this.stream?.getTracks().forEach(t=>t.stop());
  if(this.key)await api(`/live/${this.id}/connections/${this.key}`,{method:'DELETE'}).catch(()=>{});
 }
}
