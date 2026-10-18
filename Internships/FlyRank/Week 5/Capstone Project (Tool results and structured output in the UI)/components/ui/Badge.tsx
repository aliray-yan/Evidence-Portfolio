import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "accent" | "muted" | "outline";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  accent: "bg-primary text-primary-foreground",
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
        "inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
