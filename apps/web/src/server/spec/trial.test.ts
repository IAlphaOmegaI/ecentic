import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type Stripe from "stripe";
import { resolveUserId } from "../app/billing/stripe-sync";
import {
  daysProblem,
  existingSubscriptionProblem,
  extensionProblem,
  grant,
  isLiveStripeStatus,
  priceProblem,
  TRIAL_END_BEHAVIOR,
  trialEndFrom,
} from "../app/billing/trial";
import { isEntitled } from "../utils/entitlement";
import { Environment } from "../utils/environment";
import { resolvePlanByPriceId } from "../utils/stripe";

/**
 * The free-trial mechanism, at the two levels that can be checked without a
 * database or a Stripe account: the entitlement arithmetic a granted trial has
 * to satisfy, and the guards that decide whether `grant` is allowed to reach
 * Stripe at all.
 *
 * Cases 2 and 3 come first deliberately — a trial that silently paywalls the
 * merchant, and a trial that never stops, are the two failures that would be
 * expensive with a real customer on the other end.
 */

const SCALE_PRICE = "price_scale_configured";
const COMPETE_PRICE = "price_compete_configured";
const DOMINATE_PRICE = "price_dominate_configured";

const PRICE_VARIABLES = [
  "STRIPE_SUB_COMPETE",
  "STRIPE_SUB_SCALE",
  "STRIPE_SUB_DOMINATE",
] as const;

/**
 * `process.env` is typed readonly here, and these tests need the price ids to
 * move. Written through a variable key so neither the readonly type nor the
 * index-signature rule needs an escape hatch, and `delete` rather than an
 * assigned `undefined`, which Node coerces to the string "undefined" — which
 * would sail straight past the guard under test.
 */
const environment = process.env as Record<string, string | undefined>;
const original = { ...process.env };

const setVariable = (name: string, value: string | undefined) => {
  if (value === undefined) delete environment[name];
  else environment[name] = value;
};

beforeEach(() => {
  setVariable("STRIPE_SUB_COMPETE", COMPETE_PRICE);
  setVariable("STRIPE_SUB_SCALE", SCALE_PRICE);
  setVariable("STRIPE_SUB_DOMINATE", DOMINATE_PRICE);
});

afterEach(() => {
  for (const name of PRICE_VARIABLES) setVariable(name, original[name]);
});

/** A stored billing row, with only the fields entitlement actually reads. */
const row = (
  overrides: Partial<{
    billingMode: "payg" | "subscription";
    plan: string | null;
    status: string;
  }> = {},
) =>
  ({
    billingMode: "subscription" as const,
    plan: "scale" as string | null,
    status: "trialing",
    ...overrides,
    // biome-ignore lint/suspicious/noExplicitAny: entitlement reads three fields; the rest of the row is irrelevant here
  }) as any;

const price = (overrides: Partial<Stripe.Price> = {}) =>
  ({
    id: SCALE_PRICE,
    active: true,
    type: "recurring" as const,
    ...overrides,
  }) as Pick<Stripe.Price, "id" | "active" | "type">;

// --- case 2: a price outside the three configured ones -----------------------

