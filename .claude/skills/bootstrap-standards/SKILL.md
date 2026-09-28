---
name: bootstrap-standards
description: One-time setup - analyze this codebase and fill in AGENTS.md as the project's standards layer. Run once with the strongest model available; afterwards any model works on top of the result. Use when AGENTS.md still contains skeleton comments.
---

You are writing the standards layer that every future model — including much
weaker ones — will follow literally. Judgment you fail to write down here is
judgment that gets lost. Judgment you write down inaccurately gets followed
anyway. Precision over volume.

First read `docs/agents/method.md` and follow it throughout.

1. **Analyze before writing.** Read the README, package/build config, entry
   points, core modules, API routes, schema files, existing docs, and recent
   git log. Identify: what the product is and is NOT; conventions actually
   followed in the code; secrets/env handling; data flows that must not
   break; anything that looks deliberately removed or guarded (search git log
   for reverts and "remove", comments saying "do not", workarounds).
2. **Interview the owner.** Ask about: mistakes models/contributors have
   repeatedly made here; features removed on purpose and why; what "done"
   means to them; money/legal/data red lines; decisions they want escalated
   vs. decided autonomously. Do not skip this — half the standards layer
   exists only in the owner's head.
3. **Fill every section of `AGENTS.md`**, replacing the skeleton comments and
   following the writing rules at the top of that file (checkable statements,
   prohibitions with reasons, no adjectives). If you cannot make a rule
   checkable, it is an observation, not a rule — leave it out or rephrase.
4. **Extract 1–3 checklists** into `docs/agents/checklists/` for the
   riskiest recurring change types you found (e.g. "any change touching
   <core surface>"), each step verifiable, and add thin wrapper skills in
   `.claude/skills/` pointing at them.
5. **Seed the current-state layers.** Generate the first
   `docs/agents/inventory.md` by running the refresh-inventory procedure
   (`docs/agents/checklists/refresh-inventory.md`). Then take the deliberate
   decisions you excavated in step 1 (reverts, "removed on purpose", non-obvious
   workarounds) and record each either as a decision memo in
   `docs/agents/decisions/`, or as a Hard Rule / removed-on-purpose entry in
   `AGENTS.md` when it is a standing rule. Do not create a separate context
   document: what exists goes in the inventory, why goes in the memos.
6. **Verify against reality.** Re-check each written rule against the actual
   code. Any rule you could not confirm gets marked `(unverified)` for the
   owner to confirm — never present guesses as standards.
7. Report to the owner: what you wrote, what is unverified, and which
   sections are thinnest and will need memos to grow.
