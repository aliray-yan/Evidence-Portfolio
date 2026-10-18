import { Link } from 'react-router-dom';
import Badge from '../common/Badge';
import Card from '../common/Card';
import { formatDate } from '../../utils/formatters';
import { priorityTone } from '../../utils/helpers';

export default function RecentAlerts({ alerts = [] }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Recent Alerts</h2>
        <Link to="/alerts" className="text-sm font-medium text-blue-600 dark:text-blue-300">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Link key={alert.id} to={`/alerts/${alert.id}`} className="block rounded-md border border-slate-200 p-3 transition hover:border-blue-300 dark:border-slate-800 dark:hover:border-blue-500/50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{alert.title}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(alert.created_at)} · {alert.source}</p>
              </div>
              <span className={`text-sm font-semibold ${priorityTone(alert.priority_score)}`}>{alert.priority_score}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge value={alert.severity} type="severity" />
              <Badge value={alert.status} />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
