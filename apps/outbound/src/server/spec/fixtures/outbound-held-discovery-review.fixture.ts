import { mock, setSystemTime, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
const first = ids[0];
assert.ok(first);
const originalProspects = await db
  .select()
  .from(schema.outboundProspect)
  .orderBy(schema.outboundProspect.id);
const originalRevisions = await db
  .select()
  .from(schema.outboundRevision)
  .orderBy(
    schema.outboundRevision.prospectId,
    schema.outboundRevision.revision,
  );
const allJobs = () => db.select().from(schema.outboundIntegrationJob);
assert.equal(value(await Review.inspect(manifest)).exactHolds, 21);
assert.equal((await allJobs()).length, 0, "dry run must not create a job");
const wrong = await Review.start(actor, {
  ...manifest,
  prospectIds: [...ids.slice(0, 20), randomUUID()],
});
assert.equal(wrong.success, false);
assert.equal(
  (await allJobs()).length,
  0,
  "wrong manifest cannot create a budget",
);
const batch = value(await Review.start(actor, manifest));
assert.equal(value(await Review.start(actor, manifest)).batchId, batch.batchId);
assert.equal(value(await Review.status(batch.batchId)).counts.total, 21);
const jobFor = async (prospectId: string) => {
  const [job] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        eq(schema.outboundIntegrationJob.prospectId, prospectId),
        sql`${schema.outboundIntegrationJob.input}->>'operation' = 'heldDiscoveryReview'`,
      ),
    );
  assert.ok(job);
  return job;
};
const parkExcept = async (prospectId: string) => {
  await db.execute(
    sql`update outbound_integration_job set output=jsonb_set(output,'{availableAt}',to_jsonb(${new Date(Date.now() + 86_400_000).toISOString()}::text)) where input->>'operation'='heldDiscoveryReview' and prospect_id<>${prospectId}`,
  );
  await db.execute(
    sql`update outbound_integration_job set output=jsonb_set(output,'{availableAt}',to_jsonb(${new Date().toISOString()}::text)) where input->>'operation'='heldDiscoveryReview' and prospect_id=${prospectId}`,
  );
};
await parkExcept(first);
const calls = {
  starts: 0,
  polls: 0,
  browser: 0,
  product: 0,
  writer: 0,
  judge: 0,
};
let firstNoGap = true;
let secondNoGap = false;
let uncertainStart = false;
let lateStart = false;
let observeExpiredStart = false;
let uncertainJudge = false;
let failedJudge = false;
let duplicateParts: WriterParts | undefined;
let changeSenderDuringWriting = false;
const network = spyOn(globalThis, "fetch").mockImplementation(
  Object.assign(
    async () => {
      throw new Error("The held review fixture must not use the network.");
    },
    {
      preconnect: () => {
        throw new Error("The held review fixture must not preconnect.");
      },
    },
  ),
);
const dependencies: HeldReviewDependencies = {
  resolveKey: async () => ({ success: true, data: "synthetic-key" }),
  inspectProduct: async ({ product }) => {
    calls.product += 1;
    return { success: true, data: heldBrowser(product) };
  },
  generateQuery: heldQueryGenerator,
  start: async ({ query }) => {
    calls.starts += 1;
    if (uncertainStart)
      return {
        success: false,
        error: new IntegrationError(
          "scrapellm",
          "uncertain",
          "Synthetic disconnected submission.",
          502,
          null,
          null,
          { captured: "synthetic-disconnection" },
        ),
      };
    if (lateStart) {
      setSystemTime(new Date(Date.now() + 180_001));
      if (observeExpiredStart)
        assert.equal(
          value(await Review.runNext({ batchId: batch.batchId }, dependencies))
            .advanced,
          false,
        );
    }
    return {
      success: true,
      data: { id: randomUUID(), submittedAt: new Date().toISOString(), query },
    };
  },
  poll: async ({ job }) => {
    calls.polls += 1;
    return heldPoll(
      job,
      job.query.intent === "unbranded-specific" ? firstNoGap : secondNoGap,
    );
  },
  browse: async ({ productCapture }) => {
    calls.browser += 1;
    assert.equal(productCapture?.status, "captured");
    assert.ok(productCapture);
    return { success: true, data: productCapture };
  },
  assess: heldAssessment,
  generate: async ({ prompt }) => {
    calls.writer += 1;
    if (changeSenderDuringWriting)
      await db
        .update(schema.outboundPlaybook)
        .set({
          settings: { ...settings, fromName: "Changed synthetic author" },
        })
        .where(eq(schema.outboundPlaybook.id, "default"));
    if (duplicateParts) return duplicateParts;
    const query = z
      .object({ observedQuery: z.object({ query: z.string() }) })
      .parse(JSON.parse(prompt)).observedQuery.query;
    const relationship =
      ["sister", "friend", "brother", "father"][calls.writer - 1] ?? "mother";
    return {
      subject: "linen bags",
      opening: `My ${relationship} needed bags, so I asked for "${query}".`,
      result:
        "It picked Canvas Works and Harbor Label. Sample Goods didn't come up.",
      relevance: "That's the kind of search a new customer starts with.",
      followupFact: "",
    };
  },
  judge: async () => {
    calls.judge += 1;
    const [writing] = await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(
        and(
          eq(schema.outboundIntegrationJob.status, "starting"),
          sql`${schema.outboundIntegrationJob.output}->>'stage' = 'draft'`,
        ),
      );
    assert.ok(writing);
    assert.ok(
      Contract.heldReviewStateSchema.parse(writing.output).draftBeforeJudge,
      "Valid writer text must be durable before the judge is invoked.",
    );
    if (uncertainJudge) throw new Error("Synthetic interrupted judge.");
    const verdict = await passingCopyJudge();
    return failedJudge
      ? {
          ...verdict,
          naturalVoice: {
            passed: false,
            reason: "Synthetic voice review failed.",
          },
        }
      : verdict;
  },
};
const tick = async () => {
  setSystemTime(new Date(Date.now() + 31_000));
  return value(await Review.runNext({ batchId: batch.batchId }, dependencies));
};
const finish = async (prospectId: string, limit = 25) => {
  for (let index = 0; index < limit; index += 1) {
    const current = await jobFor(prospectId);
    if (["complete", "failed", "uncertain"].includes(current.status))
      return current;
    await tick();
  }
  throw new Error("Synthetic held review did not settle.");
};
// A ready continuation precedes an older unstarted browser job. A browser-only
// cooldown check does not repeatedly load full prospect eligibility contexts.
const initialRendered = await tick();
assert.ok(initialRendered.advanced);
assert.equal(initialRendered.stage, "renderedProduct");
const browserWaitingTarget = ids[20];
assert.ok(browserWaitingTarget);
await parkExcept(browserWaitingTarget);
const eligibilityReads = spyOn(Store, "getEnrichmentContext");
try {
  const blocked = value(
    await Review.runNext({ batchId: batch.batchId }, dependencies),
  );
  assert.equal(blocked.advanced, false);
  assert.equal(
    eligibilityReads.mock.calls.length,
    0,
    "A browser job in cooldown must be skipped before full eligibility reads.",
  );
} finally {
  eligibilityReads.mockRestore();
}
const browserDueAt = value(
  await Review.status(batch.batchId),
).browserAvailableAt;
assert.ok(browserDueAt);
setSystemTime(new Date(browserDueAt));
await parkExcept(first);
await db.execute(
  sql`update outbound_integration_job set output=jsonb_set(output,'{availableAt}',to_jsonb(${new Date().toISOString()}::text)) where input->>'operation'='heldDiscoveryReview' and prospect_id=${browserWaitingTarget}`,
);
const beforeContinuation = { ...calls };
const continuation = value(
  await Review.runNext({ batchId: batch.batchId }, dependencies),
);
assert.ok(continuation.advanced);
assert.equal(continuation.stage, "generateQuery");
assert.equal(continuation.jobId, (await jobFor(first)).id);
assert.equal(calls.product, beforeContinuation.product);
assert.equal(
  Contract.heldReviewStateSchema.parse(
    (await jobFor(browserWaitingTarget)).output,
  ).stage,
  "renderedProduct",
);
await parkExcept(first);
const complete = await finish(first);

