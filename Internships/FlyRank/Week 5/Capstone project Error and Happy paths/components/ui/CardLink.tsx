import Link from "next/link";
import type { ReactNode } from "react";
import { cardClasses } from "./Card";
import { cn } from "@/lib/utils";

interface CardLinkProps {
  href: string;
  padding?: "sm" | "md";
  className?: string;
  children: ReactNode;
}

export default function CardLink({
  href,
  padding = "md",
  className,
  children,
}: CardLinkProps) {
  return (
    <Link
      href={href}
      className={cn("focus-ring block", cardClasses(true, padding, className))}
    >
      {children}
    </Link>
  );
}
