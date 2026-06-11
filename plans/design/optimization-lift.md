# Design spike: measured optimization lift (replace the fabricated `winRateAfter`)

Spike for plan 009. Investigation + recommendation only — no code. Written 2026-06-10 against `df39e96` / `advisor/integrate`.

## Problem

The optimize→publish loop works end to end, but its headline metric is fabricated. `optimization.ts:397`:

```ts
winRateAfter: Math.min(99, winRate + lift),   // = winRateBefore + estimateLift(winRateBefore)
```

`winRateAfter` is stored at *publish time* as `winRateBefore + estimatedLift` (capped at 99) — a guess dressed up as a measurement. The product's core value prop is "we improved your listing and here's the measured result" (`docs/context/idea.md`, Auto-Optimization & Auto-Publish: *"After publishing, schedule a follow-up simulation sweep … to measure the lift. Record winRateBefore and winRateAfter"*). Right now there is no follow-up sweep and no measurement.

## Inventory (verified)

- **Fabrication sites**: `optimization.ts:397` (`approveProductListing`) and the bulk path `approveAllPending` (`:507`, `:551`). Dismiss path correctly nulls them (`:434`).
- **Pure helpers**: `estimateLift(winRate)` (`:35`), `computeWinRate(productId, simulations)` (`:38`). `PUBLISH_COOLDOWN_MS = 14 days` (`:26`).
- **No measurement exists**: `grep -rn "followUp\|measured\|rescan"` matches only the `winRateAfter` field references — confirmed no follow-up loop anywhere.
- **Schema** (`listingOptimization`, `schema.ts:256-282`): has `winRateBefore`, `estimatedLift`, `winRateAfter`, `publishedAt`, `status`, unique `(userId, productId)`. No `measuredAt`/`followUpAt`.
- **Scan machinery**: `background-scan.ts` — `runScanForUser` (scans the user's whole catalog), `runScanDaily` (cron `/api/cron/scan`, bearer `CRON_SECRET`, 20 users/run), `runPendingScans`. Canonical complete status = `"complete"` (post plan 001).
- **Win-rate is computed in two places** with potentially different math: `optimization.ts:computeWinRate` and `product.ts` per-model rates. The measured before/after MUST use one shared function or the comparison is apples-to-oranges.
- **Report already hedges**: post-plan-011, `report.ts` exports the column as `winRateAfterEstimated` — so the UI/report layer already signals it's an estimate. Good anchor for a measured-vs-estimated distinction.

## Recommended design

### Trigger — piggyback on the daily scan (Candidate B), do NOT build a new cron

Two options were considered:
- **A**: a `followUpAt` timestamp + a new `/api/cron/optimization-lift` route.
- **B (recommended)**: after `runScanForUser` completes its sweep, recompute `winRateAfter` for any of that user's published optimizations whose `publishedAt` is older than the measurement window, using the simulations that scan just produced.

B wins because: it needs **zero new infrastructure**, **zero extra LLM calls** (it reuses the daily sweep's simulations — the scan already ran every product×competitor×model), and it naturally re-measures on every cycle. The only cost is a post-scan aggregation pass.

### Measurement window & sample

- "After" simulations = those belonging to scans created **after** `publishedAt`. Compute `winRateAfter` only from the most recent complete scan that post-dates the publish.
- Require a minimum sample (e.g. the product appears in ≥ N simulations in that scan) before writing a measured value; below that, leave `winRateAfter` null and surface "measuring…" in the UI.

### Schema delta

- Add `measuredAt: timestamp` to `listingOptimization` (when `winRateAfter` was last computed from real data).
- **Recommendation**: stop writing the estimate into `winRateAfter`. Keep `estimatedLift` (the projection) and make `winRateAfter` **null until measured**. The UI shows the estimate via `winRateBefore + estimatedLift` labeled "projected", and `winRateAfter` only once `measuredAt` is set, labeled "measured". This makes the two values honestly distinct (plan 011's `winRateAfterEstimated` column then splits into a projected and a measured column).

### Single source of truth for win-rate

- Extract one `winRate(productId, simulations)` helper (lift `optimization.ts:computeWinRate`) and have both `winRateBefore` capture and the follow-up measurement call it. Confirm `product.ts`'s per-model math agrees or document why it differs.

### Failure semantics

- Product/store deleted before measurement → leave optimization as-is (FK cascade already removes it if the product is deleted).
- Zero post-publish simulations → stay null, keep "measuring…".
- Re-publish before measurement → the 14-day `PUBLISH_COOLDOWN_MS` already gates this; reset `measuredAt`/`winRateAfter` to null on re-publish.

### Cost

Candidate B adds **no LLM calls** — it's an aggregation over simulations the daily scan already created. Confirmed against `background-scan.ts` (the scan persists all `simulation` rows; the follow-up just reads them).

## Open questions for the maintainer (with recommended defaults)

1. **Measurement window** — how long after publish before the first measured value counts? *Default: first complete scan ≥ 24h after `publishedAt`.*
2. **Show estimates as "after"?** — *Default: no; show projected vs measured as distinct, measured only once `measuredAt` set.*
3. **Minimum sample size** before writing measured lift — *Default: product present in ≥ 8 simulations in the post-publish scan.*
4. **Does Dominate-tier auto-publish need measured lift to gate anything?** — out of scope here; revisit once measurement exists.

## Follow-up implementation plan shape (when greenlit)

Depends on plan 001 (status literal) + plan 003 (tests). First step is the shared `winRate` helper; then the schema delta (`measuredAt`); then the post-`runScanForUser` aggregation; then UI split of projected/measured. Each step independently verifiable; the aggregation is unit-testable as a pure function over `simulation` rows.