describe("a price that is not one of the three configured plans", () => {
  test("resolves to no plan", () => {
    expect(resolvePlanByPriceId("price_bespoke_zero")).toBeNull();
  });

  test("is NOT entitled even while Stripe reports trialing", () => {
    // The trap: generous in Stripe, paywalled in the product.
    expect(isEntitled(row({ plan: null, status: "trialing" }))).toBe(false);
  });

  test("is refused by the price guard before anything is created", () => {
    expect(
      priceProblem({
        price: price({ id: "price_bespoke_zero" }),
        plan: "scale",
      }),
    ).toContain("would read as unentitled");
  });

  test("a price belonging to a different plan is refused too", () => {
    expect(
      priceProblem({ price: price({ id: COMPETE_PRICE }), plan: "scale" }),
    ).toContain("resolves to compete");
  });

  test("an archived or one-off price is refused", () => {
    expect(
      priceProblem({ price: price({ active: false }), plan: "scale" }),
    ).toContain("archived");
    expect(
      priceProblem({ price: price({ type: "one_time" }), plan: "scale" }),
    ).toContain("not recurring");
  });

  test("the configured Scale price passes", () => {
    expect(priceProblem({ price: price(), plan: "scale" })).toBeNull();
  });

  test("grant refuses before touching Stripe when the plan's price id is unset", async () => {
    setVariable("STRIPE_SUB_SCALE", undefined);

    const result = await grant(Environment.SERVER, {
      email: "nobody@example.com",
      plan: "scale",
      days: 90,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    // Proves the ordering: this fails on the unset price id, not on a missing
    // Stripe key, an unreachable database, or a missing user — all of which sit
    // further down `grant`.
    expect(result.error.name).toBe("validation-error");
    expect(result.error.message).toContain("STRIPE_SUB_SCALE");
  });
});

// --- case 3: the trial ending with no card ----------------------------------

describe("a trial that ends with no payment method", () => {
  test("is created asking Stripe to pause, not to invoice or cancel", () => {
    // The one value the whole design rests on: `pause` is the only end behaviour
    // that stops access without billing a merchant who was never asked for a card.
    expect(TRIAL_END_BEHAVIOR).toBe("pause");
  });

  test("paused is NOT entitled, so the paywall returns on its own", () => {
    expect(isEntitled(row({ status: "paused" }))).toBe(false);
  });

  test("neither is canceled or unpaid", () => {
    expect(isEntitled(row({ status: "canceled" }))).toBe(false);
    expect(isEntitled(row({ status: "unpaid" }))).toBe(false);
    expect(isEntitled(row({ status: "incomplete" }))).toBe(false);
  });
});

// --- case 1: the granted trial actually unlocks the product ------------------

describe("a trialing row on the configured Scale price", () => {
  test("resolves to the scale plan", () => {
    expect(resolvePlanByPriceId(SCALE_PRICE)).toBe("scale");
  });

  test("is entitled, so the dashboard renders unpaywalled", () => {
    expect(isEntitled(row({ plan: "scale", status: "trialing" }))).toBe(true);
  });

  test("stays entitled while Stripe retries a card, and after conversion", () => {
    expect(isEntitled(row({ status: "active" }))).toBe(true);
    expect(isEntitled(row({ status: "past_due" }))).toBe(true);
  });
});

// --- case 4: extend ---------------------------------------------------------

describe("extend", () => {
  const now = new Date("2026-09-09T12:00:00.000Z");

  test("refuses to shorten a trial", () => {
    const current = trialEndFrom(90, now);
    const next = trialEndFrom(30, now);

    expect(extensionProblem({ current, next })).toContain(
      "Refusing to shorten",
    );
  });

  test("refuses a no-op extension to the same instant", () => {
    const current = trialEndFrom(90, now);

    expect(extensionProblem({ current, next: current })).toContain(
      "Refusing to shorten",
    );
  });

  test("allows pushing the end date out", () => {
    expect(
      extensionProblem({
        current: trialEndFrom(90, now),
        next: trialEndFrom(180, now),
      }),
    ).toBeNull();
  });

  test("refuses a subscription that is not on a trial", () => {
    expect(
      extensionProblem({ current: null, next: trialEndFrom(90, now) }),
    ).toBe("Subscription is not on a trial");
  });

  test("counts days from now, so three months becomes six in December", () => {
    const december = new Date("2026-12-09T12:00:00.000Z");
    const extended = trialEndFrom(90, december);

    expect(new Date(extended * 1000).toISOString()).toBe(
      "2027-03-09T12:00:00.000Z",
    );
  });
});

// --- case 5: granting twice --------------------------------------------------

describe("granting twice", () => {
  const stored = (
    overrides: Partial<{
      plan: string | null;
      status: string;
      billingMode: "payg" | "subscription";
      stripeSubscriptionId: string | null;
    }> = {},
  ) => ({
    plan: "scale" as string | null,
    status: "trialing",
    billingMode: "subscription" as "payg" | "subscription",
    stripeSubscriptionId: "sub_existing" as string | null,
    ...overrides,
  });

  test("is refused by the local row once a trial is running", () => {
    expect(existingSubscriptionProblem(stored())).toContain("sub_existing");
  });

  test("is refused for any account already carrying a subscription", () => {
    expect(
      existingSubscriptionProblem(
        stored({ plan: "dominate", status: "active" }),
      ),
    ).toContain("revoke it first");
    expect(
      existingSubscriptionProblem(stored({ status: "canceled" })),
    ).toContain("revoke it first");
  });

  test("is refused on pay-as-you-go rather than silently converting it", () => {
    expect(
      existingSubscriptionProblem(
        stored({ billingMode: "payg", plan: null, stripeSubscriptionId: null }),
      ),
    ).toContain("pay-as-you-go");
  });

  test("is allowed on a fresh account, or one stranded pre-checkout", () => {
    expect(existingSubscriptionProblem(null)).toBeNull();
    // The placeholder `createCheckoutSessionForUser` leaves behind: a customer,
    // no subscription. Reusing it is the point.
    expect(
      existingSubscriptionProblem(
        stored({ status: "incomplete", stripeSubscriptionId: null }),
      ),
    ).toBeNull();
  });

  test("is refused by Stripe's own state when the local row is missing", () => {
    // Covers the crash-between-calls case: the subscription exists in Stripe but
    // nothing local records it, so the duplicate guard has to read Stripe.
    for (const status of [
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "paused",
      "incomplete",
    ])
      expect(isLiveStripeStatus(status)).toBe(true);

    for (const status of ["canceled", "incomplete_expired"])
      expect(isLiveStripeStatus(status)).toBe(false);
  });
});

// --- case 6: a webhook carrying no account ----------------------------------

describe("resolving the account a Stripe subscription belongs to", () => {
  const subscription = (metadata: Stripe.Metadata) =>
    ({ metadata }) as unknown as Stripe.Subscription;

  test("prefers metadata.userId", () => {
    expect(resolveUserId(subscription({ userId: "user_1" }), "user_2")).toBe(
      "user_1",
    );
  });

  test("falls back to the caller's user when metadata carries none", () => {
    expect(resolveUserId(subscription({}), "user_2")).toBe("user_2");
  });

  /**
   * Current behaviour, pinned so a change to it has to be deliberate: with
   * neither source the account is unresolvable, and `upsertFromStripeSubscription`
   * can then only UPDATE a row it recognises by Stripe customer id. If there is
   * no such row it fails with `UnauthenticatedError`, the webhook route answers
   * 500, and Stripe retries.
   */
  test("resolves to null when there is neither, and never invents one", () => {
    expect(resolveUserId(subscription({}))).toBeNull();
    expect(resolveUserId(subscription({}), null)).toBeNull();
  });
});

// --- argument validation -----------------------------------------------------

describe("trial length", () => {
  test.each([
    [0, "at least"],
    [1, "at least"],
    [366, "at most"],
    [90.5, "whole number"],
  ])("rejects %p", (days, expected) => {
    expect(daysProblem(days)).toContain(expected as string);
  });

  test.each([2, 90, 180, 365])("accepts %p", (days) => {
    expect(daysProblem(days)).toBeNull();
  });
});
