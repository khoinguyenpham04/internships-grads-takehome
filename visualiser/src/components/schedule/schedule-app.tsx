"use client";

import { useEffect, useMemo, useReducer, useSyncExternalStore } from "react";
import { ArrowLeftIcon, ArrowRightIcon, GlobeSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExplainMode } from "@/components/schedule/explain-mode";
import { OverridesLane } from "@/components/schedule/overrides-lane";
import { PersonChip } from "@/components/schedule/person-chip";
import { RotationEditor } from "@/components/schedule/rotation-editor";
import { Timeline, type Block, type Row } from "@/components/schedule/timeline";
import { DAY, render, type Override, type Schedule, type Segment, type Window } from "@/lib/schedule/engine";
import { formatDateTime } from "@/lib/schedule/display";
import { example, reducer, viewWindow, type Command, type Range, type State } from "@/lib/schedule/state";

const subscribeToMinutes = (onChange: () => void) => {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
};
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;
const useNow = () => useSyncExternalStore(subscribeToMinutes, currentMinute, () => null);

const segmentBlock = (s: Segment): Block => ({
  key: `${s.start}`,
  user: s.user,
  start: s.start,
  end: s.end,
  override: s.source.kind === "override",
  detail: s.source.kind === "override" ? "Override" : `Rotation shift ${s.source.shift + 1}`,
});

function timelineRows(schedule: Schedule, overrides: Override[], window: Window, lane: React.ReactNode): Row[] {
  return [
    { label: "Rotation", blocks: render(schedule, [], window).segments.map(segmentBlock) },
    { label: "Overrides", lane },
    { label: "Final", blocks: render(schedule, overrides, window).segments.map(segmentBlock) },
  ];
}

export function ScheduleApp() {
  const [state, dispatch] = useReducer(reducer, example);
  const now = useNow();
  const { schedule, overrides } = state;

  const upcoming = useMemo(
    () => (now === null ? [] : render(schedule, overrides, { start: now, end: now + 60 * DAY }).segments.slice(0, 2)),
    [schedule, overrides, now],
  );

  return (
    <Tabs defaultValue="schedule" className="min-h-svh gap-0">
      <header className="relative flex h-12 shrink-0 items-center border-b px-4">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <span className="size-3 rounded-[3px] bg-signal-orange" />
          Primary on-call
        </div>
        <TabsList className="absolute left-1/2 h-7! -translate-x-1/2">
          <TabsTrigger value="schedule" className="px-3 text-[12px]">
            Schedule
          </TabsTrigger>
          <TabsTrigger value="explain" className="px-3 text-[12px]">
            Explain
          </TabsTrigger>
        </TabsList>
        <OnCallNow upcoming={upcoming} users={schedule.users} now={now} />
      </header>

      <TabsContent value="schedule">
        <ScheduleMode state={state} dispatch={dispatch} now={now} />
      </TabsContent>
      <TabsContent value="explain">
        <ExplainMode schedule={schedule} overrides={overrides} />
      </TabsContent>
    </Tabs>
  );
}

function ScheduleMode({
  state,
  dispatch,
  now,
}: {
  state: State;
  dispatch: (c: Command) => void;
  now: number | null;
}) {
  const window = useMemo(() => viewWindow(state.view), [state.view]);
  const lane = <OverridesLane window={window} users={state.schedule.users} overrides={state.overrides} dispatch={dispatch} />;
  const rows = timelineRows(state.schedule, state.overrides, window, lane);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") dispatch({ type: "step", direction: -1 });
      else if (e.key === "ArrowRight") dispatch({ type: "step", direction: 1 });
      else if (e.key.toLowerCase() === "t") dispatch({ type: "showToday", now: Date.now() });
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [dispatch]);

  return (
    <div className="flex flex-col gap-4 px-4 pt-3 pb-8">
      <div className="flex items-center gap-1.5">
        <Shortcut label="Jump to today" keys="T">
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: "showToday", now: Date.now() })}>
            Today
          </Button>
        </Shortcut>
        <Shortcut label="Previous" keys="←">
          <Button variant="outline" size="icon-sm" aria-label="Previous" onClick={() => dispatch({ type: "step", direction: -1 })}>
            <ArrowLeftIcon />
          </Button>
        </Shortcut>
        <Shortcut label="Next" keys="→">
          <Button variant="outline" size="icon-sm" aria-label="Next" onClick={() => dispatch({ type: "step", direction: 1 })}>
            <ArrowRightIcon />
          </Button>
        </Shortcut>
        <div className="ml-auto flex items-center gap-1.5">
          <RotationEditor schedule={state.schedule} dispatch={dispatch} />
          <span className="flex h-7 items-center gap-1.5 rounded-[min(var(--radius-md),10px)] border px-2.5 text-[12px] text-foreground/70">
            <GlobeSimpleIcon className="size-3.5" />
            UTC
          </span>
          <Select value={state.view.range} onValueChange={(range) => dispatch({ type: "setRange", range: range as Range })}>
            <SelectTrigger size="sm" className="text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="2w">2 weeks</SelectItem>
              <SelectItem value="1m">1 month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Timeline window={window} users={state.schedule.users} rows={rows} now={now} />
    </div>
  );
}

function Shortcut({ label, keys, children }: { label: string; keys: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        {label} <Kbd>{keys}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

function OnCallNow({ upcoming, users, now }: { upcoming: Segment[]; users: string[]; now: number | null }) {
  const [current, next] = upcoming;
  if (now === null || !current) return null;
  const live = current.start <= now;

  return (
    <div className="ml-auto flex items-center gap-2 text-[12px] text-muted-foreground">
      {live ? (
        <>
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-signal-orange opacity-60" />
            <span className="size-1.5 rounded-full bg-signal-orange" />
          </span>
          <PersonChip user={current.user} users={users} />
          <span className="tabular-nums">on call until {formatDateTime(current.end)}</span>
          {next && (
            <>
              <span className="text-border">/</span>
              <span>next</span>
              <PersonChip user={next.user} users={users} />
            </>
          )}
        </>
      ) : (
        <>
          <span className="tabular-nums">Starts {formatDateTime(current.start)} with</span>
          <PersonChip user={current.user} users={users} />
        </>
      )}
    </div>
  );
}
