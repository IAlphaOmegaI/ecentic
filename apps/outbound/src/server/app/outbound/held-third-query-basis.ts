import "server-only";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { resultify } from "@zenncore/utils";
import { and, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { db, schema, type TransactionScope } from "@/server/database";
import { ConflictError } from "@/server/utils/error";
import { HELD_REVIEW_REASON } from "@/server/utils/outbound/held-review-contract";
import {
  inspectQueryBasisReviewAudit,
  projectQueryBasisReview,
  queryBasisHash,
  requeuedQueryBasisState,
  validateQueryBasisReview,
} from "@/server/utils/outbound/held-third-query-basis";
import {
  QUERY_BASIS_REVIEW_SCOPE,
  QUERY_BASIS_REVIEW_VERSION,
  type QueryBasisReviewRequest,
  queryBasisReviewInputSchema,
  queryBasisReviewRequestSchema,
  queryBasisReviewStateSchema,
} from "@/server/utils/outbound/held-third-query-basis-contract";
import { queryRepairHash } from "@/server/utils/outbound/held-third-query-repair";
import {
  reviewShopperQuery,
  type ShopperQueryReviewDependencies,
  validateShopperQueryReview,
} from "@/server/utils/outbound/shopper-query";
import * as Third from "./held-third-review";

type Job = typeof schema.outboundIntegrationJob.$inferSelect;
const transaction = <T>(operation: (scope: TransactionScope) => Promise<T>) =>
  db.transaction(async (scope) => {
    await scope.execute(
      sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
    );
    return operation(scope);
  });
const rowAt = async (scope: TransactionScope, id: string) => {
  const [row] = await scope
    .select({
      ...getTableColumns(schema.outboundIntegrationJob),
      canonical: sql<string>`to_jsonb(${schema.outboundIntegrationJob})::text`,
      outputCanonical: sql<string>`output::text`,
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id))
    .limit(1);
  if (!row) throw new ConflictError("The bound basis-review job is missing.");
  const { canonical, outputCanonical, ...job } = row;
  return { job, canonical, outputCanonical };
};
const existingAt = async (scope: TransactionScope, sourceJobId: string) => {
  const rows = await scope
    .select()
    .from(schema.outboundIntegrationJob)
    .where(
      eq(
        schema.outboundIntegrationJob.requestId,
        `held-round3-query-basis-review:${sourceJobId}`,
      ),
    );
  if (rows.length > 1)
    throw new ConflictError("The one-use basis review is ambiguous.");
  return rows[0] ?? null;
};
const checkRequest = (
  request: QueryBasisReviewRequest,
  projected: ReturnType<typeof projectQueryBasisReview>,
) => {
  if (
    request.sourceJobId !== projected.original.id ||
    request.instructionHash !== projected.input.instructionHash ||
    request.expectedSourceRowHash !== projected.sourceRowHash ||
    request.expectedOutputHash !== projected.sourceOutputHash ||
    request.expectedPreparationAuditHash !== projected.preparationAuditHash
  )
    throw new ConflictError(
      "The original failed basis check or its first repair audit changed.",
    );
};
const checkedSource = async (
  scope: TransactionScope,
  request: QueryBasisReviewRequest,
) => {
  if (request.sourceJobId !== QUERY_BASIS_REVIEW_SCOPE.sourceJobId)
    throw new ConflictError(
      "This basis review is restricted to the explicit Good American job.",
    );
  const source = await rowAt(scope, request.sourceJobId);
  const reference = source.job.output?.["queryPreparationRepair"] as
    | { auditJobId?: unknown }
    | undefined;
  if (typeof reference?.auditJobId !== "string")
    throw new ConflictError("The original preparation audit is missing.");
  const preparation = await rowAt(scope, reference.auditJobId);
  const archive = {
    originalRowCanonical: source.canonical,
    originalOutputCanonical: source.outputCanonical,
    preparationAuditCanonical: preparation.canonical,
  };
  const projected = projectQueryBasisReview(archive);
  checkRequest(request, projected);
  const checked = await Third.assertHeldThirdReviewEligibility(
    scope,
    projected.input,
    projected.state,
  );
  const ids = checked.control.input.manifest.prospectIds;
  const children = await scope
    .select({
      prospectId: schema.outboundIntegrationJob.prospectId,
      status: schema.outboundIntegrationJob.status,
    })
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        eq(schema.outboundIntegrationJob.provider, "automation"),
        sql`input->>'operation'='heldDiscoveryRound3'`,
        sql`input->>'controlId'=${projected.input.controlId}`,
      ),
    );
  if (
    children.length !== 21 ||
    new Set(children.map((row) => row.prospectId)).size !== 21 ||
    children.some(
      (row) =>
        !row.prospectId ||
        !ids.includes(row.prospectId) ||
        !["complete", "failed", "uncertain"].includes(row.status),
    )
  )
    throw new ConflictError(
      "All twenty-one main third-review children must be terminal before the separate basis review.",
    );
  const prospects = await scope
    .select({
      status: schema.outboundProspect.status,
      holdReason: schema.outboundProspect.holdReason,
      sentStep: schema.outboundProspect.sentStep,
      approvedAt: schema.outboundProspect.approvedAt,
      approvedBy: schema.outboundProspect.approvedBy,
      approvalHash: schema.outboundProspect.approvalHash,
      nextSendAt: schema.outboundProspect.nextSendAt,
    })
    .from(schema.outboundProspect)
    .where(inArray(schema.outboundProspect.id, ids));
  if (
    prospects.length !== 21 ||
    prospects.some(
      (row) =>
        row.status !== "held" ||
        row.holdReason !== HELD_REVIEW_REASON ||
        row.sentStep !== 0 ||
        row.approvedAt ||
        row.approvedBy ||
        row.approvalHash ||
        row.nextSendAt,
    )
  )
    throw new ConflictError(
      "Every original contact must remain held, unsent and unapproved.",
    );
  if (
    checked.control.state.queriesReserved >= 11 ||
    checked.control.budget.queriesReserved >= 38
  )
    throw new ConflictError(
      "The authorized first Good American search has no remaining reservation.",
    );
  return { archive, projected };
};
const summary = (job: Job) => {
  const checked = inspectQueryBasisReviewAudit(job);
  return {
    auditJobId: job.id,
    sourceJobId: checked.input.sourceJobId,
    status: job.status,
    reviewReservations: checked.state.reviewAttempts,
    decision: checked.state.review?.status ?? null,
    applied: !!checked.state.appliedAt,
    heldReason: checked.state.heldReason ?? job.error,
    question: checked.input.query.prompt,
    searchCalls: 0,
    queryGenerationCalls: 0,
  };
};
const checkedExisting = async (
  scope: TransactionScope,
  job: Job,
  request: QueryBasisReviewRequest,
) => {
  const checked = inspectQueryBasisReviewAudit(job);
  checkRequest(request, checked.projected);
  const preparation = await rowAt(scope, checked.input.preparationAuditId);
  if (
    queryRepairHash(preparation.canonical) !==
    checked.input.preparationAuditHash
  )
    throw new ConflictError("The first preparation repair audit changed.");
  const source = await rowAt(scope, request.sourceJobId);
  if (checked.state.appliedAt)
    validateQueryBasisReview({
      job: source.job,
      audit: job,
      preparationAuditCanonical: preparation.canonical,
    });
  else if (queryRepairHash(source.canonical) !== checked.input.sourceRowHash)
    throw new ConflictError("The unapplied basis-review source changed.");
  return checked;
};
export const inspectQueryBasisReview = (
  requestInput: QueryBasisReviewRequest,
) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(sql`set transaction read only`);
      const request = queryBasisReviewRequestSchema.parse(requestInput);
      const existing = await existingAt(scope, request.sourceJobId);
      if (existing) {
        await checkedExisting(scope, existing, request);
        return { repeated: true, ...summary(existing) };
      }
      const checked = await checkedSource(scope, request);
      return {
        repeated: false,
        auditJobId: null,
        sourceJobId: request.sourceJobId,
        status: "eligible",
        reviewReservations: 0,
        decision: null,
        applied: false,
        heldReason: null,
        question: checked.projected.query.prompt,
        searchCalls: 0,
        queryGenerationCalls: 0,
      };
    }),
  );

