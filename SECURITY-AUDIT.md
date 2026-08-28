# écentic — Enterprise Security Review: Code-Derived Findings

**Scope:** the `ecentic` monorepo at commit `6c9648bd` (branch `main`), working tree as of 2026-08-28.
**Method:** source code only. Documentation, README files, `AGENTS.md`, `docs/`, and marketing/legal copy were deliberately not used as evidence, and where they contradict the code this report says so.
**Audience:** internal. This report is written to be usable as the basis for what can honestly be told to a channel partner.

---

## 1. Shopify OAuth scopes

### Where the authorisation URL is built

There is **no `shopify.app.toml`** or any equivalent Shopify CLI app config in the repository. The scope string is hardcoded in a single Next.js route handler.

`apps/web/src/app/(provider)/api/integrations/shopify/install/route.ts:6-7`

```ts
const SCOPES =
  "read_products,write_products,write_script_tags,read_script_tags";
```

Applied at `apps/web/src/app/(provider)/api/integrations/shopify/install/route.ts:89-94`:

```ts
const url = new URL(`https://${domain}/admin/oauth/authorize`);
url.searchParams.set("client_id", SHOPIFY_API_KEY);
url.searchParams.set("scope", SCOPES);
url.searchParams.set("redirect_uri", redirectUri);
url.searchParams.set("state", nonce);
```

There is **no environment variable default** for scopes anywhere. `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` are env-driven (`apps/web/.env.example:16-17`); the scope list is not.

### The exact, complete list of scopes requested

Four scopes, from the merchant-facing install flow:

1. `read_products`
2. `write_products`
3. `write_script_tags`
4. `read_script_tags`

### A second, unscoped authorisation path exists

There is a **second** route that builds a Shopify authorize URL and does **not** pin the scope list:

`apps/web/src/app/(provider)/api/auth/shopify-proxy/authorize/route.ts:33-38`

```ts
const shopifyUrl = new URL(`https://${shop}/admin/oauth/authorize`);

for (const [key, value] of request.nextUrl.searchParams) {
  const shopifyKey = key === "grant_options" ? "grant_options[]" : key;
  shopifyUrl.searchParams.set(shopifyKey, value);
}
```

Every query parameter on the incoming request — **including `scope`, `client_id` and `redirect_uri`** — is copied verbatim into the redirect. This route is the `authorizationUrl` for the Better Auth "Sign in with Shopify" provider (`apps/web/src/lib/auth.ts:188-191`). A commented-out block at `apps/web/src/app/(provider)/api/auth/shopify-proxy/authorize/route.ts:4-10` shows the scope set this path was written for:

```
read_product_feeds,write_product_feeds,read_product_listings,write_product_listings,read_products,write_products
```

That list is inert today (it is commented out), but the passthrough is live: the effective scope of a sign-in-with-Shopify authorisation is whatever the caller puts in the URL, bounded only by what the Shopify app listing itself permits. **A procurement team asking "what does your app request?" cannot be answered by the install route alone.**

### Specifically: the sensitive scopes asked about

| Scope | Requested? |
|---|---|
| `read_orders` | **No** — not in `SCOPES`, not anywhere in tracked source |
| `write_orders` | No |
| `read_all_orders` | No |
| `read_customers` | No |
| `write_customers` | No |
| `read_draft_orders` | No |
| `read_checkouts` | No |

None of these appear in `apps/web/src/app/(provider)/api/integrations/shopify/install/route.ts` or in any other tracked file. (A repo-wide grep returns only documentation prose and Spanish/English legal copy.)

**However** — see §2 — the application *registers a Shopify `orders/paid` webhook* and *ships a handler for it*, which is functionality that requires `read_orders`. See "Red flags".

### Which requested scopes are actually used by code

| Scope | Used? | Evidence |
|---|---|---|
| `read_products` | **Yes** | `apps/web/src/server/app/integration/shopify/index.ts:228` — `GET /admin/api/{v}/products.json`, paginated |
| `write_products` | **Yes** | `apps/web/src/server/app/integration/shopify/index.ts:1300-1308` — `PUT /admin/api/{v}/products/{id}.json`; also product metafield writes at `:892-912` |
| `write_script_tags` | **Yes** | `apps/web/src/server/app/integration/shopify/index.ts:609-625` — `POST /admin/api/{v}/script_tags.json` (installs the storefront tracker) |
| `read_script_tags` | **No** | Repo-wide, `script_tags` appears in exactly two places: the scope string itself and the `POST` above. There is no `GET /script_tags.json` anywhere. **Requested but never used.** |

Additional Admin API surfaces called that fall outside the four scopes (all permitted to any installed app without extra scopes): `shop.json` (`:122`, `:466`), `graphql.json` for metafield definitions and `appSubscriptionCreate` / `appUsageRecordCreate` billing mutations (`:1615`, `:1644`, `:1750`), and `webhooks.json` (`:635`).

### HMAC and nonce verification on the callback

**Both are verified, in the right order, before any state change.**

`apps/web/src/app/(provider)/api/integrations/shopify/callback/route.ts:31-40`

```ts
const jar = await cookies();
const nonce = jar.get("shopify_nonce")?.value;

if (state !== nonce) return Response.redirect(connectPage("invalid_state"));

if (!verifyHmac(params, process.env.SHOPIFY_API_SECRET))
  return Response.redirect(connectPage("invalid_hmac"));

