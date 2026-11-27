import { mock, setSystemTime } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { and, eq, getTableColumns, sql } from "drizzle-orm";
import {
  defaultPlaybook,
  prospectSchema,
  settingsForSender,
} from "@/lib/outbound";
import {
  REPLACEMENT_EARLIEST,
  REPLACEMENT_MANIFEST_HASH,
  REPLACEMENT_SENDER,
} from "@/lib/outbound-replacements";
import { REVIEWED_COPY_RULES_VERSION } from "@/lib/outbound-round3-copy";
import { requireTestDatabase } from "../helpers/database";
import { draftSyntheticProspect } from "../helpers/outbound-shopping-db-fixture";
import {
  buildSyntheticShoppingEvidence,
  syntheticWriterParts,
  syntheticWritingPolicy,
} from "../helpers/outbound-shopping-fixture";
import { passingCopyJudge } from "../helpers/outbound-writer-fixture";

requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
mock.module("server-only", () => ({}));
const { db, schema } = await import("@/server/database");
const Store = await import("@/server/app/outbound/store");
const Replacement = await import("@/server/app/outbound/replacement-sequences");
const Conversations = await import("@/server/app/outbound/conversations");
const Transport = await import("@/server/app/outbound/transport-store");
const Draft = await import("@/server/utils/outbound/draft");
const { projectProductListingProof } = await import(
  "@/server/utils/outbound/shopping-product-listings"
);
const { projectRound3CopyProof } = await import(
  "@/server/utils/outbound/round3-copy-evidence"
);
const { compositionProspectHash, writingPolicyHash } = await import(
  "@/server/utils/outbound/shopping-policy"
);
const { heldReviewPreviewSchema } = await import(
  "@/server/utils/outbound/held-review-contract"
);
const actor = "synthetic-owner-replacement-review";
const originalDate = new Date("2026-11-26T14:00:00Z");
const reviewDate = new Date("2026-11-30T14:00:00Z");
const sendDate = new Date("2026-12-02T14:00:00Z");
const oldEmail = "iseld@joinecentic.com";
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const policy = syntheticWritingPolicy({
  ...defaultPlaybook,
  fromEmail: oldEmail,
  senderEmails: `${oldEmail}\n${REPLACEMENT_SENDER}`,
  emailVerificationDays: 30,
  senderConfirmed: true,
  historyConfirmed: true,
  competingSendersPaused: true,
  senderTested: true,
  sendingEnabled: true,
  senderProfiles: [
    {
      email: REPLACEMENT_SENDER,
      fromName: "Xhurian ecentic",
      signature: "Xhurian",
      founderLine:
        "I'm Xhurian, founder of ecentic. We help stores show product details to shopping assistants.",
      productCheckIntro:
        "I'm Xhurian, founder of ecentic. We help stores show product details to shopping assistants.",
      voiceNotes: "Short, plain sentences from Xhurian.",
    },
  ],
});
const hash = Replacement.replacementHash;
const rowHash = (
  table:
    | typeof schema.outboundProspect
    | typeof schema.outboundSendAttempt
    | typeof schema.outboundRevision
    | typeof schema.outboundIntegrationJob,
) =>
  sql<string>`encode(sha256(convert_to(to_jsonb(${table})::text,'UTF8')),'hex')`;