/** One fresh semantic review only. The normal R3 worker owns any later authorized search. */
export const runQueryBasisReview = (
  actor: string,
  requestInput: QueryBasisReviewRequest,
  dependencies: ShopperQueryReviewDependencies & { deadline?: number } = {},
) =>
  resultify(async () => {
    const request = queryBasisReviewRequestSchema.parse(requestInput);
    const claimed = await transaction(async (scope) => {
      const existing = await existingAt(scope, request.sourceJobId);
      if (existing) {
        const checked = await checkedExisting(scope, existing, request);
        if (actor !== checked.input.requestedBy)
          throw new ConflictError(
            "Only the original operator may use this basis review.",
          );
        if (
          existing.status === "starting" &&
          Date.parse(checked.state.lease?.expiresAt ?? "") <= Date.now()
        ) {
          const [saved] = await scope
            .update(schema.outboundIntegrationJob)
            .set({
              status: "uncertain",
              error:
                "The one-use basis review lost its lease; it cannot be reviewed again.",
              output: {
                ...checked.state,
                lease: null,
                heldReason:
                  "The one-use basis review lost its lease; it cannot be reviewed again.",
              },
              updatedAt: new Date(),
            })
            .where(eq(schema.outboundIntegrationJob.id, existing.id))
            .returning();
          if (!saved)
            throw new ConflictError(
              "The expired basis reservation could not be retained.",
            );
          return { repeated: true as const, job: saved };
        }
        return { repeated: true as const, job: existing };
      }
      const checked = await checkedSource(scope, request);
      if (actor !== checked.projected.input.requestedBy)
        throw new ConflictError(
          "Only the original operator may reserve this basis review.",
        );
      const timestamp = new Date();
      const input = queryBasisReviewInputSchema.parse({
        operation: "heldDiscoveryRound3QueryBasisReview",
        version: QUERY_BASIS_REVIEW_VERSION,
        sourceJobId: request.sourceJobId,
        controlId: checked.projected.input.controlId,
        prospectId: checked.projected.input.prospectId,
        instructionHash: checked.projected.input.instructionHash,
        sourceRowHash: checked.projected.sourceRowHash,
        sourceOutputHash: checked.projected.sourceOutputHash,
        preparationAuditId: checked.projected.preparationAudit.id,
        preparationAuditHash: checked.projected.preparationAuditHash,
        requestedBy: actor,
        reservedAt: timestamp.toISOString(),
        query: checked.projected.query,
      });
      const output = queryBasisReviewStateSchema.parse({
        ...checked.archive,
        reviewAttempts: 1,
        lease: {
          token: randomUUID(),
          expiresAt: new Date(timestamp.getTime() + 180000).toISOString(),
        },
      });
      const [job] = await scope
        .insert(schema.outboundIntegrationJob)
        .values({
          id: randomUUID(),
          provider: "automation",
          prospectId: input.prospectId,
          requestId: `held-round3-query-basis-review:${input.sourceJobId}`,
          status: "starting",
          input,
          output,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();
      if (!job)
        throw new ConflictError(
          "The one-use basis review could not be reserved.",
        );
      return { repeated: false as const, job, input, output };
    });
    if (claimed.repeated) return { repeated: true, ...summary(claimed.job) };
    const intactClaim = (job: Job) => {
      inspectQueryBasisReviewAudit(job);
      if (
        !isDeepStrictEqual(job.input, claimed.input) ||
        !isDeepStrictEqual(
          queryBasisReviewStateSchema.parse(job.output),
          claimed.output,
        )
      )
        throw new ConflictError(
          "The reserved basis-review input or archive changed.",
        );
    };
    const outcome = await resultify(async () => {
      const checked = await transaction(async (scope) => {
        const checked = await checkedSource(scope, request);
        const audit = await rowAt(scope, claimed.job.id);
        const current = queryBasisReviewStateSchema.parse(audit.job.output);
        intactClaim(audit.job);
        if (
          audit.job.status !== "starting" ||
          current.lease?.token !== claimed.output.lease?.token ||
          Date.parse(current.lease?.expiresAt ?? "") <= Date.now()
        )
          throw new ConflictError(
            "The reserved basis review lease changed or expired before review.",
          );
        return checked;
      });
      const decision = await reviewShopperQuery(
        {
          ...checked.projected.context,
          query: claimed.input.query,
          deadline: Math.min(
            dependencies.deadline ?? Number.POSITIVE_INFINITY,
            Date.parse(claimed.output.lease?.expiresAt ?? "") - 30000,
          ),
        },
        dependencies,
      );
      if (!decision.success) throw decision.error;
      return decision.data;
    });
    const saved = await transaction(async (scope) => {
      const checked = await resultify(() => checkedSource(scope, request));
      const current = await rowAt(scope, claimed.job.id);
      const state = queryBasisReviewStateSchema.parse(current.job.output);
      if (!state.lease || state.lease.token !== claimed.output.lease?.token)
        return current.job;
      const intact = resultify(() => intactClaim(current.job));
      const publishedAt = new Date();
      const active =
        current.job.status === "starting" &&
        Date.parse(state.lease.expiresAt) > publishedAt.getTime();
      const review = outcome.success ? outcome.data : undefined;
      const timingProblem =
        review &&
        (Date.parse(review.reviewedAt) < Date.parse(claimed.input.reservedAt) ||
          Date.parse(review.reviewedAt) > publishedAt.getTime());
      const reviewProblem =
        review && checked.success
          ? validateShopperQueryReview(
              {
                ...checked.data.projected.context,
                query: claimed.input.query,
                review,
              },
              publishedAt.getTime(),
            )
          : null;
      const reason = !active
        ? "The basis review completed after its lease; its decision is retained unapplied without retry."
        : !intact.success
          ? intact.error.message
          : !checked.success
            ? checked.error.message
            : !outcome.success
              ? outcome.error.message
              : timingProblem
                ? "The basis review timestamp is outside its reservation."
                : review?.method !== "semantic"
                  ? "A fresh semantic product-fit decision is required."
                  : reviewProblem;
      const output = queryBasisReviewStateSchema.parse({
        ...state,
        lease: null,
        ...(review ? { review } : {}),
        checkedAt: publishedAt.toISOString(),
        ...(reason
          ? { heldReason: reason }
          : { appliedAt: publishedAt.toISOString() }),
      });
      const finalJob: Job = {
        ...current.job,
        status:
          !active || !outcome.success
            ? "uncertain"
            : reason
              ? "failed"
              : "complete",
        error: reason ?? null,
        output,
        updatedAt: publishedAt,
      };
      if (!reason && checked.success) {
        const next = requeuedQueryBasisState(checked.data.projected, finalJob);
        finalJob.output = queryBasisReviewStateSchema.parse({
          ...output,
          initialRequeuedStateHash: queryBasisHash(next),
        });
        const currentSource = checked.data.projected.original;
        const nextJob = {
          ...currentSource,
          status: "pending" as const,
          error: null,
          output: next,
          updatedAt: publishedAt,
        };
        validateQueryBasisReview(
          {
            job: nextJob,
            audit: finalJob,
            preparationAuditCanonical:
              checked.data.archive.preparationAuditCanonical,
          },
          publishedAt.getTime(),
        );
        const [updated] = await scope
          .update(schema.outboundIntegrationJob)
          .set({
            status: "pending",
            error: null,
            output: next,
            updatedAt: publishedAt,
          })
          .where(
            and(
              eq(schema.outboundIntegrationJob.id, request.sourceJobId),
              eq(schema.outboundIntegrationJob.status, "complete"),
            ),
          )
          .returning();
        if (!updated || !isDeepStrictEqual(updated.output, next))
          throw new ConflictError(
            "The reviewed query could not be requeued atomically.",
          );
      }
      const [persisted] = await scope
        .update(schema.outboundIntegrationJob)
        .set({
          status: finalJob.status,
          error: finalJob.error,
          output: finalJob.output,
          updatedAt: publishedAt,
        })
        .where(eq(schema.outboundIntegrationJob.id, current.job.id))
        .returning();
      if (!persisted)
        throw new ConflictError(
          "The completed basis review could not be retained.",
        );
      return persisted;
    });
    return { repeated: false, ...summary(saved) };
  });