const session = await auth.api.getSession({ headers: await headers() });
if (!session) return Response.redirect(`${process.env.APP_HOST}/sign-in`);
```

- Nonce minted with `crypto.randomBytes(16)` and stored in an `httpOnly`, `secure`, `sameSite: "lax"`, 10-minute cookie (`install/route.ts:54-64`).
- HMAC implementation: `apps/web/src/server/app/integration/shopify/hmac.ts:3-27`. Sorted-query-string canonicalisation, SHA-256, length check before `crypto.timingSafeEqual`. **Constant-time and correct.**
- Webhook HMAC (a different canonicalisation — raw body, base64) at `apps/web/src/server/app/integration/shopify/hmac.ts:35-54`, also constant-time, and run against raw bytes before parsing (`apps/web/src/server/app/integration/shopify/inbound.ts:159`).
- Open-redirect guard on the `return_to` cookie: `install/route.ts:77-85` and `callback/route.ts:67-72` both require `startsWith("/") && !startsWith("//")`.

The Better Auth sign-in path also verifies HMAC (`apps/web/src/lib/auth.ts:75-77`) and relies on Better Auth's own `state` verification (`apps/web/src/lib/auth.ts:66-73`, with the app's own state check commented out). That comment is a claim about a third-party library's behaviour and was **not verified against the Better Auth source** in this audit.

---

## 2. Does anything store end-customer or order data?

**Direct answer: YES. écentic can hold end-customer personal data today — name, email address, phone number, and full shipping/billing address — but only for WooCommerce stores that have enabled the hosted UCP agent-commerce surface. Shopify and feed/CSV merchants are unaffected. The data lives in Upstash Redis with a 1-hour TTL, not in Postgres.**

### 2a. The `product.rawData` column — traced end to end

Column: `apps/web/src/server/database/schema.ts:350` — `rawData: text("rawData")`.

Every assignment, and the API call that produces it:

| Write site | Source API call | Payload |
|---|---|---|
| `apps/web/src/server/app/integration/shopify/index.ts:277` | `apps/web/src/server/app/integration/shopify/index.ts:228` — `GET /admin/api/{v}/products.json?limit=250` (Admin API, `X-Shopify-Access-Token`) | One Shopify **Product** object, `JSON.stringify(item)` — the whole object as returned, not just the typed fields |
| `apps/web/src/server/app/integration/shopify/index.ts:1321` | `apps/web/src/server/app/integration/shopify/index.ts:1300-1313` — `PUT /admin/api/{v}/products/{id}.json`, then the returned `product` | One Shopify Product object (the post-write-back state) |
| `apps/web/src/server/app/integration/shopify/index.ts:1450` | `apps/web/src/server/app/integration/shopify/index.ts:1411-1421` — `GET {domain}/products.json` (**public storefront** endpoint, unauthenticated) | One public Shopify Product object |
| `apps/web/src/server/app/integration/woocommerce/index.ts:225` | `apps/web/src/server/app/integration/woocommerce/index.ts:187` — `GET {domain}/wp-json/wc/v3/products` | One WooCommerce Product object |
| `apps/web/src/server/app/integration/woocommerce/index.ts:498` | `apps/web/src/server/app/integration/woocommerce/index.ts:480` — `PUT /wp-json/wc/v3/products/{id}` response | One WooCommerce Product object |
| `apps/web/src/server/app/integration/feed.ts:179` | XML/JSON product feed fetch | One feed item |
| `apps/web/src/server/app/integration/csv.ts:108` | Uploaded CSV row | One CSV row |

**Can `rawData` contain customer or order data under any code path? No.** Every producer is a product-catalog endpoint. Shopify `Product` and WooCommerce `product` resources carry no buyer identity. There is no code path that assigns an order, customer, checkout, or cart object into `rawData`.

Caveat worth stating to a partner honestly: because the write is `JSON.stringify(item)` on the *untyped* API response rather than a field whitelist, `rawData` holds whatever those product endpoints return — including fields the TypeScript `Type` (`apps/web/src/server/app/integration/shopify/index.ts:24-38`) does not name. That is still product data, but it is not an enforced minimisation boundary. Merchant-authored free text (e.g. a supplier's email in a product description, a WooCommerce private note) would be stored verbatim.

### 2b. Shopify order data — a live handler with no scope behind it

`apps/web/src/server/app/integration/shopify/inbound.ts` handles four webhook topics (`:190-224`):

- `customers/data_request` (`:191-204`)
- `customers/redact` (`:205-212`)
- `shop/redact` (`:213-214`) → `redactShop` at `:85-106`, which hard-deletes every matching `store` row
- **`orders/paid` (`:215-216`)** → `recordPaidOrder` at `:42-83`

`recordPaidOrder` receives the **full Shopify Order payload** (`OrdersPaidPayload`, `:28-34`) and reads only `id`, `current_total_price`/`total_price`, `currency`, and `note_attributes`. It persists to `attributed_conversion` (`apps/web/src/server/database/schema.ts:736-783`) — order external id, value in cents, currency, agent type, fee maths. **No buyer PII is persisted from this path.** The raw body is deliberately kept out of Sentry (`inbound.ts:130-139` records only `body.bytes`).

But the payload — which for a real `orders/paid` delivery includes `customer`, `billing_address`, `shipping_address`, `email` — **transits the application in memory** and is JSON-parsed at `inbound.ts:180`.

And the app **actively tries to subscribe to it**: `apps/web/src/server/app/integration/shopify/index.ts:635-650` POSTs to `webhooks.json` requesting topic `orders/paid` on every fresh connect. That subscription requires the `read_orders` scope, which is **not** in `SCOPES`. The call result is deliberately not unwrapped (`:637`, comment at `:632-634`), so **the registration fails silently and no `orders/paid` deliveries ever arrive**. The performance-fee attribution pipeline for Shopify is therefore dead in production while looking implemented.

Two consequences a reviewer will find:
1. The moment anyone adds `read_orders` to `SCOPES` to fix billing attribution, écentic starts receiving full Shopify order payloads including shopper PII, with no other code change.
2. The `customers/data_request` response at `inbound.ts:199-202` returns, verbatim: *"ecentic does not collect or store any customer personal data. Only product catalog information is accessed via the Shopify Admin API."* That is true for the Shopify rail and **false for the WooCommerce/UCP rail below**. This string is what Shopify app review reads and what a merchant sees in a data-subject request.

### 2c. The hosted UCP surface — this is where end-customer PII actually lives

Route: `apps/web/src/app/(provider)/api/ucp/stores/[store]/[[...path]]/route.ts` → `apps/web/src/server/app/ucp/router.ts`.

This is a full agent-facing commerce API (catalog, cart, checkout, order) that AI shopping agents call directly. It is **WooCommerce-only** — `apps/web/src/server/app/ucp/store-context.ts:68` returns `null` for any other platform.

Session shapes (`apps/web/src/server/app/ucp/sessions.ts`):

```ts
// :32-42
export type SessionAddress = {
  street_address?: string;
  extended_address?: string;
  address_locality?: string;
  address_region?: string;
  postal_code?: string;
  address_country?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
};

// :44-49
export type SessionBuyer = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
};
```

Both hang off `CheckoutSession` (`:102-148`), together with `instruments?: Record<string, unknown>[]` — *"Opaque payment instruments echoed back to the platform"* (`:116-117`).

Storage: **Upstash Redis**, key `ucp:checkout:{store}:{id}`, TTL **3600 seconds** (`sessions.ts:11`, `:158-160`, `:195-199`). Client: `apps/web/src/server/utils/durable.ts:1-13` (`@upstash/redis`, `Redis.fromEnv()`).

A buyer email is **mandatory** to place an order: `apps/web/src/server/app/ucp/checkout.ts:103-109`. Buyer and destination are parsed from agent payloads at `checkout.ts:481`, `:568`, `:648-649`, and forwarded to the merchant's WooCommerce store at `checkout.ts:854-882`:

```ts
billing: {
  ...toOrderAddress(session.destination, session.buyer),
  ...(session.buyer?.email ? { email: session.buyer.email } : {}),
},
shipping: toOrderAddress(session.destination, session.buyer),
...
buyer: {
  first_name: session.buyer?.first_name,
  last_name: session.buyer?.last_name,
  email: session.buyer?.email,
  phone: session.buyer?.phone_number,
},
```

Durable record: `ucp_order` (`apps/web/src/server/database/schema.ts:875-900`) stores `storeId`, `externalOrderId`, `checkoutId`, `webhookUrl`, `agentProfileUrl` — **no PII**. So Postgres stays clean; Redis does not.

Payment: no card data is stored. `checkout.ts:7-10` documents that no payment handlers are advertised, instruments are rejected at Complete with `payment_handler_unknown`, and payment is finalised by the buyer through the store's own `payment_url`. The `instruments` field holds opaque tokens echoed back to the agent platform, not PANs.

**Access controls on this surface** (`apps/web/src/server/app/ucp/router.ts:329-365`): rate limit; store-level API key **only if the merchant set one** (`requiredApiKey !== ""` — default `""` means open); agent-platform allow-list **only if the merchant populated it** (default `[]` means permissionless); RFC 9421 signature verification is verify-when-present unless the merchant turned on "require signed requests". **Out of the box, the hosted UCP endpoint for a connected WooCommerce store is an unauthenticated public API that accepts and stores shopper PII.** The defaults are the merchant's to change via their plugin settings, not écentic's.

### 2d. Everything else checked, and clean

- **WooCommerce REST:** only `/wp-json/wc/v3/products*` and `/wp-json/wc/v3/data/currencies/current` (`woocommerce/index.ts:78`, `:187`, `:295`, `:480`, `:560`). No `/orders`, no `/customers`.
- **Feed importer** (`integration/feed.ts`) and **CSV importer** (`integration/csv.ts`): product fields only.
- **Agent-visit tracking** (`apps/web/src/app/(provider)/api/tracking/agent-visit/route.ts`, `apps/web/src/server/app/tracking.ts`): records `agentType`, `pageUrl`, `pageType`, `referrer`, `userAgent` into `agent_visit` (`schema.ts:558-586`). **No IP address column, no cookie, no visitor id.** This is bot-detection telemetry, not shopper analytics.
- **Better Auth `session` table** stores `ipAddress` and `userAgent` (`schema.ts:47-48`) — that is the *merchant user*, not a shopper.
- **`deal_redemption`** (`schema.ts:909-941`) holds contact name, email, company, website for partner-deal redeemers, captured **unauthenticated** via `/api/webhook/deals/redemptions`, with the full raw payload in `answers` jsonb. Business-contact PII, not shopper PII, but it is unauthenticated write-path PII and belongs on the inventory.

---

## 3. The dev endpoint in production

### `/api/dev/discovery`

File: `apps/web/src/app/(provider)/api/dev/discovery/route.ts`.

**Authentication:** a **single static shared access code**, no session, no user, no per-caller identity.

`apps/web/src/app/(provider)/api/dev/discovery/route.ts:61-65, 101-112`

```ts
const codeCandidates = (request: Request, url: URL) => [
  request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
  request.headers.get("x-discovery-code"),
  url.searchParams.get("code"),
];

