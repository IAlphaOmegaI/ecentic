/**
 * Hosted UCP cart sessions (`dev.ucp.shopping.cart` + the discount extension).
 * Carts hold resolved line items and estimated totals; tax and shipping are
 * checkout concerns. State lives in redis with the session TTL.
 */

import {
  appliedDiscounts,
  buildTotals,
  formatLineItem,
  parseBuyer,
  parseDiscountCodes,
  priceSession,
  resolveLineItems,
} from "./commerce";
import {
  CAPABILITY,
  errorMessage,
  type Negotiated,
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
  const validCoupons = appliedDiscounts(session.quote);

  return ucpEnvelope(
    {
      id: session.id,
      line_items: session.lineItems.map((lineItem) => formatLineItem(lineItem)),
      ...(session.context ? { context: session.context } : {}),
      ...(session.buyer ? { buyer: session.buyer } : {}),
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
      currency: session.currency,
      totals: buildTotals({
        lineItems: session.lineItems,
        currency: session.currency,
        quote: session.quote,
      }),
      ...(session.messages.length > 0 ? { messages: session.messages } : {}),
      continue_url: checkoutLinkUrl(
        context.store.domain,
        session.lineItems,
        validCoupons[0]?.code,
      ),
      expires_at: session.expiresAt,
    },
    RELEVANT,
    negotiated,
  );
};

const notFound = (negotiated: Negotiated | null): CartResult => ({
  status: 404,
  body: {
    ucp: ucpBlock(RELEVANT, negotiated, "error"),
    messages: [
      errorMessage("not_found", "Cart not found or expired.", "unrecoverable"),
    ],
  },
});

// ─── Operations ──────────────────────────────────────────────────────────────

const buildSession = async ({
  context,
  payload,
  base,
}: {
  context: UcpStoreContext;
  payload: Record<string, unknown>;
  base: Pick<CartSession, "id" | "createdAt">;
}): Promise<CartSession> => {
  const resolved = await resolveLineItems(
    context.store.id,
    payload["line_items"],
  );
  const discountCodes = parseDiscountCodes(payload["discounts"]);

  const priced = await priceSession({
    context,
    lineItems: resolved.lineItems,
    discountCodes,
  });

  const currency = priced.quote?.currency ?? "USD";

  return {
    kind: "cart",
    id: base.id,
    store: context.store.id,
    status: "active",
    currency,
    lineItems: priced.lineItems,
    buyer: parseBuyer(payload["buyer"]),
    context:
      payload["context"] && typeof payload["context"] === "object"
        ? (payload["context"] as Record<string, unknown>)
        : undefined,
    discountCodes,
    quote: priced.quote,
    messages: [...resolved.messages, ...priced.messages],
    createdAt: base.createdAt,
    expiresAt: expiry(),
  };
};

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
  const session = await buildSession({
    context,
    payload,
    base: { id: newCartId(), createdAt: new Date().toISOString() },
  });

  if (session.lineItems.length === 0) {
    session.messages.push(
      errorMessage("cart_empty", "No purchasable line items were provided."),
    );
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
  if (!session) return notFound(negotiated);
  return { status: 200, body: formatCart(session, context, negotiated) };
};

/** `PUT /carts/{id}` — full replacement of the cart's contents. */
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
  if (!existing) return notFound(negotiated);

  const session = await buildSession({
    context,
    payload,
    base: { id: existing.id, createdAt: existing.createdAt },
  });

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
  if (!session) return notFound(negotiated);

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
