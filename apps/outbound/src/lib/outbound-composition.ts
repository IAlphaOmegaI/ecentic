import { z } from "zod";

export const WRITING_CONTRACT_VERSION = "discovery-email-v1";
export const COPY_CRITERIA = [
  "openingFits",
  "resultCheckable",
  "reasonToCare",
  "founderTransition",
  "oneChatAsk",
  "naturalVoice",
] as const;

/** These are the only recipient-facing fragments a writer may supply. */
export const writerPartsSchema = z
  .object({
    subject: z.string().trim().min(1).max(200),
    opening: z.string().trim().min(1).max(1200),
    result: z.string().trim().min(1).max(1600),
    relevance: z.string().trim().min(1).max(1400),
    followupFact: z.string().trim().max(1200),
  })
  .strict();
export type WriterParts = z.infer<typeof writerPartsSchema>;

export const copyCriterionSchema = z
  .object({
    criterion: z.enum(COPY_CRITERIA),
    passed: z.boolean(),
    reason: z.string().trim().min(1).max(300),
  })
  .strict();

export const copyVerdictSchema = z
  .object({
    passed: z.boolean(),
    evaluatedAt: z.string().datetime(),
    deterministicIssues: z.array(z.string().min(1).max(1000)).max(100),
    criteria: z.array(copyCriterionSchema).max(COPY_CRITERIA.length),
  })
  .strict();
export type CopyVerdict = z.infer<typeof copyVerdictSchema>;

const hash = z.string().regex(/^[a-f0-9]{64}$/);

/** Optional on historical messages; populated only on a newly written revision. */
export const writingSnapshotSchema = z
  .object({
    version: z.literal(WRITING_CONTRACT_VERSION),
    writingPolicyHash: hash,
    receiptHash: hash,
    contentHash: hash,
    revision: z.number().int().nonnegative().nullable(),
    generatedAt: z.string().datetime(),
    parts: writerPartsSchema,
    queryTopic: z.string().trim().min(1).max(200),
    narrative: z
      .object({
        relationship: z.string().max(100).nullable(),
        occasion: z.string().max(100).nullable(),
      })
      .strict(),
    quality: copyVerdictSchema.nullable(),
  })
  .strict();
export type WritingSnapshot = z.infer<typeof writingSnapshotSchema>;

/** Inferences are selected from approved policy; they are never stored as observations. */
export type RelevanceClaim = {
  type: "inference";
  id: string;
  value: string;
};
