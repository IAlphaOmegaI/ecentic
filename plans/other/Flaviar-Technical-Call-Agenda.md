# Flaviar — Technical Call Agenda

**Date:** Monday, 20 July 2026
**ecentic:** Xhurian Shaba (CEO), + CTO
**Flaviar:** Adi Pal (CTO), Aljaz Vindis (Interim Chief Product Officer, incl. Design)
**Intro from:** Jugoslav Petkovic (co-founder, Flaviar) — now BCC'd
**Prior artifact:** AI-Agent Commerce Audit (sent 25 June, forwarded to CTO ~10 July)

---

## 0. Read this first — the premise of your audit has changed

Between sending the audit and this call, **Flaviar turned on UCP.** Verified live on 19 July 2026:

- `https://flaviar.com/robots.txt` — points agents at UCP and forbids scripted checkout
- `https://flaviar.com/agents.md` — full agent instructions, Shop skill recommendation, policy URLs
- `https://flaviar.com/.well-known/ucp` — UCP `2026-04-08`, Google Pay + Shopify card handlers
- `https://flaviar.com/api/ucp/mcp` — live, responds to `search_catalog`, `lookup_catalog`, `get_product`

This is almost certainly Shopify-shipped default rather than a Flaviar project — the robots.txt is boilerplate Shopify agentic config, and the discovery doc resolves to `flaviar-us.myshopify.com`. **Do not assume they built it. Do not assume they know what it emits.**

**What this does to your pitch:** the line "an agent can find the right bottle but can't buy it" is now half-wrong and Adi will know it. An agent *can* transact. Lead with that correction — it costs you nothing and buys you the room.

**What replaces it is stronger.** The pipe is connected, and it is pumping broken data into ChatGPT, Copilot, Google AI Mode and Gemini right now. Before UCP, bad catalog data was an SEO problem. After UCP, it's a live API contract with the four largest AI shopping surfaces — and Flaviar is failing it silently, at machine speed, with no error surfacing in their analytics.

> **Opening line:** "Since we sent that report you've gone live on UCP — which actually makes the findings more urgent, not less. Can I show you what your own MCP endpoint returned this morning?"

---

## 1. Agenda at a glance (60 min)

| # | Segment | Time | Owner |
|---|---------|------|-------|
| 1 | Framing + the UCP correction | 5 min | Xhuri |
| 2 | Live evidence from their endpoint | 12 min | CTO |
| 3 | Discovery — what we don't know | 12 min | Xhuri |
| 4 | The variant-resolution architecture | 12 min | CTO |
| 5 | Compliance exposure | 6 min | Xhuri |
| 6 | Measurement + the ask | 10 min | Xhuri |
| 7 | Next steps | 3 min | Xhuri |

Open by putting the agenda on screen and asking Adi what he'd add or cut. He's a CTO; let him steer.

---

## 2. Live evidence — the 12 minutes that matter

Everything below was pulled from `https://flaviar.com/api/ucp/mcp` on 19 July 2026 using the public Shopify example agent profile. **Reproduce it live on the call if the connection allows.** Nothing here is modelled, inferred, or scraped.

### Exhibit A — the featured variant is out of stock 54% of the time

UCP spec, Catalog capability: *"Businesses SHOULD return the most relevant variant and image first... Platforms SHOULD treat the first element as featured."*

Across 8 realistic buyer queries, 160 products returned by `search_catalog`:

| Metric | Result |
|---|---|
| Featured (first) variant **out of stock** | **86 / 160 — 54%** |
| No `categories` / taxonomy | 135 / 160 — 84% |
| No barcode / GTIN on featured variant | **160 / 160 — 100%** |
| Empty description | 30 / 160 — 19% |
| Every returned variant out of stock | 3 / 160 — 2% |

Per-query breakdown:

| Query | n | featured OOS | empty desc |
|---|---|---|---|
| smoky peated scotch under $60 | 20 | 8 | 0 |
| bourbon gift under $50 | 20 | **15** | 1 |
| non-alcoholic whiskey alternative | 20 | 9 | 6 |
| best tequila for margaritas | 20 | 10 | 10 |
| beginner friendly rye whiskey | 20 | **13** | 1 |
| premium japanese whisky | 20 | 10 | 5 |
| rum for cocktails | 20 | 10 | 4 |
| gin for a gin and tonic | 20 | 11 | 3 |

**The point to make:** an agent ranking products takes the featured variant as the offer. On a coin flip it's picking up something unbuyable. That doesn't produce a failed checkout — it produces a *silently down-ranked product*, which never appears in their funnel at all.

### Exhibit B — 267 variants, labelled with bare integers

`get_product` on Ritual Whiskey Alternative (`gid://shopify/Product/8530931056922`):

