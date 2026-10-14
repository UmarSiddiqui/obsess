# /obsess v0.2 design

## The product

**One thing. Unreasonable attention to detail.**

A user points at an imperfect detail. The agent gives that target a bounded improvement loop instead of expanding the task or returning an unchecked first edit. The target can be tiny. Measured code optimisation remains useful, but it is no longer the whole product identity.

This is a design hypothesis. The package implements instructions and local support tools, not a trained optimiser or an autonomous service.

## Behaviour that matters

| Decision | Reason |
|---|---|
| Natural-language invocation | The user shouldn't need to design a benchmark for a small UI request |
| One bounded target | Prevent unrelated changes and keep verification affordable |
| Automatic workflow selection | Use measured evidence where it fits without scoring visual taste |
| Lite as an effort profile | Keep the same integrity rules with fewer attempts and less orchestration |
| Early stopping allowed | Attention to detail isn't a requirement to invent defects |
| Explicit verification labels | Avoid turning a source-level guess into a claim about a rendered product |

## The two workflows

Polish uses a brief goal and fixed behaviour checks. It can compare rendered states or use an explicitly subjective review. The result is only as strong as the feedback actually available. A screenshot alone doesn't establish temporal smoothness.

Optimise requires a reproducible scalar evaluator. The existing `gate.py` accepts or rejects reported receipts under a fixed contract. It doesn't prove that those receipts are genuine. That limitation remains explicit.

Both preserve an original baseline and the best-supported checkpoint. Ties don't displace an incumbent. A provisional patch can be useful without being accepted as verified improvement.

## Smaller-model path

Lite caps attempts at 2 and avoids subagents. It reads only the relevant reference and carries brief lessons rather than the whole research dossier. It doesn't remove mandatory behaviour checks or select a paid fallback.

The claim worth testing is whether this structure improves a narrowly scoped result for the same model within a matched resource allowance. It's not “free models beat frontier models”. Provider availability and account pricing aren't embedded in the skill.

## Packaging and compatibility

The main file keeps the existing Claude Code invocation control and adds OpenCode's documented slash/autoinvoke metadata. A legacy OpenCode command file is optional. The installer never configures model access or changes permissions.

Only package-level checks are reported for this build. Host-specific prompt loading and behavioural adherence need live trials. Instructional budgets are not independently enforced. Host policy has priority over everything in the package.

## Evidence and state

A polish run uses `run.md`, `state.json` and an append-only attempt log, with recoverable snapshots. Scalar runs can additionally use the original contract/receipt format. State distinguishes started attempts from evaluated ones and the working-tree status from the accepted checkpoint.

The v0.1 gate and its tests are preserved. Legacy runs keep their original contract on resume; uncertain usage must be reconciled rather than reset.

## Trust boundaries

The skill mustn't expand edit scope, erase outside work or weaken evaluation to record a win. In-place editing is allowed only with snapshots and per-file conflict checks. Unattended durability would require a separate controller and a protected evaluator.

Launch copy is deliberately separate from operating instructions. Actual screenshots can demonstrate a real result, but fabricated before/after numbers can't establish quality or market demand.
