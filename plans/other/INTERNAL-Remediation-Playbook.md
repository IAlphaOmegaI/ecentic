# INTERNAL — How écentic Actually Fixes This

**Not for Flaviar. This is our build spec.**

Core insight everything rests on: **UCP output is derived from ordinary Shopify product data.** We never touch the protocol. We change what Shopify serialises into it. Verified — UCP's returned variant order is byte-identical to Shopify `position` order across Ritual, Kirk & Sweeney and Buffalo Trace.

---

## Tier 1 — Verified writable, standard Admin API

Public Shopify app, `write_products` scope. No partnership tier, no UCP access, no Shopify approval beyond normal app review.

### 1. Variant resolution — the product

**Problem:** `variants[0]` is the featured offer. 54% of the time it's unbuyable, and its price is what the agent quotes.

**Mechanism:** `productVariantsBulkReorder` — set `position` per variant.

**Resolver, in priority order:**
1. `available == true` (hard filter — never feature a dead variant)
2. ships to buyer region (needs merchant fulfillment data — see Tier 3)
3. fulfillment SLA ascending
4. price ascending

**Why it's a subscription, not a project:** stock moves hourly. Correct ordering is a maintained state, not a shipped artifact. Re-resolve on `inventory_levels/update` webhook. This is the honest recurring-revenue argument — don't dress it up beyond that.

**Effort:** the resolver is trivial. The scale is the work — 9,586 products × up to 315 variants. Batch, respect Admin API cost limits, checkpoint.

### 2. Rogue price detection

**Problem:** 13% of products have `price_range.min` under half their own median; 10 of 11 caused by exactly one variant. Macallan 12 quotes $5.99 against a real floor of $88.99.

**Mechanism:** flag variants where `price < median(variants) * 0.5`. Report, don't auto-fix — repricing someone's catalog unsupervised is not a thing we do. Surface as a work queue.

**Note:** this is the highest ratio of impact to effort in the entire engagement. It's a `SELECT` with a median. Lead the pilot with it.

### 3. Attribute enrichment

| Gap | Mechanism |
|---|---|
| 41.5% empty descriptions | `productUpdate.descriptionHtml` |
| 84% no taxonomy | `productUpdate.category` — Shopify standard taxonomy |
| 100% no GTIN | `productVariantsBulkUpdate.barcode` — **gates Global Catalog, do this first** |
| `product_type` "Bottle"/"bottle" | normalise |
| ops tags leaking (`discount_10`, `bulk_product`, `product_black`) | `productUpdate.tags` |
| size in title only (20%) | structured attribute + metafield |
| 10 split products (Buffalo Trace / 1L) | Shopify **Combined Listings App** |

### 4. Product JSON-LD

Zero `Product` schema across 9,586 PDPs — only `Organization`. Theme app extension. Cheapest item on the list. Covers crawler-based surfaces that don't speak UCP.

---

## Tier 2 — Needs verification before we promise it

**Do not commit to these on a call.** Say "we'd need to check." Being seen to decline to overclaim once buys credibility for everything else.

| Question | Why it matters | How to test |
|---|---|---|
| Does UCP `product.metadata` surface Shopify metafields? | It's our delivery vehicle for ABV/size/region/retailer-geo. If it doesn't map, the enrichment story needs a different home. | Set a metafield on a dev store, query its `/api/ucp/mcp`, diff. |
| Does `product.rating` surface from a review app? | 0/320 today despite thousands of on-site reviews. Might be app-dependent, might be a Shopify-native ratings metafield. | Same dev store. Install a review app, check propagation. |
| Is `variant.seller` merchant-controllable? | Shopify's Global Catalog example populates it with policy links; Storefront may generate it. If Shopify-generated, we can only report the gap. | Compare a control store's Storefront vs Global output. |
| What actually gates Global Catalog inclusion? | The whole Demo 1 thesis. GTIN/UPID is a hypothesis, not a proven cause. | Dev store, publish with and without barcodes, observe. |

**Run these on our own dev store this week.** They're cheap and they de-risk every future pitch, not just Flaviar.

---

## Tier 3 — Not ours

**UCP `messages`** — `REGION_RESTRICTED`, age disclosures, `requires_buyer_review`. Shopify owns the response envelope. We specify, they implement. We also don't want regulated-shipping logic on our liability.

**Retailer→region resolution** — needs their fulfillment data. We build the resolver, they supply the mapping. Natural joint-engineering wedge and a good reason for a second meeting.

---

## Productisation

**What's generic across every Shopify merchant:**

Featured-variant availability · rogue-price detection · Global Catalog coverage · field completeness (`rating`/`seller`/`metadata`/`barcodes`/`categories`) · region-sensitivity probe · JSON-LD presence

None of that is alcohol-specific. It's a scanner that runs against any `/.well-known/ucp`, unauthenticated, from outside. **We can audit any Shopify merchant on earth without asking permission.** That's the top of the funnel — run it across a category, lead with the findings.

**What's Flaviar-shaped:** the retailer-variant marketplace model. Worth noting Four Walls — a Flaviar-powered brand DTC site — does variants correctly (`Size` = `750ml`, featured in stock, real taxonomy). So this is the marketplace catalog architecture, not Flaviar Checkout as a platform. Don't over-generalise it.

**The platform prize:** Flaviar Checkout powers 4 of the largest alcohol sites, 300+ brands, 35,000+ retailers, 500K+ customers/year. If region-aware variant resolution and compliance messaging get solved once, it's a feature they sell to 300 brands. Only raise it if they signal platform-level thinking — leading with it reads as overreach.

---

## Sequencing

1. **Free baseline** — no access needed, public endpoint. Already built.
2. **Dev store, 50 SKUs** — they clone, we reorder + enrich, re-measure. Zero production risk. This is the ask that gets a yes in a 20-minute meeting.
3. **Production, bounded SKU set** — `write_products`, monitored.
4. **Continuous resolver** — webhook-driven, the recurring line.

Never ask for step 3 at step 1. No CTO grants write access to a live 9,586-SKU alcohol catalog on a first call.

---

## Open risks

- **Rate limiting.** Per-IP, documented in their `agents.md`. Hit it during research today. Any production scanner needs backoff, and any live demo needs a dry run hours ahead.
- **`search_catalog` returns max 10 variants.** All availability findings describe the agent's visible decision set — which is the thing that matters — but they are not claims about all 267. Keep saying so.
- **We don't know why Flaviar is absent from Global Catalog.** GTIN/UPID is a strong hypothesis. It could equally be enrolment or an alcohol-category restriction. If it turns out to be category restriction, the fix isn't ours and the Demo 1 pitch needs rebuilding — find out early.
- **Sampling ran from one non-US IP, unauthenticated.** Flaviar may localise on signals we didn't exercise. Frame as "what this configuration returns," never "what every agent always sees."