const guard = (request: Request, url: URL): Response | null => {
  if (Report.accessCode() === null)
    return text("DEV_DISCOVERY_TOKEN is not configured — ...", 503);
  if (!Report.isAuthorized(codeCandidates(request, url)))
    return text("Unauthorized — pass the access code.", 401);
  return null;
};
```

The code itself: `apps/web/src/server/app/intelligence/discovery-report.ts:22-45`

```ts
const DEVELOPMENT_ACCESS_CODE = "ecentic-discovery-dev";

export const accessCode = (): string | null =>
  process.env.DEV_DISCOVERY_TOKEN?.trim() ||
  (process.env.NODE_ENV === "production" ? null : DEVELOPMENT_ACCESS_CODE);
```

- **Authorisation:** none. No roles, no tenancy. Anyone holding the code has full access.
- **`NODE_ENV` gating:** partial and inverted from what a reviewer expects. The endpoint is **not disabled in production**. `NODE_ENV === "production"` only removes the hardcoded fallback code. If `DEV_DISCOVERY_TOKEN` is set in production — and `.env.example:61` says *"required in production"* — the endpoint is **live in production**, guarded by one static, non-rotating, non-expiring, non-attributable bearer string that can be passed **in a query parameter** (`?code=`), meaning it lands in access logs, CDN logs, and `Referer` headers. The code's own comment concedes the design (`discovery-report.ts:15-16`): *"Replace this with real per-agent keys (schema.agentApiKey) before it serves anyone but us."*
- **What it returns / can expose:** `executeDiscovery` (`apps/web/src/server/app/intelligence/discovery-run.ts:222-262`) takes a caller-supplied store domain and up to 8 shopping queries and runs each against four AI models. **It performs no database reads** — no merchant records, no products, no tokens. The response is generated model output plus the caller's own inputs, as Markdown or (`?format=json`) raw JSON. **The exposure is not merchant data; it is unmetered spend.** Each request fans out to 4 models × up to 8 queries (`maxDuration = 300`), billed to écentic's Azure and Vercel AI Gateway accounts. The route's own comments name this: *"Every character here is billed four times per query"* (`:11-13`), *"anyone reading it could spend the AI budget"* (`discovery-report.ts:18-20`).
- **No rate limiting** on this route. The only bounds are 200 chars of store, 300 chars per query, 8 queries.

### Other dev/debug/test/internal routes reachable in production

There are **two more**, both under `/api/dev/`:

| Route | Guard |
|---|---|
| `/api/dev/ai-playground` | `apps/web/src/app/(provider)/api/dev/ai-playground/route.ts:109-113` — in production, requires a session with `role === "administrator"`. **Open with no auth at all when `NODE_ENV !== "production"`.** Runs arbitrary prompts against every configured provider. |
| `/api/dev/llm-scraping` | `apps/web/src/app/(provider)/api/dev/llm-scraping/route.ts:19-23` — identical guard. Spends ScrapeLLM credits on arbitrary prompts. |

The corresponding **UI pages** at `/dev/*` are guarded by the edge proxy (`apps/web/src/proxy.ts:37-39`, `:127-129`) on `role === "administrator"`.

**The `administrator` role is not what it sounds like.** `apps/web/src/lib/auth.ts:262-265`:

```ts
role: associatedUser.account_owner ? "owner" : "administrator",
```

Any Shopify **staff member who is not the store's account owner** who signs in with Shopify is assigned `role: "administrator"` — the same role string that gates `/dev/*`, `/api/dev/ai-playground` and `/api/dev/llm-scraping`. This is a privilege-escalation path into écentic's internal tooling from any merchant's staff account. See "Red flags".

No routes exist under `debug`, `test`, `internal`, or `admin` prefixes. Full route inventory was enumerated from `apps/web/src/app/**/route.ts` (65 handlers).

---

## 4. Third-party outbound calls — sub-processor inventory

| Service | Where | What is sent | Server or client |
|---|---|---|---|
| **Shopify Admin API** | `apps/web/src/server/app/integration/shopify/index.ts:122, 228, 466, 610, 636, 851, 893, 912, 1302, 1615` | Merchant access token; product reads/writes; script tag; webhook subscription; metafields; billing mutations | Server |
| **Shopify storefront `/products.json`** | `apps/web/src/server/app/integration/shopify/index.ts:1412, 1487`; `/meta.json` `:1348` | Store domain only (unauthenticated public endpoint) | Server |
| **WooCommerce REST** | `apps/web/src/server/app/integration/woocommerce/index.ts:78, 187, 295, 480, 560`; auth in `woocommerce/http.ts:13, 25-26, 50` | Consumer key/secret (Basic over HTTPS, OAuth1 over HTTP, query-param fallback); product reads/writes | Server |
| **WooCommerce UCP bridge** (merchant's own plugin) | `apps/web/src/server/app/ucp/bridge.ts:136, 182, 189` | **Shopper name, email, phone, billing + shipping address**, line items, coupons | Server |
| **Azure OpenAI** | `apps/web/src/server/utils/ai.ts:68-74`, resolved at `:139-144` | Merchant product titles, descriptions, prices, SKUs; competitor data; shopping queries | Server |
| **Vercel AI Gateway** → Anthropic, Google, Perplexity (and OpenAI on fallback) | `apps/web/src/server/utils/ai.ts:106-107, 144` | Same merchant product/competitor data | Server |
| **ScrapeLLM** (`api.scrapellm.com`) | `apps/web/src/server/utils/scrapellm.ts:17` | Arbitrary prompt text + country code, from the admin-only `/dev/llm-scraping` sandbox | Server |
| **Stripe** | `apps/web/src/app/(provider)/api/stripe/webhook/route.ts`; billing modules under `apps/web/src/server/app/billing/` | Merchant subscription/billing data; inbound webhooks signature-verified via `constructEventAsync` (`route.ts:28-30`) | Server |
| **Resend** | `apps/web/src/server/app/authentication.ts` | Merchant email address, verification/reset links | Server |
| **UploadThing** | `apps/web/src/server/app/storage.ts`, `apps/web/src/lib/uploadthing.ts` | Merchant-uploaded files | Server + client |
| **Upstash Redis** | `apps/web/src/server/utils/durable.ts:1-13`; used by `apps/web/src/server/app/ucp/sessions.ts`, `apps/web/src/server/utils/rate-limit.ts`, `apps/web/src/server/utils/context.ts` | **UCP checkout sessions incl. shopper PII**; rate-limit counters; caches | Server |
| **Sentry** | `apps/web/src/instrumentation.ts:4-17`, `apps/web/src/instrumentation-client.ts:12-60` | Errors, traces, logs, **`sendDefaultPii: true`** on both server and client; Session Replay armed for every session | Server + client |
| **PostHog (EU)** | `apps/web/src/context/posthog.tsx:19`; preconnect `apps/web/src/app/[locale]/layout.tsx:154-157` (`eu.i.posthog.com`) | Pageviews, `$current_url`, search string; opt-in gated at `posthog.tsx:44-59` | Client |
| **Google Analytics 4** | `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `.env.example:46`; `@next/third-parties` | Pageview telemetry | Client |
| **Google Merchant / Content API** (`merchantapi.googleapis.com`, `oauth2.googleapis.com`) | `apps/web/src/server/utils/google-merchant.ts`, `apps/web/src/server/app/integration/google-merchant.ts` | Merchant OAuth tokens, product attribute overrides | Server |
| **Chatwoot** | `apps/web/src/app/[locale]/layout.tsx` (widget `sdk.js`) | Support-chat content typed by the merchant | Client |
| **Cal.com** | `apps/web/src/components/cal.tsx` (`@calcom/embed-react`) | Booking form data | Client |
| **x402 facilitator** (`x402.org` / Coinbase CDP) | `apps/web/src/lib/x402.ts`, `apps/web/src/app/(provider)/api/route.ts` | Agent payment settlement for `GET /api` | Server |
| **Shopify Global Catalog MCP** (`catalog.shopify.com`, `api.shopify.com`) | UCP/catalog-rank modules | Catalog search queries | Server |
| **BabyLoveGrowth** | see below | see below | Server |

