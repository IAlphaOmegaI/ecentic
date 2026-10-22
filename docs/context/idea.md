# ecentic — Product & Architecture Handoff

This document describes what ecentic is, how it works, what has been built, and what remains. It is written for AI agents or developers picking up the project.

---

## What ecentic Is

ecentic (styled **ecentic**) is an e-commerce optimization platform for the AI agent economy. As AI shopping agents (ChatGPT, Claude, Gemini, etc.) increasingly choose products on behalf of consumers, merchants need to ensure their listings are selected over competitors. ecentic simulates these agent decisions, diagnoses why products win or lose, and auto-optimizes listings to get picked first.

**Target audience:** E-commerce merchants, D2C brands, and teams selling through AI-powered shopping channels.

**Core value prop:** "Win every agent's cart." Not monitoring. Not auditing. Autonomous optimization.

---

## How the Product Works

### The Problem

AI agents don't see ads, don't scroll, don't read marketing copy. They read structured data and compare specs in milliseconds. A product with a missing `battery_life` field or no `warranty` attribute gets silently dropped — the merchant never knows. Traditional SEO and GEO tools don't catch this.

### The Solution — Three Steps

1. **Simulate** — Run AI agents (ChatGPT, Claude, Gemini, Perplexity) against your products and competitors. Each agent scores both sides and picks a winner.
2. **Diagnose** — See step-by-step agent reasoning (agent replay), attribute gaps, competitor battlecards, and per-model win rates.
3. **Optimize (Auto)** — Generate optimized titles, descriptions, and structured data. One-click approve or auto-publish. Re-optimize when models change (drift detection).

### Pricing Tiers

| Tier | Price | Limits | Key features |
|------|-------|--------|-------------|
| Scan | Free | 10 products | One-time simulation across 3 models, basic attribute analysis |
| Compete | $14.90/mo | 100 products | Daily simulations, competitor battlecards, manual suggestions |
| Scale | $44.90/mo | 1000 products | Continuous simulations, auto-optimization + one-click publish |
| Dominate | $149/mo | 1000 products | Everything in Scale, plus model drift alerts and UCP generation. The tier partner deals (YC, Techstars) are redeemed against |
| Enterprise | Contact | Custom | Custom limits, enterprise security, dedicated support |

---

## Key Terminology

| Term | Definition |
|------|-----------|
| **Win rate** | Percentage of simulations where an agent picks your product over a competitor |
| **Agent cart** | A purchase decision made by an AI agent on behalf of a human buyer |
| **Simulation** | A single matchup: one product vs. one competitor, evaluated by one AI model |
| **Scan** | A batch of simulations across a roster picked in the scan setup step: chosen products of one store vs. chosen competitors |
| **Agent replay** | Step-by-step log of what the agent read and how it reached its decision |
| **Battlecard** | Per-product comparison vs. a competitor — where you win, where you lose, suggested fixes |
| **Model drift** | Changes in AI model behavior (e.g. ChatGPT update) that shift win rates |
| **Data quality** | Completeness of product attributes for agent evaluation |
| **UCP** | Universal Commerce Protocol — a merchant profile served at `/.well-known/ucp` so agents can discover and understand the merchant |
| **Optimization status** | `unoptimized`, `pending`, `optimized` — tracks whether a product's listing has been improved |

---

## User Flows

### Landing entry

