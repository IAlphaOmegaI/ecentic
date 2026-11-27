import { z } from "zod";

export const HUBSPOT_PULL_OPERATION = "hubspotExclusionPullV1";
export const HUBSPOT_STALE_MS = 3 * 86_400_000;
export const hubspotObjectSchema = z.enum(["companies", "contacts"]);
export const hubspotPageSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().regex(/^\d+$/).max(100),
        updatedAt: z.string().datetime(),
        archived: z.literal(false),
        properties: z.object({
          domain: z.string().max(4000).nullable().optional(),
          hs_additional_domains: z.string().max(10000).nullable().optional(),
          email: z.string().max(4000).nullable().optional(),
          hs_additional_emails: z.string().max(10000).nullable().optional(),
        }),
      }),
    )
    .max(100),
  paging: z
    .object({
      next: z.object({ after: z.string().min(1).max(500) }).optional(),
    })
    .optional(),
});
export const hubspotPullInputSchema = z
  .object({
    operation: z.literal(HUBSPOT_PULL_OPERATION),
    requestedBy: z.string().trim().min(1).max(200),
    credentialVersion: z.string().regex(/^[a-f0-9]{64}$/),
    maxPages: z.number().int().min(2).max(100),
    mode: z.literal("preview-only"),
  })
  .strict();
export const hubspotPullStateSchema = z
  .object({
    object: hubspotObjectSchema,
    after: z.string().min(1).max(500).nullable(),
    pages: z
      .array(
        z
          .object({
            object: hubspotObjectSchema,
            after: z.string().nullable(),
            observedAt: z.string().datetime(),
            response: hubspotPageSchema,
            responseHash: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      )
      .max(100),
    lease: z
      .object({ token: z.string().uuid(), expiresAt: z.string().datetime() })
      .strict()
      .nullable(),
    completedAt: z.string().datetime().optional(),
    applied: z
      .object({
        at: z.string().datetime(),
        by: z.string().min(1).max(200),
        previewHash: z.string().regex(/^[a-f0-9]{64}$/),
        added: z.number().int().nonnegative(),
        existing: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type HubspotPage = z.infer<typeof hubspotPageSchema>;
export type HubspotObject = z.infer<typeof hubspotObjectSchema>;
export type HubspotPullState = z.infer<typeof hubspotPullStateSchema>;
