# écentic — Market Research Summary

**Last updated:** 2026-06-02

## Market thesis

The agent commerce optimization layer is a venture-scale market emerging in 2026, structurally analogous to the SEO industry that grew up around Google between 2000 and 2010. The catalyst: every major payments network, hyperscaler, and AI model provider shipped commerce-capable agent infrastructure between April 2025 and February 2026.

## Market size

We use a top-down sizing model with three layered numbers:

| Layer | Size | Source / methodology | What this includes |
|---|---|---|---|
| **TAM (Total Addressable Market)** | €3–5 trillion | McKinsey, January 2026 | Total value of agent-mediated commerce by 2030, globally |
| **SAM (Serviceable Addressable Market)** | €262 billion | Salesforce, January 2026 | Agent-influenced retail sales already in market (2025 holiday season) |
| **SOM (Serviceable Obtainable Market)** | €300M+ | Bottom-up from average per-store spend on AI tooling | Tooling spend by the subset of merchants who will both have agent traffic and pay for optimization |

The SOM number is built bottom-up: ~150,000 mid-market and enterprise merchants globally will install agent-commerce optimization tools by 2028. At an average spend of ~€2,000/year per merchant on this category of tooling, that's €300M+ in addressable annual spend.

The TAM and SAM numbers are about the size of the market being shopped through; the SOM is the slice we can sell into.

## Market timing — why now

Six events between April 2025 and February 2026 mark the inflection point:

| Date | Event | Significance |
|---|---|---|
| April 2025 | Mastercard unveils Agent Pay | First merchant framework for agent-initiated transactions |
| September 2025 | OpenAI + Stripe launch the Agentic Commerce Protocol (ACP). ChatGPT Shopping goes live | The model provider with the largest consumer reach ships native checkout |
| September 2025 | Visa announces Trusted Agent Protocol (TAP), Carrefour named launch partner | The largest payment network commits a flagship enterprise partner |
| November 2025 | Carrefour completes its first ChatGPT Shopping live rollout | Real-world enterprise deployment confirms protocol viability |
| February 2026 | Google Universal Commerce Protocol (UCP) goes live as an open spec | The largest discovery surface in the world standardizes its protocol |
| Forecast 2028 | 25% of retail search will be agent-mediated (Gartner) | The trajectory hits the inflection point |

The combined effect: by mid-2026, every major merchant has the rails available to accept agent-driven traffic, and a meaningful share of consumers have access to agent checkout. What's missing is the layer that makes merchants competitive within agent shopping decisions — which is écentic.

## Competitive landscape

We classify the competitive landscape into four tiers.

### Tier 1: Adjacent categories we're explicitly NOT
- **GEO (Generative Engine Optimization) tools** — optimize for being mentioned in chatbot answers. Examples: Profound, Otterly, Athena. They serve a different buyer (content / SEO) and a different outcome (mentions, not carts).
- **Traditional SEO tools** — Ahrefs, SEMrush, etc. Adjacent customer base but different optimization target.
- **Shopify-native AI features** — Shopify's own generative product description tools. Complementary, not competitive; we tell the merchant *whether* the descriptions actually win against competitors when an agent reads them.

### Tier 2: Direct overlap (early-stage)
We have identified a small number of early-stage companies positioning in adjacent territory:

- **AI commerce monitoring tools** — show merchants whether they appear in chatbot answers. Closer to GEO than to écentic; they do not auto-publish or close the loop.
- **Agent traffic analytics** — single-purpose tools that detect AI bots in traffic logs. Single-feature, no optimization workflow attached.

None of the directly-overlapping early-stage competitors known to us as of June 2026 simulate head-to-head purchase decisions across multiple AI models and auto-publish the fix. We are tracking the public landscape monthly; an updated competitor map is maintained in a separate document and updated quarterly.

### Tier 3: Future enterprise consolidators (5+ years out)
- Salesforce, Adobe, HubSpot, Klaviyo — large MarTech platforms that will eventually add an "agent commerce" module via build-vs-buy. We're an attractive acquisition target for this category.

### Tier 4: Platform companies
- Shopify, BigCommerce, Stripe, Visa, Mastercard, OpenAI, Google. These companies are partners, not competitors. Each could in principle build a competing layer; in practice, none have done so as of June 2026, and several (Plug and Play, Visa) are actively considering distribution partnerships with us.

## Differentiation — three things no competitor does

This is the moat language we use in the pitch deck and that holds up under scrutiny:

1. **Active simulation.** We stage real competitive buying sessions across GPT-4, Claude, Gemini, and Perplexity. We tell the merchant their actual agent win rate — not an estimate, not a sentiment score.
2. **Closed-loop automation.** We don't suggest fixes. We write the fix (title, description, structured data, UCP profile) and publish it to the merchant's store automatically.
3. **First on UCP + ACP.** We are the first tool that scores readiness across both Google's UCP and OpenAI's ACP. As these protocols solidify, that first-mover position becomes a defensible distribution advantage.

The deeper, harder-to-replicate moat is the proprietary corpus: every simulation we run becomes a data point linking listing content to agent behaviour to outcome. With 80 self-serve customers running daily simulations, we accumulate ~50,000 simulations per month within a few months of App Store launch. No competitor — not even a well-resourced one — can backfill that dataset.

## Market risks and uncertainties

| Risk | Mitigation |
|---|---|
| AI shopping adoption ramps slower than Gartner's 25%-by-2028 forecast | Year-1 thesis works even at half the projected adoption rate; the SaaS price points are low enough to attract merchants who are merely "AI-curious" |
| One model provider (e.g., OpenAI) launches its own merchant-facing optimization tool | We position as model-agnostic; merchants do not want to be locked into a single provider's view of their store |
| Shopify launches a native agent-optimization feature | We anticipate this happening within 24 months. Our moat shifts to: (a) cross-platform reach (Woo, BigCommerce, Amazon), (b) the proprietary dataset Shopify cannot replicate. Plus, native Shopify features have historically created the demand for third-party deeper tools, not destroyed it (cf. Klaviyo vs. Shopify Email). |
| The protocols themselves (UCP, ACP, TAP) fragment or compete | Our work product (titles, descriptions, JSON-LD) is broadly portable. We absorb the protocol complexity on the merchant's behalf. |
| Privacy regulation tightens around AI training data | Reinforces our positioning — we have explicit no-training commitments from model providers and never use customer data for training. |

## Sources and reading list

- McKinsey & Company, "The state of agentic commerce", January 2026
- Salesforce, "Agentic commerce holiday season report", January 2026
- Gartner, "Predicts 2026: Agent-mediated retail search", 2025
- Adobe Analytics, Cyber Week 2025 AI traffic report
- Visa Trusted Agent Protocol announcement, September 2025
- OpenAI + Stripe Agentic Commerce Protocol announcement, September 2025
- Google Universal Commerce Protocol open specification, February 2026
- Mastercard Agent Pay framework announcement, April 2025

Internal documents that inform this summary:
- `docs/context/idea.md` — full écentic product specification
- `docs/context/strategy.md` — strategy and retention thinking
- Pitch deck (Red Bull Basement Finals 2026 version) and one-pager
