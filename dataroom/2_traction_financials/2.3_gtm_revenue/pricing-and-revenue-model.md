# écentic — Pricing & Revenue Model

**Last updated:** 2026-06-02

## Revenue streams

écentic generates revenue through two primary streams.

### 1. SaaS subscription (monthly, three-tier)

| Tier | Monthly price (USD) | Monthly price (EUR, @ 0.92) | Target merchant |
|---|---|---|---|
| **Connect** | $149 | €137 | Indie Shopify merchants, GMV $100K–$1M, single store, self-serve |
| **Compete** | $499 | €459 | Growing brands, GMV $1M–$10M, multi-SKU, agency-aware |
| **Dominate** | $999 | €919 | Established merchants, GMV $10M–$50M, multi-store, multi-region |

The blended ARPA across a healthy customer mix (70% Connect, 20% Compete, 10% Dominate) is approximately €280 per month.

### 2. Enterprise contracts (annual, custom-priced)

Enterprise pilots are positioned as 12-week structured engagements that convert to annual contracts on success. Typical structure:

- **Pilot fee:** €0 for the first two enterprise pilots in 2026 (positioned as flagship case-study generators)
- **Pilot fee from 2027:** €15K-€50K depending on scope
- **Year 1 annual contract:** €25K-€75K depending on catalog size and geography
- **Average enterprise ACV (Year 1 target):** €37,500

### 3. Optional revenue: agency / done-for-you audits

Catalog audits are sold as one-time engagements to merchants who want a single comprehensive write-up rather than ongoing software. This stream is positioned as "Agency as a Software" — keeping the price closer to consulting margins while fundamentally delivered through the same software stack.

- Price range: €2,300 – €13,800 per audit (corresponds to $2,500 – $15,000)
- Average: €5,000 per audit
- Volume target: 2 audits/month at steady state (M6 onwards)
- Purpose: fund runway while SaaS scales; convert audit customers into recurring subscriptions

## What's included at each SaaS tier

| Feature | Connect | Compete | Dominate |
|---|---|---|---|
| Shopify / WooCommerce one-click install | ✓ | ✓ | ✓ |
| Free initial scan (lead-magnet) | ✓ | ✓ | ✓ |
| Number of competitors tracked | 3 | 10 | Unlimited |
| Simulations per month | 50 | 500 | Unlimited |
| Models simulated | GPT-4, Claude | GPT-4, Claude, Gemini, Perplexity | All + early access to new models |
| Agent Replay (reasoning trace) | — | ✓ | ✓ |
| Auto-publish optimized listings | — | ✓ | ✓ |
| Agent traffic dashboard | Basic | Full | Full + cohort analysis |
| Persona-based simulation (budget, premium, eco) | — | — | ✓ |
| Model-drift alerts | — | ✓ | ✓ + auto-re-optimize |
| Public UCP validator | ✓ | ✓ | ✓ |
| Shareable scan reports | — | ✓ | ✓ |
| API access | — | — | ✓ |
| Support | Email (48h SLA) | Email (24h SLA) | Email + Slack (4h SLA) |

## Why this pricing

- **Connect at $149/mo** is priced to be a no-meeting decision for an indie merchant. It's the same range as established Shopify apps in adjacent categories (SEO, analytics, reviews).
- **Compete at $499/mo** is the volume sweet spot — most growing brands sit here. It includes the auto-publish loop, which is the most defensible part of the product.
- **Dominate at $999/mo** is positioned as the "agency-grade" tier. The price is low enough that a single recovered sale pays for the year of subscription.
- **Enterprise pricing is custom** because the catalog sizes (50K–500K SKUs), security review processes, and integration complexity vary too much for a price list.

## Gross margin

- **SaaS gross margin: ~82%**
- Variable cost per customer per month: AI/LLM API spend (≈€8 per active customer per month at steady state) + cloud + infra share. This scales sub-linearly with revenue once we cross 100 customers.
- Enterprise gross margin: 70%–78% (slightly lower because pilots include high-touch onboarding that takes engineering hours).

## Pricing power and upgrade path

The standard customer journey is:

1. Land on Connect via Shopify App Store (low-friction install, free scan immediately)
2. Convert to Compete within 60 days as soon as the customer wants the auto-publish loop active across more than 3 competitors
3. Convert to Dominate within 12 months as the catalog grows or the customer wants persona-based simulation and the API tier

We model net revenue retention at 110%+ at steady state, driven by tier upgrades, audit add-ons, and modest annual price adjustments.

## What we explicitly do not charge for

- The initial scan (this is a lead-magnet — the merchant gets one full report before paying anything)
- The public UCP validator (always free, for any domain — drives top-of-funnel)
- Quarterly "State of Agent Commerce" report (free download, lead-capture only)
- Open-source contributions to the agent-commerce ecosystem (these increase our credibility, not our revenue)
