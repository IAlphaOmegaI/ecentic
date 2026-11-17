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
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook } from "@/lib/outbound";
import {
  type Campaign,
  defaultCampaignCriteria,
} from "@/lib/outbound-campaigns";
import { IntegrationError } from "@/server/utils/outbound/http";

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
  campaigns?: typeof import("@/server/app/outbound/campaigns");
  claude?: typeof import("@/server/app/outbound/claude");
  adapter?: typeof import("@/server/utils/outbound/claude");
  credentials?: typeof import("@/server/app/outbound/provider-credentials");
  jobs?: typeof import("@/server/app/outbound/jobs");
} = {};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.campaigns ||
    !modules.claude ||
    !modules.adapter ||
    !modules.credentials ||
    !modules.jobs
  )
    throw new Error("Fixture not loaded");
  return {
    ...modules.database,
    store: modules.store,
    campaigns: modules.campaigns,
    claude: modules.claude,
    adapter: modules.adapter,
    credentials: modules.credentials,
    jobs: modules.jobs,
  };
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const actor = "claude-fixture";
const fixture: { campaign?: Campaign } = {};
const campaign = () => {
  if (!fixture.campaign) throw new Error("Missing fixture campaign");
  return fixture.campaign;
};
const generated = () => ({
  criteria: {
    ...defaultCampaignCriteria(defaultPlaybook),
    objective: "Established skincare brands",
  },
  model: "claude-sonnet-5-5" as const,
  usage: { inputTokens: 120, outputTokens: 80 },
  providerMessageId: "msg_fixture",
  providerRequestId: "req_fixture",
});
const input = () => ({
  campaignId: campaign().id,
  expectedRevision: campaign().revision,
  context: "private campaign notes for draft",
  requestId: randomUUID(),
});

