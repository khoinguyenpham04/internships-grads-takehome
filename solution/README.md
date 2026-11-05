# On-call schedule renderer

`./render-schedule` takes a rotation, a list of overrides and a time window, and prints who is on call, and when, as JSON.

## Requirements

- Python 3.11 or newer (developed on 3.12)
- No dependencies to install. It only uses the standard library.

## Run it

From this folder:

```console
$ ./render-schedule \
    --schedule=examples/schedule.json \
    --overrides=examples/overrides.json \
    --from='2026-11-06T17:00:00Z' \
    --until='2026-11-20T17:00:00Z'
```

If the file is not executable on your machine, run `chmod +x render-schedule` or use `python3 render-schedule ...`.

Options:

- `--schedule`: JSON file with `users`, `handover_start_at` and `handover_interval_days`
- `--overrides`: JSON file with an array of `{user, start_at, end_at}`
- `--from`, `--until`: the window, as ISO 8601 timestamps with a timezone

Errors are printed to stderr as `render-schedule: <message>` with exit code 1.

## Run the tests

```console
$ python3 -m unittest
```

## How it works

A boundary sweep:

1. Collect every moment something could change: the window edges, each rotation handover, and each override's start and end.
2. Sort them. Nothing changes between two neighbouring moments.
3. For each gap, ask who is on call: the override covering it, or otherwise the rotation.
4. Join neighbouring gaps that come from the same override or the same shift.

Time ranges are half-open, `[start, end)`.

## Files

- `scheduler.py`: the logic (pure functions, no file or CLI code)
- `render-schedule`: the command-line wrapper
- `examples/`: the README example inputs
- `tests/`: unit tests, CLI tests, and a cross-check against a minute-by-minute simulation
- `NOTES.md`: assumptions, design reasoning, and real-life considerations

## Assumptions

- Timestamps are normalised to UTC, and a day is exactly 24 hours.
- If `--from` is before the schedule starts, the output starts at `handover_start_at`.
- Overrides outside the window are ignored, and overrides partly inside are clipped.
- Overlapping overrides, a zero or fractional interval, an empty user list, and timestamps without a timezone are rejected with an error.

See `NOTES.md` for the full list.
