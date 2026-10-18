import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-teal text-paper-warm hover:bg-teal-dark",
  secondary: "bg-transparent border border-ink/20 text-ink hover:border-ink/40",
  ghost: "bg-transparent text-ink-muted hover:text-ink",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-8 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
