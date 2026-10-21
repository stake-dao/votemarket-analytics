"""Run only the workflow's local JSON validation, never its publish commands."""
import json
import os
import re
import tempfile
import textwrap
import unittest
from pathlib import Path
from unittest.mock import patch


WORKFLOW = Path(__file__).parents[1] / ".github/workflows/analytics-v3.yml"
SOURCE = WORKFLOW.read_text()
CHECK = textwrap.dedent(re.search(r"python - <<'PY_CHECK'\n(.*?)\n          PY_CHECK", SOURCE, re.S).group(1))
LEGACY_WORKFLOW = WORKFLOW.with_name("analytics-v2.yml")
LEGACY_SOURCE = LEGACY_WORKFLOW.read_text()
LEGACY_COPY = textwrap.dedent(re.search(r"python - <<'PY_COPY'\n(.*?)\n          PY_COPY", LEGACY_SOURCE, re.S).group(1))


class SnapshotPublicationTest(unittest.TestCase):
    def validate(self, payloads):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for relative, payload in payloads.items():
                target = root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(json.dumps(payload))
            with patch.dict(os.environ, {"VOTEMARKET_SNAPSHOT_OUTPUT_DIR": str(root)}):
                exec(compile(CHECK, str(WORKFLOW), "exec"), {})

    def test_accepts_complete_snapshot_and_metadata(self):
        self.validate({"curve/42.json": {"analytics": []}, "curve/rounds-metadata.json": [{"id": 42, "endVoting": 123}]})

    def test_rejects_empty_output(self):
        with self.assertRaisesRegex(SystemExit, "No snapshots"):
            self.validate({})

    def test_rejects_null_snapshot(self):
        with self.assertRaisesRegex(SystemExit, "Null snapshot"):
            self.validate({"curve/42.json": None})

    def test_rejects_invalid_snapshot(self):
        with self.assertRaisesRegex(SystemExit, "Invalid snapshot"):
            self.validate({"curve/42.json": {"campaigns": []}})

    def test_failed_generation_cannot_run_publication(self):
        self.assertNotIn("if: always()", SOURCE)
        self.assertIn('cp -R "${VOTEMARKET_SNAPSHOT_OUTPUT_DIR}/."', SOURCE)
        self.assertNotIn("--delete", SOURCE)

    def test_rejects_retired_snapshots_before_publication(self):
        for protocol in ("balancer", "pendle", "vlaura/balancer"):
            with self.subTest(protocol=protocol):
                with self.assertRaisesRegex(SystemExit, "Retired market snapshot"):
                    self.validate({"curve/42.json": {"analytics": []},
                                   f"{protocol}/42.json": {"analytics": []}})


class LegacyPublicationTest(unittest.TestCase):
    def publish(self, root):
        with patch.dict(os.environ, {
            "DEVOPS_DIR": str(root / "devops"),
            "GITHUB_WORKSPACE": str(root),
            "TARGET_DEVOPS_DIR": "target",
        }):
            exec(compile(LEGACY_COPY, str(LEGACY_WORKFLOW), "exec"), {})

    def prepare(self, root):
        source = root / "devops/json"
        target = root / "target/analytics"
        source.mkdir(parents=True)
        target.mkdir(parents=True)
        return source, target

    def test_publishes_active_data_without_replacing_retired_archives(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source, target = self.prepare(root)
            aggregate = {"balancer-platform": {"old": [1, 2]},
                         "pendle-platform": {"old": [3]}, "frax-platform": {"new": 4}}
            (source / "votemarket-analytics.json").write_text(json.dumps(aggregate))
            for protocol in ("curve", "frax", "vlcvx", "balancer", "pendle"):
                (source / f"votemarket-analytics-{protocol}.json").write_text('{"new": 4}')
            for protocol in ("balancer", "pendle"):
                (target / f"votemarket-analytics-{protocol}.json").write_text('{ "frozen": [1, 2] }\n')
                history = target / "votemarket-analytics" / protocol / "42.json"
                history.parent.mkdir(parents=True)
                history.write_text('{ "round": 42 }\n')
            self.publish(root)
            self.assertEqual(json.loads((target / "votemarket-analytics.json").read_text()), aggregate)
            for protocol in ("curve", "frax", "vlcvx"):
                self.assertEqual(json.loads((target / f"votemarket-analytics-{protocol}.json").read_text()), {"new": 4})
            for protocol in ("balancer", "pendle"):
                self.assertEqual((target / f"votemarket-analytics-{protocol}.json").read_text(), '{ "frozen": [1, 2] }\n')
                self.assertEqual((target / "votemarket-analytics" / protocol / "42.json").read_text(), '{ "round": 42 }\n')

    def test_invalid_active_output_prevents_all_copies(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source, target = self.prepare(root)
            (source / "votemarket-analytics.json").write_text('{"new": 1}')
            (source / "votemarket-analytics-frax.json").write_text('null')
            (target / "votemarket-analytics.json").write_text('{ "old": true }\n')
            with self.assertRaisesRegex(SystemExit, "Invalid analytics"):
                self.publish(root)
            self.assertEqual((target / "votemarket-analytics.json").read_text(), '{ "old": true }\n')
            self.assertFalse((target / "votemarket-analytics-frax.json").exists())

    def test_missing_aggregate_prevents_publication(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source, target = self.prepare(root)
            (source / "votemarket-analytics-frax.json").write_text('{"new": 1}')
            with self.assertRaisesRegex(SystemExit, "Missing aggregate"):
                self.publish(root)
            self.assertEqual(list(target.iterdir()), [])

    def test_failed_generation_cannot_run_legacy_publication(self):
        self.assertNotIn("if: always()", LEGACY_SOURCE)
        self.assertNotIn("--delete", LEGACY_SOURCE)


if __name__ == "__main__":
    unittest.main()
