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
  const companyName = index === 19 ? "Pattern Beauty" : "Sample Goods";
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
      ...(index >= 17
        ? {
            product: "V-Front Extended Sleeves Top - Limited Edition",
            productCategory: "top",
          }
        : {}),
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
  queryGenerations: 0,
  queryRepairs: 0,
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
let repairOutcome: "valid" | "invalid" | "uncertain" = "valid";
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
  generateQuery: (input) => {
    calls.queryGenerations += 1;
    return heldQueryGenerator(input);
  },
  repairQuery: (input) =>
    Capture.repairShopperQuery(input, {
      generate: async ({ prompt }) => {
        calls.queryRepairs += 1;
        if (repairOutcome === "uncertain")
          throw new Error("Synthetic interrupted remaining query repair.");
        const parsed = z
          .object({ excerpts: z.array(z.object({ id: z.string() })).min(1) })
          .parse(JSON.parse(prompt));
        const excerpt = parsed.excerpts[0];
        assert.ok(excerpt);
        return repairOutcome === "invalid"
          ? {
              question: "sheer stretch mesh fabric",
              category: "fabric",
              attribute: "sheer stretch mesh",
              excerptIds: [excerpt.id],
            }
          : {
              question: "stretch mesh top",
              category: "top",
              attribute: "stretch mesh",
              excerptIds: [excerpt.id],
            };
      },
    }),
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

// These three isolated jobs model a known first candidate accepted before the
// category-identity guard existed. No fresh first candidate is generated here.
const seedUnspentCategoryCandidate = async (prospectId: string) => {
  const job = await jobFor(prospectId);
  const input = Contract.heldReviewInputSchema.parse(job.input);
  const productCapture = heldBrowser(
    input.product,
    `${input.product.name}. This top is made from sheer stretch mesh fabric.`,
  );
  const excerpts = shopperQueryExcerpts({
    product: input.product,
    category: input.category,
    merchant: input.merchant,
    browser: productCapture,
  });
  const excerpt = excerpts?.[0];
  assert.ok(excerpt);
  const query = Capture.preparedQuerySchema.parse({
    product: input.product,
    category: input.category,
    country: input.country,
    surface: "google_ai_mode",
    intent: "unbranded-specific",
    merchant: { ...input.merchant, aliases: [] },
    prompt: "sheer stretch mesh fabric",
    basis: {
      category: "fabric",
      attribute: "sheer stretch mesh",
      excerpts: [excerpt],
      promptHash: "a".repeat(64),
    },
  });
  const state = Contract.heldReviewStateSchema.parse({
    ...job.output,
    stage: "query",
    availableAt: new Date().toISOString(),
    productCapture,
    query,
    queryGeneration: { attempts: 1 },
  });
  await db
    .update(schema.outboundIntegrationJob)
    .set({ output: state })
    .where(eq(schema.outboundIntegrationJob.id, job.id));
  return {
    job: await jobFor(prospectId),
    state,
    query,
    hash: Contract.heldPreparedQueryHash(query),
  };
};
const repairedTarget = ids[17];
assert.ok(repairedTarget);
await parkExcept(repairedTarget);
const candidate = await seedUnspentCategoryCandidate(repairedTarget);
const repairInput = {
  manifest,
  jobId: candidate.job.id,
  expectedQueryHash: candidate.hash,
};
const beforeRepairs = { ...calls };
const reservedBeforeRepairs = value(
  await Review.status(batch.batchId),
).queriesReserved;
const repairDryRun = value(await Review.repairUnspentQuery(actor, repairInput));
assert.equal(repairDryRun.staged, false);
assert.match(repairDryRun.validationFailure, /category/i);
assert.deepEqual(await jobFor(repairedTarget), candidate.job);
assert.equal(
  (
    await Review.repairUnspentQuery(actor, {
      ...repairInput,
      execute: true,
      expectedQueryHash: "0".repeat(64),
    })
  ).success,
  false,
);
for (const guard of [
  { status: "uncertain" as const, output: candidate.state },
  { status: "complete" as const, output: candidate.state },
  {
    status: "pending" as const,
    output: { ...candidate.state, queryGeneration: { attempts: 2 } },
  },
  {
    status: "pending" as const,
    output: {
      ...candidate.state,
      queryReservedAt: new Date().toISOString(),
      shoppingQueryCount: 1,
    },
  },
  {
    status: "pending" as const,
    output: {
      ...candidate.state,
      lease: {
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 180_000).toISOString(),
      },
    },
  },
]) {
  await db
    .update(schema.outboundIntegrationJob)
    .set(guard)
    .where(eq(schema.outboundIntegrationJob.id, candidate.job.id));
  assert.equal(
    (await Review.repairUnspentQuery(actor, { ...repairInput, execute: true }))
      .success,
    false,
  );
}
await db
  .update(schema.outboundIntegrationJob)
  .set({ status: "pending", output: candidate.state })
  .where(eq(schema.outboundIntegrationJob.id, candidate.job.id));
