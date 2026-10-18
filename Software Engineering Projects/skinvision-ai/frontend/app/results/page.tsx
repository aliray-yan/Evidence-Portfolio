"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAnalysis } from "@/lib/analysis-store";
import { ImagePanel } from "@/components/results/image-panel";
import { ConcernCard } from "@/components/results/concern-card";
import { RecommendationCard } from "@/components/results/recommendation-card";
import { DisclaimerBanner } from "@/components/results/disclaimer-banner";
import { Button } from "@/components/ui/button";

export default function ResultsPage() {
  const router = useRouter();
  const { result, previewUrl, reset } = useAnalysis();

  useEffect(() => {
    if (!result || !previewUrl) router.replace("/analyze");
  }, [result, previewUrl, router]);

  if (!result || !previewUrl) return null;

  const flagged = result.concerns.filter((c) => c.status !== "not_detected");

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-ink sm:text-4xl">Your results</h1>
        <p className="text-sm text-ink-muted">{result.model_status.note}</p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
        <ImagePanel imageUrl={previewUrl} detections={result.detections} />

        <div>
          <h2 className="text-lg font-medium text-ink">
            {flagged.length > 0
              ? `${flagged.length} thing${flagged.length === 1 ? "" : "s"} to know about`
              : "Nothing notable was flagged"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {result.concerns.map((concern) => (
              <ConcernCard key={concern.label} concern={concern} />
            ))}
          </div>
        </div>
      </div>

      {result.recommendations.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-2xl text-ink">General guidance</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {result.recommendations.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-16">
        <DisclaimerBanner />
      </div>

      <div className="mt-10 flex justify-center">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            reset();
            router.push("/analyze");
          }}
        >
          Analyze another photo
        </Button>
      </div>
    </div>
  );
}
