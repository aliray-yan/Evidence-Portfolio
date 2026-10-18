import { Search } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

export default function AlertFilters({ filters, onChange }) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_160px_170px_140px]">
      <Input placeholder="Search alerts, IOCs, descriptions" value={filters.q || ''} onChange={(event) => onChange({ q: event.target.value })} />
      <Select
        value={filters.severity || ''}
        onChange={(event) => onChange({ severity: event.target.value || undefined })}
        options={[
          { value: '', label: 'All severity' },
          'critical',
          'high',
          'medium',
          'low',
          'informational'
        ]}
      />
      <Select
        value={filters.status || ''}
        onChange={(event) => onChange({ status: event.target.value || undefined })}
        options={[
          { value: '', label: 'All status' },
          'new',
          'in_progress',
          'investigating',
          'escalated',
          'resolved',
          'false_positive',
          'closed'
        ]}
      />
      <Button icon={Search} variant="secondary" onClick={() => onChange({ page: 1 })}>
        Filter
      </Button>
    </div>
  );
}
