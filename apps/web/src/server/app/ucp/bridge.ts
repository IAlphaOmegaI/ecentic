/**
 * Client for the thin WooCommerce plugin's private bridge endpoints
 * (`/wp-json/wc-ucp/v1/...`). These are the commerce "primitives" that
 * genuinely need the Woo runtime — cart/tax/shipping math via the real
 * shipping zones and coupon engine, order materialization, and order entity
 * snapshots. Everything protocol-shaped lives here on the Ecentic side.
 *
 * Authentication rides on the WooCommerce REST API key Ecentic provisions
 * during connect: the `wc-ucp` namespace starts with `wc-`, so WooCommerce
 * core applies its consumer key/secret authentication to these routes exactly
 * as it does for `wc/v3`.
 *
 * All monetary amounts cross this boundary as integer minor units.
 */

import * as HTTP from "@/server/utils/http";
import { authorizedRequest } from "@/server/utils/woocommerce";
import { storefrontOrigin } from "./store-context";

export type BridgeCredentials = {
  domain: string;
  consumerKey: string;
  consumerSecret: string;
};

// ─── Wire shapes ─────────────────────────────────────────────────────────────

export type BridgeQuoteLineItem = {
  /** Caller correlation id, echoed back. */
  id: string;
  product_id: number;
  quantity: number;
};

export type BridgeDestination = {
  country?: string;
  state?: string;
  postcode?: string;
  city?: string;
  address_1?: string;
  address_2?: string;
};

export type BridgeQuoteRequest = {
  line_items: BridgeQuoteLineItem[];
  coupon_codes: string[];
  destination?: BridgeDestination;
};

export type BridgeQuoteResponse = {
  currency: string;
  line_items: {
    id: string;
    product_id: number;
    quantity: number;
    unit_price: number;
    subtotal: number;
    discount: number;
    total: number;
    title: string;
    image_url?: string;
    purchasable: boolean;
    in_stock: boolean;
  }[];
  coupons: {
    code: string;
    valid: boolean;
    amount: number;
    title?: string;
    discount_type?: string;
    allocations?: { line_id: string; amount: number }[];
    reason?: string;
  }[];
  shipping_options: {
    id: string;
    title: string;
    amount: number;
    tax: number;
  }[];
  requires_shipping: boolean;
  tax_total: number;
};

export type BridgeOrderRequest = {
  checkout_id: string;
  line_items: { product_id: number; quantity: number }[];
  coupon_codes: string[];
  billing?: Record<string, string>;
  shipping?: Record<string, string>;
  shipping_option?: { id: string; title: string; amount: number };
  buyer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  attribution?: Record<string, unknown>;
};

export type BridgeOrderSummary = {
  id: number;
  number: string;
  status: string;
  permalink_url: string;
  payment_url: string;
};

export type BridgeOrderCreateResponse = {
  order: BridgeOrderSummary;
  totals: { type: string; amount: number }[];
};

export type BridgeOrderEntity = {
  id: number;
  number: string;
  status: string;
  label: string;
  checkout_id: string;
  permalink_url: string;
  currency: string;
  /**
   * Full reference order-entity line items: `item` (id/title/price/image_url),
   * `quantity: {original, total, fulfilled}`, discount-aware `totals`, and the
   * derived `status` (processing|partial|fulfilled|removed).
   */
  line_items: Record<string, unknown>[];
  totals: { type: string; display_text: string; amount: number }[];
  fulfillment?: { expectations: unknown[]; events: unknown[] };
  adjustments?: Record<string, unknown>[];
  attribution?: Record<string, unknown>;
};

// ─── Calls ───────────────────────────────────────────────────────────────────

const bridgeUrl = (domain: string, path: string) =>
  `${storefrontOrigin(domain)}/wp-json/wc-ucp/v1${path}`;

const post = async <T>(
  credentials: BridgeCredentials,
  path: string,
  body: unknown,
) => {
  const response = await authorizedRequest(
    bridgeUrl(credentials.domain, path),
    credentials.consumerKey,
    credentials.consumerSecret,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.success) return response;
  return HTTP.parse<T>(response);
};

