"use server";

import { resultify } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { schema } from "../database";
import * as AI from "../utils/ai";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { type Document, repository } from "../utils/repository";
import * as Product from "./product";
import * as Simulation from "./simulation";
import * as Store from "./store";

const { find, create, update, destroy } = repository(
  schema.listingOptimization,
);

export type Type = Document<typeof schema.listingOptimization>;

const PUBLISHABLE_PLATFORMS = new Set(["shopify", "woocommerce"]);
const WIN_RATE_THRESHOLD = 55;
const PUBLISH_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

const MODEL_LABELS: Record<string, string> = {
  gpt4: "GPT-4",
  claude: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

const estimateLift = (winRate: number) =>
  Math.max(5, Math.min(40, WIN_RATE_THRESHOLD - winRate));

const computeWinRate = (productId: string, simulations: Simulation.Type[]) => {
  const rows = simulations.filter(
    (simulation) => simulation.productId === productId,
  );
  if (rows.length === 0) return null;

  const wins = rows.filter(
    (simulation) => simulation.winner === "product",
  ).length;
  return Math.round((wins / rows.length) * 100);
};

const computeModels = (productId: string, simulations: Simulation.Type[]) => {
  const set = new Set<string>();
  for (const simulation of simulations) {
    if (simulation.productId === productId) {
      set.add(MODEL_LABELS[simulation.model] ?? simulation.model);
    }
  }
  return [...set];
};

type DiagnosticInsight = {
  productId: string;
  winRate: number;
  category: "seo" | "content" | "structured_data" | "platform";
  severity: "high" | "medium";
  message: string;
  recommendation: string;
};

export type DashboardData = {
  pending: {
    product: Product.Type;
    winRate: number;
    estimatedLift: number;
    models: string[];
  }[];
  published: Type[];
  dismissed: Type[];
  products: Record<string, Product.Type>;
  diagnostics: {
    lowWinRateCount: number;
    publishableCount: number;
    nonPublishableCount: number;
    insights: DiagnosticInsight[];
  };
};

const findRecord = withContext(
  async (
    _context,
    { userId, productId }: { userId: string; productId: string },
  ) => {
    const result = await find(Environment.SERVER, {
      where: and(
        eq(schema.listingOptimization.userId, userId),
        eq(schema.listingOptimization.productId, productId),
      ),
      limit: 1,
    });

    if (!result.success) return result;
    return { success: true, data: result.data[0] ?? null };
  },
  "Optimization.findRecord",
);

const generateImprovedListing = withContext(
  async (
    _context,
    input: { title: string; description: string | null; winRateBefore: number },
  ) => {
    const result = await resultify(() =>
      AI.generate({
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
      }),
    );

    if (!result.success) return result;
    return { success: true, data: result.data };
  },
  "Optimization.generateImprovedListing",
);

const upsertRecord = withContext(
  async (
    _context,
    {
      userId,
      productId,
      status,
      payload,
    }: {
      userId: string;
      productId: string;
      status: string;
      payload: Parameters<typeof update>[2];
    },
  ) => {
    const existing = await findRecord(Environment.SERVER, {
      userId,
      productId,
    });

    if (!existing.success) return existing;

    if (existing.data) {
      return update(Environment.SERVER, existing.data.id, payload);
    }

    return create(Environment.SERVER, {
      userId,
      productId,
      status,
      ...payload,
    });
  },
  "Optimization.upsertRecord",
);

export const listDashboard = withAuthentication(async (context) => {
  const userId = context.session.user.id;

  const [products, stores, records] = await Promise.all([
    Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, userId),
    }),
    Store.find(Environment.SERVER, {
      where: eq(schema.store.userId, userId),
    }),
    find(Environment.SERVER, {
      where: eq(schema.listingOptimization.userId, userId),
      orderBy: [
        { column: schema.listingOptimization.updatedAt, direction: "desc" },
      ],
    }),
  ]);

  if (!products.success) return products;
  if (!stores.success) return stores;
  if (!records.success) return records;

  const storeById = new Map(stores.data.map((store) => [store.id, store]));
  const productById = Object.fromEntries(
    products.data.map((product) => [product.id, product]),
  );
  const recordByProductId = new Map(
    records.data.map((record) => [record.productId, record]),
  );

  const publishableProductIds = new Set(
    products.data
      .filter((product) => {
        const store = storeById.get(product.storeId);
        return store && PUBLISHABLE_PLATFORMS.has(store.platform);
      })
      .map((product) => product.id),
  );

  const simulationsResult = await Simulation.getForProducts({
    products: products.data.map((product) => product.id),
  });
  const simulations = simulationsResult.success ? simulationsResult.data : [];

  const lowWinRateEntries = products.data
    .map((product) => ({
      product,
      winRate: computeWinRate(product.id, simulations),
    }))
    .filter(
      (
        entry,
      ): entry is {
        product: (typeof products.data)[number];
        winRate: number;
      } => entry.winRate !== null && entry.winRate < WIN_RATE_THRESHOLD,
    );

  const now = Date.now();
  const pending: DashboardData["pending"] = [];

  for (const { product, winRate } of lowWinRateEntries) {
    if (!publishableProductIds.has(product.id)) continue;

    const record = recordByProductId.get(product.id);
    if (record?.status === "dismissed") continue;

    if (record?.status === "published" && record.publishedAt) {
      if (now - record.publishedAt.getTime() < PUBLISH_COOLDOWN_MS) continue;
    }

    pending.push({
      product,
      winRate,
      estimatedLift: estimateLift(winRate),
      models: computeModels(product.id, simulations),
    });
  }

  const insights: DiagnosticInsight[] = [];

  for (const { product, winRate } of lowWinRateEntries) {
    const store = storeById.get(product.storeId);
    const isPublishable = publishableProductIds.has(product.id);
    const imageMissing = !product.images || product.images === "[]";
    const titleShort = product.title.trim().length < 25;
    const descriptionShort =
      !product.description || product.description.trim().length < 140;
    const structuredMissing = !product.structuredData;

    if (!isPublishable) {
      insights.push({
        productId: product.id,
        winRate,
        category: "platform",
        severity: "high",
        message: `Store platform "${store?.platform ?? "unknown"}" does not support one-click publishing in Optimization Center.`,
        recommendation:
          "Use Shopify or WooCommerce for one-click publishing, or manually apply the recommended SEO/content fixes below.",
      });
    }

    if (structuredMissing) {
      insights.push({
        productId: product.id,
        winRate,
        category: "structured_data",
        severity: "high",
        message: "Missing structured product data reduces AI agent confidence.",
        recommendation:
          "Generate schema markup from UCP & Structured Data and include key attributes (price, SKU, availability, brand).",
      });
    }

    if (descriptionShort || titleShort) {
      insights.push({
        productId: product.id,
        winRate,
        category: "content",
        severity: descriptionShort ? "high" : "medium",
        message: "Listing copy is too thin for strong AI shopping comparisons.",
        recommendation:
          "Expand description with concrete specs, use-case details, and trust signals (warranty, returns, certifications).",
      });
    }

    if (imageMissing) {
      insights.push({
        productId: product.id,
        winRate,
        category: "seo",
        severity: "medium",
        message: "No product imagery available in synced listing data.",
        recommendation:
          "Add high-quality product images and ensure they are present in your catalog sync/feed.",
      });
    }
  }

  const published = records.data.filter(
    (record) => record.status === "published",
  );
  const dismissed = records.data.filter(
    (record) => record.status === "dismissed",
  );

  const publishableLowWinRateCount = lowWinRateEntries.filter((entry) =>
    publishableProductIds.has(entry.product.id),
  ).length;

  return {
    success: true,
    data: {
      pending,
      published,
      dismissed,
      products: productById,
      diagnostics: {
        lowWinRateCount: lowWinRateEntries.length,
        publishableCount: publishableLowWinRateCount,
        nonPublishableCount:
          lowWinRateEntries.length - publishableLowWinRateCount,
        insights: insights.slice(0, 24),
      },
    } satisfies DashboardData,
  };
}, "Optimization.listDashboard");

