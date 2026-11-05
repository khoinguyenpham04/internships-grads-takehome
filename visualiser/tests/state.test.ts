import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY, HOUR, render } from "../src/lib/schedule/engine.ts";
import { example, parseStored, reducer, viewWindow, type Command } from "../src/lib/schedule/state.ts";

const T0 = example.schedule.handoverStartAt;
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

test("overlapping or empty overrides are refused, back-to-back ones are fine", () => {
  const charlie = example.overrides[0];
  const overlapping = { id: "x", user: "bob", start: charlie.start + HOUR, end: charlie.end + HOUR };
  assert.deepEqual(run({ type: "addOverride", override: overlapping }).overrides, example.overrides);
  assert.deepEqual(run({ type: "addOverride", override: { ...overlapping, start: 5, end: 5 } }).overrides, example.overrides);
  const after = run({ type: "addOverride", override: { id: "x", user: " Bob ", start: charlie.end, end: charlie.end + HOUR } });
  assert.deepEqual(after.overrides.map((o) => o.user), ["charlie", "bob"]);
});

test("moving an override onto another is refused; moving it clear works and the final schedule follows", () => {
  const state = run(
    { type: "addOverride", override: { id: "x", user: "bob", start: example.overrides[0].end + DAY, end: example.overrides[0].end + 2 * DAY } },
    { type: "updateOverride", id: "x", changes: { start: example.overrides[0].start } },
  );
  assert.equal(state.overrides.find((o) => o.id === "x")!.start, example.overrides[0].end + DAY);
  const moved = reducer(state, { type: "updateOverride", id: "o1", changes: { start: T0, end: T0 + HOUR } });
  assert.equal(render(moved.schedule, moved.overrides, { start: T0, end: T0 + 2 * HOUR }).segments[0].user, "charlie");
});

test("removing an override restores the rotation", () => {
  const state = run({ type: "removeOverride", id: "o1" });
  assert.deepEqual(render(state.schedule, state.overrides, { start: T0, end: T0 + 7 * DAY }).segments.map((s) => s.user), ["alice"]);
});

test("stored state round-trips, and anything malformed or overlapping is rejected", () => {
  const edited = run({ type: "addUser", name: "dana" }, { type: "setRange", range: "2w" });
  assert.deepEqual(parseStored(JSON.stringify(edited)), edited);
  const broken = [
    null,
    "not json",
    JSON.stringify({ ...edited, schedule: { ...edited.schedule, users: [] } }),
    JSON.stringify({ ...edited, schedule: { ...edited.schedule, intervalDays: 1.5 } }),
    JSON.stringify({ ...edited, view: { range: "1y", anchor: 0 } }),
    JSON.stringify({ ...edited, overrides: [...edited.overrides, { ...edited.overrides[0], id: "copy" }] }),
  ];
  for (const raw of broken) assert.equal(parseStored(raw), null, String(raw));
});

test("windows: one month is the calendar month, two weeks start on Monday", () => {
  const month = viewWindow({ range: "1m", anchor: Date.parse("2026-11-20T09:00:00Z") });
  assert.deepEqual([month.start, month.end], [Date.parse("2026-11-01T00:00:00Z"), Date.parse("2026-12-01T00:00:00Z")]);
  const fortnight = viewWindow({ range: "2w", anchor: Date.parse("2026-11-08T09:00:00Z") });
  assert.equal(fortnight.start, Date.parse("2026-11-02T00:00:00Z"));
});
