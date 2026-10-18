import { PCFShadowMap } from 'three';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { getProject, type Project } from '../../api/projects';
import { saveFloorPlan } from '../../api/floorPlans';
import { floorPlanReducer,type FloorPlanAction } from '../../components/floor-plan-2d/floorPlanReducer';
import type { Selection } from '../../components/floor-plan-2d/types';
import { ComponentInspector } from '../../components/shared/ComponentInspector';
import { DimensionReview } from '../../components/shared/DimensionReview';
import { PropertiesPanel } from '../../components/floor-plan-2d/PropertiesPanel';
import { stagePlan,prepareForViewer,makeFurniture } from '../../utils/staging';
import { roomInteriorPoint } from '../../utils/geometry2d';
import { formatPlotArea,squareFeet } from '../../utils/plotArea';
import type { FurnitureKind } from '../../types/floorPlan';
import { getFloorPlan } from '../../api/floorPlans';
import { createEmptyFloorPlan } from '../../components/floor-plan-2d/floorPlanReducer';
import { FloorPlanScene } from '../../components/three-scene/FloorPlanScene';
import { RoomInfoOverlay } from '../../components/three-scene/RoomInfoOverlay';
import { OverviewControls } from '../../components/three-scene/camera/OverviewControls';
import { RoomViewControls } from '../../components/three-scene/camera/RoomViewControls';
import { FirstPersonControls } from '../../components/three-scene/camera/FirstPersonControls';
import { CameraRig } from '../../components/three-scene/camera/CameraRig';
import { sceneCenter, sceneRadius } from '../../components/three-scene/geometry';
import { polygonArea } from '../../utils/geometry2d';
import { checkFloorPlan } from '../../utils/planValidation';
import { downloadBlob } from '../../utils/downloads';
import { Icon } from '../../components/shared/Icon';
import { SceneBoundary } from '../../components/shared/SceneBoundary';
import type { FloorPlan, LengthUnit } from '../../types/floorPlan';
import './Walkthrough.css';
type Mode = 'overview' | 'plan' | 'room' | 'first-person';
export function Walkthrough() { const { id } = useParams(); return id ? <Viewer key={id} projectId={id}/> : <p>Missing project.</p>; }
function Viewer({ projectId }: {
  projectId: string;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<FloorPlan | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('overview');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [displayUnit, setDisplayUnit] = useState<LengthUnit>('m');
  const [locked, setLocked] = useState(false);
  const [touring, setTouring] = useState(false);
  const [cutaway, setCutaway] = useState(true);
  const [furnished, setFurnished] = useState(true);
  const [labels, setLabels] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [presentation, setPresentation] = useState(false);
  const [reset, setReset] = useState(0);
  const [editing,setEditing]=useState(false);
  const [selection,setSelection]=useState<Selection|null>(null);
  const [gizmo,setGizmo]=useState<'translate'|'rotate'>('translate');
  const [editStatus,setEditStatus]=useState<'saved'|'unsaved'|'saving'|'error'>('saved');
  const [historyCount,setHistoryCount]=useState({past:0,future:0});
  const [areaUnit,setAreaUnit]=useState<'marla'|'sqft'|'m2'>('marla');
  const planRef=useRef<FloorPlan|null>(null),past=useRef<FloorPlan[]>([]),future=useRef<FloorPlan[]>([]),revision=useRef(0),saveChain=useRef(Promise.resolve());
  const lockRef = useRef<() => void>(() => { });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const exportRecording = useRef(true);
  useEffect(() => { let active = true; Promise.all([getProject(projectId), getFloorPlan(projectId)]).then(([p, fp]) => { if (active) {
    setProject(p);
    const loaded=fp??createEmptyFloorPlan();
    const staged=prepareForViewer(loaded);
    setPlan(staged);planRef.current=staged;setDisplayUnit(staged.unit);
    if(staged!==loaded)setEditStatus('unsaved');
  } }).catch(e => { if (active)
    setError(e.message); }).finally(() => { if (active)
    setLoading(false); }); return () => { active = false; }; }, [projectId]);
  useEffect(() => () => { exportRecording.current = false; if (recorderRef.current?.state === 'recording')
    recorderRef.current.stop(); streamRef.current?.getTracks().forEach(t => t.stop()); }, []);
  const dispatch=useCallback((action:FloorPlanAction)=>{const current=planRef.current;if(!current)return;const next=floorPlanReducer(current,action);if(next===current)return;past.current=[...past.current.slice(-79),current];future.current=[];setHistoryCount({past:past.current.length,future:0});revision.current++;planRef.current=next;setPlan(next);setEditStatus('unsaved');},[]);
  const save=useCallback(async()=>{const current=planRef.current,version=revision.current;if(!current)return false;setEditStatus('saving');const request=saveChain.current.then(()=>saveFloorPlan(projectId,current));saveChain.current=request.then(()=>{},()=>{});try{await request;setEditStatus(version===revision.current?'saved':'unsaved');setError('');return true;}catch(e){setEditStatus('error');setError((e as Error).message);return false;}},[projectId]);
  useEffect(()=>{if(editStatus!=='unsaved')return;const timer=setTimeout(()=>{void save();},900);return()=>clearTimeout(timer);},[plan,editStatus,save]);
  useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(editStatus!=='saved'){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[editStatus]);
  useEffect(()=>{const handler=(e:MouseEvent)=>{if(editStatus==='saved')return;const a=(e.target as Element).closest?.('a');if(!a||a.hasAttribute('download')||e.ctrlKey||e.metaKey)return;const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname)return;e.preventDefault();e.stopPropagation();void save().then(ok=>{if(ok)location.assign(url.pathname+url.search+url.hash);});};document.addEventListener('click',handler,true);return()=>document.removeEventListener('click',handler,true);},[editStatus,save]);
  function undoEdit(){const previous=past.current.pop();if(!previous||!planRef.current)return;future.current.push(planRef.current);planRef.current=previous;setPlan(previous);revision.current++;setEditStatus('unsaved');setHistoryCount({past:past.current.length,future:future.current.length});setSelection(null);}
  function redoEdit(){const next=future.current.pop();if(!next||!planRef.current)return;past.current.push(planRef.current);planRef.current=next;setPlan(next);revision.current++;setEditStatus('unsaved');setHistoryCount({past:past.current.length,future:future.current.length});setSelection(null);}
  const rooms = useMemo(() => plan?.rooms ?? [], [plan]);
  const room = rooms.find(r => r.id === roomId) ?? null;
  const problems = useMemo(() => plan ? checkFloorPlan(plan).filter(i => i.severity === 'error') : [], [plan]);
  useEffect(() => { if (!touring || !rooms.length)
    return; const timer = setInterval(() => setRoomId(current => rooms[(rooms.findIndex(r => r.id === current) + 1) % rooms.length].id), 7000); return () => clearInterval(timer); }, [touring, rooms]);
  useEffect(() => { if (!recording)
    return; const timer = setInterval(() => setElapsed(v => v + 1), 1000); return () => clearInterval(timer); }, [recording]);
  const registerLock = useCallback((fn: () => void) => { lockRef.current = fn; }, []);
  function changeMode(m: Mode) { setEditing(false);setSelection(null); document.exitPointerLock?.(); setLocked(false); setTouring(false); setMode(m); if (m !== 'overview'&&m!=='plan')
    setRoomId(current => current ?? rooms[0]?.id ?? null); }
  function tour() { document.exitPointerLock?.(); setLocked(false); setMode('room'); setRoomId(rooms[0]?.id ?? null); setTouring(true); }
  function snapshot() { const c = canvasRef.current; if (c)
    c.toBlob(blob => { if (blob)
      downloadBlob(blob, `${project?.name ?? 'home'}-view.png`); }, 'image/png'); }
  function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const c = canvasRef.current;
    if (!c?.captureStream || typeof MediaRecorder === 'undefined') {
      setError('Video recording is unavailable in this browser. Try Chrome or Edge.');
      return;
    }
    try {
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m));
      if (!mime)
        throw new Error('No supported video format was found.');
      const stream = c.captureStream(30);
      streamRef.current = stream;
      exportRecording.current = true;
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000 });
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => { if (e.data.size)
        chunks.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); if (exportRecording.current) {
        downloadBlob(new Blob(chunks, { type: mime }), `${project?.name ?? 'home'}-tour.${mime.includes('mp4') ? 'mp4' : 'webm'}`);
        setRecording(false);
        setTouring(false);
      } };
      recorder.onerror = () => { setError('Recording failed. Try recording again with a shorter tour.'); stream.getTracks().forEach(t => t.stop()); setRecording(false); };
      setEditing(false);setSelection(null);
      recorder.start(1000);
      setElapsed(0);
      setRecording(true);
      setError('');
      tour();
    }
    catch (e) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      setError((e as Error).message);
    }
  }
  if (loading)
    return <p className="loading-state">Preparing your space…</p>;
  if (!project || !plan)
    return <div className="empty-state"><h3>{error || 'Project not found.'}</h3><Link to="/">Back to projects</Link></div>;
  const empty = !plan.walls.length && !plan.rooms.length;
  return <div className={`walkthrough ${presentation ? 'is-presenting' : ''}`}>
  <header className="page-heading"><div><Link className="tiny-label" to={`/projects/${projectId}/floor-plan`}>← {project.name.toUpperCase()}</Link><h1>A new point of view.</h1><p>{rooms.length} spaces <span className="fact-dot">·</span> {areaUnit==='marla'?formatPlotArea(plan):areaUnit==='sqft'?squareFeet(plan.plot.width*plan.plot.length).toFixed(0)+' sq ft plot':(plan.plot.width*plan.plot.length).toFixed(1)+' m² plot'} <span className='fact-dot'>·</span> {plan.metadata.accuracyStatus==='reviewed'?'Layout reviewed':'Check drawing dimensions'}</p></div><button className="secondary-button" onClick={() => setPresentation(v => !v)}>{presentation ? 'Exit presentation' : 'Present your home'}</button></header>
  <div className="steps"><Link to={`/projects/${projectId}`}>01 · Blueprint</Link><span>→</span><Link to={`/projects/${projectId}/floor-plan`}>02 · Floor plan</Link><span>→</span><Link className="active" to={`/projects/${projectId}/walkthrough`}>03 · Walkthrough</Link></div>
  <DimensionReview plan={plan} dispatch={dispatch} unit={displayUnit} initiallyOpen={false}/>
  {error && <p role="alert" className="error-message">{error}</p>}
  {problems.length > 0 && !editing ? <div className="error-message"><strong>Your plan needs a few adjustments before viewing.</strong><ul>{problems.map((p, i) => <li key={i}>{p.message}</li>)}</ul><Link to={`/projects/${projectId}/floor-plan`}>Review the floor plan →</Link></div> : empty ? <div className="empty-state"><Icon name="cube" size={40}/><h3>A little groundwork first.</h3><p>Add walls and rooms to start exploring your home.</p><Link className="primary-button" to={`/projects/${projectId}/floor-plan`}>Open the 2D editor</Link></div> : <>
  <div className="viewer-toolbar"><div className="view-mode">{[{ id: 'overview' as const, label: 'Overview', icon: 'cube' as const }, {id:'plan' as const,label:'Plan view',icon:'grid' as const}, { id: 'room' as const, label: 'Room view', icon: 'home' as const }, { id: 'first-person' as const, label: 'Walk inside', icon: 'play' as const }].map(m => <button key={m.id} className={mode === m.id ? 'is-active' : ''} onClick={() => changeMode(m.id)} disabled={recording || (m.id !== 'overview' && m.id!=='plan' && !rooms.length)}><Icon name={m.icon} size={15}/>{m.label}</button>)}</div><div className="viewer-actions"><button className={editing?'is-editing':''} disabled={recording} onClick={()=>{document.exitPointerLock?.();setTouring(false);setMode('overview');setEditing(v=>!v);setSelection(null);}}>Edit components</button><button title="Download a PNG of this view" onClick={snapshot} disabled={recording}><Icon name="camera" size={16}/><span>Snapshot</span></button><button className={recording ? 'recording' : ''} onClick={toggleRecording} disabled={!rooms.length}><Icon name="video" size={16}/><span>{recording ? `Stop · ${elapsed}s` : 'Record tour'}</span></button></div></div>
  {editing&&<div className='viewer-edit-tools'><span>{editStatus==='saved'?'All changes saved':editStatus==='saving'?'Saving…':editStatus==='error'?'Changes not saved':'Saving soon…'}</span><button onClick={undoEdit} disabled={!historyCount.past}>↶ Undo</button><button onClick={redoEdit} disabled={!historyCount.future}>↷ Redo</button><label>Furniture gizmo<select value={gizmo} onChange={e=>setGizmo(e.target.value as 'translate'|'rotate')}><option value='translate'>Move on floor</option><option value='rotate'>Rotate</option></select></label><select aria-label='Add 3D furniture' defaultValue='' onChange={e=>{if(!e.target.value)return;const target=room??rooms.find(r=>!r.outdoor)??rooms[0];const pos=target?roomInteriorPoint(target.boundary):{x:plan.plot.width/2,y:plan.plot.length/2};const item=makeFurniture(e.target.value as FurnitureKind,pos,target?.id);dispatch({type:'ADD_FURNITURE',item});setSelection({type:'furniture',id:item.id});e.target.value='';}}><option value='' disabled>Add an object…</option>{['bed','sofa','table','chair','cabinet','wardrobe','toilet','basin','plant','car'].map(k=><option key={k} value={k}>{k}</option>)}</select><button onClick={()=>dispatch({type:'REPLACE_ALL',floorPlan:stagePlan(plan)})}>Suggest furniture</button><button onClick={()=>void save()}>Save now</button></div>}
  <div className={`viewer-layout ${editing?'is-editing':''}`}><div className="walkthrough__canvas">
   <SceneBoundary><Canvas shadows={{type:PCFShadowMap}} frameloop={(mode==='overview'||mode==='plan')&&!recording?'demand':'always'} dpr={[1, 1.5]} camera={{ position: [20, 20, 20], fov: 45, near: .05, far: 300 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => { canvasRef.current = gl.domElement; gl.setClearColor('#e9eae4'); }}>
    <CameraRig key={'camera-'+reset} plan={plan} mode={mode} room={room} touring={touring}/>
    <FloorPlanScene floorPlan={plan} cutaway={(mode === 'overview'||mode==='plan') && cutaway} furnished={furnished} labels={(mode === 'overview'||mode==='plan') && labels} selection={editing?selection:null} onSelect={editing?setSelection:undefined} onEdit={editing?dispatch:undefined} gizmo={gizmo}/>
    {(mode === 'overview'||mode==='plan') && <OverviewControls top={mode==='plan'} key={'orbit-'+reset} target={sceneCenter(plan)} radius={sceneRadius(plan)}/>}
    {mode === 'room' && room && !touring && <RoomViewControls key={room.id} room={room}/>}
    {mode === 'first-person' && <FirstPersonControls floorPlan={plan} onLockChange={setLocked} registerLock={registerLock}/>}
   </Canvas></SceneBoundary>
   <span className="viewer-model-badge"><span className="status-dot connected"/>{mode==='plan'?'TOP VIEW · COMPARE LAYOUT':mode === 'overview' ? plan.metadata.analysisEngine==='cv-ocr'?'AUTOMATIC DRAFT · REVIEW DRAWING':plan.metadata.analysisEngine==='reviewed-trace'?'RETRACED MODEL · REVIEW DRAWING':'LIVE 3D MODEL' : touring ? 'GUIDED ROOM TOUR' : mode === 'room' ? '360° ROOM VIEW' : 'FIRST PERSON'}</span>
   {(mode === 'room'||mode === 'first-person') && room && <RoomInfoOverlay room={room} unit={displayUnit}/>}
   {mode === 'first-person' && (locked ? <div className="crosshair"/> : <button className="pointer-lock-prompt" onClick={() => lockRef.current()}>Step inside<small>Click to look · WASD / arrows to move · Esc to release</small></button>)}
   <div className="viewer-hint">{mode === 'overview' ? 'Drag to orbit · Scroll to zoom · Right-drag to pan' : mode==='plan'?'Scroll to zoom · Right-drag to pan': mode === 'room' ? touring ? 'A new room every 7 seconds' : 'Drag to look around' : locked ? 'WASD / arrows to move · Esc to release' : 'Choose a room, then click Step inside'}</div>
   {recording && <span className="recording-indicator">● REC {elapsed}s</span>}
  </div><aside className="viewer-sidebar">{editing&&<div className='viewer-sidebar__section component-section'><label className='object-selector'>Select component<select aria-label='Select 3D component' value={selection?selection.type+':'+selection.id:''} onChange={e=>{const [type,id]=e.target.value.split(':');setSelection(id?{type:type as Selection['type'],id}:null);}}><option value=''>Plan / marla settings</option>{plan.rooms.map(r=><option key={r.id} value={'room:'+r.id}>{r.name} · floor</option>)}{(plan.furniture??[]).map(f=><option key={f.id} value={'furniture:'+f.id}>{f.name}</option>)}{plan.walls.map((w,i)=><option key={w.id} value={'wall:'+w.id}>Wall {i+1}</option>)}{plan.doors.map((o,i)=><option key={o.id} value={'door:'+o.id}>Door {i+1} · {o.source??'manual'}</option>)}{plan.windows.map((o,i)=><option key={o.id} value={'window:'+o.id}>Window {i+1} · {o.source??'manual'}</option>)}{plan.stairs.map((s,i)=><option key={s.id} value={'stair:'+s.id}>Staircase {i+1}</option>)}{plan.columns.map((s,i)=><option key={s.id} value={'column:'+s.id}>Column {i+1}</option>)}</select></label>{selection?<ComponentInspector plan={plan} selection={selection} dispatch={dispatch} unit={displayUnit} onClose={()=>setSelection(null)}/>:<PropertiesPanel floorPlan={plan} selection={null} dispatch={dispatch} displayUnit={displayUnit} onSelectionChange={setSelection} materials={[]}/>}</div>}<div className="viewer-sidebar__section"><span className="tiny-label">MAKE YOURSELF AT HOME</span><h3>Explore your spaces</h3><button className={mode === 'overview' ? 'room-button active' : 'room-button'} disabled={recording} onClick={() => changeMode('overview')}><Icon name="cube" size={16}/><span>Whole home<small>Bird’s-eye perspective</small></span><Icon name="arrow" size={14}/></button>{rooms.map(r => <button key={r.id} className={roomId === r.id && mode !== 'overview' ? 'room-button active' : 'room-button'} disabled={recording} onClick={() => { document.exitPointerLock?.(); setTouring(false); setMode('room'); setRoomId(r.id); }}><Icon name="home" size={16}/><span>{r.name}<small>{polygonArea(r.boundary).toFixed(1)} m²</small></span><Icon name="arrow" size={14}/></button>)}</div>
  <div className="viewer-sidebar__section viewer-options"><span className="tiny-label">THE FINISHING TOUCHES</span>{(mode === 'overview'||mode==='plan') && <><label>Cutaway walls<input type="checkbox" checked={cutaway} onChange={e => setCutaway(e.target.checked)}/></label><label>Room labels<input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)}/></label></>}<label>Illustrative furnishings<input type="checkbox" checked={furnished} onChange={e => setFurnished(e.target.checked)}/></label><label>Plot area units<select value={areaUnit} onChange={e=>setAreaUnit(e.target.value as 'marla'|'sqft'|'m2')}><option value='marla'>Marla</option><option value='sqft'>Square feet</option><option value='m2'>Square metres</option></select></label><label>Marla size<select value={plan.plot.marlaSquareFeet??272.25} onChange={e=>dispatch({type:'SET_MARLA',squareFeet:Number(e.target.value)})}><option value={272.25}>272.25 sq ft</option><option value={225}>225 sq ft</option><option value={250}>250 sq ft</option>{![272.25,225,250].includes(plan.plot.marlaSquareFeet??272.25)&&<option value={plan.plot.marlaSquareFeet}>{plan.plot.marlaSquareFeet} sq ft</option>}</select></label><label>Display units<select value={displayUnit} onChange={e => setDisplayUnit(e.target.value as LengthUnit)}><option value="m">Metres</option><option value="ft">Feet</option><option value="cm">Centimetres</option><option value="in">Inches</option></select></label><button className="secondary-button" onClick={() => { setTouring(false); setReset(v => v + 1); }} disabled={recording}>Reset camera</button></div>
  <div className="viewer-tour-card"><Icon name="play" size={22}/><h3>Let your home lead the way.</h3><p>A guided look around every room.</p><button className="primary-button" disabled={!rooms.length || recording} onClick={() => touring ? setTouring(false) : tour()}>{touring ? 'Pause tour' : 'Start room tour'}<Icon name="arrow" size={15}/></button></div></aside></div>
  <div className="viewer-footnote"><span>Click Edit components to change individual colors, dimensions and orientation. Proposed items require review.</span><span>Single-level visualization</span></div>
  </>}
  <p className="walkthrough__disclaimer">For design visualization. Check measurements and use approved architectural drawings for construction.</p>
 </div>;
}
