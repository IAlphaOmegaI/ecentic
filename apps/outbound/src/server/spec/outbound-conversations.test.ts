import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import { CONVERSATION_STAGES } from "@/lib/outbound-conversations";
import { Environment } from "@/server/utils/environment";
import { IntegrationError } from "@/server/utils/outbound/http";
import { requireTestDatabase } from "./helpers/database";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const modules: {
  database?: typeof import("@/server/database");
  store?: typeof import("@/server/app/outbound/store");
  conversations?: typeof import("@/server/app/outbound/conversations");
  sending?: typeof import("@/server/app/outbound/conversation-send");
  direct?: typeof import("@/server/utils/outbound/direct-mailbox");
  ai?: typeof import("@/server/utils/ai");
  mailboxes?: typeof import("@/server/app/outbound/transport-store");
  actions?: typeof import("@/server/app/outbound/conversation-actions");
} = {};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.conversations ||
    !modules.sending ||
    !modules.direct ||
    !modules.ai ||
    !modules.mailboxes ||
    !modules.actions
  )
    throw new Error("Missing modules");
  return {
    ...modules.database,
    store: modules.store,
    conversations: modules.conversations,
    sending: modules.sending,
    direct: modules.direct,
    ai: modules.ai,
    mailboxes: modules.mailboxes,
    actions: modules.actions,
  };
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const fixture = { prospectId: "", inboxId: "", threadId: "" };
const session = { authenticated: true, role: "staff" };
const settings = {
  ...defaultPlaybook,
  senderConfirmed: true,
  historyConfirmed: true,
  competingSendersPaused: true,
  senderTested: true,
  meetingBookingUrl: "https://www.cal.com/ecentic-ai/quick-chat",
  fromName: "Iseld ecentic",
  signature: "Iseld",
  fromEmail: "iseld@joinecentic.com",
  senderEmails: "iseld@joinecentic.com",
};
const ingest = (
  identifier = "inbound_1",
  body = "Could you explain how this works?",
  sentAt = new Date(),
  outcome?: "reply" | "optout" | "bounce" | "ooo" | "review",
) =>
  active().conversations.ingest({
    prospectId: fixture.prospectId,
    channel: "email",
    accountId: fixture.inboxId,
    accountLabel: "iseld@joinecentic.com",
    providerThreadId: "thread_fixture",
    counterpart: "jane@samplegoods.com",
    outcome,
    message: {
      providerMessageId: identifier,
      direction: "inbound",
      bodyText: body,
      subject: "Product question",
      from: "jane@samplegoods.com",
      to: "iseld@joinecentic.com",
      rfcMessageId: `<${identifier}@samplegoods.com>`,
      sentAt,
    },
  });
const save = async (body = "Yes, we can explain that.\n\nIseld") => {
  const { conversations } = active();
  const detail = value(await conversations.get({ id: fixture.threadId }));
  return value(
    await conversations.saveDraft("fixture", {
      id: fixture.threadId,
      expectedRevision: detail.thread.revision,
      body,
    }),
  );
};

