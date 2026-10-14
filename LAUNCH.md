# Launch kit

A playbook for putting /obsess in front of people. Draft copy only: nothing here has been published, and no numbers are claimed that haven't been measured.

## What the breakout skills had in common

caveman, ponytail and i-have-adhd spread for the same reasons. Copy the pattern, not the claims.

| Pattern | caveman / ponytail / i-have-adhd | /obsess |
|---|---|---|
| A name that is a joke and a promise | "why many token when few do trick", "the laziest senior dev", "ADHD-friendly outputs" | `/obsess`: "One thing. Unreasonable attention to detail." |
| A recognisable character or feeling | The caveman, the ponytail guy | The agent that says "Done ✨" without looking. /obsess is the one that looks |
| A before/after you get in 3 seconds | Long reply vs short reply | "Done ✨" vs a report that rejected its own bad attempt |
| One-line install on every agent | `npx skills add`, plugin marketplace, AGENTS.md | Same three routes, plus `/obsess` adapters |
| Receipts | Benchmarks, outside citations | Not yet. Run the matched-budget study in [EVALUATION.md](EVALUATION.md) before claiming any number |
| Honesty as brand | "Every case where caveman loses" | "No fake numbers" is built into the skill itself |

## Repository settings (do these first)

These live in GitHub settings, not in files.

**About → Description** (shown in Google results and link previews):

```text
/obsess: perfectionist mode for AI coding agents. Point Claude Code, Codex, Cursor, Gemini CLI or Copilot at one detail; it checks its own work, keeps the best version and stops on purpose.
```

**About → Website:** `https://skills.sh/UmarSiddiqui/obsess` once the skill appears there, otherwise leave blank.

**About → Topics** (GitHub allows 20):

```text
claude-code, claude-skills, agent-skills, ai-agents, coding-agent, codex, cursor, gemini-cli, github-copilot, opencode, windsurf, cline, prompt-engineering, ui-polish, frontend, developer-tools, ai-coding, vibe-coding, llm, skills
```

**Settings → Social preview:** upload [`docs/assets/social-preview.png`](docs/assets/social-preview.png) (1280×640). This is the image every X, LinkedIn, Slack and Discord unfurl shows.

**Settings → Features:** turn on Discussions. The README sends people there to share before/after recordings.

**Releases:** tag `v0.3.0` with the CHANGELOG entry. Releases show on the repo page and in watchers' feeds.

## The demo that sells it

One 20 to 30 second screen recording, no voice-over needed:

1. A real toggle whose thumb snaps when you reverse it mid-animation. Show the snap.
2. Type `/obsess over this toggle and make the transition super smooth`.
3. Speed through the agent's work. Pause on the line where it **rejects** its own second attempt.
4. Show the final reversal: no snap. End on the report's "Checked / Not verified" lines.

The rejected attempt is the hook. Every developer has watched an agent make things worse and call it better. Use a real run; never stage a result. Export as MP4 for X and LinkedIn and a GIF under 10 MB for the README.

A second clip worth recording: a button that clips at 320px in a narrow grid cell, fixed without touching the rest of the page.

## Launch posts

### X / Bluesky / Threads

> My coding agent: "Done! The transition is now buttery smooth ✨"
>
> The transition: [snaps]
>
> So I made /obsess. Point it at one thing. It looks before touching, makes one change at a time, throws away anything worse and tells you what it actually checked.
>
> Works in Claude Code, Codex, Cursor, Gemini CLI, Copilot + 40 more.
>
> npx skills add UmarSiddiqui/obsess

Attach the demo video. Put the repo link in the first reply, not the post, so the post isn't down-ranked for an external link.

### Show HN

Title (under 80 characters, no hype words):

```text
Show HN: /obsess, a skill that makes coding agents check their work on one detail
```

First comment: what problem it solves in two sentences, how the loop works, what it deliberately won't do (no unlimited loops, no claims it didn't check), and that there is no benchmark yet and you'd welcome help running one. HN rewards that candour.

### Reddit

r/ClaudeAI, r/ClaudeCode, r/cursor, r/ChatGPTCoding, r/webdev, r/Frontend. Lead with the video and the problem, not the repo. Read each subreddit's self-promotion rules first and post on different days.

### LinkedIn

> "Done ✨" is the most expensive word an AI agent says.
>
> I built /obsess, an open-source skill that makes coding agents give one detail unreasonable attention, and report what they actually verified.

## Distribution checklist

- [ ] Repository description, topics, social preview, Discussions (above)
- [ ] `v0.3.0` release
- [ ] Confirm `npx skills add UmarSiddiqui/obsess` works from a clean machine, so it appears on [skills.sh](https://skills.sh)
- [ ] Live smoke test in Claude Code, Codex and Cursor at minimum (see [EVALUATION.md](EVALUATION.md))
- [ ] Record the toggle demo from a real run
- [ ] Pull requests to curated lists: awesome-claude-code, awesome-agent-skills, awesome-claude-skills and Cursor/Codex equivalents. Follow each list's contribution format
- [ ] X, Bluesky and LinkedIn posts with the video
- [ ] Show HN on a weekday morning US Eastern time; stay in the thread for the first few hours
- [ ] Reddit posts, spaced out
- [ ] Reply to every issue and discussion in the first week

## After launch

Run the matched-budget study and publish the results in the README, including the rows where /obsess doesn't help. A real number is the strongest second-wave post. Collect community before/after recordings from Discussions and feature the best ones (with permission).

## Words to avoid

The name is `/obsess`, not a clinical claim. Position it around focused attention and craft. Don't present OCD as a productivity feature, and don't use it in jokes, hashtags or imagery.
