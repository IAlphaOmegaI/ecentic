import { mock, setSystemTime, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { prospectSchema } from "@/lib/outbound";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
import type { WriterParts } from "@/lib/outbound-composition";
import type { HeldReviewDependencies } from "@/server/app/outbound/held-discovery-review";
import { IntegrationError } from "@/server/utils/outbound/http";
import { requireTestDatabase } from "../helpers/database";

const endpoint = requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const Capture = await import("@/server/utils/outbound/live-shopping");
const Presence = await import("@/server/utils/outbound/shopping-presence");
const Assessment = await import("@/server/utils/outbound/shopping-assessment");
const { shopperQueryExcerpts } = await import(
  "@/server/utils/outbound/shopper-query"
);
const Contract = await import("@/server/utils/outbound/held-review-contract");
const ids = Array.from({ length: 21 }, () => randomUUID());
const manifest = Contract.heldReviewManifestSchema.parse({
  version: 1,
  prospectIds: ids,
  approvedHoldReason: Contract.HELD_REVIEW_REASON,
});
// Only the authorization digest is replaced in this isolated synthetic process.
// All raw capture, claim, lease, writer and quality validators remain real.
mock.module("@/server/utils/outbound/held-review-contract", () => ({
  ...Contract,
  HELD_REVIEW_MANIFEST_HASH: Contract.heldManifestHash(ids),
}));
const { db, schema } = await import("@/server/database");
// Smoke suites deliberately share one disposable database; this fixture owns
// its synthetic cohort and cannot inherit the prior suite's jobs or contacts.
await db.execute(
  sql`truncate outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook, outbound_campaign_company, outbound_campaign cascade`,
);
const Review = await import("@/server/app/outbound/held-discovery-review");
const Store = await import("@/server/app/outbound/store");
const { claimShoppingProviderSlot } = await import(
  "@/server/app/outbound/shopping-provider-pacing"
);
const { heldBrowser, heldQueryGenerator, heldPoll, heldAssessment } =
  await import("../helpers/outbound-held-review-fixture");
const { writerFixture, passingCopyJudge } = await import(
  "../helpers/outbound-writer-fixture"
);
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const actor = "synthetic-held-review-fixture";
const settings = {
  ...writerFixture().policy,
  automationEnabled: false,
  allowProductObservations: false,
  searchesPerLead: 2 as const,
  linkedinEnabled: true,
};
const oldMessages = ([1, 2, 3] as const).map((step) => ({
  step,
  afterDays: step === 1 ? 0 : 4,
  subject: "Historic synthetic draft",
  body: "Old draft retained for comparison.",
}));
const originalRevokedAt = new Date("2026-11-20T12:00:00.000Z");
await db
  .insert(schema.outboundPlaybook)
  .values({ id: "default", revision: 1, settings, updatedBy: actor });
const changedCampaignId = randomUUID();
const archivedCampaignId = randomUUID();
for (const id of [changedCampaignId, archivedCampaignId])
  await db.insert(schema.outboundCampaign).values({
    id,
    name: "Synthetic held campaign",
    status: "paused",
    revision: 1,
    criteria: defaultCampaignCriteria(settings),
    createdBy: actor,
    updatedBy: actor,
  });
for (const [index, id] of ids.entries()) {
  const domain = `held${index}.test`;
  const companyName = "Sample Goods";
  const [company] = await db
    .insert(schema.outboundCompany)
    .values({
      name: companyName,
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
  await db.insert(schema.outboundProspect).values({
    id,
    companyId: company.id,
    personId: person.id,
    campaignId:
      index === 8 ? changedCampaignId : index === 9 ? archivedCampaignId : null,
    revision: 1,
    playbookRevision: 1,
    status: "held",
    holdReason: Contract.HELD_REVIEW_REASON,
    details: prospectSchema.parse({
      ...writerFixture().prospect,
      company: companyName,
      id,
      domain,
      website: `https://${domain}`,
      product: "Marlow Tote",
      productUrl: `https://${domain}/products/marlow`,
      productCategory: "linen bags",
      email: `jamie@${domain}`,
      emailStatus: "verified",
      assignedSenderEmail: settings.fromEmail,
      source: actor,
    }),
    messages: oldMessages,
    createdBy: actor,
  });
  await db.insert(schema.outboundRevision).values({
    prospectId: id,
    revision: 1,
    contentHash: "synthetic-original",
    messages: oldMessages,
    revokedAt: originalRevokedAt,
    revokeReason: Contract.HELD_REVIEW_REASON,
    manifest: {
      recipient: `jamie@${domain}`,
      sender: settings.fromEmail,
      fromName: settings.fromName,
      signature: settings.signature,
      postalAddress: settings.postalAddress,
      playbookRevision: 1,
      evidence: "Synthetic historic draft.",
      evidenceCheckedAt: new Date().toISOString(),
    },
  });
}

const originalProspects = await db
  .select()
  .from(schema.outboundProspect)
  .orderBy(schema.outboundProspect.id);
const originalPolicy = await Store.policy();
const batch = value(await Review.start(actor, manifest));
const originals = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(sql`input->>'operation'='heldDiscoveryReview'`);
for (const [index, job] of originals.entries()) {
  const input = Contract.heldReviewInputSchema.parse(job.input);
  const productCapture = heldBrowser(input.product);
  const generated = value(
    await heldQueryGenerator({
      ...input,
      browser: productCapture,
      deadline: Date.now() + 150000,
      intent: "unbranded-specific",
      queryStyle: settings.queryStyle,
    }),
  );
  assert.equal(generated.status, "prepared");

  const query = generated.query;
  const shoppingJob =
    index < 3
      ? value(
          await Capture.startQuery(
            { apiKey: "synthetic", query },
            {
              request: async () => ({
                success: true,
                data: Response.json(
                  { job_id: randomUUID(), status: "pending" },
                  { status: 202 },
                ),
              }),
            },
          ),
        )
      : undefined;
  const polled =
    shoppingJob && index !== 2
      ? value(await heldPoll(shoppingJob, false))
      : undefined;
  assert.ok(!polled || polled.status === "captured");
  const answer = polled?.status === "captured" ? polled.capture : undefined;
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "complete",
      output: Contract.heldReviewStateSchema.parse({
        ...job.output,
        stage: "complete",
        productCapture,
        shoppingQueryCount: shoppingJob ? 1 : 0,
        ...(shoppingJob
          ? {
              query,
              shoppingJob,
              answer,
              browser: answer ? productCapture : undefined,
              queryReservedAt: new Date().toISOString(),
            }
          : {}),
        heldReason: "Original synthetic review retained.",
      }),
    })
    .where(eq(schema.outboundIntegrationJob.id, job.id));
}
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: { queriesReserved: 3, paused: false } })
  .where(eq(schema.outboundIntegrationJob.id, batch.batchId));
