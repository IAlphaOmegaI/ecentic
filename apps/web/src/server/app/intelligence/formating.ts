import { resultify } from "@zenncore/utils";
import { formatPrice } from "@/lib/currency";
import type * as Competitor from "../competitor";
import type * as Product from "../product";

const parseImageCount = (images: string | null | undefined): number => {
  if (!images) return 0;
  const parsed = resultify(() => JSON.parse(images) as unknown);
  if (!parsed.success) return 0;
  return Array.isArray(parsed.data) ? parsed.data.length : 0;
};

export const formatProduct = (product: Product.Type): string => {
  const lines = [`Title: ${product.title}`];

  lines.push(
    product.description
      ? `Description: ${product.description.slice(0, 800)}`
      : "Description: MISSING",
  );
  lines.push(
    product.price
      ? `Price: ${formatPrice(product.price, product.currency)}`
      : "Price: MISSING",
  );
  if (product.compareAtPrice) {
    lines.push(
      `Compare at: ${formatPrice(product.compareAtPrice, product.currency)}`,
    );
  }

  const imageCount = parseImageCount(product.images);
  lines.push(`Image count: ${imageCount}`);

  lines.push(product.sku ? `SKU: ${product.sku}` : "SKU: MISSING");
  lines.push(product.url ? `URL: ${product.url}` : "URL: MISSING");

  lines.push(
    product.structuredData && product.structuredData !== "null"
      ? `Structured data (JSON-LD): ${product.structuredData.slice(0, 600)}`
      : "Structured data (JSON-LD): MISSING",
  );

  return lines.join("\n");
};

// Deterministic UCP / agent-readability score (0-100): how reliably an AI
// shopping agent can parse and trust this listing. Structured JSON-LD dominates
// — it's the UCP mechanism — with the core agent-readable fields on top.
export const computeUcpScore = (product: Product.Type): number => {
  const structured = (() => {
    const parsed = resultify(
      () => JSON.parse(product.structuredData ?? "null") as unknown,
    );
    return parsed.success && parsed.data ? 60 : 0;
  })();

  const fields =
    (product.description ? 10 : 0) +
    (product.price ? 10 : 0) +
    (product.sku ? 10 : 0) +
    (parseImageCount(product.images) > 0 ? 10 : 0);

  return structured + fields;
};

export const formatCompetitor = (competitor: Competitor.Type): string => {
  const lines = [`Title: ${competitor.title}`];

  lines.push(
    competitor.description
      ? `Description: ${competitor.description.slice(0, 800)}`
      : "Description: MISSING",
  );
  lines.push(
    competitor.price
      ? `Price: ${formatPrice(competitor.price, competitor.currency)}`
      : "Price: MISSING",
  );
  lines.push(
    competitor.brand ? `Brand: ${competitor.brand}` : "Brand: MISSING",
  );

  lines.push(
    competitor.image ? "Has product image: Yes" : "Has product image: No",
  );

  if (competitor.source) lines.push(`Source: ${competitor.source}`);
  lines.push(competitor.url ? `URL: ${competitor.url}` : "URL: MISSING");

  return lines.join("\n");
};
