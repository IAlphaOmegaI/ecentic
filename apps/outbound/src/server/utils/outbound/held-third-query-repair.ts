import "server-only";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { resultify } from "@zenncore/utils";
import { z } from "zod";
import type { schema } from "@/server/database";
import { ConflictError } from "@/server/utils/error";
import {
  QUERY_PREPARATION_CAPTURE_REASON,
  QUERY_PREPARATION_GRAMMAR_VERSION,
  QUERY_PREPARATION_REPAIR_CASES,
  QUERY_PREPARATION_REPAIR_CONTROL,
  QUERY_PREPARATION_REPAIR_REASON,
  queryPreparationRepairInputSchema,
  queryPreparationRepairOutputSchema,
} from "./held-third-query-repair-contract";
import {
  HELD_THIRD_REVIEW_INSTRUCTION_HASH,
  heldThirdReviewInputSchema,
  heldThirdReviewStateSchema,
} from "./held-third-review-contract";
import {
  PRODUCT_GROUP_COLOR_IDENTITY_VERSION,
  replayHeldProductCapture,
  reusableProductCapture,
} from "./live-shopping-browser";
import { SHOPPER_QUERY_ROUND3_GRAMMAR_VERSION } from "./shopper-query";

type Job = typeof schema.outboundIntegrationJob.$inferSelect;
export const queryRepairHash = (text: string) =>
  createHash("sha256").update(text).digest("hex");
const originalRowSchema = z
  .object({
    id: z.string().uuid(),
    provider: z.literal("automation"),
    prospect_id: z.string().uuid(),
    request_id: z.string().nullable(),
    status: z.literal("complete"),
    error: z.null(),
    input: heldThirdReviewInputSchema,
    output: heldThirdReviewStateSchema,
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
  })
  .strict();
