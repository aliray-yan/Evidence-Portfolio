import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * components/ui/Badge.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Small tag/label chip — project categories, blog tags, tech stack pills.
 * Set in the mono font, uppercase, tightly tracked: a deliberate, small
 * "developer console" accent that shows up consistently anywhere the site
 * is labeling something, without spreading monospace into body copy where
 * it would hurt readability.
 */

type BadgeVariant = "accent" | "muted" | "outline";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  accent: "bg-primary/10 text-primary",
  muted: "bg-muted text-muted-foreground",
  outline: "border border-border text-muted-foreground",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

export default function Badge({
  variant = "accent",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2.5 py-1 font-mono text-[0.6875rem] font-medium uppercase tracking-wide",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
