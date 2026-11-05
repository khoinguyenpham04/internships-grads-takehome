"""Render an on-call schedule: a repeating rotation, with overrides on top, clipped to a window.

The approach is a boundary sweep. We collect every moment something could change, sort them,
and answer "who is on call?" once per gap between neighbouring moments.

All time ranges are half-open: [start, end).
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any


class InputError(ValueError):
    """The schedule, overrides or window are invalid."""


@dataclass(frozen=True)
class Schedule:
    users: tuple[str, ...]
    handover_start_at: datetime
    handover_interval: timedelta


@dataclass(frozen=True)
class Entry:
    user: str
    start_at: datetime
    end_at: datetime


def parse_time(value: Any, label: str) -> datetime:
    """Parse an ISO 8601 timestamp with a timezone and normalise it to UTC."""
    if not isinstance(value, str):
        raise InputError(f"{label}: expected an ISO 8601 string, got {value!r}")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        raise InputError(f"{label}: {value!r} is not a valid ISO 8601 timestamp") from None
    if parsed.tzinfo is None:
        raise InputError(f"{label}: {value!r} has no timezone (use e.g. 'Z')")
    return parsed.astimezone(timezone.utc)


def parse_schedule(data: Any) -> Schedule:
    if not isinstance(data, dict):
        raise InputError("schedule: expected a JSON object")
    users = data.get("users")
    if not isinstance(users, list) or not users or not all(isinstance(u, str) and u for u in users):
        raise InputError("schedule.users: expected a non-empty list of non-empty strings")
    days = data.get("handover_interval_days")
    if isinstance(days, bool) or not isinstance(days, int) or days <= 0:
        raise InputError("schedule.handover_interval_days: expected a positive whole number")
    return Schedule(
        users=tuple(users),
        handover_start_at=parse_time(data.get("handover_start_at"), "schedule.handover_start_at"),
        handover_interval=timedelta(days=days),
    )


def parse_overrides(data: Any) -> list[Entry]:
    if not isinstance(data, list):
        raise InputError("overrides: expected a JSON array")
    overrides = []
    for i, item in enumerate(data):
        label = f"overrides[{i}]"
        if not isinstance(item, dict):
            raise InputError(f"{label}: expected a JSON object")
        user = item.get("user")
        if not isinstance(user, str) or not user:
            raise InputError(f"{label}.user: expected a non-empty string")
        start = parse_time(item.get("start_at"), f"{label}.start_at")
        end = parse_time(item.get("end_at"), f"{label}.end_at")
        if end <= start:
            raise InputError(f"{label}: end_at must be after start_at")
        overrides.append(Entry(user, start, end))
    return overrides


def render(
    schedule: Schedule, overrides: list[Entry], window_start: datetime, window_end: datetime
) -> list[Entry]:
    """Return who is on call, and when, for every moment in [window_start, window_end)."""
    if window_start >= window_end:
        raise InputError("the window start must be before its end")

    overrides = sorted(overrides, key=lambda o: o.start_at)
    for earlier, later in zip(overrides, overrides[1:]):
        if later.start_at < earlier.end_at:
            raise InputError(f"overrides overlap: {earlier.user!r} and {later.user!r}")

    # Nobody is on call before the schedule starts.
    start = max(window_start, schedule.handover_start_at)
    if start >= window_end:
        return []

    # 1. Every moment something could change.
    boundaries = {start, window_end}
    shifts_elapsed = (start - schedule.handover_start_at) // schedule.handover_interval
    handover = schedule.handover_start_at + (shifts_elapsed + 1) * schedule.handover_interval
    while handover < window_end:
        boundaries.add(handover)
        handover += schedule.handover_interval
    for override in overrides:
        boundaries.update(t for t in (override.start_at, override.end_at) if start < t < window_end)

    # 2. Nothing changes between neighbouring boundaries, so ask once per gap.
    # A handover can fall inside an override, so join neighbours that come from the same source.
    entries: list[Entry] = []
    last_source = None
    points = sorted(boundaries)
    for a, b in zip(points, points[1:]):
        user, source = _who_is_on_call(a, schedule, overrides)
        if source == last_source:
            entries[-1] = Entry(user, entries[-1].start_at, b)
        else:
            entries.append(Entry(user, a, b))
            last_source = source
    return entries


def _who_is_on_call(moment: datetime, schedule: Schedule, overrides: list[Entry]) -> tuple[str, tuple]:
    """Return the user on call at `moment`, and which override or rotation shift put them there."""
    for i, override in enumerate(overrides):
        if override.start_at <= moment < override.end_at:
            return override.user, ("override", i)
    shift = (moment - schedule.handover_start_at) // schedule.handover_interval
    return schedule.users[shift % len(schedule.users)], ("shift", shift)


def format_time(moment: datetime) -> str:
    return moment.isoformat().replace("+00:00", "Z")


def entry_to_json(entry: Entry) -> dict[str, str]:
    return {
        "user": entry.user,
        "start_at": format_time(entry.start_at),
        "end_at": format_time(entry.end_at),
    }
