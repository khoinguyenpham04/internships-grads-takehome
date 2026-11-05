export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export type Schedule = {
  users: string[];
  handoverStartAt: number;
  intervalDays: number;
};

export type Override = { id: string; user: string; start: number; end: number };

export type Window = { start: number; end: number };

export type Source = { kind: "rotation"; shift: number } | { kind: "override"; id: string };

export type Segment = { user: string; start: number; end: number; source: Source };

export type Rendered = { boundaries: number[]; segments: Segment[] };

export class ScheduleError extends Error {}

export function findOverlap(overrides: Override[]): [Override, Override] | null {
  const sorted = [...overrides].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) return [sorted[i - 1], sorted[i]];
  }
  return null;
}

export function render(schedule: Schedule, overrides: Override[], window: Window): Rendered {
  if (window.start >= window.end) throw new ScheduleError("the window start must be before its end");
  if (schedule.users.length === 0) throw new ScheduleError("the rotation needs at least one person");
  if (!Number.isInteger(schedule.intervalDays) || schedule.intervalDays <= 0) {
    throw new ScheduleError("the handover interval must be a positive whole number of days");
  }
  const overlap = findOverlap(overrides);
  if (overlap) throw new ScheduleError(`overrides overlap: ${overlap[0].user} and ${overlap[1].user}`);

  const start = Math.max(window.start, schedule.handoverStartAt);
  if (start >= window.end) return { boundaries: [], segments: [] };

  const interval = schedule.intervalDays * DAY;
  const points = new Set([start, window.end]);
  const elapsed = Math.floor((start - schedule.handoverStartAt) / interval);
  for (let t = schedule.handoverStartAt + (elapsed + 1) * interval; t < window.end; t += interval) {
    points.add(t);
  }
  for (const o of overrides) {
    for (const t of [o.start, o.end]) if (start < t && t < window.end) points.add(t);
  }

  const boundaries = [...points].sort((a, b) => a - b);
  const segments: Segment[] = [];
  for (let i = 1; i < boundaries.length; i++) {
    const [a, b] = [boundaries[i - 1], boundaries[i]];
    const { user, source } = whoIsOnCall(a, schedule, overrides);
    const last = segments.at(-1);
    if (last && sameSource(last.source, source)) last.end = b;
    else segments.push({ user, start: a, end: b, source });
  }
  return { boundaries, segments };
}

function whoIsOnCall(moment: number, schedule: Schedule, overrides: Override[]) {
  const o = overrides.find((o) => o.start <= moment && moment < o.end);
  if (o) return { user: o.user, source: { kind: "override", id: o.id } as Source };
  const shift = Math.floor((moment - schedule.handoverStartAt) / (schedule.intervalDays * DAY));
  return { user: schedule.users[shift % schedule.users.length], source: { kind: "rotation", shift } as Source };
}

export function sameSource(a: Source, b: Source) {
  return a.kind === "rotation" ? b.kind === "rotation" && a.shift === b.shift : b.kind === "override" && a.id === b.id;
}

export function formatInstant(t: number) {
  return new Date(t).toISOString().replace(".000Z", "Z");
}

export function toCliOutput(segments: Segment[]) {
  return segments.map((s) => ({ user: s.user, start_at: formatInstant(s.start), end_at: formatInstant(s.end) }));
}
