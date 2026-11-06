<script setup lang="ts">
import { computed } from "vue";
import { DAY, type Window } from "@schedule/engine.ts";

export type Block = { key: string; user: string; start: number; end: number; override?: boolean; muted?: boolean };
export type Row = { label: string; blocks: Block[] };

const props = defineProps<{
  window: Window;
  users: string[];
  rows: Row[];
  boundaries?: number[];
  activeBoundary?: number;
  highlight?: { start: number; end: number } | null;
  compact?: boolean;
}>();

const tones = [
  { bg: "#fde9d7", fg: "#c2410c" },
  { bg: "#d7f5e4", fg: "#15803d" },
  { bg: "#e5defc", fg: "#6d28d9" },
  { bg: "#dceafe", fg: "#1d4ed8" },
];
const tone = (user: string) => tones[props.users.indexOf(user) % tones.length] ?? { bg: "#efefef", fg: "#3f3f46" };

const pct = (t: number) =>
  ((Math.min(Math.max(t, props.window.start), props.window.end) - props.window.start) /
    (props.window.end - props.window.start)) *
  100;

const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "narrow" });
const days = computed(() => {
  const out: { start: number; full: boolean; weekend: boolean; label: string }[] = [];
  for (let d = Math.floor(props.window.start / DAY) * DAY; d < props.window.end; d += DAY) {
    const day = new Date(d).getUTCDay();
    out.push({
      start: d,
      full: d >= props.window.start && d + DAY <= props.window.end,
      weekend: day === 0 || day === 6,
      label: props.compact ? `${new Date(d).getUTCDate()}` : `${weekday.format(d)} ${new Date(d).getUTCDate()}`,
    });
  }
  return out;
});

const span = (start: number, end: number) => ({
  left: `calc(${pct(start)}% + 1px)`,
  width: `max(4px, calc(${pct(end) - pct(start)}% - 2px))`,
});
</script>

<template>
  <div class="tl" :class="{ compact }">
    <div class="labels">
      <div class="head">UTC</div>
      <div v-for="row in rows" :key="row.label" class="label">{{ row.label }}</div>
    </div>
    <div class="grid">
      <div
        v-for="d in days"
        :key="d.start"
        class="col"
        :class="{ weekend: d.weekend }"
        :style="{ left: `${pct(d.start)}%`, width: `${pct(d.start + DAY) - pct(d.start)}%` }"
      />
      <div class="head days">
        <span
          v-for="d in days.filter((d) => d.full)"
          :key="d.start"
          class="day"
          :class="{ weekend: d.weekend }"
          :style="{ left: `${pct(d.start)}%`, width: `${pct(d.start + DAY) - pct(d.start)}%` }"
        >{{ d.label }}</span>
      </div>
      <div
        v-if="highlight"
        class="highlight"
        :style="{ left: `${pct(highlight.start)}%`, width: `${pct(highlight.end) - pct(highlight.start)}%` }"
      />
      <div v-for="row in rows" :key="row.label" class="row">
        <TransitionGroup name="block">
          <div
            v-for="b in row.blocks"
            :key="b.key"
            class="block"
            :class="{ override: b.override, muted: b.muted }"
            :style="{ ...span(b.start, b.end), backgroundColor: tone(b.user).bg, color: tone(b.user).fg }"
          >
            <span v-if="pct(b.end) - pct(b.start) > (compact ? 7 : 4)">{{ b.user[0].toUpperCase() + b.user.slice(1) }}</span>
          </div>
        </TransitionGroup>
      </div>
      <TransitionGroup name="mark">
        <div
          v-for="(t, i) in boundaries ?? []"
          :key="t"
          class="mark"
          :class="{ dim: activeBoundary !== undefined && activeBoundary !== i }"
          :style="{ left: `${pct(t)}%` }"
        >
          <span v-if="!compact" class="pin" :class="{ start: pct(t) < 2, end: pct(t) > 98 }">{{ i + 1 }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.tl { display: grid; grid-template-columns: 84px 1fr; font-size: 11px; user-select: none; }
.labels { display: flex; flex-direction: column; }
.head { height: 30px; display: flex; align-items: center; border-bottom: 1px solid var(--line); color: var(--muted); }
.label { height: 46px; display: flex; align-items: center; border-bottom: 1px solid var(--line-soft); color: #52525b; font-size: 12px; }
.grid { position: relative; min-width: 0; }
.col { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--line-soft); }
.col.weekend { background: #fafafa; }
.days { position: relative; }
.day { position: absolute; display: flex; justify-content: center; color: #71717a; font-variant-numeric: tabular-nums; }
.day.weekend { color: #c4c4c8; }
.row { position: relative; height: 46px; border-bottom: 1px solid var(--line-soft); }
.block {
  position: absolute; top: 50%; height: 24px; transform: translateY(-50%);
  display: flex; align-items: center; overflow: hidden; padding: 0 8px; border-radius: 4px;
  font-weight: 600; white-space: nowrap; transition: opacity 0.3s;
}
.block.override {
  background-image: repeating-linear-gradient(135deg, color-mix(in srgb, currentColor 28%, transparent) 0 1.5px, transparent 1.5px 5px);
}
.block.muted { opacity: 0.3; }
.highlight { position: absolute; top: 30px; bottom: 0; background: rgb(242 85 51 / 0.07); transition: left 0.35s ease, width 0.35s ease; }
.mark { position: absolute; top: 0; bottom: 0; width: 1px; background: rgb(242 85 51 / 0.6); transition: background 0.3s; }
.mark.dim { background: rgb(242 85 51 / 0.22); }
.pin {
  position: absolute; top: -20px; transform: translateX(-50%); padding: 0 6px; border-radius: 999px;
  background: var(--signal); color: white; font-size: 10px; font-weight: 600; line-height: 16px; transition: all 0.3s;
}
.pin.start { transform: none; }
.pin.end { transform: translateX(-100%); }
.mark.dim .pin { background: rgb(242 85 51 / 0.15); color: var(--signal); }
.compact { grid-template-columns: 62px 1fr; font-size: 10px; }
.compact .label { height: 40px; font-size: 11px; }
.compact .row { height: 40px; }
.compact .block { height: 20px; padding: 0 6px; font-size: 10px; }
.block-enter-active, .mark-enter-active { transition: opacity 0.35s ease, transform 0.35s ease; }
.block-enter-from { opacity: 0; transform: translateY(-50%) scale(0.96); }
.mark-enter-from { opacity: 0; transform: translateY(-6px); }
</style>
