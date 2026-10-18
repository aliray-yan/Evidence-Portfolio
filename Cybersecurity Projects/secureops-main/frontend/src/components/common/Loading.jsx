import { Loader2 } from 'lucide-react';

export default function Loading({ label = 'Loading' }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