const get = async <T>(credentials: BridgeCredentials, path: string) => {
  const response = await authorizedRequest(
    bridgeUrl(credentials.domain, path),
    credentials.consumerKey,
    credentials.consumerSecret,
    { method: "GET" },
  );
  if (!response.success) return response;
  return HTTP.parse<T>(response);
};

/**
 * Prices a set of line items through the real Woo runtime: per-line totals,
 * coupon validation + allocation, shipping options for a destination, and
 * tax. The single source of commerce math for hosted carts and checkouts.
 */
export const quote = async (
  credentials: BridgeCredentials,
  request: BridgeQuoteRequest,
) => post<BridgeQuoteResponse>(credentials, "/quote", request);

/** Materializes a completed checkout session as a real WooCommerce order. */
export const createOrder = async (
  credentials: BridgeCredentials,
  request: BridgeOrderRequest,
) => post<BridgeOrderCreateResponse>(credentials, "/orders", request);

/** UCP order entity snapshot for an order created through the hosted checkout. */
export const getOrder = async (
  credentials: BridgeCredentials,
  orderId: string,
) =>
  get<BridgeOrderEntity>(credentials, `/orders/${encodeURIComponent(orderId)}`);

export type BridgeStoreInfo = {
  links: { type: string; url: string; title?: string }[];
  urls: { home: string; cart: string; checkout: string; shop: string };
  currency: string;
  weight_unit: string;
  dimension_unit: string;
  require_signatures?: boolean;
  /** UCP payment handler declarations keyed by reverse-domain name. */
  payment_handlers?: Record<string, { id?: string }[]>;
  /** Store-level API key (X-UCP-Key); "" = open access. */
  api_key?: string;
  /** Platform profile URLs/hosts authorized to transact; [] = permissionless. */
  allowed_agent_profiles?: string[];
  /** Max requests per minute per agent identity; 0 = unlimited. */
  rate_limit_per_minute?: number;
  /** Whether the catalog includes out-of-stock products by default. */
  include_out_of_stock?: boolean;
  /** Identity-linking scope policy (`{capability}:{scope}` → per-scope config). */
  identity_linking?: { scopes?: Record<string, Record<string, unknown>> };
};

/** Grant behind a user identity token issued by the store's OAuth server. */
export type BridgeIntrospection = {
  active: boolean;
  user_id?: number;
  scope?: string;
  client_id?: string;
  expires?: number;
};

/**
 * Resolves a Bearer user identity token to its grant via the store's OAuth
 * server (WOO_UCP_Auth) — the validation half of identity linking.
 */
export const introspectToken = async (
  credentials: BridgeCredentials,
  token: string,
) => post<BridgeIntrospection>(credentials, "/tokens/introspect", { token });

/** Outcome of processing one payment instrument through the store's processor. */
export type BridgeChargeOutcome =
  | { outcome: "charged"; order: BridgeOrderSummary }
  | { outcome: "escalate"; continue_url: string; code: string; content: string }
  | { outcome: "failed"; reason: string; message: string }
  | { outcome: "defer" };

/**
 * Charges a collected instrument through the store's payment processor
 * (`woo_ucp_process_instrument` chain — Stripe by default). Secrets stay in
 * WordPress; only the opaque instrument and an outcome cross this boundary.
 */
export const chargeInstrument = async (
  credentials: BridgeCredentials,
  request: {
    order_id: number;
    checkout_id: string;
    instrument: Record<string, unknown>;
  },
) => post<BridgeChargeOutcome>(credentials, "/charge", request);

/**
 * Store facts only the WordPress install knows: configured legal pages,
 * real storefront page URLs, and presentment units.
 */
export const getStoreInfo = async (credentials: BridgeCredentials) =>
  get<BridgeStoreInfo>(credentials, "/store");

/**
 * Pushes the hosted-UCP connection settings to the plugin after connect:
 * the Ecentic store id, the bridge secret for plugin → Ecentic event calls,
 * and the hosted profile/endpoint URLs the plugin advertises at
 * `/.well-known/ucp`.
 */
export const configureConnection = async (
  credentials: BridgeCredentials,
  request: {
    store_id: string;
    bridge_secret: string;
    events_url: string;
    profile_url: string;
    endpoint: string;
  },
) => post<{ configured: boolean }>(credentials, "/connection", request);
