# AGENTS.md - Docs-First Engineering Guide

This file is the **single source of truth for working in this repository** — for any AI agent or developer, regardless of tool/editor. Tool-specific files (for example `CLAUDE.md`) may layer habits on top, but never override or duplicate what is here.

This repository uses `docs/` as the canonical source of truth for product context, implementation patterns, and package usage.

---

## What This Is

**ecentic** is an e-commerce optimization platform for the AI agent economy. It simulates how AI shopping agents (ChatGPT, Claude, Gemini, Perplexity) compare products vs. competitors, diagnoses why products win or lose, and auto-optimizes listings. See `docs/context/idea.md` for full product spec and feature roadmap.

---

## How To Work In This Repo

Read in this order before substantial work:

1. `docs/index.md` - docs navigation hub.
2. `docs/context/` - product context, before making product or UX decisions (`idea.md`, `strategy.md`, `shopify.md`).
3. `docs/agents/` - coding rules, before implementing code.
4. `docs/web/index.md` and `docs/shared/index.md` - component/package API references, before building components.

If code and docs disagree, prefer docs intent unless explicitly instructed otherwise.

---

## Priority Sources

### Product Context (Read First For Feature Work)

- `docs/context/idea.md` - core product definition, architecture, flows, roadmap.
- `docs/context/strategy.md` - market/measurement strategy, retention, enterprise priorities.
- `docs/context/shopify.md` - Shopify-facing claims, copy, scopes, review/testing constraints.

### Implementation Rules

- `docs/agents/AGENTS-checklist.md` - execution checklist.
- `docs/agents/AGENTS-style.md` - TypeScript and coding style conventions.
- `docs/agents/AGENTS-components.md` - React component patterns.
- `docs/agents/AGENTS-nextjs.md` - Next.js architecture and rendering patterns.
- `docs/agents/AGENTS-packages.md` - required use of `@zenncore/*` packages.

### Package Docs

- `docs/web/index.md` - web components.
- `docs/shared/index.md` - shared packages (`utils`, `icons`, `data-table`, `inferred-form`, `phone`).

---

## Non-Negotiable Standards

- Use `@zenncore/web` components for interactive UI; avoid custom raw HTML implementations for controls.
- Prefer `@zenncore/*` packages before adding local duplicates.
- Use semantic Tailwind tokens (`text-primary`, `bg-background`, `border-accent-foreground`, etc.), not raw color utility classes.
- Use `const` over `let`, descriptive variable names, early returns, and `resultify`-style error handling.
- Follow PPR/streaming on non-onboarding/non-auth pages: server-rendered shell in `page.tsx`, async server components wrapped in `<Suspense>` with matching skeletons.
- Use only `Motion.Row`, `Motion.Up`, `Motion.Item`, and `Motion.Stagger` for animations.
- Do not invent product facts or KPI definitions when they already exist in `docs/context/`.

---

## Commands

All commands use **Bun** as the package manager. Run from the monorepo root unless noted.

```bash
# Development
bun run dev           # Start all apps (Turborepo)
bun run dev:web       # Start only the Next.js web app

# Build & type checking
bun run build         # Build all packages
bun run build:web     # Build only web app
bun run typecheck     # tsc --noEmit across all packages

# Linting (Biome)
bun run lint          # biome check --write (root)
cd apps/web && bun run lint  # biome check --write --unsafe (web only)

# Database (run from apps/web/)
bun run db:generate   # Generate Drizzle migration files
bun run db:migrate    # Apply pending migrations
bun run db:push       # Push schema directly (dev only)
bun run db:studio     # Open Drizzle Studio UI
bun run db:reset      # Reset database (scripts/reset.ts)
```

```bash
# Tests (Bun's runner; specs live in apps/web/src/server/spec/ and src/i18n/spec/)
bun run test          # all apps
cd apps/web && bun test src
```

Note: `bun run typecheck` is not a clean gate — the repository carries a few
hundred pre-existing errors. Compare the count before and after your change
rather than expecting zero.

---

## Monorepo Structure

