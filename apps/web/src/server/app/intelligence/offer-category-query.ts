/**
 * Deterministic category-query helpers — no model, no Serp, no Product module.
 *
 * Kept free of `feed-export` / `utils/ai` so unit specs can cover the
 * product-type gate without loading the RSC streamable client.
 */

/** Shopify/Woo catch-alls that are useless as a Shopping query on their own. */
const VAGUE_PRODUCT_TYPES = new Set([
  "accessories",
  "other",
  "misc",
  "miscellaneous",
  "general",
  "products",
  "items",
  "all",
  "default",
  "uncategorized",
  "sin categorizar",
]);

export const isSpecificProductType = (
  value: string | null | undefined,
): value is string => {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < 2) return false;
  return !VAGUE_PRODUCT_TYPES.has(trimmed.toLowerCase());
};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

/**
 * Reads Shopify `product_type` or the first WooCommerce category name from the
 * same raw payload shape `extractCatalogFacts` uses — without importing the
 * feed module (which pulls Product/Store and the AI RSC client into specs).
 */
export const productTypeFromRaw = (
  rawData: string | null | undefined,
): string | null => {
  if (!rawData) return null;

  try {
    const parsed = JSON.parse(rawData) as {
      product_type?: unknown;
      categories?: unknown;
    };
    const fromShopify = asString(parsed.product_type);
    if (fromShopify) return fromShopify;

    const categories = Array.isArray(parsed.categories)
      ? (parsed.categories as { name?: unknown }[])
      : [];
    return asString(categories[0]?.name);
  } catch {
    return null;
  }
};

/**
 * Returns the merchant's product type when it is specific enough to search
 * Shopping; otherwise null so the LLM path can run.
 */
export const categoryQueryFromCatalog = (
  rawData: string | null | undefined,
): string | null => {
  const productType = productTypeFromRaw(rawData);
  if (!isSpecificProductType(productType)) return null;
  return productType.trim();
};
