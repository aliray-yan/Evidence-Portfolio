import { useEffect,useRef,useState,type DragEvent } from 'react';
import { Link,useNavigate,useParams } from 'react-router-dom';
import { getProject,type Project } from '../../api/projects';
import { analyzeBlueprint,getBlueprintFileUrl,listBlueprints,uploadBlueprint,type Blueprint } from '../../api/blueprints';
import { saveFloorPlan } from '../../api/floorPlans';
import { LOCAL_MODE } from '../../api/config';
import { PanZoomViewer } from '../../components/shared/PanZoomViewer';
import { Icon } from '../../components/shared/Icon';
import { assertFloorPlan } from '../../utils/planValidation';
import { parseDimensionInput } from '../../utils/dimensionInput';
import { toMarlas } from '../../utils/plotArea';
import type { LengthUnit } from '../../types/floorPlan';
import './BlueprintUpload.css';
export function BlueprintUpload(){const {id}=useParams();return id?<Workspace key={id} projectId={id}/>:<p>Missing project.</p>;}
function Workspace({projectId}:{projectId:string}) {
  const [project,setProject]=useState<Project|null>(null),[blueprint,setBlueprint]=useState<Blueprint|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[analyzing,setAnalyzing]=useState(false),[drag,setDrag]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  const [width,setWidth]=useState(''),[length,setLength]=useState(''),[unit,setUnit]=useState<LengthUnit>('ft'),[engine,setEngine]=useState<'enhanced'|'basic'>('enhanced');
  const input=useRef<HTMLInputElement>(null),navigate=useNavigate();
  useEffect(()=>{let active=true;Promise.all([getProject(projectId),listBlueprints(projectId)]).then(([p,b])=>{if(active){setProject(p);setBlueprint(b[0]??null);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[projectId,refresh]);
  useEffect(()=>{if(blueprint?.processingStatus!=='processing')return;const t=setTimeout(()=>setRefresh(v=>v+1),1800);return()=>clearTimeout(t);},[blueprint]);
  async function fileSelected(file:File) {
    if(busy||analyzing)return;const json=file.name.toLowerCase().endsWith('.json'),max=LOCAL_MODE?3:20;
    if(!json&&!['image/png','image/jpeg','application/pdf'].includes(file.type)){setError('Choose a PNG, JPG, PDF or editable plan JSON.');return;}
    if(file.size>max*1024*1024){setError('File limit is '+max+' MB in this workspace.');return;}
    setBusy(true);setError('');
    try{if(json){const p:unknown=JSON.parse(await file.text());assertFloorPlan(p);await saveFloorPlan(projectId,p);navigate('/projects/'+projectId+'/floor-plan');}else{await uploadBlueprint(projectId,file);setRefresh(v=>v+1);}}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function analyze() {
    if(!blueprint||analyzing)return;setAnalyzing(true);setError('');
    try{const w=parseDimensionInput(width,unit),l=parseDimensionInput(length,unit);if((w&&w>500)||(l&&l>500))throw new Error('Plot sides cannot exceed 500 metres.');await analyzeBlueprint(projectId,blueprint.id,w,{engine,plotLengthMeters:l});setRefresh(v=>v+1);}catch(e){setError((e as Error).message);setRefresh(v=>v+1);}finally{setAnalyzing(false);}
  }
  function drop(e:DragEvent){e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)void fileSelected(f);}
  let area:string|undefined;try{const w=parseDimensionInput(width,unit),l=parseDimensionInput(length,unit);if(w&&l)area=toMarlas(w*l).toFixed(2)+' marla at 272.25 sq ft per marla';}catch{/* Partial typing is handled when analysis is requested. */}
  if(loading)return <p className="loading-state">Opening your project…</p>;
  if(!project)return <div className="empty-state"><h3>{error||'Project not found.'}</h3><Link to="/">Back to projects</Link></div>;
  const processing=analyzing||blueprint?.processingStatus==='processing';
  return <div className="workspace"><div className="page-heading"><div><Link className="tiny-label" to="/">← MY PROJECTS</Link><h1>{project.name}</h1><p>{project.description||'Bring in the architectural drawing, then check its dimensions before building your model.'}</p></div><Link className="secondary-button" to={'/projects/'+projectId+'/floor-plan'}><Icon name="home" size={16}/>Open 2D editor<Icon name="arrow" size={16}/></Link></div>
    <div className="steps"><Link className="active" to={'/projects/'+projectId}>01 · Blueprint</Link><span>→</span><Link to={'/projects/'+projectId+'/floor-plan'}>02 · Floor plan</Link><span>→</span><Link to={'/projects/'+projectId+'/walkthrough'}>03 · Walkthrough</Link></div>
    {error&&<p role="alert" className="error-message">{error}</p>}
    <div className="upload-layout"><section className="upload-main"><div className="section-heading"><div><h2>{blueprint?'Your original drawing':'Accuracy starts with the drawing.'}</h2><p>Room labels and dimensions are kept for review, alongside editable geometry.</p></div></div>
      <input ref={input} hidden type="file" accept=".png,.jpg,.jpeg,.pdf,.json" disabled={busy||processing} onChange={e=>{const f=e.target.files?.[0];if(f)void fileSelected(f);e.target.value='';}}/>
      {blueprint?<div className="workspace__preview"><div className="workspace__preview-meta"><span><Icon name="layers" size={16}/>{blueprint.originalFilename}</span><span className={'workspace__status-badge '+blueprint.processingStatus}>{processing?'processing':blueprint.processingStatus}</span></div>
        <PanZoomViewer>{blueprint.mimeType==='application/pdf'?<iframe title="Blueprint preview" src={getBlueprintFileUrl(projectId,blueprint.id)} width={800} height={1035}/>:<img src={getBlueprintFileUrl(projectId,blueprint.id)} alt="Uploaded architectural drawing" draggable={false}/>}</PanZoomViewer>
        <div className="analysis-config"><h3>Read the drawing</h3><label>Analysis method<select aria-label="Analysis method" value={engine} onChange={e=>setEngine(e.target.value as 'enhanced'|'basic')} disabled={processing}><option value="enhanced">Dimension-aware · OCR + wall pairs</option>{LOCAL_MODE&&<option value="basic">Basic outline · no text reading</option>}</select></label>
          <p>{engine==='enhanced'?'Reads room labels and feet/inches or metric dimensions, isolates structural wall pairs, and flags uncertain readings. The local analysis service runs without a database.':'Basic outline ignores dimension text and can misread annotations. Use only for a rough outline and calibrate manually.'}</p>
          <div className="analysis-dimensions"><label>Dimension units<select value={unit} onChange={e=>setUnit(e.target.value as LengthUnit)}><option value="ft">Feet / inches</option><option value="m">Metres</option><option value="cm">Centimetres</option></select></label><label>Overall plot width (optional)<input aria-label="Overall plot width" type="text" placeholder={unit==='ft'?'40′1½″ or 40.125':'Leave empty to read labels'} value={width} onChange={e=>setWidth(e.target.value)} disabled={processing}/></label><label>Overall plot length (optional)<input aria-label="Overall plot length" type="text" placeholder={unit==='ft'?'70′ or 70':'Leave empty to read labels'} value={length} onChange={e=>setLength(e.target.value)} disabled={processing}/></label></div>
          {area&&<p className="analysis-area">{area}</p>}<p>Leave the sizes blank to read dimension labels. If a label is too small or crossed by a line, enter its known value; the app will flag other uncertain measurements. Analysis replaces the editable plan, so export existing edits first.</p>
          <button className="primary-button" onClick={analyze} disabled={processing}>{processing?'Reading walls and dimensions…':blueprint.processingStatus==='completed'?'Analyze drawing again':'Analyze blueprint'}<Icon name="arrow" size={16}/></button>
          {blueprint.processingStatus==='completed'&&<p className="analysis-complete">Draft ready. Review dimensions and proposed openings in the editor before treating the layout as accurate.</p>}
        </div><button className="secondary-button" onClick={()=>input.current?.click()} disabled={busy||processing}><Icon name="upload" size={14}/>{busy?'Uploading…':'Replace drawing / import JSON'}</button>
      </div>:<button className={'workspace__dropzone '+(drag?'is-dragging':'')} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={drop} onClick={()=>input.current?.click()} disabled={busy}><span className="upload-icon"><Icon name="upload" size={27}/></span><strong>{busy?'Uploading…':'Drop your architectural plan here'}</strong><span>or <u>browse files</u></span><small>PNG, JPG, PDF or plan JSON · Up to {LOCAL_MODE?3:20} MB</small></button>}
      <div className="upload-next"><div><span className="tiny-label">CHECK, THEN EXPLORE</span><h3>Every component stays editable.</h3><p>Doors, windows, furniture, wall colors, orientations and dimensions.</p></div><Link className="primary-button" to={'/projects/'+projectId+'/floor-plan'}>Open drawing board<Icon name="arrow" size={16}/></Link></div>
    </section><aside className="upload-guide"><span className="tiny-label">DRAWINGS WITH REAL DIMENSIONS</span><h3>Measure from the plan.<br/>Keep assumptions visible.</h3><div className="guide-item"><span>01</span><div><h4>Separate walls from notes</h4><p>Sheet borders, dimension arrows, section crosses and beams should not become full-height walls.</p></div></div><div className="guide-item"><span>02</span><div><h4>Use the printed sizes</h4><p>Readable room dimensions constrain footprints. Unreadable fractions or curved boundaries remain flagged for review.</p></div></div><div className="guide-item"><span>03</span><div><h4>Review proposed elements</h4><p>Furniture and unconfirmed windows are suggestions. Confirm door candidates and edit each component in 3D.</p></div></div><Link className="text-link" to="/reference">Compare your supplied plan<Icon name="arrow" size={16}/></Link></aside></div>
  </div>;
}
