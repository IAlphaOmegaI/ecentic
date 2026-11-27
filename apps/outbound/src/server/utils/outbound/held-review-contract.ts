import { createHash } from "node:crypto";
import { z } from "zod";
import { playbookSchema, prospectSchema } from "@/lib/outbound";
import {
  storedWriterPartsSchema,
  writingSnapshotSchema,
} from "@/lib/outbound-composition";
import {
  compositionReferenceSchema,
  writerCandidatesSchema,
} from "@/lib/outbound-sequence-composition";
import { shoppingResearchSchema } from "@/lib/outbound-shopping-research";
import {
  aiCaptureSchema,
  aiJobSchema,
  browserResearchSchema,
  preparedQuerySchema,
  shopperQueryReviewSchema,
} from "./live-shopping-contract";
import { shoppingQueryHistorySchema } from "./shopping-query-history";

export const HELD_REVIEW_REASON = "Copy review requested before first email";
export const HELD_REVIEW_ROUND2_INSTRUCTION_HASH =
  "8aa5d1263411b9547060bde51ae1d01e57569e9d05227bfd4e99a116104d5112";
// Hash of the sorted, newline-separated 21 IDs in the private frozen corpus.
export const HELD_REVIEW_MANIFEST_HASH =
  "c6cebe96d475b39f93aedd9474dc74978f91e42abfe7ad35237090701ff3e79c";
export const heldManifestHash = (ids: string[]) =>
  createHash("sha256")
    .update([...ids].sort().join("\n"))
    .digest("hex");
export const heldReviewManifestSchema = z
  .object({
    version: z.literal(1),
    prospectIds: z.array(z.string().uuid()).length(21),
    approvedHoldReason: z.literal(HELD_REVIEW_REASON),
  })
  .strict()
  .refine((manifest) => new Set(manifest.prospectIds).size === 21);
export const heldReviewBatchSchema = z
  .object({
    operation: z.literal("heldDiscoveryReviewBatch"),
    manifest: heldReviewManifestSchema,
    manifestHash: z.string().regex(/^[a-f0-9]{64}$/),
    maxQueries: z.literal(42),
    requestedBy: z.string().min(1),
  })
  .strict();
export const heldReviewBudgetSchema = z
  .object({
    queriesReserved: z.number().int().min(0).max(42),
    paused: z.boolean(),
    browserAvailableAt: z.string().datetime().optional(),
  })
  .strict();
export const heldReviewInputSchema = z
  .object({
    operation: z.literal("heldDiscoveryReview"),
    batchId: z.string().uuid(),
    prospectId: z.string().uuid(),
    campaignId: z.string().uuid().nullable(),
    campaignRevision: z.number().int().nonnegative().nullable(),
    playbookRevision: z.number().int().nonnegative(),
    researchPolicyHash: z.string().regex(/^[a-f0-9]{64}$/),
    manifestHash: z.string().regex(/^[a-f0-9]{64}$/),
    requestedBy: z.string().min(1),
    reviewRound: z.literal(2).optional(),
    previousJobId: z.string().uuid().optional(),
    previousOutputHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    instructionHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    product: z.object({ name: z.string().min(1), url: z.string().url() }),
    category: z.string().min(1),
    country: z.string().min(1),
    merchant: z.object({ name: z.string().min(1), domain: z.string().min(1) }),
  })
  .strict();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
/** Schema order makes an operator's expected hash stable across JSONB storage. */
export const heldPreparedQueryHash = (input: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(preparedQuerySchema.parse(input)))
    .digest("hex");
export const heldQueryRepairSchema = z
  .object({
    originalQuery: preparedQuerySchema,
    originalQueryHash: digest,
    originalGeneration: z.object({ attempts: z.literal(1) }).strict(),
    validationFailure: z.string().min(1).max(2000),
    requestedBy: z.string().min(1).max(200),
    requestedAt: z.string().datetime(),
    reservedAt: z.string().datetime().optional(),
  })
  .strict()
  .refine(
    (repair) =>
      heldPreparedQueryHash(repair.originalQuery) === repair.originalQueryHash,
    "The original query hash must match its preserved candidate.",
  );