### `api.babylovegrowth.ai` — every call site and exact payload

**Call sites (application runtime):** exactly one client, one base URL, one auth header.

- Base URL: `node_modules/.bun/babylovegrowth-next-js-blog@0.2.2/.../dist/index.js:41` — `https://api.babylovegrowth.ai/api/integrations/v1`, overridable via `BABYLOVEGROWTH_BLOG_API_URL` (`apps/web/src/server/app/babylovegrowth.ts:37`).
- Client construction: `apps/web/src/server/app/babylovegrowth.ts:34-39`, key from `BABYLOVEGROWTH_BLOG_API_KEY`.
- Wrapper functions, all server-side, all `"use cache"` or cron-driven: `listArticles` (`:111-122`), `getArticleBySlug` (`:124-134`), `listArticlesFresh` (`:163-168`), `getArticleFresh` (`:170-177`), `listSitemapEntries` (`:179-190`).
- One out-of-band script (not runtime): `apps/web/scripts/backfill-blog-faqs.ts:145-148`.

**Exact payload sent.** From the vendored SDK (`.../dist/index.js:56-90`), every call is:

```
GET https://api.babylovegrowth.ai/api/integrations/v1/<path>
Headers: X-API-Key: <BABYLOVEGROWTH_BLOG_API_KEY>
         Accept: application/json
```

Paths and their only parameters:
- `/articles?limit=<1..50>&offset=<n>` — two integers
- `/articles/by-slug/<url-encoded slug>` — a blog post slug
- `/articles/<id>` — a BLG article id

**There is no request body on any call. It is a read-only integration.**

**Does it ever receive merchant or product data? No.** The only values that leave écentic are the API key, an integer limit/offset, and a blog-post slug. No merchant identifier, no store domain, no product, no user, no session token is reachable from any of these call sites.

**Inbound counterpart:** `POST /api/webhooks/babylovegrowth` (`apps/web/src/app/(provider)/api/webhooks/babylovegrowth/route.ts`) accepts publish notifications, gated on `BABYLOVEGROWTH_WEBHOOK_SECRET` (`apps/web/src/server/app/blog.ts:619-624`). That path pushes blog content **into** écentic, and triggers Azure translation of the post body — blog copy only, no merchant data.

---

## 5. Credential storage

### Shopify access tokens

- **Table:** `store_account` (`apps/web/src/server/database/schema.ts:141-169`)
- **Columns:** `accessToken` (`:148`), `accessTokenExpiresAt` (`:149`), `refreshToken` (`:150`), `refreshTokenExpiresAt` (`:151`), `scope` (`:152`)
- **Type:** `text(...)`. **Plaintext.**
- **Application-layer encryption: none.** A repo-wide search for `createCipheriv`, `createDecipheriv`, `aes-256`, `pgcrypto`, or any `ENCRYPTION_KEY` env var returns **zero results** in tracked source. Confidentiality rests entirely on whatever the Postgres provider does at rest.
- Read path: `apps/web/src/server/app/integration/shopify/index.ts:377-390` (`resolveAccessToken`) — reads the column directly and hands the string to `HTTP.request`.

A second copy of Shopify tokens exists in Better Auth's `account` table (`schema.ts:55-85`) — `accessToken` (`:66`), `refreshToken` (`:67`), `idToken` (`:68`), written by the sign-in-with-Shopify provider (`apps/web/src/lib/auth.ts:230-241`). Also plaintext `text` columns. Also unencrypted. **Two token stores, neither encrypted.**

### WooCommerce consumer key and secret

- **Table:** `store_account`, same table
- **Columns:** `consumerKey` (`apps/web/src/server/database/schema.ts:154`), `consumerSecret` (`:155`)
- **Type:** `text(...)`. **Plaintext, no application-layer encryption.**
- Also in this table: `bridgeSecret` (`:161`) — the shared HMAC secret used to sign both directions of the UCP bridge. Plaintext.
- Read path: `apps/web/src/server/app/ucp/store-context.ts:70-82`, `apps/web/src/server/app/integration/woocommerce/index.ts:161`.

**Transport risk on the WooCommerce credentials specifically** (`apps/web/src/server/app/integration/woocommerce/http.ts`):
- Over HTTPS: HTTP Basic (`:13`) — acceptable.
- **Over plain HTTP: OAuth 1.0a signing (`:33-50`)** — the secret is not sent, but the traffic is unencrypted.
- **Fallback on failure: the key and secret are put in the query string** (`:25-26`, invoked at `:122`). Query strings land in the merchant's web-server access logs, any intermediary proxy, and browser/CDN logs. This fires whenever the Basic-auth attempt fails, which is common on hosts that strip the `Authorization` header.

### Google Merchant tokens

`google_merchant_account.accessToken` (`schema.ts:182`), `refreshToken` (`:184`) — plaintext `text`.

### Agent API keys — the one credential handled correctly

`agent_api_key` (`schema.ts:786-806`) stores `keyHash` and a `prefix`, never the key. Generation and verification: `apps/web/src/server/app/agent.ts:21-25, 64, 93-97` — `crypto.randomBytes(32).toString("base64url")`, SHA-256 hashed, looked up by hash. Correct.

### Committed secrets

**No real secrets are committed.** Verified by targeted `git grep` across tracked files for `sk_live_`, `sk_test_`, `shpat_`, `shpss_`, `shpca_`, `re_…`, `AKIA…`, `ghp_`, `xoxb-`, and PEM private-key headers.

- `apps/web/.env.example` is the only tracked env file and **every value is empty** (`:1-114`).
- The only matches are test fixtures: `apps/web/src/server/spec/shopify-token.test.ts:8, 17` and `apps/web/src/server/spec/shopify.test.ts:6` (`"shpss_test_secret"`, `"shpat_new"`) — synthetic.
- `.gitignore:8-10` ignores `.env*` except `.env.example`; `.gitignore:19` ignores `.vercel`. Confirmed via `git check-ignore` that the local `.vercel/.env.production.local` is untracked.

**One credential-shaped literal *is* committed:** `apps/web/src/server/app/intelligence/discovery-report.ts:22` — `const DEVELOPMENT_ACCESS_CODE = "ecentic-discovery-dev"`. It cannot authenticate in production (`:26` returns `null` when `NODE_ENV === "production"` and `DEV_DISCOVERY_TOKEN` is unset), but it is a live credential for every non-production deployment, including previews.

**Non-rotatable derived bearer token:** the public product-feed URL is authorised by `feedToken` (`apps/web/src/server/app/feed-export.ts:24-35`) — `HMAC-SHA256(BETTER_AUTH_SECRET, "product-feed:{storeId}")`, truncated. It is deterministic, embedded in a URL query parameter (`:37-43`), served without a session (`apps/web/src/app/(provider)/api/feeds/google/[store]/route.ts:17-29`), and **cannot be revoked for one store without rotating the global `BETTER_AUTH_SECRET`**, which would invalidate every session and every other feed URL at once.

---

## 6. Auth and tenancy

### Authentication library

**Better Auth 1.7.** Not Clerk.

