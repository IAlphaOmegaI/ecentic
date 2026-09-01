"use server";

import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { getBrandLogo } from "@/lib/logo";
import * as AI from "../../utils/ai";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import * as Competitor from "../competitor";

const candidate = z.object({
  title: z.string(),
  brand: z.string(),
  price: z.string(),
  currency: z.string(),
  source: z.string(),
  url: z.string().nullable(),
  description: z.string().nullable(),
});

export const searchCompetitors = withAuthentication(
  async (context, { query, store }: { query: string; store: string }) => {
    if (!query.trim())
      return {
        success: false as const,
        error: new Error("Search query is required"),
      };

    const result = await resultify(() =>
      AI.generate({
        label: "search.competitors",
        instructions: `You are a competitive intelligence analyst for e-commerce. Given a brand name, product category, or search query, identify real products that would appear in AI shopping agent results.

Rules:
- Only return products you are confident are real, currently sold items. Use exact product names as they appear on retailers — do not paraphrase or invent.
- Cover a range of price points and retailers to give the merchant a realistic competitive landscape.
- Each result must be from a different brand. Prioritize brands with strong marketplace presence (high review counts, bestseller status).
- Include the primary retailer where the product is most visible to AI agents (Amazon, Walmart, Target, eBay, Etsy, DTC/Shopify, etc.).
- If the query is a brand name, return that brand's top products plus alternatives from competing brands.
- If the query is a category, return the products most likely to appear in the top 10 results of an AI-powered shopping search.
- Price is the numeric value only (e.g. "129.95"), currency a 3-letter code (USD, EUR, GBP).
- Return a URL only when you are confident it resolves; return null rather than guessing a product path.`,
        prompt: `Find 5-8 competitor products for: "${query}"\n\nReturn products an AI shopping agent would recommend for this search. Include brand, realistic price, primary retailer, and a one-line description of the product's competitive position.`,
        output: z.object({ competitors: z.array(candidate) }),
      }),
    );

    if (!result.success)
      return { success: false as const, error: result.error };

    // Dedupe by brand + title so a repeated search does not stack the same
    // rival twice within one batch.
    const seen = new Set<string>();
    const candidates = result.data.competitors.filter((entry) => {
      const title = entry.title.trim();
      if (!title) return false;

      const key = `${title.toLowerCase()}|${entry.brand.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (candidates.length === 0)
      return {
        success: false as const,
        error: new Error(
          `No competitors found for "${query}". Try a broader brand or category.`,
        ),
      };

    const created = await Promise.all(
      candidates.map((entry) =>
        Competitor.create(Environment.SERVER, {
          ...entry,
          title: entry.title.trim(),
          brand: entry.brand.trim(),
          userId: context.session.user.id,
          storeId: store,
          selected: true,
          // A model named this; no fetch confirmed it.
          confidence: "inferred" as const,
          image: getBrandLogo(entry.brand.trim() || entry.title.trim()),
        }),
      ),
    );

    const successful = created
      .filter((record) => record.success)
      .map((record) => record.data);

    if (successful.length === 0)
      return {
        success: false as const,
        error: new Error("Could not save the competitors we found."),
      };

    return { success: true as const, data: successful };
  },
  "Intelligence.searchCompetitors",
);
