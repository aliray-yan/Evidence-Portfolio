import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  const generatedId = useId();
  const controlId = isValidElement<{ id?: string }>(children) ? children.props.id ?? generatedId : undefined;
  const control = isValidElement<{ id?: string }>(children) && controlId ? cloneElement(children, { id: controlId }) : children;

  return (
    <div className="grid gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      {controlId ? <label htmlFor={controlId}>{label}</label> : <span>{label}</span>}
      {control}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-forge-blue/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-forge-blue/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-forge-blue/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white",
        className
      )}
      {...props}
    />
  );
}
