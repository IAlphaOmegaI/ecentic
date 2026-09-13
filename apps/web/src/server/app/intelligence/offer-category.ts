import { resultify } from "@zenncore/utils";
import { z } from "zod";
import * as AI from "../../utils/ai";
import { extractCatalogFacts } from "../feed-export";
import { categoryQueryFromCatalog } from "./offer-category-query";

/**
 * Category shopping queries for private-label / unique-title products.
 *
 * Exact-title Google Shopping lookups answer "who else sells this SKU". When
 * nobody does, simulations still need same-category peers — derived here as a
 * short unbranded query, never by inventing rival names.
 */

export {
  categoryQueryFromCatalog,
  isSpecificProductType,
} from "./offer-category-query";

/**
 * Prefer the merchant's own product type; otherwise ask the model for a short
 * unbranded shopping query. Returns null when neither path yields anything
 * usable — callers treat that as "no category fallback".
 */
export const deriveCategoryQuery = async (product: {
  title: string;
  description: string | null;
  rawData: string | null | undefined;
}): Promise<string | null> => {
  const fromCatalog = categoryQueryFromCatalog(product.rawData);
  if (fromCatalog) return fromCatalog;

  const facts = extractCatalogFacts(product.rawData);

  const generation = await resultify(() =>
    AI.generate({
      label: "offers.categoryQuery",
      model: "gpt",
      instructions: `You turn a merchant product into a short Google Shopping search query for CATEGORY peers — not the same SKU.

Rules:
- Return 2 to 5 words naming the product type a shopper would search (e.g. "women's wide brim hat", "ceramic pour over kettle").
- Strip brand names, designer names, proper nouns, model numbers, and SKU codes.
- Do not include the merchant's store name or invented rival brands.
- Prefer common retail category language over marketing slogans.
- If the product is too vague to classify, return an empty query string.`,
      prompt: `Title: ${product.title}
Description: ${product.description?.trim() || "(none)"}
Product type from catalog: ${facts.productType ?? "(none)"}
Brand from catalog: ${facts.brand ?? "(none)"}`,
      output: z.object({
        query: z
          .string()
          .describe(
            "2-5 word unbranded category shopping query, or empty if unknown",
          ),
      }),
    }),
  );

  if (!generation.success) return null;

  const query = generation.data.query.trim().replace(/\s+/g, " ").slice(0, 80);

  if (query.length < 2) return null;
  // Refuse queries that are just the original unique title (no broadening).
  if (query.toLowerCase() === product.title.trim().toLowerCase()) return null;

  return query;
};
