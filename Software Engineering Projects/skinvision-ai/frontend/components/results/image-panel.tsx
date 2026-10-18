"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Detection } from "@/lib/types";
import { cn } from "@/lib/cn";

// Known display styling for lesion classes seen so far — including
// both the currently-trained detector's real classes (plural, as the
// underlying dataset named them) and the earlier heuristic-only set,
// kept for backward compatibility with older responses/checkpoints.
// Anything not listed here still renders correctly via the fallback
// functions below — a differently-trained future detector's classes
// were never guaranteed to be known in advance.
const KNOWN_CLASS_COLORS: Record<string, string> = {
  blackheads: "#b85c42",
  "dark spot": "#a8402e",
  nodules: "#a8402e",
  papules: "#a9791f",
  pustules: "#a9791f",
  whiteheads: "#a9791f",
  // legacy heuristic-era names
  comedone: "#b85c42",
  papule: "#a9791f",
  pustule: "#a9791f",
  nodule: "#a8402e",
  cyst: "#a8402e",
  scar: "#5c645c",
};
const DEFAULT_CLASS_COLOR = "#5c645c";

const KNOWN_CLASS_LABELS: Record<string, string> = {
  blackheads: "Blackhead",
  "dark spot": "Dark spot",
  nodules: "Nodule",
  papules: "Papule",
  pustules: "Pustule",
  whiteheads: "Whitehead",
  comedone: "Comedone",
  papule: "Papule",
  pustule: "Pustule",
  nodule: "Nodule",
  cyst: "Cyst",
  scar: "Scar",
};

function classColor(cls: string): string {
  return KNOWN_CLASS_COLORS[cls.toLowerCase()] ?? DEFAULT_CLASS_COLOR;
}

function classLabel(cls: string): string {
  const known = KNOWN_CLASS_LABELS[cls.toLowerCase()];
  if (known) return known;
  // Fallback for any class name we don't have a nice label for yet —
  // title-case whatever the model actually said rather than crashing
  // or showing a blank.
  return cls
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ImagePanel({
  imageUrl,
  detections,
}: {
  imageUrl: string;
  detections: Detection[];
}) {
  const [view, setView] = useState<"original" | "findings">(
    detections.length > 0 ? "findings" : "original"
  );

  const presentClasses = Array.from(new Set(detections.map((d) => d.class)));

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border border-line bg-paper-warm p-1">
        {(["original", "findings"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setView(option)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              view === option ? "bg-ink text-paper-warm" : "text-ink-muted hover:text-ink"
            )}
          >
            {option === "original" ? "Original" : "AI findings"}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-line bg-paper-warm">
        {/* eslint-disable-next-line @next/next/no-img-element -- object URL */}
        <img src={imageUrl} alt="Uploaded photo" className="w-full object-contain" />
        <AnimatePresence>
          {view === "findings" &&
            detections.map((d) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute rounded-sm border-2"
                style={{
                  left: `${d.bbox.x * 100}%`,
                  top: `${d.bbox.y * 100}%`,
                  width: `${d.bbox.width * 100}%`,
                  height: `${d.bbox.height * 100}%`,
                  borderColor: classColor(d.class),
                }}
              />
            ))}
        </AnimatePresence>
      </div>

      {view === "findings" && detections.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4">
          {presentClasses.map((cls) => (
            <div key={cls} className="flex items-center gap-2 text-sm text-ink-muted">
              <span
                className="h-2.5 w-2.5 rounded-sm border-2"
                style={{ borderColor: classColor(cls) }}
              />
              {classLabel(cls)}
            </div>
          ))}
        </div>
      )}

      {view === "findings" && detections.length === 0 && (
        <p className="mt-4 text-sm text-ink-muted">
          No specific regions were flagged for this photo.
        </p>
      )}
    </div>
  );
}

