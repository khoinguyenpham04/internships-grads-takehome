<script setup lang="ts">
import { computed } from "vue";
import { useSlideContext } from "@slidev/client";

type Node = "alert" | "escalation" | "schedule" | "alice" | "bob";

const { $clicks } = useSlideContext();

const flow: { lit: Node[]; note: string }[] = [
  { lit: [], note: "When an alert fires, the schedule decides who gets woken up." },
  { lit: ["alert"], note: "An alert fires." },
  { lit: ["escalation", "schedule"], note: "The escalation path asks the schedule who's on call right now." },
  { lit: ["alice"], note: "Alice's phone rings. No acknowledgement after five minutes." },
  { lit: ["bob"], note: "The next step pages Bob." },
];

const guarantees: { key: string; title: string; note: string; protects: Node[] }[] = [
  { key: "layers", title: "Several rotations", note: "Primary and backup, or one per office, each with its own hours.", protects: ["schedule"] },
  { key: "local", title: "Local time", note: "A 5pm handover in London stays at 5pm when the clocks change.", protects: ["schedule"] },
  { key: "dated", title: "Changes from a date", note: "Editing the rota never rewrites who was on call last week.", protects: ["schedule"] },
  { key: "everywhere", title: "One answer everywhere", note: "The app, Slack, calendars and the pager agree, instantly.", protects: ["schedule", "escalation"] },
];

const step = computed(() => Math.min($clicks.value, flow.length - 1));
const g = computed(() => $clicks.value - flow.length);
const lit = computed<Node[]>(() => (g.value >= 0 ? guarantees[g.value].protects : flow[step.value].lit));
const on = (n: Node) => lit.value.includes(n);
const flowing = (from: number) => g.value < 0 && step.value === from;
const reached = (n: number) => g.value >= 0 || step.value >= n;
</script>

