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
import { defaultPlaybook } from "@/lib/outbound";
import {
  assessMailboxReadiness,
  type DomainReadiness,
  defaultWarmupPlan,
  type MailboxCheck,
} from "@/lib/outbound-warmup";
import { IntegrationError } from "@/server/utils/outbound/http";
import type { WarmblyMailbox } from "@/server/utils/outbound/warmbly";

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
  network?: typeof import("@/server/app/outbound/warmbly-control");
  jobs?: typeof import("@/server/app/outbound/jobs");
  adapter?: typeof import("@/server/utils/outbound/warmbly");
  credentials?: typeof import("@/server/app/outbound/provider-credentials");
} = {};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.network ||
    !modules.jobs ||
    !modules.adapter ||
    !modules.credentials
  )
    throw new Error("Fixture not loaded");
  return {
    ...modules.database,
    store: modules.store,
    network: modules.network,
    jobs: modules.jobs,
    adapter: modules.adapter,
    credentials: modules.credentials,
  };
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const email = "juri@additional-brand.com";
const id = "33333333-3333-4333-8333-333333333333";
const otherId = "44444444-4444-4444-8444-444444444444";
const actor = "warmbly-control-fixture";
const initialMailbox: WarmblyMailbox = {
  id,
  email,
  status: "active",
  warmupStartedAt: null,
  pausedAt: null,
  state: "off",
  initialDailyCap: 10,
  maximumDailyCap: 40,
  dailyIncrease: 1,
  poolType: "remote",
  authState: "connected",
};
const plan = { ...defaultWarmupPlan, maximumDailyCap: 5 };
const remote: {
  mailbox: WarmblyMailbox;
  failure: "none" | "uncertain" | "declined" | "confirm-denied";
  dispatched: number;
  accepted: boolean;
} = {
  mailbox: { ...initialMailbox },
  failure: "none",
  dispatched: 0,
  accepted: false,
};
const domain = (): DomainReadiness => ({
  domain: "additional-brand.com",
  checkedAt: new Date().toISOString(),
  scope: "dns-records",
  inboxPlacement: "unknown",
  mx: { state: "present", records: ["1 smtp.google.com"] },
  spf: { state: "present", records: ["v=spf1 include:_spf.google.com ~all"] },
  dkim: {
    state: "present",
    records: ["v=DKIM1; p=fixture"],
    selectors: ["google"],
  },
  dmarc: {
    state: "present",
    records: ["v=DMARC1; p=reject"],
    recordDomain: "additional-brand.com",
    inherited: false,
    policy: "reject",
  },
});

