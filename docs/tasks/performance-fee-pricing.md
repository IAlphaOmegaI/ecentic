# Performance-Fee Pricing — Implementation Spec (Claude Code task)

> **How to use this doc:** hand it to Claude Code in-repo. It is written as an executable
> task, grounded in the current codebase (`apps/web/src/server/**`). Follow the docs-first
> rule in `CLAUDE.md` and the conventions in `docs/agents/AGENTS-*.md`. Typecheck with
> `bun run typecheck` and generate migrations with `bun run db:generate` after schema edits.
>
> **Companion doc:** `docs/tasks/shopify-billing-pricing.md` (Shopify Billing API rules).
> **Tier definitions:** `docs/context/idea.md#pricing-tiers`.

---

## 1. Objective

Add a **usage layer on top of the existing subscriptions**: a **percentage performance fee
with a monthly cap**, charged **only on orders Ecentic can attribute** to AI-agent traffic it
optimizes for. This is additive — the `compete` / `dominate` recurring price stays; the fee
rides on the same invoice as a metered line.

**Model:**

- Fee = `attributedOrderValue × rateBps` (basis points; e.g. `300` = 3%).
- Accrual is capped per billing period at `capCents` (e.g. `$500`). Cap resets each period.
- Fee is billed **only on attributed orders**, never on gross sales, never per visit.
- Dual rail: **Stripe** for direct customers, **Shopify Billing** (`appUsageRecordCreate`,
  cap mandatory) for Shopify-installed stores. Route per store.

Non-goals: charging per agent *visit*; charging on un-attributed sales; changing base prices.

---

## 2. Key decisions (read before coding)

1. **Attribution is honest and observable.** Ecentic does not sit in the AI platform's
   checkout, so we attribute via signals we actually see: the `*-referral` `agentType`
   visits already recorded in `agent_visit` (a human arriving from an AI answer), plus a
   first-party attribution cookie and a Shopify **order webhook**. An order counts only if
   an AI-referral visit for that store occurred within the **attribution window** (default 7
   days) and we can tie it to the order. No signal → no fee. This is deliberately
   conservative; over-charging is the fastest way to churn (see `docs/context/strategy.md`).

2. **The cap is not optional — Shopify requires it.** `appSubscriptionCreate` usage line
   items must declare a `cappedAmount`. We enforce the same cap app-side for Stripe so both
   rails behave identically and a merchant can never be surprised.

3. **Per-store attribution, per-rail billing.** Attribution is computed per `store`. Billing
   routes by `store.platform`: a store with a `store_account.accessToken` (Shopify OAuth) →
   Shopify usage record; otherwise → Stripe meter on the user's subscription. A user with
   multiple stores accrues per store but the Stripe-billed portion aggregates onto the one
   `subscription` row (which is `unique(userId)`).

4. **Report at period close, not per order.** A cron computes `min(Σ fee, cap)` for the
   closing period and reports the not-yet-reported delta to the rail. This makes cap
   enforcement and idempotency trivial and avoids racing on every webhook.

5. **Opt-in / configurable rate.** Default rate + cap live per plan but are overridable per
   subscription (Enterprise negotiates its own). Fee can be toggled off entirely.

---

## 3. Environment variables (add to `.env.local` + document in `CLAUDE.md`)

```
# Stripe — metered performance-fee price backed by a Billing Meter
STRIPE_METER_PERFORMANCE_FEE_EVENT   # meter event_name, e.g. "ecentic_performance_fee"
STRIPE_PRICE_PERFORMANCE_FEE         # metered price id (unit = 1 cent of fee)

# Performance-fee defaults (basis points + cents), overridable per subscription
PERFORMANCE_FEE_RATE_BPS_DEFAULT=300      # 3%
PERFORMANCE_FEE_CAP_CENTS_DEFAULT=50000   # $500 / period
PERFORMANCE_FEE_ATTRIBUTION_WINDOW_DAYS=7

# reuse existing CRON_SECRET for the period-close endpoint
```

**Stripe dashboard setup (one-time, manual):** create a **Billing Meter** with event name
`ecentic_performance_fee` and aggregation `sum`; create a **metered Price** whose unit
amount is `$0.01` (so `quantity = fee in cents`) linked to that meter; put its id in
`STRIPE_PRICE_PERFORMANCE_FEE`. Extend `PLANS` in `utils/stripe.ts` (see §7).

