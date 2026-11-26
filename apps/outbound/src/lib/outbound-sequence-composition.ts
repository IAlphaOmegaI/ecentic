import { z } from "zod";

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
