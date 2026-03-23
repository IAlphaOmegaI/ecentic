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
import type { Pager } from "../utils/pagination";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.product);

export type Type = Document<typeof schema.product>;

export const skimForCurrentUser = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.product.userId, context.session.user.id),
    limit: 10,
  });
}, "Product.skimForCurrentUser");

const keys = [
  "title",
  "description",
  "price",
  "images",
  "sku",
  "structuredData",
] as const;

const computeDataQuality = (product: Type): number => {
  const filled = keys.filter((field) => {
    const value = product[field];
    if (!value) return false;

    if (field === "images") return value !== "[]";
    return true;
  }).length;

  return Math.round((filled / keys.length) * 100);
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
      skimForCurrentUser(Environment.SERVER),
      Scan.getLatest(Environment.SERVER),
    ]);

    if (!products.success) return products;
    if (!scan.success) return scan;

    if (products.data.length === 0) {
      return {
        success: true,
        data: {
          products: [],
          total: 0,
          scan: scan.data[0],
        },
      };
    }

    const simulations = await Simulation.getForProducts(Environment.SERVER, {
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

const enrichProduct = (product: Type, simulations: Simulation.Type[]) => {
  const productSimulations = simulations.filter(
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
};

export const paginateWithIntelligence = withAuthentication(
  async (context, { page, size }: Pager) => {
    const result = await paginate(Environment.SERVER, page, size, {
      where: eq(schema.product.userId, context.session.user.id),
    });

    if (!result.success) return result;

    const { items, pagination } = result.data;

    const simulations = await Simulation.getForProducts(Environment.SERVER, {
      products: items.map((product) => product.id),
    });

    if (!simulations.success) return simulations;

    const rows = items.map((product) =>
      enrichProduct(product, simulations.data),
    );

    return {
      success: true,
      data: {
        items: rows,
        pagination,
      },
    };
  },
  "Product.paginateWithIntelligence",
);

const Model = {
  GPT4: ["GPT-4", "gpt4"],
  Claude: ["Claude", "claude"],
  GEMINI: ["Gemini", "gemini"],
} as const;

export const getDetail = withAuthentication(
  async (context, { id }: { id: string }) => {
    const product = await get(Environment.SERVER, id);

    if (!product.success) return product;
    if (!product.data)
      return { success: false, error: new Error("Product not found") };

    if (product.data.userId !== context.session.user.id)
      return { success: false, error: new Error("Not authorized") };

    const simulations = await Simulation.getForProducts(Environment.SERVER, { products: [id] });
    if (!simulations.success) return simulations;

    const competitorIds = unique(
      simulations.data.map((simulation) => simulation.competitorId),
    );

    const results = await Competitor.find(Environment.SERVER, {
      where: inArray(schema.competitor.id, competitorIds),
    });

    if (!results.success) return results;

    const map = new Map(
      results.data.map((competitor) => [competitor.id, competitor]),
    );

    const keys = Object.keys(Model);

    const models = keys.map((key) => {
      const modelSimulations = simulations.data.filter(
        (simulation) => simulation.model === key,
      );
      const wins = modelSimulations.filter(
        (simulation) => simulation.winner === "product",
      ).length;

      const [label, id] = Model[key as keyof typeof Model];

      return {
        model: id,
        label: label,
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

    const enriched = simulations.data.map((simulation) => ({
      ...simulation,
      competitorTitle: map.get(simulation.competitorId)?.title ?? "Unknown",
    }));

    return {
      success: true,
      data: {
        product: {
          ...product.data,
          quality: computeDataQuality(product.data),
        },
        winRate,
        models,
        competitors,
        simulations: enriched,
      },
    };
  },
  "Product.getDetail",
);
