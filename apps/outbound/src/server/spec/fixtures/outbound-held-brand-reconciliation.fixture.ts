import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { eq, ne, sql } from "drizzle-orm";
import { prospectSchema } from "@/lib/outbound";
import { requireTestDatabase } from "../helpers/database";

Object.assign(process.env, {
  DATABASE_URL: requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL),
});
mock.module("server-only", () => ({}));
const { researchHash } = await import(
  "@/server/utils/outbound/shopping-research"
);
const Contract = await import("@/server/utils/outbound/held-review-contract");
const ids = Array.from({ length: 21 }, () => randomUUID());
const manifest = Contract.heldReviewManifestSchema.parse({
  version: 1,
  prospectIds: ids,
  approvedHoldReason: Contract.HELD_REVIEW_REASON,
});
// Only this synthetic cohort's authorization digest changes. Capture and fact
// replay, query review, transaction eligibility and projection remain real.
mock.module("@/server/utils/outbound/held-review-contract", () => ({
  ...Contract,
  HELD_REVIEW_MANIFEST_HASH: Contract.heldManifestHash(ids),
}));
const { db, schema } = await import("@/server/database");
const Review = await import("@/server/app/outbound/held-discovery-review");
const Capture = await import("@/server/utils/outbound/live-shopping");
const Draft = await import("@/server/utils/outbound/draft");
const Quality = await import("@/server/utils/outbound/copy-quality");
const Facts = await import("@/server/utils/outbound/shopping-discovery-review");
const { writerFixture } = await import("../helpers/outbound-writer-fixture");
const { buildSyntheticShoppingCapture } = await import(
  "../helpers/outbound-shopping-fixture"
);
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const hash = (input: unknown) =>
  createHash("sha256").update(JSON.stringify(input)).digest("hex");
await db.execute(
  sql`truncate outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook, outbound_campaign_company, outbound_campaign cascade`,
);
const actor = "synthetic-explicit-brand-review";
const policy = {
  ...writerFixture().policy,
  automationEnabled: false,
  allowProductObservations: false,
  searchesPerLead: 2 as const,
  linkedinEnabled: true,
};
await db.insert(schema.outboundPlaybook).values({
  id: "default",
  revision: 1,
  settings: policy,
  updatedBy: actor,
});
for (const [index, id] of ids.entries()) {
  const domain = `manual-brands-${index}.test`;
  const [company] = await db
    .insert(schema.outboundCompany)
    .values({
      name: "Sample Goods",
      domain,
      website: `https://${domain}`,
      country: "US",
      source: actor,
    })
    .returning();
  assert.ok(company);
  const [person] = await db
    .insert(schema.outboundPerson)
    .values({
      companyId: company.id,
      identityKey: randomUUID(),
      name: "Jamie Smith",
    })
    .returning();
  assert.ok(person);
  const details = prospectSchema.parse({
    ...writerFixture().prospect,
    id,
    company: "Sample Goods",
    domain,
    website: `https://${domain}`,
    product: "Marlow Tote",
    productUrl: `https://${domain}/products/marlow`,
    productCategory: "linen bags",
    email: `jamie@${domain}`,
    emailStatus: "verified",
    assignedSenderEmail: policy.fromEmail,
    source: actor,
  });
  const messages = ([1, 2, 3] as const).map((step) => ({
    step,
    afterDays: step === 1 ? 0 : 4,
    subject: "Synthetic original",
    body: "Preserve this original message.",
  }));
  await db.insert(schema.outboundProspect).values({
    id,
    companyId: company.id,
    personId: person.id,
    revision: 1,
    playbookRevision: 1,
    status: "held",
    holdReason: Contract.HELD_REVIEW_REASON,
    details,
    messages,
    createdBy: actor,
  });
  await db.insert(schema.outboundRevision).values({
    prospectId: id,
    revision: 1,
    contentHash: "synthetic-original",
    messages,
    revokedAt: new Date(),
    revokeReason: Contract.HELD_REVIEW_REASON,
    manifest: {
      recipient: details.email,
      sender: policy.fromEmail,
      fromName: policy.fromName,
      signature: policy.signature,
      postalAddress: policy.postalAddress,
      playbookRevision: 1,
      evidence: "Synthetic original.",
      evidenceCheckedAt: new Date().toISOString(),
    },
  });
}
const batch = value(await Review.start(actor, manifest));
await db.execute(
  sql`update outbound_integration_job set status='complete', output=jsonb_set(output,'{stage}','"complete"'::jsonb) where input->>'operation'='heldDiscoveryReview'`,
);
value(
  await Review.startSecondReview(
    actor,
    manifest,
    Contract.HELD_REVIEW_ROUND2_INSTRUCTION_HASH,
  ),
);
const [target] = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(sql`input->>'reviewRound'='2'`)
  .limit(1);
