"""Unit tests for receipt handling, not a test of model quality."""
from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1] / "skills" / "obsess"
SPEC = importlib.util.spec_from_file_location("obsess_gate", ROOT / "scripts" / "gate.py")
assert SPEC is not None and SPEC.loader is not None
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)


class GateTests(unittest.TestCase):
    def setUp(self):
        self.contract = {
            "schema_version": 1, "contract_id": "test", "evaluator_revision": "r1",
            "comparison_key": "data-A/env-A",
            "primary_metric": {"name": "latency", "direction": "minimise", "min_delta": 2.0},
            "required_gates": ["correctness", "scope", "integrity", "measurement_quality"]
        }
        self.baseline = {
            "contract_id": "test", "evaluator_revision": "r1", "comparison_key": "data-A/env-A",
            "artifact_id": "base", "metric_name": "latency", "measurement_valid": True,
            "value": 100.0, "evidence_refs": ["test-fixture-only"],
            "gates": {key: True for key in self.contract["required_gates"]}
        }
        self.candidate = copy.deepcopy(self.baseline)
        self.candidate.update(artifact_id="candidate", value=94.0)

    def check(self):
        return GATE.decide(self.contract, self.baseline, self.candidate)

    def test_improvement(self):
        self.assertEqual(self.check()["status"], "accept")

    def test_threshold_boundary(self):
        self.candidate["value"] = 98.0
        self.assertEqual(self.check()["status"], "accept")

    def test_below_threshold(self):
        self.candidate["value"] = 99.0
        self.assertEqual(self.check()["status"], "inconclusive")

    def test_tie(self):
        self.candidate["value"] = 100.0
        self.assertEqual(self.check()["status"], "inconclusive")

    def test_regression(self):
        self.candidate["value"] = 110.0
        self.assertEqual(self.check()["status"], "reject")

    def test_maximise(self):
        self.contract["primary_metric"]["direction"] = "maximise"
        self.candidate["value"] = 105.0
        self.assertEqual(self.check()["status"], "accept")

    def test_hard_gate_overrides_metric(self):
        self.candidate["gates"]["correctness"] = False
        self.assertEqual(self.check()["status"], "reject")

    def test_ineligible_baseline(self):
        self.baseline["gates"]["correctness"] = False
        with self.assertRaises(ValueError): self.check()

    def test_missing_gate(self):
        del self.candidate["gates"]["scope"]
        with self.assertRaises(ValueError): self.check()

    def test_string_boolean(self):
        self.candidate["gates"]["scope"] = "true"
        with self.assertRaises(ValueError): self.check()

    def test_wrong_evaluator(self):
        self.candidate["evaluator_revision"] = "r2"
        with self.assertRaises(ValueError): self.check()

    def test_wrong_contract(self):
        self.candidate["contract_id"] = "another"
        with self.assertRaises(ValueError): self.check()

    def test_wrong_data(self):
        self.candidate["comparison_key"] = "data-B/env-A"
        with self.assertRaises(ValueError): self.check()

    def test_wrong_metric(self):
        self.candidate["metric_name"] = "different"
        with self.assertRaises(ValueError): self.check()

    def test_invalid_measurement(self):
        self.candidate["measurement_valid"] = False
        with self.assertRaises(ValueError): self.check()

    def test_missing_evidence(self):
        self.candidate["evidence_refs"] = []
        with self.assertRaises(ValueError): self.check()

    def test_non_finite_numbers(self):
        for value in (float("nan"), float("inf"), -float("inf"), 10 ** 400):
            with self.subTest(value=repr(value)):
                self.candidate["value"] = value
                with self.assertRaises(ValueError): self.check()

    def test_non_numbers(self):
        for value in (True, None, "94", [], {}):
            with self.subTest(value=value):
                self.candidate["value"] = value
                with self.assertRaises(ValueError): self.check()

    def test_negative_threshold(self):
        self.contract["primary_metric"]["min_delta"] = -1
        with self.assertRaises(ValueError): self.check()

    def test_zero_threshold_still_requires_gain(self):
        self.contract["primary_metric"]["min_delta"] = 0
        self.candidate["value"] = 100
        self.assertEqual(self.check()["status"], "inconclusive")

    def test_duplicate_gate_names(self):
        self.contract["required_gates"].append("scope")
        with self.assertRaises(ValueError): self.check()

    def test_same_artifact(self):
        self.candidate["artifact_id"] = "base"
        self.assertEqual(self.check()["status"], "inconclusive")

    def test_decimal_boundary(self):
        self.baseline["value"] = 0.3
        self.candidate["value"] = 0.2
        self.contract["primary_metric"]["min_delta"] = 0.1
        self.assertEqual(self.check()["status"], "accept")

    def test_invalid_direction(self):
        self.contract["primary_metric"]["direction"] = "guess"
        with self.assertRaises(ValueError): self.check()

    def test_invalid_schema_version(self):
        self.contract["schema_version"] = True
        with self.assertRaises(ValueError): self.check()

    def test_no_authentication_claim(self):
        self.assertFalse(self.check()["evidence_authenticated"])
        self.assertEqual(self.check()["basis"], "reported_measurements_only")

    def test_json_rejects_duplicate_keys(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "data.json"
            path.write_text('{"key":1,"key":2}')
            with self.assertRaises(ValueError): GATE.read_json(path)

    def test_json_rejects_nan(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "data.json"
            path.write_text('{"value":NaN}')
            with self.assertRaises(ValueError): GATE.read_json(path)

    def test_cli_success(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = []
            for name, data in (("contract", self.contract), ("baseline", self.baseline), ("candidate", self.candidate)):
                path = Path(directory) / f"{name}.json"
                path.write_text(json.dumps(data))
                paths.extend([f"--{name}", str(path)])
            run = subprocess.run([sys.executable, str(ROOT / "scripts" / "gate.py"), *paths],
                                 capture_output=True, text=True, timeout=10)
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertEqual(json.loads(run.stdout)["status"], "accept")

    def test_cli_missing_file(self):
        with tempfile.TemporaryDirectory() as directory:
            missing = str(Path(directory) / "not-present.json")
            run = subprocess.run([sys.executable, str(ROOT / "scripts" / "gate.py"),
                                  "--contract", missing, "--baseline", missing, "--candidate", missing],
                                 capture_output=True, text=True, timeout=10)
            self.assertEqual(run.returncode, 2)
            self.assertEqual(json.loads(run.stdout)["status"], "invalid")


if __name__ == "__main__":
    unittest.main()
