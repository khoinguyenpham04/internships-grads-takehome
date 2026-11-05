"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowCounterClockwiseIcon, CaretLeftIcon, CaretRightIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Kbd } from "@/components/ui/kbd";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CliSheet } from "@/components/schedule/cli-sheet";
import { PersonChip } from "@/components/schedule/person-chip";
import { Timeline, type Block, type Row } from "@/components/schedule/timeline";
import { formatInstant, render, sameSource, type Override, type Schedule, type Segment } from "@/lib/schedule/engine";
import { caption, walkthrough, type Gap, type Step } from "@/lib/schedule/explain";
import { formatDateTime } from "@/lib/schedule/display";
import { readmeWindow } from "@/lib/schedule/state";

const pause: Record<Step["kind"], number> = { intro: 1600, boundary: 1100, gap: 1300, join: 1600 };

const sourceDetail = (source: Segment["source"]) =>
  source.kind === "override" ? "Override" : `Rotation shift ${source.shift + 1}`;

const toBlock = (s: Gap | Segment, extra: Partial<Block> = {}): Block => ({
  key: `${s.start}`,
  user: s.user,
  start: s.start,
  end: s.end,
  override: s.source.kind === "override",
  detail: sourceDetail(s.source),
  ...extra,
});

export function ExplainMode({ schedule, overrides }: { schedule: Schedule; overrides: Override[] }) {
  const window = readmeWindow;
  const w = useMemo(() => walkthrough(schedule, overrides, window), [schedule, overrides, window]);
  const rotation = useMemo(() => render(schedule, [], window).segments, [schedule, window]);
  const [requested, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = w.steps.length - 1;
  const index = Math.min(requested, last);
  const step = w.steps[index];

  const jump = (next: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(next, last)));
  };
  const toggle = () => {
    if (!playing && index === last) setStep(0);
    setPlaying(!playing);
  };

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      if (index + 1 >= last) setPlaying(false);
      setStep(index + 1);
    }, pause[step.kind]);
    return () => clearTimeout(id);
  }, [playing, index, last, step.kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target instanceof HTMLInputElement) return;
      const actions: Record<string, () => void> = {
        " ": toggle,
        ArrowRight: () => jump(index + 1),
        ArrowLeft: () => jump(index - 1),
        Home: () => jump(0),
        End: () => jump(last),
      };
      if (!actions[e.key]) return;
      e.preventDefault();
      actions[e.key]();
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  });

  const revealed = step.kind === "intro" ? 0 : step.kind === "boundary" ? step.index + 1 : w.boundaries.length;
  const gapIndex = step.kind === "gap" ? step.index : step.kind === "join" ? w.gaps.length : -1;
  const deciding = step.kind === "gap" ? step.gap.source.kind : null;

  const rows: Row[] = [
    { label: "Rotation", blocks: rotation.map((s) => toBlock(s, { muted: deciding === "override" })) },
    {
      label: "Overrides",
      blocks: overrides
        .filter((o) => o.end > window.start && o.start < window.end)
        .map((o) => ({ key: o.id, user: o.user, start: o.start, end: o.end, override: true, detail: "Override", muted: deciding === "rotation" })),
    },
    {
      label: "Final",
      blocks:
        step.kind === "join"
          ? w.segments.map((s) => toBlock(s, { fresh: true }))
          : w.gaps.slice(0, gapIndex + 1).map((g, i) => toBlock(g, { fresh: i === gapIndex })),
    },
  ];

  return (
    <div className="flex flex-col gap-5 px-4 pt-3 pb-8">
      <div className="flex h-7 items-center gap-3">
        <span className="text-[13px] font-medium">README example</span>
        <span className="text-[12px] text-muted-foreground tabular-nums">
          --from={formatInstant(window.start)} --until={formatInstant(window.end)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge variant="secondary" className="tabular-nums">{w.boundaries.length} boundaries</Badge>
          <Badge variant="secondary" className="tabular-nums">{w.gaps.length} gaps</Badge>
          <Badge variant="secondary" className="tabular-nums">{w.segments.length} entries</Badge>
          <CliSheet schedule={schedule} overrides={overrides} window={window} />
        </div>
      </div>

      <div className="pt-3">
        <Timeline
          window={window}
          users={schedule.users}
          rows={rows}
          now={null}
          hideMonths
          boundaries={w.boundaries.slice(0, revealed)}
          activeBoundary={step.kind === "boundary" ? step.index : step.kind === "gap" ? -1 : undefined}
          highlight={step.kind === "gap" ? step.gap : null}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border px-4 py-3">
        <div className="flex items-center gap-3">
          <ButtonGroup>
            <Control label="Restart" keys="Home" onClick={() => jump(0)}>
              <ArrowCounterClockwiseIcon />
            </Control>
            <Control label="Previous step" keys="←" onClick={() => jump(index - 1)} disabled={index === 0}>
              <CaretLeftIcon />
            </Control>
            <Control label={playing ? "Pause" : "Play"} keys="Space" onClick={toggle}>
              {playing ? <PauseIcon weight="fill" /> : <PlayIcon weight="fill" />}
            </Control>
            <Control label="Next step" keys="→" onClick={() => jump(index + 1)} disabled={index === last}>
              <CaretRightIcon />
            </Control>
          </ButtonGroup>
          <Slider
            value={[index]}
            max={last}
            step={1}
            onValueChange={([v]) => jump(v)}
            className="flex-1"
            aria-label="Walkthrough step"
          />
          <span className="w-12 text-right text-[12px] text-muted-foreground tabular-nums">
            {index + 1} / {last + 1}
          </span>
        </div>
        <p key={index} className="min-h-5 animate-in fade-in slide-in-from-bottom-1 text-[14px] duration-300 motion-reduce:animate-none">
          {caption(step, { boundaries: w.boundaries.length, segments: w.segments.length })}
        </p>
      </div>

      <Table className="text-[12px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-20">Between</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>On call</TableHead>
            <TableHead>Because</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {w.gaps.map((g, i) => (
            <TableRow
              key={g.start}
              className={cn(
                "transition-[opacity,background-color] duration-300",
                i > gapIndex && "opacity-35",
                i === gapIndex && "bg-signal-orange/[0.06] hover:bg-signal-orange/[0.08]",
              )}
            >
              <TableCell className="text-muted-foreground tabular-nums">
                {i + 1} → {i + 2}
              </TableCell>
              <TableCell className="tabular-nums">{formatDateTime(g.start)}</TableCell>
              <TableCell className="tabular-nums">{formatDateTime(g.end)}</TableCell>
              <TableCell>
                <PersonChip user={g.user} users={schedule.users} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {g.source.kind === "override" ? "Override is active" : `No override, rotation shift ${g.source.shift + 1}`}
                {i > 0 && sameSource(w.gaps[i - 1].source, g.source) && (
                  <span className="text-foreground/40"> · joins gap {i}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Control({
  label,
  keys,
  onClick,
  disabled,
  children,
}: {
  label: string;
  keys: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label} <Kbd>{keys}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}