```
option "Retailer" → 267 values
sample labels: 41, 13, 32, 69, 189, 98, 38, 207, 33, 206, 103, 469
option values carrying an `available` flag: 0 of 267
```

Shopify's own `get_product` documentation shows option values SHOULD carry availability:

```json
{"label": "Blue", "available": true, "exists": true}
```

Flaviar emits `{"label": "41"}` — 267 times, on one bottle. **Zero** carry `available`.

`search_catalog` exposes only **10 of the 267**. The agent is choosing from a 4% sample of an unlabelled option space.

Featured variant returned for Ritual: `"41"`, $30.99, `available: false`.

### Exhibit C — `address_region` is ignored

Same query, five states, byte-identical responses:

| State | Featured variant | Price | Available |
|---|---|---|---|
| CA | `41` | $30.99 | false |
| NY | `41` | $30.99 | false |
| TX | `41` | $30.99 | false |
| FL | `41` | $30.99 | false |
| UT | `41` | $30.99 | false |

UCP defines `context.address_region` precisely so the merchant can localise availability. Flaviar accepts it and discards it. **The retailer network is the entire point of Flaviar's architecture, and it is invisible to the protocol.**

### Exhibit D — no regulatory signal, anywhere

Selecting Retailer `32` and varying the state:

| State | `available` | `messages` |
|---|---|---|
| CA | true | `[]` |
| **UT** | true | `[]` |
| **MS** | true | `[]` |
| **AL** | true | `[]` |
| KY | true | `[]` |

Utah, Mississippi and Alabama are control states. The endpoint reports the bottle as purchasable with an empty `messages` array in every one.

