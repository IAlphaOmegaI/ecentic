import { mock } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, type Message, prospectSchema } from "@/lib/outbound";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
if (!endpoint) throw new Error("Disposable database required");
const location = new URL(endpoint);
if (
  !["127.0.0.1", "localhost"].includes(location.hostname) ||
  location.pathname !== "/outbound_test"
)
  throw new Error("Only the local outbound_test database is permitted");
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const { db, schema } = await import("@/server/database");
const Store = await import("@/server/app/outbound/store");
const Sent = await import("@/server/app/outbound/sent-read");
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
await db.execute(
  sql`truncate outbound_integration_job, outbound_campaign, outbound_prospect, outbound_event, outbound_revision, outbound_playbook, outbound_inbox cascade`,
);
const now = new Date();
const campaignId = randomUUID();
await db.insert(schema.outboundCampaign).values({
  id: campaignId,
  name: "Beauty campaign",
  criteria: defaultCampaignCriteria(defaultPlaybook),
  createdBy: "fixture",
  updatedBy: "fixture",
  createdAt: now,
  updatedAt: now,
});
const inboxId = randomUUID();
await db.insert(schema.outboundInbox).values({
  id: inboxId,
  email: "sender@example.test",
  fromName: "Original sender",
  signer: "Sender",
  createdAt: now,
  updatedAt: now,
});
const makeProspect = async (suffix: string) => {
  const companyId = randomUUID();
  const personId = randomUUID();
  const id = randomUUID();
  const details = prospectSchema.parse({
    company: `Example ${suffix}`,
    domain: `example${suffix}.test`,
    website: `https://example${suffix}.test`,
    country: "US",
    name: "Alex Doe",
    email: `alex@example${suffix}.test`,
  });
  await db.insert(schema.outboundCompany).values({
    id: companyId,
    domain: details.domain,
    name: details.company,
    website: details.website,
    country: "US",
    source: "fixture",
  });
  await db.insert(schema.outboundPerson).values({
    id: personId,
    companyId,
    identityKey: id,
    name: details.name,
    email: details.email,
  });
  await db.insert(schema.outboundProspect).values({
    id,
    campaignId,
    companyId,
    personId,
    details,
    messages: [],
    createdBy: "fixture",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  return { id, details };
};
const target = await makeProspect("first");
const messages: Message[] = [
  {
    step: 1,
    afterDays: 0,
    subject: "Original cream",
    body: "Original first email",
  },
  {
    step: 2,
    afterDays: 3,
    subject: "Re: Original cream",
    body: "Bumping this!",
  },
  { step: 3, afterDays: 7, subject: "Re: Original cream", body: "Alex?" },
];
const manifest = {
  ...Store.approvalManifest(target, defaultPlaybook, 1),
  sender: "sender@example.test",
  fromName: "Original sender",
  postalAddress: "Original postal footer",
};
const makeVersion = async (revision: number, sequence: Message[]) => {
  const hash = Store.contentHash(sequence, manifest);
  await db.insert(schema.outboundRevision).values({
    prospectId: target.id,
    revision,
    messages: sequence,
    manifest,
    contentHash: hash,
  });
  return hash;
};
const firstHash = await makeVersion(1, messages);
const edited = messages.map((message) =>
  message.step === 1
    ? {
        ...message,
        subject: "Later draft subject",
        body: "Later draft first email",
      }
    : message,
);
const followupHash = await makeVersion(2, edited);
const firstId = randomUUID();
const followupId = randomUUID();
const failedId = randomUUID();
await db.insert(schema.outboundSendAttempt).values([
  {
    id: firstId,
    prospectId: target.id,
    inboxId,
    step: 1,
    revision: 1,
    messageId: "<first@example.test>",
    status: "accepted",
    contentHash: firstHash,
    providerMessageId: "provider-first",
    createdAt: now,
    completedAt: now,
  },
  {
    id: followupId,
    prospectId: target.id,
    inboxId,
    step: 2,
    revision: 2,
    messageId: "<followup@example.test>",
    status: "accepted",
    contentHash: followupHash,
    createdAt: now,
    completedAt: now,
  },
  {
    id: failedId,
    prospectId: target.id,
    inboxId,
    step: 3,
    revision: 2,
    messageId: "<failed@example.test>",
    status: "failed",
    contentHash: followupHash,
    test: true,
    createdAt: now,
    completedAt: now,
  },
]);
await db
  .update(schema.outboundProspect)
  .set({
    messages: edited,
    details: { ...target.details, email: "changed@example.test" },
    status: "bounced",
  })
  .where(eq(schema.outboundProspect.id, target.id));
const first = value(await Sent.detail({ id: firstId }));
assert.ok(first);
assert.equal(first.row.recipient, target.details.email);
assert.equal(first.row.subject, "Original cream");
assert.equal(first.body, "Original first email\n\nOriginal postal footer");
assert.equal(first.row.status, "accepted");
assert.equal(first.row.sequenceStatus, "bounced");
assert.equal(first.providerMessageId, "provider-first");
const followup = value(await Sent.detail({ id: followupId }));
assert.ok(followup);
assert.equal(
  followup.body,
  "Bumping this!\n\n> Original first email\n> \n> Original postal footer",
);
assert.equal(followup.body.includes("Later draft"), false);
assert.equal(followup.sequence.length, 3);
assert.equal(value(await Sent.list({ status: "accepted" })).total, 2);
assert.equal(value(await Sent.list({ status: "bounced" })).total, 3);
assert.equal(
  value(await Sent.list({ kind: "test" })).rows[0]?.status,
  "failed",
);
assert.equal(value(await Sent.list({ q: "changed@example.test" })).total, 0);
assert.equal(
  value(await Sent.list({ q: "Original cream", prospect: target.id })).total,
  3,
);
assert.equal(value(await Sent.list({ q: "%" })).total, 0);
assert.equal(value(await Sent.list({ campaign: randomUUID() })).total, 0);
assert.equal(value(await Sent.list({ page: 999 })).page, 1);
await db
  .update(schema.outboundRevision)
  .set({ messages: [] })
  .where(eq(schema.outboundRevision.contentHash, followupHash));
assert.equal(value(await Sent.detail({ id: followupId }))?.body, null);
assert.equal(
  value(await Sent.detail({ id: followupId }))?.row.snapshotAvailable,
  false,
);
const missingId = randomUUID();
assert.equal(value(await Sent.detail({ id: missingId })), null);
await db.insert(schema.outboundEvent).values(
  Array.from({ length: 101 }, (_, index) => ({
    prospectId: target.id,
    kind: index % 2 ? "reply" : "deliveryAccepted",
    detail: "Fixture activity",
    actor: "fixture",
    createdAt: now,
  })),
);
const activity = value(await Sent.detail({ id: firstId }));
assert.equal(activity?.activity.length, 100);
assert.equal(activity?.activityLimited, true);
assert.equal(JSON.stringify(activity).includes("Fixture activity"), false);
for (const index of Array.from({ length: 50 }, (_, index) => index)) {
  const prospect = await makeProspect(String(index));
  await db.insert(schema.outboundSendAttempt).values({
    prospectId: prospect.id,
    inboxId,
    step: 1,
    revision: 1,
    messageId: `<page-${index}@example.test>`,
    status: index % 2 ? "claimed" : "uncertain",
    contentHash: "no-snapshot",
    createdAt: now,
  });
}
const page = value(await Sent.list({ page: 2 }));
assert.equal(page.total, 53);
assert.equal(page.rows.length, 3);
assert.equal(page.page, 2);
assert.equal(value(await Sent.list({ status: "uncertain" })).total, 25);
assert.equal(value(await Sent.list({ status: "claimed" })).total, 25);
assert.equal(value(await Sent.list({ prospect: target.id })).total, 3);
console.log("Sent query contracts passed");
await db.$client.end({ timeout: 1 });
