import { DAY, render, type Override, type Schedule, type Segment, type Window } from "./engine.ts";

export type Gap = { start: number; end: number; user: string; source: Segment["source"] };

export type Step =
  | { kind: "intro" }
  | { kind: "boundary"; index: number; at: number; reasons: string[] }
  | { kind: "gap"; index: number; gap: Gap }
  | { kind: "join"; joined: number };

export type Walkthrough = { boundaries: number[]; gaps: Gap[]; segments: Segment[]; steps: Step[] };

const name = (user: string) => user.charAt(0).toUpperCase() + user.slice(1);

export function walkthrough(schedule: Schedule, overrides: Override[], window: Window): Walkthrough {
  const { boundaries, segments } = render(schedule, overrides, window);
  const interval = schedule.intervalDays * DAY;
  const userAt = (shift: number) => schedule.users[shift % schedule.users.length];

  const reasonsAt = (t: number) => {
    const reasons: string[] = [];
    if (t === boundaries[0]) reasons.push(t === window.start ? "Window starts" : "Rotation starts");
    const elapsed = t - schedule.handoverStartAt;
    if (elapsed > 0 && elapsed % interval === 0 && t !== window.end) {
      const shift = elapsed / interval;
      reasons.push(`Handover, ${name(userAt(shift - 1))} to ${name(userAt(shift))}`);
    }
    for (const o of overrides) {
      if (o.start === t) reasons.push(`${name(o.user)}'s override starts`);
      if (o.end === t && t !== window.end) reasons.push(`${name(o.user)}'s override ends`);
    }
    if (t === window.end) reasons.push("Window ends");
    return reasons;
  };

  const gaps = boundaries.slice(1).map((end, i) => {
    const start = boundaries[i];
    const segment = segments.find((s) => s.start <= start && start < s.end)!;
    return { start, end, user: segment.user, source: segment.source };
  });

  const steps: Step[] = [
    { kind: "intro" },
    ...boundaries.map((at, index) => ({ kind: "boundary" as const, index, at, reasons: reasonsAt(at) })),
    ...gaps.map((gap, index) => ({ kind: "gap" as const, index, gap })),
    { kind: "join", joined: gaps.length - segments.length },
  ];
  return { boundaries, gaps, segments, steps };
}

export function caption(step: Step, total: { boundaries: number; segments: number }) {
  switch (step.kind) {
    case "intro":
      return "Two inputs, a rotation and its overrides. First, find every moment the answer to “who is on call?” could change.";
    case "boundary":
      return `Boundary ${step.index + 1}. ${step.reasons.join(", ")}.`;
    case "gap": {
      const who = name(step.gap.user);
      return step.gap.source.kind === "override"
        ? `Gap ${step.index + 1}. An override is active, so ${who} covers it.`
        : `Gap ${step.index + 1}. No override, so the rotation decides: shift ${step.gap.source.shift + 1} is ${who}.`;
    }
    case "join":
      return step.joined > 0
        ? `Neighbouring gaps from the same shift or override are joined, giving ${total.segments} entries.`
        : `No neighbouring gaps share a source, so nothing is joined. ${total.segments} entries, the CLI output.`;
  }
}
