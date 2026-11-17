import { resultify } from "@zenncore/utils";

const SNIPPET_LIMIT = 600;

const truncate = (value: string, limit = SNIPPET_LIMIT): string =>
  value.length <= limit ? value : `${value.slice(0, limit)}…`;

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads one property off a parsed JSON-LD node. Centralized so the index
 * access lives in a single place — `noPropertyAccessFromIndexSignature` forbids
 * dot access on these, and Biome's `useLiteralKeys` rewrites literal bracket
 * access into it.
 */
const at = (node: JsonObject, key: string): unknown => node[key];

const typesOf = (node: JsonObject): string[] => {
  const raw = at(node, "@type");
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw))
    return raw.filter((value): value is string => typeof value === "string");
  return [];
};

const isProductNode = (node: JsonObject): boolean => {
  const types = typesOf(node);
  return types.includes("Product") || types.includes("ProductGroup");
};

/**
 * The *outermost* Product / ProductGroup nodes in a JSON-LD document — arrays,
 * `@graph` envelopes and nested nodes alike, since real stores use all three
 * shapes.
 *
 * Descent stops at each product it finds. A page publishing one ProductGroup
 * with forty sized variants is one product, not forty-one: counting the
 * subtree would inflate every coverage number the rep reads out ("286 of 286
 * products" off eight pages) and would report a variant twice.
 */
const collectProductNodes = (value: unknown, depth = 0): JsonObject[] => {
  if (depth > 6) return [];
  if (Array.isArray(value))
    return value.flatMap((entry) => collectProductNodes(entry, depth + 1));
  if (!isObject(value)) return [];
  if (isProductNode(value)) return [value];

  return Object.values(value).flatMap((entry) =>
    Array.isArray(entry) || isObject(entry)
      ? collectProductNodes(entry, depth + 1)
      : [],
  );
};

/** Every Product node inside a group's `hasVariant`, one level down. */
const variantNodes = (node: JsonObject): JsonObject[] => {
  const variants = at(node, "hasVariant");
  if (Array.isArray(variants)) return variants.filter(isObject);
  return isObject(variants) ? [variants] : [];
};

export const jsonLdBlocks = (html: string): string[] =>
  [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((match) => (match[1] ?? "").trim())
    .filter((block) => block.length > 0);

const text = (value: unknown): string | null => {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return text(value[0]);
  if (isObject(value)) return text(at(value, "name") ?? at(value, "@value"));
  return null;
};

/**
 * Every offer on a node. `offers` is routinely an array — one per variant or
 * per seller — and a field published on the second offer is just as visible to
 * an agent as one on the first. Reading only `offers[0]` would report it
 * absent and put a false claim on the call.
 */
const offersOf = (node: JsonObject): JsonObject[] => {
  const offers = at(node, "offers");
  if (Array.isArray(offers)) return offers.filter(isObject);
  return isObject(offers) ? [offers] : [];
};

/**
 * Where a barcode actually appears in the wild. Beyond the schema.org `gtin*`
 * properties, themes commonly publish the same number as `productID`, or in an
 * `identifier` / `PropertyValue` pair. Treating those as absent would
 * over-report "no barcode" — the most damaging false claim this page can make.
 */
const GTIN_KEYS = [
  "gtin",
  "gtin14",
  "gtin13",
  "gtin12",
  "gtin8",
  "productID",
  "identifier",
] as const;

/** A bare GTIN, or one wrapped as `{ propertyID: "gtin13", value: "…" }`. */
const gtinValue = (value: unknown): string | null => {
  const direct = text(value)?.replace(/[\s-]/g, "") ?? null;
  if (direct && /^\d{8,14}$/.test(direct)) return direct;

  if (Array.isArray(value))
    return value.map(gtinValue).find((entry) => entry !== null) ?? null;

  if (isObject(value)) {
    const property = (text(at(value, "propertyID")) ?? "").toLowerCase();
    const identifies =
      property.includes("gtin") ||
      property.includes("upc") ||
      property.includes("ean");
    return identifies ? gtinValue(at(value, "value")) : null;
  }

  return null;
};

const gtinOf = (node: JsonObject, offers: JsonObject[]): string | null =>
  [node, ...offers]
    .flatMap((entry) => GTIN_KEYS.map((key) => gtinValue(at(entry, key))))
    .find((value): value is string => value !== null) ?? null;

export type ExtractedProduct = {
  url: string;
  isVariantGroup: boolean;
  hasVariants: boolean;
  name: string | null;
  brand: string | null;
  description: string | null;
  image: string | null;
  sku: string | null;
  mpn: string | null;
  gtin: string | null;
  price: number | null;
  currency: string | null;
  hasShipping: boolean;
  hasReturnPolicy: boolean;
  hasRating: boolean;
  /** The parsed node this was read out of, for the evidence panel. */
  snippet: string;
};

const amount = (value: unknown): number | null => {
  const raw = text(value);
  if (raw === null) return null;
  const parsed = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Every schema.org Product / ProductGroup on one page, with the fields an AI
 * shopping agent reads. Malformed JSON in one block never discards the others.
 */
export const extractProducts = (
  html: string,
  url: string,
): ExtractedProduct[] => {
  const nodes = jsonLdBlocks(html).flatMap((block) => {
    const parsed = resultify(() => JSON.parse(block) as unknown);
    return parsed.success ? collectProductNodes(parsed.data) : [];
  });

  const extracted = nodes.map((node): ExtractedProduct => {
    const variants = variantNodes(node);
    // A field counts as published when it is on the group OR on any of its
    // variants: an agent reading this page would find it either way, and
    // telling a prospect "there is no barcode anywhere" when their variants
    // carry one is the exact claim that loses the call.
    const family = [node, ...variants];
    const offers = family.flatMap(offersOf);
    const offer = offers[0] ?? null;

    return {
      url,
      isVariantGroup: typesOf(node).includes("ProductGroup"),
      hasVariants: variants.length > 0,
      name: text(at(node, "name")),
      brand:
        family.map((entry) => text(at(entry, "brand"))).find(Boolean) ?? null,
      description: text(at(node, "description")),
      image: text(at(node, "image")),
      sku: text(at(node, "sku")),
      mpn: family.map((entry) => text(at(entry, "mpn"))).find(Boolean) ?? null,
      gtin:
        family
          .map((entry) => gtinOf(entry, offersOf(entry)))
          .find((value): value is string => value !== null) ?? null,
      price: offer ? amount(at(offer, "price")) : null,
      currency: offer ? text(at(offer, "priceCurrency")) : null,
      hasShipping: offers.some(
        (entry) => at(entry, "shippingDetails") !== undefined,
      ),
      hasReturnPolicy: offers.some(
        (entry) => at(entry, "hasMerchantReturnPolicy") !== undefined,
      ),
      hasRating: family.some(
        (entry) =>
          at(entry, "aggregateRating") !== undefined ||
          at(entry, "review") !== undefined,
      ),
      snippet: truncate(JSON.stringify(node)),
    };
  });

  // A page routinely publishes the same item twice — once as `Product` for
  // older consumers and once as `ProductGroup` with the variants. Counting
  // both would double every coverage number, so keep one per name and prefer
  // the group, which carries strictly more.
  return [
    ...extracted
      .reduce((deduped, product) => {
        const key = (product.name ?? product.url).toLowerCase();
        const existing = deduped.get(key);
        if (!existing || (product.isVariantGroup && !existing.isVariantGroup))
          deduped.set(key, product);
        return deduped;
      }, new Map<string, ExtractedProduct>())
      .values(),
  ];
};
