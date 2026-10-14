#!/usr/bin/env python3
"""Turn a live-eval results.json into a Markdown report. Usage: python3 summarize.py results.json > RESULTS.md"""
import json
import statistics
import sys
from collections import defaultdict

data = json.load(open(sys.argv[1]))
records = data["records"]
tasks = [r for r in records if not r.get("gate")]
gates = [r for r in records if r.get("gate")]
CONDS = ["baseline", "review", "obsess"]
LABEL = {"baseline": "Plain request", "review": "Plain + \"check your work\"", "obsess": "/obsess"}


def mean(xs):
    xs = [x for x in xs if x is not None]
    return statistics.mean(xs) if xs else None


def fmt_money(x):
    return "n/a" if x is None else f"${x:.2f}"


by = defaultdict(list)
for r in tasks:
    by[(r["task"], r["condition"])].append(r)

print(f"Model: `{data['model']}`. Runs per cell: {max((len(v) for v in by.values()), default=0)}.\n")
print("## Overall\n")
print("| Condition | Tasks fully passed | Scope violations | Mean cost | Mean time |")
print("|---|---|---|---|---|")
for c in CONDS:
    rs = [r for r in tasks if r["condition"] == c]
    if not rs:
        continue
    passed = sum(r["grade"]["pass"] for r in rs)
    scope_bad = sum(not r["grade"]["scope_ok"] for r in rs)
    print(f"| {LABEL[c]} | **{passed}/{len(rs)}** | {scope_bad} | {fmt_money(mean([r['agent']['cost_usd'] for r in rs]))} | "
          f"{mean([r['agent']['seconds'] for r in rs]) / 60:.1f} min |")

print("\n## Toggle: \"make the transition super smooth\"\n")
print("Measured in Chromium by sampling the thumb every animation frame. A snap is one frame jumping more than 45% of the travel.\n")
print("| Run | Pass | Turn-off snap (px) | Reversal snap (px) | Keyboard OK | Reduced motion | transform | Files changed |")
print("|---|---|---|---|---|---|---|---|")
for c in CONDS:
    for r in by[("toggle", c)]:
        b = r["grade"]["behaviour"]
        files = ", ".join(r["grade"]["scope"]["modified"] + [f + " (new)" for f in r["grade"]["scope"]["added"]]) or "none"
        print(f"| {LABEL[c]} #{r['rep']} | {'✅' if r['grade']['pass'] else '❌'} | {b.get('off_max_jump_px', 'n/a'):.0f} | "
              f"{b.get('reverse_max_jump_px', 0):.0f} | {'✅' if b.get('keyboard_space_toggles') else '❌'} | "
              f"{'✅' if b.get('reduced_motion_settles_within_120ms') else '❌'} | {'✅' if b.get('uses_transform') else '❌'} | {files} |")
print("\nOriginal fixture: turn-off snap 20 px, reversal snap 12 px, no reduced-motion handling.\n")

print("## Button: responsive clipping\n")
print("Checked at 320, 390 and 1280 px: label fits, button stays inside the card, text not shrunk, no horizontal scroll. "
      "The shared `.btn` class is also used by an unrelated Save button, which must not change.\n")
print("| Run | Pass | 320 | 390 | 1280 | Save button untouched | Files changed |")
print("|---|---|---|---|---|---|---|")
for c in CONDS:
    for r in by[("button", c)]:
        b = r["grade"]["behaviour"]
        vp = b.get("viewports", {})
        cell = lambda w: "✅" if vp.get(str(w), vp.get(w, {})).get("pass") else "❌"
        files = ", ".join(r["grade"]["scope"]["modified"] + [f + " (new)" for f in r["grade"]["scope"]["added"]]) or "none"
        print(f"| {LABEL[c]} #{r['rep']} | {'✅' if r['grade']['pass'] else '❌'} | {cell(320)} | {cell(390)} | {cell(1280)} | "
              f"{'✅' if b.get('save_button_unchanged') else '❌'} | {files} |")

print("\n## Importer: \"reduce runtime without changing output\"\n")
print("Output compared against the original on two hidden 8,000-row datasets with messy emails, dates and tags. Pass needs identical output, passing tests and at least 2× speed-up.\n")
print("| Run | Pass | Identical output | Tests | Speed-up | Files changed |")
print("|---|---|---|---|---|---|")
for c in CONDS:
    for r in by[("importer", c)]:
        b = r["grade"]["behaviour"]
        same = all(v for k, v in b.items() if k.startswith("identical")) if any(k.startswith("identical") for k in b) else False
        files = ", ".join(r["grade"]["scope"]["modified"] + [f + " (new)" for f in r["grade"]["scope"]["added"]]) or "none"
        print(f"| {LABEL[c]} #{r['rep']} | {'✅' if r['grade']['pass'] else '❌'} | {'✅' if same else '❌'} | "
              f"{'✅' if b.get('tests_pass') else '❌'} | {b.get('speedup', 'n/a')}× | {files} |")

print("\n## Guard rails (/obsess only)\n")
print("| Scenario | Pass | Checks |")
print("|---|---|---|")
for r in gates:
    checks = ", ".join(f"{k} {'✅' if v else '❌'}" for k, v in r["grade"]["checks"].items())
    print(f"| `{r['gate']}` | {'✅' if r['grade']['pass'] else '❌'} | {checks} |")
