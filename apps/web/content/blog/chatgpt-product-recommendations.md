---
title: How to get your products recommended by ChatGPT
description: How ChatGPT picks products when shoppers ask what to buy, and the feed, page, copy and review fixes that get yours picked on Shopify or WooCommerce.
date: 2026-08-17
keyword: chatgpt product recommendations
tags: [chatgpt product recommendations, chatgpt shopping, product data]
---

To get your products recommended by ChatGPT, give it complete, current data for every product: through Shopify Catalog if you sell on Shopify, or a product feed sent to OpenAI if you don't, plus product pages its search crawler is allowed to read. When a shopper asks what to buy, ChatGPT picks the products that fit the request using price, reviews, descriptions and availability, so a product with a missing or wrong field loses to one that has it [1] [2]. The shopper then buys on your own store's checkout.

OpenAI launched Instant Checkout in September 2025 [3], and in March 2026 said its first version "did not offer the level of flexibility that we aspire to provide" and let merchants keep their own checkout [1]. I think that made the job simpler. ChatGPT is now a very well-read shop assistant that walks people to your door, and your work is making sure it picks your product on the way.

## How does ChatGPT choose which products to recommend?

OpenAI's help center says a product shows up when ChatGPT judges it relevant to what the shopper asked, read with context like Memory and custom instructions [2]. It decides from structured product data supplied by merchants and third-party providers, such as price and description, plus other third-party content and reviews from public websites. When the shopper names a $30 budget, price counts for more.

For a given product, ChatGPT can list the merchants selling it, ranked by availability, price, quality and whether the merchant is the maker or main seller [2].

I read that as ChatGPT matching the shopper's words against your fields. Someone asking for waterproof trail shoes under $120 gets products whose data says waterproof and whose price says under $120. If your listing only mentions "all-weather" in its fourth paragraph, I'd expect the shoe to miss the cut, however good it is.

Buying inside the answer is live on Google AI Mode and Gemini in the US through UCP, Google's standard for agent checkout, for the merchants Google has let in so far [4]. In ChatGPT, the shopper clicks through to your store.

## Product level versus brand level

Most advice on this question is about the brand: get mentioned, get cited, track how often ChatGPT names you. That helps when someone asks for good running shoe brands. It does little when they ask for a specific shoe, because then ChatGPT compares products from product data.

So I'd treat each product as its own contest. Your brand can be named in the answer while your trail shoe loses to a rival's because its feed never says waterproof. A brand-level report won't show that. A product-level check names your product, the product that beat it and the field that decided it.

The research isn't comforting. ACES, a study that audited how AI shopping agents choose, found they pile demand onto a few products, that a model update can reshuffle market shares sharply, and that models weigh price, ratings and reviews very differently [5]. It also found that simple description changes aimed at the shopper's query won sellers significant share. So check product by product, and again after big model updates.

## Get your catalog into ChatGPT

### On Shopify

You may already be in. OpenAI says Shopify product data reaches ChatGPT through Shopify Catalog with no extra work from merchants [1], and Shopify turns its ChatGPT channel on by default for eligible stores [6]. Under Sales channels, then Agentic, your admin shows how many products are in Shopify Catalog, or an Ineligible warning with the reason [7]. Common reasons: a plan below Starter, a password page, or products with no image, a price of 0 or Unlisted status [8].

If your product data lives in metafields, Shopify Catalog Mapping tells Shopify where to read it [7]. Legal disclosures belong in the first 6,000 characters of the description, and selling through ChatGPT costs nothing beyond normal payment processing [6].

### On WooCommerce or a custom store

There's no Shopify Catalog here, so you send the data yourself. The documented route is applying for direct feed access at chatgpt.com/merchants and building a feed to OpenAI's Product Feed spec [2] [9], or going through a provider such as Salesforce or Stripe [1]. I couldn't find an official plugin. Third-party WordPress plugins generate the feed, so test one on a few products first.

Without a feed, ChatGPT can still find products through third-party data and the open web [2] [7], so the page work below matters more for you.

## What a good product feed contains

OpenAI's spec asks for nine fields on every row: item_id, title, description, url, brand, seller_name, image_url, availability and price [9]. You send one row per variant, with a shared group_id, so ChatGPT knows the black size 10 and the black size 11 are the same shoe. Titles should stay under about 150 characters and descriptions under 5,000, in plain text.

The mistakes I'd check first, all from the same spec:

- Availability left blank, which rejects the row, or set to unknown, which doesn't tell ChatGPT the item is in stock.
- An item_id reused for a different product.
- A GTIN (the barcode number) with a bad check digit, or an invented part number standing in for one.
- A price that isn't updated when a sale starts or ends.

