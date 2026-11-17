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
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook } from "@/lib/outbound";
import { type DomainReadiness, defaultWarmupPlan } from "@/lib/outbound-warmup";

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
  warmup?: typeof import("@/server/app/outbound/warmup");
  direct?: typeof import("@/server/utils/outbound/direct-mailbox");
  readiness?: typeof import("@/server/utils/outbound/sender-readiness");
} = {};
const email = "juri@additional-brand.com";
const actor = "warmup-fixture";
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
    !modules.warmup ||
    !modules.direct ||
    !modules.readiness
  )
    throw new Error("Fixture not loaded");
  return {
    ...modules.database,
    store: modules.store,
    warmup: modules.warmup,
    direct: modules.direct,
    readiness: modules.readiness,
  };
};
const dns: DomainReadiness = {
  domain: "additional-brand.com",
  checkedAt: new Date().toISOString(),
  scope: "dns-records",
  inboxPlacement: "unknown",
  mx: { state: "present", records: ["1 smtp.google.com"] },
  spf: { state: "present", records: ["v=spf1 include:_spf.google.com ~all"] },
  dkim: { state: "unknown", records: [], selectors: [] },
  dmarc: {
    state: "present",
    records: ["v=DMARC1; p=none"],
    recordDomain: "additional-brand.com",
    inherited: false,
    policy: "none",
  },
};

describe.skipIf(!endpoint)("isolated mailbox readiness persistence", () => {
  beforeAll(async () => {
    if (!endpoint) throw new Error("Disposable database required");
    const location = new URL(endpoint);
    if (
      !["localhost", "127.0.0.1"].includes(location.hostname) ||
      location.pathname !== "/outbound_test"
    )
      throw new Error("Only the local outbound_test database is permitted");
    Object.assign(process.env, {
      DATABASE_URL: endpoint,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
    });
    mock.module("server-only", () => ({}));
    modules.database = await import("@/server/database");
    modules.store = await import("@/server/app/outbound/store");
    modules.warmup = await import("@/server/app/outbound/warmup");
    modules.direct = await import("@/server/utils/outbound/direct-mailbox");
    modules.readiness = await import(
      "@/server/utils/outbound/sender-readiness"
    );
  });
  beforeEach(async () => {
    const { db, store, readiness, direct } = active();
    await db.execute(
      sql`truncate outbound_mailbox_readiness, outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook cascade`,
    );
    value(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        senderEmails: email,
      }),
    );
    spyOn(readiness, "checkSendingDomain").mockResolvedValue({
      success: true,
      data: dns,
    });
    spyOn(direct, "verify").mockResolvedValue({
      success: true,
      data: { email },
    });
  });
  afterEach(() => mock.restore());
  afterAll(() => {
    for (const [key, content] of environment) {
      if (content === undefined) Reflect.deleteProperty(process.env, key);
      else Object.assign(process.env, { [key]: content });
    }
  });
  const createInbox = async () => {
    const { db, schema } = active();
    const [inbox] = await db
      .insert(schema.outboundInbox)
      .values({
        email,
        fromName: "Juri ecentic",
        signer: "Juri",
        transport: "google-app-password",
        appPassword: "abcdefghijklmnop",
        enabled: false,
        dailyCap: 5,
        connectionVersion: 1,
      })
      .returning();
    if (!inbox) throw new Error("Inbox not created");
    return inbox;
  };

  test("saved plans are capped and never enable a mailbox or network", async () => {
    const { warmup, db, schema } = active();
    await createInbox();
    expect(
      (
        await warmup.savePlan(actor, {
          email,
          plan: { ...defaultWarmupPlan, maximumDailyCap: 5 },
        })
      ).success,
    ).toBe(true);
    expect(
      (
        await warmup.savePlan(actor, {
          email,
          plan: { ...defaultWarmupPlan, enabled: true, maximumDailyCap: 5 },
        })
      ).success,
    ).toBe(false);
    expect(
      (await warmup.savePlan(actor, { email, plan: defaultWarmupPlan }))
        .success,
    ).toBe(false);
    const [inbox] = await db.select().from(schema.outboundInbox);
    expect(inbox?.enabled).toBe(false);
    const workspace = value(await warmup.getWorkspace());
    expect(workspace.mailboxes[0]?.preview).toMatchObject({
      status: "off",
      remaining: 0,
      healthyDays: 0,
    });
    expect(JSON.stringify(workspace)).not.toContain("abcdefghijklmnop");
  });
  test("unregistered addresses cannot trigger DNS or connection checks", async () => {
    const { warmup, readiness, direct } = active();
    expect(
      (
        await warmup.checkMailbox(actor, {
          email: "other@additional-brand.com",
          dkimSelectors: [],
        })
      ).success,
    ).toBe(false);
    expect(readiness.checkSendingDomain).not.toHaveBeenCalled();
    expect(direct.verify).not.toHaveBeenCalled();
  });
  test("DNS checks can persist for a registered mailbox that is not connected", async () => {
    const { warmup, direct } = active();
    const check = value(
      await warmup.checkMailbox(actor, { email, dkimSelectors: [] }),
    );
    expect(check).toMatchObject({
      connection: "missing",
      report: { status: "needsAttention", reputation: "unknown" },
    });
    expect(direct.verify).not.toHaveBeenCalled();
    expect(
      value(await warmup.getWorkspace()).mailboxes[0]?.check?.domain,
    ).toEqual(dns);
  });
  test("successful credential check does not assert history or a sent/replied test", async () => {
    const { warmup, store } = active();
    await createInbox();
    const check = value(
      await warmup.checkMailbox(actor, { email, dkimSelectors: ["google"] }),
    );
    expect(check).toMatchObject({
      connection: "verified",
      synchronized: false,
      historyConfirmed: false,
      senderTested: false,
      report: { reputation: "unknown" },
    });
    expect((await store.policy()).settings.senderTested).toBe(false);
    expect(value(await warmup.getWorkspace()).mailboxes[0]?.enabled).toBe(
      false,
    );
  });
  test("a reconnect during verification prevents publishing a stale receipt", async () => {
    const { warmup, direct, db, schema } = active();
    const inbox = await createInbox();
    spyOn(direct, "verify").mockImplementation(async () => {
      await db
        .update(schema.outboundInbox)
        .set({ connectionVersion: 2 })
        .where(eq(schema.outboundInbox.id, inbox.id));
      return { success: true, data: { email } };
    });
    expect(
      (await warmup.checkMailbox(actor, { email, dkimSelectors: [] })).success,
    ).toBe(false);
    expect(
      await db.select().from(schema.outboundMailboxReadiness),
    ).toHaveLength(0);
  });
});
