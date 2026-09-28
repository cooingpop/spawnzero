# Agent Entry Point (Claude Code)

Read `AGENTS.md` first, before writing any code. It is the single standards
layer for this repository. Every rule in it is binding.

- Working method — how to work here: `docs/agents/method.md`
- Answer discipline (auto-loaded below): `docs/agents/answer-discipline.md`
- Schema and storage-format changes (read BEFORE touching a column or field):
  `docs/agents/schema-evolution.md`
- Current-state inventory (what already exists): `docs/agents/inventory.md`
- Step-by-step procedures (tool-neutral): `docs/agents/checklists/`
- Recorded judgment calls and their reasons: `docs/agents/decisions/`
- Claude Code skill wrappers: `.claude/skills/`

If `AGENTS.md` contradicts the current code, stop and report the mismatch
instead of silently picking one side.

The answer-discipline rules are imported so they load in every session:

@docs/agents/answer-discipline.md
