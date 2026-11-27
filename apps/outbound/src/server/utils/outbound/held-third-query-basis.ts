import "server-only";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { schema } from "@/server/database";
import { ConflictError } from "@/server/utils/error";
import {
  QUERY_BASIS_REVIEW_REASON,
  QUERY_BASIS_REVIEW_SCOPE,
  QUERY_BASIS_REVIEW_VERSION,
  queryBasisReviewInputSchema,
  queryBasisReviewReferenceSchema,
  queryBasisReviewStateSchema,
} from "./held-third-query-basis-contract";
import {
  queryRepairHash,
  validateQueryPreparationRepair,
} from "./held-third-query-repair";
import {
  HELD_THIRD_REVIEW_INSTRUCTION_HASH,
  heldThirdReviewInputSchema,
  heldThirdReviewStateSchema,
} from "./held-third-review-contract";
import {
  preparedQuerySchema,
  SHOPPER_QUERY_ROUND3_VERSION,
} from "./live-shopping-contract";
import {
  shopperQueryExcerpts,
  validateShopperQuery,
  validateShopperQueryReviewBinding,
} from "./shopper-query";

type Job = typeof schema.outboundIntegrationJob.$inferSelect;
export const queryBasisHash = (value: unknown) =>
  queryRepairHash(JSON.stringify(value));
