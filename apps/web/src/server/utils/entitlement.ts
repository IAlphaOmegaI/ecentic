import type { Result, UnwrapResult } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { schema } from "../database";
import {
  type AuthenticatedContext,
  withAuthentication,
} from "./authentication";
import type { Enhancer } from "./context";
import { Environment } from "./environment";
import { type DatabaseError, SubscriptionRequiredError } from "./error";
import { type Document, repository } from "./repository";

type SubscriptionDocument = Document<typeof schema.subscription>;

export type EntitledContext = AuthenticatedContext & {
  subscription: SubscriptionDocument;
};

/**
 * Stripe statuses that keep a flat subscription's features unlocked.
 * `past_due` grants grace while Stripe retries the card; `unpaid` (retries
 * exhausted), `paused`, `canceled`, and the pre-checkout `incomplete`
 * placeholder row do not. Deliberately stricter than the display set in the
 * billing section — a badge may still show a lapsed plan, but features stop.
 */
const ENTITLED_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

/**
 * Whether a billing row unlocks paid features: an activated pay-as-you-go
 * account (billed only via the performance fee) or a flat subscription in good
 * standing. Free Scan accounts have no row at all and are never entitled.
 */
export const isEntitled = (
  subscription: SubscriptionDocument | null | undefined,
): subscription is SubscriptionDocument => {
  if (!subscription) return false;

  if (subscription.billingMode === "payg")
    return subscription.status === "active";

  return (
    subscription.plan !== null &&
    ENTITLED_SUBSCRIPTION_STATUSES.has(subscription.status)
  );
};

const { find } = repository(schema.subscription);

/**
 * One subscription read per request, shared by every entitled action — the
 * same shape as `readSession` in `authentication.ts`. A dashboard render fans
 * out to several gated actions at once; keyed on the user id, they all settle
 * on a single row read. Outside a request scope React hands back a fresh store
 * per call, degrading to no memoization rather than leaking a row between
 * users.
 */
const readSubscription = cache(async (user: string) =>
  find(Environment.SERVER, {
    where: eq(schema.subscription.userId, user),
    limit: 1,
  }),
);

export const entitle: Enhancer<
  AuthenticatedContext,
  EntitledContext,
  SubscriptionRequiredError | DatabaseError
> = async (base) => {
  const subscriptions = await readSubscription(base.session.user.id);
  if (!subscriptions.success) return subscriptions;

  const subscription = subscriptions.data[0] ?? null;

  if (!isEntitled(subscription))
    return {
      success: false,
      error: new SubscriptionRequiredError(
        "An active plan is required for this feature. Pick one in billing settings.",
      ),
    };

  base.span.setAttribute("subscription.plan", subscription.plan ?? "payg");

  return { success: true, data: { ...base, subscription } };
};

/**
 * `withAuthentication` plus billing entitlement: the action only runs for an
 * account whose plan unlocks paid features (see `isEntitled`), with the
 * subscription row attached as `context.subscription`. Free accounts get a
 * `SubscriptionRequiredError` — expected, never reported as a defect.
 */
export const withSubscription = withAuthentication.append(entitle);

/**
 * `unwrapResult` for render-path reads of gated actions: resolves the missing
 * plan to `null` instead of throwing. Gated pages render beneath the paywall
 * overlay (`SubscriptionGate`), and there are no error boundaries under the
 * dashboard — a throw would replace the whole route, paywall included, with
 * the error page. Every other failure still throws exactly like
 * `unwrapResult`.
 */
export const unwrapEntitled = <T extends Result<unknown>>(
  result: T,
): UnwrapResult<T> | null => {
  if (!result.success) {
    if (result.error.name === SubscriptionRequiredError.errorName) return null;

    throw result.error;
  }

  return ("data" in result ? result.data : undefined) as UnwrapResult<T>;
};
