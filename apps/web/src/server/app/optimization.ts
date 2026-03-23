"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { schema } from "../database";
import * as AI from "../utils/ai";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import { repository } from "../utils/repository";
import * as Product from "./product";
import * as Simulation from "./simulation";
import * as Store from "./store";

const OptimizationRepo = repository(schema.listingOptimization);

const PUBLISHABLE_PLATFORMS = new Set(["shopify", "woocommerce"]);
const WIN_RATE_THRESHOLD = 55;
const PUBLISH_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

const modelLabel = (id: string) => {
  switch (id) {
    case "gpt4":
      return "GPT-4";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
    default:
      return id;
  }
};

const estimateLift = (winRate: number) =>
  Math.max(5, Math.min(40, WIN_RATE_THRESHOLD - winRate));

export type OptimizationQueueItem = {
  productId: string;
  productTitle: string;
  type: "all";
  estimatedLift: number;
  modelsAffected: string[];
  winRateBefore: number;
};

export type StoredOptimizationItem = {
  recordId: string;
  productId: string;
  productTitle: string;
  type: "all";
  publishedAt: string | null;
  updatedAt: string;
  winRateBefore: number | null;
  winRateAfter: number | null;
};

export type OptimizationDashboardData = {
  pending: OptimizationQueueItem[];
  published: StoredOptimizationItem[];
  dismissed: StoredOptimizationItem[];
  diagnostics: {
    lowWinRateProducts: number;
    publishableLowWinRateProducts: number;
    nonPublishableLowWinRateProducts: number;
    insights: {
      productId: string;
      productTitle: string;
      winRate: number;
      category: "seo" | "content" | "structured_data" | "platform";
      severity: "high" | "medium";
      message: string;
      recommendation: string;
    }[];
  };
};

const winRateForSimulations = (
  productId: string,
  simulations: { productId: string; winner: string; model: string }[],
) => {
  const rows = simulations.filter(
    (simulation) => simulation.productId === productId,
  );
  if (rows.length === 0) return null;

  const wins = rows.filter(
    (simulation) => simulation.winner === "product",
  ).length;
  return Math.round((wins / rows.length) * 100);
};

const modelsForProduct = (
  productId: string,
  simulations: { productId: string; model: string }[],
) => {
  const set = new Set<string>();
  for (const simulation of simulations) {
    if (simulation.productId === productId)
      set.add(modelLabel(simulation.model));
  }
  return [...set];
};

const findOptimizationRow = async (userId: string, productId: string) => {
  const result = await OptimizationRepo.find(Environment.SERVER, {
    where: and(
      eq(schema.listingOptimization.userId, userId),
      eq(schema.listingOptimization.productId, productId),
    ),
    limit: 1,
  });

  if (!result.success) return null;
  return result.data[0] ?? null;
};

