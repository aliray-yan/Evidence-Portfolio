import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import Table from '../common/Table';
import { formatDate } from '../../utils/formatters';

export default function CaseList({ cases = [] }) {
  const navigate = useNavigate();
  return (
    <Table
      data={cases}
      onRowClick={(row) => navigate(`/cases/${row.id}`)}
      columns={[
        { key: 'case_number', header: 'Case', render: (row) => <span className="font-mono text-xs">{row.case_number}</span> },
        { key: 'title', header: 'Title', render: (row) => <span className="font-medium text-slate-950 dark:text-white">{row.title}</span> },
        { key: 'severity', header: 'Severity', render: (row) => <Badge value={row.severity} type="severity" /> },
        { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> },
        { key: 'priority', header: 'Priority' },
        { key: 'updated_at', header: 'Updated', render: (row) => formatDate(row.updated_at) }
      ]}
    />
  );
}
