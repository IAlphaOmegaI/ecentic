# écentic — Sales Playbook

**Last updated:** 2026-06-02
**Audience:** Internal sales team and founders selling

## The two sales motions

### Self-serve motion (Connect tier, App Store)
No salesperson involved. Merchant installs, scans, gets a report, decides to pay. The "sales" work is product, copy, and the email-nurture sequence. Documented separately under product onboarding.

### Sales-led motion (Compete, Dominate, Enterprise)
A salesperson — currently Iseld, post-raise a dedicated GTM Lead — runs the prospect from first conversation to signed contract. The playbook below covers this motion.

---

## Stage 1 — Discovery (30-minute call)

### Pre-call prep
- Pull the prospect's Shopify catalog from public data
- Run a free écentic scan on 3–5 of their hero SKUs against 2 obvious competitors
- Identify one specific finding to lead with ("On GPT-4, your hero product loses to [competitor] 7 out of 10 times because [specific reason]")

### Discovery questions

| Question | Why we ask it |
|---|---|
| "Walk me through how a customer typically finds you today." | Surfaces their current acquisition channels and whether AI is on their radar |
| "Have you noticed agents like GPTBot, ClaudeBot, or PerplexityBot in your traffic logs?" | Qualifies awareness — if yes, we're educating less |
| "What does your structured-data setup look like right now? JSON-LD on product pages?" | Identifies technical readiness and where we'd add value |
| "When you check ChatGPT or Perplexity for a category you compete in, do you show up?" | Live moment-of-truth: many merchants haven't checked |
| "What are you doing today to optimize for AI shopping agents?" | Reveals whether they're considering GEO tools — our anti-pattern |
| "If we could show you exactly why agents pick a competitor over you, would that be useful in the next 30 days?" | Tests urgency |

### Demo (during the same call, last 15 minutes)
1. Load the pre-run scan on their actual catalog
2. Open Agent Replay on a SKU they lose
3. Show the diagnose → optimize → publish loop in one click
4. Show the win-rate trend chart

The demo is short and concrete. We never demo on a fictional store.

### Close of discovery
End with a specific next step, not "I'll send some materials."

Three possible closes from discovery:
- **"Want me to send a full scan report for your top 50 SKUs by Tuesday?"** — for Compete-tier prospects who want depth before deciding
- **"Want to start a 12-week pilot with the first 30 days free?"** — for Dominate-tier prospects who want to test before signing
- **"Should we set up a 30-minute scope call with your tech lead to talk integration?"** — for enterprise prospects

---

## Stage 2 — Qualified opportunity (5–14 days)

### What "qualified" means
- We have written confirmation of the budget owner's name
- We have a specific use case the prospect wants to solve
- We have a target start date
- We have not been told "we'll get back to you next quarter"

### Activities
- Send the full scan report within 48 hours
- Set up a follow-up call to walk through findings
- Identify any procurement / security review hurdles early
- Send a one-line stakeholder map: "I've heard from you, what other voices need to be in the next conversation?"

### Common objections and how to handle them