const buildDashboardData = async (
  userId: string,
): Promise<OptimizationDashboardData> => {
  const [productsResult, storesResult, recordsResult] = await Promise.all([
    Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, userId),
    }),
    Store.find(Environment.SERVER, {
      where: eq(schema.store.userId, userId),
    }),
    OptimizationRepo.find(Environment.SERVER, {
      where: eq(schema.listingOptimization.userId, userId),
      orderBy: [
        { column: schema.listingOptimization.updatedAt, direction: "desc" },
      ],
    }),
  ]);

  const products = productsResult.success ? productsResult.data : [];
  const stores = storesResult.success ? storesResult.data : [];
  const records = recordsResult.success ? recordsResult.data : [];

  const storeById = new Map(stores.map((store) => [store.id, store]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const recordByProductId = new Map(records.map((row) => [row.productId, row]));
  const productIds = products.map((product) => product.id);

  const publishableProducts = products.filter((product) => {
    const store = storeById.get(product.storeId);
    return store && PUBLISHABLE_PLATFORMS.has(store.platform);
  });

  const allSimulationsResult = await Simulation.getForProducts({
    products: productIds,
  });
  const allSimulations = allSimulationsResult.success ? allSimulationsResult.data : [];

  const simulationsResult = await Simulation.getForProducts({
    products: publishableProducts.map((product) => product.id),
  });

  const simulations = simulationsResult.success ? simulationsResult.data : [];

  const now = Date.now();
  const pending: OptimizationQueueItem[] = [];
  const diagnostics: OptimizationDashboardData["diagnostics"]["insights"] = [];
  const publishableProductIds = new Set(publishableProducts.map((product) => product.id));
  const lowWinRateProducts = products
    .map((product) => {
      const winRate = winRateForSimulations(product.id, allSimulations);
      return {
        product,
        winRate,
      };
    })
    .filter((entry): entry is { product: (typeof products)[number]; winRate: number } =>
      entry.winRate !== null && entry.winRate < WIN_RATE_THRESHOLD,
    );

  for (const product of publishableProducts) {
    const winRate = winRateForSimulations(product.id, simulations);
    if (winRate === null) continue;

    const row = recordByProductId.get(product.id);
    if (row?.status === "dismissed") continue;

    if (row?.status === "published" && row.publishedAt) {
      if (now - row.publishedAt.getTime() < PUBLISH_COOLDOWN_MS) continue;
    }

    if (winRate >= WIN_RATE_THRESHOLD) continue;

    pending.push({
      productId: product.id,
      productTitle: product.title,
      type: "all",
      estimatedLift: estimateLift(winRate),
      modelsAffected: modelsForProduct(product.id, simulations),
      winRateBefore: winRate,
    });
  }

  for (const { product, winRate } of lowWinRateProducts) {
    const store = storeById.get(product.storeId);
    const isPublishable = publishableProductIds.has(product.id);
    const imageMissing = !product.images || product.images === "[]";
    const titleShort = product.title.trim().length < 25;
    const descriptionShort = !product.description || product.description.trim().length < 140;
    const structuredMissing = !product.structuredData;

    if (!isPublishable) {
      diagnostics.push({
        productId: product.id,
        productTitle: product.title,
        winRate,
        category: "platform",
        severity: "high",
        message: `Store platform "${store?.platform ?? "unknown"}" does not support one-click publishing in Optimization Center.`,
        recommendation:
          "Use Shopify or WooCommerce for one-click publishing, or manually apply the recommended SEO/content fixes below.",
      });
    }

    if (structuredMissing) {
      diagnostics.push({
        productId: product.id,
        productTitle: product.title,
        winRate,
        category: "structured_data",
        severity: "high",
        message: "Missing structured product data reduces AI agent confidence.",
        recommendation:
          "Generate schema markup from UCP & Structured Data and include key attributes (price, SKU, availability, brand).",
      });
    }

    if (descriptionShort || titleShort) {
      diagnostics.push({
        productId: product.id,
        productTitle: product.title,
        winRate,
        category: "content",
        severity: descriptionShort ? "high" : "medium",
        message: "Listing copy is too thin for strong AI shopping comparisons.",
        recommendation:
          "Expand description with concrete specs, use-case details, and trust signals (warranty, returns, certifications).",
      });
    }

    if (imageMissing) {
      diagnostics.push({
        productId: product.id,
        productTitle: product.title,
        winRate,
        category: "seo",
        severity: "medium",
        message: "No product imagery available in synced listing data.",
        recommendation:
          "Add high-quality product images and ensure they are present in your catalog sync/feed.",
      });
    }
  }

  const published: StoredOptimizationItem[] = records
    .filter((row) => row.status === "published")
    .map((row) => {
      const product = productById.get(row.productId);
      return {
        recordId: row.id,
        productId: row.productId,
        productTitle: product?.title ?? "Unknown product",
        type: "all" as const,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
        winRateBefore: row.winRateBefore,
        winRateAfter: row.winRateAfter,
      };
    });

  const dismissed: StoredOptimizationItem[] = records
    .filter((row) => row.status === "dismissed")
    .map((row) => {
      const product = productById.get(row.productId);
      return {
        recordId: row.id,
        productId: row.productId,
        productTitle: product?.title ?? "Unknown product",
        type: "all" as const,
        publishedAt: null,
        updatedAt: row.updatedAt.toISOString(),
        winRateBefore: row.winRateBefore,
        winRateAfter: row.winRateAfter,
      };
    });

  const publishableLowWinRateProducts = lowWinRateProducts.filter((entry) =>
    publishableProductIds.has(entry.product.id),
  ).length;

  return {
    pending,
    published,
    dismissed,
    diagnostics: {
      lowWinRateProducts: lowWinRateProducts.length,
      publishableLowWinRateProducts,
      nonPublishableLowWinRateProducts:
        lowWinRateProducts.length - publishableLowWinRateProducts,
      insights: diagnostics.slice(0, 24),
    },
  };
};

const generateImprovedListing = async (input: {
  title: string;
  description: string | null;
  winRateBefore: number;
}) => {
  return AI.generate({
    system: `You improve e-commerce product listings so AI shopping agents choose this product more often.
Output a clearer, spec-rich title and an HTML description (use <p>, <ul><li> where helpful).
Do not invent specifications that contradict the original; you may reorganize and emphasize existing facts.
Keep the title under 120 characters.`,
    prompt: `Current win rate in AI agent simulations: ${input.winRateBefore}% (below target).

Current title: ${input.title}
Current description:
${input.description ?? "(none)"}

Return an improved title and full HTML description for the product page.`,
    schema: z.object({
      title: z.string().min(1),
      description_html: z.string(),
    }),
  });
};

const executeApprove = async (userId: string, productId: string) => {
  const product = await Product.get(Environment.SERVER, productId);
  if (!product.success) return product;
  if (!product.data)
    return { success: false as const, error: new Error("Product not found") };

  if (product.data.userId !== userId)
    return { success: false as const, error: new Error("Not authorized") };

  const store = await Store.get(Environment.SERVER, product.data.storeId);
  if (!store.success) return store;
  if (!store.data)
    return { success: false as const, error: new Error("Store not found") };

  if (!PUBLISHABLE_PLATFORMS.has(store.data.platform))
    return {
      success: false as const,
      error: new Error(
        "Publishing is only supported for Shopify and WooCommerce stores",
      ),
    };

  const simulationsResult = await Simulation.getForProducts({
    products: [productId],
  });
  const simulations = simulationsResult.success ? simulationsResult.data : [];
  const winRate = winRateForSimulations(productId, simulations) ?? 0;
  const lift = estimateLift(winRate);

  let improved: { title: string; description_html: string };
  try {
    improved = await generateImprovedListing({
      title: product.data.title,
      description: product.data.description,
      winRateBefore: winRate,
    });
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error
          : new Error("Failed to generate improved listing"),
    };
  }

  const publish = await Store.publishProductListing({
    product: productId,
    data: {
      title: improved.title,
      body_html: improved.description_html,
    },
  });

  if (!publish.success) return publish;

  const existing = await findOptimizationRow(userId, productId);
  const payload = {
    status: "published" as const,
    proposedTitle: improved.title,
    proposedDescription: improved.description_html,
    winRateBefore: winRate,
    estimatedLift: lift,
    winRateAfter: Math.min(99, winRate + lift),
    publishedAt: new Date(),
    updatedAt: new Date(),
  };

  if (existing) {
    const updated = await OptimizationRepo.update(
      Environment.SERVER,
      existing.id,
      payload,
    );
    if (!updated.success) return updated;
  } else {
    const created = await OptimizationRepo.create(Environment.SERVER, {
      userId,
      productId,
      ...payload,
    });
    if (!created.success) return created;
  }

  revalidatePath("/dashboard/optimize");
  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${productId}`);

  return { success: true as const, data: { productId } };
};

export const listDashboard = withAuthentication(async (context) => {
  const data = await buildDashboardData(context.session.user.id);
  return { success: true as const, data };
}, "Optimization.listDashboard");

export const approveProductListing = withAuthentication(
  async (context, { productId }: { productId: string }) => {
    return executeApprove(context.session.user.id, productId);
  },
  "Optimization.approveProductListing",
);

export const dismissSuggestion = withAuthentication(
  async (context, { productId }: { productId: string }) => {
    const product = await Product.get(Environment.SERVER, productId);
    if (!product.success) return product;
    if (!product.data)
      return { success: false as const, error: new Error("Product not found") };

    if (product.data.userId !== context.session.user.id)
      return { success: false as const, error: new Error("Not authorized") };

    const existing = await findOptimizationRow(
      context.session.user.id,
      productId,
    );

    if (existing) {
      const updated = await OptimizationRepo.update(
        Environment.SERVER,
        existing.id,
        {
          status: "dismissed",
          proposedTitle: null,
          proposedDescription: null,
          winRateBefore: null,
          estimatedLift: null,
          winRateAfter: null,
          publishedAt: null,
          updatedAt: new Date(),
        },
      );
      if (!updated.success) return updated;
    } else {
      const created = await OptimizationRepo.create(Environment.SERVER, {
        userId: context.session.user.id,
        productId,
        status: "dismissed",
      });
      if (!created.success) return created;
    }

    revalidatePath("/dashboard/optimize");
    return { success: true as const, data: { productId } };
  },
  "Optimization.dismissSuggestion",
);

export const reconsiderSuggestion = withAuthentication(
  async (context, { productId }: { productId: string }) => {
    const row = await findOptimizationRow(context.session.user.id, productId);
    if (!row)
      return { success: false as const, error: new Error("Record not found") };

    const destroyed = await OptimizationRepo.destroy(
      Environment.SERVER,
      row.id,
    );
    if (!destroyed.success) return destroyed;

    revalidatePath("/dashboard/optimize");
    return { success: true as const, data: { productId } };
  },
  "Optimization.reconsiderSuggestion",
);

export const approveAllPending = withAuthentication(async (context) => {
  const data = await buildDashboardData(context.session.user.id);
  const errors: string[] = [];

  for (const item of data.pending) {
    const result = await executeApprove(
      context.session.user.id,
      item.productId,
    );
    if (!result.success)
      errors.push(`${item.productTitle}: ${result.error.message}`);
  }

  revalidatePath("/dashboard/optimize");
  revalidatePath("/dashboard/products");

  if (errors.length > 0)
    return {
      success: false as const,
      error: new Error(errors.slice(0, 3).join("; ")),
    };

  return { success: true as const, data: { count: data.pending.length } };
}, "Optimization.approveAllPending");
