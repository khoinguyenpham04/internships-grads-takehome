import { DAY, type Override, type Schedule, type Window } from "./engine.ts";

export type Range = "2w" | "1m";

export type View = { range: Range; anchor: number };

export type State = { schedule: Schedule; overrides: Override[]; view: View };

export type Command =
  | { type: "step"; direction: 1 | -1 }
  | { type: "showToday"; now: number }
  | { type: "setRange"; range: Range }
  | { type: "addUser"; name: string }
  | { type: "removeUser"; index: number }
  | { type: "moveUser"; index: number; direction: 1 | -1 }
  | { type: "setInterval"; days: number }
  | { type: "setHandoverStart"; at: number }
  | { type: "addOverride"; override: Override }
  | { type: "updateOverride"; id: string; changes: Partial<Omit<Override, "id">> }
  | { type: "removeOverride"; id: string }
  | { type: "restore"; state: State };

const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parseStored(raw: string | null): State | null {
  try {
    const data = JSON.parse(raw ?? "null");
    const { schedule: s, overrides: o, view: v } = data ?? {};
    const validSchedule =
      Array.isArray(s?.users) && s.users.length > 0 && s.users.every((u: unknown) => typeof u === "string" && u) &&
      isTime(s.handoverStartAt) && Number.isInteger(s.intervalDays) && s.intervalDays > 0;
    const validOverrides =
      Array.isArray(o) &&
      o.every((x) => typeof x?.id === "string" && typeof x.user === "string" && x.user && isTime(x.start) && isTime(x.end) && x.end > x.start);
    const validView = (v?.range === "2w" || v?.range === "1m") && isTime(v.anchor);
    if (!validSchedule || !validOverrides || !validView) return null;
    const state: State = { schedule: s, overrides: [], view: v };
    const restored = o.reduce((acc: State, override: Override) => placeOverride(acc, override), state);
    return restored.overrides.length === o.length ? restored : null;
  } catch {
    return null;
  }
}

export function conflictWith(overrides: Override[], candidate: Override) {
  return overrides.find((o) => o.id !== candidate.id && o.start < candidate.end && candidate.start < o.end);
}

function placeOverride(state: State, candidate: Override): State {
  const override = { ...candidate, user: candidate.user.trim().toLowerCase() };
  if (!override.user || !(override.end > override.start) || conflictWith(state.overrides, override)) return state;
  const others = state.overrides.filter((o) => o.id !== override.id);
  return { ...state, overrides: [...others, override].sort((a, b) => a.start - b.start) };
}

const readmeStart = Date.parse("2026-11-06T17:00:00Z");

export const readmeWindow: Window = { start: readmeStart, end: Date.parse("2026-11-20T17:00:00Z") };

export const example: State = {
  schedule: { users: ["alice", "bob", "charlie"], handoverStartAt: readmeStart, intervalDays: 7 },
  overrides: [
    { id: "o1", user: "charlie", start: Date.parse("2026-11-09T17:00:00Z"), end: Date.parse("2026-11-09T22:00:00Z") },
  ],
  view: { range: "1m", anchor: readmeStart },
};

export function viewWindow({ range, anchor }: View): Window {
  const d = new Date(anchor);
  if (range === "1m") {
    return { start: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1), end: Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) };
  }
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return { start, end: start + 14 * DAY };
}

export function reducer(state: State, command: Command): State {
  const { view } = state;
  switch (command.type) {
    case "step": {
      const d = new Date(view.anchor);
      const anchor =
        view.range === "1m"
          ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + command.direction, 1)
          : view.anchor + command.direction * 7 * DAY;
      return { ...state, view: { ...view, anchor } };
    }
    case "showToday":
      return { ...state, view: { ...view, anchor: command.now } };
    case "setRange":
      return { ...state, view: { ...view, range: command.range } };
    case "addUser": {
      const name = command.name.trim().toLowerCase();
      return name ? withUsers(state, [...state.schedule.users, name]) : state;
    }
    case "removeUser": {
      if (state.schedule.users.length === 1) return state;
      return withUsers(state, state.schedule.users.filter((_, i) => i !== command.index));
    }
    case "moveUser": {
      const users = [...state.schedule.users];
      const target = command.index + command.direction;
      if (target < 0 || target >= users.length) return state;
      [users[command.index], users[target]] = [users[target], users[command.index]];
      return withUsers(state, users);
    }
    case "setInterval": {
      const days = Math.round(command.days);
      return days >= 1 ? { ...state, schedule: { ...state.schedule, intervalDays: days } } : state;
    }
    case "setHandoverStart":
      return Number.isFinite(command.at) ? { ...state, schedule: { ...state.schedule, handoverStartAt: command.at } } : state;
    case "addOverride":
      return state.overrides.some((o) => o.id === command.override.id) ? state : placeOverride(state, command.override);
    case "updateOverride": {
      const current = state.overrides.find((o) => o.id === command.id);
      return current ? placeOverride(state, { ...current, ...command.changes, id: current.id }) : state;
    }
    case "removeOverride":
      return { ...state, overrides: state.overrides.filter((o) => o.id !== command.id) };
    case "restore":
      return command.state;
  }
}

const withUsers = (state: State, users: string[]): State => ({ ...state, schedule: { ...state.schedule, users } });