I grepped a full 10-product payload for `restrict`, `compliance`, `verif`, `disclosure` — **zero hits.** (`age`, `21`, `signature` and `ship` do appear, but every occurrence is a false positive: "ageing", "signature Bourbon", "shipping: true" in the config block. Verified individually — don't let this get overstated on the call.)

UCP gives them the exact primitives for this and they're unused:
- error code `REGION_RESTRICTED`
- warning with `presentation: "disclosure"` — which platforms **MUST** display and **MUST NOT** hide or auto-dismiss
- severity `requires_buyer_review` for entitlement/regulatory gates

**This is the single strongest card in the deck.** It is not a marketing problem. It is an alcohol marketplace telling four AI platforms that a bottle is deliverable to a control state, in a machine-readable contract, with no disclosure attached.

### Exhibit E — no Product structured data, catalog-wide

Every PDP checked (Ritual, Buffalo Trace, Kirk & Sweeney) carries JSON-LD for `Organization`, `ContactPoint`, `PostalAddress` — and **no `Product`, no `Offer`, no `availability`, no `brand`**. Sitemap totals **9,586 products**.

### Exhibit F — catalog-wide data quality (random sample, n=200)

| Metric | Result |
|---|---|
| Completely empty description | **83 / 200 — 41.5%** |
| Sole option name = "Retailer" | 200 / 200 — 100% |
| More than 20 variants | 61 / 200 — 30.5% |
| More than 100 variants | 27 / 200 — 13.5% |
| Max variant price > 1.5× min | 117 / 163 — 72% |
| Median price spread across variants | 77% |
| `product_type` values | "Bottle" (181), "bottle" (13) — case-inconsistent, no real taxonomy |

---

## 3. Corrections to make before they catch them

Your credibility on this call depends on getting in front of these. Adi has the report and will check.

| Report said | Reality | Say instead |
|---|---|---|
| "an agent can't buy from you" | UCP checkout is live | "The transport works. The data going through it doesn't." |
| "Policies return zero results" | `/policies/shipping-policy`, `/refund-policy`, `/terms-of-service`, `/privacy-policy` all return 200, and `agents.md` links all four | "Policies are reachable but not *attached to the item* — nothing binds a shipping restriction to a bottle at cart time." |
| "the real buyable price is hidden" | $28.99 (Retailer 32) **is** purchasable — price_range min is achievable | Drop this claim. Replace with: the agent sees 10 of 267 variants, so cheapest-visible ≠ cheapest-available. |
| "~266 variants" | **267** — confirmed exactly | Use 267. Precision earns trust. |
| "0 of which are AI sellable" (subject line) | Several are; 5 of 10 visible were in stock | Own it: "that subject line was sharper than the data. Here's the precise version." |

**Also correct in your favour:** the audit implied this is a Flaviar-wide platform failure. It isn't. Four Walls Whiskey — a Flaviar-powered brand DTC site — does it *right*: option "Size" = `750ml`, featured variant in stock, real Shopify taxonomy IDs. **The Retailer:N sprawl is specific to the marketplace catalog model.** Saying this unprompted proves you did the work and aren't just pattern-matching.

---

## 4. Discovery — what we genuinely don't know (12 min)

Do not skip this to get to the pitch. These answers determine whether the fix is a week or a quarter.

**Architecture**
1. Is the Retailer-per-variant model a Shopify constraint, a compliance requirement (three-tier / retailer-of-record), or a historical artifact of the Speakeasy and Barcart merges?
2. Where does retailer→state fulfillment logic live today — Shopify metafields, the OMS, or a service behind Flaviar Checkout?
3. At what point in the human checkout does a shopper get resolved to a retailer? Post-address? Could that resolver be called earlier?
4. Was UCP a deliberate enablement or did Shopify switch it on? Who owns the agentic surface internally?

**Constraints**
5. What legally prevents exposing a single recommended variant pre-address? Is retailer identity a required disclosure before purchase?
6. Does the 41.5% empty-description rate reflect a licensing constraint on brand copy, or just backlog?
7. Any contractual reason retailer codes can't be relabelled (`NY · ships 2-day · $33.99`)?

**Priorities**
8. Is agentic commerce on the roadmap this year, and where does it sit against the Advent Calendar and Vault cycles?
9. Are you seeing AI-referred traffic yet — and can you distinguish it in analytics today?
10. **The big one:** does this matter for flaviar.com alone, or for Flaviar Checkout as a product? *(You'll want the answer to this one. See §7.)*

---

## 5. The technical proposal — variant resolution (12 min, CTO leads)

Frame as an **additive resolver layer**, not a catalog migration. Nobody re-architects 9,586 products on a vendor's say-so.

### Layer 1 — Recommended-variant resolution
Reorder the `variants` array so element `[0]` is the variant a buyer in that context can actually receive. Resolution key: `address_region` → in-stock → fulfillment SLA → best price.

Costs nothing structurally: UCP already says the first element is featured, and `context.address_region` is already being transmitted. **They are receiving the signal and dropping it.** This is a sort order, not a schema change.

*Expected effect: the 54% featured-OOS rate goes to near zero.*

### Layer 2 — Semantic variant labels
`"41"` → `"New York · ships in 2 days · $33.99"`. Populate `available` on every option value per Shopify's documented shape. If relabelling is contractually blocked, put it in `metadata` — UCP allows arbitrary business-defined extension there.

### Layer 3 — Compliance as protocol messages
For every catalog and cart response:
- `REGION_RESTRICTED` error where the state can't be served
- `presentation: "disclosure"` warning for age verification and adult signature
- `severity: "requires_buyer_review"` where a human must authorise

This is the one to push hardest. It converts an unbounded regulatory exposure into a spec-compliant response — and it's the layer Flaviar is uniquely positioned to own, because they already have the fulfillment logic. They just aren't emitting it.

### Layer 4 — Attribute enrichment
Fill the 41.5%. Structured ABV, size, flavour, occasion, use-case tags. Real Shopify taxonomy IDs instead of `TaxonomyCategory/na`. GTIN/UPC on variants — currently 100% absent, and it's what gates Shopify **Global Catalog** and cross-merchant discovery. Right now Flaviar can only be found if the agent already knows to look at flaviar.com.

### Layer 5 — Product JSON-LD
Cheapest item on the list. Ships with the theme. Covers the crawler-based surfaces that don't speak UCP.

**Sequencing argument:** Layers 1 and 3 are where the money is and neither requires touching product data. Lead with those. Layer 4 is the long tail and can run continuously.

---

## 6. Anticipated objections

**"UCP is live, we're covered."**
> The transport is live. Here's what it returned this morning. *(Exhibit A.)* Shopify gave you the pipe; what goes through it is still your catalog.

**"That's Shopify's default, not our config."**
> Agreed — and that's the risk. It was switched on and nobody audited the output. It's been shipping this to four AI platforms since it went live.

**"Retailer variants are a compliance requirement, we can't collapse them."**
> Not asking you to collapse them. Asking you to *order* them. Keep all 267 — put the one that can actually be fulfilled first. That's a sort, not a migration. *(This is the most likely objection. Do not concede the model; concede the constraint and reframe.)*

**"We'll build this in-house."**
> You probably should, eventually. The question is whether you have baseline measurement now, and whether it's above the Advent Calendar on the roadmap. We can hand you the harness either way.

**"How is this different from an SEO agency?"**
> An SEO agency optimises pages for crawlers. We test transactional completability against a protocol contract, per state, per product. Different failure mode, different instrument.

**"Prove the revenue impact."**
> Can't, not yet, and neither can anyone else honestly. That's exactly why the first step is free baseline measurement rather than a paid engagement.

**"Where did you get 54%?"**
> Eight queries, 160 products, your public MCP endpoint, public Shopify example agent profile, 19 July. Here's the script — run it yourself. *(Offer this. It's disarming and it's true.)*

---

## 7. The ask — free baseline, then scoped pilot

Per your decision, **don't lead with the paid 50-SKU pilot.** The findings are strong enough to sell the next step on their own.

**Offer:**
1. We run the measurement harness across the full catalog — free. Featured-variant availability, region resolution, compliance signal coverage, attribute completeness, per SKU.
2. They get the raw output regardless of what they do next. No strings.
3. Once we both see real numbers, we scope the pilot on evidence rather than on a slide.

**Why this is the right play here:** you're talking to a CTO who has just been handed a report by a co-founder. His instinct is to verify, not to buy. Give him something to verify. The data is damning enough that the measurement *is* the sales motion.

**What to explicitly ask for at the end:**
- Agreement to run the baseline (needs nothing from them — it's a public endpoint)
- One engineer as a technical point of contact
- 30 minutes in ~2 weeks to walk the results
- The §4 Q10 answer: flaviar.com only, or Flaviar Checkout as a product?

### The bigger prize — hold it back unless the room opens

`business.flaviar.com`: **4 of the largest alcohol sites**, **300+ brands** launched DTC, **35,000+ retail partners**, **500K+ customers/year**, built on Shopify Plus. Flaviar isn't just a store — it's the commerce infrastructure for a regulated category.

Every brand on Flaviar Checkout inherits whatever agentic posture Flaviar builds. If they solve region-aware variant resolution and compliance messaging once, it becomes a **product feature they can sell to 300+ brands** — and a genuine moat, because nobody else in beverage alcohol has both the retailer network and the protocol surface.

**Only raise this if Adi or Aljaz signals platform-level thinking.** Aljaz is the one to watch — as CPO this is his territory, and it reframes the conversation from "vendor fixing our SKUs" to "capability we should own." Leading with it sounds like overreach.

---

## 8. Room notes

**Adi Pal (CTO)** — will verify claims live. Precision is the currency. Every number in §2 is reproducible; say so and offer the script. He will raise UCP within five minutes; get there first.

**Aljaz Vindis (Interim CPO, incl. Design)** — cares about roadmap cost and user-facing impact. For him: 267 unlabelled retailer codes are a *human* UX problem too. The agent-facing fix and the shopper-facing fix are the same fix. That's his budget justification.

**Jugoslav Petkovic** — co-founder, made the intro, now BCC'd. Warm channel, don't burn it. Follow up to him separately with a one-paragraph outcome.

**Tone:** they went live on UCP before most of the category. That's genuinely ahead of the curve — say so and mean it. The gap is between transport and payload, and it is entirely fixable. You are not there to tell a CTO his store is broken; you are there with an instrument he doesn't have.

---

## 9. One-slide summary if time collapses

> Flaviar is live on UCP — ahead of most of the category. But the endpoint currently returns an out-of-stock featured variant on **54%** of products, ignores `address_region` entirely (CA, NY, TX, FL and UT return identical responses), reports bottles as purchasable into control states with an **empty `messages` array**, ships **zero** GTINs, and carries no `Product` JSON-LD across **9,586** SKUs. One bottle exposes **267** variants labelled with bare integers, none carrying an availability flag, of which an agent ever sees ten.
>
> The fix that matters most isn't a catalog migration — it's a resolver that reorders variants by region and stock, plus compliance messages UCP already defines. We'll measure the baseline for free.

---

## Appendix — reproduction

All findings, 19 July 2026. Public endpoint, public example agent profile, no authentication.

```bash
curl -s -X POST https://flaviar.com/api/ucp/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0","method":"tools/call","id":1,
    "params":{"name":"search_catalog","arguments":{
      "meta":{"ucp-agent":{"profile":"https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json"}},
      "catalog":{
        "query":"non-alcoholic whiskey alternative",
        "context":{"address_country":"US","address_region":"CA","currency":"USD",
                   "intent":"gift for a friend who does not drink, under $60"},
        "pagination":{"limit":20}
      }}}}'
```

Swap `address_region` across `CA / NY / TX / FL / UT` — responses are byte-identical.
For the 267-value option set, call `get_product` with `catalog.id = "gid://shopify/Product/8530931056922"`.

**Caveats to keep in mind:**
- Sampling ran from a single non-US IP with no authenticated session; Flaviar may localise on signals not exercised here. Frame findings as "what this configuration returns," not "what every agent always sees."
- `products.json` caps variants at 250 — the 267 figure comes from the UCP `get_product` option set, which is authoritative.
- The catalog-wide stats are a random sample of 200 of 9,586 products, seeded and reproducible.

**References:** [UCP Catalog spec](https://ucp.dev/2026-04-08/specification/catalog/) · [Shopify Storefront Catalog MCP](https://shopify.dev/docs/agents/catalog/storefront-catalog) · [Shopify: Agentic-Ready Product Data](https://www.shopify.com/enterprise/blog/agentic-ready-product-data) · [flaviar.com/agents.md](https://flaviar.com/agents.md) · [Flaviar for Business](https://business.flaviar.com/)
