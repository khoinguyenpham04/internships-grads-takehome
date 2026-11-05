"use client";

import { useRef, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, CalendarBlankIcon, UsersThreeIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { PersonChip } from "@/components/schedule/person-chip";
import { DAY } from "@/lib/schedule/engine";
import { formatDate, formatTime } from "@/lib/schedule/display";
import type { Command } from "@/lib/schedule/state";
import type { Schedule } from "@/lib/schedule/engine";

export function RotationEditor({ schedule, dispatch }: { schedule: Schedule; dispatch: (c: Command) => void }) {
  const { users, intervalDays, handoverStartAt } = schedule;
  const [name, setName] = useState("");
  const addInput = useRef<HTMLInputElement>(null);
  const dayStart = Math.floor(handoverStartAt / DAY) * DAY;
  const timeOfDay = handoverStartAt - dayStart;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <UsersThreeIcon data-icon="inline-start" />
          Rotation
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 gap-0 p-0 text-[13px]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          addInput.current?.focus();
        }}
      >
        <PopoverHeader className="border-b px-3 py-2.5">
          <PopoverTitle className="text-[13px]">Rotation</PopoverTitle>
          <PopoverDescription className="text-[12px]">People take turns in this order.</PopoverDescription>
        </PopoverHeader>

        <ol className="flex flex-col p-1.5">
          {users.map((user, i) => (
            <li key={`${user}-${i}`} className="group flex h-8 items-center gap-2 rounded-md px-1.5 hover:bg-muted">
              <span className="w-3 text-[11px] text-muted-foreground tabular-nums">{i + 1}</span>
              <PersonChip user={user} users={users} />
              <span className="ml-auto flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Button variant="ghost" size="icon-xs" aria-label={`Move ${user} up`} disabled={i === 0}
                  onClick={() => dispatch({ type: "moveUser", index: i, direction: -1 })}>
                  <ArrowUpIcon />
                </Button>
                <Button variant="ghost" size="icon-xs" aria-label={`Move ${user} down`} disabled={i === users.length - 1}
                  onClick={() => dispatch({ type: "moveUser", index: i, direction: 1 })}>
                  <ArrowDownIcon />
                </Button>
                <Button variant="ghost" size="icon-xs" aria-label={`Remove ${user}`} disabled={users.length === 1}
                  onClick={() => dispatch({ type: "removeUser", index: i })}>
                  <XIcon />
                </Button>
              </span>
            </li>
          ))}
        </ol>

        <form
          className="px-3 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: "addUser", name });
            setName("");
          }}
        >
          <InputGroup className="h-8">
            <InputGroupInput ref={addInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a person" className="text-[13px]" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="submit" disabled={!name.trim()}>
                Add
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>

        <Separator />

        <FieldGroup className="gap-3 p-3">
          <Field orientation="horizontal">
            <FieldLabel htmlFor="interval" className="text-[13px] font-normal text-muted-foreground">
              Hand over every
            </FieldLabel>
            <Input
              id="interval"
              type="number"
              min={1}
              defaultValue={intervalDays}
              className="h-7 w-14 text-[13px]"
              onChange={(e) => dispatch({ type: "setInterval", days: e.target.valueAsNumber })}
            />
            <span className="text-muted-foreground">{intervalDays === 1 ? "day" : "days"}</span>
          </Field>
          <Field orientation="horizontal">
            <FieldLabel className="text-[13px] font-normal text-muted-foreground">First handover</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="font-normal tabular-nums">
                  <CalendarBlankIcon data-icon="inline-start" />
                  {formatDate(handoverStartAt)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  timeZone="UTC"
                  required
                  selected={new Date(handoverStartAt)}
                  defaultMonth={new Date(handoverStartAt)}
                  onSelect={(d) =>
                    dispatch({ type: "setHandoverStart", at: Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) + timeOfDay })
                  }
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              aria-label="Handover time (UTC)"
              defaultValue={formatTime(handoverStartAt)}
              className="h-7 w-[4.25rem] text-[13px] tabular-nums [&::-webkit-calendar-picker-indicator]:hidden"
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                if (!Number.isNaN(h) && !Number.isNaN(m)) dispatch({ type: "setHandoverStart", at: dayStart + (h * 60 + m) * 60_000 });
              }}
            />
          </Field>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  );
}
