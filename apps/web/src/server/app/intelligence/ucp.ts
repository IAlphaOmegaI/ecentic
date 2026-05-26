"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { formatPrice } from "@/lib/currency";
import { schema } from "../../database";
import { generate } from "../../utils/ai";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import type { Document } from "../../utils/repository";
import { repository } from "../../utils/repository";
import * as Shopify from "../integration/shopify";
import * as Product from "../product";
import * as Store from "../store";

export const { get, create, update, find } = repository(schema.ucpProfile);

export type Type = Document<typeof schema.ucpProfile>;

export type Profile = {
  merchantName?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  paymentMethods?: string | null;
  shippingPolicy?: string | null;
  returnPolicy?: string | null;
  contactEmail?: string | null;
  sustainability?: string | null;
  certifications?: string | null;
  autoUpdate?: boolean;
};

export const getProfile = withAuthentication(async (context) => {
  const result = await find(Environment.SERVER, {
    where: eq(schema.ucpProfile.userId, context.session.user.id),
  });

  if (!result.success) return result;

  return { success: true as const, data: result.data[0] ?? null };
}, "Ucp.getProfile");

export const saveProfile = withAuthentication(
  async (context, data: Profile) => {
    const existing = await find(Environment.SERVER, {
      where: eq(schema.ucpProfile.userId, context.session.user.id),
    });

    if (!existing.success) return existing;

    const profile = existing.data[0];

    if (profile)
      return update(Environment.SERVER, profile.id, {
        ...data,
        updatedAt: new Date(),
      });

    return create(Environment.SERVER, {
      userId: context.session.user.id,
      ...data,
    });
  },
  "Ucp.saveProfile",
);

export const generateJson = withAuthentication(async (context) => {
  const [profile, products] = await Promise.all([
    find(Environment.SERVER, {
      where: eq(schema.ucpProfile.userId, context.session.user.id),
    }),
    Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, context.session.user.id),
    }),
  ]);

  if (!profile.success) return profile;
  if (!products.success) return products;

  const productSummary = products.data
    .slice(0, 20)
    .map((p) => `- ${p.title} (${formatPrice(p.price, p.currency)})`)
    .join("\n");

  const ucpData = await generate({
    system:
      "You are a structured data expert. Generate a valid Universal Commerce Protocol (UCP) JSON for a merchant profile. The UCP is served at /.well-known/ucp and helps AI shopping agents understand a merchant's identity, policies, and catalog.",
    prompt: `Generate a UCP JSON for this merchant:

Merchant Name: ${profile.data[0]?.merchantName ?? "Unknown"}
Description: ${profile.data[0]?.description ?? ""}
Logo: ${profile.data[0]?.logoUrl ?? ""}
Payment Methods: ${profile.data[0]?.paymentMethods ?? ""}
Shipping Policy: ${profile.data[0]?.shippingPolicy ?? ""}
Return Policy: ${profile.data[0]?.returnPolicy ?? ""}
Contact Email: ${profile.data[0]?.contactEmail ?? ""}
Sustainability: ${profile.data[0]?.sustainability ?? ""}
Certifications: ${profile.data[0]?.certifications ?? ""}

Top products:
${productSummary || "No products yet"}`,
    schema: z.object({
      "@context": z.string(),
      "@type": z.literal("Merchant"),
      name: z.string(),
      description: z.string().nullable(),
      logo: z.string().nullable(),
      paymentMethods: z.array(z.string()).nullable(),
      shippingPolicy: z.string().nullable(),
      returnPolicy: z.string().nullable(),
      contact: z
        .object({
          email: z.string().nullable(),
        })
        .nullable(),
      sustainability: z.string().nullable(),
      certifications: z.array(z.string()).nullable(),
      catalog: z
        .object({
          totalProducts: z.number(),
          topCategories: z.array(z.string()).nullable(),
        })
        .nullable(),
    }),
  });

  const generatedJson = JSON.stringify(ucpData, null, 2);

  if (profile.data[0]) {
    await update(Environment.SERVER, profile.data[0].id, {
      generatedJson,
      updatedAt: new Date(),
    });
  } else {
    await create(Environment.SERVER, {
      userId: context.session.user.id,
      generatedJson,
    });
  }

  return { success: true as const, data: { json: generatedJson } };
}, "Ucp.generateJson");

export const generateProductStructuredData = withAuthentication(
  async (context, { product: id }: { product: string }) => {
    const product = await Product.get(Environment.SERVER, id);

    if (!product.success) return product;

    if (!product.data)
      return { success: false as const, error: new Error("Product not found") };

    if (product.data?.userId !== context.session.user.id)
      return { success: false as const, error: new Error("Unauthorized") };

    const structured = await generate({
      system:
        "You are a structured data expert. Generate valid schema.org Product JSON-LD for an e-commerce product. This JSON helps AI shopping agents understand and recommend the product.",
      prompt: `Generate schema.org Product structured data for:
Title: ${product.data.title}
Description: ${product.data.description ?? ""}
Price: ${formatPrice(product.data.price, product.data.currency)}
Compare At: ${product.data.compareAtPrice ?? ""}
SKU: ${product.data.sku ?? ""}
URL: ${product.data.url ?? ""}`,
      schema: z.object({
        "@context": z.string(),
        "@type": z.literal("Product"),
        name: z.string(),
        description: z.string().nullable(),
        sku: z.string().nullable(),
        offers: z.object({
          "@type": z.literal("Offer"),
          price: z.string(),
          priceCurrency: z.string(),
          availability: z.string(),
        }),
        brand: z.object({ "@type": z.string(), name: z.string() }).nullable(),
        url: z.string().nullable(),
      }),
    });

    const structuredJson = JSON.stringify(structured, null, 2);

    await Product.update(Environment.SERVER, product.data.id, {
      structuredData: structuredJson,
      updatedAt: new Date(),
    });

    return { success: true as const, data: { json: structuredJson } };
  },
  "Ucp.generateProductStructuredData",
);

