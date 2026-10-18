import { ShieldAlert } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Card from '../common/Card';
import { formatDate } from '../../utils/formatters';
import { priorityTone } from '../../utils/helpers';

export default function AlertDetails({ alert, onEscalate }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge value={alert.severity} type="severity" />
            <Badge value={alert.status} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{alert.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{alert.description}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400">Priority</p>
          <p className={`text-4xl font-semibold ${priorityTone(alert.priority_score)}`}>{alert.priority_score}</p>
          <Button className="mt-3" icon={ShieldAlert} onClick={onEscalate}>
            Escalate
          </Button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Meta label="Source" value={alert.source} />
        <Meta label="Category" value={alert.category} />
        <Meta label="First seen" value={formatDate(alert.first_seen)} />
        <Meta label="Last seen" value={formatDate(alert.last_seen)} />
      </div>
      {alert.iocs?.length ? (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Indicators</p>
          <div className="flex flex-wrap gap-2">
            {alert.iocs.map((ioc) => (
              <span key={`${ioc.type}-${ioc.value}`} className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {ioc.type}: {ioc.value}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-normal text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
