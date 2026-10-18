import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import Card from '../common/Card';
import Badge from '../common/Badge';

const COLORS = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
  informational: '#6B7280'
};

export default function SeverityPieChart({ data = {} }) {
  const rows = Object.entries(data).map(([name, value]) => ({ name, value }));
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Severity Distribution</h2>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78}>
                {rows.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] || '#64748B'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center justify-between text-sm">
              <Badge value={row.name} type="severity" />
              <span className="font-medium text-slate-700 dark:text-slate-200">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