export const generateAllProductStructuredData = withAuthentication(
  async (context) => {
    const products = await Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, context.session.user.id),
    });

    if (!products.success) return products;

    const results = await Promise.all(
      products.data.map(async (product) => {
        const structured = await resultify(() =>
          generate({
            system:
              "You are a structured data expert. Generate valid schema.org Product JSON-LD for an e-commerce product.",
            prompt: `Generate schema.org Product structured data for:
Title: ${product.title}
Description: ${product.description ?? ""}
Price: ${formatPrice(product.price, product.currency)}
SKU: ${product.sku ?? ""}`,
            schema: z.object({
              "@context": z.string(),
              "@type": z.literal("Product"),
              name: z.string(),
              description: z.string().nullable(),
              sku: z.string().nullable(),
              offers: z.object({
                "@type": z.literal("Offer"),
                price: z.string(),
                priceCurrency: z.string(),
                availability: z.string(),
              }),
            }),
          }),
        );

        if (!structured.success)
          return { productId: product.id, success: false as const };

        const json = JSON.stringify(structured.data, null, 2);

        await Product.update(Environment.SERVER, product.id, {
          structuredData: json,
          updatedAt: new Date(),
        });

        return { productId: product.id, success: true as const, json };
      }),
    );

    const items = results.flatMap((result) =>
      result.success && "json" in result
        ? [{ productId: result.productId, json: result.json }]
        : [],
    );

    return {
      success: true as const,
      data: {
        total: results.length,
        succeeded: items.length,
        items,
      },
    };
  },
  "Ucp.generateAllProductStructuredData",
);

const ensureProfileForUser = async (userId: string) => {
  const existing = await find(Environment.SERVER, {
    where: eq(schema.ucpProfile.userId, userId),
  });

  if (!existing.success) return existing;

  const profile = existing.data[0];

  if (profile?.generatedJson) {
    return { success: true as const, data: profile };
  }

  const generated = await generateJson();
  if (!generated.success) return generated;

  const refreshed = await find(Environment.SERVER, {
    where: eq(schema.ucpProfile.userId, userId),
  });

  if (!refreshed.success) return refreshed;
  if (!refreshed.data[0])
    return {
      success: false as const,
      error: new Error("UCP profile could not be generated"),
    };

  return { success: true as const, data: refreshed.data[0] };
};

export const publishProfileToShopify = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const userId = context.session.user.id;

    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false as const, error: new Error("Store not found") };
    if (store.data.userId !== userId)
      return { success: false as const, error: new Error("Not authorized") };
    if (store.data.platform !== "shopify-public")
      return {
        success: false as const,
        error: new Error(
          "UCP publishing is only supported for Shopify stores (OAuth)",
        ),
      };

    const profile = await ensureProfileForUser(userId);
    if (!profile.success) return profile;

    return Shopify.pushShopUcpMetafields({
      store: storeId,
      profile: {
        merchantName: profile.data.merchantName,
        description: profile.data.description,
        logoUrl: profile.data.logoUrl,
        paymentMethods: profile.data.paymentMethods,
        shippingPolicy: profile.data.shippingPolicy,
        returnPolicy: profile.data.returnPolicy,
        contactEmail: profile.data.contactEmail,
        sustainability: profile.data.sustainability,
        certifications: profile.data.certifications,
      },
      generatedJson:
        profile.data.generatedJson ??
        JSON.stringify({
          "@context": "https://ucp.ai/schema",
          "@type": "Merchant",
          name: profile.data.merchantName ?? "",
        }),
    });
  },
  "Ucp.publishProfileToShopify",
);

export const publishProductsToShopify = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const userId = context.session.user.id;

    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false as const, error: new Error("Store not found") };
    if (store.data.userId !== userId)
      return { success: false as const, error: new Error("Not authorized") };
    if (store.data.platform !== "shopify-public")
      return {
        success: false as const,
        error: new Error(
          "Product metafield publishing is only supported for Shopify stores (OAuth)",
        ),
      };

    const products = await Product.find(Environment.SERVER, {
      where: eq(schema.product.storeId, storeId),
    });
    if (!products.success) return products;

    let pushed = 0;
    const errors: string[] = [];

    for (const product of products.data) {
      if (!product.externalId) continue;

      const structuredJson = await (async () => {
        if (product.structuredData) return product.structuredData;
        const generated = await generateProductStructuredData({
          product: product.id,
        });
        if (!generated.success) return null;
        return generated.data.json;
      })();

      if (!structuredJson) {
        errors.push(`${product.title}: could not generate structured data`);
        continue;
      }

      const result = await Shopify.pushProductUcpMetafields({
        product: product.id,
        structuredJson,
      });

      if (!result.success) {
        errors.push(`${product.title}: ${result.error.message}`);
        continue;
      }

      pushed += 1;
    }

    if (pushed === 0 && errors.length > 0)
      return {
        success: false as const,
        error: new Error(errors.slice(0, 3).join("; ")),
      };

    return {
      success: true as const,
      data: { pushed, total: products.data.length, errors },
    };
  },
  "Ucp.publishProductsToShopify",
);
