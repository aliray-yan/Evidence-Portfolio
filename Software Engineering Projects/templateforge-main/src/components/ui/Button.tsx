import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition focus:outline-none focus:ring-2 focus:ring-forge-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-ink",
          size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
          variant === "primary" && "border-ink bg-ink text-white hover:bg-black dark:border-white dark:bg-white dark:text-ink",
          variant === "secondary" && "border-slate-300 bg-white text-ink hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800",
          variant === "ghost" && "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
          variant === "danger" && "border-red-600 bg-red-600 text-white hover:bg-red-700",
          variant === "icon" && "h-9 w-9 border-slate-300 bg-white p-0 text-ink hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
