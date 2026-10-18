"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useAutoScroll
 * ─────────────────────────────────────────────────────────────────────────
 * Keeps a scroll container pinned to the bottom while new content streams
 * in — but ONLY while the user is already at the bottom. The moment they
 * scroll up (to re-read something while tokens keep arriving), the pin
 * releases and we stop yanking their scroll position. `scrollToBottom` is
 * exposed for a "jump to latest" button to re-engage the pin.
 *
 * This runs on every change to `trigger` (pass the message list — its
 * reference changes on every streamed token, not just on new messages),
 * which is the scenario mentor feedback calls out most often: auto-scroll
 * that only works between messages, not during a single streaming message.
 */
export function useAutoScroll<T>(trigger: T) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(true);

  // How close to the bottom (in px) still counts as "at the bottom".
  const BOTTOM_THRESHOLD = 56;

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsPinned(distanceFromBottom <= BOTTOM_THRESHOLD);
  }, []);

  useEffect(() => {
    if (!isPinned) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [trigger, isPinned]);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setIsPinned(true);
  }, []);

  return { containerRef, isPinned, handleScroll, scrollToBottom };
}
