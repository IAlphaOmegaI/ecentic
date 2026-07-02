/**
 * Hosted UCP checkout sessions (`dev.ucp.shopping.checkout` + fulfillment and
 * discount extensions). Session state lives in redis; all commerce math
 * (shipping options, tax, coupons) comes from the store bridge quote, and
 * completion materializes a real WooCommerce order through the bridge.
 *
 * Payment: no payment handlers are advertised, so instruments are finalized
 * by the buyer through the trusted UI — completion creates the order and the
 * response carries `order.payment_url` for the hand-off (the reference
 * implementation's "defer to trusted UI" path).
 */

import { Environment } from "@/server/utils/environment";
import * as UcpOrder from "../ucp-order";
import * as Bridge from "./bridge";
import * as Cart from "./cart";
import {
  appliedDiscounts,
  buildTotals,
  formatLineItem,
  parseBuyer,
  parseDiscountCodes,
  parseFulfillment,
  priceSession,
  resolveLineItems,
} from "./commerce";
import { displayAmount } from "./money";
import { sendOrderEvent } from "./orders";
import {
  CAPABILITY,
  errorMessage,
  type Negotiated,
  orderWebhookUrl,
  type UcpMessage,
  ucpBlock,
  ucpEnvelope,
} from "./protocol";
import {
  type CheckoutSession,
  type CheckoutStatus,
  expiry,
  getCheckout,
  newCheckoutId,
  type SessionAddress,
  type ShippingOption,
  saveCheckout,
} from "./sessions";
import { checkoutLinkUrl, type UcpStoreContext } from "./store-context";

const RELEVANT = [
  CAPABILITY.CHECKOUT,
  CAPABILITY.FULFILLMENT,
  CAPABILITY.DISCOUNT,
];

export type CheckoutResult = { status: number; body: Record<string, unknown> };

// ─── Status derivation ───────────────────────────────────────────────────────

const TERMINAL_STATUSES: CheckoutStatus[] = ["completed", "canceled"];

/**
 * Derives the session status from its state: terminal statuses stick; a
 * session missing items, buyer contact, destination (when shippable), or a
 * viable shipping option is `incomplete` with recoverable messages telling the
 * agent what to supply; otherwise it is `ready_for_complete`.
 */
const recompute = (session: CheckoutSession): CheckoutSession => {
  if (TERMINAL_STATUSES.includes(session.status)) return session;

  const messages: UcpMessage[] = session.messages.filter(
    (message) => message.type !== "error",
  );

  const requiresShipping = session.quote?.requiresShipping ?? true;
  const options = session.quote?.shippingOptions ?? [];

  switch (true) {
    case session.lineItems.length === 0:
      messages.push(
        errorMessage("cart_empty", "No purchasable line items in the session."),
      );
      break;
    case !session.buyer?.email:
      messages.push(
        errorMessage(
          "missing_buyer_email",
          "A buyer email is required to complete checkout.",
        ),
      );
      break;
    case requiresShipping && !session.destination:
      messages.push(
        errorMessage(
          "missing_fulfillment_destination",
          "A fulfillment destination is required for shippable items.",
        ),
      );
      break;
    case requiresShipping && session.destination && options.length === 0:
      messages.push(
        errorMessage(
          "no_shipping_options",
          "No shipping options are available for the destination.",
        ),
      );
      break;
    default:
      break;
  }

  const hasBlockingError = messages.some((message) => message.type === "error");

  return {
    ...session,
    messages,
    status: hasBlockingError ? "incomplete" : "ready_for_complete",
  };
};

const selectedShippingOption = (
  session: CheckoutSession,
): ShippingOption | undefined => {
  const options = session.quote?.shippingOptions ?? [];
  return (
    options.find((option) => option.id === session.selectedShippingOptionId) ??
    options[0]
  );
};

// ─── Formatting ──────────────────────────────────────────────────────────────

