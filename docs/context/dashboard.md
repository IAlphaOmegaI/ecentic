# écentic — V1 Dashboard Implementation Brief for Claude Code

## Context

You are building the logged-in dashboard application for écentic, the autonomous optimization engine for AI agent commerce. The full product specification is in the uploaded `ECENTRIC-CLAUDE-CODE-CONTEXT.md` PDF — treat it as the canonical reference for data models, API contracts, navigation structure, and feature behavior. This document focuses on what to build first and how the dashboard should feel.

The Shopify App Store listing is already written (see `shopify-app-listing.md`). The testing instructions in that listing describe what a reviewer expects to see — use it as your acceptance criteria.

---

## What écentic Does (for your mental model)

AI shopping agents (GPT-4, Claude, Gemini, Perplexity) increasingly decide what consumers buy. These agents ignore ads, branding, and emotional copy — they parse structured product data, compare specs, and choose a winner in milliseconds. If a merchant's product data is incomplete or poorly structured, agents skip them.

écentic imports a merchant's Shopify catalog, runs simulated purchase decisions across multiple AI models against real competitor products, reveals exactly why agents pick competitors over the merchant, and generates + publishes optimized listings back to the store.

Core loop: **Simulate → Diagnose → Optimize → Publish → Repeat.**

---

## Architecture & Stack

Refer to Section 2 of the full spec PDF. Key decisions:

- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API routes (Route Handlers) + server actions for mutations
- **Database:** PostgreSQL via Supabase (with Row-Level Security, Realtime subscriptions)
- **Auth:** Clerk (OAuth for Google + Shopify, email+password, MFA, org/team management)
- **AI Simulation:** Server-side calls to OpenAI, Anthropic, Google Generative AI APIs with JSON output mode
- **Job Queue:** BullMQ + Redis (Upstash) for async simulation jobs and scheduled re-runs
- **E-commerce:** Shopify Admin API (GraphQL) via OAuth, WooCommerce REST API, CSV/XML import
- **Payments:** Stripe (subscription billing, usage metering, Shopify 20% rev-share handling)
- **Email:** Resend (transactional, notification digests, onboarding drip)
- **Real-time:** Supabase Realtime for live simulation progress
- **Monitoring:** PostHog (product analytics), Sentry (error tracking), Axiom (logs)
- **Hosting:** Vercel (frontend + API) + Railway or Fly.io (workers)

### Project Structure

Follow the structure defined in Section 2 of the spec exactly:

```
/app
  /(auth)
    /signup
    /login
    /forgot-password
  /(onboarding)
    /connect
    /select-products
    /competitors
    /first-scan
  /(dashboard)
    /layout.tsx         → Sidebar + topbar shell
    /page.tsx           → Dashboard home/overview
    /products
      /page.tsx         → Product catalog table
      /[id]/page.tsx    → Product detail view (5 tabs)
    /competitors
      /page.tsx         → Competitor intelligence hub
    /optimize
      /page.tsx         → Optimization center / queue
    /ucp
      /page.tsx         → UCP & structured data manager
    /reports
      /page.tsx         → Reports & exports
    /settings
      /page.tsx         → Settings hub
      /team
      /integrations
      /notifications
      /billing
      /simulation-config
/components
  /ui                   → shadcn/ui primitives
  /dashboard            → Dashboard-specific components
  /onboarding           → Onboarding step components
  /shared               → Shared components (charts, tables, modals)
/lib
  /api                  → API client functions
  /simulation           → Simulation engine logic
  /integrations         → Shopify, WooCommerce connectors
  /stripe               → Billing utilities
  /utils                → Helpers, formatters, constants
/server
  /actions              → Server actions
  /jobs                 → BullMQ job processors
  /services             → Business logic services
```

---

## Database Schema

Use the complete SQL schema from Section 17 of the spec PDF verbatim. The tables are:

