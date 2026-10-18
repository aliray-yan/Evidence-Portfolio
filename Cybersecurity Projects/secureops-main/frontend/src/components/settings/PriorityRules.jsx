import Table from '../common/Table';

export default function PriorityRules({ rules = [] }) {
  return (
    <Table
      data={rules}
      empty="No priority rules configured"
      columns={[
        { key: 'name', header: 'Rule' },
        { key: 'score_modifier', header: 'Modifier' },
        { key: 'is_active', header: 'Active', render: (row) => (row.is_active ? 'Yes' : 'No') },
        { key: 'conditions', header: 'Conditions', render: (row) => <span className="font-mono text-xs">{JSON.stringify(row.conditions)}</span> }
      ]}
    />
  );
}
