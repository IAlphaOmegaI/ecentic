import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { prospectSchema, settingsForProspect } from "@/lib/outbound";
import { canonicalSequenceInput } from "@/lib/outbound-composition";
import type { CompletedComposition } from "@/server/app/outbound/sequence-composition";
import { writingPolicyHash } from "@/server/utils/outbound/shopping-policy";
import { requireTestDatabase } from "../helpers/database";
import { writerFixture } from "../helpers/outbound-writer-fixture";

const endpoint = requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
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
const seed = async (held = false) => {
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

try {
  // One durable purchase feeds the shared service and manual Generate entry point.
  const held = await seed(true);
  const calls = { count: 0, unlocked: false };
  const composed = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: held.id, expectedRevision: held.revision },
      {
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
  const reused = value(
    await Composition.composeForProspect(
      "another-caller",
      { prospectId: held.id },
      {
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
  assert.equal(savedRow.messages[0]?.writing?.quality, null);
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
  const clock = { now: Date.now(), calls: 0 };
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: lost.id },
      {
        now: () => clock.now,
        generate: async () => {
          clock.calls += 1;
          clock.now += 180_001;
          return lost.parts;
        },
      },
    ),
    /lease expired/,
  );
  assert.equal((await jobs())[0]?.status, "uncertain");
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: lost.id },
      {
        now: () => clock.now,
        generate: async () => {
          clock.calls += 1;
          return lost.parts;
        },
      },
    ),
    /lease expired/,
  );
  assert.equal(clock.calls, 1);
  assert.ok(
    (await jobs())[0]?.output?.["unappliedResult"],
    "An expired response remains available for reconciliation.",
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

  const changing = await seed();
  const changingCalls = { count: 0 };
  const original = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: changing.id },
      {
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
    return {
      ...badCopy.parts,
      result: "InventedCo guarantees ten new sales every day.",
    };
  };
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: badCopy.id },
      { generate: invalid },
    ),
    /Copy:/,
  );
  assert.equal(
    badCalls.count,
    2,
    "One initial attempt and at most one copy repair.",
  );
  assert.equal((await jobs())[0]?.status, "failed");
  rejected(
    await Composition.composeForProspect(
      actor,
      { prospectId: badCopy.id },
      { generate: invalid },
    ),
    /Copy:/,
  );
  assert.equal(badCalls.count, 2);
  console.log(
    "PASS bounded copy repair failure is cached without another purchase",
  );

  const fresh = await seed();
  const freshCalls = { count: 0 };
  const originalFresh = value(
    await Composition.composeForProspect(
      actor,
      { prospectId: fresh.id, expectedRevision: fresh.revision },
      {
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
      { generate: async () => bound.parts },
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

  console.log(
    "Durable sequence composition and trusted Store contracts passed.",
  );
} finally {
  evidence.mockRestore();
  await independent.end();
  await db.$client.end();
}
