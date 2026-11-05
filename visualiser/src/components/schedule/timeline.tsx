"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DAY, type Window } from "@/lib/schedule/engine";
import { capitalise, formatDateTime, formatDuration, formatMonth, formatWeekday, personTone } from "@/lib/schedule/display";

export type Block = { key: string; user: string; start: number; end: number; override: boolean; detail: string };

export type Row = { label: string } & ({ blocks: Block[] } | { lane: React.ReactNode });

type Props = {
  window: Window;
  users: string[];
  rows: Row[];
  now: number | null;
  boundaries?: number[];
};

export const stripes = {
  backgroundImage:
    "repeating-linear-gradient(135deg, color-mix(in srgb, currentColor 28%, transparent) 0 1.5px, transparent 1.5px 5px)",
};

export const blockClass =
  "absolute top-1/2 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded-[4px] px-2 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export const blockPosition = (left: number, width: number) => ({
  left: `calc(${left}% + 1px)`,
  width: `max(4px, calc(${width}% - 2px))`,
});

export const windowPercent = (window: Window) => (t: number) =>
  ((Math.min(Math.max(t, window.start), window.end) - window.start) / (window.end - window.start)) * 100;

export function Timeline({ window, users, rows, now, boundaries = [] }: Props) {
  const pct = windowPercent(window);
  const inWindow = (t: number) => t >= window.start && t <= window.end;

  const days: { start: number; full: boolean }[] = [];
  for (let d = Math.floor(window.start / DAY) * DAY; d < window.end; d += DAY) {
    days.push({ start: d, full: d >= window.start && d + DAY <= window.end });
  }
  const months = days.filter((d, i) => (i === 0 || new Date(d.start).getUTCDate() === 1) && d.full);
  const today = now === null ? null : Math.floor(now / DAY) * DAY;

  return (
    <div className="grid grid-cols-[104px_1fr] text-[11px] select-none">
      <div className="flex flex-col">
        <div className="h-6" />
        <div className="flex h-8 items-center border-b text-muted-foreground">UTC</div>
        {rows.map((row) => (
          <div key={row.label} className="flex h-12 items-center border-b border-border/70 text-[12px] text-foreground/70">
            {row.label}
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="relative h-6">
          {boundaries.length === 0 && months.map((m) => (
            <span key={m.start} className="absolute top-1 pl-1.5 font-medium whitespace-nowrap" style={{ left: `${pct(m.start)}%` }}>
              {formatMonth(m.start)}
            </span>
          ))}
        </div>

        <div className="relative">
          {days.map((d) => {
            const weekend = [0, 6].includes(new Date(d.start).getUTCDay());
            return (
              <div
                key={d.start}
                className={cn("absolute inset-y-0 border-l border-border/70", weekend && "bg-[#fafafa]")}
                style={{ left: `${pct(d.start)}%`, width: `${pct(d.start + DAY) - pct(d.start)}%` }}
              />
            );
          })}

          <div className="relative flex h-8 items-center border-b">
            {days.map((d) =>
              d.full ? (
                <span
                  key={d.start}
                  className="absolute flex justify-center"
                  style={{ left: `${pct(d.start)}%`, width: `${pct(d.start + DAY) - pct(d.start)}%` }}
                >
                  <span
                    className={cn(
                      "rounded-[4px] px-1 py-px whitespace-nowrap tabular-nums",
                      [0, 6].includes(new Date(d.start).getUTCDay()) ? "text-foreground/30" : "text-foreground/55",
                      d.start === today && "bg-signal-orange font-medium text-white",
                    )}
                  >
                    {formatWeekday(d.start)} {new Date(d.start).getUTCDate()}
                  </span>
                </span>
              ) : null,
            )}
          </div>

          {rows.map((row) => (
            <div key={row.label} className="relative h-12 border-b border-border/70">
              {"lane" in row
                ? row.lane
                : row.blocks.map((b) => (
                    <TimelineBlock key={b.key} block={b} users={users} left={pct(b.start)} width={pct(b.end) - pct(b.start)} />
                  ))}
            </div>
          ))}

          {boundaries.filter(inWindow).map((t, i, all) => (
            <div key={t} className="pointer-events-none absolute top-0 bottom-0 w-px bg-signal-orange/45" style={{ left: `${pct(t)}%` }}>
              <span
                className={cn(
                  "absolute -top-5 rounded-full",
                  i === 0 ? "translate-x-0" : i === all.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
                )}
              >
                <span className="block rounded-full bg-signal-orange px-1.5 text-[10px] leading-4 font-semibold text-white tabular-nums">
                {i + 1}
                </span>
              </span>
            </div>
          ))}

          {now !== null && now > window.start && now < window.end && (
            <div className="pointer-events-none absolute top-8 bottom-0 w-px bg-signal-orange" style={{ left: `${pct(now)}%` }} />
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineBlock({ block, users, left, width }: { block: Block; users: string[]; left: number; width: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          className={cn(blockClass, personTone(block.user, users))}
          style={{ ...blockPosition(left, width), ...(block.override ? stripes : {}) }}
        >
          {width > 3 && <span className="truncate">{capitalise(block.user)}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent className="flex flex-col items-start gap-0.5">
        <span className="font-medium">
          {capitalise(block.user)} <span className="font-normal opacity-60">· {block.detail}</span>
        </span>
        <span className="tabular-nums opacity-80">
          {formatDateTime(block.start)} to {formatDateTime(block.end)} ({formatDuration(block.end - block.start)})
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
