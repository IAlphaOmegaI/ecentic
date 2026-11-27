import { z } from "zod";
import {
  shoppingCaptureCompletenessSchema,
  shoppingQueryBasisSchema,
  shoppingQueryIntentSchema,
  shoppingResearchSchema,
} from "@/lib/outbound-shopping-research";

export const publicUrlSchema = z
  .string()
  .url()
  .max(2000)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" && !url.username && !url.password && !url.port
    );
  }, "Use a public HTTPS URL without credentials or a custom port.");

export const SHOPPER_QUERY_VERSION = "shopper-query-v2";
export const shopperQueryReviewChecksSchema = z
  .object({
    naturalWordOrder: z.boolean(),
    obviousProductCandidate: z.boolean(),
    unbranded: z.boolean(),
    productGrounding: z.boolean(),
  })
  .strict();
export const shopperQueryReviewSchema = z
  .object({
    version: z.literal(SHOPPER_QUERY_VERSION),
    status: z.enum(["valid", "invalid", "uncertain"]),
    method: z.enum(["deterministic", "semantic"]),
    reason: z.string().trim().min(1).max(1500),
    checks: shopperQueryReviewChecksSchema.nullable(),
    excerptIds: z.array(z.string().min(1).max(80)).max(12),
    queryHash: z.string().regex(/^[a-f0-9]{64}$/),
    captureHash: z.string().regex(/^[a-f0-9]{64}$/),
    contextHash: z.string().regex(/^[a-f0-9]{64}$/),
    promptHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    reviewedAt: z.string().datetime(),
  })
  .strict();
export type ShopperQueryReview = z.infer<typeof shopperQueryReviewSchema>;

export const preparedQuerySchema = z
  .object({
    product: z.object({
      name: z.string().trim().min(1).max(300),
      url: publicUrlSchema,
    }),
    category: z.string().trim().min(1).max(150),
    country: z.string().regex(/^[A-Z]{2}$/),
    surface: z.enum(["google_ai_mode", "chatgpt"]),
    prompt: z.string().trim().min(1).max(4000),
    intent: shoppingQueryIntentSchema.optional(),
    basis: shoppingQueryBasisSchema.optional(),
    contractVersion: z.literal(SHOPPER_QUERY_VERSION).optional(),
    review: shopperQueryReviewSchema.optional(),
    // Saved company identity, never a name inferred by the query model.
    merchant: z
      .object({
        name: z.string().trim().min(1).max(300),
        domain: z.string().trim().min(1).max(253),
        aliases: z.array(z.string().trim().min(1).max(300)).max(30),
      })
      .strict()
      .optional(),
  })
  .strict();
export type PreparedQuery = z.infer<typeof preparedQuerySchema>;

export const aiJobSchema = z
  .object({
    id: z.string().uuid(),
    query: preparedQuerySchema,
    submittedAt: z.string().datetime(),
  })
  .strict();
export type AiJob = z.infer<typeof aiJobSchema>;

// Matches the existing provider-response read ceiling, including embedded images.
export const SHOPPING_CAPTURE_LIMIT = 2_000_000;
export const rawCaptureSchema = z
  .object({
    url: publicUrlSchema,
    status: z.number().int().min(100).max(599),
    receivedAt: z.string().datetime(),
    body: z.string().max(SHOPPING_CAPTURE_LIMIT),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type RawCapture = z.infer<typeof rawCaptureSchema>;

export const sourceSchema = shoppingResearchSchema.shape.sources.element;
export type Source = z.infer<typeof sourceSchema>;

export const aiCaptureSchema = z
  .object({
    job: aiJobSchema,
    executedAt: z.string().datetime(),
    receivedAt: z.string().datetime(),
    answer: z.string().min(1).max(SHOPPING_CAPTURE_LIMIT),
    // Historical captures without this proof remain unknown, not complete.
    completeness: shoppingCaptureCompletenessSchema.optional(),
    source: sourceSchema,
    // Direct answer citations only. Organic search results are not recommendations.
    links: z
      .array(
        z
          .object({
            url: publicUrlSchema,
            title: z.string().max(1000),
            snippet: z.string().max(3000),
          })
          .strict(),
      )
      .max(50),
    cached: z.literal(false),
    raw: z.array(rawCaptureSchema).min(1).max(2),
  })
  .strict();
export type AiCapture = z.infer<typeof aiCaptureSchema>;

const browserCaptureSchema = z
  .object({
    status: z.literal("captured"),
    sources: z.array(sourceSchema).min(2).max(8),
    ucp: shoppingResearchSchema.shape.ucp,
    checkout: shoppingResearchSchema.shape.checkout,
    raw: z.array(rawCaptureSchema).min(2).max(10),
    candidates: z
      .array(
        z
          .object({
            name: z.string().min(1).max(300),
            product: z.string().min(1).max(300),
            url: publicUrlSchema,
            sourceIds: z.array(z.string()).min(1).max(2),
          })
          .strict(),
      )
      .max(2),
    limitations: z.array(z.string().max(1500)).max(10),
  })
  .strict();

export const browserResearchSchema = z.discriminatedUnion("status", [
  browserCaptureSchema,
  z
    .object({
      status: z.literal("held"),
      reason: z.string().min(1).max(1500),
      sources: z.array(sourceSchema).max(8),
      raw: z.array(rawCaptureSchema).max(10),
    })
    .strict(),
]);
export type BrowserResearch = z.infer<typeof browserResearchSchema>;
