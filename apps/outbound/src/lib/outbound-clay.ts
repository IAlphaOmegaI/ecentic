import { z } from "zod";

/** A provider recommendation remains separate from email verification and human approval. */
export const CLAY_ROLE_CONTRACT_VERSION = "1";
export const clayRoleRequestSchema = z
  .object({
    contractVersion: z.literal(CLAY_ROLE_CONTRACT_VERSION),
    routineId: z.string().min(1).max(64),
    credentialVersion: z.string().regex(/^[a-f0-9]{64}$/),
    prospectId: z.string().uuid(),
    prospectRevision: z.number().int().nonnegative(),
    contextHash: z.string().regex(/^[a-f0-9]{64}$/),
    item: z
      .object({
        id: z.string().uuid(),
        inputs: z
          .object({
            domain: z.string(),
            name: z.string(),
            linkedin_url: z.string(),
            email: z.string(),
            title: z.string(),
            company: z.string(),
          })
          .strict(),
      })
      .strict(),
    reservedAt: z.string().datetime(),
  })
  .strict();
export type ClayRoleRequest = z.infer<typeof clayRoleRequestSchema>;

export const clayRoleResultSchema = z
  .object({
    runId: z.string().min(1),
    status: z.enum(["pending", "complete"]),
    results: z
      .array(
        z.object({
          id: z.string(),
          status: z.enum(["complete", "failed"]),
          result: z.record(z.string(), z.unknown()).optional(),
          error: z.object({ message: z.string() }).optional(),
        }),
      )
      .max(1),
    cursor: z.string().nullable(),
    total: z.literal(1),
    finished: z.number().int().min(0).max(1),
    retryAfterSeconds: z.number().nonnegative(),
  })
  .strict();

export const clayRoleStateSchema = z
  .object({
    request: clayRoleRequestSchema,
    runId: z.string().min(1).nullable(),
    requestedAt: z.string().datetime().nullable(),
    polls: z.number().int().min(0).max(20),
    result: clayRoleResultSchema.optional(),
    rejectedResult: z.record(z.string(), z.unknown()).optional(),
    reviewed: z
      .object({
        status: z.enum(["corroborated", "held", "excluded"]),
        reason: z.string(),
        checkedAt: z.string().datetime(),
        resultHash: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .optional(),
  })
  .strict();
export type ClayRoleState = z.infer<typeof clayRoleStateSchema>;
