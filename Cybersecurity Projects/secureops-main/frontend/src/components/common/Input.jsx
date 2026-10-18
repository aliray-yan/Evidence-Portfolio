import { cx } from '../../utils/helpers';

export default function Input({ label, className, ...props }) {
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span> : null}
      <input
        className={cx(
          'focus-ring h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
          className
        )}
        {...props}
      />
    </label>
  );
}
