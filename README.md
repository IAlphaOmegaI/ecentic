# Ecentic

Ecentic (styled as **ecentic**) is an e-commerce optimization platform for the AI agent economy.
It helps merchants understand how AI shopping agents (such as GPT, Claude, and Gemini) evaluate product listings, identify why products lose to competitors, and optimize listings to improve agent-driven selection.

## What This Repository Contains

This is a Bun + Turborepo monorepo with:

- A Next.js web application in `apps/web`
- Shared UI/utilities packages in `packages/*`
- Internal docs and implementation rules in `docs/*`

## Monorepo Structure

```text
.
├── apps/
│   └── web/                    # Main Next.js application
├── packages/
│   ├── web/                    # @zenncore/web
│   ├── mobile/                 # @zenncore/mobile (placeholder)
│   └── shared/
│       ├── config/             # @zenncore/config
│       ├── data-table/         # @zenncore/data-table
│       ├── icons/              # @zenncore/icons
│       ├── inferred-form/      # @zenncore/inferred-form
│       ├── phone/              # @zenncore/phone
│       └── utils/              # @zenncore/utils
├── docs/                       # Product, architecture, and coding docs
├── AGENTS.md                   # Engineering and implementation rules
├── CLAUDE.md                   # Docs-first workspace guidance
└── turbo.json
```

## Tech Stack

- **Framework:** Next.js 16, React 19
- **Runtime / package manager:** Bun
- **Monorepo:** Turborepo
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better Auth
- **Styling:** Tailwind CSS 4
- **Monitoring:** Sentry + PostHog
- **Storage:** UploadThing
- **Email:** Resend
- **AI:** Vercel AI SDK + Azure AI

## Prerequisites

- [Bun](https://bun.sh/) `>= 1.3.5`
- Node.js `>= 24` (as declared in `package.json`)
- PostgreSQL database

## Getting Started

### 1) Install dependencies

```bash
bun install
```

### 2) Configure environment variables

Create `apps/web/.env.local` with at least:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_BASE_URL=http://localhost:3000
RESEND_API_KEY=
FROM_EMAIL=
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
UPLOADTHING_TOKEN=
AZURE_RESOURCE_NAME=
AZURE_API_KEY=
NEXT_PUBLIC_SENTRY_DSN=
```

### 3) Prepare the database

From `apps/web`:

```bash
bun run db:migrate
```

For local development, you can also use:

```bash
bun run db:push
```

### 4) Run development servers

From the repo root:

```bash
bun run dev
```

Or web app only:

```bash
bun run dev:web
```

## Common Commands

From the repo root:

```bash
# Build
bun run build
bun run build:web
bun run build:packages

# Type check
bun run typecheck

# Lint (Biome)
bun run lint

# Development
bun run dev
bun run dev:web
bun run dev:packages
```

From `apps/web`:

```bash
# Next.js
bun run dev
bun run build
bun run start
bun run typecheck
bun run lint

# Drizzle
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
bun run db:reset
```

## Windows Notes

On some shells, unquoted workspace filters like `@zenncore/*` can be expanded as file globs before Turbo receives them.
If `bun run dev:packages` fails with `bun: no matches found: --filter=@zenncore/*`, run:

```powershell
bunx turbo dev --filter "@zenncore/*"
```

You can use the same approach for other package-filtered Turbo commands.

## Documentation

Project docs are docs-first and live in `docs/`:

- `docs/index.md` (navigation hub)
- `docs/context/idea.md` (product and architecture context)
- `docs/context/strategy.md` (market and growth strategy)
- `docs/context/shopify.md` (Shopify app listing and review guidance)
- `docs/agents/*` (coding conventions and implementation checklists)

## Contributing

1. Follow conventions in `AGENTS.md` and `docs/agents/*`
2. Prefer existing `@zenncore/*` packages over duplicating local utilities/components
3. Keep changes aligned with documented product behavior in `docs/context/*`

