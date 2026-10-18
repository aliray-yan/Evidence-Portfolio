import Table from '../common/Table';

export default function ScheduledReports({ items = [] }) {
  return (
    <Table
      data={items}
      columns={[
        { key: 'report_type', header: 'Type' },
        { key: 'schedule', header: 'Schedule' },
        { key: 'recipients', header: 'Recipients', render: (row) => row.recipients?.join(', ') || 'None' },
        { key: 'is_active', header: 'Active', render: (row) => (row.is_active ? 'Yes' : 'No') }
      ]}
    />
  );
}
