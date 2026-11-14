import { api } from './api';

export type UploadSession = {id:string; received:number; total:number; chunk_size:number; state:string; case_id:string|null; duplicate:boolean; expires_at:string};
export type UploadResult = {id:string; duplicate:boolean};
type Callbacks = {signal:AbortSignal; onProgress:(value:number)=>void; onPhase:(value:string)=>void; onSession:(value:UploadSession)=>void};

export async function uploadEvidence(file:File, metadata:Record<string,unknown>, callbacks:Callbacks):Promise<UploadResult> {
  const {signal,onProgress,onPhase,onSession}=callbacks;
  if(!crypto.subtle) throw new Error('Secure uploads require HTTPS or localhost. Open the trusted SentinelAI address and try again.');
  onPhase('Checking the recording…');
  const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  signal.throwIfAborted();
  const sha256=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  let session=await api<UploadSession>('/uploads',{method:'POST',signal,body:JSON.stringify({metadata,extension:file.name.toLowerCase().endsWith('.webm')?'.webm':'.mp4',size:file.size,sha256})});
  onSession(session);
  onProgress(Math.floor(session.received/session.total*100));
  if(session.state==='completed'&&session.case_id) return {id:session.case_id,duplicate:!!session.duplicate};
  onPhase(session.received?'Resuming upload…':'Uploading evidence…');
  while(session.received<session.total){
    const offset=session.received;
    session=await api<UploadSession>(`/uploads/${session.id}?offset=${offset}`,{method:'PUT',signal,headers:{'Content-Type':'application/octet-stream'},body:file.slice(offset,offset+session.chunk_size)});
    onSession(session);
    onProgress(Math.floor(session.received/session.total*100));
  }
  onPhase('Verifying the complete recording…');
  return api<UploadResult>(`/uploads/${session.id}/complete`,{method:'POST',signal,body:'{}'});
}