assert.deepEqual(calls, beforeRepairs);
assert.equal(
  value(
    await Review.repairUnspentQuery(actor, { ...repairInput, execute: true }),
  ).staged,
  true,
);
const stagedRepair = Contract.heldReviewStateSchema.parse(
  (await jobFor(repairedTarget)).output,
);
assert.equal(stagedRepair.stage, "repairQuery");
assert.deepEqual(stagedRepair.query, candidate.query);
assert.deepEqual(stagedRepair.queryRepair?.originalQuery, candidate.query);
assert.equal(stagedRepair.queryRepair?.originalQueryHash, candidate.hash);
assert.equal(stagedRepair.queryRepair?.requestedBy, actor);
assert.equal(stagedRepair.queryRepair?.reservedAt, undefined);
assert.equal(
  (await Review.repairUnspentQuery(actor, { ...repairInput, execute: true }))
    .success,
  false,
);
const repairedStep = await tick();
assert.ok(repairedStep.advanced);
assert.equal(repairedStep.stage, "repairQuery");
const repairedState = Contract.heldReviewStateSchema.parse(
  (await jobFor(repairedTarget)).output,
);
assert.equal(repairedState.stage, "query");
assert.equal(repairedState.query?.prompt, "stretch mesh top");
assert.equal(repairedState.queryGeneration?.attempts, 2);
assert.ok(repairedState.queryRepair?.reservedAt);
assert.deepEqual(repairedState.queryRepair?.originalQuery, candidate.query);
assert.equal(calls.queryRepairs, beforeRepairs.queryRepairs + 1);
assert.equal(calls.queryGenerations, beforeRepairs.queryGenerations);
assert.equal(calls.starts, beforeRepairs.starts);
assert.equal(
  value(await Review.status(batch.batchId)).queriesReserved,
  reservedBeforeRepairs,
);
assert.equal(
  (
    await Review.repairUnspentQuery(actor, {
      ...repairInput,
      execute: true,
      expectedQueryHash: Contract.heldPreparedQueryHash(repairedState.query),
    })
  ).success,
  false,
);

// A saved repaired query is checked again before any search reservation.
assert.ok(repairedState.query);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    output: {
      ...repairedState,
      query: { ...repairedState.query, prompt: candidate.query.prompt },
    },
  })
  .where(eq(schema.outboundIntegrationJob.id, candidate.job.id));
await tick();
assert.equal((await jobFor(repairedTarget)).status, "failed");
assert.equal(calls.starts, beforeRepairs.starts);
assert.equal(
  value(await Review.status(batch.batchId)).queriesReserved,
  reservedBeforeRepairs,
);

