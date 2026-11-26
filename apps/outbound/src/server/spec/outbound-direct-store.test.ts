import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import { IntegrationError } from "@/server/utils/outbound/http";
import type { Mail } from "@/server/utils/outbound/inbound";
import { requireTestDatabase } from "./helpers/database";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const environment = new Map(
  ["DATABASE_URL", "CREDENTIAL_ENCRYPTION_KEY"].map((key) => [
    key,
    process.env[key],
  ]),
);
const modules: {
  database?: typeof import("@/server/database");
  store?: typeof import("@/server/app/outbound/store");
  mailboxes?: typeof import("@/server/app/outbound/transport-store");
  direct?: typeof import("@/server/utils/outbound/direct-mailbox");
  worker?: typeof import("@/server/app/outbound/worker");
} = {};
const actor = "direct-mailbox-fixture";
const email = "xhuri@joinecentic.com";
const inactiveEmail = "iseld@joinecentic.com";
const password = "abcdefghijklmnop";
const required = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.mailboxes ||
    !modules.direct ||
    !modules.worker
  )
    throw new Error("Fixture not initialized");
  return {
    ...modules.database,
    store: modules.store,
    mailboxes: modules.mailboxes,
    direct: modules.direct,
    worker: modules.worker,
  };
};
const message = (overrides: Partial<Mail> = {}): Mail => ({
  id: "imap:INBOX:1:1",
  threadId: "<inbound@example.com>",
  internalDate: String(Date.now()),
  labelIds: ["INBOX"],
  headers: {
    from: "person@fixture-shop.com",
    to: email,
    "message-id": "<inbound@example.com>",
  },
  text: "Please stop contacting us.",
  ...overrides,
});

