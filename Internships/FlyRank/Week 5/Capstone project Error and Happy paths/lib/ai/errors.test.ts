/**
 * lib/ai/errors.test.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Sabotage that runs on every commit, per the Week 5 resilience brief's
 * stretch goal — no test framework dependency, just Node's built-in
 * runner:
 *
 *   npm test
 *   (or directly: node --experimental-strip-types --test lib/ai/errors.test.ts)
 *
 * This can't drive an actual mid-stream failure end to end without a real
 * provider call (see the "network sandbox" note in PROJECT_HANDOFF.md for
 * why that couldn't be exercised live in this session) — what it CAN do,
 * and does, is pin down the exact mapping route.ts's onError depends on:
 * given the specific shape of error the provider throws, the visitor gets
 * the specific message they should. That mapping is the part most likely
 * to silently regress (e.g. someone "simplifying" it back to raw
 * error.message, which would leak provider internals to the browser).
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { APICallError } from "ai";
import { describeError } from "./errors.ts";

function fakeApiError(statusCode: number | undefined) {
  return new APICallError({
    message: "synthetic error for testing",
    url: "https://example.invalid/v1/chat/completions",
    requestBodyValues: {},
    statusCode,
  });
}

test("429 (rate limit) gets a wait-and-retry message", () => {
  const message = describeError(fakeApiError(429));
  assert.match(message, /getting a lot of requests|rate/i);
});

test("5xx (provider outage) gets a temporarily-unavailable message", () => {
  assert.match(describeError(fakeApiError(500)), /temporarily unavailable/i);
  assert.match(describeError(fakeApiError(503)), /temporarily unavailable/i);
});

test("other API errors (4xx, no status) fall back to the generic message", () => {
  const fallback = "The assistant hit an error generating a response. Please try again.";
  assert.equal(describeError(fakeApiError(403)), fallback);
  assert.equal(describeError(fakeApiError(undefined)), fallback);
});

test("a non-APICallError (e.g. a thrown string or plain Error) never leaks raw detail", () => {
  const fallback = "The assistant hit an error generating a response. Please try again.";
  assert.equal(describeError(new Error("ECONNRESET: socket hang up at 10.0.4.2:443")), fallback);
  assert.equal(describeError("some random rejection"), fallback);
});

test("no message ever contains a URL, stack trace, or API key-shaped string", () => {
  const cases = [fakeApiError(429), fakeApiError(500), fakeApiError(403), new Error("boom"), null];
  for (const c of cases) {
    const message = describeError(c);
    assert.doesNotMatch(message, /https?:\/\//);
    assert.doesNotMatch(message, /sk-[a-zA-Z0-9-]/);
    assert.doesNotMatch(message, / at .+:\d+:\d+/); // stack-trace-shaped line
  }
});
