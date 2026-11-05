import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { DAY, HOUR, formatInstant, render, toCliOutput, type Override } from "../src/lib/schedule/engine.ts";

type Case = {
  name: string;
  users: string[];
  start: number;
  intervalDays: number;
  overrides: Override[];
  from: number;
  until: number;
};

const T0 = Date.parse("2026-11-06T17:00:00Z");
const o = (id: string, user: string, start: number, end: number): Override => ({ id, user, start, end });

const fixed: Case[] = [
  {
    name: "readme example",
    users: ["alice", "bob", "charlie"],
    start: T0,
    intervalDays: 7,
    overrides: [o("1", "charlie", Date.parse("2026-11-09T17:00:00Z"), Date.parse("2026-11-09T22:00:00Z"))],
    from: T0,
    until: Date.parse("2026-11-20T17:00:00Z"),
  },
  { name: "window before start", users: ["a", "b"], start: T0, intervalDays: 7, overrides: [], from: T0 - 10 * DAY, until: T0 - DAY },
  { name: "window straddles start", users: ["a", "b"], start: T0, intervalDays: 1, overrides: [], from: T0 - DAY, until: T0 + 3 * DAY },
  { name: "override spans handover", users: ["a", "b"], start: T0, intervalDays: 7, overrides: [o("1", "x", T0 + 6 * DAY, T0 + 8 * DAY)], from: T0, until: T0 + 14 * DAY },
  { name: "override clipped both sides", users: ["a"], start: T0, intervalDays: 7, overrides: [o("1", "x", T0 - DAY, T0 + 30 * DAY)], from: T0 + DAY, until: T0 + 2 * DAY },
  { name: "back to back overrides", users: ["a", "b"], start: T0, intervalDays: 7, overrides: [o("1", "x", T0 + HOUR, T0 + 2 * HOUR), o("2", "x", T0 + 2 * HOUR, T0 + 3 * HOUR)], from: T0, until: T0 + DAY },
  { name: "same user override next to own shift", users: ["a", "b"], start: T0, intervalDays: 1, overrides: [o("1", "b", T0, T0 + DAY)], from: T0, until: T0 + 2 * DAY },
  { name: "far future wraparound", users: ["a", "b", "c"], start: T0, intervalDays: 3, overrides: [], from: T0 + 1000 * DAY + 5 * HOUR, until: T0 + 1010 * DAY },
  { name: "duplicate users", users: ["a", "a", "b"], start: T0, intervalDays: 1, overrides: [], from: T0, until: T0 + 4 * DAY },
  { name: "overlap is rejected", users: ["a"], start: T0, intervalDays: 7, overrides: [o("1", "x", T0, T0 + 2 * HOUR), o("2", "y", T0 + HOUR, T0 + 3 * HOUR)], from: T0, until: T0 + DAY },
  { name: "empty window is rejected", users: ["a"], start: T0, intervalDays: 7, overrides: [], from: T0, until: T0 },
];

function seeded(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

function randomCases(count: number): Case[] {
  const rand = seeded(42);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const names = ["alice", "bob", "charlie", "dana", "eve"];
  return Array.from({ length: count }, (_, i) => {
    const users = Array.from({ length: int(1, 4) }, () => names[int(0, names.length - 1)]);
    const overrides: Override[] = [];
    let cursor = T0 + int(-5, 5) * DAY;
    for (let k = int(0, 6); k > 0; k--) {
      const start = cursor + int(0, 72) * HOUR;
      const end = start + int(1, 96) * HOUR;
      overrides.push(o(String(k), names[int(0, names.length - 1)], start, end));
      cursor = end;
    }
    const from = T0 + int(-10, 30) * DAY + int(0, 23) * HOUR;
    return { name: `random ${i}`, users, start: T0, intervalDays: int(1, 8), overrides, from, until: from + int(1, 21) * DAY };
  });
}

const PYTHON = `
import json, sys
sys.path.insert(0, sys.argv[1])
import scheduler as s
out = []
for c in json.load(sys.stdin):
    try:
        sch = s.parse_schedule(c["schedule"])
        ovs = s.parse_overrides(c["overrides"])
        entries = s.render(sch, ovs, s.parse_time(c["from"], "from"), s.parse_time(c["until"], "until"))
        out.append([s.entry_to_json(e) for e in entries])
    except s.InputError:
        out.append("error")
print(json.dumps(out))
`;

function python(cases: Case[]) {
  const payload = cases.map((c) => ({
    schedule: { users: c.users, handover_start_at: formatInstant(c.start), handover_interval_days: c.intervalDays },
    overrides: c.overrides.map((x) => ({ user: x.user, start_at: formatInstant(x.start), end_at: formatInstant(x.end) })),
    from: formatInstant(c.from),
    until: formatInstant(c.until),
  }));
  const solution = path.resolve(import.meta.dirname, "../../solution");
  return JSON.parse(execFileSync("python3", ["-c", PYTHON, solution], { input: JSON.stringify(payload) }).toString());
}

function typescript(c: Case) {
  try {
    const schedule = { users: c.users, handoverStartAt: c.start, intervalDays: c.intervalDays };
    return toCliOutput(render(schedule, c.overrides, { start: c.from, end: c.until }).segments);
  } catch {
    return "error";
  }
}

test("TypeScript engine matches scheduler.py", () => {
  const cases = [...fixed, ...randomCases(500)];
  const expected = python(cases);
  cases.forEach((c, i) => assert.deepEqual(typescript(c), expected[i], c.name));
});

test("readme example matches the brief", () => {
  assert.deepEqual(typescript(fixed[0]), [
    { user: "alice", start_at: "2026-11-06T17:00:00Z", end_at: "2026-11-09T17:00:00Z" },
    { user: "charlie", start_at: "2026-11-09T17:00:00Z", end_at: "2026-11-09T22:00:00Z" },
    { user: "alice", start_at: "2026-11-09T22:00:00Z", end_at: "2026-11-13T17:00:00Z" },
    { user: "bob", start_at: "2026-11-13T17:00:00Z", end_at: "2026-11-20T17:00:00Z" },
  ]);
});
