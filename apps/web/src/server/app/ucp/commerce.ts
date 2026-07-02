/**
 * Shared commerce logic for hosted UCP carts and checkout sessions: resolving
 * agent-supplied line items against the live wc/v3 catalog (synced table as
 * fallback), pricing sessions through the store bridge, and shaping wire line
 * items / totals / discounts.
 */

import * as Bridge from "./bridge";
import { findByUcpIds, productUcpId } from "./catalog";
import { displayAmount, toMinorUnits } from "./money";
import { errorMessage, type UcpMessage, warningMessage } from "./protocol";
import {
  type AppliedCoupon,
  newLineItemId,
  type SessionAddress,
  type SessionBuyer,
  type SessionLineItem,
  type SessionQuote,
} from "./sessions";
import type { UcpStoreContext } from "./store-context";
import * as WcCatalog from "./wc-catalog";

// ─── Payload parsing ─────────────────────────────────────────────────────────

export type LineItemPayload = {
  id?: unknown;
  item?: { id?: unknown };
  quantity?: unknown;
};

export const parseBuyer = (payload: unknown): SessionBuyer | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const source = payload as Record<string, unknown>;
  const pick = (key: string) =>
    typeof source[key] === "string" ? (source[key] as string) : undefined;
  const buyer: SessionBuyer = {
    first_name: pick("first_name"),
    last_name: pick("last_name"),
    email: pick("email"),
    phone_number: pick("phone_number"),
  };
  return Object.values(buyer).some((value) => value !== undefined)
    ? buyer
    : undefined;
};

export const parseDiscountCodes = (payload: unknown): string[] => {
  if (!payload || typeof payload !== "object") return [];
  const codes = (payload as { codes?: unknown }).codes;
  if (!Array.isArray(codes)) return [];
  return [
    ...new Set(
      codes.filter((code): code is string => typeof code === "string"),
    ),
  ];
};

const parseAddress = (source: Record<string, unknown>): SessionAddress => {
  const pick = (key: string) =>
    typeof source[key] === "string" ? (source[key] as string) : undefined;
  return {
    street1: pick("street1") ?? pick("address1") ?? pick("line1"),
    street2: pick("street2") ?? pick("address2") ?? pick("line2"),
    city: pick("city"),
    state: pick("state") ?? pick("province"),
    postal_code: pick("postal_code") ?? pick("zip"),
    country: pick("country") ?? pick("country_code"),
    name: pick("name"),
  };
};

/**
 * Accepts both shorthand (`fulfillment.destination`) and the structured
 * methods form (`fulfillment.methods[0].destinations[0]`) agents may send.
 */
export const parseFulfillment = (
  payload: unknown,
): { destination?: SessionAddress; selectedOptionId?: string } => {
  if (!payload || typeof payload !== "object") return {};
  const source = payload as Record<string, unknown>;

  const direct =
    source["destination"] && typeof source["destination"] === "object"
      ? parseAddress(source["destination"] as Record<string, unknown>)
      : undefined;

  const methods = Array.isArray(source["methods"]) ? source["methods"] : [];
  const method =
    methods[0] && typeof methods[0] === "object"
      ? (methods[0] as Record<string, unknown>)
      : undefined;
  const destinations = Array.isArray(method?.["destinations"])
    ? (method?.["destinations"] as unknown[])
    : [];
  const fromMethods =
    destinations[0] && typeof destinations[0] === "object"
      ? parseAddress(destinations[0] as Record<string, unknown>)
      : undefined;

  const groups = Array.isArray(method?.["groups"])
    ? (method?.["groups"] as unknown[])
    : [];
  const group =
    groups[0] && typeof groups[0] === "object"
      ? (groups[0] as Record<string, unknown>)
      : undefined;

  const selectedOptionId = (() => {
    const fromGroup = group?.["selected_option_id"];
    if (typeof fromGroup === "string") return fromGroup;
    const direct = source["selected_option_id"];
    return typeof direct === "string" ? direct : undefined;
  })();

  const destination = direct ?? fromMethods;
  const hasDestination =
    destination && Object.values(destination).some((value) => value);

  return {
    ...(hasDestination ? { destination } : {}),
    ...(selectedOptionId ? { selectedOptionId } : {}),
  };
};

// ─── Line item resolution ────────────────────────────────────────────────────

