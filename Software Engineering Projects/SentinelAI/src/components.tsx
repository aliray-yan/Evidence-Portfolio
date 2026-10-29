import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown, ArrowRight, Check, ChevronLeft, ChevronRight, CircleAlert, FileSearch, LoaderCircle, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { api } from './api';
import { Case, dateTime, statusLabel } from './types';

export function useResource<T=any>(path: string, interval=0) {
  const [data,setData] = useState<T|null>(null), [error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  useEffect(()=>{ const abort=new AbortController(); setLoading(true);setError('');setData(null);
    const load=()=>api<T>(path,{signal:abort.signal}).then(v=>{setData(v);setError('');}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    load(); const timer=interval?window.setInterval(load,interval):undefined;
    return ()=>{abort.abort();if(timer)clearInterval(timer);};
  },[path,revision,interval]);
  return {data,error,loading,reload:()=>setRevision(r=>r+1)};
}
export function RiskBadge({label,score}:{label:string;score?:number|null}) { return <span className={`badge risk-${label.toLowerCase().replaceAll(' ','-')}`}><span className="risk-dot"/>{label}{score!=null&&<span className="badge-score">{score}</span>}</span>; }
export function Status({value}:{value:string}){return <span className={`status status-${value}`}>{statusLabel(value)}</span>;}
export function Source({synthetic}:{synthetic?:boolean}){return synthetic?<span className="source-label">Synthetic</span>:<span className="source-label real">Uploaded</span>;}
export function PageTitle({title,description,children}:{title:string;description:string;children?:ReactNode}){return <header className="page-title"><div><h1>{title}</h1><p>{description}</p></div><div className="page-actions">{children}</div></header>;}
export function Empty({title='No records found',children,action}:{title?:string;children:ReactNode;action?:ReactNode}){return <div className="empty"><FileSearch size={30}/><h3>{title}</h3><p>{children}</p>{action}</div>;}
export function ErrorPanel({message,retry}:{message:string;retry?:()=>void}){return <div className="error-panel" role="alert"><CircleAlert size={20}/><div><strong>Something needs attention</strong><p>{message}</p></div>{retry&&<button className="button secondary" onClick={retry}><RefreshCw size={15}/>Retry</button>}</div>;}
export function Skeleton(){return <div className="skeleton" aria-label="Loading records" role="status"><div/><div/><div/><div/></div>;}
export function Notice({children,tone='info'}:{children:ReactNode;tone?:string}){return <div className={`notice ${tone}`}><ShieldCheck size={18}/><div>{children}</div></div>;}
export function Panel({title,children,action,className=''}:{title:string;children:ReactNode;action?:ReactNode;className?:string}){return <section className={`panel ${className}`}><div className="panel-heading"><h2>{title}</h2>{action}</div>{children}</section>;}
export function CaseTable({cases,compact=false}:{cases:Case[];compact?:boolean}){const location=useLocation();return <div className="table-scroll"><table className="case-table"><thead><tr><th>Case / interaction</th><th>Risk assessment</th>{!compact&&<th>Status</th>}<th>Location</th>{!compact&&<th>Reviewer</th>}<th><span className="sr-only">Open case</span></th></tr></thead><tbody>{cases.map(c=><tr key={c.id}><td><Link className="case-title" to={'/cases/'+c.id} state={{from:location.pathname+location.search}}>{c.title}</Link><div className="table-meta"><span className="mono">{c.id}</span><Source synthetic={c.synthetic}/><span>{dateTime(c.created_at).split(',')[0]}</span></div></td><td><RiskBadge label={c.risk_label} score={c.risk_score}/>{compact&&<small className="table-sub">{statusLabel(c.status)}</small>}</td>{!compact&&<td><Status value={c.status}/></td>}<td>{c.location||<span className="muted">Not provided</span>}</td>{!compact&&<td>{c.assigned_name||'Unassigned'}</td>}<td><Link className="icon-button" to={'/cases/'+c.id} state={{from:location.pathname+location.search}} aria-label={'Open '+c.title}><ArrowRight size={17}/></Link></td></tr>)}</tbody></table></div>;}
export function Pagination({page,total,size,onChange}:{page:number;total:number;size:number;onChange:(n:number)=>void}){return <div className="pagination"><span>{total?`${(page-1)*size+1}–${Math.min(page*size,total)} of ${total} records`:'0 records'}</span><div><button className="icon-button" aria-label="Previous page" disabled={page<=1} onClick={()=>onChange(page-1)}><ChevronLeft size={17}/></button><span>Page {page}</span><button className="icon-button" aria-label="Next page" disabled={page*size>=total} onClick={()=>onChange(page+1)}><ChevronRight size={17}/></button></div></div>;}
export function Confirm({open,title,children,onClose,onConfirm,busy=false,label='Confirm action'}:{open:boolean;title:string;children:ReactNode;onClose:()=>void;onConfirm:()=>void;busy?:boolean;label?:string}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(open&&!ref.current?.open)ref.current?.showModal();if(!open&&ref.current?.open)ref.current.close();},[open]);
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><div className="dialog-head"><h2 id="dialog-title">{title}</h2><button disabled={busy} onClick={onClose} className="icon-button" aria-label="Close dialog"><X size={20}/></button></div><div className="dialog-body">{children}</div><div className="dialog-actions"><button className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="button" disabled={busy} onClick={onConfirm}>{busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>} {busy?'Saving…':label}</button></div></dialog>;
}
export function DownloadReport({id}:{id:string}) {return <details className="report-menu"><summary className="button secondary"><ArrowDown size={16}/>Export report</summary><div className="dropdown"><a href={`/api/cases/${id}/report?format=html`}>Printable report (HTML)</a><a href={`/api/cases/${id}/report?format=json`}>Structured evidence (JSON)</a><p>Exports are permission checked and audited.</p></div></details>;}