- Import: `apps/web/src/lib/auth.ts:1-5` — `betterAuth`, `drizzleAdapter`, `nextCookies`, `genericOAuth`
- Config: `apps/web/src/lib/auth.ts:84-317`
- Dependency: `apps/web/package.json` — `"better-auth": "^1.7.2"`
- Adapter: Drizzle over Postgres (`apps/web/src/lib/auth.ts:86-89`), tables `user`/`session`/`account`/`verification` (`apps/web/src/server/database/schema.ts:22-94`)
- Route handler: `apps/web/src/app/(provider)/api/auth/[...all]/route.ts`
- Methods enabled: email + password with mandatory verification (`apps/web/src/lib/auth.ts:154-156`, `requireEmailVerification: true` at `:156`), Google OAuth (`:293-305`), Shopify via `genericOAuth` (`:178-289`)
- Session cookie cache: 300s (`:95-105`)

### Multi-tenant isolation

**Application-layer only. There is no Postgres row-level security.**

A repo-wide search for `ROW LEVEL SECURITY`, `ENABLE RLS`, `CREATE POLICY`, or Drizzle's `pgPolicy` across `apps/web/src/server/database/schema.ts`, the `drizzle/` migration SQL, and all TypeScript returns **zero results**. The application connects as a single Postgres role (`apps/web/src/server/database/index.ts:9-21`) with no per-tenant session variables.

Isolation is enforced by explicit ownership checks in each server action. Representative examples:

- `apps/web/src/server/app/store.ts:25` — `where: eq(schema.store.userId, context.session.user.id)`
- `apps/web/src/server/app/store.ts:40` — `if (!result.data || result.data.userId !== context.session.user.id)`
- `apps/web/src/server/app/store.ts:235, 244` — ownership re-checked for product and store on the publish path
- `apps/web/src/server/app/product.ts:653-657` — `getDetail` fetches by id, then rejects if `product.data.userId !== context.session.user.id`, then rejects again if the store id does not match

The pattern is consistently applied in the actions sampled. But the underlying `repository()` delegates (`apps/web/src/server/utils/repository.ts`) expose unscoped `get`, `find`, `update`, `destroy` — `apps/web/src/server/app/product.ts:41-51` re-exports all of them — so tenancy is a convention every author must remember, enforced by nothing. **A single new action that forgets the check is a cross-tenant read, and neither the database nor the type system will stop it.** With RLS there would be a second line of defence; there is none.

The edge proxy (`apps/web/src/proxy.ts:28-32, 107-133`) enforces *authentication* on `/dashboard`, `/onboarding`, `/complete-profile`, and fails closed on an unreadable session (`:111-112`). It does not enforce tenancy.

### Roles

Roles exist in the schema (`apps/web/src/server/database/schema.ts:31` — `role: text("role")`) and **are enforced in code, but only for one thing**:

- Enforcement points: `apps/web/src/proxy.ts:37-39` and `:127-129` (`/dev/*` requires `administrator`); `apps/web/src/app/(provider)/api/dev/ai-playground/route.ts:109-113`; `apps/web/src/app/(provider)/api/dev/llm-scraping/route.ts:19-23`; `withAuthorization` (`apps/web/src/server/utils/authorization.ts:31`) used at exactly one call site, `apps/web/src/server/app/billing/performance-fee.ts:238`.
- Role values in circulation: `"user"` (default, `apps/web/src/lib/auth.ts:147`), `"owner"` and `"administrator"` (from Shopify sign-in, `:264`).

**There is no owner/admin/editor/viewer permission model for merchant data.** Every authenticated user owns their own rows and can do everything with them; there is no delegation, no read-only seat, no team-member scoping. The Settings page renders a "team" section (`apps/web/src/app/[locale]/(main)/dashboard/settings/_components/settings/team-section.tsx`) that displays role labels, but no server action enforces them.

And, as noted in §3: `apps/web/src/lib/auth.ts:264` grants `administrator` to **any non-owner Shopify staff user**, which is the exact role string that opens écentic's internal `/dev` tooling.

### MFA

**Not available.** A repo-wide search for `twoFactor`, `two-factor`, `totp`, `TOTP`, `passkey`, `mfa`, `MFA` across `apps/web/src` returns **zero results**. Better Auth's `twoFactor` plugin is not in the plugin list (`apps/web/src/lib/auth.ts:177-292`; `socialProviders` at `:293`). Customers cannot enable MFA. The only step-up is mandatory email verification on signup (`:156`).

---

## 7. Infrastructure and region

### Database

- **PostgreSQL** via `postgres.js` + Drizzle ORM 1.0-rc (`apps/web/src/server/database/index.ts:1-27`, `apps/web/drizzle.config.ts`).
- **Provider: Neon.** Not in config — inferred from code comments that describe provider-specific behaviour: `apps/web/src/server/database/index.ts:10` (*"Neon's pooler does the real pooling"*), `:16-18` (*"Neon documents scale-to-zero resumes at ~500ms"*), and `apps/web/src/server/utils/repository.ts:71-76` (*"Neon's pooler drops its end of an idle socket"*). The connection string is entirely env-driven (`DATABASE_URL`).
- **Region: not discoverable from code.** It lives in the Neon project settings and in the `DATABASE_URL` host, neither of which is in the repository.

### AI routing — Azure is *not* the sole path

`apps/web/src/server/utils/ai.ts:120-145` resolves a model id by three rules:

```ts
if (provider === "azure") return azure(name);

const deployment = azureConfigured() ? AZURE_DEPLOYMENTS[name]?.() : undefined;
return deployment ? azure(deployment) : gatewayModel(provider, name);
```

- **Azure OpenAI, direct** (`:68-74`): only the `gpt` seat, and only when `AZURE_RESOURCE_NAME` + `AZURE_API_KEY` are set **and** `AZURE_DEPLOYMENT_GPT` (or the legacy `AZURE_DEPLOYMENT_GPT4O`) names a deployment (`:85-92`, `:96-97`).
- **Everything else routes through the Vercel AI Gateway** (`:106-107`, `:144`) — a bare `"provider/model"` string handed to the AI SDK's global provider, billed to `AI_GATEWAY_API_KEY`. That covers **Anthropic (Claude), Google (Gemini), and Perplexity** in all environments, **and ChatGPT** in any environment without an Azure deployment name (`:65-67`).

So: **no, AI calls do not all route through Azure.** Claude, Gemini and Perplexity always traverse Vercel's gateway, which is a distinct sub-processor sitting between écentic and those model vendors. There are no direct Anthropic / Google / Perplexity API keys in the environment contract (`apps/web/.env.example:22-32`), even though `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai` and `@ai-sdk/perplexity` are all installed dependencies (`apps/web/package.json`).

*(Note for internal readers: a stored engineering note claims "all AI calls go direct (no Vercel gateway)". The code contradicts it. The code is current.)*

### Providers configured and where model selection happens

Selection is `AI.model(id)` at `apps/web/src/server/utils/ai.ts:120`. Concrete choices, all in server modules:

- `apps/web/src/server/app/intelligence/background-scan.ts:23-30` — the **live scan engine**: `gpt` (ChatGPT), `claude-sonnet-4`, `gemini-2.5-flash`
- `apps/web/src/server/app/intelligence/simulate.ts:58, 86, 131` — same three
- `apps/web/src/server/app/intelligence/compare.ts:40, 50, 60, 70` — adds `sonar-pro` (Perplexity)
- `apps/web/src/server/app/intelligence/discovery-run.ts:19-33` — four perspectives incl. `sonar`
- `apps/web/src/server/app/intelligence/brand.ts:225, 255, 526`, `detect.ts:124`, `free-for-all.ts:480`, `blog.ts:285, 326, 402` — `gpt`

### Region / residency configuration in code

**None.** No `preferredRegion` export on any route handler, no region field in `apps/web/vercel.json` (which contains only `crons`), no region in `apps/web/next.config.ts`, no Sentry or PostHog region pin in server code.

