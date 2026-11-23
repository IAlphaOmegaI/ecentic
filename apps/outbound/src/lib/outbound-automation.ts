import { z } from "zod";

export const automationStageSchema = z.enum([
  "companyFacts",
  "qualify",
  "researchQuery",
  "startShoppingQuery",
  "pollShoppingQuery",
  "browseShopping",
  "assessShopping",
  "applyShopping",
  "findContacts",
  "selectContact",
  "promote",
  "enrich",
  "applyEmail",
  "verify",
  "pollVerification",
  "applyVerification",
  "mx",
  "applyMx",
  "draft",
  "applyDraft",
  "approve",
  "complete",
]);
export type AutomationStage = z.infer<typeof automationStageSchema>;
export const contactAttemptsSchema = z
  .array(
    z.object({
      personId: z.string().min(1),
      status: z.enum(["selected", "enriched", "unavailable"]),
      selectedAt: z.string().datetime(),
      completedAt: z.string().datetime().nullable(),
      reason: z.string().nullable(),
      enrichment: z.record(z.string(), z.unknown()).nullable(),
    }),
  )
  .max(3)
  .refine(
    (attempts) =>
      new Set(attempts.map((attempt) => attempt.personId)).size ===
      attempts.length,
    "A person can be enriched only once per company run.",
  );
export type ContactAttempt = z.infer<typeof contactAttemptsSchema>[number];
export const automationStateSchema = z
  .object({
    stage: automationStageSchema,
    availableAt: z.string().datetime(),
    contactAttempts: contactAttemptsSchema.optional(),
    lease: z
      .object({ token: z.string().uuid(), expiresAt: z.string().datetime() })
      .nullable(),
  })
  .passthrough();
export type AutomationState = z.infer<typeof automationStateSchema>;
export const automationInputSchema = z.object({
  operation: z.literal("campaignAutomation"),
  campaignId: z.string().uuid(),
  companyId: z.string().uuid(),
  companyName: z.string(),
  companyDomain: z.string(),
  campaignRevision: z.number().int().positive(),
  playbookRevision: z.number().int().nonnegative(),
  actor: z.string(),
});
export type AutomationInput = z.infer<typeof automationInputSchema>;
export type AutomationJobSummary = {
  id: string;
  campaignId: string;
  companyId: string;
  companyName: string;
  stage: AutomationStage;
  status: "queued" | "running" | "held" | "uncertain" | "complete";
  reason: string | null;
  prospectId: string | null;
  updatedAt: string;
};
export type AutomationStatus = {
  enabled: boolean;
  research: {
    required: boolean;
    ready: boolean;
    missing: string[];
    blocked?: string[];
  };
  activeCampaigns: number;
  counts: Record<AutomationJobSummary["status"], number>;
  jobs: AutomationJobSummary[];
  delivery: {
    sendingEnabled: boolean;
    ready: boolean;
    blockers: string[];
    inboxes: {
      email: string;
      target: number;
      dailyCap: number;
      rampHeld: boolean;
    }[];
  };
};
export type AutomationTick = {
  enabled: boolean;
  blockers?: string[];
  processed: number;
  results: AutomationJobSummary[];
};
