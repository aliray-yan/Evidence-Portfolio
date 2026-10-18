import Table from '../common/Table';
import Badge from '../common/Badge';
import { formatDate } from '../../utils/formatters';

export default function EnrichmentHistory({ items = [] }) {
  return (
    <Table
      data={items}
      columns={[
        { key: 'ioc_value', header: 'IOC', render: (row) => <span className="font-mono text-xs">{row.ioc_value}</span> },
        { key: 'ioc_type', header: 'Type' },
        { key: 'risk_level', header: 'Risk', render: (row) => <Badge value={row.risk_level === 'clean' ? 'low' : row.risk_level} type="severity" /> },
        { key: 'risk_score', header: 'Score' },
        { key: 'lookup_count', header: 'Lookups' },
        { key: 'last_lookup', header: 'Last lookup', render: (row) => formatDate(row.last_lookup) }
      ]}
    />
  );
}
