import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
import { draftReviewReadinessKey } from "@/lib/outbound-draft-review";
import { requireTestDatabase } from "../helpers/database";
import {
  passingCopyJudge,
  writerFixture,
} from "../helpers/outbound-writer-fixture";

const endpoint = requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const { draftCopyReadiness } = await import(
  "@/server/utils/outbound/draft-copy-readiness"
);
const Research = await import("@/server/utils/outbound/shopping-research");
const currentFixture = { value: writerFixture() };
// This fixture isolates durable writing. Full raw capture validation has its own
// tests; the synthetic copy fixture is never represented as real search evidence.
const evidence = spyOn(Research, "assertShoppingEvidence").mockImplementation(
  async () => currentFixture.value.receipt,
);
const { db, schema } = await import("@/server/database");
const Store = await import("@/server/app/outbound/store");
const Composition = await import("@/server/app/outbound/sequence-composition");
const actor = "offline-copy-review-fixture";
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const row = async (id: string) => {
  const rows = await db
    .select()
    .from(schema.outboundProspect)
    .where(eq(schema.outboundProspect.id, id));
  assert.ok(rows[0]);
  return rows[0];
};
const jobs = () => db.select().from(schema.outboundIntegrationJob);
const seed = async () => {
  await db.execute(
    sql`truncate outbound_integration_job,outbound_campaign,outbound_company,outbound_person,outbound_prospect,outbound_event,outbound_revision,outbound_playbook,outbound_suppression,outbound_inbox cascade`,
  );
  currentFixture.value = writerFixture();
  const fixture = currentFixture.value;
  await db.insert(schema.outboundPlaybook).values({
    id: "default",
    revision: 1,
    settings: fixture.policy,
    updatedBy: actor,
  });
  const created = value(await Store.saveProspect(actor, fixture.prospect));
  return { ...fixture, id: created.prospect, revision: created.revision };
};
// Synthetic caller lifecycle only; eligibility/evidence validators have separate suites.
const Review = await import("@/server/app/outbound/automatic-draft-review");
const readiness = spyOn(
  Store,
  "assertAutomaticDraftReviewReady",
).mockResolvedValue(undefined);
const modelCalls = { writer: 0, judge: 0 };
const failedJudge = async () => {
  modelCalls.judge += 1;
  return {
    ...(await passingCopyJudge()),
    naturalVoice: {
      passed: false,
      reason: "This synthetic copy needs a more natural transition.",
    },
  };
};
const reviewSeed = async () => {
  const fixture = await seed();
  const policy = { ...fixture.policy, automationEnabled: true };
  await db
    .update(schema.outboundPlaybook)
    .set({ settings: policy })
    .where(eq(schema.outboundPlaybook.id, "default"));
  const campaign = (
    await db
      .insert(schema.outboundCampaign)
      .values({
        id: randomUUID(),
        name: "Synthetic caller campaign",
        status: "active",
        criteria: defaultCampaignCriteria(policy),
        revision: 1,
        createdBy: actor,
        updatedBy: actor,
      })
      .returning()
  )[0];
  assert.ok(campaign);
  await db
    .update(schema.outboundProspect)
    .set({ campaignId: campaign.id, status: "draft" })
    .where(eq(schema.outboundProspect.id, fixture.id));
  return fixture;
};
const compose: typeof Composition.composeForProspect = (
  actor,
  input,
  dependencies,
) =>
  Composition.composeForProspect(actor, input, {
    ...dependencies,
    generate: async () => {
      modelCalls.writer += 1;
      return currentFixture.value.parts;
    },
    judge: failedJudge,
  });
const noMx = async () => {
  throw new Error("This fixture must not use DNS or any external provider.");
};
const run = () =>
  Review.run({ maxDrafts: 1, deadline: Date.now() + 120_000 }, compose, noMx);

