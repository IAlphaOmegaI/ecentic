import { z } from "zod";

export const REPLACEMENT_MANIFEST_HASH =
  "4f00d3bc55121b0a89767c71c8bea2bf8e84507915ff804116ce040a5c2c9545";
export const REPLACEMENT_SENDER = "xhuri@joinecentic.com";
export const REPLACEMENT_EARLIEST = "2026-12-02T00:00:00.000Z";
export const REPLACEMENT_HOLD = "replacementReviewRequired";
const hash = z.string().regex(/^[a-f0-9]{64}$/);

/** Human review of one exact fresh sequence, never permission to erase prior outreach. */
export const replacementRequestSchema = z
  .object({
    sourceProspectId: z.string().uuid(),
    expectedRevision: z.number().int().nonnegative(),
    previewJobId: z.string().uuid(),
    previewJobHash: hash,
    authorizationReference: hash,
    reviewedSubject: z.string().min(1).max(200),
  })
  .strict();
export const replacementAuthorizationSchema = replacementRequestSchema
  .extend({
    version: z.literal("fresh-sequence-v1"),
    manifestHash: z.literal(REPLACEMENT_MANIFEST_HASH),
    sourceRowHash: hash,
    sourceRowProjection: z.enum(["full", "before-replacements"]),
    sourceAttemptId: z.string().uuid(),
    sourceAttemptHash: hash,
    sourceRevision: z.number().int().nonnegative(),
    sourceRevisionHash: hash,
    previewReceiptHash: hash,
    reviewedMessagesHash: hash,
    senderEmail: z.literal(REPLACEMENT_SENDER),
    senderHash: hash,
    companyLastContactedAt: z.string().datetime(),
    notBefore: z.string().datetime(),
    authorizedBy: z.string().min(1),
    authorizedAt: z.string().datetime(),
  })
  .strict();
export type ReplacementAuthorization = z.infer<
  typeof replacementAuthorizationSchema
>;
