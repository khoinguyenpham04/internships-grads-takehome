import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "render-schedule"
EXAMPLES = ROOT / "examples"


def run_cli(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([str(SCRIPT), *args], capture_output=True, text=True)


class CliTests(unittest.TestCase):
    def args(self, **overrides):
        values = {
            "schedule": str(EXAMPLES / "schedule.json"),
            "overrides": str(EXAMPLES / "overrides.json"),
            "from": "2026-11-06T17:00:00Z",
            "until": "2026-11-20T17:00:00Z",
            **overrides,
        }
        return [f"--{k}={v}" for k, v in values.items()]

    def test_readme_example(self):
        result = run_cli(*self.args())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            json.loads(result.stdout),
            [
                {"user": "alice", "start_at": "2026-11-06T17:00:00Z", "end_at": "2026-11-09T17:00:00Z"},
                {"user": "charlie", "start_at": "2026-11-09T17:00:00Z", "end_at": "2026-11-09T22:00:00Z"},
                {"user": "alice", "start_at": "2026-11-09T22:00:00Z", "end_at": "2026-11-13T17:00:00Z"},
                {"user": "bob", "start_at": "2026-11-13T17:00:00Z", "end_at": "2026-11-20T17:00:00Z"},
            ],
        )

    def test_empty_result_prints_an_empty_array(self):
        result = run_cli(*self.args(**{"from": "2026-01-01T00:00:00Z", "until": "2026-02-01T00:00:00Z"}))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), [])

    def test_invalid_input_exits_with_a_clear_message(self):
        with tempfile.TemporaryDirectory() as tmp:
            broken = Path(tmp) / "broken.json"
            broken.write_text("{not json")
            cases = [
                self.args(**{"from": "2026-11-20T17:00:00Z", "until": "2026-11-06T17:00:00Z"}),
                self.args(**{"from": "yesterday"}),
                self.args(schedule=str(Path(tmp) / "missing.json")),
                self.args(schedule=str(broken)),
            ]
            for args in cases:
                with self.subTest(args=args):
                    result = run_cli(*args)
                    self.assertEqual(result.returncode, 1)
                    self.assertEqual(result.stdout, "")
                    self.assertTrue(result.stderr.startswith("render-schedule: "), result.stderr)

    def test_missing_arguments_exit_with_usage_error(self):
        result = run_cli("--schedule=x")
        self.assertEqual(result.returncode, 2)


if __name__ == "__main__":
    unittest.main()
