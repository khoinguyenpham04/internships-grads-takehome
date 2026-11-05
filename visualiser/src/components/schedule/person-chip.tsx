import { cn } from "@/lib/utils";
import { capitalise, personTone } from "@/lib/schedule/display";

export function PersonChip({ user, users }: { user: string; users: string[] }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-[4px] px-1.5 text-[11px] font-semibold", personTone(user, users))}>
      {capitalise(user)}
    </span>
  );
}