const interruptedRepairTarget = ids[18];
assert.ok(interruptedRepairTarget);
await parkExcept(interruptedRepairTarget);
const interruptedCandidate = await seedUnspentCategoryCandidate(
  interruptedRepairTarget,
);
repairOutcome = "uncertain";
value(
  await Review.repairUnspentQuery(actor, {
    manifest,
    jobId: interruptedCandidate.job.id,
    expectedQueryHash: interruptedCandidate.hash,
    execute: true,
  }),
);
const interruptedRepair = await finish(interruptedRepairTarget);
assert.equal(interruptedRepair.status, "uncertain");
const interruptedRepairState = Contract.heldReviewStateSchema.parse(
  interruptedRepair.output,
);
assert.ok(interruptedRepairState.queryRepair?.reservedAt);
assert.equal(
  z
    .object({ attempts: z.number() })
    .parse(interruptedRepairState.failureReceipt).attempts,
  2,
);
assert.deepEqual(
  interruptedRepairState.queryRepair?.originalQuery,
  interruptedCandidate.query,
);
const callsAfterInterruptedRepair = { ...calls };
for (let retry = 0; retry < 3; retry += 1) await tick();
assert.deepEqual(calls, callsAfterInterruptedRepair);
assert.equal(
  (
    await Review.repairUnspentQuery(actor, {
      manifest,
      jobId: interruptedCandidate.job.id,
      expectedQueryHash: interruptedCandidate.hash,
      execute: true,
    })
  ).success,
  false,
);

const invalidRepairTarget = ids[19];
assert.ok(invalidRepairTarget);
await parkExcept(invalidRepairTarget);
const invalidCandidate =
  await seedUnspentCategoryCandidate(invalidRepairTarget);
repairOutcome = "invalid";
value(
  await Review.repairUnspentQuery(actor, {
    manifest,
    jobId: invalidCandidate.job.id,
    expectedQueryHash: invalidCandidate.hash,
    execute: true,
  }),
);
const invalidRepair = await finish(invalidRepairTarget);
assert.equal(invalidRepair.status, "complete");
const invalidRepairState = Contract.heldReviewStateSchema.parse(
  invalidRepair.output,
);
assert.equal(invalidRepairState.queryGeneration?.attempts, 2);
assert.match(invalidRepairState.heldReason ?? "", /category/i);
assert.deepEqual(
  invalidRepairState.queryRepair?.originalQuery,
  invalidCandidate.query,
);
assert.equal(calls.queryRepairs, beforeRepairs.queryRepairs + 3);
assert.equal(calls.queryGenerations, beforeRepairs.queryGenerations);
assert.equal(calls.starts, beforeRepairs.starts);
assert.equal(
  value(await Review.status(batch.batchId)).queriesReserved,
  reservedBeforeRepairs,
);
const afterRemainingRepair = { ...calls };
await tick();
assert.deepEqual(calls, afterRemainingRepair);
assert.equal(
  (
    await Review.repairUnspentQuery(actor, {
      manifest,
      jobId: invalidCandidate.job.id,
      expectedQueryHash: invalidCandidate.hash,
      execute: true,
    })
  ).success,
  false,
);

// A reviewer can terminally reject an unspent two-attempt query without buying
// another model call, deleting either candidate, or changing the live prospect.
const qualityHoldTarget = ids[20];
assert.ok(qualityHoldTarget);
await parkExcept(qualityHoldTarget);
const qualityCandidate = await seedUnspentCategoryCandidate(qualityHoldTarget);
assert.ok(qualityCandidate.query.basis);
const qualityQuery = Capture.preparedQuerySchema.parse({
  ...qualityCandidate.query,
  prompt: "stretch mesh top",
  basis: {
    ...qualityCandidate.query.basis,
    category: "top",
    attribute: "stretch mesh",
  },
});
const beforeQualityState = Contract.heldReviewStateSchema.parse({
  ...qualityCandidate.state,
  query: qualityQuery,
  queryGeneration: { attempts: 2 },
  queryRepair: {
    originalQuery: qualityCandidate.query,
    originalQueryHash: qualityCandidate.hash,
    originalGeneration: { attempts: 1 },
    validationFailure: "Synthetic known first category mismatch.",
    requestedBy: actor,
    requestedAt: new Date().toISOString(),
    reservedAt: new Date().toISOString(),
  },
});
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: beforeQualityState })
  .where(eq(schema.outboundIntegrationJob.id, qualityCandidate.job.id));
