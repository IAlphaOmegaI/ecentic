import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import type { Mail } from "@/server/utils/outbound/inbound";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
if (!endpoint) throw new Error("Disposable test database required");
const location = new URL(endpoint);
if (
  !["127.0.0.1", "localhost"].includes(location.hostname) ||
  location.pathname !== "/outbound_test"
)
  throw new Error("Local outbound_test only");
Object.assign(process.env, {
  DATABASE_URL: endpoint,
  CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 31).toString("base64"),
});
mock.module("server-only", () => ({}));
const { db, schema } = await import("@/server/database");
const Mailboxes = await import("@/server/app/outbound/transport-store");
const Store = await import("@/server/app/outbound/store");
const unwrap = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
await db.execute(sql`set client_min_messages to warning`);
await db.execute(
  sql`truncate outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook cascade`,
);
await db.insert(schema.outboundPlaybook).values({
  id: "default",
  settings: defaultPlaybook,
  revision: 1,
  updatedBy: "fixture",
});
const inbox = (
  await db
    .insert(schema.outboundInbox)
    .values({
      email: "sender@example.test",
      fromName: "Actual sender",
      signer: "Sender",
      transport: "gmail-oauth",
      refreshToken: "fixture-refresh",
      syncMode: "full",
      connectionVersion: 1,
    })
    .returning()
)[0];
assert.ok(inbox);
const sent = (index: number): Mail => ({
  id: `history-${index}`,
  threadId: `old-thread-${index}`,
  internalDate: String(Date.now() - 10_000),
  labelIds: ["SENT"],
  headers: {
    from: inbox.email,
    to: `old${index}@legacy${index}.test`,
    subject: "Prior contact",
    "message-id": `<history-${index}@example.test>`,
  },
  text: "A historical message.",
});
const originals = Array.from({ length: 25 }, (_, index) => sent(index));
const first = unwrap(
  await Mailboxes.ingestBatch(inbox, originals, {
    syncPageToken: "page-25",
    syncMode: "full",
  }),
);
assert.deepEqual(first, { processed: 25, fast: 25, matched: 0 });
assert.equal((await db.select().from(schema.outboundSuppression)).length, 50);
assert.equal((await db.select().from(schema.outboundEvent)).length, 25);
assert.equal(unwrap(await Mailboxes.read(inbox.id))?.syncPageToken, "page-25");
unwrap(
  await Mailboxes.ingestBatch(inbox, originals, { syncPageToken: "page-25" }),
);
assert.equal((await db.select().from(schema.outboundSuppression)).length, 50);
assert.equal((await db.select().from(schema.outboundEvent)).length, 25);
const tooMany = await Mailboxes.ingestBatch(inbox, [...originals, sent(30)], {
  syncPageToken: "bad-size",
});
assert.equal(tooMany.success, false);
assert.equal(unwrap(await Mailboxes.read(inbox.id))?.syncPageToken, "page-25");

const details = prospectSchema.parse({
  company: "Current",
  domain: "current.test",
  website: "https://current.test",
  country: "US",
  platform: "shopify",
  name: "Real person",
  email: "jane@current.test",
});
const company = (
  await db
    .insert(schema.outboundCompany)
    .values({
      name: details.company,
      domain: details.domain,
      website: details.website,
      country: "US",
      source: "fixture",
    })
    .returning()
)[0];
assert.ok(company);
const person = (
  await db
    .insert(schema.outboundPerson)
    .values({
      companyId: company.id,
      identityKey: "known-person",
      name: details.name,
      email: details.email,
    })
    .returning()
)[0];
assert.ok(person);
const prospect = (
  await db
    .insert(schema.outboundProspect)
    .values({
      companyId: company.id,
      personId: person.id,
      details,
      status: "active",
      inboxId: inbox.id,
      threadId: "current-thread",
      nextSendAt: new Date(Date.now() + 60_000),
      approvalHash: "approved",
      createdBy: "fixture",
    })
    .returning()
)[0];
assert.ok(prospect);
const incoming: Mail = {
  id: "current-reply",
  threadId: "current-thread",
  labelIds: ["INBOX"],
  internalDate: String(Date.now()),
  headers: {
    from: details.email,
    to: inbox.email,
    subject: "A real reply",
    "message-id": "<reply@current.test>",
  },
  text: "Tell me more about the product check.",
};
const currentSent: Mail = {
  ...sent(100),
  id: "current-sent",
  threadId: "current-thread",
  headers: {
    from: inbox.email,
    to: details.email,
    subject: "A real outreach",
    "message-id": "<current-sent@example.test>",
  },
};
await db.insert(schema.outboundSendAttempt).values({
  prospectId: prospect.id,
  inboxId: inbox.id,
  step: 1,
  revision: 1,
  messageId: "<current-sent@example.test>",
  providerMessageId: currentSent.id,
  status: "accepted",
  contentHash: "fixture",
  completedAt: new Date(),
});
const mixed = unwrap(
  await Mailboxes.ingestBatch(inbox, [sent(26), currentSent, incoming], {
    syncPageToken: "page-mixed",
  }),
);
assert.deepEqual(mixed, { processed: 3, fast: 1, matched: 2 });
const stopped = (
  await db
    .select()
    .from(schema.outboundProspect)
    .where(eq(schema.outboundProspect.id, prospect.id))
)[0];
assert.equal(stopped?.status, "replied");
assert.equal(stopped?.nextSendAt, null);
assert.equal(
  (await db.select().from(schema.outboundConversationMessage)).length,
  2,
);
assert.equal(
  (
    await db
      .select()
      .from(schema.outboundSuppression)
      .where(eq(schema.outboundSuppression.value, details.domain))
  ).length,
  0,
);
const eventsBeforeReplay = (await db.select().from(schema.outboundEvent))
  .length;
