import Card from '../common/Card';

export default function APIQuotaWidget({ quotas = [] }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">API Quotas</h2>
      <div className="space-y-3">
        {quotas.map((quota) => {
          const pct = quota.requests_limit ? Math.min(100, (quota.requests_made / quota.requests_limit) * 100) : 0;
          return (
            <div key={quota.api_name}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{quota.api_name}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {quota.requests_made}/{quota.requests_limit || 'free'}
                </span>
              </div>
              <div className="h-2 rounded bg-slate-100 dark:bg-slate-800">
                <div className="h-2 rounded bg-blue-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
