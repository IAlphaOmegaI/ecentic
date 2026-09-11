import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { schema } from "../../database";
import { withInstrumentation } from "../../utils/context";
import { Environment } from "../../utils/environment";
import {
  ConflictError,
  NotFoundError,
  RequestError,
  ValidationError,
} from "../../utils/error";
import { repository } from "../../utils/repository";
import {
  isPlanKey,
  PLANS,
  type PlanKey,
  resolvePlanByPriceId,
  stripe,
} from "../../utils/stripe";
import * as StripeSync from "./stripe-sync";

/**
 * Granting, extending and ending a no-card free trial.
 *
 * Driven by `scripts/grant-trial.ts` — this happens a handful of times a
 * quarter, so there is no admin page and deliberately no server action. Like
 * {@link StripeSync} this module is NOT `"use server"`: `grant` hands out a paid
 * plan, and an exported server action doing that is a self-serve upgrade button
 * for anyone who can reach it.
 *
 * The mechanism is a plain Stripe subscription on the real plan price with a
 * trial and no payment method. Nothing local needed inventing:
 * `ENTITLED_SUBSCRIPTION_STATUSES` in `utils/entitlement.ts` already counts
 * `trialing` as entitled and `paused` as not, so a trial unlocks the product on
 * day one and stops on its own at the end. There is deliberately no local
 * "free until" date that Stripe does not also hold.
 */

const { find } = repository(schema.user);
const { create, update } = repository(schema.subscription);

/**
 * Stripe rejects a `trial_end` that is not far enough in the future, and a
 * one-day trial is a mis-typed argument far more often than an intention.
 */
export const TRIAL_MINIMUM_DAYS = 2;

/** Two years is Stripe's own ceiling on `trial_end`; stay well inside it. */
export const TRIAL_MAXIMUM_DAYS = 365;

/**
 * Stripe statuses that mean "this customer already has a subscription we should
 * not duplicate". Wider than `ENTITLED_SUBSCRIPTION_STATUSES` on purpose: an
 * `incomplete` or `paused` subscription grants nothing, but a second one
 * alongside it still bills and confuses every surface that reads "the"
 * subscription.
 */
const LIVE_STRIPE_STATUSES = new Set<string>([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
]);

export const isLiveStripeStatus = (status: string) =>
  LIVE_STRIPE_STATUSES.has(status);

/**
 * What Stripe does when the trial runs out and no card was ever added.
 *
 * `pause` puts the subscription in Stripe's `paused` status, which
 * `ENTITLED_SUBSCRIPTION_STATUSES` does not accept — so access stops by itself
 * and nobody has to remember to switch it off. The alternatives are both worse
 * for a merchant who was never asked for a card: `create_invoice` leaves an
 * unpaid bill against them, and `cancel` destroys the subscription we would want
 * to convert. Pinned as a constant because it is the single value this whole
 * design rests on.
 */
export const TRIAL_END_BEHAVIOR = "pause" as const satisfies NonNullable<
  Stripe.SubscriptionCreateParams.TrialSettings["end_behavior"]
>["missing_payment_method"];

export const trialEndFrom = (days: number, now = new Date()) =>
  Math.floor(now.getTime() / 1000) + days * 24 * 60 * 60;

export const daysProblem = (days: number) => {
  if (!Number.isInteger(days))
    return `Trial length must be a whole number of days, got ${days}`;
  if (days < TRIAL_MINIMUM_DAYS)
    return `Trial must run at least ${TRIAL_MINIMUM_DAYS} days, got ${days}`;
  if (days > TRIAL_MAXIMUM_DAYS)
    return `Trial must run at most ${TRIAL_MAXIMUM_DAYS} days, got ${days}`;
  return null;
};

/**
 * Why this price cannot carry a trial, or `null` if it can.
 *
 * The check that matters is the last one. `isEntitled` requires
 * `plan !== null` for a flat subscription, and `plan` is resolved from the price
 * id by `resolvePlanByPriceId` — so a subscription created on a bespoke or
 * zero-amount price reads as `trialing` in Stripe and as *unentitled* here. The
 * merchant would be paywalled on an account we believe we made generous. Round
 * -tripping the id back through the same resolver the webhook uses is what makes
 * that impossible.
 */
