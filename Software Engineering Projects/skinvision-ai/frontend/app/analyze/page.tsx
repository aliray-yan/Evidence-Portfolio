"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAnalysis } from "@/lib/analysis-store";
import { validateFile } from "@/lib/validate-upload";
import { analyzeImage, ApiError } from "@/lib/api";
import { Dropzone } from "@/components/upload/dropzone";
import { ImagePreview } from "@/components/upload/image-preview";
import { ScanningState } from "@/components/upload/scanning-state";
import { AlertBanner } from "@/components/upload/alert-banner";

export default function AnalyzePage() {
  const router = useRouter();
  const { file, previewUrl, setFile, setResult } = useAnalysis();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [qualityWarnings, setQualityWarnings] = useState<string[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function handleFileChosen(candidate: File) {
    setApiError(null);
    setQualityWarnings(null);
    const result = await validateFile(candidate);
    if (!result.ok) {
      setValidationError(result.message ?? "That file can't be used.");
      return;
    }
    setValidationError(null);
    setFile(candidate);
  }

  async function handleAnalyze() {
    if (!file) return;
    setIsAnalyzing(true);
    setApiError(null);
    setQualityWarnings(null);
    try {
      const response = await analyzeImage(file);
      if (!response.quality.usable) {
        setQualityWarnings(
          response.quality.warnings.length
            ? response.quality.warnings.map((w) => w.message)
            : ["We couldn't get a reliable analysis from this photo."]
        );
        return;
      }
      setResult(response);
      router.push("/results");
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">Upload a photo</h1>
      <p className="mt-3 text-ink-muted">
        For the most reliable result, use a clear, front-facing photo taken in
        even, natural light, with your face filling most of the frame.
      </p>

      <div className="mt-10">
        {isAnalyzing ? (
          <ScanningState />
        ) : file && previewUrl ? (
          <ImagePreview
            previewUrl={previewUrl}
            onReplace={handleFileChosen}
            onRemove={() => {
              setFile(null);
              setValidationError(null);
              setQualityWarnings(null);
            }}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        ) : (
          <Dropzone onFileChosen={handleFileChosen} />
        )}
      </div>

      {validationError && (
        <div className="mt-6">
          <AlertBanner title="This photo can't be used" messages={[validationError]} />
        </div>
      )}

      {qualityWarnings && (
        <div className="mt-6">
          <AlertBanner
            title="We couldn't get a reliable analysis from this photo"
            messages={qualityWarnings}
          />
          <p className="mt-3 text-sm text-ink-muted">
            Try a different photo — a single, well-lit, front-facing face
            usually works best.
          </p>
        </div>
      )}

      {apiError && (
        <div className="mt-6">
          <AlertBanner title="Couldn't complete the analysis" messages={[apiError]} />
        </div>
      )}
    </div>
  );
}
