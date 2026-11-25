/** Loop data is read for one consenting merchant, never combined across merchants. */
import { createHash } from "node:crypto";
import {
  assertMerchant,
  exchangeDirection,
  normalizeReason,
  redactComment,
} from "@ecentic/loop";
import { productRevision } from "@/server/utils/product-revision";
import type { FieldDiff, SignalMetric } from "./signal-types";

export type SignalLine = {
  storeId: string;
  productId: string | null;
  loopReturnId: string;
  lineItemId: string;
  providerOrderId?: string | null;
  variantId: string | null;
  returnReason: string;
  parentReturnReason: string | null;
  redactedComment: string | null;
  price: string | null;
  refund?: string | null;
  currency: string | null;
  returnState: string;
  createdAt: Date;
  returnedAt: Date | null;
  exchangeVariant: string | null;
  quantity?: number;
};
export type SignalProduct = {
  id: string;
  storeId: string;
  title: string;
  description: string | null;
  rawData: string | null;
  structuredData?: string | null;
  price: string | null;
  currency: string | null;
  url?: string | null;
};
export type Mapping = {
  storeId: string;
  reason: string;
  parentReason: string;
  category: string;
  dataFixable: boolean;
};

const owned = (store: string, records: { storeId: string }[]) => {
  assertMerchant(store);
  if (records.some((entry) => entry.storeId !== store))
    throw new Error("Loop records must belong to exactly one merchant");
};
const raw = (value: string | null | undefined): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(value ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};
const scopedLines = (
  store: string,
  lines: SignalLine[],
  start: Date,
  end: Date,
) => {
  owned(store, lines);
  return [
    ...new Map(lines.map((line) => [line.lineItemId, line])).values(),
  ].filter(
    (line) =>
      line.returnState !== "cancelled" &&
      line.createdAt >= start &&
      line.createdAt < end,
  );
};
const mappingFor = (store: string, line: SignalLine, mappings: Mapping[]) => {
  const pair = normalizeReason(
    store,
    line.returnReason,
    line.parentReturnReason,
  );
  return mappings.find(
    (entry) =>
      entry.reason === pair.reason &&
      entry.parentReason === (pair.parent ?? ""),
  );
};

export const productFingerprint = (store: string, product: SignalProduct) => {
  owned(store, [product]);
  return productRevision(product);
};

/** Existing reason overrides invalidate review; unrelated products' mappings do not. */
export const reasonFingerprint = (
  store: string,
  product: string,
  lines: SignalLine[],
  mappings: Mapping[],
) => {
  owned(store, [...lines, ...mappings]);
  const pairs = new Set(
    lines
      .filter((line) => line.productId === product)
      .map(
        (line) =>
          normalizeReason(store, line.returnReason, line.parentReturnReason)
            .key,
      ),
  );
  return createHash("sha256")
    .update(
      JSON.stringify(
        mappings
          .filter((mapping) =>
            pairs.has(
              normalizeReason(store, mapping.reason, mapping.parentReason).key,
            ),
          )
          .map(({ reason, parentReason, category, dataFixable }) => [
            reason,
            parentReason,
            category,
            dataFixable,
          ])
          .sort((first, second) =>
            JSON.stringify(first).localeCompare(JSON.stringify(second)),
          ),
      ),
    )
    .digest("hex");
};

export const exchangeSummary = (
  store: string,
  product: SignalProduct,
  lines: SignalLine[],
) => {
  owned(store, [product, ...lines]);
  const data = raw(product.rawData);
  const options = Array.isArray(data["options"])
    ? (data["options"] as { name?: string; position?: number }[])
    : [];
  const variants = (
    Array.isArray(data["variants"]) ? data["variants"] : []
  ) as Record<string, unknown>[];
  const find = (id: string | null) => {
    const variant = variants.find((entry) => String(entry["id"]) === id);
    return variant
      ? {
          store,
          id: String(variant["id"]),
          productId: product.id,
          options: Object.fromEntries(
            options.flatMap((option, index) => {
              const value = variant[`option${option.position ?? index + 1}`];
              return option.name && typeof value === "string"
                ? [[option.name, value]]
                : [];
            }),
          ),
        }
      : null;
  };
  const directions = lines.flatMap((line) => {
    const from = find(line.variantId);
    const to = find(line.exchangeVariant);
    if (!from || !to) return [];
    const direction = exchangeDirection(store, { from, to });
    return direction ? [direction] : [];
  });
  return {
    up: directions.filter((entry) => entry.direction === "up").length,
    down: directions.filter((entry) => entry.direction === "down").length,
    same: directions.filter((entry) => entry.direction === "same").length,
    oneSizeUp: directions.filter(
      (entry) => entry.direction === "up" && entry.steps === 1,
    ).length,
    known: directions.length,
  };
};

