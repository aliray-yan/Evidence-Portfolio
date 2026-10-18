import CaseCard from './CaseCard';
import { titleize } from '../../utils/formatters';

export default function CaseBoard({ board = {} }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {Object.entries(board).map(([status, items]) => (
        <section key={status} className="min-h-80 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{titleize(status)}</h2>
            <span className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{items.length}</span>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <CaseCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
