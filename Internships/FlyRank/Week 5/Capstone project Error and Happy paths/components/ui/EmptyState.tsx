import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message: string;
  className?: string;
}

export default function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/70 p-12 text-center",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
