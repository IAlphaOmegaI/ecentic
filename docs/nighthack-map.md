# Night Hack map

Where the code `/agents` reuses lives and how to call it. Paths are under `apps/web/src/` unless they say otherwise. Line numbers are as of commit `63505b3d`.

## The three things that will catch you out

1. **Every action in `server/app/integration/*` needs a session or a database row.** `/agents` is public, with no session and no store row. Call the plain client in `server/utils/google-merchant.ts` instead, and read catalogs yourself over `HTTP.page`.
2. **Our importers and feed export default currency and availability. Do not copy those lines.** They break hard rule 1. See "Defaults you must not copy" below.
3. **`ecentic-demo.myshopify.com` is not a real store.** See "Demo store" below.

## Merchant API client

`server/utils/google-merchant.ts`, imported as `import * as GoogleMerchantAPI`. Plain functions, no session. Each takes the access token first and returns a `Result`.

| Need | Call |
| --- | --- |
| Client config, `null` when unset | `configuration()` gives `{ clientId, clientSecret, advancedAccountId }` |
| Fresh token | `refreshAccessToken(config, { refreshToken })` |
| Website ownership (hard rule 3) | `getHomepage(token, accountId)` gives `{ uri?, claimed? }` |
| Accounts | `listAccounts(token)`, `listSubaccounts(token, accountId)` |
| Data sources | `listDataSources(token, accountId)`, `createSupplementalDataSource(token, { accountId, displayName })`, `patchDataSourceDefaultRule(...)` |
| Offers and merged state | `listProducts(token, accountId)` |
| Push one override | `insertProductInput(token, { accountId, dataSourceName, offerId, contentLanguage, feedLabel, attributes })` |
| Link | `proposeAccountManagement(...)`, `approveAccountService(token, name)` |

Take `offerId`, `contentLanguage` and `feedLabel` from `listProducts`. Never rebuild them, or the input merges onto nothing.

`ProductInputAttributes` only carries `title`, `description`, `productTypes`, `customLabel0` and `gtins`. Pushing anything else means widening that type.

## OAuth

- `app/(provider)/api/integrations/google/install/route.ts`: `GET ?store=<storeId>`. Sets the nonce and store cookies, then redirects to Google.
- `app/(provider)/api/integrations/google/callback/route.ts`: checks the nonce, **requires a signed-in session**, then runs `GoogleMerchant.handleOAuthCallback(Environment.SERVER, { code, store })`.
- Tokens land on the `google_merchant_account` row for that store (`server/database/schema.ts`). The scope is `https://www.googleapis.com/auth/content`.

## Link and Path 1 (supplemental data source)

`server/app/integration/google-merchant.ts`. It is `"use server"`, and each action below is `withAuthentication` plus `ownedStore` (the session user must own the store row). The token helper `resolveAccessToken` is private. So `merchant.ts` follows the same order through the client above rather than calling these:

| Step | Action | Client calls it wraps |
| --- | --- | --- |
| 1. Link | `proposeLink({ store })` | `proposeAccountManagement` |
| 2. Data source | `ensureSupplementalDataSource({ store })`, with private `ensureDefaultRule` (line 654) | `listDataSources`, `createSupplementalDataSource`, `patchDataSourceDefaultRule` |
| 3. Push | `pushOverrides({ store })` | `listProducts`, `lintOverrideAttributes`, `insertProductInput` |
| 4. Confirm | `verifyOverrides({ store })` | `listProducts` |

A store's feed label and language come from its primary feed, and provisioning only counts as done when the primary's default rule lists our source first. The full model is in `docs/integrations/google-merchant-center.md`.

## Validation

- `lintOverrideAttributes(attributes)` in `server/utils/google-merchant.ts` returns `PolicyIssue[]`. Anything it flags must not be pushed (hard rule 5). It checks title and description only.
- `server/app/intelligence/listing-rules.ts`: `evaluateListing(listing, catalog?)`, `RULES`, `isValidGtin(value)`, `catalogContextFor(listings)`. It takes its own `Listing` shape and returns its own `Finding`, not the one in `storefront/catalog.ts`, so map both ways.

## Product model and importers

- Tables in `server/database/schema.ts`: `store`, `store_account`, `product`, `googleMerchantAccount`. Delegates in `server/app/product.ts`. `/agents` stores nothing here.
- Shopify, `server/app/integration/shopify/index.ts`: `probe(Environment.SERVER, { domain, home })` is callable. `fetchPublicProducts` (line 1477) is private, and `syncPublicCatalog` needs a user and a store row.
- WooCommerce, `server/app/integration/woocommerce/index.ts`: `probe` is callable. `locateCatalog` (526) and `toProduct` (646) are private. Exported helpers are in `woocommerce/http.ts`: `normalizeStoreUrl`, `isWooCommercePage`, `restUrl`, `toMajor`, `decodeEntities`.
- Both `probe`s are `withContext`, which awaits `headers()`, so they need a request scope. Call them from a route handler or server action.
- `read.ts` therefore fetches `/products.json` and the Store API itself through `HTTP.page`.

