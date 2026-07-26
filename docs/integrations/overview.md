# Store Integrations — Progress Tracker

> Last updated: 2026-03-21

---

## Overview

ecentic supports connecting to external product catalogs via four live integrations and has two planned providers on the roadmap.

| Provider | Mode | Status |
|---|---|---|
| Shopify | OAuth 2.0 | Live |
| WooCommerce | REST API (Basic Auth) | Live |
| Custom Feed | URL fetch (XML / JSON) | Live |
| CSV Upload | File upload (client-side parse) | Live |
| BigCommerce | REST API | Coming Soon |
| Amazon Seller Central | SP-API | Coming Soon |

---

## Live Integrations

### Shopify

**Mode:** OAuth 2.0 — redirect-based app install flow

**Scopes:** `read_products`, `write_products`, `read_script_tags`, `write_script_tags`

**API version:** `2024-10`

#### What's done

- [x] OAuth install route — sanitises shop domain, generates nonce, redirects to Shopify authorize endpoint
- [x] OAuth callback route — verifies HMAC + state cookie, exchanges code for access token, creates store record
- [x] GDPR compliance webhooks — `customers/data_request`, `customers/redact`, `shop/redact`
- [x] `syncProducts()` — paginated import up to 10 pages / 2,500 products; maps title, description, price, compareAtPrice, images, handle, SKU, status
- [x] `syncShopifyCatalog()` runs automatically after OAuth (same as WooCommerce/feed calling `Store.syncProducts` after connect)
- [x] `updateProduct()` — write-back of optimised title/description to Shopify via `PUT /admin/api/2024-10/products/{id}.json`
- [x] AI agent traffic (Layer 1) — `tracker.js` via ScriptTag, beacon to `POST /api/tracking/agent-visit`, `store.trackerApiKey` + `storefrontHosts` from `shop.json`
- [x] Optional env `ECENTIC_TRACKER_PROBE=true` — appends `&probe=1` to the ScriptTag URL so every storefront page sends a `probe-ping` event (use only for staging/debug; confirms CORS + DB without spoofing an AI user-agent)
- [x] Optional env `ECENTIC_TRACKER_PUBLIC_ORIGIN` — HTTPS tunnel origin for `tracker.js` ScriptTag when `APP_HOST` is `http://localhost` (avoids mixed-content blocking on HTTPS Shopify)
- [x] Onboarding form — accepts shop domain, redirects to install route
- [x] Onboarding page with instructions and OAuth flow explanation

#### What's missing

- [x] Optimization Center (`/dashboard/optimize`) — real queue from simulations + `listing_optimization`; Approve runs AI listing generation then `Store.publishProductListing()`
- [ ] Webhook subscriptions for real-time product changes
- [ ] App install/uninstall lifecycle webhooks
- [ ] Inventory and stock level sync
- [ ] Order or customer data access (intentionally out of scope per Shopify listing)
- [ ] Token expiry detection and reconnection flow
- [ ] Sync scheduling / automation

#### AI traffic — how user-agent is detected (storefront)

- The ScriptTag loads `tracker.js` from your app origin; it reads **`navigator.userAgent`** and **`document.referrer`** in the browser (Shopify does not expose server access logs).
- A beacon is sent only when the UA matches a known AI/crawler pattern, the referrer matches a known AI domain, or **`probe=1`** is on the script URL (see above).
- Normal Chrome sessions usually produce **no** events — that is expected. To test: use DevTools **Network conditions** with a custom UA containing e.g. `ChatGPT-User` or `Googlebot`, or enable probe mode temporarily.

#### Local dev (`localhost:3000`) + HTTPS Shopify storefront

- Keep `APP_HOST` / `BETTER_AUTH_BASE_URL` as `http://localhost:3000` for OAuth and the app UI.
- Browsers **block** loading `http://localhost/tracker.js` from an **HTTPS** Shopify page (mixed content), so the ScriptTag must use an **HTTPS** origin that forwards to your dev server.
- Set **`ECENTIC_TRACKER_PUBLIC_ORIGIN`** to that HTTPS base URL with **no** trailing slash, e.g. `https://abcd-efgh.ngrok-free.app` (ngrok, Cloudflare Tunnel, etc. pointing at port 3000).
- **Reconnect** Shopify OAuth after changing this env so the ScriptTag `src` is recreated.
- The tracker script uses its own `script.src` origin for beacons, so `tracker.js` and `/api/tracking/agent-visit` are both hit via the tunnel when the tag loads from the tunnel.

