"use server";

import { resultify } from "@zenncore/utils";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { NotFoundError, RequestError, ValidationError } from "../utils/error";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import {
  DEALS,
  isDealKey,
  isPlanKey,
  PLANS,
  type PlanKey,
  stripe,
} from "../utils/stripe";
import * as StripeSync from "./billing/stripe-sync";
import * as DealRedemption from "./deal-redemption";
import * as User from "./user";

export const { get, create, update, destroy, exists, find } = repository(
  schema.subscription,
);

export type Type = Document<typeof schema.subscription>;

/**
 * The stored subscription row, with no Stripe round trip.
 *
 * For passive surfaces — the topbar badge, anything that only reads plan and
 * status. `getCurrentSubscription` reconciles against Stripe on every call,
 * which is a remote request in the render path; in shared chrome that lands on
 * every cold dashboard page load. Webhooks (`StripeSync.handleStripeEvent`)
 * already keep this row current, so reconciliation belongs on billing surfaces
 * that act on it, not on a badge that displays it.
 */
export const getStoredSubscription = withAuthentication(async (context) => {
  return StripeSync.findByUser(Environment.SERVER, {
    user: context.session.user.id,
  });
}, "Subscription.getStoredSubscription");

export const getCurrentSubscription = withAuthentication(async (context) => {
  const existing = await StripeSync.findByUser(Environment.SERVER, {
    user: context.session.user.id,
  });
  if (!existing.success) return existing;
  if (!existing.data) return { success: true as const, data: null };

  // Pay-as-you-go (and pre-checkout) rows have no Stripe customer to sync from —
  // return the local row as-is.
  if (!existing.data.stripeCustomerId)
    return { success: true as const, data: existing.data };

  const synced = await StripeSync.syncFromStripe(Environment.SERVER, {
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

    const customer = await StripeSync.ensureCustomer(Environment.SERVER, {
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
      // A coupon restricted in Stripe to one tier hard-errors a checkout it
      // cannot cover, so it is skipped elsewhere — degrading to list price
      // rather than a failed checkout. `plan: null` marks an unrestricted
      // coupon, which is valid on every tier and so is never skipped.
      const { plan } = DEALS[merchant];
      if (plan !== null && plan !== key) return null;
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

    const existing = await StripeSync.findByUser(Environment.SERVER, {
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
    const existing = await StripeSync.findByUser(Environment.SERVER, {
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
    const existing = await StripeSync.findByUser(Environment.SERVER, {
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
