import { z } from "zod";
import {
  copyVerdictSchema,
  writerPartsSchema,
} from "@/lib/outbound-composition";
import {
  heldReviewPreviewContextSchema,
  heldReviewPreviewSchema,
  heldReviewWrittenSchema,
} from "./held-review-contract";
import { HELD_THIRD_REVIEW_INSTRUCTION_HASH } from "./held-third-review-contract";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const fixedResultRequestSchema = z
  .object({
    sourceJobId: z.string().uuid(),
    instructionHash: z.literal(HELD_THIRD_REVIEW_INSTRUCTION_HASH),
    expectedSourceRowHash: hash,
    expectedOutputHash: hash,
    expectedCandidatePartsHash: hash,
  })
  .strict();
export const fixedResultBindingSchema = z
  .object({
    sourceJobId: z.string().uuid(),
    controlId: z.string().uuid(),
    prospectId: z.string().uuid(),
    instructionHash: z.literal(HELD_THIRD_REVIEW_INSTRUCTION_HASH),
    correctionMode: z.enum([
      "fixed-result",
      "brand-subset",
      "brand-subset-opening",
      "first-final-judgment",
      "first-final-opening",
      "reuse-exact-rejudge",
    ]),
    sourceRowHash: hash,
    sourceOutputHash: hash,
    sourceContextHash: hash,
    sourceCandidatesHash: hash,
    sourceCandidatePartsHash: hash,
    sourceReceiptHash: hash,
    sourceQueryHash: hash,
    sourceError: z.string().min(1).nullable(),
    sourceHeldReason: z.string().min(1),
    sourceCandidateIssues: z.array(z.string().min(1)).min(1).max(100),
    sourceVerdict: copyVerdictSchema.nullable(),
    sourceMessagesHash: hash.nullable(),
    sourceRejudgeHash: hash.nullable(),
    sourceGenerationAttempts: z.union([z.literal(1), z.literal(2)]),
    candidateAttempt: z.literal(2).nullable(),
    resultBefore: z.string().min(1),
    resultAfter: z.string().min(1),
    correctedPartsHash: hash,
    correctiveEdits: z
      .array(
        z
          .object({
            field: z.literal("opening"),
            before: z.string().min(1),
            after: z.string().min(1),
          })
          .strict(),
      )
      .length(1)
      .optional(),
  })
  .strict();
export const fixedResultInputSchema = z
  .object({
    operation: z.literal("heldDiscoveryRound3FixedResult"),
    requestedBy: z.string().min(1),
    sourceBinding: fixedResultBindingSchema,
    recoveryContextHash: hash,
  })
  .strict();
export const fixedResultStateSchema = z
  .object({
    stage: z.enum(["judge", "complete"]),
    lease: z
      .object({ token: z.string().uuid(), expiresAt: z.string().datetime() })
      .strict()
      .nullable(),
    originalContext: heldReviewPreviewContextSchema,
    context: heldReviewPreviewContextSchema,
    parts: writerPartsSchema,
    messages: heldReviewWrittenSchema.shape.messages,
    judgeInputVersion: z.literal("brand-proof-judge-v3"),
    brandSubsetPolicyVersion: z.literal("supported-brand-subset-v1").nullable(),
    searchCalls: z.literal(0),
    writerCalls: z.literal(0),
    newJudgmentPasses: z.union([z.literal(0), z.literal(1)]),
    reservedAt: z.string().datetime().optional(),
    verdict: copyVerdictSchema.optional(),
    unappliedVerdict: copyVerdictSchema.optional(),
    preview: heldReviewPreviewSchema.optional(),
    heldReason: z.string().optional(),
  })
  .strict();
export type FixedResultRequest = z.infer<typeof fixedResultRequestSchema>;
export type FixedResultInput = z.infer<typeof fixedResultInputSchema>;
export type FixedResultState = z.infer<typeof fixedResultStateSchema>;