```
/
├── apps/web/                 # Main Next.js 16 application
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # Shared app-level components
│   │   ├── server/           # All server-side code (actions, DB, utils)
│   │   └── lib/              # Client-side utilities (auth client, mocks, animations)
│   └── drizzle/              # Generated migration files
├── apps/cli/                 # @ecentic/cli — published npm CLI for the public agent API
├── packages/
│   ├── web/                  # @zenncore/web — UI component library + Tailwind config
│   ├── shared/
│   │   ├── utils/            # @zenncore/utils — cn, resultify, Result type, hooks
│   │   ├── inferred-form/    # @zenncore/inferred-form — schema-driven form builder
│   │   ├── data-table/       # @zenncore/data-table — TanStack Table wrapper
│   │   ├── icons/            # @zenncore/icons
│   │   ├── phone/            # @zenncore/phone — phone input utilities
│   │   └── config/           # @zenncore/config — shared TS/Tailwind/tsdown configs
│   └── mobile/               # @zenncore/mobile (placeholder)
└── docs/                     # Agent rules, product context, and package documentation
```

---

## Server Architecture (`apps/web/src/server/`)

### Three-layer structure:

**1. Database** (`server/database/`)
- Drizzle ORM + PostgreSQL via `postgres.js`
- Schema in `schema.ts`: `user`, `session`, `account`, `verification`, `store`, `store_account` (Shopify OAuth tokens per store), `product`, `competitor`, `scan`, `simulation`, `ucpProfile`, `agentVisit`, `agentTrafficDaily`, `listingOptimization` (listing rewrites + win-rate lift tracking), `subscription` (Stripe billing state), `agentApiKey` (hashed agent API keys), `blogPost`
- Relations defined alongside schema for typed joins
- Config in `apps/web/drizzle.config.ts`

**2. Utilities** (`server/utils/`)
- **Context system**: `withInstrumentation()` → headers-free base (safe for repositories, `"use cache"`, and static/build paths); `withContext()` → adds request layers (auth API, Sentry, storage); `withAuthentication()` → adds `session`; `withAuthorization()` → adds role checks; `withSubscription()` (`utils/entitlement.ts`) → adds billing entitlement (`subscription`): the action only runs for an active flat plan or activated pay-as-you-go, failing with the expected `subscription-required-error` otherwise. Use the auth wrappers only on exported server actions; do not add explicit return type annotations on wrapped actions.
- **Entitlement**: dashboard-only feature modules (`optimization`, `report`, `tracking` reads, `brand-snapshot`, `intelligence/{audit,brand,catalog-rank,listing-quality,agent-readiness}`, `intelligence/ucp/profile`) are wrapped in `withSubscription`; modules shared with the free onboarding scan (`product`, `competitor`, `scan`, `simulation`, integrations) stay on `withAuthentication`. The dashboard UX gate is `SubscriptionGate` (`dashboard/_components/subscription-gate.tsx`), a paywall overlay streamed on its own Suspense boundary in `dashboard/[store]/layout.tsx` and `/dashboard/reports` — never awaited in a layout body (it would collapse the PPR shells). Render-path reads of gated actions go through `unwrapEntitled` (resolves a missing plan to `null` beneath the overlay; there are no error boundaries under the dashboard). Settings and the hub stay ungated so billing is always reachable.
- **Repository pattern**: `repository(schema.table)` returns typed `get`, `create`, `update`, `destroy`, `find`, `paginate`, `exists`, `count`. Prefer repository delegates over raw `db` calls.
- **Error classes**: `DatabaseError`, `NotFoundError`, `RequestError`, `TimeoutError`, `ParseError`, `UnauthenticatedError`, `UnauthorizedError`, `InvalidCredentialsError`, `SubscriptionRequiredError`
- **HTTP**: `request(url, options, { timeout })` → `Result<Response, Error>`; `parse<T>(response)` → `Result<T, Error>`

**3. Server actions** (`server/app/`)
- `authentication.ts` — signIn, signUp, signOut, verifyEmail, resetPassword, getCurrentUser
- `store.ts`, `product.ts`, `competitor.ts`, `scan.ts`, `simulation.ts` — CRUD via repository
- `storage.ts` — UploadThing storage integration
- `tracking.ts` — AI agent visit tracking
- `user.ts`, `session.ts` — user/session management
- `integration/shopify.ts` — OAuth token exchange + product sync via Shopify Admin API
- `integration/woocommerce.ts` — credential validation + paginated product fetch
- `integration/feed.ts` — XML/JSON auto-detection + Google Shopping format parsing
- `intelligence/simulate.ts` — AI simulation engine (ChatGPT, Claude, Gemini, Perplexity perspectives)