---

## 4. Schema changes (`apps/web/src/server/database/schema.ts`)

Follow the existing style: `text` ids via `gen_random_uuid()::text`, `timestamp({ mode: "date" })`,
`index`/`uniqueIndex` in the table's array. Money is stored in **integer minor units** (cents).

### 4.1 Extend `subscription`

```ts
export const subscription = pgTable("subscription", {
  // ...existing columns unchanged...

  // --- performance fee config ---
  performanceFeeEnabled: boolean("performanceFeeEnabled").notNull().default(false),
  performanceFeeRateBps: integer("performanceFeeRateBps"),      // null → use env default
  performanceFeeCapCents: integer("performanceFeeCapCents"),    // null → use env default
  /** Stripe subscription item id for the metered performance-fee price. */
  stripePerformanceItemId: text("stripePerformanceItemId"),
});
```

### 4.2 New table `attributed_conversion` (one row per attributed order)

```ts
export const attributedConversion = pgTable(
  "attributed_conversion",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storeId: text("storeId")
      .notNull()
      .references(() => store.id, { onDelete: "cascade" }),
    /** platform order id (Shopify order GID/numeric). Unique per store → idempotent webhooks. */
    orderExternalId: text("orderExternalId").notNull(),
    orderValueCents: integer("orderValueCents").notNull(),
    currency: text("currency").notNull().default("USD"),
    attributedAgentType: text("attributedAgentType").notNull(), // e.g. "chatgpt-referral"
    attributionMethod: text("attributionMethod").notNull(),     // "cart-attribute" | "utm" | "ucp"
    /** the agent_visit that earned attribution, if resolved */
    visitId: text("visitId").references(() => agentVisit.id, { onDelete: "set null" }),
    feeRateBps: integer("feeRateBps").notNull(),
    feeCents: integer("feeCents").notNull(),                    // rate applied, pre-cap
    /** "pending" → not yet reported; "reported"; "capped" (excluded by cap); "voided" (refund) */
    billingStatus: text("billingStatus").notNull().default("pending"),
    feePeriodId: text("feePeriodId").references(() => feePeriod.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attributed_conversion_store_order_unique").on(
      table.storeId,
      table.orderExternalId,
    ),
    index("attributed_conversion_user_created_idx").on(table.userId, table.createdAt),
    index("attributed_conversion_period_idx").on(table.feePeriodId),
  ],
);
```

### 4.3 New table `fee_period` (period accounting + idempotent reporting)

```ts
export const feePeriod = pgTable(
  "fee_period",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subscriptionId: text("subscriptionId")
      .notNull()
      .references(() => subscription.id, { onDelete: "cascade" }),
    periodStart: timestamp("periodStart", { mode: "date" }).notNull(),
    periodEnd: timestamp("periodEnd", { mode: "date" }).notNull(),
    rateBps: integer("rateBps").notNull(),
    capCents: integer("capCents").notNull(),
    accruedCents: integer("accruedCents").notNull().default(0),   // pre-cap sum
    billedCents: integer("billedCents").notNull().default(0),     // min(accrued, cap)
    reportedCents: integer("reportedCents").notNull().default(0), // already pushed to a rail
    rail: text("rail").notNull().default("stripe"),               // "stripe" | "shopify"
    closedAt: timestamp("closedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("fee_period_sub_start_unique").on(table.subscriptionId, table.periodStart),
    index("fee_period_user_idx").on(table.userId),
  ],
);
```

> Declaration order: `feePeriod` is referenced by `attributedConversion`. Either declare
> `feePeriod` first, or use a lazy `() => feePeriod.id` reference (Drizzle supports the
> thunk form, already used across this schema). Add Drizzle `relations(...)` blocks
> alongside, mirroring the existing pattern in this file.

After editing: `cd apps/web && bun run db:generate` then `bun run db:migrate`.

---

## 5. Attribution pipeline

### 5.1 Storefront tracker — stamp AI referrals onto the cart

The tracker beacon already fires to `/api/tracking/agent-visit` and classifies `*-referral`
agent types. Extend the storefront script so that when the current session is an AI referral,
it writes a Shopify **cart attribute** (survives to the order as `note_attributes`) and a
first-party cookie as a fallback for non-Shopify platforms:

