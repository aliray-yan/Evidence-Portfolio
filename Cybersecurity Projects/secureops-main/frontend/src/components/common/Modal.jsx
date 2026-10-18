import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          <Button variant="ghost" icon={X} className="h-9 w-9 px-0" aria-label="Close" onClick={onClose} />
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
