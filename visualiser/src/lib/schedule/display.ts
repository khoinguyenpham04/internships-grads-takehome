const utc = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options });

const date = utc({ weekday: "short", day: "numeric", month: "short" });
const time = utc({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const month = utc({ month: "long", year: "numeric" });
const weekday = utc({ weekday: "narrow" });

export const formatDate = (t: number) => date.format(t).replace(",", "");
export const formatTime = (t: number) => time.format(t);
export const formatDateTime = (t: number) => `${formatDate(t)}, ${formatTime(t)}`;
export const formatMonth = (t: number) => month.format(t);
export const formatWeekday = (t: number) => weekday.format(t);

export const formatRange = (start: number, end: number) =>
  `${formatDateTime(start)} → ${formatDate(end) === formatDate(start) ? formatTime(end) : formatDateTime(end)}`;

export function formatDuration(ms: number) {
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

export const capitalise = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

const palette = [
  "bg-[#fde9d7] text-[#c2410c]",
  "bg-[#d7f5e4] text-[#15803d]",
  "bg-[#e5defc] text-[#6d28d9]",
  "bg-[#dceafe] text-[#1d4ed8]",
  "bg-[#fce4f1] text-[#be185d]",
];

export function personTone(user: string, users: string[]) {
  const index = users.indexOf(user);
  return index === -1 ? "bg-[#efefef] text-[#3f3f46]" : palette[index % palette.length];
}
