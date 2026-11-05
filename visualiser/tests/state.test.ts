import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY, render } from "../src/lib/schedule/engine.ts";
import { example, reducer, viewWindow, type Command } from "../src/lib/schedule/state.ts";

const run = (...commands: Command[]) => commands.reduce(reducer, example);

test("the last person cannot be removed, so the rotation always renders", () => {
  const state = run({ type: "removeUser", index: 0 }, { type: "removeUser", index: 0 }, { type: "removeUser", index: 0 });
  assert.deepEqual(state.schedule.users, ["charlie"]);
  assert.doesNotThrow(() => render(state.schedule, state.overrides, viewWindow(state.view)));
});

test("added names are trimmed and blank names are ignored", () => {
  const state = run({ type: "addUser", name: "  Dana " }, { type: "addUser", name: "   " });
  assert.deepEqual(state.schedule.users, ["alice", "bob", "charlie", "dana"]);
});

test("moving a person changes who is on call", () => {
  const state = run({ type: "moveUser", index: 1, direction: -1 }, { type: "moveUser", index: 0, direction: -1 });
  assert.deepEqual(state.schedule.users, ["bob", "alice", "charlie"]);
  const first = render(state.schedule, [], { start: state.schedule.handoverStartAt, end: state.schedule.handoverStartAt + DAY });
  assert.equal(first.segments[0].user, "bob");
});

test("invalid intervals and times are ignored", () => {
  const state = run({ type: "setInterval", days: 0 }, { type: "setInterval", days: Number.NaN }, { type: "setHandoverStart", at: Number.NaN });
  assert.deepEqual(state.schedule, example.schedule);
  assert.equal(run({ type: "setInterval", days: 3 }).schedule.intervalDays, 3);
});

test("windows: one month is the calendar month, two weeks start on Monday", () => {
  const month = viewWindow({ range: "1m", anchor: Date.parse("2026-11-20T09:00:00Z") });
  assert.deepEqual([month.start, month.end], [Date.parse("2026-11-01T00:00:00Z"), Date.parse("2026-12-01T00:00:00Z")]);
  const fortnight = viewWindow({ range: "2w", anchor: Date.parse("2026-11-08T09:00:00Z") });
  assert.equal(fortnight.start, Date.parse("2026-11-02T00:00:00Z"));
});
