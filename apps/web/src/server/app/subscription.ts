"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import {
  NotFoundError,
  RequestError,
  UnauthenticatedError,
  ValidationError,
} from "../utils/error";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import {
  DEALS,
  isDealKey,
  isPlanKey,
  PLANS,
  type PlanKey,
  resolvePlanByPriceId,
  stripe,
} from "../utils/stripe";
import * as DealRedemption from "./deal-redemption";
import * as User from "./user";

export const { get, create, update, destroy, exists, find } = repository(
  schema.subscription,
);

export type Type = Document<typeof schema.subscription>;

const findByUser = withContext(async (_, { user }: { user: string }) => {
  const subscriptions = await find(Environment.SERVER, {
    where: eq(schema.subscription.userId, user),
    limit: 1,
  });

  if (!subscriptions.success) return subscriptions;
  return { success: true as const, data: subscriptions.data[0] ?? null };
}, "Subscription.findByUser");

const upsertFromStripeSubscription = withContext(
  async (
    context,
    {
      subscription,
      fallbackUser,
    }: {
      subscription: Stripe.Subscription;
      fallbackUser?: string | null;
    },
  ) => {
    const customer =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    // biome-ignore lint/complexity/useLiteralKeys: signature index property
    const user = subscription.metadata["userId"] ?? fallbackUser ?? null;

    const item = subscription.items.data[0];
    const priceId = item?.price.id ?? null;
    const plan = priceId ? resolvePlanByPriceId(priceId) : null;

    const periodStartUnix = item?.current_period_start ?? null;
    const periodEndUnix = item?.current_period_end ?? null;

    const payload = {
      // A Stripe subscription is the flat product; the performance fee never
      // rides it — pay-as-you-go is a separate billing mode.
      billingMode: "subscription" as const,
      performanceFeeEnabled: false,
      stripeCustomerId: customer,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      status: subscription.status,
      currentPeriodStart: periodStartUnix
        ? new Date(periodStartUnix * 1000)
        : null,
      currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      updatedAt: new Date(),
    };

    const lookup = await (async () => {
      if (user) return findByUser(Environment.SERVER, { user });
      const rows = await find(Environment.SERVER, {
        where: eq(schema.subscription.stripeCustomerId, customer),
        limit: 1,
      });
      if (!rows.success) return rows;
      return { success: true as const, data: rows.data[0] ?? null };
    })();

    if (!lookup.success) return lookup;

    if (lookup.data) {
      context.span.addBreadcrumb({
        category: "subscription.upsert",
        data: {
          action: "update",
          "subscription.id": lookup.data.id,
          "stripe.subscription.id": subscription.id,
          "user.id": user,
          plan,
          status: subscription.status,
        },
      });
      return update(Environment.SERVER, lookup.data.id, payload);
    }

    if (!user)
      return {
        success: false as const,
        error: new UnauthenticatedError(
          "Cannot create subscription without a user id",
        ),
      };

    context.span.addBreadcrumb({
      category: "subscription.upsert",
      data: {
        action: "create",
        "stripe.subscription.id": subscription.id,
        "user.id": user,
        plan,
        status: subscription.status,
      },
    });

    return create(Environment.SERVER, { ...payload, userId: user });
  },
  "Subscription.upsertFromStripeSubscription",
);

const syncFromStripe = withContext(
  async (_, { user, customer }: { user: string; customer: string }) => {
    const subscriptions = await resultify(() =>
      stripe().subscriptions.list({
        customer,
        status: "all",
        limit: 1,
        expand: ["data.items.data.price"],
      }),
    );

    if (!subscriptions.success) return { success: true as const, data: null };

    const active = subscriptions.data.data[0];
    if (!active) return { success: true as const, data: null };

    return upsertFromStripeSubscription(Environment.SERVER, {
      subscription: active,
      fallbackUser: user,
    });
  },
  "Subscription.syncFromStripe",
);