const legacyHash = sql<string>`encode(sha256(convert_to((to_jsonb(${schema.outboundProspect})-'replacement_of'-'replacement_authorization')::text,'UTF8')),'hex')`;
const read = async (id: string) => {
  const [row] = await db
    .select()
    .from(schema.outboundProspect)
    .where(eq(schema.outboundProspect.id, id));
  assert.ok(row);
  return row;
};
const reset = async () => {
  await db.execute(
    sql`truncate outbound_campaign_company,outbound_campaign,outbound_integration_job,outbound_send_attempt,outbound_event,outbound_revision,outbound_prospect,outbound_person,outbound_company,outbound_suppression,outbound_inbox,outbound_playbook cascade`,
  );
};
const seed = async (
  legacy = false,
  originalAt = originalDate,
  previewAt = reviewDate,
) => {
  await reset();
  setSystemTime(originalAt);
  value(
    await Store.savePlaybook(actor, {
      ...policy,
      senderEmails: oldEmail,
      sendingEnabled: false,
    }),
  );
  const inboxes = await db
    .insert(schema.outboundInbox)
    .values(
      [oldEmail, REPLACEMENT_SENDER].map((email) => ({
        email,
        fromName: email === oldEmail ? policy.fromName : "Xhurian ecentic",
        signer: email === oldEmail ? policy.signature : "Xhurian",
        enabled: true,
        refreshToken: "synthetic-token",
        lastSyncedAt: originalAt,
      })),
    )
    .returning();
  const oldInbox = inboxes.find((row) => row.email === oldEmail);
  const newInbox = inboxes.find((row) => row.email === REPLACEMENT_SENDER);
  assert.ok(oldInbox && newInbox);
  const created = value(
    await Store.saveProspect(
      actor,
      prospectSchema.parse({
        company: "Sample Goods",
        domain: "samplegoods.test",
        website: "https://samplegoods.test",
        country: "US",
        platform: "shopify",
        name: "Jane Smith",
        first: "Jane",
        title: "Head of Growth",
        email: "jane@samplegoods.test",
        emailStatus: "verified",
        emailVerifiedAt: originalAt.toISOString(),
        emailSource: "synthetic-verifier:receipt",
        roleSource: "https://samplegoods.test/team",
        roleCheckedAt: originalAt.toISOString(),
        timezone: "America/New_York",
        mxProvider: "google",
        mxCheckedAt: originalAt.toISOString(),
        product: "Linen tote",
        productUrl: "https://samplegoods.test/products/tote",
        productCategory: "linen bags",
        finding: "The page omits dimensions.",
        evidence: "Synthetic product source.",
        evidenceCheckedAt: originalAt.toISOString(),
        legitEvidence: "Synthetic active product catalogue.",
        assignedSenderEmail: oldEmail,
      }),
    ),
  );
  const drafted = value(await draftSyntheticProspect(actor, created));
  value(
    await Store.reviewProspect(actor, {
      prospect: created.prospect,
      revision: drafted.revision,
      decision: "approve",
    }),
  );
  value(await Store.savePlaybook(actor, policy));
  const claim = value(
    await Store.claimDelivery(actor, {
      prospect: created.prospect,
      inbox: oldInbox.id,
    }),
  );
  value(
    await Store.dispatchDelivery(actor, claim, async () => ({
      success: true,
      data: {
        providerMessageId: "original-provider-id",
        threadId: "original-thread-id",
      },
    })),
  );
  value(
    await Store.reviewProspect(actor, {
      prospect: created.prospect,
      revision: drafted.revision,
      decision: "hold",
      reason: "Owner requested fresh reviewed outreach; preserve original.",
    }),
  );
  setSystemTime(previewAt);
  value(
    await Store.savePlaybook(actor, {
      ...policy,
      sendingEnabled: false,
      outreachNotBefore: REPLACEMENT_EARLIEST,
    }),
  );
  await db.update(schema.outboundPlaybook).set({ revision: 15 });
  const settings = await Store.policy();
  const original = await read(created.prospect);
  const [source] = await db
    .select({ hash: legacy ? legacyHash : rowHash(schema.outboundProspect) })
    .from(schema.outboundProspect)
    .where(eq(schema.outboundProspect.id, original.id));
  const [attempt] = await db
    .select({
      ...getTableColumns(schema.outboundSendAttempt),
      hash: rowHash(schema.outboundSendAttempt),
    })
    .from(schema.outboundSendAttempt)
    .where(eq(schema.outboundSendAttempt.prospectId, original.id));
  const [revision] = await db
    .select({
      ...getTableColumns(schema.outboundRevision),
      hash: rowHash(schema.outboundRevision),
    })
    .from(schema.outboundRevision)
    .where(
      and(
        eq(schema.outboundRevision.prospectId, original.id),
        eq(schema.outboundRevision.revision, attempt!.revision),
      ),
    );
  assert.ok(source && attempt && revision);
  const details = prospectSchema.parse({
    ...original.details,
    id: original.id,
    assignedSenderEmail: REPLACEMENT_SENDER,
  });
  const capture = await buildSyntheticShoppingEvidence({ prospect: details });
  const linked = projectProductListingProof(capture.evidence, capture.receipt);
  assert.equal(linked.status, "eligible");
  if (linked.status !== "eligible")
    throw Error("Missing synthetic product links");
  const receipt = value(
    projectRound3CopyProof(capture.evidence, linked.receipt),
  );
  const parts = syntheticWriterParts(details, receipt, 4);
  const composed = value(
    await Draft.composeSequence(details, receipt, settings.settings, {
      suppliedParts: parts,
      judge: passingCopyJudge,
      copyRulesVersion: REVIEWED_COPY_RULES_VERSION,
    }),
  );
  assert.equal(composed.messages[0]?.writing?.quality?.passed, true);
  const effective = settingsForSender(settings.settings, REPLACEMENT_SENDER);
  const context = {
    status: "unapplied",
    prospect: details,
    prospectRevision: original.revision,
    playbookRevision: settings.revision,
    proposedPolicy: settings.settings,
    globalVoiceNotes: settings.settings.voiceNotes,
    receiptHash: hash(receipt),
    writingPolicyHash: writingPolicyHash(effective, {
      globalVoiceNotes: settings.settings.voiceNotes,
      copyRulesVersion: REVIEWED_COPY_RULES_VERSION,
    }),
    baseWritingPolicyHash: writingPolicyHash(effective, {
      globalVoiceNotes: settings.settings.voiceNotes,
    }),
    prospectHash: compositionProspectHash(details),
    peers: [],
  };
  const preview = heldReviewPreviewSchema.parse({
    ...context,
    parts,
    messages: composed.messages,
    generation: composed.generation,
    issues: composed.issues,
  });
  const binding = {
    prospectId: original.id,
    prospectRowHash: source.hash,
    firstAttemptHash: attempt.hash,
    firstRevisionHash: revision.hash,
    prospectRevision: original.revision,
    campaignRevision: 0,
    details,
    manifestItem: {
      prospectId: original.id,
      company: details.company,
      firstAttemptId: attempt.id,
      firstSentRevision: attempt.revision,
      firstContentHash: attempt.contentHash,
      holdEligible: true,
    },
  };
  const rows = [
    binding,
    ...Array.from({ length: 45 }, () => {
      const id = randomUUID();
      return {
        ...binding,
        prospectId: id,
        details: { ...details, id },
        manifestItem: { ...binding.manifestItem, prospectId: id },
      };
    }),
  ];
  const [policyBinding] = await db
    .select({
      hash: sql<string>`encode(sha256(convert_to(to_jsonb(${schema.outboundPlaybook})::text,'UTF8')),'hex')`,
    })
    .from(schema.outboundPlaybook);
  assert.ok(policyBinding);
  assert.notEqual(policyBinding.hash, hash(settings.settings));
  const batchRequest = Replacement.replacementPreviewBatchSchema.parse({
    version: 1,
    actor,
    policyRevision: 15,
    policyHash: policyBinding.hash,
    settings: settings.settings,
    earliest: REPLACEMENT_EARLIEST,
    maxQueries: 50,
    maxPerLead: 2,
    manifestHash: REPLACEMENT_MANIFEST_HASH,
    sender: REPLACEMENT_SENDER,
    rows,
  });
  const [batch] = await db
    .insert(schema.outboundIntegrationJob)
    .values({
      provider: "automation",
      requestId: randomUUID(),
      status: "complete",
      input: { operation: "badEmailFreshPreviewBatchV1", ...batchRequest },
      output: {},
    })
    .returning();
  assert.ok(batch);
  const [job] = await db
    .insert(schema.outboundIntegrationJob)
    .values({
      provider: "automation",
      prospectId: original.id,
      requestId: randomUUID(),
      status: "complete",
      input: {
        operation: "badEmailFreshPreviewV1",
        batchId: batch.id,
        requestHash: hash(batchRequest),
        binding,
      },
      output: {
        stage: "complete",
        lease: null,
        shoppingReceipt: receipt,
        answer: capture.evidence.answer,
        browser: capture.evidence.browser,
        previewContext: context,
        preview,
      },
    })
    .returning();
  assert.ok(job);
  const [jobHash] = await db
    .select({ hash: rowHash(schema.outboundIntegrationJob) })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, job.id));
  assert.ok(jobHash);
  const request = {
    sourceProspectId: original.id,
    expectedRevision: original.revision,
    previewJobId: job.id,
    previewJobHash: jobHash.hash,
    authorizationReference: hash(
      "Synthetic owner approved exact subject and all bodies",
    ),
    reviewedSubject: parts.subject,
  };
  return {
    request,
    original,
    attempt,
    revision,
    newInbox,
    oldInbox,
    preview,
    settings,
  };
};
const protectedHistory = async (id: string) => ({
  row: await read(id),
  attempts: await db
    .select()
    .from(schema.outboundSendAttempt)
    .where(eq(schema.outboundSendAttempt.prospectId, id)),
  revisions: await db
    .select()
    .from(schema.outboundRevision)
    .where(eq(schema.outboundRevision.prospectId, id)),
});
const prepare = async (fixture: Awaited<ReturnType<typeof seed>>) => {
  const child = value(
    await Replacement.createReplacement(actor, fixture.request),
  );
  const row = await read(child.prospectId);
  const prepared = value(
    await Replacement.prepareReplacement(
      actor,
      { prospectId: row.id, expectedRevision: row.revision },
      {
        generate: async () => {
          throw Error("Replacement must not call writer");
        },
        judge: passingCopyJudge,
      },
    ),
  );
  return { child, prepared, row: await read(child.prospectId) };
};

