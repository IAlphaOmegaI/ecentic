import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { defaultPlaybook } from "@/lib/outbound";
import { Environment } from "@/server/utils/environment";

const state = { role: null as string | null };
mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
mock.module("next/server", () => ({ connection: async () => undefined }));
mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () =>
        state.role
          ? {
              user: { id: "staff-fixture", role: state.role },
              session: { id: "session-fixture" },
            }
          : null,
    },
  },
}));
globalThis.fetch = mock(() => {
  throw new Error("Page reads must not call providers");
}) as unknown as typeof fetch;
const { db, schema } = await import("@/server/database");
const now = new Date();
const inbox = {
  id: "inbox",
  email: "sender@example.test",
  fromName: "Sender",
  signer: "Sender",
  enabled: true,
  transport: "gmail-oauth",
  connected: true,
  lastSyncedAt: now,
  error: null,
  dailyCap: 15,
  nextSendAt: null,
};
const data = new Map<unknown, unknown[]>([
  [schema.outboundPlaybook, [{ settings: defaultPlaybook, revision: 1 }]],
  [schema.outboundInbox, [inbox]],
  [
    schema.outboundCampaign,
    [{ id: "00000000-0000-4000-8000-000000000001", name: "Example campaign" }],
  ],
  [
    schema.outboundProspect,
    [
      { id: "candidate", candidate: true, verified: false, checkedAt: "" },
      {
        id: "fresh",
        candidate: false,
        verified: true,
        checkedAt: now.toISOString(),
      },
      {
        id: "expired",
        candidate: false,
        verified: true,
        checkedAt: new Date(now.getTime() - 86400001).toISOString(),
      },
      {
        id: "future",
        candidate: false,
        verified: true,
        checkedAt: new Date(now.getTime() + 86400000).toISOString(),
      },
      { id: "undated", candidate: false, verified: true, checkedAt: "invalid" },
      {
        id: "ineligible",
        candidate: false,
        verified: false,
        checkedAt: now.toISOString(),
      },
    ],
  ],
  [
    schema.outboundIntegrationJob,
    [
      {
        id: "job",
        provider: "automation",
        prospectId: null,
        requestId: null,
        status: "failed",
        error: "qualification-held",
        createdAt: now,
        updatedAt: now,
      },
    ],
  ],
]);
const queries: { table?: unknown; fields: string[]; limit?: number }[] = [];
spyOn(db, "select").mockImplementation(((fields?: Record<string, unknown>) => {
  const query: (typeof queries)[number] = { fields: Object.keys(fields ?? {}) };
  queries.push(query);
  const builder = {
    from: (table: unknown) => {
      query.table = table;
      return builder;
    },
    where: () => builder,
    orderBy: () => builder,
    offset: () => builder,
    limit: (limit: number) => {
      query.limit = limit;
      return builder;
    },
    // biome-ignore lint/suspicious/noThenProperty: The query mock must behave like Drizzle's awaitable builder.
    then: (resolve: (rows: unknown[]) => unknown) =>
      Promise.resolve(data.get(query.table) ?? []).then(resolve),
  };
  return builder;
}) as unknown as typeof db.select);

const Store = await import("@/server/app/outbound/store");
const Jobs = await import("@/server/app/outbound/jobs");
const Campaigns = await import("@/server/app/outbound/campaigns");
const inboxes = await Store.getInboxSummaries();
assert.ok(inboxes.success);
if (inboxes.success)
  assert.deepEqual(inboxes.data, [
    {
      ...inbox,
      lastSyncedAt: now.toISOString(),
      activationRequestedAt: null,
      profile: null,
    },
  ]);
const inboxQuery = queries.find(
  (query) => query.table === schema.outboundInbox,
);
assert.ok(inboxQuery?.fields.includes("connected"));
assert.ok(inboxQuery?.fields.length);
for (const field of [
  "accessToken",
  "refreshToken",
  "appPassword",
  "mailboxCheckpoint",
])
  assert.ok(!inboxQuery?.fields.includes(field));
