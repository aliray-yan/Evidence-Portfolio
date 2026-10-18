"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

/**
 * components/theme/ThemeToggle.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * A simple two-state light/dark toggle (not a three-way system/light/dark
 * switch — once someone clicks this, we respect their explicit choice).
 *
 * The `mounted` check below is required, not optional: the server has no
 * way to know the visitor's OS theme preference, so it always renders the
 * light-mode icon on first paint. If we rendered the real icon
 * immediately, client and server HTML would mismatch on page load for
 * anyone whose system is in dark mode, and React would throw a hydration
 * error. useSyncExternalStore with a no-op subscribe is the idiomatic way
 * to express "false on the server, true once hydrated on the client" —
 * it's built for exactly this kind of external-environment check, and
 * unlike a useState+useEffect mount flag, it doesn't trigger a
 * post-render setState (which is what a naive version of this pattern
 * gets flagged for).
 */
const emptySubscribe = () => () => {};

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-9 rounded-full border border-border"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary"
    >
      {isDark ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
          />
        </svg>
      )}
    </button>
  );
}
