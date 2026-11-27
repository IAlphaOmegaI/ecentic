import "server-only";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { resultify } from "@zenncore/utils";
import { and, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { db, schema, type TransactionScope } from "@/server/database";
import { ConflictError } from "@/server/utils/error";
import { HELD_REVIEW_REASON } from "@/server/utils/outbound/held-review-contract";
import {
  projectQueryPreparationRepair,
  queryRepairHash,
  requeuedQueryPreparationState,
  validateQueryPreparationRepair,
} from "@/server/utils/outbound/held-third-query-repair";
import {
  QUERY_PREPARATION_GRAMMAR_VERSION,
  QUERY_PREPARATION_REPAIR_CASES,
  QUERY_PREPARATION_REPAIR_VERSION,
  type QueryPreparationRepairRequest,
  queryPreparationRepairBatchRequestSchema,
  queryPreparationRepairInputSchema,
  queryPreparationRepairOutputSchema,
  queryPreparationRepairRequestSchema,
} from "@/server/utils/outbound/held-third-query-repair-contract";
import { heldThirdReviewStateSchema } from "@/server/utils/outbound/held-third-review-contract";
import * as Third from "./held-third-review";

const sourceAt = async (scope: TransactionScope, id: string) => {
  const [source] = await scope
    .select({
      ...getTableColumns(schema.outboundIntegrationJob),
      originalRowCanonical: sql<string>`to_jsonb(${schema.outboundIntegrationJob})::text`,
      originalOutputCanonical: sql<string>`output::text`,
      sourceRowHash: sql<string>`encode(sha256(convert_to(to_jsonb(${schema.outboundIntegrationJob})::text,'UTF8')),'hex')`,
      sourceOutputHash: sql<string>`encode(sha256(convert_to(output::text,'UTF8')),'hex')`,
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id))
    .limit(1);
  if (!source)
    throw new ConflictError("The original preparation job is missing.");
  const {
    originalRowCanonical,
    originalOutputCanonical,
    sourceRowHash,
    sourceOutputHash,
    ...job
  } = source;
  return {
    job,
    originalRowCanonical,
    originalOutputCanonical,
    sourceRowHash,
    sourceOutputHash,
  };
};
const inspectWithin = async (
  scope: TransactionScope,
  requestInput: QueryPreparationRepairRequest,
) => {
  const request = queryPreparationRepairRequestSchema.parse(requestInput);
  if (
    !QUERY_PREPARATION_REPAIR_CASES.some(
      (row) => row.sourceJobId === request.sourceJobId,
    )
  )
    throw new ConflictError(
      "Only an explicitly scoped preparation job can be repaired.",
    );
  const source = await sourceAt(scope, request.sourceJobId);
  const existing = await scope
    .select()
    .from(schema.outboundIntegrationJob)
    .where(
      eq(
        schema.outboundIntegrationJob.requestId,
        `held-round3-query-preparation-repair:${request.sourceJobId}`,
      ),
    );
  if (existing.length) {
    const audit = existing[0];
    if (existing.length !== 1 || !audit)
      throw new ConflictError("The preparation repair audit is ambiguous.");
    const saved = validateQueryPreparationRepair({
      job: source.job,
      audit,
    });
    if (
      request.expectedSourceRowHash !== saved.input.sourceRowHash ||
      request.expectedOutputHash !== saved.input.sourceOutputHash ||
      request.instructionHash !== saved.input.instructionHash
    )
      throw new ConflictError(
        "The existing repair has a different original source binding.",
      );
    return {
      repeated: true as const,
      audit,
      source,
      projected: saved.projected,
    };
  }
  const projected = projectQueryPreparationRepair(source);
  if (
    request.expectedSourceRowHash !== source.sourceRowHash ||
    request.expectedOutputHash !== source.sourceOutputHash ||
    request.instructionHash !== projected.input.instructionHash ||
    projected.sourceRowHash !== source.sourceRowHash ||
    projected.sourceOutputHash !== source.sourceOutputHash
  )
    throw new ConflictError(
      "The exact original preparation row or output changed.",
    );
  const checked = await Third.assertHeldThirdReviewEligibility(
    scope,
    projected.input,
    projected.state,
  );
  const ids = checked.control.input.manifest.prospectIds;
  const children = await scope
    .select({
      id: schema.outboundIntegrationJob.id,
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
      "All twenty-one original third-review children must be settled before preparation repair.",
    );
  const prospects = await scope
    .select({
      id: schema.outboundProspect.id,
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
      "Every original prospect must retain its exact unsent, unapproved hold.",
    );
  if (
    checked.control.state.queriesReserved >=
      checked.control.input.additionalQueries ||
    checked.control.budget.queriesReserved >=
      checked.control.input.finalQueriesReserved
  )
    throw new ConflictError(
      "No authorized third-review query reservation remains.",
    );
  return { repeated: false as const, source, projected };
};
const inspectBatchWithin = async (
  scope: TransactionScope,
  requestsInput: QueryPreparationRepairRequest[],
) => {
  const requests =
    queryPreparationRepairBatchRequestSchema.parse(requestsInput);
  if (
    !QUERY_PREPARATION_REPAIR_CASES.every((row) =>
      requests.some((request) => request.sourceJobId === row.sourceJobId),
    )
  )
    throw new ConflictError(
      "The preparation batch must contain all four explicitly authorized source jobs.",
    );
  const checked = [];
  for (const request of requests)
    checked.push(await inspectWithin(scope, request));
  if (
    checked.some((row) => row.repeated) !== checked.every((row) => row.repeated)
  )
    throw new ConflictError(
      "A partially staged preparation batch cannot be retried.",
    );
  return checked;
};
export const inspectQueryPreparationRepairs = (
  requests: QueryPreparationRepairRequest[],
) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(sql`set transaction read only`);
      const checked = await inspectBatchWithin(scope, requests);
      return {
        repairs: checked.map((row) => ({
          repeated: row.repeated,
          sourceJobId: row.source.job.id,
          sourceRowHash: row.projected.sourceRowHash,
          sourceOutputHash: row.projected.sourceOutputHash,
          originalHeldReason: row.projected.state.heldReason,
          exactQuestion: row.projected.authorized.exactQuestion,
          mode: row.projected.authorized.mode,
          fixVersion: QUERY_PREPARATION_REPAIR_VERSION,
          auditJobId: row.repeated ? row.audit.id : null,
        })),
        searchCalls: 0,
        queryModelCalls: 0,
      };
    }),
  );
