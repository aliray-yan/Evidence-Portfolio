import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import Table from '../common/Table';
import { formatDate } from '../../utils/formatters';
import { priorityTone } from '../../utils/helpers';

export default function AlertTable({ alerts = [] }) {
  const navigate = useNavigate();
  return (
    <Table
      data={alerts}
      onRowClick={(row) => navigate(`/alerts/${row.id}`)}
      columns={[
        {
          key: 'title',
          header: 'Alert',
          render: (row) => (
            <div className="max-w-md">
              <p className="font-medium text-slate-950 dark:text-white">{row.title}</p>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{row.description}</p>
            </div>
          )
        },
        { key: 'severity', header: 'Severity', render: (row) => <Badge value={row.severity} type="severity" /> },
        { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> },
        { key: 'source', header: 'Source' },
        { key: 'priority_score', header: 'Priority', render: (row) => <span className={`font-semibold ${priorityTone(row.priority_score)}`}>{row.priority_score}</span> },
        { key: 'created_at', header: 'Created', render: (row) => formatDate(row.created_at) }
      ]}
    />
  );
}