---

## App Router Structure (`apps/web/src/app/`)

```
app/
├── (auth)/                       # Route group — sign-in, sign-up, onboarding
│   ├── sign-in/
│   ├── sign-up/
│   └── onboarding/               # connect → products → competitors → scan
├── (main)/                       # Route group — landing page + protected pages
│   ├── page.tsx                  # Landing page
│   ├── _components/              # Landing page components
│   ├── privacy-policy/
│   └── dashboard/                # Protected pages (PPR + streaming)
│       ├── products/             # Product list + detail views
│       ├── competitors/
│       ├── reports/
│       ├── optimize/
│       ├── ucp/                  # Universal Commerce Protocol
│       └── settings/
├── (provider)/                   # Route group — API routes
│   └── api/
│       ├── auth/[...all]/        # Better Auth route handler
│       ├── integrations/         # Shopify OAuth install + callback
│       ├── cron/                 # Scheduled job endpoints
│       └── tracking/             # Agent visit tracking endpoints
├── layout.tsx
├── globals.css
├── manifest.ts
├── robots.ts
└── sitemap.ts
```

Page-specific components live in `_components/` subdirectories next to their page — **client and server components alike**, plus Suspense skeletons (`_components/skeletons.tsx`). The underscore keeps the folder out of routing. Only route-convention files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`) belong in the route folder itself.

### PPR and Streaming (dashboard and app screens)

Every `page.tsx` must be a **server component** that exports real HTML — not a thin wrapper around a single client component. Use **Partial Prerendering (PPR)** and streaming:

- **Static shell** — Render in `page.tsx`: layout, page title, description, headings. This is the initial HTML.
- **Data** — Fetch in **async server components** (same file or `_components/`). Wrap each in `<Suspense fallback={<Skeleton />}>` with a skeleton that matches the content shape.
- **Skeletons** — Export them from `_components/skeletons.tsx` so `page.tsx` and `loading.tsx` share the exact same shapes and navigation lands without layout shift.
- **Streaming** — The server sends the shell first, then streams in resolved async components so users see content as it loads.

Onboarding/auth screens may be client-heavy by design; all other screens (dashboard, settings, lists, details) follow this pattern. See `docs/agents/AGENTS-nextjs.md`.

---

## Key Patterns

### Error handling — `resultify` in actions, `unwrapResult` in server components
```ts
// In server actions / utilities — use resultify + manual checks
import { resultify } from "@zenncore/utils";
const result = await resultify(() => fetch(url));
if (!result.success) return { success: false, error: result.error };
return { success: true, data: result.data };

// In server components (inside Suspense) — use unwrapResult, throws on error
import { unwrapResult } from "@zenncore/utils";
import { Environment } from "@/server/utils/environment";
const products = await unwrapResult(Products.skimForCurrentUser(Environment.SERVER));
```
`@zenncore/utils` `Result<T>` uses a non-distributive void check so `T | undefined` and `any` success branches always include `data`. `resultify` awaits PromiseLike values (not only `instanceof Promise`) so Drizzle query builders are not returned as `data`.

### Server module imports — namespace pattern
```ts
// Server components: full namespace (functions + types)
import * as Products from "@/server/app/product";

