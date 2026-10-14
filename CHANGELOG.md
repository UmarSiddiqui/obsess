# Changelog

## 0.2.0 - 15 October 2026

### Changed

Positioning now centres on one focused improvement rather than a general optimisation system. Natural-language UI requests are first-class, including a smoother toggle and a responsive button.

The agent chooses between polish and measured optimisation. Polish defaults to 4 attempts within 10 active-session minutes; optimisation retains a 12-attempt / 30-minute allowance. `--lite` caps either workflow at 2 attempts / 5 minutes without separate reviewers. Explicit non-lite limits remain available.

An attempt is now counted before editing, so crashes and invalid candidates consume budget. New state fields separate the accepted checkpoint from a provisional working-tree patch. A small task uses a short run note instead of a compulsory full JSON contract.

A first implementation always gets reviewed, but further edits need evidence. Polish stops after 2 consecutive unsupported attempts. Missing rendered feedback allows at most one provisional UI proposal, not repeated blind polishing.

### Added

- UI polish guidance and focused toggle/responsive-button recipes.
- Native OpenCode slash metadata with an optional legacy command wrapper.
- A local installer with dry-run support and backed-up upgrades.
- Compact reporting templates and explicit v0.1 recovery guidance.
- Package tests and a host-evaluation scenario set, plus draft launch copy.

### Preserved

The scalar receipt helper and its original tests remain unchanged. Frozen constraints still take precedence over improvements. Existing user edits stay protected. Discovery remains read-only and saved state doesn't imply background execution.

The original research memo is retained as background with a provenance note. It isn't new evidence for v0.2 effectiveness.

### Not claimed

No interactive Claude Code or OpenCode trial is included. No free-model benchmark, token-saving result or viral-growth claim has been established. No licence was assigned and nothing was published.

## 0.1.0

Original supplied prototype. Evidence-led scalar optimisation with a receipt helper and supporting research notes.
