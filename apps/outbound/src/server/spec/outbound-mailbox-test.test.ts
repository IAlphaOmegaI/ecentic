import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import { IntegrationError } from "@/server/utils/outbound/http";
import type { Mail } from "@/server/utils/outbound/inbound";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const originalFetch = globalThis.fetch;
const modules: {
  database?: typeof import("@/server/database");
  store?: typeof import("@/server/app/outbound/store");
  tests?: typeof import("@/server/app/outbound/mailbox-test");
  mailboxes?: typeof import("@/server/app/outbound/transport-store");
} = {};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.tests ||
    !modules.mailboxes
  )
    throw new Error("Fixture modules missing");
  return {
    ...modules.database,
    store: modules.store,
    tests: modules.tests,
    mailboxes: modules.mailboxes,
  };
};
const settings = {
  ...defaultPlaybook,
  fromName: "Iseld ecentic",
  signature: "Iseld",
  fromEmail: "iseld@joinecentic.com",
  senderEmails: "iseld@joinecentic.com",
  sendingEnabled: false,
  senderTested: false,
  historyConfirmed: false,
};
const fixture = { inboxId: "", requestId: "" };
const request = () => ({
  requestId: fixture.requestId,
  inboxId: fixture.inboxId,
  recipient: "xhuri@ecentic.ai" as const,
});
const sends: { messageId: string; raw: string; to: string }[] = [];
const dependencies = {
  warmup: async () => {},
  send: async (
    input: Parameters<
      typeof import("@/server/utils/outbound/direct-mailbox").send
    >[0],
  ) => {
    const { db, schema } = active();
    const attempts = await db.select().from(schema.outboundSendAttempt);
    const jobs = await db.select().from(schema.outboundIntegrationJob);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.status).toBe("claimed");
    expect(jobs[0]?.status).toBe("starting");
    sends.push({ messageId: input.messageId, raw: input.raw, to: input.to });
    return {
      success: true as const,
      data: { providerMessageId: input.messageId },
    };
  },
};
const job = async () => {
  const { db, schema } = active();
  const rows = await db.select().from(schema.outboundIntegrationJob);
  if (!rows[0]) throw new Error("Missing test job");
  return rows[0];
};
const inbox = async () => {
  const record = value(await active().mailboxes.read(fixture.inboxId));
  if (!record) throw new Error("Missing test inbox");
  return record;
};
const reply = async (overrides: Partial<Mail> = {}): Promise<Mail> => {
  const record = await job();
  return {
    id: `imap-reply-${randomUUID()}`,
    threadId: String(record.input["messageId"]),
    labelIds: ["INBOX"],
    internalDate: String(Date.now() + 10),
    headers: {
      from: "Xhuri <xhuri@ecentic.ai>",
      to: settings.fromEmail,
      subject: "Re: Outbound mailbox setup test",
      "message-id": `<${randomUUID()}@ecentic.ai>`,
      "in-reply-to": String(record.input["messageId"]),
      references: String(record.input["messageId"]),
    },
    text: "Received",
    ...overrides,
  };
};

