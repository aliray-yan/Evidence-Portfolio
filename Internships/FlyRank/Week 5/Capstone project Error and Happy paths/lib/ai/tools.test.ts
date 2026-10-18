/**
 * lib/ai/tools.test.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Covers the "return malformed JSON from a tool" sabotage step from the
 * Week 5 resilience brief — reframed for what's actually reachable here:
 * this session's sandbox can't route to openrouter.ai to make a live model
 * call, so there's no way to make the MODEL emit malformed tool-call
 * arguments end to end. What these tests pin down instead is the piece
 * that's actually ours to get right regardless of what the model sends:
 * getSkillsRadar given input that doesn't match anything real throws a
 * specific, friendly error rather than guessing or crashing — the same
 * property route.ts's onError depends on for the mid-stream case.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { searchProjects, getSkillsRadar } from "./tools.ts";

// Tool execute() functions take a second "options" argument (toolCallId,
// messages, context, ...) that only matters when a tool actually reads it
// — neither of ours does. eslint-disable is scoped to this one line of
// test scaffolding, not a statement about the tools' real types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testOptions: any = { toolCallId: "test-call", messages: [] };

/** execute() is typed to allow returning an AsyncIterable (streaming
 *  results); neither of our tools does that, so this asserts the plain
 *  value and gives the test bodies a concrete type to work with. */
async function runTool<T>(result: T | AsyncIterable<T> | PromiseLike<T | AsyncIterable<T>>): Promise<T> {
  const resolved = await result;
  if (resolved !== null && typeof resolved === "object" && Symbol.asyncIterator in resolved) {
    throw new Error("expected a single result, got an async iterable");
  }
  return resolved as T;
}

test("searchProjects: unmatched query returns an empty result, not an error", async () => {
  const result = await runTool(
    searchProjects.execute!({ query: "quantum blockchain nft metaverse", category: undefined, limit: undefined }, testOptions),
  );
  assert.equal(result.returned, 0);
  assert.deepEqual(result.projects, []);
});

test("searchProjects: category filter only returns projects in that category", async () => {
  const result = await runTool(
    searchProjects.execute!({ query: undefined, category: "Security", limit: undefined }, testOptions),
  );
  assert.ok(result.returned > 0, "expected at least one Security project");
  assert.ok(result.projects.every((p) => p.category === "Security"));
});

test("getSkillsRadar: an unknown category throws a specific, friendly error (not a crash, not a silent empty result)", async () => {
  await assert.rejects(
    () => runTool(getSkillsRadar.execute!({ category: "Quantum Computing" }, testOptions)),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      // Names the bad input back and lists the real options — this is
      // exactly the text that ends up in the output-error tool part's
      // errorText in SkillsRadarPart.tsx.
      assert.match(error.message, /Quantum Computing/);
      assert.match(error.message, /SOC & SIEM/);
      return true;
    },
  );
});

test("getSkillsRadar: a partial, differently-cased match still resolves (visitor phrasing shouldn't need to be exact)", async () => {
  const result = await runTool(getSkillsRadar.execute!({ category: "recon" }, testOptions));
  assert.equal(result.categories.length, 1);
  assert.match(result.categories[0].title, /Recon/);
});

test("getSkillsRadar: omitting the category returns all three real categories", async () => {
  const result = await runTool(getSkillsRadar.execute!({ category: undefined }, testOptions));
  assert.equal(result.categories.length, 3);
});
