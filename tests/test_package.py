"""Static package consistency checks. These don't execute the skill in a host."""
from __future__ import annotations

import json
from pathlib import Path
import re
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "obsess"
ADAPTERS = {
    "cursor/obsess.md": None,
    "copilot/obsess.prompt.md": None,
    "windsurf/obsess.md": None,
    "cline/obsess.md": None,
    "codex/obsess.md": "$ARGUMENTS",
    "gemini/obsess.toml": "{{args}}",
    "opencode/obsess.md": "$ARGUMENTS",
}
VERSION = "0.3.0"


class PackageTests(unittest.TestCase):
    def test_required_files_present(self):
        for name in (
            "README.md", "INSTALL.md", "LICENSE", "CHANGELOG.md", "EVALUATION.md", "DESIGN.md", "LAUNCH.md",
            "evals/cases.json", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json",
            "gemini-extension.json", "docs/assets/social-preview.png",
        ):
            with self.subTest(name=name):
                self.assertTrue((ROOT / name).is_file())
        for name in (
            "SKILL.md", "LICENSE", "refs/polish.md", "refs/recipes.md", "refs/protocol.md", "refs/recovery.md",
            "refs/host.md", "assets/run.template.md", "assets/report.template.md", "assets/state.template.json",
            "scripts/install.py", "scripts/gate.py", "integrations/rules/obsess.md",
            *(f"integrations/{adapter}" for adapter in ADAPTERS),
        ):
            with self.subTest(name=name):
                self.assertTrue((SKILL / name).is_file())

    def test_core_stays_compact(self):
        self.assertLessEqual(len((SKILL / "SKILL.md").read_text(encoding="utf-8").split()), 1300)

    def test_frontmatter_has_explicit_invocation_and_native_slash(self):
        text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        match = re.match(r"\A---\n(.*?)\n---\n", text, re.S)
        self.assertIsNotNone(match)
        header = match.group(1)
        for field in ('name: obsess', 'disable-model-invocation: true', f'version: "{VERSION}"',
                      'opencode/slash: "true"', 'opencode/autoinvoke: "false"'):
            self.assertIn(field, header)
        description = re.search(r"^description: (.+)$", header, re.M).group(1)
        self.assertLessEqual(len(description), 1024)

    def test_local_markdown_links_resolve(self):
        for file in ROOT.rglob("*.md"):
            for href in re.findall(r"\[[^\]]*\]\(([^)]+)\)", file.read_text(encoding="utf-8")):
                target = urlsplit(href)
                if target.scheme or href.startswith("#"):
                    continue
                path = (file.parent / unquote(target.path)).resolve()
                with self.subTest(file=str(file.relative_to(ROOT)), href=href):
                    self.assertTrue(path.is_relative_to(ROOT.resolve()), "Local link escapes package")
                    if file.resolve().is_relative_to(SKILL.resolve()):
                        self.assertTrue(path.is_relative_to(SKILL.resolve()), "Installed skill link escapes its folder")
                    self.assertTrue(path.exists(), "Broken local link")

    def test_json_files_parse(self):
        for file in ROOT.rglob("*.json"):
            with self.subTest(file=file.name):
                data = json.loads(file.read_text(encoding="utf-8"))
                self.assertIsInstance(data, dict)

    def test_new_state_does_not_invent_timing_or_choose_a_budget(self):
        state = json.loads((SKILL / "assets/state.template.json").read_text())
        self.assertEqual(state["schema_version"], 2)
        self.assertIsNone(state["elapsed_seconds"])
        self.assertFalse(state["elapsed_time_measured"])
        self.assertIsNone(state["budget"]["max_experiments"])
        self.assertEqual(state["experiments_started"], 0)
        self.assertEqual(state["working_tree_status"], "original")

    def test_attempt_template_starts_unverified(self):
        attempt = json.loads((SKILL / "assets/experiment.template.json").read_text())
        self.assertFalse(attempt["attempt_counted"])
        self.assertEqual(attempt["outcome"], "planned")
        self.assertEqual(attempt["verification_level"], "unverified")
        self.assertEqual(attempt["evidence_refs"], [])
        self.assertIsNone(attempt["usage"]["cost_aud"])

    def test_manual_scenarios_are_explicitly_unexecuted(self):
        data = json.loads((ROOT / "evals/cases.json").read_text())
        cases = data["cases"]
        self.assertGreaterEqual(len(cases), 16)
        self.assertEqual(len({case["id"] for case in cases}), len(cases))
        for case in cases:
            with self.subTest(case=case["id"]):
                self.assertEqual(case["execution_status"], "not_run")
                self.assertIn(case["expected_mode"], (None, "polish", "optimise"))
                self.assertTrue(case["must"])
                self.assertTrue(case["must_not"])
                self.assertTrue(case["prompt"].startswith("/obsess"))

    def test_wrapper_does_not_force_a_model_or_execute_shell_text(self):
        for adapter, placeholder in ADAPTERS.items():
            with self.subTest(adapter=adapter):
                wrapper = (SKILL / "integrations" / adapter).read_text(encoding="utf-8")
                self.assertIn("exact name", wrapper)
                self.assertIn("obsess", wrapper)
                self.assertNotIn("!`", wrapper)
                self.assertNotIn("!{", wrapper)
                self.assertNotRegex(wrapper, r"(?m)^(model|subtask):")
                if placeholder:
                    self.assertEqual(wrapper.count(placeholder), 1)
        opencode = (SKILL / "integrations/opencode/obsess.md").read_text(encoding="utf-8")
        self.assertNotRegex(opencode.split("---", 2)[1], r"(?m)^agent:")

    def test_manifest_versions_match_skill(self):
        plugin = json.loads((ROOT / ".claude-plugin/plugin.json").read_text(encoding="utf-8"))
        market = json.loads((ROOT / ".claude-plugin/marketplace.json").read_text(encoding="utf-8"))
        gemini = json.loads((ROOT / "gemini-extension.json").read_text(encoding="utf-8"))
        self.assertEqual(plugin["name"], "obsess")
        self.assertEqual(gemini["name"], "obsess")
        self.assertEqual([p["name"] for p in market["plugins"]], ["obsess"])
        self.assertEqual(market["plugins"][0]["source"], "./")
        for version in (plugin["version"], market["plugins"][0]["version"], gemini["version"]):
            self.assertEqual(version, VERSION)

    def test_skill_name_matches_folder(self):
        text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        self.assertRegex(text, r"(?m)^name: obsess$")
        compatibility = re.search(r"(?m)^compatibility: (.+)$", text).group(1)
        self.assertLessEqual(len(compatibility), 500)

    def test_portable_rule_stays_dormant_until_asked(self):
        rule = (SKILL / "integrations/rules/obsess.md").read_text(encoding="utf-8")
        self.assertIn("Never for ordinary coding requests", rule)
        self.assertLessEqual(len(rule.split()), 700)

    def test_synthetic_receipts_stay_labelled(self):
        for name in ("baseline", "candidate"):
            data = json.loads((SKILL / f"assets/{name}.example.json").read_text())
            self.assertIn("illustration-only", data["artifact_id"])
            self.assertIn("Synthetic", data["note"])
            self.assertEqual(data["evidence_refs"], ["ILLUSTRATION_ONLY_NO_REAL_MEASUREMENT"])

    def test_evaluation_report_does_not_claim_host_execution(self):
        text = (ROOT / "EVALUATION.md").read_text()
        self.assertIn("not a results report", text)
        self.assertIn("not_run", text)

    def test_new_docs_do_not_use_em_dashes(self):
        for name in ("README.md", "INSTALL.md", "CHANGELOG.md", "DESIGN.md", "EVALUATION.md", "LAUNCH.md"):
            self.assertNotIn("\u2014", (ROOT / name).read_text(encoding="utf-8"), name)
        for name in ("SKILL.md", "refs/polish.md", "refs/protocol.md", "refs/recipes.md", "refs/recovery.md",
                     "refs/host.md", "integrations/rules/obsess.md"):
            self.assertNotIn("\u2014", (SKILL / name).read_text(encoding="utf-8"), name)


if __name__ == "__main__":
    unittest.main()
