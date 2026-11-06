<script setup lang="ts">
defineProps<{ kind: "minutes" | "cut" | "boundaries" | "utc" | "reject" }>();
</script>

<template>
  <div class="mini" :class="kind">
    <template v-if="kind === 'minutes'">
      <div class="bar ticks" />
      <div class="caption">20,160 checks for the two-week example</div>
    </template>

    <template v-else-if="kind === 'cut'">
      <div class="bar split">
        <span class="seg a" style="flex: 3" />
        <span class="seg c" style="flex: 1" />
        <span class="seg a" style="flex: 4" />
      </div>
      <div class="caption">split, then merge back</div>
    </template>

    <template v-else-if="kind === 'boundaries'">
      <div class="bar split">
        <span class="seg a" style="flex: 3" />
        <span class="seg c" style="flex: 1" />
        <span class="seg a" style="flex: 4" />
        <span class="seg b" style="flex: 5" />
      </div>
      <div class="pins">
        <i style="left: 0%" /><i style="left: 23%" /><i style="left: 30.8%" /><i style="left: 61.5%" /><i style="left: 100%" />
      </div>
      <div class="caption">5 boundaries, 4 entries</div>
    </template>

    <template v-else-if="kind === 'utc'">
      <div class="bar days">
        <span v-for="d in 7" :key="d">24h</span>
      </div>
      <div class="caption">17:00 UTC → 17:00 UTC, always 168 hours</div>
    </template>

    <template v-else>
      <div class="term">
        <span class="x">✕</span>
        render-schedule: overrides overlap: 'charlie' and 'bob'
      </div>
    </template>
  </div>
</template>

<style scoped>
.mini { display: flex; flex-direction: column; gap: 8px; position: relative; }
.bar { height: 22px; border-radius: 5px; overflow: hidden; }
.ticks {
  background:
    repeating-linear-gradient(90deg, rgb(22 22 24 / 0.28) 0 1px, transparent 1px 4px),
    #f4f4f5;
}
.split { display: flex; gap: 2px; }
.seg { border-radius: 4px; }
.seg.a { background: #fde9d7; }
.seg.b { background: #d7f5e4; }
.seg.c {
  background-color: #e5defc;
  background-image: repeating-linear-gradient(135deg, rgb(109 40 217 / 0.28) 0 1.5px, transparent 1.5px 5px);
}
.cut .split { gap: 0; }
.cut .seg { border-radius: 0; border-right: 1.5px dashed #a1a1aa; }
.cut .seg:last-child { border-right: 0; }
.pins { position: absolute; inset: -5px 0 auto 0; height: 32px; pointer-events: none; }
.pins i { position: absolute; top: 0; bottom: 0; width: 1.5px; background: var(--signal); transform: translateX(-50%); }
.pins i::before {
  content: ""; position: absolute; top: -3px; left: 50%; width: 6px; height: 6px;
  border-radius: 999px; background: var(--signal); transform: translateX(-50%);
}
.days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.days span {
  display: grid; place-items: center; border-radius: 4px; background: #f4f4f5;
  font-size: 9px; font-weight: 500; color: var(--muted); font-variant-numeric: tabular-nums;
}
.caption { font-size: 10.5px; color: var(--muted); }
.term {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 7px;
  background: #fff5f4; border: 1px solid #fde0dc;
  font-family: "Geist Mono", ui-monospace, monospace; font-size: 10px; color: #b42318;
}
.term .x { font-weight: 700; }
</style>
