import { z } from "zod";
import { shoppingResearchSchema } from "@/lib/outbound-shopping-research";

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

export const rawCaptureSchema = z
  .object({
    url: publicUrlSchema,
    status: z.number().int().min(100).max(599),
    receivedAt: z.string().datetime(),
    body: z.string().max(2_000_000),
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
    answer: z.string().min(1).max(200_000),
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
