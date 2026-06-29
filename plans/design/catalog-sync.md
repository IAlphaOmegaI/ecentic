# Design spike: scheduled catalog re-sync + Shopify product webhooks

Spike for plan 010. Investigation + recommendation only — no code. Written 2026-06-10 against `df39e96` / `advisor/integrate`.

## Problem

Catalogs are synced once (onboarding or manual), then never again. Merchants add/change/remove products continuously; Ecentic never notices, so scans run on stale data and new products are never simulated. `docs/context/idea.md` (Catalog Sync on Interval & Webhooks) promises a 12-hour re-sync, Shopify `products/create|update|delete` webhooks, and feed re-fetch. The rails mostly exist — they're just not wired for ongoing sync.

## Facts established (with file:line)

1. **A webhook receiver exists but handles only GDPR topics.** `apps/web/src/app/(provider)/api/integrations/shopify/webhooks/route.ts` reads `x-shopify-topic` (`:86`), and its `switch` (`:99`) handles only `customers/data_request`, `customers/redact`, `shop/redact` (`:100-104`); everything else → "Unknown topic". HMAC verification is already implemented in this route (reuse it; don't duplicate). **No `products/*` topics.**
2. **No product-webhook registration.** No code subscribes Shopify product topics. (Registration must be added — see below.)
3. **Sync primitives exist and dispatch by platform.** `store.ts:35-41` — `Store.syncProducts({ store })` switches on `store.platform` → `Shopify.syncProducts` / `WooCommerce.syncProducts` / `Feed.syncProducts`. `Shopify.syncShopifyCatalog` (`shopify.ts:77`) does the paginated fetch + upsert; also invoked from the OAuth callback (`shopify.ts:480`) and token-refresh path (`:240`).
4. **`lastSyncedAt` is WRITTEN by every sync path** (`shopify.ts:228`/`:1163`, `woocommerce.ts:182`, `feed.ts:162`, `csv.ts:106`) but **read by nothing** — there is no staleness check or scheduled trigger. It's a ready-made cursor for a re-sync cron.
5. **Only one cron route exists**: `/api/cron/scan` (bearer `process.env.CRON_SECRET`). **No `vercel.json`** in the repo — so the daily scan's *schedule* is configured outside the repo (Vercel dashboard) or not at all. **Open question for the owner.**
6. **Write-back primitives exist**: `Shopify.updateProduct` (`shopify.ts:947`), `WooCommerce.updateProduct` (`woocommerce.ts:316`) — used by the optimize/publish flow. (Relevant: a background sync must not clobber a just-published optimization.)
7. **Shopify Admin API version** is pinned `2026-04` (`shopify.ts:34`, `API_VERSION`). Webhook payload shapes are version-bound to this.
8. **`@upstash/redis`** is already a dependency (used for tracking rate-limit counters) — available for a per-store sync lock.

## Recommended design

### 1. Scheduled re-sync — mirror the existing scan cron

- New route `GET /api/cron/sync` mirroring `/api/cron/scan` exactly (bearer `CRON_SECRET`). It selects stores whose `lastSyncedAt` is older than the interval (now finally *reading* the column), batched with a limit, and calls `Store.syncProducts({ store })` per store (dispatch already handled in `store.ts`).
- **Failure isolation**: one store's auth/refresh failure must not abort the batch — wrap each store's sync in a Result and continue (same shape as `runScanDaily`'s `reduce`).
- **Schedule**: add a `vercel.json` `crons` entry (the repo currently has none) for both `/api/cron/scan` and `/api/cron/sync`, OR document wherever the existing scan cron is scheduled. **Resolve fact #5 first.**

### 2. Product webhooks — extend the existing route

- Add `products/create`, `products/update`, `products/delete` cases to the existing `switch (topic)` in the webhooks route (reusing its HMAC verification). Map onto existing upsert primitives — `create`/`update` → upsert that product by `externalId`; `delete` → soft-delete (see #4).
- **Registration**: subscribe the three topics during the OAuth callback (`shopify.ts:480` region, where `syncShopifyCatalog` already runs post-install), PLUS a one-time idempotent re-registration sweep for already-connected stores. Check whether new OAuth **scopes** are needed (fact: registration uses the Admin API; confirm current granted scopes in the install route — a new scope means merchant re-consent).

### 3. Concurrency control — Upstash lock

- A webhook-triggered sync can race the scheduled full re-sync or a manual sync. Use an Upstash `SET key NX PX <ttl>` lock keyed `sync:lock:<storeId>` (the codebase already uses Upstash for rate limiting). Skip-or-queue if locked. Name the key namespace with a second consumer in mind (competitor monitoring will want the same).

### 4. Deletion semantics — soft-delete

- Upstream product deletion → set `product.status` to an inactive value rather than hard `DELETE`. Rationale: `simulation` has `onDelete: cascade` from `product` and `agentVisit` has `onDelete: set null` — a hard delete would silently erase historical simulation/lift data. Soft-delete preserves history; exclude inactive products from new scans.

### 5. Idempotency / replay

- Shopify retries webhooks; upsert-by-`externalId` is naturally idempotent for create/update. For delete, soft-delete is idempotent. No separate dedupe table needed if upserts key on `externalId`.

### 6. Feed & WooCommerce stores

- Feed stores: re-fetch + re-parse on the same `/api/cron/sync` path (dispatch already routes to `Feed.syncProducts`). Interaction with **plan 007's `FEED_BYTE_LIMIT`** — the cron re-fetch inherits the same size cap; fine.
- WooCommerce: no webhooks (no equivalent); relies on the scheduled re-sync only. Document that WooCommerce catalog freshness = the cron interval.

### 7. Cost & limits

- Shopify Admin API rate limits per sync batch — keep the existing pagination in `syncShopifyCatalog`; tune the cron batch size (stores per run) like `runScanDaily`'s limit of 20. Default interval 12h per idea.md.

## Open questions for the maintainer (recommended defaults)

1. **How is `/api/cron/scan` scheduled today?** (No `vercel.json` exists.) — *Default: add `vercel.json` crons for both scan and sync; if a different scheduler is used, document it.*
2. **Do product webhooks require a new OAuth scope?** — confirm against the install route's requested scopes; if yes, plan the merchant re-consent.
3. **Sync interval** — global vs per-store configurable? *Default: global 12h via `lastSyncedAt` cursor; make it an env var.*
4. **Delete = soft or hard?** *Default: soft (`product.status`), to preserve simulation/lift history.*
5. **Should a newly-synced product auto-enter the next scan?** (idea.md promises it.) *Default: yes, if it matches existing selection; surface a notification — but scope that as a follow-up, not this build.*

## Follow-up implementation plan shape (when greenlit)

Depends on plan 003 (tests). Reuses the webhooks route's HMAC verification (do not duplicate). Order: (1) `/api/cron/sync` route + `lastSyncedAt` staleness query + failure-isolated batch; (2) Upstash sync lock; (3) product-webhook topics + registration + soft-delete; (4) `vercel.json` cron config. Competitor monitoring (idea.md §5) is a separate spike that will reuse the same cron + lock infrastructure.
