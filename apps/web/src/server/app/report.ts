"use server";

import { eq } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { serialize } from "../utils/csv";
import { dedupe } from "../utils/dedupe";
import { Environment } from "../utils/environment";
import { NotFoundError } from "../utils/error";
import { repository } from "../utils/repository";
import * as Competitor from "./competitor";
import * as Product from "./product";
import * as Scan from "./scan";
import * as Simulation from "./simulation";

const optimizations = repository(schema.listingOptimization);
const stores = repository(schema.store);

export const exportWinRateSummary = withAuthentication(async () => {
  const scan = await Scan.getLatestComplete(Environment.SERVER);
  if (!scan.success) return scan;

  const latest = scan.data;
  if (!latest)
    return { success: false as const, error: new NotFoundError("Scan") };

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

// `/dashboard/reports` sits outside `[store]` and is account-wide by design, so
// this export spans every store. Competitors are store-scoped, though, which
// means one rival tracked in two stores is two rows with two different win
// rates — the `store` column is what keeps those rows readable as distinct
// rather than duplicated.
const COMPETITOR_COLUMNS = [
  "store",
  "title",
  "brand",
  "source",
  "simulations",
  "winRateAgainstYou",
];

export const exportCompetitorAnalysis = withAuthentication(async (context) => {
  const userId = context.session.user.id;

  const [competitors, owned] = await Promise.all([
    Competitor.find(Environment.SERVER, {
      where: eq(schema.competitor.userId, userId),
    }),
    stores.find(Environment.SERVER, { where: eq(schema.store.userId, userId) }),
  ]);
  if (!competitors.success) return competitors;
  if (!owned.success) return owned;

  if (competitors.data.length === 0) {
    return {
      success: true as const,
      data: {
        filename: "competitor-analysis.csv",
        content: serialize(COMPETITOR_COLUMNS, []),
      },
    };
  }

  const storeNames = new Map(owned.data.map((store) => [store.id, store.name]));

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
      storeNames.get(competitor.storeId) ?? competitor.storeId,
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
      content: serialize(COMPETITOR_COLUMNS, rows),
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

// Deduped: the reports page asks three separate Suspense leaves — the status
// pill, the share button and the report grid — whether there is anything to
// report on, and without this each one re-ran the whole four-query fan-out.
export const getAvailability = dedupe(
  withAuthentication(async (context) => {
    const userId = context.session.user.id;

    const [scan, products, competitors, records] = await Promise.all([
      Scan.getLatestComplete(Environment.SERVER),
      Product.count(Environment.SERVER, eq(schema.product.userId, userId)),
      Competitor.count(
        Environment.SERVER,
        eq(schema.competitor.userId, userId),
      ),
      optimizations.count(
        Environment.SERVER,
        eq(schema.listingOptimization.userId, userId),
      ),
    ]);

    if (!scan.success) return scan;
    if (!products.success) return products;
    if (!competitors.success) return competitors;
    if (!records.success) return records;

    return {
      success: true as const,
      data: {
        scan: scan.data,
        products: products.data,
        competitors: competitors.data,
        optimizations: records.data,
      },
    };
  }, "Report.getAvailability"),
);