export const heldQueryQualityHoldSchema = z
  .object({
    queryHash: digest,
    reason: z.string().trim().min(1).max(2000),
    requestedBy: z.string().trim().min(1).max(200),
    heldAt: z.string().datetime(),
  })
  .strict();
export const HELD_POLL_PARSE_ERRORS = [
  "The original response does not match this uncached shopper query.",
  "The provider returned no bounded, readable AI answer.",
] as const;
export const heldPollRecoverySchema = z
  .object({
    shoppingJobId: z.string().uuid(),
    responseSha256: digest,
    queryHash: digest,
    originalError: z.enum(HELD_POLL_PARSE_ERRORS),
    originalHeldReason: z.string().min(1),
    originalFailureReceipt: z.record(z.string(), z.unknown()),
    requestedBy: z.string().trim().min(1).max(200),
    recoveredAt: z.string().datetime(),
  })
  .strict();
export const HELD_CARD_ASSESSMENT_ERRORS = [
  "The selected finding needs more than twelve exact excerpts.",
  "Grouped product cards establish no global rank, count, price comparison or correctness; only complete merchant absence is supported.",
] as const;
export const heldCardAssessmentRecoverySchema = z
  .object({
    shoppingJobId: z.string().uuid(),
    responseSha256: digest,
    queryHash: digest,
    originalHeldReason: z.enum(HELD_CARD_ASSESSMENT_ERRORS),
    originalError: z.enum(HELD_CARD_ASSESSMENT_ERRORS).nullable(),
    originalReceiptHash: z.null(),
    receiptHash: digest,
    rawCaptures: z
      .array(z.object({ url: z.string().url(), sha256: digest }).strict())
      .min(3)
      .max(12),
    requestedBy: z.string().trim().min(1).max(200),
    recoveredAt: z.string().datetime(),
  })
  .strict();
export const heldWriterCandidateRecoverySchema = z
  .object({
    candidatePartsHash: digest,
    candidateAttempt: z.literal(2),
    candidatesHash: digest,
    queryHash: digest,
    shoppingJobId: z.string().uuid(),
    responseSha256: digest,
    receiptHash: digest,
    contextHash: digest,
    originalError: z.string().min(1).max(200005),
    originalHeldReason: z.string().min(1).max(200005),
    originalIssues: z.array(z.string().min(1).max(2000)).min(1).max(100),
    rawCaptures: z
      .array(z.object({ url: z.string().url(), sha256: digest }).strict())
      .min(3)
      .max(12),
    requestedBy: z.string().trim().min(1).max(200),
    recoveredAt: z.string().datetime(),
    reservedAt: z.string().datetime().optional(),
  })
  .strict();
const previewMessageSchema = z
  .object({
    step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    afterDays: z.number().int().nonnegative(),
    subject: z.string().min(1),
    body: z.string().min(1),
    writing: writingSnapshotSchema.optional(),
  })
  .strict();
const previewGenerationSchema = z
  .object({ attempts: z.number().int().min(1).max(2) })
  .strict();
export const heldReviewPreviewContextSchema = z
  .object({
    status: z.literal("unapplied"),
    prospect: prospectSchema,
    prospectRevision: z.number().int().nonnegative(),
    playbookRevision: z.number().int().nonnegative(),
    proposedPolicy: playbookSchema,
    globalVoiceNotes: z.string(),
    receiptHash: digest,
    writingPolicyHash: digest,
    baseWritingPolicyHash: digest,
    prospectHash: digest,
    peers: z
      .array(
        z
          .object({
            opening: z.string(),
            relationship: z.string().nullable(),
            occasion: z.string().nullable(),
          })
          .strict(),
      )
      .max(9),
  })
  .strict();
export const heldReviewWrittenSchema = z
  .object({
    parts: storedWriterPartsSchema,
    messages: z.array(previewMessageSchema).length(3),
    generation: previewGenerationSchema,
    writerCompletedAt: z.string().datetime(),
  })
  .strict();
