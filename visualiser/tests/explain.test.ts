import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY } from "../src/lib/schedule/engine.ts";
import { caption, walkthrough } from "../src/lib/schedule/explain.ts";
import { example, readmeWindow } from "../src/lib/schedule/state.ts";

test("the README walkthrough names why each boundary exists", () => {
  const w = walkthrough(example.schedule, example.overrides, readmeWindow);
  const reasons = w.steps.flatMap((s) => (s.kind === "boundary" ? [s.reasons.join(", ")] : []));
  assert.deepEqual(reasons, [
    "Window starts",
    "Charlie's override starts",
    "Charlie's override ends",
    "Handover, Alice to Bob",
    "Window ends",
  ]);
  assert.deepEqual(w.gaps.map((g) => g.user), ["alice", "charlie", "alice", "bob"]);
  assert.equal(w.steps.length, 1 + 5 + 4 + 1);
});

test("an override across a handover is two gaps but one entry, and the join step says so", () => {
  const start = example.schedule.handoverStartAt;
  const overrides = [{ id: "x", user: "dana", start: start + 6 * DAY, end: start + 8 * DAY }];
  const w = walkthrough(example.schedule, overrides, { start, end: start + 14 * DAY });
  assert.equal(w.gaps.filter((g) => g.user === "dana").length, 2);
  assert.equal(w.segments.filter((s) => s.user === "dana").length, 1);
  const join = w.steps.at(-1)!;
  assert.equal(join.kind === "join" && join.joined, 1);
  assert.match(caption(join, { boundaries: w.boundaries.length, segments: w.segments.length }), /joined, giving 3 entries/);
});

test("a window that starts before the rotation explains the rotation start", () => {
  const start = example.schedule.handoverStartAt;
  const w = walkthrough(example.schedule, [], { start: start - DAY, end: start + DAY });
  const first = w.steps[1];
  assert.equal(first.kind === "boundary" && first.reasons[0], "Rotation starts");
});