- `organizations` — multi-tenant orgs with plan, onboarding status, Stripe IDs
- `users` — Clerk-linked users with roles (owner/admin/editor/viewer)
- `stores` — connected e-commerce platforms with OAuth tokens, sync status
- `products` — imported product catalog with attributes, scores, win rates, optimization status
- `product_variants` — SKU-level variant data
- `competitors` — tracked competitor brands
- `competitor_products` — individual competitor product listings with scraped data
- `product_competitor_matches` — many-to-many matching between products and competitor products
- `simulation_batches` — batch records for simulation runs
- `simulation_results` — individual per-product per-model per-competitor results with full reasoning traces
- `optimizations` — pending/published/dismissed optimization records with before/after + rollback
- `ucp_profiles` — Universal Commerce Protocol merchant profiles
- `drift_events` — model drift detection records
- `notifications` — per-user notification queue
- `activity_log` — organization-wide event timeline

All indexes are defined in the schema. Implement Row-Level Security so organizations can only access their own data.

---

## API Routes

Use the complete API contract from Section 18 of the spec PDF. All routes live under `/api/*` and require valid Clerk session. Organization context is derived from the user's `organization_id`.

The routes cover: auth/onboarding, stores, products, competitors, simulations, optimizations, UCP, reports, dashboard aggregates, notifications, settings, and billing.

For real-time simulation updates, use the SSE stream endpoint `GET /api/simulations/:batchId/stream` or Supabase Realtime subscriptions on the `simulation_results` table.

---

## Pricing Tiers & Feature Gating

From Section 21 of the spec:

| Tier | Price | Product Limit | Key Capabilities |
|------|-------|---------------|-----------------|
| Scan (Free) | $0 | 10 | One-time simulation across 3 models, basic attribute gap report |
| Compete | $149/mo | 100 | Daily simulations, competitor battlecards, manual optimization suggestions, export reports |
| Dominate | $449/mo | 1,000 | Continuous simulations, auto-optimization + one-click publish, model drift alerts, UCP generation, scheduled reports |
| Enterprise | Custom | Custom | SSO/SAML, API access, dedicated simulation environments, custom reporting, team management |

Implement gating with `checkFeatureAccess(orgId, feature)` → `{ allowed, tier_required, message }`. Never hide gated features — show them grayed/blurred with a lock icon and upgrade CTA. Users should always see what they're missing.

---

## Authentication & Onboarding

### Signup (Section 3)

Route: `/signup`. Fields: email, password, full name, company/brand name, role (dropdown), attribution source (optional). OAuth options: Google, Shopify (preferred — auto-connects store, skips connect step).

Post-signup: create user + org records, set `onboarding_status = 'pending'`, redirect to appropriate onboarding step based on signup method.

### Onboarding (Section 4)

Four-step linear wizard with persistent progress bar: **Connect Store → Select Products → Add Competitors → Run Scan**.

The goal is delivering the "aha moment" — a visible win rate score — within 2 minutes of signup.

- **Step 1: Connect Store** (`/onboarding/connect`) — Grid of platform cards. Shopify OAuth flow imports all products via Admin API GraphQL. CSV upload with column mapping. Show import progress in real-time.

- **Step 2: Select Products** (`/onboarding/select-products`) — Searchable, filterable product table with checkboxes. Tier limit enforcement with inline upgrade nudge. Smart auto-select of top 10 by popularity. "Skip" auto-selects intelligently.

- **Step 3: Add Competitors** (`/onboarding/competitors`) — Three methods: auto-detect (recommended, uses category + price range matching), manual URL paste (scrape product data), brand search (typeahead from known brands). Each selected product should have 3-10 competitors. "Skip" runs auto-detect with defaults.

- **Step 4: Run Simulation** (`/onboarding/first-scan`) — Pre-simulation summary → big "Run Simulation" CTA → full-screen animated visualization during simulation (terminal-style decision log with typewriter effect, per-model progress indicators, live result counters) → results screen with big win rate number, emotional framing, per-model breakdown, top finding, and CTAs to dashboard and share.

---

## Dashboard Layout (Section 5)