// Client components: type-only namespace (no server code bundled)
import type * as Products from "@/server/app/product";
```
Prefer repository delegates (`Product.find(...)`) over ad hoc `db` calls when the repository exposes the operation.

### Forms — use `InferredForm` + `field()`
All forms are defined via Zod schema + `field()` descriptors. No inline `<input>` or manual react-hook-form registration.

### Styling — semantic Tailwind tokens only
Use `text-primary`, `bg-background`, `border-accent-foreground`, etc. Never raw colors like `text-gray-500` or `bg-white`.

### Components — Namespace pattern
```tsx
const Feature = {
  Root: ({ children }) => <div>{children}</div>,
  Title: ({ children }) => <h2>{children}</h2>,
};
```

### Animations — only `Motion.Row`, `Motion.Up`, `Motion.Item`, `Motion.Stagger`
### Conditionals — `switch (true)` over long `if/else if` chains
### Derived values — IIFE for scoped intermediate logic
### Variables — `const` only, no `let`; no abbreviated names (`context` not `ctx`, `error` not `err`)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19, React Compiler |
| Database | PostgreSQL, Drizzle ORM 1.0 beta |
| Auth | Better Auth 1.7 (email/password + Drizzle adapter) |
| AI | Vercel AI SDK — GPT direct on Azure OpenAI; Claude + Gemini + Perplexity via the Vercel AI Gateway |
| Email | Resend + React Email |
| Storage | UploadThing |
| Styling | Tailwind CSS 4 |
| Animations | Motion (Framer Motion fork) |
| Charts | Recharts |
| URL State | nuqs |
| Monitoring | Sentry + PostHog |
| Linting | Biome (no ESLint/Prettier) |
| Build | Turborepo + Bun |
| i18n | next-intl (`en` default, `es` at `/es/...`) |

---

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_BASE_URL        # e.g. http://localhost:3000
RESEND_API_KEY
FROM_EMAIL
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
UPLOADTHING_TOKEN
NEXT_PUBLIC_SENTRY_DSN

# AI providers — two rails, chosen by the SHAPE of the model argument in
# apps/web/src/server/utils/ai.ts (`model(id)`):
#   provider instance  → billed direct   → ChatGPT, when AZURE_DEPLOYMENT_GPT names a deployment
#   "provider/model"   → billed via gateway → Claude, Gemini, Perplexity — and ChatGPT wherever
#                                              this environment has no Azure deployment for it
# No per-vendor key is needed; the gateway covers everything Azure can't serve.
AZURE_RESOURCE_NAME                       # subdomain only, e.g. "my-resource" (NOT the full URL)
AZURE_API_KEY
AZURE_API_VERSION                         # optional. Unset → the AI SDK's own default, which is "v1" in
                                          # @ai-sdk/azure 4.x despite its docstring claiming "preview".
                                          # Both are accepted; set it explicitly rather than trust the default.
AZURE_DEPLOYMENT_GPT                      # your ChatGPT DEPLOYMENT name, e.g. "gpt-5.4" — the deployment's
                                          # name, NOT the model's (list them: curl "https://$AZURE_RESOURCE_NAME.openai.azure.com/openai/deployments?api-version=2023-03-15-preview"
                                          # -H "api-key: $AZURE_API_KEY"). The "gpt" seat maps here. Unset in an
                                          # environment → "gpt" resolves to GPT_GATEWAY_MODEL on the gateway,
                                          # because Azure 404s any deployment name it was not given. Repoint the
                                          # deployment and that constant together, or the rails judge with
                                          # different models under one "ChatGPT" label.
                                          # Legacy alias: AZURE_DEPLOYMENT_GPT4O (same gpt seat) if GPT is unset.
AI_GATEWAY_API_KEY                        # Vercel AI Gateway — Claude/Gemini/Perplexity calls
```

Billing. Three separate products: free **Scan** (one-time, no billing row),
**Pay-as-you-go** (free to start, no card until a fee is due, billed only via the
performance fee), and flat **Subscription** (Compete/Scale/Dominate, no fee). The fee
never rides a subscription. PAYG runs on calendar months; the Stripe rail charges
one-off invoices (Shopify-installed stores bill via Shopify usage records).
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_SUB_COMPETE                        # recurring price id — Compete plan ($14.90/mo)
STRIPE_SUB_SCALE                          # recurring price id — Scale plan ($44.90/mo)
STRIPE_SUB_DOMINATE                       # recurring price id — Dominate plan ($149/mo, top tier)
APP_HOST                                  # e.g. https://ecentic.ai (checkout return + webhook origin)
CRON_SECRET                               # Bearer secret for /api/cron/* (scan + billing)
BABYLOVEGROWTH_BLOG_API_KEY               # optional — BabyLoveGrowth Next.js Blog read key
BABYLOVEGROWTH_WEBHOOK_SECRET             # optional — Bearer for /api/webhooks/babylovegrowth (EN→ES Azure translate)

# Pay-as-you-go performance fee (one-off Stripe invoices, not metered).
PERFORMANCE_FEE_RATE_BPS_DEFAULT=300      # 3%, overridable per account
PERFORMANCE_FEE_CAP_CENTS_DEFAULT=50000   # $500 / month, overridable per account
PERFORMANCE_FEE_ATTRIBUTION_WINDOW_DAYS=7 # AI-referral → order attribution window

