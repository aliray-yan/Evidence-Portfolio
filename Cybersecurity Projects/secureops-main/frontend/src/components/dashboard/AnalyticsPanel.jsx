import Card from '../common/Card';

export default function AnalyticsPanel({ data }) {
  const sources = data?.source_distribution || [];
  const workload = data?.analyst_workload || [];
  const risk = data?.risk_indicators || {};
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Deep Analytics</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">{data?.window_days || 30} days</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Metric label="False positive rate" value={`${risk.false_positive_rate || 0}%`} />
        <Metric label="EDR alert share" value={`${risk.edr_alert_share || 0}%`} />
        <Metric label="Critical unassigned" value={risk.critical_unassigned || 0} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Source Risk</h3>
          <div className="space-y-2">
            {sources.slice(0, 6).map((item) => (
              <Row key={item.source} label={item.source} value={`${item.count} alerts · avg ${item.avg_priority}`} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Analyst Workload</h3>
          <div className="space-y-2">
            {workload.slice(0, 6).map((item) => (
              <Row key={item.analyst} label={item.analyst} value={`${item.assigned_alerts} alerts · avg ${item.avg_priority}`} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
      <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <span className="text-slate-500 dark:text-slate-400">{value}</span>
    </div>
  );
}
