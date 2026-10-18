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
          "focus-ring mt-2 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60",
          tone === "inset" ? "bg-background" : "bg-card",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
