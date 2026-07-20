# Exhibit v2 — Price & Offer Integrity on flaviar.com

**Source:** `https://flaviar.com/api/ucp/mcp` → `search_catalog` / `get_product`
**Date:** 19 July 2026 · public Shopify example agent profile · `address_country=US`, `address_region=CA`, `currency=USD`
**Corpus:** 320 product records across 8 category queries; 240 records across 12 buyer-intent queries; 90 price-constrained results.

> Supersedes the "agent can't complete a purchase" framing. The agent *can* buy. It buys the wrong thing at the wrong price.

---

## Finding 1 — The quoted price is wrong 86% of the time

UCP designates `variants[0]` as featured. That variant's price is what an agent quotes. On the 129 products (of 240) whose featured variant is out of stock:

| Outcome | Count | Share |
|---|---|---|
| Agent quotes **higher** than cheapest buyable | 54 | **44%** |
| Agent quotes **lower** than cheapest buyable | 53 | **43%** |
| Quote matches reality | 17 | 14% |

Median absolute error **$6.00** · mean **$28.08** · max **$739.00**.

| Product | Agent quotes | Buyer actually pays | Delta |
|---|---|---|---|
| Talisker 30 Year Old Single Malt | $1,036.99 | $1,775.99 | **+$739** |
| The Balvenie Second Red Rose 21 Year | $567.99 | $924.99 | +$357 |
| Old Forester President's Choice | $338.99 | $530.99 | +$192 |
| Rémy Martin Lunar New Year XO Cognac | $77.99 | $263.99 | +$186 |
| Hennessy 'Henny White' 25th Anniversary | $101.99 | $161.99 | +$60 |

**Both directions cost money.** Quoted too high → the agent loses a price comparison against a competitor on a price that does not exist, with no failed checkout and nothing in analytics. Quoted too low → the buyer is surprised at checkout.

---

## Finding 2 — Price filters run on unbuyable inventory

**14% (13 of 90) of price-qualifying results qualify *only* on variants that cannot be purchased.** The product enters the consideration set on a price the buyer can never pay.

| Query | Qualifies at | Actually buyable from | Over cap by |
|---|---|---|---|
| gin under $35 → St. George Terroir Gin | $32.99 | $42.99 | +23% |
| irish whiskey under $40 → The Quiet Man Traditional | $32.99 | $43.99 | +10% |
| irish whiskey under $40 → The Dubliner Bourbon Cask | $38.99 | $52.99 | +33% |
| bourbon gift under $50 → Chicken Cock Small Batch | $49.99 | $61.99 | +24% |
| smoky peated scotch under $60 → Ardbeg 10 Year Old | $59.99 | $66.99 | +12% |
| gin under $35 → Farmer's Small Batch Organic | $27.99 | $35.99 | +3% |
| rum under $45 → Papa's Pilar Dark Rum | $42.99 | $47.99 | +7% |
| irish whiskey under $40 → The Irishman The Harvest | $29.99 | **nothing available** | — |
| wedding gift under $100 → Knappogue Castle 12 Year | $48.99 | **nothing available** | — |

This is a filter-integrity failure, not a ranking preference. The result should not have been returned.

---

## Finding 3 — Fields UCP provides that Flaviar leaves empty

Measured across 320 product records:

| UCP field | Populated | What it costs them |
|---|---|---|
| `variant.seller` | **0 / 320** | The per-item seller object carries `links` for refund/shipping policy. This is the sanctioned way to attach policy to a bottle. Nothing attached. |
| `product.rating` | **0 / 320** | flaviar.com displays 3,553 reviews on Buffalo Trace, 2,072 on Michter's, 1,809 on Woodford Double Oaked. Agents see none. Rating is a primary comparison signal. |
| `product.metadata` | **0 / 320** | The sanctioned extension point for ABV, volume, region, retailer geography. Entirely unused. |
| `variant.barcodes` (GTIN) | **0 / 320** | Gates Shopify Global Catalog and cross-merchant discovery. Findable only if the agent already knows to look at flaviar.com. |
| `product.categories` | 16% populated | 84% carry no taxonomy at all. |

**Credit where due:** `media.alt_text` is populated on 319 of 319 media objects. They are not uniformly careless — which makes the gaps look like oversight rather than neglect, and makes the praise credible.

---

## Finding 4 — Structural catalog issues

**Bottle size is not an attribute.** Present in the title string on 20% of products, structured on 0%. The sole option on every product is `Retailer`. An agent answering "is this a full-size bottle?" or comparing value-per-mL must regex the title.

**Split products.** 10 base products exist as two separate records differing only by volume — Buffalo Trace / Buffalo Trace (1L), Blanton's Original / (700mL), Clase Azul Reposado / (200mL), Longbranch / (1L), Bespoken Dark Rum / (375mL). Shopify's own guidance: *"If you're using separate product pages for each variant of a product, an agent will likely assume these are all different products."* Shopify ships the Combined Listings App for exactly this.

**Internal ops tags leaking to AI platforms.** 378 distinct tags, of which `discount_5`, `discount_10`, `discount_15`, `discount_20`, `bulk_product`, `product_black`, `flaviar-us` are internal. The `discount_*` tags in particular risk an agent inferring an active promotion.

**Descriptions are prose, not data.** Of 250 non-empty descriptions, 40% mention ABV or proof somewhere in the narrative and 32% contain tasting-note language — but 0% expose any of it as a structured field. An agent matching "smoky, under $60, 46% ABV" is parsing marketing copy.

---

## Finding 5 — Geography is transmitted and discarded

`context.address_region` set to CA, NY, TX, FL and UT returns **byte-identical responses** — same featured variant, same order, same prices.

Selecting a variant and varying the state across CA / UT / MS / AL / KY returns `available: true` with `messages: []` in every case, including three control states.

**Stated as a question, not a claim:** the retailer codes are opaque integers and we hold no mapping from code to location. Flaviar operates 35,000+ partners as local fulfillment centers, so geography plainly exists in the model. It is not reaching variant ordering. *Why does a California buyer and a New York buyer receive the identical variant sequence?*

---

## Reproduction

```bash
curl -s -X POST https://flaviar.com/api/ucp/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/call","id":1,
   "params":{"name":"search_catalog","arguments":{
     "meta":{"ucp-agent":{"profile":"https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json"}},
     "catalog":{"query":"bourbon gift under $50",
       "context":{"address_country":"US","address_region":"CA","currency":"USD"},
       "pagination":{"limit":20}}}}}'
```

Inspect `products[].variants[0].availability.available` against `products[].price_range.min`.
`flaviar.com` and `flaviar-us.myshopify.com` return identical payloads.

**Caveat:** `search_catalog` returns at most 10 variants per product. All availability findings describe the variants an agent can actually see, which is the decision set that matters — but they are not a claim about all 267.
