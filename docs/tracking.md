# Tracking adoption

A scheduled GitHub Action (`.github/workflows/adoption.yml`) runs `tools/adoption.py` once a day and commits the results to the `metrics` branch: `adoption.csv` (one row per day) and `traffic.json` (GitHub's daily traffic, archived because GitHub only keeps 14 days).

| Signal | Source | Needs |
|---|---|---|
| Stars, forks, watchers, open issues | GitHub repo API | Nothing |
| `npx skills add` installs | skills.sh API (`/api/v1/skills/UmarSiddiqui/obsess/obsess`), deduplicated, anonymous | Nothing |
| Page views, unique visitors, clones, unique cloners, top referrers | GitHub traffic API | A `TRAFFIC_TOKEN` repository secret |

## One-time setup

1. Create a fine-grained personal access token for `UmarSiddiqui/obsess` only, with **Administration: Read-only** (GitHub's traffic API requires it; the built-in Actions token can't read traffic).
2. Add it under Settings → Secrets and variables → Actions as `TRAFFIC_TOKEN`.
3. Run the workflow once from the Actions tab ("Adoption snapshot" → Run workflow) to create the `metrics` branch.

Without the secret the workflow still records stars and installs.

## What can't be measured

- **Claude Code plugin installs** (`/plugin install`): no public count. Clones from the plugin marketplace show up only as GitHub clones.
- **Actual `/obsess` runs**: the skill sends nothing anywhere, on purpose. Adding telemetry to a prompt file would be a privacy problem and would get it rejected from curated lists. Usage signals are indirect: installs, stars, issues, Discussions posts and `#obsess` mentions.
- **Installs with telemetry disabled**, manual copies and the offline installer.

The live view of installs is also on [skills.sh/UmarSiddiqui/obsess](https://skills.sh/UmarSiddiqui/obsess) once the first install is recorded.
