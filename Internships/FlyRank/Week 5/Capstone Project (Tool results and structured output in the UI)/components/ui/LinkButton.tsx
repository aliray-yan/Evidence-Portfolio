import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./Button";

/**
 * components/ui/LinkButton.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * A Next.js <Link> (or external <a> when `external`) styled identically to
 * Button, via the shared buttonClasses() helper. Used anywhere a button
 * needs to navigate rather than run client-side logic — hero CTAs, "View
 * Details" cards, external GitHub/LinkedIn links.
 */

interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  external?: boolean;
  className?: string;
  children: ReactNode;
}

export default function LinkButton({
  href,
  variant = "primary",
  size = "md",
  fullWidth = false,
  external = false,
  className,
  children,
}: LinkButtonProps) {
  const classes = buttonClasses(variant, size, fullWidth, className);

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
