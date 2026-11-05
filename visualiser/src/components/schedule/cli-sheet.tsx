"use client";

import { TerminalWindowIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle } from "@/components/ui/code-block";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatInstant, render, toCliOutput, type Override, type Schedule, type Window } from "@/lib/schedule/engine";
import { formatRange } from "@/lib/schedule/display";

type Props = { schedule: Schedule; overrides: Override[]; window: Window };

export function CliSheet({ schedule, overrides, window }: Props) {
  const json = (value: unknown) => JSON.stringify(value, null, 2);
  const files = {
    output: json(toCliOutput(render(schedule, overrides, window).segments)),
    schedule: json({
      users: schedule.users,
      handover_start_at: formatInstant(schedule.handoverStartAt),
      handover_interval_days: schedule.intervalDays,
    }),
    overrides: json(overrides.map((o) => ({ user: o.user, start_at: formatInstant(o.start), end_at: formatInstant(o.end) }))),
  };
  const command = [
    "./render-schedule \\",
    "    --schedule=schedule.json \\",
    "    --overrides=overrides.json \\",
    `    --from='${formatInstant(window.start)}' \\`,
    `    --until='${formatInstant(window.end)}'`,
  ].join("\n");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <TerminalWindowIcon data-icon="inline-start" />
          CLI
        </Button>
      </SheetTrigger>
      <SheetContent className="gap-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>CLI output</SheetTitle>
          <SheetDescription className="tabular-nums">
            What the CLI prints for {formatRange(window.start, window.end)}.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
          <Snippet title="Command" value={command} />
          <Tabs defaultValue="output" className="min-h-0">
            <TabsList variant="line">
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="schedule">schedule.json</TabsTrigger>
              <TabsTrigger value="overrides">overrides.json</TabsTrigger>
            </TabsList>
            {(Object.keys(files) as (keyof typeof files)[]).map((key) => (
              <TabsContent key={key} value={key}>
                <Snippet value={files[key]} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Snippet({ title, value }: { title?: string; value: string }) {
  return (
    <CodeBlock size="sm" className="shrink-0">
      {title ? (
        <CodeBlockHeader>
          <CodeBlockTitle>{title}</CodeBlockTitle>
          <CodeBlockActions>
            <CodeBlockCopyButton value={value} />
          </CodeBlockActions>
        </CodeBlockHeader>
      ) : (
        <CodeBlockActions>
          <CodeBlockCopyButton value={value} />
        </CodeBlockActions>
      )}
      <CodeBlockContent className="tabular-nums">{value}</CodeBlockContent>
    </CodeBlock>
  );
}