assert.equal(
  complete.status,
  "complete",
  complete.error ?? JSON.stringify(complete.output),
);
const completed = Contract.heldReviewStateSchema.parse(complete.output);
assert.equal(completed.stage, "complete");
assert.equal(completed.shoppingQueryCount, 2);
assert.equal(completed.shoppingHistory?.length, 1);
assert.equal(
  completed.shoppingHistory?.[0]?.shoppingReceipt.selected.kind,
  "no-gap",
);
assert.equal(completed.shoppingReceipt?.selected.kind, "discovery-absence");
assert.equal(calls.starts, 2);
assert.equal(calls.writer, 1);
assert.equal(completed.composition, undefined);
assert.equal(completed.researchId, undefined);
assert.ok(completed.preview && completed.draftBeforeJudge);
assert.equal(completed.preview.status, "unapplied");
assert.equal(completed.preview.messages[0]?.writing?.quality?.passed, true);
assert.equal(completed.preview.messages[0]?.writing?.revision, null);
assert.equal(completed.preview.prospectRevision, 1);
assert.deepEqual(completed.preview.parts, completed.draftBeforeJudge.parts);
const afterCompleted = { ...calls };
assert.equal((await tick()).advanced, false);
assert.deepEqual(
  calls,
  afterCompleted,
  "Completed previews never repurchase a writer, judge or search.",
);
const [saved] = await db
  .select()
  .from(schema.outboundProspect)
  .where(eq(schema.outboundProspect.id, first));
