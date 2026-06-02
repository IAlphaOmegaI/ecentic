# écentic — Tech Stack Overview

**Last updated:** 2026-06-02
**Codebase status:** Production · Live on Shopify App Store · Single Turborepo monorepo · ~14-table PostgreSQL schema · Weekly release cadence

---

## High-level architecture

écentic is a Next.js 16 application running on Vercel, talking to a managed PostgreSQL database via the Drizzle ORM. It plugs into the major e-commerce platforms (Shopify, WooCommerce, structured-data feeds), runs AI agent simulations against the Vercel AI SDK (with Azure AI as the model provider for production), and writes optimized listings back to the merchant store.

```
   ┌─────────────────────────────────────────────────────────────┐
   │  Merchant (Shopify / WooCommerce / generic feed)            │
   └──────────────────────┬──────────────────────────────────────┘
                          │ OAuth + API
   ┌──────────────────────▼──────────────────────────────────────┐
   │  écentic App (Next.js 16, React 19, deployed on Vercel)     │
   │   ├─ App Router pages (PPR + streaming)                     │
   │   ├─ Server actions (Drizzle, postgres.js)                  │
   │   ├─ Simulation engine (Vercel AI SDK 6.0 + Azure AI)       │
   │   ├─ Agent traffic detection (JS beacon + referrer parsing) │
   │   └─ UCP profile generator (.well-known/ucp endpoint)       │
   └──────────────────────┬──────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  ┌──────────┐     ┌──────────────┐   ┌────────────┐
  │PostgreSQL│     │Azure AI / API│   │ UploadThing│
  │(Drizzle) │     │(GPT-4, Claude,│   │  (assets)  │
  │14 tables │     │ Gemini, Perp.)│   │            │
  └──────────┘     └──────────────┘   └────────────┘
```

---

## Stack by layer

### Frontend
- **Next.js 16** with App Router (Partial Prerendering + streaming Suspense boundaries)
- **React 19** with the React Compiler enabled
- **Tailwind CSS 4** with semantic design tokens (no raw colors in components)
- **Motion** (Framer Motion fork) for animations
- **Recharts** for dashboards
- **nuqs** for URL-state management

### Server
- **Server actions** for all mutations (resultify wrapper for typed Result handling)
- **Drizzle ORM 1.0 beta** + `postgres.js` for database access
- **Repository pattern** — typed `get/create/update/destroy/find/paginate/exists/count` per schema table
- **Better Auth 1.5** for authentication (email/password, Drizzle adapter)
- **Vercel AI SDK 6.0** for model-agnostic LLM orchestration
- **Azure AI** as the primary production model provider (also OpenAI, Anthropic, Google direct for simulation diversity)
- **Resend + React Email** for transactional + notification email
- **UploadThing** for file/image storage
- **Sentry + PostHog** for monitoring and analytics

### Database (PostgreSQL via Neon or managed Postgres)
14-table schema, all defined in `apps/web/src/server/database/schema.ts`:

- `user`, `session`, `account`, `verification` — auth tables (Better Auth managed)
- `store` — connected merchant stores
- `product` — synced product catalog (per store)
- `competitor` — competitor products to benchmark against
- `scan` — full simulation sweeps (groups simulations)
- `simulation` — individual product-vs-competitor matchups
- `ucpProfile` — generated UCP profiles per store
- `agentVisit` — raw agent traffic detection events
- `agentTrafficDaily` — daily-aggregated agent traffic per store, per agent type

### Integrations (production)
- **Shopify Admin API** — OAuth install, catalog sync, listing write-back
- **WooCommerce REST API** — credential validation, paginated product fetch, write-back
- **Generic feed ingestion** — XML / JSON / Google Shopping format auto-detection
- **AI models direct** — GPT-4 (OpenAI), Claude (Anthropic), Gemini (Google), Perplexity, all called in parallel from the simulation engine

### Build, deploy, monitor
- **Turborepo + Bun** for the monorepo
- **Biome** for linting (no ESLint, no Prettier)
- **Vercel** for hosting + edge CDN
- **Sentry** for error tracking
- **PostHog** for product analytics

### Infrastructure choices we explicitly avoid
- **No Kubernetes.** Vercel + managed Postgres + Bun is sufficient until ≫€2M ARR; we will revisit only when scale forces it.
- **No microservices.** Single Next.js app, monorepo, all server logic inside one repo. We move faster with a monolith at this stage.
- **No self-hosted LLMs.** Azure AI Studio + the major model APIs are cheaper than infra-managed inference until very high scale.
- **No ESLint or Prettier.** Biome covers both — single tool, faster lint cycle.

---

## Data model — entities and relationships

```
user ── session
user ── store ─── product ──┐
                            ├── simulation ── scan
store ── competitor ────────┤
                            ├── ucpProfile
store ── agentVisit ── agentTrafficDaily
```

Each relationship is fully typed via Drizzle relations, enabling end-to-end TypeScript inference from database to React component.

---

## Security & compliance posture

| Item | Status |
|---|---|
| EU data residency | LIVE (database hosted in EU region) |
| OAuth scoped to read by default | LIVE (write-back requires per-merchant approval) |
| No model training on merchant data | LIVE (contractual + technical) |
| GDPR-compliant data handling | LIVE (DPA available; right-to-delete on contract end) |
| SOC 2 Type I | IN PROGRESS (Vanta engagement, target audit Q3 2026) |
| SOC 2 Type II | PLANNED (observation window opens Q3 2026, target Q1 2027) |
| ISO 27001 | SCOPING |
| Vendor security questionnaire pack | AVAILABLE ON REQUEST |

---

## Engineering practices

- **Docs-first.** `docs/` directory is the canonical source of truth for product intent, conventions, and package usage. Code is written *after* docs are aligned.
- **Repository pattern** wraps every database table — no raw SQL in business logic.
- **Result type** (`resultify` / `unwrapResult`) replaces try/catch in server actions and components; errors are values.
- **PPR + streaming** is mandatory for dashboard pages (server shell + async Suspense).
- **Weekly releases.** No long-lived feature branches; merge to main daily, ship on Fridays.
- **No tests today.** Honest disclosure: there is no automated test suite. The team plans to introduce critical-path integration tests post-raise (target M3) once Engineer #1 is onboarded and the simulation engine refactor is complete.

---

## What this means for diligence

Investors and partners care about three things at this stage:

1. **Can this team actually ship?** The codebase, weekly release cadence, and the diversity of integrations (Shopify, Woo, feeds, four AI models) all answer yes.
2. **Will this scale?** PostgreSQL + Drizzle + Vercel is the same stack that powers many €100M+ ARR companies. We will not need to rewrite to get to Series A scale.
3. **Is this enterprise-grade?** EU data residency, GDPR compliance, OAuth scoping, and the SOC 2 Type I in flight position us to sell to enterprise procurement teams without a multi-month security review hold-up.
