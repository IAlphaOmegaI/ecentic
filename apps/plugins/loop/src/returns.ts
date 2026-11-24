// biome-ignore-all lint/complexity/useLiteralKeys: Unknown provider records require bracket access under noPropertyAccessFromIndexSignature.
import { createHash } from "node:crypto";
import {
  assertMerchant,
  identifier,
  LoopError,
  record,
  text,
  timestamp,
} from "./guard";
import { redactComment } from "./privacy";
import {
  LOOP_STATES,
  LOOP_TRIGGERS,
  type LoopLine,
  type LoopReturn,
  type LoopReturnState,
  type LoopTrigger,
} from "./types";

const money = (value: unknown): string | null =>
  typeof value === "string" && /^\d{1,12}(?:\.\d{1,6})?$/.test(value)
    ? value
    : typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value < 1e12
      ? String(value)
      : null;

/** Only select the fields required for merchant reports; never persist a raw payload. */
export const parseReturn = (store: string, payload: unknown): LoopReturn => {
  assertMerchant(store);
  const source = record(payload);
  const id = identifier(source["id"]);
  const created = timestamp(source["created_at"]);
  const edited = timestamp(source["edited_at"]);
  const updated = timestamp(source["updated_at"]) ?? edited ?? created;
  const state = source["state"];
  const shop = identifier(source["shop_id"]);
  if (
    !id ||
    !created ||
    !updated ||
    !LOOP_STATES.includes(state as LoopReturnState) ||
    !Array.isArray(source["line_items"]) ||
    source["line_items"].length > 10_000
  )
    throw new LoopError("Loop returned an invalid return record.");
  if (source["shop_id"] !== undefined && source["shop_id"] !== null && !shop)
    throw new LoopError("Loop returned an invalid shop identifier.");
  const references = [
    text(source["order_name"]),
    identifier(source["order_id"]),
    identifier(source["provider_order_id"]),
    identifier(source["order_number"]),
    identifier(source["provider_order_number"]),
  ].filter((value): value is string => !!value);
  const lines: LoopLine[] = source["line_items"].map((value) => {
    const line = record(value);
    const lineId = identifier(line["line_item_id"]);
    if (!lineId)
      throw new LoopError("Loop returned an invalid line identifier.");
    return {
      line_item_id: lineId,
      provider_line_item_id: identifier(line["provider_line_item_id"]),
      product_id: identifier(line["product_id"]),
      variant_id: identifier(line["variant_id"]),
      sku: text(line["sku"], 256),
      barcode: text(line["barcode"], 256),
      title: text(line["title"], 1000),
      price: money(line["price"]) ?? "0",
      refund: money(line["refund"]),
      return_reason: redactComment(
        store,
        text(line["return_reason"] ?? line["reason"]),
        references,
      ),
      parent_return_reason:
        (line["parent_return_reason"] ?? line["parent_reason"]) == null
          ? null
          : redactComment(
              store,
              text(line["parent_return_reason"] ?? line["parent_reason"]),
              references,
            ),
      return_comment: redactComment(
        store,
        text(line["return_comment"], 16_000),
        references,
      ),
      outcome: text(line["outcome"], 100) || null,
      exchange_variant: identifier(line["exchange_variant"]),
      returned_at: timestamp(line["returned_at"]),
    };
  });
  if (new Set(lines.map((line) => line.line_item_id)).size !== lines.length)
    throw new LoopError("Loop returned duplicate line identifiers.");
  return {
    store,
    shop_id: shop,
    id,
    state: state as LoopReturnState,
    type: text(source["type"], 100) || null,
    created_at: created,
    updated_at: updated,
    edited_at: edited,
    outcome: text(source["outcome"], 100) || null,
    order_id: identifier(source["order_id"]),
    order_name: text(source["order_name"], 256),
    provider_order_id: identifier(source["provider_order_id"]),
    currency: /^[A-Z]{3}$/.test(text(source["currency"]))
      ? text(source["currency"])
      : "",
    trigger: LOOP_TRIGGERS.includes(source["trigger"] as LoopTrigger)
      ? (source["trigger"] as LoopTrigger)
      : null,
    topic: source["topic"] === "return" ? "return" : null,
    line_items: lines,
    exchanges: Array.isArray(source["exchanges"])
      ? source["exchanges"].slice(0, 10_000).map((value) => {
          const exchange = record(value);
          return {
            product_id: identifier(exchange["product_id"]),
            variant_id: identifier(exchange["variant_id"]),
          };
        })
      : [],
  };
};

export const webhookKey = (store: string, value: LoopReturn): string => {
  assertMerchant(store);
  if (value.store !== store)
    throw new LoopError("Loop return belongs to another merchant.");
  return createHash("sha256")
    .update(
      JSON.stringify([
        store,
        value.id,
        value.trigger ?? "sync",
        value.edited_at ?? value.updated_at,
      ]),
    )
    .digest("hex");
};

/** Half-open, overlapping-boundary-safe windows. Upserts make inclusive provider boundaries harmless. */
export const dateWindows = (
  store: string,
  from: string | Date,
  to: string | Date,
  days = 30,
): { from: string; to: string }[] => {
  assertMerchant(store);
  const start = from instanceof Date ? from.getTime() : Date.parse(from);
  const end = to instanceof Date ? to.getTime() : Date.parse(to);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    !Number.isFinite(days) ||
    days <= 0 ||
    days > 120
  )
    throw new LoopError(
      "Loop sync requires a valid date range and windows of at most 120 days.",
    );
  const duration = days * 86_400_000;
  const count = Math.ceil((end - start) / duration);
  if (count > 10_000) throw new LoopError("Loop sync range is too large.");
  return Array.from({ length: count }, (_, index) => ({
    from: new Date(start + index * duration).toISOString(),
    to: new Date(Math.min(end, start + (index + 1) * duration)).toISOString(),
  }));
};
