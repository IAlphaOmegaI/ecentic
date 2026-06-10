# Plan 012: Repair the drizzle migration journal so `db:generate` works again (unblocks plan 005)

> **Executor instructions**: This plan touches migration lineage that is coupled
> to the **production database state**. It must be run by a human (or agent) with
> access to the target database's migration-tracking table. Do NOT run the
> destructive steps against production without first proving them on a copy.
> Update this plan's row in `plans/README.md` when done.
>
> **Drift check**: `git diff --stat df39e96..HEAD -- apps/web/drizzle apps/web/src/server/database/schema.ts`

## Status

- **Priority**: P2 (blocks plan 005's value; not urgent — app runs without it)
- **Effort**: M
- **Risk**: HIGH (mistakes corrupt migration state → failed/duplicate deploys)
- **Depends on**: none (but plan 005's index migration can only be generated AFTER this)
- **Category**: migration
- **Planned at**: commit `df39e96` / `advisor/integrate`, 2026-06-10

## Why this matters

`bun run db:generate` fails with "Non-commutative migrations detected" — so no new migration can be generated, including plan 005's 15 indexes (which currently live in `schema.ts` but exist nowhere in the DB). The drizzle-kit 1.0 RC journal under `apps/web/drizzle/` has two structural defects from an unresolved git-branch merge. The SQL was all applied to the DB (the app works), but the snapshot *lineage* forked, so the tool can no longer linearize history to compute a diff.

## Current state — exact diagnosis (verified 2026-06-10)

drizzle-kit 1.0 RC stores each migration as a directory `apps/web/drizzle/<timestamp>_<name>/` containing `migration.sql` + `snapshot.json`, where each `snapshot.json` has an `id` and a `prevIds: [...]` array linking to its parent snapshot(s).

**Lineage (id → parent):**

```
mute_blizzard 7ba6e9b0  → ROOT
remarkable    93017dc8  → mute_blizzard
legal         1011f7ec  → remarkable
flimsy        5cd5d54e  → legal
square_amazoness b517aae1 → flimsy
├── square_annihilus  75e4a3cc → square_amazoness   [ALTER scan.topFinding → jsonb]   ← DEAD BRANCH
└── listing_optimization 96c27ef9 → square_amazoness [CREATE listing_optimization]   ← mainline
slimy_annihilus 9bb11ef6 → listing_optimization
clammy        67ef9611 → slimy_annihilus
quick_living_tribunal 486fbe2b → clammy
agent_api_keys (20260601024500)  → NO snapshot.json at all  ← ORPHAN (creates agent_api_key)
far_kulan_gath 86db9faa → quick_living_tribunal   (points PAST agent_api_keys)
ambitious_weapon_omega 4d1b7671 → far_kulan_gath
chubby_sabra  e2f94887 → ambitious_weapon_omega
nappy_terror  48223443 → chubby_sabra
shocking_genesis c820326b → nappy_terror
lively_callisto c290733c → shocking_genesis
```

**Defect 1 — the fork** (the actual cause of the error): `b517aae1` (square_amazoness) has two children. `square_annihilus` (75e4a3cc) is a dead branch — nothing references it. Its change (`ALTER TABLE "scan" ALTER COLUMN "topFinding" SET DATA TYPE jsonb`) is therefore **absent from the mainline snapshot lineage**, even though `schema.ts` declares `topFinding: jsonb(...)` and the DB has it (the SQL was applied).

**Defect 2 — the orphan**: `20260601024500_agent_api_keys/` has only `migration.sql` (creates `agent_api_key`), no `snapshot.json`. `far_kulan_gath` links back to `quick_living_tribunal`, skipping it entirely. So `agent_api_key` exists in the DB and in `schema.ts` but is not represented in any snapshot.

**Net effect**: the latest mainline snapshot (`lively_callisto` c290733c) does NOT reflect (a) `scan.topFinding` as jsonb or (b) the `agent_api_key` table — even though both are real in `schema.ts` and the DB. A naive prevIds re-point would linearize the chain but leave the final snapshot diverged from reality, so `db:generate` would then emit spurious `ALTER`/`CREATE` statements.

## Commands you will need

| Purpose | Command | Notes |
|---------|---------|-------|
| Generate | `cd apps/web && bun run db:generate` | offline (no DB); currently fails |
| Apply | `cd apps/web && bun run db:migrate` | needs `DATABASE_URL`; do NOT run on prod blind |
| Inspect DB applied set | query the drizzle migrations tracking table | RC stores applied migration hashes; confirm its name via `db:studio` or `\dt` |

## Scope

**In scope**: `apps/web/drizzle/**` (snapshots, journal, migration dirs), and only as a *generated* result, a new index migration.
**Out of scope**: `schema.ts` (it is already correct — the source of truth), any application code.

## Recommended approach — re-baseline (safe order)

Because the snapshots have diverged from the DB, the robust fix is to re-baseline the migration history to a single snapshot that matches `schema.ts`, then tell the DB it's already applied. Do this **on a database copy first**.

### Step 1: Snapshot the real DB state

- Take a dump of the target DB schema (`pg_dump --schema-only`). Confirm it matches `schema.ts`: `scan.topFinding` is `jsonb`, `agent_api_key` exists, `listing_optimization` exists, and the 4 existing unique indexes are present (the 15 new `_idx` indexes from plan 005 are NOT yet present — that's expected).

### Step 2: Archive the broken journal

- Move `apps/web/drizzle/` aside to `apps/web/drizzle.archive-2026-06-10/` (keep it in git history — these SQL files document what was applied).

### Step 3: Generate a fresh baseline

- `cd apps/web && bun run db:generate` against the now-empty `drizzle/` → produces one `0000_*` migration representing the ENTIRE current `schema.ts` (all tables + the 15 new indexes + jsonb topFinding + agent_api_key). Verify it's internally consistent (a single snapshot, no fork).

### Step 4: Mark the baseline as partially applied (the delicate part)

- The DB already has every object EXCEPT the 15 new indexes. So the `0000_*` baseline must NOT be fully re-run (it would `CREATE TABLE` things that exist). Two safe options:
  - **(a)** Insert the baseline's hash into the drizzle migrations tracking table so `db:migrate` treats it as applied, THEN hand-apply only the 15 `CREATE INDEX` statements (copy them out of the baseline `migration.sql`, run with `IF NOT EXISTS`). This is the lowest-risk path for prod.
  - **(b)** On a fresh/empty environment, just run the baseline normally.
- Decide per environment: prod/staging use (a); local dev can use (b) after `db:reset`.

### Step 5: Verify

- `cd apps/web && bun run db:generate` again → reports "No schema changes" (schema.ts now matches the baseline snapshot). This proves the journal is healthy and future migrations will generate cleanly.
- Confirm the 15 `_idx` indexes exist in the DB (`\di` or Drizzle Studio).

## Interim shortcut (if you only want plan 005's indexes now)

The 15 indexes are pure additive `CREATE INDEX`. Without repairing the journal, you can hand-apply them and defer the re-baseline:

```sql
-- run against the DB directly (psql "$DATABASE_URL"); all are non-destructive
CREATE INDEX IF NOT EXISTS "product_user_idx" ON "product" ("userId");
CREATE INDEX IF NOT EXISTS "product_store_idx" ON "product" ("storeId");
CREATE INDEX IF NOT EXISTS "competitor_user_idx" ON "competitor" ("userId");
CREATE INDEX IF NOT EXISTS "scan_user_created_idx" ON "scan" ("userId","createdAt");
CREATE INDEX IF NOT EXISTS "scan_status_idx" ON "scan" ("status");
CREATE INDEX IF NOT EXISTS "simulation_scan_idx" ON "simulation" ("scanId");
CREATE INDEX IF NOT EXISTS "simulation_product_idx" ON "simulation" ("productId");
CREATE INDEX IF NOT EXISTS "simulation_competitor_idx" ON "simulation" ("competitorId");
CREATE INDEX IF NOT EXISTS "agent_visit_user_created_idx" ON "agent_visit" ("userId","createdAt");
CREATE INDEX IF NOT EXISTS "agent_visit_store_created_idx" ON "agent_visit" ("storeId","createdAt");
CREATE INDEX IF NOT EXISTS "agent_traffic_daily_user_date_idx" ON "agent_traffic_daily" ("userId","date");
CREATE INDEX IF NOT EXISTS "agent_traffic_daily_store_date_idx" ON "agent_traffic_daily" ("storeId","date");
CREATE INDEX IF NOT EXISTS "session_user_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "account_user_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "store_user_idx" ON "store" ("userId");
```

(Confirm exact column names against `schema.ts` before running — they use the quoted camelCase column identifiers shown.) The journal repair still needs doing before the *next* schema change, but this gets the perf win immediately.

## Done criteria

- [ ] `cd apps/web && bun run db:generate` exits 0 and reports no pending changes (journal healthy, snapshot matches schema.ts)
- [ ] The 15 `_idx` indexes exist in every target DB
- [ ] No table/column was dropped or recreated in any environment (verify against the Step 1 dump)
- [ ] `plans/README.md` row updated

## STOP conditions

- You do not have a database copy to test against — STOP; this must not be done blind on prod.
- Step 3's baseline `db:generate` still errors (a deeper journal issue than the two documented defects) — STOP and report the new error.
- The DB dump in Step 1 does NOT match `schema.ts` (e.g. a column type differs) — STOP; the divergence is bigger than this plan assumes and needs investigation first.

## Maintenance notes

- Root cause was a git branch merge that combined two migrations off the same parent without re-generating the lineage. Going forward: never merge two branches that each added migrations without re-running `db:generate` on the combined schema; treat the `drizzle/` journal like a rebase target, not a free-merge directory.
- Keep the archived `drizzle.archive-*/` in history as the record of what was applied pre-rebaseline.
