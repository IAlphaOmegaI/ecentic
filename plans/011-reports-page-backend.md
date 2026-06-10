# Plan 011: Make the Reports page real — CSV exports from live data, a working shareable report, and honest UI for what doesn't exist yet

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT update `plans/README.md` — the reviewer
> who dispatched you maintains the index.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- "apps/web/src/app/(main)/dashboard/reports" apps/web/src/server/app apps/web/src/server/utils`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (uses the canonical `"complete"` scan-status literal from plan 001 regardless of whether 001 has landed — writers already persist `"complete"`)
- **Category**: direction
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

`dashboard/reports/page.tsx` is a UI-only stub: seven hardcoded report cards with fabricated "Last generated: Today, 2:00 PM" timestamps, dead download buttons, a dead "Generate Shareable Report" button, and a dead "Set Up Weekly Digest" button. Users click and nothing happens — the page actively erodes trust in the rest of the dashboard. The maintainer decided to build it rather than strip it.

The MVP this plan ships: four report types backed by real data with working CSV downloads, a shareable win-rate report button wired to the already-existing public `/share/[scanId]` page, real data-freshness labels, and honest "coming soon" treatment for scheduling and PDF (which are deliberately deferred). Three of the seven fake report types (Category Benchmark, Model Drift History, UCP Compliance Audit) have no underlying data in the system at all and are removed.

## Current state

**The stub** — `apps/web/src/app/(main)/dashboard/reports/page.tsx` (218 lines, no imports from `@/server`):
- `:11-71` — `const reports = [...]` — 7 hardcoded entries with `_id: "r1"`–`"r7"`, fake `lastGenerated` strings, `formats: ["PDF", "CSV"]`, `tier` labels (`"all" | "compete" | "dominate"`).
- `:73-97` — `TierBadge` local component (keep — it's real presentational code).
- `:99-218` — anonymous default export, pure server-rendered markup using `Crosshair`, `SectionGutter`, `SectionKicker` from `../_components/grid`, `Button` from `@zenncore/web/components/button`, icons from `@zenncore/icons`. Section structure: header (with dead "Schedule Reports" button at `:116-118`), "Shareable Win Rate Report" card (dead button `:137-139`), "01 — Library" grid of report cards (dead format buttons `:178-187`), "02 — Automation" scheduled-reports section (dead button `:210-212`).

**Data sources that exist (all verified at planning time):**

- `apps/web/src/server/app/scan.ts`:
  - `:14-15` — `export const { get, paginate, create, update, destroy, exists, count, find } = repository(schema.scan);`
  - `:19-23` — `getForCurrentUser` (all scans for session user)
  - `:25-36` — `getLatest` (desc by `createdAt`, default limit 10)
  - Scan fields (`schema.ts:161-174`): `status`, `totalSimulations`, `completedSimulations`, `wins`, `losses`, `topFinding`, `createdAt`. **The canonical completed-status literal is `"complete"`** (writers at `background-scan.ts:192`, `simulate.ts:617`).
- `apps/web/src/server/app/simulation.ts`:
  - `:15` — `getForScan` (`{ scan: id }`), `:24` — `getForCompetitors` (`{ competitors: ids }`), `:36` — `getForProducts` (`{ products: ids }`)
  - Simulation fields (`schema.ts:197-214`): `scanId`, `productId`, `competitorId`, `model`, `winner` (`"product"` or `"competitor"`), `reasoning`, `productScore`, `competitorScore`.
- `apps/web/src/server/app/product.ts`:
  - `:16` — same repository re-export incl. `find`; `:19` — `export type Type`
  - `:21-26` — `skimForCurrentUser` is CAPPED at 10 — do NOT use it for reports; query all products with `find(Environment.SERVER, { where: eq(schema.product.userId, context.session.user.id) })`.
  - Product fields: `title`, `sku`, `price`, `currency`, `status`.
- `apps/web/src/server/app/competitor.ts`: `:18` — repository re-export incl. `find`; competitor fields: `title`, `brand`, `source`, `selected`.
- `apps/web/src/server/app/optimization.ts`: `:22` — `export type Type = Document<typeof schema.listingOptimization>;` and a module-local `find` from the repository. Record fields (`schema.ts:256-282`): `productId`, `status`, `winRateBefore`, `estimatedLift`, `winRateAfter`, `publishedAt`. **`winRateAfter` is currently an estimate written at publish time** (see plan 009) — the CSV column must be named `winRateAfterEstimated` until measurement lands.
- **Shareable report already exists**: public page `/share/[id]` (`apps/web/src/app/(auth)/share/[id]/page.tsx`) renders `Scan.getShareData` for any scan with `status === "complete"`; the route is public in `proxy.ts:30`. The "Generate Shareable Report" button only needs to become a link to `/share/${latestCompleteScanId}`.

**Page conventions to match** — `apps/web/src/app/(main)/dashboard/page.tsx` is the exemplar:
- `page.tsx` is a server component: static shell rendered directly, each data block an async server component wrapped in `<Suspense fallback={<skeleton matching shape />}>`.
- Server components: `import * as Scan from "@/server/app/scan";` (namespace), data read via `await unwrapResult(Scan.getLatest(Environment.SERVER))` (`unwrapResult` from `@zenncore/utils`, `Environment` from `@/server/utils/environment`).
- Client components live in `_components/` next to the page, marked `"use client"`, import server actions as values only when calling them; exemplar client component: `dashboard/_components/overview-actions.tsx`.
- Styling: semantic tokens only (`text-foreground`, `bg-background-rich`, `border-accent-foreground`) — the existing reports page markup already does this; preserve its visual structure.

**zenn-style conventions (mandatory — the user's house style):**
- `const` only, never `let`. No abbreviated names. Single-word variable names where possible (`scans`, `rows`, `download`).
- Result pattern: never name a binding `xResult`; read `.data` inline: `const scans = await Scan.getForCurrentUser(Environment.SERVER); if (!scans.success) return scans;`
- No explicit return-type annotations on `withAuthentication`/`withContext` callbacks.
- Fire-and-forget async in client handlers: `void (async () => { ... })();` with `resultify` for fallible work.
- Derive, don't mutate: `.filter().length`, `Object.fromEntries`, `.map` — no counter loops.
- Static data outside components with `as const`. Components: named exports, arrow functions, implicit return when JSX-only. Anonymous default export only for `page.tsx`.

## Commands you will need

| Purpose   | Command                              | Expected on success |
|-----------|--------------------------------------|---------------------|
| Install   | `bun install` (repo root)            | exit 0              |
| Typecheck | `cd apps/web && bun run typecheck`   | exit 0, no errors   |
| Lint      | `bun run lint` (repo root)           | exit 0              |
| Tests     | `cd apps/web && bun test src`        | all pass            |
| Dev boot  | `bun run dev:web`                    | reports page renders |

## Scope

**In scope** (the only files you should modify/create):
- `apps/web/src/server/utils/csv.ts` (create — pure CSV serializer)
- `apps/web/src/server/utils/csv.test.ts` (create)
- `apps/web/src/server/app/report.ts` (create — the four report actions)
- `apps/web/src/app/(main)/dashboard/reports/page.tsx` (rebuild)
- `apps/web/src/app/(main)/dashboard/reports/_components/report-actions.tsx` (create — client download buttons)

**Out of scope** (do NOT touch, even though they look related):
- PDF generation — deferred entirely; no PDF buttons remain.
- Scheduled reports / weekly digest email — deferred; the section stays as an honest "coming soon" placeholder with NO interactive button.
- `apps/web/src/app/(auth)/share/[id]/page.tsx` and `Scan.getShareData` — reused as-is.
- `optimization.ts`, `product.ts`, `scan.ts`, `simulation.ts`, `competitor.ts` — read-only dependencies; add nothing to them.
- The `subscription`/tier gating of report types — tier badges remain informational only (gating is a product decision not yet made).

## Git workflow

- Branch: `advisor/011-reports-page-backend`
- Commit style: `feat: back the reports page with real CSV exports and share link`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Pure CSV serializer + tests

Create `apps/web/src/server/utils/csv.ts` (no `"use server"` — pure module):

```ts
export type Row = readonly (string | number | null | undefined)[];

