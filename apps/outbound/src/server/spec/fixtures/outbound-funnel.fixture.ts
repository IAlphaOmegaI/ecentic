import { mock } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { prospectSchema } from "@/lib/outbound";
import {
  COPY_CRITERIA,
  WRITING_CONTRACT_VERSION,
} from "@/lib/outbound-composition";
import { requireTestDatabase } from "../helpers/database";

const endpoint = requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const { db, schema } = await import("@/server/database");
const Funnel = await import("@/server/app/outbound/pipeline-funnel");
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const now = new Date();
const before = new Date(now.getTime() - 86_400_000);
const older = new Date(now.getTime() - 2 * 86_400_000);
const actor = "offline-funnel-fixture";
const prospect = async (label: string, test = false) => {
  const company = (
    await db
      .insert(schema.outboundCompany)
      .values({
        name: label,
        domain: `${label}.test`,
        website: `https://${label}.test`,
        country: "US",
        source: actor,
      })
      .returning()
  )[0];
  assert.ok(company);
  const person = (
    await db
      .insert(schema.outboundPerson)
      .values({ companyId: company.id, identityKey: randomUUID(), name: label })
      .returning()
  )[0];
  assert.ok(person);
  const contact = (
    await db
      .insert(schema.outboundProspect)
      .values({
        companyId: company.id,
        personId: person.id,
        details: prospectSchema.parse({
          company: label,
          domain: company.domain,
          country: "US",
          name: label,
          source: test ? "internal-mailbox-setup-test" : actor,
        }),
        createdBy: actor,
      })
      .returning()
  )[0];
  assert.ok(contact);
  return contact;
};
const job = (
  prospectId: string,
  output: Record<string, unknown>,
  status: "complete" | "failed" | "uncertain" = "complete",
  operation = "savedContactPreparation",
  date = now,
) =>
  db.insert(schema.outboundIntegrationJob).values({
    provider: "automation",
    prospectId,
    status,
    input: { operation, prospectId },
    output,
    createdAt: date,
    updatedAt: date,
  });
const query = (id: string) => ({ id, submittedAt: before.toISOString() });
const receipt = (kind: string) => ({ selected: { kind } });
const thread = async (
  prospectId: string,
  stage: "open" | "interested" | "meetingBooked" | "meetingHeld",
  archived = false,
) => {
  const saved = (
    await db
      .insert(schema.outboundConversation)
      .values({
        prospectId,
        channel: "email",
        accountId: "fixture-mailbox",
        accountLabel: "fixture@example.test",
        providerThreadId: randomUUID(),
        counterpart: "person@example.test",
        stage,
        archivedAt: archived ? now : null,
      })
      .returning()
  )[0];
  assert.ok(saved);
  return saved;
};
const message = (conversationId: string, automated: boolean) =>
  db.insert(schema.outboundConversationMessage).values({
    conversationId,
    providerMessageId: randomUUID(),
    direction: "inbound",
    bodyText: "Synthetic response",
    from: "person@example.test",
    to: "fixture@example.test",
    isAutomated: automated,
    sentAt: now,
  });
const manifest = {
  recipient: "person@example.test",
  sender: "fixture@example.test",
  fromName: "Fixture",
  signature: "Fixture",
  postalAddress: "Fixture address",
  playbookRevision: 1,
  evidence: "Synthetic counting fixture only",
  evidenceCheckedAt: before.toISOString(),
};