assert.ok(saved);
assert.equal(saved.status, "held");
assert.equal(saved.holdReason, Contract.HELD_REVIEW_REASON);
assert.equal(saved.nextSendAt, null);
assert.equal(saved.approvedAt, null);
assert.equal(saved.messages.length, 3);
assert.deepEqual(saved.messages, oldMessages);
assert.equal(saved.revision, 1);
assert.equal(saved.details.shoppingResearchId, "");
assert.equal(saved.details.personalLine, "");
const originals = await db
  .select()
  .from(schema.outboundRevision)
  .where(
    and(
      eq(schema.outboundRevision.prospectId, first),
      eq(schema.outboundRevision.revision, 1),
    ),
  );
assert.deepEqual(originals[0]?.messages, oldMessages);
assert.equal(
  originals[0]?.revokedAt?.toISOString(),
  originalRevokedAt.toISOString(),
);
assert.equal(originals[0]?.revokeReason, Contract.HELD_REVIEW_REASON);
assert.equal((await db.select().from(schema.outboundSendAttempt)).length, 0);
const [livePolicy] = await db.select().from(schema.outboundPlaybook);
assert.deepEqual(livePolicy?.settings, settings);

// A correct broad answer is retained as evidence without any writer call.
const second = ids[1];
assert.ok(second);
await parkExcept(second);
secondNoGap = true;
const noGap = await finish(second);
assert.equal(
  noGap.status,
  "complete",
  noGap.error ?? JSON.stringify(noGap.output),
);
assert.equal(
  Contract.heldReviewStateSchema.parse(noGap.output).shoppingReceipt?.selected
    .kind,
  "no-gap",
);
assert.equal(calls.starts, 4);
assert.equal(calls.writer, 1);

// A disconnected POST is never automatically replayed, even after the lease ends.
const third = ids[2];
assert.ok(third);
await parkExcept(third);
uncertainStart = true;
const uncertain = await finish(third);
assert.equal(uncertain.status, "uncertain");
assert.equal(calls.starts, 5);
const uncertainState = Contract.heldReviewStateSchema.parse(uncertain.output);
assert.ok(uncertainState.queryReservedAt);
assert.deepEqual(uncertainState.failureReceipt, {
  captured: "synthetic-disconnection",
});
for (let attempt = 0; attempt < 3; attempt += 1) await tick();
assert.equal(calls.starts, 5);
assert.equal(value(await Review.start(actor, manifest)).batchId, batch.batchId);
assert.equal(value(await Review.status(batch.batchId)).queriesReserved, 5);

// A stale paid lease is uncertain before any provider is invoked.
const fourth = ids[3];
assert.ok(fourth);
await parkExcept(fourth);
const stale = await jobFor(fourth);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "starting",
    output: {
      ...Contract.heldReviewStateSchema.parse(stale.output),
      lease: {
        token: randomUUID(),
        expiresAt: new Date(Date.now() - 1).toISOString(),
      },
    },
  })
  .where(eq(schema.outboundIntegrationJob.id, stale.id));
await tick();
assert.equal((await jobFor(fourth)).status, "uncertain");
assert.equal(calls.starts, 5);