const formatFulfillment = (
  session: CheckoutSession,
): Record<string, unknown> | null => {
  const options = session.quote?.shippingOptions ?? [];
  if (!session.destination && options.length === 0) return null;

  const lineItemIds = session.lineItems.map((lineItem) => lineItem.id);
  const selected = selectedShippingOption(session);

  return {
    methods: [
      {
        id: "fulfillment-1",
        type: "shipping",
        line_item_ids: lineItemIds,
        ...(session.destination
          ? {
              destinations: [{ id: "destination-1", ...session.destination }],
              selected_destination_id: "destination-1",
            }
          : { destinations: [] }),
        groups:
          options.length > 0
            ? [
                {
                  id: "group-1",
                  line_item_ids: lineItemIds,
                  ...(selected ? { selected_option_id: selected.id } : {}),
                  options: options.map((option) => ({
                    id: option.id,
                    title: option.title,
                    totals: [
                      {
                        type: "total",
                        display_text: displayAmount(
                          option.amount + option.tax,
                          session.currency,
                        ),
                        amount: option.amount + option.tax,
                      },
                    ],
                  })),
                },
              ]
            : [],
      },
    ],
  };
};

const continueUrl = (
  session: CheckoutSession,
  context: UcpStoreContext,
): string => {
  if (session.order?.payment_url) return session.order.payment_url;
  const validCoupons = appliedDiscounts(session.quote);
  return checkoutLinkUrl(
    context.store.domain,
    session.lineItems,
    validCoupons[0]?.code,
  );
};

const formatCheckout = (
  session: CheckoutSession,
  context: UcpStoreContext,
  negotiated: Negotiated | null,
): Record<string, unknown> => {
  const validCoupons = appliedDiscounts(session.quote);
  const shipping = selectedShippingOption(session);
  const fulfillment = formatFulfillment(session);
  const terminal = TERMINAL_STATUSES.includes(session.status);

  return ucpEnvelope(
    {
      id: session.id,
      status: session.status,
      currency: session.currency,
      line_items: session.lineItems.map((lineItem) => formatLineItem(lineItem)),
      ...(session.buyer ? { buyer: session.buyer } : {}),
      ...(session.context ? { context: session.context } : {}),
      ...(fulfillment ? { fulfillment } : {}),
      ...(session.discountCodes.length > 0
        ? {
            discounts: {
              codes: session.discountCodes,
              applied: validCoupons.map((coupon) => ({
                code: coupon.code,
                amount: coupon.amount,
              })),
            },
          }
        : {}),
      totals: buildTotals({
        lineItems: session.lineItems,
        currency: session.currency,
        quote: session.quote,
        ...(shipping !== undefined
          ? { shippingAmount: shipping.amount + shipping.tax }
          : {}),
      }),
      ...(session.messages.length > 0 ? { messages: session.messages } : {}),
      ...(terminal ? {} : { continue_url: continueUrl(session, context) }),
      expires_at: session.expiresAt,
      ...(session.order ? { order: session.order } : {}),
      ...(session.canceledAt
        ? {
            canceled_at: session.canceledAt,
            cancel_reason: session.cancelReason,
            ...(session.cancelNote ? { cancel_note: session.cancelNote } : {}),
          }
        : {}),
    },
    RELEVANT,
    negotiated,
  );
};

const notFound = (negotiated: Negotiated | null): CheckoutResult => ({
  status: 404,
  body: {
    ucp: ucpBlock(RELEVANT, negotiated, "error"),
    messages: [
      errorMessage(
        "not_found",
        "Checkout session not found or expired.",
        "unrecoverable",
      ),
    ],
  },
});

// ─── Pricing ─────────────────────────────────────────────────────────────────