### Topbar (64px)
- Left: écentic logo (links to dashboard home)
- Center: Global search bar with Cmd+K shortcut — searches products, competitors, optimizations
- Right: notification bell (unread count badge), plan badge (clickable → billing), user avatar dropdown (settings, billing, help, sign out)

### Sidebar (240px, collapsible to 64px icons)
Navigation items with icons and optional badges:
1. Overview (`/dashboard`)
2. Products (`/dashboard/products`) — badge: product count
3. Competitors (`/dashboard/competitors`)
4. Optimize (`/dashboard/optimize`) — badge: pending optimization count
5. UCP & Data (`/dashboard/ucp`) — badge: completeness %
6. Reports (`/dashboard/reports`)
7. Settings (`/dashboard/settings`)

Bottom of sidebar:
- "Run New Simulation" button (prominent, blue)
- Current simulation status if running: "Simulation in progress... 67%"
- Upgrade CTA for free tier

### Responsive Behavior
- Desktop (≥1280px): Full sidebar + content
- Tablet (768–1279px): Collapsed icon sidebar + content
- Mobile (<768px): Hamburger menu, bottom tab navigation

---

## Dashboard Home / Overview (Section 6)

Route: `/dashboard`

### Top-Level Summary Cards (4-card grid)
1. **Overall Win Rate** — Large percentage + trend arrow + sparkline (30 days). Click → products filtered by lowest win rate.
2. **Products Scanned** — "47 / 100" with progress ring vs tier limit. Click → products page.
3. **Top Performer** — Product name + win rate + thumbnail. Click → product detail.
4. **Biggest Opportunity** — Product name + current win rate + estimated potential. Click → product detail.

### Win Rate by Model (Horizontal Bar Chart)
One bar per model (GPT-4, Claude, Gemini, Perplexity). Tooltip shows simulation count. Time range selector: 7d / 30d / 90d / All time.

### Win Rate Trend (Line Chart)
Daily/weekly resolution. One line per model (toggleable) + aggregate. Annotations for optimization events and drift events with hover detail.

### Product Win Rate Table (Top 10, expandable)
Columns: Product (thumb + title), Overall Win Rate + trend, GPT-4, Claude, Gemini, Perplexity, Top Competitor + their win rate, Gap (delta, color-coded), Status badge, Action button. Bulk action bar on checkbox selection. "View All Products →" link.

### Recent Activity Feed
Scrollable timeline: optimizations published, simulations completed, model drift detected, new competitors found. Each clickable → relevant detail view.

### Quick Actions Bar
"Run Simulation Now", "View Pending Optimizations (X)", "Download Report"

---

## Product Catalog (Section 7)

Route: `/dashboard/products`

Full-featured data table with: search (debounced 300ms), multi-select category filter, win rate range slider, model filter, status filter, store filter. Sort by win rate, title, price, last simulated. Table/grid view toggle. Bulk actions: run simulation, optimize all, export.

Table columns: checkbox, image (48x48), product title + subtitle, price, win rate (color bar), GPT-4 %, Claude %, Gemini %, Perplexity %, competitor gap, data quality score (progress ring), last simulated (relative time), actions menu.

Pagination: 25/50/100 per page with total count.

"Add Products" modal: sync from store, upload CSV, add manually.

---

## Product Detail View (Section 8)

Route: `/dashboard/products/:id`

Header: product image (200x200), title (editable for manual products), price, category, SKU, overall win rate (large + trend), store badge, action buttons.

### 5 Tabs:

**Tab 1: Win Rate Overview**
- Win rate over time line chart (daily/weekly, per-model toggleable, optimization + drift annotations)
- Per-model breakdown cards (model logo, win rate, W/L/Total, trend, "View Decision →")
- Win rate by competitor horizontal bar chart (sorted by lowest = biggest opportunity)

**Tab 2: Agent Decision Replay**
Terminal-style decision log showing the full reasoning trace from each AI model. Model selector tabs, simulation run selector dropdown, diff view ("Compare last 2 runs"), red/green highlighting on attribute wins/losses. This is the transparency engine — shows exactly how each model evaluates products attribute by attribute.

