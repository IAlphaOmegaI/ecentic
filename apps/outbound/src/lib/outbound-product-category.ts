const broadCategories = new Set([
  "",
  "beauty",
  "personal care",
  "beauty and personal care",
  "beauty products",
  "cosmetics",
  "makeup",
  "skin care",
  "skincare",
  "health and wellness",
  "health and beauty",
  "wellness",
  "fashion",
  "apparel",
  "apparel and accessories",
  "accessories",
  "consumer goods",
  "consumer products",
  "home and garden",
  "home goods",
  "food and beverage",
  "food and beverages",
  "electronics",
  "pet care",
  "pet supplies",
  "sports and outdoors",
]);

/** Industry labels are not shopper nouns. Use an already sourced product name, never invent a category. */
export const normalizeProductCategory = (category: string, product: string) => {
  const key = category
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ");
  return broadCategories.has(key) ? product.trim() : category;
};
