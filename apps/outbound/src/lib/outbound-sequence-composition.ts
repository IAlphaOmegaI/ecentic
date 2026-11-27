import { z } from "zod";
import { storedWriterPartsSchema } from "./outbound-composition";

const hash = z.string().regex(/^[a-f0-9]{64}$/);

/** A reference to server-owned output, never authority to supply replacement messages. */
export const compositionReferenceSchema = z
  .object({
    jobId: z.string().uuid(),
    key: z.string().min(1).max(120),
    prospectId: z.string().uuid(),
    prospectRevision: z.number().int().nonnegative(),
    playbookRevision: z.number().int().nonnegative(),
    receiptHash: hash,
    writingPolicyHash: hash,
    contentHash: hash,
  })
  .strict();
export type CompositionReference = z.infer<typeof compositionReferenceSchema>;

/** Diagnostic text only; a candidate is never a completed or approved sequence. */
export const writerCandidateSchema = z
  .object({
    status: z.literal("unapproved"),
    attempt: z.union([z.literal(1), z.literal(2)]),
    parts: storedWriterPartsSchema,
    issues: z.array(z.string().min(1).max(2000)).max(100),
    completedAt: z.string().datetime(),
    partsHash: hash,
    instructionsHash: hash,
    promptHash: hash,
    receiptHash: hash,
    writingPolicyHash: hash,
    prospectHash: hash,
    contextHash: hash,
  })
  .strict();
export const writerCandidatesSchema = z
  .array(writerCandidateSchema)
  .max(2)
  .refine(
    (candidates) =>
      candidates.every(
        (candidate, index) =>
          index === 0 ||
          candidate.attempt > (candidates[index - 1]?.attempt ?? 0),
      ),
    "Writer candidates must retain each completed attempt once, in order.",
  );
export type WriterCandidate = z.infer<typeof writerCandidateSchema>;
