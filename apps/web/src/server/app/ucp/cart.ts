/**
 * Hosted UCP cart sessions (`dev.ucp.shopping.cart` + the discount extension).
 * Carts hold resolved line items and estimated totals; tax and shipping are
 * checkout concerns. State lives in redis with the session TTL.
 *
 * Conformance with the reference (WOO_UCP_Cart): existence is binary on the
 * wire — a missing/expired cart is a `not_found` business outcome at HTTP 200;
 * a create whose every item is unavailable is an error outcome with no cart
 * resource; PUT is a full replacement where absent sections retain the prior
 * state; cancel returns the state one last time before deletion.
 */

import {
  appliedDiscountsResponse,
  buildTotals,
  formatLineItem,
  parseBuyer,
  parseDiscountCodes,
  priceSession,
  resolveLineItems,
} from "./commerce";
import {
  CAPABILITY,
  contextualStorefrontUrl,
  errorMessage,
  type Negotiated,
  type UcpMessage,
  ucpBlock,
  ucpEnvelope,
} from "./protocol";
import {
  type CartSession,
  deleteCart,
  expiry,
  getCart,
  newCartId,
  saveCart,
} from "./sessions";
import { checkoutLinkUrl, type UcpStoreContext } from "./store-context";

const RELEVANT = [CAPABILITY.CART, CAPABILITY.DISCOUNT];

export type CartResult = { status: number; body: Record<string, unknown> };

// ─── Formatting ──────────────────────────────────────────────────────────────

const formatCart = (
  session: CartSession,
  context: UcpStoreContext,
  negotiated: Negotiated | null,
): Record<string, unknown> => {
  const applied = appliedDiscountsResponse(session.quote, session.lineItems);

  return ucpEnvelope(
    {
      id: session.id,
      line_items: session.lineItems.map((lineItem) => formatLineItem(lineItem)),
      ...(session.context ? { context: session.context } : {}),
      ...(session.buyer ? { buyer: session.buyer } : {}),
      ...(session.discountCodes.length > 0 || applied.length > 0
        ? {
            discounts: {
              codes: session.discountCodes,
              applied,
            },
          }
        : {}),
      currency: session.currency,
      totals: buildTotals({
        lineItems: session.lineItems,
        quote: session.quote,
        variant: "cart",
      }),
      ...(session.messages.length > 0 ? { messages: session.messages } : {}),
      continue_url: checkoutLinkUrl(
        context.store.domain,
        session.lineItems,
        session.discountCodes[0],
      ),
      expires_at: session.expiresAt,
    },
    RELEVANT,
    negotiated,
  );
};

/** not_found business outcome — HTTP 200 with a UCP error envelope (cart spec). */
const notFound = (
  context: UcpStoreContext,
  negotiated: Negotiated | null,
): CartResult => ({
  status: 200,
  body: {
    ucp: ucpBlock([CAPABILITY.CART], negotiated, "error"),
    messages: [
      errorMessage(
        "not_found",
        "Cart not found or has expired.",
        "unrecoverable",
      ),
    ],
    continue_url: contextualStorefrontUrl(
      context.store.domain,
      "cart",
      context.storefront?.urls,
    ),
  },
});

/** All-items-unavailable outcome on create — error envelope, no cart resource. */
const allUnavailable = (
  context: UcpStoreContext,
  negotiated: Negotiated | null,
  itemMessages: UcpMessage[],
): CartResult => ({
  status: 200,
  body: {
    ucp: ucpBlock([CAPABILITY.CART], negotiated, "error"),
    messages: [
      errorMessage(
        "out_of_stock",
        "All requested items are currently unavailable.",
        "unrecoverable",
      ),
      ...itemMessages,
    ],
    continue_url: contextualStorefrontUrl(
      context.store.domain,
      "cart",
      context.storefront?.urls,
    ),
  },
});

// ─── Pricing ─────────────────────────────────────────────────────────────────

