import { resultify } from "@zenncore/utils";
import * as Evidence from "@/lib/competitor-evidence";
import { formatPrice } from "@/lib/currency";
import type * as Competitor from "../competitor";
import type * as Product from "../product";

const parseImageCount = (images: string | null | undefined): number => {
  if (!images) return 0;
  const parsed = resultify(() => JSON.parse(images) as unknown);
  if (!parsed.success) return 0;
  return Array.isArray(parsed.data) ? parsed.data.length : 0;
};

/**
 * The merchant's own listing, rendered from their catalog. `MISSING` here is
 * honest and load-bearing: these fields are ones the merchant can go and fill
 * in, so the rubric SHOULD penalize a blank one. {@link formatCompetitor}
 * deliberately does the opposite — see the note there before making the two
 * symmetric again.
 */
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

/**
 * The safety boundary for the judged path.
 *
 * This function used to mirror {@link formatProduct}, printing `Price: MISSING`
 * / `Brand: MISSING` for every null column. That reads to the rubric as a
 * listing with critical data absent — its 0-30 band — so any ingestion path
 * that produced a sparse row handed the merchant a free win, and the inflated
 * win rate propagated into the competitors table, product detail, the CSV
 * export and `listingOptimization`'s lift figures. The asymmetry with
 * `formatProduct` is deliberate and explained there.
 *
 * Fixing it here rather than in each writer is the point: `detect.ts`,
 * `search.ts` and `scrape.ts` each go sparse for their own reasons, and every
 * ingestion path added later would recreate the bug in a new shape. The
 * formatter is the one place all of them pass through.
 *
 * Absent fields are named once, as capture gaps, and the judge prompts
 * (JUDGE_SYSTEM / JUDGE_SYSTEM_AB) instruct the model to exclude them from the
 * comparison rather than score them — the same treatment the UCP paragraph
 * already gives one-sided structured-data visibility.
 */
export const formatCompetitor = (competitor: Competitor.Type): string => {
  const lines = [`Title: ${competitor.title}`];

  if (competitor.description)
    lines.push(`Description: ${competitor.description.slice(0, 800)}`);
  if (competitor.price)
    lines.push(`Price: ${formatPrice(competitor.price, competitor.currency)}`);
  if (competitor.brand) lines.push(`Brand: ${competitor.brand}`);
  // Only a real photograph counts. `image` is a guessed brand favicon on every
  // AI path (lib/logo.ts), and claiming that as product imagery inflated the
  // rival in the opposite direction to the gaps above.
  if (Evidence.hasProductImage(competitor)) lines.push("Product image: yes");
  if (competitor.source) lines.push(`Source: ${competitor.source}`);
  if (competitor.url) lines.push(`URL: ${competitor.url}`);

  // Price is normally guaranteed by `Evidence.isJudgeable`, which keeps
  // priceless rows out of scans entirely. It is listed defensively because
  // nothing in the type system stops a future caller formatting one.
  const gaps = [
    ...(competitor.price ? [] : ["price"]),
    ...Evidence.captureGaps(competitor),
  ];

  if (gaps.length > 0)
    lines.push(
      `Not captured about this listing: ${gaps.join(", ")} (unknown to us, NOT confirmed absent — exclude from scoring)`,
    );

  return lines.join("\n");
};
