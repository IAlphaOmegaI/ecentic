import { mock } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
import { requireTestDatabase } from "../helpers/database";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
if (!endpoint) throw new Error("Disposable test database required");
requireTestDatabase(endpoint);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
mock.module("@/server/app/outbound/provider-credentials", () => ({
  metadata: async () => ({ success: true, data: { configured: false, version: "fixture-missing" } }),
}));
const { db, schema } = await import("@/server/database");
await db.execute(sql`set client_min_messages to warning`);
await db.execute(
  sql`truncate outbound_campaign, outbound_company, outbound_person, outbound_prospect, outbound_event, outbound_revision, outbound_playbook, outbound_suppression, outbound_inbox, outbound_integration_job, outbound_linkedin_account cascade`,
);
const identifiers = Object.fromEntries(
  [
    "campaign",
    "otherCampaign",
    "draftCampaign",
    "company",
    "person",
    "prospect",
    "replyCompany",
    "replyPerson",
    "replyProspect",
    "candidate",
    "sourceCompany",
    "inbox",
  ].map((key) => [key, randomUUID()]),
);
const id = (key: string) => {
  const value = identifiers[key];
  if (!value) throw new Error(key);
  return value;
};
const criteria = defaultCampaignCriteria(defaultPlaybook);
await db.insert(schema.outboundPlaybook).values({
  id: "default",
  settings: defaultPlaybook,
  revision: 3,
  updatedBy: "fixture",
});
await db.insert(schema.outboundCampaign).values([
  {
    id: id("campaign"),
    name: "Current",
    status: "active",
    criteria,
    revision: 2,
    createdBy: "fixture",
    updatedBy: "fixture",
  },
  {
    id: id("otherCampaign"),
    name: "Other active",
    status: "active",
    criteria,
    revision: 1,
    createdBy: "fixture",
    updatedBy: "fixture",
  },
  {
    id: id("draftCampaign"),
    name: "Draft",
    status: "draft",
    criteria,
    revision: 1,
    createdBy: "fixture",
    updatedBy: "fixture",
  },
]);
const details = prospectSchema.parse({
  company: "Sample",
  domain: "sample.test",
  name: "Actual Person",
  country: "US",
  website: "https://sample.test",
  platform: "shopify",
  email: "person@sample.test",
});
await db.insert(schema.outboundCompany).values([
  {
    id: id("company"),
    name: details.company,
    domain: details.domain,
    website: details.website,
    country: "US",
    source: "fixture",
  },
  {
    id: id("replyCompany"),
    name: "Legacy",
    domain: "legacy.test",
    website: "https://legacy.test",
    country: "US",
    source: "fixture",
  },
]);
await db.insert(schema.outboundPerson).values([
  {
    id: id("person"),
    companyId: id("company"),
    identityKey: "sample-person",
    name: details.name,
  },
  {
    id: id("replyPerson"),
    companyId: id("replyCompany"),
    identityKey: "legacy-person",
    name: "Legacy Person",
  },
]);
await db.insert(schema.outboundProspect).values([
  {
    id: id("prospect"),
    campaignId: id("campaign"),
    companyId: id("company"),
    personId: id("person"),
    details,
    status: "active",
    approvalHash: "fixture-approved",
    createdBy: "fixture",
  },
  {
    id: id("replyProspect"),
    companyId: id("replyCompany"),
    personId: id("replyPerson"),
    details: { ...details, domain: "legacy.test" },
    status: "replied",
    createdBy: "fixture",
  },
]);
await db.insert(schema.outboundConversation).values([
  {
    prospectId: id("replyProspect"),
    channel: "email",
    accountId: "inbox-fixture",
    accountLabel: "alias@example.test",
    providerThreadId: "reply-thread",
    counterpart: "person@legacy.test",
    needsReply: true,
  },
  {
    prospectId: id("prospect"),
    channel: "email",
    accountId: "inbox-fixture",
    accountLabel: "alias@example.test",
    providerThreadId: "booked-thread",
    counterpart: "person@sample.test",
    stage: "meetingBooked",
  },
  {
    prospectId: id("prospect"),
    channel: "linkedin",
    accountId: "linkedin-fixture",
    accountLabel: "Actual Person",
    providerThreadId: "held-thread",
    counterpart: "provider-user",
    stage: "meetingHeld",
  },
]);
await db.insert(schema.outboundCampaignCompany).values([
  {
    id: id("sourceCompany"),
    campaignId: id("campaign"),
    domain: "sample.test",
    name: "Sample",
    website: "https://sample.test",
    source: "apollo",
    criteriaRevision: 2,
    status: "added",
    prospectId: id("prospect"),
  },
  {
    id: id("candidate"),
    campaignId: id("campaign"),
    domain: "candidate.test",
    name: "Research only",
    website: "https://candidate.test",
    source: "apollo",
    criteriaRevision: 2,
  },
  {
    campaignId: id("otherCampaign"),
    domain: "candidate.test",
    name: "Duplicate domain",
    website: "https://candidate.test",
    source: "clay",
    criteriaRevision: 1,
  },
  {
    campaignId: id("campaign"),
    domain: "stale.test",
    name: "Stale",
    website: "https://stale.test",
    source: "apollo",
    criteriaRevision: 1,
  },
  {
    campaignId: id("campaign"),
    domain: "excluded.test",
    name: "Excluded",
    website: "https://excluded.test",
    source: "apollo",
    criteriaRevision: 2,
    status: "excluded",
  },
  {
    campaignId: id("draftCampaign"),
    domain: "draft.test",
    name: "Inactive",
    website: "https://draft.test",
    source: "apollo",
    criteriaRevision: 1,
  },
]);
const input = (companyId: string) => ({
  operation: "campaignAutomation",
  campaignId: id("campaign"),
  companyId,
  campaignRevision: 2,
  playbookRevision: 3,
});
const predecessorId = randomUUID();
await db.insert(schema.outboundIntegrationJob).values([
  {
    id: predecessorId,
    provider: "automation",
    status: "failed",
    input: input(id("sourceCompany")),
    output: { stage: "qualify", qualification: { status: "hold" } },
    error: "Older held assessment",
    createdAt: sql`now() - interval '1 hour'`,
    // Touching the audit record later must not make it the active correction.
    updatedAt: sql`now() + interval '1 minute'`,
  },
  {
    provider: "automation",
    status: "complete",
    input: { ...input(id("sourceCompany")), correctionOf: predecessorId },
    output: { qualification: { status: "qualified" } },
  },
  {
    provider: "automation",
    status: "pending",
    input: input(id("candidate")),
    output: { stage: "qualify" },
  },
  {
    provider: "automation",
    status: "uncertain",
    input: { ...input(id("candidate")), playbookRevision: 2 },
    output: { stage: "qualify" },
  },
  {
    provider: "automation",
    status: "failed",
    input: { ...input(id("candidate")), operation: "sequenceRefresh" },
    output: { stage: "draft" },
  },
  {
    provider: "linkedin",
    status: "complete",
    input: {},
    output: {
      providerMessageId: "old-message",
      acceptedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    updatedAt: new Date(),
  },
  {
    provider: "linkedin",
    status: "complete",
    input: {},
    output: {
      providerMessageId: "recent-message",
      acceptedAt: new Date().toISOString(),
    },
  },
  {
    provider: "linkedin",
    status: "complete",
    input: {},
    output: { providerMessageId: null, acceptedAt: new Date().toISOString() },
  },
]);
await db.insert(schema.outboundEvent).values([
  {
    prospectId: id("prospect"),
    actor: "staff",
    kind: "meeting",
    detail: "Recorded once",
  },
  {
    prospectId: id("prospect"),
    actor: "staff",
    kind: "meeting",
    detail: "Recorded again",
  },
  {
    prospectId: id("replyProspect"),
    actor: "google-imap",
    kind: "reply",
    detail: "Reply",
  },
]);
await db.insert(schema.outboundInbox).values({
  id: id("inbox"),
  email: "sender@sample.test",
  fromName: "Sender",
  signer: "Sender",
});
await db.insert(schema.outboundSendAttempt).values([
  {
    prospectId: id("prospect"),
    inboxId: id("inbox"),
    step: 1,
    revision: 1,
    messageId: "accepted-fixture",
    status: "accepted",
    contentHash: "fixture",
    completedAt: new Date(),
  },
  {
    prospectId: id("prospect"),
    inboxId: id("inbox"),
    step: 2,
    revision: 1,
    messageId: "failed-fixture",
    status: "failed",
    contentHash: "fixture",
    completedAt: new Date(),
  },
  {
    prospectId: id("replyProspect"),
    inboxId: id("inbox"),
    step: 1,
    revision: 1,
    messageId: "test-fixture",
    status: "accepted",
    contentHash: "fixture",
    test: true,
    completedAt: new Date(),
  },
]);
const Pipeline = await import("@/server/app/outbound/pipeline-read");
const result = await Pipeline.read();
assert.ok(result.success);
if (result.success) {
  assert.deepEqual(result.data.totals, {
    activeCampaigns: 2,
    companies: 2,
    insights: 1,
    contacts: 1,
    sequences: 1,
    needsReply: 1,
    meetings: 1,
    acceptedEmails: 1,
    acceptedLinkedin: 1,
  });
  assert.equal(result.data.work.length, 1);
  assert.equal(result.data.work[0]?.status, "pending");
  assert.equal(result.data.work[0]?.company, "Research only");
  assert.equal(
    result.data.campaigns.find((campaign) => campaign.id === id("campaign"))
      ?.contacts,
    1,
  );
  assert.equal(result.data.setup.apolloConfigured, false);
  assert.equal(
    result.data.campaigns.find((campaign) => campaign.id === id("campaign"))
      ?.held,
    0,
  );
  assert.equal(
    result.data.campaigns.find((campaign) => campaign.id === id("campaign"))
      ?.insights,
    1,
  );
}
// Saved contacts are visible before promotion; qualification is not a shopping receipt.
const savedCompany = randomUUID();
const savedPerson = randomUUID();
const savedProspect = randomUUID();
const savedJob = randomUUID();
await db.insert(schema.outboundCompany).values({
  id: savedCompany,
  domain: "saved.test",
  name: "Saved prospect",
  source: "saved",
  country: "US",
  website: "https://saved.test",
});
await db.insert(schema.outboundPerson).values({
  id: savedPerson,
  companyId: savedCompany,
  identityKey: "saved-person",
  name: "Saved Person",
});
await db.insert(schema.outboundProspect).values({
  id: savedProspect,
  companyId: savedCompany,
  personId: savedPerson,
  details: { ...details, company: "Saved prospect", domain: "saved.test" },
  createdBy: "fixture",
});
await db
  .update(schema.outboundPlaybook)
  .set({ settings: { ...defaultPlaybook, requireShoppingEvidence: true } });
await db.insert(schema.outboundIntegrationJob).values({
  id: savedJob,
  provider: "automation",
  prospectId: savedProspect,
  status: "pending",
  input: {
    operation: "savedContactPreparation",
    campaignId: id("campaign"),
    campaignRevision: 2,
    playbookRevision: 3,
  },
  output: { stage: "query", qualification: { status: "qualified" } },
});
const pendingSaved = await Pipeline.read();
assert.ok(pendingSaved.success);
if (pendingSaved.success) {
  assert.equal(pendingSaved.data.totals.insights, 0);
  assert.equal(pendingSaved.data.totals.contacts, 1);
  const visible = pendingSaved.data.work.find((work) => work.id === savedJob);
  assert.equal(visible?.prospectId, savedProspect);
  assert.equal(visible?.companyId, null);
  assert.equal(visible?.stage, "query");
}
// This aggregate reads receipts already validated by the preparation worker.
await db
  .update(schema.outboundIntegrationJob)
  .set({
    output: {
      stage: "draft",
      qualification: { status: "qualified" },
      shoppingReceipt: {
        queries: [{ status: "observed" }],
        selected: { kind: "product-data-gap" },
      },
      assessment: { status: "researched" },
    },
  })
  .where(sql`id = ${savedJob}`);
const researchedSaved = await Pipeline.read();
assert.ok(researchedSaved.success);
if (researchedSaved.success) {
  assert.equal(researchedSaved.data.totals.insights, 1);
  assert.equal(researchedSaved.data.totals.contacts, 1);
  assert.equal(researchedSaved.data.totals.sequences, 1);
}
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "complete",
    output: {
      stage: "complete",
      heldReason: "No eligible public business address.",
    },
  })
  .where(sql`id = ${savedJob}`);