// Budget exhaustion blocks an otherwise validated first question before a start.
const fifth = ids[4];
assert.ok(fifth);
await parkExcept(fifth);
uncertainStart = false;
firstNoGap = false;
await tick();
await tick();
const ready = Contract.heldReviewStateSchema.parse(
  (await jobFor(fifth)).output,
);
assert.equal(ready.stage, "query");
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: { queriesReserved: 42, paused: false } })
  .where(eq(schema.outboundIntegrationJob.id, batch.batchId));
await tick();
assert.equal(calls.starts, 5);
assert.equal(
  Contract.heldReviewStateSchema.parse((await jobFor(fifth)).output)
    .shoppingQueryCount,
  0,
);

// A late acknowledged result remains durable even after its lease expires.
const sixth = ids[5];
assert.ok(sixth);
await parkExcept(sixth);
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: { queriesReserved: 5, paused: false } })
  .where(eq(schema.outboundIntegrationJob.id, batch.batchId));
lateStart = true;
const late = await finish(sixth);
assert.equal(late.status, "uncertain");
const lateState = Contract.heldReviewStateSchema.parse(late.output);
assert.ok(lateState.shoppingJob?.id);
assert.ok(lateState.queryReservedAt);
assert.equal(calls.starts, 6);
await tick();
assert.equal(calls.starts, 6);

// Browser stages share the durable 60-second held-batch slot and honor older batch cooldowns.
lateStart = false;
const seventh = ids[6];
const eighth = ids[7];
assert.ok(seventh && eighth);
await parkExcept(seventh);
const productBeforePacing = calls.product;
const cooldownUntil = Date.now() + 90_000;
await db.insert(schema.outboundIntegrationJob).values({
  provider: "automation",
  status: "complete",
  input: { operation: "syntheticExistingBrowserBatch" },
  output: { browserAvailableAt: new Date(cooldownUntil).toISOString() },
});
assert.equal(
  value(await Review.runNext({ batchId: batch.batchId }, dependencies))
    .advanced,
  false,
);
setSystemTime(new Date(cooldownUntil - 1));
assert.equal(
  value(await Review.runNext({ batchId: batch.batchId }, dependencies))
    .advanced,
  false,
);
setSystemTime(new Date(cooldownUntil));
assert.equal(
  value(await Review.runNext({ batchId: batch.batchId }, dependencies))
    .advanced,
  true,
);
assert.equal(calls.product, productBeforePacing + 1);
const browserReservedUntil = value(
  await Review.status(batch.batchId),
).browserAvailableAt;
assert.equal(
  browserReservedUntil,
  new Date(cooldownUntil + 60_000).toISOString(),
);
await parkExcept(eighth);
assert.equal(
  value(await Review.runNext({ batchId: batch.batchId }, dependencies))
    .advanced,
  false,
);
setSystemTime(new Date(cooldownUntil + 60_000));
assert.equal(
  value(await Review.runNext({ batchId: batch.batchId }, dependencies))
    .advanced,
  true,
);
assert.equal(calls.product, productBeforePacing + 2);

// Inject a concurrent edit only after the real claim transaction commits. Execution
// must perform its second real eligibility check before invoking a paid adapter.
const afterClaim = async (edit: () => Promise<void>) => {
  const original = db.transaction.bind(db);
  const commit = spyOn(db, "transaction");
  commit.mockImplementationOnce((async (operation, config) => {
    const result = await original(operation, config);
    assert.ok(
      result && typeof result === "object" && "job" in result,
      "Expected an actual committed held-stage claim.",
    );
    await edit();
    return result;
  }) as typeof db.transaction);
  try {
    return value(
      await Review.runNext({ batchId: batch.batchId }, dependencies),
    );
  } finally {
    commit.mockRestore();
  }
};
const pauseTarget = ids[10];
assert.ok(pauseTarget);
await parkExcept(pauseTarget);
setSystemTime(new Date(Date.now() + 60_000));
const callsBeforePause = { ...calls };
await afterClaim(async () => {
  const current = value(await Review.status(batch.batchId));
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      output: {
        queriesReserved: current.queriesReserved,
        browserAvailableAt: current.browserAvailableAt,
        paused: true,
      },
    })
    .where(eq(schema.outboundIntegrationJob.id, batch.batchId));
});
assert.deepEqual(calls, callsBeforePause);
assert.equal((await jobFor(pauseTarget)).status, "failed");
assert.match((await jobFor(pauseTarget)).error ?? "", /paused/);
const paused = value(await Review.status(batch.batchId));
await db
  .update(schema.outboundIntegrationJob)
  .set({
    output: {
      queriesReserved: paused.queriesReserved,
      browserAvailableAt: paused.browserAvailableAt,
      paused: false,
    },
  })
  .where(eq(schema.outboundIntegrationJob.id, batch.batchId));
