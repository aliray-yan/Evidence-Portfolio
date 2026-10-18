import Badge from '../common/Badge';
import Card from '../common/Card';
import { formatDate } from '../../utils/formatters';

export default function CaseDetails({ item }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-slate-500 dark:text-slate-400">{item.case_number}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{item.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={item.severity} type="severity" />
          <Badge value={item.status} />
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <Meta label="Category" value={item.category} />
        <Meta label="Priority" value={item.priority} />
        <Meta label="SLA" value={formatDate(item.sla_deadline)} />
        <Meta label="Created" value={formatDate(item.created_at)} />
        <Meta label="Updated" value={formatDate(item.updated_at)} />
      </div>
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
