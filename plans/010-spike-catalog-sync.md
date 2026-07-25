# Plan 010 (spike): Design scheduled catalog re-sync and Shopify product webhooks

> **Executor instructions**: This is an investigation/design spike, NOT an
> implementation plan. The deliverable is a design document plus (optionally)
> a draft follow-up implementation plan. Modify NO source code. Follow the
> steps, honor STOP conditions, and update this plan's row in
> `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- "apps/web/src/app/(provider)/api" apps/web/src/server/app/integration`
> Drift here doesn't block the spike — but read the changed files before
> relying on the excerpts below.

## Status

- **Priority**: P2
- **Effort**: M (investigation + design doc)
- **Risk**: LOW (read-only spike; the eventual feature is MED — concurrent sync races)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

Simulations are only as good as the catalog they run on, and the catalog is synced exactly once — at onboarding or manual trigger. Merchants add products, change prices, and retire items continuously; ecentic never notices, so scans compare stale data and new products are never simulated. The product spec (`docs/context/idea.md`, "Catalog Sync on Interval & Webhooks") promises a 12-hour scheduled re-sync, Shopify `products/create|update|delete` webhooks, and feed re-fetch. The schema is already prepared (`store.lastSyncedAt`, `schema.ts:93`) and an HMAC-verified Shopify webhook receiver already exists — it just only handles the three mandatory GDPR topics. This spike designs the sync layer on top of those existing rails.

## Current state (verified at planning time)

- **Webhook receiver exists, GDPR-only**: `apps/web/src/app/(provider)/api/integrations/shopify/webhooks/route.ts` — reads the `x-shopify-topic` header, verifies HMAC, then:

```ts
  switch (topic) {
    case "customers/data_request":
    ...
    case "customers/redact":
    ...
    case "shop/redact":
    ...
    default:
      // responds with `Unknown topic: ${topic}`
```

No `products/*` topics. (Whether webhook *registration* with Shopify happens anywhere — e.g. during OAuth callback — must be confirmed in Step 1; planning-time grep found no `webhooks` references in `integration/shopify.ts`.)

- **Cron pattern exists**: `apps/web/src/app/(provider)/api/cron/scan/route.ts` — GET, `Bearer ${process.env.CRON_SECRET}` auth, calls one background action with a limit. A sync cron can mirror this exactly. No deployment cron config was found in-repo (no `vercel.json`) — confirm how `/api/cron/scan` is actually scheduled (Vercel dashboard?) and document it.
- **Sync primitives exist**: `integration/shopify.ts:77` `syncShopifyCatalog` (paginated product fetch + upsert), `:238` `syncProducts` (authenticated wrapper), `:248` `refreshAccessToken` (token refresh flow — relevant: a 12-hour cron will hit expired tokens); `integration/woocommerce.ts:66` `syncWooCommerceCatalog`; `integration/feed.ts` for feed stores. `store.platform` discriminates.
- **Timing column unused**: `store.lastSyncedAt` (`schema.ts:93`) exists; confirm in Step 1 whether anything writes it.
- **Known sharp edges to design around:**
  - Concurrency: a webhook-triggered sync racing the 12-hour full re-sync, or a user-triggered manual sync racing either. The scan layer has a precedent guard (`Scan.findRunningForUser`).
  - Deletion semantics: `syncShopifyCatalog`'s upsert behavior on products that disappeared upstream (does it delete? orphan? — characterize in Step 1). Deleted products have FK references from `simulation` (cascade) and `agentVisit` (`set null`).
  - Webhook idempotency/replay: Shopify retries webhooks; the handler must tolerate duplicates.
  - Shopify API versioning: webhook payload shape is API-version-pinned; note which Admin API version the existing integration targets.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Find registration | `grep -rn "webhook" apps/web/src/server/app/integration apps/web/src/app` | full webhook surface |
| Find lastSyncedAt writers | `grep -rn "lastSyncedAt" apps/web/src` | whether it's ever written |
| Find sync callers | `grep -rn "syncShopifyCatalog\|syncWooCommerceCatalog\|syncProducts" apps/web/src` | every trigger path |

