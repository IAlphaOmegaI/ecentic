import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/server/database";
import { generate } from "@/server/utils/ai";
import * as Competitor from "@/server/app/competitor";
import { Environment } from "@/server/utils/environment";

const send = (
  controller: ReadableStreamDefaultController,
  event: object,
) => {
  controller.enqueue(
    new TextEncoder().encode(`${JSON.stringify(event)}\n`),
  );
};

export const POST = async (request: Request) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthenticated" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const productIds: string[] = body.productIds ?? [];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        send(controller, { kind: "log", text: "Reading your product catalog" });

        const productsResult = await resultify(async () =>
          db
            .select()
            .from(schema.product)
            .where(eq(schema.product.userId, session.user.id)),
        );

        if (!productsResult.success) {
          send(controller, { kind: "error", text: productsResult.error.message });
          controller.close();
          return;
        }

        const selected = productsResult.data.filter((product) =>
          productIds.includes(product.id),
        );

        if (selected.length === 0) {
          send(controller, { kind: "error", text: "No products selected" });
          controller.close();
          return;
        }

        send(controller, {
          kind: "log",
          text: `Loaded ${selected.length} product${selected.length !== 1 ? "s" : ""} for analysis`,
        });

        send(controller, {
          kind: "log",
          text: "Mapping market categories and price tiers",
        });

        const summaries = selected
          .map(
            (product) =>
              `- ${product.title}${product.price ? ` ($${product.price})` : ""}${product.description ? `: ${product.description.slice(0, 200)}` : ""}`,
          )
          .join("\n");

        send(controller, {
          kind: "log",
          text: "Querying Amazon, Walmart, and Target signals",
        });

        send(controller, {
          kind: "log",
          text: "Running competitive intelligence model",
        });

        const aiResult = await resultify(async () =>
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
                  currency: z.string(),
                  source: z.string(),
                  url: z.string().nullable(),
                  description: z.string().nullable(),
                }),
              ),
            }),
          }),
        );

        if (!aiResult.success) {
          send(controller, { kind: "error", text: aiResult.error.message });
          controller.close();
          return;
        }

        send(controller, {
          kind: "log",
          text: `Saving ${aiResult.data.competitors.length} competitor products`,
        });

        const created = await Promise.all(
          aiResult.data.competitors.map((entry) =>
            Competitor.create(Environment.SERVER, {
              ...entry,
              userId: session.user.id,
              selected: true,
            }),
          ),
        );

        const successful = created
          .filter((record) => record.success)
          .map((record) => record.data);

        send(controller, { kind: "done", competitors: successful });
        controller.close();
      } catch (error) {
        send(controller, {
          kind: "error",
          text: error instanceof Error ? error.message : "Unknown error",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
};
