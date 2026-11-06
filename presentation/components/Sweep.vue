<script setup lang="ts">
import { computed } from "vue";
import { useSlideContext } from "@slidev/client";
import { render } from "@schedule/engine.ts";
import { caption, walkthrough } from "@schedule/explain.ts";
import { example, readmeWindow } from "@schedule/state.ts";
import Timeline, { type Row } from "./Timeline.vue";

const props = withDefaults(defineProps<{ from?: number }>(), { from: 0 });
const { $clicks } = useSlideContext();

const { schedule, overrides } = example;
const window = readmeWindow;
const w = walkthrough(schedule, overrides, window);
const rotation = render(schedule, [], window).segments;

const index = computed(() => Math.min(Math.max($clicks.value - props.from, 0), w.steps.length - 1));
const step = computed(() => w.steps[index.value]);

const revealed = computed(() =>
  step.value.kind === "intro" ? 0 : step.value.kind === "boundary" ? step.value.index + 1 : w.boundaries.length,
);
const deciding = computed(() => (step.value.kind === "gap" ? step.value.gap.source.kind : null));

const rows = computed<Row[]>(() => {
  const s = step.value;
  const gapIndex = s.kind === "gap" ? s.index : -1;
  const finalBlocks =
    s.kind === "join"
      ? w.segments.map((x) => ({ key: `j${x.start}`, user: x.user, start: x.start, end: x.end, override: x.source.kind === "override" }))
      : w.gaps.slice(0, gapIndex + 1).map((g) => ({ key: `g${g.start}`, user: g.user, start: g.start, end: g.end, override: g.source.kind === "override" }));
  return [
    { label: "Rotation", blocks: rotation.map((x) => ({ key: `r${x.start}`, user: x.user, start: x.start, end: x.end, muted: deciding.value === "override" })) },
    { label: "Overrides", blocks: overrides.map((o) => ({ key: o.id, user: o.user, start: o.start, end: o.end, override: true, muted: deciding.value === "rotation" })) },
    { label: "Final", blocks: finalBlocks },
  ];
});

const text = computed(() => caption(step.value, { boundaries: w.boundaries.length, segments: w.segments.length }));
</script>

<template>
  <div class="sweep">
    <Timeline
      :window="window"
      :users="schedule.users"
      :rows="rows"
      :boundaries="w.boundaries.slice(0, revealed)"
      :active-boundary="step.kind === 'boundary' ? step.index : step.kind === 'gap' ? -1 : undefined"
      :highlight="step.kind === 'gap' ? step.gap : null"
    />
    <Transition name="cap" mode="out-in">
      <p :key="index" class="caption">{{ text }}</p>
    </Transition>
  </div>
</template>

<style scoped>
.sweep { display: flex; flex-direction: column; gap: 20px; padding-top: 22px; }
.caption { margin: 0; font-size: 15px; color: var(--ink); min-height: 22px; }
.cap-enter-active, .cap-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.cap-enter-from { opacity: 0; transform: translateY(4px); }
.cap-leave-to { opacity: 0; }
</style>