try {
  await db.execute(sql`set client_min_messages to warning`);
  await db.execute(
    sql`truncate outbound_integration_job,outbound_campaign,outbound_company,outbound_person,outbound_prospect,outbound_event,outbound_revision,outbound_playbook,outbound_suppression,outbound_inbox cascade`,
  );
  const [approved, noGap, blocked, neutral, untouched, heldHistory, setupTest] =
    await Promise.all(
      [
        "approved",
        "nogap",
        "blocked",
        "neutral",
        "untouched",
        "heldhistory",
        "setuptest",
      ].map((label) => prospect(label, label === "setuptest")),
    );
  assert.ok(
    approved &&
      noGap &&
      blocked &&
      neutral &&
      untouched &&
      heldHistory &&
      setupTest,
  );
  const writing = {
    version: WRITING_CONTRACT_VERSION,
    revision: 2,
    quality: {
      passed: true,
      evaluatedAt: now.toISOString(),
      deterministicIssues: [],
      criteria: COPY_CRITERIA.map((criterion) => ({
        criterion,
        passed: true,
        reason: "Synthetic complete decision.",
      })),
    },
  };
  const messages = [1, 2, 3].map((step) => ({
    step,
    afterDays: step === 1 ? 0 : step === 2 ? 3 : 7,
    subject: "Synthetic fixture",
    body: "Synthetic fixture text",
    ...(step === 1 ? { writing } : {}),
  }));
  await db.execute(
    sql`update outbound_prospect set status = 'active', revision = 2, playbook_revision = 1, messages = ${JSON.stringify(messages)}::jsonb, approval_hash = 'approved-hash', approved_at = ${before.toISOString()}::timestamp, first_sent_at = ${now.toISOString()}::timestamp, sent_step = 2 where id = ${approved.id}`,
  );
  await db.insert(schema.outboundRevision).values([
    {
      prospectId: approved.id,
      revision: 1,
      messages: [],
      manifest,
      contentHash: "earlier-hash",
      approvedAt: older,
      revokedAt: before,
    },
    {
      prospectId: approved.id,
      revision: 2,
      messages: [],
      manifest,
      contentHash: "approved-hash",
      approvedAt: before,
    },
    {
      prospectId: noGap.id,
      revision: 1,
      messages: [],
      manifest,
      contentHash: "historical-hash",
      approvedAt: older,
      revokedAt: before,
    },
    {
      prospectId: heldHistory.id,
      revision: 1,
      messages: [],
      manifest,
      contentHash: "late-approval",
      approvedAt: now,
    },
  ]);
  await db.execute(
    sql`update outbound_revision set messages = ${JSON.stringify(messages)}::jsonb where prospect_id = ${approved.id} and revision = 2`,
  );
  await db
    .update(schema.outboundProspect)
    .set({ status: "replied", sentStep: 1, firstSentAt: before })
    .where(eq(schema.outboundProspect.id, noGap.id));
  await db
    .update(schema.outboundProspect)
    .set({ status: "replied", sentStep: 1, firstSentAt: before })
    .where(eq(schema.outboundProspect.id, heldHistory.id));
  const composed = messages.map((message) =>
    message.writing
      ? { ...message, writing: { ...message.writing, revision: null } }
      : message,
  );
  await job(
    approved.id,
    { messages: composed, appliedProspectRevision: 2 },
    "complete",
    "sequenceComposition",
  );
  await job(approved.id, {
    shoppingReceipt: receipt("discovery-absence"),
    shoppingJob: query("search-a2"),
    answer: { job: query("search-a2") },
    shoppingHistory: [{ shoppingJob: query("search-a1") }],
  });
  await job(
    approved.id,
    {
      receipt: receipt("discovery-absence"),
      captureProof: { answer: { job: query("search-a2") } },
    },
    "complete",
    "leadResearch",
  );
  await job(
    noGap.id,
    {
      shoppingReceipt: receipt("discovery-outranked"),
      shoppingJob: query("search-b1"),
    },
    "complete",
    "savedContactPreparation",
    older,
  );
  await job(noGap.id, {
    shoppingReceipt: receipt("no-gap"),
    shoppingJob: query("search-b1"),
    heldReason: "No gap found",
  });
  await job(
    blocked.id,
    {
      stage: "query",
      queryReservedAt: now.toISOString(),
      heldReason: "Provider outcome is unknown",
    },
    "uncertain",
  );
  await job(neutral.id, {
    shoppingReceipt: receipt("product-observation"),
    heldReason: "needs-unbranded-search",
  });
  await db.execute(
    sql`update outbound_prospect set revision = 2, playbook_revision = 1, messages = ${JSON.stringify(messages)}::jsonb where id = ${neutral.id}`,
  );
  await job(setupTest.id, {
    shoppingReceipt: receipt("discovery-absence"),
    shoppingJob: query("setup-search"),
  });

  const inbox = (
    await db
      .insert(schema.outboundInbox)
      .values({
        email: "fixture@example.test",
        fromName: "Fixture",
        signer: "Fixture",
      })
      .returning()
  )[0];
  assert.ok(inbox);
  await db.insert(schema.outboundSendAttempt).values([
    {
      prospectId: approved.id,
      inboxId: inbox.id,
      step: 1,
      revision: 2,
      messageId: randomUUID(),
      status: "accepted",
      contentHash: "approved-hash",
      completedAt: now,
    },
    {
      prospectId: approved.id,
      inboxId: inbox.id,
      step: 2,
      revision: 2,
      messageId: randomUUID(),
      status: "accepted",
      contentHash: "approved-hash",
      completedAt: now,
    },
    {
      prospectId: approved.id,
      inboxId: inbox.id,
      step: 3,
      revision: 2,
      messageId: randomUUID(),
      status: "uncertain",
      contentHash: "approved-hash",
      completedAt: now,
    },
    {
      prospectId: blocked.id,
      inboxId: inbox.id,
      step: 1,
      revision: 0,
      messageId: randomUUID(),
      status: "failed",
      contentHash: "failure",
      completedAt: now,
    },
    {
      prospectId: setupTest.id,
      inboxId: inbox.id,
      step: 1,
      revision: 0,
      messageId: randomUUID(),
      status: "accepted",
      contentHash: "test",
      completedAt: now,
      test: true,
    },
  ]);
  const human = await thread(approved.id, "meetingHeld", true);
  await Promise.all([
    message(human.id, false),
    message(human.id, false),
    message(human.id, true),
  ]);
  const autoOnly = await thread(noGap.id, "interested");
  await message(autoOnly.id, true);
  await thread(noGap.id, "meetingBooked");
  await thread(approved.id, "meetingHeld");
  await thread(setupTest.id, "meetingHeld");
  await thread(heldHistory.id, "open", true);
  await db.insert(schema.outboundEvent).values([
    {
      prospectId: approved.id,
      kind: "reply",
      detail: "Human reply recorded",
      actor,
    },
    {
      prospectId: approved.id,
      kind: "positive",
      detail: "Agreed to talk",
      actor,
    },
    {
      prospectId: approved.id,
      kind: "positive",
      detail: "Duplicate staff classification",
      actor,
    },
    {
      prospectId: noGap.id,
      kind: "meeting",
      detail: "Legacy meeting booked",
      actor,
    },
    {
      prospectId: noGap.id,
      kind: "conversationStage",
      detail: `Conversation ${autoOnly.id}: meetingBooked`,
      actor,
    },
    {
      prospectId: heldHistory.id,
      kind: "positive",
      detail: "Human positive reply recorded",
      actor,
    },
    {
      prospectId: heldHistory.id,
      kind: "conversationStage",
      detail: `Conversation ${randomUUID()}: meetingHeld`,
      actor,
    },
    { prospectId: setupTest.id, kind: "positive", detail: "Setup test", actor },
  ]);
  assert.deepEqual(value(await Funnel.read(1)), {
    contactsIn: 6,
    researched: 3,
    findings: 1,
    noGap: 1,
    blocked: 2,
    copyPassed: 1,
    approved: 1,
    acceptedSends: 2,
    humanReplies: 2,
    positiveReplies: 2,
    meetingsHeld: 2,
    searchesPurchased: 3,
    unconfirmedSearches: 1,
    approvedFirstEmails: 2,
    searchesPerApproved: 1.5,
  });
  const stalePolicy = value(await Funnel.read(2));
  assert.equal(stalePolicy.copyPassed, 0);
  assert.equal(stalePolicy.approved, 0);
  assert.equal(stalePolicy.searchesPerApproved, 1.5);
  await db.execute(
    sql`update outbound_prospect set messages = jsonb_set(messages, '{0,body}', '"Edited after copy checks"'::jsonb) where id = ${approved.id}`,
  );
  const edited = value(await Funnel.read(1));
  assert.equal(edited.copyPassed, 0);
  assert.equal(edited.approved, 0);
  assert.equal(edited.searchesPerApproved, 1.5);
  await db.execute(sql`update outbound_revision set approved_at = null`);
  assert.equal(value(await Funnel.read(1)).searchesPerApproved, null);
  // The held review is measured under its honest operation name. Its copied
  // provider receipts still count as one acknowledged purchase per provider ID.
  await job(
    blocked.id,
    {
      shoppingReceipt: receipt("no-gap"),
      shoppingJob: query("held-review-second"),
      answer: { job: query("held-review-second") },
      shoppingHistory: [{ shoppingJob: query("search-b1") }],
    },
    "complete",
    "heldDiscoveryReview",
    new Date(now.getTime() + 1),
  );
  const heldReview = value(await Funnel.read(1));
  assert.equal(heldReview.contactsIn, 6);
  assert.equal(heldReview.researched, 4);
  assert.equal(heldReview.noGap, 2);
  assert.equal(heldReview.blocked, 1);
  assert.equal(heldReview.searchesPurchased, 4);
  console.log(
    "Measured funnel contracts passed: deduped purchases, current copy, historical approvals, accepted transport, human replies and held meetings.",
  );
} finally {
  await db.$client.end();
}