export const ensureCustomer = withContext(
  async (
    context,
    {
      user,
    }: {
      user: {
        id: string;
        email: string;
        name: string;
        surname?: string | null;
      };
    },
  ) => {
    const existing = await findByUser(Environment.SERVER, { user: user.id });
    if (!existing.success) return existing;
    if (existing.data?.stripeCustomerId)
      return { success: true as const, data: existing.data.stripeCustomerId };

    const fullName = user.surname
      ? `${user.name} ${user.surname}`.trim()
      : user.name;

    const customer = await resultify(() =>
      stripe().customers.create({
        email: user.email,
        name: fullName || undefined,
        metadata: { userId: user.id },
      }),
    );

    if (!customer.success)
      return {
        success: false as const,
        error: new RequestError("Failed to create Stripe customer", {
          cause: customer.error,
        }),
      };

    context.span.addBreadcrumb({
      category: "subscription.customer.created",
      data: {
        "user.id": user.id,
        "stripe.customer.id": customer.data.id,
      },
    });

    return { success: true as const, data: customer.data.id };
  },
  "Subscription.ensureCustomer",
);

export const getCurrentSubscription = withAuthentication(async (context) => {
  const existing = await findByUser(Environment.SERVER, {
    user: context.session.user.id,
  });
  if (!existing.success) return existing;
  if (!existing.data) return { success: true as const, data: null };

  // Pay-as-you-go (and pre-checkout) rows have no Stripe customer to sync from —
  // return the local row as-is.
  if (!existing.data.stripeCustomerId)
    return { success: true as const, data: existing.data };

  const synced = await syncFromStripe(Environment.SERVER, {
    user: context.session.user.id,
    customer: existing.data.stripeCustomerId,
  });

  if (synced.success && synced.data)
    return { success: true as const, data: synced.data };

  return existing;
}, "Subscription.getCurrentSubscription");

export const createCheckoutSession = withAuthentication(
  async (context, { plan }: { plan: string }) => {
    return createCheckoutSessionForUser(Environment.SERVER, {
      user: context.session.user.id,
      plan,
    });
  },
  "Subscription.createCheckoutSession",
);

export const createCheckoutSessionForUser = withContext(
  async (
    _,
    {
      user: id,
      plan,
    }: {
      user: string;
      plan: string;
    },
  ) => {
    if (!isPlanKey(plan))
      return {
        success: false as const,
        error: new RequestError(`Unknown plan: ${plan}`),
      };

    const key: PlanKey = plan;
    const priceId = PLANS[key].priceId();

    if (!priceId)
      return {
        success: false as const,
        error: new RequestError(
          `Stripe price for plan "${plan}" is not configured`,
        ),
      };

    const user = await User.get(Environment.SERVER, id);
    if (!user.success) return user;
    if (!user.data)
      return {
        success: false as const,
        error: new NotFoundError("User not found"),
      };

    const customer = await ensureCustomer(Environment.SERVER, {
      user: user.data,
    });
    if (!customer.success) return customer;

    const appHost = process.env.APP_HOST;
    if (!appHost)
      return {
        success: false as const,
        error: new RequestError("APP_HOST is not configured"),
      };

    // Auto-apply a partner deal coupon when this user's email matches a deal
    // redemption we've verified and approved. The terms belong to the Stripe
    // coupon (see `DEALS`), not to this call site.
    //
    // Redemptions stay "pending" until someone approves them, and nothing here
    // does that automatically: `DealAllowlist.matches` only fires on company
    // domains, so a founder who redeems with a personal address is always left
    // pending. Approval is a manual step today — until it happens, this resolves
    // to `null` and the founder pays full price with no signal that a deal was
    // ever owed to them.
    const redemption = await DealRedemption.findByEmail(Environment.SERVER, {
      email: user.data.email,
    });

    const deal = (() => {
      if (!redemption.success || !redemption.data) return null;
      if (redemption.data.status !== "approved") return null;
      const { merchant } = redemption.data;
      if (!isDealKey(merchant)) return null;
      const coupon = DEALS[merchant].coupon();
      if (!coupon) return null;
      return { merchant, coupon };
    })();

    const session = await resultify(() =>
      stripe().checkout.sessions.create({
        mode: "subscription",
        customer: customer.data,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appHost}/dashboard/settings?checkout=success`,
        cancel_url: `${appHost}/?checkout=canceled#pricing`,
        // Stripe forbids `discounts` and `allow_promotion_codes` together.
        ...(deal
          ? { discounts: [{ coupon: deal.coupon }] }
          : { allow_promotion_codes: true }),
        billing_address_collection: "auto",
        client_reference_id: id,
        subscription_data: {
          metadata: deal
            ? { userId: id, plan: key, deal: deal.merchant }
            : { userId: id, plan: key },
        },
        metadata: { userId: id, plan: key },
      }),
    );

    if (!session.success)
      return {
        success: false as const,
        error: new RequestError("Failed to create Stripe checkout session", {
          cause: session.error,
        }),
      };

    if (!session.data.url)
      return {
        success: false as const,
        error: new RequestError("Stripe did not return a checkout URL"),
      };

    const existing = await findByUser(Environment.SERVER, {
      user: id,
    });
    if (!existing.success) return existing;

    if (!existing.data) {
      await create(Environment.SERVER, {
        userId: id,
        billingMode: "subscription",
        stripeCustomerId: customer.data,
        plan: key,
        status: "incomplete",
      });
    }

    return { success: true as const, data: { url: session.data.url } };
  },
  "Subscription.createCheckoutSessionForUser",
);

