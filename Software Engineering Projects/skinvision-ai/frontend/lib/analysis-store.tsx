"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { AnalyzeResponse } from "./types";

interface AnalysisState {
  file: File | null;
  previewUrl: string | null;
  result: AnalyzeResponse | null;
  setFile: (file: File | null) => void;
  setResult: (result: AnalyzeResponse | null) => void;
  reset: () => void;
}

const AnalysisContext = createContext<AnalysisState | null>(null);

// Deliberately no localStorage/sessionStorage/cookies here. PRD
// section 2.1 requires "storing no uploaded images by default" — the
// object URL and result exist only in memory for this tab and vanish
// on refresh or reset.
export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [file, setFileState] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const previousUrl = useRef<string | null>(null);

  const setFile = useCallback((next: File | null) => {
    if (previousUrl.current) URL.revokeObjectURL(previousUrl.current);
    if (next) {
      const url = URL.createObjectURL(next);
      previousUrl.current = url;
      setPreviewUrl(url);
    } else {
      previousUrl.current = null;
      setPreviewUrl(null);
    }
    setFileState(next);
  }, []);

  const reset = useCallback(() => {
    if (previousUrl.current) URL.revokeObjectURL(previousUrl.current);
    previousUrl.current = null;
    setFileState(null);
    setPreviewUrl(null);
    setResult(null);
  }, []);

  const value = useMemo(
    () => ({ file, previewUrl, result, setFile, setResult, reset }),
    [file, previewUrl, result, setFile, reset]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisState {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
}
