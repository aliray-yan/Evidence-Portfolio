import { Card } from "@/components/ui/card";
import { ConfidenceBadge, StatusBadge } from "@/components/ui/badge";
import type { Concern } from "@/lib/types";

export function ConcernCard({ concern }: { concern: Concern }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium text-ink">{concern.display_name}</h3>
        <StatusBadge status={concern.status} />
      </div>
      <p className="text-sm leading-relaxed text-ink-muted">{concern.explanation}</p>
      {concern.status !== "not_detected" && <ConfidenceBadge level={concern.confidence_level} />}
    </Card>
  );
}
