# Shopify App Store listing: draft copy

Copy to paste into the Partner Dashboard (App distribution → Shopify App Store
listing → Manage listing). Drafted 20 Oct 2026. Field limits are the ones
recorded in [`docs/context/shopify.md`](../context/shopify.md); check them
against the live form, which wins if they differ.

## Read this first: billing happens outside Shopify

The listing cannot show the website's plans as Shopify charges today, because
ecentic does not bill Shopify merchants through Shopify.

What the code does (checked 20 Oct 2026):

- **Flat plans (Compete, Scale, Dominate)** are sold only through Stripe
  Checkout (`apps/web/src/server/app/subscription.ts`). There is no Shopify
  Billing path for them, whatever platform the store is on.
- **Pay-as-you-go** bills its performance fee through Stripe one-off invoices.
  A Shopify rail exists in code (`Shopify.ensureUsageSubscription` creates a
  capped usage line with `appSubscriptionCreate`, and `billing/performance-fee.ts`
  routes to it when `store.shopifyUsageLineId` is set), but nothing calls
  `ensureUsageSubscription`, so no store ever gets that line and every fee goes
  to Stripe.
- **The free Scan** has no billing at all.

Shopify's billing docs say: "All apps published on the Shopify App Store are
required to use a Shopify provided billing solution"
(<https://shopify.dev/docs/apps/launch/billing>). No exception for charging
outside Shopify was found in those docs. So the live listing's plans and the
way ecentic actually charges disagree twice over: the listing still shows the
retired $149 / $499 plans, and the current plans are not billed through
Shopify at all.

That is a decision for ecentic, not a copy fix. The two ways to close it:

1. **Shopify App Pricing** (plans set in the Partner Dashboard, no billing
   code). It supports fixed recurring charges, usage-based pricing and the two
   combined, with up to eight public plans, priced in USD. Compete, Scale and
   Dominate map onto fixed recurring plans directly. Whether a 3% fee on
   AI-attributed order value fits its usage meters needs checking. Note that
   once an app opts in to App Pricing it can no longer create new recurring
   charges through the Billing API.
2. **Manual Pricing on the Billing API**, the path the existing
   `ensureUsageSubscription` code started down for pay-as-you-go. It still
   needs a caller, a flat-plan equivalent, and the
   `APP_SUBSCRIPTIONS_UPDATE` webhook described in
   [`docs/tasks/shopify-billing-pricing.md`](../tasks/shopify-billing-pricing.md).

Until one of those ships, the site sends "Install on Shopify" to
`/sign-up?platform=shopify`, and the App Store link is only a secondary
"Prefer the app?" link in the homepage hero.

---

## App name

```
ecentic
```

## App card subtitle (max 62 characters)

55 characters.

```
Find the products AI shopping agents skip, and fix them
```

## App introduction (max 100 characters)

95 characters.

```
Get the sale when AI does the shopping. See which products ChatGPT, Gemini and Perplexity skip.
```

## App details (max 500 characters)

497 characters.

```
Shoppers now ask ChatGPT, Claude, Gemini and Perplexity what to buy, and the agent picks for them. ecentic imports your Shopify catalog and runs your products through simulated shopping prompts against the competitors you name. You see which products get skipped and why, such as a missing attribute or a title the agent can't compare. ecentic rewrites titles, descriptions and product data, publishes the changes you approve back to Shopify, and tracks the AI-agent visits and orders that follow.
```

## Feature list (3 to 5, max 80 characters each)

```
Test your catalog in ChatGPT, Claude, Gemini and Perplexity shopping prompts
See which products lose to the competitors you name, and why
Rewrite titles, descriptions and product data, then publish what you approve
Track AI-agent visits and the orders they bring to your store
Generate a UCP merchant profile for AI agents on the Dominate plan
```

Lengths: 76, 60, 76, 61, 66.

---

## Pricing section

Plans, prices and features below are the website's, read from
`pricing.plans` and `pricing.schema.plans` in `apps/web/messages/en.json` on
20 Oct 2026. If those change, change these. Shopify's plan form has a
**Display name** and **Top features** per plan; the docs give no length limit
for either, so each line is kept under 80 characters to match the feature list.

### What can go on the listing today

Only the plan that involves no charge:

**Display name:** `Scan`
**Price:** Free

**Top features:**

```
One-time simulation of your top 10 products across four AI assistants
Returns a Win Rate Report for your store
No credit card
```

Listing the paid plans below as Shopify plans while they are charged through
Stripe would put the listing back where it is now: showing prices the app does
not charge the way Shopify expects.

### Ready to paste once billing runs through Shopify

Use these only after option 1 or 2 above ships, and only with prices that
match what Shopify actually charges.

**Display name:** `Pay-as-you-go`
**Price:** Free to install, then a usage charge
**Top features:**

```
Everything in Dominate, from day one
No credit card to start
3% fee only on orders AI agents drive, capped at $500 a month
```

**Display name:** `Compete`
**Price:** $14.90 / month
**Top features:**

```
Up to 100 products
Daily agent simulations
Competitor battlecards
Manual optimization suggestions
```

**Display name:** `Scale`
**Price:** $44.90 / month
**Top features:**

```
Up to 1000 products
Continuous simulations
Auto-optimization and one-click publish
Competitor battlecards
```

**Display name:** `Dominate`
**Price:** $149 / month
**Top features:**

```
Everything in Scale
Model drift alerts
UCP generation
Partner deal tier (YC, Techstars)
```

Enterprise stays off the listing. It has custom pricing arranged on a call:
<https://cal.com/ecentic-ai/15min>.

The flat plans carry no performance fee, and the performance fee is never
charged on top of a flat plan. Say so in the listing if the form has room for
it.