export const priceProblem = ({
  price,
  plan,
}: {
  price: Pick<Stripe.Price, "id" | "active" | "type">;
  plan: PlanKey;
}) => {
  if (!price.active) return `Stripe price ${price.id} is archived`;
  if (price.type !== "recurring")
    return `Stripe price ${price.id} is ${price.type}, not recurring`;

  const resolved = resolvePlanByPriceId(price.id);
  if (resolved !== plan)
    return `Stripe price ${price.id} resolves to ${resolved ?? "no plan"}, not "${plan}" — a subscription on it would read as unentitled`;

  return null;
};

/**
 * Why this account cannot be granted a trial, or `null` if it can.
 *
 * The one row that is safe to reuse is the placeholder
 * `createCheckoutSessionForUser` leaves behind when a merchant opened checkout
 * and never finished: billing mode `subscription`, a customer id, and no
 * subscription. Anything carrying a `stripeSubscriptionId` is a real
 * subscription that a second one would sit beside and eventually double-bill,
 * and a pay-as-you-go row is a different product whose conversion is a decision
 * for a person, not a side effect of this script.
 */
export const existingSubscriptionProblem = (
  subscription: {
    plan: string | null;
    status: string;
    billingMode: "payg" | "subscription";
    stripeSubscriptionId: string | null;
  } | null,
) => {
  if (!subscription) return null;

  if (subscription.stripeSubscriptionId)
    return `Account already has Stripe subscription ${subscription.stripeSubscriptionId} (${subscription.plan ?? "no plan"}, ${subscription.status}) — revoke it first`;

  if (subscription.billingMode === "payg")
    return "Account is on pay-as-you-go — cancel that before granting a flat-plan trial";

  return null;
};

/** Why this trial cannot be moved to `next`, or `null` if it can. */
export const extensionProblem = ({
  current,
  next,
}: {
  current: number | null;
  next: number;
}) => {
  if (current === null) return "Subscription is not on a trial";
  if (next <= current)
    return `Refusing to shorten a trial: it already runs to ${new Date(current * 1000).toISOString()}`;
  return null;
};

const findUserByEmail = withInstrumentation(
  async (_, { email }: { email: string }) => {
    const users = await find(Environment.SERVER, {
      where: eq(schema.user.email, email),
      limit: 1,
    });
    if (!users.success) return users;

    const user = users.data[0] ?? null;
    if (!user)
      return {
        success: false as const,
        error: new NotFoundError(
          `No account for ${email}. They have to sign up at /sign-up first — this never creates one.`,
        ),
      };

    return { success: true as const, data: user };
  },
  "Trial.findUserByEmail",
);

/**
 * The account's Stripe subscription, or `null`. Read from Stripe rather than
 * from the local row because that is what the guards need to be true about: a
 * previous run that created a subscription and then died before writing the row
 * leaves nothing local to find, and re-running would otherwise open a second
 * subscription on the same customer.
 */
const liveSubscriptionFor = withInstrumentation(
  async (_, { customer }: { customer: string }) => {
    const subscriptions = await resultify(() =>
      stripe().subscriptions.list({ customer, status: "all", limit: 100 }),
    );
    if (!subscriptions.success)
      return {
        success: false as const,
        error: new RequestError("Failed to list Stripe subscriptions", {
          cause: subscriptions.error,
        }),
      };

    const live =
      subscriptions.data.data.find((subscription) =>
        isLiveStripeStatus(subscription.status),
      ) ?? null;

    return { success: true as const, data: live };
  },
  "Trial.liveSubscriptionFor",
);