unwrap(
  await Mailboxes.ingestBatch(inbox, [sent(26), currentSent, incoming], {
    syncPageToken: "page-mixed",
  }),
);
assert.equal(
  (await db.select().from(schema.outboundEvent)).length,
  eventsBeforeReplay,
);
assert.equal(
  (await db.select().from(schema.outboundConversationMessage)).length,
  2,
);

const optout: Mail = {
  ...incoming,
  id: "unknown-optout",
  threadId: "unknown-optout-thread",
  headers: {
    ...incoming.headers,
    from: "stop@unknown.test",
    "message-id": "<stop@unknown.test>",
  },
  text: "Please remove me.",
};
unwrap(
  await Mailboxes.ingestBatch(inbox, [optout], {
    syncPageToken: "page-optout",
  }),
);
assert.equal(
  (
    await db
      .select()
      .from(schema.outboundSuppression)
      .where(eq(schema.outboundSuppression.value, "stop@unknown.test"))
  ).length,
  1,
);

const originalOutcome = Store.recordOutcome;
const changed = spyOn(Store, "recordOutcome").mockImplementation(
  async (...arguments_) => {
    const result = await originalOutcome(...arguments_);
    await db
      .update(schema.outboundInbox)
      .set({ connectionVersion: 2, syncPageToken: "reconnected" })
      .where(eq(schema.outboundInbox.id, inbox.id));
    return result;
  },
);
const racingReply = {
  ...incoming,
  id: "reply-reconnect",
  headers: { ...incoming.headers, "message-id": "<reconnect@current.test>" },
};
const interrupted = await Mailboxes.ingestBatch(
  inbox,
  [sent(27), racingReply],
  { syncPageToken: "must-not-commit" },
);
changed.mockRestore();
assert.equal(interrupted.success, false);
assert.equal(
  unwrap(await Mailboxes.read(inbox.id))?.syncPageToken,
  "reconnected",
);
const countBeforeStale = (await db.select().from(schema.outboundEvent)).length;
assert.equal(
  (await Mailboxes.ingestBatch(inbox, [sent(28)], { syncPageToken: "stale" }))
    .success,
  false,
);
assert.equal(
  (await db.select().from(schema.outboundEvent)).length,
  countBeforeStale,
);
const fresh = unwrap(await Mailboxes.read(inbox.id));
assert.ok(fresh);
unwrap(
  await Mailboxes.ingestBatch(fresh, [sent(27), racingReply], {
    syncPageToken: "resumed",
  }),
);
assert.equal(unwrap(await Mailboxes.read(inbox.id))?.syncPageToken, "resumed");
assert.equal(
  (await db.select().from(schema.outboundEvent)).length,
  countBeforeStale,
);
const beforeDeadline = unwrap(await Mailboxes.read(inbox.id));
assert.ok(beforeDeadline);
assert.equal(
  (
    await Mailboxes.ingestBatch(
      beforeDeadline,
      [],
      { syncPageToken: "expired" },
      Date.now() - 1,
    )
  ).success,
  false,
);
assert.equal(unwrap(await Mailboxes.read(inbox.id))?.syncPageToken, "resumed");
unwrap(
  await Mailboxes.ingestBatch(beforeDeadline, [], {
    syncMode: null,
    syncPageToken: null,
    lastSyncedAt: new Date(),
    error: null,
  }),
);
assert.equal(unwrap(await Mailboxes.read(inbox.id))?.syncMode, null);
const Worker = await import("@/server/app/outbound/worker");
const now = Date.now();
assert.deepEqual(
  Worker.prioritizeInboxSync(
    [
      {
        ...fresh,
        id: "fresh",
        syncMode: null,
        lastSyncedAt: new Date(now),
        updatedAt: new Date(1),
      },
      {
        ...fresh,
        id: "history-recent",
        syncMode: "full",
        lastSyncedAt: null,
        updatedAt: new Date(20),
      },
      {
        ...fresh,
        id: "history-older",
        syncMode: "full",
        lastSyncedAt: null,
        updatedAt: new Date(10),
      },
      {
        ...fresh,
        id: "stale",
        syncMode: null,
        lastSyncedAt: new Date(now - 600_000),
        updatedAt: new Date(5),
      },
    ],
    now,
  ).map((entry) => entry.id),
  ["stale", "history-older", "history-recent", "fresh"],
);
assert.deepEqual(unwrap(await Worker.syncAll({ deadline: now - 1 })), []);
await db.$client.end({ timeout: 1 });
console.log("History batch checks passed");