const beforeQualityJob = await jobFor(qualityHoldTarget);
const [beforeQualityBudget] = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(eq(schema.outboundIntegrationJob.id, batch.batchId));
const beforeQualityCalls = { ...calls };
const holdInput = {
  manifest,
  jobId: qualityCandidate.job.id,
  expectedQueryHash: Contract.heldPreparedQueryHash(qualityQuery),
  reason: "Synthetic operator rejected this shopper phrasing.",
};
assert.equal(
  value(await Review.holdUnspentQuery(actor, holdInput)).held,
  false,
);
assert.deepEqual(await jobFor(qualityHoldTarget), beforeQualityJob);
assert.equal(
  (
    await Review.holdUnspentQuery(actor, {
      ...holdInput,
      execute: true,
      expectedQueryHash: "0".repeat(64),
    })
  ).success,
  false,
);
for (const restriction of [
  { status: "complete" as const, output: beforeQualityState },
  { status: "uncertain" as const, output: beforeQualityState },
  { status: "starting" as const, output: beforeQualityState },
  {
    status: "pending" as const,
    output: {
      ...beforeQualityState,
      queryReservedAt: new Date().toISOString(),
      shoppingQueryCount: 1,
    },
  },
  {
    status: "pending" as const,
    output: {
      ...beforeQualityState,
      lease: {
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 180_000).toISOString(),
      },
    },
  },
]) {
  await db
    .update(schema.outboundIntegrationJob)
    .set(restriction)
    .where(eq(schema.outboundIntegrationJob.id, qualityCandidate.job.id));
  assert.equal(
    (await Review.holdUnspentQuery(actor, { ...holdInput, execute: true }))
      .success,
    false,
  );
}
await db
  .update(schema.outboundIntegrationJob)
  .set({ status: "pending", output: beforeQualityState })
  .where(eq(schema.outboundIntegrationJob.id, qualityCandidate.job.id));
assert.equal(
  value(await Review.holdUnspentQuery(actor, { ...holdInput, execute: true }))
    .held,
  true,
);
const qualityHeldJob = await jobFor(qualityHoldTarget);
assert.equal(qualityHeldJob.status, "complete");
const qualityHeldState = Contract.heldReviewStateSchema.parse(
  qualityHeldJob.output,
);
assert.equal(qualityHeldState.stage, "complete");
assert.equal(qualityHeldState.heldReason, holdInput.reason);
assert.equal(
  qualityHeldState.queryQualityHold?.queryHash,
  holdInput.expectedQueryHash,
);
assert.equal(qualityHeldState.queryQualityHold?.reason, holdInput.reason);
assert.equal(qualityHeldState.queryQualityHold?.requestedBy, actor);
assert.equal(
  qualityHeldState.queryQualityHold?.heldAt,
  new Date().toISOString(),
);
const {
  stage: _heldStage,
  heldReason: _heldReason,
  queryQualityHold: _qualityAudit,
  ...retainedQualityState
} = qualityHeldState;
const { stage: _pendingStage, ...originalQualityState } = beforeQualityState;
assert.deepEqual(retainedQualityState, originalQualityState);
assert.equal(
  (await Review.holdUnspentQuery(actor, { ...holdInput, execute: true }))
    .success,
  false,
);
assert.equal(
  (await Review.repairUnspentQuery(actor, { ...holdInput, execute: true }))
    .success,
  false,
);
assert.equal((await tick()).advanced, false);
assert.deepEqual(calls, beforeQualityCalls);
assert.deepEqual(
  (
    await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.id, batch.batchId))
  )[0],
  beforeQualityBudget,
);

