"use client";

import { useRef } from "react";
import { ArrowClockwise, Trash, MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface ImagePreviewProps {
  previewUrl: string;
  onReplace: (file: File) => void;
  onRemove: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export function ImagePreview({
  previewUrl,
  onReplace,
  onRemove,
  onAnalyze,
  isAnalyzing,
}: ImagePreviewProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="overflow-hidden rounded-3xl border border-line bg-paper-warm">
        {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not an optimizable remote asset */}
        <img src={previewUrl} alt="Selected photo for analysis" className="max-h-[420px] w-full object-contain" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={isAnalyzing}>
          <ArrowClockwise size={18} /> Replace
        </Button>
        <Button variant="ghost" onClick={onRemove} disabled={isAnalyzing}>
          <Trash size={18} /> Remove
        </Button>
        <Button onClick={onAnalyze} disabled={isAnalyzing} size="lg">
          <MagnifyingGlass size={18} />
          {isAnalyzing ? "Analyzing…" : "Analyze this photo"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onReplace(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
