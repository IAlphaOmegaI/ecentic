"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { schema } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import { stripe } from "../../utils/stripe";
import * as Subscription from "../subscription";
import * as StripeSync from "./stripe-sync";

/**
 * Activates pay-as-you-go for the current user — free to start, no card, full
 * features. Creates (or converts an unused row into) a `payg` billing row with
 * the performance fee switched on. Idempotent: an existing PAYG account returns
 * itself. A user already on a flat Stripe subscription must cancel it first.
 */
export const startPayAsYouGo = withAuthentication(async (context) => {
  const user = context.session.user.id;

  const existing = await Subscription.find(Environment.SERVER, {
    where: eq(schema.subscription.userId, user),
    limit: 1,
  });
  if (!existing.success) return existing;

  const row = existing.data[0] ?? null;

  if (row?.stripeSubscriptionId)
    return {
      success: false as const,
      error: new RequestError(
        "You're on a subscription plan. Cancel it in billing settings to switch to pay-as-you-go.",
      ),
    };

  if (row?.billingMode === "payg") return { success: true as const, data: row };

  if (row)
    return Subscription.update(Environment.SERVER, row.id, {
      billingMode: "payg",
      performanceFeeEnabled: true,
      plan: null,
      status: "active",
      updatedAt: new Date(),
    });

  return Subscription.create(Environment.SERVER, {
    userId: user,
    billingMode: "payg",
    performanceFeeEnabled: true,
    status: "active",
  });
}, "Payg.startPayAsYouGo");

/**
 * Stripe Checkout in `setup` mode to attach a card to a pay-as-you-go account —
 * the surface the "add a payment method" prompt opens once the first fee is due.
 * Persists the Stripe customer id so the period-close cron can bill it (and so a
 * retry reuses the same customer). No charge happens here.
 */
export const createPaymentSetupSession = withAuthentication(async (context) => {
  const user = context.session.user;

  const existing = await Subscription.find(Environment.SERVER, {
    where: eq(schema.subscription.userId, user.id),
    limit: 1,
  });
  if (!existing.success) return existing;

  const row = existing.data[0] ?? null;
  if (row?.billingMode !== "payg")
    return {
      success: false as const,
      error: new RequestError("Pay-as-you-go is not active for this account"),
    };

  const customer = await StripeSync.ensureCustomer(Environment.SERVER, {
    user,
  });
  if (!customer.success) return customer;

  if (!row.stripeCustomerId) {
    const persisted = await Subscription.update(Environment.SERVER, row.id, {
      stripeCustomerId: customer.data,
      updatedAt: new Date(),
    });
    if (!persisted.success) return persisted;
  }

  const appHost = process.env.APP_HOST;
  if (!appHost)
    return {
      success: false as const,
      error: new RequestError("APP_HOST is not configured"),
    };

  const session = await resultify(() =>
    stripe().checkout.sessions.create({
      mode: "setup",
      customer: customer.data,
      payment_method_types: ["card"],
      success_url: `${appHost}/dashboard/settings?payment=added`,
      cancel_url: `${appHost}/dashboard/settings`,
    }),
  );

  if (!session.success)
    return {
      success: false as const,
      error: new RequestError("Failed to create payment setup session", {
        cause: session.error,
      }),
    };

  if (!session.data.url)
    return {
      success: false as const,
      error: new RequestError("Stripe did not return a setup URL"),
    };

  return { success: true as const, data: { url: session.data.url } };
}, "Payg.createPaymentSetupSession");
