# écentic — Customer Journey Map

**Last updated:** 2026-06-02

The journey is mapped at three altitudes: self-serve (Connect tier), sales-led (Compete and Dominate), and enterprise pilot. Each altitude has a different ladder of states.

---

## Self-serve journey (Connect tier)

```
Awareness  →  Trial  →  First scan  →  Paid  →  Activated  →  Expansion / Churn
  Day -∞       Day 0     Day 0          Day 14    Day 30           Day 90+
```

### Awareness (before they meet écentic)
- Merchant sees a YouTube tutorial mentioning écentic, or reads a blog comparing agent-commerce tools, or sees écentic in the Shopify App Store search results
- They visit ecentic.ai and either install directly or run the free UCP validator
- **Question we answer:** "Is this for someone like me?"

### Trial (Day 0)
- Merchant installs the écentic Shopify app
- OAuth handoff completes; catalog syncs in 2–5 minutes for a typical 100–500 SKU store
- 14-day free trial begins automatically

### First scan (Day 0, within 10 minutes of install)
- Merchant runs their first agent commerce simulation against 3 auto-detected competitors
- Receives an Agent Replay report showing exactly why each model picked the winner
- **The "aha" moment:** they see GPT-4 explain in plain English why their listing lost. They didn't know this was visible before.

### Paid conversion (Day 14)
- Trial expires; merchant decides to enter card or churn
- Target conversion: 30% trial → paid Connect

### Activated (Day 30)
- Merchant has logged in ≥5 times
- Optimized at least 5 listings via the one-click publish flow
- Connected at least one additional competitor beyond the auto-detected three
- **Health signal:** customers who hit all three activation criteria churn at <2%/month; customers who don't hit any churn at ~12%/month

### Expansion / Churn (Day 90+)
- Customer connects more competitors → in-product prompt to upgrade to Compete (3 → 10 competitors)
- Customer hits simulation cap → in-product prompt
- Customer requests Agent Replay (locked feature on Connect) → in-product upgrade flow
- Net 90-day churn target: 5%

---

## Sales-led journey (Compete and Dominate)

```
Outreach  →  Discovery  →  Pilot  →  Contract  →  Onboarding  →  Expansion
  Week 0      Week 1       Week 2-4  Week 5      Week 6-10      Week 12+
```

### Outreach (Week 0)
- GTM Lead identifies prospect (App Store install signal, inbound, outbound list, agency referral, Plug and Play)
- Pre-call: free scan run on prospect's catalog before any contact
- First outreach: cold email or LinkedIn DM with one specific finding from the scan
- **What lands:** "I noticed your hero product loses 7/10 times to [competitor] on GPT-4 — happy to send the full scan if useful."

### Discovery (Week 1, 30-minute call)
- Discovery questions from the sales playbook
- Demo on the prospect's actual catalog
- Close with specific next step (full scan report, pilot proposal, technical scope call)

### Pilot (Week 2–4)
- 30-day free trial (Compete) or 90-day pilot (Dominate)
- Onboarding: 1-hour kickoff call, catalog imported, first optimization shipped
- Weekly check-in with two named business stakeholders
- Weekly delta report: win-rate change, traffic shift, top-3 fixes published

### Contract (Week 5)
- Annual contract proposed at 15–20% discount vs. month-to-month
- Standard customer agreement used (Compete); Dominate gets counter-signature
- Procurement / security review handled where applicable (Vendor Security Questionnaire pack available on request)

### Onboarding (Week 6–10)
- Slack channel opened between écentic CS and customer team (Dominate only)
- All competitors loaded
- Persona-based simulation configured (Dominate only)
- Model-drift alerts active
- Activation success criteria hit by end Week 10

### Expansion (Week 12+)
- Customer adds more stores → multi-store pricing kicks in
- Customer adds API access (Dominate)
- Customer commissions a catalog audit (one-time fee)
- Net 12-month revenue retention target: 110%

---

## Enterprise pilot journey (Tier C, custom-priced)

This is the 12-week structured pilot framework as already specified in the sales WIP deck:

```
Scope         Baseline        Optimize         Measure
Week 1-2      Week 3-4        Week 5-8         Week 9-12
```

### Scope (Week 1–2)
- **Partner-specific KPI defined** in writing (e.g., "lift agent-driven win rate on top 200 SKUs by 8 percentage points by end of pilot")
- **Catalog or SKU subset connected**
- **Access and security review** completed
- **Output artifact:** signed pilot scope document, forwardable internally at the partner

### Baseline (Week 3–4)
- Full simulation across all four models on the agreed SKU subset
- Agent-traffic instrumentation live
- Baseline win-rate report delivered to the partner
- **Output artifact:** Baseline Agent-Readiness Report (PDF, 8–12 pages)

### Optimize (Week 5–8)
- Top-priority diagnostics shipped
- First batch of listing optimizations published
- Weekly delta report delivered to the named business stakeholders
- **Output artifact:** Weekly Optimization Log (live document)

### Measure (Week 9–12)
- After-vs-before win-rate lift measured
- Agent-traffic delta by model reported
- Joint executive readout + scaling decision presented to the partner's leadership
- **Output artifact:** Pilot Outcome Report + Scaling Proposal (the latter optional, used to convert pilot → annual contract)

### Post-pilot
- Case study + co-branded agent-readiness benchmark report (optional, partner-approved)
- Annual contract proposed at €25K–€75K Year 1 ACV depending on scope
- Multi-year contract with annual price step proposed for Year 2+

---

## Touchpoints across all journeys

| Touchpoint | Self-serve | Sales-led | Enterprise |
|---|---|---|---|
| Welcome email + onboarding sequence | Yes (automated) | Yes (sales-personalized) | No — replaced by kickoff call |
| Weekly digest email (win-rate changes, optimizations, alerts) | Yes | Yes | Yes + weekly delta report |
| In-app upgrade prompts | Yes | Subtle | Disabled |
| Quarterly health-check call | No | Yes (Dominate) | Yes |
| Annual review and renewal conversation | Email only | Yes | Mandatory in-person where feasible |
| Quarterly "State of Agent Commerce" report | Auto-sent | Auto-sent | Co-branded option |

---

## What we measure on the journey

Internal metrics tracked weekly per cohort:

- **Time to first scan** (target: < 10 minutes from install)
- **Time to first paid month** (target: < 21 days from install for Connect)
- **30-day activation rate** (target: > 60% across all tiers)
- **NPS at Day 30** (target: > 40)
- **Net Revenue Retention at Day 365** (target: > 110%)
- **Customer lifetime value (LTV)** (target by tier in the Unit Economics tab of the financial model)
- **CAC payback period** (target: < 12 months)
