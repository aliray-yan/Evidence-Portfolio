import { cx } from '../../utils/helpers';

export default function Select({ label, options = [], className, ...props }) {
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span> : null}
      <select
        className={cx(
          'focus-ring h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
