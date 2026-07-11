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
import * as Shopify from "./integration/shopify";
import * as WooCommerce from "./integration/woocommerce";
import * as Ucp from "./intelligence/ucp/profile";
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
  shopifyStores: { id: string; name: string }[];
  /**
   * The store this dashboard is scoped to (when `listDashboard` is called with a
   * `store`). Drives the "Optimize for Agents" action, which supports both
   * Shopify and WooCommerce.
   */
  currentStore: { id: string; name: string; platform: string } | null;
  diagnostics: {
    lowWinRateCount: number;
    publishableCount: number;
    nonPublishableCount: number;
    insights: DiagnosticInsight[];
  };
};

const findRecord = withContext(
  async (_context, { user, product }: { user: string; product: string }) => {
    const records = await find(Environment.SERVER, {
      where: and(
        eq(schema.listingOptimization.userId, user),
        eq(schema.listingOptimization.productId, product),
      ),
      limit: 1,
    });

    if (!records.success) return records;
    return { success: true, data: records.data[0] ?? null };
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
        instructions: `You improve e-commerce product listings so AI shopping agents choose this product more often.
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
      user,
      product,
      status,
      payload,
    }: {
      user: string;
      product: string;
      status: string;
      payload: Parameters<typeof update>[2];
    },
  ) => {
    const existing = await findRecord(Environment.SERVER, { user, product });

    if (!existing.success) return existing;

    if (existing.data) {
      return update(Environment.SERVER, existing.data.id, payload);
    }

    return create(Environment.SERVER, {
      userId: user,
      productId: product,
      status,
      ...payload,
    });
  },
  "Optimization.upsertRecord",
);

export const listDashboard = withAuthentication(
  async (context, { store }: { store?: string } = {}) => {
    const userId = context.session.user.id;

    const [products, stores, records] = await Promise.all([
      Product.find(Environment.SERVER, {
        where: store
          ? and(
              eq(schema.product.userId, userId),
              eq(schema.product.storeId, store),
            )
          : eq(schema.product.userId, userId),
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

    const fetched = await Simulation.getForProducts({
      products: products.data.map((product) => product.id),
    });
    const simulations = fetched.success ? fetched.data : [];

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
          message:
            "Missing structured product data reduces AI agent confidence.",
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
          message:
            "Listing copy is too thin for strong AI shopping comparisons.",
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

    // Records are fetched user-wide, but this dashboard is scoped to `store`
    // (so `productById` only holds the current store's products). Keep only
    // records whose product belongs to this store; otherwise the client can't
    // resolve a title and renders "Unknown product".
    const published = records.data.filter(
      (record) =>
        record.status === "published" &&
        productById[record.productId] !== undefined,
    );
    const dismissed = records.data.filter(
      (record) =>
        record.status === "dismissed" &&
        productById[record.productId] !== undefined,
    );

    const publishableLowWinRateCount = lowWinRateEntries.filter((entry) =>
      publishableProductIds.has(entry.product.id),
    ).length;

    const currentStore = (() => {
      if (!store) return null;
      const match = storeById.get(store);
      if (!match) return null;
      return { id: match.id, name: match.name, platform: match.platform };
    })();

    return {
      success: true,
      data: {
        pending,
        published,
        dismissed,
        products: productById,
        shopifyStores: stores.data
          .filter((store) => store.platform === "shopify")
          .map((store) => ({ id: store.id, name: store.name })),
        currentStore,
        diagnostics: {
          lowWinRateCount: lowWinRateEntries.length,
          publishableCount: publishableLowWinRateCount,
          nonPublishableCount:
            lowWinRateEntries.length - publishableLowWinRateCount,
          insights: insights.slice(0, 24),
        },
      } satisfies DashboardData,
    };
  },
  "Optimization.listDashboard",
);

export const approveProductListing = withAuthentication(
  async (context, { product: id }: { product: string }) => {
    const user = context.session.user.id;

    const product = await Product.get(Environment.SERVER, id);
    if (!product.success) return product;

    if (!product.data)
      return { success: false, error: new Error("Product not found") };

    if (product.data.userId !== user)
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

    const fetched = await Simulation.getForProducts({ products: [id] });
    const simulations = fetched.success ? fetched.data : [];
    const winRate = computeWinRate(id, simulations) ?? 0;
    const lift = estimateLift(winRate);

    const improved = await generateImprovedListing(Environment.SERVER, {
      title: product.data.title,
      description: product.data.description,
      winRateBefore: winRate,
    });

    if (!improved.success) return improved;

    const publish = await Store.publishProductListing({
      product: id,
      data: {
        title: improved.data.title,
        body_html: improved.data.description_html,
      },
    });

    if (!publish.success) return publish;

    const upserted = await upsertRecord(Environment.SERVER, {
      user,
      product: id,
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

    revalidatePath("/dashboard/[store]/optimize", "page");
    revalidatePath("/dashboard/[store]/products", "page");
    revalidatePath("/dashboard/[store]/products/[id]", "page");

    return { success: true, data: { product: id } };
  },
  "Optimization.approveProductListing",
);

export const dismissSuggestion = withAuthentication(
  async (context, { product: id }: { product: string }) => {
    const user = context.session.user.id;

    const product = await Product.get(Environment.SERVER, id);
    if (!product.success) return product;
    if (!product.data)
      return { success: false, error: new Error("Product not found") };

    if (product.data.userId !== user)
      return { success: false, error: new Error("Not authorized") };

    const upserted = await upsertRecord(Environment.SERVER, {
      user,
      product: id,
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

    revalidatePath("/dashboard/[store]/optimize", "page");
    return { success: true, data: { product: id } };
  },
  "Optimization.dismissSuggestion",
);

export const reconsiderSuggestion = withAuthentication(
  async (context, { product: id }: { product: string }) => {
    const user = context.session.user.id;

    const record = await findRecord(Environment.SERVER, { user, product: id });

    if (!record.success) return record;
    if (!record.data)
      return { success: false, error: new Error("Record not found") };

    const destroyed = await destroy(Environment.SERVER, record.data.id);
    if (!destroyed.success) return destroyed;

    revalidatePath("/dashboard/[store]/optimize", "page");
    return { success: true, data: { product: id } };
  },
  "Optimization.reconsiderSuggestion",
);

export const generateStructuredData = withAuthentication(
  async (context, { product: id }: { product: string }) => {
    const user = context.session.user.id;

    const product = await Product.get(Environment.SERVER, id);
    if (!product.success) return product;
    if (!product.data)
      return { success: false, error: new Error("Product not found") };
    if (product.data.userId !== user)
      return { success: false, error: new Error("Not authorized") };

    const productData = product.data;

    const generated = await resultify(() =>
      AI.generate({
        instructions: `You generate JSON-LD structured data (schema.org/Product) for e-commerce product pages to help AI shopping agents understand product details.
Output a single valid JSON string. Include @context, @type, name, description, brand, sku, and offers (price, priceCurrency, availability).
Do not invent specifications not present in the input.`,
        prompt: `Generate JSON-LD for this product:
Title: ${productData.title}
Description: ${productData.description ?? "(none)"}
Price: ${productData.price ?? "(unknown)"}${productData.currency ? ` ${productData.currency}` : ""}
SKU: ${productData.sku ?? "(unknown)"}`,
        schema: z.object({ json_ld: z.string() }),
      }),
    );

    if (!generated.success) return generated;

    const updated = await Product.update(Environment.SERVER, id, {
      structuredData: generated.data.json_ld,
    });

    if (!updated.success) return updated;

    revalidatePath("/dashboard/[store]/products/[id]", "page");
    return { success: true, data: { structuredData: generated.data.json_ld } };
  },
  "Optimization.generateStructuredData",
);

/**
 * Publishes a product's schema.org JSON-LD to the connected store so AI agents
 * reading the storefront can see it. Generates the structured data first if the
 * product doesn't have it yet, then routes to the platform integration
 * (Shopify metafields or WooCommerce product meta).
 */
export const publishProductStructuredData = withAuthentication(
  async (context, { product: id }: { product: string }) => {
    const user = context.session.user.id;

    const productResult = await Product.get(Environment.SERVER, id);
    if (!productResult.success) return productResult;
    if (!productResult.data)
      return { success: false as const, error: new Error("Product not found") };

    const product = productResult.data;
    if (product.userId !== user)
      return { success: false as const, error: new Error("Not authorized") };

    const storeResult = await Store.get(Environment.SERVER, product.storeId);
    if (!storeResult.success) return storeResult;
    if (!storeResult.data)
      return { success: false as const, error: new Error("Store not found") };

    const store = storeResult.data;

    const structuredJson = await (async () => {
      if (product.structuredData) return product.structuredData;
      const generated = await Ucp.generateProductStructuredData({
        product: id,
      });
      if (!generated.success) return null;
      return generated.data.json;
    })();

    if (!structuredJson)
      return {
        success: false as const,
        error: new Error("Could not generate structured data"),
      };

    const result = await (async () => {
      switch (store.platform) {
        case "shopify":
        case "shopify-public":
          return Shopify.pushProductUcpMetafields({
            product: id,
            structuredJson,
          });
        case "woocommerce":
          return WooCommerce.pushProductStructuredData({
            product: id,
            structuredJson,
          });
        default:
          return {
            success: false as const,
            error: new Error(
              `Structured-data publishing is not supported for platform: ${store.platform}`,
            ),
          };
      }
    })();

    if (!result.success) return result;

    revalidatePath("/dashboard/[store]/products/[id]", "page");
    return { success: true as const, data: { structuredData: structuredJson } };
  },
  "Optimization.publishProductStructuredData",
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

  const fetched = await Simulation.getForProducts({
    products: products.map((product) => product.id),
  });
  const simulations = fetched.success ? fetched.data : [];

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
    const result = await approveProductListing({ product: id });
    if (!result.success) errors.push(`${title}: ${result.error.message}`);
  }

  revalidatePath("/dashboard/[store]/optimize", "page");
  revalidatePath("/dashboard/[store]/products", "page");

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

export const optimizeStoreForAgents = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const userId = context.session.user.id;

    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false as const, error: new Error("Store not found") };
    if (store.data.userId !== userId)
      return { success: false as const, error: new Error("Not authorized") };
    const isShopify =
      store.data.platform === "shopify-public" ||
      store.data.platform === "shopify";
    const isWooCommerce = store.data.platform === "woocommerce";

    if (!isShopify && !isWooCommerce)
      return {
        success: false as const,
        error: new Error(
          "Agent optimization is only supported for connected Shopify and WooCommerce stores",
        ),
      };

    const errors: string[] = [];

    // Shop-level UCP profile: Shopify gets it written to shop metafields;
    // WooCommerce serves it through Ecentic's hosted `/.well-known/ucp` bridge,
    // so there's nothing to push to the store here.
    const profile = isShopify
      ? await Ucp.publishProfileToShopify({ store: storeId })
      : null;
    if (profile && !profile.success) {
      errors.push(`UCP profile: ${profile.error.message}`);
    }

    // Product structured data (schema.org/Product JSON-LD).
    const products = isShopify
      ? await Ucp.publishProductsToShopify({ store: storeId })
      : await Ucp.publishProductsToWooCommerce({ store: storeId });
    if (!products.success) {
      errors.push(`Product structured data: ${products.error.message}`);
    }

    const listings = await approveAllPending();
    if (!listings.success) {
      errors.push(`Listing rewrites: ${listings.error.message}`);
    }

    revalidatePath("/dashboard/[store]/optimize", "page");
    revalidatePath("/dashboard/[store]/ucp", "page");

    return {
      success: true as const,
      data: {
        profileWritten: profile?.success ? profile.data.written : 0,
        productsPushed: products.success ? products.data.pushed : 0,
        productsTotal: products.success ? products.data.total : 0,
        listingsRewritten: listings.success ? listings.data.count : 0,
        errors,
      },
    };
  },
  "Optimization.optimizeStoreForAgents",
);