The single residency signal in the codebase is client-side: PostHog is preconnected to the **EU** ingest hosts, `https://eu.i.posthog.com` and `https://eu-assets.i.posthog.com` (`apps/web/src/app/[locale]/layout.tsx:154-157`), with the actual host still driven by `NEXT_PUBLIC_POSTHOG_HOST`.

Everything else — Vercel function region, Neon region, Upstash Redis region, Sentry org region, Azure resource region — is set outside the repository and **cannot be established from code**.

---

## 8. Deletion and retention

### Account deletion

**There is no account-deletion path.** No self-serve deletion, no admin deletion action, no soft-delete flag.

- `apps/web/src/server/app/user.ts:11` re-exports a `destroy` delegate from the repository, but **nothing calls it** — no route, no server action, no UI component.
- The Settings page has no delete-account surface. Its sections are Account, Billing, Integrations, Notifications, Simulation, Team, Google Merchant (`apps/web/src/app/[locale]/(main)/dashboard/settings/_components/settings/`); a grep for `delete`/`destroy` across that directory returns only two unrelated comments about session destruction.
- No `deletedAt` / `archivedAt` / `isDeleted` column exists on `user`, `store`, or `product` (`apps/web/src/server/database/schema.ts:22-36, 96-129, 330-363`).

**The one deletion that exists is store-level and platform-triggered:** `shop/redact` from Shopify → `redactShop` (`apps/web/src/server/app/integration/shopify/inbound.ts:85-106`) calls `Store.destroy` for every store on that shop domain. It is a **hard delete**, and it cascades: `product`, `competitor`, `scan`, `simulation`, `agent_visit`, `agent_traffic_daily`, `store_account`, `ucp_order`, `google_merchant_account` all declare `onDelete: "cascade"` on `storeId` (`schema.ts:101, 145, 179, 335, 375`, and equivalents). The `user` row and everything hanging off `userId` survive.

So: a Shopify merchant who uninstalls gets their store data hard-deleted by Shopify's own webhook. **A WooCommerce, feed, or CSV merchant has no deletion path at all**, and no merchant on any platform can delete their écentic account.

### Scheduled retention or purge

**None.** A repo-wide search for retention, purge, prune, or `olderThan` logic across `apps/web/src/server` returns only cache-tag invalidation (`blog.ts:31, 491`), UCP capability-graph pruning (`ucp/negotiation.ts:229-241`), and Google Merchant stale-offer cleanup (`integration/google-merchant.ts:1255-1269`). **No job deletes user, store, product, scan, simulation, agent-visit, or session data on age.**

The scheduled jobs are (`apps/web/vercel.json`):

| Schedule | Path | What it does |
|---|---|---|
| `0 4 * * *` | `/api/cron/billing` | `Cron.reportDuePeriods` — closes performance-fee periods |
| `* * * * *` | `/api/cron/drain` | `Cron.drainPendingScans` — runs one queued AI scan |
| `*/10 * * * *` | `/api/cron/google-merchant` | Merchant Center link/offer watchdog |
| `*/15 * * * *` | `/api/cron/blog` | `Cron.reconcileBlogCatalog` — BLG webhook backstop |

**`/api/cron/scan` exists as a route (`apps/web/src/app/(provider)/api/cron/scan/route.ts`) but is not scheduled in `vercel.json`.** The comment at `apps/web/src/server/app/cron.ts:20` confirms this is intentional (*"a hand-run `curl` against `/api/cron/scan` enqueues nothing either"*).

All `/api/cron/*` routes are authenticated by a shared bearer secret, fail-closed if unset: `apps/web/src/server/utils/cron.ts:18-59`.

The **only** automatic expiry anywhere is the 1-hour Redis TTL on UCP cart/checkout sessions (`apps/web/src/server/app/ucp/sessions.ts:11`, `:195-199`). That is the sole mechanism ageing out shopper PII, and it is a side effect of session design, not a retention policy.

### Data export

**Partial, and not a GDPR-grade export.**

- **Product feed:** `GET /api/feeds/google/{store}?token=…` (`apps/web/src/app/(provider)/api/feeds/google/[store]/route.ts:17-38`) returns the store's catalog as Google Shopping XML. Built by `buildGoogleFeed` (`apps/web/src/server/app/feed-export.ts:183`). This is products only — no scans, simulations, optimizations, agent-visit history, or account data. Authorised by the non-rotatable derived token described in §5.
- **Operator script:** `apps/web/scripts/export-shopify-csv.ts`, run manually with direct database access. Not merchant-accessible.
- There is **no** "export my data" action, endpoint, or UI anywhere.

---

## 9. Build status reality check

### Is the AI simulation engine implemented and called in production paths?

**Implemented and live.** Not stubbed.

- Live engine: `apps/web/src/server/app/intelligence/background-scan.ts`, three model perspectives at `:23-30` (`gpt` / ChatGPT, `claude-sonnet-4`, `gemini-2.5-flash`), judging via `apps/web/src/server/app/intelligence/judge.ts`.
- Production call chain: Vercel cron `* * * * *` → `/api/cron/drain` (`apps/web/src/app/(provider)/api/cron/drain/route.ts:8-9`) → `Cron.drainPendingScans` (`apps/web/src/server/app/cron.ts:62-73`) → `BackgroundScan.runPendingScans`. A second entry point, `Cron.runDailyScan` → `BackgroundScan.runScanDaily` (`apps/web/src/server/app/cron.ts:29-36`), is wired but not scheduled.
- Interactive path: onboarding scan uses the streaming engine, `apps/web/src/app/[locale]/(auth)/onboarding/scan/_components/use-scan-runner.ts:5` → `apps/web/src/server/app/intelligence/simulate.ts`. `simulate.ts` is the legacy/streaming rail; `background-scan.ts` is the engine of record (comment at `apps/web/src/server/app/intelligence/judge.ts:26`).
- Prompts are real and substantive (`judge.ts:103-110`), and results persist to the `simulation` table (`apps/web/src/server/database/schema.ts:531-556`).

### Is Shopify write-back implemented?

**Yes.** `apps/web/src/server/app/integration/shopify/index.ts:1300-1325`:

```ts
const url = `${shopBaseUrl(domain)}/admin/api/${API_VERSION}/products/${product.data.externalId}.json`;
const response = await HTTP.request(url, {
  method: "PUT",
  headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
  body: JSON.stringify({ product: data }),
});
```
followed by a local `Product.update` with the returned title, body, and refreshed `rawData`. WooCommerce has the equivalent at `apps/web/src/server/app/integration/woocommerce/index.ts:480-500`.

**Approval mechanism — yes, explicit and gated:**
- Suggestions are held in `listing_optimization` (`apps/web/src/server/database/schema.ts:612-638`) with `status`, `proposedTitle`, `proposedDescription`, `winRateBefore`, `estimatedLift`, `winRateAfter`, `publishedAt`.
- Nothing is written to a store until a merchant calls `Optimization.approveProductListing` (`apps/web/src/server/app/optimization.ts:479-551`), which publishes (`:518`) then flips the record to `status: "published"` with a `publishedAt` timestamp (`:531-538`).
- Merchants can `dismissSuggestion` (`:554`) and `reconsiderSuggestion` (`:589`). A `PUBLISH_COOLDOWN_MS` prevents immediate re-suggestion (`:260-261`).
- A bulk `approveAllPending` exists (`:744`) — one click, many stores' listings.

**Rollback mechanism — none.** The pre-publish title and description are **never captured**. `listing_optimization` stores only the *proposed* values; the original lives solely in `product.title` / `product.description` / `product.rawData`, and all three are **overwritten** by the same publish (`shopify/index.ts:1318-1323`). After a publish there is no stored copy of what the listing said before, and no revert action exists. **A merchant who dislikes an AI rewrite cannot undo it from écentic.** This is worth flagging to any partner selling this into enterprise retail.

### Do dashboard pages render real data or mock data?

