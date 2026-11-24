export const LOOP_API_ORIGIN = "https://api.loopreturns.com";
export const LOOP_API_VERSION = "2026-10";
export const LOOP_API_PREFIX = `/api/${LOOP_API_VERSION}`;
export const LOOP_TRIGGERS = [
  "return.created",
  "return.updated",
  "return.closed",
] as const;
export const LOOP_STATES = [
  "open",
  "closed",
  "expired",
  "review",
  "cancelled",
] as const;
export type LoopTrigger = (typeof LOOP_TRIGGERS)[number];
export type LoopReturnState = (typeof LOOP_STATES)[number];
export type LoopOAuthAuth = {
  mode: "oauth";
  accessToken: string;
  refreshToken: string;
  /** Unix epoch milliseconds. */
  expiresAt: number;
};
export type LoopAuth = { mode: "api_key"; apiKey: string } | LoopOAuthAuth;
export type LoopLine = {
  line_item_id: string;
  provider_line_item_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  sku: string;
  barcode: string;
  title: string;
  price: string;
  refund: string | null;
  return_reason: string;
  parent_return_reason: string | null;
  return_comment: string;
  outcome: string | null;
  exchange_variant: string | null;
  returned_at: string | null;
};
/** A whitelist projection; no provider/customer object is ever returned. */
export type LoopReturn = {
  store: string;
  shop_id: string | null;
  id: string;
  state: LoopReturnState;
  type: string | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  outcome: string | null;
  order_id: string | null;
  order_name: string;
  provider_order_id: string | null;
  currency: string;
  trigger: LoopTrigger | null;
  topic: "return" | null;
  line_items: LoopLine[];
  exchanges: { product_id: string | null; variant_id: string | null }[];
};
export type LoopWebhook = {
  id: string;
  shop_id: string;
  topic: string;
  trigger: string;
  url: string;
  status: "active" | "inactive";
};
export type LoopPage = { returns: LoopReturn[]; nextPageUrl: string | null };
export type LoopListQuery = {
  from: string;
  to: string;
  filter: "created_at" | "updated_at";
  state: LoopReturnState;
  cursor?: string;
  pageSize?: number;
};
export type LoopCategory =
  | "fit"
  | "color"
  | "material"
  | "dimensions"
  | "compatibility"
  | "contents"
  | "not_as_described"
  | "damaged"
  | "shipping"
  | "changed_mind"
  | "other";
export type LoopVariant = {
  store: string;
  id: string;
  productId: string;
  options: Record<string, string>;
};
export type LoopFetch = (
  input: string | URL | Request,
  options?: RequestInit,
) => Promise<Response>;
export type LoopReservation = {
  store: string;
  bucket: "api" | "auth";
  limit: 300 | 20;
  interval: 60000;
};