Then add the optional attributes shoppers ask about: material, color, size, dimensions, weight. A feed that says "leather and rubber" can answer a question about materials. A feed without it can only hope.

## Let the crawler in and mark up the page

OAI-SearchBot is the crawler that puts sites into ChatGPT's search answers, and sites that block it in robots.txt aren't shown there [10]. Allow it, and make sure your CDN or firewall doesn't block the IP ranges OpenAI publishes for it.

OpenAI doesn't say which structured data fields ChatGPT reads. I'd still add Product and Offer JSON-LD, the block of product facts search engines read, to every product page, with price, availability, brand, gtin, aggregateRating, shipping and returns. Google's shopping results use it [11], and it puts the facts in HTML any crawler gets. Recheck a few pages with Google's Rich Results Test after theme or app changes, because markup breaks quietly. Our guide on [how to rank your products in ChatGPT Shopping](/blog/rank-in-chatgpt) walks through those checks.

## Write copy for the question a shopper asks

ChatGPT may rewrite your title into something simpler [2], so marketing flourish rarely survives the trip. Facts do. "12-ounce ceramic travel mug, leak-proof lid" answers a shopper who asked for a leak-proof mug. "Our best-selling mug" answers nobody.

On each top product:

1. Open the description with what it is, who it's for and the key spec.
2. Add a short on-page FAQ for what buyers ask: fit, compatibility, care, delivery, returns.
3. Give every variant its own image. The feed asks for an image of that exact variant [9], and ChatGPT lets shoppers browse visually and search with a photo [1].

## Reviews: ChatGPT reads what other people say

ChatGPT shows review summaries built from reviews on public websites, and a label like "Budget-friendly" can come from what reviewers say rather than from the price [2]. OpenAI doesn't verify any of it. So put reviews where ChatGPT can read them: in your product pages' HTML, in aggregateRating, and on marketplaces where you also sell. Reviews that only load in a widget after the page renders may be invisible to a crawler, so check one page's raw HTML.

## How to tell if it's working

- Ask ChatGPT what your buyer would ask, with a use and a budget, for each top product. Note whether yours shows up and what shows instead, and run each prompt a few times, because answers shift.
- In analytics, ChatGPT clicks usually arrive with utm_source=chatgpt.com on the link, in what I've seen, and some land as untagged direct traffic.
- In your server logs, look for OAI-SearchBot and ChatGPT-User, which is ChatGPT fetching a page for someone mid-conversation [10].
- On Shopify, orders from AI channels show in the admin with channel or referrer attribution [12].

## Why isn't my product showing up in ChatGPT?

Check, in this order:

1. On Shopify, an Ineligible warning under Sales channels, then Agentic, or a product that's Unlisted or hidden from search engines [7] [8].
2. OAI-SearchBot blocked by robots.txt or a firewall rule [10].
3. Availability blank or unknown in the feed, or a feed price that differs from the page [9].
4. A category OpenAI's commerce policies don't allow [6].
5. None of the above: it's in and losing. Compare it with the product that won on price, the attributes the shopper named and reviews.

## Tools that help, with honest notes

