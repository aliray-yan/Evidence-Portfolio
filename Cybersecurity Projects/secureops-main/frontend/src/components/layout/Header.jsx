import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import Button from '../common/Button';
import { ROLE_LABELS } from '../../utils/constants';

export default function Header({ user, onToggleSidebar, onToggleDark, darkMode, onLogout }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon={Menu} className="h-9 w-9 px-0" aria-label="Toggle sidebar" onClick={onToggleSidebar} />
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">SOC Analyst Workbench</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Alert triage, enrichment, cases, and response operations</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" icon={darkMode ? Sun : Moon} className="h-9 w-9 px-0" aria-label="Toggle dark mode" onClick={onToggleDark} />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.full_name || 'Analyst'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{ROLE_LABELS[user?.role] || user?.role}</p>
        </div>
        <Button variant="secondary" icon={LogOut} className="h-9 px-3" onClick={onLogout} />
      </div>
    </header>
  );
}
