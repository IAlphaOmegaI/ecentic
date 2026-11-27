import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import {
  type Message,
  playbookSchema,
  prospectSchema,
  settingsForProspect,
} from "@/lib/outbound";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
import {
  assembleSequence,
  canonicalSequenceInput,
  legacyWritingSnapshotSchema,
} from "@/lib/outbound-composition";
import { draftReviewReadinessKey } from "@/lib/outbound-draft-review";
import { rebuildWritingProposal } from "@/lib/outbound-rebuild-policy";
import { writerCandidatesSchema } from "@/lib/outbound-sequence-composition";
import { shoppingFinding } from "@/lib/outbound-shopping-research";
import type { CompletedComposition } from "@/server/app/outbound/sequence-composition";
import {
  legacyWritingPolicyHash,
  writingPolicyHash,
} from "@/server/utils/outbound/shopping-policy";
import { requireTestDatabase } from "../helpers/database";
import {
  passingCopyJudge,
  writerFixture,
} from "../helpers/outbound-writer-fixture";

const endpoint = requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const { writerCandidateContextHash } = await import(
  "@/server/utils/outbound/writing-candidates"
);
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
const actor = "offline-composition-fixture";
const independent = postgres(endpoint, { max: 1, onnotice: () => undefined });
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const rejected = (
  result: { success: boolean; error?: Error },
  message: RegExp,
) => {
  assert.equal(result.success, false);
  assert.match(result.error?.message ?? "", message);
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
const seed = async (held = false, approvalReady = false) => {
  await db.execute(
    sql`truncate outbound_integration_job,outbound_campaign,outbound_company,outbound_person,outbound_prospect,outbound_event,outbound_revision,outbound_playbook,outbound_suppression,outbound_inbox cascade`,
  );
  currentFixture.value = writerFixture();
  if (approvalReady)
    currentFixture.value = {
      ...currentFixture.value,
      policy: { ...currentFixture.value.policy, senderConfirmed: true },
    };
  const fixture = currentFixture.value;
  await db.insert(schema.outboundPlaybook).values({
    id: "default",
    revision: 1,
    settings: fixture.policy,
    updatedBy: actor,
  });
  const created = value(await Store.saveProspect(actor, fixture.prospect));
  if (approvalReady) {
    const now = new Date().toISOString();
    await db
      .update(schema.outboundProspect)
      .set({
        details: prospectSchema.parse({
          ...fixture.prospect,
          id: created.prospect,
          platform: "shopify",
          emailStatus: "verified",
          emailSource: "Synthetic offline verification",
          emailVerifiedAt: now,
          mxProvider: "google",
          mxCheckedAt: now,
          roleSource: "https://samplegoods.test/team",
          roleCheckedAt: now,
          legitEvidence: "Synthetic fixture business",
          evidenceCheckedAt: now,
          timezone: "America/New_York",
          shoppingResearchId: randomUUID(),
          shoppingFinding: shoppingFinding(fixture.receipt),
        }),
      })
      .where(eq(schema.outboundProspect.id, created.prospect));
  }
  if (held)
    await db
      .update(schema.outboundProspect)
      .set({
        status: "held",
        holdReason: "Original 21: unbranded evidence review required.",
      })
      .where(eq(schema.outboundProspect.id, created.prospect));
  return { ...fixture, id: created.prospect, revision: created.revision };
};
const save = (
  fixture: Awaited<ReturnType<typeof seed>>,
  composed: CompletedComposition,
  revision = fixture.revision,
) =>
  Store.saveComposedDraft(actor, {
    prospect: fixture.id,
    revision,
    compositionJobId: composed.composition.jobId,
  });
const snapshot = async () => ({
  prospects: await db.select().from(schema.outboundProspect),
  jobs: await jobs(),
  revisions: await db.select().from(schema.outboundRevision),
  events: await db.select().from(schema.outboundEvent),
});
const plain = (messages: Parameters<typeof canonicalSequenceInput>[0]) => {
  const canonical = canonicalSequenceInput(messages);
  assert.equal(canonical.status, "ready");
  return canonical.status === "ready" ? canonical.canonicalText : "";
};

const assertPartial = (
  job: Awaited<ReturnType<typeof jobs>>[number] | undefined,
  fixture: Awaited<ReturnType<typeof seed>>,
) => {
  const partial = job?.output?.["draftBeforeJudge"] as
    | { parts?: unknown; messages?: Message[] }
    | undefined;
  assert.ok(partial?.messages);
  assert.deepEqual(partial.parts, fixture.parts);
  assert.equal(partial.messages.length, 3);
  const expected = assembleSequence(
    fixture.prospect,
    fixture.receipt,
    fixture.policy,
    fixture.parts,
  );
  assert.equal(expected.status, "ready");
  if (expected.status === "ready")
    assert.equal(plain(partial.messages), expected.canonicalText);
  assert.equal(partial.messages[0]?.writing, undefined);
};
const assertCandidate = (
  job: Awaited<ReturnType<typeof jobs>>[number] | undefined,
  fixture: Awaited<ReturnType<typeof seed>>,
) => {
  const candidates = writerCandidatesSchema.parse(
    job?.output?.["writerCandidates"],
  );
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.status, "unapproved");
  assert.deepEqual(candidates[0]?.parts, fixture.parts);
  assert.deepEqual(candidates[0]?.issues, []);
  assert.equal(job?.output?.["draftBeforeJudge"], undefined);
};

