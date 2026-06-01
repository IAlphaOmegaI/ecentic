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
} from "../utils/error";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import {
  isPlanKey,
  PLANS,
  type PlanKey,
  resolvePlanByPriceId,
  stripe,
} from "../utils/stripe";
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

    const user =
      (subscription.metadata?.["userId"] as string | undefined) ??
      fallbackUser ??
      null;

    const item = subscription.items.data[0];
    const priceId = item?.price.id ?? null;
    const plan = priceId ? resolvePlanByPriceId(priceId) : null;

    const periodStartUnix = item?.current_period_start ?? null;
    const periodEndUnix = item?.current_period_end ?? null;

    const payload = {
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

const ensureCustomer = withContext(
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
  if (!existing.data.stripeCustomerId)
    return { success: true as const, data: null };

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

    const session = await resultify(() =>
      stripe().checkout.sessions.create({
        mode: "subscription",
        customer: customer.data,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appHost}/dashboard/settings?checkout=success`,
        cancel_url: `${appHost}/?checkout=canceled#pricing`,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        client_reference_id: id,
        subscription_data: {
          metadata: { userId: id, plan: key },
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