export const projectQueryPreparationRepair = ({
  originalRowCanonical,
  originalOutputCanonical,
}: {
  originalRowCanonical: string;
  originalOutputCanonical: string;
}) => {
  const original = originalRowSchema.parse(JSON.parse(originalRowCanonical));
  const state = heldThirdReviewStateSchema.parse(
    JSON.parse(originalOutputCanonical),
  );
  const input = original.input;
  const authorized = QUERY_PREPARATION_REPAIR_CASES.find(
    (row) => row.sourceJobId === original.id,
  );
  if (
    !authorized ||
    input.controlId !== QUERY_PREPARATION_REPAIR_CONTROL ||
    input.instructionHash !== HELD_THIRD_REVIEW_INSTRUCTION_HASH ||
    original.prospect_id !== input.prospectId ||
    input.merchant.name !== authorized.company ||
    input.action !== authorized.action ||
    (input.exactQuestion && input.exactQuestion !== authorized.exactQuestion) ||
    input.category !== authorized.category ||
    !isDeepStrictEqual(original.output, state) ||
    state.stage !== "complete" ||
    state.lease ||
    state.heldReason !==
      (authorized.mode === "good-american-capture"
        ? QUERY_PREPARATION_CAPTURE_REASON
        : QUERY_PREPARATION_REPAIR_REASON) ||
    (authorized.attempts === null
      ? state.queryGeneration !== undefined
      : state.queryGeneration?.attempts !== authorized.attempts) ||
    state.shoppingQueryIntent !== authorized.intent ||
    state.shoppingQueryCount !== state.purchaseBaseline ||
    state.query ||
    state.queryReview ||
    state.queryReservedAt ||
    state.round3ReservedAt ||
    state.shoppingJob ||
    state.answer ||
    state.browser ||
    state.shoppingReceipt ||
    state.preview ||
    state.previewContext ||
    state.draftBeforeJudge ||
    state.draftReservedAt ||
    state.writerCandidates?.length ||
    state.suppliedParts ||
    state.mechanicalEdits ||
    state.rejudgeAudit ||
    state.rejudgeReservedAt ||
    state.judgeAudit ||
    state.failureReceipt ||
    state.queryPreparationRepair ||
    !state.productCapture ||
    QUERY_PREPARATION_GRAMMAR_VERSION !== SHOPPER_QUERY_ROUND3_GRAMMAR_VERSION
  )
    throw new ConflictError(
      "Only the explicitly scoped unspent preparation failure is eligible.",
    );
  const repairedProductCapture =
    authorized.mode === "good-american-capture"
      ? replayHeldProductCapture({
          browser: state.productCapture,
          product: input.product,
        })
      : state.productCapture.status === "captured" &&
          reusableProductCapture({
            browser: state.productCapture,
            product: input.product,
          })
        ? state.productCapture
        : null;
  if (
    !repairedProductCapture ||
    (authorized.mode === "good-american-capture" &&
      (state.productCapture.status !== "held" ||
        PRODUCT_GROUP_COLOR_IDENTITY_VERSION !== "product-group-color-v1"))
  )
    throw new ConflictError(
      "The original product capture cannot be replayed intact.",
    );
  return {
    original,
    input,
    state,
    authorized,
    repairedProductCapture,
    sourceRowHash: queryRepairHash(originalRowCanonical),
    sourceOutputHash: queryRepairHash(originalOutputCanonical),
  };
};
export const requeuedQueryPreparationState = (
  projected: ReturnType<typeof projectQueryPreparationRepair>,
  reference: NonNullable<
    z.infer<typeof heldThirdReviewStateSchema>["queryPreparationRepair"]
  >,
) => {
  const { heldReason: _heldReason, ...preserved } = projected.state;
  return heldThirdReviewStateSchema.parse({
    ...preserved,
    stage: "generateQuery",
    lease: null,
    availableAt: reference.repairedAt,
    productCapture: projected.repairedProductCapture,
    queryPreparationRepair: reference,
  });
};
export const validateQueryPreparationRepair = ({
  job,
  audit,
}: {
  job: Job;
  audit: Job;
}) => {
  const input = queryPreparationRepairInputSchema.parse(audit.input);
  const output = queryPreparationRepairOutputSchema.parse(audit.output);
  const projected = projectQueryPreparationRepair(output);
  const current = heldThirdReviewStateSchema.parse(job.output);
  const reference = current.queryPreparationRepair;
  if (
    !reference ||
    audit.provider !== "automation" ||
    audit.status !== "complete" ||
    audit.error ||
    audit.prospectId !== input.prospectId ||
    audit.requestId !== `held-round3-query-preparation-repair:${job.id}` ||
    input.sourceJobId !== job.id ||
    input.sourceJobId !== projected.original.id ||
    input.controlId !== projected.input.controlId ||
    input.prospectId !== projected.input.prospectId ||
    input.instructionHash !== projected.input.instructionHash ||
    input.requestedBy !== projected.input.requestedBy ||
    input.sourceRowHash !== projected.sourceRowHash ||
    input.sourceOutputHash !== projected.sourceOutputHash ||
    reference.auditJobId !== audit.id ||
    reference.sourceRowHash !== input.sourceRowHash ||
    reference.sourceOutputHash !== input.sourceOutputHash ||
    reference.fixVersion !== input.fixVersion ||
    reference.mode !== projected.authorized.mode ||
    reference.mode !== input.mode ||
    reference.exactQuestion !== projected.authorized.exactQuestion ||
    reference.exactQuestion !== input.exactQuestion ||
    reference.grammarVersion !== input.grammarVersion ||
    reference.captureVersion !== input.captureVersion ||
    input.captureVersion !==
      (projected.authorized.mode === "good-american-capture"
        ? PRODUCT_GROUP_COLOR_IDENTITY_VERSION
        : null) ||
    reference.repairedProductCaptureHash !== input.repairedProductCaptureHash ||
    input.repairedProductCaptureHash !==
      queryRepairHash(JSON.stringify(projected.repairedProductCapture)) ||
    !isDeepStrictEqual(
      current.productCapture,
      projected.repairedProductCapture,
    ) ||
    reference.repairedAt !== input.repairedAt ||
    !isDeepStrictEqual(job.input, projected.original.input) ||
    job.prospectId !== projected.original.prospect_id ||
    job.requestId !== projected.original.request_id ||
    job.provider !== projected.original.provider ||
    job.createdAt.getTime() !== Date.parse(projected.original.created_at) ||
    Date.parse(input.repairedAt) < Date.parse(projected.original.updated_at) ||
    Date.parse(input.repairedAt) > Date.now() + 60000 ||
    audit.createdAt.getTime() !== Date.parse(input.repairedAt) ||
    audit.updatedAt.getTime() !== audit.createdAt.getTime()
  )
    throw new ConflictError(
      "The archived preparation failure or repaired child binding changed.",
    );
  const initial = requeuedQueryPreparationState(projected, reference);
  if (
    queryRepairHash(JSON.stringify(initial)) !== output.initialRequeuedStateHash
  )
    throw new ConflictError(
      "The original requeued preparation checkpoint changed.",
    );
  const mutable = new Set([
    "stage",
    "lease",
    "availableAt",
    "heldReason",
    "queryGeneration",
    "shoppingQueryCount",
    "polls",
    "productCapture",
  ]);
  if (current.polls < projected.state.polls)
    throw new ConflictError(
      "The repaired query polling history moved backwards.",
    );
  for (const [key, value] of Object.entries(projected.state))
    if (
      !mutable.has(key) &&
      !isDeepStrictEqual(current[key as keyof typeof current], value)
    )
      throw new ConflictError(
        "The repaired child changed original capture or purchase history.",
      );
  return { input, output, projected, reference };
};
export const queryPreparationRepairProblem = (
  input: Parameters<typeof validateQueryPreparationRepair>[0],
) => {
  const checked = resultify(() => validateQueryPreparationRepair(input));
  return checked.success ? null : checked.error.message;
};
