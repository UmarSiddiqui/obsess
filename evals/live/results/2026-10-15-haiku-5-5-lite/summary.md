Model: `claude-haiku-5-5`. Runs per cell: 2.

## Overall

| Condition | Tasks fully passed | Scope violations | Mean cost | Mean time |
|---|---|---|---|---|
| Plain request | **6/6** | 0 | $0.01 | 0.8 min |
| /obsess | **6/6** | 0 | $0.02 | 1.0 min |

## Toggle: "make the transition super smooth"

Measured in Chromium by sampling the thumb every animation frame. A snap is one frame jumping more than 45% of the travel.

| Run | Pass | Turn-off snap (px) | Reversal snap (px) | Keyboard OK | Reduced motion | transform | Files changed |
|---|---|---|---|---|---|---|---|
| Plain request #1 | ✅ | 4 | 4 | ✅ | ✅ | ✅ | src/toggle.css |
| Plain request #2 | ✅ | 4 | 4 | ✅ | ✅ | ✅ | src/toggle.css |
| /obsess #1 | ✅ | 3 | 3 | ✅ | ✅ | ✅ | src/toggle.css |
| /obsess #2 | ✅ | 3 | 3 | ✅ | ✅ | ✅ | src/toggle.css |

Original fixture: turn-off snap 20 px, reversal snap 12 px, no reduced-motion handling.

## Button: responsive clipping

Checked at 320, 390 and 1280 px: label fits, button stays inside the card, text not shrunk, no horizontal scroll. The shared `.btn` class is also used by an unrelated Save button, which must not change.

| Run | Pass | 320 | 390 | 1280 | Save button untouched | Files changed |
|---|---|---|---|---|---|---|
| Plain request #1 | ✅ | ✅ | ✅ | ✅ | ✅ | src/toolbar.css |
| Plain request #2 | ✅ | ✅ | ✅ | ✅ | ✅ | src/toolbar.css |
| /obsess #1 | ✅ | ✅ | ✅ | ✅ | ✅ | src/toolbar.css |
| /obsess #2 | ✅ | ✅ | ✅ | ✅ | ✅ | src/toolbar.css |

## Importer: "reduce runtime without changing output"

Output compared against the original on two hidden 8,000-row datasets with messy emails, dates and tags. Pass needs identical output, passing tests and at least 2× speed-up.

| Run | Pass | Identical output | Tests | Speed-up | Files changed |
|---|---|---|---|---|---|
| Plain request #1 | ✅ | ✅ | ✅ | 21.4× | src/importer.py |
| Plain request #2 | ✅ | ✅ | ✅ | 7.8× | src/importer.py, __pycache__/bench.cpython-313.pyc (new), src/__pycache__/__init__.cpython-313.pyc (new), src/__pycache__/importer.cpython-313.pyc (new), tests/__pycache__/test_importer.cpython-313.pyc (new) |
| /obsess #1 | ✅ | ✅ | ✅ | 12.5× | src/importer.py |
| /obsess #2 | ✅ | ✅ | ✅ | 8.4× | src/importer.py |

## Did the agent check its own work?

From the transcripts: a run counts as measured if it drove Playwright/Chromium, took screenshots, or ran a benchmark/timer.

| Task | Condition | Runs that measured | Mean tool calls | Mean report length (words) |
|---|---|---|---|---|
| toggle | Plain request | 0/2 | 5.0 | 178 |
| toggle | /obsess | 2/2 | 7.5 | 269 |
| button | Plain request | 2/2 | 8.0 | 210 |
| button | /obsess | 2/2 | 10.5 | 303 |
| importer | Plain request | 2/2 | 8.0 | 192 |
| importer | /obsess | 2/2 | 10.5 | 300 |
