import { z } from "zod";
import type { ShoppingResearch } from "@/lib/outbound-shopping-research";
import { ValidationError } from "@/server/utils/error";
import {
  aiCaptureSchema,
  aiJobSchema,
  browserResearchSchema,
  rawCaptureSchema,
  shopperQueryReviewSchema,
} from "./live-shopping-contract";

const capturedBrowser = browserResearchSchema.options[0];
const savedEvidenceSchema = z
  .object({
    answer: aiCaptureSchema,
    browser: capturedBrowser,
    queryReview: shopperQueryReviewSchema.optional(),
  })
  .strict();
const unsuccessfulPurchaseSchema = z
  .object({
    job: aiJobSchema,
    status: z.enum(["failed", "uncertain"]),
    reason: z.string().min(1),
    raw: z.array(rawCaptureSchema).max(12),
  })
  .strict();

/** Optional additions retain old proof bytes and preserve prior captures as audit evidence only. */
export const researchCaptureProofSchema = savedEvidenceSchema
  .extend({
    captureJobId: z.string().uuid(),
    previous: z.array(savedEvidenceSchema).min(1).max(4).optional(),
    priorPurchases: z
      .array(unsuccessfulPurchaseSchema)
      .min(1)
      .max(4)
      .optional(),
  })
  .strict();

/** Select only history already claimed by this receipt from its actual durable capture job. */
export const researchCaptureProof = (
  captureJobId: string,
  current: z.infer<typeof savedEvidenceSchema>,
  receipt: ShoppingResearch,
  source: Record<string, unknown>,
) => {
  if (!receipt.captureHistory?.length && !receipt.purchaseHistory?.length)
    return researchCaptureProofSchema.parse({ captureJobId, ...current });
  const history = z
    .array(z.record(z.string(), z.unknown()))
    .max(4)
    .parse(source["shoppingHistory"] ?? []);
  const purchases = z
    .array(z.record(z.string(), z.unknown()))
    .max(4)
    .parse(source["priorPurchases"] ?? []);
  const previous = receipt.captureHistory?.map((entry) => {
    const matching = [...history, ...purchases].filter((candidate) => {
      const answer = aiCaptureSchema.safeParse(candidate["answer"]);
      return answer.success && answer.data.source.id === entry.sourceId;
    });
    if (matching.length !== 1)
      throw new ValidationError(
        "The receipt's prior capture is missing or ambiguous in its saved research job.",
      );
    const capture = matching[0];
    if (!capture) throw new ValidationError("The prior capture is missing.");
    return savedEvidenceSchema.parse({
      answer: capture["answer"],
      browser: capture["browser"],
      ...(capture["queryReview"]
        ? { queryReview: capture["queryReview"] }
        : {}),
    });
  });
  const priorPurchases = receipt.purchaseHistory?.map((entry) => {
    const matching = purchases.filter((candidate) => {
      const job = aiJobSchema.safeParse(candidate["shoppingJob"]);
      return job.success && job.data.id === entry.jobId;
    });
    if (matching.length !== 1)
      throw new ValidationError(
        "The receipt's prior purchase is missing or ambiguous in its saved research job.",
      );
    const purchase = matching[0];
    if (!purchase || purchase["answer"])
      throw new ValidationError(
        "A completed capture cannot be saved as an unsuccessful purchase.",
      );
    return unsuccessfulPurchaseSchema.parse({
      job: purchase["shoppingJob"],
      status: purchase["status"],
      reason: purchase["reason"],
      raw: purchase["raw"],
    });
  });
  return researchCaptureProofSchema.parse({
    captureJobId,
    ...current,
    ...(previous?.length ? { previous } : {}),
    ...(priorPurchases?.length ? { priorPurchases } : {}),
  });
};
