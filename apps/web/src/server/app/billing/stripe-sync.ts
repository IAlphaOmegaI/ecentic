import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { schema } from "../../database";
import { withInstrumentation } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { RequestError, UnauthenticatedError } from "../../utils/error";
import { repository } from "../../utils/repository";
import { resolvePlanByPriceId, stripe } from "../../utils/stripe";

/**
 * Reconciles Stripe's view of a subscription into the local billing row.
 *
 * Deliberately NOT `"use server"`, and that is why this module exists rather
 * than staying in `subscription.ts`. Every export of a `"use server"` module is
 * a callable server action: `upsertFromStripeSubscription` takes a
 * caller-supplied `Stripe.Subscription`, so exporting it from there would let
 * anyone forge one carrying their own `metadata.userId` and a real plan price id
 * and hand themselves a paid plan. `handleStripeEvent` moved here for the same
 * reason with a sharper edge — its signature check lives in the route handler,
 * not in the action, so an exported action is a door straight past the HMAC.
 *
 * Everything here is `withInstrumentation` rather than `withContext`. These run
 * on the webhook rail and from CLI scripts (`scripts/grant-trial.ts`), and
 * `withContext` awaits `headers()`, which throws outside a request scope. The
 * request-level Sentry instrumentation still happens once, at whichever exported
 * action or route handler called in.
 */

const { find, update, upsert } = repository(schema.subscription);

export const findByUser = withInstrumentation(
  async (_, { user }: { user: string }) => {
    const subscriptions = await find(Environment.SERVER, {
      where: eq(schema.subscription.userId, user),
      limit: 1,
    });

    if (!subscriptions.success) return subscriptions;
    return { success: true as const, data: subscriptions.data[0] ?? null };
  },
  "StripeSync.findByUser",
);

/**
 * Which local account a Stripe subscription belongs to.
 *
 * Its own export so the fallback order is testable without a database: a
 * webhook carrying neither `metadata.userId` nor a caller fallback resolves to
 * `null`, and the upsert below can then only ever *update* a row it recognises
 * by customer id — never create one.
 */
export const resolveUserId = (
  subscription: Stripe.Subscription,
  fallback?: string | null,
) =>
  // biome-ignore lint/complexity/useLiteralKeys: Stripe.Metadata is an index signature; TS requires bracket access
  subscription.metadata["userId"] ?? fallback ?? null;

export const upsertFromStripeSubscription = withInstrumentation(
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

    const user = resolveUserId(subscription, fallbackUser);

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

    context.span.addBreadcrumb({
      category: "subscription.upsert",
      data: {
        "stripe.subscription.id": subscription.id,
        "user.id": user,
        plan,
        status: subscription.status,
      },
    });

    // One atomic statement when the account is known, rather than
    // read-then-write. Granting a trial writes this row from the script while
    // Stripe's `customer.subscription.created` webhook writes it from the other
    // side within the same second; `userId` is UNIQUE, so a find-then-create
    // would race two inserts and lose one to a constraint violation. Whoever
    // lands second now updates instead. `set` is the payload alone, so a
    // conflict never rewrites `userId` or `createdAt`.
    if (user)
      return upsert(
        Environment.SERVER,
        { ...payload, userId: user },
        { target: [schema.subscription.userId], set: payload },
      );

    // No account to attribute this to, so the only safe move is updating a row
    // still recognisable by its Stripe customer. Creating one is impossible —
    // `userId` is NOT NULL and there is nothing to put in it.
    const rows = await find(Environment.SERVER, {
      where: eq(schema.subscription.stripeCustomerId, customer),
      limit: 1,
    });
    if (!rows.success) return rows;

    const existing = rows.data[0] ?? null;
    if (existing) return update(Environment.SERVER, existing.id, payload);

    return {
      success: false as const,
      error: new UnauthenticatedError(
        "Cannot create subscription without a user id",
      ),
    };
  },
  "StripeSync.upsertFromStripeSubscription",
);

export const syncFromStripe = withInstrumentation(
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
  "StripeSync.syncFromStripe",
);

export const ensureCustomer = withInstrumentation(
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
  "StripeSync.ensureCustomer",
);

export const handleStripeEvent = withInstrumentation(
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
  "StripeSync.handleStripeEvent",
);
