import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  /** "default" sits on the page background; "inset" is for use inside a Card. */
  tone?: "default" | "inset";
}

export default function Textarea({
  label,
  id,
  tone = "default",
  className,
  ...rest
}: TextareaProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
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