Use the exact terminal layout from the spec:
```
→ Read product: Pro Earbuds ($139)
→ Read competitor: SoundMax X3 ($129)

Evaluating attributes:
  battery_life:
    Pro Earbuds = [not specified] ❌
    SoundMax X3 = "8 hours" ✅

DECISION: Selected SoundMax X3
REASONING: "SoundMax X3 offers the best combination of..."
```

**Tab 3: Attribute Gap Analysis**
Comparison table: Attribute | Your Product | Top Competitor | Status (Missing/Weak/Stronger/Equal) | Impact (High/Medium/Low — costs X% of losses). Priority sorted by impact. "Fix This" buttons per attribute. Data quality score with category benchmark ("Products in 'Wireless Earbuds' typically have 18 attributes specified. You have 11.").

**Tab 4: Competitor Battlecard**
Per-competitor dropdown. Layout: your win rate against this competitor (bar), "You Win On" vs "They Win On" columns, suggested counter-moves with estimated lift per move, "Apply All Suggestions →" CTA. Model-specific toggle. Historical matchup line chart.

**Tab 5: Optimization Panel**
Side-by-side diff view: Current vs Optimized for title, description, structured data. Additions highlighted green, removals red (code-diff style). Action buttons: "Approve & Publish" (pushes to Shopify immediately), "Edit Before Publishing" (inline editor), "Schedule Publish" (Dominate tier, date picker), "Dismiss" (with optional reason), "Auto-publish" toggle (Dominate). Optimization history table with date, changes, win rate before → after, rollback button.

---

## Competitor Intelligence (Section 9)

Route: `/dashboard/competitors`

Overview: total competitors tracked, overall win/loss record, most dangerous competitor.

Competitor list table: brand (logo + name), products tracked, your win rate, their strongest attribute, your strongest attribute, last updated, actions (view battlecard, remove, refresh).

**Attribute Heatmap** — matrix visualization: rows = attributes, columns = competitors, cells = color-coded (green = you win, yellow = tie, red = they win). Shows systematic weaknesses at a glance.

Competitor alerts feed: listing updates, win rate changes, new competitors detected.

Add competitor flow: same three methods as onboarding (auto-detect, URL paste, brand search).

---

## Optimization Center (Section 10)

Route: `/dashboard/optimize`

Four tabs: **Pending** (default — queue of approvals with preview/approve/edit/dismiss + bulk actions), **In Progress** (publishing to stores with status), **Published** (history with before→after win rates + rollback), **Dismissed** (with "Reconsider" button).

Auto-optimization settings (Dominate tier): auto-publish toggle, approval threshold slider, scope selector, frequency, safety rails (never auto-publish titles, require manual for >50% different descriptions, pause if win rate drops).

---

## UCP & Structured Data (Section 11)

Route: `/dashboard/ucp`

UCP merchant profile: completeness progress ring, JSON preview, editable fields (merchant name, description, payments, shipping, returns, contact), deploy button (installs `/.well-known/ucp`), real-time schema validation.

Per-product structured data table: complete/partial/missing status, generate button, bulk generate, JSON-LD preview, install guide with code snippet.

Attribute extraction engine: upload product images → AI extracts attributes (color, dimensions, features) → human review with confidence scores.

---

## Model Drift & Alerts (Section 12)

Weekly re-simulation comparison. Flag products with ≥5pp win rate change. Surface via: dashboard banner, notification bell, email alert. Drift detail view: which model, affected products list with before→after, changed attribute weights, bulk "Re-optimize affected products" action. Historical drift log.

---

## Reports & Exports (Section 13)

Available reports: Win Rate Summary, Product Performance, Competitor Analysis, Optimization Impact, Category Benchmark, Model Drift History, UCP Compliance Audit. PDF and CSV formats. Tier-gated.

Shareable results page: public URL, branded single-page report, OG image auto-generated for social sharing, optional password protection.

Scheduled reports: weekly/monthly email delivery, configurable recipients.

---

## Settings (Section 14)

