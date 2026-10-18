import Card from '../common/Card';

export default function PlaybookStats({ count = 0 }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">Active playbooks</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{count}</p>
    </Card>
  );
}