assert.ok(target);
const details = Contract.heldReviewInputSchema.parse(target.input);
const [prospect] = await db
  .select()
  .from(schema.outboundProspect)
  .where(eq(schema.outboundProspect.id, details.prospectId));
assert.ok(prospect);
// Synthetic provider-shaped cards model the real failure format without using live data.
const card = (index: number, title: string) =>
  `<div html-index="${index}" style="display:flex;align-items:center;gap:12px;padding:10px"><img src="data:image/jpeg;base64,AA==" alt="${title}" width="120" height="auto" style="object-fit:cover; border-radius: 0.5rem;" /><div style="flex:1"><div style="font-weight:bold"><a href="https://example.test/item-${index}">${title}</a></div><div style="margin-top:4px;font-size:18px">$30<span style="text-decoration: line-through;">$40</span></div><div>Synthetic Marketplace</div><div> </div></div><div style="display: none">${index.toString(16).padStart(32, "0")}</div></div>`;
const captured = await buildSyntheticShoppingCapture({
  prospect: prospect.details,
  answerText: `#### Linen bags\n\n${card(1, "Canvas Works Large Linen Bag")}\n\n${card(2, "Harbor Label Washable Carry Bag")}\n\n${card(3, "Meadow Goods Daily Linen Shopper")}`,
});
const query = captured.evidence.answer.job.query;
const queryReview = value(
  await Capture.reviewShopperQuery(
    {
      ...details,
      query,
      browser: captured.evidence.browser,
      deadline: Date.now() + 30000,
    },
    {
      review: async ({ prompt }) => ({
        status: "valid",
        reason: "Synthetic obvious product query.",
        checks: {
          naturalWordOrder: true,
          obviousProductCandidate: true,
          unbranded: true,
          productGrounding: true,
        },
        excerptIds: [JSON.parse(prompt).excerpts[0].id],
      }),
    },
  ),
);
assert.equal(queryReview.status, "valid");
const evidence = { ...captured.evidence, queryReview };
const assessed = Facts.projectUnrankedDiscoveryAbsence(evidence);
if (assessed.status !== "researched") throw new Error(assessed.reason);
const heldState = Contract.heldReviewStateSchema.parse({
  ...target.output,
  stage: "complete",
  shoppingQueryIntent: "unbranded-specific",
  shoppingQueryCount: 1,
  queryReservedAt: new Date().toISOString(),
  queryPurpose: "initial",
  query,
  queryReview,
  shoppingJob: evidence.answer.job,
  answer: evidence.answer,
  browser: evidence.browser,
  productCapture: evidence.browser,
  shoppingReceipt: assessed.receipt,
  heldReason: Contract.HELD_RESULT_BRAND_ERROR,
});
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "complete",
    error: Contract.HELD_RESULT_BRAND_ERROR,
    output: heldState,
  })
  .where(eq(schema.outboundIntegrationJob.id, target.id));
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: { queriesReserved: 1, paused: false } })
  .where(eq(schema.outboundIntegrationJob.id, batch.batchId));
