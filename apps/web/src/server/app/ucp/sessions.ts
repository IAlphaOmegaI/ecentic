/**
 * Redis-backed UCP session state (carts and checkout sessions), the hosted
 * equivalent of the plugin's transient storage. Sessions are scoped per store
 * and expire after {@link SESSION_TTL_SECONDS}.
 */

import { randomUUID } from "node:crypto";
import { redis } from "@/server/utils/durable";
import type { UcpMessage } from "./protocol";

export const SESSION_TTL_SECONDS = 60 * 60;

// ─── Shapes ──────────────────────────────────────────────────────────────────

export type SessionLineItem = {
  /** UCP line item id (`li_...`), stable across updates when the agent sends one. */
  id: string;
  /** Ecentic product row id. */
  productId: string;
  /** WooCommerce product id. */
  externalId: string;
  title: string;
  quantity: number;
  /** Unit price in minor units at the time it was added. */
  unitPrice: number;
  imageUrl?: string;
  /** Bridge-quoted per-line totals (minor units), when a quote has run. */
  totals?: { subtotal: number; discount: number; total: number };
};

/** UCP Shipping Destination fields (the spec's postal-address vocabulary). */
export type SessionAddress = {
  street_address?: string;
  extended_address?: string;
  address_locality?: string;
  address_region?: string;
  postal_code?: string;
  address_country?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
};

export type SessionBuyer = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
};

export type ShippingOption = {
  id: string;
  title: string;
  amount: number;
  tax: number;
};

export type AppliedCoupon = {
  code: string;
  valid: boolean;
  amount: number;
  title?: string;
  discount_type?: string;
  allocations?: { line_id: string; amount: number }[];
  reason?: string;
};

export type SessionQuote = {
  currency: string;
  shippingOptions: ShippingOption[];
  coupons: AppliedCoupon[];
  taxTotal: number;
  requiresShipping: boolean;
};

export type CartSession = {
  kind: "cart";
  id: string;
  store: string;
  status: "active";
  currency: string;
  lineItems: SessionLineItem[];
  buyer?: SessionBuyer;
  context?: Record<string, unknown>;
  discountCodes: string[];
  quote?: SessionQuote;
  messages: UcpMessage[];
  /** Checkout session id this cart was converted into (idempotent conversion). */
  convertedTo?: string;
  createdAt: string;
  expiresAt: string;
};

export type CheckoutStatus =
  | "incomplete"
  | "requires_escalation"
  | "ready_for_complete"
  | "complete_in_progress"
  | "completed"
  | "canceled";

export type CheckoutSession = {
  kind: "checkout";
  id: string;
  store: string;
  status: CheckoutStatus;
  currency: string;
  lineItems: SessionLineItem[];
  buyer?: SessionBuyer;
  context?: Record<string, unknown>;
  discountCodes: string[];
  destination?: SessionAddress;
  selectedShippingOptionId?: string;
  quote?: SessionQuote;
  messages: UcpMessage[];
  /** Opaque payment instruments echoed back to the platform. */
  instruments?: Record<string, unknown>[];
  /** Cart this session was converted from (conversion cleared on cancel). */
  cartId?: string;
  /**
   * WooCommerce order materialised for this session before payment resolved —
   * kept so a retried Complete (after a decline or 3DS) reuses it instead of
   * creating a duplicate. Promoted to `order` on completion.
   */
  pendingOrder?: {
    id: string;
    number: string;
    status: string;
    permalink_url: string;
    payment_url: string;
  };
  /** Processor-supplied authentication URL (e.g. a 3DS challenge). */
  escalationUrl?: string;
  /** Agent platform state captured at creation for webhooks/signing. */
  agentProfileUrl?: string;
  webhookUrl?: string;
  attribution?: Record<string, unknown>;
  order?: {
    id: string;
    number: string;
    status: string;
    permalink_url: string;
    payment_url: string;
  };
  canceledAt?: string;
  cancelReason?: string;
  cancelNote?: string;
  createdAt: string;
  expiresAt: string;
};

// ─── Ids ─────────────────────────────────────────────────────────────────────

export const newCartId = () => `cart_${randomUUID()}`;
export const newCheckoutId = () => `chk_${randomUUID()}`;
export const newLineItemId = () => `li_${randomUUID().slice(0, 8)}`;

// ─── Storage ─────────────────────────────────────────────────────────────────

const cartKey = (store: string, id: string) => `ucp:cart:${store}:${id}`;
const checkoutKey = (store: string, id: string) =>
  `ucp:checkout:${store}:${id}`;

export const expiry = () =>
  new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

export const getCart = async (
  store: string,
  id: string,
): Promise<CartSession | null> => {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  const session = await redis.get<CartSession>(cartKey(store, id));
  return session && session.kind === "cart" ? session : null;
};

export const saveCart = async (session: CartSession): Promise<void> => {
  await redis.set(cartKey(session.store, session.id), session, {
    ex: SESSION_TTL_SECONDS,
  });
};

export const deleteCart = async (store: string, id: string): Promise<void> => {
  await redis.del(cartKey(store, id));
};

export const getCheckout = async (
  store: string,
  id: string,
): Promise<CheckoutSession | null> => {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  const session = await redis.get<CheckoutSession>(checkoutKey(store, id));
  return session && session.kind === "checkout" ? session : null;
};

export const saveCheckout = async (session: CheckoutSession): Promise<void> => {
  await redis.set(checkoutKey(session.store, session.id), session, {
    ex: SESSION_TTL_SECONDS,
  });
};