// Existing paid poll bytes can be restored after a known adapter correction.
// This explicit action cannot submit, poll, reopen unrelated failures or spend.
const recoveryTarget = ids[17];
assert.ok(recoveryTarget);
await parkExcept(recoveryTarget);
const recoveryCandidate = await seedUnspentCategoryCandidate(recoveryTarget);
assert.ok(recoveryCandidate.query.basis);
const recoveryQuery = Capture.preparedQuerySchema.parse({
  ...recoveryCandidate.query,
  prompt: "stretch mesh top",
  basis: {
    ...recoveryCandidate.query.basis,
    category: "top",
    attribute: "stretch mesh",
  },
});
const recoveryShoppingJob = Capture.aiJobSchema.parse({
  id: randomUUID(),
  query: recoveryQuery,
  submittedAt: new Date().toISOString(),
});
const artifactId = randomUUID();
const recoveryBody = JSON.stringify({
  job_id: recoveryShoppingJob.id,
  status: "done",
  scraper: recoveryQuery.surface,
  prompt: recoveryQuery.prompt,
  country: recoveryQuery.country,
  created_at: recoveryShoppingJob.submittedAt,
  completed_at: recoveryShoppingJob.submittedAt,
  result: {
    job_id: artifactId,
    scraper: recoveryQuery.surface,
    status: "done",
    prompt: recoveryQuery.prompt,
    country: recoveryQuery.country,
    cached: false,
    result_markdown: "1. Canvas Works — Synthetic stretch mesh top.",
    markdown_url: `https://scrapellm.com/md/${artifactId}.md`,
    citations: [],
  },
});
const recoveryRaw = Capture.rawCaptureSchema.parse({
  url: `https://api.scrapellm.com/jobs/${recoveryShoppingJob.id}`,
  status: 200,
  body: recoveryBody,
  sha256: createHash("sha256").update(recoveryBody).digest("hex"),
  receivedAt: new Date().toISOString(),
});
const recoveryAnswer = value(
  Capture.restoreCompletedQueryResponse(
    recoveryShoppingJob,
    recoveryRaw,
    undefined,
    Date.now(),
  ),
);
const knownPollError = Contract.HELD_POLL_PARSE_ERRORS[0];
const failedPollState = Contract.heldReviewStateSchema.parse({
  ...recoveryCandidate.state,
  stage: "poll",
  shoppingQueryCount: 1,
  queryReservedAt: recoveryShoppingJob.submittedAt,
  query: recoveryQuery,
  shoppingJob: recoveryShoppingJob,
  heldReason: knownPollError,
  failureReceipt: {
    response: recoveryRaw,
    capture: {
      ...recoveryAnswer,
      completeness: { status: "uncertain", reason: knownPollError },
    },
  },
});
const saveFailedPoll = (
  state = failedPollState,
  error: string = knownPollError,
) =>
  db
    .update(schema.outboundIntegrationJob)
    .set({ status: "failed", error, output: state })
    .where(eq(schema.outboundIntegrationJob.id, recoveryCandidate.job.id));
await saveFailedPoll();
const beforeRecoveryJob = await jobFor(recoveryTarget);
const [beforeRecoveryBudget] = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(eq(schema.outboundIntegrationJob.id, batch.batchId));
const beforeRecoveryCalls = { ...calls };
const recoveryInput = {
  manifest,
  jobId: recoveryCandidate.job.id,
  expectedShoppingJobId: recoveryShoppingJob.id,
  expectedResponseSha256: recoveryRaw.sha256,
};
assert.equal(
  value(await Review.reconcileFailedPoll(actor, recoveryInput)).reconciled,
  false,
);
assert.deepEqual(await jobFor(recoveryTarget), beforeRecoveryJob);
for (const change of [
  { expectedShoppingJobId: randomUUID() },
  { expectedResponseSha256: "0".repeat(64) },
])
  assert.equal(
    (
      await Review.reconcileFailedPoll(actor, {
        ...recoveryInput,
        ...change,
        execute: true,
      })
    ).success,
    false,
  );