| Objection | Response |
|---|---|
| "Isn't this just SEO for AI?" | "SEO optimizes for being shown in search results. We optimize for being chosen in a head-to-head purchase decision. The simulation engine shows you the moment of decision, not the moment of impression." |
| "GEO tools already do this." | "GEO tools optimize for being mentioned in chatbot answers. We optimize for being the cart — for being the merchant the agent actually buys from. The work product is different: titles, structured data, UCP, not blog content." |
| "We don't have any AI traffic yet." | "20% of last Cyber Week was bought through AI. By the time you have meaningful AI traffic in GA4, you're already behind merchants who optimized first. We help you be in the front of the agent's answer when traffic shows up — not 6 months later." |
| "How long does this take to set up?" | "One click to install, five minutes to first scan. The auto-publish loop ships fixes back to your store starting day one." |
| "What about Shopify's own AI features?" | "Shopify gives merchants generative AI for product descriptions. We give merchants the simulation that tells you whether those descriptions actually win against your competitors when an agent reads them. Complementary, not competitive." |
| "Why should I pay $499/mo vs. doing this myself?" | "You could. But you'd need to know how to prompt four different models, how to evaluate outputs against your competitors, how to format JSON-LD that doesn't break Shopify rendering, and how to detect when GPT-4.x changes its preferences. We do that work for you, and we publish the dataset of agent behavior across thousands of catalogs. That dataset is the thing you can't replicate." |
| "We need to think about it." | Push for a specific next-step date. "Totally — would Tuesday or Friday next week be better for a follow-up?" Never let the conversation end without a calendar event. |
| "Send me a proposal." | Push back gently: "Happy to. The proposal will mirror what we just discussed. Before I send it — is there anything specific that, if it's not in the proposal, would be a deal-breaker? I want to make sure the document reflects what matters to you." |

---

## Stage 3 — Pilot / proof-of-concept (4–12 weeks)

For Compete and Dominate tiers, the proof is a 30-day live trial: install, run sweeps, show before/after on a sample of SKUs.

For Enterprise, the proof is a 12-week pilot with a written scope. The framework is in `dataroom/2_traction_financials/2.3_gtm_revenue/customer-journey.md`.

### Required for pilot kickoff
- Signed pilot agreement (or written scope email if pilot is free)
- Named technical contact on the prospect's side
- Two named business stakeholders who will receive the weekly delta report
- Catalog or SKU subset connected
- Security review document forwarded (when applicable)

---

## Stage 4 — Negotiation and close

### Pricing posture
- **Connect ($149/mo):** never discounted. It's already the on-ramp price.
- **Compete ($499/mo):** annual contract gets 15% off (€420/mo equivalent), paid up front
- **Dominate ($999/mo):** annual contract gets 20% off (€799/mo equivalent), paid up front; multi-store accounts get further volume discount
- **Enterprise:** custom, but never below €25K Year 1 ACV

### Contract approach
- Standard customer agreement is the same for all SaaS tiers (Connect, Compete, Dominate). No counter-signature required for Connect (click-through). Counter-signature offered for Compete and required for Dominate.
- Enterprise gets a custom Master Services Agreement (MSA) with DPA exhibit and statement of work for each engagement

### Authority to discount
- Up to 20% off list price: GTM Lead can approve
- 20%–35% off list price: CEO approval required
- More than 35% off list price: Founder consensus + a written reason for the file

---

## Stage 5 — Onboarding and expansion

### Onboarding success criteria (Day 30 review)
- Catalog fully connected and synced
- Initial scan completed across the agreed scope
- First optimization batch published back to the store
- Win-rate dashboard active with at least one week of trend data
- Customer has logged in at least 5 times in the first 14 days

### Expansion signals (when to upsell to higher tier)
- Connect customer connects more than 3 competitors → time to upsell to Compete
- Compete customer hits simulation cap 2 months in a row → time to upsell to Dominate
- Multi-store account on Compete → flag for Dominate annual contract
- Customer requests API access → Dominate immediately (API is tier-locked)

### Expansion signals (when to propose audit add-on)
- Customer is a multi-brand or multi-region merchant who hasn't done a full catalog audit
- Customer is preparing for Black Friday / Cyber Monday — sell a pre-event audit
- Customer is migrating from another platform — sell a migration audit

---

## Things we don't do

- We don't cold-call. Outbound is via written channel (email, LinkedIn) with a specific reason for the message.
- We don't pitch in the first email. Always lead with a specific finding from a free scan we ran.
- We don't ghost prospects. If we choose not to pursue a deal, we say so in writing and offer a referral if appropriate.
- We don't lie about traction. If we have 6 customers we say 6 customers, not "dozens" or "growing fast."
- We don't promise outcomes we can't measure. Every pilot has a written KPI and a written measurement method.
