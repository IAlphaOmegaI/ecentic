import { formatPrice } from "@/lib/currency";
import type * as Competitor from "../competitor";
import type * as Product from "../product";

export const formatProduct = (product: Product.Type): string => {
  const lines = [`Title: ${product.title}`];
  if (product.description)
    lines.push(`Description: ${product.description.slice(0, 500)}`);
  if (product.price)
    lines.push(`Price: ${formatPrice(product.price, product.currency)}`);
  if (product.compareAtPrice)
    lines.push(
      `Compare at: ${formatPrice(product.compareAtPrice, product.currency)}`,
    );
  if (product.sku) lines.push(`SKU: ${product.sku}`);
  if (product.url) lines.push(`URL: ${product.url}`);
  return lines.join("\n");
};

export const formatCompetitor = (competitor: Competitor.Type): string => {
  const lines = [`Title: ${competitor.title}`];
  if (competitor.description)
    lines.push(`Description: ${competitor.description.slice(0, 500)}`);
  if (competitor.price)
    lines.push(`Price: ${formatPrice(competitor.price, competitor.currency)}`);
  if (competitor.brand) lines.push(`Brand: ${competitor.brand}`);
  if (competitor.source) lines.push(`Source: ${competitor.source}`);
  if (competitor.url) lines.push(`URL: ${competitor.url}`);
  return lines.join("\n");
};
