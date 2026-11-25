import { z } from "zod";
import { shoppingResearchSchema } from "@/lib/outbound-shopping-research";
import {
  companyEvidenceSchema,
  sourceReceiptSchema,
} from "./automation-qualification";
import {
  browserRateLimitSchema,
  browserRetryLimit,
} from "./firecrawl-cooldown";
import {
  aiCaptureSchema,
  aiJobSchema,
  browserResearchSchema,
  preparedQuerySchema,
} from "./live-shopping";
import {
  shoppingPollLimit,
  shoppingRateLimitSchema,
  shoppingRetryLimit,
} from "./scrapellm-cooldown";

export const preparationInputSchema = z.object({
  operation: z.literal("savedContactPreparation"),
  batchId: z.string().uuid(),
  prospectId: z.string().uuid(),
  campaignId: z.string().uuid(),
  campaignRevision: z.number().int().nonnegative(),
  playbookRevision: z.number().int().nonnegative(),
  requestedBy: z.string().min(1),
});
export const preparationStateSchema = z
  .object({
    stage: z.enum([
      "preflight",
      "collect",
      "location",
      "qualify",
      "applyCompany",
      "query",
      "poll",
      "browser",
      "assess",
      "applyResearch",
      "draft",
      "complete",
    ]),
    prospectRevision: z.number().int().nonnegative(),
    availableAt: z.string().datetime(),
    lease: z
      .object({ token: z.string().uuid(), expiresAt: z.string().datetime() })
      .nullable(),
    queryReservedAt: z.string().datetime().optional(),
    polls: z.number().int().nonnegative().default(0),
    queryRetries: z.number().int().min(0).max(shoppingRetryLimit).default(0),
    queryRetryPending: z.boolean().default(false),
    queryRateLimits: z
      .array(shoppingRateLimitSchema)
      .max(shoppingRetryLimit)
      .default([]),
    pollRateLimits: z
      .array(shoppingRateLimitSchema)
      .max(shoppingPollLimit)
      .default([]),
    browserRetries: z.number().int().min(0).max(browserRetryLimit).default(0),
    browserRateLimits: z
      .array(browserRateLimitSchema)
      .max(browserRetryLimit)
      .default([]),
    mx: z
      .object({
        provider: z.enum(["google", "microsoft", "other", "unknown"]),
        records: z.array(z.string()),
        checkedAt: z.string().datetime(),
      })
      .optional(),
    companyEvidence: companyEvidenceSchema.optional(),
    locationReceipts: z.array(sourceReceiptSchema).optional(),
    timezone: z
      .object({
        timezone: z.string(),
        sourceUrl: z.string().url(),
        checkedAt: z.string().datetime(),
        quote: z.string(),
      })
      .optional(),
    qualification: z.record(z.string(), z.unknown()).optional(),
    query: preparedQuerySchema.optional(),
    shoppingJob: aiJobSchema.optional(),
    answer: aiCaptureSchema.optional(),
    browser: browserResearchSchema.optional(),
    shoppingReceipt: shoppingResearchSchema.optional(),
  })
  .passthrough();
export type PreparationInput = z.infer<typeof preparationInputSchema>;
export type PreparationState = z.infer<typeof preparationStateSchema>;

export const paidPreparationStage = (stage: PreparationState["stage"]) =>
  ["qualify", "query", "browser", "assess"].includes(stage);

export const preparationStageBudget = (stage: PreparationState["stage"]) => {
  switch (stage) {
    case "collect":
      return 70_000;
    case "location":
      return 40_000;
    case "browser":
      return 120_000;
    case "qualify":
    case "assess":
      return 50_000;
    case "query":
      return 30_000;
    case "poll":
      return 20_000;
    default:
      return 10_000;
  }
};
