# Momo Tycoon swarm: five Haiku 5.5 agents with /obsess

The goal was a production-quality build of the overhead game ([previous run](../2026-10-15-momo-overhead/README.md)). We wanted free models through OpenCode, but this environment's network policy blocks opencode.ai, models.dev and openrouter.ai, so the swarm ran on `claude-haiku-5-5` in Claude Code.

## How it ran

Four specialists worked in parallel, each in its own git copy with a scoped `/obsess --auto` brief and its own files:

| Agent | Files | What it did | Cost (CLI estimate) |
|---|---|---|---|
| art | `js/world.js` | Warm palette and brighter exposure, a saffron queue mat, dhaka topi hats, a dog and pigeons, and a red lacquered counter with gold trim | ≈ $0.25 |
| ui | `index.html`, `js/ui.js` | First-run coach tour docked off the floor, a money pulse, "Need Rs X" on disabled buttons, label clamping, 40px tap targets and visible focus | $0.39 |
| game | `js/sim.js`, `js/data.js`, `tests/` | Rebalanced economy, three customer kinds (locals; tourists who tip 30% more; students with less patience) and the Dashain and Tihar festivals, with node tests | $0.40 |
| sound | `js/sfx.js` | Gesture-gated WebAudio: steam, achievement and expansion sounds, plus an ambient drone and madal loop | ≈ $0.03 |

Their branches were merged, then an **integration** agent ($0.67) wired the pieces together:
- an in-page new-game confirm in place of `window.confirm`;
- occluders so badges stay clear of the awning;
- a festival chip;
- distinct looks for tourists and students.

It also fixed one regression: on phones, the tour card covered the floor.

Total: about $1.73 and roughly 30 minutes of wall-clock time (17 for the slowest specialist, 14 for integration). Briefs are in [briefs/](briefs/), scrubbed transcripts in [transcripts/](transcripts/) (images and streaming deltas removed), and the full diff against the overhead build is [changes.diff](changes.diff).

## Result

Graded with [`grade_topview.js`](../../grade_topview.js) at `MIN_PITCH=80`: **5/5**. The camera is orthographic at 90° in all five views. The floor is fully visible and uncovered, the serve loop works, saves survive a reload and there are no errors ([grade.json](grade.json), [screens/](screens/)). The node tests (features, progression, saves) all pass. A read of the whole diff found nothing unsafe.

Reviewer notes from the screenshots (Claude, not measured):
- Clearly brighter and warmer than the overhead build.
- The sign is no longer covered and the tour stays off the play area.
- Still weak: the restaurant is small on phones, the stupa reads oddly from above, and the street has few people.
