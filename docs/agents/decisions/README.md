# Decision Memos

One memo per non-obvious judgment call. The goal is that a future model (or
person) facing a similar problem can reuse the judgment without re-deriving it.
Write for a weaker model reading in a hurry: short, concrete, checkable.

## When to write one

- You chose between two or more genuinely viable approaches.
- You rejected an approach that a future model would plausibly try first.
- You hit a trap that cost real time (race condition, library quirk, platform
  behavior).
- The owner made a product judgment call that is not yet a rule in `AGENTS.md`.

Do not write memos for routine work. A memo nobody would search for is noise.

## Format

One file per memo: `NNNN-short-slug.md` (next number = highest existing + 1).
Copy `0000-template.md`. Keep the whole memo under ~20 lines.

- **Problem** — one line.
- **Approach** — the short steps actually taken.
- **Not done & why** — the plausible alternatives that were rejected, and the
  reason each was rejected. This is the most valuable section.
- **Reuse rule** — one line, imperative, checkable. If it generalizes beyond
  one situation, promote it into `AGENTS.md` and note that in the memo.

## Not this: the current-state inventory

This archive records *why* a judgment was made, one memo at a time, as you go.
It is not a list of *what currently exists*: that is `docs/agents/inventory.md`,
which is generated from the code. Do not create a separate "decisions" or
"context" document to describe current features. Existing-feature facts go in
the inventory; the reasoning behind a call goes in a memo here.
