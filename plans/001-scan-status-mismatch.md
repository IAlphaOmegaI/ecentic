# Plan 001: Make all scan-status readers use the canonical `"complete"` value and lock the status union into the schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- "apps/web/src/app/(main)/dashboard" apps/web/src/server/database/schema.ts apps/web/src/server/app/intelligence`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

Scan writers persist the status string `"complete"`, but every dashboard page filters scans with `scan.status === "completed"`. Those filters never match, so completed scans are invisible to all dashboard stat cards, win-rate trends, and activity feeds — the data appears stuck "in progress" forever even though scans finished. The `scan.status` column is plain `text` with no compile-time type, which is why this drifted silently. This plan fixes the ten wrong readers AND narrows the column type so TypeScript catches any future mismatch.

## Current state

The canonical value is `"complete"` — that is what the database writers persist and what the share page and simulations page already read. The dashboard pages are the outliers.

**Writers (correct — do not change):**

- `apps/web/src/server/app/intelligence/background-scan.ts:191-196`:

```ts
  await Scan.update(Environment.SERVER, scan.data.id, {
    status: "complete",
    completedSimulations: totalSimulations,
    wins,
    losses,
  });
```

- `apps/web/src/server/app/intelligence/simulate.ts:616-622` — same shape, `status: "complete"`.
- `apps/web/src/server/app/intelligence/background-scan.ts:266` writes `{ status: "running" }`; `:270` writes `{ status: "failed" }`; the schema default is `"pending"` (`schema.ts:166`).
- So the full status universe is: `"pending" | "running" | "complete" | "failed"`.

**Correct readers (do not change):**

- `apps/web/src/server/app/scan.ts:66` — `if (!scan.data || scan.data.status !== "complete")`
- `apps/web/src/app/(main)/dashboard/simulations/page.tsx:83` — `scan.status === "complete"`

**Wrong readers (the fix targets — all compare against `"completed"`):**

- `apps/web/src/app/(main)/dashboard/page.tsx` — 4 sites:
  - `:215` — `const completed = scans.filter((scan) => scan.status === "completed");`
  - ~`:401` (inside the trend computation, excerpt below)
  - ~`:417` and ~`:421` (inside the `activity` mapping, excerpt below)

```tsx
  const completed = scans.filter((scan) => scan.status === "completed");

  const trend = completed
    .slice(0, 30)
    .reverse()
    ...

  const activity = scans.slice(0, 5).map((scan) => ({
    id: scan.id,
    type:
      scan.status === "completed"
        ? ("simulation_complete" as const)
        : ("simulation_running" as const),
    message:
      scan.status === "completed"
        ? `Simulation completed — ${scan.wins} wins, ${scan.losses} losses`
        : `Simulation in progress — ...`,
```

- `apps/web/src/app/(main)/dashboard/products/page.tsx` — 2 sites (~`:200`, ~`:366`), both `scans.filter((scan) => scan.status === "completed")`.
- `apps/web/src/app/(main)/dashboard/competitors/page.tsx` — 4 sites:
  - ~`:177` and ~`:483` — `scans.filter((scan) => scan.status === "completed")`
  - ~`:524` and ~`:529`:

```tsx
                    scan.status === "completed" ? "bg-success" : "bg-warning",
                  ...
                    {scan.status === "completed"
                      ? `Scan completed — ${scan.wins}W / ${scan.losses}L`
                      : `Scan in progress — ...`}
```

Locate sites by the pattern `=== "completed"`, not by line number — line numbers may have shifted slightly.

**Schema column (to be narrowed):**

- `apps/web/src/server/database/schema.ts:166`:

```ts
  status: text("status").notNull().default("pending"),
```

