# Momo Tycoon: Haiku 5.5, with and without /obsess

One open-ended build task, run once per condition on `claude-haiku-5-5` in headless Claude Code. Same brief ([brief.txt](brief.txt)) and the same tooling (Chromium and Playwright available) in both runs. The /obsess run got the brief prefixed with `/obsess` and the skill installed in the project.

| | Plain | /obsess |
|---|---|---|
| Time | 27 min | 40 min |
| Cost (CLI estimate) | $0.95 | $2.40 |
| Agent turns | 59 | 147 |
| Code written | 101 KB, 7 files | 134 KB, 8 files |
| Console errors on load (headless Chromium) | none | none |
| Bugs it reported finding and fixing | none reported | wages and rent charged twice after a reload at day end |
| Performance work | none reported | draw calls cut from 501 to 89 by merging static geometry |
| Visual iterations it reported | none | fixed a hidden sign, black roof undersides, a canopy shadow over the counter, mountains hidden behind rooftops |
| Works inside a sandboxed page | "New game" relies on `confirm()`, which some embeds block | uses a tap-twice confirmation instead |

Screenshots after 20 seconds of play: [plain](plain-desktop.png), [/obsess](obsess-desktop.png), [mobile side by side](mobile-plain-vs-obsess.png).

## What this does and doesn't show

It's one run per condition, so it's an anecdote, not a benchmark. The /obsess run spent 2.5 times the money and about 1.5 times the time. It found and fixed a real save/reload money bug, did a measured performance pass and made several visual fixes it could point to. Both games run. Whether the /obsess version is better to play is a judgement for a human; nothing here scores fun or beauty.

The brief is a whole game, which isn't the "one bounded thing" /obsess is designed for. It still ran its check, change, keep-or-reject loop, which is where the extra time and cost went.

Transcripts (images stripped): [plain](plain-transcript.jsonl.gz), [/obsess](obsess-transcript.jsonl.gz).
