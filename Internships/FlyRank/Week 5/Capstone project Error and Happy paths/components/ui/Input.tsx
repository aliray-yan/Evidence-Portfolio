import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** "default" sits on the page background; "inset" is for use inside a Card (e.g. the login form). */
  tone?: "default" | "inset";
}

export default function Input({
  label,
  id,
  tone = "default",
  className,
  ...rest
}: InputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "focus-ring mt-2 w-full rounded-lg border border-border px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-primary/50 disabled:opacity-60 disabled:hover:border-border",
          tone === "inset" ? "bg-background" : "bg-card",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
