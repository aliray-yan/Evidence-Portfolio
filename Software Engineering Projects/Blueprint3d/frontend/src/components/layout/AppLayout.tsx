import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { fetchHealth } from '../../api/health';
import { LOCAL_MODE } from '../../api/config';
import { Icon } from '../shared/Icon';
import './AppLayout.css';
export function AppLayout() {
  const [online, setOnline] = useState(false);
  const location = useLocation();
  const projectId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1];
  useEffect(() => { if (LOCAL_MODE)
    return; let active = true; fetchHealth().then(h => { if (active)
    setOnline(h.database === 'connected'); }).catch(() => { }); return () => { active = false; }; }, []);
  return <div className="app-layout">
  <aside className="app-layout__sidebar">
   <Link className="app-layout__brand" to="/"><span className="brand-mark"><Icon name="cube" size={27}/></span><span>blueprint<span className="brand-3d">3d</span><small>SPACES, REIMAGINED.</small></span></Link>
   <div className="nav-label">WORKSPACE</div>
   <nav aria-label="Main navigation"><NavLink to="/" end><Icon name="grid"/> My projects</NavLink><NavLink to="/samples"><Icon name="layers"/> Sample plans <span className="nav-count">4</span></NavLink>
    <NavLink to='/reference'><Icon name='home'/> Your blueprint</NavLink>
    {projectId && <><div className="nav-label">CURRENT PROJECT</div><NavLink to={`/projects/${projectId}`} end><Icon name="upload"/> Blueprint</NavLink><NavLink to={`/projects/${projectId}/floor-plan`}><Icon name="home"/> 2D editor</NavLink><NavLink to={`/projects/${projectId}/walkthrough`}><Icon name="cube"/> 3D walkthrough</NavLink></>}
   </nav>
   <div className="sidebar-note"><span className="tiny-label">FROM PAPER TO POSSIBILITY</span><Icon name="home" size={30}/><p>Your next home.<br />Before the first brick.</p><Link to="/samples">Explore a sample <Icon name="arrow" size={16}/></Link></div>
   <div className="workspace-mode"><span className={`status-dot ${LOCAL_MODE || online ? 'connected' : ''}`}/><div>{LOCAL_MODE ? 'Local workspace' : online ? 'Server connected' : 'Server unavailable'}<small>{LOCAL_MODE ? 'Saved in this browser' : 'PostgreSQL workspace'}</small></div></div>
  </aside>
  <div className="app-layout__main"><header className="app-layout__topbar"><span>Workspace <span className="crumb-divider">/</span> {location.pathname === '/samples' ? 'Sample library' : projectId ? 'Project studio' : 'My projects'}</span><span className="topbar-right"><span className="status-dot connected"/> Design studio <span className="avatar">AR</span></span></header><main className="app-layout__content"><Outlet /></main><footer className="app-layout__footer">Built for a better sense of home.<span>Blueprint3D · Design visualization</span></footer></div>
 </div>;
}
