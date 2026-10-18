"use client";

import { useEffect, useState } from "react";
import ThinkingDots from "./ThinkingDots";

const SLOW_RESPONSE_MS = 6000;

/**
 * components/chat/ThinkingIndicator.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * The pending-state UI for a message that hasn't started streaming yet.
 *
 * Deliberately NOT a content-shaped skeleton (gray bars mimicking
 * paragraph lines): response length varies from one sentence to several
 * paragraphs, and per the resilience brief's own mentor tip, a skeleton
 * that doesn't match what actually arrives causes a worse layout jump than
 * a plain, fixed-size indicator would. Three dots at a known, small size
 * is the deliberate choice — the "spinner beats a bad skeleton" case.
 *
 * It does still handle "slow response" as its own state, since that's
 * called out as a separate edge case in the brief: after
 * SLOW_RESPONSE_MS with nothing back yet, this adds a small reassurance
 * line rather than leaving the same three dots bouncing indefinitely with
 * no signal that anything's different.
 */
export default function ThinkingIndicator() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_RESPONSE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <ThinkingDots />
      {isSlow && (
        <span className="text-xs text-muted-foreground">Taking a little longer than usual…</span>
      )}
    </div>
  );
}
