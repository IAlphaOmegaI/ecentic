import { z } from "zod";
import {
  preparedQuerySchema,
  shopperQueryReviewSchema,
} from "./live-shopping-contract";

export const QUERY_BASIS_REVIEW_VERSION = "round3-good-american-basis-v1";
export const QUERY_BASIS_REVIEW_SCOPE = {
  sourceJobId: "0fd92c97-343e-424e-9447-24dfdb4c80cd",
  controlId: "669c6899-a5c7-4bd0-b630-438dd7e299c6",
  company: "Good American",
  productName: "GOOD WAIST PALAZZO JEANS | SHORE",
  productUrl:
    "https://www.goodamerican.com/products/good-waist-palazzo-jeans-shore",
  savedCategory: "wide-leg jeans",
  question: "wide leg jeans",
  category: "jeans",
  attribute: "wide leg",
  excerptId: "qp_eba476a6828702566de07738",
} as const;
export const QUERY_BASIS_REVIEW_REASON =
  "The question needs a separate supported use, occasion or attribute.";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export type QueryBasisReviewReference = {
  auditJobId: string;
  version: typeof QUERY_BASIS_REVIEW_VERSION;
  sourceRowHash: string;
  sourceOutputHash: string;
  preparationAuditHash: string;
  queryHash: string;
  reviewHash: string;
  appliedAt: string;
};
export const queryBasisReviewReferenceSchema: z.ZodType<QueryBasisReviewReference> =
  z
    .object({
      auditJobId: z.string().uuid(),
      version: z.literal(QUERY_BASIS_REVIEW_VERSION),
      sourceRowHash: hash,
      sourceOutputHash: hash,
      preparationAuditHash: hash,
      queryHash: hash,
      reviewHash: hash,
      appliedAt: z.string().datetime(),
    })
    .strict();
export const queryBasisReviewRequestSchema = z
  .object({
    sourceJobId: z.string().uuid(),
    instructionHash: hash,
    expectedSourceRowHash: hash,
    expectedOutputHash: hash,
    expectedPreparationAuditHash: hash,
  })
  .strict();
export const queryBasisReviewInputSchema = z
  .object({
    operation: z.literal("heldDiscoveryRound3QueryBasisReview"),
    version: z.literal(QUERY_BASIS_REVIEW_VERSION),
    sourceJobId: z.string().uuid(),
    controlId: z.string().uuid(),
    prospectId: z.string().uuid(),
    instructionHash: hash,
    sourceRowHash: hash,
    sourceOutputHash: hash,
    preparationAuditId: z.string().uuid(),
    preparationAuditHash: hash,
    requestedBy: z.string().min(1),
    reservedAt: z.string().datetime(),
    query: preparedQuerySchema,
  })
  .strict();
export const queryBasisReviewStateSchema = z
  .object({
    originalRowCanonical: z.string().min(1).max(20_000_000),
    originalOutputCanonical: z.string().min(1).max(20_000_000),
    preparationAuditCanonical: z.string().min(1).max(20_000_000),
    reviewAttempts: z.literal(1),
    lease: z
      .object({ token: z.string().uuid(), expiresAt: z.string().datetime() })
      .strict()
      .nullable(),
    review: shopperQueryReviewSchema.optional(),
    checkedAt: z.string().datetime().optional(),
    appliedAt: z.string().datetime().optional(),
    initialRequeuedStateHash: hash.optional(),
    heldReason: z.string().min(1).optional(),
  })
  .strict();
export type QueryBasisReviewRequest = z.infer<
  typeof queryBasisReviewRequestSchema
>;