const reprice = async (
  session: CheckoutSession,
  context: UcpStoreContext,
): Promise<CheckoutSession> => {
  const priced = await priceSession({
    context,
    lineItems: session.lineItems,
    discountCodes: session.discountCodes,
    ...(session.destination ? { destination: session.destination } : {}),
  });

  return recompute({
    ...session,
    lineItems: priced.lineItems,
    quote: priced.quote ?? session.quote,
    currency: priced.quote?.currency ?? session.currency,
    messages: [
      ...session.messages.filter((message) => message.type === "info"),
      ...priced.messages,
    ],
  });
};

// ─── Operations ──────────────────────────────────────────────────────────────

/** `POST /checkout-sessions` — from a cart id or from line items. */
export const create = async ({
  context,
  negotiated,
  payload,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  payload: Record<string, unknown>;
}): Promise<CheckoutResult> => {
  const cartId =
    typeof payload["cart_id"] === "string" ? payload["cart_id"] : "";

  const seed = await (async () => {
    if (cartId === "") {
      const resolved = await resolveLineItems(
        context.store.id,
        payload["line_items"],
      );
      return {
        lineItems: resolved.lineItems,
        messages: resolved.messages,
        discountCodes: parseDiscountCodes(payload["discounts"]),
        buyer: parseBuyer(payload["buyer"]),
        existingCheckout: null,
      };
    }

    const cart = await Cart.loadInternal(context.store.id, cartId);
    if (!cart) return null;

    // Idempotent conversion: creating a checkout from an already-converted
    // cart returns the existing session.
    if (cart.convertedTo) {
      const existing = await getCheckout(context.store.id, cart.convertedTo);
      if (existing) {
        return {
          lineItems: [],
          messages: [],
          discountCodes: [],
          buyer: undefined,
          existingCheckout: existing,
        };
      }
    }

    return {
      lineItems: cart.lineItems,
      messages: [],
      discountCodes: cart.discountCodes,
      buyer: cart.buyer ?? parseBuyer(payload["buyer"]),
      existingCheckout: null,
      cart,
    };
  })();

  if (seed === null) {
    return {
      status: 404,
      body: {
        ucp: ucpBlock(RELEVANT, negotiated, "error"),
        messages: [
          errorMessage(
            "not_found",
            `Cart "${cartId}" not found or expired.`,
            "unrecoverable",
          ),
        ],
      },
    };
  }

  if (seed.existingCheckout) {
    return {
      status: 200,
      body: formatCheckout(seed.existingCheckout, context, negotiated),
    };
  }

  const fulfillment = parseFulfillment(payload["fulfillment"]);

  const initial: CheckoutSession = {
    kind: "checkout",
    id: newCheckoutId(),
    store: context.store.id,
    status: "incomplete",
    currency: "USD",
    lineItems: seed.lineItems,
    buyer: seed.buyer ?? parseBuyer(payload["buyer"]),
    context:
      payload["context"] && typeof payload["context"] === "object"
        ? (payload["context"] as Record<string, unknown>)
        : undefined,
    discountCodes:
      seed.discountCodes.length > 0
        ? seed.discountCodes
        : parseDiscountCodes(payload["discounts"]),
    destination: fulfillment.destination,
    selectedShippingOptionId: fulfillment.selectedOptionId,
    messages: seed.messages,
    agentProfileUrl: negotiated?.profileUrl,
    webhookUrl: orderWebhookUrl(negotiated),
    attribution:
      payload["attribution"] && typeof payload["attribution"] === "object"
        ? (payload["attribution"] as Record<string, unknown>)
        : undefined,
    createdAt: new Date().toISOString(),
    expiresAt: expiry(),
  };

  const session = await reprice(initial, context);
  await saveCheckout(session);

  if ("cart" in seed && seed.cart) {
    await Cart.markConverted(seed.cart, session.id);
  }

  return { status: 201, body: formatCheckout(session, context, negotiated) };
};

/** `GET /checkout-sessions/{id}` */
export const get = async ({
  context,
  negotiated,
  id,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  id: string;
}): Promise<CheckoutResult> => {
  const session = await getCheckout(context.store.id, id);
  if (!session) return notFound(negotiated);
  return { status: 200, body: formatCheckout(session, context, negotiated) };
};

