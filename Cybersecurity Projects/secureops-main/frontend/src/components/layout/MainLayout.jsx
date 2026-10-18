import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { API_BASE_URL } from '../../services/api';
import { useUIStore } from '../../store/uiStore';
import { cx } from '../../utils/helpers';

export default function MainLayout() {
  const { session, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode } = useUIStore();
  const wsUrl = session?.access_token
    ? `${API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')}/api/v1/ws/alerts`
    : null;
  const wsProtocols = session?.access_token ? ['secureops.jwt', session.access_token] : undefined;

  useWebSocket(wsUrl, {
    alert_created: (alert) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`New ${alert.source} alert: ${alert.title}`);
    },
    alert_updated: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  }, wsProtocols);

  return (
    <div className={cx(darkMode && 'dark')}>
      <div className="flex min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <Sidebar collapsed={sidebarCollapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header user={user} onToggleSidebar={toggleSidebar} onToggleDark={toggleDarkMode} darkMode={darkMode} onLogout={() => logout.mutate()} />
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
