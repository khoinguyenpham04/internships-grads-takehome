import random
import unittest
from datetime import datetime, timedelta, timezone

from scheduler import Entry, InputError, Schedule, entry_to_json, parse_overrides, parse_schedule, parse_time, render


def t(value: str) -> datetime:
    return parse_time(value, "test")


def schedule(users=("alice", "bob", "charlie"), start="2026-11-06T17:00:00Z", days=7) -> Schedule:
    return Schedule(tuple(users), t(start), timedelta(days=days))


def override(user: str, start: str, end: str) -> Entry:
    return Entry(user, t(start), t(end))


def run(sched, overrides, start, until) -> list[tuple[str, str, str]]:
    return [(e.user, e.start_at.strftime("%d %H:%M"), e.end_at.strftime("%d %H:%M"))
            for e in render(sched, overrides, t(start), t(until))]


class RenderTests(unittest.TestCase):
    def test_readme_example(self):
        result = render(
            schedule(),
            [override("charlie", "2026-11-09T17:00:00Z", "2026-11-09T22:00:00Z")],
            t("2026-11-06T17:00:00Z"),
            t("2026-11-20T17:00:00Z"),
        )
        self.assertEqual(
            [entry_to_json(e) for e in result],
            [
                {"user": "alice", "start_at": "2026-11-06T17:00:00Z", "end_at": "2026-11-09T17:00:00Z"},
                {"user": "charlie", "start_at": "2026-11-09T17:00:00Z", "end_at": "2026-11-09T22:00:00Z"},
                {"user": "alice", "start_at": "2026-11-09T22:00:00Z", "end_at": "2026-11-13T17:00:00Z"},
                {"user": "bob", "start_at": "2026-11-13T17:00:00Z", "end_at": "2026-11-20T17:00:00Z"},
            ],
        )

    def test_rotation_wraps_back_to_first_user(self):
        result = run(schedule(), [], "2026-11-06T17:00:00Z", "2026-11-27T17:00:00Z")
        self.assertEqual([r[0] for r in result], ["alice", "bob", "charlie"])
        result = run(schedule(), [], "2026-11-06T17:00:00Z", "2026-11-28T17:00:00Z")
        self.assertEqual([r[0] for r in result], ["alice", "bob", "charlie", "alice"])

    def test_window_is_truncated_mid_shift(self):
        sched = schedule(users=("a", "b"), start="2026-11-07T13:00:00Z", days=2)
        result = run(sched, [], "2026-11-08T14:00:00Z", "2026-11-12T00:00:00Z")
        self.assertEqual(
            result, [("a", "08 14:00", "09 13:00"), ("b", "09 13:00", "11 13:00"), ("a", "11 13:00", "12 00:00")]
        )

    def test_window_inside_a_single_shift(self):
        result = run(schedule(), [], "2026-11-08T00:00:00Z", "2026-11-09T00:00:00Z")
        self.assertEqual(result, [("alice", "08 00:00", "09 00:00")])

    def test_window_starting_before_the_schedule_is_clamped(self):
        result = run(schedule(), [], "2026-11-01T00:00:00Z", "2026-11-08T00:00:00Z")
        self.assertEqual(result, [("alice", "06 17:00", "08 00:00")])

    def test_window_entirely_before_the_schedule_is_empty(self):
        self.assertEqual(run(schedule(), [], "2026-11-01T00:00:00Z", "2026-11-06T17:00:00Z"), [])

    def test_window_far_in_the_future(self):
        # 3650 days is 521 whole weeks and 3 days, so the shift index is 521 and 521 % 3 == 2.
        result = render(schedule(), [], t("2036-11-04T17:00:00Z"), t("2036-11-05T17:00:00Z"))
        self.assertEqual([e.user for e in result], ["charlie"])

    def test_override_spanning_a_handover(self):
        o = override("dave", "2026-11-12T00:00:00Z", "2026-11-14T00:00:00Z")
        result = run(schedule(), [o], "2026-11-06T17:00:00Z", "2026-11-20T17:00:00Z")
        self.assertEqual(
            result, [("alice", "06 17:00", "12 00:00"), ("dave", "12 00:00", "14 00:00"), ("bob", "14 00:00", "20 17:00")]
        )

    def test_override_clipped_by_window_edges(self):
        o = override("dave", "2026-11-07T00:00:00Z", "2026-11-09T00:00:00Z")
        result = run(schedule(), [o], "2026-11-08T00:00:00Z", "2026-11-08T12:00:00Z")
        self.assertEqual(result, [("dave", "08 00:00", "08 12:00")])

    def test_override_outside_window_is_ignored(self):
        before = override("dave", "2026-11-07T00:00:00Z", "2026-11-08T00:00:00Z")
        after = override("erin", "2026-11-12T00:00:00Z", "2026-11-13T00:00:00Z")
        result = run(schedule(), [before, after], "2026-11-09T00:00:00Z", "2026-11-11T00:00:00Z")
        self.assertEqual(result, [("alice", "09 00:00", "11 00:00")])

    def test_override_touching_window_edges_is_ignored(self):
        before = override("dave", "2026-11-07T00:00:00Z", "2026-11-09T00:00:00Z")
        after = override("erin", "2026-11-11T00:00:00Z", "2026-11-12T00:00:00Z")
        result = run(schedule(), [before, after], "2026-11-09T00:00:00Z", "2026-11-11T00:00:00Z")
        self.assertEqual(result, [("alice", "09 00:00", "11 00:00")])

    def test_override_covering_the_whole_window(self):
        o = override("dave", "2026-11-07T00:00:00Z", "2026-11-12T00:00:00Z")
        self.assertEqual(run(schedule(), [o], "2026-11-08T00:00:00Z", "2026-11-09T00:00:00Z"),
                         [("dave", "08 00:00", "09 00:00")])

    def test_override_aligned_with_a_handover(self):
        o = override("dave", "2026-11-13T17:00:00Z", "2026-11-14T17:00:00Z")
        result = run(schedule(), [o], "2026-11-12T17:00:00Z", "2026-11-15T17:00:00Z")
        self.assertEqual(result, [("alice", "12 17:00", "13 17:00"), ("dave", "13 17:00", "14 17:00"),
                                  ("bob", "14 17:00", "15 17:00")])

    def test_back_to_back_overrides(self):
        a = override("dave", "2026-11-08T00:00:00Z", "2026-11-09T00:00:00Z")
        b = override("erin", "2026-11-09T00:00:00Z", "2026-11-10T00:00:00Z")
        result = run(schedule(), [b, a], "2026-11-07T00:00:00Z", "2026-11-11T00:00:00Z")
        self.assertEqual(result, [("alice", "07 00:00", "08 00:00"), ("dave", "08 00:00", "09 00:00"),
                                  ("erin", "09 00:00", "10 00:00"), ("alice", "10 00:00", "11 00:00")])

    def test_override_by_the_person_already_on_call_stays_a_separate_entry(self):
        o = override("alice", "2026-11-08T00:00:00Z", "2026-11-09T00:00:00Z")
        result = run(schedule(), [o], "2026-11-07T00:00:00Z", "2026-11-10T00:00:00Z")
        self.assertEqual(result, [("alice", "07 00:00", "08 00:00"), ("alice", "08 00:00", "09 00:00"),
                                  ("alice", "09 00:00", "10 00:00")])

    def test_single_user_rotation(self):
        result = run(schedule(users=("solo",)), [], "2026-11-06T17:00:00Z", "2026-11-20T17:00:00Z")
        self.assertEqual(result, [("solo", "06 17:00", "13 17:00"), ("solo", "13 17:00", "20 17:00")])

    def test_user_listed_twice_gets_extra_shifts(self):
        result = run(schedule(users=("a", "b", "a")), [], "2026-11-06T17:00:00Z", "2026-11-27T17:00:00Z")
        self.assertEqual([r[0] for r in result], ["a", "b", "a"])

    def test_timestamps_with_offsets_are_normalised_to_utc(self):
        sched = parse_schedule({"users": ["a", "b"], "handover_start_at": "2026-11-06T18:00:00+01:00",
                                "handover_interval_days": 1})
        result = render(sched, [], t("2026-11-06T17:00:00Z"), t("2026-11-07T17:00:00Z"))
        self.assertEqual([entry_to_json(e) for e in result],
                         [{"user": "a", "start_at": "2026-11-06T17:00:00Z", "end_at": "2026-11-07T17:00:00Z"}])

    def test_result_is_contiguous_and_does_not_depend_on_override_order(self):
        overrides = [override("d", "2026-11-08T00:00:00Z", "2026-11-08T05:00:00Z"),
                     override("e", "2026-11-14T00:00:00Z", "2026-11-15T05:00:00Z")]
        forward = render(schedule(), overrides, t("2026-11-06T17:00:00Z"), t("2026-11-20T17:00:00Z"))
        backward = render(schedule(), overrides[::-1], t("2026-11-06T17:00:00Z"), t("2026-11-20T17:00:00Z"))
        self.assertEqual(forward, backward)
        for a, b in zip(forward, forward[1:]):
            self.assertEqual(a.end_at, b.start_at)


