import { mock, setSystemTime, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { prospectSchema } from "@/lib/outbound";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
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
// All raw capture, claim, lease, Store and LeadResearch validators remain real.
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
const Composition = await import("@/server/app/outbound/sequence-composition");
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
const calls = { starts: 0, polls: 0, browser: 0, product: 0, writer: 0 };
let firstNoGap = true;
let secondNoGap = false;
let uncertainStart = false;
let lateStart = false;
let observeExpiredStart = false;
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
  compose: (who, input) =>
    Composition.composeForProspect(who, input, {
      generate: async () => {
        calls.writer += 1;
        return {
          subject: "linen carry bags",
          opening: 'My sister needed bags, so I asked for "linen carry bags".',
          result:
            "It picked Canvas Works and Harbor Label. Sample Goods didn't come up.",
          relevance: "That's the kind of search a new customer starts with.",
          followupFact: "",
        };
      },
      judge: passingCopyJudge,
    }),
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
assert.ok(completed.composition && completed.researchId);
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
assert.equal(saved.messages[0]?.writing?.quality?.passed, true);
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

// Applying a held receipt replays its full raw proof and rejects an altered saved capture.
const tamperedTarget = ids[11];
assert.ok(tamperedTarget);
await parkExcept(tamperedTarget);
for (let step = 0; step < 15; step += 1) {
  if (
    Contract.heldReviewStateSchema.parse((await jobFor(tamperedTarget)).output)
      .stage === "applyResearch"
  )
    break;
  await tick();
}
const tamperedJob = await jobFor(tamperedTarget);
const tamperedState = Contract.heldReviewStateSchema.parse(tamperedJob.output);
assert.equal(tamperedState.stage, "applyResearch");
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
  "Held discovery review contracts passed: exact manifest, durable broad branch, real proof apply, trusted held preview, no-gap, uncertain and budget.",
);
process.exit(0);
