import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  spyOn,
  test,
} from "bun:test";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import { requireTestDatabase } from "./helpers/database";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const now = new Date("2026-11-09T17:00:00Z");
const actor = "inbox-activation-fixture";
const profile = {
  fromName: "Mario",
  signature: "Mario",
  founderLine: "I'm Mario from ecentic.",
  productCheckIntro:
    "I'm Mario from ecentic. We help stores with product details.",
  voiceNotes: "Write clearly.",
};
const email = "mario@joinecentic.com";
const checkpoint = {
  version: 1 as const,
  email,
  since: now.toISOString(),
  folders: (["\\All", "\\Junk", "\\Trash"] as const).map((specialUse) => ({
    path: specialUse,
    specialUse,
    uidValidity: "1",
    cursor: 0,
    ceiling: 0,
  })),
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
) => {
  if (!result.success) throw result.error;
  return result.data;
};
const modules: {
  database?: typeof import("@/server/database");
  store?: typeof import("@/server/app/outbound/store");
  mailboxes?: typeof import("@/server/app/outbound/transport-store");
  worker?: typeof import("@/server/app/outbound/worker");
  direct?: typeof import("@/server/utils/outbound/direct-mailbox");
} = {};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.mailboxes ||
    !modules.worker ||
    !modules.direct
  )
    throw new Error("Missing test modules");
  return {
    ...modules.database,
    store: modules.store,
    mailboxes: modules.mailboxes,
    worker: modules.worker,
    direct: modules.direct,
  };
};
const fixture = { inboxId: "" };