const heldSaved = await Pipeline.read();
assert.ok(heldSaved.success);
if (heldSaved.success) {
  assert.equal(
    heldSaved.data.campaigns.find((campaign) => campaign.id === id("campaign"))
      ?.held,
    1,
  );
  assert.equal(
    heldSaved.data.work.find((work) => work.id === savedJob)?.status,
    "failed",
  );
}

// A reviewed later receipt resolves the current hold without rewriting its history.
const recoveredResearch = randomUUID();
const recoveredApproval = randomUUID();
const researchAt = new Date(Date.now() - 30_000);
const approvedAt = new Date(Date.now() - 10_000);
const recoveredDetails = prospectSchema.parse({
  ...details,
  company: "Saved prospect",
  domain: "saved.test",
  email: "person@saved.test",
  product: "Linen tote",
  productUrl: "https://saved.test/products/tote",
  shoppingResearchId: recoveredResearch,
  shoppingFinding: {
    kind: "product-observation",
    observation: "The tote has a removable shoulder strap.",
    consequence: "The page lists two colors.",
    askAbout: "the tote",
    scope: "One observed answer and merchant page.",
    checkedAt: researchAt.toISOString(),
  },
  evidence: "A persisted reviewed receipt.",
});
await db.update(schema.outboundIntegrationJob).set({ updatedAt: new Date(Date.now() - 60_000) }).where(sql`id = ${savedJob}`);
const [originalHold] = await db.select().from(schema.outboundIntegrationJob).where(sql`id = ${savedJob}`);
await db.update(schema.outboundProspect).set({
  campaignId: id("campaign"), details: recoveredDetails, status: "approved",
  revision: 1, playbookRevision: 3, approvedAt, approvedBy: "fixture",
  approvalHash: "recovered-hash",
}).where(sql`id = ${savedProspect}`);
await db.insert(schema.outboundIntegrationJob).values({
  id: recoveredResearch, provider: "automation", status: "complete", prospectId: savedProspect,
  input: { operation: "leadResearch", prospectId: savedProspect, campaignId: id("campaign"), campaignRevision: 2, playbookRevision: 3 },
  output: { details: recoveredDetails, receipt: { product: { name: "Linen tote", url: recoveredDetails.productUrl } } },
  createdAt: researchAt,
});
const assertSavedHold = async (resolved: boolean) => {
  const result = await Pipeline.read();
  assert.ok(result.success);
  if (!result.success) return;
  assert.equal(result.data.campaigns.find((campaign) => campaign.id === id("campaign"))?.held, resolved ? 0 : 1);
  assert.equal(result.data.work.some((work) => work.id === savedJob), !resolved);
  assert.equal(result.data.totals.insights, resolved ? 1 : 0);
};
await assertSavedHold(false); // A status string alone is not a current approval.
await db.insert(schema.outboundRevision).values({
  id: recoveredApproval, prospectId: savedProspect, revision: 1, messages: [],
  manifest: { recipient: recoveredDetails.email, sender: "sender@ecentic.test", fromName: "Sender", signature: "Sender", postalAddress: "Test address", playbookRevision: 3, evidence: recoveredDetails.evidence, evidenceCheckedAt: researchAt.toISOString() },
  contentHash: "recovered-hash", approvedAt, approvedBy: "fixture",
});
await assertSavedHold(true);
await db.update(schema.outboundIntegrationJob).set({ prospectId: id("prospect") }).where(sql`id = ${recoveredResearch}`);
await assertSavedHold(false); // Another recipient's research cannot hide this hold.
await db.update(schema.outboundIntegrationJob).set({ prospectId: savedProspect, createdAt: new Date(Date.now() - 120_000) }).where(sql`id = ${recoveredResearch}`);
await assertSavedHold(false); // An earlier receipt cannot resolve a later failure.
await db.update(schema.outboundIntegrationJob).set({ createdAt: researchAt }).where(sql`id = ${recoveredResearch}`);
await db.update(schema.outboundRevision).set({ revokedAt: new Date() }).where(sql`id = ${recoveredApproval}`);
await assertSavedHold(false);
await db.update(schema.outboundRevision).set({ revokedAt: null }).where(sql`id = ${recoveredApproval}`);
await db.update(schema.outboundProspect).set({ details: { ...recoveredDetails, evidence: "Different evidence" } }).where(sql`id = ${savedProspect}`);
await assertSavedHold(false);
await db.update(schema.outboundProspect).set({ details: recoveredDetails }).where(sql`id = ${savedProspect}`);
await assertSavedHold(true);
const [preservedHold] = await db.select().from(schema.outboundIntegrationJob).where(sql`id = ${savedJob}`);
assert.deepEqual(preservedHold, originalHold);
await db.update(schema.outboundProspect).set({
  status: "candidate", approvedAt: null, approvedBy: null, approvalHash: null,
}).where(sql`id = ${savedProspect}`);

