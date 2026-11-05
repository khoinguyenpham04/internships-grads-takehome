# Notes: on-call schedule renderer

## The problem in one line

Given a repeating rotation, some one-off overrides, and a time window, return who is on call, and when, for every moment in that window.

## The idea

Split time into pieces where nothing changes, then answer once per piece. This is a **boundary sweep**.

1. Collect every moment something could change:
   - `from` and `until`
   - each rotation handover inside the window
   - each override's start and end
2. Sort them. Each gap between neighbours is a segment.
3. For each segment, look at its start:
   - If an override covers it, that person is on call.
   - Otherwise the rotation decides: `users[floor((t - start) / interval) % n]`.
4. Emit one entry per segment, joining neighbours that come from the same source (the same override or the same rotation shift).

Why step 4 joins neighbours: a handover can fall inside a long override. Without joining, one override would come out as two entries. We found this by writing the "override spanning a handover" test.

Why this works:
- Every moment has exactly one answer, so there are no overlap cases to handle.
- Clipping to `from` and `until` is automatic, because they are boundaries.
- The rotation is a function of time, so we never loop from the schedule's start.

Worked example (README):

| Segment | Override | Rotation | Result |
|---|---|---|---|
| Nov 6 17:00 to Nov 9 17:00 | none | week 0, alice | alice |
| Nov 9 17:00 to Nov 9 22:00 | charlie | ignored | charlie |
| Nov 9 22:00 to Nov 13 17:00 | none | week 0, alice | alice |
| Nov 13 17:00 to Nov 20 17:00 | none | week 1, bob | bob |

## Assumptions the brief gives us

- Overrides come after `handover_start_at` and never overlap each other.
- Windows are a few weeks long, with fewer than 100 overrides.
- Correctness matters more than speed.
- Users rotate evenly, in list order.
- Timestamps are ISO 8601 UTC, and the interval is in days.
- Output is a JSON array, trimmed to the window.

## Assumptions we make (and should state)

Time:
- Ranges are half-open, `[start, end)`, so touching entries never overlap.
- Everything is UTC and a day is exactly 24 hours. Offsets in input are converted to UTC.

Window:
- `from` must be before `until`, otherwise exit with an error.
- If `from` is before the schedule starts, start at `handover_start_at`. If the whole window is earlier, return `[]`.
- Overrides outside the window are ignored, and overrides partly inside are clipped.

Overrides:
- End must be after start.
- The override user does not have to be in the rotation, because outside cover is realistic.
- An override by the person already on call stays as its own entry. We join entries by source (override or shift), never just by user.
- Overlapping overrides are rejected with an error, even though the brief promises none.

Input:
- The user list must not be empty and the interval must be a positive whole number of days. Fractions are rejected.
- A user listed twice gets extra shifts.
- Bad input gives a clear error and a non-zero exit code.

Output:
- Entries are chronological, with a consistent format such as `2026-11-09T17:00:00Z`.

## Testing

- The README example is the first test.
- Edge cases:
  - an override crossing a handover
  - an override clipped by `from` or `until`
  - `from` mid-shift
  - `from` before the schedule starts
  - no overrides
  - one user
  - an override at the exact window edge
- Cross-check: a minute-by-minute simulation is trivially correct. Run it and the sweep on random inputs and assert they agree.

## Real life: what changes at 10,000s of employees

The sweep stays the heart of the system, but a real company needs more around it. This section is general engineering reasoning, not knowledge of any vendor's internals.

**1. Time zones and DST**
- People think in local time: "handover at 5pm London".
- That is 16:00 UTC in winter and 17:00 UTC in summer.
- Production should store a timezone with each schedule and count local calendar days, not 24-hour blocks.
- Display per viewer: the same shift shown in London, New York or Tokyo.
- Test the two DST change days each year, including 23-hour and 25-hour days.

**2. Rules change; history must not**
- If the rotation is a pure formula, adding a user rewrites the past.
- Keep versions of each schedule so a change applies from a date forward.
- Freeze past shifts into stored records once they have happened. Pay, audits and "who got paged at 3am?" depend on this.

**3. Identity**
- Computed segments have no ID.
- Swaps, cover requests, notifications and audit logs all need to point at a specific shift.
- Give shifts stable IDs once they are materialised, and keep overrides as first-class records with an author and a reason.

**4. Speed where it matters**
- "Who is on call right now?" decides who is woken up. It must be a fast lookup, not a heavy computation.
- Cache the current and next handover, and schedule handover jobs ahead of time.
- Cap the maximum window size so a bad query cannot run away.

**5. Many schedules, many people**
- Each schedule is independent, so rendering scales out by schedule. There is no cross-schedule work to coordinate.
- Index overrides by schedule and time range.
- Escalations chain several schedules together, so the shared core must give the same answer to the UI, the API and the pager.

**6. Layers, priorities and overlaps**
- Real schedules have several rotations (primary, secondary, follow-the-sun, shadow) and overrides on top.
- The sweep extends naturally: take the first layer that covers each segment.
- Decide a rule for overlapping overrides (reject on save, or priority wins). The brief rules them out, a product cannot.

**7. People, not just slots**
- Holidays and time off can clash with a shift.
- Active hours, working-hours limits and fairness (nights, weekends) matter in large teams.
- Detect two kinds of problems: gaps (nobody on call) and conflicts (someone in two places).

**8. Edges and safety**
- Validate on save, so the core only sees clean input.
- Handle people who leave: a departed user must not stay in a rotation.
- Make every change auditable: who changed what, and when.

## Ideas that come cheaply from this design

- Gap and double-booking detection (a segment with nobody, or with two people).
- "What if" preview: run the core on a draft and diff against the live schedule.
- Fairness and load stats per person.
- Cover suggestions ranked by free time and recent load.
- Schedule warnings, such as very long shifts.
- Calendar (iCal) export.

## Design principles

1. Store inputs (rules and overrides), compute outputs on read, and freeze the past.
2. One pure core function that every front-end uses.
3. Validate at the edges.
4. Keep the algorithm simple, and put the complexity in the data model around it.

## For the video

1. The idea: split time where nothing changes.
2. The safety: half-open ranges, UTC, validation.
3. The proof: README example plus a brute-force cross-check.
4. The limits: time zones, rule changes, frozen history, shift IDs, layers.