export const grant = withInstrumentation(
  async (
    context,
    { email, plan, days }: { email: string; plan: string; days: number },
  ) => {
    if (!isPlanKey(plan))
      return {
        success: false as const,
        error: new ValidationError(
          `Unknown plan "${plan}". One of: ${Object.keys(PLANS).join(", ")}`,
        ),
      };

    const invalidDays = daysProblem(days);
    if (invalidDays)
      return {
        success: false as const,
        error: new ValidationError(invalidDays),
      };

    // Before Stripe is touched at all: a plan whose price id was never
    // configured in this environment cannot be granted, and finding that out
    // after creating a customer leaves debris behind.
    const priceId = PLANS[plan].priceId();
    if (!priceId)
      return {
        success: false as const,
        error: new ValidationError(
          `Stripe price for plan "${plan}" is not configured (STRIPE_SUB_${plan.toUpperCase()} is unset in this environment)`,
        ),
      };

    const user = await findUserByEmail(Environment.SERVER, { email });
    if (!user.success) return user;

    const existing = await StripeSync.findByUser(Environment.SERVER, {
      user: user.data.id,
    });
    if (!existing.success) return existing;

    const occupied = existingSubscriptionProblem(existing.data);
    if (occupied)
      return { success: false as const, error: new ConflictError(occupied) };

    const price = await resultify(() => stripe().prices.retrieve(priceId));
    if (!price.success)
      return {
        success: false as const,
        error: new RequestError(
          `Failed to read Stripe price ${priceId} — STRIPE_SUB_${plan.toUpperCase()} may point at a price that does not exist in this Stripe account`,
          { cause: price.error },
        ),
      };

    const unusable = priceProblem({ price: price.data, plan });
    if (unusable)
      return { success: false as const, error: new ValidationError(unusable) };

    const customer = await StripeSync.ensureCustomer(Environment.SERVER, {
      user: user.data,
    });
    if (!customer.success) return customer;

    // Persist the customer before creating the subscription, mirroring
    // `createCheckoutSessionForUser`. Without this, a crash between the two
    // calls orphans a Stripe customer the next run cannot find, and the
    // duplicate guard below would be looking at a fresh customer with no
    // subscriptions on it.
    const persisted = await (async () => {
      if (!existing.data)
        return create(Environment.SERVER, {
          userId: user.data.id,
          billingMode: "subscription",
          stripeCustomerId: customer.data,
          plan,
          status: "incomplete",
        });

      if (existing.data.stripeCustomerId === customer.data)
        return { success: true as const, data: existing.data };

      return update(Environment.SERVER, existing.data.id, {
        stripeCustomerId: customer.data,
        updatedAt: new Date(),
      });
    })();
    if (!persisted.success) return persisted;

    const live = await liveSubscriptionFor(Environment.SERVER, {
      customer: customer.data,
    });
    if (!live.success) return live;

    if (live.data)
      return {
        success: false as const,
        error: new ConflictError(
          `Stripe customer ${customer.data} already has subscription ${live.data.id} (${live.data.status}) — not creating a second one`,
        ),
      };

    const trialEnd = trialEndFrom(days);

    const created = await resultify(() =>
      stripe().subscriptions.create({
        customer: customer.data,
        items: [{ price: priceId }],
        trial_end: trialEnd,
        // No card is collected, so say what happens when the trial runs out.
        // `pause` lands the subscription in Stripe's `paused` status, which
        // `isEntitled` does not accept — access stops on its own and nobody has
        // to remember to switch it off. `create_invoice` would instead leave an
        // unpaid invoice against a merchant who was never asked for a card.
        trial_settings: {
          end_behavior: { missing_payment_method: TRIAL_END_BEHAVIOR },
        },
        // The webhook resolves the account from this and nothing else when no
        // checkout session carried a `client_reference_id`; without it the
        // `customer.subscription.*` events for this subscription can only ever
        // update a row that already exists.
        metadata: { userId: user.data.id, plan, source: "grant-trial" },
      }),
    );

    if (!created.success)
      return {
        success: false as const,
        error: new RequestError("Failed to create the Stripe trial", {
          cause: created.error,
        }),
      };

    // Read back rather than trusting the argument above: everything downstream
    // — this run's own write and every later webhook — resolves the account
    // through this field.
    const stamped = StripeSync.resolveUserId(created.data);
    if (stamped !== user.data.id)
      return {
        success: false as const,
        error: new RequestError(
          `Stripe subscription ${created.data.id} came back with metadata.userId=${stamped ?? "unset"}, expected ${user.data.id}. It exists in Stripe — cancel it there before retrying.`,
        ),
      };

    // Written here rather than waiting on the webhook: the webhook is what keeps
    // this row current, not something to sit and watch while a founder is on the
    // phone. Same upsert the webhook uses, and it is a single atomic statement,
    // so whichever of the two lands second updates instead of colliding.
    const stored = await StripeSync.upsertFromStripeSubscription(
      Environment.SERVER,
      { subscription: created.data },
    );
    if (!stored.success) return stored;

    context.span.addBreadcrumb({
      category: "trial.granted",
      data: {
        "user.id": user.data.id,
        "stripe.subscription.id": created.data.id,
        plan,
        days,
      },
    });

    return {
      success: true as const,
      data: {
        user: user.data,
        plan,
        subscription: created.data.id,
        status: created.data.status,
        trialEnd: created.data.trial_end,
        row: stored.data,
      },
    };
  },
  "Trial.grant",
);

