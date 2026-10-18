import { cn } from "@/lib/cn";
import type { ConcernStatus, ConfidenceLevel } from "@/lib/types";

const confidenceStyles: Record<ConfidenceLevel, string> = {
  high: "bg-clay-tint text-clay",
  medium: "bg-amber-tint text-amber",
  low: "bg-sage-tint text-sage",
};

const statusLabel: Record<ConcernStatus, string> = {
  detected: "Detected",
  possible: "Possible",
  not_detected: "Not detected",
};

const statusDot: Record<ConcernStatus, string> = {
  detected: "bg-clay",
  possible: "bg-amber",
  not_detected: "bg-ink-muted/40",
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        confidenceStyles[level]
      )}
    >
      {level} confidence
    </span>
  );
}

export function StatusBadge({ status }: { status: ConcernStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
      <span className={cn("h-2 w-2 rounded-full", statusDot[status])} aria-hidden />
      {statusLabel[status]}
    </span>
  );
}
