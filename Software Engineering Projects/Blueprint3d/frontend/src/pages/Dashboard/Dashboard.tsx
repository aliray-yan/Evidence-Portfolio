import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFloorPlan, saveFloorPlan } from '../../api/floorPlans';
import { createProject, listProjects, type Project } from '../../api/projects';
import { SAMPLES } from '../../data/samples';
import { Icon } from '../../components/shared/Icon';
import { SampleCard } from '../../components/shared/SampleCard';
import { PlanIllustration } from '../../components/shared/PlanIllustration';
import { ProjectDialog } from '../../components/shared/ProjectDialog';
import { assertFloorPlan } from '../../utils/planValidation';
import type { FloorPlan } from '../../types/floorPlan';
import './Dashboard.css';
export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<Record<string, FloorPlan | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(false);
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  useEffect(() => { let active = true; listProjects().then(async (ps) => { const result = await Promise.allSettled(ps.map(async (p) => [p.id, await getFloorPlan(p.id)] as const)); if (active) {
    setProjects(ps);
    setPlans(Object.fromEntries(result.flatMap(r => r.status === 'fulfilled' && r.value[1] ? [r.value] : [])));
  } }).catch(e => { if (active)
    setError(e.message); }).finally(() => { if (active)
    setLoading(false); }); return () => { active = false; }; }, []);
  async function importFile(file: File) { setImporting(true); setError(''); try {
    if (file.size > 5 * 1024 * 1024)
      throw new Error('Use a floor-plan JSON smaller than 5 MB.');
    const data: unknown = JSON.parse(await file.text());
    assertFloorPlan(data);
    const p = await createProject({ name: file.name.replace(/\.json$/i, '').replace(/[-_]/g, ' ') });
    await saveFloorPlan(p.id, data);
    navigate(`/projects/${p.id}/floor-plan`);
  }
  catch (e) {
    setError(e instanceof SyntaxError ? 'This file is not valid JSON.' : (e as Error).message);
  }
  finally {
    setImporting(false);
  } }
  const filtered = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="dashboard">
  <div className="page-heading"><div><span className="tiny-label">YOUR DESIGN WORKSPACE</span><h1>Make room for your imagination.</h1><p>Turn a floor plan into a place you can step inside.</p></div><button className="primary-button" onClick={() => setDialog(true)}><Icon name="plus" size={17}/> New project</button></div>
  <section className="dashboard-hero"><div className="dashboard-hero__copy"><span className="hero-eyebrow"><span className="status-dot connected"/> A NEW PERSPECTIVE ON HOME</span><h2>Your floor plan.<br />A whole new dimension.</h2><p>Go beyond lines on paper. Build your space,<br className="desktop-break"/> explore every room, and see it come to life.</p><div className="hero-actions"><button className="primary-button" onClick={() => setDialog(true)}>Bring your plan to life <Icon name="arrow" size={16}/></button><Link className="text-link" to="/samples">Try a sample <Icon name="arrow" size={15}/></Link></div><div className="hero-caption"><Icon name="check" size={13}/> No 3D experience needed</div></div><div className="dashboard-hero__visual"><div className="hero-orbit"/><PlanIllustration plan={SAMPLES[1].plan} isometric/><div className="visual-label"><span className="status-dot connected"/> The family home <span>120 m²</span></div><span className="visual-dimension">FROM 2D TO 3D</span></div></section>
  <div className="workflow-strip">{[{ n: '01', icon: 'upload' as const, title: 'Bring in your plan', text: 'Upload a blueprint or start with a sample.' }, { n: '02', icon: 'home' as const, title: 'Fine-tune your space', text: 'Edit walls, rooms, and the details that matter.' }, { n: '03', icon: 'cube' as const, title: 'Step inside', text: 'Explore in 3D. Save your view or record a tour.' }].map(s => <div key={s.n}><span className="workflow-icon"><Icon name={s.icon} size={20}/></span><div><h3>{s.title}</h3><p>{s.text}</p></div><span className="workflow-number">{s.n}</span></div>)}</div>
  {error && <p role="alert" className="error-message">{error}</p>}
  <div className="section-heading"><div><h2>Your projects <span className="count-pill">{projects.length}</span></h2><p>A home in the making. Pick up where you left off.</p></div><div className="project-tools">{projects.length > 0 && <label className="project-search"><Icon name="search" size={15}/><input aria-label="Search projects" placeholder="Find a project" value={query} onChange={e => setQuery(e.target.value)}/></label>}<button className="secondary-button" onClick={() => importRef.current?.click()} disabled={importing}><Icon name="upload" size={14}/>{importing ? 'Importing…' : 'Import plan'}</button><input ref={importRef} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f)
    void importFile(f); e.target.value = ''; }}/></div></div>
  {loading ? <div className="loading-state">Opening your workspace…</div> : projects.length === 0 ? <div className="project-empty"><div className="project-empty-icon"><Icon name="home" size={27}/></div><div><h3>Your first home starts here.</h3><p>Create a project, import a saved plan, or explore a sample below.</p></div><button className="text-link" onClick={() => setDialog(true)}>Create a project <Icon name="arrow" size={16}/></button></div> : filtered.length === 0 ? <div className="empty-state">No projects match “{query}”.</div> : <div className="project-grid">{filtered.map(p => <Link key={p.id} className="project-card" to={`/projects/${p.id}/floor-plan`}><div className="project-card__visual">{plans[p.id] ? <PlanIllustration plan={plans[p.id]!} isometric/> : <Icon name="home" size={45}/>}<span>{plans[p.id] ? 'READY TO EXPLORE' : 'NEW PROJECT'}</span></div><div className="project-card__body"><h3>{p.name}<Icon name="arrow" size={17}/></h3><p>{p.description || 'Your next space, waiting to take shape.'}</p><small>Edited {new Date(p.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{plans[p.id] && ` · ${plans[p.id]!.rooms.length} spaces`}</small></div></Link>)}</div>}
  <div className="section-heading"><div><h2>Start with a little inspiration.</h2><p>Thoughtfully planned spaces. Yours to explore.</p></div><Link className="text-link" to="/samples">View sample library <Icon name="arrow" size={16}/></Link></div>
  <Link className='reference-banner' to='/reference'><Icon name='home' size={24}/><div><h3>Your supplied architectural plan</h3><p>Open its retraced layout, compare dimensions, and edit every component.</p></div><span>Open reference →</span></Link>
  <div className="sample-grid">{SAMPLES.map(s => <SampleCard key={s.id} sample={s}/>)}</div>
  {dialog && <ProjectDialog onClose={() => setDialog(false)}/>}
 </div>;
}
