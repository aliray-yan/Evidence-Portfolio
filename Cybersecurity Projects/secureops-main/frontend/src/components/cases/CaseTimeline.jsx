import { formatDate, titleize } from '../../utils/formatters';

export default function CaseTimeline({ items = [] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="border-l-2 border-indigo-500 pl-4">
          <p className="text-sm font-medium text-slate-950 dark:text-white">{titleize(item.event_type)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(item.timestamp)}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
        </div>
      ))}
      {!items.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No case timeline yet.</p> : null}
    </div>
  );
}
