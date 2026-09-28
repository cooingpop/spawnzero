# Checklist: refresh inventory

Regenerate `docs/agents/inventory.md` from the current code. Run this whenever
the inventory could be stale (see the trigger in `AGENTS.md` Standards
Maintenance) and once during bootstrap to create the first inventory. The
inventory is derived from the code; this procedure is the only supported way to
write it. Do not hand-write it from memory.

1. Read the header rules at the top of `docs/agents/inventory.md` and follow
   them (facts not prose; reference by name not line number; AI-not-human
   audience).
2. Screens / surfaces: find the routes, pages, or entry components in the code
   (router config, pages directory, navigation). List each by name. Do not
   list a screen that has no code behind it.
3. User actions: for each screen, list the actions from the handlers, forms,
   and buttons actually wired up in that screen's code, not from what the
   screen looks like it should do.
4. Background behavior: list cron/schedule config, queue workers, webhook
   handlers, and event listeners, each by handler name and trigger.
5. Paid / free split: read the actual gating code (plan checks, feature flags,
   paywalls) and record the split. If there is none, write "no plan gating".
   Do not invent tiers the code does not enforce.
6. Data model: read the schema source of truth (migrations, ORM models, schema
   definition). For each field, search the code for a reader or writer and mark
   it active or dormant based on that search, not on the field's name.
7. Not implemented: list features common to this product category that the code
   does not contain. Each entry must be something you confirmed is absent, not
   a wishlist.
8. Anything you could not confirm goes under "미확인 (unverified)" with the
   reason. Never promote a guess into the body.
9. Update the "Last regenerated" line with today's date and the current commit
   short hash. Commit the inventory in the same change as any code that made it
   stale, per `AGENTS.md` Standards Maintenance.