export type InvoiceSummary = {
  id: string;
  number: string | null;
  status: string;
  amountPaid: number;
  currency: string;
  createdAt: Date;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
};

export const listInvoices = withAuthentication(
  async (context, { limit = 12 }: { limit?: number } = {}) => {
    const existing = await findByUser(Environment.SERVER, {
      user: context.session.user.id,
    });
    if (!existing.success) return existing;

    const stripeCustomerId = existing.data?.stripeCustomerId;
    if (!stripeCustomerId)
      return { success: true as const, data: [] as InvoiceSummary[] };

    const response = await resultify(() =>
      stripe().invoices.list({ customer: stripeCustomerId, limit }),
    );

    if (!response.success)
      return {
        success: false as const,
        error: new RequestError("Failed to list invoices", {
          cause: response.error,
        }),
      };

    const invoices: InvoiceSummary[] = response.data.data.map((invoice) => ({
      id: invoice.id ?? "",
      number: invoice.number,
      status: invoice.status ?? "draft",
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      createdAt: new Date(invoice.created * 1000),
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
    }));

    return { success: true as const, data: invoices };
  },
  "Subscription.listInvoices",
);

export const createBillingPortalSession = withAuthentication(
  async (context) => {
    const existing = await findByUser(Environment.SERVER, {
      user: context.session.user.id,
    });
    if (!existing.success) return existing;

    const customer = existing.data?.stripeCustomerId;
    if (!customer)
      return {
        success: false as const,
        error: new NotFoundError("No Stripe customer for current user"),
      };

    const appHost = process.env.APP_HOST;
    if (!appHost)
      return {
        success: false as const,
        error: new RequestError("APP_HOST is not configured"),
      };

    const session = await resultify(() =>
      stripe().billingPortal.sessions.create({
        customer,
        return_url: `${appHost}/dashboard/settings`,
      }),
    );

    if (!session.success)
      return {
        success: false as const,
        error: new RequestError("Failed to create billing portal session", {
          cause: session.error,
        }),
      };

    return { success: true as const, data: { url: session.data.url } };
  },
  "Subscription.createBillingPortalSession",
);

/**
 * Whether a pay-as-you-go customer has a saved card we can charge. A PAYG
 * account has no Stripe customer (null) until the merchant adds one; the
 * period-close cron uses this to choose between charging and `awaiting_payment`.
 */