/**
 * Resolves agent line items against the synced catalog. Unknown or
 * out-of-stock items are dropped with warnings, mirroring the reference
 * implementation.
 */
export const resolveLineItems = async (
  context: UcpStoreContext,
  payload: unknown,
): Promise<{ lineItems: SessionLineItem[]; messages: UcpMessage[] }> => {
  const messages: UcpMessage[] = [];
  const entries = (Array.isArray(payload) ? payload : []) as LineItemPayload[];

  const requested = entries
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : newLineItemId(),
      itemId: typeof entry.item?.id === "string" ? entry.item.id : "",
      quantity:
        typeof entry.quantity === "number" && entry.quantity > 0
          ? Math.trunc(entry.quantity)
          : 1,
    }))
    .filter((entry) => {
      if (entry.itemId === "") {
        messages.push(
          errorMessage("invalid_request", "Line item is missing item.id."),
        );
        return false;
      }
      return true;
    });

  const synced = await findByUcpIds(
    context.store.id,
    requested.map((entry) => entry.itemId),
  );

  const lineItems: SessionLineItem[] = [];
  for (const entry of requested) {
    // Live catalog first (variant cache → wc/v3 lookup) so variation ids and
    // current prices resolve; the synced table covers store outages.
    const live = await WcCatalog.resolveLineItemSource({
      context,
      id: entry.itemId,
    });
    if (live) {
      lineItems.push({
        id: entry.id,
        productId: "",
        externalId: live.externalId,
        title: live.title,
        quantity: entry.quantity,
        unitPrice: live.unitPrice,
        ...(live.imageUrl ? { imageUrl: live.imageUrl } : {}),
      });
      continue;
    }

    const row = synced.get(entry.itemId);
    if (row) {
      const currency = row.currency ?? "USD";
      const images = (() => {
        try {
          const parsed = JSON.parse(row.images ?? "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

      lineItems.push({
        id: entry.id,
        productId: row.id,
        externalId: productUcpId(row),
        title: row.title,
        quantity: entry.quantity,
        unitPrice: toMinorUnits(row.price, currency) ?? 0,
        ...(typeof images[0] === "string" ? { imageUrl: images[0] } : {}),
      });
      continue;
    }

    // Numeric ids the catalog can't see yet (e.g. a fresh variation) are kept
    // provisionally — the bridge quote is the authority and fills title/price
    // or drops them as unavailable.
    if (/^\d+$/.test(entry.itemId)) {
      lineItems.push({
        id: entry.id,
        productId: "",
        externalId: entry.itemId,
        title: `Item ${entry.itemId}`,
        quantity: entry.quantity,
        unitPrice: 0,
      });
      continue;
    }

    messages.push(
      warningMessage(
        "item_unavailable",
        `"${entry.itemId}" is not available and was removed.`,
      ),
    );
  }

  return { lineItems, messages };
};

// ─── Bridge pricing ──────────────────────────────────────────────────────────

const toBridgeDestination = (
  destination: SessionAddress,
): Bridge.BridgeDestination => ({
  country: destination.country,
  state: destination.state,
  postcode: destination.postal_code,
  city: destination.city,
  address_1: destination.street1,
  address_2: destination.street2,
});

/**
 * Prices the session through the store bridge (real Woo cart math). Mutates
 * nothing: returns the quote, per-line totals and any messages. Falls back to
 * local estimates when the bridge is unreachable so read paths stay up.
 */
export const priceSession = async ({
  context,
  lineItems,
  discountCodes,
  destination,
}: {
  context: UcpStoreContext;
  lineItems: SessionLineItem[];
  discountCodes: string[];
  destination?: SessionAddress;
}): Promise<{
  lineItems: SessionLineItem[];
  quote?: SessionQuote;
  messages: UcpMessage[];
}> => {
  const messages: UcpMessage[] = [];

  if (lineItems.length === 0 || !context.credentials) {
    return { lineItems, messages };
  }

  const response = await Bridge.quote(
    {
      domain: context.store.domain,
      consumerKey: context.credentials.consumerKey,
      consumerSecret: context.credentials.consumerSecret,
    },
    {
      line_items: lineItems.map((lineItem) => ({
        id: lineItem.id,
        product_id: Number(lineItem.externalId),
        quantity: lineItem.quantity,
      })),
      coupon_codes: discountCodes,
      ...(destination ? { destination: toBridgeDestination(destination) } : {}),
    },
  );

  if (!response.success) {
    messages.push(
      warningMessage(
        "totals_estimated",
        "Live pricing is temporarily unavailable; totals are estimates from the synced catalog.",
      ),
    );
    return { lineItems, messages };
  }

  const quoted = response.data;

  const priced = lineItems.map((lineItem) => {
    const match = quoted.line_items.find((entry) => entry.id === lineItem.id);
    if (!match) return lineItem;
    return {
      ...lineItem,
      unitPrice: match.unit_price,
      // The live cart is authoritative — it also fills in provisional items
      // that were resolved by id only.
      title: match.title || lineItem.title,
      ...(lineItem.imageUrl || !match.image_url
        ? {}
        : { imageUrl: match.image_url }),
      totals: {
        subtotal: match.subtotal,
        discount: match.discount,
        total: match.total,
      },
    };
  });

  for (const entry of quoted.line_items) {
    if (!entry.purchasable || !entry.in_stock) {
      messages.push(
        warningMessage(
          "item_unavailable",
          `"${entry.title}" is currently unavailable.`,
        ),
      );
    }
  }

  for (const coupon of quoted.coupons) {
    if (!coupon.valid) {
      messages.push(
        warningMessage(
          "discount_not_applied",
          coupon.reason ??
            `Discount code "${coupon.code}" could not be applied.`,
        ),
      );
    }
  }

  return {
    lineItems: priced.filter((lineItem) => {
      const match = quoted.line_items.find((entry) => entry.id === lineItem.id);
      return match ? match.purchasable && match.in_stock : true;
    }),
    quote: {
      currency: quoted.currency,
      shippingOptions: quoted.shipping_options,
      coupons: quoted.coupons,
      taxTotal: quoted.tax_total,
      requiresShipping: quoted.requires_shipping,
    },
    messages,
  };
};

// ─── Wire shaping ────────────────────────────────────────────────────────────

export const formatLineItem = (
  lineItem: SessionLineItem,
): Record<string, unknown> => {
  const subtotal =
    lineItem.totals?.subtotal ?? lineItem.unitPrice * lineItem.quantity;
  const discount = lineItem.totals?.discount ?? 0;
  const total = lineItem.totals?.total ?? subtotal - discount;

  return {
    id: lineItem.id,
    item: {
      id: lineItem.externalId,
      title: lineItem.title,
      price: lineItem.unitPrice,
      ...(lineItem.imageUrl ? { image_url: lineItem.imageUrl } : {}),
    },
    quantity: lineItem.quantity,
    totals: [
      { type: "subtotal", amount: subtotal },
      ...(discount > 0 ? [{ type: "items_discount", amount: discount }] : []),
      { type: "total", amount: total },
    ],
  };
};

export const sessionSubtotal = (lineItems: SessionLineItem[]): number =>
  lineItems.reduce(
    (accumulated, lineItem) =>
      accumulated +
      (lineItem.totals?.subtotal ?? lineItem.unitPrice * lineItem.quantity),
    0,
  );

export const sessionDiscountTotal = (lineItems: SessionLineItem[]): number =>
  lineItems.reduce(
    (accumulated, lineItem) => accumulated + (lineItem.totals?.discount ?? 0),
    0,
  );

export const appliedDiscounts = (
  quote: SessionQuote | undefined,
): AppliedCoupon[] => (quote?.coupons ?? []).filter((coupon) => coupon.valid);

export const buildTotals = ({
  lineItems,
  currency,
  quote,
  shippingAmount,
}: {
  lineItems: SessionLineItem[];
  currency: string;
  quote?: SessionQuote;
  shippingAmount?: number;
}): Record<string, unknown>[] => {
  const subtotal = sessionSubtotal(lineItems);
  const discount = sessionDiscountTotal(lineItems);
  const tax = quote?.taxTotal ?? 0;
  const fulfillment = shippingAmount ?? 0;
  const total = subtotal - discount + fulfillment + tax;

  const entry = (type: string, amount: number) => ({
    type,
    display_text: displayAmount(amount, currency),
    amount,
  });

  return [
    entry("subtotal", subtotal),
    ...(discount > 0 ? [entry("discount", discount)] : []),
    ...(shippingAmount !== undefined
      ? [entry("fulfillment", fulfillment)]
      : []),
    ...(tax > 0 ? [entry("tax", tax)] : []),
    entry("total", total),
  ];
};
