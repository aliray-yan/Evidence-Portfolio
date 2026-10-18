import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProject, type Project } from '../../api/projects';
import { getFloorPlan, saveFloorPlan, validateFloorPlan, type ValidationIssue } from '../../api/floorPlans';
import { getBlueprintFileUrl, listBlueprints, type Blueprint } from '../../api/blueprints';
import { listMaterials, type Material } from '../../api/materials';
import { createEmptyFloorPlan, floorPlanReducer, type FloorPlanAction } from '../../components/floor-plan-2d/floorPlanReducer';
import { FloorPlanCanvas } from '../../components/floor-plan-2d/FloorPlanCanvas';
import { PropertiesPanel } from '../../components/floor-plan-2d/PropertiesPanel';
import { Toolbar } from '../../components/floor-plan-2d/Toolbar';
import { PanZoomViewer } from '../../components/shared/PanZoomViewer';
import { DimensionReview } from '../../components/shared/DimensionReview';
import { formatLength } from '../../utils/units';
import { stagePlan } from '../../utils/staging';
import { Icon } from '../../components/shared/Icon';
import { downloadPlan } from '../../utils/downloads';
import { assertFloorPlan, checkFloorPlan } from '../../utils/planValidation';
import type { Selection, Tool } from '../../components/floor-plan-2d/types';
import type { FloorPlan, LengthUnit } from '../../types/floorPlan';
import '../../components/floor-plan-2d/floor-plan-2d.css';
export function FloorPlanEditor() { const { id } = useParams(); return id ? <Editor key={id} projectId={id}/> : <p>Missing project.</p>; }
function Editor({ projectId }: {
  projectId: string;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [plan, rawDispatch] = useReducer(floorPlanReducer, createEmptyFloorPlan());
  const [tool, setTool] = useState<Tool>('select');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [unit, setUnit] = useState<LengthUnit>('m');
  const [showSource,setShowSource]=useState(false);
  const [status, setStatus] = useState<'loading' | 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('loading');
  const [error, setError] = useState('');
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [tab, setTab] = useState('properties');
  const [validating, setValidating] = useState(false);
  const [viewBusy, setViewBusy] = useState(false);
  const [historyCount, setHistoryCount] = useState({ past: 0, future: 0 });
  const past = useRef<FloorPlan[]>([]);
  const future = useRef<FloorPlan[]>([]);
  const planRef = useRef(plan);
  const revision = useRef(0);
  const saveChain = useRef(Promise.resolve());
  const navigate = useNavigate();
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => { let active = true; Promise.all([getProject(projectId), getFloorPlan(projectId), listBlueprints(projectId), listMaterials()]).then(([p, fp, b, m]) => { if (!active)
    return; setProject(p); if (fp) {
    assertFloorPlan(fp);
    setUnit(fp.unit);
    rawDispatch({ type: 'REPLACE_ALL', floorPlan: fp });
    planRef.current = fp;
  } setBlueprint(b[0] ?? null); setMaterials(m); setStatus('idle'); }).catch(e => { if (active) {
    setError(e.message);
    setStatus('error');
  } }); return () => { active = false; }; }, [projectId]);
  const dispatch = useCallback((action: FloorPlanAction) => { const current = planRef.current; const next = floorPlanReducer(current, action); if (next === current)
    return; past.current = [...past.current.slice(-79), current]; future.current = []; setHistoryCount({ past: past.current.length, future: 0 }); planRef.current = next; revision.current++; rawDispatch({ type: 'REPLACE_ALL', floorPlan: next }); setStatus('unsaved'); setIssues(null); }, []);
  function undo() { const previous = past.current.pop(); if (!previous)
    return; future.current.push(planRef.current); setHistoryCount({ past: past.current.length, future: future.current.length }); planRef.current = previous; revision.current++; rawDispatch({ type: 'REPLACE_ALL', floorPlan: previous }); setSelection(null); setStatus('unsaved'); setIssues(null); }
  function redo() { const next = future.current.pop(); if (!next)
    return; past.current.push(planRef.current); setHistoryCount({ past: past.current.length, future: future.current.length }); planRef.current = next; revision.current++; rawDispatch({ type: 'REPLACE_ALL', floorPlan: next }); setSelection(null); setStatus('unsaved'); setIssues(null); }
  const save = useCallback(async () => { const captured = planRef.current, version = revision.current; setStatus('saving'); setError(''); const request = saveChain.current.catch(() => { }).then(() => saveFloorPlan(projectId, captured)); saveChain.current = request.then(() => { }, () => { }); try {
    await request;
    setStatus(revision.current === version ? 'saved' : 'unsaved');
    return true;
  }
  catch (e) {
    setError((e as Error).message);
    setStatus('error');
    return false;
  } }, [projectId]);
  useEffect(() => { if (status !== 'unsaved')
    return; const timer = setTimeout(() => { void save(); }, 1400); return () => clearTimeout(timer); }, [status, plan, save]);
  useEffect(() => { const handler = (e: MouseEvent) => { if (status !== 'unsaved' && status !== 'saving' && status !== 'error')
    return; const a = (e.target as Element)?.closest('a'); if (!a || a.hasAttribute('download') || a.target === '_blank' || e.ctrlKey || e.metaKey)
    return; const url = new URL(a.href, window.location.href); if (url.origin !== window.location.origin || url.pathname === window.location.pathname)
    return; e.preventDefault(); e.stopPropagation(); void save().then(ok => { if (ok)
    navigate(url.pathname + url.search + url.hash); }); }; document.addEventListener('click', handler, true); return () => document.removeEventListener('click', handler, true); }, [status, save, navigate]);
  useEffect(() => { const onUnload = (e: BeforeUnloadEvent) => { if (status === 'unsaved' || status === 'saving' || status === 'error') {
    e.preventDefault();
    e.returnValue = '';
  } }; window.addEventListener('beforeunload', onUnload); return () => window.removeEventListener('beforeunload', onUnload); }, [status]);
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    void save();
  }
  else if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey)
      redo();
    else
      undo();
  } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [save]);
  async function view() { const checks = checkFloorPlan(planRef.current); setIssues(checks); if (checks.some(i => i.severity === 'error'))
    return; setViewBusy(true); if (await save())
    navigate(`/projects/${projectId}/walkthrough`);
  else
    setViewBusy(false); }
  async function validate() { setValidating(true); try {
    setIssues(await validateFloorPlan(projectId, planRef.current));
  }
  catch (e) {
    setError((e as Error).message);
  }
  finally {
    setValidating(false);
  } }
  async function importFile(file: File) { try {
    if (file.size > 5 * 1024 * 1024)
      throw new Error('Use a JSON plan smaller than 5 MB.');
    const fp: unknown = JSON.parse(await file.text());
    assertFloorPlan(fp);
    dispatch({ type: 'REPLACE_ALL', floorPlan: fp });
    setSelection(null);
    setError('');
  }
  catch (e) {
    setError(e instanceof SyntaxError ? 'This file is not valid JSON.' : (e as Error).message);
  } }
  if (status === 'loading')
    return <p className="loading-state">Opening your drawing board…</p>;
  if (!project)
    return <div className="empty-state"><h3>{error || 'Project not found.'}</h3><Link to="/">Back to projects</Link></div>;
  const labels = { loading: 'Loading…', idle: 'Ready to edit', unsaved: 'Saving soon…', saving: 'Saving…', saved: 'All changes saved', error: 'Changes not saved' };
  return <div className="editor"><header className="page-heading"><div><Link className="tiny-label" to={`/projects/${projectId}`} onClick={e => { if (status === 'unsaved' || status === 'saving') {
    e.preventDefault();
    void save().then(ok => { if (ok)
      navigate(`/projects/${projectId}`); });
  } }}>← {project.name.toUpperCase()}</Link><h1>Every detail, in its place.</h1><p>Shape your home one wall, one room, one small detail at a time.</p></div><button className="primary-button" onClick={view} disabled={viewBusy || status === 'saving'}><Icon name="cube" size={17}/>{viewBusy ? 'Preparing…' : 'Explore in 3D'}<Icon name="arrow" size={16}/></button></header>
  <div className="editor__project-row"><div className="steps"><Link to={`/projects/${projectId}`}>01 · Blueprint</Link><span>→</span><Link className="active" to={`/projects/${projectId}/floor-plan`}>02 · Floor plan</Link><span>→</span><button onClick={view}>03 · Walkthrough</button></div><span aria-live="polite" className={`save-status save-status--${status}`}><span className="status-dot"/>{labels[status]}</span></div>
  {error && <p role="alert" className="error-message">{error}</p>}
  {plan.metadata.confidence !== undefined && <p className="editor__confidence-banner">{plan.metadata.analysisEngine==='reviewed-trace'?'Retraced reference plan.':plan.metadata.analysisEngine==='browser-structural'?'Basic wall draft.':'Automatic draft.'} Check the plot dimensions, walls, and openings against your original drawing.</p>}
  {plan.metadata.analysisNotes?.map((note, i) => <p key={i} className="editor__analysis-note">{note}</p>)}
  <DimensionReview plan={plan} dispatch={dispatch} unit={unit}/>
  <div className="editor__action-bar"><div className="editor__history"><button disabled={!blueprint||blueprint.mimeType==='application/pdf'||!plan.metadata.imageRegistration} onClick={()=>setShowSource(v=>!v)}>{showSource?'Hide original':'Compare drawing'}</button><button onClick={()=>dispatch({type:'REPLACE_ALL',floorPlan:stagePlan(plan)})}>Suggest furniture</button><button onClick={undo} disabled={!historyCount.past} title="Undo (Ctrl+Z)">↶ Undo</button><button onClick={redo} disabled={!historyCount.future} title="Redo (Ctrl+Shift+Z)">↷ Redo</button></div><div><button onClick={() => importRef.current?.click()}><Icon name="upload" size={14}/>Import JSON</button><input ref={importRef} hidden type="file" accept=".json,application/json" onChange={e => { const f = e.target.files?.[0]; if (f)
    void importFile(f); e.target.value = ''; }}/><button onClick={() => downloadPlan(plan, project.name)}><Icon name="download" size={14}/>Export plan</button><button onClick={validate} disabled={validating}><Icon name="check" size={14}/>{validating ? 'Checking…' : 'Check plan'}</button><button onClick={() => void save()} disabled={status === 'saving'}>Save</button></div></div>
  {issues && <div className="editor__issues">{issues.length ? <ul>{issues.map((i, n) => <li key={n} className={`editor__issue editor__issue--${i.severity}`}><span>{i.severity}</span>{i.message}</li>)}</ul> : <p className="editor__issues-clean"><Icon name="check" size={16}/> Your plan checks out. Ready to explore.</p>}</div>}
  <div className="editor__body"><Toolbar tool={tool} onToolChange={t => { setTool(t); setSelection(null); }} unit={unit} onUnitChange={setUnit}/><div className="editor__drawing"><div className="drawing-title"><span className="tiny-label">GROUND FLOOR</span><span>{formatLength(plan.plot.width,unit)} × {formatLength(plan.plot.length,unit)} <span>·</span> {plan.rooms.length} spaces</span></div><FloorPlanCanvas key={tool} sourceImage={blueprint?getBlueprintFileUrl(projectId,blueprint.id):undefined} showSource={showSource&&blueprint?.mimeType!=='application/pdf'} floorPlan={plan} dispatch={dispatch} tool={tool} selection={selection} onSelectionChange={setSelection}/><div className="drawing-hint">{tool === 'wall' ? 'Click two points to draw a wall. Esc cancels.' : tool === 'room' ? 'Click corners, then click your first point to close the room. Esc cancels.' : 'Click a room or wall to edit. Drag a selected wall’s endpoints to reshape it.'}<span>Grid: 0.5 m · Snap: 0.1 m</span></div></div><aside className="editor__sidebar"><div className="editor__sidebar-tabs"><button className={tab === 'properties' ? 'is-active' : ''} onClick={() => setTab('properties')}>Properties</button><button className={tab === 'blueprint' ? 'is-active' : ''} onClick={() => setTab('blueprint')} disabled={!blueprint}>Reference</button></div>{tab === 'properties' ? <PropertiesPanel floorPlan={plan} dispatch={dispatch} selection={selection} onSelectionChange={setSelection} displayUnit={unit} materials={materials}/> : blueprint && <PanZoomViewer>{blueprint.mimeType === 'application/pdf' ? <iframe title="Original blueprint" src={getBlueprintFileUrl(projectId, blueprint.id)} width={500} height={650}/> : <img src={getBlueprintFileUrl(projectId, blueprint.id)} alt="Original blueprint"/>}</PanZoomViewer>}<div className="editor__tip"><Icon name="layers" size={20}/><h3>Small details. Big difference.</h3><p>Select a wall to add a door or window. Select a room to give it a name and choose its floor finish.</p></div></aside></div>
 </div>;
}