try {
  // One durable purchase feeds the shared service and manual Generate entry point.
  const held = await seed(true);
  const calls = { count: 0, unlocked: false };
  const composed = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: held.id, expectedRevision: held.revision },
      {
        judge: passingCopyJudge,
        generate: async () => {
          calls.count += 1;
          calls.unlocked = await independent.begin(async (connection) => {
            const result = await connection<
              { unlocked: boolean }[]
            >`select pg_try_advisory_xact_lock(hashtext('ecentic-outbound-workspace')) as unlocked`;
            return result[0]?.unlocked === true;
          });
          return held.parts;
        },
      },
    ),
  );
  assert.equal(
    calls.unlocked,
    true,
    "The writer must run outside the workspace database lock.",
  );
  assert.equal(calls.count, 1);
  const beforeMxRefresh = await row(held.id);
  await db
    .update(schema.outboundProspect)
    .set({
      details: {
        ...beforeMxRefresh.details,
        mxCheckedAt: new Date(Date.now() + 1000).toISOString(),
      },
    })
    .where(eq(schema.outboundProspect.id, held.id));
  const reused = value(
    await Composition.composeForProspect(
      "another-caller",
      { prospectId: held.id },
      {
        judge: passingCopyJudge,
        generate: async () => {
          throw new Error("A completed job must not purchase copy twice.");
        },
      },
    ),
  );
  assert.equal(reused.composition.jobId, composed.composition.jobId);
  const saved = value(await save(held, composed));
  const savedRow = await row(held.id);
  assert.equal(savedRow.status, "held");
  assert.equal(
    savedRow.holdReason,
    "Original 21: unbranded evidence review required.",
  );
  assert.equal(savedRow.revision, held.revision + 1);
  assert.equal(savedRow.messages[0]?.writing?.revision, saved.revision);
  assert.equal(savedRow.messages[0]?.writing?.quality?.passed, true);
  assert.equal(plain(savedRow.messages), plain(composed.messages));
  const beforeRetry = await snapshot();
  assert.equal(value(await save(held, composed)).revision, saved.revision);
  assert.deepEqual(
    await snapshot(),
    beforeRetry,
    "An identical stale retry must make zero writes.",
  );
  const manualOrigin = value(
    await Store.generateDrafts("manual-generate-button", {
      prospect: held.id,
      expectedRevision: saved.revision,
    }),
  );
  assert.equal(manualOrigin.revision, saved.revision);
  assert.equal((await jobs()).length, 1);
  assert.equal(calls.count, 1);
  assert.deepEqual(await snapshot(), beforeRetry);
  const oldRevision = (
    await db
      .select()
      .from(schema.outboundRevision)
      .where(eq(schema.outboundRevision.prospectId, held.id))
  )[0];
  assert.ok(oldRevision);
  assert.ok(oldRevision.messages[0]?.writing);
  const [firstMessage, firstFollowup, lastFollowup] = savedRow.messages;
  assert.ok(firstMessage);
  assert.ok(firstFollowup);
  assert.ok(lastFollowup);
  const edited = value(
    await Store.saveDraft(actor, {
      prospect: held.id,
      revision: saved.revision,
      subject: firstMessage.subject,
      body: `${firstMessage.body}\n\nAn operator edit.`,
      followupOne: firstFollowup.body,
      followupTwo: lastFollowup.body,
      writing: { ...firstMessage.writing, quality: { passed: true } },
    }),
  );
  assert.equal(
    (await row(held.id)).messages.some(
      (message) => message.writing !== undefined,
    ),
    false,
  );
  const historical = (
    await db
      .select()
      .from(schema.outboundRevision)
      .where(eq(schema.outboundRevision.id, oldRevision.id))
  )[0];
  assert.ok(historical);
  assert.deepEqual(
    historical.messages,
    oldRevision.messages,
    "Editing preserves the old message text and writing metadata.",
  );
  assert.deepEqual(historical.manifest, oldRevision.manifest);
  assert.equal(historical.contentHash, oldRevision.contentHash);
  const retired = await db
    .transaction((transaction) =>
      Store.generateDraftsWithin(transaction, actor, {
        prospect: held.id,
        expectedRevision: edited.revision,
      }),
    )
    .then(
      () => null,
      (error: Error) => error,
    );
  assert.match(retired?.message ?? "", /outside the transaction/);
  console.log(
    "PASS trusted write, hold, revision, no-op retry, manual edit and shared entry point",
  );

  const active = await seed();
  const entered = Promise.withResolvers<void>();
  const released = Promise.withResolvers<void>();
  const activeCalls = { count: 0 };
  const first = Composition.composeForProspect(
    actor,
    { prospectId: active.id },
    {
      judge: passingCopyJudge,
      generate: async () => {
        activeCalls.count += 1;
        entered.resolve();
        await released.promise;
        return active.parts;
      },
    },
  );
  await entered.promise;
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: active.id },
      {
        judge: passingCopyJudge,
        generate: async () => {
          activeCalls.count += 1;
          return active.parts;
        },
      },
    ),
    /already running/,
  );
  released.resolve();
  value(await first);
  assert.equal(activeCalls.count, 1);
  assert.equal((await jobs()).length, 1);
  console.log("PASS live lease prevents a concurrent model purchase");

  const lost = await seed();
  const clock = { now: Date.now(), calls: 0, judges: 0 };
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: lost.id },
      {
        now: () => clock.now,
        judge: async () => {
          clock.judges += 1;
          return passingCopyJudge();
        },
        generate: async () => {
          clock.calls += 1;
          clock.now += 180_001;
          return lost.parts;
        },
      },
    ),
    /lease|uncertain|retained/,
  );
  assert.equal((await jobs())[0]?.status, "uncertain");
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: lost.id },
      {
        now: () => clock.now,
        judge: passingCopyJudge,
        generate: async () => {
          clock.calls += 1;
          return lost.parts;
        },
      },
    ),
    /lease|uncertain|retained/,
  );
  assert.equal(clock.calls, 1);
  assertCandidate((await jobs())[0], lost);
  assert.equal(
    clock.judges,
    0,
    "An already expired writer must not purchase a judge.",
  );
  await db
    .update(schema.outboundPlaybook)
    .set({
      revision: 2,
      settings: {
        ...lost.policy,
        voiceNotes: "Changed while the previous job remains uncertain.",
      },
    })
    .where(eq(schema.outboundPlaybook.id, "default"));
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: lost.id },
      {
        now: () => clock.now,
        judge: passingCopyJudge,
        generate: async () => {
          clock.calls += 1;
          return lost.parts;
        },
      },
    ),
    /earlier writing attempt/,
  );
  assert.equal(clock.calls, 1);
  assert.equal((await jobs()).length, 1);
  console.log(
    "PASS expired lease is uncertain and cannot replay, including after policy changes",
  );

  const malformed = await seed();
  const malformedCalls = { count: 0 };
  const malformedResult = await Composition.composeForProspect(
    actor,
    { prospectId: malformed.id },
    {
      compose: async () => {
        malformedCalls.count += 1;
        return {
          success: true,
          data: { messages: [], issues: [], generation: { attempts: 1 } },
        };
      },
    },
  );
  rejected(malformedResult, /saved-content checks/);
  assert.equal((await jobs())[0]?.status, "uncertain");
  assert.ok((await jobs())[0]?.output?.["unappliedResult"]);
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: malformed.id },
      {
        compose: async () => {
          malformedCalls.count += 1;
          throw new Error("Malformed output must not buy another attempt.");
        },
      },
    ),
    /saved-content checks/,
  );
  assert.equal(malformedCalls.count, 1);
  console.log(
    "PASS malformed completion is preserved as uncertain without another purchase",
  );

  const watched = await seed();
  const watcherClock = { now: Date.now(), calls: 0, judges: 0 };
  const writerEntered = Promise.withResolvers<void>();
  const writerReleased = Promise.withResolvers<void>();
  const lateFirst = Composition.composeForProspect(
    actor,
    { prospectId: watched.id },
    {
      now: () => watcherClock.now,
      generate: async () => {
        watcherClock.calls += 1;
        writerEntered.resolve();
        await writerReleased.promise;
        return watched.parts;
      },
      judge: async () => {
        watcherClock.judges += 1;
        return passingCopyJudge();
      },
    },
  );
  await writerEntered.promise;
  watcherClock.now += 180_001;
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: watched.id },
      {
        now: () => watcherClock.now,
        generate: async () => {
          watcherClock.calls += 1;
          return watched.parts;
        },
        judge: passingCopyJudge,
      },
    ),
    /lease|uncertain/,
  );
  assert.equal((await jobs())[0]?.status, "uncertain");
  assert.ok((await jobs())[0]?.output?.["expiredLease"]);
  writerReleased.resolve();
  rejected(await lateFirst, /retained for reconciliation/);
  const lateJob = (await jobs())[0];
  assert.equal(lateJob?.status, "uncertain");
  assertCandidate(lateJob, watched);
  assert.equal(watcherClock.calls, 1);
  assert.equal(watcherClock.judges, 0);
  assert.equal((await row(watched.id)).messages.length, 0);
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: watched.id },
      {
        now: () => watcherClock.now,
        generate: async () => {
          watcherClock.calls += 1;
          return watched.parts;
        },
        judge: passingCopyJudge,
      },
    ),
    /lease|uncertain/,
  );
  assert.equal(watcherClock.calls, 1);
  console.log(
    "PASS expiry observed by another caller retains the original late response without replay",
  );

  const interrupted = await seed();
  const interruptedCalls = { writer: 0, judge: 0 };
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: interrupted.id },
      {
        generate: async () => {
          interruptedCalls.writer += 1;
          return interrupted.parts;
        },
        judge: async () => {
          interruptedCalls.judge += 1;
          assertPartial((await jobs())[0], interrupted);
          const unlocked = await independent.begin(async (connection) => {
            const result = await connection<
              { unlocked: boolean }[]
            >`select pg_try_advisory_xact_lock(hashtext('ecentic-outbound-workspace')) as unlocked`;
            return result[0]?.unlocked === true;
          });
          assert.equal(
            unlocked,
            true,
            "The quality judge must also run outside the database lock.",
          );
          throw new Error("Synthetic judge interruption.");
        },
      },
    ),
    /confirmed|Reconcile/,
  );
  assert.equal((await jobs())[0]?.status, "uncertain");
  assertPartial((await jobs())[0], interrupted);
  assert.deepEqual(interruptedCalls, { writer: 1, judge: 1 });
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: interrupted.id },
      {
        generate: async () => {
          interruptedCalls.writer += 1;
          return interrupted.parts;
        },
        judge: async () => {
          interruptedCalls.judge += 1;
          return passingCopyJudge();
        },
      },
    ),
    /confirmed|Reconcile/,
  );
  assert.deepEqual(interruptedCalls, { writer: 1, judge: 1 });
  assert.equal((await row(interrupted.id)).messages.length, 0);
  console.log(
    "PASS exact writer text survives judge interruption without another writer or judge purchase",
  );

  const changing = await seed();
  const changingCalls = { count: 0 };
  const original = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: changing.id },
      {
        judge: passingCopyJudge,
        generate: async () => {
          changingCalls.count += 1;
          await db
            .update(schema.outboundPlaybook)
            .set({
              revision: 2,
              settings: {
                ...changing.policy,
                voiceNotes: `${changing.policy.voiceNotes}\nUse simple sentences.`,
              },
            })
            .where(eq(schema.outboundPlaybook.id, "default"));
          return changing.parts;
        },
      },
    ),
  );
  const originalJob = (await jobs())[0];
  assert.ok(originalJob);
  assert.equal(originalJob.status, "complete");
  assert.equal(
    originalJob.input["globalVoiceNotes"],
    changing.policy.voiceNotes,
  );
  assert.equal(
    original.composition.writingPolicyHash,
    writingPolicyHash(
      settingsForProspect(await row(changing.id), changing.policy),
      { globalVoiceNotes: changing.policy.voiceNotes },
    ),
  );
  rejected(await save(changing, original), /policy changed/);
  assert.equal((await row(changing.id)).messages.length, 0);
  const replacement = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: changing.id },
      {
        judge: passingCopyJudge,
        generate: async () => {
          changingCalls.count += 1;
          return changing.parts;
        },
      },
    ),
  );
  assert.notEqual(replacement.composition.jobId, original.composition.jobId);
  assert.equal(changingCalls.count, 2);
  assert.equal((await jobs()).length, 2);
  assert.deepEqual(
    (await jobs()).find((job) => job.id === originalJob.id),
    originalJob,
  );
  value(await save(changing, replacement));
  console.log(
    "PASS in-flight policy change preserves old output and requires a new policy key",
  );

  const badCopy = await seed();
  const badCalls = { count: 0 };
  const invalid = async () => {
    badCalls.count += 1;
    if (badCalls.count === 2) {
      const candidates = writerCandidatesSchema.parse(
        (await jobs())[0]?.output?.["writerCandidates"],
      );
      assert.equal(
        candidates.length,
        1,
        "The first candidate is saved before a repair purchase.",
      );
      assert.equal(
        candidates[0]?.parts.result,
        "InventedCo guarantees ten new sales every day.",
      );
      assert.ok(candidates[0]?.issues.length);
    }
    return {
      ...badCopy.parts,
      result: "InventedCo guarantees ten new sales every day.",
    };
  };
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: badCopy.id },
      { judge: passingCopyJudge, generate: invalid },
    ),
    /Copy:/,
  );
  assert.equal(
    badCalls.count,
    2,
    "One initial attempt and at most one copy repair.",
  );
  assert.equal((await jobs())[0]?.status, "failed");
  const failedCandidates = writerCandidatesSchema.parse(
    (await jobs())[0]?.output?.["writerCandidates"],
  );
  assert.deepEqual(
    failedCandidates.map((candidate) => candidate.attempt),
    [1, 2],
  );
  assert.equal(
    (await jobs())[0]?.error,
    `Copy: ${failedCandidates[1]?.issues.join(" ")}`,
  );
  assert.equal((await row(badCopy.id)).messages.length, 0);
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: badCopy.id },
      { judge: passingCopyJudge, generate: invalid },
    ),
    /Copy:/,
  );
  assert.equal(badCalls.count, 2);
  console.log(
    "PASS bounded copy repair failure is cached without another purchase",
  );

  const superseded = await seed();
  const supersededCalls = { writer: 0, judge: 0 };
  const replacementLease: { output?: Record<string, unknown> } = {};
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: superseded.id },
      {
        generate: async () => {
          supersededCalls.writer += 1;
          const owned = (await jobs())[0];
          assert.ok(owned);
          replacementLease.output = {
            ...owned.output,
            lease: {
              token: randomUUID(),
              expiresAt: new Date(Date.now() + 180_000).toISOString(),
            },
            replacementLeaseOwner: true,
          };
          await db
            .update(schema.outboundIntegrationJob)
            .set({ output: replacementLease.output })
            .where(eq(schema.outboundIntegrationJob.id, owned.id));
          return superseded.parts;
        },
        judge: async () => {
          supersededCalls.judge += 1;
          return passingCopyJudge();
        },
      },
    ),
    /lease|Reconcile/,
  );
  assert.deepEqual((await jobs())[0]?.output, replacementLease.output);
  assert.deepEqual(supersededCalls, { writer: 1, judge: 0 });
  console.log(
    "PASS candidate checkpoint cannot overwrite a replacementLease lease",
  );

  const fresh = await seed();
  const freshCalls = { count: 0 };
  const originalFresh = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: fresh.id, expectedRevision: fresh.revision },
      {
        judge: passingCopyJudge,
        generate: async () => {
          freshCalls.count += 1;
          return fresh.parts;
        },
      },
    ),
  );
  await db
    .update(schema.outboundProspect)
    .set({ revision: fresh.revision + 1 })
    .where(eq(schema.outboundProspect.id, fresh.id));
  await db
    .update(schema.outboundPlaybook)
    .set({
      revision: 2,
      settings: {
        ...fresh.policy,
        automationEnabled: !fresh.policy.automationEnabled,
      },
    })
    .where(eq(schema.outboundPlaybook.id, "default"));
  rejected(await save(fresh, originalFresh), /draft changed/);
  const cached = value(
    await Composition.composeForProspect(
      actor,
      {
        prospectId: fresh.id,
        expectedRevision: fresh.revision + 1,
        expectedPlaybookRevision: 2,
      },
      {
        judge: passingCopyJudge,
        generate: async () => {
          freshCalls.count += 1;
          return fresh.parts;
        },
      },
    ),
  );
  assert.equal(cached.composition.jobId, originalFresh.composition.jobId);
  assert.equal(cached.composition.prospectRevision, fresh.revision);
  value(await save(fresh, cached, fresh.revision + 1));
  assert.equal(freshCalls.count, 1);
  console.log(
    "PASS fresh callers reuse cached output across unrelated revisions",
  );

  const bound = await seed();
  const boundOutput = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: bound.id },
      { judge: passingCopyJudge, generate: async () => bound.parts },
    ),
  );
  const other = value(
    await Store.saveProspect(
      actor,
      prospectSchema.parse({
        ...bound.prospect,
        id: undefined,
        company: "Other Goods",
        domain: "othergoods.test",
        email: "other@othergoods.test",
      }),
    ),
  );
  rejected(
    await Store.saveComposedDraft(actor, {
      prospect: other.prospect,
      revision: other.revision,
      compositionJobId: boundOutput.composition.jobId,
    }),
    /prospect, research/,
  );
  const prior = await row(bound.id);
  await db
    .update(schema.outboundProspect)
    .set({
      details: { ...prior.details, title: "Founder" },
      revision: prior.revision + 1,
    })
    .where(eq(schema.outboundProspect.id, bound.id));
  rejected(
    await save(bound, boundOutput, prior.revision + 1),
    /prospect, research/,
  );
  rejected(
    await Composition.composeForProspect(actor, { prospectId: bound.id }),
    /different prospect details/,
  );
  await db
    .update(schema.outboundProspect)
    .set({ details: prior.details, revision: prior.revision })
    .where(eq(schema.outboundProspect.id, bound.id));
  const previousReceipt = currentFixture.value.receipt;
  currentFixture.value = {
    ...currentFixture.value,
    receipt: {
      ...previousReceipt,
      selected: {
        ...previousReceipt.selected,
        scope: "Changed synthetic receipt context.",
      },
    },
  };
  rejected(await save(bound, boundOutput), /prospect, research/);
  currentFixture.value = { ...currentFixture.value, receipt: previousReceipt };
  const durable = (await jobs())[0];
  assert.ok(durable?.output);
  const candidateTamper = structuredClone(durable.output);
  const alteredCandidates = writerCandidatesSchema.parse(
    candidateTamper["writerCandidates"],
  );
  const firstCandidate = alteredCandidates[0];
  assert.ok(firstCandidate);
  firstCandidate.parts.result += " Altered diagnostic text.";
  candidateTamper["writerCandidates"] = alteredCandidates;
  await db
    .update(schema.outboundIntegrationJob)
    .set({ output: candidateTamper })
    .where(eq(schema.outboundIntegrationJob.id, durable.id));
  rejected(
    await Composition.loadCompletedComposition(undefined, durable.id),
    /candidate.*saved text/,
  );
  await db
    .update(schema.outboundIntegrationJob)
    .set({ output: durable.output })
    .where(eq(schema.outboundIntegrationJob.id, durable.id));
  const altered = structuredClone(durable.output);
  const alteredMessage = (altered["messages"] as { body: string }[])[0];
  assert.ok(alteredMessage);
  alteredMessage.body += " Unobserved extra promise.";
  await db
    .update(schema.outboundIntegrationJob)
    .set({ output: altered })
    .where(eq(schema.outboundIntegrationJob.id, durable.id));
  rejected(await save(bound, boundOutput), /original prospect, policy or text/);
  assert.equal((await row(bound.id)).messages.length, 0);
  console.log(
    "PASS cross-prospect, changed details, changed receipt and tampered output are rejected",
  );

  const failedQuality = await seed();
  const failJudge = async () => ({
    ...(await passingCopyJudge()),
    naturalVoice: { passed: false, reason: "This sentence sounds rehearsed." },
  });
  const failedOutput = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: failedQuality.id },
      { generate: async () => failedQuality.parts, judge: failJudge },
    ),
  );
  assert.equal(failedOutput.messages[0]?.writing?.quality?.passed, false);
  const failureSaved = value(await save(failedQuality, failedOutput));
  assert.match(failureSaved.copyProblem ?? "", /^Copy: naturalVoice:/);
  assert.ok(failureSaved.issues.some((issue) => issue.code === "copyQuality"));
  const failedRow = await row(failedQuality.id);
  assert.equal(failedRow.status, "held");
  assert.equal(failedRow.messages.length, 3);
  assert.equal(failedRow.holdReason, failureSaved.copyProblem);
  rejected(
    await Store.reviewProspect(actor, {
      prospect: failedQuality.id,
      revision: failedRow.revision,
      decision: "approve",
      quality: { passed: true },
    }),
    /Copy: naturalVoice:/,
  );
  const heldQuality = await seed(true);
  const heldOutput = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: heldQuality.id },
      { generate: async () => heldQuality.parts, judge: failJudge },
    ),
  );
  value(await save(heldQuality, heldOutput));
  assert.equal(
    (await row(heldQuality.id)).holdReason,
    "Original 21: unbranded evidence review required.",
  );
  console.log(
    "PASS failed judge verdict saves all copy, holds and preserves explicit hold text",
  );

  const approvedCopy = await seed(false, true);
  const passingOutput = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: approvedCopy.id },
      { generate: async () => approvedCopy.parts, judge: passingCopyJudge },
    ),
  );
  const approvalSaved = value(await save(approvedCopy, passingOutput));
  value(
    await Store.reviewProspect(actor, {
      prospect: approvedCopy.id,
      revision: approvalSaved.revision,
      decision: "approve",
    }),
  );
  const exactApproved = await row(approvedCopy.id);
  assert.equal(exactApproved.status, "approved");
  assert.equal(exactApproved.revision, approvalSaved.revision);
  assert.equal(
    exactApproved.messages[0]?.writing?.revision,
    approvalSaved.revision,
  );
  assert.equal(exactApproved.messages[0]?.writing?.quality?.passed, true);
  const approvedPolicy = await Store.policy();
  const exactHash = Store.contentHash(
    exactApproved.messages,
    Store.approvalManifest(
      exactApproved,
      approvedPolicy.settings,
      approvedPolicy.revision,
    ),
  );
  assert.equal(exactApproved.approvalHash, exactHash);
  const exactRevision = (await snapshot()).revisions.find(
    (entry) =>
      entry.prospectId === exactApproved.id &&
      entry.revision === approvalSaved.revision,
  );
  assert.ok(exactRevision?.approvedAt);
  assert.equal(exactRevision.contentHash, exactHash);
  const [approvedFirst, approvedFollowup, approvedLast] =
    exactApproved.messages;
  assert.ok(approvedFirst?.writing && approvedFollowup && approvedLast);
  const changedText = exactApproved.messages.map((message) =>
    message.step === 1
      ? { ...message, body: `${message.body} An unverified edit.` }
      : message,
  );
  await db
    .update(schema.outboundProspect)
    .set({ messages: changedText })
    .where(eq(schema.outboundProspect.id, approvedCopy.id));
  rejected(
    await Store.reviewProspect(actor, {
      prospect: approvedCopy.id,
      revision: approvalSaved.revision,
      decision: "approve",
    }),
    /trusted writing result/,
  );
  const changedVerdict = exactApproved.messages.map((message) =>
    message.writing
      ? {
          ...message,
          writing: {
            ...message.writing,
            quality: message.writing.quality
              ? {
                  ...message.writing.quality,
                  criteria: message.writing.quality.criteria.map(
                    (criterion, index) =>
                      index === 0
                        ? {
                            ...criterion,
                            reason:
                              "A client supplied this replacement verdict.",
                          }
                        : criterion,
                  ),
                }
              : null,
          },
        }
      : message,
  );
  await db
    .update(schema.outboundProspect)
    .set({ messages: changedVerdict })
    .where(eq(schema.outboundProspect.id, approvedCopy.id));
  rejected(
    await Store.reviewProspect(actor, {
      prospect: approvedCopy.id,
      revision: approvalSaved.revision,
      decision: "approve",
    }),
    /trusted writing result/,
  );
  await db
    .update(schema.outboundProspect)
    .set({ messages: exactApproved.messages })
    .where(eq(schema.outboundProspect.id, approvedCopy.id));
  const manualSaved = value(
    await Store.saveDraft(actor, {
      prospect: approvedCopy.id,
      revision: exactApproved.revision,
      subject: approvedFirst.subject,
      body: `${approvedFirst.body} Changed by the operator.`,
      followupOne: approvedFollowup.body,
      followupTwo: approvedLast.body,
      writing: approvedFirst.writing,
    }),
  );
  rejected(
    await Store.reviewProspect(actor, {
      prospect: approvedCopy.id,
      revision: manualSaved.revision,
      decision: "approve",
      quality: { passed: true },
    }),
    /trusted writing result/,
  );
  console.log(
    "PASS exact passing copy approves with its current revision and hash; edited text or verdict cannot reuse approval",
  );

  const sentCopy = await seed(false, true);
  const sentOutput = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: sentCopy.id },
      { generate: async () => sentCopy.parts, judge: passingCopyJudge },
    ),
  );
  const sentSaved = value(await save(sentCopy, sentOutput));
  value(
    await Store.reviewProspect(actor, {
      prospect: sentCopy.id,
      revision: sentSaved.revision,
      decision: "approve",
    }),
  );
  const sentApproved = await row(sentCopy.id);
  assert.ok(sentApproved.approvalHash);
  const sentRevision = (await snapshot()).revisions.find(
    (entry) =>
      entry.prospectId === sentCopy.id && entry.revision === sentSaved.revision,
  );
  assert.ok(sentRevision);
  const inbox = (
    await db
      .insert(schema.outboundInbox)
      .values({
        email: sentCopy.policy.fromEmail,
        fromName: sentCopy.policy.fromName,
        signer: sentCopy.policy.signature,
      })
      .returning()
  )[0];
  assert.ok(inbox);
  const delivered = (
    await db
      .insert(schema.outboundSendAttempt)
      .values({
        prospectId: sentCopy.id,
        inboxId: inbox.id,
        step: 1,
        revision: sentSaved.revision,
        messageId: `synthetic-${randomUUID()}`,
        providerMessageId: "synthetic-offline-delivery",
        status: "accepted",
        contentHash: sentApproved.approvalHash,
        completedAt: new Date(),
      })
      .returning()
  )[0];
  assert.ok(delivered);
  await db
    .update(schema.outboundProspect)
    .set({
      status: "active",
      sentStep: 1,
      inboxId: inbox.id,
      threadId: "synthetic-thread",
      firstSentAt: new Date(),
      lastSentAt: new Date(),
    })
    .where(eq(schema.outboundProspect.id, sentCopy.id));
  const [sentFirst, sentFollowup, sentLast] = sentApproved.messages;
  assert.ok(sentFirst && sentFollowup && sentLast);
  rejected(
    await Store.saveDraft(actor, {
      prospect: sentCopy.id,
      revision: sentSaved.revision,
      subject: sentFirst.subject,
      body: `${sentFirst.body} A retroactive edit.`,
      followupOne: sentFollowup.body,
      followupTwo: sentLast.body,
    }),
    /Previously sent message text is immutable/,
  );
  rejected(
    await save(sentCopy, sentOutput, sentSaved.revision),
    /sent sequence/,
  );
  const followupSaved = value(
    await Store.saveDraft(actor, {
      prospect: sentCopy.id,
      revision: sentSaved.revision,
      subject: sentFirst.subject,
      body: sentFirst.body,
      followupOne: `${sentFollowup.body} An operator follow-up edit.`,
      followupTwo: sentLast.body,
    }),
  );
  const preservedRevision = (await snapshot()).revisions.find(
    (entry) => entry.id === sentRevision.id,
  );
  assert.equal(preservedRevision?.contentHash, sentRevision.contentHash);
  assert.deepEqual(preservedRevision?.messages, sentRevision.messages);
  assert.deepEqual(
    (
      await db
        .select()
        .from(schema.outboundSendAttempt)
        .where(eq(schema.outboundSendAttempt.id, delivered.id))
    )[0],
    delivered,
  );
  assert.equal((await row(sentCopy.id)).messages[0]?.body, sentFirst.body);
  rejected(
    await Store.reviewProspect(actor, {
      prospect: sentCopy.id,
      revision: followupSaved.revision,
      decision: "approve",
    }),
    /trusted writing result/,
  );
  console.log(
    "PASS sent text, original revision metadata and delivery hash remain immutable after a remaining-follow-up edit",
  );

  const variety = await seed(false, true);
  const variedOutput = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: variety.id },
      { generate: async () => variety.parts, judge: passingCopyJudge },
    ),
  );
  const varietySaved = value(await save(variety, variedOutput));
  const peer = value(
    await Store.saveProspect(
      actor,
      prospectSchema.parse({
        ...variety.prospect,
        id: undefined,
        company: "Peer Goods",
        domain: "peergoods.test",
        email: "peer@peergoods.test",
      }),
    ),
  );
  await db
    .update(schema.outboundProspect)
    .set({ status: "approved", messages: (await row(variety.id)).messages })
    .where(eq(schema.outboundProspect.id, peer.prospect));
  rejected(
    await Store.reviewProspect(actor, {
      prospect: variety.id,
      revision: varietySaved.revision,
      decision: "approve",
    }),
    /Copy:.*(?:relationship|opening)/,
  );
  assert.equal((await row(variety.id)).approvedAt, null);
  console.log(
    "PASS approval rechecks current peer variety under the write lock",
  );

  const policyOnly = await seed(false, true);
  const policyOutput = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: policyOnly.id },
      { generate: async () => policyOnly.parts, judge: passingCopyJudge },
    ),
  );
  const policySaved = value(await save(policyOnly, policyOutput));
  await db
    .update(schema.outboundPlaybook)
    .set({
      revision: 2,
      settings: {
        ...policyOnly.policy,
        senderConfirmed: true,
        dailyCompanyTarget: policyOnly.policy.dailyCompanyTarget + 1,
      },
    })
    .where(eq(schema.outboundPlaybook.id, "default"));
  const refreshedPolicy = value(
    await Store.generateDrafts(actor, {
      prospect: policyOnly.id,
      expectedRevision: policySaved.revision,
    }),
  );
  assert.equal(refreshedPolicy.revision, policySaved.revision + 1);
  assert.equal((await jobs()).length, 1);
  assert.equal((await row(policyOnly.id)).playbookRevision, 2);
  value(
    await Store.reviewProspect(actor, {
      prospect: policyOnly.id,
      revision: refreshedPolicy.revision,
      decision: "approve",
    }),
  );
  assert.equal((await row(policyOnly.id)).status, "approved");
  console.log(
    "PASS unrelated policy revision reuses copy in a current approval manifest",
  );

  const autoFailure = await seed();
  const campaignId = randomUUID();
  const automatedPolicy = { ...autoFailure.policy, automationEnabled: true };
  await db
    .update(schema.outboundPlaybook)
    .set({ settings: automatedPolicy })
    .where(eq(schema.outboundPlaybook.id, "default"));
  await db.insert(schema.outboundCampaign).values({
    id: campaignId,
    name: "Synthetic lifecycle campaign",
    status: "active",
    criteria: defaultCampaignCriteria(automatedPolicy),
    revision: 1,
    createdBy: actor,
    updatedBy: actor,
  });
  await db
    .update(schema.outboundProspect)
    .set({ campaignId, status: "draft" })
    .where(eq(schema.outboundProspect.id, autoFailure.id));
  const autoOutput = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: autoFailure.id },
      { generate: async () => autoFailure.parts, judge: failJudge },
    ),
  );
  const autoRow = await row(autoFailure.id);
  const token = randomUUID();
  const autoJob = (
    await db
      .insert(schema.outboundIntegrationJob)
      .values({
        provider: "automation",
        prospectId: autoFailure.id,
        status: "starting",
        input: {
          operation: "draftReview",
          prospectId: autoFailure.id,
          prospectRevision: autoRow.revision,
          campaignId,
          campaignRevision: 1,
          playbookRevision: 1,
          regenerate: true,
          copyReadinessHash: draftCopyReadiness(autoRow.messages).readinessHash,
          readinessKey: draftReviewReadinessKey(
            autoRow.details,
            automatedPolicy.senderConfirmed,
            automatedPolicy.allowStaleEvidence,
            automatedPolicy.trustSavedContactVerification,
            automatedPolicy.allowProductObservations,
            automatedPolicy.allowUsMarketWindow,
            automatedPolicy.allowMicrosoftRecipients,
          ),
          resumeId: "",
        },
        output: {
          stage: "apply",
          lease: {
            token,
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
          compositionJobId: autoOutput.composition.jobId,
          messages: autoOutput.messages,
        },
      })
      .returning()
  )[0];
  assert.ok(autoJob);
  await db
    .update(schema.outboundIntegrationJob)
    .set({ input: { ...autoJob.input, copyReadinessHash: "0".repeat(64) } })
    .where(eq(schema.outboundIntegrationJob.id, autoJob.id));
  const beforeStaleApply = await snapshot();
  rejected(
    await Store.applyAutomaticDraftReview({ job: autoJob.id, token }),
    /changed during automatic review/,
  );
  assert.deepEqual(await snapshot(), beforeStaleApply);
  await db
    .update(schema.outboundIntegrationJob)
    .set({ input: autoJob.input })
    .where(eq(schema.outboundIntegrationJob.id, autoJob.id));
  const appliedFailure = value(
    await Store.applyAutomaticDraftReview({ job: autoJob.id, token }),
  );
  assert.equal(appliedFailure.status, "held");
  assert.equal((await row(autoFailure.id)).messages.length, 3);
  assert.equal(
    (await row(autoFailure.id)).messages[0]?.writing?.quality?.passed,
    false,
  );
  assert.equal(
    (await jobs()).find((job) => job.id === autoJob.id)?.status,
    "complete",
  );
  assert.equal((await row(autoFailure.id)).approvedAt, null);
  console.log(
    "PASS automatic failed review commits its failed copy revision instead of rolling back",
  );

  const reopenRevision = (await row(autoFailure.id)).revision;
  value(
    await Store.reviewProspect(actor, {
      prospect: autoFailure.id,
      revision: reopenRevision,
      decision: "review",
      reason: "",
    }),
  );
  const reopened = await row(autoFailure.id);
  const repeatToken = randomUUID();
  const resumeId = await Store.latestDraftReviewRequest(undefined, reopened.id);
  const repeatJob = (
    await db
      .insert(schema.outboundIntegrationJob)
      .values({
        provider: "automation",
        prospectId: reopened.id,
        status: "starting",
        input: {
          ...autoJob.input,
          prospectRevision: reopened.revision,
          regenerate: false,
          copyReadinessHash: draftCopyReadiness(reopened.messages)
            .readinessHash,
          resumeId,
        },
        output: {
          stage: "apply",
          lease: {
            token: repeatToken,
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
        },
      })
      .returning()
  )[0];
  assert.ok(repeatJob);
  const previousRevisionCount = (await snapshot()).revisions.length;
  const repeatedFailure = value(
    await Store.applyAutomaticDraftReview({
      job: repeatJob.id,
      token: repeatToken,
    }),
  );
  assert.equal(repeatedFailure.status, "held");
  assert.equal(repeatedFailure.revision, reopened.revision);
  assert.equal((await snapshot()).revisions.length, previousRevisionCount);
  assert.equal(
    (await jobs()).filter(
      (job) => job.input["operation"] === "sequenceComposition",
    ).length,
    1,
  );
  console.log(
    "PASS stale review claim cannot apply; reopened known failed copy holds without regeneration",
  );

  const previewFixture = await seed(true, true);
  const originalPolicy = await db.select().from(schema.outboundPlaybook);
  const proposed = rebuildWritingProposal(previewFixture.policy);
  const previewParts = {
    ...previewFixture.parts,
    relevance: "That's the kind of search a new customer starts with.",
  };
  const previewResult = value(
    await Composition.composeForProspect(
      actor,
      {
        prospectId: previewFixture.id,
        expectedRevision: previewFixture.revision,
        preview: true,
      },
      { generate: async () => previewParts, judge: passingCopyJudge },
    ),
  );
  assert.equal(previewResult.preview, true);
  assert.deepEqual(
    previewResult.policySnapshot.senderProfiles,
    previewFixture.policy.senderProfiles,
  );
  assert.equal(
    previewResult.policySnapshot.founderLine,
    previewFixture.policy.founderLine,
  );
  assert.equal(previewResult.policySnapshot.voiceNotes, proposed.voiceNotes);
  const previewSaved = value(await save(previewFixture, previewResult));
  const previewRow = await row(previewFixture.id);
  assert.equal(previewRow.status, "held");
  assert.equal(
    previewRow.holdReason,
    "Original 21: unbranded evidence review required.",
  );
  assert.equal(
    previewRow.messages[0]?.writing?.compositionJobId,
    previewResult.composition.jobId,
  );
  assert.equal(previewRow.messages[0]?.writing?.quality?.passed, true);
  assert.deepEqual(
    await db.select().from(schema.outboundPlaybook),
    originalPolicy,
  );
  rejected(
    await Store.reviewProspect(actor, {
      prospect: previewFixture.id,
      revision: previewSaved.revision,
      decision: "approve",
      reason: "",
    }),
    /trusted writing result/,
  );

  const manualParts = { ...previewParts, subject: "linen tote" };
  const manualCalls = { writer: 0, judge: 0 };
  const manualResult = value(
    await Composition.composeForProspect(
      actor,
      {
        prospectId: previewFixture.id,
        expectedRevision: previewSaved.revision,
        preview: true,
        suppliedParts: manualParts,
      },
      {
        generate: async () => {
          manualCalls.writer += 1;
          throw new Error("Human copy must not be rewritten.");
        },
        judge: async () => {
          manualCalls.judge += 1;
          return passingCopyJudge();
        },
      },
    ),
  );
  assert.equal(
    manualResult.composition.key.startsWith("sequence-review:"),
    true,
  );
  assert.deepEqual(manualResult.messages[0]?.writing?.parts, manualParts);
  assert.equal(manualCalls.writer, 0);
  assert.equal(manualCalls.judge, 1);
  const manuallySaved = value(
    await save(previewFixture, manualResult, previewSaved.revision),
  );
  const manualAgain = value(
    await Composition.composeForProspect(
      actor,
      {
        prospectId: previewFixture.id,
        expectedRevision: manuallySaved.revision,
        preview: true,
        suppliedParts: manualParts,
      },
      {
        generate: async () => {
          throw new Error("No repeated writer purchase.");
        },
        judge: async () => {
          throw new Error("No repeated judge purchase.");
        },
      },
    ),
  );
  assert.equal(manualAgain.composition.jobId, manualResult.composition.jobId);
  assert.deepEqual(
    await db.select().from(schema.outboundPlaybook),
    originalPolicy,
  );
  const beforeManualRetry = await snapshot();
  value(await save(previewFixture, manualAgain, manuallySaved.revision));
  assert.deepEqual(await snapshot(), beforeManualRetry);

  // Adopting exactly the proposed policy still preserves the deliberate hold.
  await db
    .update(schema.outboundPlaybook)
    .set({ settings: proposed, revision: 2 })
    .where(eq(schema.outboundPlaybook.id, "default"));
  const adopted = value(
    await save(previewFixture, manualAgain, manuallySaved.revision),
  );
  assert.equal((await row(previewFixture.id)).status, "held");
  assert.equal(
    (await row(previewFixture.id)).holdReason,
    previewRow.holdReason,
  );
  value(
    await Store.reviewProspect(actor, {
      prospect: previewFixture.id,
      revision: adopted.revision,
      decision: "approve",
      reason: "",
    }),
  );
  assert.equal((await row(previewFixture.id)).status, "approved");
  console.log(
    "PASS held proposals never change live policy; human parts are judged without rewriting and reused exactly",
  );

  // A historical v1 durable result is readable byte-for-byte, but its old
  // writer/quality identity cannot authorize a current draft save.
  const legacyFixture = await seed(true);
  const legacyBase = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: legacyFixture.id },
      {
        generate: async () => legacyFixture.parts,
        judge: passingCopyJudge,
      },
    ),
  );
  const legacyJob = (await jobs()).find(
    (job) => job.id === legacyBase.composition.jobId,
  );
  assert.ok(legacyJob);
  const legacyInput = structuredClone(legacyJob.input);
  const legacyOutput = structuredClone(legacyJob.output);
  assert.ok(legacyOutput);
  const oldPolicy = playbookSchema.parse(legacyInput["settings"]);
  oldPolicy.followupOneTemplate =
    "Hey {first},\n\n{followupFact} {callToAction}\n\n{optout}\n\n{signature}";
  oldPolicy.followupTwoTemplate =
    "Hey {first},\n\nLast note from me.\n\n{optout}\n\n{signature}";
  const globalVoice = legacyInput["globalVoiceNotes"];
  assert.equal(typeof globalVoice, "string");
  const oldHash = legacyWritingPolicyHash(oldPolicy, {
    globalVoiceNotes: String(globalVoice),
  });
  const oldKey = Composition.compositionJobKey(
    legacyFixture.id,
    legacyBase.composition.receiptHash,
    oldHash,
  );
  const oldParts = { ...legacyFixture.parts, followupFact: "" };
  const legacyFirst = legacyBase.messages[0];
  assert.ok(legacyFirst?.writing);
  const oldWriting = legacyWritingSnapshotSchema.parse({
    ...legacyFirst.writing,
    version: "discovery-email-v1",
    writingPolicyHash: oldHash,
    parts: oldParts,
  });
  const oldMessages: Message[] = legacyBase.messages.map((message) =>
    message.step === 1 ? { ...message, writing: oldWriting } : message,
  );
  const oldCanonical = canonicalSequenceInput(oldMessages);
  assert.equal(oldCanonical.status, "ready");
  if (oldCanonical.status !== "ready")
    throw new Error("Historical canonical text missing.");
  const oldContentHash = createHash("sha256")
    .update(oldCanonical.canonicalText)
    .digest("hex");
  oldWriting.contentHash = oldContentHash;
  legacyInput["settings"] = oldPolicy;
  legacyInput["writingPolicyHash"] = oldHash;
  legacyInput["key"] = oldKey;
  legacyOutput["messages"] = oldMessages;
  legacyOutput["composition"] = {
    ...legacyBase.composition,
    key: oldKey,
    writingPolicyHash: oldHash,
    contentHash: oldContentHash,
  };
  assert.deepEqual(legacyInput["peers"], []);
  legacyOutput["writerCandidates"] = writerCandidatesSchema
    .parse(legacyOutput["writerCandidates"])
    .map((candidate) => ({
      ...candidate,
      parts: oldParts,
      partsHash: createHash("sha256")
        .update(JSON.stringify(oldParts))
        .digest("hex"),
      writingPolicyHash: oldHash,
      contextHash: writerCandidateContextHash({
        ...candidate,
        writingPolicyHash: oldHash,
        peers: [],
      }),
    }));
  await db
    .update(schema.outboundIntegrationJob)
    .set({ input: legacyInput, output: legacyOutput, requestId: oldKey })
    .where(eq(schema.outboundIntegrationJob.id, legacyJob.id));
  const beforeLegacyRead = await snapshot();
  const legacyRead = value(
    await Composition.loadCompletedComposition(undefined, legacyJob.id),
  );
  assert.deepEqual(legacyRead.messages, oldMessages);
  assert.deepEqual(legacyRead.messages[0]?.writing?.parts, oldParts);
  assert.deepEqual(await snapshot(), beforeLegacyRead);
  assert.equal((await save(legacyFixture, legacyRead)).success, false);
  assert.deepEqual(await snapshot(), beforeLegacyRead);
  console.log(
    "PASS historical five-part jobs read without hash loss and cannot authorize current saves",
  );

  console.log(
    "Durable sequence composition and trusted Store contracts passed.",
  );
} finally {
  evidence.mockRestore();
  await independent.end();
  await db.$client.end();
}
