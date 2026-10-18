"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * components/layout/NavLink.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Both Navbar and DashboardSidebar need the same thing: a Link that knows
 * whether it's the current route and switches className accordingly. That
 * logic used to be copy-pasted (with usePathname + isActive) in both
 * components — centralized here so there's exactly one place that defines
 * "what counts as active."
 */

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName: string;
  inactiveClassName: string;
  /** Match the route exactly (e.g. "/" or "/dashboard") instead of by prefix. */
  exact?: boolean;
  onClick?: () => void;
}

export default function NavLink({
  href,
  children,
  className,
  activeClassName,
  inactiveClassName,
  exact = false,
  onClick,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact || href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(className, isActive ? activeClassName : inactiveClassName)}
    >
      {children}
    </Link>
  );
}
