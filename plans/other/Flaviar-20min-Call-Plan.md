# Flaviar — 20 Minute Call Plan

**Mon 20 July 2026 · Adi Pal (CTO) + Aljaz Vindis (CPO) · 20 min**

Three demos, one ask. Nothing else. At 20 minutes you get roughly 4 minutes per beat — anything you don't cut, the clock cuts for you.

| Min | Beat |
|---|---|
| 0–2 | Frame + the UCP correction |
| 2–7 | **Demo 1** — Flaviar is absent from Shopify's Global Catalog |
| 7–12 | **Demo 2** — the price an agent quotes isn't real |
| 12–15 | **Demo 3** — protocol fields left empty |
| 15–19 | The ask |
| 19–20 | Next step, hard stop |

---

## 0–2 · Frame

> "Since we sent the audit you've gone live on UCP — which is ahead of most of your category. So the 'agents can't buy from you' line in that report is out of date, and I want to correct it myself before we go further. The transport works. What's going through it is the problem. Three things, five minutes each."

Correcting your own report in the first 30 seconds is the single highest-leverage thing you do on this call. It converts you from vendor to engineer.

---

## 2–7 · DEMO 1 — You are not in the Global Catalog

**This is the demo. If you only get one, get this one.**

Shopify runs two catalogs:

- **Storefront Catalog** — `flaviar.com/api/ucp/mcp`. Works. Requires the agent to already know it wants Flaviar.
- **Global Catalog** — `catalog.shopify.com/api/ucp/mcp`. The cross-merchant discovery layer. This is what answers "find me a non-alcoholic whiskey" across every Shopify merchant.

**Flaviar is in the first and absent from the second.**

Verified 19 July 2026:

```
lookup_catalog on catalog.shopify.com
  gid://shopify/ProductVariant/46836949025050   (Ritual, retailer 41)   -> not_found
  gid://shopify/ProductVariant/46753612726554   (Buffalo Trace, ret 41) -> not_found
  https://flaviar.com/products/ritual-whiskey-...-750                   -> not_found
```

Then search the Global Catalog for **"Ritual Whiskey Alternative Non-Alcoholic Whiskey"** — Flaviar's exact product title:

```
  Ritual Zero Proof Non-Alcoholic Whiskey      <- another merchant
  Ritual Non-Alcoholic Whiskey Alternative     <- another merchant
  Ritual Whiskey Alternative                   <- another merchant
  (Flaviar: absent)
```

**Other merchants selling the identical bottle are in the index. Flaviar isn't.**

Same for "bourbon whiskey under $30" and "single malt scotch" — 0 of 10 results are Flaviar, while Speyburn at $39.99, Glenmorangie at $84.99 and Macallan at $199.99 from other merchants all appear.

### The line to deliver

> "You have 9,586 products and a 35,000-retailer fulfillment network. When a shopper asks any AI assistant for a non-alcoholic whiskey, the merchants that show up are selling your exact bottle — and you're not one of them. You're only findable if the shopper already said the word Flaviar."

### Be honest about the cause

You have **not** proven why they're absent. Say so, then give the hypothesis:

> "I can't tell you from outside whether that's an enrolment setting, an alcohol-category restriction, or a data gate. But here's what makes me think it's at least partly data: Global Catalog clusters products by Universal Product ID, and UPID needs a GTIN. I checked 320 of your products — **zero have a barcode**. No GTIN, no UPID, no cluster."

Then hand it to him: *"You can see the enrolment state in your admin in about ten seconds. Which is it?"*

That question is the best thing you can do in this meeting. Either answer helps you.

---

## 7–12 · DEMO 2 — The price an agent quotes isn't a real price

**Hook first, mechanism second.**

Run `bourbon under $30` against the Storefront Catalog. Open the 7th result. It's over $30.

Then: *"That looks like a search relevance bug. It isn't. Here's the actual cause."*

Pull up **The Macallan 12 Year Old Sherry Oak**:

```
price_range shown to agents:  $5.99 – $343.99
cheapest variant the API returns:  $88.99
```

> "An agent comparing you on price quotes five dollars ninety-nine for a Macallan 12."

**Pre-empt the objection before he raises it** — he will say "that's a 50ml sample":

> "It isn't a sample. Every one of the 250 variants weighs 1814 grams in your products.json — identical to the full 750ml bottle. Retailer 128 is a full bottle priced at $5.99. It's one bad row."

**And that one row sets `price_range.min` for the whole product.**

Catalog-wide: **13% of products have a minimum price under half their own median**, and **10 of 11 are caused by exactly one rogue variant.** Sagamore Spirit — one bad row out of 178. Blanton's — one of 127.

### Why this lands with a CPO in the room

It cuts both ways and Aljaz will feel both:

- Quote too low → buyer sees $5.99, checkout says $88.99. Abandonment, and a price-accuracy problem in a regulated category.
- Quote too high → you lose an agent's price comparison on a price that doesn't exist. No failed checkout, no error, nothing in analytics.

Across 129 products with an unbuyable featured variant, **the quote was wrong 86% of the time** — 44% too high, 43% too low. Median error $6, max $739.

---

## 12–15 · DEMO 3 — Fields the protocol gives you, empty

Fast. Read the numbers, don't editorialise. 320-product sample:

| Field | Populated | Consequence |
|---|---|---|
| `product.rating` | **0** | flaviar.com shows 3,553 reviews on Buffalo Trace. Agents see none. Global Catalog supports `filters.rating` — a shopper asking for "4.5 stars and up" excludes you by construction. |
| `variant.seller` | **0** | The object carrying refund/shipping policy links. Nothing binds policy to a bottle. |
| `product.metadata` | **0** | Where ABV, volume, region — and retailer geography — belong. |
| `variant.barcodes` | **0** | The GTIN that gates Global Catalog. Ties straight back to Demo 1. |
| `media.alt_text` | **319 / 319** | Populated. **Say this out loud.** |

