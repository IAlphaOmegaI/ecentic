"use server";

import { unique } from "@zenncore/utils";
import { eq, inArray } from "drizzle-orm";
import { cache as dedupe } from "react";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import * as Competitor from "./competitor";
import * as Scan from "./scan";
import * as Simulation from "./simulation";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.product);

export type Type = Document<typeof schema.product>;

export const getForCurrentUser = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.product.userId, context.session.user.id),
  });
}, "Product.getForCurrentUser");

const qualityFields = [
  "title",
  "description",
  "price",
  "images",
  "sku",
  "structuredData",
] as const;

const computeDataQuality = (product: Type): number => {
  const filled = qualityFields.filter((field) => {
    const value = product[field];
    if (!value) return false;
    if (field === "images") return value !== "[]";
    return true;
  }).length;

  return Math.round((filled / qualityFields.length) * 100);
};

const computeModelWinRate = (
  simulations: Simulation.Type[],
  model: string,
): number => {
  const modelSimulations = simulations.filter(
    (simulation) => simulation.model === model,
  );
  if (modelSimulations.length === 0) return 0;

  const wins = modelSimulations.filter(
    (simulation) => simulation.winner === "product",
  ).length;

  return Math.round((wins / modelSimulations.length) * 100);
};

export const gatherIntelligence = dedupe(
  withAuthentication(async () => {
    const [products, scan] = await Promise.all([
      getForCurrentUser(),
      Scan.getLatest(),
    ]);

    if (!products.success) return products;
    if (!scan.success) return scan;

    if (products.data.length === 0)
      return {
        success: true,
        data: {
          products: [],
          total: 0,
          scan: scan.data[0],
        },
      };

    const simulations = await Simulation.getForProducts({
      products: products.data.map((product) => product.id),
    });

    if (!simulations.success) return simulations;

    const rows = products.data.map((product) => {
      const productSimulations = simulations.data.filter(
        (simulation) => simulation.productId === product.id,
      );

      const wins = productSimulations.filter(
        (simulation) => simulation.winner === "product",
      ).length;
      const total = productSimulations.length;

      return {
        _id: product.id,
        title: product.title,
        price: product.price,
        currency: product.currency,
        sku: product.sku,
        winRate: {
          total: total > 0 ? Math.round((wins / total) * 100) : 0,
          gpt4: computeModelWinRate(productSimulations, "gpt4"),
          claude: computeModelWinRate(productSimulations, "claude"),
          gemini: computeModelWinRate(productSimulations, "gemini"),
        },
        simulations: total,
        quality: computeDataQuality(product),
        updatedAt: product.updatedAt,
      };
    });

    return {
      success: true,
      data: {
        products: rows,
        total: products.data.length,
        scan: scan.data[0],
      },
    };
  }, "Product.gatherIntelligence"),
);

const modelLabels = {
  gpt4: "GPT-4",
  claude: "Claude",
  gemini: "Gemini",
} as const;
const modelIds = ["gpt4", "claude", "gemini"] as const;

export const getDetail = withAuthentication(
  async (context, { id }: { id: string }) => {
    const product = await get(Environment.SERVER, id);

    if (!product.success) return product;
    if (!product.data)
      return { success: false as const, error: new Error("Product not found") };

    if (product.data.userId !== context.session.user.id)
      return { success: false as const, error: new Error("Not authorized") };

    const simulations = await Simulation.getForProducts({ products: [id] });
    if (!simulations.success) return simulations;

    const competitorIds = unique(
      simulations.data.map((simulation) => simulation.competitorId),
    );

    const results =
      competitorIds.length > 0
        ? await Competitor.find(Environment.SERVER, {
            where: inArray(schema.competitor.id, competitorIds),
          })
        : { success: true as const, data: [] as Competitor.Type[] };

    if (!results.success) return results;

    const map = new Map(
      results.data.map((competitor) => [competitor.id, competitor]),
    );

    const models = modelIds.map((modelId) => {
      const modelSimulations = simulations.data.filter(
        (simulation) => simulation.model === modelId,
      );
      const wins = modelSimulations.filter(
        (simulation) => simulation.winner === "product",
      ).length;

      return {
        model: modelId,
        label: modelLabels[modelId],
        rate:
          modelSimulations.length > 0
            ? Math.round((wins / modelSimulations.length) * 100)
            : 0,
        wins,
        losses: modelSimulations.length - wins,
        total: modelSimulations.length,
      };
    });

    const competitors = competitorIds.map((competitorId) => {
      const competitor = map.get(competitorId);

      const competitorSimulations = simulations.data.filter(
        (simulation) => simulation.competitorId === competitorId,
      );
      const wins = competitorSimulations.filter(
        (simulation) => simulation.winner === "product",
      ).length;

      return {
        id: competitorId,
        title: competitor?.title ?? "Unknown",
        brand: competitor?.brand ?? null,
        rate:
          competitorSimulations.length > 0
            ? Math.round((wins / competitorSimulations.length) * 100)
            : 0,
        wins,
        total: competitorSimulations.length,
      };
    });

    const wins = simulations.data.filter(
      (simulation) => simulation.winner === "product",
    ).length;

    const winRate =
      simulations.data.length > 0
        ? Math.round((wins / simulations.data.length) * 100)
        : 0;

    const enrichedSimulations = simulations.data.map((simulation) => ({
      id: simulation.id,
      model: simulation.model,
      winner: simulation.winner,
      reasoning: simulation.reasoning,
      productScore: simulation.productScore,
      competitorScore: simulation.competitorScore,
      competitorId: simulation.competitorId,
      competitorTitle: map.get(simulation.competitorId)?.title ?? "Unknown",
      createdAt: simulation.createdAt,
    }));

    return {
      success: true,
      data: {
        product: {
          id: product.data.id,
          title: product.data.title,
          description: product.data.description,
          price: product.data.price,
          currency: product.data.currency,
          sku: product.data.sku,
          structuredData: product.data.structuredData,
          dataQuality: computeDataQuality(product.data),
        },
        winRate,
        models,
        competitors,
        simulations: enrichedSimulations,
      },
    };
  },
  "Product.getDetail",
);
