# Plan 005: Add indexes for every user-scoped and foreign-key query path in the schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- apps/web/src/server/database/schema.ts apps/web/drizzle`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (if plan 001 also edits `schema.ts`, execute 001 first to avoid merge friction)
- **Category**: perf
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

`apps/web/src/server/database/schema.ts` defines 17 tables and exactly four indexes — all `uniqueIndex`, none covering the query paths the app actually uses. Every dashboard load filters `product`, `scan`, `competitor`, `simulation`, and `agentVisit` by `userId`/`storeId`/`scanId` and orders by `createdAt`; all of those are full table scans today. Postgres also does NOT auto-index foreign-key columns, so the `onDelete: "cascade"` chains (deleting a user cascades through stores → products → simulations) scan child tables per deleted row. Cheap to fix now; painful to retrofit when tables are large.

## Current state

- Schema file: `apps/web/src/server/database/schema.ts`. Current index inventory (the complete list):
  - `listing_optimization_user_product_unique` (`:277`)
  - `agent_api_key_hash_unique`, `agent_api_key_prefix_unique` (`:320-321`)
  - `blog_post_slug_unique` (`:351`)
- The `index` helper is NOT yet imported — `schema.ts:2-11` imports `boolean, date, integer, jsonb, pgTable, text, timestamp, uniqueIndex` from `drizzle-orm/pg-core`.
- Tables currently defined WITHOUT a third (index) argument that need one: `product` (`:118`), `competitor` (`:143`), `scan` (`:161`), `simulation` (`:197`), `agentVisit` (`:216`), `agentTrafficDaily` (`:239`), `session` (`:35`), `account` (`:48`), `store` (`:75`). The pattern for adding indexes is already in the file — `listingOptimization` (`:256-282`):

```ts
export const listingOptimization = pgTable(
  "listing_optimization",
  {
    ...columns
  },
  (table) => [
    uniqueIndex("listing_optimization_user_product_unique").on(
      table.userId,
      table.productId,
    ),
  ],
);
```

- **Query evidence driving the index choice** (verified at planning time):
  - `product.userId` — `Product.skimForCurrentUser` (`server/app/product.ts:21-26`), `paginateWithIntelligence`
  - `product.storeId` — store-scoped product queries in integrations
  - `competitor.userId` — `server/app/competitor.ts:23-28`
  - `scan.userId` + `createdAt` ordering — `Scan.getLatest` (`server/app/scan.ts:25-36`), `getForCurrentUser`; `scan.status` — `findPending` (`:38-43`)
  - `simulation.scanId` — `Simulation.getForScan`; `simulation.productId` — `getForProducts`; `simulation.competitorId` — `getForCompetitors`
  - `agentVisit.userId/storeId` + `createdAt` — tracking time-series queries (`server/app/tracking.ts`)
  - `agentTrafficDaily.userId` + `date` — daily aggregation reads
  - `session.userId`, `account.userId`, `store.userId` — Better Auth lookups and cascade paths
- Migration tooling (from `apps/web/package.json`): `bun run db:generate` (drizzle-kit generate, writes to `apps/web/drizzle/`), `bun run db:migrate` (applies), `bun run db:push` (dev only). `drizzle.config.ts` is at `apps/web/drizzle.config.ts` and reads `DATABASE_URL`.

