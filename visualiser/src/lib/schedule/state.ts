import { DAY, type Override, type Schedule, type Window } from "./engine";

export type Range = "2w" | "1m";

export type View = { range: Range; anchor: number };

export type State = { schedule: Schedule; overrides: Override[]; view: View };

export type Command =
  | { type: "step"; direction: 1 | -1 }
  | { type: "showToday"; now: number }
  | { type: "setRange"; range: Range };

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
  }
}
