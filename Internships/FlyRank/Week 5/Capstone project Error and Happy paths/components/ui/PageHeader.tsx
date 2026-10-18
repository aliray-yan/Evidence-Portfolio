import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** "page" for public marketing pages (larger type), "panel" for the admin dashboard. */
  size?: "page" | "panel";
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  action,
  size = "page",
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        <h1
          className={cn(
            "font-display font-semibold leading-tight tracking-tight text-foreground",
            size === "page" ? "text-3xl md:text-4xl" : "text-xl",
          )}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
