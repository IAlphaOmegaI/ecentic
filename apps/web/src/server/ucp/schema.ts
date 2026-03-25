import { z } from "zod";

/**
 * Schema.org-shaped product + offer slice used as the UCP catalog item in this app.
 * Built deterministically from synced catalog rows (no LLM).
 */
export const ucpProductOfferSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("Product"),
  name: z.string().min(1),
  description: z.string().optional(),
  sku: z.string().optional(),
  url: z.string().optional(),
  offers: z.object({
    "@type": z.literal("Offer"),
    price: z.string().min(1),
    priceCurrency: z.string().min(1),
    availability: z.string().min(1),
    url: z.string().optional(),
  }),
});

export type UcpProductOffer = z.infer<typeof ucpProductOfferSchema>;

export const ucpMerchantDocumentSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("Merchant"),
  ucpSpecVersion: z.string(),
  name: z.string().min(1),
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
      totalProducts: z.number().int().nonnegative(),
      topCategories: z.array(z.string()).optional(),
      offers: z.array(ucpProductOfferSchema).optional(),
    })
    .optional(),
});

export type UcpMerchantDocument = z.infer<typeof ucpMerchantDocumentSchema>;
