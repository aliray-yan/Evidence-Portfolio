import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { BlueprintUpload } from './pages/BlueprintUpload/BlueprintUpload';
import { FloorPlanEditor } from './pages/FloorPlanEditor/FloorPlanEditor';
import { Reference } from './pages/Reference/Reference';
import { Samples } from './pages/Samples/Samples';
import { Link } from 'react-router-dom';
// Three.js + React Three Fiber + Drei are a meaningful chunk of the total
// bundle (see the build's own >500kB chunk-size notice, present since
// Phase 6) and only the walkthrough page needs them — splitting it out
// keeps the Dashboard/upload/editor pages fast to load.
const Walkthrough = lazy(() => import('./pages/Walkthrough/Walkthrough').then((module) => ({ default: module.Walkthrough })));
function App() {
  return (<BrowserRouter>
   <Routes>
    <Route element={<AppLayout />}>
     <Route path="/" element={<Dashboard />}/>
     <Route path="/samples" element={<Samples />}/>
    <Route path='/reference' element={<Reference/>}/>
     <Route path="/projects/:id" element={<BlueprintUpload />}/>
     <Route path="/projects/:id/floor-plan" element={<FloorPlanEditor />}/>
     <Route path="/projects/:id/walkthrough" element={<Suspense fallback={<p className="walkthrough__status">Loading 3D viewer…</p>}>
        <Walkthrough />
       </Suspense>}/>
     <Route path="*" element={<div className="empty-state"><h1>Page not found</h1><Link to="/">Back to your projects →</Link></div>}/>
    </Route>
   </Routes>
  </BrowserRouter>);
}
export default App;