const storedJobSchema = z
  .object({
    id: z.string().uuid(),
    provider: z.literal("automation"),
    prospect_id: z.string().uuid(),
    request_id: z.string().nullable(),
    status: z.enum(["pending", "starting", "complete", "failed", "uncertain"]),
    input: z.record(z.string(), z.unknown()),
    output: z.record(z.string(), z.unknown()),
    error: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();
const utcDate = (value: string) =>
  new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
export const queryBasisStoredJob = (canonical: string): Job => {
  const row = storedJobSchema.parse(JSON.parse(canonical));
  return {
    id: row.id,
    provider: row.provider,
    prospectId: row.prospect_id,
    requestId: row.request_id,
    status: row.status,
    input: row.input,
    output: row.output,
    error: row.error,
    createdAt: utcDate(row.created_at),
    updatedAt: utcDate(row.updated_at),
  };
};
export const projectQueryBasisReview = (
  archive: {
    originalRowCanonical: string;
    originalOutputCanonical: string;
    preparationAuditCanonical: string;
  },
  now = Date.now(),
) => {
  const original = queryBasisStoredJob(archive.originalRowCanonical);
  const preparationAudit = queryBasisStoredJob(
    archive.preparationAuditCanonical,
  );
  const input = heldThirdReviewInputSchema.parse(original.input);
  const state = heldThirdReviewStateSchema.parse(original.output);
  const output = heldThirdReviewStateSchema.parse(
    JSON.parse(archive.originalOutputCanonical),
  );
  const scope = QUERY_BASIS_REVIEW_SCOPE;
  validateQueryPreparationRepair({ job: original, audit: preparationAudit });
  if (
    original.id !== scope.sourceJobId ||
    input.controlId !== scope.controlId ||
    input.merchant.name !== scope.company ||
    input.product.name !== scope.productName ||
    input.product.url !== scope.productUrl ||
    input.category !== scope.savedCategory ||
    input.instructionHash !== HELD_THIRD_REVIEW_INSTRUCTION_HASH ||
    input.action !== "new-product" ||
    original.status !== "complete" ||
    original.error ||
    !isDeepStrictEqual(state, output) ||
    state.stage !== "complete" ||
    state.lease ||
    state.heldReason !== QUERY_BASIS_REVIEW_REASON ||
    state.queryGeneration?.attempts !== 0 ||
    state.queryBasisReview ||
    state.queryPreparationRepair?.mode !== "good-american-capture" ||
    state.queryPreparationRepair.exactQuestion !== scope.question ||
    state.shoppingQueryIntent !== "unbranded-specific" ||
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
    state.productCapture?.status !== "captured"
  )
    throw new ConflictError(
      "Only the intact unspent Good American basis-decomposition hold can receive this review.",
    );
  const context = {
    product: input.product,
    category: input.category,
    merchant: input.merchant,
    browser: state.productCapture,
    contractVersion:
      SHOPPER_QUERY_ROUND3_VERSION as typeof SHOPPER_QUERY_ROUND3_VERSION,
  };
  const excerpt = shopperQueryExcerpts(context, now)?.find(
    (row) => row.id === scope.excerptId && row.sourceId === "product-browser",
  );
  if (!excerpt)
    throw new ConflictError(
      "The exact saved product excerpt for the explicit basis is unavailable or stale.",
    );
  const basis = {
    category: scope.category,
    attribute: scope.attribute,
    excerpts: [excerpt],
    promptHash: queryBasisHash({
      kind: "operator-source-bound-basis",
      version: QUERY_BASIS_REVIEW_VERSION,
      question: scope.question,
      category: scope.category,
      attribute: scope.attribute,
      excerpts: [excerpt],
    }),
  };
  const query = preparedQuerySchema.parse({
    product: input.product,
    category: input.category,
    country: input.country,
    surface: "google_ai_mode",
    prompt: scope.question,
    intent: state.shoppingQueryIntent,
    merchant: { ...input.merchant, aliases: [] },
    contractVersion: SHOPPER_QUERY_ROUND3_VERSION,
    basis,
  });
  return {
    original,
    preparationAudit,
    input,
    state,
    context,
    query,
    sourceRowHash: queryRepairHash(archive.originalRowCanonical),
    sourceOutputHash: queryRepairHash(archive.originalOutputCanonical),
    preparationAuditHash: queryRepairHash(archive.preparationAuditCanonical),
  };
};
/** Binding-only replay also exposes failed or pending decisions as audit data, never query eligibility. */
export const inspectQueryBasisReviewAudit = (audit: Job, now = Date.now()) => {
  const input = queryBasisReviewInputSchema.parse(audit.input);
  const state = queryBasisReviewStateSchema.parse(audit.output);
  const projected = projectQueryBasisReview(state, now);
  if (
    audit.provider !== "automation" ||
    audit.requestId !==
      `held-round3-query-basis-review:${projected.original.id}` ||
    audit.prospectId !== projected.input.prospectId ||
    input.sourceJobId !== projected.original.id ||
    input.controlId !== projected.input.controlId ||
    input.prospectId !== projected.input.prospectId ||
    input.instructionHash !== projected.input.instructionHash ||
    input.requestedBy !== projected.input.requestedBy ||
    input.sourceRowHash !== projected.sourceRowHash ||
    input.sourceOutputHash !== projected.sourceOutputHash ||
    input.preparationAuditId !== projected.preparationAudit.id ||
    input.preparationAuditHash !== projected.preparationAuditHash ||
    !isDeepStrictEqual(input.query, projected.query) ||
    audit.createdAt.getTime() !== Date.parse(input.reservedAt) ||
    Date.parse(input.reservedAt) < projected.original.updatedAt.getTime() ||
    Date.parse(input.reservedAt) > now
  )
    throw new ConflictError(
      "The explicit basis review archive or reservation binding changed.",
    );
  if (state.review) {
    const binding = validateShopperQueryReviewBinding(
      { ...projected.context, query: input.query, review: state.review },
      now,
    );
    if (
      binding ||
      !state.checkedAt ||
      Date.parse(state.checkedAt) > now ||
      Date.parse(state.review.reviewedAt) < Date.parse(input.reservedAt) ||
      Date.parse(state.review.reviewedAt) > Date.parse(state.checkedAt)
    )
      throw new ConflictError(
        binding ?? "The basis review time is outside its original reservation.",
      );
  }
  return { input, state, projected };
};
export const requeuedQueryBasisState = (
  projected: ReturnType<typeof projectQueryBasisReview>,
  audit: Job,
) => {
  const input = queryBasisReviewInputSchema.parse(audit.input);
  const output = queryBasisReviewStateSchema.parse(audit.output);
  if (!output.review || !output.appliedAt)
    throw new ConflictError(
      "A fresh passing basis review has not been applied.",
    );
  const query = preparedQuerySchema.parse({
    ...input.query,
    review: output.review,
  });
  const reference = queryBasisReviewReferenceSchema.parse({
    auditJobId: audit.id,
    version: QUERY_BASIS_REVIEW_VERSION,
    sourceRowHash: input.sourceRowHash,
    sourceOutputHash: input.sourceOutputHash,
    preparationAuditHash: input.preparationAuditHash,
    queryHash: queryBasisHash(query),
    reviewHash: queryBasisHash(output.review),
    appliedAt: output.appliedAt,
  });
  const { heldReason: _heldReason, ...originalState } = projected.state;
  return heldThirdReviewStateSchema.parse({
    ...originalState,
    stage: "query",
    lease: null,
    availableAt: output.appliedAt,
    query,
    queryReview: output.review,
    queryBasisReview: reference,
  });
};
export const validateQueryBasisReview = (
  {
    job,
    audit,
    preparationAuditCanonical,
  }: { job: Job; audit: Job; preparationAuditCanonical: string },
  now = Date.now(),
) => {
  const checked = inspectQueryBasisReviewAudit(audit, now);
  const { input, state, projected } = checked;
  const current = heldThirdReviewStateSchema.parse(job.output);
  if (
    audit.status !== "complete" ||
    audit.error ||
    state.lease ||
    state.heldReason ||
    !state.appliedAt ||
    !state.review ||
    state.review.method !== "semantic" ||
    state.review.status !== "valid" ||
    !state.checkedAt ||
    state.appliedAt !== state.checkedAt ||
    Date.parse(state.appliedAt) > now ||
    queryRepairHash(preparationAuditCanonical) !== input.preparationAuditHash ||
    !isDeepStrictEqual(job.input, projected.original.input) ||
    job.id !== projected.original.id ||
    job.prospectId !== projected.original.prospectId ||
    job.requestId !== projected.original.requestId ||
    job.provider !== projected.original.provider ||
    job.createdAt.getTime() !== projected.original.createdAt.getTime()
  )
    throw new ConflictError(
      "This child has no complete, currently bound passing basis review.",
    );
  const initial = requeuedQueryBasisState(projected, audit);
  if (!initial.query)
    throw new ConflictError("The reviewed exact query is missing.");
  const problem = validateShopperQuery(
    { ...projected.context, query: initial.query },
    now,
  );
  if (
    problem ||
    !isDeepStrictEqual(current.queryBasisReview, initial.queryBasisReview) ||
    !isDeepStrictEqual(current.query, initial.query) ||
    !isDeepStrictEqual(current.queryReview, initial.queryReview) ||
    queryBasisHash(initial) !== state.initialRequeuedStateHash ||
    current.polls < projected.state.polls
  )
    throw new ConflictError(
      problem ?? "The reviewed exact query or initial requeue binding changed.",
    );
  const mutable = new Set([
    "stage",
    "lease",
    "availableAt",
    "heldReason",
    "shoppingQueryCount",
    "polls",
  ]);
  for (const [key, value] of Object.entries(projected.state))
    if (
      !mutable.has(key) &&
      !isDeepStrictEqual(current[key as keyof typeof current], value)
    )
      throw new ConflictError(
        "The basis-reviewed child changed original product, history or preparation evidence.",
      );
  return checked;
};
