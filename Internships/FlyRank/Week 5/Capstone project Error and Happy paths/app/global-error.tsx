"use client";

import { useEffect } from "react";

/**
 * app/global-error.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Only fires if the ROOT layout itself throws (app/layout.tsx) — app/error.tsx
 * can't catch that, since it renders *inside* the root layout. This has to
 * replace <html>/<body> entirely, per Next.js's contract for this file.
 *
 * Deliberately plain, inline-styled, and importing nothing else from the
 * app: if the root layout broke, that's exactly the wrong moment to bet on
 * globals.css, the design system, or any other shared module also being
 * fine. This is the true last resort, one level above app/error.tsx.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error.tsx] root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#f6f7f9",
          color: "#12151c",
        }}
      >
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#1d4ed8" }}>
          Error
        </p>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>This site hit a problem loading</h1>
        <p style={{ maxWidth: "28rem", fontSize: "0.875rem", color: "#565f72" }}>
          Not something you did — try reloading the page.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "0.5rem",
            padding: "0.6rem 1.4rem",
            borderRadius: "0.5rem",
            border: "none",
            backgroundColor: "#1d4ed8",
            color: "#ffffff",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
