# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Docs-First Rule (Read Before Coding)

Treat `docs/` as the canonical source of truth for product intent, implementation conventions, and package usage.

Read in this order before substantial work:

1. `docs/index.md` - docs navigation hub.
2. `docs/context/idea.md` - product scope, flows, architecture, roadmap.
3. `docs/context/strategy.md` - market, measurement, retention, enterprise strategy.
4. `docs/context/shopify.md` - Shopify-facing claims/copy/scopes/testing constraints.
5. `docs/agents/AGENTS-*.md` - coding rules (`style`, `components`, `nextjs`, `packages`, `checklist`).
6. `docs/web/index.md` and `docs/shared/index.md` - component/package API references.

If code and docs disagree, follow documented intent unless the user explicitly asks otherwise.

## What This Is

**Écentic** is an e-commerce optimization platform for the AI agent economy. It simulates how AI shopping agents (GPT-4, Claude, Gemini, Perplexity) compare products vs. competitors, diagnoses why products win or lose, and auto-optimizes listings. See `docs/context/idea.md` for full product spec and feature roadmap.

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

There are no automated tests in this codebase currently.

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
└── packages/
    ├── web/                  # @zenncore/web — UI component library + Tailwind config
    ├── shared/
    │   ├── utils/            # @zenncore/utils — cn, resultify, Result type, hooks
    │   ├── inferred-form/    # @zenncore/inferred-form — schema-driven form builder
    │   ├── data-table/       # @zenncore/data-table — TanStack Table wrapper
    │   ├── icons/            # @zenncore/icons
    │   ├── phone/            # @zenncore/phone — phone input utilities
    │   └── config/           # @zenncore/config — shared TS/Tailwind/tsdown configs
    └── mobile/               # @zenncore/mobile (placeholder)
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
- **Context system**: `withContext()` → base wrapper (auth API, Sentry, storage); `withAuthentication()` → adds `session`; `withAuthorization()` → adds role checks
- **Repository pattern**: `repository(schema.table)` returns typed `get`, `create`, `update`, `destroy`, `find`, `paginate`, `exists`, `count`
- **Error classes**: `DatabaseError`, `NotFoundError`, `RequestError`, `TimeoutError`, `ParseError`, `UnauthenticatedError`, `UnauthorizedError`, `InvalidCredentialsError`
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
- `intelligence/simulate.ts` — AI simulation engine (GPT-4, Claude, Gemini, Perplexity perspectives)

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

Client components live in `_components/` subdirectories next to their page.

### PPR and Streaming (dashboard and app screens)

Every `page.tsx` must be a **server component** that exports real HTML — not a thin wrapper around a single client component. Use **Partial Prerendering (PPR)** and streaming:

- **Static shell** — Render in `page.tsx`: layout, page title, description, headings. This is the initial HTML.
- **Data** — Fetch in **async server components** (same file or `_components/`). Wrap each in `<Suspense fallback={<Skeleton />}>` with a skeleton that matches the content shape.
- **Streaming** — The server sends the shell first, then streams in resolved async components so users see content as it loads.

Onboarding/auth screens may be client-heavy by design; all other screens (dashboard, settings, lists, details) follow this pattern. See AGENTS.md §21b and §23f.

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

### Server module imports — namespace pattern
```ts
// Server components: full namespace (functions + types)
import * as Products from "@/server/app/product";

// Client components: type-only namespace (no server code bundled)
import type * as Products from "@/server/app/product";
```

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

### Conditionals — `switch (true)` over long `if/else if` chains
### Derived values — IIFE for scoped intermediate logic
### Variables — `const` only, no `let`; no abbreviated names (`context` not `ctx`, `error` not `err`)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19, React Compiler |
| Database | PostgreSQL, Drizzle ORM 1.0 beta |
| Auth | Better Auth 1.5 (email/password + Drizzle adapter) |
| AI | Vercel AI SDK 6.0 + Azure AI |
| Email | Resend + React Email |
| Storage | UploadThing |
| Styling | Tailwind CSS 4 |
| Animations | Motion (Framer Motion fork) |
| Charts | Recharts |
| URL State | nuqs |
| Monitoring | Sentry + PostHog |
| Linting | Biome (no ESLint/Prettier) |
| Build | Turborepo + Bun |

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
AZURE_RESOURCE_NAME
AZURE_API_KEY
NEXT_PUBLIC_SENTRY_DSN
```