describe.skipIf(!endpoint)(
  "isolated conversation storage and exact reply delivery",
  () => {
    beforeAll(async () => {
      requireTestDatabase(endpoint);
      Object.assign(process.env, {
        DATABASE_URL: endpoint,
        CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
      });
      mock.module("server-only", () => ({}));
      mock.module("next/headers", () => ({
        headers: async () => new Headers(),
      }));
      mock.module("next/server", () => ({ connection: async () => undefined }));
      mock.module("@/lib/auth", () => ({
        auth: {
          api: {
            getSession: async () =>
              session.authenticated
                ? {
                    user: { id: "stage-staff-fixture", role: session.role },
                    session: {
                      id: "session-fixture",
                      userId: "stage-staff-fixture",
                    },
                  }
                : null,
          },
        },
      }));
      modules.database = await import("@/server/database");
      modules.store = await import("@/server/app/outbound/store");
      modules.conversations = await import(
        "@/server/app/outbound/conversations"
      );
      modules.sending = await import("@/server/app/outbound/conversation-send");
      modules.direct = await import("@/server/utils/outbound/direct-mailbox");
      modules.ai = await import("@/server/utils/ai");
      modules.mailboxes = await import("@/server/app/outbound/transport-store");
      modules.actions = await import(
        "@/server/app/outbound/conversation-actions"
      );
    });
    beforeEach(async () => {
      Object.assign(session, { authenticated: true, role: "staff" });
      const { db, schema, store } = active();
      await db.execute(sql`set client_min_messages to warning`);
      await db.execute(
        sql`truncate outbound_conversation_send, outbound_conversation_message, outbound_conversation, outbound_integration_job, outbound_campaign, outbound_company, outbound_person, outbound_prospect, outbound_event, outbound_revision, outbound_playbook, outbound_provider_credential, outbound_suppression, outbound_inbox, outbound_linkedin_account cascade`,
      );
      value(await store.savePlaybook("fixture", settings));
      fixture.prospectId = value(
        await store.saveProspect(
          "fixture",
          prospectSchema.parse({
            company: "Sample Goods",
            domain: "samplegoods.com",
            country: "US",
            name: "Jane Smith",
            email: "jane@samplegoods.com",
          }),
        ),
      ).prospect;
      const [inbox] = await db
        .insert(schema.outboundInbox)
        .values({
          email: settings.fromEmail,
          fromName: settings.fromName,
          signer: settings.signature,
          transport: "google-app-password",
          appPassword: "fixture-apppassword",
          enabled: true,
          lastSyncedAt: new Date(),
        })
        .returning();
      if (!inbox) throw new Error("Missing inbox");
      fixture.inboxId = inbox.id;
      fixture.threadId = value(await ingest()).id;
    });
    afterEach(() => mock.restore());
    test("the additive archive migration preserves existing rows and is safe to apply twice", async () => {
      const { db } = active();
      const migration = await Bun.file(
        new URL(
          "../../../../../apps/web/drizzle/20261126160000_outbound_conversation_archive/migration.sql",
          import.meta.url,
        ),
      ).text();
      await db.transaction(async (transaction) => {
        await transaction.execute(
          sql`create temporary table outbound_conversation (id text primary key) on commit drop`,
        );
        await transaction.execute(
          sql`insert into outbound_conversation (id) values ('retained-thread')`,
        );
        await transaction.execute(sql.raw(migration));
        await transaction.execute(sql.raw(migration));
        const rows = await transaction.execute(
          sql`select id, archived_at from outbound_conversation`,
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          id: "retained-thread",
          archived_at: null,
        });
      });
    });
    test("archive hides the thread, pauses both sequences and preserves its stage, drafts and complete history", async () => {
      const { db, schema, conversations, actions, store } = active();
      await save("Keep this staff reply intact.");
      const before = value(await conversations.get({ id: fixture.threadId }));
      const saved = value(
        await actions.archiveConversation(Environment.CLIENT, {
          id: fixture.threadId,
          expectedRevision: before.thread.revision,
          archived: true,
        }),
      );
      const after = value(await conversations.get({ id: fixture.threadId }));
      expect(saved.revision).toBe(before.thread.revision + 1);
      expect(after.thread.archivedAt).toBe(saved.archivedAt);
      expect(after.thread.stage).toBe(before.thread.stage);
      expect(after.thread.needsReply).toBe(false);
      expect(after.messages).toEqual(before.messages);
      expect(after.draft).toEqual(before.draft);
      expect(value(await conversations.list()).total).toBe(0);
      expect(value(await conversations.list({ needsReply: true })).total).toBe(
        0,
      );
      const archived = value(await conversations.list({ archived: true }));
      expect(archived.total).toBe(1);
      expect(archived.items[0]?.threadId).toBe(fixture.threadId);
      expect(value(await conversations.summary()).needsReply).toBe(0);
      const [prospect] = await db.select().from(schema.outboundProspect);
      expect(prospect).toMatchObject({
        status: "held",
        nextSendAt: null,
        approvedAt: null,
        linkedinStatus: "closed",
        linkedinNextActionAt: null,
      });
      if (!prospect) throw new Error("Missing prospect");
      await expect(
        db.transaction((transaction) =>
          store.assertCampaignActive(transaction, prospect),
        ),
      ).rejects.toThrow("conversation-archived");
      const events = await db
        .select()
        .from(schema.outboundEvent)
        .where(eq(schema.outboundEvent.kind, "conversationArchived"));
      expect(events).toHaveLength(1);
      expect(events[0]?.actor).toBe("stage-staff-fixture");
      const repeated = value(
        await conversations.setArchived("fixture", {
          id: fixture.threadId,
          expectedRevision: saved.revision,
          archived: true,
        }),
      );
      expect(repeated.revision).toBe(saved.revision);
    });
    test("archive actions reject stale revisions and unauthorized callers before changing any thread", async () => {
      const { actions, conversations } = active();
      const before = value(await conversations.get({ id: fixture.threadId }));
      const input = {
        id: fixture.threadId,
        archived: true,
        expectedRevision: before.thread.revision,
      };
      const stale = await actions.archiveConversation(Environment.CLIENT, {
        ...input,
        expectedRevision: input.expectedRevision - 1,
      });
      expect(stale).toMatchObject({
        success: false,
        error: { message: "conversation-changed" },
      });
      session.authenticated = false;
      expect(
        await actions.archiveConversation(Environment.CLIENT, input),
      ).toMatchObject({
        success: false,
        error: { name: "unauthenticated-error" },
      });
      Object.assign(session, { authenticated: true, role: "user" });
      expect(
        await actions.archiveConversation(Environment.SERVER, input),
      ).toMatchObject({
        success: false,
        error: { name: "unauthorized-error" },
      });
      expect(value(await conversations.get({ id: fixture.threadId }))).toEqual(
        before,
      );
    });
    test("archived replies cannot be edited, generated or sent and restoring never restarts cold outreach", async () => {
      const { conversations, sending, direct, ai, db, schema } = active();
      const draft = await save();
      const saved = value(
        await conversations.setArchived("fixture", {
          id: fixture.threadId,
          expectedRevision: draft.revision,
          archived: true,
        }),
      );
      const send = spyOn(direct, "send");
      const generate = spyOn(ai, "generate");
      const input = { id: fixture.threadId, expectedRevision: saved.revision };
      for (const result of [
        await conversations.updateStage("fixture", {
          ...input,
          stage: "interested",
        }),
        await conversations.saveDraft("fixture", { ...input, body: "Changed" }),
        await conversations.generateReply("fixture", {
          ...input,
          requestId: crypto.randomUUID(),
        }),
        await sending.send("fixture", input),
      ])
        expect(result).toMatchObject({
          success: false,
          error: { message: "conversation-archived" },
        });
      expect(send).not.toHaveBeenCalled();
      expect(generate).not.toHaveBeenCalled();
      value(
        await conversations.setArchived("fixture", {
          ...input,
          archived: false,
        }),
      );
      expect(value(await conversations.list()).total).toBe(1);
      expect(value(await conversations.list({ archived: true })).total).toBe(0);
      const [prospect] = await db.select().from(schema.outboundProspect);
      expect(prospect).toMatchObject({
        status: "held",
        nextSendAt: null,
        approvedAt: null,
        linkedinStatus: "closed",
      });
    });
    test("archive between reply reservation and dispatch prevents transport without rewriting the reserved message", async () => {
      const { conversations, sending, mailboxes, direct, db, schema } =
        active();
      const draft = await save(
        "A reviewed reply that must not send after archive.",
      );
      await db
        .update(schema.outboundInbox)
        .set({ transport: "gmail-oauth", refreshToken: "fixture-refresh" })
        .where(eq(schema.outboundInbox.id, fixture.inboxId));
      const google = await import("@/server/utils/outbound/google");
      const googleSend = spyOn(google, "sendMessage");
      const directSend = spyOn(direct, "send");
      spyOn(mailboxes, "access").mockImplementation(async () => {
        value(
          await conversations.setArchived("fixture", {
            id: fixture.threadId,
            expectedRevision: draft.revision,
            archived: true,
          }),
        );
        return { success: true, data: "fixture-access" };
      });
      const result = value(
        await sending.send("fixture", {
          id: fixture.threadId,
          expectedRevision: draft.revision,
        }),
      );
      expect(result.status).toBe("failed");
      expect(googleSend).not.toHaveBeenCalled();
      expect(directSend).not.toHaveBeenCalled();
      const detail = value(await conversations.get({ id: fixture.threadId }));
      expect(detail.sendAttempts[0]).toMatchObject({
        status: "failed",
        body: "A reviewed reply that must not send after archive.",
      });
      expect(detail.thread.archivedAt).not.toBeNull();
    });
    test("archive while generation is running records the response without overwriting the retained draft", async () => {
      const { conversations, ai } = active();
      const draft = await save("Keep this original reply.");
      spyOn(ai, "generate").mockImplementation(async (input) => {
        value(
          await conversations.setArchived("fixture", {
            id: fixture.threadId,
            expectedRevision: draft.revision,
            archived: true,
          }),
        );
        return input.output.parse({
          body: "A model reply that arrived too late.",
        });
      });
      const result = value(
        await conversations.generateReply("fixture", {
          id: fixture.threadId,
          expectedRevision: draft.revision,
          requestId: crypto.randomUUID(),
        }),
      );
      expect(result).toMatchObject({ applied: false });
      const detail = value(await conversations.get({ id: fixture.threadId }));
      expect(detail.draft.body).toBe("Keep this original reply.");
      expect(detail.thread.archivedAt).not.toBeNull();
    });
    test.each(["replied", "optedOut", "bounced"] as const)(
      "archive and restore preserve the existing %s stop",
      async (status) => {
        const { db, schema, conversations } = active();
        await db
          .update(schema.outboundProspect)
          .set({
            status,
            holdReason: "Original stop",
            linkedinStatus: "replied",
          })
          .where(eq(schema.outboundProspect.id, fixture.prospectId));
        const before = value(await conversations.get({ id: fixture.threadId }));
        const saved = value(
          await conversations.setArchived("fixture", {
            id: fixture.threadId,
            expectedRevision: before.thread.revision,
            archived: true,
          }),
        );
        value(
          await conversations.setArchived("fixture", {
            id: fixture.threadId,
            expectedRevision: saved.revision,
            archived: false,
          }),
        );
        const [prospect] = await db.select().from(schema.outboundProspect);
        expect(prospect).toMatchObject({
          status,
          holdReason: "Original stop",
          linkedinStatus: "replied",
          nextSendAt: null,
        });
        if (status !== "replied")
          expect(
            value(await conversations.get({ id: fixture.threadId })).thread
              .needsReply,
          ).toBe(false);
      },
    );
    test("only a genuinely newer human reply resurfaces an archived thread without restarting outreach", async () => {
      const { conversations, db, schema } = active();
      const before = value(await conversations.get({ id: fixture.threadId }));
      const closed = value(
        await conversations.updateStage("fixture", {
          id: fixture.threadId,
          expectedRevision: before.thread.revision,
          stage: "closed",
        }),
      );
      const saved = value(
        await conversations.setArchived("fixture", {
          id: fixture.threadId,
          expectedRevision: closed.revision,
          archived: true,
        }),
      );
      if (!saved.archivedAt) throw new Error("Missing archive timestamp");
      value(
        await ingest(
          "older_human",
          "Older reply",
          new Date(Date.parse(saved.archivedAt) - 1000),
          "reply",
        ),
      );
      expect(value(await conversations.list()).total).toBe(0);
      value(
        await ingest(
          "out_of_office",
          "I am away",
          new Date(Date.parse(saved.archivedAt) + 1000),
          "ooo",
        ),
      );
      expect(value(await conversations.list()).total).toBe(0);
      value(
        await ingest(
          "new_human",
          "Can you explain this?",
          new Date(Date.parse(saved.archivedAt) + 2000),
          "reply",
        ),
      );
      const after = value(await conversations.get({ id: fixture.threadId }));
      expect(after.thread).toMatchObject({
        archivedAt: null,
        needsReply: true,
        stage: "closed",
      });
      expect(value(await conversations.list({ needsReply: true })).total).toBe(
        1,
      );
      const [prospect] = await db.select().from(schema.outboundProspect);
      expect(prospect).toMatchObject({
        status: "held",
        nextSendAt: null,
        approvedAt: null,
      });
    });
    test.each(["optedOut", "bounced", "notInterested"] as const)(
      "a newer classified reply does not reopen the archived %s stop",
      async (stop) => {
        const { conversations, db, schema } = active();
        if (stop === "notInterested")
          await db
            .update(schema.outboundConversation)
            .set({ stage: "notInterested" })
            .where(eq(schema.outboundConversation.id, fixture.threadId));
        else
          await db
            .update(schema.outboundProspect)
            .set({ status: stop })
            .where(eq(schema.outboundProspect.id, fixture.prospectId));
        const before = value(await conversations.get({ id: fixture.threadId }));
        value(
          await conversations.setArchived("fixture", {
            id: fixture.threadId,
            expectedRevision: before.thread.revision,
            archived: true,
          }),
        );
        value(
          await ingest(
            "late_suppressed_reply",
            "A classified reply",
            new Date(Date.now() + 1000),
            "reply",
          ),
        );
        const after = value(await conversations.get({ id: fixture.threadId }));
        expect(after.thread.archivedAt).not.toBeNull();
        expect(after.thread.needsReply).toBe(false);
        expect(value(await conversations.list()).total).toBe(0);
      },
    );
    test.each(["email", "domain"] as const)(
      "a saved %s suppression also prevents archived reply resurfacing",
      async (scope) => {
        const { conversations, db, schema } = active();
        const before = value(await conversations.get({ id: fixture.threadId }));
        value(
          await conversations.setArchived("fixture", {
            id: fixture.threadId,
            expectedRevision: before.thread.revision,
            archived: true,
          }),
        );
        await db.insert(schema.outboundSuppression).values({
          scope,
          value: scope === "email" ? "jane@samplegoods.com" : "samplegoods.com",
          reason: "Existing suppression",
          createdBy: "fixture",
        });
        value(
          await ingest(
            "suppressed_human_reply",
            "A classified reply",
            new Date(Date.now() + 1000),
            "reply",
          ),
        );
        const after = value(await conversations.get({ id: fixture.threadId }));
        expect(after.thread.archivedAt).not.toBeNull();
        expect(after.thread.needsReply).toBe(false);
        expect(value(await conversations.list()).total).toBe(0);
      },
    );
    test.each(["optout", "bounce"] as const)(
      "an archived %s event preserves suppression and stays out of the active inbox",
      async (outcome) => {
        const { conversations } = active();
        const before = value(await conversations.get({ id: fixture.threadId }));
        value(
          await conversations.setArchived("fixture", {
            id: fixture.threadId,
            expectedRevision: before.thread.revision,
            archived: true,
          }),
        );
        value(
          await ingest(
            "stopped_event",
            "Stop",
            new Date(Date.now() + 1000),
            outcome,
          ),
        );
        const after = value(await conversations.get({ id: fixture.threadId }));
        expect(after.thread.archivedAt).not.toBeNull();
        expect(after.thread.needsReply).toBe(false);
        expect(after.thread.stage).toBe(
          outcome === "optout" ? "notInterested" : "closed",
        );
        expect(value(await conversations.list()).total).toBe(0);
      },
    );
    test("archived and active channels stay in separate lists with the correct selected thread", async () => {
      const { conversations } = active();
      const email = value(await conversations.get({ id: fixture.threadId }));
      value(
        await conversations.setArchived("fixture", {
          id: fixture.threadId,
          expectedRevision: email.thread.revision,
          archived: true,
        }),
      );
      const other = value(
        await conversations.ingest({
          prospectId: fixture.prospectId,
          channel: "linkedin",
          accountId: "fixture-linkedin",
          accountLabel: "LinkedIn",
          providerThreadId: "linkedin-thread",
          counterpart: "fixture-user",
          message: {
            providerMessageId: "linkedin-reply",
            direction: "inbound",
            bodyText: "A second conversation",
            from: "fixture-user",
            to: "fixture-account",
            sentAt: new Date(),
          },
        }),
      );
      expect(value(await conversations.list()).items[0]).toMatchObject({
        threadId: other.id,
        threadCount: 1,
        channels: ["linkedin"],
      });
      expect(
        value(await conversations.list({ archived: true })).items[0],
      ).toMatchObject({
        threadId: fixture.threadId,
        threadCount: 1,
        channels: ["email"],
      });
      expect(
        value(await conversations.get({ id: fixture.prospectId })).thread.id,
      ).toBe(other.id);
      expect(
        value(
          await conversations.get({
            id: fixture.prospectId,
            threadId: fixture.threadId,
          }),
        ).thread.id,
      ).toBe(fixture.threadId);
    });
    test("stores actual full bodies and deduplicates provider messages before changing revision", async () => {
      const { conversations } = active();
      const body = "Detailed answer. ".repeat(300);
      value(await ingest("long_message", body));
      const before = value(await conversations.get({ id: fixture.threadId }));
      value(await ingest("long_message", body));
      const after = value(await conversations.get({ id: fixture.threadId }));
      expect(after.total).toBe(2);
      expect(after.thread.revision).toBe(before.thread.revision);
      expect(after.messages.some((message) => message.bodyText === body)).toBe(
        true,
      );
      expect(
        value(await conversations.list({ q: "Sample", needsReply: "1" })).total,
      ).toBe(1);
      expect(value(await conversations.list({ q: "nonexistent" })).total).toBe(
        0,
      );
      expect(
        value(await conversations.list({ needsReply: "false" })).total,
      ).toBe(1);
    });
    test("meeting booked and meeting held are explicit distinct-prospect counts", async () => {
      const { conversations } = active();
      const thread = value(
        await conversations.get({ id: fixture.threadId }),
      ).thread;
      value(
        await conversations.updateStage("fixture", {
          id: thread.id,
          expectedRevision: thread.revision,
          stage: "meetingBooked",
        }),
      );
      expect(value(await conversations.summary())).toMatchObject({
        meetingsBooked: 1,
        meetingsHeld: 0,
        meetingsRecorded: 1,
      });
      const next = value(
        await conversations.get({ id: fixture.threadId }),
      ).thread;
      value(
        await conversations.updateStage("fixture", {
          id: next.id,
          expectedRevision: next.revision,
          stage: "meetingHeld",
        }),
      );
      expect(value(await conversations.summary())).toMatchObject({
        meetingsBooked: 0,
        meetingsHeld: 1,
        meetingsRecorded: 1,
      });
    });
    test.each([...CONVERSATION_STAGES])(
      "the authenticated action saves %s without changing messages, identity or the saved draft",
      async (stage) => {
        const { actions, conversations, db, schema } = active();
        await save("A staff-edited reply that must be retained.");
        const before = value(await conversations.get({ id: fixture.threadId }));
        const result = await actions.updateConversationStage(
          Environment.CLIENT,
          {
            id: before.thread.id,
            stage,
            expectedRevision: before.thread.revision,
          },
        );
        expect(result).toEqual({
          success: true,
          data: { id: before.thread.id, revision: before.thread.revision + 1 },
        });
        const after = value(await conversations.get({ id: fixture.threadId }));
        expect(after.thread.stage).toBe(stage);
        expect(after.thread.needsReply).toBe(
          ["open", "interested", "question"].includes(stage),
        );
        expect(after.thread.counterpart).toBe(before.thread.counterpart);
        expect(after.thread.accountLabel).toBe(before.thread.accountLabel);
        expect(after.draft).toEqual(before.draft);
        expect(after.messages).toEqual(before.messages);
        const events = await db
          .select()
          .from(schema.outboundEvent)
          .where(eq(schema.outboundEvent.kind, "conversationStage"));
        expect(events).toHaveLength(1);
        expect(events[0]?.actor).toBe("stage-staff-fixture");
      },
    );
    test("the action without an explicit environment marker remains compatible", async () => {
      const { actions, conversations } = active();
      const before = value(await conversations.get({ id: fixture.threadId }));
      const result = await actions.updateConversationStage({
        id: before.thread.id,
        stage: "interested",
        expectedRevision: before.thread.revision,
      });
      expect(result.success).toBe(true);
      expect(
        value(await conversations.get({ id: fixture.threadId })).thread.stage,
      ).toBe("interested");
    });
    test("concurrent stage actions accept one revision and return a serialized conflict for the other", async () => {
      const { actions, conversations, db, schema } = active();
      const before = value(await conversations.get({ id: fixture.threadId }));
      const results = await Promise.all(
        (["interested", "meetingBooked"] as const).map((stage) =>
          actions.updateConversationStage(Environment.CLIENT, {
            id: before.thread.id,
            stage,
            expectedRevision: before.thread.revision,
          }),
        ),
      );
      expect(results.filter((result) => result.success)).toHaveLength(1);
      expect(results.find((result) => !result.success)).toEqual({
        success: false,
        error: { name: "conflict-error", message: "conversation-changed" },
      });
      const after = value(await conversations.get({ id: fixture.threadId }));
      expect(after.thread.revision).toBe(before.thread.revision + 1);
      expect(after.messages).toEqual(before.messages);
      const events = await db
        .select()
        .from(schema.outboundEvent)
        .where(eq(schema.outboundEvent.kind, "conversationStage"));
      expect(events).toHaveLength(1);
    });
    test("a new inbound preserves the saved draft and rejects a stale stage until the user refreshes", async () => {
      const { actions, conversations } = active();
      await save("Keep this staff draft while the mailbox refreshes.");
      const before = value(await conversations.get({ id: fixture.threadId }));
      value(
        await ingest(
          "stage_race_inbound",
          "One more detail.",
          new Date(Date.now() + 1000),
        ),
      );
      expect(
        await actions.updateConversationStage(Environment.CLIENT, {
          id: before.thread.id,
          stage: "interested",
          expectedRevision: before.thread.revision,
        }),
      ).toEqual({
        success: false,
        error: { name: "conflict-error", message: "conversation-changed" },
      });
      const refreshed = value(
        await conversations.get({ id: fixture.threadId }),
      );
      expect(refreshed.thread.stage).toBe("open");
      expect(refreshed.draft).toEqual(before.draft);
      expect(refreshed.messages).toHaveLength(before.messages.length + 1);
      expect(
        (
          await actions.updateConversationStage(Environment.CLIENT, {
            id: refreshed.thread.id,
            stage: "interested",
            expectedRevision: refreshed.thread.revision,
          })
        ).success,
      ).toBe(true);
    });
    test("an opt-out racing a stage edit stays closed and never reaches the send provider", async () => {
      const { actions, conversations, sending, direct } = active();
      const saved = await save();
      const send = spyOn(direct, "send");
      value(
        await ingest(
          "stage_race_optout",
          "Please stop emailing me.",
          new Date(Date.now() + 1000),
          "optout",
        ),
      );
      expect(
        await actions.updateConversationStage(Environment.CLIENT, {
          id: fixture.threadId,
          stage: "interested",
          expectedRevision: saved.revision,
        }),
      ).toEqual({
        success: false,
        error: { name: "conflict-error", message: "conversation-changed" },
      });
      const after = value(await conversations.get({ id: fixture.threadId }));
      expect(after.thread.stage).toBe("notInterested");
      expect(after.thread.needsReply).toBe(false);
      expect(
        (
          await sending.send("fixture", {
            id: fixture.threadId,
            expectedRevision: after.thread.revision,
          })
        ).success,
      ).toBe(false);
      expect(send).not.toHaveBeenCalled();
    });
    test("a prospect group ID cannot stand in for its selected thread", async () => {
      const { actions, conversations } = active();
      const before = value(await conversations.get({ id: fixture.threadId }));
      const result = await actions.updateConversationStage(Environment.CLIENT, {
        id: fixture.prospectId,
        stage: "interested",
        expectedRevision: before.thread.revision,
      });
      expect(result).toEqual({
        success: false,
        error: { name: "not-found-error", message: "conversation-missing" },
      });
      expect(value(await conversations.get({ id: fixture.threadId }))).toEqual(
        before,
      );
    });
    test.each([
      { authenticated: false, role: "staff", name: "unauthenticated-error" },
      { authenticated: true, role: "user", name: "unauthorized-error" },
    ])(
      "the stage action rejects an unauthorized session without modifying data: %j",
      async (authorization) => {
        const { actions, conversations } = active();
        const before = value(await conversations.get({ id: fixture.threadId }));
        Object.assign(session, authorization);
        for (const environment of [Environment.CLIENT, Environment.SERVER]) {
          const result = await actions.updateConversationStage(environment, {
            id: before.thread.id,
            stage: "interested",
            expectedRevision: before.thread.revision,
          });
          expect(result.success).toBe(false);
          if (result.success) throw new Error("Expected session rejection");
          expect(result.error.name).toBe(authorization.name);
        }
        expect(
          value(await conversations.get({ id: fixture.threadId })),
        ).toEqual(before);
      },
    );
    test("simultaneous send clicks produce one exact reply from its original mailbox", async () => {
      const { direct, sending, db, schema, conversations } = active();
      const saved = await save();
      const send = spyOn(direct, "send").mockImplementation(async (input) => {
        const [attempt] = await db
          .select()
          .from(schema.outboundConversationSend);
        expect(attempt?.status).toBe("starting");
        expect(attempt?.input["recipient"]).toBe("jane@samplegoods.com");
        expect(input.email).toBe(settings.fromEmail);
        return {
          success: true,
          data: {
            providerMessageId: "smtp_accepted",
            messageId: input.messageId,
          },
        };
      });
      const results = await Promise.all([
        sending.send("fixture", {
          id: fixture.threadId,
          expectedRevision: saved.revision,
        }),
        sending.send("fixture", {
          id: fixture.threadId,
          expectedRevision: saved.revision,
        }),
      ]);
      expect(results.filter((result) => result.success)).toHaveLength(1);
      expect(send).toHaveBeenCalledTimes(1);
      const detail = value(await conversations.get({ id: fixture.threadId }));
      expect(detail.sendAttempts[0]?.status).toBe("accepted");
      expect(detail.thread.needsReply).toBe(false);
      expect(
        detail.messages.some(
          (message) =>
            message.direction === "outbound" &&
            message.bodyText === "Yes, we can explain that.\n\nIseld",
        ),
      ).toBe(true);
    });
    test("a new inbound message invalidates the old draft and never reaches the provider", async () => {
      const { direct, sending } = active();
      const saved = await save();
      const send = spyOn(direct, "send");
      value(
        await ingest(
          "new_inbound",
          "Actually, another question.",
          new Date(Date.now() + 1000),
        ),
      );
      expect(
        (
          await sending.send("fixture", {
            id: fixture.threadId,
            expectedRevision: saved.revision,
          })
        ).success,
      ).toBe(false);
      expect(send).not.toHaveBeenCalled();
    });
    test("an uncertain provider response is retained and blocks another send even after editing", async () => {
      const { direct, sending, conversations, db, schema } = active();
      const saved = await save();
      const smtp = { command: "DATA", code: "ETIMEDOUT", responseCode: null };
      const send = spyOn(direct, "send").mockResolvedValue({
        success: false,
        error: new IntegrationError(
          "google",
          "uncertain",
          "direct-mailbox-unavailable",
          502,
          null,
          null,
          { smtp },
        ),
      });
      expect(
        value(
          await sending.send("fixture", {
            id: fixture.threadId,
            expectedRevision: saved.revision,
          }),
        ).status,
      ).toBe("uncertain");
      const edited = await save("A slightly different reply.");
      expect(
        (
          await sending.send("fixture", {
            id: fixture.threadId,
            expectedRevision: edited.revision,
          })
        ).success,
      ).toBe(false);
      expect(send).toHaveBeenCalledTimes(1);
      expect(
        value(await conversations.get({ id: fixture.threadId })).sendAttempts[0]
          ?.status,
      ).toBe("uncertain");
      const [audit] = await db
        .select()
        .from(schema.outboundEvent)
        .where(eq(schema.outboundEvent.kind, "deliveryTransportFailure"));
      expect(JSON.parse(audit?.detail ?? "null")).toMatchObject({
        version: 1,
        transport: "smtp",
        source: "conversation",
        ...smtp,
      });
      expect(audit?.detail).not.toContain("private-secret");
    });
    test("one generation request UUID incurs at most one Azure call and respects booking-stage controls", async () => {
      const { ai, conversations } = active();
      const thread = value(
        await conversations.get({ id: fixture.threadId }),
      ).thread;
      const generate = spyOn(ai, "generate").mockResolvedValue({
        body: "We can walk through the product check.\n\nIseld",
      });
      const requestId = crypto.randomUUID();
      const first = value(
        await conversations.generateReply("fixture", {
          id: thread.id,
          expectedRevision: thread.revision,
          requestId,
        }),
      );
      const recovered = value(
        await conversations.generateReply("fixture", {
          id: thread.id,
          expectedRevision: thread.revision,
          requestId,
        }),
      );
      expect(first.body).toBe(recovered.body);
      expect(generate).toHaveBeenCalledTimes(1);
      generate.mockResolvedValue({
        body: `Book now: ${settings.meetingBookingUrl}`,
      });
      expect(
        (
          await conversations.generateReply("fixture", {
            id: thread.id,
            expectedRevision: first.revision,
            requestId: crypto.randomUUID(),
          })
        ).success,
      ).toBe(false);
    });
    test("mailbox ingestion retains the full message even when its old outcome event was already processed", async () => {
      const { db, schema, mailboxes, conversations } = active();
      const [inbox] = await db.select().from(schema.outboundInbox);
      if (!inbox) throw new Error("Missing inbox");
      const mail = {
        id: "imap_fixture",
        threadId: "another_thread",
        internalDate: String(Date.now()),
        text: "A real reply with context. ".repeat(150),
        headers: {
          from: "jane@samplegoods.com",
          to: inbox.email,
          subject: "Actual subject",
          "message-id": "<imap_fixture@samplegoods.com>",
        },
      };
      await db.insert(schema.outboundEvent).values({
        actor: "google-imap",
        kind: "mailProcessed",
        detail: "Already processed",
        externalId: `google-imap:${inbox.id}:${mail.id}`,
      });
      value(await mailboxes.ingest(inbox, mail));
      const list = value(await conversations.list({}));
      expect(list.total).toBe(1);
      expect(list.items[0]?.threadCount).toBe(2);
      const stored = list.items.find(
        (thread) => thread.subject === "Actual subject",
      );
      if (!stored) throw new Error("Missing thread");
      expect(
        value(await conversations.get({ id: stored.id })).messages[0]?.bodyText,
      ).toBe(mail.text);
    });
    test("email and LinkedIn share a prospect timeline while replies remain on the selected thread", async () => {
      const { conversations } = active();
      const linkedin = value(
        await conversations.ingest({
          prospectId: fixture.prospectId,
          channel: "linkedin",
          accountId: "acc_fixture",
          accountLabel: "Xhurian Shaba",
          providerThreadId: "chat_fixture",
          counterpart: "recipient_fixture",
          message: {
            providerMessageId: "linkedin_inbound",
            direction: "inbound",
            from: "recipient_fixture",
            to: "account_user",
            bodyText: "Happy to learn more",
            subject: "",
            sentAt: new Date(),
          },
        }),
      );
      const list = value(await conversations.list({}));
      expect(list.total).toBe(1);
      expect(list.items[0]?.id).toBe(fixture.prospectId);
      expect(list.items[0]?.channels.sort()).toEqual(["email", "linkedin"]);
      const detail = value(
        await conversations.get({
          id: fixture.prospectId,
          threadId: linkedin.id,
        }),
      );
      expect(detail.threads).toHaveLength(2);
      expect(detail.messages).toHaveLength(2);
      expect(detail.thread.id).toBe(linkedin.id);
      expect(detail.messages.map((message) => message.channel).sort()).toEqual([
        "email",
        "linkedin",
      ]);
      expect(
        (
          await conversations.get({
            id: fixture.prospectId,
            threadId: crypto.randomUUID(),
          })
        ).success,
      ).toBe(false);
      expect(value(await conversations.summary()).needsReply).toBe(1);
    });
    test("accepted cold email and replies share the mailbox cap; failed replies do not consume it", async () => {
      const { db, schema, direct, sending } = active();
      await db
        .update(schema.outboundInbox)
        .set({ dailyCap: 1 })
        .where(eq(schema.outboundInbox.id, fixture.inboxId));
      const saved = await save();
      const [attempt] = await db
        .insert(schema.outboundConversationSend)
        .values({
          conversationId: fixture.threadId,
          revision: 100,
          status: "accepted",
          input: { channel: "email", accountId: fixture.inboxId },
          createdBy: "fixture",
        })
        .returning();
      if (!attempt) throw new Error("Missing fixture attempt");
      const send = spyOn(direct, "send").mockImplementation(async (input) => ({
        success: true,
        data: { providerMessageId: "accepted_cap", messageId: input.messageId },
      }));
      const held = await sending.send("fixture", {
        id: fixture.threadId,
        expectedRevision: saved.revision,
      });
      expect(held.success).toBe(false);
      if (!held.success)
        expect(held.error.message).toBe("conversation-inbox-capacity");
      expect(send).not.toHaveBeenCalled();
      await db
        .update(schema.outboundConversationSend)
        .set({ status: "failed" })
        .where(eq(schema.outboundConversationSend.id, attempt.id));
      const [cold] = await db
        .insert(schema.outboundSendAttempt)
        .values({
          prospectId: fixture.prospectId,
          inboxId: fixture.inboxId,
          step: 1,
          revision: 0,
          messageId: "cold_fixture",
          status: "accepted",
          contentHash: "a".repeat(64),
        })
        .returning();
      if (!cold) throw new Error("Missing cold attempt");
      const coldHeld = await sending.send("fixture", {
        id: fixture.threadId,
        expectedRevision: saved.revision,
      });
      expect(coldHeld.success).toBe(false);
      if (!coldHeld.success)
        expect(coldHeld.error.message).toBe("conversation-inbox-capacity");
      await db
        .update(schema.outboundSendAttempt)
        .set({ status: "failed" })
        .where(eq(schema.outboundSendAttempt.id, cold.id));
      expect(
        value(
          await sending.send("fixture", {
            id: fixture.threadId,
            expectedRevision: saved.revision,
          }),
        ).status,
      ).toBe("accepted");
      expect(send).toHaveBeenCalledTimes(1);
    });
    test("unresolved mailbox traffic blocks another thread even when older than the daily window", async () => {
      const { db, schema, direct, sending, conversations } = active();
      const other = value(
        await conversations.ingest({
          prospectId: fixture.prospectId,
          channel: "email",
          accountId: fixture.inboxId,
          accountLabel: settings.fromEmail,
          providerThreadId: "other_thread",
          counterpart: "jane@samplegoods.com",
          message: {
            providerMessageId: "other_inbound",
            direction: "inbound",
            bodyText: "Earlier question",
            subject: "Earlier",
            from: "jane@samplegoods.com",
            to: settings.fromEmail,
            sentAt: new Date(),
          },
        }),
      );
      await db.insert(schema.outboundConversationSend).values({
        conversationId: other.id,
        revision: 100,
        status: "uncertain",
        input: { channel: "email", accountId: fixture.inboxId },
        createdBy: "fixture",
        createdAt: new Date(Date.now() - 3 * 86_400_000),
      });
      const saved = await save();
      const send = spyOn(direct, "send");
      const held = await sending.send("fixture", {
        id: fixture.threadId,
        expectedRevision: saved.revision,
      });
      expect(held.success).toBe(false);
      if (!held.success)
        expect(held.error.message).toBe("conversation-inbox-reconciliation");
      expect(send).not.toHaveBeenCalled();
    });
    test("the actual Sent copy reconciles an uncertain reply by RFC identity and exact body without resending", async () => {
      const { db, schema, direct, sending, conversations } = active();
      const saved = await save();
      const send = spyOn(direct, "send").mockResolvedValue({
        success: false,
        error: new IntegrationError("google", "uncertain", "fixture timeout"),
      });
      value(
        await sending.send("fixture", {
          id: fixture.threadId,
          expectedRevision: saved.revision,
        }),
      );
      const [attempt] = await db.select().from(schema.outboundConversationSend);
      const [inbox] = await db.select().from(schema.outboundInbox);
      if (!attempt || !inbox) throw new Error("Missing fixture rows");
      const mail = {
        id: "sent_imap_1",
        threadId: "imap_threads_differ",
        labelIds: ["SENT"],
        internalDate: String(Date.now()),
        text: String(attempt.input["body"]),
        headers: {
          from: inbox.email,
          to: "jane@samplegoods.com",
          "message-id": String(attempt.input["rfcMessageId"]),
        },
      };
      expect(
        value(
          await sending.reconcile(inbox, { ...mail, text: "Different body" }),
        ).matched,
      ).toBe(false);
      expect(value(await sending.reconcile(inbox, mail)).matched).toBe(true);
      expect(
        value(await sending.reconcile(inbox, { ...mail, id: "sent_imap_2" }))
          .matched,
      ).toBe(true);
      const detail = value(await conversations.get({ id: fixture.threadId }));
      expect(detail.sendAttempts[0]?.status).toBe("accepted");
      expect(
        detail.messages.filter((message) => message.direction === "outbound"),
      ).toHaveLength(1);
      expect(send).toHaveBeenCalledTimes(1);
    });
    test("recovering an older generated reply cannot overwrite a later staff edit", async () => {
      const { ai, conversations } = active();
      const thread = value(
        await conversations.get({ id: fixture.threadId }),
      ).thread;
      const generate = spyOn(ai, "generate").mockResolvedValue({
        body: "A generated answer.",
      });
      const requestId = crypto.randomUUID();
      value(
        await conversations.generateReply("fixture", {
          id: thread.id,
          expectedRevision: thread.revision,
          requestId,
        }),
      );
      await save("An edited answer.");
      expect(
        (
          await conversations.generateReply("fixture", {
            id: thread.id,
            expectedRevision: thread.revision,
            requestId,
          })
        ).success,
      ).toBe(false);
      expect(
        value(await conversations.get({ id: fixture.threadId })).draft.body,
      ).toBe("An edited answer.");
      expect(generate).toHaveBeenCalledTimes(1);
    });
    test("LinkedIn suggestions exclude the email founder story and keep the real account identity", async () => {
      const { ai, conversations } = active();
      const linkedin = value(
        await conversations.ingest({
          prospectId: fixture.prospectId,
          channel: "linkedin",
          accountId: "acc_fixture",
          accountLabel: "Xhurian Shaba",
          providerThreadId: "chat_identity",
          counterpart: "recipient_fixture",
          message: {
            providerMessageId: "li_identity",
            direction: "inbound",
            from: "recipient_fixture",
            to: "account_user",
            bodyText: "What does ecentic do?",
            subject: "",
            sentAt: new Date(),
          },
        }),
      );
      const thread = value(await conversations.get({ id: linkedin.id })).thread;
      const generate = spyOn(ai, "generate").mockImplementation(
        async (input) => {
          const prompt = JSON.parse(String(input.prompt));
          expect(prompt.account).toBe("Xhurian Shaba");
          expect(prompt.founderContext).toBeNull();
          expect(prompt.voiceNotes).toBeNull();
          expect(prompt.emailSignature).toBeNull();
          return input.output.parse({
            body: "ecentic helps explain product information.",
          });
        },
      );
      value(
        await conversations.generateReply("fixture", {
          id: thread.id,
          expectedRevision: thread.revision,
          requestId: crypto.randomUUID(),
        }),
      );
      expect(generate).toHaveBeenCalledTimes(1);
    });
    test("an old uncertain LinkedIn outreach prevents a manual reply from the same account", async () => {
      const { db, schema, conversations, sending } = active();
      const unipile = await import("@/server/utils/outbound/unipile");
      const send = spyOn(unipile, "sendMessage");
      await db.insert(schema.outboundLinkedinAccount).values({
        id: "acc_fixture",
        name: "Xhurian Shaba",
        providerUserId: "account_user",
        status: "running",
        connectedBy: "fixture",
      });
      const linkedin = value(
        await conversations.ingest({
          prospectId: fixture.prospectId,
          channel: "linkedin",
          accountId: "acc_fixture",
          accountLabel: "Xhurian Shaba",
          providerThreadId: "chat_guard",
          counterpart: "recipient_fixture",
          message: {
            providerMessageId: "li_guard",
            direction: "inbound",
            from: "recipient_fixture",
            to: "account_user",
            bodyText: "Tell me more",
            subject: "",
            sentAt: new Date(),
          },
        }),
      );
      const thread = value(await conversations.get({ id: linkedin.id })).thread;
      const saved = value(
        await conversations.saveDraft("fixture", {
          id: thread.id,
          expectedRevision: thread.revision,
          body: "Here is more detail.",
        }),
      );
      await db.insert(schema.outboundIntegrationJob).values({
        provider: "linkedin",
        requestId: "old_uncertain",
        status: "uncertain",
        input: {
          operation: "linkedinOutreach",
          accountId: "acc_fixture",
          action: "invite",
        },
        createdAt: new Date(Date.now() - 9 * 86_400_000),
      });
      const held = await sending.send("fixture", {
        id: thread.id,
        expectedRevision: saved.revision,
      });
      expect(held.success).toBe(false);
      if (!held.success)
        expect(held.error.message).toBe("linkedin-account-reconciliation");
      expect(send).not.toHaveBeenCalled();
    });
  },
);
