import { mock, setSystemTime, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

const originalExit = process.exit;
process.exit = (() => undefined) as typeof process.exit;
await import("./outbound-held-third-query-repair.fixture");
process.exit = originalExit;
const { db, schema } = await import("@/server/database");
const Third = await import("@/server/app/outbound/held-third-review");
const State = await import(
  "@/server/utils/outbound/held-third-review-contract"
);
const BasisContract = await import(
  "@/server/utils/outbound/held-third-query-basis-contract"
);
const Capture = await import("@/server/utils/outbound/live-shopping");
const PurePreparation = await import(
  "@/server/utils/outbound/held-third-query-repair"
);
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const jobAt = async (id: string) => {
  const [job] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id));
  assert.ok(job);
  return job;
};
const children = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(sql`input->>'operation'='heldDiscoveryRound3'`);
const source = children.find(
  (row) =>
    row.input["merchant"] &&
    State.heldThirdReviewInputSchema.parse(row.input).merchant.name ===
      "Good American",
);
assert.ok(source);
const input = State.heldThirdReviewInputSchema.parse(source.input);
const initial = State.heldThirdReviewStateSchema.parse(source.output);
assert.equal(initial.productCapture?.status, "captured");
if (initial.productCapture?.status !== "captured")
  throw new Error("Missing reconstructed synthetic product");
const excerpts = Capture.shopperQueryExcerpts({
  product: input.product,
  category: input.category,
  merchant: input.merchant,
  browser: initial.productCapture,
});
assert.ok(excerpts?.[0]);
mock.module("@/server/utils/outbound/held-third-query-basis-contract", () => ({
  ...BasisContract,
  QUERY_BASIS_REVIEW_SCOPE: {
    ...BasisContract.QUERY_BASIS_REVIEW_SCOPE,
    sourceJobId: source.id,
    controlId: input.controlId,
    productName: input.product.name,
    productUrl: input.product.url,
    excerptId: excerpts[0]!.id,
  },
}));
const Service = await import("@/server/app/outbound/held-third-query-basis");
const Pure = await import("@/server/utils/outbound/held-third-query-basis");
for (const child of children) {
  const state = State.heldThirdReviewStateSchema.parse(child.output);
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "complete",
      error: null,
      output: State.heldThirdReviewStateSchema.parse({
        ...state,
        stage: "complete",
        lease: null,
        ...(child.id === source.id
          ? {
              queryGeneration: { attempts: 0 },
              heldReason: BasisContract.QUERY_BASIS_REVIEW_REASON,
            }
          : {}),
      }),
      updatedAt: new Date(),
    })
    .where(eq(schema.outboundIntegrationJob.id, child.id));
}
const original = await jobAt(source.id);
const sourceState = State.heldThirdReviewStateSchema.parse(original.output);
assert.ok(sourceState.queryPreparationRepair);
const preparationId = sourceState.queryPreparationRepair.auditJobId;
const canonicalAt = async (id: string) => {
  const [row] = await db
    .select({
      row: sql<string>`to_jsonb(${schema.outboundIntegrationJob})::text`,
      output: sql<string>`output::text`,
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id));
  assert.ok(row);
  return row;
};
const archived = await canonicalAt(source.id);
const preparation = await canonicalAt(preparationId);
const request = {
  sourceJobId: source.id,
  instructionHash: input.instructionHash,
  expectedSourceRowHash: PurePreparation.queryRepairHash(archived.row),
  expectedOutputHash: PurePreparation.queryRepairHash(archived.output),
  expectedPreparationAuditHash: PurePreparation.queryRepairHash(
    preparation.row,
  ),
};
const snapshot = async () => ({
  jobs: await db
    .select()
    .from(schema.outboundIntegrationJob)
    .orderBy(schema.outboundIntegrationJob.id),
  prospects: await db
    .select()
    .from(schema.outboundProspect)
    .orderBy(schema.outboundProspect.id),
  policy: await db.select().from(schema.outboundPlaybook),
  revisions: await db
    .select()
    .from(schema.outboundRevision)
    .orderBy(schema.outboundRevision.id),
  attempts: await db
    .select()
    .from(schema.outboundSendAttempt)
    .orderBy(schema.outboundSendAttempt.id),
});
const before = await snapshot();
assert.equal(
  value(await Service.inspectQueryBasisReview(request)).status,
  "eligible",
);
assert.deepEqual(await snapshot(), before);
assert.equal(
  (await Service.runQueryBasisReview("wrong operator", request)).success,
  false,
);
assert.equal(
  (
    await Service.runQueryBasisReview(input.requestedBy, {
      ...request,
      expectedOutputHash: "0".repeat(64),
    })
  ).success,
  false,
);
assert.deepEqual(await snapshot(), before);
const scenario = process.argv[2] ?? "pass";
const counts = { review: 0, guards: 0 };
const originalGuard = Third.assertHeldThirdReviewEligibility;
const guard = spyOn(
  Third,
  "assertHeldThirdReviewEligibility",
).mockImplementation(async (...args) => {
  const result = await originalGuard(...args);
  counts.guards++;
  if (scenario === "audit-tamper" && counts.guards === 2) {
    const [audit] = await args[0]
      .select()
      .from(schema.outboundIntegrationJob)
      .where(
        eq(
          schema.outboundIntegrationJob.requestId,
          `held-round3-query-basis-review:${source.id}`,
        ),
      );
    assert.ok(audit);
    const stored = BasisContract.queryBasisReviewInputSchema.parse(audit.input);
    await args[0]
      .update(schema.outboundIntegrationJob)
      .set({
        input: {
          ...stored,
          query: { ...stored.query, prompt: "unsupported jeans" },
        },
      })
      .where(eq(schema.outboundIntegrationJob.id, audit.id));
  }
  if (scenario === "replay-expiry" && counts.guards === 3)
    setSystemTime(new Date(Date.now() + 180001));
  return result;
});
const result = await Service.runQueryBasisReview(input.requestedBy, request, {
  review: async ({ prompt }) => {
    counts.review++;
    const data = JSON.parse(prompt);
    assert.equal(data.query, "wide leg jeans");
    assert.equal(data.basis.category, "jeans");
    assert.equal(data.basis.attribute, "wide leg");
    assert.equal(data.basis.excerpts[0].id, excerpts[0]!.id);
    if (scenario === "interrupted")
      throw new Error("Synthetic lost model response");
    if (scenario === "source-tamper")
      await db
        .update(schema.outboundIntegrationJob)
        .set({ error: "Synthetic concurrent source change" })
        .where(eq(schema.outboundIntegrationJob.id, source.id));
    return {
      status: scenario === "rejected" ? "invalid" : "valid",
      reason:
        scenario === "rejected"
          ? "Synthetic invalid product fit."
          : "Synthetic ordinary denim product fit.",
      checks: {
        naturalWordOrder: true,
        obviousProductCandidate: scenario !== "rejected",
        unbranded: true,
        productGrounding: true,
      },
      excerptIds: [excerpts[0]!.id],
    };
  },
});
guard.mockRestore();
const [audit] = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(
    eq(
      schema.outboundIntegrationJob.requestId,
      `held-round3-query-basis-review:${source.id}`,
    ),
  );