describe.skipIf(!endpoint)("isolated direct mailbox persistence", () => {
  beforeAll(async () => {
    if (!endpoint) throw new Error("Disposable database required");
    requireTestDatabase(endpoint);
    Object.assign(process.env, {
      DATABASE_URL: endpoint,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
    });
    mock.module("server-only", () => ({}));
    modules.database = await import("@/server/database");
    modules.direct = await import("@/server/utils/outbound/direct-mailbox");
    modules.store = await import("@/server/app/outbound/store");
    modules.mailboxes = await import("@/server/app/outbound/transport-store");
    modules.worker = await import("@/server/app/outbound/worker");
  });
  beforeEach(async () => {
    const { db, store, direct } = active();
    await db.execute(
      sql`truncate outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook cascade`,
    );
    required(await store.savePlaybook(actor, defaultPlaybook));
    spyOn(direct, "verify").mockResolvedValue({
      success: true,
      data: { email },
    });
  });
  afterEach(() => mock.restore());
  afterAll(() => {
    for (const [key, value] of environment) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else Object.assign(process.env, { [key]: value });
    }
  });
  const connect = async () => {
    const { mailboxes } = active();
    const connected = required(
      await mailboxes.connectDirect(actor, { email, appPassword: password }),
    );
    const inbox = required(await mailboxes.read(connected.inboxId));
    if (!inbox) throw new Error("Mailbox missing");
    return inbox;
  };
  const prospect = async () => {
    const { store } = active();
    return required(
      await store.saveProspect(
        actor,
        prospectSchema.parse({
          domain: "fixture-shop.com",
          company: "Fixture Shop",
          name: "Jane Owner",
          country: "US",
          email: "person@fixture-shop.com",
        }),
      ),
    );
  };
  const attempt = async (
    inbox: Awaited<ReturnType<typeof connect>>,
    status: "claimed" | "uncertain" = "claimed",
  ) => {
    const { db, schema, store } = active();
    const target = await prospect();
    const saved = required(await store.readProspect(target.prospect));
    if (!saved) throw new Error("Prospect missing");
    const policy = await store.policy();
    const messages = [
      {
        step: 1 as const,
        afterDays: 0,
        subject: "Fixture email",
        body: "Fixture message",
      },
    ];
    const manifest = store.approvalManifest(
      saved,
      policy.settings,
      policy.revision,
    );
    const hash = store.contentHash(messages, manifest);
    await db.insert(schema.outboundRevision).values({
      prospectId: target.prospect,
      revision: saved.revision,
      messages,
      manifest,
      contentHash: hash,
    });
    const [row] = await db
      .insert(schema.outboundSendAttempt)
      .values({
        prospectId: target.prospect,
        inboxId: inbox.id,
        step: 1,
        revision: saved.revision,
        messageId: "<sent-fixture@joinecentic.com>",
        contentHash: hash,
        status,
      })
      .returning();
    if (!row) throw new Error("Attempt missing");
    return row;
  };

  test("direct connection stores encrypted password and leaves delivery off", async () => {
    const { db, mailboxes, store } = active();
    const inbox = await connect();
    expect(inbox).toMatchObject({
      transport: "google-app-password",
      enabled: false,
      connectionVersion: 1,
      refreshToken: null,
      accessToken: null,
      lastSyncedAt: null,
      syncMode: "full",
      appPassword: password,
    });
    const raw = await db.execute(
      sql`select app_password from outbound_inbox where id = ${inbox.id}`,
    );
    expect(String(raw[0]?.["app_password"])).toStartWith("ecentic.enc.v1:");
    expect(
      JSON.stringify(required(await store.getWorkspace()).inboxes),
    ).not.toContain(password);
    expect(
      required(
        await mailboxes.configure(actor, {
          inboxId: inbox.id,
          enabled: true,
          dailyCap: 5,
        }),
      ),
    ).toMatchObject({ enabled: false, pending: true });
  });

  test("unregistered mailbox and invalid credentials have separate errors before verification", async () => {
    const { mailboxes, direct } = active();
    const unregistered = await mailboxes.connectDirect(actor, {
      email: "outsider@joinecentic.com",
      appPassword: password,
    });
    expect(unregistered.success).toBe(false);
    if (unregistered.success) throw new Error("Unregistered mailbox accepted");
    expect(unregistered.error.message).toBe("direct-mailbox-not-registered");
    const invalid = await mailboxes.connectDirect(actor, {
      email,
      appPassword: "normal-password",
    });
    expect(invalid.success).toBe(false);
    if (invalid.success) throw new Error("Invalid password accepted");
    expect(invalid.error.message).toBe("direct-mailbox-invalid");
    expect(direct.verify).not.toHaveBeenCalled();
  });

  test("additional domains connect only exact Playbook inboxes and remain disabled", async () => {
    const { store, mailboxes, direct } = active();
    const additionalEmail = "juri@additional-brand.com";
    required(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        senderEmails: additionalEmail,
      }),
    );
    spyOn(direct, "verify").mockResolvedValue({
      success: true,
      data: { email: additionalEmail },
    });
    const connected = required(
      await mailboxes.connectDirect(actor, {
        email: additionalEmail,
        appPassword: password,
      }),
    );
    expect(required(await mailboxes.read(connected.inboxId))).toMatchObject({
      email: additionalEmail,
      enabled: false,
      syncMode: "full",
    });
    const unregistered = await mailboxes.connectDirect(actor, {
      email: "other@additional-brand.com",
      appPassword: password,
    });
    expect(unregistered.success).toBe(false);
    if (!unregistered.success)
      expect(unregistered.error.message).toBe("direct-mailbox-not-registered");
  });

  test("registered inactive mailbox connects and syncs without receiving the active sender identity or delivery permission", async () => {
    const { store, mailboxes, direct, worker } = active();
    required(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        inactiveSenderEmails: inactiveEmail,
      }),
    );
    const connected = required(
      await mailboxes.connectDirect(actor, {
        email: ` ${inactiveEmail.toUpperCase()} `,
        appPassword: "abcd efgh ijkl mnop",
      }),
    );
    expect(direct.verify).toHaveBeenCalledWith({
      email: inactiveEmail,
      appPassword: password,
    });
    expect(required(await mailboxes.read(connected.inboxId))).toMatchObject({
      email: inactiveEmail,
      fromName: inactiveEmail,
      signer: "",
      enabled: false,
    });
    spyOn(direct, "syncPage").mockResolvedValueOnce({
      success: true,
      data: {
        messages: [],
        complete: true,
        checkpoint: {
          version: 1,
          email: inactiveEmail,
          since: new Date(0).toISOString(),
          folders: [],
        },
      },
    });
    expect(required(await worker.syncInbox(connected.inboxId))).toEqual({
      complete: true,
      processed: 0,
    });
    expect(
      required(await mailboxes.read(connected.inboxId))?.lastSyncedAt,
    ).toBeInstanceOf(Date);
    const enabled = await mailboxes.configure(actor, {
      inboxId: connected.inboxId,
      enabled: true,
      dailyCap: 5,
    });
    expect(enabled.success).toBe(false);
    if (enabled.success) throw new Error("Inactive delivery enabled");
    expect(enabled.error.message).toContain("sender name");
    required(
      await mailboxes.configure(actor, {
        inboxId: connected.inboxId,
        enabled: false,
        dailyCap: 5,
      }),
    );
    expect(required(await mailboxes.read(connected.inboxId))?.enabled).toBe(
      false,
    );
  });

  test("inactive OAuth connection and reconnect preserve an existing mailbox identity", async () => {
    const { store, mailboxes } = active();
    required(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        inactiveSenderEmails: inactiveEmail,
      }),
    );
    const connected = required(
      await mailboxes.connect(
        actor,
        {
          accessToken: "synthetic-access",
          refreshToken: "synthetic-refresh",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          scope:
            "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
        },
        {
          emailAddress: inactiveEmail.toUpperCase(),
          historyId: "history-fixture",
        },
      ),
    );
    expect(required(await mailboxes.read(connected.inboxId))).toMatchObject({
      transport: "gmail-oauth",
      fromName: inactiveEmail,
      signer: "",
      enabled: false,
    });
    required(
      await mailboxes.update(connected.inboxId, {
        fromName: "Iseld ecentic",
        signer: "Iseld",
      }),
    );
    required(
      await mailboxes.connectDirect(actor, {
        email: inactiveEmail,
        appPassword: password,
      }),
    );
    expect(required(await mailboxes.read(connected.inboxId))).toMatchObject({
      transport: "google-app-password",
      fromName: "Iseld ecentic",
      signer: "Iseld",
      connectionVersion: 2,
      enabled: false,
    });
  });

  test("removing Playbook membership during verification prevents credential persistence", async () => {
    const { store, mailboxes, direct } = active();
    required(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        inactiveSenderEmails: inactiveEmail,
      }),
    );
    spyOn(direct, "verify").mockImplementationOnce(async () => {
      required(await store.savePlaybook(actor, defaultPlaybook));
      return { success: true, data: { email: inactiveEmail } };
    });
    const connected = await mailboxes.connectDirect(actor, {
      email: inactiveEmail,
      appPassword: password,
    });
    expect(connected.success).toBe(false);
    if (connected.success) throw new Error("Removed mailbox persisted");
    expect(connected.error.message).toBe("direct-mailbox-not-registered");
    expect(required(await mailboxes.list())).toHaveLength(0);
  });

  test("failed verification preserves the saved connection and exposes no secret", async () => {
    const { mailboxes, direct } = active();
    const inbox = await connect();
    spyOn(direct, "verify").mockResolvedValue({
      success: false,
      error: new IntegrationError(
        "google",
        "access",
        `synthetic private failure ${password}`,
      ),
    });
    const saved = await mailboxes.connectDirect(actor, {
      email,
      appPassword: "ponmlkjihgfedcba",
    });
    expect(saved.success).toBe(false);
    expect(JSON.stringify(saved)).not.toContain(password);
    expect(required(await mailboxes.read(inbox.id))?.connectionVersion).toBe(1);
  });

  test("reconnect and disconnect reject stale sync checkpoints", async () => {
    const { mailboxes } = active();
    const old = await connect();
    required(
      await mailboxes.connectDirect(actor, {
        email,
        appPassword: "ponmlkjihgfedcba",
      }),
    );
    expect(
      (
        await mailboxes.updateSync(old, {
          lastSyncedAt: new Date(),
          mailboxCheckpoint: { stale: true },
          error: null,
        })
      ).success,
    ).toBe(false);
    const current = required(await mailboxes.read(old.id));
    expect(current?.connectionVersion).toBe(2);
    expect(current?.mailboxCheckpoint).toBeNull();
    required(await mailboxes.disconnect(actor, old.id));
    expect(required(await mailboxes.read(old.id))).toMatchObject({
      appPassword: null,
      connectionVersion: 3,
      enabled: false,
    });
    if (!current) throw new Error("Current connection missing");
    expect(
      (
        await mailboxes.updateSync(current, {
          lastSyncedAt: new Date(),
          error: null,
        })
      ).success,
    ).toBe(false);
  });

  test("transport switch clears app password and invalidates its checkpoint", async () => {
    const { mailboxes } = active();
    const old = await connect();
    required(
      await mailboxes.connect(
        actor,
        {
          accessToken: "synthetic-access",
          refreshToken: "synthetic-refresh",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          scope:
            "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
        },
        { emailAddress: email, historyId: "history-fixture" },
      ),
    );
    expect(required(await mailboxes.read(old.id))).toMatchObject({
      transport: "gmail-oauth",
      appPassword: null,
      refreshToken: "synthetic-refresh",
      connectionVersion: 2,
      enabled: false,
      mailboxCheckpoint: null,
    });
    expect(
      (await mailboxes.updateSync(old, { lastSyncedAt: new Date() })).success,
    ).toBe(false);
  });

  test("worker persists partial history before declaring the mailbox fresh", async () => {
    const { mailboxes, direct, worker, db, schema } = active();
    const inbox = await connect();
    const checkpoint = {
      version: 1 as const,
      email,
      since: new Date(0).toISOString(),
      folders: [],
    };
    const sync = spyOn(direct, "syncPage")
      .mockResolvedValueOnce({
        success: true,
        data: { messages: [message()], checkpoint, complete: false },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { messages: [message()], checkpoint, complete: true },
      });
    expect(required(await worker.syncInbox(inbox.id))).toEqual({
      complete: false,
      processed: 1,
    });
    expect(required(await mailboxes.read(inbox.id))).toMatchObject({
      mailboxCheckpoint: checkpoint,
      lastSyncedAt: null,
      syncMode: "full",
      enabled: false,
    });
    expect(required(await worker.syncInbox(inbox.id))).toEqual({
      complete: true,
      processed: 1,
    });
    expect(sync.mock.calls[1]?.[0].checkpoint).toEqual(checkpoint);
    expect(required(await mailboxes.read(inbox.id))).toMatchObject({
      syncMode: null,
      error: null,
      enabled: false,
    });
    expect(
      required(await mailboxes.read(inbox.id))?.lastSyncedAt,
    ).toBeInstanceOf(Date);
    expect(await db.select().from(schema.outboundSuppression)).toHaveLength(1);
  });

  test("worker discards a history page fetched through a replaced connection", async () => {
    const { mailboxes, direct, worker, db, schema } = active();
    const inbox = await connect();
    spyOn(direct, "syncPage").mockImplementationOnce(async () => {
      required(
        await mailboxes.connectDirect(actor, {
          email,
          appPassword: "ponmlkjihgfedcba",
        }),
      );
      return {
        success: true,
        data: {
          messages: [message()],
          complete: true,
          checkpoint: {
            version: 1,
            email,
            since: new Date(0).toISOString(),
            folders: [],
          },
        },
      };
    });
    expect((await worker.syncInbox(inbox.id)).success).toBe(false);
    expect(required(await mailboxes.read(inbox.id))).toMatchObject({
      connectionVersion: 2,
      mailboxCheckpoint: null,
      lastSyncedAt: null,
      enabled: false,
    });
    expect(await db.select().from(schema.outboundSuppression)).toHaveLength(0);
  });

  test("credential generation change prevents transport dispatch", async () => {
    const { mailboxes, store } = active();
    const inbox = await connect();
    const reserved = await attempt(inbox);
    required(
      await mailboxes.connectDirect(actor, { email, appPassword: password }),
    );
    const send = mock(async () => ({
      success: true as const,
      data: { providerMessageId: "receipt", threadId: "conversation" },
    }));
    expect(
      (
        await store.dispatchDelivery(
          actor,
          { attempt: reserved.id, connectionVersion: inbox.connectionVersion },
          send,
        )
      ).success,
    ).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  test("unknown own Sent recipients gain durable history exclusions", async () => {
    const { mailboxes, db, schema } = active();
    const inbox = await connect();
    const sent = message({
      id: "imap:sent:1:4",
      labelIds: ["SENT"],
      headers: {
        from: email,
        to: "new@previous-company.com",
        "message-id": "<legacy@joinecentic.com>",
      },
      text: "An earlier email",
    });
    required(await mailboxes.ingest(inbox, sent));
    const suppressions = await db.select().from(schema.outboundSuppression);
    expect(
      suppressions.map((entry) => `${entry.scope}:${entry.value}`).sort(),
    ).toEqual([
      "domain:previous-company.com",
      "email:new@previous-company.com",
    ]);
    expect(required(await mailboxes.ingest(inbox, sent)).handled).toBe(false);
    expect(await db.select().from(schema.outboundSuppression)).toHaveLength(2);
  });

  test("unknown opt-outs remain excluded when the person is imported later", async () => {
    const { mailboxes, store, db, schema } = active();
    const inbox = await connect();
    required(await mailboxes.ingest(inbox, message()));
    const exclusions = await db.select().from(schema.outboundSuppression);
    expect(exclusions).toHaveLength(1);
    expect(exclusions[0]).toMatchObject({
      scope: "email",
      value: "person@fixture-shop.com",
    });
    const created = await prospect();
    const workspace = required(await store.getWorkspace());
    expect(
      workspace.prospects
        .find((entry) => entry.id === created.prospect)
        ?.issues.some((issue) => issue.code === "suppressed"),
    ).toBe(true);
    expect(required(await mailboxes.ingest(inbox, message())).handled).toBe(
      false,
    );
  });

  test("only provider Sent evidence reconciles an uncertain own RFC message", async () => {
    const { mailboxes, db, schema } = active();
    const inbox = await connect();
    const reserved = await attempt(inbox, "uncertain");
    required(
      await mailboxes.ingest(
        inbox,
        message({
          headers: {
            from: email,
            to: "person@fixture-shop.com",
            "message-id": reserved.messageId,
          },
        }),
      ),
    );
    expect(
      (
        await db
          .select()
          .from(schema.outboundSendAttempt)
          .where(eq(schema.outboundSendAttempt.id, reserved.id))
      )[0]?.status,
    ).toBe("uncertain");
    required(
      await mailboxes.ingest(
        inbox,
        message({
          labelIds: ["SENT"],
          headers: {
            from: email,
            to: "person@fixture-shop.com",
            "message-id": reserved.messageId,
          },
        }),
      ),
    );
    expect(
      (
        await db
          .select()
          .from(schema.outboundSendAttempt)
          .where(eq(schema.outboundSendAttempt.id, reserved.id))
      )[0]?.status,
    ).toBe("accepted");
  });

  test("reply matching reaches an old prospect beyond the former 5000-row cap", async () => {
    const { mailboxes, store, db, schema } = active();
    const inbox = await connect();
    const target = await prospect();
    await db
      .update(schema.outboundProspect)
      .set({ createdAt: new Date(0) })
      .where(eq(schema.outboundProspect.id, target.prospect));
    await db.execute(sql`with companies as (
      insert into outbound_company (id,domain,name,website,country,source)
      select 'bulk-company-' || n, 'unrelated-' || n || '.example', 'Unrelated', '', 'US', 'fixture' from generate_series(1,5001) n returning id,domain
    ), people as (
      insert into outbound_person (id,company_id,identity_key,name)
      select 'bulk-person-' || id,id,id,'Unrelated' from companies returning id,company_id
    ) insert into outbound_prospect (company_id,person_id,details,created_by)
    select companies.id,people.id,jsonb_build_object('email','nobody@' || companies.domain,'domain',companies.domain),'fixture'
    from companies join people on people.company_id=companies.id`);
    required(await mailboxes.ingest(inbox, message()));
    expect(required(await store.readProspect(target.prospect))?.status).toBe(
      "optedOut",
    );
    expect(
      await db
        .select()
        .from(schema.outboundSuppression)
        .where(
          and(
            eq(schema.outboundSuppression.scope, "email"),
            eq(schema.outboundSuppression.value, "person@fixture-shop.com"),
          ),
        ),
    ).toHaveLength(1);
  }, 20000);
});
