<script setup lang="ts">
import { render } from "@schedule/engine.ts";
import { example, readmeWindow } from "@schedule/state.ts";
import Timeline, { type Row } from "./Timeline.vue";

const { schedule, overrides } = example;
const block = (s: { user: string; start: number; end: number }, override = false) => ({
  key: `${s.user}${s.start}`,
  user: s.user,
  start: s.start,
  end: s.end,
  override,
});

const rows: Row[] = [
  { label: "Rotation", blocks: render(schedule, [], readmeWindow).segments.map((s) => block(s)) },
  { label: "Overrides", blocks: overrides.map((o) => block(o, true)) },
  {
    label: "Final",
    blocks: render(schedule, overrides, readmeWindow).segments.map((s) => block(s, s.source.kind === "override")),
  },
];

const o = overrides[0];
const calloutLeft = `calc(62px + (100% - 62px) * ${(o.end - readmeWindow.start) / (readmeWindow.end - readmeWindow.start)} + 8px)`;
</script>


<template>
  <div class="hero">
    <Timeline compact :window="readmeWindow" :users="schedule.users" :rows="rows" />
    <span class="callout" :style="{ left: calloutLeft }">Charlie covers Alice, Mon 17:00 to 22:00</span>
  </div>
</template>

<style scoped>
.hero { position: relative; }
.callout {
  position: absolute; top: 79px; padding: 2px 8px; border-radius: 999px;
  background: white; border: 1px solid var(--line); box-shadow: rgba(22, 22, 24, 0.05) 0 4px 10px -4px;
  font-size: 10px; font-weight: 500; color: #6d28d9; white-space: nowrap;
}
</style>