try {
  const fixture = await reviewSeed();
  const result = value(await run());
  assert.equal(result.approved, 0);
  assert.deepEqual(result.results, [{ prospect: fixture.id, status: "held" }]);
  const held = await row(fixture.id);
  assert.equal(held.status, "held");
  assert.equal(held.messages.length, 3);
  assert.equal(held.messages[0]?.writing?.quality?.passed, false);
  assert.match(held.holdReason, /^Copy: naturalVoice:/);
  assert.equal(held.approvedAt, null);
  const reviewJob = (await jobs()).find(
    (job) => job.input["operation"] === "draftReview",
  );
  assert.equal(reviewJob?.status, "complete");
  assert.ok(reviewJob?.output?.["compositionJobId"]);
  assert.equal(value(await run()).processed, 0);
  assert.deepEqual(modelCalls, { writer: 1, judge: 1 });
  console.log(
    "PASS review.run persists failed copy, finishes held and never repurchases the held result.",
  );

  // A reopened complete failure does not force a new writer or judge request.
  await db
    .update(schema.outboundProspect)
    .set({ status: "draft", holdReason: "" })
    .where(eq(schema.outboundProspect.id, fixture.id));
  const reopened = value(await run());
  assert.equal(reopened.approved, 0);
  assert.equal(reopened.results[0]?.status, "held");
  assert.deepEqual(modelCalls, { writer: 1, judge: 1 });
  const reopenedJob = (await jobs())
    .filter((job) => job.input["operation"] === "draftReview")
    .find((job) => job.input["prospectRevision"] === held.revision);
  assert.equal(reopenedJob?.input["regenerate"], false);
  console.log(
    "PASS a complete failed verdict is a known hold, not a regeneration request.",
  );

  // A prior failure from before this copy gate cannot prevent the new review.
  const legacy = await reviewSeed();
  const legacyRow = await row(legacy.id);
  const oldFailure = (
    await db
      .insert(schema.outboundIntegrationJob)
      .values({
        provider: "automation",
        prospectId: legacy.id,
        status: "failed",
        requestId: `legacy-review:${legacy.id}`,
        input: {
          operation: "draftReview",
          prospectId: legacy.id,
          prospectRevision: legacyRow.revision,
          campaignId: legacyRow.campaignId,
          campaignRevision: 1,
          playbookRevision: 1,
          regenerate: false,
          readinessKey: draftReviewReadinessKey(
            legacyRow.details,
            legacy.policy.senderConfirmed,
            legacy.policy.allowStaleEvidence,
            legacy.policy.trustSavedContactVerification,
            legacy.policy.allowProductObservations,
            legacy.policy.allowUsMarketWindow,
            legacy.policy.allowMicrosoftRecipients,
          ),
          resumeId: "",
        },
        output: {
          stage: "apply",
          lease: {
            token: randomUUID(),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
        },
        error: "Legacy gate failed before copy verdicts existed.",
      })
      .returning()
  )[0];
  assert.ok(oldFailure);
  const beforeLegacy = { ...modelCalls };
  const legacyResult = value(await run());
  assert.equal(legacyResult.processed, 1);
  assert.equal(legacyResult.results[0]?.status, "held");
  assert.equal(modelCalls.writer, beforeLegacy.writer + 1);
  assert.equal(modelCalls.judge, beforeLegacy.judge + 1);
  const legacyReviews = (await jobs()).filter(
    (job) => job.input["operation"] === "draftReview",
  );
  assert.equal(legacyReviews.length, 2);
  const newReview = legacyReviews.find((job) => job.id !== oldFailure.id);
  assert.equal(newReview?.status, "complete");
  assert.equal(newReview?.input["regenerate"], true);
  assert.equal(newReview?.input["copyContractVersion"], "copy-checks-v2");
  assert.deepEqual(newReview?.input["copySnapshot"], legacyRow.messages);
  console.log(
    "PASS an unchanged legacy failed review is reclaimed by the new copy gate without manual resume.",
  );

  const changed = await reviewSeed();
  const originalRead = Store.readProspect;
  const changedRead = spyOn(Store, "readProspect").mockImplementation(
    async (id) => {
      const current = await originalRead(id);
      if (!current.success || !current.data) return current;
      return {
        success: true,
        data: {
          ...current.data,
          messages: held.messages.map((message) => ({
            ...message,
            body: `${message.body} An edit after claiming.`,
          })),
        },
      };
    },
  );
  const beforeCalls = { ...modelCalls };
  const changedResult = value(await run());
  changedRead.mockRestore();
  assert.equal(changedResult.approved, 0);
  assert.deepEqual(modelCalls, beforeCalls);
  const blockedJob = (await jobs()).find(
    (job) => job.input["operation"] === "draftReview",
  );
  assert.equal(blockedJob?.status, "failed");
  assert.match(blockedJob?.error ?? "", /changed before generation/);
  assert.equal((await row(changed.id)).approvedAt, null);
  assert.equal(value(await run()).processed, 0);
  assert.deepEqual(modelCalls, beforeCalls);
  await db
    .update(schema.outboundProspect)
    .set({
      messages: held.messages.map((message) => ({
        ...message,
        body: `${message.body} New saved text.`,
      })),
    })
    .where(eq(schema.outboundProspect.id, changed.id));
  const retriedText = value(await run());
  assert.equal(retriedText.processed, 1);
  assert.equal(retriedText.results[0]?.status, "held");
  assert.equal(modelCalls.writer, beforeCalls.writer + 1);
  assert.equal(modelCalls.judge, beforeCalls.judge + 1);
  const retriedReviews = (await jobs()).filter(
    (job) => job.input["operation"] === "draftReview",
  );
  assert.equal(retriedReviews.length, 2);
  assert.notEqual(retriedReviews[0]?.requestId, retriedReviews[1]?.requestId);
  console.log(
    "PASS a same-revision text change after claim blocks provider generation.",
  );
  console.log(
    "PASS unchanged current failures stay deduplicated, while changed saved text earns a new review identity.",
  );

  const uncertain = await reviewSeed();
  const uncertainRow = await row(uncertain.id);
  await db.insert(schema.outboundIntegrationJob).values({
    provider: "automation",
    prospectId: uncertain.id,
    status: "uncertain",
    input: {
      operation: "draftReview",
      prospectId: uncertain.id,
      prospectRevision: uncertainRow.revision,
      playbookRevision: 0,
    },
    output: {},
    error: "Old provider request is unresolved.",
  });
  const beforeUncertain = { ...modelCalls };
  assert.equal(value(await run()).processed, 0);
  assert.deepEqual(modelCalls, beforeUncertain);
  console.log(
    "PASS an uncertain legacy request blocks every automatic copy retry.",
  );

  const messages = held.messages;
  const previous = draftCopyReadiness(messages);
  const edited = messages.map((message) => ({
    ...message,
    body: `${message.body} `,
  }));
  assert.notEqual(draftCopyReadiness(edited).contentHash, previous.contentHash);
  assert.notEqual(
    draftCopyReadiness(edited).readinessHash,
    previous.readinessHash,
  );
  const [first, ...followups] = messages;
  assert.ok(first?.writing);
  const unjudged = [
    { ...first, writing: { ...first.writing, quality: null } },
    ...followups,
  ];
  assert.equal(draftCopyReadiness(unjudged).contentHash, previous.contentHash);
  assert.notEqual(
    draftCopyReadiness(unjudged).readinessHash,
    previous.readinessHash,
  );
  console.log(
    "PASS review fingerprint distinguishes edited text and a removed verdict.",
  );
  console.log("Task 7 caller contracts passed.");
} finally {
  readiness.mockRestore();
  evidence.mockRestore();
  await db.$client.end();
}
