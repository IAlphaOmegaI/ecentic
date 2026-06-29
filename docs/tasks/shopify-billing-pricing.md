# Pricing + Shopify Billing API — Implementation Guide

This document describes how **Ecentic** should handle **subscription pricing** when the app is **listed on the Shopify App Store**, in conjunction with Shopify’s **Billing API**. It is written for engineers and product owners planning billing work; it is not legal or tax advice.

**Canonical product tiers** (limits and features) live in [`docs/context/idea.md`](../context/idea.md#pricing-tiers).

---

## 1. Why this matters

- **Public apps** on the Shopify App Store are expected to charge recurring fees through **Shopify’s Billing API** unless Shopify has **explicitly approved** another model (for example, external billing for enterprise deals). Do not rely on “we’ll charge on ecentic.ai only” for a listed app without checking current Partner Program rules and, when required, Partner Support.
- The **Partner Dashboard “Pricing”** section (public plans, display names, optional external pricing URL) must **match what merchants experience** in the app. Misaligned or misleading pricing is a common review failure.
- Shopify bills **per shop installation** (per `myshopify.com` store that installs the app). Your internal model may be **per user account** with multiple stores; that mapping must be deliberate (see §5).

---

## 2. Concepts: three layers you must keep aligned

| Layer | What it is | Owner |
|--------|------------|--------|
| **Partner Dashboard plans** | Public (and optional private) plans shown on the App Store listing | Partner Dashboard → App → Distribution / Pricing |
| **Shopify Billing API** | Actual charge creation, approval, renewal, cancellation for a given **shop** | Your backend using Admin API + webhooks |
| **Ecentic entitlements** | What your app allows: product limits, simulation frequency, features | Your DB + server actions / middleware |

**Rule:** A merchant should be able to read the listing, approve a charge in Shopify, and see the same tier and limits inside Ecentic without confusion.

---

## 3. Shopify Billing API (technical overview)

Shopify’s billing for apps is implemented through the **GraphQL Admin API** (not a separate REST billing SDK for new work).

### 3.1 Typical flow

1. Merchant installs the app; you have an **Admin API access token** for that shop (already true after OAuth in this codebase).
2. When the merchant chooses a paid plan (or you require payment after a trial), your server calls **`appSubscriptionCreate`** (GraphQL) with:
   - `name`, `returnUrl`, `lineItems` (recurring price, interval),
   - optional **trial days**,
   - optional **replacement** of an existing app subscription if you use **one active subscription per shop**.
3. Shopify returns a **confirmation URL**. Redirect the **merchant** (embedded app or new tab per UX guidelines) to that URL to approve the charge.
4. After approval, Shopify sends a webhook (see §4). You persist subscription state and unlock entitlements.

Use the **current Admin API version** your app already pins (e.g. `2024-10` or newer as you upgrade) consistently for OAuth, REST product calls, and GraphQL billing.

### 3.2 Free tier vs paid tiers

- **Free / “Scan” tier:** Can be **$0** in the Partner Dashboard and **no** recurring `appSubscriptionCreate` for that state—or you still create a $0 subscription only if your design requires it (usually unnecessary).
- **Paid tiers (“Compete”, “Dominate”, etc.):** Each should correspond to either:
  - a **distinct public plan** in the Partner Dashboard with matching price points, **or**
  - a single plan with **in-app upgrade paths** that still go through **Billing API** charges Shopify recognizes (avoid promising a fixed App Store price then charging a different amount without updating the listing).

### 3.3 Currency and markets

Subscription pricing through Shopify is **in the merchant’s currency context** as defined by Shopify’s billing APIs. Align marketing copy on the listing with what Shopify can charge for your target regions, or document limitations.

---

## 4. Webhooks (mandatory for robust billing)

Subscribe to app subscription lifecycle events so your database stays in sync if the merchant cancels, fails payment, or upgrades inside the Shopify admin.

**Common topic:** `APP_SUBSCRIPTIONS_UPDATE` (verify the exact topic name in [Shopify’s webhook reference](https://shopify.dev/docs/api/admin-rest/latest/resources/webhook) for your API version).

**Handler responsibilities:**

1. **Verify** the webhook (HMAC for REST-style payloads; follow Shopify’s docs for the delivery format you register).
2. **Idempotent updates:** Same event may retry; key off Shopify subscription GID + status.
3. **Map** Shopify subscription → **Ecentic user / store record**:
   - Minimum: which `store` row (Shopify connection) is paid and until when.
   - If one user has multiple Shopify stores, decide whether **each store has its own subscription** (typical for Shopify) or whether you enforce one “account” subscription—**Billing API is per installation**, so “one subscription per shop” is the straightforward model.

---

## 5. Mapping Shopify shops to Ecentic accounts

Today, OAuth creates a **`store`** row linked to a **`user`**. Billing events arrive in the context of a **shop**.

**Recommended default:**

- Treat **Shopify Billing** as **per installed shop** (`*.myshopify.com`).
- Store on `store` (or a dedicated `shopify_billing` table): `shopifySubscriptionId`, `planKey` (`scan` | `compete` | `dominate` | `enterprise`), `status`, `currentPeriodEnd`, `cancelAtPeriodEnd`, etc.
- Enforce limits (product counts, simulation frequency) **per user** by aggregating across stores **or** per store—**pick one rule** and document it in product copy.

**Edge case:** Merchant installs on two shops under one Ecentic user—either two subscriptions or a product decision to “link” shops under one paid seat (complex; usually defer).

---

## 6. Partner Dashboard vs code

| Partner Dashboard | Code / data |
|-------------------|-------------|
| Public plan names and prices | Same names/prices used in `appSubscriptionCreate` line items (or clear upgrade path) |
| Optional URL to your marketing pricing page | May point to `https://www.ecentic.ai/pricing` for detail; must not contradict the Shopify charge |
| “Charge outside Shopify” checkbox | Only if Shopify has **approved** external billing for this app |

When you add paid plans, update **both** the listing and the implementation in the same release cycle where possible.

---

## 7. Implementation checklist (suggested order)

1. **Product:** Finalize tier names, prices, limits, and trials for Shopify merchants (may match [`idea.md`](../context/idea.md) or a Shopify-specific subset).
2. **Partner Dashboard:** Create public plans that match those tiers (can start with **only a free plan** until billing ships).
3. **Schema:** Add subscription fields (or a dedicated table) keyed by `store.id` and/or Shopify shop domain + GID.
4. **Server:** GraphQL client to call `appSubscriptionCreate` with the shop’s access token; handle errors and user-visible states.
5. **UI:** “Upgrade” / “Manage plan” that redirects merchants through Shopify’s approval URL; embedded app UX must follow [Shopify Embedded App guidelines](https://shopify.dev/docs/apps/build/embedded-app).
6. **Webhooks:** Register `APP_SUBSCRIPTIONS_UPDATE` (and any others required by your flow); verify signatures; update DB.
7. **Entitlements:** Centralize a single function, e.g. `getEffectivePlan(userId)` / `resolveStoreEntitlements(storeId)`, used by simulations, optimize, and publish.
8. **Testing:** Use **development stores** and Shopify’s **test billing** behavior; confirm upgrade, downgrade, cancel, and uninstall (`shop/redact` already handled for data deletion—ensure billing state is cleared).

---

## 8. Staged rollout (matches “list now, payments later”)

1. **Ship listing with a free public plan** ($0) that matches what the app actually offers.
2. **Do not** check “approval to charge outside Shopify” unless you have approval.
3. When ready, add **paid** public plans in Partner Dashboard and implement **Billing API** + webhooks + entitlements in one coordinated milestone.
4. Optionally keep **Stripe (or other) on ecentic.ai** for non-Shopify customers; for Shopify-installed merchants, prefer **Shopify Billing** for the Shopify portion of revenue to stay compliant with App Store expectations.

---

## 9. References (Shopify)

- [About billing for your app](https://shopify.dev/docs/apps/launch/billing)
- [Subscription billing APIs](https://shopify.dev/docs/apps/launch/billing/subscription-billing)
- [GraphQL Admin API — AppSubscription](https://shopify.dev/docs/api/admin-graphql/latest/objects/AppSubscription) (verify current schema for `appSubscriptionCreate`)

---

## 10. Related internal docs

- [`docs/context/shopify.md`](../context/shopify.md) — App Store listing copy and technical endpoints
- [`docs/context/idea.md`](../context/idea.md) — Tier definitions and limits
- [`docs/integrations/overview.md`](../integrations/overview.md) — Shopify integration status and gaps

When billing ships, update **integrations overview** with a “Billing API” subsection and link from this task doc.
