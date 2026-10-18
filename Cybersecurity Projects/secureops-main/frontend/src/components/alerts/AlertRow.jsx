import Badge from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import { priorityTone } from '../../utils/helpers';

export default function AlertRow({ alert }) {
  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_120px_140px_100px]">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-950 dark:text-white">{alert.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{alert.description}</p>
      </div>
      <Badge value={alert.severity} type="severity" />
      <Badge value={alert.status} />
      <span className={`text-lg font-semibold ${priorityTone(alert.priority_score)}`}>{alert.priority_score}</span>
      <p className="text-xs text-slate-500 dark:text-slate-400 md:col-span-4">{formatDate(alert.created_at)} · {alert.source} · {alert.category}</p>
    </div>
  );
}