describe("durable inbox activation", () => {
  beforeAll(async () => {
    requireTestDatabase(endpoint);
    Object.assign(process.env, {
      DATABASE_URL: endpoint,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
    });
    mock.module("server-only", () => ({}));
    modules.database = await import("@/server/database");
    modules.store = await import("@/server/app/outbound/store");
    modules.mailboxes = await import("@/server/app/outbound/transport-store");
    modules.worker = await import("@/server/app/outbound/worker");
    modules.direct = await import("@/server/utils/outbound/direct-mailbox");
  });
  beforeEach(async () => {
    setSystemTime(now);
    const { db, schema, store } = active();
    await db.execute(
      sql`truncate outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook cascade`,
    );
    value(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        fromEmail: "iseld@joinecentic.com",
        senderEmails: "iseld@joinecentic.com",
        inactiveSenderEmails: email,
        fromName: "Iseld",
        signature: "Iseld",
        founderLine: "I'm Iseld, formerly with Shopify Plus.",
        productCheckIntro: "I'm Iseld, formerly with Shopify Plus.",
        senderConfirmed: true,
        historyConfirmed: true,
        competingSendersPaused: true,
        senderTested: true,
      }),
    );
    await db.insert(schema.outboundInbox).values({
      email: "iseld@joinecentic.com",
      fromName: "Iseld",
      signer: "Iseld",
      enabled: true,
      refreshToken: "fixture-primary",
      lastSyncedAt: now,
    });
    const row = (
      await db
        .insert(schema.outboundInbox)
        .values({
          email,
          fromName: email,
          signer: "",
          enabled: false,
          dailyCap: 9,
          transport: "google-app-password",
          appPassword: "abcdefghijklmnop",
          connectionVersion: 1,
          syncMode: "full",
          error: "History reconciliation is in progress.",
        })
        .returning()
    )[0];
    if (!row) throw new Error("Missing secondary inbox");
    fixture.inboxId = row.id;
  });
  afterEach(() => mock.restore());
  afterAll(() => setSystemTime());
  const request = async () =>
    value(
      await active().mailboxes.configure(actor, {
        inboxId: fixture.inboxId,
        enabled: true,
        dailyCap: 9,
        profile,
      }),
    );
  const finish = async () => {
    const { db, schema } = active();
    await db
      .update(schema.outboundInbox)
      .set({ syncMode: null, lastSyncedAt: now, error: null })
      .where(eq(schema.outboundInbox.id, fixture.inboxId));
  };

  test("the additive activation migration is safe to apply twice", async () => {
    const { db } = active();
    const migration = await Bun.file(
      new URL(
        "../../../../web/drizzle/20261126164000_outbound_inbox_activation/migration.sql",
        import.meta.url,
      ),
    ).text();
    for (const _ of [1, 2])
      for (const statement of migration
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean))
        await db.execute(sql.raw(statement));
    const columns = await db.execute(
      sql`select column_name, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'outbound_inbox' and column_name in ('activation_requested_at', 'activation_connection_version')`,
    );
    expect(columns).toHaveLength(2);
    expect(columns.every((column) => column["is_nullable"] === "YES")).toBe(
      true,
    );
  });

  test.each([false, true])(
    "history completion preserves Iseld's approval and global sending=%s",
    async (sendingEnabled) => {
      const { store, mailboxes, worker, direct } = active();
      const saved = value(
        await store.saveProspect(
          actor,
          prospectSchema.parse({
            company: "Sample Goods",
            domain: "samplegoods.com",
            country: "US",
            name: "Jane Smith",
            first: "Jane",
            title: "Head of Growth",
            email: "jane@samplegoods.com",
            emailStatus: "verified",
            emailVerifiedAt: now.toISOString(),
            emailSource: "fixture-verifier",
            roleSource: "https://samplegoods.com/team",
            roleCheckedAt: now.toISOString(),
            timezone: "America/New_York",
            mxProvider: "google",
            mxCheckedAt: now.toISOString(),
            product: "Linen tote",
            productUrl: "https://samplegoods.com/products/tote",
            finding: "The page lists one size without its dimensions.",
            evidence: "Saved product text.",
            evidenceCheckedAt: now.toISOString(),
            legitEvidence: "Physical product brand.",
          }),
        ),
      );
      const draft = value(await store.generateDrafts(actor, saved));
      value(
        await store.reviewProspect(actor, {
          ...saved,
          revision: draft.revision,
          decision: "approve",
        }),
      );
      value(
        await store.savePlaybook(actor, {
          ...(await store.policy()).settings,
          sendingEnabled,
        }),
      );
      const approved = value(await store.readProspect(saved.prospect));
      const revision = (await store.policy()).revision;
      expect(await request()).toMatchObject({ enabled: false, pending: true });
      expect((await store.policy()).settings.senderEmails).not.toContain(email);
      const queued = value(await mailboxes.read(fixture.inboxId));
      expect(queued?.activationConnectionVersion).toBe(1);
      expect(queued?.activationRequestedAt).toEqual(now);
      const sync = spyOn(direct, "syncPage")
        .mockResolvedValueOnce({
          success: true,
          data: { complete: false, messages: [], checkpoint },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { complete: true, messages: [], checkpoint },
        });
      expect(value(await worker.syncInbox(fixture.inboxId)).complete).toBe(
        false,
      );
      expect(value(await mailboxes.read(fixture.inboxId))?.enabled).toBe(false);
      expect(value(await worker.syncInbox(fixture.inboxId)).complete).toBe(
        true,
      );
      expect(sync).toHaveBeenCalledTimes(2);
      expect(value(await mailboxes.read(fixture.inboxId))).toMatchObject({
        enabled: true,
        activationRequestedAt: null,
        activationConnectionVersion: null,
        fromName: "Mario",
        signer: "Mario",
        dailyCap: 9,
      });
      expect((await store.policy()).settings.senderEmails).toContain(email);
      expect((await store.policy()).settings.sendingEnabled).toBe(
        sendingEnabled,
      );
      expect((await store.policy()).revision).toBe(revision);
      expect(value(await store.readProspect(saved.prospect))).toMatchObject({
        approvalHash: approved?.approvalHash,
        status: "approved",
        messages: approved?.messages,
      });
    },
  );
  test("errors and incomplete history cannot consume a pending activation", async () => {
    const { mailboxes, db, schema } = active();
    await request();
    expect(
      value(await mailboxes.completePendingActivation(fixture.inboxId)),
    ).toEqual({ activated: false });
    await finish();
    await db
      .update(schema.outboundInbox)
      .set({ error: "Connection needs attention." })
      .where(eq(schema.outboundInbox.id, fixture.inboxId));
    expect(
      value(await mailboxes.completePendingActivation(fixture.inboxId)),
    ).toEqual({ activated: false });
    expect(value(await mailboxes.read(fixture.inboxId))).toMatchObject({
      enabled: false,
      activationConnectionVersion: 1,
    });
  });
  test("cancel fences an already-read intent and later completed sync cannot reactivate it", async () => {
    const { mailboxes, worker, direct } = active();
    await request();
    value(
      await mailboxes.configure(actor, {
        inboxId: fixture.inboxId,
        enabled: false,
        dailyCap: 9,
      }),
    );
    await finish();
    expect(
      (
        await mailboxes.configure(
          actor,
          { inboxId: fixture.inboxId, enabled: true, dailyCap: 9 },
          { connectionVersion: 1, requestedAt: now.toISOString() },
        )
      ).success,
    ).toBe(false);
    spyOn(direct, "syncPage").mockResolvedValue({
      success: true,
      data: { complete: true, messages: [], checkpoint },
    });
    value(await worker.syncInbox(fixture.inboxId));
    expect(value(await mailboxes.read(fixture.inboxId))).toMatchObject({
      enabled: false,
      activationRequestedAt: null,
      activationConnectionVersion: null,
    });
  });
  test.each(["disconnect", "reconnect"] as const)(
    "%s cancels the pending connection's activation",
    async (operation) => {
      const { mailboxes, direct } = active();
      await request();
      if (operation === "disconnect")
        value(await mailboxes.disconnect(actor, fixture.inboxId));
      else {
        spyOn(direct, "verify").mockResolvedValue({
          success: true,
          data: { email },
        });
        value(
          await mailboxes.connectDirect(actor, {
            email,
            appPassword: "abcdefghijklmnop",
          }),
        );
      }
      expect(value(await mailboxes.read(fixture.inboxId))).toMatchObject({
        enabled: false,
        connectionVersion: 2,
        activationRequestedAt: null,
        activationConnectionVersion: null,
        dailyCap: 9,
      });
      expect(
        value(await mailboxes.completePendingActivation(fixture.inboxId)),
      ).toEqual({ activated: false });
    },
  );
  test("a mismatched connection version or removed current profile cannot activate", async () => {
    const { mailboxes, store, db, schema } = active();
    await request();
    await finish();
    await db
      .update(schema.outboundInbox)
      .set({ connectionVersion: 2 })
      .where(eq(schema.outboundInbox.id, fixture.inboxId));
    expect(
      value(await mailboxes.completePendingActivation(fixture.inboxId)),
    ).toEqual({ activated: false });
    await db
      .update(schema.outboundInbox)
      .set({ connectionVersion: 1 })
      .where(eq(schema.outboundInbox.id, fixture.inboxId));
    value(
      await store.savePlaybook(actor, {
        ...(await store.policy()).settings,
        senderProfiles: [],
      }),
    );
    expect(
      (await mailboxes.completePendingActivation(fixture.inboxId)).success,
    ).toBe(false);
    expect(value(await mailboxes.read(fixture.inboxId))?.enabled).toBe(false);
  });
  test("consuming an activation preserves a cap edited after its snapshot was read", async () => {
    const { mailboxes, db, schema } = active();
    await request();
    await finish();
    await db
      .update(schema.outboundInbox)
      .set({ dailyCap: 3 })
      .where(eq(schema.outboundInbox.id, fixture.inboxId));
    value(
      await mailboxes.configure(
        actor,
        { inboxId: fixture.inboxId, enabled: true, dailyCap: 9 },
        { connectionVersion: 1, requestedAt: now.toISOString() },
      ),
    );
    expect(value(await mailboxes.read(fixture.inboxId))).toMatchObject({
      enabled: true,
      dailyCap: 3,
    });
  });
});
