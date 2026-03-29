# Shopify App Store Listing — écentic

Copy-paste reference for the Shopify Partner Dashboard app listing form.

---

## App Introduction (max 100 chars)

```
See how AI shopping agents rank your products, find attribute gaps, and optimize listings to win.
```

## App Details (max 500 chars)

```
AI shopping agents (GPT-4, Claude, Gemini, Perplexity) increasingly decide which products consumers buy. They ignore ads and branding — they compare structured data in milliseconds. écentic imports your Shopify catalog, runs simulations across multiple AI models, and reveals exactly why agents pick competitors over you. Identify missing attributes, track per-model win rates, and publish optimized titles and descriptions directly back to your store.
```

## Features (3–5, max 80 chars each)

```
Feature 1: Simulate AI agent purchase decisions across GPT-4, Claude, Gemini & Perplexity
Feature 2: Identify product attribute gaps that cause AI agents to skip your listings
Feature 3: Publish optimized titles and descriptions back to your Shopify store
Feature 4: Track win rates per AI model with competitor battlecards
Feature 5: Generate Universal Commerce Protocol merchant profiles
```

## App Card Subtitle (max 62 chars)

```
Optimize your listings for AI shopping agent decisions
```

## App Store Search Terms (1–5, max 20 chars each)

```
1. AI optimization
2. product listing SEO
3. competitor analysis
4. agent commerce
5. content optimization
```

## Category Configuration

- **Primary category**: Store design > Site optimization > SEO
- **SEO tools merchants can use**: Content optimization
- **How merchants monitor performance**: Competitor analysis

## Privacy Policy URL

```
https://ecentic.com/privacy
```

## Scopes Requested

```
read_products, write_products, read_script_tags, write_script_tags
```

**Justification for `write_products`**: écentic generates optimized product titles and descriptions based on AI simulation results. When merchants approve an optimization (or have auto-publish enabled), the app pushes the updated listing content back to Shopify via the Admin API.

## Webhook Endpoints

Register these in the Shopify Partner Dashboard under "App setup > Compliance webhooks":

| Webhook | URL |
|---------|-----|
| Customer data request | `https://ecentic.com/api/integrations/shopify/webhooks` |
| Customer data erasure | `https://ecentic.com/api/integrations/shopify/webhooks` |
| Shop data erasure | `https://ecentic.com/api/integrations/shopify/webhooks` |

All three are handled by the same endpoint. The `x-shopify-topic` header determines which handler runs.

## Install Requirements

- **Sales channel**: "My app doesn't require the Shopify Online Store or Shopify POS"
- **Geographic requirements**: None

## Testing Instructions (max 2800 chars)

```
To test this app:

1. Install the app from your development store
2. You will be redirected to ecentic.com to create an account
3. Sign up with email and password, then verify your email with the OTP code
4. During onboarding Step 1 (Connect Store), your Shopify store will already be connected via the OAuth flow
5. In Step 2 (Select Products), choose which imported products to include in simulations
6. In Step 3 (Add Competitors), add competitor product URLs or enter them manually (title, price, brand, URL)
7. In Step 4 (Run Scan), click "Run Simulation" to execute AI agent simulations across GPT-4, Claude, Gemini, and Perplexity
8. After the simulation completes, you'll see your overall win rate and be redirected to the dashboard

Dashboard features to verify:
- Overview page shows win rate metrics, per-model breakdowns, and trend charts
- Products page lists all imported Shopify products with win rate columns
- Product detail view has 5 tabs: Win Rate, Agent Replay, Attribute Gaps, Battlecard, Optimize
- The Optimize tab shows current vs. optimized listing with an "Approve & Publish" button that writes back to your Shopify store
- Competitors page shows tracked competitor brands and an attribute heatmap
- Settings page shows connected stores with sync status

Test account:
Email: review@ecentic.com
Password: [SET BEFORE SUBMISSION]

This account has pre-seeded simulation data so you can see the full dashboard experience immediately without running a live simulation.
```

## Test Account Setup

- [ ] Create `review@ecentic.com` account with verified email
- [ ] Connect a development store with products
- [ ] Seed simulation results across multiple products and competitors
- [ ] Seed at least one pending optimization with before/after preview

## Feature Media

- **Type**: Image (1600×900px, .png)
- **Alt text**: "écentic dashboard showing AI agent win rates across GPT-4, Claude, Gemini, and Perplexity for an e-commerce product catalog"

## Desktop Screenshots (minimum 3, 1600×900px)

1. **Dashboard Overview** — Win rate cards, model breakdown chart, trend line
   - Alt: "écentic dashboard overview with overall win rate, per-model scores, and trend chart"

2. **Product Detail — Agent Replay** — Decision log showing step-by-step agent reasoning
   - Alt: "AI agent decision replay showing attribute-by-attribute comparison between products"

3. **Optimize Tab** — Current vs. optimized listing side-by-side
   - Alt: "Product optimization view with current listing compared to AI-generated improvements"

4. (Optional) **Competitors — Attribute Heatmap** — Win/tie/loss grid
   - Alt: "Competitor attribute heatmap showing where products win and lose against competitors"
