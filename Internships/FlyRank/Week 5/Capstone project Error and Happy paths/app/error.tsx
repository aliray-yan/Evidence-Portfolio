"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";

/**
 * app/error.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Next.js route-segment error boundary — catches render/data errors
 * thrown anywhere under this app (e.g. a future Phase 3 database call
 * failing). This is a DIFFERENT failure category from the chat widget's
 * error handling (app/api/chat/route.ts + ChatWidget's error banner): this
 * one is for the page itself breaking, not a chat response.
 *
 * Sitting at the app root, this replaces everything below the root layout
 * when it activates — including (public)'s Navbar/Footer, which live in a
 * layout between here and the page that threw. So this needs to stand on
 * its own rather than assume any chrome is still there, which is also why
 * it's deliberately plain: a page that just broke is not the moment to
 * lean on anything else that could also be broken.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error.tsx] route render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Error</p>
      <h1 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
        Something broke on this page
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        That&apos;s on this site, not something you did. Try again, or head back to the homepage.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <LinkButton href="/" variant="outline">
          Go home
        </LinkButton>
      </div>
    </div>
  );
}
