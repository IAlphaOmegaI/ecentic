import type * as Competitor from "../competitor";
import type * as Product from "../product";

export const formatProduct = (product: Product.Type): string => {
  const lines = [`Title: ${product.title}`];
  if (product.description)
    lines.push(`Description: ${product.description.slice(0, 500)}`);
  if (product.price)
    lines.push(`Price: ${product.currency ?? "USD"} ${product.price}`);
  if (product.compareAtPrice)
    lines.push(
      `Compare at: ${product.currency ?? "USD"} ${product.compareAtPrice}`,
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
    lines.push(`Price: ${competitor.currency ?? "USD"} ${competitor.price}`);
  if (competitor.brand) lines.push(`Brand: ${competitor.brand}`);
  if (competitor.source) lines.push(`Source: ${competitor.source}`);
  if (competitor.url) lines.push(`URL: ${competitor.url}`);
  return lines.join("\n");
};
