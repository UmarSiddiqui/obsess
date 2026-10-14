"""Tests for file installation and recovery, not interactive host behaviour."""
from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1] / "skills" / "obsess"
SPEC = importlib.util.spec_from_file_location("obsess_install", ROOT / "scripts" / "install.py")
assert SPEC is not None and SPEC.loader is not None
INSTALL = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = INSTALL
SPEC.loader.exec_module(INSTALL)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.source = self.base / "source"
        self.source.mkdir()
        (self.source / "SKILL.md").write_text(
            '---\nname: obsess\ndescription: Test fixture\nmetadata:\n  opencode/slash: "true"\n---\n',
            encoding="utf-8",
        )
        wrapper = self.source / "integrations" / "opencode" / "obsess.md"
        wrapper.parent.mkdir(parents=True)
        wrapper.write_text('---\ndescription: Test fixture\n---\nLoad obsess. $ARGUMENTS\n', encoding="utf-8")
        (self.source / "README.md").write_text("new version", encoding="utf-8")
        self.project = self.base / "project"
        self.project.mkdir()
        self.home = self.base / "home"
        self.home.mkdir()

    def plan(self, host="opencode", **kwargs):
        return INSTALL.make_plan(self.source, host, project=self.project, **kwargs)

    def old_copy(self, host="opencode", command=False):
        root = self.project / (".opencode" if host == "opencode" else ".claude")
        skill = root / "skills" / "obsess"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("user-modified old skill", encoding="utf-8")
        if command:
            path = root / "commands" / "obsess.md"
            path.parent.mkdir(parents=True)
            path.write_text("user-modified old command", encoding="utf-8")
        return root, skill

    def test_native_opencode_layout(self):
        plan = self.plan()
        result = INSTALL.install(plan)
        self.assertEqual(result["status"], "installed")
        self.assertTrue((self.project / ".opencode/skills/obsess/SKILL.md").is_file())
        self.assertFalse((self.project / ".opencode/commands/obsess.md").exists())
        self.assertIn('opencode/slash: "true"', (plan.skill / "SKILL.md").read_text())

    def test_claude_layout(self):
        plan = self.plan("claude")
        INSTALL.install(plan)
        self.assertTrue((self.project / ".claude/skills/obsess/SKILL.md").is_file())

    def test_global_opencode_layout(self):
        plan = INSTALL.make_plan(self.source, "opencode", global_install=True, home=self.home)
        INSTALL.install(plan)
        self.assertTrue((self.home / ".config/opencode/skills/obsess/SKILL.md").is_file())

    def test_global_claude_layout(self):
        plan = INSTALL.make_plan(self.source, "claude", global_install=True, home=self.home)
        INSTALL.install(plan)
        self.assertTrue((self.home / ".claude/skills/obsess/SKILL.md").is_file())

    def test_dry_run_writes_nothing(self):
        result = INSTALL.install(self.plan(), dry_run=True)
        self.assertEqual(result["status"], "dry_run")
        self.assertFalse(result["files_written"])
        self.assertEqual(list(self.project.iterdir()), [])

    def test_existing_copy_refused_without_upgrade(self):
        _, skill = self.old_copy()
        with self.assertRaises(INSTALL.InstallError):
            self.plan()
        self.assertEqual((skill / "SKILL.md").read_text(), "user-modified old skill")

    def test_upgrade_preserves_backup_outside_discovery(self):
        root, _ = self.old_copy()
        plan = self.plan(upgrade=True)
        result = INSTALL.install(plan)
        backup = Path(result["backup"])
        self.assertTrue(backup.is_relative_to(root / "obsess-backups"))
        self.assertFalse(backup.is_relative_to(root / "skills"))
        self.assertEqual((backup / "skill/SKILL.md").read_text(), "user-modified old skill")
        self.assertEqual((plan.skill / "README.md").read_text(), "new version")

    def test_upgrade_dry_run_preserves_old_copy(self):
        root, skill = self.old_copy()
        INSTALL.install(self.plan(upgrade=True), dry_run=True)
        self.assertFalse((root / "obsess-backups").exists())
        self.assertEqual((skill / "SKILL.md").read_text(), "user-modified old skill")

    def test_legacy_wrapper_disables_duplicate_native_command(self):
        plan = self.plan(legacy_command=True)
        INSTALL.install(plan)
        self.assertIn('opencode/slash: "false"', (plan.skill / "SKILL.md").read_text())
        self.assertIn("$ARGUMENTS", plan.command.read_text())
        self.assertIn('opencode/slash: "true"', (self.source / "SKILL.md").read_text())

    def test_legacy_is_only_for_opencode(self):
        with self.assertRaises(INSTALL.InstallError):
            self.plan("claude", legacy_command=True)

    def test_legacy_upgrade_backs_up_both_files(self):
        self.old_copy(command=True)
        result = INSTALL.install(self.plan(legacy_command=True, upgrade=True))
        backup = Path(result["backup"])
        self.assertEqual((backup / "command.md").read_text(), "user-modified old command")
        self.assertEqual((backup / "skill/SKILL.md").read_text(), "user-modified old skill")

    def test_native_refuses_conflicting_command(self):
        root = self.project / ".opencode/commands"
        root.mkdir(parents=True)
        (root / "obsess.md").write_text("another command")
        with self.assertRaises(INSTALL.InstallError):
            self.plan()
        self.assertEqual((root / "obsess.md").read_text(), "another command")

    def test_duplicate_claude_compatible_copy_refused(self):
        self.old_copy("claude")
        with self.assertRaises(INSTALL.InstallError):
            self.plan("opencode")

    def test_duplicate_agents_copy_refused(self):
        (self.project / ".agents/skills/obsess").mkdir(parents=True)
        with self.assertRaises(INSTALL.InstallError):
            self.plan("opencode")

    def test_missing_project_rejected(self):
        with self.assertRaises(FileNotFoundError):
            INSTALL.make_plan(self.source, "opencode", project=self.base / "missing")

    def test_exactly_one_destination_required(self):
        with self.assertRaises(INSTALL.InstallError):
            INSTALL.make_plan(self.source, "opencode")
        with self.assertRaises(INSTALL.InstallError):
            INSTALL.make_plan(self.source, "opencode", project=self.project, global_install=True)

    def test_unknown_host_rejected(self):
        with self.assertRaises(INSTALL.InstallError):
            self.plan("unknown")

    def test_overlapping_source_and_destination_rejected(self):
        with self.assertRaises(INSTALL.InstallError):
            INSTALL.make_plan(self.source, "opencode", project=self.source)

    def test_symlinked_destination_parent_rejected(self):
        outside = self.base / "outside"
        outside.mkdir()
        try:
            (self.project / ".opencode").symlink_to(outside, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("Symlinks aren't available")
        with self.assertRaises(INSTALL.InstallError):
            self.plan()
        self.assertEqual(list(outside.iterdir()), [])

    def test_symlinked_source_entry_rejected(self):
        outside = self.base / "secret.txt"
        outside.write_text("must not copy")
        try:
            (self.source / "link.txt").symlink_to(outside)
        except (OSError, NotImplementedError):
            self.skipTest("Symlinks aren't available")
        with self.assertRaises(INSTALL.InstallError):
            self.plan()

    def test_file_as_config_directory_rejected(self):
        (self.project / ".opencode").write_text("not a directory")
        with self.assertRaises(INSTALL.InstallError):
            self.plan()

    def test_bytecode_and_git_files_excluded(self):
        cache = self.source / "__pycache__"
        cache.mkdir()
        (cache / "test.pyc").write_bytes(b"cache")
        (self.source / ".git").mkdir()
        (self.source / ".git/config").write_text("local only")
        plan = self.plan()
        INSTALL.install(plan)
        self.assertFalse((plan.skill / "__pycache__").exists())
        self.assertFalse((plan.skill / ".git").exists())

    def test_copy_failure_preserves_old_installation(self):
        _, old = self.old_copy()
        plan = self.plan(upgrade=True)
        with mock.patch.object(INSTALL.shutil, "copytree", side_effect=OSError("simulated copy failure")):
            with self.assertRaises(INSTALL.InstallError):
                INSTALL.install(plan)
        self.assertEqual((old / "SKILL.md").read_text(), "user-modified old skill")

    def test_promotion_failure_restores_previous_skill(self):
        _, old = self.old_copy()
        plan = self.plan(upgrade=True)
        with mock.patch.object(INSTALL, "_promote", side_effect=OSError("simulated promotion failure")):
            with self.assertRaises(INSTALL.InstallError):
                INSTALL.install(plan)
        self.assertEqual((old / "SKILL.md").read_text(), "user-modified old skill")

    def test_second_promotion_failure_rolls_back_both(self):
        root, old = self.old_copy(command=True)
        plan = self.plan(upgrade=True, legacy_command=True)
        promote = INSTALL._promote
        def fail_command(staged, destination):
            if destination == plan.command:
                raise OSError("simulated command promotion failure")
            promote(staged, destination)
        with mock.patch.object(INSTALL, "_promote", side_effect=fail_command):
            with self.assertRaises(INSTALL.InstallError):
                INSTALL.install(plan)
        self.assertEqual((old / "SKILL.md").read_text(), "user-modified old skill")
        self.assertEqual((root / "commands/obsess.md").read_text(), "user-modified old command")
        self.assertFalse((old / "README.md").exists())

    def test_missing_legacy_wrapper_rejected_before_writing(self):
        (self.source / "integrations/opencode/obsess.md").unlink()
        with self.assertRaises(INSTALL.InstallError):
            self.plan(legacy_command=True)
        self.assertEqual(list(self.project.iterdir()), [])

    def test_cli_installs_real_package_in_disposable_project(self):
        run = subprocess.run(
            [sys.executable, str(ROOT / "scripts/install.py"), "--host", "opencode", "--project", str(self.project)],
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        result = json.loads(run.stdout)
        self.assertEqual(result["status"], "installed")
        installed = Path(result["skill"])
        self.assertTrue((installed / "refs/polish.md").is_file())
        self.assertTrue((installed / "scripts/gate.py").is_file())
        self.assertFalse(result["network_access"])
        self.assertFalse(result["permissions_changed"])

    def test_cli_global_dry_run_respects_temporary_home(self):
        env = dict(os.environ, HOME=str(self.home), USERPROFILE=str(self.home))
        run = subprocess.run(
            [sys.executable, str(ROOT / "scripts/install.py"), "--host", "claude", "--global", "--dry-run"],
            capture_output=True, text=True, timeout=10, env=env,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(json.loads(run.stdout)["skill"], str(self.home / ".claude/skills/obsess"))
        self.assertEqual(list(self.home.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