---

### WooCommerce

**Mode:** REST API with Basic Auth (Consumer Key + Consumer Secret)

**API base:** `/wp-json/wc/v3/`

#### What's done

- [x] Credential validation — probes `/wp-json/wc/v3/products?per_page=1` before storing
- [x] `connect()` — validates credentials, creates store record
- [x] `syncProducts()` — paginated import up to 20 pages / 2,000 products; maps name, slug, description, SKU, price, regular_price, sale_price, images, status
- [x] Price comparison — sets `compareAtPrice` from `regular_price` vs `price`
- [x] Status mapping — `publish` → `active`, all others → `draft`
- [x] Domain normalisation — adds `https://` prefix if missing
- [x] Error distinction — 401 (invalid credentials) vs other HTTP errors
- [x] Onboarding form — accepts site URL, consumer key, consumer secret
- [x] Onboarding page with REST API key generation instructions
- [x] `updateProduct()` — write-back of optimised title/description via `PUT /wp-json/wc/v3/products/{id}.json` (maps `title` → `name`, `body_html` → `description`, same payload shape as Shopify)
- [x] `Store.publishProductListing()` — dispatches to Shopify or WooCommerce `updateProduct` with ownership checks

#### What's missing

- [ ] Product variant and attribute sync (currently only first variant price is used)
- [ ] Inventory and stock sync
- [ ] Webhook subscriptions for real-time updates
- [ ] Credential rotation / re-authentication flow

---

### Custom Feed

**Mode:** URL fetch — auto-detects XML (Google Shopping / RSS / Atom) or JSON

#### What's done

- [x] Format auto-detection — checks first non-whitespace character (`<` → XML, else JSON)
- [x] XML parser — handles `<rss><channel>` (RSS) and `<feed>` (Atom) roots; supports `<item>` and `<entry>` elements
- [x] Google Shopping namespace support — `g:title`, `g:price`, `g:image_link`, `g:link`, `g:id` with non-namespaced fallbacks
- [x] JSON parser — supports root array, `{products: [...]}`, and `{items: [...]}` shapes; maps `title|name`, `price`, `image|image_url|imageUrl`, `url|link`, `sku|id`
- [x] `connect()` — validates feed URL by fetching and parsing; returns error if no products detected
- [x] `syncProducts()` — re-fetches and re-parses on demand
- [x] Onboarding form — URL input with Zod URL validation
- [x] Onboarding page with Google Shopping XML and JSON format documentation
- [x] Currency default — all products assigned `USD` (hardcoded)

#### What's missing

- [ ] Scheduled / periodic refresh (currently one-time fetch per manual sync)
- [ ] Incremental sync — full re-import on every sync, no differential
- [ ] Currency detection from feed data
- [ ] Limited error recovery — sync failure marks store as `"error"` with no retry logic
- [ ] Support for additional feed formats (e.g. Bing Merchant Center, Facebook Catalog)

---

### CSV Upload

**Mode:** File upload — client-side parse, server-side insert

#### What's done

- [x] Client-side CSV parser — quote-aware, handles embedded commas, strips BOM
- [x] Header detection — case-insensitive, strips quotes; requires at least `title` or `name` column
- [x] Supported columns: `title` / `name`, `description`, `price`, `sku`, `image`, `url`, `id`
- [x] Live preview — shows detected product count before submission
- [x] `connect()` — creates store record with name derived from filename (`.csv` suffix stripped)
- [x] `syncProducts()` — accepts in-memory product array, inserts directly (no re-fetch)
- [x] Onboarding form — file input restricted to `.csv`, preview count displayed
- [x] Onboarding page with expected column reference

#### What's missing

- [ ] Re-sync after initial upload (user must re-upload file to update products)
- [ ] Validation beyond minimum product count (e.g. price format, URL validity)
- [ ] Batch edit or column remapping UI
- [ ] Support for TSV or Excel formats

---

## Channel Integrations

### Google Merchant Center (Google Shopping)

**Mode:** Hybrid channel partner — the store's native Google plugin owns the
primary feed; ecentic links the merchant's account to our MCA
(`accountManagement`) and pushes attribute overrides through a supplemental
data source. Full spec + spike results: `google-merchant-center.md`.

