---
title: On-call schedule renderer
theme: default
colorSchema: light
aspectRatio: 16/9
canvasWidth: 980
transition: fade
fonts:
  sans: Inter
  mono: Geist Mono
  weights: '400,500,600'
layout: none
---

<div class="deck title-slide">
  <div class="intro">
    <div class="eyebrow brand-eyebrow"><img src="/icons/incident.svg" alt="" /> incident.io take-home</div>
    <h1>On-call schedule renderer</h1>
    <p class="lede">Who gets paged, and when, for any window.</p>
    <div class="person">
      <span class="name">Noah Pham</span>
      <span class="chips">
        <span><svg viewBox="0 0 16 16"><path d="M1.5 6 8 3l6.5 3L8 9 1.5 6Z"/><path d="M4 7.3v3.2c1 1 2.4 1.5 4 1.5s3-.5 4-1.5V7.3"/></svg> Computer Science · University of Manchester</span>
        <span><img src="/icons/cloudflare.svg" alt="" /> Software Engineering Intern · Cloudflare</span>
        <span><svg viewBox="0 0 16 16"><rect x="2" y="5" width="12" height="8.5" rx="1.8"/><path d="M5.5 5V3.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3V5"/></svg> Previously · Byteful</span>
        <span><svg viewBox="0 0 16 16"><path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5l3.5 3.5-3.5 3.5"/></svg> Core maintainer · EmDash CMS</span>
      </span>
    </div>
  </div>
  <div class="card hero">
    <Hero />
  </div>
</div>

---
layout: none
---

<div class="deck">
  <header>
    <div class="eyebrow">Assumptions</div>
    <h1>Two assumptions shape the rest</h1>
  </header>
  <div class="cards two">
    <div v-click class="card">
      <span class="num">01</span>
      <h2>Handovers in UTC</h2>
      <p>Every shift is exactly its number of days long. The first thing to change once teams hand over in local time.</p>
      <Mini kind="utc" />
    </div>
    <div v-click class="card">
      <span class="num">02</span>
      <h2>Reject, don't guess</h2>
      <p>Input that can't be trusted stops with a clear error, even overlapping overrides. A guess can page the wrong person.</p>
      <Mini kind="reject" />
    </div>
  </div>
</div>

---
layout: none
---

<div class="deck">
  <header>
    <div class="eyebrow">Approach</div>
    <h1>Three ways to solve it</h1>
  </header>
  <div class="cards three">
    <div v-click class="card">
      <span class="tag">Kept as the test</span>
      <h2>Check every minute</h2>
      <p>Simple enough to be obviously right. But the work grows with the number of minutes.</p>
      <Mini kind="minutes" />
    </div>
    <div v-click class="card">
      <span class="tag">Works, with cases</span>
      <h2>Build shifts, cut in overrides</h2>
      <p>Partial overlaps, overrides across two shifts, then merging the pieces back.</p>
      <Mini kind="cut" />
    </div>
    <div v-click class="card chosen">
      <span class="tag">Chosen</span>
      <h2>Split where the answer changes</h2>
      <p>Handovers and override edges become boundaries. Decide each gap once, join same-source neighbours.</p>
      <Mini kind="boundaries" />
    </div>
  </div>
</div>

---
layout: none
clicks: 10
---

<div class="deck">
  <header>
    <div class="eyebrow">Approach</div>
    <h1>Split where the answer changes</h1>
  </header>
  <div class="card sweep-card">
    <Sweep />
  </div>
</div>

---
layout: none
clicks: 4
---

<div class="code-slide">
  <header>
    <div>
      <div class="eyebrow">The code</div>
      <h1>One function does the work</h1>
    </div>
    <Stepper :steps="['Validate', 'Boundaries', 'Decide', 'Join', 'Verify']" />
  </header>
  <div class="panes">
    <div class="pane code">
      <div class="chrome">
        <span class="dots"><i /><i /><i /></span>
        <span class="file"><img src="/icons/python.svg" alt="" /> {{ $clicks >= 4 ? 'tests/test_scheduler.py' : 'scheduler.py' }}</span>
      </div>

````md magic-move {lines:false}
```py
def render(schedule, overrides, window_start, window_end):
    if window_start >= window_end:
        raise InputError("the window start must be before its end")
    overrides = sorted(overrides, key=lambda o: o.start_at)
    for earlier, later in zip(overrides, overrides[1:]):
        if later.start_at < earlier.end_at:
            raise InputError(
                f"overrides overlap: {earlier.user!r} and {later.user!r}"
            )
```
```py
def render(schedule, overrides, window_start, window_end):
    ...
    boundaries = {start, window_end}
    while handover < window_end:
        boundaries.add(handover)
        handover += schedule.handover_interval
    for override in overrides:
        boundaries.update(
            t for t in (override.start_at, override.end_at)
            if start < t < window_end
        )
```
```py
def _who_is_on_call(moment, schedule, overrides):
    for i, override in enumerate(overrides):
        if override.start_at <= moment < override.end_at:
            return override.user, ("override", i)
    shift = (
        moment - schedule.handover_start_at
    ) // schedule.handover_interval
    return schedule.users[shift % len(schedule.users)], ("shift", shift)
```
```py
def render(schedule, overrides, window_start, window_end):
    ...
    for a, b in zip(points, points[1:]):
        user, source = _who_is_on_call(a, schedule, overrides)
        if source == last_source:
            entries[-1] = Entry(user, entries[-1].start_at, b)
        else:
            entries.append(Entry(user, a, b))
            last_source = source
    return entries
```
```py
def test_random_inputs_agree_with_simulation(self):
    for _ in range(150):
        ...
        result = render(sched, overrides, window_start, window_end)
        self.assertEqual(
            self.merge(result),
            self.simulate(sched, overrides, window_start, window_end),
        )
```
````

</div>
    <div class="pane">
      <CodeSweep />
    </div>
  </div>
</div>

---
layout: none
clicks: 8
---

<div class="deck">
  <header>
    <div class="eyebrow">What I'd build next</div>
    <h1>First, make the schedule correct</h1>
    <p class="sub">Paging trusts it to wake the right person.</p>
  </header>
  <Paging />
</div>

---
layout: none
clicks: 3
---

<div class="deck">
  <header>
    <div class="eyebrow">What I'd build next</div>
    <h1>Then, make it easy to live with</h1>
    <p class="sub">Less chasing, fewer surprises.</p>
  </header>
  <People />
</div>

---

<div class="h-full flex items-center justify-center">
  <div class="closing">
    <div class="eyebrow">In short</div>
    <p>Find the moments where the answer can change, work out each gap once, and make sure that answer reaches the right person's phone.</p>
    <div class="who">Noah Pham · Thanks for watching</div>
  </div>
</div>