**Conventions that apply:** index names follow the existing snake_case pattern in the file (`<table>_<columns>_idx` to distinguish from the `_unique` suffix used by unique indexes). Schema column names keep their conventional names (the user's zenn-style explicitly exempts DB schema from the domain-naming rule).

## Commands you will need

| Purpose          | Command                                  | Expected on success                       |
|------------------|------------------------------------------|-------------------------------------------|
| Install          | `bun install` (repo root)                | exit 0                                    |
| Typecheck        | `cd apps/web && bun run typecheck`       | exit 0                                    |
| Generate         | `cd apps/web && bun run db:generate`     | new SQL file in `apps/web/drizzle/`       |
| Apply (dev DB)   | `cd apps/web && bun run db:migrate`      | exit 0                                    |
| Lint             | `bun run lint` (repo root)               | exit 0                                    |

## Scope

**In scope** (the only files you should modify/create):
- `apps/web/src/server/database/schema.ts`
- `apps/web/drizzle/` (the generated migration — created by drizzle-kit, not by hand)

**Out of scope** (do NOT touch):
- Any query code — index additions must not change application logic.
- Existing migration files in `apps/web/drizzle/` — never edit a generated migration that may have been applied.
- `user`, `verification`, `ucpProfile`, `subscription`, `store_account`, `blogPost` tables — their lookups are by primary key or already-unique columns.

## Git workflow

- Branch: `advisor/005-database-indexes`
- Commit style: `perf: index user-scoped and foreign-key query paths`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add `index` to the pg-core import

In `schema.ts:2-11`, add `index` to the existing `drizzle-orm/pg-core` import list.

**Verify**: `cd apps/web && bun run typecheck` → exit 0.

### Step 2: Add the index definitions

Convert each table below to the three-argument `pgTable` form (matching the `listingOptimization` pattern shown above) and add:

| Table | Indexes to add |
|-------|----------------|
| `product` | `index("product_user_idx").on(table.userId)`, `index("product_store_idx").on(table.storeId)` |
| `competitor` | `index("competitor_user_idx").on(table.userId)` |
| `scan` | `index("scan_user_created_idx").on(table.userId, table.createdAt)`, `index("scan_status_idx").on(table.status)` |
| `simulation` | `index("simulation_scan_idx").on(table.scanId)`, `index("simulation_product_idx").on(table.productId)`, `index("simulation_competitor_idx").on(table.competitorId)` |
| `agentVisit` | `index("agent_visit_user_created_idx").on(table.userId, table.createdAt)`, `index("agent_visit_store_created_idx").on(table.storeId, table.createdAt)` |
| `agentTrafficDaily` | `index("agent_traffic_daily_user_date_idx").on(table.userId, table.date)`, `index("agent_traffic_daily_store_date_idx").on(table.storeId, table.date)` |
| `session` | `index("session_user_idx").on(table.userId)` |
| `account` | `index("account_user_idx").on(table.userId)` |
| `store` | `index("store_user_idx").on(table.userId)` |

**Verify**: `cd apps/web && bun run typecheck` → exit 0.

### Step 3: Generate the migration

`cd apps/web && bun run db:generate`

**Verify**: a new file appears under `apps/web/drizzle/` whose content is exclusively `CREATE INDEX` statements — 14 of them, matching the table above. If the generated SQL contains ANYTHING other than `CREATE INDEX` (a `DROP`, an `ALTER COLUMN`), see STOP conditions.

### Step 4: Apply to the dev database

`cd apps/web && bun run db:migrate` (requires `DATABASE_URL` in `apps/web/.env.local`).

**Verify**: exit 0. Then confirm via `psql "$DATABASE_URL" -c "\di"` (or Drizzle Studio) that `product_user_idx` exists. If no dev database is reachable, record that the migration is generated-but-unapplied in your report and in the README status note.

## Test plan

Index changes are behavior-invariant; the verification is the generated SQL review (Step 3) plus the full existing suite: `cd apps/web && bun test src` → all pass (if plan 003 has landed).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd apps/web && bun run typecheck` exits 0
- [ ] `bun run lint` exits 0
- [ ] New migration file under `apps/web/drizzle/` contains exactly 14 `CREATE INDEX` statements and nothing else
- [ ] `grep -c '  index("' apps/web/src/server/database/schema.ts` outputs `14`
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated (note whether the migration was applied or only generated)

## STOP conditions

Stop and report back (do not improvise) if:

- The generated migration contains statements other than `CREATE INDEX` — drizzle-kit detected unrelated schema drift between `schema.ts` and the migration history (possibly from plan 001's `$type`, which should produce NO SQL — if it does, something else is wrong).
- `db:generate` fails on the drizzle-orm 1.0 RC version with an error mentioning the schema format.
- The dev database errors on `CREATE INDEX` (e.g. a name collision with a manually created index).

## Maintenance notes

- These are plain B-tree indexes chosen from current query patterns. When query shapes change (new `where` columns, new sort orders), add indexes in the same commit as the query.
- On a large production table, plain `CREATE INDEX` takes a lock; at current data volumes this is fine. If the product grows, future index migrations should use `CREATE INDEX CONCURRENTLY` (drizzle supports `.concurrently()`).
- Reviewer should scrutinize: no width creep (each index is 1–2 columns), no redundant index on a column already covered by a unique index.