export const approveProductListing = withAuthentication(
  async (context, { productId }: { productId: string }) => {
    const userId = context.session.user.id;

    const product = await Product.get(Environment.SERVER, productId);
    if (!product.success) return product;

    if (!product.data)
      return { success: false, error: new Error("Product not found") };

    if (product.data.userId !== userId)
      return { success: false, error: new Error("Not authorized") };

    const store = await Store.get(Environment.SERVER, product.data.storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    if (!PUBLISHABLE_PLATFORMS.has(store.data.platform))
      return {
        success: false,
        error: new Error(
          "Publishing is only supported for Shopify and WooCommerce stores",
        ),
      };

    const simulationsResult = await Simulation.getForProducts({
      products: [productId],
    });
    const simulations = simulationsResult.success ? simulationsResult.data : [];
    const winRate = computeWinRate(productId, simulations) ?? 0;
    const lift = estimateLift(winRate);

    const improved = await generateImprovedListing(Environment.SERVER, {
      title: product.data.title,
      description: product.data.description,
      winRateBefore: winRate,
    });

    if (!improved.success) return improved;

    const publish = await Store.publishProductListing({
      product: productId,
      data: {
        title: improved.data.title,
        body_html: improved.data.description_html,
      },
    });

    if (!publish.success) return publish;

    const upserted = await upsertRecord(Environment.SERVER, {
      userId,
      productId,
      status: "published",
      payload: {
        proposedTitle: improved.data.title,
        proposedDescription: improved.data.description_html,
        winRateBefore: winRate,
        estimatedLift: lift,
        winRateAfter: Math.min(99, winRate + lift),
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (!upserted.success) return upserted;

    revalidatePath("/dashboard/optimize");
    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${productId}`);

    return { success: true, data: { productId } };
  },
  "Optimization.approveProductListing",
);

export const dismissSuggestion = withAuthentication(
  async (context, { productId }: { productId: string }) => {
    const userId = context.session.user.id;

    const product = await Product.get(Environment.SERVER, productId);
    if (!product.success) return product;
    if (!product.data)
      return { success: false, error: new Error("Product not found") };

    if (product.data.userId !== userId)
      return { success: false, error: new Error("Not authorized") };

    const upserted = await upsertRecord(Environment.SERVER, {
      userId,
      productId,
      status: "dismissed",
      payload: {
        proposedTitle: null,
        proposedDescription: null,
        winRateBefore: null,
        estimatedLift: null,
        winRateAfter: null,
        publishedAt: null,
        updatedAt: new Date(),
      },
    });

    if (!upserted.success) return upserted;

    revalidatePath("/dashboard/optimize");
    return { success: true, data: { productId } };
  },
  "Optimization.dismissSuggestion",
);

export const reconsiderSuggestion = withAuthentication(
  async (context, { productId }: { productId: string }) => {
    const userId = context.session.user.id;

    const record = await findRecord(Environment.SERVER, {
      userId,
      productId,
    });

    if (!record.success) return record;
    if (!record.data)
      return { success: false, error: new Error("Record not found") };

    const destroyed = await destroy(Environment.SERVER, record.data.id);
    if (!destroyed.success) return destroyed;

    revalidatePath("/dashboard/optimize");
    return { success: true, data: { productId } };
  },
  "Optimization.reconsiderSuggestion",
);

export const approveAllPending = withAuthentication(async (context) => {
  const userId = context.session.user.id;

  const [productsResult, storesResult, recordsResult] = await Promise.all([
    Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, userId),
    }),
    Store.find(Environment.SERVER, {
      where: eq(schema.store.userId, userId),
    }),
    find(Environment.SERVER, {
      where: eq(schema.listingOptimization.userId, userId),
    }),
  ]);

  const products = productsResult.success ? productsResult.data : [];
  const stores = storesResult.success ? storesResult.data : [];
  const records = recordsResult.success ? recordsResult.data : [];

  const storeById = new Map(stores.map((store) => [store.id, store]));
  const recordByProductId = new Map(
    records.map((record) => [record.productId, record]),
  );

  const publishableProductIds = new Set(
    products
      .filter((product) => {
        const store = storeById.get(product.storeId);
        return store && PUBLISHABLE_PLATFORMS.has(store.platform);
      })
      .map((product) => product.id),
  );

  const simulationsResult = await Simulation.getForProducts({
    products: products.map((product) => product.id),
  });
  const simulations = simulationsResult.success ? simulationsResult.data : [];

  const now = Date.now();
  const pendingProductIds: { id: string; title: string }[] = [];

  for (const product of products) {
    if (!publishableProductIds.has(product.id)) continue;

    const winRate = computeWinRate(product.id, simulations);
    if (winRate === null || winRate >= WIN_RATE_THRESHOLD) continue;

    const record = recordByProductId.get(product.id);
    if (record?.status === "dismissed") continue;

    if (record?.status === "published" && record.publishedAt) {
      if (now - record.publishedAt.getTime() < PUBLISH_COOLDOWN_MS) continue;
    }

    pendingProductIds.push({ id: product.id, title: product.title });
  }

  const errors: string[] = [];

  for (const { id, title } of pendingProductIds) {
    const result = await approveProductListing({ productId: id });
    if (!result.success) errors.push(`${title}: ${result.error.message}`);
  }

  revalidatePath("/dashboard/optimize");
  revalidatePath("/dashboard/products");

  if (errors.length > 0)
    return {
      success: false,
      error: new Error(errors.slice(0, 3).join("; ")),
    };

  return {
    success: true,
    data: { count: pendingProductIds.length },
  };
}, "Optimization.approveAllPending");
