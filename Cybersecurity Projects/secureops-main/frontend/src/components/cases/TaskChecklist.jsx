import { CheckCircle2, Circle } from 'lucide-react';

export default function TaskChecklist({ tasks = [] }) {
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="flex gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
          {task.status === 'completed' ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" /> : <Circle className="mt-0.5 h-5 w-5 text-slate-400" />}
          <div>
            <p className="text-sm font-medium text-slate-950 dark:text-white">{task.title}</p>
            {task.description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{task.description}</p> : null}
          </div>
        </div>
      ))}
      {!tasks.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No tasks have been added.</p> : null}
    </div>
  );
}
