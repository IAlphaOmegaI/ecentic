"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import {
  NotFoundError,
  RequestError,
  UnauthenticatedError,
} from "../utils/error";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import {
  isPlanKey,
  type PlanKey,
  PLANS,
  resolvePlanByPriceId,
  stripe,
} from "../utils/stripe";

export const { get, create, update, destroy, exists, find } = repository(
  schema.subscription,
);

export type Type = Document<typeof schema.subscription>;

const findByUserId = async (userId: string) => {
  const result = await find(Environment.SERVER, {
    where: eq(schema.subscription.userId, userId),
    limit: 1,
  });

  if (!result.success) return result;
  return { success: true as const, data: result.data[0] ?? null };
};

const ensureCustomer = async (record: {
  id: string;
  email: string;
  name: string;
  surname?: string | null;
}): Promise<string> => {
  const existing = await findByUserId(record.id);
  if (existing.success && existing.data?.stripeCustomerId)
    return existing.data.stripeCustomerId;

  const fullName = record.surname
    ? `${record.name} ${record.surname}`.trim()
    : record.name;

  const customer = await stripe().customers.create({
    email: record.email,
    name: fullName || undefined,
    metadata: { userId: record.id },
  });

  return customer.id;
};

const syncFromStripe = async (
  userId: string,
  customerId: string,
): Promise<Type | null> => {
  const list = await resultify(() =>
    stripe().subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
      expand: ["data.items.data.price"],
    }),
  );

  if (!list.success) return null;

  const live = list.data.data[0];
  if (!live) return null;

  const result = await upsertFromStripeSubscription(live, userId);
  if (!result.success) return null;
  return result.data;
};

export const getCurrentSubscription = withAuthentication(async (context) => {
  const existing = await findByUserId(context.session.user.id);
  if (!existing.success) return existing;

  if (!existing.data?.stripeCustomerId) {
    return { success: true as const, data: null };
  }

  const synced = await resultify(() =>
    syncFromStripe(context.session.user.id, existing.data.stripeCustomerId),
  );

  if (synced.success && synced.data) {
    return { success: true as const, data: synced.data };
  }

  return existing;
}, "Subscription.getCurrentSubscription");

export const createCheckoutSession = withAuthentication(
  async (context, payload: { plan: string }) => {
    if (!isPlanKey(payload.plan))
      return {
        success: false as const,
        error: new RequestError(`Unknown plan: ${payload.plan}`),
      };

    const plan: PlanKey = payload.plan;
    const priceId = PLANS[plan].priceId();

    if (!priceId)
      return {
        success: false as const,
        error: new RequestError(`Stripe price for plan "${plan}" is not configured`),
      };

    const customerId = await resultify(() =>
      ensureCustomer({
        id: context.session.user.id,
        email: context.session.user.email,
        name: context.session.user.name,
        surname: context.session.user.surname,
      }),
    );

    if (!customerId.success)
      return {
        success: false as const,
        error: new RequestError("Failed to create Stripe customer", {
          cause: customerId.error,
        }),
      };

    const appHost = process.env.APP_HOST;
    if (!appHost)
      return {
        success: false as const,
        error: new RequestError("APP_HOST is not configured"),
      };

    const session = await resultify(() =>
      stripe().checkout.sessions.create({
        mode: "subscription",
        customer: customerId.data,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appHost}/dashboard/settings?checkout=success`,
        cancel_url: `${appHost}/?checkout=canceled#pricing`,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        client_reference_id: context.session.user.id,
        subscription_data: {
          metadata: {
            userId: context.session.user.id,
            plan,
          },
        },
        metadata: {
          userId: context.session.user.id,
          plan,
        },
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

    const existing = await findByUserId(context.session.user.id);
    if (!existing.success) return existing;

    if (!existing.data) {
      await create(Environment.SERVER, {
        userId: context.session.user.id,
        stripeCustomerId: customerId.data,
        plan,
        status: "incomplete",
      });
    }

    return { success: true as const, data: { url: session.data.url } };
  },
  "Subscription.createCheckoutSession",
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
    const existing = await findByUserId(context.session.user.id);
    if (!existing.success) return existing;

    if (!existing.data?.stripeCustomerId)
      return { success: true as const, data: [] as InvoiceSummary[] };

    const list = await resultify(() =>
      stripe().invoices.list({
        customer: existing.data.stripeCustomerId,
        limit,
      }),
    );

    if (!list.success)
      return {
        success: false as const,
        error: new RequestError("Failed to list invoices", {
          cause: list.error,
        }),
      };

    const invoices: InvoiceSummary[] = list.data.data.map((invoice) => ({
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
    const existing = await findByUserId(context.session.user.id);
    if (!existing.success) return existing;

    if (!existing.data?.stripeCustomerId)
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

    const customerId = existing.data.stripeCustomerId;

    const session = await resultify(() =>
      stripe().billingPortal.sessions.create({
        customer: customerId,
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

const upsertFromStripeSubscription = async (
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null,
) => {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const userId =
    ((subscription.metadata?.["userId"] as string | undefined)) ??
    fallbackUserId ??
    null;

  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const plan = priceId ? resolvePlanByPriceId(priceId) : null;

  const periodStartUnix = item?.current_period_start ?? null;
  const periodEndUnix = item?.current_period_end ?? null;

  const data = {
    stripeCustomerId: customerId,
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

  const lookup = userId
    ? await findByUserId(userId)
    : await find(Environment.SERVER, {
        where: eq(schema.subscription.stripeCustomerId, customerId),
        limit: 1,
      }).then((result) =>
        result.success
          ? { success: true as const, data: result.data[0] ?? null }
          : result,
      );

  if (!lookup.success) return lookup;

  if (lookup.data) {
    return update(Environment.SERVER, lookup.data.id, data);
  }

  if (!userId)
    return {
      success: false as const,
      error: new UnauthenticatedError(
        "Cannot create subscription without a user id",
      ),
    };

  return create(Environment.SERVER, { ...data, userId });
};

export const handleStripeEvent = async (event: Stripe.Event) => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) break;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;

      const subscription = await stripe().subscriptions.retrieve(
        subscriptionId,
      );

      await upsertFromStripeSubscription(
        subscription,
        ((session.metadata?.["userId"] as string | undefined)) ??
          session.client_reference_id ??
          null,
      );
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertFromStripeSubscription(subscription);
      break;
    }
    default:
      break;
  }
};
