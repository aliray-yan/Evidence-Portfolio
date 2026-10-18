import { SEVERITY_STYLES, STATUS_STYLES } from '../../utils/constants';
import { titleize } from '../../utils/formatters';
import { cx } from '../../utils/helpers';

export default function Badge({ value, type = 'status', className }) {
  const styles = type === 'severity' ? SEVERITY_STYLES : STATUS_STYLES;
  return (
    <span className={cx('inline-flex items-center rounded px-2 py-1 text-xs font-medium ring-1 ring-inset', styles[value] || styles.informational || styles.new, className)}>
      {titleize(value)}
    </span>
  );
}
