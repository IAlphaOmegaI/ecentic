import { z } from "zod";

export const productInsightSchema = z.object({
  sourceUrl: z.url(),
  sourceQuote: z.string().trim().min(20).max(1000),
  feature: z.string().trim().min(8).max(110),
  kind: z.enum([
    "ingredient",
    "material",
    "design",
    "compatibility",
    "care",
    "formulation",
  ]),
  relevance: z.string().trim().min(20).max(500),
});
export type ProductInsight = z.infer<typeof productInsightSchema>;

const normalized = (value: string) => value.replace(/\s+/g, " ").trim();

/** A proposed shopper question is grounded in a specific published product attribute.
 * Relevance is internal reasoning, never a claim about measured AI behavior. */
export const validateProductInsight = (
  insight: ProductInsight | null | undefined,
  product: { name: string; brand: string; url: string; description: string },
  receipts: { url: string; kind: string; excerpt: string }[],
): string | null => {
  if (!insight)
    return "The product research did not identify a specific, source-backed buying detail.";
  const feature = normalized(insight.feature);
  const quote = normalized(insight.sourceQuote);
  const words = feature.split(/\s+/);
  const generic =
    /\b(?:shop now|buy now|add to cart|in stock|free shipping|on sale|best(?:selling| seller)?|premium|luxury|high[ -]quality|great|amazing|innovative|game[ -]changing)\b/i;
  const unsafe =
    /[{}<>\r\n!?;]|https?:|\b(?:guarantee[ds]?|cures?|treats?|prevents?|clinically|sales|conversions?|ranking|invisible)\b/i;
  if (insight.sourceUrl !== product.url)
    return "The insight source URL does not match the named product.";
  if (
    words.length < 2 ||
    words.length > 16 ||
    feature.toLowerCase() === normalized(product.name).toLowerCase() ||
    feature.toLowerCase() === normalized(product.brand).toLowerCase() ||
    generic.test(feature) ||
    unsafe.test(feature)
  )
    return "The selected product feature is generic, unsafe or outside the supported length.";
  if (!quote.includes(feature))
    return "The selected product feature is not a verbatim part of its source quote.";
  if (
    !receipts.some(
      (receipt) =>
        receipt.kind === "product" &&
        receipt.url === product.url &&
        normalized(receipt.excerpt).includes(quote),
    )
  )
    return "The insight quote does not match the saved product page receipt.";
  return null;
};