## Scope

**In scope (deliverables — the only files you create/modify):**
- `plans/design/catalog-sync.md` (create)
- `plans/010a-catalog-sync.md` — OPTIONAL draft implementation plan, only if no open blockers remain
- `plans/README.md` (status row + link)

**Out of scope:**
- ALL source code.
- Competitor re-scraping/monitoring (a separate idea.md section — note as future work only).
- New-product auto-inclusion notifications (idea.md promises them; list under future work, don't design).

## Steps

### Step 1: Establish the facts

Read in full: the webhooks route, `integration/shopify.ts` (sync + OAuth callback + token refresh), `integration/woocommerce.ts`, `integration/feed.ts`'s fetch path, the cron route, and `store`/`store_account` schema. Answer in the design doc, each with `file:line` evidence:

1. Is any webhook topic registered with Shopify today (OAuth callback? manual?), and if so where?
2. What does `syncShopifyCatalog` do with upstream-deleted products?
3. What writes `lastSyncedAt` (if anything)?
4. How does token refresh interact with a background (non-user-session) sync?
5. How is `/api/cron/scan` scheduled in deployment (check `vercel.json`, Vercel docs conventions, and ask-the-operator note if undeterminable)?
6. Which Shopify Admin API version do the existing calls pin?

### Step 2: Design the sync layer

Sections required, each ending in a concrete recommendation:

1. **Scheduled re-sync**: a `GET /api/cron/sync` route mirroring the scan cron — selection query (stores with `lastSyncedAt` older than the interval, batched with a limit), per-platform dispatch via `store.platform` (`switch`), `lastSyncedAt` write-back, failure isolation (one store's auth failure must not abort the batch).
2. **Webhook topics**: extending the existing route's `switch (topic)` with `products/create`, `products/update`, `products/delete`; registration strategy (subscribe during OAuth callback + an idempotent re-registration sweep for already-connected stores); per-topic handling mapped onto the existing upsert primitives.
3. **Concurrency control**: per-store sync lock (recommend the mechanism — e.g. an Upstash Redis `SET NX PX` key, given `@upstash/redis` is already a dependency and is used for tracking rate limits).
4. **Deletion semantics**: what happens to simulations/history when a product disappears (recommend soft-delete via `product.status` vs hard delete, with the FK cascade implications from Current state).
5. **Idempotency**: webhook replay tolerance (upsert-by-`externalId` semantics; whether a dedupe key is needed).
6. **Feed stores**: re-fetch on the same cron path, noting interaction with plan 007's size cap.
7. **Cost & limits**: Shopify rate limits per sync batch; recommended batch size and interval default (12h per idea.md, but justify or adjust).

### Step 3: Open questions for the maintainer

Each with a recommended default — e.g. interval configurability per store vs global, whether deletes should remove products from active scans immediately, whether webhook registration needs a new OAuth scope (and the merchant re-consent that implies — check current scopes in the install route).

## Done criteria

- [ ] `plans/design/catalog-sync.md` exists with: Step 1's six answered fact-questions (with `file:line` evidence), Step 2's seven design sections with recommendations, Step 3's open questions with defaults
- [ ] No source files modified (`git status` shows only `plans/`)
- [ ] `plans/README.md` row updated, linking the design doc

## STOP conditions

- Step 1 reveals product webhooks ARE already registered and handled somewhere planning-time search missed — report; the spike narrows to the scheduled-sync half.
- The Shopify integration's token model can't support background refresh (e.g. online-mode tokens only) — that's a prerequisite finding bigger than this spike; surface it before designing around it.

## Maintenance notes

- The follow-up implementation should depend on plan 003 (test infra) and reuse the webhooks route's existing HMAC verification rather than duplicating it.
- Competitor monitoring (idea.md §5) will want the same cron + lock infrastructure — design the lock key naming with a second consumer in mind.
