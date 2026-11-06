<script setup lang="ts">
import { computed } from "vue";
import { useSlideContext } from "@slidev/client";

const props = defineProps<{ steps: string[] }>();
const { $clicks } = useSlideContext();
const current = computed(() => Math.min($clicks.value, props.steps.length - 1));
</script>

<template>
  <ol class="stepper">
    <li v-for="(s, i) in steps" :key="s" :class="{ done: i < current, on: i === current }">
      <span class="dot">
        <svg v-if="i < current" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.6 9.5 3.6" /></svg>
        <template v-else>{{ i + 1 }}</template>
      </span>
      <span class="name">{{ s }}</span>
    </li>
  </ol>
</template>

<style scoped>
.stepper { display: flex; align-items: center; gap: 6px; margin: 0; padding: 0; list-style: none; }
li { display: flex; align-items: center; gap: 7px; padding: 4px 10px 4px 4px; border-radius: 999px; transition: background 0.3s; }
li + li::before { content: ""; width: 14px; height: 1px; background: var(--line); margin: 0 4px 0 -10px; }
.dot {
  display: grid; place-items: center; width: 18px; height: 18px; border-radius: 999px;
  font-size: 10px; font-weight: 600; color: var(--muted); background: #f4f4f5; transition: all 0.3s;
}
.dot svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.name { font-size: 12px; font-weight: 500; color: var(--muted); transition: color 0.3s; }
li.done .dot { background: #fff1ec; color: var(--signal); }
li.on { background: #f4f4f5; }
li.on .dot { background: var(--ink); color: white; }
li.on .name { color: var(--ink); }
</style>
