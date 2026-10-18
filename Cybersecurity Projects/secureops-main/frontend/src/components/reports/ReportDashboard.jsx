import { Download } from 'lucide-react';
import Button from '../common/Button';
import Table from '../common/Table';
import { formatDate, titleize } from '../../utils/formatters';

export default function ReportDashboard({ reports = [], onDownload }) {
  return (
    <Table
      data={reports}
      columns={[
        { key: 'name', header: 'Report', render: (row) => <span className="font-medium text-slate-950 dark:text-white">{row.name}</span> },
        { key: 'type', header: 'Type', render: (row) => titleize(row.type) },
        { key: 'status', header: 'Status', render: (row) => titleize(row.status) },
        { key: 'generated_at', header: 'Generated', render: (row) => formatDate(row.generated_at) },
        {
          key: 'exports',
          header: 'Exports',
          render: (row) => (
            <div className="flex flex-wrap gap-1">
              {['pdf', 'html', 'csv', 'json'].map((format) => (
                <Button key={format} variant="ghost" icon={Download} className="h-8 px-2" onClick={(event) => {
                  event.stopPropagation();
                  onDownload(row, format);
                }}>
                  {format.toUpperCase()}
                </Button>
              ))}
            </div>
          )
        }
      ]}
    />
  );
}