describe.skipIf(!endpoint)("isolated Warmbly control journal", () => {
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
    modules.network = await import("@/server/app/outbound/warmbly-control");
    modules.jobs = await import("@/server/app/outbound/jobs");
    modules.adapter = await import("@/server/utils/outbound/warmbly");
    modules.credentials = await import(
      "@/server/app/outbound/provider-credentials"
    );
  });
  beforeEach(async () => {
    const { db, schema, store, adapter, credentials } = active();
    await db.execute(
      sql`truncate outbound_mailbox_readiness, outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook cascade`,
    );
    value(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        senderEmails: email,
      }),
    );
    await db.insert(schema.outboundInbox).values({
      email,
      fromName: "Juri ecentic",
      signer: "Juri",
      transport: "google-app-password",
      appPassword: "abcdefghijklmnop",
      enabled: true,
      dailyCap: 5,
      connectionVersion: 1,
    });
    Object.assign(remote, {
      mailbox: { ...initialMailbox },
      failure: "none",
      dispatched: 0,
      accepted: false,
    });
    spyOn(credentials, "metadata").mockResolvedValue({
      success: true,
      data: {
        configured: true,
        configuration: {},
        credentialStatus: "verified",
      },
    });
    spyOn(adapter, "getMailboxes").mockImplementation(async () => ({
      success: true,
      data: {
        mailboxes: [
          { ...remote.mailbox },
          {
            ...initialMailbox,
            id: otherId,
            email: "other@additional-brand.com",
          },
        ],
        hasMore: true,
        nextCursor: "provider-next",
      },
    }));
    spyOn(adapter, "getMailboxWarmup").mockImplementation(
      async ({ id: requested }) =>
        remote.accepted && remote.failure === "confirm-denied"
          ? {
              success: false,
              error: new IntegrationError(
                "warmbly",
                "access",
                "warmbly returned HTTP 403.",
                403,
              ),
            }
          : {
              success: true,
              data:
                requested === id
                  ? { ...remote.mailbox }
                  : {
                      ...initialMailbox,
                      id: requested,
                      email: "other@additional-brand.com",
                    },
            },
    );
    spyOn(adapter, "configureMailboxWarmup").mockImplementation(
      async ({ plan }) => {
        remote.mailbox = {
          ...remote.mailbox,
          initialDailyCap: plan.initialDailyCap,
          maximumDailyCap: plan.maximumDailyCap,
          dailyIncrease: plan.dailyIncrease,
        };
        return { success: true, data: { ...remote.mailbox } };
      },
    );
    spyOn(adapter, "changeMailboxWarmup").mockImplementation(
      async ({ action }) => {
        const [inbox] = await db
          .select()
          .from(schema.outboundInbox)
          .where(eq(schema.outboundInbox.email, email));
        const [journal] = await db
          .select()
          .from(schema.outboundIntegrationJob)
          .where(
            and(
              eq(schema.outboundIntegrationJob.provider, "warmbly"),
              eq(schema.outboundIntegrationJob.status, "starting"),
            ),
          );
        expect(inbox?.enabled).toBe(false);
        expect(journal?.status).toBe("starting");
        remote.dispatched += 1;
        if (remote.failure === "uncertain")
          return {
            success: false,
            error: new IntegrationError(
              "warmbly",
              "uncertain",
              "Response interrupted.",
            ),
          };
        if (remote.failure === "declined")
          return {
            success: false,
            error: new IntegrationError(
              "warmbly",
              "access",
              "warmbly returned HTTP 403.",
              403,
            ),
          };
        remote.mailbox = {
          ...remote.mailbox,
          state:
            action === "start" || action === "resume"
              ? "running"
              : action === "pause"
                ? "paused"
                : "off",
        };
        remote.accepted = true;
        return { success: true, data: { ...remote.mailbox } };
      },
    );
  });
  afterEach(() => mock.restore());
  afterAll(() => {
    for (const [key, content] of environment) {
      if (content === undefined) Reflect.deleteProperty(process.env, key);
      else Object.assign(process.env, { [key]: content });
    }
  });
  const readiness = async (
    input: {
      stale?: boolean;
      connectionVersion?: number;
      dkim?: "invalid";
    } = {},
  ) => {
    const { db, schema } = active();
    const observed = domain();
    if (input.dkim) observed.dkim.state = input.dkim;
    const checkedAt = new Date(
      Date.now() - (input.stale ? 25 * 3600_000 : 0),
    ).toISOString();
    const check: MailboxCheck = {
      domain: observed,
      checkedAt,
      connection: "verified",
      connectionVersion: input.connectionVersion ?? 1,
      synchronized: false,
      historyConfirmed: false,
      senderTested: false,
      report: assessMailboxReadiness({
        domain: observed,
        connected: true,
        synchronized: false,
        providerError: false,
        historyConfirmed: false,
        senderTested: false,
      }),
    };
    await db.insert(schema.outboundMailboxReadiness).values({
      id: email,
      plan,
      lastCheck: check,
      dkimSelectors: ["google"],
      checkedAt: new Date(checkedAt),
      updatedBy: actor,
    });
  };
  const journal = async () => {
    const { db, schema } = active();
    return (
      await db
        .select()
        .from(schema.outboundIntegrationJob)
        .where(eq(schema.outboundIntegrationJob.provider, "warmbly"))
    )[0];
  };

  test("status projects only registered mailbox identities and carries pagination", async () => {
    const { network } = active();
    const result = value(await network.getNetwork());
    expect(result.mailboxes.map((mailbox) => mailbox.email)).toEqual([email]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("provider-next");
    expect(JSON.stringify(result)).not.toContain("abcdefghijklmnop");
  });
  test("start needs a saved plan and exact Playbook membership before any mutation", async () => {
    const { network, adapter } = active();
    expect(
      (await network.control(actor, { id, action: "start" })).success,
    ).toBe(false);
    expect(
      (await network.control(actor, { id: otherId, action: "pause" })).success,
    ).toBe(false);
    expect(adapter.configureMailboxWarmup).not.toHaveBeenCalled();
    expect(remote.dispatched).toBe(0);
    expect(await journal()).toBeUndefined();
  });
  test.each([
    { stale: true },
    { connectionVersion: 2 },
    { dkim: "invalid" as const },
  ])("start rejects stale or mismatched checks: %j", async (input) => {
    await readiness(input);
    const { network, adapter } = active();
    expect(
      (await network.control(actor, { id, action: "start" })).success,
    ).toBe(false);
    expect(adapter.configureMailboxWarmup).not.toHaveBeenCalled();
    expect(remote.dispatched).toBe(0);
  });
  test("start persists a journal and pauses local delivery before external traffic", async () => {
    await readiness();
    const { network, jobs } = active();
    const result = value(await network.control(actor, { id, action: "start" }));
    expect(result.mailbox.state).toBe("running");
    expect(remote.mailbox.maximumDailyCap).toBe(5);
    expect((await journal())?.status).toBe("complete");
    expect(value(await jobs.hasPendingWarmup(email))).toBe(false);
    expect(remote.dispatched).toBe(1);
    expect(
      (await network.control(actor, { id, action: "start" })).success,
    ).toBe(false);
    expect(remote.dispatched).toBe(1);
  });
  test("interrupted start is never replayed; a later status receipt reconciles it", async () => {
    await readiness();
    const { network, jobs } = active();
    remote.failure = "uncertain";
    expect(
      (await network.control(actor, { id, action: "start" })).success,
    ).toBe(false);
    expect((await journal())?.status).toBe("uncertain");
    expect(value(await jobs.hasPendingWarmup(email))).toBe(true);
    expect(
      value(await jobs.hasPendingWarmup("other@additional-brand.com")),
    ).toBe(false);
    expect(
      (await network.control(actor, { id, action: "start" })).success,
    ).toBe(false);
    expect(remote.dispatched).toBe(1);
    remote.mailbox.state = "running";
    const status = value(await network.getNetwork());
    expect(status.pendingJobs).toHaveLength(0);
    expect((await journal())?.status).toBe("complete");
    expect(remote.dispatched).toBe(1);
  });
  test("read permission loss after accepted mutation remains uncertain", async () => {
    await readiness();
    const { network } = active();
    remote.failure = "confirm-denied";
    expect(
      (await network.control(actor, { id, action: "start" })).success,
    ).toBe(false);
    expect((await journal())?.status).toBe("uncertain");
    expect(remote.dispatched).toBe(1);
  });
  test("explicit provider rejection is recorded as failed without enabling local delivery", async () => {
    await readiness();
    const { network, db, schema } = active();
    remote.failure = "declined";
    expect(
      (await network.control(actor, { id, action: "start" })).success,
    ).toBe(false);
    expect((await journal())?.status).toBe("failed");
    expect((await db.select().from(schema.outboundInbox))[0]?.enabled).toBe(
      false,
    );
  });
  test("a changed plan aborts before POST without leaving an uncertain hold", async () => {
    await readiness();
    const { network, adapter, db, schema, jobs } = active();
    spyOn(adapter, "configureMailboxWarmup").mockImplementationOnce(
      async ({ plan }) => {
        remote.mailbox = {
          ...remote.mailbox,
          initialDailyCap: plan.initialDailyCap,
          maximumDailyCap: plan.maximumDailyCap,
          dailyIncrease: plan.dailyIncrease,
        };
        await db
          .update(schema.outboundMailboxReadiness)
          .set({ plan: { ...plan, initialDailyCap: 3 } })
          .where(eq(schema.outboundMailboxReadiness.id, email));
        return { success: true, data: { ...remote.mailbox } };
      },
    );
    expect(
      (await network.control(actor, { id, action: "start" })).success,
    ).toBe(false);
    expect((await journal())?.status).toBe("failed");
    expect((await journal())?.output).toMatchObject({ stage: "configured" });
    expect(value(await jobs.hasPendingWarmup(email))).toBe(false);
    expect(remote.dispatched).toBe(0);
    expect((await db.select().from(schema.outboundInbox))[0]?.enabled).toBe(
      false,
    );
  });
  test("an interrupted PATCH can reconcile settings without implicitly starting warmup", async () => {
    await readiness();
    const { network, adapter, jobs } = active();
    spyOn(adapter, "configureMailboxWarmup").mockImplementationOnce(
      async ({ plan }) => {
        remote.mailbox = {
          ...remote.mailbox,
          initialDailyCap: plan.initialDailyCap,
          maximumDailyCap: plan.maximumDailyCap,
          dailyIncrease: plan.dailyIncrease,
        };
        return {
          success: false,
          error: new IntegrationError(
            "warmbly",
            "unavailable",
            "Response interrupted.",
          ),
        };
      },
    );
    expect(
      (await network.control(actor, { id, action: "start" })).success,
    ).toBe(false);
    expect((await journal())?.status).toBe("uncertain");
    expect(value(await jobs.hasPendingWarmup(email))).toBe(true);
    expect(value(await network.getNetwork()).pendingJobs).toHaveLength(0);
    expect((await journal())?.status).toBe("failed");
    expect((await journal())?.error).toContain("not started");
    expect(remote.mailbox.state).toBe("off");
    expect(remote.dispatched).toBe(0);
  });
  test("an interrupted unconfirmed PATCH remains held without a lifecycle request", async () => {
    await readiness();
    const { network, adapter } = active();
    spyOn(adapter, "configureMailboxWarmup").mockResolvedValueOnce({
      success: false,
      error: new IntegrationError(
        "warmbly",
        "unavailable",
        "Response interrupted.",
      ),
    });
    expect(
      (await network.control(actor, { id, action: "start" })).success,
    ).toBe(false);
    expect(value(await network.getNetwork()).pendingJobs).toHaveLength(1);
    expect((await journal())?.status).toBe("uncertain");
    expect(remote.dispatched).toBe(0);
  });
  test("abandoned pre-dispatch work releases its reservation without an age assumption", async () => {
    const { network, jobs } = active();
    value(
      await jobs.reserve("warmbly", null, {
        email,
        id,
        action: "start",
        plan,
        actor,
        initialStage: "prepared",
      }),
    );
    expect(value(await network.getNetwork()).pendingJobs).toHaveLength(0);
    expect((await journal())?.status).toBe("failed");
    expect(remote.dispatched).toBe(0);
  });
  test("abandoned lifecycle dispatch stays uncertain until a matching state is observed", async () => {
    const { network, jobs } = active();
    const entry = value(
      await jobs.reserve("warmbly", null, {
        email,
        id,
        action: "start",
        plan,
        actor,
      }),
    );
    value(await jobs.update(entry.id, { output: { stage: "dispatching" } }));
    expect(value(await network.getNetwork()).pendingJobs).toHaveLength(1);
    expect((await journal())?.status).toBe("uncertain");
    remote.mailbox = {
      ...remote.mailbox,
      state: "running",
      initialDailyCap: plan.initialDailyCap,
      maximumDailyCap: plan.maximumDailyCap,
      dailyIncrease: plan.dailyIncrease,
    };
    expect(value(await network.getNetwork()).pendingJobs).toHaveLength(0);
    expect((await journal())?.status).toBe("complete");
    expect(remote.dispatched).toBe(0);
  });
  test("refresh cannot complete a live worker or permit an opposite control", async () => {
    await readiness();
    const { network, adapter, db, schema } = active();
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    spyOn(adapter, "configureMailboxWarmup").mockImplementationOnce(
      async ({ plan }) => {
        remote.mailbox = {
          ...remote.mailbox,
          state: "running",
          initialDailyCap: plan.initialDailyCap,
          maximumDailyCap: plan.maximumDailyCap,
          dailyIncrease: plan.dailyIncrease,
        };
        await db
          .update(schema.outboundIntegrationJob)
          .set({ updatedAt: new Date(Date.now() - 120_000) })
          .where(eq(schema.outboundIntegrationJob.provider, "warmbly"));
        entered.resolve();
        await release.promise;
        return { success: true, data: { ...remote.mailbox } };
      },
    );
    const execution = network.control(actor, { id, action: "start" });
    void execution.then((result) => {
      if (!result.success) entered.reject(result.error);
    });
    await entered.promise;
    try {
      const status = value(await network.getNetwork());
      expect(status.pendingJobs).toHaveLength(1);
      expect(status.pendingJobs[0]?.status).toBe("starting");
      expect(
        (await network.control(actor, { id, action: "pause" })).success,
      ).toBe(false);
      expect(remote.dispatched).toBe(0);
    } finally {
      release.resolve();
    }
    expect((await execution).success).toBe(true);
    expect((await journal())?.status).toBe("complete");
    expect(remote.dispatched).toBe(1);
  });
  test("pause and repeated pause need no launch check and never enable delivery", async () => {
    const { network, db, schema } = active();
    remote.mailbox.state = "running";
    expect(
      value(await network.control(actor, { id, action: "pause" })).mailbox
        .state,
    ).toBe("paused");
    expect(
      value(await network.control(actor, { id, action: "pause" })).job,
    ).toBeNull();
    expect(remote.dispatched).toBe(1);
    expect((await db.select().from(schema.outboundInbox))[0]?.enabled).toBe(
      false,
    );
  });
});
