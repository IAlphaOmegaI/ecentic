"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../database";
import { generate } from "../../utils/ai";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import type { Document } from "../../utils/repository";
import { repository } from "../../utils/repository";
import * as Product from "../product";

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
  const [profileResult, productsResult] = await Promise.all([
    find(Environment.SERVER, {
      where: eq(schema.ucpProfile.userId, context.session.user.id),
    }),
    Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, context.session.user.id),
    }),
  ]);

  if (!profileResult.success) return profileResult;
  if (!productsResult.success) return productsResult;

  const profile = profileResult.data[0];
  const products = productsResult.data;

  const productSummary = products
    .slice(0, 20)
    .map((p) => `- ${p.title} (${p.currency ?? "USD"} ${p.price ?? "N/A"})`)
    .join("\n");

  const ucpData = await generate({
    system:
      "You are a structured data expert. Generate a valid Universal Commerce Protocol (UCP) JSON for a merchant profile. The UCP is served at /.well-known/ucp and helps AI shopping agents understand a merchant's identity, policies, and catalog.",
    prompt: `Generate a UCP JSON for this merchant:

Merchant Name: ${profile?.merchantName ?? "Unknown"}
Description: ${profile?.description ?? ""}
Logo: ${profile?.logoUrl ?? ""}
Payment Methods: ${profile?.paymentMethods ?? ""}
Shipping Policy: ${profile?.shippingPolicy ?? ""}
Return Policy: ${profile?.returnPolicy ?? ""}
Contact Email: ${profile?.contactEmail ?? ""}
Sustainability: ${profile?.sustainability ?? ""}
Certifications: ${profile?.certifications ?? ""}

Top products:
${productSummary || "No products yet"}`,
    schema: z.object({
      "@context": z.string(),
      "@type": z.literal("Merchant"),
      name: z.string(),
      description: z.string().optional(),
      logo: z.string().optional(),
      paymentMethods: z.array(z.string()).optional(),
      shippingPolicy: z.string().optional(),
      returnPolicy: z.string().optional(),
      contact: z.object({ email: z.string().optional() }).optional(),
      sustainability: z.string().optional(),
      certifications: z.array(z.string()).optional(),
      catalog: z
        .object({
          totalProducts: z.number(),
          topCategories: z.array(z.string()).optional(),
        })
        .optional(),
    }),
  });

  const generatedJson = JSON.stringify(ucpData, null, 2);

  if (profile) {
    await update(Environment.SERVER, profile.id, {
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
  async (context, { productId }: { productId: string }) => {
    const productResult = await Product.get(Environment.SERVER, productId);

    if (!productResult.success) return productResult;

    const product = productResult.data;

    if (!product)
      return { success: false as const, error: new Error("Product not found") };

    if (product.userId !== context.session.user.id)
      return { success: false as const, error: new Error("Unauthorized") };

    const structured = await generate({
      system:
        "You are a structured data expert. Generate valid schema.org Product JSON-LD for an e-commerce product. This JSON helps AI shopping agents understand and recommend the product.",
      prompt: `Generate schema.org Product structured data for:
Title: ${product.title}
Description: ${product.description ?? ""}
Price: ${product.currency ?? "USD"} ${product.price ?? ""}
Compare At: ${product.compareAtPrice ?? ""}
SKU: ${product.sku ?? ""}
URL: ${product.url ?? ""}`,
      schema: z.object({
        "@context": z.string(),
        "@type": z.literal("Product"),
        name: z.string(),
        description: z.string().optional(),
        sku: z.string().optional(),
        offers: z.object({
          "@type": z.literal("Offer"),
          price: z.string(),
          priceCurrency: z.string(),
          availability: z.string(),
        }),
        brand: z.object({ "@type": z.string(), name: z.string() }).optional(),
        url: z.string().optional(),
      }),
    });

    const structuredJson = JSON.stringify(structured, null, 2);

    await Product.update(Environment.SERVER, productId, {
      structuredData: structuredJson,
      updatedAt: new Date(),
    });

    return { success: true as const, data: { json: structuredJson } };
  },
  "Ucp.generateProductStructuredData",
);

export const generateAllProductStructuredData = withAuthentication(
  async (context) => {
    const productsResult = await Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, context.session.user.id),
    });

    if (!productsResult.success) return productsResult;

    const results = await Promise.all(
      productsResult.data.map(async (product) => {
        const structured = await resultify(() =>
          generate({
            system:
              "You are a structured data expert. Generate valid schema.org Product JSON-LD for an e-commerce product.",
            prompt: `Generate schema.org Product structured data for:
Title: ${product.title}
Description: ${product.description ?? ""}
Price: ${product.currency ?? "USD"} ${product.price ?? ""}
SKU: ${product.sku ?? ""}`,
            schema: z.object({
              "@context": z.string(),
              "@type": z.literal("Product"),
              name: z.string(),
              description: z.string().optional(),
              sku: z.string().optional(),
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
