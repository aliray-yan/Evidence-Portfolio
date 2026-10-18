import { cx } from '../../utils/helpers';

export default function Card({ children, className }) {
  return (
    <section className={cx('rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}>
      {children}
    </section>
  );
}
