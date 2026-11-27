import "server-only";

import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { eq, getTableColumns, sql } from "drizzle-orm";
import { z } from "zod";
import { prospectSchema, settingsForSender } from "@/lib/outbound";
import {
  canonicalSequenceInput,
  writerPartsSchema,
} from "@/lib/outbound-composition";
import {
  copyVerdictProblem,
  deterministicCopyIssues,
} from "@/lib/outbound-copy-quality";
import { REVIEWED_COPY_RULES_VERSION } from "@/lib/outbound-round3-copy";
import { shoppingResearchSchema } from "@/lib/outbound-shopping-research";
import { db, schema, type TransactionScope } from "@/server/database";
import { ValidationError } from "@/server/utils/error";
import {
  HELD_REVIEW_REASON,
  heldReviewPreviewSchema,
} from "./held-review-contract";
import { fixedResultInputSchema } from "./held-third-fixed-result-contract";
import {
  heldThirdReviewInputSchema,
  heldThirdReviewStateSchema,
} from "./held-third-review-contract";
import {
  aiCaptureSchema,
  browserResearchSchema,
} from "./live-shopping-contract";
import * as Assessment from "./shopping-assessment";
import { researchCaptureProof } from "./shopping-capture-proof";
import { compositionProspectHash, writingPolicyHash } from "./shopping-policy";
import { projectProductListingProof } from "./shopping-product-listings";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const reviewedCopyBindingSchema = z
  .object({
    previewJobId: z.string().uuid(),
    previewJobHash: hash,
    authorizationReference: hash,
  })
  .strict();
export type ReviewedCopyBinding = z.infer<typeof reviewedCopyBindingSchema>;
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const textHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const plain = (
  messages: {
    step: number;
    afterDays: number;
    subject: string;
    body: string;
  }[],
) =>
  messages.map(({ step, afterDays, subject, body }) => ({
    step,
    afterDays,
    subject,
    body,
  }));
const required: (condition: unknown, reason: string) => asserts condition = (
  condition,
  reason,
) => {
  if (!condition) throw new ValidationError(reason);
};
const inputSchema = z.object({
  operation: z.literal("reviewedElevenCopyPreviewV4"),
  sourceJobId: z.string().uuid(),
  prospectId: z.string().uuid(),
  authorizationReference: hash,
  proposedPolicyRevision: z.number().int(),
  proposedPolicyHash: hash,
  originalPartsHash: hash,
  originalMessagesHash: hash,
  originalVerdictHash: hash,
  originalReceiptHash: hash,
  receiptHash: hash,
  contextHash: hash,
  partsHash: hash,
  messagesHash: hash,
  boundary: z.object({
    prospects: z.array(z.object({ id: z.string().uuid(), hash })),
    jobs: z.array(z.object({ id: z.string().uuid(), hash })),
  }),
});
type Prospect = typeof schema.outboundProspect.$inferSelect;
type Policy = {
  revision: number;
  settings: z.infer<typeof heldReviewPreviewSchema>["proposedPolicy"];
};

/** Each row and its canonical PostgreSQL hash come from the same statement. */
const jobAt = async (transaction: TransactionScope | undefined, id: string) => {
  const [entry] = await (transaction ?? db)
    .select({
      ...getTableColumns(schema.outboundIntegrationJob),
      rowHash: sql<string>`encode(sha256(convert_to(to_jsonb(${schema.outboundIntegrationJob})::text,'UTF8')),'hex')`,
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id));
  required(entry, "The reviewed preview's source job is missing.");
  const { rowHash, ...job } = entry;
  return { job, rowHash };
};

/** Reused at normal draft loading/approval; immutable source rows cannot be substituted later. */
export const assertReviewedCopySourcesWithin = async (
  transaction: TransactionScope | undefined,
  bindingInput: ReviewedCopyBinding,
) => {
  const binding = reviewedCopyBindingSchema.parse(bindingInput);
  const review = await jobAt(transaction, binding.previewJobId);
  const input = inputSchema.parse(review.job.input);
  required(
    review.rowHash === binding.previewJobHash &&
      input.authorizationReference === binding.authorizationReference &&
      review.job.status === "complete",
    "The adopted review or authorization changed.",
  );
  const source = await jobAt(transaction, input.sourceJobId);
  required(
    input.boundary.jobs.find((row) => row.id === source.job.id)?.hash ===
      source.rowHash,
    "The original reviewed source changed.",
  );
  if (source.job.input["operation"] === "heldDiscoveryRound3FixedResult") {
    const capture = await jobAt(
      transaction,
      fixedResultInputSchema.parse(source.job.input).sourceBinding.sourceJobId,
    );
    required(
      input.boundary.jobs.find((row) => row.id === capture.job.id)?.hash ===
        capture.rowHash,
      "The original reviewed capture changed.",
    );
  }
};

