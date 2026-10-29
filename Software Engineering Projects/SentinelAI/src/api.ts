let csrf = '';
export const setCsrf = (value: string) => { csrf = value; };
export const getCsrf = () => csrf;
export class ApiError extends Error { constructor(public status: number,message: string) { super(message); } }
export function errorText(value: any) {
  if (Array.isArray(value?.detail)) return value.detail.map((e:any)=>`${e.loc?.slice(1).join(' ')}: ${e.msg}`).join('. ');
  return typeof value?.detail === 'string' ? value.detail : 'The request could not be completed. Please try again.';
}
export async function api<T=any>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch('/api'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,...options.headers}}); }
  catch (e) { if ((e as Error).name==='AbortError') throw e; throw new ApiError(0,'Connection lost. Check that the SentinelAI server is running, then retry.'); }
  const data = await response.json().catch(()=>({}));
  if (!response.ok) { if(response.status===401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('session-expired')); throw new ApiError(response.status,errorText(data)); }
  return data;
}
export const post = <T=any>(path: string,body: unknown = {}) => api<T>(path,{method:'POST',body:JSON.stringify(body)});
