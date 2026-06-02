# écentic — CAC / LTV Analysis

**Last updated:** 2026-06-02
**Period modeled:** Steady state (M9 onwards, post-App Store launch)
**Source:** Unit Economics tab of `ecentic-financial-model.xlsx`

## Summary table

| Tier | ARPA (€/mo) | Gross margin | Avg lifetime (months) | LTV (€) | CAC (€) | LTV/CAC | CAC payback |
|---|---|---|---|---|---|---|---|
| Connect | 137 | 91% | 20 | 2,494 | 250 | 10.0x | 2.0 mo |
| Compete | 459 | 94% | 29 | 12,514 | 700 | 17.9x | 1.6 mo |
| Dominate | 919 | 94% | 50 | 43,193 | 1,800 | 24.0x | 2.1 mo |
| Enterprise | 3,125 | 92% | 20 | 57,500 | 8,500 | 6.8x | 3.0 mo |

Numbers are projected, not current. Current cohort sample is too small (n < 3 paying customers as of June 2026) to compute observed LTV. The numbers above assume the conversion, churn, and CAC model in the financial model and are revised quarterly as actuals accumulate.

---

## Methodology

### LTV (Lifetime Value)

LTV is calculated as:

```
LTV = ARPA × (1 / monthly_churn) × gross_margin_%
```

Where:
- **ARPA** is the average revenue per account, monthly. For SaaS tiers, this is the list price (no current discount applied at base modeling — discounted annual contracts would change the calc slightly upward due to lower churn but lower headline ARPA).
- **1 / monthly_churn** is the implied average customer lifetime in months.
- **gross_margin_%** is the proportion of revenue we keep after variable costs (AI/LLM API spend, cloud share, payment processing).

### CAC (Customer Acquisition Cost)

CAC is calculated as fully-loaded — all sales and marketing spend in a quarter, divided by the count of new paying customers won in that quarter. For Year 1 projections, this is modeled top-down because we don't yet have a quarter of mature CAC data to bottom-up calculate.

Per-tier CAC estimates are derived from channel assumptions:

- **Connect (€250):** primarily Shopify App Store organic + content. The €250 figure is the implied fully-loaded cost when we divide the GTM-hire salary plus content/marketing budget across the projected 80-customer Year-1 cohort. As organic traction compounds, this figure declines.
- **Compete (€700):** mix of App Store self-serve and light-touch sales. CAC reflects ~5 hours of GTM Lead time per close plus marketing share.
- **Dominate (€1,800):** sales-led. Reflects ~20 hours of GTM Lead time, plus a 30-day pilot delivery cost.
- **Enterprise (€8,500):** reflects the full cost of a 12-week pilot — engineering hours to onboard, GTM hours to manage stakeholders, weekly reporting effort. Even at €8,500, payback is under 3 months on a €37.5K Year-1 ACV.

### Gross margin assumptions

Variable costs per customer per month, by tier:

| Tier | AI/LLM cost | Infra share | Total variable |
|---|---|---|---|
| Connect | €8 | €4 | €12 |
| Compete | €18 | €10 | €28 |
| Dominate | €40 | €15 | €55 |
| Enterprise | €180 | €70 | €250 |

These costs scale roughly linearly with simulation volume per customer; the model assumes the volume in each tier's product entitlement is fully used.

### Churn assumptions

Monthly logo churn — the percentage of customers who cancel in a given month:

- **Connect: 5%/month.** High — reflects the indie merchant segment where some installs do not survive their first quarterly cash crunch. Equivalent to ~46% annualized.
- **Compete: 3.5%/month.** Mid — reflects activated customers who have published optimizations and integrated écentic into their workflow.
- **Dominate: 2%/month.** Low — reflects customers who have committed to an annual plan and have integrated the API.
- **Enterprise: 5%/month for the first 12 months, dropping to 1%/month thereafter.** The first-year number is pessimistic to account for pilot non-conversion. Once an enterprise customer is past their first annual renewal, churn drops sharply.

---

## What these numbers mean for the business

### LTV/CAC ratios above 3:1 across all tiers
The accepted industry threshold for healthy SaaS unit economics is LTV/CAC ≥ 3.0. All four tiers comfortably exceed this. The Dominate tier at 24.0x is exceptional and is driven by the long projected lifetime — if Dominate churn rises above the 2%/month assumption, the LTV halves. The number to watch.

### CAC payback under 12 months across all tiers
Connect, Compete, and Dominate all pay back CAC in less than 3 months. Enterprise pays back in 3 months on the Year-1 ACV. This means we can reinvest into growth aggressively without consuming runway — every new customer paid for itself by quarter's end.

### The dataset compounds the LTV
LTV per tier above is a per-customer calculation. The strategic LTV — the value of having 132 customers running simulations daily — is higher than the sum of the per-customer LTVs because each customer adds data points to the proprietary corpus that no competitor can replicate. We do not model this in the financial spreadsheet; it shows up in the "Three things no competitor does" slide of the pitch deck.

---

## Sensitivity analysis

The headline LTV/CAC ratios are sensitive to:

| Assumption | Sensitivity (impact on LTV/CAC for Compete tier) |
|---|---|
| Monthly churn 3.5% → 5.0% | LTV/CAC drops from 17.9x to 12.5x |
| Gross margin 94% → 80% | LTV/CAC drops from 17.9x to 15.2x |
| CAC €700 → €1,200 | LTV/CAC drops from 17.9x to 10.4x |
| All three together (worst case) | LTV/CAC drops from 17.9x to 6.3x |

Even in a stacked worst case, ratios remain healthy. The base assumptions feel achievable but not aggressive.

---

## What we still need to validate

- **Actual monthly churn across a 6-month cohort.** Today we have n = 2 paying customers (Dua, Avatid); we cannot meaningfully measure churn until the Q4 2026 cohort matures.
- **Actual blended CAC after Shopify App Store launch.** Modeled €250–€1,800 across tiers; will be measured weekly once App Store traffic begins in Q3 2026.
- **NRR (Net Revenue Retention).** Modeled at 110% steady state but requires 12 months of cohort data to confirm.
- **CAC payback dilution at scale.** As we add a Marketing Lead and Customer Success at M9 and M12, CAC may rise short-term before NRR offsets it. Watch the Q1 2027 quarter.

This document is updated quarterly with actual cohort data as it accumulates.
