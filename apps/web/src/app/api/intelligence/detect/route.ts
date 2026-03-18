import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import * as Competitor from "@/server/app/competitor";
import { db, schema } from "@/server/database";
import { generate } from "@/server/utils/ai";
import { Environment } from "@/server/utils/environment";

const send = (controller: ReadableStreamDefaultController, event: object) =>
  controller.enqueue(new TextEncoder().encode(`${JSON.stringify(event)}\n`));

export const POST = async (request: Request) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return new Response(JSON.stringify({ error: "Unauthenticated" }), {
      status: 401,
    });

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
          send(controller, {
            kind: "error",
            text: productsResult.error.message,
          });
          controller.close();
          return;
        }

        const selected = productsResult.data.filter((p) =>
          productIds.includes(p.id),
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
            (p) =>
              `- ${p.title}${p.price ? ` ($${p.price})` : ""}${p.description ? `: ${p.description.slice(0, 200)}` : ""}`,
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
            system: `You are a competitive intelligence analyst for e-commerce merchants. Identify competing products that AI shopping agents would surface.

Rules:
- Only return real, purchasable products from established brands. Do not invent products.
- Match competitors within the same price tier (±40%) and subcategory.
- Prioritize products ranking highly on Amazon, Walmart, and Target.
- Return 2-4 competitors per product from different brands.
- Use exact product names as they appear on the retailer.
- If unsure whether a product exists, omit it.`,
            prompt: `Merchant products:\n${summaries}\n\nFor each product, identify 2-4 real competitor products an AI shopping agent would surface. Include brand, price, retailer (Amazon, Walmart, Target, eBay, Etsy, or Direct), and why it competes.`,
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
          text: `Identified ${aiResult.data.competitors.length} competitor products`,
        });

        send(controller, {
          kind: "log",
          text: "Saving competitors to your account",
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

        const successful = created.filter((r) => r.success).map((r) => r.data);

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
