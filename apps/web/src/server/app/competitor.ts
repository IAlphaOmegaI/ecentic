"use server";

import { resultify, unique } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { cache as dedupe } from "react";
import { z } from "zod";
import { schema } from "../database";
import * as AI from "../utils/ai";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import * as Product from "./product";
import * as Scan from "./scan";
import * as Simulation from "./simulation";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.competitor);

export type Type = Document<typeof schema.competitor>;

export const skimForCurrentUser = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.competitor.userId, context.session.user.id),
    limit: 10,
  });
}, "Competitor.skimForCurrentUser");

export const removeForUser = withAuthentication(
  async (context, { id }: { id: string }) => {
    const record = await get(Environment.SERVER, id);
    if (!record.success) return record;
    if (!record.data)
      return {
        success: false as const,
        error: new Error("Competitor not found"),
      };

    if (record.data.userId !== context.session.user.id)
      return { success: false as const, error: new Error("Not authorized") };

    return destroy(Environment.SERVER, id);
  },
  "Competitor.removeForUser",
);

export const toggleSelection = withAuthentication(
  async (context, { id, selected }: { id: string; selected: boolean }) => {
    const record = await get(Environment.SERVER, id);
    if (!record.success) return record;
    if (!record.data)
      return {
        success: false,
        error: new Error("Competitor not found"),
      };
    if (record.data.userId !== context.session.user.id)
      return { success: false, error: new Error("Not authorized") };

    return update(Environment.SERVER, id, { selected });
  },
  "Competitor.toggleSelection",
);

type DetectEvent =
  | { kind: "log"; text: string }
  | { kind: "chunk"; text: string }
  | { kind: "error"; text: string }
  | { kind: "done"; competitors: Type[] };

export const detectCompetitors = withAuthentication(
  async (context, { products: ids }: { products: string[] }) => {
    const products = await Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, context.session.user.id),
    });

    if (!products.success) return products;

    const stream = AI.stream<DetectEvent>(async (update) => {
      update({ kind: "log", text: "Reading your product catalog" });

      const selected = products.data.filter((product) =>
        ids.includes(product.id),
      );

      if (selected.length === 0) {
        update({ kind: "error", text: "No products selected" });
        return;
      }

      update({
        kind: "log",
        text: `Loaded ${selected.length} product${selected.length !== 1 ? "s" : ""} for analysis`,
      });

      update({
        kind: "log",
        text: "Mapping market categories and price tiers",
      });

      const summaries = selected
        .map(
          (product) =>
            `- ${product.title}${product.price ? ` ($${product.price})` : ""}${product.description ? `: ${product.description.slice(0, 200)}` : ""}`,
        )
        .join("\n");

      update({
        kind: "log",
        text: "Querying Amazon, Walmart, and Target signals",
      });
      update({ kind: "log", text: "Running competitive intelligence model" });

      const { output, textStream } = AI.generate({
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
        stream: true,
      });

      const [, result] = await Promise.all([
        (async () => {
          for await (const chunk of textStream) {
            update({ kind: "chunk", text: chunk });
          }
        })(),
        resultify(() => output),
      ]);

      if (!result.success) {
        update({ kind: "error", text: result.error.message });
        return;
      }

      update({
        kind: "log",
        text: `Saving ${result.data.competitors.length} competitor products`,
      });

      const created = await Promise.all(
        result.data.competitors.map((entry) =>
          create(Environment.SERVER, {
            ...entry,
            userId: context.session.user.id,
            selected: true,
          }),
        ),
      );

      const successful = created
        .filter((record) => record.success)
        .map((record) => record.data as Type);

      update({ kind: "done", competitors: successful });
    });

    return {
      success: true,
      data: {
        output: stream.output,
      },
    };
  },
  "Competitor.detectCompetitors",
);

const aggregateBrands = (
  competitors: Type[],
  simulations: Simulation.Type[],
) => {
  return unique(competitors.map((c) => c.brand ?? c.title)).flatMap((brand) => {
    const group = competitors.filter((c) => (c.brand ?? c.title) === brand);

    const first = group[0];
    if (!first) return [];

    const ids = unique(group.map((competitor) => competitor.id));

    const brandSimulations = simulations.filter((simulation) =>
      ids.includes(simulation.competitorId),
    );

    const wins = brandSimulations.filter(
      (simulation) => simulation.winner === "product",
    ).length;

    const total = brandSimulations.length;

    const latestUpdate = group.reduce(
      (latest, competitor) =>
        competitor.updatedAt > latest ? competitor.updatedAt : latest,
      first.updatedAt,
    );

    return {
      _id: first.id,
      brand,
      products: group.length,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      simulations: total,
      updatedAt: latestUpdate,
    };
  });
};

export const gatherIntelligence = dedupe(
  withAuthentication(async () => {
    const [competitors, scan] = await Promise.all([
      skimForCurrentUser(Environment.SERVER),
      Scan.getLatest(Environment.SERVER),
    ]);

    if (!competitors.success) return competitors;
    if (!scan.success) return scan;

    if (competitors.data.length === 0)
      return {
        success: true,
        data: {
          brands: [],
          competitors: 0,
          scan: scan.data[0],
        },
      };

    const simulations = await Simulation.getForCompetitors(Environment.SERVER, {
      competitors: competitors.data.map((competitor) => competitor.id),
    });

    if (!simulations.success) return simulations;

    const brands = aggregateBrands(competitors.data, simulations.data);

    return {
      success: true,
      data: {
        brands,
        competitors: competitors.data.length,
        scan: scan.data[0],
      },
    };
  }, "Competitor.gatherIntelligence"),
);

export const gatherPaginatedIntelligence = withAuthentication(
  async (context, { page, size }: { page: number; size: number }) => {
    const [competitors, scan] = await Promise.all([
      paginate(Environment.SERVER, page, size, {
        where: eq(schema.competitor.userId, context.session.user.id),
      }),
      Scan.getLatest(Environment.SERVER),
    ]);

    if (!competitors.success) return competitors;
    if (!scan.success) return scan;

    const simulations = await Simulation.getForCompetitors(Environment.SERVER, {
      competitors: competitors.data.items.map((competitor) => competitor.id),
    });

    if (!simulations.success) return simulations;

    const allBrands = aggregateBrands(competitors.data.items, simulations.data);
    const total = allBrands.length;
    const offset = (page - 1) * size;
    const brands = allBrands.slice(offset, offset + size);

    return {
      success: true,
      data: {
        brands,
        scan: scan.data[0],
        pagination: { total, page, size },
      },
    };
  },
  "Competitor.gatherPaginatedIntelligence",
);