const read = async () => {
  const [row] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, target.id));
  assert.ok(row);
  return row;
};
const original = await read();
const catalog = Facts.resultBrandCatalog(evidence);
const selection = Contract.heldResultBrandSelectionSchema.parse({
  decision: "supported",
  reason: "Explicit synthetic operator selection from the saved answer.",
  brands: ["Canvas Works", "Harbor Label", "Meadow Goods"].map((name) => {
    const quote = catalog.find((row) => row.quote.includes(name));
    assert.ok(quote);
    return { name, quoteId: quote.id };
  }),
});
const request = {
  manifest,
  jobId: target.id,
  instructionHash: Contract.HELD_REVIEW_ROUND2_INSTRUCTION_HASH,
  expectedOutputHash: hash(original.output),
  selection,
};
const preserved = async () => ({
  prospects: await db
    .select()
    .from(schema.outboundProspect)
    .orderBy(schema.outboundProspect.id),
  revisions: await db
    .select()
    .from(schema.outboundRevision)
    .orderBy(schema.outboundRevision.id),
  policy: await db.select().from(schema.outboundPlaybook),
  jobs: await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(ne(schema.outboundIntegrationJob.id, target.id))
    .orderBy(schema.outboundIntegrationJob.id),
  attempts: await db.select().from(schema.outboundSendAttempt),
  events: await db.select().from(schema.outboundEvent),
});
const frozen = await preserved();
const noCall = () => {
  throw new Error(
    "No provider or model is allowed during explicit reconciliation.",
  );
};
const providerSpies = [
  spyOn(Capture, "startQuery").mockImplementation(noCall),
  spyOn(Capture, "pollQuery").mockImplementation(noCall),
  spyOn(Capture, "generateShopperQuery").mockImplementation(noCall),
  spyOn(Draft, "composeSequence").mockImplementation(noCall),
  spyOn(Quality, "judgeSequenceCopy").mockImplementation(noCall),
  spyOn(Facts, "assessResultBrands").mockImplementation(noCall),
];
const dry = value(await Review.reconcileResultBrands(actor, request));
assert.equal(dry.reconciled, false);
assert.equal(dry.stage, "complete");
assert.deepEqual(await read(), original, "dry run is strictly read only");
assert.deepEqual(await preserved(), frozen);
for (const overrides of [
  { expectedOutputHash: "0".repeat(64) },
  { instructionHash: "0".repeat(64) },
  { jobId: randomUUID() },
  {
    selection: {
      ...selection,
      brands: [{ name: "Invented", quoteId: "unknown" }, selection.brands[1]],
    },
  },
]) {
  assert.equal(
    (
      await Review.reconcileResultBrands(actor, {
        ...request,
        ...overrides,
      } as typeof request)
    ).success,
    false,
  );
  assert.deepEqual(await read(), original);
}
assert.equal(
  (await Review.reconcileResultBrands("other-operator", request)).success,
  false,
);
for (const name of ["Synthetic Marketplace", "Canvas Works Large Linen Bag"]) {
  const brands = selection.brands.map((entry, index) =>
    index === 0 ? { ...entry, name } : entry,
  );
  assert.equal(
    (
      await Review.reconcileResultBrands(actor, {
        ...request,
        selection: { ...selection, brands },
      })
    ).success,
    false,
  );
}

const rejectState = async (
  changes: Record<string, unknown>,
  status: "complete" | "uncertain" = "complete",
) => {
  await db
    .update(schema.outboundIntegrationJob)
    .set({ status, output: { ...original.output, ...changes } })
    .where(eq(schema.outboundIntegrationJob.id, target.id));
  const changed = await read();
  const result = await Review.reconcileResultBrands(actor, {
    ...request,
    expectedOutputHash: hash(changed.output),
    execute: true,
  });
  assert.equal(result.success, false);
  assert.deepEqual(
    await read(),
    changed,
    "invalid state cannot mutate or reopen the job",
  );
  await db
    .update(schema.outboundIntegrationJob)
    .set({ status: original.status, output: original.output })
    .where(eq(schema.outboundIntegrationJob.id, target.id));
};
await rejectState({}, "uncertain");
await rejectState({ heldReason: "Unknown provider failure" });
const savedParts = writerFixture().parts;
await rejectState({
  writerCandidates: [
    {
      status: "unapproved",
      attempt: 1,
      parts: savedParts,
      issues: ["Synthetic rejected draft"],
      completedAt: new Date().toISOString(),
      partsHash: hash(savedParts),
      instructionsHash: "a".repeat(64),
      promptHash: "b".repeat(64),
      receiptHash: researchHash(assessed.receipt),
      writingPolicyHash: "c".repeat(64),
      prospectHash: "d".repeat(64),
      contextHash: "e".repeat(64),
    },
  ],
});