export const heldReviewPreviewSchema = heldReviewPreviewContextSchema
  .extend({
    parts: storedWriterPartsSchema,
    messages: z.array(previewMessageSchema).length(3),
    generation: previewGenerationSchema,
    issues: z
      .array(z.object({ code: z.string(), field: z.string() }).strict())
      .max(100),
  })
  .strict();
export const heldReviewStateSchema = z
  .object({
    stage: z.enum([
      "renderedProduct",
      "generateQuery",
      "reviewQuery",
      "repairQuery",
      "query",
      "poll",
      "browser",
      "assess",
      "brands",
      "applyResearch",
      "draft",
      "applyDraft",
      "complete",
    ]),
    prospectRevision: z.number().int().nonnegative(),
    availableAt: z.string().datetime(),
    lease: z
      .object({ token: z.string().uuid(), expiresAt: z.string().datetime() })
      .nullable(),
    shoppingQueryIntent: z.enum(["unbranded-specific", "unbranded-broad"]),
    shoppingQueryCount: z.number().int().min(0).max(2),
    queryReservedAt: z.string().datetime().optional(),
    polls: z.number().int().min(0).max(40),
    productCapture: browserResearchSchema.optional(),
    query: preparedQuerySchema.optional(),
    queryGeneration: z
      .object({ attempts: z.number().int().min(0).max(2) })
      .optional(),
    queryRepair: heldQueryRepairSchema.optional(),
    queryQualityHold: heldQueryQualityHoldSchema.optional(),
    pollRecoveries: z.array(heldPollRecoverySchema).max(2).optional(),
    cardAssessmentRecovery: heldCardAssessmentRecoverySchema.optional(),
    shoppingJob: aiJobSchema.optional(),
    answer: aiCaptureSchema.optional(),
    browser: browserResearchSchema.optional(),
    shoppingReceipt: shoppingResearchSchema.optional(),
    shoppingHistory: shoppingQueryHistorySchema.optional(),
    priorPurchase: z
      .object({
        query: preparedQuerySchema,
        shoppingJob: aiJobSchema,
        answer: aiCaptureSchema.optional(),
        browser: browserResearchSchema.optional(),
        shoppingReceipt: shoppingResearchSchema.optional(),
        queryReservedAt: z.string().datetime(),
        failureReason: z.string().nullable(),
      })
      .strict()
      .optional(),
    queryReview: shopperQueryReviewSchema.optional(),
    previousQueryReview: shopperQueryReviewSchema.optional(),
    queryPurpose: z
      .enum(["initial", "reuse", "correction", "broader"])
      .optional(),
    composition: compositionReferenceSchema.optional(),
    researchId: z.string().uuid().optional(),
    previewContext: heldReviewPreviewContextSchema.optional(),
    draftBeforeJudge: heldReviewWrittenSchema.optional(),
    writerCandidates: writerCandidatesSchema.optional(),
    writerCandidateRecovery: heldWriterCandidateRecoverySchema.optional(),
    preview: heldReviewPreviewSchema.optional(),
    heldReason: z.string().optional(),
    failureReceipt: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict();
export type HeldReviewInput = z.infer<typeof heldReviewInputSchema>;
export type HeldReviewState = z.infer<typeof heldReviewStateSchema>;
export type HeldReviewManifest = z.infer<typeof heldReviewManifestSchema>;
export const heldReviewStageBudget = (
  stage: HeldReviewState["stage"],
  reviewRound?: 2,
) => {
  if (stage === "generateQuery" && reviewRound === 2) return 110_000;
  if (["renderedProduct", "browser"].includes(stage)) return 120_000;
  if (stage === "draft") return 100_000;
  if (
    [
      "generateQuery",
      "reviewQuery",
      "repairQuery",
      "assess",
      "brands",
    ].includes(stage)
  )
    return 50_000;
  if (stage === "query") return 30_000;
  if (stage === "poll") return 20_000;
  return 10_000;
};