The landing hero is a store-URL field (autofocused on desktop). Submitting it
(`Entry.begin`, `server/app/entry.ts`) detects the platform anonymously — one
guarded homepage read shared by the Shopify probe (`/meta.json` +
`/products.json`) and the WooCommerce probe (public Store API, REST root from
the homepage's `rel="https://api.w.org/"` link) — rate-limited per IP and
SSRF-guarded (`HTTP.request(..., { guard: true })`). A typo or unreachable host
is reported inline; anything reachable is carried in the httpOnly
`ecentic_entry` cookie (`src/lib/redirect.ts`) to sign-up, which shows the
detected store. Login stays the conversion step: nothing is imported before an
account exists.

### Authentication

1. Sign up with email/password (full name split into name + surname)
2. Email verification via Resend (OTP code)
3. After verification, redirect to onboarding

### Onboarding (4 steps)

1. **Connect Store** — With a hero entry, the store's public catalog is imported automatically (Shopify → `shopify-public`, WooCommerce → `woocommerce-public`; read-only, no credentials) and the visitor lands on product selection; a password-protected or API-locked store, a store claimed by another account, or an unsupported platform is explained with the verified connect (Shopify app, WooCommerce plugin/keys) and the platform grid as ways forward. Without an entry: choose a platform (Shopify, WooCommerce, Custom Feed). Each has a dedicated sub-page with field explanations. BigCommerce and Amazon are planned but disabled. A later verified connect of the same store upgrades the public row in place.
2. **Select Products** — Pick which imported products to include in simulations.
3. **Add Competitors** — Add competitor products (URL, title, price, brand) to benchmark against.
4. **Run Scan** — Trigger AI simulations across selected products and competitors. See live progress and results.

### Dashboard

| Page | Path | Purpose |
|------|------|---------|
| Overview | `/dashboard` | Overall win rate, products scanned, top performer, biggest opportunity, win rate by model, trend charts, recent activity, model drift alerts |
| Products | `/dashboard/products` | Product catalog with search/filter; columns for win rate per model, gap vs competitor, data quality, optimization status |
| Product Detail | `/dashboard/products/[id]` | Tabs: Win Rate (by model + per-competitor table), Agent Replay (decision log), Battlecard (per-competitor reasoning), Optimize (listing completeness + current vs. optimized listing) |
| Competitors | `/dashboard/competitors` | Brands tracked, win rate vs. each, attribute heatmap (W/tie/L), competitor alerts |
| Optimize | `/dashboard/optimize` | Queue of pending optimizations; approve/dismiss; before/after win rates; auto-optimization settings |
| Reports | `/dashboard/reports` | Downloadable reports (Win Rate Summary, Product Performance, Competitor Analysis, etc.); scheduled reports |
| Settings | `/dashboard/settings` | Account, team, integrations, notifications, simulation config (models, frequency, persona), billing |
| UCP | `/dashboard/ucp` | Universal Commerce Protocol profile editor; completeness score; JSON preview; install instructions |
| WebMCP scanner | `/dashboard/[store]/webmcp` | Free storefront source audit, also public at `/webmcp-scanner`. Eight shopping workflows report tool evidence, forms only, not observed, or review; seven audit checks add prioritized findings, merchant-specific fix hints, and parameter metadata. Reports distinguish observed storefront context from unconfirmed context and prioritize a product/collection sample within three pages. Unknown or generic-site forms get no enablement suggestion; checkout, orders, returns, accounts, and sensitive forms require manual review. Reports remain unsaved, disclose source coverage, and make no readiness-score or runtime-registration claim. See [scan methodology](../integrations/webmcp.md). |

---

## Autonomous Behavior — Zero Manual Input

ecentic's core differentiator is that it is **not a dashboard you check**. It is a closed-loop system that runs continuously in the background. Once a merchant connects their store and selects products/competitors, the system should require zero manual input going forward. Everything below should happen automatically.

### 1. Scheduled Simulation Sweeps

The system runs full simulation sweeps on a configurable interval (daily for Compete, continuous for Dominate). For each sweep:

- Take every selected product and every selected competitor for that user.
- For each `(product, competitor)` pair, run a simulation against every enabled model (ChatGPT, Claude, Gemini, etc.).
- Each simulation is a structured AI call: provide both product listings to the model, ask it to act as a shopping agent evaluating both for a given purchase query, and return a winner, reasoning, and scores.
- Write results to the `simulation` table, roll up into the `scan` record.
- Compute updated win rates per product, per model, per competitor.
- No user action triggers this — it runs on a cron/scheduler (e.g. Vercel Cron, pg_cron, or a background job queue).

**Frequency by tier:**
- Scan: one-time only (during onboarding)
- Compete: daily
- Dominate: every 6 hours (or configurable per user in Settings)

### 2. Model Drift Detection & Auto-Resimulation

When a major AI model releases an update (e.g. a new ChatGPT model, Claude 3.5 → Claude 4), the system should:

- Detect the model change. This can be done via a model registry table that maps model identifiers to version hashes. A background job periodically checks provider APIs or a curated model changelog feed.
- Automatically trigger a full re-simulation sweep across all users on affected models.
- Compare new win rates to previous sweep results. If any product's win rate drops by more than a configurable threshold (e.g. 5%), flag it as a **drift alert**.
- Send a notification (email + in-app) to the merchant: "A new ChatGPT model shipped. Your product X dropped from 78% to 61% win rate. We're auto-optimizing."
- If the user is on Dominate tier with auto-publish enabled, immediately trigger the optimization engine (see below).

### 3. Auto-Optimization & Auto-Publish

When a product's win rate drops below a threshold or a new simulation reveals a losing pattern, the system should:

- Analyze the simulation reasoning across all models to identify the root cause (e.g. missing specs, weak description, competitor has better structured data).
- Generate an optimized version of the product listing: improved title, rewritten description, filled-in structured data attributes. Use AI to generate these based on the product's existing data, images, and the winning competitor's strengths.
- If the user has **auto-publish** enabled (Dominate tier setting), push the optimized listing directly back to the store via the platform API (Shopify Admin API write, WooCommerce REST API update, etc.). This requires upgrading store scopes to include write access.
- If auto-publish is off, queue the optimization as `pending` in the optimize page for one-click approval.
- After publishing, schedule a follow-up simulation sweep (e.g. 24 hours later) to measure the lift. Record `winRateBefore` and `winRateAfter` on the optimization record.

### 4. Catalog Sync on Interval & Webhooks

Product catalogs are not static. Merchants add, update, and remove products constantly. The system should:

- **Scheduled re-sync:** Every 12 hours (configurable), re-fetch the full product catalog from each connected store and update the `product` table. Detect new products, updated products (price/title changes), and removed products.
- **Webhook-driven sync (Shopify):** Register a Shopify webhook for `products/create`, `products/update`, `products/delete`. When fired, immediately sync the affected product. This gives near-real-time catalog accuracy.
- **Feed re-fetch:** For custom feed stores, re-fetch and re-parse the feed URL on the same interval.
- **New product detection:** When a new product is synced that matches the user's selection criteria (e.g. same category, above a price threshold), automatically include it in simulations and notify the user.

### 5. Competitor Monitoring

Competitors are not static either. The system should:

- **Competitor page scraping:** Periodically re-fetch competitor product URLs to detect price changes, description updates, new attributes, or products going out of stock. Store diffs and surface them as competitor alerts.
- **New competitor detection:** When simulation reasoning repeatedly mentions a competitor brand/product that isn't in the user's competitor list, surface a suggestion: "Agents keep comparing you to [Brand X]. Add them as a competitor?"
- **Competitor win rate tracking over time:** Store historical win rate snapshots so users can see trends — are they closing the gap or falling behind?

### 6. UCP Auto-Generation & Hosting

The Universal Commerce Protocol profile should be auto-generated and kept up-to-date:

- Build the UCP JSON from the user's store data, product catalog, and business info.
- Serve it at `/.well-known/ucp` either via a hosted endpoint (ecentic provides a URL the merchant points to) or by generating the JSON file for the merchant to deploy.
- Re-generate whenever the catalog changes materially (new products, pricing shifts, business info updates).

### 7. Scheduled Reports & Alerts

- **Weekly digest email:** Automatically sent every Monday. Summarizes: overall win rate change, products that improved, products that degraded, top optimization opportunities, competitor movements.
- **Drift alerts:** Immediate email + in-app notification when a model update causes significant win rate changes.
- **Competitor alerts:** Notification when a tracked competitor updates their listing or a new competitor is detected.
- **Optimization published alerts:** Confirmation when an auto-published optimization goes live, with before/after metrics.
- **Scheduled PDF reports:** Users can configure (in Settings) recurring reports (weekly/monthly) that are auto-generated and emailed.

### 8. Purchase Persona Simulation

Simulations should not use a single generic prompt. The system should simulate different buyer personas:

- **Price-sensitive shopper** — prioritizes lowest price, deals, value
- **Quality-focused buyer** — prioritizes specs, reviews, brand reputation
- **Convenience buyer** — prioritizes availability, shipping speed, return policy
- **Eco-conscious shopper** — prioritizes sustainability, materials, certifications

Each persona modifies the system prompt for the AI agent simulation. Win rates are tracked per persona so merchants can see where they win (e.g. great on quality, losing on price) and optimize accordingly. Persona configuration is in Settings; Dominate tier unlocks all personas.

---

## Dashboard — Detailed Specification

### Overview (`/dashboard`)

The main dashboard is the merchant's real-time scorecard. It should show:

- **Headline metrics** (top row): Overall win rate (%), total products scanned, win rate trend (up/down arrow + delta vs. last period)
- **Win rate by model**: Four cards (ChatGPT, Claude, Gemini, Perplexity) each showing current win rate, change since last sweep, and a mini sparkline of the last 30 days
- **Top performer**: The product with the highest win rate, its score, and which models favor it
- **Biggest opportunity**: The product with the largest gap between current win rate and estimated potential (based on optimization suggestions)
- **Trend chart**: Line chart of overall win rate over time (7d / 30d / 90d toggle), with model-specific lines
- **Recent activity feed**: Chronological list of events — simulation completed, optimization published, drift detected, competitor updated, new product synced
- **Drift alerts panel**: Active alerts for model updates that affected win rates, with "View details" links
- **Quick actions**: "Run scan now", "View pending optimizations", "Add competitors"

### Products (`/dashboard/products`)

- **Table view**: Sortable/filterable table of all products
- **Columns**: Title, price, category, overall win rate, ChatGPT %, Claude %, Gemini %, Perplexity %, gap vs. top competitor, data quality score (0-100 based on attribute completeness), optimization status badge, last scanned timestamp
- **Filters**: Category, optimization status (optimized/pending/unoptimized), win rate range, data quality range
- **Search**: Full-text search across title, SKU, description
- **Bulk actions**: Select multiple → run simulation, generate optimizations, export CSV
- **Sync status**: Banner showing last sync time and a "Sync now" button

### Product Detail (`/dashboard/products/[id]`)

Four tabs:

1. **Win Rate** — Win rate by model (per-model cards) and the win/loss record vs. each competitor. Trend over time is pending a win-rate snapshot table.
2. **Agent Replay** — Step-by-step decision log from simulations, grouped and filterable by model. Shows what the agent compared, the scores, and the reasoning that tipped each decision.
3. **Battlecard** — Per-competitor head-to-head: where this product won vs. lost against each rival, with the agent's reasoning. (The per-model lens lives in Agent Replay; this is the per-competitor lens.) Surfaces a one-click **"Apply fix to store"** action that AI-rewrites the listing and publishes it to the connected store.
4. **Optimize** — Listing completeness (which agent-read fields are present/missing) plus the current listing. Two actions: **"Optimize & publish"** (generates an AI-optimized title/description and writes it directly to the store via `Optimization.approveProductListing` → `Store.publishProductListing`, gated to Shopify/WooCommerce) and **"Review queue"** (`/dashboard/optimize`). JSON-LD structured data can be generated inline.

> **Apply-to-store wiring:** Both publish actions call the existing `Optimization.approveProductListing` server action, behind an `AlertDialog` confirmation (it writes to a live store). The button is disabled with a "Connect Shopify to apply" label unless `getDetail` reports `canPublish` (store platform is Shopify or WooCommerce). Publishing dispatches to `Shopify.updateProduct` / `WooCommerce.updateProduct` and records before/after win rates on the optimization row.

### Claim Check (`/dashboard/[store]/products/[id]/claims`)

Per-product verification of what the listing claims, linked from the product detail header. One on-demand run (background, ~1–2 min, capped at 20 runs per store per day):

1. **Core facts, no AI** — price, stock, GTIN and brand in the catalog vs. the live page's schema.org JSON-LD: matches / doesn't match / can't compare. Variant-, SKU- and currency-aware; an unknown value is never a conflict. A mismatch says the two records disagree, not which is right.
2. **Claims** — up to 10 assertions extracted verbatim from title + description (qualifiers kept), each with a verdict:
   - **Verified** — a page beyond the merchant's store and the brand's own site, which ecentic opened itself (judged on the URL that actually answered, after redirects), states it; the verbatim quote is shown.
   - **Cited** — Perplexity cites an outside source, but ecentic couldn't confirm it on the page.
   - **No outside support** — this check found no source beyond the store and brand stating it (bounded research, not proof of absence).
   - **Contradicted** — an outside page ecentic opened says otherwise.
   - **Not checkable** — marketing as written (no measure, test or comparison).
   - **Not researched** — research was unavailable or skipped this claim, so nothing was looked up.
3. **Assistant divergence** — ChatGPT, Claude and Gemini are asked about each attribute without being shown the listing's values (they do see the product name). Their answers never verify or contradict; they only flag where an assistant states something different, and an assistant that says it doesn't know the product counts as "doesn't know".

Each claim shows its evidence (link, quote or Perplexity's summary, retrieval date), "what would change this verdict", and a templated fix that never invents specs. Evidence URLs come only from the citations the provider returned. "External" means not the merchant's hosts and not a host named after the brand — a heuristic, not a judgment of impartiality. Rules: `server/app/intelligence/claim-check-rules.ts`; pipeline: `claim-check-engine.ts`; actions: `claim-check.ts`. Admission is serialized per store (advisory lock) so the daily cap holds under concurrent starts; runs only ever leave `running` once.

**Live demo (`/dev/claim-check`, staff only):** paste any public Shopify (`/products/…`, read via the public product JSON + `/meta.json`) or WooCommerce (`/product/…`, read via the Store API) product page and the same engine runs on it with no store connection and nothing stored; the report renders with the dashboard's own components. Gated by `proxy.ts`, a staff check in the page, and `withAuthorization([UserRole.STAFF])` on `runDemoClaimCheck`, since every run spends model calls.

> **Note:** A standalone "Attribute Gaps" tab was specified originally as a side-by-side of your attributes vs. the winning competitor's. The `competitor` table stores only title/description/price/brand/url — there are no structured attributes to compare — so that comparison isn't yet feasible. The listing-completeness checklist (your product's field coverage) was folded into the **Optimize** tab, where it is directly actionable. Restore a dedicated gaps view once competitor attributes are modeled.

### Competitors (`/dashboard/competitors`)

- **Competitor cards**: Each tracked competitor brand with: products tracked, your win rate vs. them, their strongest attribute, your strongest attribute
- **Attribute heatmap**: Grid of attributes (price, specs, description quality, etc.) × competitors, colored Win / Tie / Loss
- **Competitor alerts feed**: Recent changes detected — price drops, new products, description rewrites
- **Add competitor**: URL input that auto-scrapes product info

### Optimize (`/dashboard/optimize`)

- **Tabs**: Pending, In Progress, Published, Dismissed
- **Each optimization card**: Product title, optimization type (title / description / structured data / all), estimated lift %, models affected, before/after preview
- **Approve flow**: Preview diff → Approve → publishes to store (or queues for manual publish)
- **Auto-optimization toggle**: Global setting (Dominate only) — when on, optimizations are auto-approved and pushed to the store without user intervention

### Reports (`/dashboard/reports`)

- **Available reports**: Win Rate Summary, Product Performance, Competitor Analysis, Optimization Impact, Category Benchmark (Dominate), Model Drift History (Dominate), UCP Compliance Audit (Dominate)
- **Generate on demand**: Click to generate a PDF/CSV report for the selected time range
- **Scheduled reports**: Configure weekly or monthly auto-generation + email delivery
- **Shareable report**: Public URL for the Win Rate Report that can be shared with stakeholders (read-only, no login required)

### Settings (`/dashboard/settings`)

Sections:

- **Profile** — Name, email, company name, logo
- **Team** — Invite members, assign roles (admin / viewer)
- **Connected Stores** — List of stores with status, last synced, disconnect option, add new store
- **Notifications** — Toggle: drift alerts, competitor alerts, weekly digest, optimization published, new product detected
- **Simulation Config** — Models to include (ChatGPT, Claude, Gemini, Perplexity — checkboxes), simulation frequency (daily / 12h / 6h / continuous), purchase personas enabled
- **Auto-Optimization** — Toggle auto-approve, toggle auto-publish to store, set win rate threshold for triggering optimization
- **Billing** — Current plan, usage, upgrade/downgrade, payment method

### UCP (`/dashboard/ucp`)

- **Completeness score** — Percentage of UCP fields filled (progress bar)
- **Profile editor** — Form for merchant info: business name, description, categories, shipping policies, return policies, sustainability certifications
- **Product structured data** — Auto-generated from catalog; shows coverage (how many products have complete structured data)
- **JSON preview** — Live preview of the generated UCP JSON
- **Install instructions** — Code snippet or DNS/redirect instructions for serving at `/.well-known/ucp`
- **Auto-update toggle** — Regenerate UCP when catalog changes

---

## Background Job Architecture (To Be Built)

The autonomous features above require a background job system. Recommended approach:

### Option A: Vercel Cron + Server Actions

- Use `vercel.json` cron definitions to trigger API routes on schedule
- Each cron route calls the appropriate server action (run sweep, sync catalogs, check drift, generate reports)
- Simple, no extra infrastructure, works well for moderate scale

### Option B: Dedicated Job Queue

- Use a job queue (BullMQ + Redis, or Inngest, or Trigger.dev) for more complex orchestration
- Better for: fan-out (running 1000 simulations in parallel), retries, rate limiting against AI provider APIs, long-running jobs that exceed serverless timeouts
- Recommended for Dominate/Enterprise tiers with large catalogs

### Recommended DB Additions for Background Jobs

- **`job`** table — id, type, userId, status (pending/running/completed/failed), payload (JSON), result (JSON), scheduledFor, startedAt, completedAt, error, retries
- **`model_registry`** table — id, provider (openai/anthropic/google), modelId, version, releasedAt, detectedAt — for drift detection
- **`notification`** table — id, userId, type, title, body, read (boolean), link, createdAt
- **`optimization`** table — id, productId, userId, type, status, currentData (JSON), optimizedData (JSON), estimatedLift, winRateBefore, winRateAfter, publishedAt, timestamps
- **`win_rate_snapshot`** table — id, productId, userId, model, winRate, sampledAt — for historical trend charts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19, React Compiler enabled |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Better Auth (email/password, email verification, Drizzle adapter) |
| Storage | UploadThing |
| Email | Resend + React Email |
| AI | Vercel AI SDK, Azure AI |
| Monitoring | Sentry (errors + tracing), PostHog (analytics) |
| Styling | Tailwind CSS 4 with semantic design tokens |
| Animations | Motion (Framer Motion fork) |
| Forms | react-hook-form + zod via InferredForm abstraction |
| Build | Turborepo, Bun, tsdown |
| Lint | Biome |

---

## Monorepo Structure

```
/
├── apps/
│   └── web/                          # Next.js app (ecentic)
│       ├── src/
│       │   ├── app/                  # Next.js App Router pages
│       │   │   ├── (auth)/           # Auth route group (sign-in, sign-up, verify, onboarding)
│       │   │   ├── dashboard/        # Protected dashboard pages
│       │   │   ├── api/              # API routes (Shopify OAuth)
│       │   │   └── _components/      # Landing page components
│       │   ├── components/           # Shared app components (navbar, footer, onboarding, motion)
│       │   ├── server/               # Server-side code
│       │   │   ├── app/              # Server actions (authentication, user, store, product, competitor, scan, simulation)
│       │   │   ├── database/         # Drizzle schema, db client, validators
│       │   │   └── utils/            # Server utilities (context, auth wrappers, repository, http, errors)
│       │   └── lib/                  # Client-side utilities (auth client, animations, mock data)
│       ├── drizzle/                  # Generated migrations
│       └── public/                   # Static assets (images, fonts)
├── packages/
│   ├── web/                          # @zenncore/web — UI components, Tailwind config
│   ├── mobile/                       # @zenncore/mobile — (placeholder)
│   └── shared/
│       ├── icons/                    # @zenncore/icons
│       ├── utils/                    # @zenncore/utils — cn, resultify, hooks, types
│       ├── config/                   # @zenncore/config — Tailwind, TS, tsdown configs
│       ├── inferred-form/            # @zenncore/inferred-form — schema-driven form builder
│       ├── data-table/               # @zenncore/data-table — TanStack Table wrapper
│       └── phone/                    # @zenncore/phone — phone formatting
├── turbo.json
├── AGENTS.md                         # Code style guide for AI agents
└── ECENTIC.md                        # This file
```

---

## Database Schema

### Auth Tables (Better Auth)

- **user** — id, name, surname, email, emailVerified, image, role, timestamps
- **session** — id, userId (FK user), token, expiresAt, timestamps
- **account** — id, userId (FK user), providerId, issuer, accountId (unique on issuer + accountId), accessToken, refreshToken, timestamps
- **verification** — id, identifier, value, expiresAt, timestamps

### Business Tables

- **store** — Connected e-commerce stores
  - id, userId (FK user), platform (`shopify` | `woocommerce` | `feed`), name, domain
  - Credentials: accessToken (Shopify), consumerKey + consumerSecret (WooCommerce), feedUrl (Feed)
  - status (`connected` | `syncing` | `error` | `disconnected`), lastSyncedAt, timestamps

- **product** — Imported products from stores
  - id, storeId (FK store), userId (FK user), externalId
  - title, description, price, compareAtPrice, currency, images (JSON string), url, sku
  - status (`active` | `draft` | `archived`), rawData (full API response), syncedAt, timestamps

- **competitor** — Competitor products added by the user
  - id, userId (FK user), title, description, price, currency, image, url, source, brand
  - selected (boolean — included in scans), timestamps

- **scan** — Batch simulation jobs, scoped to one store's products
  - id, userId (FK user), storeId (FK store, null on legacy account-wide runs),
    status (`pending` | `running` | `completed` | `failed`)
  - productIds / competitorIds (jsonb rosters frozen at enqueue; null = all
    store products / all selected competitors, resolved at drain time)
  - totalSimulations, completedSimulations, wins, losses, topFinding, timestamps

- **simulation** — Individual product-vs-competitor matchups
  - id, scanId (FK scan), productId (FK product), competitorId (FK competitor)
  - model (the panel seat's stored id: `gpt4`, `claude`, `gemini`), winner (`product` | `competitor`)
  - reasoning (agent's explanation), productScore, competitorScore, createdAt

- **claim_check** — One claim-check run of one product (history kept)
  - id, userId (FK user), storeId (FK store), productId (FK product)
  - status (`running` | `complete` | `failed`) — at most one `running` row per product (partial unique index)
  - claims, verified, contradicted, divergent (denormalized counts), report (versioned jsonb incl. the listing snapshot it judged), error, completedAt, timestamps

---

## Server-Side Architecture

### Context System

All server actions are wrapped in context enhancers that provide typed, instrumented execution:

- **`withInstrumentation(fn, name)`** — Headers-free base. Injects `InstrumentedContext` (environment + Sentry span). Safe for repositories, `"use cache"`, and static generation.
- **`withContext(fn, name)`** — Request rail: `withInstrumentation` + auth API + Sentry server-action instrumentation (`headers()`). Append further with `.append(enhancer)`.
- **`withAuthentication(fn, name)`** — `withContext.append(authenticate)`. Adds `session: { user, session }`. Returns `UnauthenticatedError` if no session.
- **`withAuthorization(roles)(fn, name)`** — `withContext.append(authenticate).append(authorize(roles))`.

### Repository Pattern

`repository(schema.table)` returns typed CRUD methods that all use `withInstrumentation` (not the request rail):
- `get(id)`, `create(data)`, `update(id, data)`, `destroy(id)`
- `find(options)`, `paginate(page, size, options)`
- `exists(id)`, `count(where)`

Cross-module data access uses namespace imports (`import * as Product from "@/server/app/product"`), not raw `db` calls.

### Server Action Modules

| Module | File | Purpose |
|--------|------|---------|
| Authentication | `server/app/authentication.ts` | signIn, signUp, signOut, verifyEmail, resetPassword, getCurrentUser |
| User | `server/app/user.ts` | User CRUD via repository |
| Store | `server/app/store.ts` | Store CRUD via repository |
| Product | `server/app/product.ts` | Product CRUD via repository |
| Competitor | `server/app/competitor.ts` | Competitor CRUD via repository |
| Scan | `server/app/scan.ts` | Scan CRUD via repository |
| Simulation | `server/app/simulation.ts` | Simulation CRUD via repository |
| Shopify | `server/app/integration/shopify.ts` | syncProducts — fetches products via Shopify Admin API |
| WooCommerce | `server/app/integration/woocommerce.ts` | connect (validate + create store), syncProducts |
| Feed | `server/app/integration/feed.ts` | connect (fetch + parse XML/JSON), syncProducts |
| Storage | `server/app/storage.ts` | UploadThing file router (thumbnails, projects) |

### Error Handling

Custom error classes via factory: `DatabaseError`, `NotFoundError`, `RequestError`, `TimeoutError`, `ParseError`, `UnauthenticatedError`, `UnauthorizedError`, `InvalidCredentialsError`. All extend `Error` with a `name` literal for serialization.

`ErrorProtocol.serialize(error)` → safe for client transport. `ErrorProtocol.deserialize(error)` → reconstructs typed error on the client.

### HTTP Utilities

- `request(url, options, { timeout })` — fetch with AbortController timeout, returns `Result<Response, Error>`
- `parse<T>(response)` — JSON-parses a Response or Result<Response>, returns `Result<T, Error>`

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/integrations/shopify/install` | GET | Initiates Shopify OAuth — generates nonce, stores in cookies, redirects to Shopify authorize URL |
| `/api/integrations/shopify/callback` | GET | Receives OAuth callback — verifies HMAC + nonce, exchanges code for access token, creates store row, redirects to onboarding |

**Missing:** Better Auth expects `/api/auth/[...all]/route.ts` for its built-in auth endpoints (session, verify-email, etc.). This route handler needs to be added.

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_BASE_URL` | Yes | Base URL for auth redirects (e.g. `http://localhost:3000`) |
| `RESEND_API_KEY` | Yes | Resend API key for verification emails |
| `FROM_EMAIL` | No | Sender email address |
| `SHOPIFY_API_KEY` | For Shopify | Shopify Partner app Client ID |
| `SHOPIFY_API_SECRET` | For Shopify | Shopify Partner app Client Secret |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error tracking |
| `UPLOADTHING_TOKEN` | For uploads | UploadThing API token |

---

## What Has Been Built

- Full landing page (hero, blind spot explainer, steps, features, comparison, pricing, navbar, footer)
- Authentication flow (sign-up, sign-in, email verification with OTP, password reset)
- Onboarding flow (4 steps with animated sidebar, step progress bar)
- Platform connection pages with detailed field explanations (Shopify OAuth, WooCommerce API keys, Custom Feed URL)
- Shopify OAuth flow (install + callback API routes, HMAC verification, token exchange)
- WooCommerce integration (credential validation, paginated product import)
- Custom Feed integration (XML/JSON auto-detection, Google Shopping format support)
- Product sync orchestration (dispatches to platform-specific sync functions)
- Database schema with all tables (user, session, account, verification, store, product, competitor, scan, simulation)
- Repository pattern for all tables
- Server context system with authentication, authorization, Sentry instrumentation
- Dashboard pages (all pages exist with mock data rendering)

## What Needs To Be Built

### Critical Path (core product)

1. **Better Auth route handler** — `/api/auth/[...all]/route.ts` is missing; auth endpoints won't work without it
2. **AI simulation engine** — The scan/simulation tables exist but the actual AI agent logic (calling ChatGPT, Claude, Gemini, Perplexity to compare products) is not implemented. This is the single most important piece. Needs: structured prompts per model, persona variants, scoring rubric, reasoning extraction.
3. **Background job system** — Cron-based or queue-based scheduler for running simulation sweeps, catalog syncs, drift detection, and auto-optimization without user input. See "Background Job Architecture" section above.
4. **Dashboard with real data** — All dashboard pages currently render mock data; they need to query the actual database and display real simulation results, win rates, trends.

### Onboarding Completion

5. **Product selection** — The select-products page needs to fetch real products from the DB (currently mock data)
6. **Competitor management** — The competitors page needs real CRUD operations connected to the server actions
7. **Scan execution** — The first-scan page needs to trigger real scans using the AI SDK and show live progress

### Autonomous Features (zero manual input)

8. **Scheduled simulation sweeps** — Cron jobs that run daily/6h/continuous sweeps per user tier. No user action needed.
9. **Model drift detection** — Model registry table + background job that detects model updates, triggers re-simulation, and alerts users when win rates shift.
10. **Auto-optimization engine** — Analyze losing simulation reasoning, generate improved listing content via AI, auto-publish to store (if enabled) or queue for approval.
11. **Catalog auto-sync** — Scheduled re-fetch of product catalogs from connected stores (12h default). Shopify webhooks for near-real-time sync.
12. **Competitor monitoring** — Periodic re-scrape of competitor URLs to detect changes. Surface alerts for price drops, new products, description rewrites.
13. **New competitor suggestion** — When simulation reasoning repeatedly references an untracked brand, suggest adding it.
14. **Weekly digest emails** — Auto-generated summary of win rate changes, optimizations, competitor movements. Sent every Monday.
15. **Scheduled PDF reports** — User-configured recurring reports, auto-generated and emailed.
16. **UCP auto-generation** — Build and keep `/.well-known/ucp` merchant profile updated as catalog changes.

### Platform & Infrastructure

17. **Store write access** — Upgrade Shopify/WooCommerce integrations with write scopes to push optimized listings back to the store.
18. **Win rate snapshots** — Historical time-series table for trend charts and drift comparisons.
19. **Notification system** — In-app + email notification table and delivery for drift alerts, optimization events, competitor changes.
20. **Purchase persona system** — Multiple buyer personas that modify simulation prompts. Per-persona win rate tracking.
21. **BigCommerce integration** — OAuth flow similar to Shopify (currently "Coming soon")
22. **Amazon SP-API integration** — Complex OAuth + API integration (currently "Coming soon")
23. **CSV upload** — Parse uploaded CSV files into products (UploadThing is already set up)
24. **Billing/Stripe** — Subscription management, tier enforcement, usage limits
25. **Team management** — Invite members, role-based access (admin / viewer)

---

## Code Conventions

See `AGENTS.md` at the project root for the full code style guide. Key points:

- `const` only, never `let`
- No abbreviated variable names
- `resultify` instead of try/catch
- Early returns, omit braces for single statements
- IIFEs for scoped logic, `switch (true)` for multi-branch conditionals
- Namespace + component pattern for React components
- `InferredForm` + `field()` for all forms
- Server components for pages, client components in `_components/`
- `@zenncore/*` packages for all UI primitives, utilities, and icons
- Semantic Tailwind tokens (`text-primary`, `bg-background`, etc.), no raw colors


OPENAI ACP