await rejectState({ shoppingQueryCount: 2 });
await rejectState({ queryPurpose: "broader" });
await rejectState({ productCapture: { status: "held", reason: "Missing" } });
await rejectState({
  answer: {
    ...evidence.answer,
    raw: evidence.answer.raw.map((raw, index) =>
      index ? raw : { ...raw, body: `${raw.body} tampered` },
    ),
  },
});
await rejectState({
  queryReview: { ...queryReview, queryHash: "0".repeat(64) },
});
await rejectState({
  query: {
    ...query,
    product: { ...query.product, url: "https://another.test/product" },
  },
});
const previousId = details.previousJobId;
assert.ok(previousId);
const [previous] = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(eq(schema.outboundIntegrationJob.id, previousId));
assert.ok(previous);
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: { ...previous.output, heldReason: "changed original" } })
  .where(eq(schema.outboundIntegrationJob.id, previousId));
assert.equal(
  (await Review.reconcileResultBrands(actor, { ...request, execute: true }))
    .success,
  false,
);
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: previous.output })
  .where(eq(schema.outboundIntegrationJob.id, previousId));
assert.deepEqual(
  await preserved(),
  frozen,
  "rejected requests leave original21, policy, history and budget untouched",
);
const staged = value(
  await Review.reconcileResultBrands(actor, { ...request, execute: true }),
);
assert.equal(staged.stage, "draft");
assert.equal(staged.reconciled, true);
const completed = await read();
assert.equal(completed.status, "pending");
assert.equal(completed.error, null);
const state = Contract.heldReviewStateSchema.parse(completed.output);
const audit = state.resultBrandReconciliation;
assert.ok(audit);
assert.deepEqual(audit.originalOutput, original.output);
assert.equal(audit.originalError, original.error);
assert.equal(audit.originalOutputHash, request.expectedOutputHash);
assert.equal(audit.originalReceiptHash, researchHash(assessed.receipt));
assert.equal(audit.receiptHash, researchHash(state.shoppingReceipt));
assert.deepEqual(audit.selection, selection);
assert.deepEqual(
  audit.selectedProof,
  state.shoppingReceipt?.claimExcerpts?.filter((quote) => quote.brand),
);
assert.equal(state.shoppingQueryCount, 1);
assert.equal(state.heldReason, undefined);
assert.equal(state.preview, undefined);
assert.equal(state.writerCandidates, undefined);
assert.equal(state.draftBeforeJudge, undefined);
assert.deepEqual(
  state.query,
  Contract.heldReviewStateSchema.parse(original.output).query,
);
assert.deepEqual(state.answer, evidence.answer);
assert.deepEqual(state.browser, evidence.browser);
assert.deepEqual(await preserved(), frozen);
assert.equal(
  value(
    await Review.reconcileResultBrands(actor, { ...request, execute: true }),
  ).repeated,
  true,
);
assert.deepEqual(
  await read(),
  completed,
  "same original output and exact selection cannot stage twice",
);
assert.equal(
  (
    await Review.reconcileResultBrands(actor, {
      ...request,
      selection: { ...selection, reason: "different selection audit" },
      execute: true,
    })
  ).success,
  false,
);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    output: {
      ...completed.output,
      resultBrandReconciliation: { ...audit, selectedProof: [] },
    },
  })
  .where(eq(schema.outboundIntegrationJob.id, target.id));
assert.equal(
  (await Review.reconcileResultBrands(actor, request)).success,
  false,
);
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: completed.output })
  .where(eq(schema.outboundIntegrationJob.id, target.id));
for (const provider of providerSpies) {
  assert.equal(provider.mock.calls.length, 0);
  provider.mockRestore();
}
assert.deepEqual(await preserved(), frozen);
console.log("Explicit brand reconciliation contracts passed");
process.exit(0);
