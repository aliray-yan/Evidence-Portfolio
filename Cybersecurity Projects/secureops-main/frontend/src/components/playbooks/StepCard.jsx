import { CheckCircle2, GitBranch, PlayCircle } from 'lucide-react';
import { titleize } from '../../utils/formatters';

const icons = {
  manual: CheckCircle2,
  automated: PlayCircle,
  decision: GitBranch
};

export default function StepCard({ step }) {
  const Icon = icons[step.step_type] || CheckCircle2;
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">
            {step.step_number}. {step.title}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{step.description}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{titleize(step.step_type)} · {step.expected_duration_minutes} min</p>
        </div>
      </div>
    </div>
  );
}
