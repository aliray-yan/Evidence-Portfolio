import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { useAuthStore } from './store/authStore';
import AlertDetail from './pages/AlertDetail';
import Alerts from './pages/Alerts';
import CaseDetail from './pages/CaseDetail';
import Cases from './pages/Cases';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Playbooks from './pages/Playbooks';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ThreatIntel from './pages/ThreatIntel';

function ProtectedRoute() {
  const session = useAuthStore((state) => state.session);
  if (!session?.access_token) return <Navigate to="/login" replace />;
  return <MainLayout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/alerts/:id" element={<AlertDetail />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/threat-intel" element={<ThreatIntel />} />
          <Route path="/playbooks" element={<Playbooks />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
