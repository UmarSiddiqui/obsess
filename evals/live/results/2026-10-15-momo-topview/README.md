# Momo Tycoon top-down view: Haiku 5.5, with and without /obsess

The task ([brief.txt](brief.txt)) asks the agent to turn the street-level momo game into a top-down tycoon view while keeping every feature working. All four runs started from the identical game (the plain v1 build) on `claude-haiku-5-5` in headless Claude Code with the same tooling. Two runs per condition; the /obsess runs had the skill installed and the brief prefixed with `/obsess`.

## Grader

[`grade_topview.js`](../../grade_topview.js) treats each game as a black box. Three.js is swapped for an instrumented copy that records the camera each frame, so the game exposes nothing on purpose.

| Check | How |
|---|---|
| Top-down everywhere | Camera pitch at least 45° below the horizon in five views: desktop, restaurant (desktop and phone, from a seeded save), phone portrait, phone landscape |
| Floor visible and uncovered | 143 points on the play floor projected to the screen; at least 95% inside the viewport and not under an opaque UI panel, in all five views |
| Serve loop works | Load a steamer, collect, serve a waiting customer; cash must go up |
| Save survives reload | Reload, Continue appears, cash restored |
| No errors | No page errors or console errors in any view |

The untouched starting game scores 3/5: camera pitch 3° (street level) and as little as 50% of the restaurant floor visible on a phone. Both failing checks are what the task asks for.

## Results

| Run | Checks | Pitch | Time | Cost (CLI) |
|---|---|---|---|---|
| plain-1 | **5/5** | 56° | 34 min | $1.19 |
| plain-2 | **5/5** | 56° | 31 min | $0.97 |
| obsess-1 | **5/5** | 57° | 61 min | $1.34 |
| obsess-2 | **5/5** | 58° | 30 min | $1.98 |

Every run passed every check, so the objective grader shows no difference between conditions. The visual differences, judged from the screenshots by one reviewer (Claude), not measured:

| Run | Notes |
|---|---|
| plain-1 | Clean and coherent. Parasol tables, flower pots, roof finials. Adds a "Panel" button to hide the side panel. |
| plain-2 | Houses behind the lane render as untextured white boxes. Big empty cobbled area. Weakest of the four. |
| obsess-1 | Most game-like. Zoom +/−/Fit controls, pinch and two-finger pan, a fenced courtyard for the queue, a one-line top bar, and a "Hide menu" handle on phones. One customer label is clipped at the left edge on a phone. |
| obsess-2 | A see-through awning and a glowing orange street that reads as noise. |

Each run folder has its `grade.json`, three screenshots, the full code diff and the transcript (images stripped).

## What it shows

With a black-box grader and identical starting code, Haiku 5.5 completed this change 4/4 times with or without the skill. /obsess didn't raise the pass rate; one /obsess run took twice as long. On polish, the best /obsess run added the most usability features, and the worst /obsess run had the most visual noise. Two runs per condition can't separate those effects from chance.