**Real data.** All 20 dashboard `page.tsx` files under `apps/web/src/app/[locale]/(main)/dashboard/` are server components; 23 files in that tree resolve live server actions through `unwrapResult` / `unwrapEntitled`. There is no `lib/mocks` module (`apps/web/src/lib/` contains no mock file), and no mock/fixture/placeholder data module is imported by any dashboard page. The only `mock`-matching files in `apps/web/src/lib` are `agent-api.ts` and `agent-discovery.ts`, where the word appears in unrelated prose.

Demo seeding exists as an operator script (`apps/web/scripts/seed-demo.ts`), which writes real rows to the database — it is not a render-time mock.

### Background job / cron system

Vercel Cron, four scheduled jobs, table in §8. Authenticated by `CRON_SECRET` bearer, fail-closed (`apps/web/src/server/utils/cron.ts:18-59`). Plus a fifth handler, `/api/cron/scan`, that exists but is deliberately unscheduled.

---

## 10. Testing

### Test suite

**Bun's built-in test runner. 14 test files, 160 test cases. Coverage of critical paths is thin.**

- Runner: `bun test src` (`apps/web/package.json`, `"test"` script). No Jest, Vitest, Playwright, or Cypress config in the repo.
- Files and case counts:

| File | Cases |
|---|---|
| `apps/web/src/server/spec/agent-discovery.test.ts` | 26 |
| `apps/web/src/server/spec/agent-api.test.ts` | 24 |
| `apps/cli/src/spec/commands.test.ts` | 24 |
| `apps/web/src/server/spec/feed.test.ts` | 14 |
| `apps/web/src/server/spec/json-rpc.test.ts` | 10 |
| `apps/web/src/i18n/spec/client-messages.test.ts` | 10 |
| `apps/web/src/server/spec/shopify-token.test.ts` | 9 |
| `apps/web/src/server/spec/error.test.ts` | 8 |
| `apps/web/src/server/spec/rate-limit.test.ts` | 8 |
| `apps/web/src/server/spec/problem.test.ts` | 7 |
| `apps/web/src/server/spec/public-api.test.ts` | 7 |
| `apps/web/src/server/spec/shopify.test.ts` | 5 |
| `apps/web/src/server/spec/agent-skills.test.ts` | 4 |
| `apps/web/src/server/spec/http.test.ts` | 4 |

**Critical paths with tests:** Shopify HMAC verification (`shopify.test.ts`), Shopify token refresh (`shopify-token.test.ts`), the cron/purge bearer guard (`http.test.ts:41`), rate limiting, agent-API key handling.

**Critical paths with no tests:** authentication and session handling, multi-tenant ownership checks, the entire UCP checkout/PII pipeline, product sync and write-back, the AI scan engine, billing and Stripe webhooks, cron actions, entitlement gating. There are **no** integration, end-to-end, or database-level tests. There is no coverage tooling configured.

### Dependency scanning

**None.** No `.github/dependabot.yml`, no `renovate.json`, no `.renovaterc*`, no Snyk/Socket/`npm audit`/`bun audit` step in any workflow.

### CI

**`.github/workflows/ci.yml` runs nothing but `bun install`.** Every verification step is commented out:

```yaml
      - run: bun install --frozen-lockfile
      # - run: cd apps/web && bun run typecheck
      # - run: bunx biome ci apps/web/src
      # - run: cd apps/web && bun test src
```

Typecheck, lint, and the test suite are all disabled on `main` and on every pull request. The install is at least frozen-lockfile, which catches undeclared dependencies.

`.github/workflows/migrate.yml` runs `bun run db:migrate` against **production** on every push to `main` that touches `apps/web/drizzle/**`, `schema.ts`, or `drizzle.config.ts`, using `secrets.PRODUCTION_DATABASE_URL_UNPOOLED` under the `production` GitHub environment, with a concurrency lock. There is **no review gate, no dry run, and no rollback step** in that workflow — the `environment: production` declaration means it inherits whatever protection rules are configured in GitHub, which are not visible in the repository.

---

# Red flags

Ordered by severity — how likely each is to fail or stall an enterprise procurement review.

### 1. Non-owner Shopify staff are granted the internal `administrator` role
`apps/web/src/lib/auth.ts:264` — `role: associatedUser.account_owner ? "owner" : "administrator"`.
`administrator` is the exact role that gates `/dev/*` (`apps/web/src/proxy.ts:37-39, 127-129`), `/api/dev/ai-playground` (`:109-113`), and `/api/dev/llm-scraping` (`:19-23`). Any staff account on any merchant's Shopify store that signs in with Shopify lands with access to écentic's internal AI playground and scraping sandbox. This is a privilege-escalation defect reachable by a third party, and it will be found by any reviewer who reads the role assignment. **Fix before the conversation, not during it.**

### 2. No encryption at the application layer for any platform credential
`store_account.accessToken`, `refreshToken`, `consumerKey`, `consumerSecret`, `bridgeSecret` (`apps/web/src/server/database/schema.ts:148-161`); `account.accessToken`/`refreshToken`/`idToken` (`:66-68`); `google_merchant_account.accessToken`/`refreshToken` (`:182-184`). All `text`, all plaintext, zero `createCipheriv`/`pgcrypto`/KMS anywhere in the repo. A database snapshot, a read replica, a backup file, or a leaked `DATABASE_URL` yields live write access to every connected merchant storefront. Enterprise questionnaires ask this question directly and expect envelope encryption with a managed key. **This is the single highest-value remediation.**

### 3. The GDPR webhook answers a factual claim that the code contradicts
`apps/web/src/server/app/integration/shopify/inbound.ts:199-202` returns *"ecentic does not collect or store any customer personal data."* The hosted UCP surface stores shopper name, email, phone, and full shipping address in Redis (`apps/web/src/server/app/ucp/sessions.ts:32-49, 102-119, 195-199`). The same claim appears in the shipped privacy policy (`apps/web/messages/fragments/legal.en.json:66`), which then contradicts *itself* two paragraphs later by disclosing exactly that UCP data collection. A regulator or a partner's DPO comparing the webhook response to the UCP code will treat this as a misrepresentation, not a bug. It also means merchants issuing data-subject requests get a false answer.

### 4. Shopify order-webhook machinery is wired but scope-starved — one line from ingesting shopper PII
`apps/web/src/server/app/integration/shopify/index.ts:635-650` registers `orders/paid`; `apps/web/src/server/app/integration/shopify/inbound.ts:215-216, 42-83` handles it. The subscription silently fails because `read_orders` is not requested (`install/route.ts:6-7`) and the result is deliberately unchecked. Two problems at once: **(a)** Shopify performance-fee attribution is silently broken in production while appearing built; **(b)** adding one scope string turns on full order-payload ingestion — including `customer`, `email`, `billing_address`, `shipping_address` — with no other code change and no review gate.

### 5. The hosted UCP endpoint is unauthenticated by default and accepts shopper PII
`apps/web/src/server/app/ucp/router.ts:329-365`: the API-key check is skipped when the merchant's key is `""`, the agent allow-list is skipped when empty, and RFC 9421 signatures are verify-when-present unless the merchant opts in. Defaults are open on all three (`apps/web/src/server/app/ucp/store-context.ts:14-34`). Any caller who knows a store id can create carts and checkouts and submit buyer PII to `/api/ucp/stores/{id}/...`. Security depends entirely on merchant configuration in a WordPress plugin.

### 6. CI verifies nothing
`.github/workflows/ci.yml` — typecheck, lint, and tests are all commented out. Meanwhile `.github/workflows/migrate.yml` runs schema migrations **directly against production** on merge to `main`. A change can reach the production database having passed no automated check of any kind. Combined with zero dependency scanning (no Dependabot, no Renovate, no audit step), this fails the "secure SDLC" section of essentially every enterprise questionnaire.