The free ones (Shopify's Agentic settings, OpenAI's feed spec, Google's Rich Results Test, your server logs) cover most checks above. Paid tools mostly measure, by brand or by product, and a few change the product data.

| Tool | Works at | Changes your store | Lowest paid plan |
|---|---|---|---|
| Peec AI | Brand and each product [13] | No, recommends changes | $95/mo for 50 prompts [14] |
| AthenaHQ | Brand and each product [15] | Writes descriptions; ask if it publishes them | $295/mo, or a free Essential plan [16] |
| Profound | Brand; ChatGPT Shopping on Enterprise [17] | No; no Shopify integration listed | Custom Enterprise [17] |
| Otterly | Brand and the prompts you write [18] | No, recommends changes | $29/mo for 15 prompts [18] |
| Swap Discovery (Vizby) | Product and collection audits, Shopify only [19] | Yes, you approve or let it apply [19] | $79/mo [20] |

My notes, from each vendor's own pages. AthenaHQ covers 11 models on Starter and helps with the writing, which suits a brand with that budget. Peec is the strongest pure measurement tool for a catalog, and shows the price an assistant quotes next to your real one. Profound is the deepest brand monitor, priced for large brands. Otterly is the cheapest way to watch. Swap Discovery is closest to a fix-it app for Shopify-only stores. More in our [guide to GEO tools for product catalogs](/blog/geo-tools-for-ecommerce-product-catalogs) and the wider [guide to AI shopping agent optimization tools](/blog/best-ai-shopping-agent-optimization-tools-2026).

Fair caveat: I run ecentic, which sits with the tools that change the data. We have ChatGPT, Claude and Gemini compare your products with the competitors you name and pick one, show you why a product got skipped, and write the fix, which goes to your Shopify or WooCommerce store when you click Apply on pay-as-you-go, Scale and Dominate. It starts with a free one-time Scan of your top 10 products with no card, then pay-as-you-go at 3% of AI-attributed orders, capped at $500 a month and $0 until an agent drives a sale, or flat plans at $14.90, $44.90 and $149 a month [21].

## Where to start

Start with your best sellers: complete data on a few dozen products does more than half-filled data on a few hundred. Record what ChatGPT picks for them today, fix access, feed, page and copy in that order, and rerun your prompts after each change.

The one pilot result we can publish so far: at DUA Flavours, visits from AI assistants and direct traffic rose 12% between April and July 2026 [22]. That's visits, not sales, and one store. To see which of your products ChatGPT, Claude and Gemini skip and why, [run the free scan](/sign-up).

## FAQ

### Can I pay ChatGPT to recommend my products?

No. OpenAI says product results are picked independently and aren't influenced by its partnerships [2]. ChatGPT does show ads, but apart from product results, so an ad doesn't move your product up the list.

### Does blocking GPTBot keep my products out of ChatGPT?

No. GPTBot collects content for training OpenAI's models, OAI-SearchBot crawls for search, and OpenAI treats the two robots.txt settings as independent [10]. You can block training and still appear in ChatGPT's answers.

### How long do changes take to show up?

OpenAI says a robots.txt change takes about 24 hours [10] and that price and shipping updates can lag [2]. It gives no timeline for new titles or descriptions, so I'd wait a week before judging a rewrite.

### Do the same fixes help on Google AI Mode and Gemini?

Mostly, through a different pipe. On Shopify, products reach Google AI Mode and Gemini through the Google & YouTube channel and Merchant Center, not Shopify Catalog [7], so that feed needs the same complete data. Fix Merchant Center disapprovals first.

## Sources

1. [Powering product discovery in ChatGPT](https://openai.com/index/powering-product-discovery-in-chatgpt/), OpenAI, March 2026.
2. [Shopping in ChatGPT: how product results are selected](https://help.openai.com/en/articles/11128490-improved-shopping-results-from-chatgpt-search), OpenAI Help Center, checked October 2026.
3. [Buy it in ChatGPT: Instant Checkout and the Agentic Commerce Protocol](https://openai.com/index/buy-it-in-chatgpt/), OpenAI, September 2025.
4. [About the Universal Commerce Protocol (UCP) and UCP-powered checkout on Google](https://support.google.com/merchants/answer/16837055), Google Merchant Center Help, checked October 2026.
5. [What Is Your AI Agent Buying? Evaluation, Implications and Emerging Questions for Agentic E-Commerce](https://arxiv.org/abs/2508.02630), Allouah et al., arXiv, December 2025 revision.
6. [Selling on ChatGPT](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/chatgpt), Shopify Help Center, checked October 2026.
7. [Shopify Catalog and product discovery for agentic storefronts](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/products), Shopify Help Center, checked October 2026.
8. [Shopify Catalog requirements](https://help.shopify.com/en/manual/shopify-catalog/requirements), Shopify Help Center, checked October 2026.
9. [Product Feed spec](https://developers.openai.com/commerce/specs/feed), OpenAI developer docs, checked October 2026.
10. [Overview of OpenAI crawlers](https://platform.openai.com/docs/bots), OpenAI, checked October 2026.
11. [Merchant listing (Product, Offer) structured data](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing), Google Search Central, checked October 2026.
12. [Agentic storefronts](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts), Shopify Help Center, checked October 2026.
13. [AI Shopping Analytics](https://peec.ai/blog/ai-shopping-analytics), Peec AI launch post, checked October 2026.
14. [Peec AI pricing](https://peec.ai/pricing), checked October 2026.
15. [AthenaHQ for e-commerce](https://athenahq.ai/industry/ecommerce), checked October 2026.
16. [AthenaHQ plans and pricing](https://athenahq.ai/plans), checked October 2026.
17. [Profound pricing](https://www.tryprofound.com/pricing), checked October 2026.
18. [OtterlyAI pricing](https://otterly.ai/pricing), checked October 2026.
19. [Swap Discovery on the Shopify App Store](https://apps.shopify.com/ai-blog-post-generator-1), listing by Vizby AI Ltd., checked October 2026.
20. [Swap Discovery (Vizby) pricing](https://vizby.ai/pricing), checked October 2026.
21. [ecentic pricing](https://ecentic.ai/pricing), checked October 2026.
22. [ecentic facts for AI assistants](https://ecentic.ai/ai-instructions), DUA Flavours pilot result, published with permission.