// Apply the real additive migration to both historical constraint names; old row values stay exact.
{
  const migration = await readFile(
    resolve(
      import.meta.dir,
      "../../../../../web/drizzle/20261127210000_outbound_replacement_sequence/migration.sql",
    ),
    "utf8",
  );
  for (const constraint of [
    "outbound_prospect_company_id_key",
    "outbound_prospect_company_id_unique",
  ]) {
    await db.transaction(async (scope) => {
      const namespace = `replacement_migration_${constraint.endsWith("key") ? "key" : "unique"}`;
      await scope.execute(sql.raw(`create schema ${namespace}`));
      await scope.execute(sql.raw(`set local search_path to ${namespace}`));
      await scope.execute(sql`set local client_min_messages = warning`);
      await scope.execute(
        sql.raw(
          `create table outbound_prospect (id text primary key, company_id text not null constraint ${constraint} unique, details jsonb not null, sent_step integer not null)`,
        ),
      );
      await scope.execute(
        sql`insert into outbound_prospect values ('historical','company','{"email":"same@merchant.test","history":"preserved"}',1)`,
      );
      const before = await scope.execute(
        sql`select to_jsonb(outbound_prospect) as row from outbound_prospect`,
      );
      for (const statement of migration
        .split("--> statement-breakpoint")
        .map((item) => item.trim())
        .filter(Boolean))
        await scope.execute(sql.raw(statement));
      const after = await scope.execute(
        sql`select to_jsonb(outbound_prospect)-'replacement_of'-'replacement_authorization' as row from outbound_prospect`,
      );
      assert.deepEqual(after, before);
      await scope.execute(
        sql`insert into outbound_prospect (id,company_id,details,sent_step,replacement_of,replacement_authorization) values ('fresh','company','{}',0,'historical','{}')`,
      );
      await assert.rejects(
        scope.transaction((tx) =>
          tx.execute(
            sql`insert into outbound_prospect (id,company_id,details,sent_step,replacement_of,replacement_authorization) values ('second','company','{}',0,'historical','{}')`,
          ),
        ),
      );
      await assert.rejects(
        scope.transaction((tx) =>
          tx.execute(
            sql`insert into outbound_prospect (id,company_id,details,sent_step) values ('duplicate','company','{}',0)`,
          ),
        ),
      );
      await scope.execute(sql`drop table outbound_prospect`);
      await scope.execute(sql.raw(`drop schema ${namespace}`));
    });
  }
}

