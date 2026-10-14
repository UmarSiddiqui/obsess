# Does /obsess actually help?

This is a host/model evaluation plan, not a results report. The scripted tests in `tests/` validate local tooling and package consistency. They don't demonstrate better agent output or prove compliance with the skill's instructions.

## What to test

Start with two representative product tasks: a toggle with an observable motion problem and a button that clips in a real responsive container. Add a scalar optimisation task to check that the original workflow still works. Run them on an actual repository with a reproducible starting state.

The scenarios in [evals/cases.json](evals/cases.json) cover invocation and budget handling, plus failure cases. They include missing browser feedback and pre-existing user edits. Every case is marked `not_run` in this release. A package test that validates their schema isn't a successful agent trial.

## Integration smoke checks

For each advertised host, install in a disposable project and start a session. Confirm that `/obsess` loads the intended version and that a normal unrelated request doesn't activate it. Use native OpenCode metadata first; test the fallback wrapper separately, with only one slash registration active.

Priority order for live checks: Claude Code (plugin and `npx skills`), Codex (`$obsess`), Cursor (skill plus `/obsess` command), Gemini CLI (extension plus command), GitHub Copilot in VS Code (prompt file), OpenCode, Windsurf and Cline. For each, record the host version, the install route and whether the adapter resolved the installed skill. Test the portable rule in one agent that only reads `AGENTS.md` and confirm it stays dormant for ordinary requests.

Exercise a natural-language request and inspect whether supporting files are loaded only as needed. Confirm that the command uses the selected model. Record the host version and actual tool availability. Repeat the installer upgrade test with a modified old installation and verify its backup.

## Fair comparisons

| Condition | Purpose |
|---|---|
| The same model, ordinary request | Basic baseline |
| The same model, an explicit review request without /obsess | Distinguish a useful skill from a generic second-pass prompt |
| The same model with /obsess | Evaluate the normal profile |
| The same model with /obsess --lite | Evaluate the smaller effort allowance |

Match resource allowances and repository access across conditions. An improvement with substantially more computation isn't automatically a better trade-off. Compare the skill against a baseline with an equivalent opportunity to inspect its work, not only a deliberately weak one-shot prompt.

Use multiple independent runs per condition. Keep starting code identical and randomise the order. Record actual usage when the provider exposes it, with unknown values left unknown. A stronger-model comparison can be useful, but it mustn't replace same-model controls.

## Evidence by task

For UI behaviour, keep screenshots under matching conditions and retain the actual interaction evidence. Have a reviewer inspect the output with the task's rubric. Blind A/B ordering where practical and permit ties. Distinguish a functional improvement from an aesthetic preference. Static images alone can't establish animation smoothness.

For scalar performance, use fixed workloads and unchanged correctness checks. Repeat noisy measurements and report distributions or uncertainty using a suitable analysis. Keep a final confirmation stage separate from candidate selection. The receipt helper isn't an evaluator or a significance test.

Track scope violations and regressions even when the output looks better. Record whether the agent retained the best result, stopped under the requested budget and accurately described what it had verified. These are separate outcomes, not one invented quality score.

## Smaller-model hypothesis

Test whether one capable lower-cost model benefits from focused feedback at the same budget. Document the provider and model used on the test date rather than assuming a permanent free tier. Don't infer that all small models benefit from one success.

For lite, measure actual token usage and elapsed time before claiming savings. Fewer permitted attempts doesn't necessarily mean fewer tokens across an entire session. Don't silently route a failed lite task to a more expensive model.

## Release threshold

Before advertising an integration as tested, complete its live smoke checks. Before claiming better results, collect matched-budget trials and report unsuccessful runs as well as successful ones. Before sharing a before/after demo, ensure its starting and final states are real and its conditions are disclosed.

The current package can be distributed as a prototype with its limitations. Nothing in the unit-test count establishes market demand or likely virality.