export const computeGaps = ({
  store,
  lines,
  products,
  mappings,
  now = new Date(),
  minimumCount = 5,
  minimumShare = 0.2,
  windowDays = 60,
}: {
  store: string;
  lines: SignalLine[];
  products: SignalProduct[];
  mappings: Mapping[];
  now?: Date;
  minimumCount?: number;
  minimumShare?: number;
  windowDays?: number;
}) => {
  owned(store, [...lines, ...products, ...mappings]);
  if (
    !Number.isFinite(minimumCount) ||
    minimumCount < 1 ||
    minimumShare < 0 ||
    minimumShare > 1 ||
    !Number.isFinite(minimumShare) ||
    windowDays < 1 ||
    !Number.isFinite(windowDays)
  )
    throw new Error("Invalid Loop gap thresholds");
  const start = new Date(now.getTime() - windowDays * 864e5);
  const current = scopedLines(store, lines, start, now);
  return products
    .flatMap((product) => {
      const returns = current.filter((line) => line.productId === product.id);
      const categories = [
        ...new Set(
          returns.flatMap((line) => {
            const mapping = mappingFor(store, line, mappings);
            return mapping?.dataFixable ? [mapping.category] : [];
          }),
        ),
      ];
      return categories.flatMap((attribute) => {
        const matching = returns.filter((line) => {
          const mapping = mappingFor(store, line, mappings);
          return mapping?.dataFixable && mapping.category === attribute;
        });
        const count = matching.length;
        const share = count / returns.length;
        if (count < minimumCount || share < minimumShare) return [];
        const currencies = [...new Set(matching.map((line) => line.currency))];
        const currency =
          currencies.length === 1 && currencies[0] ? currencies[0] : "MIXED";
        const refundValue =
          currency === "MIXED"
            ? "0.00"
            : matching
                .reduce(
                  (sum, line) => sum + (Number(line.refund ?? line.price) || 0),
                  0,
                )
                .toFixed(2);
        const exchanges = exchangeSummary(store, product, matching);
        const comments = [
          ...new Set(
            matching.flatMap((line) =>
              line.redactedComment
                ? [redactComment(store, line.redactedComment).slice(0, 500)]
                : [],
            ),
          ),
        ].slice(0, 5);
        return [
          {
            productId: product.id,
            variantId: null,
            attribute,
            direction:
              exchanges.up > exchanges.down
                ? "up"
                : exchanges.down > exchanges.up
                  ? "down"
                  : null,
            count,
            share,
            refundValue,
            currency,
            windowStart: start,
            windowEnd: now,
            evidence: {
              comments,
              exchanges,
              totalReturns: returns.length,
              attributes: [] as string[],
              refundEstimated: matching.some((line) => line.refund == null),
            },
          },
        ];
      });
    })
    .sort(
      (first, second) =>
        first.currency.localeCompare(second.currency) ||
        Number(second.refundValue) - Number(first.refundValue) ||
        first.productId.localeCompare(second.productId),
    );
};

export const selectControls = ({
  store,
  product,
  products,
  excluded = [],
}: {
  store: string;
  product: SignalProduct;
  products: SignalProduct[];
  excluded?: string[];
}) => {
  owned(store, [product, ...products]);
  const category = String(raw(product.rawData)["product_type"] ?? "")
    .trim()
    .toLowerCase();
  const price = Number(product.price);
  if (!category || !Number.isFinite(price) || price <= 0) return [];
  return products
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        !excluded.includes(candidate.id) &&
        candidate.currency === product.currency &&
        String(raw(candidate.rawData)["product_type"] ?? "")
          .trim()
          .toLowerCase() === category &&
        Number(candidate.price) >= price / 2 &&
        Number(candidate.price) <= price * 2,
    )
    .sort(
      (first, second) =>
        Math.abs(Number(first.price) - price) -
          Math.abs(Number(second.price) - price) ||
        first.id.localeCompare(second.id),
    )
    .slice(0, 3)
    .map((candidate) => candidate.id);
};

export const measure = ({
  store,
  lines,
  mappings,
  products,
  attribute,
  start,
  end,
}: {
  store: string;
  lines: SignalLine[];
  mappings: Mapping[];
  products: string[];
  attribute: string;
  start: Date;
  end: Date;
}): SignalMetric => {
  owned(store, [...lines, ...mappings]);
  const returns = scopedLines(store, lines, start, end).filter(
    (line) => line.productId && products.includes(line.productId),
  );
  const matching = returns.filter((line) => {
    const mapping = mappingFor(store, line, mappings);
    return mapping?.dataFixable && mapping.category === attribute;
  });
  return {
    returns: returns.length,
    gapReturns: matching.length,
    gapShare: returns.length ? matching.length / returns.length : null,
    returnedUnits: returns.reduce((sum, line) => sum + (line.quantity ?? 1), 0),
    orderedUnits: null,
    returnRate: null,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
  };
};