const escape = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const serialize = (headers: readonly string[], rows: readonly Row[]) =>
  [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
```

Create `apps/web/src/server/utils/csv.test.ts` using `bun:test` covering: plain rows; a value containing a comma; a value containing a double quote (doubled in output); a value containing a newline (wrapped in quotes); `null`/`undefined` → empty cell; numbers serialized without quotes.

**Verify**: `cd apps/web && bun test src/server/utils/csv.test.ts` → all pass (≥ 6 tests).

### Step 2: Report actions

Create `apps/web/src/server/app/report.ts` starting with `"use server"`, following the structure of `scan.ts` (namespace imports, `withAuthentication`, Result returns). Four exported actions, each returning `{ success: true, data: { filename, content } }` where `content` is the CSV string from `serialize`:

1. **`exportWinRateSummary`** — `Scan.getLatest(Environment.SERVER, { limit: 1000 })`, filter `status === "complete"`. If none: `return { success: false, error: new NotFoundError("Scan") };` (import from `../utils/error` — match `scan.ts:9`). For the most recent complete scan, fetch `Simulation.getForScan(Environment.SERVER, { scan: scan.id })` and emit per-model rows — headers `["model", "wins", "losses", "winRate"]` — derived with `Object.fromEntries`/`filter` math (model the computation on `Scan.getShareData`, `scan.ts:76-98`), plus a final `"total"` row. Filename: `win-rate-summary.csv`.
2. **`exportProductPerformance`** — all products via `Product.find(Environment.SERVER, { where: eq(schema.product.userId, context.session.user.id) })` (NOT the capped skim), then `Simulation.getForProducts` with their ids. Headers `["title", "sku", "price", "currency", "simulations", "winRate", "gpt4", "claude", "gemini", "perplexity"]`; per-product win rates derived by filtering that product's simulations (overall and per `model` value — the model ids in data are `gpt4`, `claude`, `gemini`, `perplexity`, see `product.ts:110-113`). Rate is `Math.round((wins / total) * 100)`, empty string when a product has zero simulations. Filename: `product-performance.csv`.
3. **`exportCompetitorAnalysis`** — all competitors via `Competitor.find(...)` (same `where` shape), then `Simulation.getForCompetitors`. Headers `["title", "brand", "source", "simulations", "winRateAgainstYou"]` where `winRateAgainstYou` = percentage of that competitor's simulations with `winner === "competitor"`. Filename: `competitor-analysis.csv`.
4. **`exportOptimizationImpact`** — `listingOptimization` rows for the user. `optimization.ts` does not re-export its repository, so query directly in `report.ts`: `const { find } = repository(schema.listingOptimization)` is NOT possible without importing `repository` — instead import `repository` from `../utils/repository` and create a module-local `const records = repository(schema.listingOptimization)` mirroring how other modules do it, then `records.find(...)` by `userId`. Resolve product titles via `Product.find` and a `Map` keyed by id. Headers `["product", "status", "winRateBefore", "estimatedLift", "winRateAfterEstimated", "publishedAt"]` (`publishedAt` as ISO string or empty). Filename: `optimization-impact.csv`.

Also export one read action for the page shell:

5. **`getAvailability`** — returns `{ scan, products, competitors, optimizations }`: the latest complete scan (or `null`) and the three counts, so the page can render data-freshness and disable empty reports. Use `Promise.all` over the count/find calls (zenn-style §25).

Every action: check each Result with `if (!x.success) return x;` before using `.data`. No `try/catch` anywhere.

**Verify**: `cd apps/web && bun run typecheck` → exit 0.

### Step 3: Client download component

Create `apps/web/src/app/(main)/dashboard/reports/_components/report-actions.tsx`, `"use client"`, modeled on `dashboard/_components/overview-actions.tsx`. Export two components:

1. **`ReportDownload`** — props `{ report: "winRateSummary" | "productPerformance" | "competitorAnalysis" | "optimizationImpact"; disabled?: boolean }`. Renders the existing format-button markup (one `CSV` button — copy the button styles from the stub's `:179-187`). On click:

```tsx
  const [pending, setPending] = useState(false);

  const download = () => {
    setPending(true);
    void (async () => {
      const generated = await actions[report]();
      setPending(false);
      if (!generated.success) return;

      const blob = new Blob([generated.data.content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = generated.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    })();
  };
```

with `const actions = { winRateSummary: Report.exportWinRateSummary, ... } as const;` at module level (value import: `import * as Report from "@/server/app/report";` — this is a client component that CALLS the actions, so the value import is correct here, matching how other client components invoke server actions). Disable the button while `pending` or when `disabled`.

2. **`ShareReport`** — props `{ scan: string | null }`. When `scan` is set, render the existing "Generate Shareable Report" button as a `Link` (`next/link`) to `/share/${scan}` with `target="_blank"`; when `null`, render the button disabled with the label "Run a scan first".

**Verify**: `cd apps/web && bun run typecheck` → exit 0.

### Step 4: Rebuild the page

Rewrite `apps/web/src/app/(main)/dashboard/reports/page.tsx` preserving the existing visual structure (header / share card / library grid / automation section, same grid-border classes) with these changes:

1. Keep the static shell (headings, kickers) rendered directly in the default export; move data-dependent regions into async server components in the same file, each wrapped in `<Suspense>` with a skeleton matching its shape (follow `dashboard/page.tsx`).
2. The `reports` static array shrinks to the four real entries (`winRateSummary`, `productPerformance`, `competitorAnalysis`, `optimizationImpact`), keeping `title`, `description`, `tier`; drop `lastGenerated` and `formats` (CSV is the only format; the download button comes from `ReportDownload`). Keep `TierBadge` as-is.
3. An async `Availability`-style server component fetches `await unwrapResult(Report.getAvailability(Environment.SERVER))` and renders:
   - the header status line: `Data as of {formatRelativeTime(scan.createdAt)}` when a complete scan exists (`formatRelativeTime` from `@/lib/date`, as used by `dashboard/page.tsx`), else "No completed scans yet";
   - the library grid, passing `disabled` to `ReportDownload` for reports whose source is empty (no scan → all four disabled; zero optimizations → optimization report disabled);
   - `<ShareReport scan={scan?.id ?? null} />` in the share card.
4. Remove the dead header "Schedule Reports" button. The "02 — Automation" section keeps its heading and replaces the dead button with static copy: `Scheduled reports and the weekly digest are coming soon.` — no `Button`.
5. The status literal anywhere in this page is `"complete"`.

**Verify**:
- `cd apps/web && bun run typecheck` → exit 0
- `bun run lint` → exit 0
- `grep -n "lastGenerated\|Set Up Weekly Digest\|r5\|r6\|r7" "apps/web/src/app/(main)/dashboard/reports/page.tsx"` → no matches

### Step 5: Behavioral smoke check

With `bun run dev:web` and a signed-in session against the dev database:
1. `/dashboard/reports` renders with real freshness text (or the no-scans state).
2. Clicking CSV on "Win Rate Summary" downloads a non-empty `win-rate-summary.csv` whose header row matches Step 2.
3. "Generate Shareable Report" opens `/share/<id>` showing the scan.
If no dev database/session is available, record that this step was skipped and rely on the typecheck + tests gates.

## Test plan

- `csv.test.ts` (Step 1): 6 serializer cases — the only pure unit surface; the report actions are `"use server"` modules and not importable under `bun test` (same constraint documented in plan 003).
- Manual smoke (Step 5) covers the wiring.
- Verification: `cd apps/web && bun test src` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd apps/web && bun test src` exits 0 incl. ≥ 6 new csv tests
- [ ] `cd apps/web && bun run typecheck` exits 0
- [ ] `bun run lint` exits 0
- [ ] `grep -c "export const export" apps/web/src/server/app/report.ts` outputs `4` and `grep -n "getAvailability" apps/web/src/server/app/report.ts` matches
- [ ] `grep -n "use client" "apps/web/src/app/(main)/dashboard/reports/page.tsx"` → no matches (page stays a server component)
- [ ] `grep -rn "PDF" "apps/web/src/app/(main)/dashboard/reports"` → no matches
- [ ] `grep -n '"completed"' "apps/web/src/app/(main)/dashboard/reports/page.tsx" apps/web/src/server/app/report.ts` → no matches
- [ ] No files outside the in-scope list are modified (`git status`)

## STOP conditions

Stop and report back (do not improvise) if:

- `Simulation.getForProducts` / `getForCompetitors` signatures don't match the `{ products: ids }` / `{ competitors: ids }` shapes shown in "Current state" (drift) — check `simulation.ts:24-50` first.
- The repository `find` re-exports on `product.ts:16` / `competitor.ts:18` reject a `where` clause built with `eq` from `drizzle-orm` (check how `scan.ts:19-23` builds its `where` and mirror it exactly; if that fails, stop).
- Client value-import of `@/server/app/report` causes a build error about server-only modules — the repo's convention may require invoking actions differently; find one existing client component that calls a `withAuthentication` action (e.g. under `dashboard/ucp/_components/` or `onboarding/`) and mirror it; if none exists, stop and report.
- Any report needs data the schema doesn't hold (you should not need new columns — if you think you do, stop).

## Maintenance notes

- PDF export and scheduled email digests are the deferred halves; when built, they should reuse `report.ts`'s data assembly (keep CSV shaping separate from data gathering if PDF lands).
- The `winRateAfterEstimated` column name must flip to a measured value when plan 009's follow-up lands — grep for it then.
- Reviewer should scrutinize: no capped `skim*` call sneaked into a report (silent truncation), every Result checked before `.data`, the page remained a streaming server component, and the removed report types didn't leave orphan imports.