const Activity = await import("@/server/app/outbound/conversation-activity");
await db.insert(schema.outboundIntegrationJob).values([
  {
    provider: "linkedin",
    prospectId: id("prospect"),
    status: "complete",
    input: { operation: "linkedinOutreach", action: "invite" },
    output: {
      providerInvitationId: "real-invitation",
      providerMessageId: null,
      acceptedAt: new Date().toISOString(),
    },
  },
  {
    provider: "linkedin",
    prospectId: id("prospect"),
    status: "complete",
    input: { operation: "linkedinOutreach", action: "message" },
    output: { acceptedAt: new Date().toISOString() },
  },
]);
const thread = (
  await db
    .select()
    .from(schema.outboundConversation)
    .where(sql`provider_thread_id = 'reply-thread'`)
)[0];
assert.ok(thread);
await db.insert(schema.outboundConversationSend).values({
  conversationId: thread.id,
  revision: 1,
  status: "uncertain",
  input: { body: "Exact saved reply" },
  createdBy: "fixture",
});
const activity = await Activity.list({ view: "sent" });
assert.ok(activity.success);
if (activity.success) {
  assert.equal(activity.data.total, 5);
  assert.equal(
    activity.data.rows.filter((row) => row.channel === "linkedin").length,
    2,
  );
  assert.equal(
    activity.data.rows.find((row) => row.kind === "linkedinInvite")?.status,
    "accepted",
  );
  assert.equal(
    activity.data.rows.find((row) => row.kind === "linkedinMessage")?.status,
    "uncertain",
  );
  assert.equal(
    activity.data.rows.filter((row) => row.exactHref?.startsWith("/sent/"))
      .length,
    2,
  );
}
const filtered = await Activity.list({
  view: "sent",
  channel: "email",
  prospect: id("replyProspect"),
});
assert.ok(filtered.success);
if (filtered.success) assert.equal(filtered.data.total, 1);
const messageMatch = await Activity.list({
  view: "sent",
  q: "Exact saved reply",
});
assert.ok(messageMatch.success);
if (messageMatch.success) {
  assert.equal(messageMatch.data.total, 1);
  assert.equal(messageMatch.data.rows[0]?.kind, "reply");
}
const noMatches = await Activity.list({ view: "sent", q: "missing search" });
assert.ok(noMatches.success);
if (noMatches.success) assert.equal(noMatches.data.total, 0);
await db.execute(
  sql`update outbound_prospect set next_send_at = now() + interval '1 day', sent_step = 1, messages = '[{"step":1,"subject":"First","body":"First"},{"step":2,"subject":"Follow-up","body":"Follow-up"}]'::jsonb`,
);
const scheduled = await Activity.list({ view: "scheduled" });
assert.ok(scheduled.success);
if (scheduled.success) {
  assert.equal(scheduled.data.total, 1);
  assert.equal(scheduled.data.rows[0]?.prospectId, id("prospect"));
  assert.equal(scheduled.data.rows[0]?.step, 2);
}
const linkedinSchedule = await Activity.list({
  view: "scheduled",
  channel: "linkedin",
});
assert.ok(linkedinSchedule.success);
if (linkedinSchedule.success) assert.equal(linkedinSchedule.data.total, 0);
const linkedinThread = (
  await db
    .select()
    .from(schema.outboundConversation)
    .where(sql`provider_thread_id = 'held-thread'`)
)[0];
assert.ok(linkedinThread);
await db.insert(schema.outboundConversationSend).values([
  {
    conversationId: thread.id,
    revision: 2,
    status: "accepted",
    providerMessageId: "accepted-email-reply",
    input: { body: "Accepted email reply" },
    createdBy: "fixture",
    completedAt: new Date(),
  },
  {
    conversationId: linkedinThread.id,
    revision: 2,
    status: "accepted",
    providerMessageId: "accepted-linkedin-reply",
    input: { body: "Accepted LinkedIn reply" },
    createdBy: "fixture",
    completedAt: new Date(),
  },
  {
    conversationId: thread.id,
    revision: 3,
    status: "failed",
    input: { body: "Failed reply" },
    createdBy: "fixture",
    completedAt: new Date(),
  },
  {
    conversationId: linkedinThread.id,
    revision: 3,
    status: "accepted",
    providerMessageId: "old-linkedin-reply",
    input: { body: "Old reply" },
    createdBy: "fixture",
    completedAt: new Date(Date.now() - 8 * 86400000),
  },
]);
await db.insert(schema.outboundConversationMessage).values([
  {
    conversationId: thread.id,
    providerMessageId: "accepted-email-reply",
    direction: "outbound",
    bodyText: "Accepted email reply",
    subject: "Reply",
    from: "alias@example.test",
    to: "person@legacy.test",
    sentAt: new Date(),
  },
  {
    conversationId: linkedinThread.id,
    providerMessageId: "accepted-linkedin-reply",
    direction: "outbound",
    bodyText: "Accepted LinkedIn reply",
    subject: "",
    from: "account-user",
    to: "provider-user",
    sentAt: new Date(),
  },
]);
const withManualReplies = await Pipeline.read();
assert.ok(withManualReplies.success);
if (withManualReplies.success) {
  // Count accepted dispatches once, excluding copied timeline messages, old/failed/uncertain replies and invitations.
  assert.equal(withManualReplies.data.totals.acceptedEmails, 2);
  assert.equal(withManualReplies.data.totals.acceptedLinkedin, 2);
}
await db.$client.end({ timeout: 1 });
console.log("Pipeline counts passed");
