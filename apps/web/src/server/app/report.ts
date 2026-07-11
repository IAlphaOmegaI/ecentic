"use server";

import { eq } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { serialize } from "../utils/csv";
import { Environment } from "../utils/environment";
import { NotFoundError } from "../utils/error";
import { repository } from "../utils/repository";
import * as Competitor from "./competitor";
import * as Product from "./product";
import * as Scan from "./scan";
import * as Simulation from "./simulation";

const optimizations = repository(schema.listingOptimization);

export const exportWinRateSummary = withAuthentication(async () => {
  const scans = await Scan.getLatest(Environment.SERVER, { limit: 1000 });
  if (!scans.success) return scans;

  const complete = scans.data.filter((scan) => scan.status === "complete");
  if (complete.length === 0)
    return { success: false as const, error: new NotFoundError("Scan") };

  const latest = complete[0];

  if (!latest) {
    return { success: false as const, error: new NotFoundError("Scan") };
  }

  const simulations = await Simulation.getForScan(Environment.SERVER, {
    scan: latest.id,
  });

  if (!simulations.success) return simulations;

  const models = [
    ...new Set(simulations.data.map((simulation) => simulation.model)),
  ];

  const rows = models.map((model) => {
    const modelRows = simulations.data.filter(
      (simulation) => simulation.model === model,
    );
    const wins = modelRows.filter(
      (simulation) => simulation.winner === "product",
    ).length;
    const losses = modelRows.length - wins;
    const rate =
      modelRows.length > 0 ? Math.round((wins / modelRows.length) * 100) : 0;
    return [model, wins, losses, rate] as const;
  });

  const totalWins = simulations.data.filter(
    (simulation) => simulation.winner === "product",
  ).length;
  const totalLosses = simulations.data.length - totalWins;
  const totalRate =
    simulations.data.length > 0
      ? Math.round((totalWins / simulations.data.length) * 100)
      : 0;

  const allRows = [...rows, ["total", totalWins, totalLosses, totalRate]];

  return {
    success: true as const,
    data: {
      filename: "win-rate-summary.csv",
      content: serialize(["model", "wins", "losses", "winRate"], allRows),
    },
  };
}, "Report.exportWinRateSummary");