for (const status of [
  "pending",
  "complete",
  "uncertain",
  "starting",
] as const) {
  await db
    .update(schema.outboundIntegrationJob)
    .set({ status })
    .where(eq(schema.outboundIntegrationJob.id, recoveryCandidate.job.id));
  assert.equal(
    (
      await Review.reconcileFailedPoll(actor, {
        ...recoveryInput,
        execute: true,
      })
    ).success,
    false,
  );
}
for (const state of [
  { ...failedPollState, stage: "generateQuery" as const },
  { ...failedPollState, shoppingQueryCount: 0 },
  {
    ...failedPollState,
    lease: {
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
  },
  {
    ...failedPollState,
    failureReceipt: {
      response: { ...recoveryRaw, body: `${recoveryRaw.body} ` },
    },
  },
  {
    ...failedPollState,
    query: { ...recoveryQuery, prompt: "another shopper query" },
  },
]) {
  await saveFailedPoll(Contract.heldReviewStateSchema.parse(state));
  assert.equal(
    (
      await Review.reconcileFailedPoll(actor, {
        ...recoveryInput,
        execute: true,
      })
    ).success,
    false,
  );
}
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "failed",
    error: "Synthetic unrelated provider failure.",
    output: {
      ...failedPollState,
      heldReason: "Synthetic unrelated provider failure.",
    },
  })
  .where(eq(schema.outboundIntegrationJob.id, recoveryCandidate.job.id));
assert.equal(
  (await Review.reconcileFailedPoll(actor, { ...recoveryInput, execute: true }))
    .success,
  false,
);
// Oversized answers were rejected before a capture existed; their saved raw
// response alone is sufficient only after the same complete proof succeeds.
await saveFailedPoll(
  Contract.heldReviewStateSchema.parse({
    ...failedPollState,
    heldReason: Contract.HELD_POLL_PARSE_ERRORS[1],
    failureReceipt: { response: recoveryRaw },
  }),
  Contract.HELD_POLL_PARSE_ERRORS[1],
);
const rawOnlyFailedJob = await jobFor(recoveryTarget);
assert.equal(
  value(await Review.reconcileFailedPoll(actor, recoveryInput)).reconciled,
  false,
);
assert.deepEqual(await jobFor(recoveryTarget), rawOnlyFailedJob);
await saveFailedPoll();
assert.equal(
  value(
    await Review.reconcileFailedPoll(actor, {
      ...recoveryInput,
      execute: true,
    }),
  ).reconciled,
  true,
);
const recoveredJob = await jobFor(recoveryTarget);
const recoveredState = Contract.heldReviewStateSchema.parse(
  recoveredJob.output,
);
assert.equal(recoveredJob.status, "pending");
assert.equal(recoveredJob.error, null);
assert.equal(recoveredState.stage, "browser");
assert.deepEqual(recoveredState.answer, recoveryAnswer);
assert.equal(recoveredState.pollRecoveries?.length, 1);
assert.deepEqual(recoveredState.pollRecoveries?.[0], {
  shoppingJobId: recoveryShoppingJob.id,
  responseSha256: recoveryRaw.sha256,
  queryHash: Contract.heldPreparedQueryHash(recoveryQuery),
  originalError: knownPollError,
  originalHeldReason: knownPollError,
  originalFailureReceipt: failedPollState.failureReceipt,
  requestedBy: actor,
  recoveredAt: new Date().toISOString(),
});
const {
  stage: _recoveredStage,
  answer: _recoveredAnswer,
  pollRecoveries: _recoveryAudit,
  ...retainedRecoveryState
} = recoveredState;
const {
  stage: _failedPollStage,
  heldReason: _failedPollReason,
  failureReceipt: _failedPollReceipt,
  ...originalRecoveryState
} = failedPollState;
assert.deepEqual(retainedRecoveryState, originalRecoveryState);
assert.equal(
  (await Review.reconcileFailedPoll(actor, { ...recoveryInput, execute: true }))
    .success,
  false,
);
await saveFailedPoll(
  Contract.heldReviewStateSchema.parse({
    ...failedPollState,
    pollRecoveries: recoveredState.pollRecoveries,
  }),
);
assert.equal(
  (await Review.reconcileFailedPoll(actor, { ...recoveryInput, execute: true }))
    .success,
  false,
);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: recoveredJob.status,
    error: recoveredJob.error,
    output: recoveredState,
  })
  .where(eq(schema.outboundIntegrationJob.id, recoveredJob.id));
