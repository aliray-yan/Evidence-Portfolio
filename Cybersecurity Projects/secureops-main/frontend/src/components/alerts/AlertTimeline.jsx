import { formatDate, titleize } from '../../utils/formatters';

export default function AlertTimeline({ items = [] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="border-l-2 border-blue-500 pl-4">
          <p className="text-sm font-medium text-slate-950 dark:text-white">{titleize(item.field_changed)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(item.timestamp)}</p>
          {item.new_value ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.new_value}</p> : null}
        </div>
      ))}
      {!items.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No timeline events yet.</p> : null}
    </div>
  );
}
