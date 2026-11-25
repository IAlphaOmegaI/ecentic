import { z } from "zod";
import type { ProspectInput } from "./outbound";

export const draftReviewInputSchema = z.object({
  operation: z.literal("draftReview"),
  prospectId: z.string().uuid(),
  prospectRevision: z.number().int().nonnegative(),
  campaignId: z.string().uuid(),
  campaignRevision: z.number().int().positive(),
  playbookRevision: z.number().int().nonnegative(),
  regenerate: z.boolean(),
  readinessKey: z.string().min(1),
  resumeId: z.string(),
});
export const draftReviewOutputSchema = z.object({
  stage: z.enum(["draft", "apply"]),
  lease: z.object({
    token: z.string().uuid(),
    expiresAt: z.string().datetime(),
  }),
  messages: z
    .array(
      z.object({
        step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        afterDays: z.number().int().nonnegative(),
        subject: z.string(),
        body: z.string(),
      }),
    )
    .length(3)
    .optional(),
});

/** A deliberate hold and a sequence with any accepted step never enter routine review. */
export const canReviewDraftAutomatically = (prospect: {
  status: string;
  sentStep: number;
  holdReason: string;
  campaignId: string | null;
}) =>
  prospect.status === "draft" &&
  prospect.sentStep === 0 &&
  Boolean(prospect.campaignId) &&
  ["", "playbookChanged"].includes(prospect.holdReason);

/** Receipt-only checks do not bump prospect revisions; retry only when their actual inputs change. */
export const draftReviewReadinessKey = (
  details: ProspectInput,
  senderConfirmed: boolean,
  allowStaleEvidence = false,
  trustSavedContactVerification = false,
  allowProductObservations = false,
  allowUsMarketWindow = false,
  allowMicrosoftRecipients = false,
) =>
  [
    details.emailVerifiedAt,
    details.mxCheckedAt,
    details.evidenceCheckedAt,
    details.roleCheckedAt,
    details.personalCheckedAt,
    String(senderConfirmed),
    ...(allowStaleEvidence ? ["allow-stale-evidence"] : []),
    ...(trustSavedContactVerification
      ? ["trust-saved-contact-verification"]
      : []),
    ...(allowProductObservations ? ["allow-product-observations"] : []),
    ...(allowUsMarketWindow ? ["allow-us-market-window"] : []),
    ...(allowMicrosoftRecipients ? ["allow-microsoft-recipients"] : []),
  ].join("|");
