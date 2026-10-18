import { AlertTriangle, BarChart3, BookOpenCheck, FileText, Home, Search, Settings, Shield, TicketCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cx } from '../../utils/helpers';

const nav = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/cases', label: 'Cases', icon: TicketCheck },
  { to: '/threat-intel', label: 'Threat Intel', icon: Search },
  { to: '/playbooks', label: 'Playbooks', icon: BookOpenCheck },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export default function Sidebar({ collapsed }) {
  return (
    <aside className={cx('hidden border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-950 lg:block', collapsed ? 'w-16' : 'w-64')}>
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
          <Shield className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">SecureOps</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">SOC Workbench</p>
          </div>
        ) : null}
      </div>
      <nav className="space-y-1 px-2 py-4">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cx(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                collapsed && 'justify-center px-0'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed ? <span>{item.label}</span> : null}
          </NavLink>
        ))}
      </nav>
      {!collapsed ? (
        <div className="mx-3 mt-4 rounded-lg border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="mb-2 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
            <BarChart3 className="h-4 w-4" />
            Free-tier mode
          </div>
          API enrichment is cached for 24 hours to preserve quotas.
        </div>
      ) : null}
    </aside>
  );
}
