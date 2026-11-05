"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { PersonPicker } from "@/components/schedule/person-picker";
import { blockClass, blockPosition, stripes, windowPercent } from "@/components/schedule/timeline";
import { HOUR, type Override, type Window } from "@/lib/schedule/engine";
import { capitalise, formatDuration, formatRange, personTone } from "@/lib/schedule/display";
import { conflictWith, type Command } from "@/lib/schedule/state";

type Range = { start: number; end: number };

type Gesture =
  | ({ kind: "create"; origin: number } & Range)
  | ({ kind: "move"; id: string; grabAt: number; downX: number; moved: boolean; from: Range } & Range)
  | ({ kind: "resize"; id: string; edge: "start" | "end" } & Range);

type Props = { window: Window; users: string[]; overrides: Override[]; dispatch: (c: Command) => void };

const snap = (t: number) => Math.round(t / HOUR) * HOUR;

export function OverridesLane({ window, users, overrides, dispatch }: Props) {
  const lane = useRef<HTMLDivElement>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [draft, setDraft] = useState<Range | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hover, setHover] = useState<{ at: number } | { id: string } | null>(null);
  const pct = windowPercent(window);
  const others = overrides.map((o) => o.user);

  const rawTimeAt = (clientX: number) => {
    const rect = lane.current!.getBoundingClientRect();
    const fraction = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return window.start + fraction * (window.end - window.start);
  };

  const conflictFor = (id: string, range: Range) => conflictWith(overrides, { id, user: "", ...range });

  const reject = (range: Range, id: string) => {
    const other = conflictFor(id, range)!;
    toast.error("Overrides can't overlap", {
      description: `${capitalise(other.user)} already covers ${formatRange(other.start, other.end)}.`,
    });
  };

  const remove = (o: Override) => {
    dispatch({ type: "removeOverride", id: o.id });
    setOpenId(null);
    toast(`Removed ${capitalise(o.user)}'s override`, {
      description: formatRange(o.start, o.end),
      action: { label: "Undo", onClick: () => dispatch({ type: "addOverride", override: o }) },
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!gesture) {
      setHover(e.target === lane.current ? { at: Math.floor(rawTimeAt(e.clientX) / HOUR) * HOUR } : null);
      return;
    }
    const t = snap(rawTimeAt(e.clientX));
    if (gesture.kind === "create") {
      const [start, end] = t === gesture.origin ? [t, t + HOUR] : [Math.min(t, gesture.origin), Math.max(t, gesture.origin)];
      setGesture({ ...gesture, start, end });
    } else if (gesture.kind === "move") {
      const delta = snap(rawTimeAt(e.clientX) - gesture.grabAt);
      setGesture({ ...gesture, start: gesture.from.start + delta, end: gesture.from.end + delta, moved: gesture.moved || Math.abs(e.clientX - gesture.downX) > 3 });
    } else {
      setGesture(
        gesture.edge === "start" ? { ...gesture, start: Math.min(t, gesture.end - HOUR) } : { ...gesture, end: Math.max(t, gesture.start + HOUR) },
      );
    }
  };

  const onPointerUp = () => {
    if (!gesture) return;
    setGesture(null);
    const range = { start: gesture.start, end: gesture.end };
    if (gesture.kind === "move" && !gesture.moved) return setOpenId(gesture.id);
    const id = gesture.kind === "create" ? "" : gesture.id;
    if (conflictFor(id, range)) return reject(range, id);
    if (gesture.kind === "create") setDraft(range);
    else dispatch({ type: "updateOverride", id, changes: range });
  };

  const startGesture = (e: React.PointerEvent, next: Gesture) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    lane.current!.setPointerCapture(e.pointerId);
    setDraft(null);
    setOpenId(null);
    setHover(null);
    setGesture(next);
  };

  const live = gesture ?? (draft && { kind: "draft" as const, ...draft });
  const liveRange = live && { start: live.start, end: live.end };
  const liveInvalid = liveRange && conflictFor(gesture && gesture.kind !== "create" ? gesture.id : "", liveRange);
  const labelFor = (range: Range) => `${formatRange(range.start, range.end)} · ${formatDuration(range.end - range.start)}`;
  const visible = overrides.filter((o) => o.end > window.start && o.start < window.end);
  const hovered = hover && "id" in hover ? overrides.find((o) => o.id === hover.id) : undefined;
  const labelRange = liveRange ?? hovered;

  return (
    <div
      ref={lane}
      className={cn("absolute inset-0", gesture?.kind === "move" ? "cursor-grabbing" : "cursor-crosshair")}
      onPointerDown={(e) => {
        if (e.target !== lane.current) return;
        const t = snap(rawTimeAt(e.clientX));
        startGesture(e, { kind: "create", origin: t, start: t, end: t + HOUR });
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => !gesture && setHover(null)}
    >
      {hover && "at" in hover && !draft && !openId && (
        <div className="pointer-events-none absolute inset-y-2 w-px bg-foreground/25" style={{ left: `${pct(hover.at)}%` }}>
          <span className="absolute top-1/2 left-2 -translate-y-1/2 text-[11px] whitespace-nowrap text-muted-foreground">
            Drag to add cover
          </span>
        </div>
      )}

      {visible.map((o) => {
        const preview = gesture && gesture.kind !== "create" && gesture.id === o.id ? gesture : o;
        const invalid = preview !== o && liveInvalid;
        return (
          <Popover key={o.id} open={openId === o.id} onOpenChange={(open) => setOpenId(open ? o.id : null)}>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <PopoverAnchor asChild>
                  <div
                    tabIndex={0}
                    role="button"
                    aria-label={`${capitalise(o.user)}'s override, ${formatRange(o.start, o.end)}`}
                    className={cn(
                      blockClass,
                      "group/override cursor-grab px-0 transition-shadow",
                      personTone(o.user, users),
                      (openId === o.id || preview !== o) && "shadow-md ring-1 ring-foreground/15",
                      invalid && "ring-2 ring-destructive/70",
                    )}
                    style={{ ...blockPosition(pct(preview.start), pct(preview.end) - pct(preview.start)), ...stripes }}
                    onPointerDown={(e) => startGesture(e, { kind: "move", id: o.id, grabAt: rawTimeAt(e.clientX), downX: e.clientX, moved: false, from: o, start: o.start, end: o.end })}
                    onPointerEnter={() => !gesture && setHover({ id: o.id })}
                    onPointerLeave={() => !gesture && setHover(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setOpenId(o.id);
                      if (e.key === "Delete" || e.key === "Backspace") remove(o);
                    }}
                  >
                    {(["start", "end"] as const).map((edge) => (
                      <span
                        key={edge}
                        className={cn(
                          "absolute inset-y-0 z-10 w-1.5 cursor-ew-resize opacity-0 group-hover/override:opacity-100",
                          edge === "start" ? "left-0" : "right-0",
                        )}
                        onPointerDown={(e) => startGesture(e, { kind: "resize", id: o.id, edge, start: o.start, end: o.end })}
                      >
                        <span className="absolute inset-y-1.5 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-current opacity-40" />
                      </span>
                    ))}
                    {pct(preview.end) - pct(preview.start) > 3 && <span className="truncate px-2">{capitalise(o.user)}</span>}
                  </div>
                </PopoverAnchor>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-44">
                <ContextMenuItem onSelect={() => setOpenId(o.id)}>
                  <PencilSimpleIcon />
                  Change person
                  <ContextMenuShortcut>↵</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem variant="destructive" onSelect={() => remove(o)}>
                  <TrashIcon />
                  Delete
                  <ContextMenuShortcut>⌫</ContextMenuShortcut>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <PopoverContent align="start" className="w-80 gap-0 p-0">
              <div className="flex flex-col gap-1 px-3 py-2.5">
                <span className="text-[13px] font-medium">Override</span>
                <span className="text-[12px] text-muted-foreground tabular-nums">{labelFor(o)}</span>
              </div>
              <Separator />
              <PersonPicker
                users={users}
                others={others}
                value={o.user}
                onPick={(user) => {
                  dispatch({ type: "updateOverride", id: o.id, changes: { user } });
                  setOpenId(null);
                }}
              />
              <Separator />
              <div className="flex items-center p-1.5">
                <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(o)}>
                  <TrashIcon data-icon="inline-start" />
                  Delete override
                  <Kbd className="ml-auto">⌫</Kbd>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        );
      })}

      {live && live.kind !== "move" && live.kind !== "resize" && (
        <Popover open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
          <PopoverAnchor asChild>
            <div
              className={cn(
                blockClass,
                "pointer-events-none border border-dashed",
                liveInvalid ? "border-destructive/60 bg-destructive/10" : "border-foreground/30 bg-foreground/[0.04]",
              )}
              style={blockPosition(pct(live.start), pct(live.end) - pct(live.start))}
            />
          </PopoverAnchor>
          <PopoverContent align="start" className="w-80 gap-0 p-0">
            <div className="flex flex-col gap-1 px-3 py-2.5">
              <span className="text-[13px] font-medium">New override</span>
              <span className="text-[12px] text-muted-foreground tabular-nums">{draft && labelFor(draft)}</span>
            </div>
            <Separator />
            <PersonPicker
              users={users}
              others={others}
              onPick={(user) => {
                dispatch({ type: "addOverride", override: { id: crypto.randomUUID(), user, ...draft! } });
                setDraft(null);
              }}
            />
          </PopoverContent>
        </Popover>
      )}

      {labelRange && !openId && (
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 px-2 text-[11px] whitespace-nowrap tabular-nums",
            liveInvalid ? "text-destructive" : "text-muted-foreground",
          )}
          style={pct(labelRange.end) > 70 ? { right: `${100 - pct(labelRange.start)}%` } : { left: `${pct(labelRange.end)}%` }}
        >
          {labelFor(labelRange)}
        </span>
      )}
    </div>
  );
}
