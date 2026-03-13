"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../database";
import { generate } from "../../utils/ai";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import * as Competitor from "../competitor";
import * as Product from "../product";

export const detectCompetitors = withAuthentication(
  async (context, { productIds }: { productIds: string[] }) => {
    const products = await Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, context.session.user.id),
    });

    if (!products.success) return products;

    const selected = products.data.filter((product) =>
      productIds.includes(product.id),
    );

    if (selected.length === 0)
      return {
        success: false as const,
        error: new Error("No products selected"),
      };

    const summaries = selected
      .map(
        (product) =>
          `- ${product.title}${product.price ? ` ($${product.price})` : ""}${product.description ? `: ${product.description.slice(0, 200)}` : ""}`,
      )
      .join("\n");

    const result = await resultify(() =>
      generate({
        system: `You are a competitive intelligence analyst for e-commerce merchants. Your job is to identify the specific competing products a merchant's items will be compared against by AI shopping agents and recommendation engines.

Rules:
- Only return products you are confident exist as real, purchasable items from established brands. Do not invent products or brands.
- Match competitors within the same price tier (±40% of the merchant's price) and product subcategory — not just the broad category.
- Prioritize competitors that rank highly on Amazon, Walmart, and Target, since those are where AI shopping agents pull recommendations from.
- For each merchant product, return 2-4 competitors from different brands. Avoid repeating the same brand across multiple merchant products unless it genuinely dominates that subcategory.
- Include the exact product name as it appears on the retailer, not a paraphrased version.
- If you are unsure whether a product exists, omit it rather than guess.`,
        prompt: `Here are the merchant's products:\n${summaries}\n\nFor each product above, identify 2-4 real competitor products that an AI shopping agent would surface when a consumer searches for something in that category and price range. Include brand, price, primary retailer (Amazon, Walmart, Target, eBay, Etsy, Shopify store, or Direct), and a one-line description of why it competes.`,
        schema: z.object({
          competitors: z.array(
            z.object({
              title: z.string(),
              brand: z.string(),
              price: z.string(),
              currency: z.string().default("USD"),
              source: z.string(),
              url: z.string().nullable(),
              description: z.string().nullable(),
            }),
          ),
        }),
      }),
    );

    if (!result.success)
      return { success: false as const, error: result.error };

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

    return { success: true as const, data: successful };
  },
  "Intelligence.detectCompetitors",
);