/** Extractors can select literal source text; they cannot turn an observation into a product fact. */
export const groundedAttributes = (
  store: string,
  comments: string[],
  extracted: string[],
) => {
  assertMerchant(store);
  return [
    ...new Set(
      extracted
        .filter(
          (attribute) =>
            attribute.length >= 3 &&
            attribute.length <= 200 &&
            comments.some((comment) => comment.includes(attribute)),
        )
        .map((attribute) => redactComment(store, attribute)),
    ),
  ].slice(0, 5);
};

export const feedbackDiff = ({
  store,
  product,
  attribute,
  count,
  comments,
}: {
  store: string;
  product: SignalProduct;
  attribute: string;
  count: number;
  comments: string[];
}): FieldDiff[] => {
  owned(store, [product]);
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const quote = comments[0]
    ? ` Shoppers reported: “${redactComment(store, comments[0]).slice(0, 200)}”.`
    : "";
  const note = `Return feedback (${count} returned items, ${attribute.replaceAll("_", " ")}):${quote || " Shoppers reported a difference between their expectations and this product."}`;
  return [
    {
      field: "description",
      before: product.description,
      after: `${product.description ?? ""}\n<p>${escapeHtml(note)}</p>`,
      source: "return_feedback",
    },
  ];
};

export const assessAnswer = ({
  store,
  answer,
  product,
  quote,
  fact,
  verdict,
}: {
  store: string;
  answer: string;
  product: SignalProduct;
  quote: string | null;
  fact: string | null;
  verdict: string;
}) => {
  owned(store, [product]);
  if (!answer.trim() || !quote || !answer.includes(quote))
    return { status: "inconclusive", evidence: null };
  const corpus = [product.description, product.rawData, product.structuredData]
    .filter(Boolean)
    .join("\n");
  if (
    (verdict === "wrong" || verdict === "correct") &&
    (!fact || !corpus.includes(fact))
  )
    return { status: "inconclusive", evidence: quote };
  if (!["wrong", "missing", "vague", "correct"].includes(verdict))
    return { status: "inconclusive", evidence: quote };
  return { status: verdict, evidence: quote };
};

export const knownAiReturns = ({
  store,
  lines,
  mappings,
  product,
  attribute,
  orders,
  start,
  end,
}: {
  store: string;
  lines: Parameters<typeof measure>[0]["lines"];
  mappings: Parameters<typeof measure>[0]["mappings"];
  product: string;
  attribute: string;
  orders: { storeId: string; shopifyOrderId: string; orderedAt: Date }[];
  start: Date;
  end: Date;
}) => {
  assertMerchant(store);
  owned(store, [...lines, ...mappings]);
  if (orders.some((order) => order.storeId !== store))
    throw new Error("Loop attribution cannot cross merchants");
  const known = new Set(orders.map((order) => order.shopifyOrderId));
  const measured = measure({
    store,
    lines: lines.filter((line) =>
      Boolean(line.providerOrderId && known.has(line.providerOrderId)),
    ),
    mappings,
    products: [product],
    attribute,
    start,
    end,
  });
  return {
    returns: measured.returns,
    gapReturns: measured.gapReturns,
    gapShare: measured.gapShare,
    returnRate: null,
    knownOrders: new Set(
      orders
        .filter((order) => order.orderedAt >= start && order.orderedAt < end)
        .map((order) => order.shopifyOrderId),
    ).size,
  };
};

export const emptyMetric = (
  store: string,
  start: Date,
  end: Date,
): SignalMetric => {
  assertMerchant(store);
  return {
    returns: 0,
    gapReturns: 0,
    gapShare: null,
    returnedUnits: 0,
    orderedUnits: null,
    returnRate: null,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
  };
};

/** Existing reason definitions stay frozen; genuinely new merchant pairs can still count. */
export const measurementMappings = (
  store: string,
  frozen: Mapping[],
  current: Mapping[],
) => {
  owned(store, [...frozen, ...current]);
  return [
    ...current.filter(
      (entry) =>
        !frozen.some(
          (original) =>
            original.reason === entry.reason &&
            original.parentReason === entry.parentReason,
        ),
    ),
    ...frozen,
  ];
};

export const combineMetrics = (
  store: string,
  metrics: SignalMetric[],
  start: Date,
  end: Date,
): SignalMetric => {
  assertMerchant(store);
  const returns = metrics.reduce((sum, metric) => sum + metric.returns, 0);
  const gapReturns = metrics.reduce(
    (sum, metric) => sum + metric.gapReturns,
    0,
  );
  return {
    ...emptyMetric(store, start, end),
    returns,
    gapReturns,
    gapShare: returns ? gapReturns / returns : null,
    returnedUnits: metrics.reduce(
      (sum, metric) => sum + metric.returnedUnits,
      0,
    ),
  };
};