/** `PUT /checkout-sessions/{id}` — updates the provided sections. */
export const update = async ({
  context,
  negotiated,
  id,
  payload,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  id: string;
  payload: Record<string, unknown>;
}): Promise<CheckoutResult> => {
  const existing = await getCheckout(context.store.id, id);
  if (!existing) return notFound(negotiated);

  if (TERMINAL_STATUSES.includes(existing.status)) {
    return {
      status: 409,
      body: {
        ucp: ucpBlock(RELEVANT, negotiated, "error"),
        messages: [
          errorMessage(
            "session_terminal",
            `Checkout session is ${existing.status} and can no longer be updated.`,
            "unrecoverable",
          ),
        ],
      },
    };
  }

  const lineItems =
    payload["line_items"] !== undefined
      ? (await resolveLineItems(context.store.id, payload["line_items"]))
          .lineItems
      : existing.lineItems;

  const fulfillment = parseFulfillment(payload["fulfillment"]);

  const merged: CheckoutSession = {
    ...existing,
    lineItems,
    buyer:
      payload["buyer"] !== undefined
        ? parseBuyer(payload["buyer"])
        : existing.buyer,
    context:
      payload["context"] !== undefined &&
      payload["context"] &&
      typeof payload["context"] === "object"
        ? (payload["context"] as Record<string, unknown>)
        : existing.context,
    discountCodes:
      payload["discounts"] !== undefined
        ? parseDiscountCodes(payload["discounts"])
        : existing.discountCodes,
    destination: fulfillment.destination ?? existing.destination,
    selectedShippingOptionId:
      fulfillment.selectedOptionId ?? existing.selectedShippingOptionId,
    messages: [],
    expiresAt: expiry(),
  };

  const session = await reprice(merged, context);
  await saveCheckout(session);
  return { status: 200, body: formatCheckout(session, context, negotiated) };
};

// ─── Complete ────────────────────────────────────────────────────────────────

const toOrderAddress = (
  destination: SessionAddress | undefined,
  buyer: CheckoutSession["buyer"],
): Record<string, string> => {
  const address: Record<string, string> = {};
  const put = (key: string, value: string | undefined) => {
    if (value) address[key] = value;
  };
  put("first_name", buyer?.first_name);
  put("last_name", buyer?.last_name);
  put("address_1", destination?.street1);
  put("address_2", destination?.street2);
  put("city", destination?.city);
  put("state", destination?.state);
  put("postcode", destination?.postal_code);
  put("country", destination?.country);
  return address;
};

