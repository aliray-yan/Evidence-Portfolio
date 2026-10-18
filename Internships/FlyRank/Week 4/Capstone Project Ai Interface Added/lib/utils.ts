/**
 * lib/utils.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Tiny className-merge helper, used by every component in components/ui/
 * and components/layout/ so conditional Tailwind classes don't turn into
 * unreadable template-string concatenation. Deliberately dependency-free
 * (no clsx/tailwind-merge) — this project's Phase 1 spec avoids pulling in
 * libraries where a dozen lines of our own code does the job.
 */

type ClassValue = string | number | null | boolean | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    } else {
      classes.push(String(input));
    }
  }

  return classes.join(" ");
}