### 7. `sendDefaultPii: true` on both Sentry clients, with Session Replay armed for every session
`apps/web/src/instrumentation.ts:16` (server, `tracesSampleRate: 1`) and `apps/web/src/instrumentation-client.ts:59`. Replay is loaded for 100% of sessions (`:74-86`) with `replaysOnErrorSampleRate: 1.0` (`:55`). Sentry therefore receives user IP addresses, request headers, and DOM recordings of the merchant dashboard on every error. No `beforeSend` scrubber and no explicit replay masking configuration exist in the repo. Sentry becomes a sub-processor for merchant PII, and — for any page displaying UCP checkout state — potentially for shopper PII.

### 8. A production dev endpoint guarded by one static, unrotatable, query-string-passable code
`/api/dev/discovery` runs live in production whenever `DEV_DISCOVERY_TOKEN` is set (`apps/web/src/app/(provider)/api/dev/discovery/route.ts:101-112`, `apps/web/src/server/app/intelligence/discovery-report.ts:24-45`). One shared secret, no expiry, no per-caller attribution, no revocation, no rate limit, accepted via `?code=` so it is logged everywhere. Each request fans out to 4 models × 8 queries at écentic's expense. The code's own comment says it should be replaced with real per-agent keys. **No merchant data is exposed** — the honest framing is unmetered spend and a non-auditable credential, not a data breach — but "we ship a `/api/dev/` route to production" is a red flag on its face and needs a prepared answer.

### 9. WooCommerce credentials can end up in the merchant's access logs
`apps/web/src/server/app/integration/woocommerce/http.ts:25-26`, invoked at `:122`: when Basic auth fails, the consumer key **and secret** are appended as query parameters. This is a documented WooCommerce fallback, but the consequence is that live write credentials for a merchant's store are written into that merchant's web-server logs, any intermediary proxy, and any CDN in front of them.

### 10. Any Shopify authorisation scope can be requested through the sign-in proxy
`apps/web/src/app/(provider)/api/auth/shopify-proxy/authorize/route.ts:35-38` copies every inbound query parameter — `scope`, `client_id`, `redirect_uri` — straight into the Shopify authorize redirect. The install route's four-scope answer is therefore not the whole answer, and a partner told "we only request `read_products` and `write_products`" would be told something the code does not guarantee. The route also carries a `TODO: add state` (`:40`).

### 11. No account deletion, no retention policy, no data export
No deletion path exists for any user or for any non-Shopify store (§8). No scheduled purge deletes anything on age. No merchant-facing export. Article 17 (erasure), Article 20 (portability), and every "data retention schedule" question in a standard DPA have no implementation to point at. The only ageing mechanism in the entire system is the 1-hour Redis TTL on UCP sessions.

### 12. Publishing an AI rewrite is irreversible
`apps/web/src/server/app/integration/shopify/index.ts:1318-1323` overwrites `title`, `description`, and `rawData` with the post-publish state; `listing_optimization` (`schema.ts:612-638`) never stores the prior values. There is no revert action. For an enterprise retail client with brand-controlled copy, "our tool rewrites your live product listings and cannot undo it" is a commercial blocker as much as a security one.

### 13. No Postgres row-level security
Tenancy is enforced only by hand-written `userId` comparisons in each server action (§6). The `repository()` delegates expose unscoped `get`/`find`/`update`/`destroy` and are re-exported freely (`apps/web/src/server/app/product.ts:41-51`). One forgotten check is a cross-tenant data leak with no second line of defence. Enterprise reviewers increasingly ask for RLS or an equivalent database-enforced boundary by name.

### 14. A committed development credential
`apps/web/src/server/app/intelligence/discovery-report.ts:22` — `"ecentic-discovery-dev"`. Inert in production, live in every preview and staging deployment. Secret-scanning tooling in a partner's review will flag it.

### 15. Non-revocable product-feed URLs
`apps/web/src/server/app/feed-export.ts:24-43` derives the feed bearer token deterministically from `BETTER_AUTH_SECRET` and the store id, and puts it in a query parameter. A leaked feed URL exposes that store's full catalog and can only be revoked by rotating the global auth secret, which signs out every user and breaks every other store's feed simultaneously.

---

# Cannot determine

Things that could not be established from the code, and what it would take to establish them.

1. **Database region and residency.** Neon is inferable from code comments only (`apps/web/src/server/database/index.ts:10, 16-18`); the region lives in `DATABASE_URL` and the Neon console. — *Needs: the Neon project settings, or the production `DATABASE_URL` host.*

2. **Encryption at rest, and who holds the keys.** No application-layer encryption exists, so this reduces entirely to provider defaults for Neon, Upstash, Vercel, Sentry, and Stripe. — *Needs: each provider's plan tier and configuration; whether customer-managed keys are in use anywhere.*

3. **Upstash Redis region.** This matters more than usual: it is where shopper PII actually lives. `Redis.fromEnv()` (`apps/web/src/server/utils/durable.ts:3`) reveals nothing. — *Needs: the Upstash database settings, including whether it is a global/replicated database, which would put shopper PII in multiple jurisdictions.*

4. **Vercel function region(s).** `apps/web/vercel.json` contains only `crons`; no route declares `preferredRegion`. — *Needs: Vercel project settings.*

5. **Sentry organisation region and data-scrubbing configuration.** `sendDefaultPii: true` is set in code, but Sentry's server-side scrubbing, retention period, and storage region are project settings. — *Needs: Sentry project security & privacy settings.*

6. **Whether `DEV_DISCOVERY_TOKEN` is actually set in production** — i.e. whether `/api/dev/discovery` is live or returning 503. — *Needs: the production environment-variable list.*

7. **Whether `read_orders` is on the Shopify app listing.** There is no `shopify.app.toml`; the Partner Dashboard is the source of truth, and a listing scope can exceed what the install route requests. This determines whether the `orders/paid` subscription at `index.ts:635-650` is genuinely failing or quietly succeeding. — *Needs: the Shopify Partner Dashboard app configuration.*

8. **Whether any merchant has actually enabled the hosted UCP surface.** The code path exists and is WooCommerce-only (`apps/web/src/server/app/ucp/store-context.ts:68`); whether shopper PII has ever been processed is a data question. — *Needs: a count of WooCommerce stores with a non-null `bridgeSecret`, and Upstash key statistics.*

9. **Whether Better Auth's generic-OAuth `state` verification actually fires for the Shopify provider.** `apps/web/src/lib/auth.ts:66-73` disables the app's own state check on the strength of a comment about library behaviour. Not verified against the Better Auth 1.7 source in this audit. — *Needs: reading `better-auth@1.7.2`'s `genericOAuth` callback handler, or a live CSRF test against the sign-in flow.*

10. **GitHub branch-protection and `production` environment approval rules.** `migrate.yml` runs migrations against production on merge; whether a human approval gates that is a GitHub setting, not a repository file. — *Needs: GitHub repository and environment protection settings.*

11. **Effective Sentry Session Replay masking.** The SDK's `maskAllText` / `blockAllMedia` defaults were not verified against the installed `@sentry/nextjs` version, and nothing in the repo sets them explicitly. What a replay actually captures from the dashboard is therefore unknown. — *Needs: reading the installed SDK's replay defaults, or inspecting a captured replay.*

12. **Sub-processor contractual status.** The code proves the calls happen; it says nothing about DPAs, SCCs, or sub-processor agreements with Vercel (AI Gateway), Azure, Anthropic, Google, Perplexity, Upstash, Neon, Sentry, PostHog, Resend, UploadThing, ScrapeLLM, Chatwoot, Cal.com, or BabyLoveGrowth. — *Needs: the commercial/legal record for each.*

13. **Actual production `NODE_ENV` posture for preview deployments.** Vercel preview builds typically set `NODE_ENV=production`, which would close the `/api/dev/ai-playground` and `/api/dev/llm-scraping` open-in-development holes — but this was not confirmed. If previews run with `NODE_ENV !== "production"`, both routes are **completely unauthenticated** on every preview URL. — *Needs: a check of the Vercel build environment for preview deployments.*