```js
// storefront tracker addition (public/… beacon or Shopify script tag)
if (detection.agentCategory === "referral") {
  document.cookie =
    `_ecentic_ai_ref=${detection.agentType}.${Date.now()};path=/;max-age=${7 * 864e2};samesite=lax`;
  // Shopify AJAX cart API — persists into order.note_attributes
  fetch("/cart/update.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attributes: { _ecentic_ai_ref: detection.agentType } }),
  }).catch(() => {});
}
```

### 5.2 Shopify order webhook → create attributed conversion

Register the `orders/paid` topic on connect (extend the existing webhook registration in
`app/integration/shopify.ts` where other topics/script tags are set up) and route it through
the existing handler at `app/(provider)/api/integrations/shopify/webhooks/route.ts`. Verify
HMAC exactly as the current webhook route does.

New server module `apps/web/src/server/app/billing/attribution.ts`:

```ts
"use server";

import { and, eq, gte } from "drizzle-orm";
import { schema } from "../../database";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import { repository } from "../../utils/repository";
import * as Subscription from "../subscription";
import { resolveFeeConfig } from "./performance-fee";

export const { create, find, update } = repository(schema.attributedConversion);

const WINDOW_DAYS = Number(
  process.env.PERFORMANCE_FEE_ATTRIBUTION_WINDOW_DAYS ?? "7",
);

/**
 * Called from the Shopify `orders/paid` webhook. Attributes the order to Ecentic
 * iff it carries our AI-ref cart attribute OR a matching recent `*-referral` visit
 * exists for the store within the attribution window. Idempotent on (store, order).
 */
export const recordOrderIfAttributed = withContext(
  async (
    _,
    {
      storeId,
      userId,
      orderExternalId,
      orderValueCents,
      currency,
      noteAttributes,
    }: {
      storeId: string;
      userId: string;
      orderExternalId: string;
      orderValueCents: number;
      currency: string;
      noteAttributes: Record<string, string>;
    },
  ) => {
    // idempotency: skip if we already stored this order
    const seen = await find(Environment.SERVER, {
      where: and(
        eq(schema.attributedConversion.storeId, storeId),
        eq(schema.attributedConversion.orderExternalId, orderExternalId),
      ),
      limit: 1,
    });
    if (!seen.success) return seen;
    if (seen.data[0]) return { success: true as const, data: seen.data[0] };

    // 1) direct signal: cart attribute set by the tracker
    const tagged = noteAttributes._ecentic_ai_ref ?? null;

    // 2) fallback signal: recent referral visit for this store
    const since = new Date(Date.now() - WINDOW_DAYS * 864e5);
    const recentVisit = tagged
      ? null
      : await (async () => {
          const rows = await find(Environment.SERVER, {
            // NOTE: query agent_visit, not attributedConversion — use db directly
            // or a helper; sketch shown for clarity.
            where: and(
              eq(schema.agentVisit.storeId, storeId),
              eq(schema.agentVisit.agentCategory, "referral"),
              gte(schema.agentVisit.createdAt, since),
            ),
            limit: 1,
          });
          return rows.success ? (rows.data[0] ?? null) : null;
        })();

    const agentType = tagged ?? recentVisit?.agentType ?? null;
    const method = tagged ? "cart-attribute" : recentVisit ? "utm" : null;
    if (!agentType || !method) return { success: true as const, data: null }; // not attributed

    const config = await resolveFeeConfig(Environment.SERVER, { userId });
    if (!config.success) return config;
    if (!config.data.enabled) return { success: true as const, data: null };

    const feeCents = Math.round((orderValueCents * config.data.rateBps) / 10_000);

    return create(Environment.SERVER, {
      userId,
      storeId,
      orderExternalId,
      orderValueCents,
      currency,
      attributedAgentType: agentType,
      attributionMethod: method,
      visitId: recentVisit?.id ?? null,
      feeRateBps: config.data.rateBps,
      feeCents,
      billingStatus: "pending",
    });
  },
  "Attribution.recordOrderIfAttributed",
);
```

> The `find` on `agent_visit` above is sketched via the conversion repository for brevity;
> in real code query `db` directly (`import { db, schema }`) or add a small
> `Tracking.findRecentReferralVisit` helper in `app/tracking.ts` and call it — keep the
> repository generic and avoid cross-table `find`.

