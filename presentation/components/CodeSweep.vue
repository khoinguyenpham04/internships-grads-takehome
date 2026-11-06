<script setup lang="ts">
import { computed } from "vue";
import { useSlideContext } from "@slidev/client";
import { render, type Override } from "@schedule/engine.ts";
import { walkthrough } from "@schedule/explain.ts";
import { example } from "@schedule/state.ts";
import Timeline, { type Row } from "./Timeline.vue";

const { $clicks } = useSlideContext();

const { schedule } = example;
const window = { start: Date.parse("2026-11-09T12:00:00Z"), end: Date.parse("2026-11-15T12:00:00Z") };
const overrides: Override[] = [
  ...example.overrides,
  { id: "bob", user: "bob", start: Date.parse("2026-11-13T09:00:00Z"), end: Date.parse("2026-11-14T09:00:00Z") },
];
const w = walkthrough(schedule, overrides, window);
const rotation = render(schedule, [], window).segments;

const notes = [
  "Rules across values are checked once, up front: a forwards window, no overlapping overrides.",
  "Every moment the answer could change becomes a boundary.",
  "Each gap asks once: the override covering it, or the rotation's shift.",
  "Neighbours from the same source join. Bob's cover becomes one entry, his own shift stays separate.",
  "On 150 random schedules, render has to match a minute-by-minute brute force.",
];

const phase = computed(() => Math.min($clicks.value, notes.length - 1));

const rows = computed<Row[]>(() => {
  const p = phase.value;
  const final =
    p >= 3
      ? w.segments.map((s) => ({ key: `s${s.start}`, user: s.user, start: s.start, end: s.end, override: s.source.kind === "override" }))
      : p === 2
        ? w.gaps.map((g) => ({ key: `g${g.start}`, user: g.user, start: g.start, end: g.end, override: g.source.kind === "override" }))
        : [];
  return [
    { label: "Rotation", blocks: rotation.map((s) => ({ key: `r${s.start}`, user: s.user, start: s.start, end: s.end })) },
    { label: "Overrides", blocks: overrides.map((o) => ({ key: o.id, user: o.user, start: o.start, end: o.end, override: true })) },
    { label: "Final", blocks: final },
  ];
});

const count = computed(() => (phase.value >= 3 ? `${w.segments.length} entries` : phase.value === 2 ? `${w.gaps.length} gaps` : phase.value === 1 ? `${w.boundaries.length} boundaries` : "Inputs"));
</script>

<template>
  <div class="cs">
    <div class="meta">
      <span class="count">{{ count }}</span>
      <Transition name="pop">
        <span v-if="phase === 4" class="ok">
          <svg viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.6 9.5 3.6" /></svg>
          Matches brute force
        </span>
      </Transition>
    </div>
    <Timeline compact :window="window" :users="schedule.users" :rows="rows" :boundaries="phase >= 1 ? w.boundaries : []" />
    <Transition name="cap" mode="out-in">
      <p :key="phase" class="note">{{ notes[phase] }}</p>
    </Transition>
  </div>
</template>

<style scoped>
.cs { display: flex; flex-direction: column; gap: 14px; }
.meta { display: flex; align-items: center; justify-content: space-between; height: 22px; }
.count { font-size: 11px; font-weight: 500; color: var(--muted); font-variant-numeric: tabular-nums; }
.ok {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px;
  font-size: 11px; font-weight: 600; color: #15803d; background: #e7f8ee;
}
.ok svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.note { margin: 0; font-size: 13px; line-height: 1.45; color: #3f3f46; min-height: 38px; }
.cap-enter-active, .cap-leave-active { transition: opacity 0.2s ease; }
.cap-enter-from, .cap-leave-to { opacity: 0; }
.pop-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.pop-enter-from { opacity: 0; transform: scale(0.9); }
</style>
