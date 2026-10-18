"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";

/**
 * Runs a short crossfade+rise on an element whenever `stateKey` changes.
 *
 * Purpose-built for the AI tool-call lifecycle: input-streaming →
 * input-available → output-available (or output-error) should read as one
 * thing continuing, not four separate cards swapping in with a layout
 * jump. Attach the returned ref to the element whose *content* changes
 * with the state (not the outer card shell, which should stay put).
 *
 * Skips the animation on first mount (nothing to transition from yet) and
 * respects prefers-reduced-motion.
 */
export function useStateTransition<T extends HTMLElement>(stateKey: string) {
  const ref = useRef<T | null>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    animate(el, {
      opacity: [0, 1],
      translateY: [6, 0],
      duration: 220,
      ease: "outQuad",
    });
  }, [stateKey]);

  return ref;
}
