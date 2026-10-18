import Card from '../common/Card';
import StepCard from './StepCard';

export default function PlaybookList({ playbooks = [] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {playbooks.map((playbook) => (
        <Card key={playbook.id}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{playbook.name}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{playbook.description}</p>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">v{playbook.version}</span>
          </div>
          <div className="space-y-3">
            {playbook.steps?.slice(0, 3).map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
