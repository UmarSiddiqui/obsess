# /obsess

## One thing. Unreasonable attention to detail.

Your coding agent's perfectionist mode. Point it at one thing that isn't quite right. It checks the first attempt, makes focused improvements when there's a reason and keeps the best-supported version.

**v0.2.0 · prototype · 15 October 2026**

```text
/obsess over this toggle and make the transition super smooth
```

```text
/obsess over the responsive behaviour of this button
```

Not a whole redesign. Not an endless loop. Just more attention to the thing you picked.

## What changes with /obsess?

| Instead of… | The skill asks the agent to… |
|---|---|
| Returning the first plausible edit | Inspect the result before calling it done |
| Spreading a small request across the codebase | Stay inside one bounded target |
| Treating the last attempt as the best | Retain supported improvements and reject regressions |
| Saying “looks smoother” without seeing it | Explain what was inspected and what remains unverified |

This is an instruction-based workflow, not a guarantee of agent behaviour. It doesn't include an autonomous runner or a model subscription.

## Install

Extract the ZIP. Run one of these from the directory containing the extracted `obsess` folder. Python 3.10+ is required only for the installer and receipt helper.

**Claude Code, one project:**

```bash
python3 obsess/scripts/install.py --host claude --project /path/to/your/project
```

**OpenCode, one project:**

```bash
python3 obsess/scripts/install.py --host opencode --project /path/to/your/project
```

Use `--global` instead of `--project …` for a user-wide installation. Add `--dry-run` to inspect destinations without writing. Add `--upgrade` to back up an existing installation before replacing it. The installer never downloads anything or modifies model permissions.

Claude Code uses `.claude/skills/obsess/`. OpenCode uses `.opencode/skills/obsess/`; this package enables its documented native slash-command metadata. Both are explicit-invocation configurations. These paths and controls follow the official [Claude Code skills documentation](https://code.claude.com/docs/en/skills) and [OpenCode skills documentation](https://opencode.ai/docs/skills/).

OpenCode can also discover a Claude-installed copy. Don't install duplicate `obsess` skills into both project locations. The installer checks common duplicate locations at the selected installation level; review ancestor-project or custom paths yourself.

For an OpenCode build without native skill slash commands, add `--legacy-command`. It installs the optional [command wrapper](integrations/opencode/obsess.md), using the documented [custom-command format](https://opencode.ai/docs/commands/), and disables native slash registration in that installed copy to avoid a duplicate command. It doesn't select a different model.

No Python? Copy the entire `obsess` folder to the appropriate skills directory, preserving an existing installation first. See [host notes](refs/host.md) for global paths and fallback installation. Reload the host's skills or start a new session, then invoke `/obsess`.

**Installation layouts are documentation-backed. Interactive host execution hasn't been tested in this release.**

## Use it naturally

```text
/obsess over this button's responsiveness --lite
```

```text
/obsess over this card until the spacing feels right
```

```text
/obsess src/importer --focus "reduce runtime without changing output"
```

```text
/obsess find src/components
```

“This” needs a real selected component or enough project context to identify it. Otherwise the agent asks which target you mean. `find` recommends one target without editing it.

### Two workflows, chosen automatically

| Workflow | Typical request | Default ceiling |
|---|---|---|
| Polish | Improve a transition or fix a button's responsiveness | 4 attempts / 10 active-session minutes |
| Optimise | Reduce measured runtime with unchanged output | 12 attempts / 30 active-session minutes |

Use `--mode polish` or `--mode optimise` to choose explicitly. `--iterations N` and `--minutes N` replace normal defaults. `--scope "path1,path2"` narrows permitted files. `--focus "objective"` clarifies the desired improvement.

These flags are interpreted by the host agent. They aren't a standalone executable command. The time allowances and attempt limits guide behaviour; a separate controller would be needed to enforce them independently.

### A lighter path for a smaller budget

`--lite` keeps the same checks while limiting either workflow to **2 attempts and 5 active-session minutes**. It avoids subagents and uses compact notes. Lower explicit limits are allowed; larger limits conflict with lite mode.

Use the model already selected in your host, including a no-cost model where your provider offers one. This package doesn't supply free inference or bypass provider limits. Smaller-model gains and token savings remain hypotheses to test, not release claims.

## What counts as better?

A responsive-layout fix should be checked in its actual container. An animation request needs interaction feedback, not just a prettier endpoint screenshot. Performance work needs comparable measurements.

The report separates concrete checks from subjective preference. Without browser access, an agent can propose a source-level UI fix, but it must label the rendering as unverified and stop after at most one provisional attempt. It can't invent smoothness scores.

There's no minimum number of edits. If the first change meets the goal after review, the run can finish. If the original is already the best-supported result, it can return no change.

## Included

| Area | Contents |
|---|---|
| Core skill | Compact explicit-invocation workflow and bounded iteration |
| UI guidance | Polish protocol with toggle and responsive-button recipes |
| Local tooling | Safe installer and the existing scalar receipt helper |
| Evidence | Run/report templates, recovery guidance and example receipts |
| Release checks | Unit tests, packaging checks and a host-evaluation scenario set |
| Product notes | Changelog, launch copy and the retained v0.1 research memo |

See [CHANGELOG.md](CHANGELOG.md) for the migration details and [DESIGN.md](DESIGN.md) for the decisions behind this version.

## Test the package

From inside the extracted `obsess` directory:

```bash
python3 -m unittest discover -s tests -v
```

To demonstrate the unchanged receipt helper with deliberately synthetic values:

```bash
python3 scripts/gate.py \
  --contract assets/contract.example.json \
  --baseline assets/baseline.example.json \
  --candidate assets/candidate.example.json
```

Its `accept` result is a decision about supplied demonstration numbers, not proof of a real improvement. The helper doesn't execute benchmarks or authenticate evidence. It isn't used to score visual taste.

[VALIDATION.txt](VALIDATION.txt) records the actual checks for this build. [EVALUATION.md](EVALUATION.md) explains how to test agent effectiveness; those host/model trials haven't been run. Launch copy in [LAUNCH.md](LAUNCH.md) is draft copy, not a published announcement.

## Boundaries

The skill doesn't authorise deployments or expand tool permissions. It protects existing edits and records unknown usage honestly. Checkpoints support a later resume; they don't keep a closed session running.

The supplied v0.1 archive had no licence file. This update doesn't assign a licence or change ownership. Choose an appropriate licence before a public release.