**Availability:** Shopify only (spike-validated on a live account).
**WooCommerce: coming soon** — blocked on spike 2 (offer-ID format, feed-label
convention, rule-patch acceptance unverified). Feed/CSV stores have no native
Google plugin and would need Path 2 (not built).

#### What's done

- [x] Merchant OAuth (scope `content`) — install/callback routes, refresh-token storage on `google_merchant_account`
- [x] Account detection (`accounts.list`) with adopt/poll/picker routing
- [x] `services:propose` accountManagement link + approval polling
- [x] Provisioning with hard rule gate — supplemental data source + primary `defaultRule` read-modify-write patch (spike 1: auto-pickup never happens)
- [x] Override push — offer IDs read from the live account, policy lint before insert, hash-skip idempotency, `google_merchant_offer` lifecycle rows
- [x] Async verification — `pending → live` gated on `productStatus.lastUpdateDate` advancing past the push (reprocessing is lazy: hours)
- [x] Rule-position watchdog with auto-repair (`checkRuleHealth`)
- [x] Maintenance cron — `/api/cron/google-merchant` (approval poll + rule watchdog + verification, Bearer `CRON_SECRET`)
- [x] Settings UI — Google Shopping controls per store row (connect → detect → link → provision → push/verify), coming-soon state for unsupported platforms
- [x] Diagnostics pull (account issues + item-level issues + disapproval counts)

#### What's missing

- [ ] WooCommerce support (spike 2 first)
- [ ] Path 2 — full API provisioning for stores without the native plugin (`createAndConfigure`, verifySelf, ToS, site verification, claim)
- [ ] Diagnostics dashboard surface (data is pulled; no dedicated UI beyond the settings card)
- [ ] ToS re-check watchdog (`retrieveForApplication`)
- [ ] Aggregate disapproval-rate alerting across merchants (partner reputation guard)
- [ ] OAuth consent-screen verification for the `content` scope (external, weeks — submit early)

---

## Roadmap Providers

### BigCommerce

**Planned mode:** REST API (OAuth or API key)

**Status:** UI placeholder only — "Coming soon" tile in onboarding platform grid. No server code exists.

**Outstanding work:**
- Server integration module (`integration/bigcommerce.ts`)
- OAuth or API key auth flow
- Product sync via BigCommerce Catalog API
- Onboarding form and page
- Database credential fields (or reuse `accessToken`)

---

### Amazon Seller Central

**Planned mode:** SP-API (OAuth + LWA)

**Status:** UI placeholder only — "Coming soon" tile in onboarding platform grid. No server code exists.

**Outstanding work:**
- SP-API OAuth / Login with Amazon (LWA) flow
- Product sync via Listings Items API or Reports API
- ASIN / listing data normalisation
- Onboarding form and page
- Database credential fields

---

## Shared Infrastructure

### Database Schema

Both the `store` and `product` tables are shared across all providers.

**`store` fields relevant to integrations:**

| Field | Used by |
|---|---|
| `platform` | All — `"shopify" \| "woocommerce" \| "feed" \| "csv"` |
| `domain` | Shopify, WooCommerce, Feed |
| `accessToken` | Shopify |
| `consumerKey` | WooCommerce |
| `consumerSecret` | WooCommerce |
| `feedUrl` | Custom Feed |
| `status` | All — `"connected" \| "syncing" \| "error"` |
| `lastSyncedAt` | All |

**`product` normalised fields:** `title`, `description`, `price`, `compareAtPrice`, `currency`, `images[]`, `url`, `sku`, `status`, `externalId`, `rawData`

### Sync Router

`store.syncProducts({ storeId })` in `server/app/store.ts` dispatches to the correct integration based on `store.platform`. The platform status transitions `connected → syncing → connected | error` during sync.

### Error Handling

All integrations return `Result<T, Error>` via `resultify` — no try/catch. User-facing error strings are surfaced as toast notifications in the onboarding forms.

---

## Cross-Cutting Gaps

These apply across all or most integrations:

- [ ] Sync scheduling / automation (no cron or webhook-driven re-sync)
- [ ] Sync history and per-store log visible to user
- [ ] Store reconnection flow when credentials expire
- [ ] Rate limiting per provider
- [ ] Duplicate product detection across syncs
- [ ] Integration settings page in dashboard (post-onboarding credential management)
- [ ] Write-back UI for all integrations (only Shopify has the server function)