That last row is why the other four land as oversight rather than an accusation.

### The region question — say it exactly this way

> "One more. We sent your endpoint the same query with `address_region` set to California, New York, Texas, Florida and Utah. Byte-identical responses — same featured variant, same order, same price, empty `messages` array on all five.
>
> I'm assuming the retailer assignment *is* your compliance mechanism — an in-state licensed retailer fulfils to an in-state buyer, and that's how this works at all. Which means the single most important field in your architecture is the one an agent can't see. You hold the retailer-to-state mapping and we don't. Is there a reason region doesn't reach variant ordering?"

**Never assert a retailer code's location.** You don't know it.

---

## ⚠️ DO NOT USE CALIFORNIA AS THE COMPLIANCE EXAMPLE

You floated "I'm in California and can't order this — why is UCP returning it?" **That example is backwards and it would end the meeting.**

California **legalised** DTC spirits shipping on 1 January 2026 under **AB 1246**, signed by Newsom in October 2025. It's a one-year pilot expiring 1 January 2027. It is the single most-discussed piece of DTC spirits legislation in the industry right now — Adi and Aljaz will know it cold, because it directly governs their business. Naming California as restrictive tells them you don't know the category.

**Use Utah, Mississippi or Alabama instead** — control/prohibition states. All three return `available: true` with `messages: []`, verified.

**And do not accuse them of shipping illegally.** You don't know their licensing, and the retailer-assignment model is very likely how they stay compliant. The defensible claim is narrower and better:

> "I'm not suggesting you're shipping somewhere you shouldn't — I assume the retailer assignment handles that at checkout. The point is that an *agent* has no way to reason about it. It can't tell a buyer whether the order is fulfillable before handing off, so it either guesses or drops you."

That version is unarguable, doesn't require you to know alcohol law, and still lands the finding.

---

## 15–19 · The ask

> "We'll run the full measurement across your catalog for free — featured-variant availability, price integrity, Global Catalog coverage, field completeness, per SKU. You get the output either way, no strings. Then we scope from real numbers instead of a slide."

**Then the one that gets a yes:**

> "If you want to see the fix rather than the diagnosis: clone 50 SKUs into a dev store. We reorder variants and fill the fields there, re-measure both, and you see the delta. No production access, no procurement, nothing to sign."

A CTO can approve a dev store inside the meeting. He cannot approve `write_products` on a live 9,586-SKU alcohol catalog, and asking for it makes you look naive.

**Leave with:** the Global Catalog enrolment answer, one named engineer, and 30 minutes in two weeks.

---

## Phase 2 — what we'd want to fix next (only if they ask "what else")

Do not open this. It's for the moment someone says *"and after that?"* — or for the leave-behind.

**Provenance and condition — the layer their category needs and the protocol already supports.**

Flaviar sells a Stitzel-Weller 31 Year at $7,776.99, a Macallan 62 in Lalique, Buffalo Trace Single Oak Project barrels, Willett single barrels, and runs the Vault and fractional cask ownership through Cask Co-Op. Allocated bourbon — Blanton's, Weller, E.H. Taylor — has one of the most counterfeited secondary markets in consumer goods.

**UCP already has the hook.** Global Catalog defines `variant.condition` with known values `new` and `secondhand`, and `catalog.filters.condition` lets an agent filter on it. Flaviar populates none of it.

What the mature version looks like, and who already does it:

| Signal | Precedent |
|---|---|
| Authentication / verification status | StockX, eBay Authenticity Guarantee, Chrono24 |
| Chain-of-custody and provenance record | Liv-ex and Berry Bros for fine wine; Wine-Searcher — which Flaviar owned until 2026 |
| Storage conditions (temperature, humidity, upright/on-side, light) | fine-wine bonded warehousing; Whisky Auctioneer condition grading |
| Condition notes (fill level, label, seal, capsule, box/OB present) | standard in whisky auction listings |
| Bottling date, batch, cask number | already in many of their titles as free text — never structured |

**The argument for Flaviar specifically:** at $7,776 a bottle, an agent will not transact without provenance, and a human increasingly won't either. The brands that win the high-value end of agentic commerce will be the ones whose authenticity claims are machine-readable. Flaviar has the rarest inventory and the weakest structured provenance — and they owned the definitive provenance database in the category until this year.

Frame it as *"the layer above the fix,"* not as more problems. It's the reason to keep working together after the pilot.

---

## Cheat sheet

**Do not say**
- "Agents can't buy from you" — false, he'll know
- **"In California I can't order this"** — California legalised DTC spirits in Jan 2026 (AB 1246). Use Utah, Mississippi or Alabama.
- "You're shipping illegally" — you don't know their licensing. Say agents can't *reason* about fulfillability.
- "Retailer 41 is in New York" — you have no mapping
- "Your policies return zero results" — all four return 200
- "0 of 266 variants are AI-sellable" — several are; use 267 and be precise
- "You're not in Google" — you tested Shopify's Global Catalog, not Google's index. Say what you tested.

**Do say**
- "The transport works, the payload doesn't"
- "One bad row sets the price for the whole product"
- "Your alt text is complete — you're not careless everywhere"
- "I can't tell from outside; you can see it in your admin"

**If asked "how do you know?"** — public endpoint, public Shopify example agent profile, no auth, here's the script, run it yourself.

**If the endpoint throttles mid-demo** — it's rate-limited per IP and documented in their own `agents.md`. Read the number off the exhibit and move on. Do not debug live.

**Dry run `flaviar-demo.py` two hours before the call, not five minutes before.**