<template>
  <div class="paging">
    <div class="system">
      <div class="node" :class="{ on: on('alert'), seen: reached(1) }">
        <span class="icon">
          <svg viewBox="0 0 16 16"><path d="M8 2.5a3.5 3.5 0 0 0-3.5 3.5v2.4L3.3 10.6h9.4l-1.2-2.2V6A3.5 3.5 0 0 0 8 2.5Z" /><path d="M6.5 12.6a1.6 1.6 0 0 0 3 0" /></svg>
        </span>
        <span class="kind">Alert</span>
        <span class="detail">Error rate above 5%</span>
      </div>

      <div class="wire" :class="{ live: reached(2), flowing: flowing(2) }"><i /></div>

      <div class="node" :class="{ on: on('escalation'), seen: reached(2) }">
        <span class="icon">
          <svg viewBox="0 0 16 16"><circle cx="4" cy="4" r="1.6" /><circle cx="12" cy="12" r="1.6" /><path d="M4 5.6v2.2A2.2 2.2 0 0 0 6.2 10h3.6A2.2 2.2 0 0 1 12 12.2v-1.8" /></svg>
        </span>
        <span class="kind">Escalation path</span>
        <span class="detail">Primary, then next level</span>
      </div>

      <div class="wire" :class="{ live: reached(2), flowing: flowing(2) }"><i /></div>

      <div class="node schedule" :class="{ on: on('schedule'), seen: reached(2) }">
        <span class="icon">
          <svg viewBox="0 0 16 16"><rect x="2.5" y="3.5" width="11" height="10" rx="2" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></svg>
        </span>
        <span class="kind">Schedule</span>
        <Transition name="swap" mode="out-in">
          <span v-if="reached(2)" key="a" class="answer"><b class="chip alice">Alice</b> on call now</span>
          <span v-else key="b" class="detail">This project</span>
        </Transition>
      </div>

      <div class="wire" :class="{ live: reached(3), flowing: flowing(3) || flowing(4) }"><i /></div>

      <div class="phones">
        <div class="phone" :class="{ on: on('alice'), ringing: g < 0 && step === 3, missed: g < 0 && step >= 4 }">
          <span class="avatar alice">A</span>
          <span class="who">Alice</span>
          <span class="status">{{ g < 0 && step >= 4 ? "No answer" : g < 0 && step === 3 ? "Ringing" : "" }}</span>
        </div>
        <div class="phone" :class="{ on: on('bob'), ringing: g < 0 && step === 4 }">
          <span class="avatar bob">B</span>
          <span class="who">Bob</span>
          <span class="status">{{ g < 0 && step === 4 ? "Ringing" : "" }}</span>
        </div>
      </div>
    </div>

    <Transition name="swap" mode="out-in">
      <p :key="g >= 0 ? 'g' : step" class="note">
        {{ g >= 0 ? "Four things the schedule has to get right." : flow[step].note }}
      </p>
    </Transition>

    <div class="guarantees">
      <div
        v-for="(item, i) in guarantees"
        :key="item.key"
        class="card g"
        :class="{ shown: g >= i, current: g === i }"
      >
        <div class="mock">
          <template v-if="item.key === 'layers'">
            <div class="layer"><span class="muted lbl">UK</span><span class="lane"><i class="seg uk" style="left: 37.5%; width: 45.8%" /></span></div>
            <div class="layer"><span class="muted lbl">US</span><span class="lane"><i class="seg us" style="left: 0; width: 37.5%" /><i class="seg us" style="left: 83.3%; width: 16.7%" /></span></div>
            <div class="row"><span class="muted">09:00 to 20:00 UK, the rest US</span><span class="ok">24h</span></div>
          </template>
          <template v-else-if="item.key === 'local'">
            <div class="row"><span><span class="muted">BST</span> 17:00 London</span><span class="utc">16:00 UTC</span></div>
            <div class="row"><span><span class="muted">GMT</span> 17:00 London</span><span class="utc">17:00 UTC</span></div>
            <div class="row"><span class="muted">Clocks change 25 Oct</span></div>
          </template>
          <template v-else-if="item.key === 'dated'">
            <div class="row"><b>Add Dana</b><span class="muted">From 20 Nov</span></div>
            <div class="row"><span>6 to 20 Nov</span><span class="lock">Unchanged</span></div>
            <div class="row"><span class="muted">Past shifts stay as they were</span></div>
          </template>
          <template v-else>
            <div class="row"><span class="src"><img src="/icons/incident.svg" alt="" /> App</span><b class="chip alice">Alice</b></div>
            <div class="row"><span class="src"><img src="/icons/slack.svg" alt="" /> @on-call</span><b class="chip alice">Alice</b></div>
            <div class="row"><span class="src"><img src="/icons/google-calendar.svg" alt="" /> Calendar</span><b class="chip alice">Alice</b></div>
            <div class="row"><span class="src"><svg class="ico" viewBox="0 0 16 16"><rect x="4.5" y="1.8" width="7" height="12.4" rx="1.6"/><path d="M7.2 11.8h1.6"/></svg> Pager</span><b class="chip alice">Alice</b></div>
          </template>
        </div>
        <span class="title">{{ item.title }}</span>
        <span class="text">{{ item.note }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.paging { display: flex; flex-direction: column; gap: 14px; margin-top: auto; margin-bottom: auto; }

.system { display: grid; grid-template-columns: 1fr 34px 1fr 34px 1.15fr 34px 0.95fr; align-items: center; }
.node {
  display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 12px;
  border: 1px solid var(--line); background: rgb(255 255 255 / 0.92); opacity: 0.55;
  box-shadow: rgba(22, 22, 24, 0.03) 0 10px 20px -8px;
  transition: opacity 0.35s, border-color 0.35s, box-shadow 0.35s, background 0.35s;
}
.node.seen { opacity: 1; }
.node.on { border-color: rgb(242 85 51 / 0.6); box-shadow: 0 0 0 4px rgb(242 85 51 / 0.08), rgba(22, 22, 24, 0.05) 0 10px 20px -8px; }
.icon { display: grid; place-items: center; width: 22px; height: 22px; margin-bottom: 4px; border-radius: 6px; background: #f4f4f5; color: #52525b; transition: all 0.35s; }
.node.on .icon { background: #fff1ec; color: var(--signal); }
.icon svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.kind { font-size: 13px; font-weight: 600; }
.detail { font-size: 10.5px; color: var(--muted); }
.answer { font-size: 10.5px; color: #52525b; }

.chip { display: inline-block; padding: 0 5px; border-radius: 4px; font-size: 10.5px; font-weight: 600; }
.chip.alice, .avatar.alice { background: #fde9d7; color: #c2410c; }
.avatar.bob { background: #d7f5e4; color: #15803d; }

.wire { position: relative; height: 1.5px; margin: 0 5px; background: var(--line); overflow: visible; transition: background 0.35s; }
.wire.live { background: rgb(242 85 51 / 0.45); }
.wire i { position: absolute; top: 50%; left: 0; width: 6px; height: 6px; margin-top: -3px; border-radius: 999px; background: var(--signal); opacity: 0; }
.wire.flowing i { animation: travel 1.1s ease-in-out infinite; }
@keyframes travel { 0% { left: 0; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { left: calc(100% - 6px); opacity: 0; } }

.phones { display: flex; flex-direction: column; gap: 8px; }
.phone {
  position: relative; display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 12px; border: 1px solid var(--line); background: rgb(255 255 255 / 0.92);
  transition: border-color 0.35s, box-shadow 0.35s, opacity 0.35s;
}
.phone.on { border-color: rgb(242 85 51 / 0.6); box-shadow: 0 0 0 4px rgb(242 85 51 / 0.08); }
.phone.missed { opacity: 0.55; }
.avatar { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 999px; font-size: 10px; font-weight: 700; }
.who { font-size: 12px; font-weight: 600; }
.status { font-size: 10px; color: var(--muted); }
.phone.ringing .status { color: var(--signal); font-weight: 600; }
.phone.ringing .avatar { animation: ring 1s ease-in-out infinite; }
.phone.ringing::after {
  content: ""; position: absolute; left: 10px; top: 50%; width: 22px; height: 22px; margin-top: -11px;
  border-radius: 999px; border: 1.5px solid var(--signal); animation: ripple 1.2s ease-out infinite;
}
@keyframes ring { 0%, 100% { transform: rotate(0); } 20% { transform: rotate(-12deg); } 40% { transform: rotate(10deg); } 60% { transform: rotate(-6deg); } }
@keyframes ripple { from { transform: scale(1); opacity: 0.6; } to { transform: scale(1.9); opacity: 0; } }

.note { margin: 2px 0 0; min-height: 20px; font-size: 14px; color: var(--ink); }

.guarantees { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.card.g { gap: 4px; padding: 12px 14px 14px; opacity: 0; transform: translateY(8px); transition: opacity 0.4s ease, transform 0.4s ease, border-color 0.3s, box-shadow 0.3s; }
.card.g.shown { opacity: 0.6; transform: none; }
.card.g.current { opacity: 1; border-color: rgb(242 85 51 / 0.55); box-shadow: 0 0 0 4px rgb(242 85 51 / 0.07), rgba(22, 22, 24, 0.04) 0 12px 24px -8px; }
.title { margin-top: 6px; font-size: 13px; font-weight: 600; }
.text { font-size: 11px; line-height: 1.4; color: #52525b; }

.mock {
  display: flex; flex-direction: column; justify-content: center; gap: 4px; padding: 8px 10px; border-radius: 9px;
  background: #fafafa; border: 1px solid var(--line-soft); font-size: 10px; height: 76px; white-space: nowrap;
}
.mock .row { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-variant-numeric: tabular-nums; }
.mock .muted { color: var(--muted); }
.mock .utc { font-family: "Geist Mono", ui-monospace, monospace; font-size: 9.5px; padding: 0 5px; border-radius: 4px; background: #f0f0f2; color: #3f3f46; }
.mock .ver { font-family: "Geist Mono", ui-monospace, monospace; font-size: 9.5px; font-weight: 600; color: var(--signal); }
.layer { display: grid; grid-template-columns: 18px 1fr; align-items: center; gap: 6px; }
.layer .lane { position: relative; height: 9px; border-radius: 3px; background: #f0f0f2; }
.layer .seg { position: absolute; top: 0; bottom: 0; border-radius: 3px; transform-origin: left; }
.layer .seg.uk { background: #fde9d7; }
.layer .seg.us { background: #dceafe; }
.card.g.current .layer .seg { animation: grow 0.6s ease both; }
.card.g.current .layer:nth-child(2) .seg { animation-delay: 0.15s; }
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.mock .ok { padding: 0 5px; border-radius: 4px; background: #e7f8ee; color: #15803d; font-weight: 600; }
.card.g.current .mock .row { animation: rise 0.35s ease both; }
.card.g.current .mock .row:nth-child(2) { animation-delay: 0.1s; }
.card.g.current .mock .row:nth-child(3) { animation-delay: 0.2s; }
@keyframes rise { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
.src { display: inline-flex; align-items: center; gap: 5px; color: #52525b; }
.src img, .src .ico { width: 11px; height: 11px; }
.src .ico { fill: none; stroke: #71717a; stroke-width: 1.4; stroke-linecap: round; }
.card.g.current .mock .row:nth-child(4) { animation-delay: 0.3s; }
.mock .lock { padding: 0 5px; border-radius: 4px; background: #f0f0f2; color: #3f3f46; font-weight: 500; }
.fresh { display: flex; align-items: center; gap: 5px; color: #15803d; font-weight: 500; }
.fresh i { width: 6px; height: 6px; border-radius: 999px; background: #22c55e; box-shadow: 0 0 0 3px rgb(34 197 94 / 0.15); }
.warn { display: flex; align-items: center; gap: 6px; color: #b42318; font-weight: 600; }
.warn .dot { width: 6px; height: 6px; border-radius: 999px; background: #ef4444; box-shadow: 0 0 0 3px rgb(239 68 68 / 0.15); }

.swap-enter-active, .swap-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.swap-enter-from { opacity: 0; transform: translateY(3px); }
.swap-leave-to { opacity: 0; }
</style>
