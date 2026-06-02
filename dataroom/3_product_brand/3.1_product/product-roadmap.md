# écentic — Product Roadmap

**Last updated:** 2026-06-02
**Codebase:** Next.js 16, React 19, Drizzle ORM, PostgreSQL, Better Auth, Vercel AI SDK 6.0, Azure AI, Shopify Admin API, UploadThing
**Repo health:** Production-grade, 14-table PostgreSQL schema, durable job queue, write-back to Shopify and WooCommerce live today

---

## Where we are today (June 2026)

### Shipped and in production
- **Shopify integration** — OAuth install via App Store listing, catalog sync (initial + scheduled), one-click write-back of optimized listings
- **WooCommerce integration** — credential-based connection, paginated product fetch, write-back
- **Feed integration** — XML / JSON / Google Shopping format auto-detection
- **Universal Commerce Protocol (UCP) generator** — auto-generates `/.well-known/ucp` profile from merchant catalog and business info, with rotation and audit log
- **Agent commerce simulation engine** — runs head-to-head AI agent simulations across GPT-4, Claude, Gemini, and Perplexity for any product vs. competitor
- **Agent Replay** — per-simulation reasoning trace surfacing spec gaps, image gaps, trust signals, structured-data coverage
- **Listing Optimization Center** — AI-generated title + HTML description + JSON-LD structured data with one-click publish to Shopify or WooCommerce
- **Win-rate dashboard** — per-SKU, per-model win rates over time, with model-drift alerts
- **Agent traffic detection** — two-layer (JavaScript beacon + referrer/user-agent) detection of 20+ agent types
- **Tiered SaaS billing** — three tiers (Connect / Compete / Dominate), monthly subscription via Shopify billing
- **Public UCP validator** — validates any domain's UCP compliance, robots.txt audit for AI bot access (logged-out, lead-magnet)

### Live customers
- Dua Flavours UK (Shisha / lifestyle, £10K+ MRR merchant)
- Avatid (UK/Albania beauty and self-care services)

### In active sales conversation through Plug and Play
- Carrefour, eBay, Inditex

---

## Q3 2026 (next 3 months)

**Theme: Distribution & onboarding velocity.**

- Shopify App Store listing live with write-back enabled (one of ~45 apps in the agent-optimization category as of 2026)
- One-click onboarding fully self-serve: install → catalog connected → first scan within 5 minutes
- Free tier (Scan-only) live as lead magnet
- Public State of Agent Commerce mini-report (first quarterly)
- HTTP Message Signatures / Web Bot Auth implementation aligned to Visa TAP signing primitives
- First merchant case study published with measurable win-rate lift

**Engineering hires:** Engineer #1 (back-end) onboarded by M2; Engineer #2 (full-stack) planned for M6.

---

## Q4 2026

**Theme: Enterprise pilot delivery.**

- 12-week enterprise pilot framework operationalized (Scope → Baseline → Optimize → Measure)
- First enterprise pilot signed and onboarded
- Persona-based simulation: budget shopper, premium shopper, eco-conscious shopper personas modify agent prompts; win rates tracked per persona
- Model-drift alerts: auto-trigger re-simulation sweeps on detected model updates (GPT-4.x → GPT-5, Claude 3.7 → 4, etc.)
- Shareable scan reports (public-link summaries for agency handoff or executive review)
- 100 paying merchants milestone

---

## Q1 2027

**Theme: Platform expansion.**

- **BigCommerce integration** — same connector pattern as Shopify, OAuth + write-back
- **Amazon SP-API integration** — read-only first, then write-back for amazon-listed SKUs
- Second enterprise pilot signed (target: Carrefour or eBay)
- Aggregate industry benchmarks live in dashboard ("Your win rate vs. category average")
- SOC 2 Type I audit completed (Vanta engagement signed Q4 2026)

---

## Q2 2027 (end of Year 1)

**Theme: Scale + Series A readiness.**

- 200+ paying merchants
- €450K ARR exit-rate
- Two enterprise pilots delivered, case studies published
- SOC 2 Type II observation window opens
- "écentic Index" — first publicly published cross-merchant view of agent-commerce trends (anonymized, aggregated)
- Series A materials drafted, lead investor conversations active

---

## H2 2027 (Series A deployment)

**Theme: Geographic expansion + product depth.**

- US office opens in San Francisco (1-2 sales hires, founder presence)
- EU sales hub in London or Berlin (1 hire)
- ISO 27001 scoping begins
- API access tier — allow merchants and agencies to programmatically pull win-rate data
- Agency partner program — Shopify Plus partner agencies resell écentic as a managed service
- 500 merchants, 5 enterprise contracts

---

## 2028

**Theme: Cross-platform + cross-network.**

- Native integrations with major commerce platforms beyond the top 4: Squarespace Commerce, Adobe Commerce, Salesforce Commerce Cloud, Wix Commerce
- Visa Merchant Observatory — a co-published quarterly view of Trusted Agent Protocol adoption in the wild, available to Visa-portfolio merchants
- "State of Agent Commerce" becomes the category-reference quarterly publication
- 1,000+ merchants, 10+ enterprise contracts
- €5M+ ARR

---

## Tech debt / refactor commitments

These are explicit on the roadmap because they unblock specific commercial commitments and would otherwise be deferred indefinitely.

- **Q3 2026:** migrate simulation queue from in-process to a managed durable queue (already using one — needs hardening for >100 concurrent merchants)
- **Q4 2026:** complete EU data residency enforcement at the row level (currently enforced at the application layer; row-level policy is a SOC 2 Type II requirement)
- **Q1 2027:** rewrite the agent-traffic detection beacon to support content-security-policy strict mode (required by enterprise customers with locked-down CSPs)

---

## What is NOT on the roadmap (and why)

- **Native mobile apps** — merchants do their job in a browser; mobile is not a real workflow surface for this product.
- **In-house LLM hosting** — Azure AI Studio + the major model APIs are sufficient and cheaper than self-hosting until very large scale.
- **Open-source release of the simulation engine** — the simulation orchestration logic is the moat; keeping it proprietary aligns incentives with paying customers.
- **Agent products of our own** — we are the merchant-side optimization layer, not an AI shopper.