**Refunds:** on `refunds/create` (optional, phase 2), set the matching conversion's
`billingStatus = "voided"` and subtract from the open period's `accruedCents`. Because we
report at period close, a refund before close simply lowers the billed amount.

---

## 6. Fee config + compute (`apps/web/src/server/app/billing/performance-fee.ts`)

```ts
"use server";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "../../database";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { repository } from "../../utils/repository";
import * as Subscription from "../subscription";

const RATE_DEFAULT = Number(process.env.PERFORMANCE_FEE_RATE_BPS_DEFAULT ?? "300");
const CAP_DEFAULT = Number(process.env.PERFORMANCE_FEE_CAP_CENTS_DEFAULT ?? "50000");

export const { create: createPeriod, update: updatePeriod, find: findPeriod } =
  repository(schema.feePeriod);

export const resolveFeeConfig = withContext(
  async (_, { userId }: { userId: string }) => {
    const sub = await Subscription.find(Environment.SERVER, {
      where: eq(schema.subscription.userId, userId),
      limit: 1,
    });
    if (!sub.success) return sub;
    const row = sub.data[0];
    if (!row) return { success: true as const, data: { enabled: false, rateBps: 0, capCents: 0 } };
    return {
      success: true as const,
      data: {
        enabled: row.performanceFeeEnabled,
        rateBps: row.performanceFeeRateBps ?? RATE_DEFAULT,
        capCents: row.performanceFeeCapCents ?? CAP_DEFAULT,
        subscriptionId: row.id,
      },
    };
  },
  "PerformanceFee.resolveFeeConfig",
);

/** Sum pending fee for a user within [start, end). */
export const accruedForPeriod = withContext(
  async (_, { userId, start, end }: { userId: string; start: Date; end: Date }) => {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.attributedConversion.feeCents}), 0)` })
      .from(schema.attributedConversion)
      .where(
        and(
          eq(schema.attributedConversion.userId, userId),
          eq(schema.attributedConversion.billingStatus, "pending"),
          gte(schema.attributedConversion.createdAt, start),
          lte(schema.attributedConversion.createdAt, end),
        ),
      );
    return { success: true as const, data: Number(row?.total ?? 0) };
  },
  "PerformanceFee.accruedForPeriod",
);
```

Expose a `withAuthentication` reader `getCurrentPeriodSummary` returning
`{ accruedCents, billedCents, capCents, rateBps, remainingCents, conversions }` for the UI.

---

## 7. Stripe metering (`apps/web/src/server/utils/stripe.ts` + `app/subscription.ts`)

### 7.1 Register the metered price

```ts
// utils/stripe.ts
export const PERFORMANCE_FEE = {
  eventName: () => process.env.STRIPE_METER_PERFORMANCE_FEE_EVENT,
  priceId: () => process.env.STRIPE_PRICE_PERFORMANCE_FEE,
} as const;
```

### 7.2 Attach the metered item to the subscription at checkout

In `createCheckoutSessionForUser`, when the metered price is configured, add it as a second
line item so base + usage share one subscription/invoice:

```ts
line_items: [
  { price: priceId, quantity: 1 },
  ...(PERFORMANCE_FEE.priceId()
    ? [{ price: PERFORMANCE_FEE.priceId() as string }]   // metered: no quantity
    : []),
],
```

In `upsertFromStripeSubscription`, detect the metered item and persist its id:

```ts
const performanceItem = subscription.items.data.find(
  (item) => item.price.id === process.env.STRIPE_PRICE_PERFORMANCE_FEE,
);
// add to payload:
stripePerformanceItemId: performanceItem?.id ?? null,
performanceFeeEnabled: Boolean(performanceItem),
```

### 7.3 Report usage (called by the period-close cron)

```ts
// app/subscription.ts
export const reportPerformanceUsage = withContext(
  async (_, { customerId, quantityCents }: { customerId: string; quantityCents: number }) => {
    if (quantityCents <= 0) return { success: true as const, data: { reported: 0 } };
    const eventName = PERFORMANCE_FEE.eventName();
    if (!eventName)
      return { success: false as const, error: new RequestError("Meter event not configured") };

    const event = await resultify(() =>
      stripe().billing.meterEvents.create({
        event_name: eventName,
        payload: {
          stripe_customer_id: customerId,
          value: String(quantityCents), // unit price = $0.01 → charge = quantityCents cents
        },
      }),
    );
    if (!event.success)
      return {
        success: false as const,
        error: new RequestError("Failed to report meter event", { cause: event.error }),
      };
    return { success: true as const, data: { reported: quantityCents } };
  },
  "Subscription.reportPerformanceUsage",
);
```

> Uses the current **Billing Meters** API (`billing.meterEvents.create`). The cap is enforced
> **before** calling this — we only ever report up to `min(accrued, cap) - alreadyReported`.

---

## 8. Shopify usage billing (`apps/web/src/server/app/integration/shopify.ts`)

Shopify merchants must be charged through Shopify Billing. The performance fee is a **usage
line item with a mandatory `cappedAmount`** on the app subscription.

### 8.1 Create/ensure the app subscription with a usage line

Add a GraphQL helper (the file currently uses Admin REST; add a small GraphQL POST helper to
`${domain}/admin/api/${API_VERSION}/graphql.json` with the `X-Shopify-Access-Token`, mirroring
the existing REST auth):

```ts
const APP_SUBSCRIPTION_CREATE = /* GraphQL */ `
  mutation CreateAppSubscription(
    $name: String!, $returnUrl: URL!, $cappedAmount: MoneyInput!, $terms: String!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      lineItems: [{
        plan: { appUsagePricingDetails: { cappedAmount: $cappedAmount, terms: $terms } }
      }]
    ) {
      appSubscription { id lineItems { id } }
      confirmationUrl
      userErrors { field message }
    }
  }
`;
```

- `cappedAmount` = `{ amount: capDollars, currencyCode }` (the same cap as Stripe).
- Redirect the **merchant** to `confirmationUrl` to approve (embedded-app UX per
  `docs/tasks/shopify-billing-pricing.md §6`).
- Persist the returned usage `lineItem.id` (add `shopifyUsageLineId` to `store` or a billing
  table keyed by `store.id`).

### 8.2 Create a usage record at period close

```ts
const APP_USAGE_RECORD_CREATE = /* GraphQL */ `
  mutation CreateUsageRecord($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!) {
    appUsageRecordCreate(
      subscriptionLineItemId: $subscriptionLineItemId
      price: $price
      description: $description
    ) {
      appUsageRecord { id }
      userErrors { field message }
    }
  }
`;
```

Wrap both in `withContext` server functions (`Shopify.ensureUsageSubscription`,
`Shopify.createUsageRecord`) returning the standard `Result`. If Shopify returns a cap-exceeded
`userError`, mark the period `billedCents` at the cap and stop — do not retry.

---

## 9. Period-close cron (`apps/web/src/app/(provider)/api/cron/billing/route.ts`)

Mirror `api/cron/scan/route.ts` (Bearer `CRON_SECRET`). Schedule daily; it processes any
subscription whose current period has ended and hasn't been reported.

Flow per subscription:

1. Determine the closing period `[currentPeriodStart, currentPeriodEnd)` from the
   `subscription` row.
2. `accrued = accruedForPeriod(...)`; `billed = min(accrued, capCents)`.
3. Upsert a `fee_period` row (unique on `subscriptionId, periodStart`) — idempotent.
4. `delta = billed - reportedCents`. If `delta > 0`:
   - Route by rail: Shopify store → `Shopify.createUsageRecord(delta)`; else →
     `Subscription.reportPerformanceUsage({ customerId, quantityCents: delta })`.
   - On success set `reportedCents = billed`, `billedCents = billed`, `closedAt = now`.
5. Flip the reported conversions' `billingStatus` from `pending` → `reported`; any beyond the
   cap → `capped`.

Register in `apps/web/vercel.json` (or wherever `cron/scan` is scheduled) e.g. `0 3 * * *`.

---

## 10. Entitlements / config surface

- Add `getEffectivePlan(userId)` awareness of the fee (extend whatever resolves plan today, or
  add `PerformanceFee.resolveFeeConfig`). Defaults per plan: `scan` → disabled; `compete` /
  `dominate` → enabled at env defaults; `enterprise` → per-row overrides.
- Add a server action `Subscription.setPerformanceFeeConfig({ enabled, rateBps, capCents })`
  guarded by `withAuthorization` (admin only) for Enterprise negotiation.

---

## 11. UI

### 11.1 Landing pricing (`app/(main)/_components/pricing.tsx`)

Under Compete and Dominate cards add a fee line with a tooltip:

> **+ 3% performance fee** on AI-attributed orders · capped at $500/mo
> *You only pay when an AI agent buys because of an optimization we made. Never on your other
> sales. Hard monthly cap — no surprises.*

Keep semantic tokens (`text-muted-foreground`, `border-accent`, etc.). Scan tier shows no fee.

### 11.2 Billing settings (`app/(main)/dashboard/settings/_components/settings/billing-section.tsx`)

Add a **Performance fee** card fed by `getCurrentPeriodSummary`:

- Current-period accrual vs cap as a progress bar (reuse the `meter`/`progress` component from
  `@zenncore/web`; docs in `docs/web/meter.md` / `docs/web/progress.md`).
- Headline number via `@number-flow` (already a dependency).
- Effective rate + cap, period end date, and a "View attributed orders" expander listing recent
  `attributed_conversion` rows (product/order, value, agent, fee). Use the data-table pattern
  from `@zenncore/data-table` if a table is warranted.
- Follow PPR/streaming: card body is an async server component inside `<Suspense>` with a
  skeleton (per `CLAUDE.md` §"PPR and Streaming").

### 11.3 Pricing detail page (`app/(main)/pricing/page.tsx`)

Add an FAQ/explainer block: how attribution works, what counts, the cap, and that the fee only
applies to paid tiers.

---

## 12. Webhooks summary

- **Stripe** (`api/stripe/webhook/route.ts`): no new event types required — the metered item is
  read in `upsertFromStripeSubscription`. Ensure `stripePerformanceItemId` /
  `performanceFeeEnabled` persist on `customer.subscription.created|updated`.
- **Shopify** (`api/integrations/shopify/webhooks/route.ts`): add `orders/paid` (→
  `Attribution.recordOrderIfAttributed`), optionally `refunds/create` (→ void), and keep
  `app_subscriptions/update` in sync if you add Shopify usage subscriptions. Verify HMAC as the
  route already does. Register the new topics wherever topics are registered on OAuth connect.

---

## 13. Migration & rollout

1. Schema edits → `cd apps/web && bun run db:generate && bun run db:migrate`.
2. Ship **dark**: `performanceFeeEnabled` defaults `false`; attribution + accrual run and
   populate `attributed_conversion` / `fee_period` but nothing is reported to a rail. Verify the
   numbers look right against real order data for 1–2 billing periods.
3. Create the Stripe Meter + metered Price; set env vars. For Shopify, ship the usage-line
   `appSubscriptionCreate` behind a flag and test on a **development store**.
4. Flip `performanceFeeEnabled` on for new `compete`/`dominate` checkouts; migrate existing
   customers with notice (the fee is capped and opt-in-friendly — communicate clearly).
5. Update `docs/context/idea.md#pricing-tiers`, `docs/tasks/shopify-billing-pricing.md`, and the
   App Store listing so displayed pricing matches what is charged (a common review failure —
   see the companion doc §6).

