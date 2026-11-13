# écentic: the storefront for agents

Night Hack at Founders, Inc., 30 October 2026.

## Team

- Team: {team names}
- Captain: {captain name and contact}

## Public demo

Open https://ecentic.ai/agents, paste any store's website.

No login. Every run links to its stage screen (`https://ecentic.ai/agents/stage/{run id}`). The room board is https://ecentic.ai/agents/board.

Backup link, same code and same data: https://ecentic-git-nighthack-zennit.vercel.app/agents

## 30-second test plan for judges

1. Open https://ecentic.ai/agents on your phone, paste a store you know (for example `allbirds.com`, or your own), and press the button.
2. Watch the counters: products read, issues found, fixes applied. Most stores finish in under a minute.
3. Open any product. Check its price and availability against the store's own page, then read the fixes: each is labelled and shown before and after.
4. Download the ChatGPT CSV and the Google feed.
5. Open https://ecentic.ai/agents/board to see every store prepared tonight.

To see the live Merchant Center push, paste `ecentic.myshopify.com`, our demo store, and open its stage screen. Each line is Google's API answer for that product.

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
- One small new table, `agents_state`, for run state.

Not built: the OpenAI Ads live upload and the Agent checkout stage row. Both were cut under the brief's cut order.

Known limits: up to 40 products per store. `/es/agents` shows English. Some stores block even Firecrawl, and the page says so. Google disapproves most demo store products at the moment because they have no images, and we don't invent images.

```text
 AGENTS.md                                          |    4 +
 SUBMISSION.md                                      |  101 +
 apps/web/.env.example                              |    6 +
 apps/web/package.json                              |    2 +
 .../src/app/(provider)/api/agents/board/route.ts   |   22 +
 .../api/agents/runs/[id]/feed/[channel]/route.ts   |   34 +
 .../api/agents/runs/[id]/prepared/route.ts         |   27 +
 .../app/(provider)/api/agents/runs/[id]/route.ts   |   31 +
 .../src/app/(provider)/api/agents/runs/route.ts    |   36 +
 .../app/[locale]/(main)/agents/_components/live.ts |  164 ++
 .../app/[locale]/(main)/agents/_components/run.tsx |  641 ++++++
 .../(main)/agents/_components/skeletons.tsx        |   26 +
 .../(main)/agents/_components/store-form.tsx       |  132 ++
 apps/web/src/app/[locale]/(main)/agents/page.tsx   |   31 +
 .../app/[locale]/(main)/agents/runs/[id]/page.tsx  |   54 +
 .../src/app/[locale]/(stage)/_components/board.tsx |  142 ++
 .../app/[locale]/(stage)/_components/skeletons.tsx |   29 +
 .../src/app/[locale]/(stage)/_components/stage.tsx |  215 ++
 .../src/app/[locale]/(stage)/agents/board/page.tsx |   15 +
 .../[locale]/(stage)/agents/stage/[id]/page.tsx    |   23 +
 apps/web/src/app/[locale]/(stage)/layout.tsx       |   13 +
 apps/web/src/components/cookie-consent.tsx         |    3 +
 apps/web/src/server/app/storefront/catalog.ts      |  208 ++
 apps/web/src/server/app/storefront/chatgpt.ts      |  667 ++++++
 apps/web/src/server/app/storefront/google.ts       |  429 ++++
 apps/web/src/server/app/storefront/merchant.ts     |  568 +++++
 apps/web/src/server/app/storefront/page.ts         |  867 ++++++++
 apps/web/src/server/app/storefront/policy.ts       |  166 ++
 apps/web/src/server/app/storefront/prepare.ts      |  757 +++++++
 apps/web/src/server/app/storefront/read.ts         | 1842 ++++++++++++++++
 apps/web/src/server/app/storefront/run.ts          |  565 +++++
 apps/web/src/server/app/storefront/state.ts        |  132 ++
 .../src/server/spec/storefront-channels.test.ts    | 1171 +++++++++++
 .../src/server/spec/storefront-merchant.test.ts    |  603 ++++++
 .../web/src/server/spec/storefront-prepare.test.ts |  782 +++++++
 apps/web/src/server/spec/storefront-read.test.ts   | 2223 ++++++++++++++++++++
 apps/web/src/server/spec/storefront-run.test.ts    |  806 +++++++
 apps/web/src/server/utils/google-merchant.ts       |    7 +
 bun.lock                                           |   46 +
 docs/nighthack-map.md                              |  134 ++
 turbo.json                                         |    2 +
 41 files changed, 13726 insertions(+)
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