// Real source capture, normal research/composition, concurrent idempotence and separate delivery identity.
{
  const fixture = await seed(true);
  const before = await protectedHistory(fixture.original.id);
  const children = await Promise.all([
    Replacement.createReplacement(actor, fixture.request),
    Replacement.createReplacement(actor, fixture.request),
  ]);
  assert.equal(value(children[0]!).prospectId, value(children[1]!).prospectId);
  const childId = value(children[0]!).prospectId;
  assert.equal(
    (
      await Store.saveProspect(actor, {
        ...(
          await read(childId)
        ).details,
        email: "second-person@samplegoods.test",
      })
    ).success,
    false,
  );

  const blank = await read(childId);
  assert.equal(blank.sentStep, 0);
  assert.equal(blank.threadId, null);
  assert.equal(blank.messages.length, 0);
  assert.equal(blank.status, "held");
  assert.equal(blank.personId, fixture.original.personId);
  assert.equal(
    blank.replacementAuthorization?.sourceRowProjection,
    "before-replacements",
  );
  assert.equal(
    (
      await Replacement.createReplacement(actor, {
        ...fixture.request,
        authorizationReference: hash("different approval"),
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await Replacement.createReplacement(actor, {
        ...fixture.request,
        sourceProspectId: childId,
      })
    ).success,
    false,
  );
  const ready = await prepare(fixture);
  assert.equal(ready.row.status, "held");
  assert.equal(ready.row.messages.length, 3);
  const cached = value(
    await Replacement.prepareReplacement(
      actor,
      { prospectId: childId, expectedRevision: ready.row.revision },
      {
        judge: async () => {
          throw Error("A saved replacement was judged twice");
        },
        generate: async () => {
          throw Error("A saved replacement invoked the writer");
        },
      },
    ),
  );
  assert.equal(cached.revision, ready.row.revision);
  assert.deepEqual(await protectedHistory(fixture.original.id), before);
  assert.equal(
    (
      await Store.reviewProspect(actor, {
        prospect: fixture.original.id,
        revision: fixture.original.revision,
        decision: "approve",
      })
    ).success,
    false,
  );
  value(
    await Store.patchProspect(
      actor,
      childId,
      { mxCheckedAt: reviewDate.toISOString() },
      ready.row.revision,
    ),
  );
  value(
    await Store.reviewProspect(actor, {
      prospect: childId,
      revision: ready.row.revision,
      decision: "approve",
    }),
  );
  await db.update(schema.outboundInbox).set({ lastSyncedAt: new Date() });
  value(
    await Store.savePlaybook(actor, {
      ...fixture.settings.settings,
      sendingEnabled: true,
    }),
  );
  assert.equal(
    (
      await Store.claimDelivery(actor, {
        prospect: childId,
        inbox: fixture.newInbox.id,
      })
    ).success,
    false,
  );
  setSystemTime(sendDate);
  await db
    .update(schema.outboundInbox)
    .set({ lastSyncedAt: sendDate, nextSendAt: null })
    .where(eq(schema.outboundInbox.id, fixture.newInbox.id));
  // MX is an operational check; original recipient and verification provenance are unchanged.
  value(
    await Store.patchProspect(
      actor,
      childId,
      { mxCheckedAt: sendDate.toISOString() },
      ready.row.revision,
    ),
  );
  const current = await read(childId);
  value(
    await Store.reviewProspect(actor, {
      prospect: childId,
      revision: current.revision,
      decision: "approve",
    }),
  );
  const claimed = value(
    await Store.claimDelivery(actor, {
      prospect: childId,
      inbox: fixture.newInbox.id,
    }),
  );
  assert.equal(claimed.step, 1);
  assert.equal(claimed.threadId, null);
  assert.deepEqual(claimed.references, []);
  assert.notEqual(claimed.messageId, fixture.attempt.messageId);
  value(
    await Store.dispatchDelivery(actor, claimed, async (actual) => {
      assert.equal(actual.threadId, null);
      assert.deepEqual(actual.references, []);
      return {
        success: true,
        data: {
          providerMessageId: "replacement-provider",
          threadId: "replacement-thread",
        },
      };
    }),
  );
  assert.deepEqual(await protectedHistory(fixture.original.id), before);
  const detail = value(await Conversations.get({ id: childId }));
  assert.equal(detail.threads.length, 2);
  const list = value(await Conversations.list({}));
  assert.equal(list.items.length, 1);
  const Prospects = await import("@/server/app/outbound/prospects-read");
  assert.deepEqual(
    value(await Prospects.list()).rows.map((row) => row.id),
    [childId],
  );
  const Funnel = await import("@/server/app/outbound/pipeline-funnel");
  const counts = value(await Funnel.read((await Store.policy()).revision));
  assert.equal(counts.contactsIn, 1);
  assert.equal(counts.approvedFirstEmails, 1);
  assert.equal(counts.acceptedSends, 2);
  assert.equal(counts.researched, 1);
  assert.equal(counts.findings, 1);
  // Due bumps stay on the new sequence only, including day seven after the research expires.
  for (const [step, date] of [
    [2, "2026-12-07T14:00:00Z"],
    [3, "2026-12-09T14:00:00Z"],
  ] as const) {
    setSystemTime(new Date(date));
    await db
      .update(schema.outboundInbox)
      .set({ lastSyncedAt: new Date(date), nextSendAt: null })
      .where(eq(schema.outboundInbox.id, fixture.newInbox.id));
    value(
      await Store.patchProspect(
        actor,
        childId,
        { mxCheckedAt: date },
        (await read(childId)).revision,
      ),
    );
    const followup = value(
      await Store.claimDelivery(actor, {
        prospect: childId,
        inbox: fixture.newInbox.id,
      }),
    );
    assert.equal(followup.step, step);
    assert.equal(followup.threadId, "replacement-thread");
    assert.ok(followup.references.includes(claimed.messageId));
    assert.ok(!followup.references.includes(fixture.attempt.messageId));
    value(
      await Store.dispatchDelivery(actor, followup, async () => ({
        success: true,
        data: {
          providerMessageId: `replacement-${step}`,
          threadId: "replacement-thread",
        },
      })),
    );
  }
  assert.equal((await read(childId)).sentStep, 3);
  assert.deepEqual(await protectedHistory(fixture.original.id), before);
  assert.equal(
    value(await Funnel.read((await Store.policy()).revision)).acceptedSends,
    4,
  );
}

// Late human replies on archived old threads revoke a claimed new email before transport.
{
  const fixture = await seed();
  const ready = await prepare(fixture);
  setSystemTime(sendDate);
  await db
    .update(schema.outboundInbox)
    .set({ lastSyncedAt: sendDate, nextSendAt: null })
    .where(eq(schema.outboundInbox.id, fixture.newInbox.id));
  value(
    await Store.patchProspect(
      actor,
      ready.row.id,
      { mxCheckedAt: sendDate.toISOString() },
      ready.row.revision,
    ),
  );
  const current = await read(ready.row.id);
  value(
    await Store.reviewProspect(actor, {
      prospect: current.id,
      revision: current.revision,
      decision: "approve",
    }),
  );
  await db.update(schema.outboundInbox).set({ lastSyncedAt: new Date() });
  value(
    await Store.savePlaybook(actor, {
      ...fixture.settings.settings,
      sendingEnabled: true,
    }),
  );
  const claim = value(
    await Store.claimDelivery(actor, {
      prospect: current.id,
      inbox: fixture.newInbox.id,
    }),
  );
  const [thread] = await db
    .select()
    .from(schema.outboundConversation)
    .where(eq(schema.outboundConversation.prospectId, fixture.original.id));
  assert.ok(thread);
  await db
    .update(schema.outboundConversation)
    .set({ archivedAt: reviewDate })
    .where(eq(schema.outboundConversation.id, thread.id));
  value(
    await Conversations.ingest({
      prospectId: fixture.original.id,
      channel: "email",
      accountId: fixture.oldInbox.id,
      accountLabel: oldEmail,
      providerThreadId: thread.providerThreadId,
      counterpart: fixture.original.details.email,
      outcome: "reply",
      message: {
        providerMessageId: "late-old-reply",
        direction: "inbound",
        bodyText: "Thanks, let's speak.",
        from: fixture.original.details.email,
        to: oldEmail,
        sentAt: sendDate,
      },
    }),
  );
  assert.equal((await read(current.id)).status, "held");
  const attempted = await Store.dispatchDelivery(actor, claim, async () => {
    throw Error("reply race reached transport");
  });
  assert.equal(attempted.success, false);
  const detail = value(await Conversations.get({ id: current.id }));
  assert.ok(
    detail.messages.some(
      (message) => message.bodyText === "Thanks, let's speak.",
    ),
  );
}

// Same-recipient headerless mail stays visible once, and unresolved prior delivery is never waived.
{
  const fixture = await seed();
  const created = value(
    await Replacement.createReplacement(actor, fixture.request),
  );
  value(
    await Transport.ingest(fixture.newInbox, {
      id: "headerless-reply",
      threadId: "new-human-thread",
      internalDate: String(reviewDate.getTime()),
      labelIds: ["INBOX"],
      headers: {
        from: fixture.original.details.email,
        to: REPLACEMENT_SENDER,
        "message-id": "<headerless@samplegoods.test>",
      },
      text: "Can you tell me more?",
    }),
  );
  const rows = await db
    .select()
    .from(schema.outboundConversationMessage)
    .where(
      eq(
        schema.outboundConversationMessage.providerMessageId,
        "headerless-reply",
      ),
    );
  assert.equal(rows.length, 1);
  assert.equal((await read(created.prospectId)).status, "replied");
  assert.equal(
    (
      await Replacement.prepareReplacement(
        actor,
        {
          prospectId: created.prospectId,
          expectedRevision: (await read(created.prospectId)).revision,
        },
        { judge: passingCopyJudge },
      )
    ).success,
    false,
  );
  const another = await seed();
  await db
    .update(schema.outboundSendAttempt)
    .set({ status: "uncertain" })
    .where(eq(schema.outboundSendAttempt.id, another.attempt.id));
  assert.equal(
    (await Replacement.createReplacement(actor, another.request)).success,
    false,
  );
}
// A failed provider outcome remains durable and cannot silently buy another judgment on resume.
{
  const fixture = await seed();
  const child = value(
    await Replacement.createReplacement(actor, fixture.request),
  );
  const calls: string[] = [];
  const first = await Replacement.prepareReplacement(
    actor,
    {
      prospectId: child.prospectId,
      expectedRevision: (await read(child.prospectId)).revision,
    },
    {
      judge: async () => {
        calls.push("judge");
        throw Error("synthetic interrupted provider");
      },
    },
  );
  assert.equal(first.success, false);
  assert.equal(calls.length, 1);
  const second = await Replacement.prepareReplacement(
    actor,
    {
      prospectId: child.prospectId,
      expectedRevision: (await read(child.prospectId)).revision,
    },
    {
      judge: async () => {
        calls.push("retry");
        return passingCopyJudge();
      },
    },
  );
  assert.equal(second.success, false);
  assert.equal(calls.length, 1);
  assert.equal((await read(child.prospectId)).sentStep, 0);
  assert.deepEqual(await protectedHistory(fixture.original.id), {
    row: fixture.original,
    attempts: [
      Object.fromEntries(
        Object.entries(fixture.attempt).filter(([key]) => key !== "hash"),
      ),
    ],
    revisions: [
      Object.fromEntries(
        Object.entries(fixture.revision).filter(([key]) => key !== "hash"),
      ),
    ],
  });
}

// Explicit historical-contact authority does not waive the company cooldown.
{
  const fixture = await seed(
    false,
    new Date("2026-12-01T14:00:00Z"),
    new Date("2026-12-01T15:00:00Z"),
  );
  const ready = await prepare(fixture);
  value(
    await Store.reviewProspect(actor, {
      prospect: ready.row.id,
      revision: ready.row.revision,
      decision: "approve",
    }),
  );
  setSystemTime(new Date("2026-12-02T13:00:00Z"));
  await db
    .update(schema.outboundInbox)
    .set({ lastSyncedAt: new Date(), nextSendAt: null });
  value(
    await Store.savePlaybook(actor, {
      ...fixture.settings.settings,
      sendingEnabled: true,
    }),
  );
  value(
    await Store.patchProspect(
      actor,
      ready.row.id,
      { mxCheckedAt: new Date().toISOString() },
      ready.row.revision,
    ),
  );
  const early = await Store.claimDelivery(actor, {
    prospect: ready.row.id,
    inbox: fixture.newInbox.id,
  });
  assert.equal(early.success, false);
  if (!early.success) assert.match(early.error.message, /24 hours/);
}

// Subject, recipient, sender and sidecar changes never inherit the owner's permission.
{
  const fixture = await seed();
  assert.equal(
    (
      await Replacement.createReplacement(actor, {
        ...fixture.request,
        reviewedSubject: "an unreviewed subject",
      })
    ).success,
    false,
  );
  const child = value(
    await Replacement.createReplacement(actor, fixture.request),
  );
  assert.equal(
    (
      await Store.saveProspect(actor, {
        ...(
          await read(child.prospectId)
        ).details,
        assignedSenderEmail: oldEmail,
      })
    ).success,
    false,
  );
  await db
    .update(schema.outboundIntegrationJob)
    .set({ error: "changed after approval" })
    .where(eq(schema.outboundIntegrationJob.id, fixture.request.previewJobId));
  assert.equal(
    (
      await Replacement.prepareReplacement(
        actor,
        {
          prospectId: child.prospectId,
          expectedRevision: (await read(child.prospectId)).revision,
        },
        { judge: passingCopyJudge },
      )
    ).success,
    false,
  );
  const fresh = await seed();
  const another = value(
    await Replacement.createReplacement(actor, fresh.request),
  );
  value(
    await Store.savePlaybook(actor, {
      ...fresh.settings.settings,
      senderProfiles: fresh.settings.settings.senderProfiles.map((profile) => ({
        ...profile,
        signature: "Someone Else",
      })),
    }),
  );
  assert.equal(
    (
      await Replacement.prepareReplacement(
        actor,
        {
          prospectId: another.prospectId,
          expectedRevision: (await read(another.prospectId)).revision,
        },
        { judge: passingCopyJudge },
      )
    ).success,
    false,
  );
}
setSystemTime();
console.log(
  "Replacement lifecycle, immutable history, family stops and fresh headers passed.",
);
process.exit(0);