---

## 14. Testing checklist

- **Attribution unit:** order with `_ecentic_ai_ref` cart attribute → conversion created with
  correct `feeCents = round(value × bps / 10000)`. Order with no signal → no conversion. Order
  with a referral visit inside the window but no attribute → attributed via `utm`; outside the
  window → not attributed.
- **Idempotency:** same `orders/paid` delivered twice → one conversion row.
- **Cap:** accrue past the cap → `billedCents` clamps; conversions beyond cap → `capped`;
  Stripe/Shopify receive exactly `min(accrued, cap)` and never more across retries.
- **Rail routing:** Shopify store → usage record; direct customer → Stripe meter event.
- **Refund (if built):** void lowers open-period accrual.
- **Cron idempotency:** re-run the same day → `reportedCents` unchanged, no double charge.
- `bun run typecheck` and `bun run lint` clean.

---

## 15. Decisions still open for a human

1. **Flat vs percentage** — this spec implements percentage (as requested). If you later want a
   flat per-order fee, only `feeCents` computation and copy change.
2. **Rate/cap numbers** — `300 bps` / `$500` are placeholders; set real values before flip.
3. **Existing-customer migration** — grandfather current subscribers at 0% fee, or migrate with
   notice? Affects whether §13.4 touches existing rows.
4. **Attribution window** — 7 days is conservative-generous; tighten to 24–72h if you want to
   only claim high-intent same-session conversions.
