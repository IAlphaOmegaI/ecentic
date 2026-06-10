# Plan 009 (spike): Design measured optimization lift — replace the fabricated `winRateAfter` with a real follow-up scan

> **Executor instructions**: This is an investigation/design spike, NOT an
> implementation plan. The deliverable is a design document plus a proposed
> follow-up implementation plan. Modify NO source code. Follow the steps,
> honor STOP conditions, and update this plan's row in `plans/README.md`
> when done.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- apps/web/src/server/app/optimization.ts apps/web/src/server/app/intelligence apps/web/src/server/database/schema.ts`
> Drift here doesn't block the spike — but read the changed files before
> relying on the excerpts below.

## Status

- **Priority**: P2
- **Effort**: M (investigation + design doc)
- **Risk**: LOW (read-only spike; the eventual feature is MED — it schedules real LLM spend)
- **Depends on**: none (the follow-up implementation will depend on plans 001–003)
- **Category**: direction
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

The optimize→publish loop already works end to end: `approveProductListing` generates an improved listing, pushes it to the store via the platform API, and records the optimization. But the headline metric — did the optimization actually help? — is fabricated at publish time:

`apps/web/src/server/app/optimization.ts` (~`:390-399`, inside `approveProductListing`):

```ts
      payload: {
        proposedTitle: improved.data.title,
        proposedDescription: improved.data.description_html,
        winRateBefore: winRate,
        estimatedLift: lift,
        winRateAfter: Math.min(99, winRate + lift),
        publishedAt: new Date(),
        ...
```

`winRateAfter` is `winRateBefore + estimatedLift`, capped at 99 — an estimate stored in the column whose name promises a measurement. The product docs (`docs/context/idea.md`, "Auto-Optimization & Auto-Publish") explicitly promise: *"After publishing, schedule a follow-up simulation sweep (e.g. 24 hours later) to measure the lift. Record `winRateBefore` and `winRateAfter` on the optimization record."* This is the core proof-of-value loop of the product — "we improved your listing and here is the measured result" — and it's the difference between a real metric and a dressed-up guess. This spike designs the measurement loop; it does not build it.

## Current state (verified at planning time)

- **What exists and works:**
  - `optimization.ts:339-413` — `approveProductListing`: ownership check, platform gate (`PUBLISHABLE_PLATFORMS` = Shopify + WooCommerce), `generateImprovedListing` (LLM), `Store.publishProductListing` (→ `Shopify.updateProduct` at `integration/shopify.ts:947` with a PUT at `:994`, or `WooCommerce.updateProduct` at `integration/woocommerce.ts:316` with a PUT at `:372`), then `upsertRecord` with the payload above.
  - `optimization.ts:507` — `approveAllPending` (bulk variant, same fabricated `winRateAfter` — confirm during investigation).
  - Publish cooldown logic exists (`optimization.ts:235-236` — `PUBLISH_COOLDOWN_MS` against `record.publishedAt`).
  - Scan machinery: `intelligence/background-scan.ts` — `runScanForUser` runs a full simulation sweep for a user; `runScanDaily` (cron via `api/cron/scan/route.ts`, bearer `CRON_SECRET`, limit 20 users); `runPendingScans` consumes scans with `status: "pending"` (`Scan.findPending`, `scan.ts:38-43`).
  - Schema: `listingOptimization` (`schema.ts:256-282`) has `winRateBefore`, `estimatedLift`, `winRateAfter`, `publishedAt`, `status`, and a unique `(userId, productId)` index.
- **What's missing:** anything that runs AFTER publish to re-measure. No follow-up scheduling field, no post-publish trigger, no recompute of `winRateAfter` from real simulations.
- **Known sharp edges to design around:**
  - `runScanForUser` scans the user's whole catalog (up to the skim cap), not a single product — a per-product re-scan primitive may need extracting.
  - Win-rate computation from simulations exists in at least two places (`optimization.ts`'s `computeWinRate`, `product.ts`'s per-model variants) — the measured lift must use the SAME computation as `winRateBefore` did, or the before/after comparison is apples-to-oranges.
  - Scan status literals: writers use `"complete"` (see plan 001) — the follow-up reader must use the canonical value.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Locate call sites | `grep -rn "winRateAfter\|estimatedLift" apps/web/src` | the full usage surface |
| Read cron pattern | `cat "apps/web/src/app/(provider)/api/cron/scan/route.ts"` | the auth + invocation pattern to mirror |

## Scope

**In scope (deliverables — the only files you create/modify):**
- `plans/design/optimization-lift.md` (create — the design doc)
- `plans/010a-measured-optimization-lift.md` — OPTIONAL: draft follow-up implementation plan, only if the design lands cleanly with no open blockers
- `plans/README.md` (status row + link to the design doc)

**Out of scope:**
- ALL source code. This spike writes Markdown only.
- Redesigning the optimization generation/publish path itself.
- Auto-publish triggers on win-rate drop (the other half of the idea.md promise) — note it in "future work" but do not design it here; it depends on this measurement loop existing first.

## Steps

### Step 1: Map the full surface

Read in full: `optimization.ts` (all exports), `intelligence/background-scan.ts`, `intelligence/simulate.ts` (the scan creation + win computation parts), `scan.ts`, `simulation.ts`, the cron route, and the `listingOptimization`/`scan`/`simulation` schema definitions. Inventory in the design doc: every writer/reader of `winRateBefore`/`winRateAfter`/`estimatedLift` (including the dashboard UI under `apps/web/src/app/(main)/dashboard/optimize/`), and every win-rate computation function with its exact formula.

**Verify**: the design doc's inventory section lists each site with `file:line`.

### Step 2: Design the measurement loop

Produce a design covering, at minimum:

1. **Trigger**: how a published optimization schedules its follow-up. Candidate A — a `followUpAt` timestamp column on `listingOptimization`, consumed by a new cron route (mirroring `api/cron/scan`'s bearer-secret pattern); Candidate B — piggyback on the existing daily scan: after `runScanForUser` completes, recompute `winRateAfter` for any of that user's optimizations whose `publishedAt` is older than the measurement window. Evaluate both; B requires no new infrastructure and no per-product scan primitive — state explicitly which you recommend and why.
2. **Measurement window**: which simulations count as "after" (only those from scans created after `publishedAt`), and the minimum sample size before writing a measured value.
3. **Schema delta**: new columns (e.g. `measuredAt`, possibly `followUpAt`), whether `winRateAfter` keeps holding the estimate until measurement overwrites it or becomes nullable-until-measured (recommend one; note the UI implications either way — the dashboard currently renders the estimated value).
4. **Single source of truth for the win-rate formula**: where the shared computation lives so before and after use identical math.
5. **Failure semantics**: store deleted, product deleted, zero post-publish simulations, optimization re-published before measurement (cooldown interaction).
6. **Cost**: how many extra LLM calls the chosen design triggers per published optimization (Candidate B: zero — it reuses the daily sweep's simulations; say so explicitly if confirmed).

**Verify**: each of the six items has a section in the design doc with a concrete recommendation, not just options.

### Step 3: Open questions for the maintainer

End the doc with the decisions only the maintainer can make (e.g. measurement window length, whether estimated values should ever be shown as "after", whether Dominate-tier auto-publish should block on measured lift). Each question gets a recommended default.

## Done criteria

- [ ] `plans/design/optimization-lift.md` exists with: inventory (Step 1), six design sections with recommendations (Step 2), open questions with defaults (Step 3)
- [ ] No source files modified (`git status` shows only `plans/`)
- [ ] `plans/README.md` row updated, linking the design doc

## STOP conditions

- A follow-up/measurement mechanism ALREADY exists that planning-time investigation missed (search `grep -rn "followUp\|measured\|rescan" apps/web/src` first) — report it; the spike may be moot.
- The win-rate formulas across `optimization.ts` and `product.ts` turn out to be genuinely different metrics (not just duplicated code) — surface that as its own finding before designing on top.

## Maintenance notes

- The follow-up implementation plan must depend on plan 001 (status literals) and plan 003 (test infra) and should land the shared win-rate computation as its first step.
- The companion direction item — auto-publish on win-rate drop — becomes designable once this measurement loop exists.