assert.ok(audit);
const auditState = BasisContract.queryBasisReviewStateSchema.parse(
  audit.output,
);
const current = await jobAt(source.id);
assert.equal(auditState.reviewAttempts, 1);
assert.equal(auditState.originalRowCanonical, archived.row);
assert.equal(auditState.originalOutputCanonical, archived.output);
assert.equal(auditState.preparationAuditCanonical, preparation.row);
assert.equal(counts.review, scenario === "audit-tamper" ? 0 : 1);
if (scenario === "pass" || scenario === "query-progress") {
  assert.equal(
    result.success,
    true,
    result.success ? "" : result.error.message,
  );
  assert.equal(audit.status, "complete");
  assert.equal(current.status, "pending");
  const state = State.heldThirdReviewStateSchema.parse(current.output);
  assert.equal(state.stage, "query");
  assert.equal(state.query?.prompt, "wide leg jeans");
  assert.equal(state.queryReview?.status, "valid");
  assert.equal(state.queryReservedAt, undefined);
  assert.equal(state.round3ReservedAt, undefined);
  assert.equal(state.shoppingQueryCount, initial.shoppingQueryCount);
  assert.deepEqual(
    state.queryPreparationRepair,
    initial.queryPreparationRepair,
  );
  assert.deepEqual(state.productCapture, initial.productCapture);
  Pure.validateQueryBasisReview({
    job: current,
    audit,
    preparationAuditCanonical: preparation.row,
  });
  await db.transaction((scope) =>
    Third.assertHeldThirdReviewEligibility(scope, input, state),
  );
  assert.equal(
    value(
      await Service.runQueryBasisReview(input.requestedBy, request, {
        review: async () => {
          throw new Error("No second review");
        },
      }),
    ).repeated,
    true,
  );
  assert.throws(() =>
    Pure.validateQueryBasisReview({
      job: {
        ...current,
        output: { ...current.output, queryBasisReview: undefined },
      },
      audit,
      preparationAuditCanonical: preparation.row,
    }),
  );
  assert.throws(() =>
    Pure.validateQueryBasisReview({
      job: current,
      audit,
      preparationAuditCanonical: `${preparation.row} `,
    }),
  );
  if (scenario === "query-progress") {
    const purchases = { calls: 0 };
    setSystemTime(new Date(Date.now() + 61000));
    const advanced = value(
      await Third.runNext(
        { controlId: input.controlId, deadline: Date.now() + 300000 },
        {
          resolveKey: async () => ({ success: true, data: "synthetic" }),
          start: async (request) => {
            purchases.calls++;
            return Capture.startQuery(request, {
              request: async () => ({
                success: true,
                data: Response.json(
                  { job_id: randomUUID(), status: "pending" },
                  { status: 202 },
                ),
              }),
            });
          },
        },
      ),
    );
    assert.equal(advanced.advanced, true);
    const submitted = await jobAt(source.id);
    const submittedState = State.heldThirdReviewStateSchema.parse(
      submitted.output,
    );
    assert.equal(submittedState.stage, "poll", submitted.error ?? "");
    assert.equal(purchases.calls, 1);
    assert.equal(
      submittedState.shoppingQueryCount,
      initial.shoppingQueryCount + 1,
    );
    assert.ok(submittedState.round3ReservedAt);
    assert.equal(submittedState.query?.prompt, "wide leg jeans");
    Pure.validateQueryBasisReview({
      job: submitted,
      audit,
      preparationAuditCanonical: preparation.row,
    });
    PurePreparation.validateQueryPreparationRepair({
      job: submitted,
      audit: await jobAt(preparationId),
    });
    assert.equal((await jobAt(input.controlId)).output?.["queriesReserved"], 8);
    assert.equal((await jobAt(input.batchId)).output?.["queriesReserved"], 35);
    assert.equal(
      value(
        await Third.runNext({
          controlId: input.controlId,
          deadline: Date.now() + 300000,
        }),
      ).advanced,
      false,
    );
    assert.equal(purchases.calls, 1);
  }
} else {
  assert.equal(auditState.appliedAt, undefined);
  assert.ok(auditState.heldReason);
  assert.equal(current.status, "complete");
  assert.deepEqual(current.output, original.output);
  if (
    scenario === "rejected" ||
    scenario === "source-tamper" ||
    scenario === "replay-expiry"
  )
    assert.ok(auditState.review);
  if (scenario === "replay-expiry") assert.equal(audit.status, "uncertain");
  await Service.runQueryBasisReview(input.requestedBy, request, {
    review: async () => {
      throw new Error("No automatic retry");
    },
  });
  assert.equal(counts.review, scenario === "audit-tamper" ? 0 : 1);
}
const after = await snapshot();
assert.deepEqual(after.prospects, before.prospects);
assert.deepEqual(after.policy, before.policy);
assert.deepEqual(after.revisions, before.revisions);
assert.deepEqual(after.attempts, before.attempts);
const pacingBefore = before.jobs.find(
  (row) => row.requestId === "outbound-shopping-provider-pacing",
);
const pacingAfter = after.jobs.find(
  (row) => row.requestId === "outbound-shopping-provider-pacing",
);
if (scenario === "query-progress") {
  assert.ok(pacingBefore && pacingAfter);
  const {
    output: beforeOutput,
    updatedAt: beforeUpdatedAt,
    ...beforeFixed
  } = pacingBefore;
  const {
    output: afterOutput,
    updatedAt: afterUpdatedAt,
    ...afterFixed
  } = pacingAfter;
  assert.deepEqual(afterFixed, beforeFixed);
  assert.ok(afterUpdatedAt.getTime() > beforeUpdatedAt.getTime());
  assert.equal(
    Date.parse(String(afterOutput?.["availableAt"])),
    afterUpdatedAt.getTime() + 15000,
  );
  assert.ok(
    Date.parse(String(afterOutput?.["availableAt"])) >
      Date.parse(String(beforeOutput?.["availableAt"])),
  );
}
assert.deepEqual(
  after.jobs.filter(
    (row) =>
      row.id !== source.id &&
      row.id !== audit.id &&
      (scenario !== "query-progress" ||
        ![input.controlId, input.batchId, pacingBefore?.id].includes(row.id)),
  ),
  before.jobs.filter(
    (row) =>
      row.id !== source.id &&
      (scenario !== "query-progress" ||
        ![input.controlId, input.batchId, pacingBefore?.id].includes(row.id)),
  ),
);
assert.equal(after.jobs.length, before.jobs.length + 1);
console.log("Good American one-use basis review contracts passed");
process.exit(0);