export const exportProductPerformance = withAuthentication(async (context) => {
  const products = await Product.find(Environment.SERVER, {
    where: eq(schema.product.userId, context.session.user.id),
  });
  if (!products.success) return products;

  if (products.data.length === 0) {
    return {
      success: true as const,
      data: {
        filename: "product-performance.csv",
        content: serialize(
          [
            "title",
            "sku",
            "price",
            "currency",
            "simulations",
            "winRate",
            "gpt4",
            "claude",
            "gemini",
            "perplexity",
          ],
          [],
        ),
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
    const total = productSimulations.length;
    const wins = productSimulations.filter(
      (simulation) => simulation.winner === "product",
    ).length;

    const winRate = total > 0 ? Math.round((wins / total) * 100) : "";

    const modelRate = (model: string) => {
      const rows = productSimulations.filter(
        (simulation) => simulation.model === model,
      );
      if (rows.length === 0) return "";
      const modelWins = rows.filter(
        (simulation) => simulation.winner === "product",
      ).length;
      return Math.round((modelWins / rows.length) * 100);
    };

    return [
      product.title,
      product.sku ?? "",
      product.price ?? "",
      product.currency ?? "",
      total,
      winRate,
      modelRate("gpt4"),
      modelRate("claude"),
      modelRate("gemini"),
      modelRate("perplexity"),
    ];
  });

  return {
    success: true as const,
    data: {
      filename: "product-performance.csv",
      content: serialize(
        [
          "title",
          "sku",
          "price",
          "currency",
          "simulations",
          "winRate",
          "gpt4",
          "claude",
          "gemini",
          "perplexity",
        ],
        rows,
      ),
    },
  };
}, "Report.exportProductPerformance");

export const exportCompetitorAnalysis = withAuthentication(async (context) => {
  const competitors = await Competitor.find(Environment.SERVER, {
    where: eq(schema.competitor.userId, context.session.user.id),
  });
  if (!competitors.success) return competitors;

  if (competitors.data.length === 0) {
    return {
      success: true as const,
      data: {
        filename: "competitor-analysis.csv",
        content: serialize(
          ["title", "brand", "source", "simulations", "winRateAgainstYou"],
          [],
        ),
      },
    };
  }

  const simulations = await Simulation.getForCompetitors(Environment.SERVER, {
    competitors: competitors.data.map((competitor) => competitor.id),
  });
  if (!simulations.success) return simulations;

  const rows = competitors.data.map((competitor) => {
    const competitorSimulations = simulations.data.filter(
      (simulation) => simulation.competitorId === competitor.id,
    );
    const total = competitorSimulations.length;
    const competitorWins = competitorSimulations.filter(
      (simulation) => simulation.winner === "competitor",
    ).length;
    const winRateAgainstYou =
      total > 0 ? Math.round((competitorWins / total) * 100) : "";

    return [
      competitor.title,
      competitor.brand ?? "",
      competitor.source ?? "",
      total,
      winRateAgainstYou,
    ];
  });

  return {
    success: true as const,
    data: {
      filename: "competitor-analysis.csv",
      content: serialize(
        ["title", "brand", "source", "simulations", "winRateAgainstYou"],
        rows,
      ),
    },
  };
}, "Report.exportCompetitorAnalysis");

export const exportOptimizationImpact = withAuthentication(async (context) => {
  const records = await optimizations.find(Environment.SERVER, {
    where: eq(schema.listingOptimization.userId, context.session.user.id),
  });
  if (!records.success) return records;

  if (records.data.length === 0) {
    return {
      success: true as const,
      data: {
        filename: "optimization-impact.csv",
        content: serialize(
          [
            "product",
            "status",
            "winRateBefore",
            "estimatedLift",
            "winRateAfterEstimated",
            "publishedAt",
          ],
          [],
        ),
      },
    };
  }

  const products = await Product.find(Environment.SERVER, {
    where: eq(schema.product.userId, context.session.user.id),
  });
  if (!products.success) return products;

  const productTitles = new Map(
    products.data.map((product) => [product.id, product.title]),
  );

  const rows = records.data.map((record) => [
    productTitles.get(record.productId) ?? record.productId,
    record.status,
    record.winRateBefore ?? "",
    record.estimatedLift ?? "",
    record.winRateAfter ?? "",
    record.publishedAt ? record.publishedAt.toISOString() : "",
  ]);

  return {
    success: true as const,
    data: {
      filename: "optimization-impact.csv",
      content: serialize(
        [
          "product",
          "status",
          "winRateBefore",
          "estimatedLift",
          "winRateAfterEstimated",
          "publishedAt",
        ],
        rows,
      ),
    },
  };
}, "Report.exportOptimizationImpact");

export const getAvailability = withAuthentication(async (context) => {
  const userId = context.session.user.id;

  const [scans, products, competitors, records] = await Promise.all([
    Scan.getLatest(Environment.SERVER, { limit: 1000 }),
    Product.count(Environment.SERVER, eq(schema.product.userId, userId)),
    Competitor.count(Environment.SERVER, eq(schema.competitor.userId, userId)),
    optimizations.count(
      Environment.SERVER,
      eq(schema.listingOptimization.userId, userId),
    ),
  ]);

  if (!scans.success) return scans;
  if (!products.success) return products;
  if (!competitors.success) return competitors;
  if (!records.success) return records;

  const scan = scans.data.find((scan) => scan.status === "complete") ?? null;

  return {
    success: true as const,
    data: {
      scan,
      products: products.data,
      competitors: competitors.data,
      optimizations: records.data,
    },
  };
}, "Report.getAvailability");