const summary = await Store.getPreparationSummary();
assert.deepEqual(summary, {
  success: true,
  data: {
    candidates: ["candidate"],
    verified: ["fresh"],
    target: defaultPlaybook.weeklyTarget,
  },
});
const preparationQuery = queries.find(
  (query) => query.table === schema.outboundProspect,
);
assert.deepEqual(preparationQuery?.fields, [
  "id",
  "candidate",
  "verified",
  "checkedAt",
]);
assert.equal(preparationQuery?.limit, 5000);
assert.ok((await Jobs.listMetadata()).success);
const jobQuery = queries.find(
  (query) => query.table === schema.outboundIntegrationJob,
);
assert.equal(jobQuery?.limit, 100);
assert.ok(!jobQuery?.fields.includes("input"));
assert.ok(!jobQuery?.fields.includes("output"));
assert.ok(
  (await Campaigns.getSummary({ id: "00000000-0000-4000-8000-000000000001" }))
    .success,
);
assert.deepEqual(
  queries.find((query) => query.table === schema.outboundCampaign)?.fields,
  ["id", "name"],
);
const beforeInvalid = queries.length;
assert.equal((await Campaigns.getSummary({ id: "invalid" })).success, false);
assert.equal(queries.length, beforeInvalid);

const prospect = spyOn(Store, "getProspectItem").mockResolvedValue({
  success: true,
  data: null,
});
const preparation = spyOn(Store, "getPreparationSummary").mockResolvedValue({
  success: true,
  data: { candidates: [], verified: [], target: 200 },
});
const mailbox = spyOn(Store, "getInboxSummaries").mockResolvedValue({
  success: true,
  data: [],
});
const campaign = spyOn(Campaigns, "getSummary").mockResolvedValue({
  success: true,
  data: { id: "campaign", name: "Example" },
});
const Actions = await import("@/server/app/outbound");
const CampaignActions = await import("@/server/app/outbound/campaign-actions");
for (const role of [null, "owner", "administrator"]) {
  state.role = role;
  assert.equal(
    (await Actions.getProspectItem(Environment.SERVER, { id: "prospect" }))
      .success,
    false,
  );
  assert.equal(
    (await Actions.getInboxSummaries(Environment.SERVER)).success,
    false,
  );
  assert.equal(
    (await Actions.getPreparationSummary(Environment.SERVER)).success,
    false,
  );
  assert.equal(
    (
      await CampaignActions.getCampaignSummary(Environment.SERVER, {
        id: "campaign",
      })
    ).success,
    false,
  );
}
for (const operation of [prospect, preparation, mailbox, campaign])
  assert.equal(operation.mock.calls.length, 0);
state.role = "staff";
assert.ok(
  (await Actions.getProspectItem(Environment.SERVER, { id: "prospect" }))
    .success,
);
assert.ok((await Actions.getInboxSummaries(Environment.SERVER)).success);
assert.ok((await Actions.getPreparationSummary(Environment.SERVER)).success);
assert.ok(
  (
    await CampaignActions.getCampaignSummary(Environment.SERVER, {
      id: "campaign",
    })
  ).success,
);
for (const operation of [prospect, preparation, mailbox, campaign])
  assert.equal(operation.mock.calls.length, 1);
const Providers = await import("@/server/utils/outbound/providers");
const Unipile = await import("@/server/utils/outbound/unipile");
spyOn(Providers, "getIntegrationStatus").mockResolvedValue({
  hubspot: { configured: false, credentialStatus: "missing" },
  research: {
    configured: false,
    scrapellm: { configured: false, credentialStatus: "missing" },
    firecrawl: { configured: false, credentialStatus: "missing" },
  },
  apollo: { configured: false, credentialStatus: "missing" },
  clay: {
    configured: false,
    credentialStatus: "missing",
    routineConfigured: false,
    routineId: "",
  },
  google: {
    clientId: "",
    redirectUri: "",
    encryptionConfigured: false,
    credentialStatus: "missing",
    configured: false,
  },
  azure: { configured: false },
});
spyOn(Unipile, "getConfiguration").mockResolvedValue({ configured: false });
const workspace = spyOn(Store, "getWorkspace").mockImplementation(() => {
  throw new Error("Integration status must not load the workspace");
});
const fullJobs = spyOn(Jobs, "list").mockImplementation(() => {
  throw new Error("Integration status must not load job inputs or outputs");
});
const Integrations = await import("@/server/app/outbound/integrations");
const status = await Integrations.getStatus(Environment.SERVER);
assert.ok(status.success);
if (status.success) {
  assert.deepEqual(status.data.inboxes, []);
  assert.equal(status.data.jobs.length, 1);
  const job = status.data.jobs[0];
  assert.ok(job);
  assert.equal(job.createdAt, now.toISOString());
  assert.ok(!("input" in job));
  assert.ok(!("output" in job));
}
assert.equal(workspace.mock.calls.length, 0);
assert.equal(fullJobs.mock.calls.length, 0);
assert.equal(mailbox.mock.calls.length, 2);
console.log("Page reads preserve projections and staff authorization");