const priceCart = async (
  context: UcpStoreContext,
  session: CartSession,
): Promise<CartSession> => {
  const priced = await priceSession({
    context,
    lineItems: session.lineItems,
    discountCodes: session.discountCodes,
  });

  return {
    ...session,
    lineItems: priced.lineItems,
    quote: priced.quote,
    currency: priced.quote?.currency ?? session.currency,
    messages: [...session.messages, ...priced.messages],
    expiresAt: expiry(), // activity extends the cart
  };
};

// ─── Operations ──────────────────────────────────────────────────────────────

/** `POST /carts` */
export const create = async ({
  context,
  negotiated,
  payload,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  payload: Record<string, unknown>;
}): Promise<CartResult> => {
  const rawItems = payload.line_items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      status: 400,
      body: {
        ucp: ucpBlock([CAPABILITY.CART], negotiated, "error"),
        messages: [
          errorMessage(
            "field_required",
            "line_items cannot be empty.",
            "unrecoverable",
            "$.line_items",
          ),
        ],
        continue_url: contextualStorefrontUrl(
          context.store.domain,
          "cart",
          context.storefront?.urls,
        ),
      },
    };
  }

  const resolved = await resolveLineItems(context, rawItems);

  const initial: CartSession = {
    kind: "cart",
    id: newCartId(),
    store: context.store.id,
    status: "active",
    currency: "USD",
    lineItems: resolved.lineItems,
    buyer: parseBuyer(payload.buyer),
    context:
      payload.context && typeof payload.context === "object"
        ? (payload.context as Record<string, unknown>)
        : undefined,
    discountCodes: parseDiscountCodes(payload.discounts),
    messages: resolved.messages,
    createdAt: new Date().toISOString(),
    expiresAt: expiry(),
  };

  const session = await priceCart(context, initial);

  // When every requested item is unavailable, return an error outcome and
  // create no cart resource (the absent `id` is the secondary discriminator).
  if (session.lineItems.length === 0) {
    return allUnavailable(context, negotiated, session.messages);
  }

  await saveCart(session);
  return { status: 201, body: formatCart(session, context, negotiated) };
};

/** `GET /carts/{id}` */
export const get = async ({
  context,
  negotiated,
  id,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  id: string;
}): Promise<CartResult> => {
  const session = await getCart(context.store.id, id);
  if (!session) return notFound(context, negotiated);
  return { status: 200, body: formatCart(session, context, negotiated) };
};

/**
 * `PUT /carts/{id}` — full replacement: provided sections wholly supersede
 * the prior state; absent sections are retained (reference semantics).
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
}): Promise<CartResult> => {
  const existing = await getCart(context.store.id, id);
  if (!existing) return notFound(context, negotiated);

  const resolved =
    payload.line_items !== undefined
      ? await resolveLineItems(context, payload.line_items)
      : { lineItems: existing.lineItems, messages: [] as UcpMessage[] };

  const merged: CartSession = {
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
    messages: resolved.messages,
  };

  const session = await priceCart(context, merged);
  await saveCart(session);
  return { status: 200, body: formatCart(session, context, negotiated) };
};

/** `POST /carts/{id}/cancel` — returns the final state, then deletes. */
export const cancel = async ({
  context,
  negotiated,
  id,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  id: string;
}): Promise<CartResult> => {
  const session = await getCart(context.store.id, id);
  if (!session) return notFound(context, negotiated);

  // Spec: business MUST return the cart state before deletion.
  const body = formatCart(session, context, negotiated);
  await deleteCart(context.store.id, id);
  return { status: 200, body };
};

/** Internal: exposes a cart to checkout for cart → checkout conversion. */
export const loadInternal = async (storeId: string, id: string) =>
  getCart(storeId, id);

/** Internal: records the checkout a cart was converted into (idempotent). */
export const markConverted = async (
  session: CartSession,
  checkoutId: string,
) => {
  await saveCart({ ...session, convertedTo: checkoutId });
};

/** Internal: clears the cart → checkout link so the cart can be reused. */
export const clearConversion = async (storeId: string, cartId: string) => {
  const session = await getCart(storeId, cartId);
  if (session?.convertedTo) {
    const { convertedTo: _dropped, ...rest } = session;
    await saveCart(rest as CartSession);
  }
};
