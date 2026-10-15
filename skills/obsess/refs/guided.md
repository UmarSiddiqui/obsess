# Guided session

Use this when the person is present. The person judges taste; you make variants, show them fairly and narrow in. It works like an eye test: "1 or 2?"

## 1. Pin the target and read past taste

Resolve the one target as usual. If `.obsess/taste.md` exists in the project, read it first and start from what it says, for example "prefers 180–220ms ease-out, dislikes bounce". Never treat taste notes as permission to widen scope.

Capture the untouched baseline: a screenshot for layout, a short recording or frame strip for motion, a measurement for speed. That is variant **0**.

## 2. Ask at most one question

Only ask if the request doesn't already say what "better" means. Offer choices instead of an open question:

> Smoother how? **a)** softer start and stop **b)** faster and snappier **c)** a little playful overshoot **d)** you pick for me

If the person says "you pick", choose the direction most consistent with the product and the taste notes.

## 3. Show 2–3 distinct variants

Each round, make two or three small variants that differ along **one** dimension at a time (duration, easing, spacing step, colour weight). Each must be a real, working change in an isolated copy, not a mockup. Keep the current favourite in the line-up so a round can end with "keep what we had".

Present them side by side under identical conditions: same content, viewport and timing. Prefer one image or page with labelled panels. [compare.template.html](../assets/compare.template.html) is a ready-made side-by-side page for screenshots, recordings or live copies. Then ask one short question:

> **1**, **2** or **3**? Or "none", "between 1 and 2", or a few words on what's off.

Describe each variant in one plain line ("2: 220ms ease-out, no overshoot"). Don't push a favourite. Equal treatment matters more than persuasion.

## 4. Narrow in

Keep the pick as the new favourite. The next round brackets it more tightly: if 2 won at 220ms, try 180 and 260. If the person says "between 1 and 2", make the midpoint. If they name a problem, make variants that fix it in different ways.

Run the normal checks on every variant before showing it: correctness, accessibility, reduced motion, other consumers of shared code. Never show a variant that breaks something, and say so if a direction was dropped for that reason.

## 5. Stop on their word

Stop when the person says it's done, picks the same variant twice in a row, or the attempt budget runs out. Apply the final pick to the real files, recheck it and report as usual. Include the pick history in the report, for example `0 → 2 → 2b → done`.

## 6. Remember taste

Append two or three short lines to `.obsess/taste.md` with what was chosen and what was rejected, in plain words with real values:

```text
2026-10-15 toggle motion: chose 200ms cubic-bezier(.2,.8,.2,1); rejected overshoot and anything over 300ms.
```

Tell the person the file exists and that they can edit or delete it. Don't commit it unless they ask. Don't record anything personal.

## Without the person

If the session is unattended (the request says so, `--auto` is set, or no one can answer), skip the questions. Run the normal autonomous loop and pick by the checks alone, never by imagined taste. Leave the variants and the compare page in the run folder so the person can pick later.