for (const [target, campaignId, patch] of [
  [ids[8], changedCampaignId, { revision: 2 }],
  [ids[9], archivedCampaignId, { status: "archived" as const }],
] as const) {
  assert.ok(target);
  await parkExcept(target);
  setSystemTime(new Date(Date.now() + 60_000));
  const callsBeforeEdit = { ...calls };
  await afterClaim(async () => {
    await db
      .update(schema.outboundCampaign)
      .set(patch)
      .where(eq(schema.outboundCampaign.id, campaignId));
  });
  assert.deepEqual(calls, callsBeforeEdit);
  assert.equal((await jobFor(target)).status, "failed");
  assert.match(
    (await jobFor(target)).error ?? "",
    /campaign changed or was archived/,
  );
}

// Staging a preview replays its full raw proof and rejects an altered saved capture.
const tamperedTarget = ids[11];
assert.ok(tamperedTarget);
await parkExcept(tamperedTarget);
for (let step = 0; step < 15; step += 1) {
  if (
    Contract.heldReviewStateSchema.parse((await jobFor(tamperedTarget)).output)
      .stage === "draft"
  )
    break;
  await tick();
}
const tamperedJob = await jobFor(tamperedTarget);
const tamperedState = Contract.heldReviewStateSchema.parse(tamperedJob.output);
assert.equal(tamperedState.stage, "draft");
const originalRaw = tamperedState.answer?.raw[0];
assert.ok(originalRaw);
originalRaw.body += " synthetic tampering";
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: tamperedState })
  .where(eq(schema.outboundIntegrationJob.id, tamperedJob.id));
await tick();
assert.equal((await jobFor(tamperedTarget)).status, "failed");
const [unchangedTampered] = await db
  .select()
  .from(schema.outboundProspect)
  .where(eq(schema.outboundProspect.id, tamperedTarget));
assert.deepEqual(unchangedTampered?.messages, oldMessages);
assert.equal(unchangedTampered?.details.shoppingResearchId, "");

// A separate runner may observe expiry before the original POST acknowledges;
// the owning response still retains its job ID and can never be submitted again.
const watchedTarget = ids[12];
assert.ok(watchedTarget);
await parkExcept(watchedTarget);
lateStart = true;
observeExpiredStart = true;
const startsBeforeWatched = calls.starts;
const watched = await finish(watchedTarget);
assert.equal(watched.status, "uncertain");
assert.ok(Contract.heldReviewStateSchema.parse(watched.output).shoppingJob?.id);
assert.equal(calls.starts, startsBeforeWatched + 1);
await tick();
assert.equal(calls.starts, startsBeforeWatched + 1);
lateStart = false;
observeExpiredStart = false;

// A disconnected judge retains validated writer output and never repurchases it.
const interruptedTarget = ids[13];
assert.ok(interruptedTarget);
await parkExcept(interruptedTarget);
uncertainJudge = true;
const interrupted = await finish(interruptedTarget);
assert.equal(interrupted.status, "uncertain");
const interruptedState = Contract.heldReviewStateSchema.parse(
  interrupted.output,
);
assert.ok(interruptedState.previewContext && interruptedState.draftBeforeJudge);
assert.equal(interruptedState.preview, undefined);
const afterInterrupted = { ...calls };
for (let retry = 0; retry < 3; retry += 1) await tick();
assert.deepEqual(calls, afterInterrupted);
uncertainJudge = false;

