"use client";

import { useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PersonChip } from "@/components/schedule/person-chip";
import { capitalise } from "@/lib/schedule/display";

type Props = { users: string[]; others: string[]; value?: string; onPick: (user: string) => void };

export function PersonPicker({ users, others, value, onPick }: Props) {
  const [search, setSearch] = useState("");
  const name = search.trim().toLowerCase();
  const known = [...new Set(users)];
  const extra = [...new Set(others)].filter((u) => !known.includes(u));
  const isNew = name && !known.includes(name) && !extra.includes(name);

  const item = (user: string) => (
    <CommandItem key={user} value={user} data-checked={user === value} onSelect={() => onPick(user)}>
      <PersonChip user={user} users={users} />
    </CommandItem>
  );

  return (
    <Command className="bg-transparent">
      <CommandInput value={search} onValueChange={setSearch} placeholder="Who's covering?" className="text-[13px]" />
      <CommandList className="max-h-56">
        <CommandGroup heading="Rotation">{known.map(item)}</CommandGroup>
        {extra.length > 0 && <CommandGroup heading="Others">{extra.map(item)}</CommandGroup>}
        {isNew && (
          <CommandGroup>
            <CommandItem value={`+${name}`} onSelect={() => onPick(name)} className="text-[13px]">
              <PlusIcon />
              Add {capitalise(name)}
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