export const extend = withInstrumentation(
  async (context, { email, days }: { email: string; days: number }) => {
    const invalidDays = daysProblem(days);
    if (invalidDays)
      return {
        success: false as const,
        error: new ValidationError(invalidDays),
      };

    const user = await findUserByEmail(Environment.SERVER, { email });
    if (!user.success) return user;

    const existing = await StripeSync.findByUser(Environment.SERVER, {
      user: user.data.id,
    });
    if (!existing.success) return existing;

    const id = existing.data?.stripeSubscriptionId;
    if (!id)
      return {
        success: false as const,
        error: new NotFoundError(
          `${email} has no Stripe subscription to extend — grant one first`,
        ),
      };

    const current = await resultify(() => stripe().subscriptions.retrieve(id));
    if (!current.success)
      return {
        success: false as const,
        error: new RequestError(`Failed to read Stripe subscription ${id}`, {
          cause: current.error,
        }),
      };

    if (current.data.status !== "trialing")
      return {
        success: false as const,
        error: new ConflictError(
          `Subscription ${id} is ${current.data.status}, not trialing — there is no trial to extend`,
        ),
      };

    const next = trialEndFrom(days);

    const refusal = extensionProblem({
      current: current.data.trial_end,
      next,
    });
    if (refusal)
      return { success: false as const, error: new ValidationError(refusal) };

    // `update`, never `create` — a second subscription would double-bill the
    // moment either one leaves its trial.
    const extended = await resultify(() =>
      stripe().subscriptions.update(id, { trial_end: next }),
    );
    if (!extended.success)
      return {
        success: false as const,
        error: new RequestError(`Failed to extend Stripe subscription ${id}`, {
          cause: extended.error,
        }),
      };

    const stored = await StripeSync.upsertFromStripeSubscription(
      Environment.SERVER,
      { subscription: extended.data, fallbackUser: user.data.id },
    );
    if (!stored.success) return stored;

    context.span.addBreadcrumb({
      category: "trial.extended",
      data: {
        "user.id": user.data.id,
        "stripe.subscription.id": id,
        from: current.data.trial_end,
        to: extended.data.trial_end,
      },
    });

    return {
      success: true as const,
      data: {
        user: user.data,
        subscription: id,
        status: extended.data.status,
        previousTrialEnd: current.data.trial_end,
        trialEnd: extended.data.trial_end,
        row: stored.data,
      },
    };
  },
  "Trial.extend",
);

export const revoke = withInstrumentation(
  async (context, { email }: { email: string }) => {
    const user = await findUserByEmail(Environment.SERVER, { email });
    if (!user.success) return user;

    const existing = await StripeSync.findByUser(Environment.SERVER, {
      user: user.data.id,
    });
    if (!existing.success) return existing;

    const id = existing.data?.stripeSubscriptionId;
    if (!id)
      return {
        success: false as const,
        error: new NotFoundError(
          `${email} has no Stripe subscription to revoke`,
        ),
      };

    const canceled = await resultify(() => stripe().subscriptions.cancel(id));
    if (!canceled.success)
      return {
        success: false as const,
        error: new RequestError(`Failed to cancel Stripe subscription ${id}`, {
          cause: canceled.error,
        }),
      };

    // `canceled` is not in `ENTITLED_SUBSCRIPTION_STATUSES`, so writing the
    // cancelled subscription back is what drops the account to no plan.
    const stored = await StripeSync.upsertFromStripeSubscription(
      Environment.SERVER,
      { subscription: canceled.data, fallbackUser: user.data.id },
    );
    if (!stored.success) return stored;

    context.span.addBreadcrumb({
      category: "trial.revoked",
      data: {
        "user.id": user.data.id,
        "stripe.subscription.id": id,
      },
    });

    return {
      success: true as const,
      data: {
        user: user.data,
        subscription: id,
        status: canceled.data.status,
        row: stored.data,
      },
    };
  },
  "Trial.revoke",
);
