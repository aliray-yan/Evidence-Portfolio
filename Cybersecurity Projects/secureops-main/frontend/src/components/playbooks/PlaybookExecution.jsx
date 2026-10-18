import Card from '../common/Card';

export default function PlaybookExecution({ execution }) {
  if (!execution) return null;
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Execution {execution.id}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{execution.status}</p>
    </Card>
  );
}