// A completed failed verdict is a durable unapplied preview, not a repeat purchase.
const failedTarget = ids[14];
assert.ok(failedTarget);
await parkExcept(failedTarget);
failedJudge = true;
const failedPreview = await finish(failedTarget);
assert.equal(failedPreview.status, "complete");
const failedPreviewState = Contract.heldReviewStateSchema.parse(
  failedPreview.output,
);
assert.equal(
  failedPreviewState.preview?.messages[0]?.writing?.quality?.passed,
  false,
);
assert.match(failedPreviewState.heldReason ?? "", /^Copy:/);
const afterFailed = { ...calls };
await tick();
assert.deepEqual(calls, afterFailed);
failedJudge = false;

// Staged previews participate in the same first-nine variety checks, even though
// no published prospect message has received the new opening.
const repeatedTarget = ids[15];
assert.ok(repeatedTarget && failedPreviewState.preview);
await parkExcept(repeatedTarget);
duplicateParts = failedPreviewState.preview.parts;
const beforeRepeated = { ...calls };
const repeated = await finish(repeatedTarget);
assert.equal(repeated.status, "failed");
assert.match(
  repeated.error ?? "",
  /opening:.*(?:within ten|already used|repeated)/,
);
assert.equal(
  calls.writer,
  beforeRepeated.writer + 2,
  "One bounded repair may not bypass staged opening variety.",
);
assert.equal(calls.judge, beforeRepeated.judge);
assert.ok(
  Contract.heldReviewStateSchema
    .parse(repeated.output)
    .previewContext?.peers.some(
      (peer) => peer.opening === duplicateParts?.opening,
    ),
);
duplicateParts = undefined;
const afterRepeated = { ...calls };
await tick();
assert.deepEqual(calls, afterRepeated);

// A sender edit after the writer started stops the judge and retains its text.
const senderChangedTarget = ids[16];
assert.ok(senderChangedTarget);
await parkExcept(senderChangedTarget);
changeSenderDuringWriting = true;
const judgesBeforeSenderEdit = calls.judge;
const senderChanged = await finish(senderChangedTarget);
assert.equal(senderChanged.status, "failed");
assert.match(senderChanged.error ?? "", /sender policy changed/);
assert.ok(
  Contract.heldReviewStateSchema.parse(senderChanged.output).draftBeforeJudge,
);
assert.equal(calls.judge, judgesBeforeSenderEdit);
changeSenderDuringWriting = false;
await db
  .update(schema.outboundPlaybook)
  .set({ settings })
  .where(eq(schema.outboundPlaybook.id, "default"));

// Independent operations share one durable slot, including concurrent claims.
const pacing = () =>
  db.transaction(async (scope) => {
    await scope.execute(
      sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
    );
    return claimShoppingProviderSlot(scope);
  });
const simultaneous = await Promise.all([pacing(), pacing()]);
assert.deepEqual([...simultaneous].sort(), [false, true]);
setSystemTime(new Date(Date.now() + 15_000));
assert.equal(await pacing(), true);

// All original explicit holds, sender assignments and absence of sends survive.
const cohort = await db.select().from(schema.outboundProspect);
assert.equal(cohort.length, 21);
assert.ok(
  cohort.every(
    (prospect) =>
      prospect.status === "held" &&
      prospect.holdReason === Contract.HELD_REVIEW_REASON &&
      prospect.nextSendAt === null &&
      prospect.approvedAt === null &&
      prospect.approvedBy === null &&
      prospect.approvalHash === null &&
      prospect.details.assignedSenderEmail === settings.fromEmail,
  ),
);
assert.deepEqual(
  await db
    .select()
    .from(schema.outboundProspect)
    .orderBy(schema.outboundProspect.id),
  originalProspects,
  "Staging must not write any original prospect field, timestamp, revision or message.",
);
assert.deepEqual(
  await db
    .select()
    .from(schema.outboundRevision)
    .orderBy(
      schema.outboundRevision.prospectId,
      schema.outboundRevision.revision,
    ),
  originalRevisions,
);
assert.equal((await db.select().from(schema.outboundEvent)).length, 0);
assert.deepEqual(
  (await db.select().from(schema.outboundPlaybook))[0]?.settings,
  settings,
);
assert.equal(
  (
    await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(ne(schema.outboundIntegrationJob.provider, "automation"))
  ).length,
  0,
);
setSystemTime();
assert.equal(network.mock.calls.length, 0);
console.log(
  "Held discovery review contracts passed: exact manifest, durable broad branch, unapplied preview, unchanged live rows, no-gap, uncertain writer/judge and budget.",
);
process.exit(0);