describe.skipIf(!endpoint)("isolated Claude preview persistence", () => {
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
    modules.campaigns = await import("@/server/app/outbound/campaigns");
    modules.claude = await import("@/server/app/outbound/claude");
    modules.adapter = await import("@/server/utils/outbound/claude");
    modules.credentials = await import(
      "@/server/app/outbound/provider-credentials"
    );
    modules.jobs = await import("@/server/app/outbound/jobs");
  });
  beforeEach(async () => {
    const { db, store, campaigns, adapter } = active();
    await db.execute(
      sql`truncate outbound_integration_job, outbound_campaign, outbound_prospect, outbound_event, outbound_revision, outbound_playbook, outbound_provider_credential cascade`,
    );
    value(await store.savePlaybook(actor, defaultPlaybook));
    const created = value(await campaigns.create(actor, { name: "Beauty" }));
    fixture.campaign = value(await campaigns.get({ id: created.id })).campaign;
    spyOn(adapter, "generateCriteria").mockResolvedValue({
      success: true,
      data: generated(),
    });
    spyOn(adapter, "validateKey").mockResolvedValue({
      success: true,
      data: { valid: true },
    });
  });
  afterEach(() => mock.restore());
  afterAll(() => {
    for (const [key, content] of environment) {
      if (content === undefined) Reflect.deleteProperty(process.env, key);
      else Object.assign(process.env, { [key]: content });
    }
  });

  test("generation persists a recoverable usage receipt without changing campaign criteria or sending", async () => {
    const { claude, db, schema, adapter } = active();
    const request = input();
    const result = value(await claude.generate(actor, request));
    expect(result.criteria.objective).toBe("Established skincare brands");
    expect(result.stale).toBe(false);
    expect(result.campaignRevision).toBe(campaign().revision);
    expect(
      value(await claude.getGeneration({ requestId: request.requestId })),
    ).toEqual(result);
    expect(value(await claude.generate(actor, request))).toEqual(result);
    expect(adapter.generateCriteria).toHaveBeenCalledTimes(1);
    const [current] = await db
      .select()
      .from(schema.outboundCampaign)
      .where(eq(schema.outboundCampaign.id, campaign().id));
    expect(current?.criteria).toEqual(campaign().criteria);
    const [job] = await db.select().from(schema.outboundIntegrationJob);
    expect(job?.status).toBe("complete");
    expect(job?.output).toMatchObject({
      usage: { inputTokens: 120, outputTokens: 80 },
      providerRequestId: "req_fixture",
    });
    expect(JSON.stringify(job?.input)).not.toContain(request.context);
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(0);
  });
  test("concurrent requests with the same ID invoke Claude only once", async () => {
    const { claude, adapter } = active();
    const request = input();
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    spyOn(adapter, "generateCriteria").mockImplementationOnce(async () => {
      entered.resolve();
      await release.promise;
      return { success: true, data: generated() };
    });
    const first = claude.generate(actor, request);
    void first.then((result) => {
      if (!result.success) entered.reject(result.error);
    });
    await entered.promise;
    try {
      const repeated = await claude.generate(actor, request);
      expect(repeated.success).toBe(false);
      if (!repeated.success)
        expect(repeated.error.message).toBe("claude-generation-running");
      expect(adapter.generateCriteria).toHaveBeenCalledTimes(1);
    } finally {
      release.resolve();
    }
    expect((await first).success).toBe(true);
  });
  test("uncertain generations are retained and never replayed using the same ID", async () => {
    const { claude, adapter, db, schema } = active();
    const request = input();
    spyOn(adapter, "generateCriteria").mockResolvedValue({
      success: false,
      error: new IntegrationError(
        "claude",
        "uncertain",
        "claude-generation-uncertain",
      ),
    });
    expect((await claude.generate(actor, request)).success).toBe(false);
    expect((await claude.generate(actor, request)).success).toBe(false);
    const recovered = await claude.getGeneration({
      requestId: request.requestId,
    });
    expect(recovered.success).toBe(false);
    if (!recovered.success)
      expect(recovered.error.message).toBe("claude-generation-uncertain");
    expect(adapter.generateCriteria).toHaveBeenCalledTimes(1);
    expect(
      (await db.select().from(schema.outboundIntegrationJob))[0]?.status,
    ).toBe("uncertain");
  });
  test("a failed completion acknowledgement preserves the validated preview for recovery without another call", async () => {
    const { claude, adapter, jobs, db, schema } = active();
    const request = input();
    const update = jobs.update;
    spyOn(jobs, "update")
      .mockResolvedValueOnce({
        success: false,
        error: new Error("Write unavailable"),
      })
      .mockImplementation(update);
    const response = await claude.generate(actor, request);
    expect(response.success).toBe(false);
    if (!response.success)
      expect(response.error.message).toBe("claude-generation-uncertain");
    const recovered = value(
      await claude.getGeneration({ requestId: request.requestId }),
    );
    expect(recovered.criteria.objective).toBe("Established skincare brands");
    expect(recovered.usage).toEqual({ inputTokens: 120, outputTokens: 80 });
    expect(value(await claude.generate(actor, request))).toEqual(recovered);
    expect(adapter.generateCriteria).toHaveBeenCalledTimes(1);
    expect(
      (await db.select().from(schema.outboundIntegrationJob))[0]?.status,
    ).toBe("uncertain");
  });
  test("an abandoned request reports an unknown outcome without releasing its request ID", async () => {
    const { claude, adapter, jobs, db, schema } = active();
    const request = input();
    spyOn(jobs, "update").mockResolvedValue({
      success: false,
      error: new Error("Write unavailable"),
    });
    expect((await claude.generate(actor, request)).success).toBe(false);
    await db
      .update(schema.outboundIntegrationJob)
      .set({ createdAt: new Date(Date.now() - 120_000) });
    const recovered = await claude.getGeneration({
      requestId: request.requestId,
    });
    expect(recovered.success).toBe(false);
    if (!recovered.success)
      expect(recovered.error.message).toBe("claude-generation-uncertain");
    const repeated = await claude.generate(actor, request);
    expect(repeated.success).toBe(false);
    if (!repeated.success)
      expect(repeated.error.message).toBe("claude-generation-uncertain");
    expect(adapter.generateCriteria).toHaveBeenCalledTimes(1);
    expect(
      (await db.select().from(schema.outboundIntegrationJob))[0]?.status,
    ).toBe("starting");
  });
  test("changed criteria and Playbook revisions make a saved preview stale", async () => {
    const { claude, db, schema } = active();
    const request = input();
    value(await claude.generate(actor, request));
    await db
      .update(schema.outboundCampaign)
      .set({ revision: campaign().revision + 1 })
      .where(eq(schema.outboundCampaign.id, campaign().id));
    expect(
      value(await claude.getGeneration({ requestId: request.requestId })).stale,
    ).toBe(true);
    await db
      .update(schema.outboundCampaign)
      .set({ revision: campaign().revision })
      .where(eq(schema.outboundCampaign.id, campaign().id));
    await db.update(schema.outboundPlaybook).set({ revision: 999 });
    expect(
      value(await claude.getGeneration({ requestId: request.requestId })).stale,
    ).toBe(true);
  });
  test("stale new requests and reused IDs with changed inputs cannot consume another call", async () => {
    const { claude, adapter } = active();
    const request = input();
    expect(
      (await claude.generate(actor, { ...request, expectedRevision: 999 }))
        .success,
    ).toBe(false);
    expect(adapter.generateCriteria).not.toHaveBeenCalled();
    value(await claude.generate(actor, request));
    expect(
      (
        await claude.generate(actor, {
          ...request,
          context: "different request",
        })
      ).success,
    ).toBe(false);
    expect(adapter.generateCriteria).toHaveBeenCalledTimes(1);
  });
  test("saving a generated preview rechecks Playbook changes while manual saves remain available", async () => {
    const { claude, campaigns, store, adapter } = active();
    const preview = value(await claude.generate(actor, input()));
    expect(preview.stale).toBe(false);
    value(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        targetingNotes: "New company targeting guidance after preview",
      }),
    );
    const changes = {
      id: campaign().id,
      expectedRevision: campaign().revision,
      criteria: preview.criteria,
      answers: preview.answers,
    };
    const rejected = await campaigns.saveCriteria(actor, {
      ...changes,
      claudeGenerationId: preview.requestId,
    });
    expect(rejected.success).toBe(false);
    if (!rejected.success)
      expect(rejected.error.message).toBe("campaign-playbook-changed");
    const untouched = value(
      await campaigns.get({ id: campaign().id }),
    ).campaign;
    expect(untouched.criteria).toEqual(campaign().criteria);
    expect(untouched.revision).toBe(campaign().revision);
    expect(untouched.answers).toBe(campaign().answers);
    expect((await campaigns.saveCriteria(actor, changes)).success).toBe(true);
    expect(adapter.generateCriteria).toHaveBeenCalledTimes(1);
  });
  test.each(["complete", "uncertain"] as const)(
    "a valid %s generation allows reviewed edits before saving",
    async (status) => {
      const { claude, campaigns, jobs, adapter } = active();
      const preview = value(await claude.generate(actor, input()));
      value(await jobs.update(preview.requestId, { status }));
      const criteria = {
        ...preview.criteria,
        objective: "Reviewed skincare brands",
      };
      const saved = value(
        await campaigns.saveCriteria(actor, {
          id: campaign().id,
          expectedRevision: campaign().revision,
          criteria,
          answers: preview.answers,
          claudeGenerationId: preview.requestId,
        }),
      );
      expect(saved.revision).toBe(campaign().revision + 1);
      expect(
        value(await campaigns.get({ id: saved.id })).campaign.criteria,
      ).toEqual(criteria);
      expect(adapter.generateCriteria).toHaveBeenCalledTimes(1);
    },
  );
  test("a fresh expected revision cannot make an older Claude generation current", async () => {
    const { claude, campaigns, adapter } = active();
    const preview = value(await claude.generate(actor, input()));
    const current = value(
      await campaigns.saveCriteria(actor, {
        id: campaign().id,
        expectedRevision: campaign().revision,
        criteria: { ...campaign().criteria, objective: "Updated manually" },
        answers: "",
      }),
    );
    const rejected = await campaigns.saveCriteria(actor, {
      id: campaign().id,
      expectedRevision: current.revision,
      criteria: preview.criteria,
      answers: preview.answers,
      claudeGenerationId: preview.requestId,
    });
    expect(rejected.success).toBe(false);
    if (!rejected.success)
      expect(rejected.error.message).toBe("campaign-criteria-changed");
    expect(
      value(await campaigns.get({ id: current.id })).campaign.criteria
        .objective,
    ).toBe("Updated manually");
    expect(adapter.generateCriteria).toHaveBeenCalledTimes(1);
  });
  test("another campaign cannot apply a valid generation from this campaign", async () => {
    const { claude, campaigns, adapter } = active();
    const preview = value(await claude.generate(actor, input()));
    const other = value(
      await campaigns.create(actor, { name: "Separate audience" }),
    );
    const current = value(await campaigns.get({ id: other.id })).campaign;
    const rejected = await campaigns.saveCriteria(actor, {
      id: other.id,
      expectedRevision: current.revision,
      criteria: preview.criteria,
      answers: preview.answers,
      claudeGenerationId: preview.requestId,
    });
    expect(rejected.success).toBe(false);
    if (!rejected.success)
      expect(rejected.error.message).toBe("campaign-generation-invalid");
    expect(
      value(await campaigns.get({ id: other.id })).campaign.criteria,
    ).toEqual(current.criteria);
    expect(adapter.generateCriteria).toHaveBeenCalledTimes(1);
  });
  test.each(["starting", "failed"] as const)(
    "a %s generation cannot authorize saving even with a valid stored output",
    async (status) => {
      const { claude, campaigns, jobs } = active();
      const preview = value(await claude.generate(actor, input()));
      value(await jobs.update(preview.requestId, { status }));
      const rejected = await campaigns.saveCriteria(actor, {
        id: campaign().id,
        expectedRevision: campaign().revision,
        criteria: preview.criteria,
        answers: preview.answers,
        claudeGenerationId: preview.requestId,
      });
      expect(rejected.success).toBe(false);
      if (!rejected.success)
        expect(rejected.error.message).toBe("campaign-generation-invalid");
      expect(
        value(await campaigns.get({ id: campaign().id })).campaign.revision,
      ).toBe(campaign().revision);
    },
  );
  test("failed outputs retain usage while only an explicit new ID starts a new generation", async () => {
    const { claude, adapter, db, schema } = active();
    const request = input();
    spyOn(adapter, "generateCriteria").mockResolvedValueOnce({
      success: false,
      error: new IntegrationError(
        "claude",
        "contract",
        "claude-generation-failed",
        502,
        null,
        null,
        {
          usage: { inputTokens: 30, outputTokens: 40 },
          providerRequestId: "req_invalid",
        },
      ),
    });
    expect((await claude.generate(actor, request)).success).toBe(false);
    expect(
      (await db.select().from(schema.outboundIntegrationJob))[0]?.output,
    ).toMatchObject({ providerRequestId: "req_invalid" });
    expect(
      (await claude.generate(actor, { ...request, requestId: randomUUID() }))
        .success,
    ).toBe(true);
    expect(adapter.generateCriteria).toHaveBeenCalledTimes(2);
  });
  test("Claude keys and model settings use encrypted credential storage with safe status", async () => {
    const { claude, db, adapter, credentials } = active();
    const key = `sk-ant-api03-${"x".repeat(80)}`;
    value(
      await claude.saveKey(actor, {
        apiKey: key,
        model: "claude-opus-5-5",
        workspaceId: "wrkspc_fixture",
      }),
    );
    expect(adapter.validateKey).toHaveBeenCalledWith(key, {
      model: "claude-opus-5-5",
      workspaceId: "wrkspc_fixture",
    });
    const rows = await db.execute<{ api_key: string }>(
      sql`select api_key from outbound_provider_credential where provider = 'claude'`,
    );
    expect(rows[0]?.api_key).not.toBe(key);
    const status = value(await claude.getStatus());
    expect(status).toMatchObject({
      configured: true,
      model: "claude-opus-5-5",
      workspaceId: "wrkspc_fixture",
      credentialStatus: "verified",
    });
    expect(JSON.stringify(status)).not.toContain(key);
    expect(value(await credentials.resolveKey("claude"))).toBe(key);
  });
});
