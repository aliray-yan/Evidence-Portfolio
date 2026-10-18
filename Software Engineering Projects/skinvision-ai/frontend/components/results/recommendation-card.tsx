import { Card } from "@/components/ui/card";
import type { Recommendation } from "@/lib/types";
import { cn } from "@/lib/cn";

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const isProfessional = recommendation.priority === "professional_evaluation";
  return (
    <Card
      className={cn(
        isProfessional && "border-teal/30 bg-teal-tint"
      )}
    >
      <h3 className="text-base font-medium text-ink">{recommendation.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{recommendation.text}</p>
    </Card>
  );
}