# Shopify Global Catalog MCP (optional — real agent-shelf rank measurement,
# see docs/context/agent-visibility.md). Credentials from Dev Dashboard →
# Catalogs → "Get an API key" (catalog keys, NOT the app's SHOPIFY_API_KEY).
SHOPIFY_CATALOG_CLIENT_ID
SHOPIFY_CATALOG_CLIENT_SECRET
SHOPIFY_CATALOG_TOKEN_URL                 # default https://api.shopify.com/auth/access_token
SHOPIFY_CATALOG_MCP_URL                   # default https://catalog.shopify.com/api/ucp/mcp
UCP_AGENT_PROFILE_URL                     # default {APP_HOST}/ucp/agent-profile

# Google Merchant Center — hybrid channel-partner integration
# (docs/integrations/google-merchant-center.md). Merchant-consent OAuth client
# (scope https://www.googleapis.com/auth/content) from the GCP project with the
# Merchant API enabled; the MCA id is our advanced account that accountManagement
# links are proposed from.
GOOGLE_MERCHANT_CLIENT_ID
GOOGLE_MERCHANT_CLIENT_SECRET
ECENTIC_MCA_ID                            # numeric Merchant Center advanced-account id
GOOGLE_MERCHANT_MCA_REFRESH_TOKEN         # optional — MCA-admin grant; auto-approves incoming link proposals (unset = approve manually in the MCA's Merchant Center)
```

---

## Delivery Expectations

- Align implementation with documented product behavior and naming.
- Keep docs in sync when behavior changes intentionally.
- Prefer small, composable server/client boundaries over monolithic client pages.
- Use documented component APIs and package contracts before introducing new patterns.

---

## Learned User Preferences

- Keep onboarding and dashboard UX clear and structured, preferring dedicated pages when flows need detailed field explanations.
- Treat `docs/context/` as the canonical source for project-specific product context before implementation decisions.
- Prefer colocating tightly related UI pieces (for example desktop/mobile navbar variants and shared links) in one file rather than splitting into small component files. Public language switcher belongs in the navbar as a flag select with transparent chrome (no fill/border that breaks the menu edge), spaced clear of the Install CTA; locale flag assets live under `apps/web/public` (same pattern as the EU flag), not as React components under `src/components/flags`; on mobile, place it under the menu photo like desktop rather than as a cramped header `SelectTrigger`; mobile nav sheet keeps the ecentic logo left-aligned and uses correct button variants for bottom CTAs.
- Do not hoist repeated Tailwind `className` strings into top-level const declarations; inline classes on elements or use inline unexported sub-components instead.
- When reusing streaming log panels outside full-viewport contexts (e.g. onboarding `AutoDetectTab` on `/dashboard/simulations`), auto-scroll only the log container (`scrollTo` on the `overflow-y-auto` element), not `scrollIntoView` on a sentinel—which scrolls ancestor/page scrollers.
- Translation keys: camelCase + dot namespaces (`signIn.fields.email.label`); role-based `action.primary|secondary|tertiary|quaternary` (never `primaryInverse` or verb keys like `submit`/`cancel`); per-feature namespaces. Type via next-intl `AppConfig` + `createMessagesDeclaration` — use `getMessages`/`useMessages` for structured arrays/objects, not `t.raw()`, hand-rolled message types, or ad-hoc type assertions. Prefer catalog fragments under `apps/web/messages/fragments/` merged via `bun apps/web/scripts/merge-i18n-fragments.ts`; after catalog edits run `bunx next typegen` and `bun run i18n:check`. Wire all user-visible static UI (auth, onboarding, dashboard, marketing) through next-intl—no English fallbacks for missing Spanish keys.
- For dashboard flex column layouts that should scroll internally, add `min-h-0 flex-1 overflow-hidden` on each `flex-1` ancestor in the height chain. Product tables give the title the flexible column; long names truncate/overflow instead of wrapping into tall rows or empty trailing cells. Product thumbnails in tables, accordions, and roster lists are rounded squares.
- Use `@zenncore/web` components for interactive UI (Accordion, Collapsible, Table, Avatar, Tabs, DropdownMenu) instead of native `details`/`summary`, raw `<table>`, custom segmented controls, or one-off popovers. Dashboard store switcher, command palette, and column menus should be compact rounded menus (not large padded items), with a separator before reset/destructive actions.
- On marketing and content pages, avoid uppercase eyebrows and all-caps category labels; use sentence-case headings unless `docs/context/design.md` explicitly calls for caps (stat labels, numbered section kickers). Prefer large primary section indexes (e.g. `text-3xl text-primary`) over tiny tracked uppercase step micro-labels. On dashboard cards too, avoid `text-xs uppercase tracking-[0.2em]` labels (Impact, Win Rate, Missing Attributes); reuse `SectionKicker` for subtitles. Reserve `font-mono` for code-like strings (URLs, capability keys, HTTP snippets)—not regular labels or titles. Prefer shared `ItemCycle` (optional logos) and animated vertical step/item cycles over `STEP`/`LAYER` eyebrow grids or one-off carousels for workflow/agent showcases; reuse across product-listings, Shopify, WooCommerce, and resources. Pricing plan cards stay a 2×2 grid—never a single-row xl 1×4.
- Separate major marketing sections with `SectionGutter` from `dashboard/_components/grid.tsx`.
- Reserve `background.webp` hands artwork for the landing page's light hero; use `blog.png` for blue content-page heroes unless the design canon specifies another treatment. Marketing page banners should be full-height with end-aligned content, vertical border delimiters like other content pages, and badges/chips above the body copy (not above the title).
- When section shells already draw borders (`border-b`, `gap-px` grids), remove redundant inner borders on the last child or adjacent panels to avoid double lines (e.g. `last:border-b-0` on shared FAQ accordion items; no extra `border-b`/`border-t` between stacked validator panels). Stretch marketing split-panel stacks to fill row height (avoid leftover gray gaps); keep separators from crowding nearby text; omit decorative icons that only inflate section height.

## Learned Workspace Facts

- If Postgres reports `relation "..." does not exist`, run migrations from `apps/web` using `bun run db:migrate`. From the same app, `bun run db:push` syncs the Drizzle schema directly (dev convenience); `bun run db:migrate` applies versioned SQL migrations (prefer for production-style workflows).
- AI streaming server actions use `AI.stream<EventType>()` and return `{ output }`, consumed client-side with `readStreamableValue(output)` and `switch (event.kind)`. For Zod schemas passed as `output:` to AI `generate()`/`stream()`, every property must be required: Azure's structured-output mode rejects the whole call with `Invalid schema for response_format 'response': 'required' is required to be supplied and to be an array including every key in properties. Missing '<field>'`. Both `.default()` **and** `.optional()` emit the field as optional and trip this, so use `.nullable()` for a field the model may not fill and apply the fallback in code (`currency: product.currency ?? "USD"`). Verified 2026-08-30 against the app's Azure deployment; it is what silently broke the onboarding "Paste URLs" tab. Tool `inputSchema`s are not affected. Local Azure env may name the ChatGPT deployment `AZURE_DEPLOYMENT_GPT4O` while code prefers `AZURE_DEPLOYMENT_GPT`; `model("gpt")` accepts either so Azure is used when the gateway wallet is empty.
- Site i18n uses `next-intl` with `en` (default, no prefix) and `es` (`/es/...`); catalogs in `apps/web/messages/{en,es}.json`; `apps/web/global.ts` AppConfig types messages from `en.json` (see `docs/integrations/blog-i18n.md`). Locale for RSC comes from `next/root-params` in `i18n/request.ts` — root layout lives at `app/[locale]/layout.tsx` (no pass-through `app/layout.tsx`); do not use `setRequestLocale`. Pass explicit `{ locale }` into next-intl server APIs from Server Actions / Route Handlers until root-params supports them. Dashboard sidebar is an accordion of `catalog` / `intelligence` / `channels` groups (not a flat link list); group labels and store-switcher copy live in `apps/web/messages/fragments/dashboardChrome.{en,es}.json` under `dashboard.nav.groups` — every `groups[].key` in `sidebar-nav.tsx` needs a matching key or the nav crashes. Blog posts share slugs across locales (`blog_post.locale`); BabyLoveGrowth webhook upserts **EN + ES** on publish (Azure translates meta + chunked HTML for ES — no Markdown). `Blog.resolve` / index / OG / sitemap are **Postgres-only** (no live BLG during SSG). Prerender every blog slug × locale via `generateStaticParams` and ISR/`revalidateTag("blog")` when the webhook writes—pages stay fully static; public resolve never runs Azure. Do not put file-level `"use server"` on modules that also export sync helpers/cache tags (breaks Turbopack); blog RSC helpers must not call `withContext`/`headers()`; avoid wrapping next-intl-using homepage trees in `"use cache"`. Do not cache soft-failure `null` from BLG per-slug fetches (404s English while Spanish still serves from Postgres).
- Non-onboarding/auth pages are expected to follow PPR/streaming patterns with a server-rendered `page.tsx` shell and Suspense-wrapped async server components.
- Shopify OAuth and WooCommerce connect must run catalog import during the connect flow (not only `Store.create`); otherwise onboarding can show no products. Shopify catalog sync upserts by `storeId` + `externalId` (update existing rows, create only new)—do not duplicate products on reconnect or re-sync. WooCommerce REST product updates must use `PUT` to `/wp-json/wc/v3/products/{numericId}` with no `.json` suffix after the id; publishing optimized listings requires REST API keys with read/write permissions (read-only keys work for sync but not `PUT` updates).
- For Shopify storefront ScriptTag `tracker.js`, beacons use the script origin with `Authorization: Bearer` and CORS; requests relative to the merchant domain never reach the app API. HTTPS storefronts cannot load `http://localhost` scripts (mixed content); set `ECENTIC_TRACKER_PUBLIC_ORIGIN` to a public HTTPS base URL (for example an ngrok tunnel) for ScriptTag `src`, and reconnect OAuth after that URL changes.
- Local Next dev: after code or env changes, rely on hot reload or restart the dev server; remote hosting still needs redeploy when you change env or ship builds. `reactCompiler: true` in `apps/web/next.config.ts` requires `babel-plugin-react-compiler` in `apps/web` devDependencies.
- Prefer repository delegates from the model files in `apps/web/src/server/app/` (for example `import * as Product` and `Product.find(...)`) instead of ad hoc `db` calls when the repository already exposes the operation; prefer repository `find` over `resultify` + `findFirst` when available. Raw read-only `db.select` thunks that remain (aggregates the repository cannot express) use `resultifyRead` from `@/server/utils/repository` — one retry across a dead pooled connection (Fluid freeze/thaw); writes keep plain `resultify`.
- Roles: two vocabularies share `user.role`. `staff` is ecentic's own people — written only by `scripts/create-admin.ts`, and the only role that opens `/dev/*` (gated in `proxy.ts` via `isInternalStaff`, plus `withAuthorization([UserRole.STAFF])` on the actions, since a server action is reachable by POST without passing the proxy). `owner`/`administrator` come from the Shopify OAuth payload and describe a merchant's standing in *their* store — never gate internal access on them. Internal pages live under `/dev/*` and are hardcoded English.
- Server wrappers: `withInstrumentation` is the headers-free base (safe for repositories, `"use cache"`, and static/build paths); `withContext` / `withAuthentication` / `withAuthorization` append request/auth layers for exported server actions (`withAuthorization([UserRole.STAFF])` for internal-only actions). Prefer repository/`withInstrumentation` helpers over raw `db` in `server/app`. Do not add explicit return type annotations on those wrappers so return types stay inferred.
- UCP discovery is a plain HTTPS GET to `/.well-known/ucp` (no `UCP-Agent` header on discovery). Use the official UCP artwork at `apps/web/public/images/ucp.png`, not a custom placeholder SVG. Real profiles (2026-04-08) use array-based `services` with `transport` and object-keyed `capabilities`—do not use `@ucp-js/sdk` v0.1.0 `UcpDiscoveryProfileSchema` (stale); reuse `discoveryProfileSchema` from `ucp-advanced-validator.ts`. Service endpoints MUST be HTTPS with no trailing slash; capabilities use reverse-domain keys (`dev.ucp.shopping.*`) and capability `spec`/`schema` URL origins must match the namespace authority (first two segments reversed, e.g. `dev.ucp` → `ucp.dev`). REST calls use `UCP-Agent` (RFC 8941 `profile="..."`); Shopify MCP requires `arguments.meta["ucp-agent"].profile` on every JSON-RPC message (inject via `callMCP`/`transport.fetch` when using `createMCPClient`; wrappers typed as `typeof fetch` must forward `fetch.preconnect` under Bun). Prefer first-party HTTPS ecentic profiles (`/ucp/agent-profile`, `/ucp/agent-profiles/*`) with cacheable `Cache-Control` (not `no-store`); public routes need no registration in `proxy.ts` — it is a deny-list, so `/ucp/*` is reachable unless listed in `PROTECTED`/`STAFF_ONLY` (the old `RouteAccess` enum is gone). Agent `search_catalog`/`search_catalogs` args are flat top-level fields (`query`, `context`, `filters` with price in minor units)—not nested under `catalog`. Playground accepts bare store domains (`normalizePlaygroundStoreDomain` strips scheme/trailing slash; discovery uses `https://`). Put playground MCP checkout payload schema changes in `ucp-playground.ts`, not `ucp-advanced-validator.ts`. Playground smoke test: `search_catalog` → `lookup_catalog` → `get_product` → `create_cart` → `get_cart` → `update_cart` (`{ id, cart: { line_items } }`, keep `line_items[].id` from `get_cart`) → `create_checkout` from scratch with body nested under `checkout` only (no `cart_id` — not supported by this business endpoint) → `get_checkout` → `cancel_checkout` → `cancel_cart`; `update_checkout`/`complete_checkout` use top-level `id` plus nested `checkout`. On step failure (`{ error }`, `ucp.status: error`), stop immediately and summarize — do not call further tools. On `create_cart`/`create_checkout`, each line item needs only `item.id` + `quantity`; omit `line_items[].id` on create. Optional `cart.context` (`address_country`, `address_region`, `postal_code`). Cart and checkout IDs must come from prior tool results, not server-side state. UCP MCP business errors return HTTP 200 with `ucp.status: "error"` and `messages[]`—use `parseUcpToolContent`/`extractUcpToolError` before success-schema validation. Multi-store comparison (`/dashboard/ucp-comparison`): agent calls `search_catalogs` once; normalize store URLs (strip trailing slashes) when matching `store_profile`/`store_result` events and handle `store_result` so cards leave `discovering`/`searching`.
- Agent discovery metadata is centralized in `apps/web/src/lib/agent-discovery.ts` (homepage Link headers, API catalog, OAuth PRM/AS + OpenID config, `auth.md`, MCP server card). Commerce discovery surfaces: UCP at `/.well-known/ucp`; ACP at `/.well-known/acp.json`; MPP via `/openapi.json` with `x-payment-info` on payable ops; x402 via `@x402/next` on `GET /api` (`PAYMENT-REQUIRED` header; set `X402_PAY_TO`; default network Base Sepolia / `eip155:84532`). Skills index is static at `public/.well-known/agent-skills/index.json` (recompute digests when any `SKILL.md` changes); WebMCP loads via `/webmcp.js` in the root layout. Web Bot Auth JWKS is at `/.well-known/http-message-signatures-directory` (private key via env only—never commit). In `robots.txt/route.ts`, emit `Content-Signal: ai-train=no, search=yes, ai-input=yes` plus `Disallow` only for blocked prefixes; omit explicit `Allow` unless creating exceptions inside a disallowed path. In `proxy.ts`, rewrite `GET /` with `Accept: text/markdown` to `/llms.txt` as `text/markdown` with `x-markdown-tokens` (`Vary: Accept`); do not ship a conflicting `public/llms.txt` beside the route handler. Pricing, enterprise, and resources FAQ sections share `apps/web/src/app/(main)/pricing/_components/faq.tsx`; border and accordion styling fixes apply to all three pages. `GET /api/v1/news`: `relevance` defaults to `off` (pass `ai-commerce` for the post-fetch AI×commerce headline filter; `aiTerms`/`commerceTerms` customize lists); `resolve=true` turns each article’s `news.google.com` redirect into the publisher URL (`url`), because well-behaved crawlers (including ClaudeBot) honor Google News `robots.txt` and cannot follow article redirects—resolution is rate-limited/expensive (`limit` ≤ 25) and may return unresolved rows with `resolveStatus` rather than failing the whole response.