const frozen = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(sql`input->>'operation'='heldDiscoveryReview'`)
  .orderBy(schema.outboundIntegrationJob.id);
assert.equal(
  (await Review.startSecondReview(actor, manifest, "0".repeat(64))).success,
  false,
);
const second = value(
  await Review.startSecondReview(
    actor,
    manifest,
    Contract.HELD_REVIEW_ROUND2_INSTRUCTION_HASH,
  ),
);
assert.equal(second.queriesReserved, 3);
assert.equal(
  value(
    await Review.startSecondReview(
      actor,
      manifest,
      Contract.HELD_REVIEW_ROUND2_INSTRUCTION_HASH,
    ),
  ).repeated,
  true,
);
assert.equal(value(await Review.status(batch.batchId, 2)).counts.total, 21);
assert.equal(value(await Review.status(batch.batchId, 1)).counts.total, 21);
const secondJob = async (prospectId: string) => {
  const [job] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        eq(schema.outboundIntegrationJob.prospectId, prospectId),
        sql`input->>'reviewRound'='2'`,
      ),
    );
  assert.ok(job);
  return job;
};
const focus = async (prospectId: string) => {
  await db.execute(
    sql`update outbound_integration_job set output=jsonb_set(output,'{availableAt}',to_jsonb(${new Date(Date.now() + 86400000).toISOString()}::text)) where input->>'reviewRound'='2'`,
  );
  await db.execute(
    sql`update outbound_integration_job set output=jsonb_set(output,'{availableAt}',to_jsonb(${new Date().toISOString()}::text)) where input->>'reviewRound'='2' and prospect_id=${prospectId}`,
  );
};
const semantic = (prompt: string, valid: boolean) => ({
  status: valid ? ("valid" as const) : ("invalid" as const),
  reason: valid
    ? "Natural grounded product query."
    : "Synthetic query describes an accessory, not this product.",
  checks: {
    naturalWordOrder: true,
    obviousProductCandidate: valid,
    unbranded: true,
    productGrounding: true,
  },
  excerptIds: [JSON.parse(prompt).excerpts[0].id],
});
const calls = { starts: 0 };
const validDependencies: HeldReviewDependencies = {
  reviewQuery: (input) =>
    Capture.reviewShopperQuery(input, {
      review: async ({ prompt }) => semantic(prompt, true),
    }),
  generateQuery: (input) =>
    Capture.generateShopperQuery(input, {
      generate: async ({ prompt }) => ({
        question: "linen bags",
        category: "bag",
        attribute: "linen",
        excerptIds: [JSON.parse(prompt).excerpts[0].id],
      }),
      review: async ({ prompt }) => semantic(prompt, true),
    }),
  resolveKey: async () => ({ success: true, data: "synthetic" }),
  start: async (input) => {
    calls.starts++;
    return Capture.startQuery(input, {
      request: async () => ({
        success: true,
        data: Response.json(
          { job_id: randomUUID(), status: "pending" },
          { status: 202 },
        ),
      }),
    });
  },
};
const reuse = originals[0];
assert.ok(reuse?.prospectId);
await focus(reuse.prospectId);
assert.equal(
  value(
    await Review.runNext(
      { batchId: batch.batchId, reviewRound: 2 },
      validDependencies,
    ),
  ).advanced,
  true,
);
assert.equal((await secondJob(reuse.prospectId)).output?.["stage"], "assess");
assert.equal(calls.starts, 0, "valid captured query cannot be repurchased");
const Facts = await import("@/server/utils/outbound/shopping-discovery-review");
const copyDependencies: HeldReviewDependencies = {
  ...validDependencies,
  assessBrands: async (input) => {
    const catalog = Facts.resultBrandCatalog(input);
    return {
      success: true,
      data: Facts.projectResultBrands(input, input.receipt, {
        decision: "supported",
        reason: "Synthetic exact answer brand selection.",
        brands: ["Canvas Works", "Harbor Label"].map((name) => {
          const quote = catalog.find((row) => row.quote.includes(name));
          assert.ok(quote);
          return { name, quoteId: quote.id };
        }),
      }),
    };
  },
  generate: async ({ prompt }) => {
    const query = JSON.parse(prompt).observedQuery.query;
    return {
      subject: "linen bags",
      opening: `My sister needed bags, so I asked for "${query}".`,
      result:
        "It picked Canvas Works and Harbor Label. Sample Goods didn't come up.",
      relevance: "That's the kind of search a new customer starts with.",
    };
  },
  judge: passingCopyJudge,
};
for (const stage of ["brands", "draft", "complete"]) {
  value(
    await Review.runNext(
      { batchId: batch.batchId, reviewRound: 2 },
      copyDependencies,
    ),
  );
  const current = await secondJob(reuse.prospectId);
  assert.equal(
    current.output?.["stage"],
    stage,
    JSON.stringify({ error: current.error, output: current.output }),
  );
}
const preview = Contract.heldReviewStateSchema.parse(
  (await secondJob(reuse.prospectId)).output,
).preview;
assert.ok(preview);
assert.equal(preview.messages[1]?.body, "Bumping this!");
assert.equal(preview.messages[2]?.body, "Jamie?");
assert.equal(preview.messages[1]?.afterDays, 3);
assert.equal(preview.messages[2]?.afterDays, 7);
assert.equal(calls.starts, 0);

