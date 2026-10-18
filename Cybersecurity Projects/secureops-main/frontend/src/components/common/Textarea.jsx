import { cx } from '../../utils/helpers';

export default function Textarea({ label, className, ...props }) {
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span> : null}
      <textarea
        className={cx(
          'focus-ring min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
          className
        )}
        {...props}
      />
    </label>
  );
}