assert.deepEqual(calls, beforeRecoveryCalls);
assert.deepEqual(
  (
    await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.id, batch.batchId))
  )[0],
  beforeRecoveryBudget,
);

// A staged absence created before abbreviated-brand replay must be rejected
// before the writer. Only fixture seeding simulates the historical presence
// projection; the runner, receipt validation and every saved raw byte stay real.
const staleIdentityTarget = ids[19];
assert.ok(staleIdentityTarget);
await parkExcept(staleIdentityTarget);
const staleIdentityJob = await jobFor(staleIdentityTarget);
const staleIdentityInput = Contract.heldReviewInputSchema.parse(
  staleIdentityJob.input,
);
const identityBrowser = heldBrowser(
  staleIdentityInput.product,
  `${staleIdentityInput.product.name}. This top is made from sheer stretch mesh fabric.`,
);
const identityRaw = identityBrowser.raw[0];
assert.ok(identityRaw);
const identityEnvelope = z
  .object({ stdout: z.string() })
  .passthrough()
  .parse(JSON.parse(identityRaw.body));
const identityExecution = z
  .object({ title: z.string() })
  .passthrough()
  .parse(JSON.parse(identityEnvelope.stdout));
identityRaw.body = JSON.stringify({
  ...identityEnvelope,
  stdout: JSON.stringify({
    ...identityExecution,
    title: `${staleIdentityInput.product.name} | PATTERN – Pattern Beauty`,
  }),
});
identityRaw.sha256 = createHash("sha256")
  .update(identityRaw.body)
  .digest("hex");
const identityProduct = Capture.projectBrowserExecution({
  capture: identityRaw,
  url: staleIdentityInput.product.url,
  id: "product-browser",
  productName: staleIdentityInput.product.name,
  startedAt: identityRaw.receivedAt,
  now: Date.now(),
});
assert.ok(identityProduct);
identityBrowser.sources = identityBrowser.sources.map((source) =>
  source.id === identityProduct.source.id ? identityProduct.source : source,
);
const identityQuery = value(
  await Capture.generateShopperQuery(
    {
      product: staleIdentityInput.product,
      category: staleIdentityInput.category,
      country: staleIdentityInput.country,
      merchant: staleIdentityInput.merchant,
      browser: identityBrowser,
      deadline: Date.now() + 30_000,
    },
    {
      generate: async ({ prompt }) => ({
        question: "stretch mesh top",
        category: "top",
        attribute: "stretch mesh",
        excerptIds: [
          z
            .object({ excerpts: z.array(z.object({ id: z.string() })).min(1) })
            .parse(JSON.parse(prompt)).excerpts[0]?.id ?? "",
        ],
      }),
    },
  ),
);
if (identityQuery.status !== "prepared") throw new Error(identityQuery.reason);
const identityShoppingJob = Capture.aiJobSchema.parse({
  id: randomUUID(),
  query: identityQuery.query,
  submittedAt: new Date().toISOString(),
});
const identityBody = JSON.stringify({
  job_id: identityShoppingJob.id,
  status: "done",
  scraper: identityQuery.query.surface,
  prompt: identityQuery.query.prompt,
  country: identityQuery.query.country,
  completed_at: new Date().toISOString(),
  result: {
    scraper: identityQuery.query.surface,
    status: "done",
    cached: false,
    result_markdown:
      "1. Canvas Works — Large carry bag.\n2. Harbor Label — Cotton shopper.\n3. Pattern Leave-In Conditioner — Another named product.",
    citations: [],
  },
});
const identityAnswer = value(
  Capture.restoreCompletedQueryResponse(
    identityShoppingJob,
    {
      url: `https://api.scrapellm.com/jobs/${identityShoppingJob.id}`,
      status: 200,
      body: identityBody,
      sha256: createHash("sha256").update(identityBody).digest("hex"),
      receivedAt: new Date().toISOString(),
    },
    undefined,
    Date.now(),
  ),
);
const originalPresence = Presence.computeDiscoveryBase;
const staleIdentityReceipt = await (async () => {
  const historicalPresence = spyOn(
    Presence,
    "computeDiscoveryBase",
  ).mockImplementation((input, now) =>
    originalPresence({ ...input, browser: undefined }, now),
  );
  try {
    const assessed = value(
      await heldAssessment({
        answer: identityAnswer,
        browser: identityBrowser,
        playbook: settings,
        deadline: Date.now() + 30_000,
      }),
    );
    if (assessed.status !== "researched") throw new Error(assessed.reason);
    assert.equal(assessed.receipt.selected.kind, "discovery-absence");
    assert.equal(
      Assessment.validateAutomaticResearch(
        { answer: identityAnswer, browser: identityBrowser },
        assessed.receipt,
        settings.verificationDays,
        settings,
      ),
      null,
      "The stale receipt passed the earlier full-name-only presence contract.",
    );
    return assessed.receipt;
  } finally {
    historicalPresence.mockRestore();
  }
})();
const staleIdentityReason =
  "The answer names a possible shortened merchant identity from the captured product page; absence is not established.";