export const customerHasPaymentMethod = withContext(
  async (_, { customer }: { customer: string }) => {
    const methods = await resultify(() =>
      stripe().paymentMethods.list({ customer, type: "card", limit: 1 }),
    );
    if (!methods.success)
      return {
        success: false as const,
        error: new RequestError("Failed to list payment methods", {
          cause: methods.error,
        }),
      };

    return { success: true as const, data: methods.data.data.length > 0 };
  },
  "Subscription.customerHasPaymentMethod",
);

/**
 * Charges a pay-as-you-go performance fee as a one-off invoice against the
 * customer's saved card. `cents` is the not-yet-reported billed delta for the
 * period; the caller (cron) enforces the cap, so this only ever charges up to
 * `min(accrued, cap) - alreadyReported`. Returns the invoice id.
 */
export const chargePerformanceFee = withContext(
  async (
    _,
    {
      customer,
      cents,
      currency = "usd",
      description,
    }: {
      customer: string;
      cents: number;
      currency?: string;
      description: string;
    },
  ) => {
    if (cents <= 0) return { success: true as const, data: { invoice: null } };

    const methods = await resultify(() =>
      stripe().paymentMethods.list({ customer, type: "card", limit: 1 }),
    );
    if (!methods.success)
      return {
        success: false as const,
        error: new RequestError("Failed to list payment methods", {
          cause: methods.error,
        }),
      };

    const method = methods.data.data[0];
    if (!method)
      return {
        success: false as const,
        error: new ValidationError("Customer has no payment method on file"),
      };

    const item = await resultify(() =>
      stripe().invoiceItems.create({
        customer,
        amount: cents,
        currency,
        description,
      }),
    );
    if (!item.success)
      return {
        success: false as const,
        error: new RequestError("Failed to create invoice item", {
          cause: item.error,
        }),
      };

    // Gathers the pending invoice item above; `auto_advance` finalizes and
    // charges the saved card automatically.
    const invoice = await resultify(() =>
      stripe().invoices.create({
        customer,
        collection_method: "charge_automatically",
        default_payment_method: method.id,
        auto_advance: true,
        description,
      }),
    );
    if (!invoice.success)
      return {
        success: false as const,
        error: new RequestError("Failed to create invoice", {
          cause: invoice.error,
        }),
      };

    return {
      success: true as const,
      data: { invoice: invoice.data.id ?? null },
    };
  },
  "Subscription.chargePerformanceFee",
);

export const handleStripeEvent = withContext(
  async (context, { event }: { event: Stripe.Event }) => {
    context.span.addBreadcrumb({
      category: "subscription.webhook.received",
      data: {
        "event.id": event.id,
        "event.type": event.type,
      },
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription)
          return { success: true as const, data: { handled: false } };

        const id =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        const retrieved = await resultify(() =>
          stripe().subscriptions.retrieve(id),
        );
        if (!retrieved.success)
          return {
            success: false as const,
            error: new RequestError(
              "Failed to retrieve Stripe subscription from webhook",
              { cause: retrieved.error },
            ),
          };

        const upserted = await upsertFromStripeSubscription(
          Environment.SERVER,
          {
            subscription: retrieved.data,
            fallbackUser:
              // biome-ignore lint/complexity/useLiteralKeys: Stripe.Metadata is an index signature; TS requires bracket access
              (session.metadata?.["userId"] as string | undefined) ??
              session.client_reference_id ??
              null,
          },
        );
        if (!upserted.success) return upserted;

        return { success: true as const, data: { handled: true } };
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        const upserted = await upsertFromStripeSubscription(
          Environment.SERVER,
          {
            subscription,
          },
        );
        if (!upserted.success) return upserted;

        return { success: true as const, data: { handled: true } };
      }
      default:
        return { success: true as const, data: { handled: false } };
    }
  },
  "Subscription.handleStripeEvent",
);
