# Guided sessions: live test on Haiku 5.5

Each session is a real multi-turn Claude Code conversation (`claude -p`, then `--resume`) on the toggle fixture, with `/obsess` installed:

1. `/obsess over the Email notifications toggle in index.html and make the transition super smooth`
2. `2, but a touch softer`

Pass means: turn 1 shows variants built in isolated copies and asks which, turn 2 starts a new round around the pick, and the real file is untouched throughout. Checked from git status and the variant folders after each turn, and by reading every reply ([replies.json](replies.json)).

## Before the trigger fix

| Run | Turn 1 | Turn 2 |
|---|---|---|
| A | ✅ four variants (0 current, 250 / 160 / 350ms), asked "1, 2 or 3?" | ❌ applied a 200ms guess and wrote a taste note with an invented reason |
| B | ❌ called the snap an "objective defect", fixed it in the real file and skipped the session | ❌ applied a 350ms guess |

Fixes: a tweaked pick always starts a new round; taste notes record only what the person said; taste words always trigger a guided session, with any objective defect fixed in every variant; real files stay untouched until the final pick.

## After the fix

| Run | Turn 1 | Turn 2 |
|---|---|---|
| 1 | ✅ | ✅ new round around 220ms (keeps the pick, varies duration or curve) |
| 2 | ✅ | ❌ applied a softer guess directly |
| 3 | ✅ | ✅ |
| 4 | ✅ | ✅ |

Turn 1 correct in 4/4 (was 1/2). Full two-turn loop in 3/4. Every variant fixed the snap and changed one dimension per round. About $0.02–0.03 per turn.

Small samples. The remaining failure is the same shortcut as before (acting on "softer" without showing options), so it's the next thing to tighten.
