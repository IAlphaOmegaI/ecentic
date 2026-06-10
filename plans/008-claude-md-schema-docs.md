# Plan 008: Bring CLAUDE.md's schema documentation in line with the actual 17-table schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- CLAUDE.md apps/web/src/server/database/schema.ts`
> If `schema.ts` changed since this plan was written, re-derive the table
> list from the live file (the `tables` export at the bottom is the source
> of truth) instead of using the list below verbatim.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

CLAUDE.md is loaded into every agent session in this repo and the repo's own rule says docs are canonical. Its schema list names 12 tables; the real schema has 17. Five tables — including the ones newest features hang off (`listingOptimization`, `subscription`, `agentApiKey`) — are invisible to any agent or developer trusting the doc, which causes wrong assumptions in exactly the sessions the file exists to inform. Stale canonical docs are worse than no docs.

## Current state

- `CLAUDE.md:87`:

```
- Schema in `schema.ts`: `user`, `session`, `account`, `verification`, `store`, `product`, `competitor`, `scan`, `simulation`, `ucpProfile`, `agentVisit`, `agentTrafficDaily`
```

- The actual table inventory — `apps/web/src/server/database/schema.ts`, `tables` export at `:355-373` (the authoritative list):
  `user`, `session`, `account`, `verification`, `store`, `store_account`, `product`, `competitor`, `scan`, `simulation`, `ucpProfile`, `agentVisit`, `agentTrafficDaily`, `listingOptimization`, `subscription`, `agentApiKey`, `blogPost`.
- Missing from CLAUDE.md: `store_account` (`:98` — Shopify OAuth token storage per store), `listingOptimization` (`:256` — proposed/published listing rewrites with win-rate before/after), `subscription` (`:284` — Stripe subscription state per user), `agentApiKey` (`:303` — hashed API keys for agent access), `blogPost` (`:325` — CMS-less blog content).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Confirm inventory | `grep -c "pgTable(" apps/web/src/server/database/schema.ts` | `17` |

## Scope

**In scope** (the only file you should modify):
- `CLAUDE.md` (line 87 and, if the surrounding "Server Architecture" prose contradicts the new list, the minimal adjacent wording)

**Out of scope** (do NOT touch):
- `schema.ts` itself.
- `docs/` — a deeper docs sync may be warranted but is not this plan; if you notice `docs/web/index.md` or `docs/shared/index.md` repeating the stale list, note it in your report only.
- Any other CLAUDE.md section (commands, patterns, tech stack).

## Git workflow

- Branch: `advisor/008-claude-md-schema-docs`
- Commit style: `docs: sync CLAUDE.md schema list with actual tables`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace the table list

Replace `CLAUDE.md:87` with:

```
- Schema in `schema.ts`: `user`, `session`, `account`, `verification`, `store`, `store_account` (Shopify OAuth tokens per store), `product`, `competitor`, `scan`, `simulation`, `ucpProfile`, `agentVisit`, `agentTrafficDaily`, `listingOptimization` (listing rewrites + win-rate lift tracking), `subscription` (Stripe billing state), `agentApiKey` (hashed agent API keys), `blogPost`
```

**Verify**: every name in the line matches a key of the `tables` export in `schema.ts:355-373`; count of backticked table names in the line = 17.

### Step 2: Sanity-check the surrounding section

Read CLAUDE.md's "Server Architecture" section for statements the new list contradicts (e.g. claims about which tables exist or what they're for). Adjust only direct contradictions; do not expand the section.

**Verify**: `grep -n "agentTrafficDaily\`$" CLAUDE.md` → no match (the old list no longer ends the line).

## Test plan

Docs-only — no tests. The verification greps above are the gate.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] All 17 table names from `schema.ts`'s `tables` export appear in CLAUDE.md's schema line
- [ ] `git diff --stat` touches only `CLAUDE.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The live `tables` export no longer matches the 17 names listed here (schema drifted) — re-derive, and if a table was REMOVED, flag it, since other docs likely reference it.

## Maintenance notes

- Whenever a migration adds/removes a table, the same commit should touch this CLAUDE.md line. A CI grep comparing `pgTable(` count to the doc is possible follow-up glue.
- Reviewer: confirm the parenthetical descriptions are accurate (they were derived from column names at `schema.ts:98-116, 256-282, 284-301, 303-323, 325-352`).
