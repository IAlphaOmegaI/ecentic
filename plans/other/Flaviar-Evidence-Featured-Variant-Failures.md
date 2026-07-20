# Exhibit — Featured-Variant Failures on flaviar.com

**Source:** `https://flaviar.com/api/ucp/mcp` → `search_catalog`  
**Date:** 19 July 2026 · **Agent profile:** public Shopify example · **Context:** `address_country=US`, `address_region=CA`, `currency=USD`  
**Method:** 16 buyer-intent queries × 20 results. A row appears when `variants[0]` — the element UCP designates as *featured* — returns `availability.available: false`.

> UCP Catalog spec: *"Businesses SHOULD return the most relevant variant and image first... Platforms SHOULD treat the first element as featured."*

---

## Summary

**172 of 320 products returned an out-of-stock featured variant — 54%.**

| Query | Results | Featured OOS | Rate |
|---|---|---|---|
| wedding gift bottle under $100 | 20 | 17 | **85%** |
| bourbon gift under $50 | 20 | 15 | **75%** |
| beginner friendly rye whiskey | 20 | 13 | **65%** |
| gin for a gin and tonic | 20 | 12 | **60%** |
| irish whiskey under $40 | 20 | 12 | **60%** |
| high proof barrel strength bourbon | 20 | 11 | **55%** |
| best tequila for margaritas | 20 | 10 | **50%** |
| premium japanese whisky | 20 | 10 | **50%** |
| rum for cocktails | 20 | 10 | **50%** |
| cheap vodka for a party | 20 | 10 | **50%** |
| mezcal smoky agave spirit | 20 | 10 | **50%** |
| non-alcoholic whiskey alternative | 20 | 9 | **45%** |
| whiskey gift set for dad | 20 | 9 | **45%** |
| smoky peated scotch under $60 | 20 | 8 | **40%** |
| single malt scotch for a collector | 20 | 8 | **40%** |
| cognac for a special occasion | 20 | 8 | **40%** |
| **TOTAL** | **320** | **172** | **54%** |

### Gift-intent queries fail worst

- Gift-intent queries: **41/60 = 68%**
- All other queries: 131/260 = 50%

Gifting is Flaviar's highest-intent, highest-margin motion — Advent Calendar, Tasting Boxes, the entire Gifts nav tree. It is the segment where agent-facing data quality is worst.

---

## The six that hurt most — rank-1 result, out-of-stock featured variant

These are the products an agent presents *first* when asked the question.

| Query | Rank-1 product | Featured variant | Price shown | Actually buyable at |
|---|---|---|---|---|
| bourbon gift under $50 | Knob Creek Small Batch Limited Edition 21 Year O | `213` | $286.99 | $286.99 |
| beginner friendly rye whiskey | New Riff 6 Year Old Malted Rye | `134` | $84.99 | $69.99 |
| premium japanese whisky | Yamazaki 12 Year Old Single Malt Whisky | `154` | $176.99 | $177.99 |
| non-alcoholic whiskey alternative | Ritual Whiskey Alternative Non-Alcoholic Whiskey | `41` | $30.99 | $28.99 |
| high proof barrel strength bourbon | Bulleit Barrel Strength Bourbon Whiskey | `69` | $60.99 | $63.99 |
| wedding gift bottle under $100 | Uncle Nearest 1884 Premium Small Batch Whiskey | `87` | $54.99 | $44.99 |

Note the first row: **"bourbon gift under $50" returns a $286.99 bottle at rank 1** — out of stock *and* 5.7× over the stated budget.

---

## Total failures — nothing buyable visible at all

Featured variant out of stock **and** no in-stock variant anywhere in the 10 the agent can see.

| Query | Rank | Product |
|---|---|---|
| rum for cocktails | 3 | Zaya Alta Fuerza Rum |
| gin for a gin and tonic | 10 | Whitley Neill Original Handcrafted Dry Gin |
| gin for a gin and tonic | 19 | Brockmans Intensely Smooth Gin |
| cheap vodka for a party | 16 | elit Night Edition Vodka |
| irish whiskey under $40 | 3 | The Irishman The Harvest |
| high proof barrel strength bourbon | 19 | Barrell Armida Cask Strength Bourbon Whiskey |
| wedding gift bottle under $100 | 10 | Knappogue Castle 12 Year Old |

---

## Price-constraint violations

Results whose *minimum* price across all variants exceeds the budget stated in the query.

| Query | Cap | Violations | Worst offender |
|---|---|---|---|
| bourbon gift under $50 | $50 | 8/20 | Blanton's Gold Edition — **$188.99** (3.8×) |
| smoky peated scotch under $60 | $60 | 12/20 | Bruichladdich Octomore 15.3 — **$284.99** (4.7×) |
| irish whiskey under $40 | $40 | 7/20 | Midleton Very Rare — **$231.99** (5.8×) |
| wedding gift bottle under $100 | $100 | 8/20 | The Macallan 18 Year Old 1982 — **$4,332.99** (43.3×) |

---

## Category contradiction

Query: `non-alcoholic whiskey alternative`, intent `sober friend, under $60`.

**16 of 20 results are not tagged non-alcoholic.** Returned products include:

| Product | Price range |
|---|---|
| Peerless Kentucky Straight Rye Whiskey | $37.99–$177.99 |
| Peerless Single Barrel #B91118111 Straight Bourbon | $94.99 |
| Kentucky Owl 'Takumi Edition' Straight Bourbon | $49.99–$361.99 |
| Woodford Reserve Distiller's Select Bourbon | $66.99–$125.99 |
| Rich & Rare Blended Canadian Whisky (1.75L) | $17.99–$52.99 |

This is the one query where a wrong answer carries real consequence, and it is the query the catalog answers worst.

---

## Minor: zero-priced variants

Across 500 products scanned, **2** exposed a `$0.00` variant (Frey Ranch Straight Bourbon variant `314`; 15 Stars First West). Both unavailable — but the $0.00 propagates into `price_range.min`, so the product sorts first on any price-ascending agent filter and displays as "from $0.00". Low frequency, trivial fix, worth mentioning only if the conversation goes to data hygiene.

---

## Full row-level data

All **172** failing rows — query, rank, product, featured variant, price shown, variants visible, in-stock count, cheapest buyable, empty-description and taxonomy flags — are in `flaviar-featured-variant-failures.csv` alongside this file.

Reproduce with the curl in the agenda appendix; swap the `query` field.