describe.skipIf(!endpoint)("isolated owner mailbox setup test", () => {
  beforeAll(async () => {
    if (!endpoint) throw new Error("Disposable database required");
    const url = new URL(endpoint);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.pathname !== "/outbound_test"
    )
      throw new Error("Local outbound_test only");
    Object.assign(process.env, {
      DATABASE_URL: endpoint,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
    });
    mock.module("server-only", () => ({}));
    modules.database = await import("@/server/database");
    modules.store = await import("@/server/app/outbound/store");
    modules.tests = await import("@/server/app/outbound/mailbox-test");
    modules.mailboxes = await import("@/server/app/outbound/transport-store");
    globalThis.fetch = Object.assign(
      async () => {
        throw new Error("No external calls permitted in mailbox test fixture");
      },
      { preconnect: originalFetch.preconnect },
    );
  });
  beforeEach(async () => {
    const { db, schema, store } = active();
    await db.execute(sql`set client_min_messages to warning`);
    await db.execute(
      sql`truncate outbound_conversation_send, outbound_conversation_message, outbound_conversation, outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook, outbound_provider_credential cascade`,
    );
    value(await store.savePlaybook("fixture", settings));
    const rows = await db
      .insert(schema.outboundInbox)
      .values({
        email: settings.fromEmail,
        fromName: settings.fromName,
        signer: settings.signature,
        transport: "google-app-password",
        appPassword: "fixture-app-password",
        connectionVersion: 3,
        lastSyncedAt: new Date(),
        enabled: false,
        dailyCap: 15,
      })
      .returning();
    if (!rows[0]) throw new Error("Inbox not inserted");
    fixture.inboxId = rows[0].id;
    fixture.requestId = randomUUID();
    sends.length = 0;
  });
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  test("reserves immutable internal test before SMTP and shows accepted message without sales approval", async () => {
    const { db, schema, tests, store } = active();
    const result = value(await tests.start("owner", request(), dependencies));
    expect(result.status).toBe("awaitingReply");
    expect(sends).toHaveLength(1);
    expect(sends[0]?.to).toBe("xhuri@ecentic.ai");
    expect(sends[0]?.messageId).toBe(
      `<outbound-mailbox-test.${fixture.requestId}@joinecentic.com>`,
    );
    const [prospect] = await db.select().from(schema.outboundProspect);
    expect(prospect).toMatchObject({
      status: "skipped",
      campaignId: null,
      approvedAt: null,
      approvalHash: null,
      nextSendAt: null,
      sentStep: 1,
    });
    expect(prospect?.details).toMatchObject({
      source: tests.MAILBOX_TEST_SOURCE,
      relationship: "warm",
      emailStatus: "unknown",
      product: "",
      evidence: "",
      findingReviewed: false,
    });
    const [attempt] = await db.select().from(schema.outboundSendAttempt);
    expect(attempt).toMatchObject({ status: "accepted", test: true });
    const [message] = await db
      .select()
      .from(schema.outboundConversationMessage);
    expect(message).toMatchObject({
      direction: "outbound",
      from: settings.fromEmail,
      to: "xhuri@ecentic.ai",
    });
    expect(message?.bodyText).toContain("Please reply Received");
    expect((await store.policy()).settings).toMatchObject({
      senderTested: false,
      sendingEnabled: false,
      historyConfirmed: false,
    });
    expect((await inbox()).enabled).toBe(false);
    expect(
      (await tests.confirm("owner", { requestId: fixture.requestId })).success,
    ).toBe(false);
  });

  test("concurrent duplicate UUID dispatches once and second request cannot reuse the internal contact", async () => {
    const { tests, db, schema } = active();
    const results = await Promise.all([
      tests.start("owner", request(), dependencies),
      tests.start("owner", request(), dependencies),
    ]);
    expect(results.every((result) => result.success)).toBe(true);
    expect(sends).toHaveLength(1);
    expect(
      value(await tests.start("owner", request(), dependencies)).status,
    ).toBe("awaitingReply");
    const second = await tests.start(
      "owner",
      { ...request(), requestId: randomUUID() },
      dependencies,
    );
    expect(second.success).toBe(false);
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(1);
    expect(await db.select().from(schema.outboundProspect)).toHaveLength(1);
  });

  test("unrelated existing company contact is not overwritten", async () => {
    const { tests, store, db, schema } = active();
    value(
      await store.saveProspect(
        "staff",
        prospectSchema.parse({
          company: "ecentic",
          domain: "ecentic.ai",
          website: "https://ecentic.ai",
          country: "US",
          name: "Existing colleague",
          email: "person@ecentic.ai",
          notes: "Preserve me",
        }),
      ),
    );
    expect((await tests.start("owner", request(), dependencies)).success).toBe(
      false,
    );
    expect(sends).toHaveLength(0);
    expect(
      (await db.select().from(schema.outboundProspect))[0]?.details.notes,
    ).toBe("Preserve me");
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(0);
  });

  test("unknown SMTP outcome is retained and never replayed", async () => {
    const { tests, db, schema } = active();
    const uncertain = {
      ...dependencies,
      send: async () => {
        throw new Error("socket closed after DATA");
      },
    };
    expect(value(await tests.start("owner", request(), uncertain)).status).toBe(
      "uncertain",
    );
    expect(
      (await db.select().from(schema.outboundSendAttempt))[0]?.status,
    ).toBe("uncertain");
    expect(
      value(await tests.start("owner", request(), dependencies)).status,
    ).toBe("uncertain");
    expect(sends).toHaveLength(0);
    expect((await tests.confirm("owner", request())).success).toBe(false);
  });

  test("actual matching reply uses normal ingestion, stops sequence, and confirms only senderTested", async () => {
    const { tests, mailboxes, store, db, schema } = active();
    value(await tests.start("owner", request(), dependencies));
    const revision = (await store.policy()).revision;
    value(await mailboxes.ingest(await inbox(), await reply()));
    const [prospect] = await db.select().from(schema.outboundProspect);
    expect(prospect).toMatchObject({
      status: "replied",
      approvedAt: null,
      nextSendAt: null,
    });
    const result = value(
      await tests.confirm("owner", { requestId: fixture.requestId }),
    );
    expect(result.status).toBe("passed");
    const policy = await store.policy();
    expect(policy.revision).toBe(revision);
    expect(policy.settings).toEqual({ ...settings, senderTested: true });
    expect((await inbox()).enabled).toBe(false);
    expect(
      await db.select().from(schema.outboundConversationMessage),
    ).toHaveLength(2);
    expect(value(await store.getWeeklyReport()).totals).toMatchObject({
      prospects: 0,
      acceptedFirsts: 0,
      replies: 0,
    });
    expect(
      (await store.inboxCapacity(await inbox(), policy.settings)).dailyCap,
    ).toBe(15);
    expect(
      value(await tests.confirm("owner", { requestId: fixture.requestId }))
        .status,
    ).toBe("passed");
  });

  test("uncertain test reconciles only exact Sent body before a real reply can confirm", async () => {
    const { tests, mailboxes, db, schema } = active();
    value(
      await tests.start("owner", request(), {
        ...dependencies,
        send: async () => ({
          success: false as const,
          error: new IntegrationError("google", "uncertain", "Unknown"),
        }),
      }),
    );
    const record = await job();
    const sent: Mail = {
      id: "imap-sent",
      threadId: String(record.input["messageId"]),
      labelIds: ["SENT"],
      internalDate: String(Date.now() + 10),
      headers: {
        from: settings.fromEmail,
        to: "xhuri@ecentic.ai",
        "message-id": String(record.input["messageId"]),
        subject: String(record.input["subject"]),
      },
      text: "Wrong copied body",
    };
    value(await mailboxes.ingest(await inbox(), sent));
    expect(
      (await db.select().from(schema.outboundSendAttempt))[0]?.status,
    ).toBe("uncertain");
    value(
      await mailboxes.ingest(await inbox(), {
        ...sent,
        text: String(record.input["body"]),
      }),
    );
    expect(
      (await db.select().from(schema.outboundSendAttempt))[0]?.status,
    ).toBe("accepted");
    value(await mailboxes.ingest(await inbox(), await reply()));
    expect(value(await tests.confirm("owner", request())).status).toBe(
      "passed",
    );
    expect(sends).toHaveLength(0);
  });

  test("unrelated or automated replies cannot prove a round trip", async () => {
    const { tests, mailboxes, store } = active();
    value(await tests.start("owner", request(), dependencies));
    const genuine = await reply();
    const variants = [
      {
        ...genuine,
        id: "unrelated",
        headers: { ...genuine.headers, "in-reply-to": "", references: "" },
      },
      {
        ...genuine,
        id: "other-sender",
        headers: { ...genuine.headers, from: "someone@ecentic.ai" },
      },
      {
        ...genuine,
        id: "automatic",
        headers: { ...genuine.headers, "auto-submitted": "auto-replied" },
      },
      { ...genuine, id: "truncated", textTruncated: true },
    ];
    for (const mail of variants) {
      value(await mailboxes.ingest(await inbox(), mail));
      expect((await tests.confirm("owner", request())).success).toBe(false);
    }
    expect((await store.policy()).settings.senderTested).toBe(false);
  });

  test("a stale connection and altered immutable body cannot confirm an earlier reply", async () => {
    const { tests, mailboxes, db, schema, store } = active();
    value(await tests.start("owner", request(), dependencies));
    value(await mailboxes.ingest(await inbox(), await reply()));
    await db
      .update(schema.outboundInbox)
      .set({ connectionVersion: 4 })
      .where(eq(schema.outboundInbox.id, fixture.inboxId));
    expect((await tests.confirm("owner", request())).success).toBe(false);
    await db
      .update(schema.outboundInbox)
      .set({ connectionVersion: 3 })
      .where(eq(schema.outboundInbox.id, fixture.inboxId));
    const record = await job();
    await db
      .update(schema.outboundIntegrationJob)
      .set({ input: { ...record.input, body: "Changed body" } })
      .where(eq(schema.outboundIntegrationJob.id, record.id));
    expect((await tests.confirm("owner", request())).success).toBe(false);
    expect((await store.policy()).settings.senderTested).toBe(false);
  });

  test("a fabricated receipt without an actual stored inbound message cannot confirm", async () => {
    const { tests, store, db, schema } = active();
    const result = value(await tests.start("owner", request(), dependencies));
    value(
      await store.recordOutcome("staff", {
        prospect: result.prospectId,
        kind: "reply",
        note: "Manually noted, not mailbox evidence",
      }),
    );
    const record = await job();
    await db
      .update(schema.outboundIntegrationJob)
      .set({
        output: {
          ...record.output,
          replyReceipt: {
            providerMessageId: "not-in-mailbox",
            rfcMessageId: "<fake@ecentic.ai>",
            from: "xhuri@ecentic.ai",
            to: settings.fromEmail,
            connectionVersion: 3,
            inReplyTo: [result.messageId],
            sentAt: new Date().toISOString(),
            bodyHash: "a".repeat(64),
          },
        },
      })
      .where(eq(schema.outboundIntegrationJob.id, record.id));
    expect((await tests.confirm("owner", request())).success).toBe(false);
    expect((await store.policy()).settings.senderTested).toBe(false);
  });

  test("test still obeys account availability and actual daily send capacity", async () => {
    const { tests, store, db, schema } = active();
    await db
      .update(schema.outboundPlaybook)
      .set({ settings: { ...settings, sendingEnabled: true } });
    expect((await tests.start("owner", request(), dependencies)).success).toBe(
      false,
    );
    value(await store.savePlaybook("owner", settings));
    await db
      .update(schema.outboundInbox)
      .set({ syncMode: "full" })
      .where(eq(schema.outboundInbox.id, fixture.inboxId));
    expect((await tests.start("owner", request(), dependencies)).success).toBe(
      false,
    );
    await db
      .update(schema.outboundInbox)
      .set({ syncMode: null, dailyCap: 1 })
      .where(eq(schema.outboundInbox.id, fixture.inboxId));
    value(await tests.start("owner", request(), dependencies));
    const second = await tests.start(
      "owner",
      { ...request(), requestId: randomUUID() },
      dependencies,
    );
    expect(second.success).toBe(false);
    if (!second.success)
      expect(second.error.message).toBe("mailbox-test-inbox-capacity");
    expect(sends).toHaveLength(1);
  });
});
