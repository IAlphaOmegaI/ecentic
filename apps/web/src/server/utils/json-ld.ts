/**
 * Readers for schema.org JSON-LD as storefronts actually publish it: arrays,
 * `@graph` envelopes, nested nodes, ProductGroup variant families, and
 * identifiers in whichever property a theme chose.
 *
 * Lifted out of the prospect scanner (`intelligence/prospect.ts`) so the claim
 * check reads a product page the same way. Each reader answers one narrow
 * question about the markup and leaves interpretation to its caller — the
 * prospect scan wants coverage, the claim check wants every offer kept apart.
 */

export type JsonObject = Record<string, unknown>;

export const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads one property off a parsed JSON-LD node. Centralized so the index
 * access lives in a single place — `noPropertyAccessFromIndexSignature` forbids
 * dot access on these, and Biome's `useLiteralKeys` rewrites literal bracket
 * access into it.
 */
export const at = (node: JsonObject, key: string): unknown => node[key];

export const typesOf = (node: JsonObject): string[] => {
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
export const collectProductNodes = (
  value: unknown,
  depth = 0,
): JsonObject[] => {
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
export const variantNodes = (node: JsonObject): JsonObject[] => {
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

export const text = (value: unknown): string | null => {
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
export const offersOf = (node: JsonObject): JsonObject[] => {
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
export const gtinValue = (value: unknown): string | null => {
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

export const gtinOf = (node: JsonObject, offers: JsonObject[]): string | null =>
  [node, ...offers]
    .flatMap((entry) => GTIN_KEYS.map((key) => gtinValue(at(entry, key))))
    .find((value): value is string => value !== null) ?? null;

export const amount = (value: unknown): number | null => {
  const raw = text(value);
  if (raw === null) return null;
  const parsed = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};
