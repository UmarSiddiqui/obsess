# Changelog

## Unreleased

### Added

- First live eval results: 50 headless Claude Code runs on Sonnet 5.5 and Haiku 5.5, summarised in the README under Tested results, with per-run tables and diffs in `evals/live/results/`.
- Daily adoption tracker (`tools/adoption.py`, `.github/workflows/adoption.yml`): stars, forks, skills.sh installs and GitHub traffic, archived on a `metrics` branch. See `docs/tracking.md`.
- skills.sh install badge in the README.

### Fixed

- The live eval grader no longer counts Python bytecode caches as out-of-scope edits, and trials no longer inherit caches from the fixtures.

## 0.3.0 - 15 October 2026

### Changed

The repository now uses the standard `skills/obsess/` layout, so one folder installs into any Agent Skills host. The skill, references, templates, scripts and adapters moved there; tests, evaluations and project docs stay at the root. The Python installer now copies only the skill folder.

The README is rewritten for discovery: what the skill does in one line, install in one command, an illustrative before/after and an FAQ. Positioning now names every supported agent.

### Added

- `npx skills add UmarSiddiqui/obsess` support for 40+ agents through the skills CLI.
- Claude Code plugin marketplace manifests (`.claude-plugin/`).
- Gemini CLI extension manifest (`gemini-extension.json`).
- `/obsess` adapters for Cursor, GitHub Copilot, Windsurf, Cline, Gemini CLI and Codex, alongside the existing OpenCode wrapper.
- A portable, dormant-until-asked rule file for `AGENTS.md` and other rules files.
- INSTALL.md with per-agent install, update and uninstall steps.
- MIT licence, README banner and a social preview image.
- Tests for adapters, manifest versions and skill-local links.

### Live evaluation

Added `evals/live/`: headless Claude Code runs on buggy fixtures with machine graders. 44 runs on Sonnet 5.5 and Haiku 5.5. /obsess fixed 12/12 with no scope violations and held 7/7 guard rails. A plain request also fixed 12/12, so no quality gain is claimed. See `evals/live/RESULTS.md`.

### Fixed

Found by the live eval: an invalid or unlimited `--iterations` value was rejected but the run continued on the default budget. Invalid, unknown or conflicting flags now stop the run before any edit.

### Not claimed

Live trials in agents other than Claude Code, and harder tasks that could show a quality gain, haven't been run. Layouts follow each host's published documentation.


## 0.2.0 - 15 October 2026

### Changed

Positioning now centres on one focused improvement rather than a general optimisation system. Natural-language UI requests are first-class, including a smoother toggle and a responsive button.

The agent chooses between polish and measured optimisation. Polish defaults to 4 attempts within 10 active-session minutes; optimisation retains a 12-attempt / 30-minute allowance. `--lite` caps either workflow at 2 attempts / 5 minutes without separate reviewers. Explicit non-lite limits remain available.

An attempt is now counted before editing, so crashes and invalid candidates consume budget. New state fields separate the accepted checkpoint from a provisional working-tree patch. A small task uses a short run note instead of a compulsory full JSON contract.

A first implementation always gets reviewed, but further edits need evidence. Polish stops after 2 consecutive unsupported attempts. Missing rendered feedback allows at most one provisional UI proposal, not repeated blind polishing.

### Added

- UI polish guidance and focused toggle/responsive-button recipes.
- Native OpenCode slash metadata with an optional legacy command wrapper.
- A local installer with dry-run support and backed-up upgrades.
- Compact reporting templates and explicit v0.1 recovery guidance.
- Package tests and a host-evaluation scenario set, plus draft launch copy.

### Preserved

The scalar receipt helper and its original tests remain unchanged. Frozen constraints still take precedence over improvements. Existing user edits stay protected. Discovery remains read-only and saved state doesn't imply background execution.

The original research memo is retained as background with a provenance note. It isn't new evidence for v0.2 effectiveness.

### Not claimed

No interactive Claude Code or OpenCode trial is included. No free-model benchmark, token-saving result or viral-growth claim has been established. No licence was assigned and nothing was published.

## 0.1.0

Original supplied prototype. Evidence-led scalar optimisation with a receipt helper and supporting research notes.
