import Card from '../common/Card';
import Badge from '../common/Badge';
import { formatDate, titleize } from '../../utils/formatters';
import { priorityTone } from '../../utils/helpers';

export default function IOCResults({ result }) {
  if (!result) return null;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-slate-500 dark:text-slate-400">{result.ioc}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{titleize(result.type)} intelligence summary</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{result.summary}</p>
        </div>
        <div className="text-right">
          <Badge value={result.risk_level === 'clean' ? 'low' : result.risk_level} type="severity" />
          <p className={`mt-2 text-4xl font-semibold ${priorityTone(result.risk_score)}`}>{result.risk_score}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {Object.entries(result.sources || {}).map(([source, data]) => (
          <div key={source} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-950 dark:text-white">{titleize(source)}</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">{data.status}</span>
            </div>
            <pre className="mt-3 max-h-44 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(data, null, 2)}</pre>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Recommendations</p>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          {result.recommendations?.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Cached until {formatDate(result.cached_until)}</p>
      </div>
    </Card>
  );
}
