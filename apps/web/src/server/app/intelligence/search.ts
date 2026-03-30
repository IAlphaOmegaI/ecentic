"use server";

import { resultify } from "@zenncore/utils";
import { z } from "zod";
import * as AI from "../../utils/ai";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import * as Competitor from "../competitor";

export const searchCompetitors = withAuthentication(
  async (context, { query }: { query: string }) => {
    if (!query.trim())
      return {
        success: false,
        error: new Error("Search query is required"),
      };

    const result = await resultify(() =>
      AI.generate({
        system: `You are a competitive intelligence analyst for e-commerce. Given a brand name, product category, or search query, identify real products that would appear in AI shopping agent results.

Rules:
- Only return products you are confident are real, currently sold items. Use exact product names as they appear on retailers — do not paraphrase or invent.
- Cover a range of price points and retailers to give the merchant a realistic competitive landscape.
- Each result must be from a different brand. Prioritize brands with strong marketplace presence (high review counts, bestseller status).
- Include the primary retailer where the product is most visible to AI agents (Amazon, Walmart, Target, eBay, Etsy, DTC/Shopify, etc.).
- If the query is a brand name, return that brand's top products plus alternatives from competing brands.
- If the query is a category, return the products most likely to appear in the top 10 results of an AI-powered shopping search.`,
        prompt: `Find 5-8 competitor products for: "${query}"\n\nReturn products an AI shopping agent would recommend for this search. Include brand, realistic price, primary retailer, and a one-line description of the product's competitive position.`,

        schema: z.object({
          competitors: z.array(
            z.object({
              title: z.string(),
              brand: z.string(),
              price: z.string(),
              currency: z.string(),
              source: z.string(),
              url: z.string().nullable(),
              description: z.string().nullable(),
            }),
          ),
        }),
      }),
    );

    if (!result.success) return result;

    const created = await Promise.all(
      result.data.competitors.map((entry) =>
        Competitor.create(Environment.SERVER, {
          ...entry,
          userId: context.session.user.id,
          selected: true,
        }),
      ),
    );

    const successful = created
      .filter((record) => record.success)
      .map((record) => record.data);

    return { success: true, data: successful };
  },
  "Intelligence.searchCompetitors",
);
