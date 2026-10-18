import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * components/ui/Card.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * The surface used for project cards, certification cards, skill rows,
 * dashboard stat cards, and settings sections. For a card that's also a
 * link (blog post cards), use CardLink — both share cardClasses() so they
 * stay visually identical.
 *
 * Elevation comes from a soft shadow + a low-contrast border working
 * together, not the border alone — a flat, evenly-colored outline around
 * every box on the page is a big part of what makes a UI feel like a
 * wireframe someone forgot to finish. On hover, an interactive card lifts
 * (shadow grows, sits 2px higher) rather than just swapping its border to
 * the accent color.
 */

export function cardClasses(
  interactive = false,
  padding: "sm" | "md" = "md",
  className?: string,
): string {
  return cn(
    "rounded-xl border border-border/70 bg-card shadow-sm shadow-black/[0.03] dark:shadow-black/20",
    padding === "md" ? "p-6" : "p-4",
    interactive &&
      "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/[0.06] dark:hover:shadow-black/30",
    className,
  );
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: "sm" | "md";
  children: ReactNode;
}

export default function Card({
  interactive = false,
  padding = "md",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div className={cardClasses(interactive, padding, className)} {...rest}>
      {children}
    </div>
  );
}