// Retrospective synthetic diagnostics: current raw/context remain real fixture
// outputs; only the completed old-parser rejection record is synthesized.
const seedCachedCandidate = async (prospectId: string, opening: string) => {
  const job = await secondJob(prospectId);
  const saved = Contract.heldReviewStateSchema.parse(job.output);
  const base = saved.writerCandidates?.[0];
  assert.ok(base && saved.previewContext);
  const parts = {
    ...base.parts,
    opening,
    result:
      "That answer picked Canvas Works and Harbor Label. Sample Goods didn't come up in the captured answer.",
  };
  const partsHash = createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("hex");
  const issues = [
    "result: “captured” is not supported by the observed ledger.",
  ];
  const error = `Copy: ${issues.join(" ")}`;
  const {
    preview: _preview,
    draftBeforeJudge: _draft,
    writerCandidateRecovery: _recovery,
    ...retained
  } = saved;
  const state = Contract.heldReviewStateSchema.parse({
    ...retained,
    stage: "draft",
    lease: null,
    heldReason: error,
    writerCandidates: [1, 2].map((attempt) => ({
      ...base,
      attempt,
      parts,
      partsHash,
      issues,
    })),
  });
  const restore = () =>
    db
      .update(schema.outboundIntegrationJob)
      .set({ status: "failed", error, output: state })
      .where(eq(schema.outboundIntegrationJob.id, job.id));
  await restore();
  return {
    job,
    state,
    parts,
    restore,
    request: {
      manifest,
      jobId: job.id,
      expectedCandidatePartsHash: partsHash,
      reviewRound: 2 as const,
      instructionHash: Contract.HELD_REVIEW_ROUND2_INSTRUCTION_HASH,
    },
  };
};
const recoverCached = async (
  cached: Awaited<ReturnType<typeof seedCachedCandidate>>,
  uncertain = false,
) => {
  const before = await secondJob(cached.job.prospectId!);
  const budget = value(await Review.status(batch.batchId, 2)).queriesReserved;
  assert.equal(
    (
      await Review.reconcileWriterCandidate(actor, {
        ...cached.request,
        reviewRound: 1,
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await Review.reconcileWriterCandidate(actor, {
        ...cached.request,
        instructionHash: "0".repeat(64),
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await Review.reconcileWriterCandidate(actor, {
        ...cached.request,
        expectedCandidatePartsHash: "0".repeat(64),
      })
    ).success,
    false,
  );
  assert.equal(
    value(await Review.reconcileWriterCandidate(actor, cached.request))
      .newWriterCalls,
    0,
  );
  assert.deepEqual(await secondJob(cached.job.prospectId!), before);
  for (const patch of [
    { shoppingQueryCount: cached.state.shoppingQueryCount === 1 ? 2 : 1 },
    { queryReview: { ...cached.state.queryReview, status: "invalid" } },
    {
      answer: {
        ...cached.state.answer,
        raw: cached.state.answer?.raw.map((raw, index) =>
          index ? raw : { ...raw, body: `${raw.body} tampered` },
        ),
      },
    },
    {
      writerCandidates: cached.state.writerCandidates?.map((candidate) => ({
        ...candidate,
        parts: { ...candidate.parts, result: "Tampered name" },
      })),
    },
  ]) {
    await db
      .update(schema.outboundIntegrationJob)
      .set({ output: { ...cached.state, ...patch } })
      .where(eq(schema.outboundIntegrationJob.id, cached.job.id));
    assert.equal(
      (
        await Review.reconcileWriterCandidate(actor, {
          ...cached.request,
          execute: true,
        })
      ).success,
      false,
    );
    await cached.restore();
  }
  value(
    await Review.reconcileWriterCandidate(actor, {
      ...cached.request,
      execute: true,
    }),
  );
  const staged = Contract.heldReviewStateSchema.parse(
    (await secondJob(cached.job.prospectId!)).output,
  );
  assert.equal(staged.writerCandidateRecovery?.reviewRound, 2);
  assert.equal(
    staged.writerCandidateRecovery?.instructionHash,
    Contract.HELD_REVIEW_ROUND2_INSTRUCTION_HASH,
  );
  assert.ok(staged.writerCandidateRecovery?.reviewProofHash);
  assert.deepEqual(staged.writerCandidates, cached.state.writerCandidates);
  assert.equal(
    (
      await Review.reconcileWriterCandidate(actor, {
        ...cached.request,
        execute: true,
      })
    ).success,
    false,
  );
  await focus(cached.job.prospectId!);
  let judges = 0;
  const forbidden = async () => {
    throw new Error(
      "Cached recovery must not buy a writer, query or browser step.",
    );
  };
  const dependencies: HeldReviewDependencies = {
    generate: forbidden,
    start: forbidden,
    poll: forbidden,
    browse: forbidden,
    inspectProduct: forbidden,
    generateQuery: forbidden,
    reviewQuery: forbidden,
    assess: forbidden,
    assessBrands: forbidden,
    judge: async () => {
      judges++;
      if (uncertain)
        throw new IntegrationError(
          "azure",
          "uncertain",
          "Synthetic first judge interruption.",
        );
      return passingCopyJudge();
    },
  };
  value(
    await Review.runNext(
      { batchId: batch.batchId, reviewRound: 2 },
      dependencies,
    ),
  );
  const finished = await secondJob(cached.job.prospectId!);
  const state = Contract.heldReviewStateSchema.parse(finished.output);
  assert.equal(judges, 1, JSON.stringify({ error: finished.error, state }));
  assert.equal(finished.status, uncertain ? "uncertain" : "complete");
  assert.equal(state.draftBeforeJudge?.generation.attempts, 2);
  assert.deepEqual(state.draftBeforeJudge?.parts, cached.parts);
  assert.deepEqual(state.writerCandidates, cached.state.writerCandidates);
  assert.deepEqual(state.answer, cached.state.answer);
  assert.deepEqual(state.priorPurchase, cached.state.priorPurchase);
  assert.equal(state.shoppingQueryCount, cached.state.shoppingQueryCount);
  assert.equal(
    value(await Review.status(batch.batchId, 2)).queriesReserved,
    budget,
  );
  assert.equal(
    (
      await Review.reconcileWriterCandidate(actor, {
        ...cached.request,
        execute: true,
      })
    ).success,
    false,
  );
  assert.equal(
    value(
      await Review.runNext(
        { batchId: batch.batchId, reviewRound: 2 },
        dependencies,
      ),
    ).advanced,
    false,
  );
  assert.equal(
    judges,
    1,
    "Neither a completed nor uncertain first judge can be replayed.",
  );
};
const reuseState = Contract.heldReviewStateSchema.parse(
  (await secondJob(reuse.prospectId)).output,
);
assert.equal(reuseState.shoppingQueryCount, 1);
const reusedCached = await seedCachedCandidate(
  reuse.prospectId,
  `A cousin needed bags, so I asked for "${reuseState.query!.prompt}".`,
);
await recoverCached(reusedCached);
assert.equal(calls.starts, 0);

const correction = originals[1];
assert.ok(correction?.prospectId);
await focus(correction.prospectId);
value(
  await Review.runNext(
    { batchId: batch.batchId, reviewRound: 2 },
    {
      ...validDependencies,
      reviewQuery: (input) =>
        Capture.reviewShopperQuery(input, {
          review: async ({ prompt }) => semantic(prompt, false),
        }),
    },
  ),
);
assert.equal(
  (await secondJob(correction.prospectId)).output?.["queryPurpose"],
  "correction",
);
value(
  await Review.runNext(
    { batchId: batch.batchId, reviewRound: 2 },
    validDependencies,
  ),
);
assert.equal(
  (await secondJob(correction.prospectId)).output?.["stage"],
  "query",
);
value(
  await Review.runNext(
    { batchId: batch.batchId, reviewRound: 2 },
    validDependencies,
  ),
);
assert.equal(
  calls.starts,
  1,
  "invalid original query gets exactly one corrected purchase",
);
assert.equal(
  (await secondJob(correction.prospectId)).output?.["shoppingQueryCount"],
  2,
);
assert.equal(value(await Review.status(batch.batchId, 2)).queriesReserved, 4);
// Continue the already acknowledged corrected query using injected captures;
// the recovery checks both this answer and its preserved invalid-query history.
await focus(correction.prospectId);
setSystemTime(new Date(Date.now() + 45000));
const correctedDeps: HeldReviewDependencies = {
  ...copyDependencies,
  poll: (input) => heldPoll(input.job, false),
  browse: async (input) => ({ success: true, data: input.productCapture! }),
  assess: heldAssessment,
  generate: async ({ prompt }) => ({
    subject: "linen bags",
    opening: `I wanted a travel bag, so I asked for "${JSON.parse(prompt).observedQuery.query}".`,
    result:
      "It picked Canvas Works and Harbor Label. Sample Goods didn't come up.",
    relevance: "That's the kind of search a new customer starts with.",
  }),
};
for (
  let index = 0;
  index < 6 &&
  (await secondJob(correction.prospectId)).output?.["stage"] !== "complete";
  index++
) {
  await focus(correction.prospectId);
  value(
    await Review.runNext(
      { batchId: batch.batchId, reviewRound: 2 },
      correctedDeps,
    ),
  );
}
const correctedComplete = await secondJob(correction.prospectId);
assert.equal(
  correctedComplete.status,
  "complete",
  correctedComplete.error ?? JSON.stringify(correctedComplete.output),
);
const correctedState = Contract.heldReviewStateSchema.parse(
  correctedComplete.output,
);
assert.equal(correctedState.shoppingQueryCount, 2);
assert.equal(correctedState.shoppingReceipt?.captureHistory?.length, 1);
const correctedCached = await seedCachedCandidate(
  correction.prospectId,
  `I wanted a travel bag, so I asked for "${correctedState.query!.prompt}".`,
);
await recoverCached(correctedCached, true);
assert.equal(calls.starts, 1);

const failedProvider = originals[2];
assert.ok(failedProvider?.prospectId);
await focus(failedProvider.prospectId);
value(
  await Review.runNext(
    { batchId: batch.batchId, reviewRound: 2 },
    validDependencies,
  ),
);
assert.equal(
  (await secondJob(failedProvider.prospectId)).output?.["stage"],
  "complete",
);
assert.equal(
  calls.starts,
  1,
  "valid query without a completed answer cannot be repurchased",
);
const fresh = originals[3];
assert.ok(fresh?.prospectId);
await focus(fresh.prospectId);
value(
  await Review.runNext(
    { batchId: batch.batchId, reviewRound: 2 },
    validDependencies,
  ),
);
assert.equal((await secondJob(fresh.prospectId)).output?.["stage"], "query");
// A tampered prior capture must fail before a second provider submission.
const changed = await secondJob(correction.prospectId);
const modified = Contract.heldReviewStateSchema.parse(changed.output);
assert.ok(modified.priorPurchase);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "pending",
    output: {
      ...modified,
      stage: "query",
      queryReservedAt: undefined,
      priorPurchase: { ...modified.priorPurchase, failureReason: "tampered" },
    },
  })
  .where(eq(schema.outboundIntegrationJob.id, changed.id));
await focus(correction.prospectId);
value(
  await Review.runNext(
    { batchId: batch.batchId, reviewRound: 2 },
    validDependencies,
  ),
);
assert.equal((await secondJob(correction.prospectId)).status, "failed");
assert.equal(calls.starts, 1);
assert.deepEqual(
  await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(
      sql`input->>'operation'='heldDiscoveryReview' and input->>'reviewRound' is null`,
    )
    .orderBy(schema.outboundIntegrationJob.id),
  frozen,
);
assert.deepEqual(
  await db
    .select()
    .from(schema.outboundProspect)
    .orderBy(schema.outboundProspect.id),
  originalProspects,
);
assert.deepEqual(await Store.policy(), originalPolicy);
assert.equal((await db.select().from(schema.outboundSendAttempt)).length, 0);
console.log("Second held review contracts passed");
process.exit(0);
