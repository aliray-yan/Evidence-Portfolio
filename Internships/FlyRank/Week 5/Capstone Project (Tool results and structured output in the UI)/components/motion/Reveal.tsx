"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, stagger } from "animejs";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /**
   * "mount" animates as soon as this component renders — for above-the-
   * fold content like the hero. "scroll" waits until it's scrolled into
   * view — for sections further down the homepage.
   */
  trigger?: "mount" | "scroll";
  /** Stagger delay (ms) between each direct child. */
  staggerMs?: number;
  /** Extra delay (ms) before the animation starts. */
  delay?: number;
}

/**
 * components/motion/Reveal.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Fades + rises the direct children of this wrapper in, staggered, either
 * on mount or the first time it scrolls into view. One small primitive
 * instead of hand-rolling a transition per section — used on the homepage
 * hero and below-the-fold sections; reach for it anywhere else on the site
 * that could use the same entrance treatment.
 *
 * Renders children at full opacity by default (server-rendered HTML is
 * always fully visible, so nothing depends on JavaScript running) and only
 * hides-then-reveals them client-side, after mount, via inline styles —
 * that keeps this progressive enhancement rather than a hard requirement.
 */
export default function Reveal({
  children,
  className,
  trigger = "scroll",
  staggerMs = 90,
  delay = 0,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = Array.from(el.children) as HTMLElement[];
    if (targets.length === 0) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const run = () => {
      animate(targets, {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 600,
        delay: stagger(staggerMs, { start: delay }),
        ease: "outCubic",
      });
    };

    if (trigger === "mount") {
      // Hide synchronously right before animating in, so there's no
      // visible flash of the fully-settled layout first.
      targets.forEach((t) => (t.style.opacity = "0"));
      run();
      return;
    }

    targets.forEach((t) => (t.style.opacity = "0"));
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trigger, staggerMs, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
