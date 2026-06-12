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
- Prefer colocating tightly related UI pieces (for example desktop/mobile navbar variants and shared links) in one file rather than splitting into small component files.
- Do not hoist repeated Tailwind `className` strings into top-level const declarations; inline classes on elements or use inline unexported sub-components instead.
- When reusing streaming log panels outside full-viewport contexts (e.g. onboarding `AutoDetectTab` on `/dashboard/simulations`), auto-scroll only the log container (`scrollTo` on the `overflow-y-auto` element), not `scrollIntoView` on a sentinel—which scrolls ancestor/page scrollers.
- Put UCP playground MCP checkout payload schema changes in `ucp-playground.ts`, not `ucp-advanced-validator.ts`.

## Learned Workspace Facts

- If Postgres reports `relation "...\" does not exist`, run migrations from `apps/web` using `bun run db:migrate`. From the same app, `bun run db:push` syncs the Drizzle schema directly (dev convenience); `bun run db:migrate` applies versioned SQL migrations (prefer for production-style workflows).
- AI streaming server actions use `AI.stream<EventType>()` and return `{ output }`, consumed client-side with `readStreamableValue(output)` and `switch (event.kind)`.
- For Zod schemas passed to AI `generate()`, avoid `z.default()` and use `.optional()` for truly optional fields.
- Non-onboarding/auth pages are expected to follow PPR/streaming patterns with a server-rendered `page.tsx` shell and Suspense-wrapped async server components.
- Shopify OAuth and WooCommerce connect must run catalog import during the connect flow (not only `Store.create`); otherwise onboarding can show no products. Shopify catalog sync upserts by `storeId` + `externalId` (update existing rows, create only new)—do not duplicate products on reconnect or re-sync.
- For Shopify storefront ScriptTag `tracker.js`, beacons use the script origin with `Authorization: Bearer` and CORS; requests relative to the merchant domain never reach the app API. HTTPS storefronts cannot load `http://localhost` scripts (mixed content); set `ECENTIC_TRACKER_PUBLIC_ORIGIN` to a public HTTPS base URL (for example an ngrok tunnel) for ScriptTag `src`, and reconnect OAuth after that URL changes.
- WooCommerce REST product updates must use `PUT` to `/wp-json/wc/v3/products/{numericId}` with no `.json` suffix after the id; publishing optimized listings requires REST API keys with read/write permissions (read-only keys work for sync but not `PUT` updates).
- Local Next dev: after code or env changes, rely on hot reload or restart the dev server; remote hosting still needs redeploy when you change env or ship builds.
- Prefer repository delegates from `apps/web/src/server/repositories/` (for example `import * as CourseForumPost` and `CourseForumPost.find(...)`) instead of ad hoc `db` calls when the repository already exposes the operation; prefer repository `find` over `resultify` + `findFirst` when available. `@zenncore/utils` `Result<T>` uses a non-distributive void check so `T | undefined` and `any` success branches always include `data`.
- Wrap exported server actions with `withContext` or `withAuthorization` to match sibling modules in `apps/web/src/server/app/` (`withAuthorization` for role-gated manager flows, `withContext` where only session/request context is needed). Do not add explicit return type annotations on those wrappers so return types stay inferred.
- UCP discovery is a plain HTTPS GET to `/.well-known/ucp` (no `UCP-Agent` header on discovery). Real profiles (2026-04-08) use array-based `services` with `transport` and object-keyed `capabilities`—do not use `@ucp-js/sdk` v0.1.0 `UcpDiscoveryProfileSchema` (stale); reuse `discoveryProfileSchema` from `ucp-advanced-validator.ts`. Service endpoints MUST be HTTPS with no trailing slash; capabilities use reverse-domain keys (`dev.ucp.shopping.*`) and capability `spec`/`schema` URL origins must match the namespace authority (first two segments reversed, e.g. `dev.ucp` → `ucp.dev`). REST calls use `UCP-Agent` (RFC 8941 `profile="..."`); Shopify MCP requires `arguments.meta["ucp-agent"].profile` on every JSON-RPC message (inject via `callMCP`/`transport.fetch` when using `createMCPClient`). Prefer first-party HTTPS écentic profiles (`/ucp/agent-profile`, `/ucp/agent-profiles/*`) with cacheable `Cache-Control` (not `no-store`); whitelist public `/ucp/*` in `proxy.ts` `RouteAccess.PUBLIC`. Agent `search_catalog`/`search_catalogs` args are flat top-level fields (`query`, `context`, `filters` with price in minor units)—not nested under `catalog`. Playground smoke test: `search_catalog` → `lookup_catalog` → `get_product` → `create_cart` → `get_cart` → `update_cart` (`{ id, cart: { line_items } }`, keep `line_items[].id` from `get_cart`) → `cancel_cart`, then checkout (`create_checkout` with top-level `cart_id` only, or `create_checkout` from scratch with body nested under `checkout`; `update_checkout`/`complete_checkout` use top-level `id` plus nested `checkout`). On `create_cart`/`create_checkout`, each line item needs only `item.id` + `quantity`; omit `line_items[].id` on create. Optional `cart.context` (`address_country`, `address_region`, `postal_code`). Cart and checkout IDs must come from prior tool results, not server-side state. UCP MCP business errors return HTTP 200 with `ucp.status: "error"` and `messages[]`—use `parseUcpToolContent`/`extractUcpToolError` before success-schema validation. Multi-store comparison (`/dashboard/ucp-comparison`): agent calls `search_catalogs` once; normalize store URLs (strip trailing slashes) when matching `store_profile`/`store_result` events and handle `store_result` so cards leave `discovering`/`searching`.
- In `apps/web/src/app/robots.ts`, use `disallow` only for blocked prefixes; omit explicit `allow` unless creating exceptions inside a disallowed path (everything else is crawlable by default).