Subsections: Account (profile, password, 2FA, delete), Team (Dominate+ — invite, roles: owner/admin/editor/viewer), Integrations (connected stores with status, API keys for Enterprise, webhook configuration), Notifications (per-channel toggles for all event types, quiet hours, digest mode), Simulation Config (model selection, frequency per tier, persona/context customization for Enterprise, competitor matching sensitivity).

---

## Billing (Section 15)

Plan comparison table (current plan highlighted), usage card ("47 / 100 products"), billing details, payment method. Upgrade via Stripe Checkout. Downgrade flow with retention offer ("Stay on Compete, 20% off for 3 months"). Invoice history with PDF downloads. Stripe Customer Portal link.

---

## Notifications System (Section 16)

Bell icon in topbar with unread count. Dropdown: icon + title + description + timestamp + read/unread per notification. Click navigates to relevant page. "Mark all as read." Full notification center page.

Notification types with priorities:
- Win Rate Drop (📉 High)
- Simulation Complete (✅ Medium)
- Optimization Ready (⚡ Medium)
- Auto-Published (🚀 Low)
- Model Drift (⚠️ High)
- Competitor Update (🔄 Medium)
- New Competitor (🆕 Low)
- Plan Limit (🔒 Medium)
- Weekly Digest (📊 Low)

---

## Simulation Engine (Section 19)

Each simulation sends a structured prompt to an AI model with the merchant's product + competitor products. The model evaluates attributes, selects a winner, and returns structured JSON with: `selected_product`, `reasoning`, `attribute_comparison` (per-attribute with winner + importance), and `confidence` score.

Purchase queries are generated per category with persona variants (budget shopper, premium buyer, technical researcher, gift buyer).

Job flow: dequeue from BullMQ → construct prompt → call model API with JSON mode → parse response → store in `simulation_results` → update cached `current_win_rate` → emit real-time event → check for drift.

Rate limiting: onboarding > manual > scheduled priority. Concurrency limits per model API. Cost tracking per simulation.

---

## Auto-Optimization Engine (Section 20)

After simulation: identify products with win rate < 50% → analyze `attribute_scores` for top gaps → generate optimized title (add missing specs), description (restructure for machine readability), and JSON-LD structured data → calculate estimated lift → create `optimizations` records as pending → notify user.

Publishing: approve → set status `publishing` → call Shopify `productUpdate` GraphQL mutation (or WooCommerce REST) → set `published` → schedule re-simulation 24h later → record `win_rate_after`.

Rollback: retrieve `original_value` → push to store → set `rolled_back` → re-simulate to confirm.

---

## Empty States, Loading, & Errors (Section 22)

Every page has a designed empty state: illustration/icon, headline, description, primary CTA. Specific empty states are defined per page in the spec.

Loading: full-page skeleton loaders matching layout, skeleton table rows (8) with shimmer, skeleton chart areas, disabled buttons with spinners, progress UI for >5s operations.

Errors: toast notifications with retry, offline banner, per-store sync error cards, partial simulation results if one model fails, Stripe error redirects, custom 404, optimistic updates with revert on failure.

---

## Accessibility (Section 23)

WCAG 2.1 AA: keyboard navigable, focus indicators, ARIA labels on icons/charts, color never sole state indicator, 4.5:1 contrast, screen reader announcements for live updates, skip nav link, proper heading hierarchy.

---

## Design System (Appendix A of spec)

Light theme (not dark mode — the spec defines a light system):

| Token | Value | Usage |
|-------|-------|-------|
| `--brand-primary` | #2563EB (Blue 600) | Primary buttons, links, active states |
| `--brand-primary-hover` | #1D4ED8 (Blue 700) | Hover states |
| `--brand-accent` | #3B82F6 (Blue 500) | Highlights, badges |
| `--bg-primary` | #FFFFFF | Main content background |
| `--bg-secondary` | #F8FAFC (Slate 50) | Sidebar, cards |
| `--bg-dark` | #0F172A (Slate 900) | Dark mode / dark sections |
| `--text-primary` | #0F172A (Slate 900) | Primary text |
| `--text-secondary` | #64748B (Slate 500) | Secondary text |
| `--win-high` | #22C55E (Green 500) | Win rate > 60% |
| `--win-medium` | #EAB308 (Yellow 500) | Win rate 30–60% |
| `--win-low` | #EF4444 (Red 500) | Win rate < 30% |
| `--border` | #E2E8F0 (Slate 200) | Borders, dividers |

