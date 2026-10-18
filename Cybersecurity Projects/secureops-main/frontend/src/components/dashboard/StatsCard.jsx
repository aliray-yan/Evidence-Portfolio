import { ArrowUpRight } from 'lucide-react';
import Card from '../common/Card';

export default function StatsCard({ title, value, detail, icon: Icon = ArrowUpRight, tone = 'text-blue-600 dark:text-blue-300' }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {detail ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{detail}</p> : null}
    </Card>
  );
}
