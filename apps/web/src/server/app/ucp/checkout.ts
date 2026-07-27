/**
 * Hosted UCP checkout sessions (`dev.ucp.shopping.checkout` + fulfillment and
 * discount extensions). Session state lives in redis; all commerce math
 * (shipping options, tax, coupons) comes from the store bridge quote, and
 * completion materializes a real WooCommerce order through the bridge.
 *
 * Payment: no payment handlers are advertised, so collected instruments are
 * echoed but never processed — an instrument referencing any handler is
 * rejected at Complete (`payment_handler_unknown`), and payment is finalized
 * by the buyer through the trusted UI (`order.payment_url`), keeping the
 * store the Merchant of Record.
 */

import { Environment } from "@/server/utils/environment";
import * as UcpOrder from "../ucp-order";
import * as Bridge from "./bridge";
import * as Cart from "./cart";
import {
  appliedDiscountsResponse,
  buildTotals,
  formatLineItem,
  parseBuyer,
  parseDiscountCodes,
  parseFulfillment,
  parseInstruments,
  priceSession,
  resolveLineItems,
} from "./commerce";
import { sendOrderEvent } from "./orders";
import {
  CAPABILITY,
  contextualStorefrontUrl,
  errorMessage,
  type Negotiated,
  orderWebhookUrl,
  type UcpMessage,
  ucpBlock,
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

const TERMINAL_STATUSES: CheckoutStatus[] = ["completed", "canceled"];

const isTerminal = (status: CheckoutStatus): boolean =>
  TERMINAL_STATUSES.includes(status);

// ─── Status derivation ───────────────────────────────────────────────────────

/**
 * Derives the lifecycle status from the message stack, per the reference:
 * any `requires_buyer_input`/`requires_buyer_review` error → requires_escalation;
 * any error (or no line items) → incomplete; otherwise ready_for_complete.
 */
const deriveStatus = (
  session: CheckoutSession,
  messages: UcpMessage[],
): CheckoutStatus => {
  const errors = messages.filter((message) => message.type === "error");

  if (
    errors.some(
      (message) =>
        message.severity === "requires_buyer_input" ||
        message.severity === "requires_buyer_review",
    )
  ) {
    return "requires_escalation";
  }
  if (session.lineItems.length === 0) return "incomplete";
  if (errors.length > 0) return "incomplete";
  return "ready_for_complete";
};

/**
 * Recomputes the session's requirement messages and status. Terminal statuses
 * stick. Uses the reference's message codes and JSONPaths so platforms get
 * the standard UX hooks.
 */
const recompute = (session: CheckoutSession): CheckoutSession => {
  if (isTerminal(session.status)) return session;

  const messages: UcpMessage[] = session.messages.filter(
    (message) => message.type !== "error",
  );

  if (!session.buyer?.email) {
    messages.push(
      errorMessage(
        "field_required",
        "Buyer email is required to place the order.",
        "recoverable",
        "$.buyer.email",
      ),
    );
  }

  const requiresShipping = session.quote?.requiresShipping ?? true;
  const options = session.quote?.shippingOptions ?? [];

  if (requiresShipping && session.lineItems.length > 0) {
    if (!session.destination) {
      messages.push(
        errorMessage(
          "field_required",
          "A shipping address is required to calculate fulfillment options.",
          "recoverable",
          "$.fulfillment.methods[0].selected_destination_id",
        ),
      );
    } else if (options.length === 0) {
      messages.push(
        errorMessage(
          "address_undeliverable",
          "No shipping options are available for the provided address.",
          "recoverable",
          "$.fulfillment.methods[0].destinations[0]",
        ),
      );
    }
  }

  return {
    ...session,
    messages,
    status: deriveStatus(session, messages),
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

/**
 * Maps a WooCommerce order status to the finer-grained UCP `order.status`
 * vocabulary reported on a completed session — distinct from the session's
 * own checkout-lifecycle status. Unknown statuses escalate for human review.
 */
const mapOrderStatus = (wcStatus: string): string => {
  const status = wcStatus.startsWith("wc-") ? wcStatus.slice(3) : wcStatus;
  switch (status) {
    case "checkout-draft":
      return "not_ready_for_payment";
    case "pending":
      return "ready_for_payment";
    case "processing":
    case "completed":
      return "completed";
    case "cancelled":
    case "refunded":
      return "canceled";
    case "failed":
      return "unrecoverable_errors";
    default:
      return "requires_escalation";
  }
};

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * The fulfillment response object (reference build_fulfillment): omitted for
 * digital-only sessions; a bare `shipping` method advertising the requirement
 * before an address arrives; destination + option groups once priced.
 */
const formatFulfillment = (
  session: CheckoutSession,
): Record<string, unknown> | null => {
  const requiresShipping = session.quote?.requiresShipping ?? true;
  if (!requiresShipping || session.lineItems.length === 0) return null;

  const lineItemIds = session.lineItems.map((lineItem) => lineItem.id);
  const method: Record<string, unknown> = {
    id: "shipping",
    type: "shipping",
    line_item_ids: lineItemIds,
  };

  if (!session.destination) {
    return { methods: [method] };
  }

  const destination: Record<string, unknown> = { id: "dest_1" };
  for (const [key, value] of Object.entries(session.destination)) {
    if (value) destination[key] = value;
  }
  method.destinations = [destination];
  method.selected_destination_id = "dest_1";

  const options = session.quote?.shippingOptions ?? [];
  if (options.length > 0) {
    const selected = selectedShippingOption(session);
    method.groups = [
      {
        id: "package_1",
        line_item_ids: lineItemIds,
        ...(selected ? { selected_option_id: selected.id } : {}),
        options: options.map((option) => ({
          id: option.id,
          title: option.title,
          totals: [{ type: "total", amount: option.amount + option.tax }],
        })),
      },
    ];
  }

  return { methods: [method] };
};

/**
 * Payment object: the store's advertised handlers (shared with the discovery
 * profile) plus any collected instruments echoed back. Omitted when there is
 * nothing to advertise, mirroring the reference payment_object.
 */
const paymentObject = (
  session: CheckoutSession,
  context: UcpStoreContext,
): Record<string, unknown> | null => {
  const handlers = context.storefront?.paymentHandlers ?? {};
  const instruments = session.instruments ?? [];
  if (Object.keys(handlers).length === 0 && instruments.length === 0) {
    return null;
  }
  return {
    handlers,
    ...(instruments.length > 0 ? { instruments } : {}),
  };
};

/**
 * continue_url precedence, per the reference: a processor-supplied escalation
 * URL (e.g. a 3DS challenge) → the order-pay page of an order awaiting
 * payment → the stateless checkout-link.
 */
const continueUrl = (
  session: CheckoutSession,
  context: UcpStoreContext,
): string => {
  if (session.escalationUrl) return session.escalationUrl;
  if (session.order?.payment_url) return session.order.payment_url;
  if (session.pendingOrder?.payment_url)
    return session.pendingOrder.payment_url;
  return checkoutLinkUrl(
    context.store.domain,
    session.lineItems,
    session.discountCodes[0],
  );
};

const formatCheckout = (
  session: CheckoutSession,
  context: UcpStoreContext,
  negotiated: Negotiated | null,
): Record<string, unknown> => {
  const applied = appliedDiscountsResponse(session.quote, session.lineItems);
  const shipping = selectedShippingOption(session);
  const fulfillment = formatFulfillment(session);
  const payment = paymentObject(session, context);
  const terminal = isTerminal(session.status);

  return {
    ucp: ucpBlock(RELEVANT, negotiated, "success"),
    id: session.id,
    status: session.status,
    currency: session.currency,
    line_items: session.lineItems.map((lineItem) => formatLineItem(lineItem)),
    ...(session.buyer ? { buyer: session.buyer } : {}),
    ...(session.context ? { context: session.context } : {}),
    ...(fulfillment ? { fulfillment } : {}),
    ...(session.discountCodes.length > 0 || applied.length > 0
      ? {
          discounts: {
            codes: session.discountCodes,
            applied,
          },
        }
      : {}),
    totals: buildTotals({
      lineItems: session.lineItems,
      quote: session.quote,
      ...(shipping !== undefined
        ? { shippingAmount: shipping.amount + shipping.tax }
        : {}),
    }),
    ...(payment ? { payment } : {}),
    ...(session.messages.length > 0 ? { messages: session.messages } : {}),
    // Links are mandatory (privacy/terms): the store's configured legal pages
    // arrive via the bridge store-info fetch; empty when none are configured.
    links: context.storefront?.links ?? [],
    // continue_url: MUST be present for requires_escalation; SHOULD be present
    // for other non-terminal states; omitted for terminal states.
    ...(terminal ? {} : { continue_url: continueUrl(session, context) }),
    expires_at: session.expiresAt,
    ...(session.order ? { order: session.order } : {}),
    ...(session.status === "canceled"
      ? {
          canceled_at: session.canceledAt ?? new Date().toISOString(),
          cancel_reason: session.cancelReason ?? null,
          ...(session.cancelNote ? { cancel_note: session.cancelNote } : {}),
        }
      : {}),
  };
};

// ─── Error envelopes ─────────────────────────────────────────────────────────

const errorEnvelope = (
  negotiated: Negotiated | null,
  messages: UcpMessage[],
  continueTo: string | null,
  status: number,
): CheckoutResult => ({
  status,
  body: {
    ucp: ucpBlock(RELEVANT, negotiated, "error"),
    messages,
    ...(continueTo ? { continue_url: continueTo } : {}),
  },
});

const notFound = (
  context: UcpStoreContext,
  negotiated: Negotiated | null,
): CheckoutResult =>
  errorEnvelope(
    negotiated,
    [
      errorMessage(
        "not_found",
        "Checkout session not found or has expired.",
        "unrecoverable",
      ),
    ],
    contextualStorefrontUrl(
      context.store.domain,
      "checkout",
      context.storefront?.urls,
    ),
    404,
  );

const immutable = (
  negotiated: Negotiated | null,
  status: CheckoutStatus,
): CheckoutResult =>
  errorEnvelope(
    negotiated,
    [
      errorMessage(
        "checkout_immutable",
        status === "completed"
          ? "Checkout session is already completed and cannot be modified."
          : "Checkout session has been canceled and cannot be modified.",
        "unrecoverable",
      ),
    ],
    null,
    409,
  );

/** All requested items unavailable on create — error outcome, no resource. */
const allUnavailable = (
  context: UcpStoreContext,
  negotiated: Negotiated | null,
  itemMessages: UcpMessage[],
): CheckoutResult =>
  errorEnvelope(
    negotiated,
    [
      errorMessage(
        "out_of_stock",
        "All requested items are currently unavailable.",
        "unrecoverable",
      ),
      ...itemMessages,
    ],
    contextualStorefrontUrl(
      context.store.domain,
      "checkout",
      context.storefront?.urls,
    ),
    200,
  );

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
  const cartId = typeof payload.cart_id === "string" ? payload.cart_id : "";

  if (cartId !== "") {
    return createFromCart({ context, negotiated, payload, cartId });
  }

  const rawItems = payload.line_items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return errorEnvelope(
      negotiated,
      [
        errorMessage(
          "field_required",
          "line_items cannot be empty.",
          "unrecoverable",
          "$.line_items",
        ),
      ],
      contextualStorefrontUrl(
        context.store.domain,
        "checkout",
        context.storefront?.urls,
      ),
      400,
    );
  }

  const resolved = await resolveLineItems(context, rawItems);
  const fulfillment = parseFulfillment(payload.fulfillment);

  const initial: CheckoutSession = {
    kind: "checkout",
    id: newCheckoutId(),
    store: context.store.id,
    status: "incomplete",
    currency: "USD",
    lineItems: resolved.lineItems,
    buyer: parseBuyer(payload.buyer),
    context:
      payload.context && typeof payload.context === "object"
        ? (payload.context as Record<string, unknown>)
        : undefined,
    discountCodes: parseDiscountCodes(payload.discounts),
    destination: fulfillment.destination,
    selectedShippingOptionId: fulfillment.selectedOptionId,
    instruments: parseInstruments(payload.payment),
    messages: resolved.messages,
    agentProfileUrl: negotiated?.profileUrl,
    webhookUrl: orderWebhookUrl(negotiated),
    attribution:
      payload.attribution && typeof payload.attribution === "object"
        ? (payload.attribution as Record<string, unknown>)
        : undefined,
    createdAt: new Date().toISOString(),
    expiresAt: expiry(),
  };

  const session = await reprice(initial, context);

  if (session.lineItems.length === 0) {
    return allUnavailable(context, negotiated, session.messages);
  }

  await saveCheckout(session);
  return { status: 201, body: formatCheckout(session, context, negotiated) };
};

/**
 * Cart → checkout conversion (reference create_from_cart): the cart contents
 * initialise the session; a live non-terminal checkout for the same cart is
 * returned instead of creating a conflicting one.
 */
const createFromCart = async ({
  context,
  negotiated,
  payload,
  cartId,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  payload: Record<string, unknown>;
  cartId: string;
}): Promise<CheckoutResult> => {
  const cart = await Cart.loadInternal(context.store.id, cartId);
  if (!cart) {
    return errorEnvelope(
      negotiated,
      [
        errorMessage(
          "not_found",
          "Cart not found or has expired.",
          "unrecoverable",
        ),
      ],
      contextualStorefrontUrl(
        context.store.domain,
        "checkout",
        context.storefront?.urls,
      ),
      404,
    );
  }

  // Idempotency: reuse the existing LIVE checkout for this cart; a terminal
  // one no longer blocks a fresh conversion.
  if (cart.convertedTo) {
    const existing = await getCheckout(context.store.id, cart.convertedTo);
    if (existing && !isTerminal(existing.status)) {
      return {
        status: 200,
        body: formatCheckout(existing, context, negotiated),
      };
    }
  }

  const fulfillment = parseFulfillment(payload.fulfillment);

  const initial: CheckoutSession = {
    kind: "checkout",
    id: newCheckoutId(),
    store: context.store.id,
    status: "incomplete",
    currency: cart.currency,
    lineItems: cart.lineItems,
    buyer: cart.buyer ?? parseBuyer(payload.buyer),
    context:
      payload.context && typeof payload.context === "object"
        ? (payload.context as Record<string, unknown>)
        : cart.context,
    // Carry forward the cart's discount codes (spec MUST); codes no longer
    // valid at checkout surface as rejection warnings from the quote.
    discountCodes: cart.discountCodes,
    destination: fulfillment.destination,
    selectedShippingOptionId: fulfillment.selectedOptionId,
    instruments: parseInstruments(payload.payment),
    messages: [],
    cartId,
    agentProfileUrl: negotiated?.profileUrl,
    webhookUrl: orderWebhookUrl(negotiated),
    attribution:
      payload.attribution && typeof payload.attribution === "object"
        ? (payload.attribution as Record<string, unknown>)
        : undefined,
    createdAt: new Date().toISOString(),
    expiresAt: expiry(),
  };

  const session = await reprice(initial, context);

  if (session.lineItems.length === 0) {
    return allUnavailable(context, negotiated, session.messages);
  }

  await saveCheckout(session);
  await Cart.markConverted(cart, session.id);

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
  if (!session) return notFound(context, negotiated);
  return { status: 200, body: formatCheckout(session, context, negotiated) };
};

/**
 * `PUT /checkout-sessions/{id}` — full replacement: provided sections wholly
 * supersede the prior state; absent sections are retained.
 */
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
  if (!existing) return notFound(context, negotiated);
  if (isTerminal(existing.status))
    return immutable(negotiated, existing.status);

  const resolved =
    payload.line_items !== undefined
      ? await resolveLineItems(context, payload.line_items)
      : { lineItems: existing.lineItems, messages: [] as UcpMessage[] };

  const fulfillment = parseFulfillment(payload.fulfillment);

  const merged: CheckoutSession = {
    ...existing,
    lineItems: resolved.lineItems,
    buyer:
      payload.buyer !== undefined ? parseBuyer(payload.buyer) : existing.buyer,
    context:
      payload.context !== undefined &&
      payload.context &&
      typeof payload.context === "object"
        ? (payload.context as Record<string, unknown>)
        : existing.context,
    discountCodes:
      payload.discounts !== undefined
        ? parseDiscountCodes(payload.discounts)
        : existing.discountCodes,
    destination: fulfillment.destination ?? existing.destination,
    selectedShippingOptionId:
      fulfillment.selectedOptionId ?? existing.selectedShippingOptionId,
    instruments:
      payload.payment !== undefined
        ? parseInstruments(payload.payment)
        : existing.instruments,
    messages: resolved.messages,
    expiresAt: expiry(), // activity extends the session
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
  put("first_name", destination?.first_name ?? buyer?.first_name);
  put("last_name", destination?.last_name ?? buyer?.last_name);
  put("address_1", destination?.street_address);
  put("address_2", destination?.extended_address);
  put("city", destination?.address_locality);
  put("state", destination?.address_region);
  put("postcode", destination?.postal_code);
  put("country", destination?.address_country);
  put("phone", destination?.phone_number ?? buyer?.phone_number);
  return address;
};

/** UCP failure code + severity for common processor failure reasons. */
const PAYMENT_ERROR_MAP: Record<
  string,
  [string, "recoverable" | "unrecoverable"]
> = {
  declined: ["payment_declined", "recoverable"],
  insufficient_funds: ["payment_declined", "recoverable"],
  expired_card: ["payment_declined", "recoverable"],
  invalid_card: ["payment_declined", "recoverable"],
  network_error: ["payment_failed", "recoverable"],
  processing_error: ["payment_failed", "unrecoverable"],
};

/**
 * Valid handler ids for the store: the reverse-domain handler names plus
 * every declaration `id`, per the reference advertised_handler_ids.
 */
const advertisedHandlerIds = (context: UcpStoreContext): string[] => {
  const handlers = context.storefront?.paymentHandlers ?? {};
  const ids: string[] = [];
  for (const [name, declarations] of Object.entries(handlers)) {
    ids.push(name);
    for (const declaration of declarations ?? []) {
      if (declaration?.id) ids.push(declaration.id);
    }
  }
  return [...new Set(ids)];
};

/**
 * The checkout binding (`checkout_id`) of an instrument, preferring the
 * credential payload (covered by the handler's signature), then the
 * instrument body. "" when absent.
 */
const instrumentBindingCheckoutId = (
  instrument: Record<string, unknown>,
): string => {
  const credential =
    instrument.credential && typeof instrument.credential === "object"
      ? (instrument.credential as Record<string, unknown>)
      : {};
  const binding =
    credential.binding && typeof credential.binding === "object"
      ? (credential.binding as Record<string, unknown>)
      : {};
  const instrumentBinding =
    instrument.binding && typeof instrument.binding === "object"
      ? (instrument.binding as Record<string, unknown>)
      : {};

  for (const candidate of [
    binding.checkout_id,
    credential.checkout_id,
    instrumentBinding.checkout_id,
  ]) {
    if (typeof candidate === "string" && candidate !== "") return candidate;
  }
  return "";
};

/**
 * Rejects instruments that cannot be processed before anything irreversible,
 * per the reference: the handler must be one the store advertised, and a
 * credential bound to a different checkout is a replay.
 */
const rejectUnprocessableInstruments = (
  session: CheckoutSession,
  context: UcpStoreContext,
  negotiated: Negotiated | null,
): CheckoutResult | null => {
  const instruments = session.instruments ?? [];
  if (instruments.length === 0) return null;

  const validIds = advertisedHandlerIds(context);

  for (const instrument of instruments) {
    const handlerId =
      typeof instrument.handler_id === "string" ? instrument.handler_id : "";
    if (handlerId === "" || !validIds.includes(handlerId)) {
      return errorEnvelope(
        negotiated,
        [
          errorMessage(
            "payment_handler_unknown",
            "The payment instrument references a payment handler this store does not support.",
            "unrecoverable",
            "payment.instruments",
          ),
        ],
        continueUrl(session, context),
        400,
      );
    }

    const boundTo = instrumentBindingCheckoutId(instrument);
    if (boundTo !== "" && boundTo !== session.id) {
      return errorEnvelope(
        negotiated,
        [
          errorMessage(
            "payment_binding_invalid",
            "The payment credential is not bound to this checkout session.",
            "unrecoverable",
            "payment.instruments",
          ),
        ],
        null,
        409,
      );
    }
  }

  return null;
};

/** WooCommerce statuses that still await payment (WC's needs_payment set). */
const AWAITING_PAYMENT_STATUSES = ["pending", "failed"];

/**
 * Returns the session's existing order if it still awaits payment, else
 * materialises a fresh one through the bridge — the reference ensure_order,
 * so a retried Complete (after a decline or 3DS) never duplicates orders.
 */
const ensureOrder = async (
  session: CheckoutSession,
  context: UcpStoreContext,
  credentials: { consumerKey: string; consumerSecret: string },
  negotiated: Negotiated | null,
): Promise<
  | { success: true; order: NonNullable<CheckoutSession["pendingOrder"]> }
  | { success: false }
> => {
  const bridgeCredentials = {
    domain: context.store.domain,
    consumerKey: credentials.consumerKey,
    consumerSecret: credentials.consumerSecret,
  };

  if (session.pendingOrder) {
    const check = await Bridge.getOrder(
      bridgeCredentials,
      session.pendingOrder.id,
    );
    if (
      check.success &&
      AWAITING_PAYMENT_STATUSES.includes(check.data.status)
    ) {
      return { success: true, order: session.pendingOrder };
    }
  }

  const shipping = selectedShippingOption(session);
  const validCoupons = (session.quote?.coupons ?? []).filter(
    (coupon) => coupon.valid,
  );

  const created = await Bridge.createOrder(bridgeCredentials, {
    checkout_id: session.id,
    line_items: session.lineItems.map((lineItem) => ({
      product_id: Number(lineItem.externalId),
      quantity: lineItem.quantity,
    })),
    coupon_codes: validCoupons.map((coupon) => coupon.code),
    billing: {
      ...toOrderAddress(session.destination, session.buyer),
      ...(session.buyer?.email ? { email: session.buyer.email } : {}),
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
  });
  if (!created.success) return { success: false };

  const order = {
    id: String(created.data.order.id),
    number: created.data.order.number,
    status: created.data.order.status,
    permalink_url: created.data.order.permalink_url,
    payment_url: created.data.order.payment_url,
  };

  // Durable order record right away — status-change relays and the webhook
  // target must survive even if the session ends in escalation.
  await UcpOrder.create(Environment.SERVER, {
    storeId: context.store.id,
    externalOrderId: order.id,
    checkoutId: session.id,
    webhookUrl: session.webhookUrl || orderWebhookUrl(negotiated) || null,
    agentProfileUrl: session.agentProfileUrl ?? null,
  });

  return { success: true, order };
};

/** Marks the session completed and fires the order.created webhook. */
const finalizeCompleted = async (
  session: CheckoutSession,
  order: NonNullable<CheckoutSession["pendingOrder"]>,
  context: UcpStoreContext,
  negotiated: Negotiated | null,
): Promise<CheckoutSession> => {
  const completed: CheckoutSession = {
    ...session,
    status: "completed",
    order: { ...order, status: mapOrderStatus(order.status) },
    pendingOrder: order,
    escalationUrl: undefined,
    messages: [],
  };
  await saveCheckout(completed);

  const webhookTarget = completed.webhookUrl || orderWebhookUrl(negotiated);
  if (webhookTarget) {
    void sendOrderEvent(Environment.SERVER, {
      store: context,
      event: "order.created",
      externalOrderId: order.id,
      webhookUrl: webhookTarget,
    });
  }

  return completed;
};

/** `POST /checkout-sessions/{id}/complete` */
export const complete = async ({
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
  if (!session) return notFound(context, negotiated);
  if (isTerminal(session.status)) return immutable(negotiated, session.status);

  // Late-bound instruments may arrive on Complete.
  const withInstruments: CheckoutSession =
    payload.payment !== undefined
      ? { ...session, instruments: parseInstruments(payload.payment) }
      : session;

  const bridgeCredentials = context.credentials
    ? {
        domain: context.store.domain,
        consumerKey: context.credentials.consumerKey,
        consumerSecret: context.credentials.consumerSecret,
      }
    : null;

  if (withInstruments.status !== "ready_for_complete") {
    // A prior payment escalation (e.g. 3DS) may have been satisfied
    // out-of-band since — if the order is now paid, close the loop.
    if (
      withInstruments.status === "requires_escalation" &&
      withInstruments.pendingOrder &&
      bridgeCredentials
    ) {
      const check = await Bridge.getOrder(
        bridgeCredentials,
        withInstruments.pendingOrder.id,
      );
      if (
        check.success &&
        !AWAITING_PAYMENT_STATUSES.includes(check.data.status)
      ) {
        const completed = await finalizeCompleted(
          withInstruments,
          { ...withInstruments.pendingOrder, status: check.data.status },
          context,
          negotiated,
        );
        return {
          status: 200,
          body: formatCheckout(completed, context, negotiated),
        };
      }
    }
    // Re-evaluate so the caller sees exactly what is still outstanding.
    return {
      status: 200,
      body: formatCheckout(withInstruments, context, negotiated),
    };
  }

  // Validate collected instruments before anything irreversible.
  const rejected = rejectUnprocessableInstruments(
    withInstruments,
    context,
    negotiated,
  );
  if (rejected) return rejected;

  if (!context.credentials || !bridgeCredentials) {
    return errorEnvelope(
      negotiated,
      [
        errorMessage(
          "order_failed",
          "The store connection is not configured for checkout.",
          "unrecoverable",
        ),
      ],
      continueUrl(withInstruments, context),
      500,
    );
  }

  const inProgress: CheckoutSession = {
    ...withInstruments,
    status: "complete_in_progress",
  };
  await saveCheckout(inProgress);

  const ensured = await ensureOrder(
    withInstruments,
    context,
    context.credentials,
    negotiated,
  );
  if (!ensured.success) {
    const reverted: CheckoutSession = {
      ...withInstruments,
      status: "ready_for_complete",
      messages: [
        ...withInstruments.messages,
        errorMessage(
          "order_failed",
          "The store could not create the order. Retry shortly.",
          "recoverable",
        ),
      ],
    };
    await saveCheckout(reverted);
    return { status: 500, body: formatCheckout(reverted, context, negotiated) };
  }

  // Persist the order link before processing so a retry after a payment
  // decline reuses this pending order instead of materialising a duplicate.
  const withOrder: CheckoutSession = {
    ...withInstruments,
    status: "complete_in_progress",
    pendingOrder: ensured.order,
  };
  await saveCheckout(withOrder);

  // Process collected instruments through the store's payment processor.
  // Charged → paid order; escalate → 3DS hand-off; failed → mapped 402;
  // defer → the buyer finalizes payment through the trusted UI.
  const finalOrder = { ...ensured.order };
  for (const instrument of withOrder.instruments ?? []) {
    const charge = await Bridge.chargeInstrument(bridgeCredentials, {
      order_id: Number(ensured.order.id),
      checkout_id: withOrder.id,
      instrument,
    });

    if (!charge.success) {
      const reverted: CheckoutSession = {
        ...withOrder,
        status: "ready_for_complete",
        messages: [
          ...withOrder.messages,
          errorMessage(
            "payment_failed",
            "The store's payment processor could not be reached. Retry shortly.",
            "recoverable",
            "payment.instruments",
          ),
        ],
      };
      await saveCheckout(reverted);
      return {
        status: 502,
        body: formatCheckout(reverted, context, negotiated),
      };
    }

    const outcome = charge.data;
    switch (outcome.outcome) {
      case "charged": {
        finalOrder.status = outcome.order.status;
        break;
      }
      case "escalate": {
        const escalated: CheckoutSession = {
          ...withOrder,
          status: "requires_escalation",
          escalationUrl: outcome.continue_url,
          messages: [
            errorMessage(
              outcome.code || "payment_authentication_required",
              outcome.content ||
                "Payment requires additional authentication to complete.",
              "requires_buyer_input",
              "payment.instruments",
            ),
          ],
        };
        await saveCheckout(escalated);
        return {
          status: 200,
          body: formatCheckout(escalated, context, negotiated),
        };
      }
      case "failed": {
        const [code, severity] = PAYMENT_ERROR_MAP[outcome.reason] ?? [
          "payment_failed",
          "unrecoverable" as const,
        ];
        const reverted: CheckoutSession = {
          ...withOrder,
          status: "ready_for_complete",
        };
        await saveCheckout(reverted);
        return errorEnvelope(
          negotiated,
          [
            errorMessage(
              code,
              outcome.message || "The payment could not be processed.",
              severity,
              "payment.instruments",
            ),
          ],
          severity === "recoverable" ? continueUrl(reverted, context) : null,
          402,
        );
      }
      default:
        break; // defer — payment finalized through the trusted UI
    }
  }

  const completed = await finalizeCompleted(
    withOrder,
    finalOrder,
    context,
    negotiated,
  );
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
  if (!session) return notFound(context, negotiated);

  if (isTerminal(session.status)) {
    return errorEnvelope(
      negotiated,
      [
        errorMessage(
          "cancel_not_allowed",
          session.status === "completed"
            ? "Cannot cancel a completed checkout session."
            : "Checkout session is already canceled.",
          "unrecoverable",
        ),
      ],
      null,
      409,
    );
  }

  const rawReason =
    typeof payload.reason === "string" ? payload.reason : "buyer_cancelled";
  const reason = [
    "buyer_cancelled",
    "agent_error",
    "timeout",
    "other",
  ].includes(rawReason)
    ? rawReason
    : "other";
  const note = typeof payload.note === "string" ? payload.note : undefined;

  const canceled: CheckoutSession = {
    ...session,
    status: "canceled",
    canceledAt: new Date().toISOString(),
    cancelReason: reason,
    cancelNote: note,
    messages: [],
  };
  await saveCheckout(canceled);

  // Drop any cart → checkout link so the cart can be reused.
  if (session.cartId) {
    await Cart.clearConversion(context.store.id, session.cartId);
  }

  return { status: 200, body: formatCheckout(canceled, context, negotiated) };
};