const requeueWithin = async (
  scope: TransactionScope,
  actor: string,
  checked: Awaited<ReturnType<typeof inspectWithin>>,
  timestamp: Date,
) => {
  if (checked.repeated)
    return {
      auditJobId: checked.audit.id,
      sourceJobId: checked.source.job.id,
      repeated: true,
    };
  const auditJobId = randomUUID();
  const input = queryPreparationRepairInputSchema.parse({
    operation: "heldDiscoveryRound3QueryPreparationRepair",
    sourceJobId: checked.source.job.id,
    controlId: checked.projected.input.controlId,
    prospectId: checked.projected.input.prospectId,
    instructionHash: checked.projected.input.instructionHash,
    sourceRowHash: checked.projected.sourceRowHash,
    sourceOutputHash: checked.projected.sourceOutputHash,
    fixVersion: QUERY_PREPARATION_REPAIR_VERSION,
    requestedBy: actor,
    repairedAt: timestamp.toISOString(),
    mode: checked.projected.authorized.mode,
    exactQuestion: checked.projected.authorized.exactQuestion,
    grammarVersion: QUERY_PREPARATION_GRAMMAR_VERSION,
    captureVersion:
      checked.projected.authorized.mode === "good-american-capture"
        ? "product-group-color-v1"
        : null,
    repairedProductCaptureHash: queryRepairHash(
      JSON.stringify(checked.projected.repairedProductCapture),
    ),
  });
  const reference = {
    auditJobId,
    sourceRowHash: input.sourceRowHash,
    sourceOutputHash: input.sourceOutputHash,
    fixVersion: input.fixVersion,
    repairedAt: input.repairedAt,
    mode: input.mode,
    exactQuestion: input.exactQuestion,
    grammarVersion: input.grammarVersion,
    captureVersion: input.captureVersion,
    repairedProductCaptureHash: input.repairedProductCaptureHash,
  };
  const output = requeuedQueryPreparationState(checked.projected, reference);
  const archived = queryPreparationRepairOutputSchema.parse({
    originalRowCanonical: checked.source.originalRowCanonical,
    originalOutputCanonical: checked.source.originalOutputCanonical,
    initialRequeuedStateHash: queryRepairHash(JSON.stringify(output)),
  });
  await scope.insert(schema.outboundIntegrationJob).values({
    id: auditJobId,
    provider: "automation",
    prospectId: input.prospectId,
    requestId: `held-round3-query-preparation-repair:${input.sourceJobId}`,
    status: "complete",
    input,
    output: archived,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const [updated] = await scope
    .update(schema.outboundIntegrationJob)
    .set({ status: "pending", error: null, output, updatedAt: timestamp })
    .where(
      and(
        eq(schema.outboundIntegrationJob.id, input.sourceJobId),
        eq(schema.outboundIntegrationJob.status, "complete"),
      ),
    )
    .returning();
  if (
    !updated ||
    !isDeepStrictEqual(heldThirdReviewStateSchema.parse(updated.output), output)
  )
    throw new ConflictError(
      "The original preparation job could not be requeued atomically.",
    );
  return { auditJobId, sourceJobId: updated.id, repeated: false };
};
export const repairQueryPreparations = (
  actor: string,
  requests: QueryPreparationRepairRequest[],
) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      const checked = await inspectBatchWithin(scope, requests);
      if (checked.some((row) => actor !== row.projected.input.requestedBy))
        throw new ConflictError(
          "Only the original operator may request this preparation repair.",
        );
      const timestamp = new Date();
      const repairs = [];
      for (const row of checked)
        repairs.push(await requeueWithin(scope, actor, row, timestamp));
      return { repairs, searchCalls: 0, queryModelCalls: 0 };
    }),
  );