**Conventions that apply (the user's zenn-style — follow exactly):**

- `const` only, never `let`. No abbreviated names (`scan`, not `s`). Single-word variable names where possible.
- String literal types live alongside their logic — do NOT create a types folder or a new file for the union.
- Match the existing code; this plan is surgical string/type edits, not refactoring.

## Commands you will need

| Purpose   | Command                              | Expected on success |
|-----------|--------------------------------------|---------------------|
| Install   | `bun install` (repo root)            | exit 0              |
| Typecheck | `cd apps/web && bun run typecheck`   | exit 0, no errors   |
| Lint      | `bun run lint` (repo root)           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `apps/web/src/app/(main)/dashboard/page.tsx`
- `apps/web/src/app/(main)/dashboard/products/page.tsx`
- `apps/web/src/app/(main)/dashboard/competitors/page.tsx`
- `apps/web/src/server/database/schema.ts` (the `scan.status` column only)

**Out of scope** (do NOT touch, even though they look related):
- All writers (`background-scan.ts`, `simulate.ts`) — they are already correct.
- `apps/web/src/server/app/scan.ts` and `dashboard/simulations/page.tsx` — already correct.
- UI strings like `"simulation_complete"`, `phase === "complete"` in `simulation-modal.tsx` / `simulations-client.tsx` — these are client-side phase labels, not the DB scan status.
- `scripts/seed.ts` / `scripts/seed-demo.ts` — only if Step 2's typecheck flags them; then see STOP conditions.
- Generated migration files in `apps/web/drizzle/` — narrowing `$type` produces NO SQL change; do not run `db:generate`.

## Git workflow

- Branch: `advisor/001-scan-status-mismatch`
- Commit message style matches repo history (`fix: ...`), e.g. `fix: align dashboard scan-status readers with canonical "complete" value`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace `"completed"` with `"complete"` in the three dashboard pages

In each of the three in-scope page files, replace every occurrence of the comparison value `"completed"` with `"complete"`. There are exactly 10 sites total (4 + 2 + 4 as listed in Current state). Do not change prose strings such as `` `Scan completed — ...` `` (human-facing copy keeps the word "completed").

**Verify**: `grep -rn '=== "completed"' "apps/web/src/app/(main)/dashboard"` → no matches.

### Step 2: Narrow the schema column type

In `apps/web/src/server/database/schema.ts`, change line 166 (the `scan` table's `status` column) to:

```ts
  status: text("status")
    .$type<"pending" | "running" | "complete" | "failed">()
    .notNull()
    .default("pending"),
```

`$type` is a compile-time-only annotation — it changes no SQL and requires no migration.

**Verify**: `cd apps/web && bun run typecheck` → exit 0. If it reports errors at any file comparing or assigning a scan status, those are real latent mismatches this annotation just caught: fix comparisons in the three in-scope files; for any error in an out-of-scope file, see STOP conditions.

### Step 3: Lint and final sweep

**Verify**:
- `bun run lint` → exit 0
- `grep -rn '"completed"' apps/web/src --include="*.ts" --include="*.tsx" | grep -v "Simulation completed\|Scan completed"` → no matches comparing `scan.status`.

## Test plan

No test infrastructure exists yet at this plan's writing (plan 003 establishes it). The compile-time guard in Step 2 is the regression protection: any future writer or reader using a wrong literal fails `bun run typecheck`. If plan 003 has already landed when you execute this, add one test file `apps/web/src/server/database/schema.test.ts` asserting the four status literals type-check (a `satisfies` expression suffices).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd apps/web && bun run typecheck` exits 0
- [ ] `bun run lint` exits 0
- [ ] `grep -rn '=== "completed"' apps/web/src` returns no matches
- [ ] `grep -n '\$type<"pending" | "running" | "complete" | "failed">' apps/web/src/server/database/schema.ts` returns 1 match
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any in-scope excerpt in "Current state" no longer matches the live code (drift).
- Step 2's typecheck reveals scan-status writes/reads in files outside the in-scope list (e.g. `scripts/seed.ts`, `scripts/seed-demo.ts`, or a server action) using a literal other than the four in the union. Report the file list — do not widen the union or edit those files.
- You find any additional status literal (e.g. `"error"`, `"queued"`) being written anywhere — the union in this plan would then be wrong.

## Maintenance notes

- Any future scan-status value must be added to the `$type` union in `schema.ts` first; the compiler will then point at every switch/comparison to update.
- Reviewer should scrutinize: that no human-facing copy ("Scan completed — …") was accidentally reworded, and that the `$type` call produced no diff under `apps/web/drizzle/`.
- Deferred: converting the column to a Postgres enum (real runtime constraint). Not done here because it requires a migration and adds deploy risk for marginal gain over the compile-time guard.
