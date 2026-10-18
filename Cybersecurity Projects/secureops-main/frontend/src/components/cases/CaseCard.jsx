import { Link } from 'react-router-dom';
import Badge from '../common/Badge';
import { formatDate } from '../../utils/formatters';

export default function CaseCard({ item }) {
  return (
    <Link to={`/cases/${item.id}`} className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{item.case_number}</p>
          <p className="mt-1 truncate text-sm font-medium text-slate-950 dark:text-white">{item.title}</p>
        </div>
        <Badge value={item.severity} type="severity" />
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Priority {item.priority}</span>
        <span>{formatDate(item.updated_at)}</span>
      </div>
    </Link>
  );
}
