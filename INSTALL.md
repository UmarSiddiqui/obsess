# Install /obsess

One skill folder, [`skills/obsess/`](skills/obsess/), in the open [Agent Skills](https://agentskills.io/specification) format. Everything below loads that same folder into a different agent.

## The fastest way

Paste this into your coding agent:

```text
Install the obsess skill from https://github.com/UmarSiddiqui/obsess. Follow its INSTALL.md for this agent.
```

Or run the universal installer yourself (needs Node.js):

```bash
npx skills add UmarSiddiqui/obsess
```

It detects the agents on your machine and asks which to install for. Add `-g` for every project, `-a <agent>` to pick one, `-y` to skip prompts. One copy goes to `.agents/skills/obsess/`; agents with their own folder get a link to it. It uses the [skills CLI](https://skills.sh), which supports 40+ agents.

Then start a new session and type `/obsess over <the thing>`.

## Per agent

| Agent | Install | Invoke |
|---|---|---|
| **Claude Code** | `/plugin marketplace add UmarSiddiqui/obsess` then `/plugin install obsess@obsess`, or `npx skills add UmarSiddiqui/obsess -a claude-code` | `/obsess` |
| **Codex CLI / IDE** | `npx skills add UmarSiddiqui/obsess -a codex -g` | `$obsess` (or pick it from `/skills`) |
| **Gemini CLI** | `gemini extensions install https://github.com/UmarSiddiqui/obsess` or `npx skills add UmarSiddiqui/obsess -a gemini-cli` | Ask to use the obsess skill, or add the [`/obsess` command](#gemini-cli) |
| **OpenCode** | `npx skills add UmarSiddiqui/obsess -a opencode` | `/obsess` |
| **Cursor** | `npx skills add UmarSiddiqui/obsess -a cursor` | Add the [`/obsess` command](#cursor) |
| **GitHub Copilot (VS Code)** | `npx skills add UmarSiddiqui/obsess -a github-copilot` | Add the [`/obsess` prompt](#github-copilot) |
| **Windsurf** | `npx skills add UmarSiddiqui/obsess -a windsurf` | Add the [`/obsess` workflow](#windsurf) |
| **Cline** | `npx skills add UmarSiddiqui/obsess -a cline` | Add the [`/obsess.md` workflow](#cline) |
| **Amp, Goose, Kiro, Roo Code** | `npx skills add UmarSiddiqui/obsess -a amp` (or `goose`, `kiro-cli`, `roo`) | Your agent's skill invocation |
| **Kilo, Junie, Droid, Qwen Code, OpenHands, Trae, Warp and more** | `npx skills add UmarSiddiqui/obsess` and pick your agent | Your agent's skill invocation |
| **Anything that reads `AGENTS.md`** | Append the [portable rule](#any-other-agent) | Start a message with `/obsess` |

No Node? Use the [Python installer](#offline-python-installer) for Claude Code and OpenCode, or copy `skills/obsess/` into your agent's skills folder by hand.

Install one copy per agent. Several hosts also read `.claude/skills/` or `.agents/skills/`, so a second copy of the same skill can load twice.

## Slash commands for agents without native skill commands

These small adapters give you a real `/obsess` command. Each one loads the installed skill by name, or reads it from `.agents/skills/obsess/` or `.claude/skills/obsess/` (project or home). Install the skill first. Run the commands from your project root.

### Cursor

```bash
curl -fsSL --create-dirs -o .cursor/commands/obsess.md \
  https://raw.githubusercontent.com/UmarSiddiqui/obsess/main/skills/obsess/integrations/cursor/obsess.md
```

### GitHub Copilot

```bash
curl -fsSL --create-dirs -o .github/prompts/obsess.prompt.md \
  https://raw.githubusercontent.com/UmarSiddiqui/obsess/main/skills/obsess/integrations/copilot/obsess.prompt.md
```

### Windsurf

```bash
curl -fsSL --create-dirs -o .windsurf/workflows/obsess.md \
  https://raw.githubusercontent.com/UmarSiddiqui/obsess/main/skills/obsess/integrations/windsurf/obsess.md
```

### Cline

```bash
curl -fsSL --create-dirs -o .clinerules/workflows/obsess.md \
  https://raw.githubusercontent.com/UmarSiddiqui/obsess/main/skills/obsess/integrations/cline/obsess.md
```

### Gemini CLI

```bash
curl -fsSL --create-dirs -o .gemini/commands/obsess.toml \
  https://raw.githubusercontent.com/UmarSiddiqui/obsess/main/skills/obsess/integrations/gemini/obsess.toml
```

Use `~/.gemini/commands/` instead for every project.

### Codex custom prompt (optional)

Codex already runs the skill as `$obsess`. If you prefer a slash command:

```bash
curl -fsSL --create-dirs -o ~/.codex/prompts/obsess.md \
  https://raw.githubusercontent.com/UmarSiddiqui/obsess/main/skills/obsess/integrations/codex/obsess.md
```

Then type `/prompts:obsess`.

### OpenCode legacy command

Current OpenCode registers `/obsess` natively from the skill metadata. For an older build, see the [OpenCode wrapper](skills/obsess/integrations/opencode/obsess.md) and the `--legacy-command` flag below.

## Any other agent

[`integrations/rules/obsess.md`](skills/obsess/integrations/rules/obsess.md) is a compact, dormant-until-asked version of the skill for agents that read a rules file. It only activates when a message starts with `/obsess`.

```bash
curl -fsSL https://raw.githubusercontent.com/UmarSiddiqui/obsess/main/skills/obsess/integrations/rules/obsess.md >> AGENTS.md
```

Same file, other homes: `.cursor/rules/obsess.mdc` (add `alwaysApply: true` frontmatter), `.windsurf/rules/obsess.md`, `.clinerules/obsess.md`, `.github/copilot-instructions.md`, or Aider's `CONVENTIONS.md`. Run it once; a second run appends a second copy.

## Offline Python installer

No network, no Node. Python 3.10+. From a clone of this repository:

```bash
python3 skills/obsess/scripts/install.py --host claude --project /path/to/your/project
python3 skills/obsess/scripts/install.py --host opencode --global
```

| Flag | What it does |
|---|---|
| `--project PATH` / `--global` | Install into one project or for your user |
| `--dry-run` | Show destinations, write nothing |
| `--upgrade` | Back up the existing copy to `obsess-backups/`, then replace it |
| `--legacy-command` | OpenCode only: install a command wrapper instead of native slash registration |

It never downloads anything, changes model access or edits permissions. It refuses symlinked paths and duplicate same-name installs at the same level. Details: [host notes](skills/obsess/refs/host.md).

## Update and uninstall

| Installed with | Update | Remove |
|---|---|---|
| `npx skills` | Re-run `npx skills add UmarSiddiqui/obsess`, or `npx skills update` | `npx skills remove obsess` |
| Claude Code plugin | `/plugin marketplace update obsess` | `/plugin uninstall obsess@obsess` |
| Gemini extension | `gemini extensions update obsess` | `gemini extensions uninstall obsess` |
| Python installer | Re-run with `--upgrade` | Delete the `skills/obsess/` folder it reported |
| Adapters and rules | Re-run the `curl` command | Delete the file or the appended block |

## Verify

Start a fresh session and send:

```text
/obsess find src
```

`find` is read-only. It should recommend one target and say how it would check it, without editing anything. A normal request without `/obsess` shouldn't activate the skill.

## Honest status

`npx skills add` was run against this repository for Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode, Windsurf, Cline, Amp, Goose, Kiro CLI and Roo Code: it found the skill and wrote each agent's layout. The other routes follow each host's published documentation. Package tests are recorded in [VALIDATION.txt](VALIDATION.txt). Live, interactive sessions in every listed agent haven't been completed yet. If a path has moved in your agent's latest version, please [open an issue](https://github.com/UmarSiddiqui/obsess/issues) with the version number.
