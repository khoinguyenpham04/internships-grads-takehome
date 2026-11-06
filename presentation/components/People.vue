<script setup lang="ts">
import { computed } from "vue";
import { useSlideContext } from "@slidev/client";

const { $clicks } = useSlideContext();
const current = computed(() => $clicks.value - 1);

const cards = [
  { key: "cover", title: "Cover requests and swaps", note: "Ask for a few hours of cover. When someone accepts, the override is made for you." },
  { key: "leave", title: "Time off and holidays", note: "Leave and public holidays sync in, and clashes are flagged before you go." },
  { key: "gaps", title: "Gaps and double-booking", note: "Nobody on call, or one person in two places, caught days ahead." },
] as const;
</script>

<template>
  <div class="people">
    <div v-for="(c, i) in cards" :key="c.key" class="card p" :class="{ shown: current >= i, current: current === i }">
      <div class="mock">
        <template v-if="c.key === 'cover'">
          <div class="line s1">
            <span class="avatar alice">A</span>
            <span><b>Alice</b> needs cover</span>
            <span class="muted end">Tue 15:00 to 18:00</span>
          </div>
          <div class="line s1 muted reason">Childcare</div>
          <div class="line boxed s2">
            <span class="avatar charlie">C</span>
            <span><b>Charlie</b> accepted</span>
            <span class="via"><img src="/icons/slack.svg" alt="" /> via Slack</span>
            <span class="tick">✓</span>
          </div>
          <div class="line s3 made"><span class="dot green" /> Override created</div>
        </template>

        <template v-else-if="c.key === 'leave'">
          <div class="week s1"><span v-for="(d, n) in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="n">{{ d }}</span></div>
          <div class="lane s1">
            <span class="shift" />
            <span class="leave s2">Annual leave</span>
            <span class="holiday s2">Holiday</span>
          </div>
          <div class="line s3 red"><span class="dot" /> Clashes with Alice's shift</div>
          <div class="line s3 muted"><img class="logo" src="/icons/google-calendar.svg" alt="" /> Synced from Google Calendar</div>
        </template>

        <template v-else>
          <div class="sched s1"><span class="muted lbl">Platform</span><span class="lane"><i class="seg bob" style="left: 10%; width: 55%" /></span></div>
          <div class="sched s1"><span class="muted lbl">Payments</span><span class="lane"><i class="seg bob" style="left: 45%; width: 45%" /><i class="clash s2" style="left: 45%; width: 20%" /></span></div>
          <div class="line s3 red"><span class="dot" /> Bob is on call twice, Sat 09:00 to 17:00</div>
          <div class="line s3 red"><span class="dot" /> Nobody on call, Tue 02:00 to 06:00</div>
        </template>
      </div>
      <span class="title">{{ c.title }}</span>
      <span class="text">{{ c.note }}</span>
    </div>
  </div>
</template>

<style scoped>
.people { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: auto 0; }
.card.p { gap: 6px; padding: 16px 16px 18px; opacity: 0; transform: translateY(10px); transition: opacity 0.4s ease, transform 0.4s ease, border-color 0.3s, box-shadow 0.3s; }
.card.p.shown { opacity: 0.6; transform: none; }
.card.p.current { opacity: 1; border-color: rgb(242 85 51 / 0.55); box-shadow: 0 0 0 4px rgb(242 85 51 / 0.07), rgba(22, 22, 24, 0.04) 0 12px 24px -8px; }
.title { margin-top: 8px; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.text { font-size: 12px; line-height: 1.45; color: #52525b; }

.mock {
  display: flex; flex-direction: column; justify-content: center; gap: 7px; height: 136px; padding: 12px;
  border-radius: 10px; background: #fafafa; border: 1px solid var(--line-soft); font-size: 10.5px; white-space: nowrap; overflow: hidden;
}
.card.p.current .s1 { animation: rise 0.35s ease both; }
.card.p.current .s2 { animation: rise 0.35s ease 0.55s both; }
.card.p.current .s3 { animation: rise 0.35s ease 1.05s both; }
@keyframes rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

.muted { color: var(--muted); }
.end { margin-left: auto; }
.line { display: flex; align-items: center; gap: 7px; }
.reason { padding-left: 25px; margin-top: -4px; }
.line.boxed { padding: 5px 7px; margin: 0 -7px; border-radius: 7px; background: white; border: 1px solid var(--line); }
.via { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; color: var(--muted); font-size: 9.5px; }
.via img, .logo { width: 11px; height: 11px; }
.tick { color: #15803d; font-weight: 700; }
.made { color: #15803d; font-weight: 600; }
.avatar { display: grid; place-items: center; flex: none; width: 18px; height: 18px; border-radius: 999px; font-size: 9px; font-weight: 700; }
.avatar.alice { background: #fde9d7; color: #c2410c; }
.avatar.charlie { background: #e5defc; color: #6d28d9; }
.dot { width: 6px; height: 6px; flex: none; border-radius: 999px; background: #ef4444; box-shadow: 0 0 0 3px rgb(239 68 68 / 0.15); }
.dot.green { background: #22c55e; box-shadow: 0 0 0 3px rgb(34 197 94 / 0.15); }
.red { color: #b42318; font-weight: 600; }

.week { display: grid; grid-template-columns: repeat(7, 1fr); color: var(--muted); font-size: 9.5px; text-align: center; }
.lane { position: relative; display: block; border-radius: 5px; background: white; border: 1px solid var(--line); }
.mock > .lane { height: 40px; }
.lane .shift { position: absolute; left: 3px; right: 3px; top: 5px; height: 11px; border-radius: 3px; background: #fde9d7; }
.lane .leave, .lane .holiday {
  position: absolute; bottom: 4px; height: 15px; display: grid; place-items: center; border-radius: 3px; font-size: 8.5px; font-weight: 600;
}
.lane .leave { left: calc(100% * 2 / 7); width: calc(100% * 2 / 7); color: #1d4ed8; background: #dceafe; }
.lane .holiday { left: calc(100% * 4 / 7 + 2px); width: calc(100% / 7 - 4px); color: #92400e; background: #fef3c7; }

.sched { display: grid; grid-template-columns: 52px 1fr; align-items: center; gap: 8px; }
.sched .lane { height: 14px; border-radius: 4px; background: #f0f0f2; border: 0; }
.sched .seg { position: absolute; top: 2px; bottom: 2px; border-radius: 3px; }
.sched .seg.bob { background: #d7f5e4; }
.sched .clash { position: absolute; top: 0; bottom: 0; border-radius: 4px; outline: 1.5px solid #ef4444; background: repeating-linear-gradient(135deg, rgb(239 68 68 / 0.35) 0 1.5px, rgb(239 68 68 / 0.1) 1.5px 5px); }
</style>