class ValidationTests(unittest.TestCase):
    def assert_input_error(self, fn, *args):
        with self.assertRaises(InputError):
            fn(*args)

    def test_window_must_be_forwards(self):
        for start, until in [("2026-11-09T00:00:00Z", "2026-11-09T00:00:00Z"),
                             ("2026-11-10T00:00:00Z", "2026-11-09T00:00:00Z")]:
            self.assert_input_error(render, schedule(), [], t(start), t(until))

    def test_overlapping_overrides_are_rejected(self):
        a = override("d", "2026-11-08T00:00:00Z", "2026-11-10T00:00:00Z")
        b = override("e", "2026-11-09T00:00:00Z", "2026-11-11T00:00:00Z")
        self.assert_input_error(render, schedule(), [a, b], t("2026-11-07T00:00:00Z"), t("2026-11-12T00:00:00Z"))

    def test_bad_schedules_are_rejected(self):
        base = {"users": ["a"], "handover_start_at": "2026-11-06T17:00:00Z", "handover_interval_days": 7}
        bad = [
            "not an object",
            {**base, "users": []},
            {**base, "users": ["a", ""]},
            {**base, "users": "alice"},
            {**base, "handover_interval_days": 0},
            {**base, "handover_interval_days": -7},
            {**base, "handover_interval_days": 1.5},
            {**base, "handover_interval_days": True},
            {**base, "handover_interval_days": "7"},
            {**base, "handover_start_at": "2026-11-06T17:00:00"},
            {**base, "handover_start_at": "2026-02-30T00:00:00Z"},
            {**base, "handover_start_at": "tomorrow"},
            {k: v for k, v in base.items() if k != "handover_start_at"},
        ]
        for data in bad:
            with self.subTest(data=data):
                self.assert_input_error(parse_schedule, data)

    def test_bad_overrides_are_rejected(self):
        good = {"user": "a", "start_at": "2026-11-09T17:00:00Z", "end_at": "2026-11-09T22:00:00Z"}
        bad = [
            {"not": "a list"},
            ["not an object"],
            [{**good, "user": ""}],
            [{**good, "end_at": good["start_at"]}],
            [{**good, "end_at": "2026-11-09T12:00:00Z"}],
            [{**good, "start_at": "2026-11-09"}],
            [{k: v for k, v in good.items() if k != "user"}],
        ]
        for data in bad:
            with self.subTest(data=data):
                self.assert_input_error(parse_overrides, data)

    def test_empty_overrides_are_fine(self):
        self.assertEqual(parse_overrides([]), [])


