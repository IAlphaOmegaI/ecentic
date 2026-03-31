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

## Learned Workspace Facts

- If Postgres reports `relation "...\" does not exist`, run migrations from `apps/web` using `bun run db:migrate`. From the same app, `bun run db:push` syncs the Drizzle schema directly (dev convenience); `bun run db:migrate` applies versioned SQL migrations (prefer for production-style workflows).
- AI streaming server actions use `AI.stream<EventType>()` and return `{ output }`, consumed client-side with `readStreamableValue(output)` and `switch (event.kind)`.
- For Zod schemas passed to AI `generate()`, avoid `z.default()` and use `.optional()` for truly optional fields.
- Non-onboarding/auth pages are expected to follow PPR/streaming patterns with a server-rendered `page.tsx` shell and Suspense-wrapped async server components.
- Repository `paginate` and `Product.paginateWithIntelligence` return `{ items, pagination }` where `pagination` has `total`, `page`, and `size`; UI must pass `items` as table rows and derive `pageCount` from pagination. Using `data.rows` or `data.pageCount` leaves rows undefined and breaks `@zenncore/data-table`.
- Shopify OAuth and WooCommerce connect must run catalog import during the connect flow (not only `Store.create`); otherwise onboarding can show no products.
- For Shopify storefront ScriptTag `tracker.js`, beacons use the script origin with `Authorization: Bearer` and CORS; requests relative to the merchant domain never reach the app API. HTTPS storefronts cannot load `http://localhost` scripts (mixed content); set `ECENTIC_TRACKER_PUBLIC_ORIGIN` to a public HTTPS base URL (for example an ngrok tunnel) for ScriptTag `src`, and reconnect OAuth after that URL changes.
- WooCommerce REST product updates must use `PUT` to `/wp-json/wc/v3/products/{numericId}` with no `.json` suffix after the id; paths like `.../products/123.json` can trigger WordPress “No route was found matching the URL and request method.”
- Publishing optimized listings to WooCommerce requires REST API keys with read/write permissions; read-only keys work for sync but not for `PUT` updates.
- Local Next dev: after code or env changes, rely on hot reload or restart the dev server; remote hosting still needs redeploy when you change env or ship builds.
