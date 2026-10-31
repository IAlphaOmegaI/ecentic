# écentic: the storefront for agents

Night Hack at Founders, Inc., 30 October 2026.

## Team

- Team: {team names}
- Captain: {captain name and contact}

## Public demo

Open {url}, paste any store's website.

No login. The stage screen is `{url}/agents/stage/{run id}` (linked from every run) and the room board is `{url}/agents/board`.

## 30-second test plan for judges

1. Open {url} on your phone, paste a store you know (for example `allbirds.com`, or your own), and press the button.
2. Watch the counters: products read, issues found, fixes applied. Most stores finish in under a minute.
3. Open any product. Check its price and availability against the store's own page, then read the fixes: each is labelled and shown before and after.
4. Download the ChatGPT CSV and the Google feed.
5. Open `{url}/agents/board` to see every store prepared tonight.

## What it does

A merchant pastes any store URL. écentic reads up to 40 products, lists what AI shopping channels can't use, fixes what it can from the store's own pages, and lists what only the merchant can fix. Price, currency, availability, GTIN, MPN and stock only ever come from the store. Anything we infer is labelled.

- **Google (AI Mode and Gemini):** a Merchant Center feed validated against Google's rules. For our demo store, fixes go live through the Merchant API as supplemental overrides, with each API response shown. Other stores get the feed and a "Connect your Merchant Center" button.
- **ChatGPT:** a feed in OpenAI's product file schema, validated and downloadable, described as "ready for ChatGPT". We don't claim it is in ChatGPT: organic ChatGPT shopping only takes feeds from approved partners, and we aren't one yet.

## Built tonight

- A store reader for Shopify, WooCommerce and any other site, preferring Product/Offer JSON-LD, with Firecrawl for stores that block plain requests.
- A Google validator and feed writer, and an OpenAI product feed validator and CSV writer, including every rule in OpenAI's spec we could check offline.
- Mechanical fixes and AI rewrites that are rejected if they add a number, a price, a link or a stock claim.
- A policy check that reads OpenAI's prohibited-products policy from its own page at run time and flags matching items, rather than a hard-coded list.
- The Merchant API push for the demo store (supplemental `productInputs` overrides, then `products.get` to show the merge), guarded so it only runs for a linked account whose website is claimed.
- The public page, a results view, the stage screen with its timer, and the room board with a QR code.

Not built: the OpenAI Ads live upload and the Agent checkout stage row. Both were cut under the brief's cut order.

```text
{diff stat}
```

Generated with `git diff nighthack-start..HEAD --stat`. `nighthack-start` is the last commit before 4:15pm PT.

## Existed before kickoff

- The écentic platform: Next.js app, auth, database, Redis, rate limiting, SSRF-guarded HTTP.
- The Merchant Center integration and OAuth (`server/utils/google-merchant.ts`, `server/app/integration/google-merchant.ts`, `server/app/google-merchant-account.ts`). Tonight added `getProduct` to it.
- The Shopify and WooCommerce importers and store probes (`server/app/integration/shopify`, `server/app/integration/woocommerce`).
- The store-URL entry flow behind the Connect button (`server/app/entry.ts`).
- GTIN validation (`server/app/intelligence/listing-rules.ts`), the override lint (`server/utils/google-merchant.ts`), and the rewrite prompt in `server/app/optimization.ts`, which tonight's rewrite step adapts.
- The Google feed field mapping (`server/app/feed-export.ts`), used as a reference.
- The AI model wrapper (`server/utils/ai.ts`), the UI component library, and the demo store.

## Tools

Claude, Firecrawl, Google Merchant API, OpenAI product feed spec, Vercel, and the existing écentic stack.