class BruteForceCrossCheck(unittest.TestCase):
    """The sweep must agree with a trivially correct minute-by-minute simulation on random inputs."""

    MINUTE = timedelta(minutes=1)

    @staticmethod
    def merge(entries):
        merged = []
        for e in entries:
            if merged and merged[-1].user == e.user and merged[-1].end_at == e.start_at:
                merged[-1] = Entry(e.user, merged[-1].start_at, e.end_at)
            else:
                merged.append(e)
        return merged

    def simulate(self, sched, overrides, window_start, window_end):
        entries, moment = [], max(window_start, sched.handover_start_at)
        while moment < window_end:
            user = next((o.user for o in overrides if o.start_at <= moment < o.end_at), None)
            if user is None:
                shift = (moment - sched.handover_start_at) // sched.handover_interval
                user = sched.users[shift % len(sched.users)]
            entries.append(Entry(user, moment, moment + self.MINUTE))
            moment += self.MINUTE
        return self.merge(entries)

    def test_random_inputs_agree_with_simulation(self):
        rng = random.Random(20261106)
        epoch = datetime(2026, 11, 1, tzinfo=timezone.utc)
        at = lambda minutes: epoch + timedelta(minutes=minutes)
        for _ in range(150):
            sched = Schedule(
                tuple(rng.choices(["a", "b", "c", "d"], k=rng.randint(1, 4))),
                at(rng.randint(0, 3 * 1440)),
                timedelta(days=rng.randint(1, 3)),
            )
            overrides, cursor = [], rng.randint(0, 2000)
            for _ in range(rng.randint(0, 8)):
                start = cursor + rng.randint(0, 2000)
                cursor = start + rng.randint(1, 1500)
                overrides.append(Entry(rng.choice(["a", "b", "x"]), at(start), at(cursor)))
            window_start = at(rng.randint(-2 * 1440, 8 * 1440))
            window_end = window_start + timedelta(minutes=rng.randint(1, 10 * 1440))

            with self.subTest(schedule=sched, overrides=overrides, window=(window_start, window_end)):
                result = render(sched, overrides, window_start, window_end)
                self.assertEqual(self.merge(result), self.simulate(sched, overrides, window_start, window_end))


if __name__ == "__main__":
    unittest.main()
