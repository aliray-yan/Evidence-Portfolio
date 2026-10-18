/**
 * lib/ai/errors.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Maps a thrown error from the model/provider call to a message a visitor
 * can actually act on. Pulled out of app/api/chat/route.ts so it's unit
 * -testable without spinning up a request (see errors.test.ts) — this is
 * the piece of the resilience assignment most worth covering with a real
 * test, since it's easy to silently regress ("just return error.message")
 * without a network call ever proving it wrong.
 */

import { APICallError } from "ai";

export function describeError(error: unknown): string {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) {
      return "The assistant is getting a lot of requests right now. Wait a few seconds and try again.";
    }
    if (error.statusCode !== undefined && error.statusCode >= 500) {
      return "The AI provider is temporarily unavailable. Please try again in a moment.";
    }
  }
  return "The assistant hit an error generating a response. Please try again.";
}