assert.equal(
  Assessment.validateAutomaticResearch(
    { answer: identityAnswer, browser: identityBrowser },
    staleIdentityReceipt,
    settings.verificationDays,
    settings,
  ),
  staleIdentityReason,
);
const staleIdentityState = Contract.heldReviewStateSchema.parse({
  stage: "draft",
  prospectRevision: 1,
  availableAt: new Date().toISOString(),
  lease: null,
  shoppingQueryIntent: "unbranded-specific",
  shoppingQueryCount: 1,
  queryReservedAt: identityShoppingJob.submittedAt,
  polls: 1,
  productCapture: identityBrowser,
  query: identityQuery.query,
  queryGeneration: identityQuery.generation,
  shoppingJob: identityShoppingJob,
  answer: identityAnswer,
  browser: identityBrowser,
  shoppingReceipt: staleIdentityReceipt,
  shoppingHistory: [],
});
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "pending",
    error: null,
    output: staleIdentityState,
  })
  .where(eq(schema.outboundIntegrationJob.id, staleIdentityJob.id));
const beforeStaleIdentityCalls = { ...calls };
const beforeStaleIdentityBudget = value(
  await Review.status(batch.batchId),
).queriesReserved;
const staleIdentityTick = await tick();
assert.equal(staleIdentityTick.advanced, true);
if (!staleIdentityTick.advanced)
  throw new Error("Expected a staged draft check.");
assert.equal(staleIdentityTick.status, "held");
const staleIdentityHeldJob = await jobFor(staleIdentityTarget);
assert.equal(staleIdentityHeldJob.status, "failed");
assert.equal(staleIdentityHeldJob.error, staleIdentityReason);
const staleIdentityHeld = Contract.heldReviewStateSchema.parse(
  staleIdentityHeldJob.output,
);
assert.equal(staleIdentityHeld.heldReason, staleIdentityReason);
assert.equal(staleIdentityHeld.previewContext, undefined);
assert.equal(staleIdentityHeld.draftBeforeJudge, undefined);
assert.equal(staleIdentityHeld.preview, undefined);
const { heldReason: _staleIdentityHold, ...retainedStaleIdentity } =
  staleIdentityHeld;
assert.deepEqual(retainedStaleIdentity, staleIdentityState);
assert.deepEqual(calls, beforeStaleIdentityCalls);
assert.equal(
  value(await Review.status(batch.batchId)).queriesReserved,
  beforeStaleIdentityBudget,
);

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
