# AGENTS.md - Docs-First Engineering Guide

This repository uses `docs/` as the canonical source of truth for product context, implementation patterns, and package usage.

Use this file as the entrypoint for any AI agent or developer, regardless of tool/editor.

---

## How To Work In This Repo

1. Start with `docs/index.md` for navigation.
2. Read `docs/context/` before making product or UX decisions.
3. Read `docs/agents/` before implementing code.
4. Read package-level docs in `docs/web/` and `docs/shared/` before building components.

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

## Delivery Expectations

- Align implementation with documented product behavior and naming.
- Keep docs in sync when behavior changes intentionally.
- Prefer small, composable server/client boundaries over monolithic client pages.
- Use documented component APIs and package contracts before introducing new patterns.

---

## Learned User Preferences

- Keep onboarding and dashboard UX clear and structured, preferring dedicated pages when flows need detailed field explanations.
- Treat `docs/context/` as the canonical source for project-specific product context before implementation decisions.
- Prefer colocating tightly related UI pieces (for example desktop/mobile navbar variants and shared links) in one file rather than splitting into small component files. Public language switcher belongs in the navbar as a flag select with transparent chrome (no fill/border that breaks the menu edge), spaced clear of the Install CTA; locale flag assets live under `apps/web/public` (same pattern as the EU flag), not as React components under `src/components/flags`; mobile nav sheet keeps the ecentic logo left-aligned and uses correct button variants for bottom CTAs.
- Do not hoist repeated Tailwind `className` strings into top-level const declarations; inline classes on elements or use inline unexported sub-components instead.
- When reusing streaming log panels outside full-viewport contexts (e.g. onboarding `AutoDetectTab` on `/dashboard/simulations`), auto-scroll only the log container (`scrollTo` on the `overflow-y-auto` element), not `scrollIntoView` on a sentinel—which scrolls ancestor/page scrollers.
- Translation keys: camelCase + dot namespaces (`signIn.fields.email.label`); role-based `action.primary|secondary|tertiary|quaternary` (never `primaryInverse` or verb keys like `submit`/`cancel`); per-feature namespaces. Type via next-intl `AppConfig` + `createMessagesDeclaration` — use `getMessages`/`useMessages` for structured arrays/objects, not `t.raw()`, hand-rolled message types, or ad-hoc type assertions. Prefer catalog fragments under `apps/web/messages/fragments/` merged via `bun apps/web/scripts/merge-i18n-fragments.ts`; after catalog edits run `bunx next typegen` and `bun run i18n:check`. Wire all user-visible static UI (auth, onboarding, dashboard, marketing) through next-intl—no English fallbacks for missing Spanish keys.
- For dashboard flex column layouts that should scroll internally, add `min-h-0 flex-1 overflow-hidden` on each `flex-1` ancestor in the height chain.
- Use `@zenncore/web/components/tabs` for tab UIs instead of custom segmented button groups.
- On marketing and content pages, avoid uppercase eyebrows and all-caps category labels; use sentence-case headings unless `docs/context/design.md` explicitly calls for caps (stat labels, numbered section kickers). Prefer large primary section indexes (e.g. `text-3xl text-primary`) over tiny tracked uppercase step micro-labels. Reserve `font-mono` for code-like strings (URLs, capability keys, HTTP snippets)—not regular labels or titles. Prefer shared `ItemCycle` (optional logos) and animated vertical step/item cycles over `STEP`/`LAYER` eyebrow grids or one-off carousels for workflow/agent showcases; reuse across product-listings, Shopify, WooCommerce, and resources. Pricing plan cards stay a 2×2 grid—never a single-row xl 1×4.
- Separate major marketing sections with `SectionGutter` from `dashboard/_components/grid.tsx`.
- Reserve `background.webp` hands artwork for the landing page’s light hero; use `blog.png` for blue content-page heroes unless the design canon specifies another treatment. Marketing page banners should be full-height with end-aligned content, vertical border delimiters like other content pages, and badges/chips above the body copy (not above the title).
- When section shells already draw borders (`border-b`, `gap-px` grids), remove redundant inner borders on the last child or adjacent panels to avoid double lines (e.g. `last:border-b-0` on shared FAQ accordion items; no extra `border-b`/`border-t` between stacked validator panels). Stretch marketing split-panel stacks to fill row height (avoid leftover gray gaps); keep separators from crowding nearby text; omit decorative icons that only inflate section height.

## Learned Workspace Facts

