"use client";

import type { ReactNode } from "react";
import { useStateTransition } from "@/lib/motion/useStateTransition";

/* ────────────────────────────────────────────────────────────────────────
 * Icons — small inline SVGs, matching the outline-stroke style already
 * used across the app (Navbar, ChatWidget) rather than pulling in an icon
 * library for four glyphs.
 * ──────────────────────────────────────────────────────────────────────── */

function IconTerminal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 6 6 6-6 6M12 18h8" />
      <rect x="2" y="3" width="20" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className ?? ""}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} strokeOpacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  );
}

function IconAlert({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
      />
    </svg>
  );
}

export const ToolIcon = { Terminal: IconTerminal, Spinner: IconSpinner, Check: IconCheck, Alert: IconAlert };

/* ────────────────────────────────────────────────────────────────────────
 * ToolShell — the consistent outer chrome every tool-part state renders
 * inside. Each `tone` maps to a genuinely different color + icon, per the
 * brief ("each state should answer a different user question"):
 *   streaming → neutral, dashed border    — "what is it doing, with what input?"
 *   pending   → secondary (amber), spinner — "it's running now"
 *   success   → primary, check            — "here's what came back"
 *   error     → destructive, alert        — "it failed, here's why"
 * ──────────────────────────────────────────────────────────────────────── */

const TONE_STYLES = {
  streaming: {
    border: "border-border/70 border-dashed",
    bg: "bg-muted/40",
    text: "text-muted-foreground",
    icon: "text-muted-foreground",
  },
  pending: {
    border: "border-secondary/40",
    bg: "bg-secondary/10",
    text: "text-secondary-foreground",
    icon: "text-secondary",
  },
  success: {
    border: "border-primary/30",
    bg: "bg-card",
    text: "text-foreground",
    icon: "text-primary",
  },
  error: {
    border: "border-destructive/40",
    bg: "bg-destructive/5",
    text: "text-destructive",
    icon: "text-destructive",
  },
} as const;

interface ToolShellProps {
  tone: keyof typeof TONE_STYLES;
  icon: ReactNode;
  label: string;
  /** Unique per lifecycle state (e.g. `${toolCallId}-${state}`) — drives the crossfade transition. */
  stateKey: string;
  children?: ReactNode;
}

export function ToolShell({ tone, icon, label, stateKey, children }: ToolShellProps) {
  const styles = TONE_STYLES[tone];
  const contentRef = useStateTransition<HTMLDivElement>(stateKey);

  return (
    <div className={`w-full max-w-[22rem] rounded-2xl border ${styles.border} ${styles.bg} px-3.5 py-3 text-sm sm:max-w-sm`}>
      <div ref={contentRef}>
        <div className={`flex items-center gap-2 ${styles.text}`}>
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${styles.icon}`}>{icon}</span>
          <span className="font-mono text-xs uppercase tracking-wide">{label}</span>
        </div>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </div>
  );
}

/** Shared output-error card — a designed failure state, not a stack trace. */
export function ToolErrorPanel({
  stateKey,
  title,
  message,
}: {
  stateKey: string;
  title: string;
  message: string;
}) {
  return (
    <ToolShell tone="error" icon={<ToolIcon.Alert className="h-4 w-4" />} label={title} stateKey={stateKey}>
      <p className="text-xs leading-relaxed text-destructive/90">{message}</p>
    </ToolShell>
  );
}

/** Terminal-style skeleton line for input-streaming states — a command being typed, not a loader. */
export function TerminalLine({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
      <span className="text-primary/70">$</span>
      <span className="truncate">{children}</span>
      <span className="inline-block h-3 w-[2px] shrink-0 animate-pulse bg-muted-foreground/60" />
    </p>
  );
}
