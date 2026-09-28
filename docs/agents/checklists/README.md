# Agent Checklists

Tool-neutral, step-by-step procedures. Any agent tool (Claude Code, Codex,
Cursor, Gemini CLI, ...) should read and execute these directly; `.claude/skills/`
only contains thin wrappers pointing here. The checklist file is the source of
truth — update it, not the wrapper.

Writing rules:

- Every step must be verifiable ("run X and confirm Y"), never "make sure it
  looks good".
- Order steps by dependency, cheapest checks first.
- If a step fails, the checklist says what to do: fix, or stop and escalate
  per `AGENTS.md` Escalation Rules.