/** Server-only adoption boundary. The operator owns the exact approved cohort and human receipt. */
export const loadReviewedCopyPreviewWithin = async (
  transaction: TransactionScope,
  bindingInput: ReviewedCopyBinding,
  prospect: Prospect,
  policy: Policy,
  phase: "before-research" | "after-research" = "before-research",
) => {
  const binding = reviewedCopyBindingSchema.parse(bindingInput);
  const { job: review, rowHash } = await jobAt(
    transaction,
    binding.previewJobId,
  );
  const input = inputSchema.parse(review.input);
  const output = review.output ?? {};
  const preview = heldReviewPreviewSchema.parse(output["preview"]);
  const original = heldReviewPreviewSchema.parse(output["originalPreview"]);
  const receipt = shoppingResearchSchema.parse(output["shoppingReceipt"]);
  const parts = writerPartsSchema.parse(output["parts"]);
  const writing = preview.messages[0]?.writing;
  required(
    rowHash === binding.previewJobHash &&
      review.provider === "automation" &&
      review.status === "complete" &&
      !review.error &&
      review.prospectId === prospect.id &&
      input.prospectId === prospect.id &&
      input.authorizationReference === binding.authorizationReference &&
      output["stage"] === "complete" &&
      output["lease"] === null &&
      !output["heldReason"] &&
      !output["unappliedPreview"] &&
      output["writerCalls"] === 0 &&
      output["searchCalls"] === 0 &&
      output["judgeReservations"] === 1 &&
      writing?.version === "discovery-email-v2" &&
      writing.copyRulesVersion === REVIEWED_COPY_RULES_VERSION &&
      writing.quality !== null &&
      !copyVerdictProblem(writing.quality),
    "Only an unchanged completed, passing reviewed preview can be adopted.",
  );
  required(
    policy.revision === input.proposedPolicyRevision &&
      preview.playbookRevision === policy.revision &&
      digest(preview.proposedPolicy) === input.proposedPolicyHash &&
      isDeepStrictEqual(
        {
          ...policy.settings,
          automaticApolloEnabled: preview.proposedPolicy.automaticApolloEnabled,
          automaticClayEnabled: preview.proposedPolicy.automaticClayEnabled,
        },
        preview.proposedPolicy,
      ) &&
      !policy.settings.sendingEnabled &&
      prospect.sentStep === 0 &&
      prospect.status === "held" &&
      prospect.holdReason === HELD_REVIEW_REASON &&
      !prospect.approvedAt &&
      !prospect.approvedBy &&
      !prospect.approvalHash &&
      !prospect.nextSendAt,
    "The published policy or original held prospect changed before adoption.",
  );
  const {
    parts: _parts,
    messages: _messages,
    generation: _generation,
    issues: _issues,
    ...context
  } = preview;
  const canonical = canonicalSequenceInput(preview.messages, writing);
  required(
    canonical.status === "ready",
    "The reviewed sequence has no canonical text.",
  );
  required(
    digest(context) === input.contextHash &&
      digest(receipt) === input.receiptHash &&
      preview.receiptHash === input.receiptHash &&
      digest(parts) === input.partsHash &&
      isDeepStrictEqual(parts, preview.parts) &&
      isDeepStrictEqual(parts, writing.parts) &&
      digest(plain(preview.messages)) === input.messagesHash &&
      isDeepStrictEqual(
        plain(preview.messages),
        plain(
          z
            .array(
              z.object({
                step: z.number(),
                afterDays: z.number(),
                subject: z.string(),
                body: z.string(),
              }),
            )
            .parse(output["messages"]),
        ),
      ) &&
      writing.contentHash === textHash(canonical.canonicalText) &&
      writing.receiptHash === input.receiptHash &&
      isDeepStrictEqual(
        writing.openingRuleException,
        preview.openingRuleException,
      ) &&
      (!preview.openingRuleException ||
        preview.openingRuleException.approvalReference ===
          binding.authorizationReference) &&
      Date.parse(writing.quality.evaluatedAt) >=
        Date.parse(z.string().datetime().parse(output["reservedAt"])) &&
      Date.parse(writing.quality.evaluatedAt) <= review.updatedAt.getTime() &&
      Date.parse(writing.quality.evaluatedAt) <= Date.now(),
    "The reviewed text, verdict, receipt or opening authorization changed.",
  );
  const source = await jobAt(transaction, input.sourceJobId);
  required(
    input.boundary.jobs.find((row) => row.id === source.job.id)?.hash ===
      source.rowHash &&
      source.job.prospectId === prospect.id &&
      source.job.provider === "automation" &&
      source.job.status === "complete" &&
      isDeepStrictEqual(
        heldReviewPreviewSchema.parse(source.job.output?.["preview"]),
        original,
      ) &&
      digest(original.parts) === input.originalPartsHash &&
      digest(plain(original.messages)) === input.originalMessagesHash &&
      digest(original.messages[0]?.writing?.quality) ===
        input.originalVerdictHash &&
      original.receiptHash === input.originalReceiptHash &&
      !copyVerdictProblem(original.messages[0]?.writing?.quality),
    "The original approved preview no longer matches its recorded source.",
  );
  const originalSource =
    source.job.input["operation"] === "heldDiscoveryRound3FixedResult"
      ? await jobAt(
          transaction,
          fixedResultInputSchema.parse(source.job.input).sourceBinding
            .sourceJobId,
        )
      : source;
  required(
    input.boundary.jobs.find((row) => row.id === originalSource.job.id)
      ?.hash === originalSource.rowHash,
    "The original shopping source changed after the reviewed copy check.",
  );
  const originalInput = heldThirdReviewInputSchema.parse(
    originalSource.job.input,
  );
  const originalState = heldThirdReviewStateSchema.parse(
    originalSource.job.output,
  );
  required(
    originalInput.prospectId === prospect.id &&
      originalState.shoppingReceipt &&
      digest(originalState.shoppingReceipt) === input.originalReceiptHash,
    "The reviewed preview's original receipt is missing or changed.",
  );
  const answer = aiCaptureSchema.parse(originalState.answer);
  const browser = browserResearchSchema.parse(originalState.browser);
  required(
    browser.status === "captured",
    "The original browser evidence is incomplete.",
  );
  const proof = researchCaptureProof(
    originalSource.job.id,
    {
      answer,
      browser,
      ...(originalState.queryReview
        ? { queryReview: originalState.queryReview }
        : {}),
    },
    receipt,
    originalState,
  );
  const projected = projectProductListingProof(
    proof,
    originalState.shoppingReceipt,
  );
  required(
    projected.status === "eligible" &&
      isDeepStrictEqual(projected.receipt, receipt),
    "The reviewed receipt no longer matches its complete raw product-listing evidence.",
  );
  const problem = Assessment.validateAutomaticResearch(
    proof,
    receipt,
    policy.settings.verificationDays,
    policy.settings,
  );
  required(!problem, problem ?? "Invalid reviewed capture proof.");
  const effective = settingsForSender(
    policy.settings,
    preview.prospect.assignedSenderEmail ?? policy.settings.fromEmail,
  );
  const projectedProspect = prospectSchema.parse({
    ...prospect.details,
    id: prospect.id,
    product: receipt.product.name,
    productUrl: receipt.product.url,
    productCategory: preview.prospect.productCategory,
    assignedSenderEmail: effective.fromEmail,
  });
  required(
    preview.prospect.id === prospect.id &&
      preview.prospect.productCategory === answer.job.query.category &&
      compositionProspectHash(projectedProspect) === preview.prospectHash &&
      writingPolicyHash(effective, {
        globalVoiceNotes: policy.settings.voiceNotes,
        copyRulesVersion: writing.copyRulesVersion,
        openingRuleException: writing.openingRuleException,
      }) === preview.writingPolicyHash &&
      preview.writingPolicyHash === writing.writingPolicyHash &&
      preview.globalVoiceNotes === policy.settings.voiceNotes,
    "The reviewed prospect identity, product or fixed sender context changed.",
  );
  const deterministic = deterministicCopyIssues({
    prospect: projectedProspect,
    receipt,
    playbook: effective,
    parts,
    messages: preview.messages,
    copyRulesVersion: writing.copyRulesVersion,
    openingRuleException: writing.openingRuleException,
    peers: preview.peers,
  });
  required(
    deterministic.length === 0,
    `The reviewed copy no longer passes: ${deterministic.join("; ")}`,
  );
  const provenance = {
    ...binding,
    sourceJobId: source.job.id,
    sourceJobHash: source.rowHash,
    captureJobId: originalSource.job.id,
    captureJobHash: originalSource.rowHash,
    receiptHash: input.receiptHash,
    contentHash: writing.contentHash,
    verdictHash: digest(writing.quality),
    proposedPolicyHash: input.proposedPolicyHash,
  };
  if (phase === "before-research") {
    const [row] = await transaction.execute<{ hash: string }>(
      sql`select encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex') as hash from outbound_prospect p where id=${prospect.id}`,
    );
    required(
      row?.hash ===
        input.boundary.prospects.find((row) => row.id === prospect.id)?.hash,
      "The original held prospect changed after the reviewed check.",
    );
  } else {
    const applied = await jobAt(
      transaction,
      z.string().uuid().parse(prospect.details.shoppingResearchId),
    );
    required(
      applied.job.input["operation"] === "leadResearch" &&
        applied.job.input["requestId"] === review.id &&
        applied.job.status === "complete" &&
        applied.job.prospectId === prospect.id &&
        applied.job.output?.["appliedProspectRevision"] === prospect.revision &&
        isDeepStrictEqual(
          applied.job.output?.["reviewedPreview"],
          provenance,
        ) &&
        isDeepStrictEqual(
          shoppingResearchSchema.parse(applied.job.output?.["receipt"]),
          receipt,
        ),
      "The applied research is not the unchanged reviewed-preview adoption.",
    );
  }
  return { preview, receipt, proof, provenance, projectedProspect };
};
