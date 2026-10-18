import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message: string;
  className?: string;
}

export default function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border p-12 text-center",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