### Defaults you must not copy

| Where | What it does |
| --- | --- |
| `schema.ts` `product.currency` | `.default("USD")` |
| `shopify/index.ts:1626`, `:1751` | `meta?.currency \|\| "USD"` |
| `woocommerce/index.ts:179`, `:670` | falls back to `"USD"` |
| `feed-export.ts:96`, `:127`, `:132` | availability falls back to `in_stock` |
| `feed-export.ts:174` | `currency ?? "USD"` |
| `feed-export.ts:269` | hardcodes `condition` to `new` (for us that is a recorded `Fix`) |

`server/app/feed-export.ts`: mirror the Google field mapping in `buildGoogleFeed` (around line 254), not its values.

## Rewrite logic

- `server/app/optimization.ts:123`, `generateImprovedListing`. Private, so copy the prompt. It calls `AI.generate({ instructions, prompt, output })` with `z.object({ title, description_html })` and tells the model not to invent specs.
- `AI.generate` is in `server/utils/ai.ts`. Every `output` schema property must be required: use `.nullable()`, never `.optional()` or `.default()`, or Azure rejects the call.
- `server/app/intelligence/simulate.ts` (`runScan`, `enqueueScan`) scores products against competitors. It does not rewrite anything, and it is `withAuthentication`. Judge prompts are in `intelligence/judge.ts`.

## AI product-card view

There is no component dedicated to this. The closest match is `ProductCard` in `components/ucp-playground/playground-client.tsx:323`, wrapped by `ProductsCard` (line 695). It renders what an agent got back from a store: image, title, rating, price, struck-through list price, variants. It appears on the public `/ucp-playground` and on `/dashboard/[store]/ucp-playground`.

It is not exported and takes a `UcpProduct` plus a translator, so export it or copy its markup, and map from `catalog.ts`. Its small labels use uppercase tracking, which AGENTS.md rules out for new work.

The other candidate is `ResultProductCard` in `app/[locale]/(auth)/compare/_components/compare-form.tsx:590`, which shows a product plus its win count on `/compare`.

## Demo store

`scripts/seed-demo.ts` (`bun run db:seed:demo`) fills the dashboard with demo data. **`ecentic-demo.myshopify.com` (line 1120) is a fabricated placeholder the seeder creates. It has no real storefront and no Merchant Center account, so never treat it as the demo store.**

The real demo domain comes from the `AGENTS_DEMO_DOMAIN` env var. Nothing reads it yet, `merchant.ts` will, and it has no default: unset means nothing is eligible for a push. It still has to be set on Vercel.

Do not run the seeder from here. `apps/web/.env.local` in the main checkout points at production.

## Auth and routing

- `src/proxy.ts` is a deny-list. Only `PROTECTED` (`/dashboard`, `/onboarding`, `/complete-profile`), `STAFF_ONLY` (`/dev`) and `AUTHENTICATION` (`/sign-in`, `/sign-up`) are gated, so `/agents` is public with no registration.
- The proxy matcher skips `api`, so `/api/*` routes get no proxy checks and must rate-limit themselves.
- Pages go in `app/[locale]/(main)/agents/`, API routes in `app/(provider)/api/`. `/api/agents` is free.
- Session wrappers are in `server/utils/context.ts` and `server/utils/authentication.ts`. Public code uses `withInstrumentation` or `withContext`, never `withAuthentication`.

## Shared utilities

| Need | Call |
| --- | --- |
| Fetch a user-supplied URL | `HTTP.page(url, { timeout, limit, accept })`, always guarded, or `HTTP.request(url, init, { guard: true })` in `server/utils/http.ts` |
| Normalize or check a URL | `resolveOrigin(input)`, `isSafePublicHttpUrl(raw)` in `server/utils/ssrf.ts` |
| Rate limit | `consume(request, policy)` and `identify(request)` in `server/utils/rate-limit.ts`, with `Policy = { name, limit, window, keyed? }`. It allows everything when Redis is not configured |
| Redis | `redis` in `server/utils/durable.ts`, from `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or the `KV_REST_API_*` names) |
| Bot walls | `classifyPageAccess(page)` in `server/app/intelligence/bot-challenge.ts` |

## Deploy

Vercel project `ecentic`, scope `zennit`. The link is `.vercel/project.json` in the main checkout; this worktree has none. `apps/web/vercel.json` only holds crons. Run `vercel env pull` from the repo root, and pass `--scope zennit` where a command needs it. Sensitive vars pull back empty. The session lead deploys.

## Running this worktree

```bash
bun install --frozen-lockfile && bun run build:packages   # repo root
cd apps/web && node_modules/.bin/next typegen
node_modules/.bin/tsc --noEmit -p tsconfig.json           # baseline on clean tree: 294 errors
bun test src/server/spec/storefront
node_modules/.bin/next dev --port 3457
```

`apps/web/.env.development.local` holds placeholders only and is gitignored. Static pages render. Anything that needs the database, Redis or an AI provider fails until real values are set, and those values must never come from production.
