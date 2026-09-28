---
name: extract-approach
description: Record the reasoning behind a problem you just solved as a decision memo in docs/agents/decisions/, so future models can reuse the judgment. Use after a non-obvious fix, a choice between real alternatives, or hitting a trap.
---

You just solved a non-trivial problem in this session. Preserve the judgment:

1. Read `docs/agents/decisions/README.md` for the format and the bar for what
   deserves a memo. If this session's work doesn't clear the bar, say so and
   stop — do not write noise.
2. Create `docs/agents/decisions/NNNN-<slug>.md` from `0000-template.md`
   (NNNN = highest existing number + 1). Fill Problem / Approach /
   Not done & why / Reuse rule from what actually happened in this session,
   not an idealized retelling. "Not done & why" must list the alternatives a
   future model would plausibly try first.
3. If the reuse rule generalizes beyond this one situation, add it to the
   matching section of `AGENTS.md` in the same commit and note the promotion
   in the memo.