/** `POST /checkout-sessions/{id}/complete` */
export const complete = async ({
  context,
  negotiated,
  id,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  id: string;
}): Promise<CheckoutResult> => {
  const session = await getCheckout(context.store.id, id);
  if (!session) return notFound(negotiated);

  if (session.status === "completed") {
    return { status: 200, body: formatCheckout(session, context, negotiated) };
  }

  if (session.status !== "ready_for_complete") {
    return {
      status: 409,
      body: {
        ...formatCheckout(session, context, negotiated),
        messages: [
          ...session.messages,
          errorMessage(
            "not_ready",
            `Checkout session is ${session.status}; it must be ready_for_complete.`,
          ),
        ],
      },
    };
  }

  if (!context.credentials) {
    return {
      status: 503,
      body: {
        ucp: ucpBlock(RELEVANT, negotiated, "error"),
        messages: [
          errorMessage(
            "store_unavailable",
            "The store connection is not configured for checkout.",
            "unrecoverable",
          ),
        ],
      },
    };
  }

  const inProgress: CheckoutSession = {
    ...session,
    status: "complete_in_progress",
  };
  await saveCheckout(inProgress);

  const shipping = selectedShippingOption(session);
  const validCoupons = appliedDiscounts(session.quote);

  const created = await Bridge.createOrder(
    {
      domain: context.store.domain,
      consumerKey: context.credentials.consumerKey,
      consumerSecret: context.credentials.consumerSecret,
    },
    {
      checkout_id: session.id,
      line_items: session.lineItems.map((lineItem) => ({
        product_id: Number(lineItem.externalId),
        quantity: lineItem.quantity,
      })),
      coupon_codes: validCoupons.map((coupon) => coupon.code),
      billing: {
        ...toOrderAddress(session.destination, session.buyer),
        ...(session.buyer?.email ? { email: session.buyer.email } : {}),
        ...(session.buyer?.phone_number
          ? { phone: session.buyer.phone_number }
          : {}),
      },
      shipping: toOrderAddress(session.destination, session.buyer),
      ...(shipping
        ? {
            shipping_option: {
              id: shipping.id,
              title: shipping.title,
              amount: shipping.amount,
            },
          }
        : {}),
      buyer: {
        first_name: session.buyer?.first_name,
        last_name: session.buyer?.last_name,
        email: session.buyer?.email,
        phone: session.buyer?.phone_number,
      },
      ...(session.attribution ? { attribution: session.attribution } : {}),
    },
  );

  if (!created.success) {
    const reverted: CheckoutSession = {
      ...session,
      status: "ready_for_complete",
      messages: [
        ...session.messages,
        errorMessage(
          "order_creation_failed",
          "The store could not create the order. Retry shortly.",
        ),
      ],
    };
    await saveCheckout(reverted);
    return {
      status: 502,
      body: formatCheckout(reverted, context, negotiated),
    };
  }

  const completed: CheckoutSession = {
    ...session,
    status: "completed",
    order: {
      id: String(created.data.order.id),
      number: created.data.order.number,
      status: created.data.order.status,
      permalink_url: created.data.order.permalink_url,
      payment_url: created.data.order.payment_url,
    },
    messages: [],
  };
  await saveCheckout(completed);

  // Durable order record: maps the platform order back to this checkout and
  // keeps the agent webhook target beyond the session TTL.
  await UcpOrder.create(Environment.SERVER, {
    storeId: context.store.id,
    externalOrderId: String(created.data.order.id),
    checkoutId: session.id,
    webhookUrl: completed.webhookUrl || orderWebhookUrl(negotiated) || null,
    agentProfileUrl: completed.agentProfileUrl ?? null,
  });

  // Fire-and-forget `order.created` webhook to the agent platform.
  const webhookTarget = completed.webhookUrl || orderWebhookUrl(negotiated);
  if (webhookTarget) {
    void sendOrderEvent({
      context,
      event: "order.created",
      externalOrderId: String(created.data.order.id),
      webhookUrl: webhookTarget,
    });
  }

  return { status: 200, body: formatCheckout(completed, context, negotiated) };
};

/** `POST /checkout-sessions/{id}/cancel` */
export const cancel = async ({
  context,
  negotiated,
  id,
  payload,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  id: string;
  payload: Record<string, unknown>;
}): Promise<CheckoutResult> => {
  const session = await getCheckout(context.store.id, id);
  if (!session) return notFound(negotiated);

  if (session.status === "completed") {
    return {
      status: 409,
      body: {
        ...formatCheckout(session, context, negotiated),
        messages: [
          errorMessage(
            "session_terminal",
            "A completed checkout session cannot be canceled.",
            "unrecoverable",
          ),
        ],
      },
    };
  }

  const reason =
    typeof payload["reason"] === "string"
      ? payload["reason"]
      : "buyer_cancelled";
  const note =
    typeof payload["note"] === "string" ? payload["note"] : undefined;

  const canceled: CheckoutSession = {
    ...session,
    status: "canceled",
    canceledAt: new Date().toISOString(),
    cancelReason: reason,
    cancelNote: note,
  };
  await saveCheckout(canceled);

  return { status: 200, body: formatCheckout(canceled, context, negotiated) };
};
