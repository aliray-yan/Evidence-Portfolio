import test from "node:test";
import assert from "node:assert/strict";
import { createStandaloneSeed } from "./standaloneData.js";

test("standalone seed includes the full learning platform counts", () => {
  const seed = createStandaloneSeed();

  assert.equal(seed.levels.length, 26);
  assert.ok(seed.modules.length >= 30);
  assert.ok(seed.lessons.length >= 60);
  assert.ok(seed.quizQuestions.length >= 200);
  assert.ok(seed.practiceExercises.length >= 50);
  assert.ok(seed.guidedProjects.length >= 15);
  assert.ok(seed.achievements.length >= 20);
});

test("standalone exercises are gradeable console output tasks", () => {
  const seed = createStandaloneSeed();
  const exercise = seed.practiceExercises[0];

  assert.match(exercise.problemStatement, /prints exactly three lines/);
  assert.match(exercise.solution, /Console\.WriteLine/);
  assert.match(exercise.expectedOutput, /Status: complete/);
  assert.ok(exercise.tags.includes("graded"));
});

test("guided projects have persistent checklist-ready steps", () => {
  const seed = createStandaloneSeed();
  const project = seed.guidedProjects[0];

  assert.ok(Array.isArray(seed.projectProgress));
  assert.ok(project.steps.length >= 7);
  assert.ok(project.steps.every((step) => step.startsWith("Checkpoint:")));
});
