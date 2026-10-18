import { CheckCircle, ShieldAlert, UserPlus } from 'lucide-react';
import Button from '../common/Button';

export default function BulkActions({ selected = [], onAction }) {
  if (!selected.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{selected.length} selected</span>
      <div className="flex gap-2">
        <Button variant="secondary" icon={UserPlus} onClick={() => onAction('assign')}>
          Assign
        </Button>
        <Button variant="secondary" icon={ShieldAlert} onClick={() => onAction('escalate')}>
          Escalate
        </Button>
        <Button icon={CheckCircle} onClick={() => onAction('status', 'resolved')}>
          Resolve
        </Button>
      </div>
    </div>
  );
}
