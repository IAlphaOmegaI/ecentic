import { z } from "zod";
import {
  type Playbook,
  type ProspectInput,
  recipientMailHostAllowed,
} from "./outbound";
import { validateProductInsight } from "./outbound-product-insight";
import { savedContactVerificationReady } from "./outbound-saved-contact";

export const refreshProductSchema = z.object({
  name: z.string().min(1).max(300),
  brand: z.string().min(1).max(300),
  url: z.url(),
  description: z.string().max(5000),
  price: z.number().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
export const sequenceRefreshInputSchema = z.object({
  operation: z.literal("sequenceRefresh"),
  prospectId: z.string().uuid(),
  campaignId: z.string().uuid(),
  campaignRevision: z.number().int().positive(),
  prospectRevision: z.number().int().nonnegative(),
  playbookRevision: z.number().int().nonnegative(),
  approvalHash: z.string().min(1),
  recipient: z.email(),
  sentStep: z.number().int().min(1).max(2),
  sourceEvidenceId: z.string().uuid(),
  actor: z.string().min(1),
  needEmail: z.boolean(),
  product: refreshProductSchema,
});
export const sequenceRefreshStateSchema = z
  .object({
    stage: z.enum([
      "product",
      "verify",
      "pollVerification",
      "mx",
      "apply",
      "complete",
    ]),
    availableAt: z.string().datetime(),
    lease: z
      .object({ token: z.string().uuid(), expiresAt: z.string().datetime() })
      .nullable(),
    product: z
      .object({
        status: z.enum(["same", "changed", "unavailable"]),
        reason: z.string().nullable(),
        observed: refreshProductSchema.nullable(),
        receipt: z
          .object({
            url: z.url(),
            kind: z.literal("product"),
            checkedAt: z.string().datetime(),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
            excerpt: z.string().max(18000),
            mode: z.literal("raw-html-positive-observation"),
          })
          .nullable(),
      })
      .nullable(),
    verification: z
      .object({
        requestId: z.string().min(1),
        requestedAt: z.string().datetime(),
        records: z.array(
          z.object({
            record_id: z.string(),
            input: z.object({ email: z.email() }),
          }),
        ),
      })
      .nullable(),
    verificationResult: z
      .object({
        requestId: z.string().min(1),
        status: z.enum(["pending", "complete"]),
        retryAfterSeconds: z.number(),
        results: z.array(
          z.object({
            email: z.email(),
            status: z.enum(["verified", "unknown"]),
            verifiedAt: z.string().nullable(),
            recordId: z.string(),
            verdict: z.string(),
            source: z.literal("apollo"),
            timestampProof: z
              .object({
                kind: z.literal("request-completed"),
                requestId: z.string(),
                action: z.literal("email_verifier"),
                initiatedAt: z.string().datetime(),
                completedAt: z.string().datetime(),
              })
              .optional(),
          }),
        ),
      })
      .nullable(),
    verificationPolls: z.number().int().nonnegative(),
    mx: z
      .object({
        provider: z.enum(["google", "microsoft", "other", "unknown"]),
        checkedAt: z.string(),
      })
      .nullable(),
  })
  .passthrough();
export type SequenceRefreshInput = z.infer<typeof sequenceRefreshInputSchema>;
export type SequenceRefreshState = z.infer<typeof sequenceRefreshStateSchema>;
export type RefreshProduct = z.infer<typeof refreshProductSchema>;
export const refreshFresh = (
  value: string | null | undefined,
  days: number,
  now = Date.now(),
) => {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return (
    Number.isFinite(timestamp) &&
    timestamp <= now &&
    now - timestamp < days * 86400000
  );
};
export const sameRefreshProduct = (
  left: RefreshProduct,
  right: RefreshProduct,
) =>
  (["name", "brand", "url", "description", "price", "currency"] as const).every(
    (key) => left[key] === right[key],
  );

/** The original signed positive observation remains unchanged; only the new receipt can refresh its age. */
export const originalRefreshProduct = (
  prospect: ProspectInput,
): RefreshProduct | null => {
  const prefix =
    "Automatic positive product observation; raw HTML only, no absence or rendered-page claim. Product: ";
  if (
    prospect.gap !== "product-published-data" ||
    !prospect.evidence.startsWith(prefix)
  )
    return null;
  const end = prospect.evidence.lastIndexOf(". URL: ");
  if (end <= prefix.length) return null;
  try {
    const parsed = refreshProductSchema.safeParse(
      JSON.parse(prospect.evidence.slice(prefix.length, end)),
    );
    return parsed.success &&
      parsed.data.url === prospect.productUrl &&
      parsed.data.name === prospect.product
      ? parsed.data
      : null;
  } catch {
    return null;
  }
};

/** Apply only provider-correlated fresh receipts for the exact original recipient and product. */
export const validateSequenceRefreshReceipts = (
  input: SequenceRefreshInput,
  state: SequenceRefreshState,
  details: ProspectInput,
  settings: Playbook,
  now = Date.now(),
): { patch: Partial<ProspectInput> } | { reason: string } => {
  const baseline = originalRefreshProduct(details);
  if (
    details.email.toLowerCase() !== input.recipient.toLowerCase() ||
    details.automationEvidenceId !== input.sourceEvidenceId ||
    !baseline ||
    !sameRefreshProduct(baseline, input.product)
  )
    return { reason: "sequence-changed" };
  const product = state.product;
  if (
    product?.status !== "same" ||
    !product.observed ||
    !sameRefreshProduct(input.product, product.observed) ||
    !product.receipt ||
    product.receipt.url !== input.product.url ||
    !refreshFresh(product.receipt.checkedAt, settings.verificationDays, now)
  )
    return { reason: "sequence-product-changed" };
  if (
    details.productInsight &&
    validateProductInsight(details.productInsight, product.observed, [
      product.receipt,
    ])
  )
    return { reason: "sequence-product-changed" };
  const patch: Partial<ProspectInput> = {
    evidenceCheckedAt: product.receipt.checkedAt,
  };
  if (input.needEmail) {
    const request = state.verification;
    const result = state.verificationResult;
    if (
      !request ||
      !result ||
      result.status !== "complete" ||
      result.requestId !== request.requestId ||
      !refreshFresh(request.requestedAt, 1, now)
    )
      return { reason: "sequence-verification-held" };
    const matching = result.results.filter(
      (record) =>
        record.email.toLowerCase() === input.recipient.toLowerCase() &&
        request.records.some(
          (source) =>
            source.record_id === record.recordId &&
            source.input.email.toLowerCase() === record.email.toLowerCase(),
        ),
    );
    const verified = matching.length === 1 ? matching[0] : null;
    if (
      verified?.status !== "verified" ||
      !refreshFresh(verified.verifiedAt, settings.emailVerificationDays, now)
    )
      return { reason: "sequence-verification-held" };
    const proof = verified.timestampProof;
    if (
      proof &&
      (proof.requestId !== request.requestId ||
        proof.completedAt !== verified.verifiedAt ||
        Date.parse(proof.initiatedAt) > Date.parse(proof.completedAt))
    )
      return { reason: "sequence-verification-held" };
    patch.emailVerifiedAt = verified.verifiedAt ?? "";
    patch.emailSource = `Apollo verification ${request.requestId}; record ${verified.recordId}`;
    patch.emailStatus = "verified";
  } else if (
    details.emailStatus !== "verified" ||
    (!refreshFresh(
      details.emailVerifiedAt,
      settings.emailVerificationDays,
      now,
    ) &&
      !savedContactVerificationReady(details, settings))
  )
    return { reason: "sequence-verification-held" };
  if (
    !state.mx ||
    !recipientMailHostAllowed(state.mx.provider, settings) ||
    !refreshFresh(state.mx.checkedAt, 1, now)
  )
    return { reason: "sequence-mx-held" };
  patch.mxProvider = state.mx.provider;
  patch.mxCheckedAt = state.mx.checkedAt;
  return { patch };
};
