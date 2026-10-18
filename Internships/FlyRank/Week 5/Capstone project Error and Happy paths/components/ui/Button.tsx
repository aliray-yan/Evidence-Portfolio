import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * components/ui/Button.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Native <button> element. For a link styled as a button, use LinkButton —
 * they share the same class-building logic (buttonClasses, exported below)
 * so the two never visually drift apart.
 *
 * Deliberately rounded-lg rather than rounded-full: a full pill on every
 * button is one of the fastest ways a UI reads as templated. Reserving
 * rounded-full for icon-only controls (ThemeToggle, the chat FAB) and tags
 * (Badge) — and giving text buttons a tighter, more "engineered" corner —
 * is a small distinction that does a lot of work.
 */

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25 hover:brightness-110 active:brightness-95",
  outline:
    "border border-border text-foreground hover:border-primary hover:text-primary",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger:
    "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/20 hover:brightness-110 active:brightness-95",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  fullWidth = false,
  className?: string,
): string {
  return cn(
    "focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-tight transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && "w-full",
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, fullWidth, className)} {...rest}>
      {children}
    </button>
  );
}