Use shadcn/ui components as the primitive layer. Build dashboard-specific components on top.

---

## Analytics Events (Section 24)

Implement all events defined in Section 24 via PostHog. Key funnels to track:
1. Signup → First Simulation
2. Free → Paid conversion
3. Optimization generation → approval → publish → measured impact
4. Retention loop: simulation → view results → optimize → re-simulate → measure improvement

---

## Product Hunt Launch Features (Section 25)

Build these into the product from day one:
- Instant Free Scan with zero friction
- Shareable Win Rate Page with OG image
- Social proof counters ("X,XXX stores scanned today")
- Launch day banner with upvote link
- Early adopter pricing with countdown timer
- Quick Win email 24h after scan
- Category reports for content marketing
- Embeddable "Agent Win Rate: XX%" badge widget

First 5 minutes target: Get Started (0:00) → Signup (0:15) → Store connected (0:30) → Products imported (0:45) → Competitors auto-detected (1:00) → Run Simulation (1:15) → Watch live results (1:45) → See win rate (2:00) → Share + Dashboard (2:05).

---

## Shopify App Store Requirements

The app listing is already written. Key technical requirements:
- Scopes: `read_products`, `write_products`
- Compliance webhooks at `https://ecentic.com/api/integrations/shopify/webhooks` handling customer data request, customer data erasure, and shop data erasure via `x-shopify-topic` header
- Test account `review@ecentic.com` with pre-seeded simulation data
- Desktop screenshots needed: Dashboard Overview, Agent Replay, Optimize Tab, Attribute Heatmap

---

## Build Priority

Phase 1 — Core shell:
1. Auth (Clerk integration: signup, login, Shopify OAuth)
2. Onboarding wizard (all 4 steps with Shopify product import)
3. Dashboard layout (topbar + sidebar + responsive shell)
4. Dashboard overview page (summary cards, charts, product table, activity feed)

Phase 2 — Product depth:
5. Product catalog (full table with filters, sort, pagination, bulk actions)
6. Product detail view (all 5 tabs: win rate, agent replay, attribute gaps, battlecard, optimization)
7. Simulation engine (prompt construction, multi-model execution, BullMQ jobs, real-time progress)

Phase 3 — Competitive intelligence + optimization:
8. Competitor management (add, auto-detect, scrape, heatmap)
9. Optimization center (pending queue, approve/publish/dismiss/rollback, auto-optimization settings)
10. Shopify write-back (productUpdate mutation on approval)

Phase 4 — Platform features:
11. UCP profile generation + deployment
12. Model drift detection + alerts
13. Reports + exports + shareable pages
14. Notifications system (in-app + email via Resend)
15. Billing (Stripe integration, plan management, tier gating enforcement)
16. Settings (all subsections)
17. Team management (Dominate+ tier)

---

## Key Terminology (Appendix B)

- **Win Rate** — % of simulations where your product was selected over competitors
- **Agent Commerce** — E-commerce transactions mediated by AI agents on behalf of consumers
- **Simulation** — Controlled test where an AI model receives a purchase query + product data and selects the best product
- **Model Drift** — When an AI model updates its weights/behavior and changes product selection patterns
- **Battlecard** — Per-competitor analysis of attribute wins/losses
- **UCP** — Universal Commerce Protocol, Google & Shopify's standard for agent-to-merchant communication
- **Attribute Gap** — An attribute competitors specify but you don't, causing agent preference for them
- **Decision Replay** — Full reasoning trace from an AI model explaining its product selection
- **Data Quality Score** — 0–100 measuring attribute completeness relative to category norms
