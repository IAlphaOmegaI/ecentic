# écentic — Customer KPIs and Analytics

**Last updated:** 2026-06-02
**Refresh cadence:** Manually weekly until Q3 2026 (when the App Store launch automates instrumentation), then auto-pulled into the dashboard

## Headline metrics (current state, June 2026)

| Metric | Value | Trend | Notes |
|---|---|---|---|
| Paying customers | 2 | Flat | Dua Flavours, Avatid |
| MRR | <€500 | Up | Below tier base price (early/discounted) |
| ARR (annualised current MRR) | <€6,000 | Up | Modeled to grow to €450K by EoY1 |
| Total accounts (paid + free trial + scan-only) | ~15 | Up | Most are free-scan-only at this stage |
| Trial → paid conversion rate | Not yet meaningful | — | Not enough data — App Store launch in Q3 will enable measurement |
| Active store integrations | 2 | Flat | Both Shopify; WooCommerce integration live but no customer yet |
| Simulations run (cumulative) | 100+ | Up | Across 4 models (GPT-4, Claude, Gemini, Perplexity) |
| Public UCP validator monthly uses | Tracked weekly post-launch | — | Lead-magnet — visitors enter their domain, get a report |

## Acquisition metrics

| Metric | Target | Measurement plan |
|---|---|---|
| Shopify App Store visitors per week | Track from Q3 2026 launch | Shopify App Store analytics dashboard |
| App Store visitor → install conversion | 8–12% (industry benchmark) | Shopify App Store analytics |
| Install → first scan completion | 60% within first session | Internal product analytics (PostHog) |
| First scan → 14-day trial start | 50% | Internal product analytics |
| Free trial → paid conversion | 30% | Billing data (Shopify Billing or Stripe) |
| Outbound prospect → discovery call booked | 5% | CRM (TBD — currently spreadsheet-based) |
| Discovery call → pilot or trial | 40% | Sales pipeline tracking |
| Pilot → annual contract (Enterprise) | 60% | Manual tracking — small n |

## Retention metrics

| Metric | Target | Cohort window |
|---|---|---|
| 30-day activation rate | >60% across all tiers | 30 days post first paid charge |
| 30-day Net Promoter Score | >40 | Surveyed at Day 30 |
| Monthly logo churn (Connect) | <5% steady state | Rolling 90-day average from Q4 2026 onwards |
| Monthly logo churn (Compete) | <3.5% steady state | Rolling 90-day average |
| Monthly logo churn (Dominate) | <2% steady state | Rolling 90-day average |
| Net Revenue Retention (NRR) | >110% at 12 months | First measured Q3 2027 |
| Gross Revenue Retention (GRR) | >90% at 12 months | First measured Q3 2027 |

## Engagement metrics (per active paying customer)

| Metric | Target | Notes |
|---|---|---|
| Logins in first 14 days | ≥5 | Activation signal #1 |
| Simulations run per month | Tier-specific cap × 50% utilisation | Connect: 25, Compete: 250, Dominate: 1,000+ |
| Optimizations published per month | ≥3 | Activation signal #2 |
| Competitors connected (beyond auto-detected 3) | ≥2 by Day 30 | Activation signal #3 |
| Time to first published optimization | <7 days from install | Activation signal #4 |
| Win-rate trend visible in dashboard | True by Day 14 | Implicit — confirms data is flowing |

## Revenue quality metrics

| Metric | Target | Notes |
|---|---|---|
| Annual contracts as % of new ARR | >40% by EoY1 | Annual discounts incentivise commitment |
| Audit revenue as % of total revenue | <20% steady state | Audit is runway-supporting, not the core revenue line |
| Enterprise ACV (avg) | €37.5K Year 1, growing to €50K+ Year 2 | Tracked on contract execution |
| Tier mix (Connect / Compete / Dominate) | 70 / 20 / 10 by customer count | Tracked monthly |
| Mix shift toward Compete and Dominate over time | NRR via upgrades | Tracked quarterly |

## Product usage metrics (aggregated, not per-customer)

| Metric | Description | Why it matters |
|---|---|---|
| Total simulations run (cumulative) | All-time count across all customers | Proxy for dataset depth — proprietary moat |
| Distinct merchants scanned (cumulative, including free scans) | Includes one-time public UCP validator uses | Proxy for top-of-funnel reach |
| Average win-rate lift after first optimization | €P50 lift in agent win rate after first publish | Core demonstrable product value |
| Models updated per quarter | Count of model-version updates that triggered re-simulations | Demonstrates the model-drift moat |
| UCP profiles auto-generated | Cumulative count | Shows readiness work shipped on behalf of customers |

## What we publish externally

A subset of these metrics is published in two external channels:

1. **Public dashboard at ecentic.ai/index** — aggregate, anonymized: "Average agent win rate across X stores", "Most common reason agents pick a competitor", etc. Updated weekly. Lead-capture asset.
2. **Quarterly "State of Agent Commerce" report** — deeper analysis, distributed to email list, used as PR and inbound generator. First edition Q4 2026.

## Data sources and infrastructure

- **Product analytics:** PostHog (EU region)
- **Error tracking:** Sentry (EU region)
- **Billing:** Shopify Billing for App Store, Stripe for direct customers
- **Sales pipeline:** spreadsheet today, will move to a proper CRM by Q4 2026
- **Internal dashboarding:** ad-hoc queries against PostgreSQL today; a proper internal KPI dashboard ships post-raise (Engineer #2 hire in M6 owns this)

All metrics above are reviewed in the weekly Friday team review and form the basis of the monthly investor update.
