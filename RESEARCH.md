# Research basis for /obsess

> Retained v0.1 research memo. Its literature-review statements are from the supplied archive and were not independently revalidated for v0.2. The numeric defaults discussed below describe the original optimisation workflow; current defaults are in SKILL.md. This memo is background, not a live-host benchmark or new validation result.

Prepared 15 October 2026. This review covers the methods and relevant results of seven primary papers, including their applicable tables or figures. It isn't a claim to have reviewed every appendix. The findings below aren't benchmark results for this skill.

## The claim worth testing

A bounded agent may improve a specific artefact through repeated experiments when it has useful feedback and a reliable selection process. Additional inference work can sometimes compensate for a smaller model, but the outcome depends on the task and the model's ability to generate useful candidates.

This does **not** establish that repetition always improves quality, that hundreds of rounds beat a few rounds or that a smaller model is always cheaper. A prompt-only workflow also doesn't reproduce research systems with trained verifiers or specialised infrastructure.

## Primary evidence

### 1. Self-Refine: Iterative Refinement with Self-Feedback

Madaan et al., 2023. [Paper](https://arxiv.org/abs/2303.17651), [PDF](https://arxiv.org/pdf/2303.17651).

Reviewed the feedback/refinement procedure and the main results, particularly Table 1 on printed page 5 and iteration analysis on page 7. GPT-4's code-optimisation rate rose from 27.3% to 36.0%, while maths changed only from 92.9% to 93.1%. The main setup allowed at most four iterations. This supports task-specific refinement, not a claim about indefinitely improving through repetition. Specific feedback is more useful than generic criticism.

**Design implication:** require a concrete hypothesis and an observable reason to revise.

### 2. Reflexion: Language Agents with Verbal Reinforcement Learning

Shinn et al., 2023. [Paper](https://arxiv.org/abs/2303.11366), [PDF](https://arxiv.org/pdf/2303.11366).

Reviewed the episodic-memory mechanism and coding experiments, especially Tables 2 and 3 on printed page 8. HumanEval Python improved from 80% to 91%, but MBPP Python declined from 80% to 77%. The authors discuss how incorrect generated tests can validate incorrect code. Recorded feedback can improve later attempts without weight updates, but its reliability matters.

**Design implication:** retain concise experiment lessons and verify test expectations independently where possible.

### 3. Large Language Models Cannot Self-Correct Reasoning Yet

Huang et al., ICLR 2024. [Paper](https://arxiv.org/abs/2310.01798), [PDF](https://arxiv.org/pdf/2310.01798).

Reviewed the intrinsic-versus-external-feedback distinction and Table 3 on printed page 4. In the tested intrinsic-correction setup, GPT-4 GSM8K accuracy fell from 95.5% to 89.0% after two rounds. These historical experiments aren't a universal statement about current models. They demonstrate why an agent's conviction isn't sufficient evidence and why baselines must receive comparable resources.

**Design implication:** preserve the incumbent and treat criticism as a hypothesis rather than a verdict.

### 4. Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters

Snell et al., 2024. [Paper](https://arxiv.org/abs/2408.03314), [PDF](https://arxiv.org/pdf/2408.03314).

Reviewed Sections 2 and 7, including Figure 9 on printed page 15. In some FLOPs-matched MATH settings, test-time computation was preferable to a model approximately 14 times larger. The study used trained revision/verifier components and found substantial dependence on difficulty and workload assumptions. FLOPs equivalence isn't API-price equivalence. Prompting an arbitrary small model to repeat isn't the demonstrated intervention.

**Design implication:** test model size and budget jointly; don't promise that more attempts overcome every capability limit.

### 5. GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning

Agrawal et al., first posted 2025; reviewed arXiv v2 dated 14 February 2026. [Paper](https://arxiv.org/abs/2507.19457), [PDF](https://arxiv.org/pdf/2507.19457).

Reviewed the main method and candidate-selection procedure, particularly printed pages 5-7. GEPA improves prompts using execution feedback and retains complementary candidates through Pareto-aware selection. It separates feedback from evaluation data. This is more structured than serially rewriting the latest prompt. The study doesn't validate this skill's chosen archive size or stopping defaults.

**Design implication:** retain a bounded set of diverse alternatives without replacing the verified incumbent prematurely.

### 6. AlphaEvolve: A coding agent for scientific and algorithmic discovery

Novikov et al., 2025. [Paper](https://arxiv.org/abs/2506.13131), [PDF](https://arxiv.org/pdf/2506.13131).

Reviewed the system overview and Sections 2.3-2.4. Its architecture combines code proposals with automated evaluation and a programme database. It uses an ensemble with different throughput/capability characteristics and stages evaluation to avoid expensive checks on clearly unsuitable candidates. These results depend on an engineered system, not a standalone Markdown instruction.

**Design implication:** stage cheap checks before costly evaluation; make model routing an optional runtime capability.

### 7. Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena

Zheng et al., 2023. [Paper](https://arxiv.org/abs/2306.05685), [PDF](https://arxiv.org/pdf/2306.05685).

Reviewed the judging methodology and bias analysis, including printed page 5. The study documents position and verbosity bias in model judgements. A model reviewer can be useful without being an objective authority. Changing role names doesn't establish independence.

**Design implication:** use anonymised comparisons with swapped ordering where appropriate, permit ties and label preference judgements separately from mechanically checked facts.

## Existing implementation overlap

The [uditgoenka/autoresearch repository](https://github.com/uditgoenka/autoresearch) already documents goal-directed iteration with evaluation and keep/discard decisions. It also includes discovery workflows and bounded operation. The earlier suggestion that there was no established equivalent was too strong.

The generic loop isn't a defensible novelty claim. /obsess is proposed as a smaller explicit skill with a carefully stated evidence policy. Whether that packaging is useful enough to distinguish it from existing tools needs user testing. This search doesn't establish name availability.

## Engineering synthesis, not a reproduced research method

The proposed workflow separates candidate generation from acceptance. It keeps a recoverable best-supported result and records failed experiments. It reserves room for a changed strategy but stops when the remaining work isn't justified.

The following are implementation hypotheses: a 12-experiment default, a 30-minute allowance, a four-candidate archive and a plateau policy that permits one bounded pivot. No reviewed paper establishes those values as optimal. The skill isn't an implementation of the complete GEPA or AlphaEvolve algorithm.

## Packaging references

The [Agent Skills specification](https://agentskills.io/specification) defines the skill-directory structure. The [Claude Code skills documentation](https://code.claude.com/docs/en/skills) describes local installation and explicit invocation controls. Those documents support packaging, not efficacy.