- If Postgres reports `relation "...\" does not exist`, run migrations from `apps/web` using `bun run db:migrate`. From the same app, `bun run db:push` syncs the Drizzle schema directly (dev convenience); `bun run db:migrate` applies versioned SQL migrations (prefer for production-style workflows).
- AI streaming server actions use `AI.stream<EventType>()` and return `{ output }`, consumed client-side with `readStreamableValue(output)` and `switch (event.kind)`. For Zod schemas passed to AI `generate()`, avoid `z.default()` and use `.optional()` for truly optional fields.
- Site i18n uses `next-intl` with `en` (default, no prefix) and `es` (`/es/...`); catalogs in `apps/web/messages/{en,es}.json`; `apps/web/global.ts` AppConfig types messages from `en.json` (see `docs/integrations/blog-i18n.md`). Locale for RSC comes from `next/root-params` in `i18n/request.ts` — root layout lives at `app/[locale]/layout.tsx` (no pass-through `app/layout.tsx`); do not use `setRequestLocale`. Pass explicit `{ locale }` into next-intl server APIs from Server Actions / Route Handlers until root-params supports them. Blog posts share slugs across locales (`blog_post.locale`); BabyLoveGrowth webhook upserts **EN + ES** on publish (Azure translates meta + chunked HTML for ES — no Markdown). `Blog.resolve` / index / OG / sitemap are **Postgres-only** (no live BLG during SSG). Prerender every blog slug × locale via `generateStaticParams` and ISR/`revalidateTag("blog")` when the webhook writes—pages stay fully static; public resolve never runs Azure. Do not put file-level `"use server"` on modules that also export sync helpers/cache tags (breaks Turbopack); blog RSC helpers must not call `withContext`/`headers()`; avoid wrapping next-intl-using homepage trees in `"use cache"`. Do not cache soft-failure `null` from BLG per-slug fetches (404s English while Spanish still serves from Postgres).
- Non-onboarding/auth pages are expected to follow PPR/streaming patterns with a server-rendered `page.tsx` shell and Suspense-wrapped async server components.
- Shopify OAuth and WooCommerce connect must run catalog import during the connect flow (not only `Store.create`); otherwise onboarding can show no products. Shopify catalog sync upserts by `storeId` + `externalId` (update existing rows, create only new)—do not duplicate products on reconnect or re-sync.
- For Shopify storefront ScriptTag `tracker.js`, beacons use the script origin with `Authorization: Bearer` and CORS; requests relative to the merchant domain never reach the app API. HTTPS storefronts cannot load `http://localhost` scripts (mixed content); set `ECENTIC_TRACKER_PUBLIC_ORIGIN` to a public HTTPS base URL (for example an ngrok tunnel) for ScriptTag `src`, and reconnect OAuth after that URL changes.
- WooCommerce REST product updates must use `PUT` to `/wp-json/wc/v3/products/{numericId}` with no `.json` suffix after the id; publishing optimized listings requires REST API keys with read/write permissions (read-only keys work for sync but not `PUT` updates).
- Local Next dev: after code or env changes, rely on hot reload or restart the dev server; remote hosting still needs redeploy when you change env or ship builds. `reactCompiler: true` in `apps/web/next.config.ts` requires `babel-plugin-react-compiler` in `apps/web` devDependencies.
- Prefer repository delegates from `apps/web/src/server/repositories/` (for example `import * as CourseForumPost` and `CourseForumPost.find(...)`) instead of ad hoc `db` calls when the repository already exposes the operation; prefer repository `find` over `resultify` + `findFirst` when available. `@zenncore/utils` `Result<T>` uses a non-distributive void check so `T | undefined` and `any` success branches always include `data`. `resultify` awaits PromiseLike values (not only `instanceof Promise`) so Drizzle query builders are not returned as `data`.
- Local Azure env may name the ChatGPT deployment `AZURE_DEPLOYMENT_GPT4O` while code prefers `AZURE_DEPLOYMENT_GPT`; `model("gpt")` accepts either so Azure is used when the gateway wallet is empty.
- Server wrappers: `withInstrumentation` is the headers-free base (safe for repositories, `"use cache"`, and static/build paths); `withContext` / `withAuthentication` / `withAuthorization` append request/auth layers for exported server actions (`withAuthorization` for role-gated manager flows). Prefer repository/`withInstrumentation` helpers over raw `db` in `server/app`. Do not add explicit return type annotations on those wrappers so return types stay inferred.
- UCP discovery is a plain HTTPS GET to `/.well-known/ucp` (no `UCP-Agent` header on discovery). Use the official UCP artwork at `apps/web/public/images/ucp.png`, not a custom placeholder SVG. Real profiles (2026-04-08) use array-based `services` with `transport` and object-keyed `capabilities`—do not use `@ucp-js/sdk` v0.1.0 `UcpDiscoveryProfileSchema` (stale); reuse `discoveryProfileSchema` from `ucp-advanced-validator.ts`. Service endpoints MUST be HTTPS with no trailing slash; capabilities use reverse-domain keys (`dev.ucp.shopping.*`) and capability `spec`/`schema` URL origins must match the namespace authority (first two segments reversed, e.g. `dev.ucp` → `ucp.dev`). REST calls use `UCP-Agent` (RFC 8941 `profile="..."`); Shopify MCP requires `arguments.meta["ucp-agent"].profile` on every JSON-RPC message (inject via `callMCP`/`transport.fetch` when using `createMCPClient`; wrappers typed as `typeof fetch` must forward `fetch.preconnect` under Bun). Prefer first-party HTTPS ecentic profiles (`/ucp/agent-profile`, `/ucp/agent-profiles/*`) with cacheable `Cache-Control` (not `no-store`); whitelist public `/ucp/*` in `proxy.ts` `RouteAccess.PUBLIC`. Agent `search_catalog`/`search_catalogs` args are flat top-level fields (`query`, `context`, `filters` with price in minor units)—not nested under `catalog`. Playground accepts bare store domains (`normalizePlaygroundStoreDomain` strips scheme/trailing slash; discovery uses `https://`). Put playground MCP checkout payload schema changes in `ucp-playground.ts`, not `ucp-advanced-validator.ts`. Playground smoke test: `search_catalog` → `lookup_catalog` → `get_product` → `create_cart` → `get_cart` → `update_cart` (`{ id, cart: { line_items } }`, keep `line_items[].id` from `get_cart`) → `create_checkout` from scratch with body nested under `checkout` only (no `cart_id` — not supported by this business endpoint) → `get_checkout` → `cancel_checkout` → `cancel_cart`; `update_checkout`/`complete_checkout` use top-level `id` plus nested `checkout`. On step failure (`{ error }`, `ucp.status: error`), stop immediately and summarize — do not call further tools. On `create_cart`/`create_checkout`, each line item needs only `item.id` + `quantity`; omit `line_items[].id` on create. Optional `cart.context` (`address_country`, `address_region`, `postal_code`). Cart and checkout IDs must come from prior tool results, not server-side state. UCP MCP business errors return HTTP 200 with `ucp.status: "error"` and `messages[]`—use `parseUcpToolContent`/`extractUcpToolError` before success-schema validation. Multi-store comparison (`/dashboard/ucp-comparison`): agent calls `search_catalogs` once; normalize store URLs (strip trailing slashes) when matching `store_profile`/`store_result` events and handle `store_result` so cards leave `discovering`/`searching`.
- Agent discovery metadata is centralized in `apps/web/src/lib/agent-discovery.ts` (homepage Link headers, API catalog, OAuth PRM/AS + OpenID config, `auth.md`, MCP server card). Commerce discovery surfaces: UCP at `/.well-known/ucp`; ACP at `/.well-known/acp.json`; MPP via `/openapi.json` with `x-payment-info` on payable ops; x402 via `@x402/next` on `GET /api` (`PAYMENT-REQUIRED` header; set `X402_PAY_TO`; default network Base Sepolia / `eip155:84532`). Skills index is static at `public/.well-known/agent-skills/index.json` (recompute digests when any `SKILL.md` changes); WebMCP loads via `/webmcp.js` in the root layout. Web Bot Auth JWKS is at `/.well-known/http-message-signatures-directory` (private key via env only—never commit). In `robots.txt/route.ts`, emit `Content-Signal: ai-train=no, search=yes, ai-input=yes` plus `Disallow` only for blocked prefixes; omit explicit `Allow` unless creating exceptions inside a disallowed path. In `proxy.ts`, rewrite `GET /` with `Accept: text/markdown` to `/llms.txt` as `text/markdown` with `x-markdown-tokens` (`Vary: Accept`); do not ship a conflicting `public/llms.txt` beside the route handler. Pricing, enterprise, and resources FAQ sections share `apps/web/src/app/(main)/pricing/_components/faq.tsx`; border and accordion styling fixes apply to all three pages.
