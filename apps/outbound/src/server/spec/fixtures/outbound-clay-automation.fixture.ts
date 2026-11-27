import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { prospectSchema } from "@/lib/outbound";
import { automationStateSchema } from "@/lib/outbound-automation";
import { clayRoleStateSchema } from "@/lib/outbound-clay";
import { IntegrationError } from "@/server/utils/outbound/http";
import { requireTestDatabase } from "../helpers/database";
import { clayFixtureResult } from "../helpers/outbound-clay-fixture";
import { prepareSyntheticShoppingEvidence } from "../helpers/outbound-shopping-db-fixture";
import {
  syntheticWriterParts,
  syntheticWritingPolicy,
} from "../helpers/outbound-shopping-fixture";
import {
  passingCopyJudge,
  writerFixture,
} from "../helpers/outbound-writer-fixture";

const endpoint = requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const { researchPolicyHash } = await import(
  "@/server/utils/outbound/shopping-research"
);
const { db, schema } = await import("@/server/database");
const Store = await import("@/server/app/outbound/store");
const approvalFailure = { reason: "" };
const approve = Store.approveAutomatically;
spyOn(Store, "approveAutomatically").mockImplementation(
  async (...parameters) => {
    const result = await approve(...parameters);
    if (!result.success) approvalFailure.reason = result.error.message;
    return result;
  },
);
const Automation = await import("@/server/app/outbound/automation");
const Providers = await import("@/server/utils/outbound/providers");
const Credentials = await import("@/server/app/outbound/provider-credentials");
const Readiness = await import("@/server/app/outbound/research-readiness");
const LeadResearch = await import("@/server/app/outbound/lead-research");
const Jobs = await import("@/server/app/outbound/jobs");
const Draft = await import("@/server/utils/outbound/draft");
const compose = Draft.composeSequence;
spyOn(Draft, "composeSequence").mockImplementation(
  (prospect, receipt, settings, dependencies) =>
    compose(prospect, receipt, settings, {
      ...dependencies,
      generate: async () => syntheticWriterParts(prospect, receipt!),
      judge: passingCopyJudge,
    }),
);
const independent = postgres(endpoint, { max: 1, onnotice: () => undefined });
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
spyOn(Readiness, "getStatus").mockResolvedValue({
  success: true,
  data: { required: true, ready: true, missing: [], blocked: [] },
});
const metadata = spyOn(Credentials, "metadata").mockResolvedValue({
  success: true,
  data: {
    configured: true,
    configuration: { routineId: "workflow:synthetic" },
    credentialStatus: "verified",
    version: "a".repeat(64),
  },
});
const read = async (id: string) => {
  const [job] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id));
  assert.ok(job);
  return job;
};
const ready = async (id: string) => {
  const job = await read(id);
  await db
    .update(schema.outboundIntegrationJob)
    .set({ output: { ...job.output, availableAt: new Date(0).toISOString() } })
    .where(eq(schema.outboundIntegrationJob.id, id));
};
const seed = async () => {
  await db.execute(
    sql`truncate outbound_integration_job,outbound_campaign,outbound_company,outbound_person,outbound_prospect,outbound_event,outbound_revision,outbound_playbook,outbound_suppression cascade`,
  );
  const fixture = writerFixture();
  const settings = syntheticWritingPolicy({
    ...fixture.policy,
    automationEnabled: true,
    automaticClayEnabled: true,
    senderConfirmed: true,
    historyConfirmed: true,
    competingSendersPaused: true,
    senderTested: true,
    sendingEnabled: false,
    dailyCompanyTarget: 2,
    weeklyTarget: 4,
  });
  value(await Store.savePlaybook("fixture", settings));
  const now = new Date().toISOString();
  const saved = value(
    await Store.saveProspect(
      "fixture",
      prospectSchema.parse({
        ...fixture.prospect,
        assignedSenderEmail: undefined,
        platform: "shopify",
        timezone: "America/New_York",
        legitEvidence:
          "https://samplegoods.test/about: Synthetic established merchant",
        linkedinUrl: "https://www.linkedin.com/in/jamie-smith",
        emailStatus: "verified",
        emailSource: "Apollo verification synthetic; record synthetic",
        emailVerifiedAt: now,
        roleSource: "https://www.linkedin.com/in/jamie-smith",
        roleCheckedAt: now,
        mxProvider: "google",
        mxCheckedAt: now,
      }),
    ),
  );
  const researched = value(
    await prepareSyntheticShoppingEvidence("fixture", saved),
  );
  const prospect = value(await Store.readProspect(saved.prospect));
  assert.ok(prospect);
  const [company] = await db
    .select()
    .from(schema.outboundCampaignCompany)
    .where(eq(schema.outboundCampaignCompany.prospectId, prospect.id));
  assert.ok(company);
  const [campaign] = await db
    .select()
    .from(schema.outboundCampaign)
    .where(eq(schema.outboundCampaign.id, company.campaignId));
  assert.ok(campaign);
  const id = randomUUID();
  const details = { ...prospect.details, automationEvidenceId: id };
  await db
    .update(schema.outboundProspect)
    .set({ details })
    .where(eq(schema.outboundProspect.id, prospect.id));
  const policy = await Store.policy();
  await db.insert(schema.outboundIntegrationJob).values({
    id,
    provider: "automation",
    prospectId: prospect.id,
    status: "pending",
    input: {
      operation: "campaignAutomation",
      campaignId: campaign.id,
      companyId: company.id,
      companyName: company.name,
      companyDomain: company.domain,
      campaignRevision: campaign.revision,
      playbookRevision: policy.revision,
      actor: "fixture",
    },
    output: {
      stage: "startClayRole",
      availableAt: new Date(0).toISOString(),
      lease: null,
      prospectId: prospect.id,
      prospectRevision: prospect.revision,
      qualification: {
        status: "qualified",
        details: {
          ...details,
          gap: "product-published-data",
          evidenceCheckedAt: now,
          legitEvidence: `https://${details.domain}/about: Synthetic established merchant`,
          evidence: "Synthetic captured merchant product",
        },
        receipts: [],
      },
      verification: {
        requestId: "synthetic",
        records: [{ record_id: "synthetic", input: { email: details.email } }],
      },
      verificationResult: {
        requestId: "synthetic",
        status: "complete",
        results: [
          {
            recordId: "synthetic",
            email: details.email,
            status: "verified",
            verifiedAt: details.emailVerifiedAt,
          },
        ],
      },
      selection: {
        status: "selected",
        provisional: false,
        person: Object.fromEntries(
          ["name", "first", "title", "email", "domain", "linkedinUrl"].map(
            (key) => [key, details[key as keyof typeof details]],
          ),
        ),
        details: {
          roleSource: details.roleSource,
          roleCheckedAt: details.roleCheckedAt,
          timezone: details.timezone,
        },
      },
      shoppingReceipt: researched.request.receipt,
      shoppingAnswer: researched.capture.evidence.answer,
      shoppingBrowser: researched.capture.evidence.browser,
      shoppingPolicyHash: researchPolicyHash(policy.settings),
    },
  });
  const applied = value(
    await LeadResearch.saveAndApply("fixture", researched.request),
  );
  const initialized = await read(id);
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      output: { ...initialized.output, prospectRevision: applied.revision },
    })
    .where(eq(schema.outboundIntegrationJob.id, id));
  return {
    id,
    prospectId: prospect.id,
    policy,
    before: value(await Store.readProspect(prospect.id)),
  };
};
const step = async (id: string) =>
  value(await Automation.run({ jobId: id, maxSteps: 1 }));
const start = spyOn(Providers, "startClayEnrichment");
const poll = spyOn(Providers, "pollClayEnrichment");
const installStart = (id: string) =>
  start.mockImplementation(async (input) => {
    const job = await read(id);
    const state = automationStateSchema.parse(job.output);
    assert.equal(job.status, "starting");
    assert.ok(state.clayRole);
    assert.ok(state.lease);
    assert.deepEqual(input.items, [state.clayRole.request.item]);
    assert.deepEqual(input.binding, {
      routineId: state.clayRole.request.routineId,
      credentialVersion: state.clayRole.request.credentialVersion,
    });
    const [lock] =
      await independent`select pg_try_advisory_xact_lock(hashtext('ecentic-outbound-workspace')) as available`;
    assert.equal(
      lock?.["available"],
      true,
      "provider request executes outside workspace transaction",
    );
    const manual = await Jobs.reserve("clay", null, { operation: "routine" });
    assert.equal(manual.success, false);
    return {
      success: true,
      data: {
        runId: "synthetic-run",
        status: "pending",
        requestedAt: new Date().toISOString(),
      },
    };
  });

// Real Store/research/automation paths, injected provider calls only. No external network.
const first = await seed();
installStart(first.id);
assert.equal((await step(first.id)).processed, 1);
assert.equal(start.mock.calls.length, 1);
assert.equal((await read(first.id)).output?.["stage"], "pollClayRole");
assert.equal((await step(first.id)).processed, 0, "poll pacing is durable");
await ready(first.id);
poll.mockImplementation(async ({ runId }) => {
  const role = clayRoleStateSchema.parse(
    (await read(first.id)).output?.["clayRole"],
  );
  return { success: true, data: clayFixtureResult(role.request, runId) };
});
await step(first.id);
await step(first.id);
const passed = await read(first.id);
assert.equal(passed.output?.["stage"], "draft");
assert.equal(
  clayRoleStateSchema.parse(passed.output?.["clayRole"]).reviewed?.status,
  "corroborated",
);
const current = value(await Store.readProspect(first.prospectId));
assert.ok(current);
await db.transaction((transaction) =>
  Store.assertAutomaticEvidence(transaction, current),
);
const tampered = structuredClone(passed.output);
assert.ok(tampered);
const alteredRole = clayRoleStateSchema.parse(tampered["clayRole"]);
alteredRole.request.contextHash = "0".repeat(64);
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: { ...tampered, clayRole: alteredRole } })
  .where(eq(schema.outboundIntegrationJob.id, first.id));
await assert.rejects(
  () =>
    db.transaction((transaction) =>
      Store.assertAutomaticEvidence(transaction, current),
    ),
  /Clay:/,
);
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: passed.output })
  .where(eq(schema.outboundIntegrationJob.id, first.id));
assert.deepEqual(
  value(await Store.readProspect(first.prospectId)),
  first.before,
  "Clay never changes the prospect, verification, approval or messages",
);
assert.equal((await Store.policy()).settings.sendingEnabled, false);
assert.equal((await db.select().from(schema.outboundSendAttempt)).length, 0);
assert.equal(current.details.assignedSenderEmail, undefined);
await step(first.id);
assert.equal((await read(first.id)).output?.["stage"], "applyDraft");
await step(first.id);
assert.equal((await read(first.id)).output?.["stage"], "approve");
const written = value(await Store.readProspect(first.prospectId));
assert.ok(written);
assert.ok(
  written.details.assignedSenderEmail,
  "trusted save assigns the sender after Clay",
);
await step(first.id);
assert.equal((await read(first.id)).status, "complete", approvalFailure.reason);
assert.equal(
  value(await Store.readProspect(first.prospectId))?.status,
  "approved",
);
assert.equal((await db.select().from(schema.outboundSendAttempt)).length, 0);
const beforePolicy = await Store.policy();
value(
  await Store.savePlaybook(
    "fixture",
    { ...beforePolicy.settings, automaticClayEnabled: false },
    beforePolicy.revision,
  ),
);
const offPolicy = await Store.policy();
assert.equal(offPolicy.revision, beforePolicy.revision);
value(
  await Store.savePlaybook(
    "fixture",
    beforePolicy.settings,
    offPolicy.revision,
  ),
);
value(
  await Store.savePlaybookForm("fixture", {
    settings: { ...beforePolicy.settings, automaticClayEnabled: false },
    expectedRevision: beforePolicy.revision,
    expectedSenderPool: {
      senderEmails: beforePolicy.settings.senderEmails,
      inactiveSenderEmails: beforePolicy.settings.inactiveSenderEmails,
    },
  }),
);
assert.equal(
  (await Store.policy()).settings.automaticClayEnabled,
  true,
  "stale forms preserve the operational flag",
);

const interrupted = await seed();
start.mockClear();
poll.mockClear();
start.mockResolvedValue({
  success: false,
  error: new IntegrationError(
    "clay",
    "uncertain",
    "Synthetic interrupted POST",
  ),
});
await step(interrupted.id);
assert.equal((await read(interrupted.id)).status, "uncertain");
assert.ok((await read(interrupted.id)).output?.["clayRole"]);
assert.equal((await step(interrupted.id)).processed, 0);
assert.equal(start.mock.calls.length, 1);
assert.equal(poll.mock.calls.length, 0);

const held = await seed();
start.mockClear();
installStart(held.id);
await step(held.id);
await ready(held.id);
poll.mockImplementation(async ({ runId }) => {
  const role = clayRoleStateSchema.parse(
    (await read(held.id)).output?.["clayRole"],
  );
  const result = clayFixtureResult(role.request, runId);
  result.results[0]!.result.facts.outcome = "hold";
  return { success: true, data: result };
});
await step(held.id);
await step(held.id);
assert.equal((await read(held.id)).status, "failed");
assert.equal((await read(held.id)).output?.["stage"], "complete");
assert.match((await read(held.id)).error ?? "", /^Clay:/);
const heldProspect = value(await Store.readProspect(held.prospectId));
assert.ok(heldProspect);
await assert.rejects(
  () =>
    db.transaction((transaction) =>
      Store.assertAutomaticEvidence(transaction, heldProspect),
    ),
  /Clay:/,
);
assert.deepEqual(value(await Store.readProspect(held.prospectId)), held.before);
assert.equal((await step(held.id)).processed, 0);
assert.equal(start.mock.calls.length, 1);

const changed = await seed();
start.mockClear();
installStart(changed.id);
await step(changed.id);
await ready(changed.id);
poll.mockClear();
value(
  await Store.patchProspect(
    "fixture",
    changed.prospectId,
    { title: "Founder" },
    changed.before!.revision,
  ),
);
await step(changed.id);
assert.equal(poll.mock.calls.length, 0);
assert.equal((await read(changed.id)).status, "failed");

const expired = await seed();
start.mockClear();
start.mockImplementation(async () => {
  const job = await read(expired.id);
  const state = automationStateSchema.parse(job.output);
  assert.ok(state.lease);
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      output: {
        ...state,
        lease: { ...state.lease, expiresAt: new Date(0).toISOString() },
      },
    })
    .where(eq(schema.outboundIntegrationJob.id, expired.id));
  return {
    success: true,
    data: {
      runId: "late-synthetic-run",
      status: "pending",
      requestedAt: new Date().toISOString(),
    },
  };
});
await step(expired.id);
const late = await read(expired.id);
assert.equal(late.status, "uncertain");
assert.equal(
  clayRoleStateSchema.parse(late.output?.["clayRole"]).runId,
  "late-synthetic-run",
);
assert.equal((await step(expired.id)).processed, 0);
assert.equal(start.mock.calls.length, 1);

const paused = await seed();
start.mockClear();
value(
  await Store.savePlaybook(
    "fixture",
    { ...paused.policy.settings, automaticClayEnabled: false },
    paused.policy.revision,
  ),
);
assert.equal((await step(paused.id)).processed, 0);
assert.equal(start.mock.calls.length, 0);
assert.equal((await read(paused.id)).output?.["clayRole"], undefined);

const manual = await seed();
start.mockClear();
value(await Jobs.reserve("clay", null, { operation: "routine" }));
assert.equal((await step(manual.id)).processed, 0);
assert.equal((await read(manual.id)).error, "clay-provider-busy");
assert.equal(start.mock.calls.length, 0);

const capped = await seed();
start.mockClear();
for (const index of [1, 2]) {
  const role = clayRoleStateSchema.parse(passed.output?.["clayRole"]);
  const id = randomUUID();
  await db.insert(schema.outboundIntegrationJob).values({
    provider: "automation",
    status: "complete",
    input: { operation: "syntheticPriorClay", index },
    output: {
      clayRole: {
        ...role,
        request: {
          ...role.request,
          prospectId: id,
          item: { ...role.request.item, id },
        },
      },
    },
  });
}
assert.equal((await step(capped.id)).processed, 0);
assert.equal((await read(capped.id)).error, "clay-reservation-cap");
assert.equal(start.mock.calls.length, 0);
assert.equal((await read(capped.id)).output?.["clayRole"], undefined);

const configChanged = await seed();
start.mockClear();
installStart(configChanged.id);
await step(configChanged.id);
await ready(configChanged.id);
poll.mockClear();
metadata.mockResolvedValue({
  success: true,
  data: {
    configured: true,
    configuration: { routineId: "workflow:changed" },
    credentialStatus: "verified",
    version: "b".repeat(64),
  },
});
await step(configChanged.id);
assert.equal(poll.mock.calls.length, 0);
assert.equal((await read(configChanged.id)).status, "failed");
metadata.mockResolvedValue({
  success: true,
  data: {
    configured: true,
    configuration: { routineId: "workflow:synthetic" },
    credentialStatus: "verified",
    version: "a".repeat(64),
  },
});
const wrongRun = await seed();
start.mockClear();
installStart(wrongRun.id);
await step(wrongRun.id);
await ready(wrongRun.id);
poll.mockImplementation(async () => {
  const role = clayRoleStateSchema.parse(
    (await read(wrongRun.id)).output?.["clayRole"],
  );
  return {
    success: true,
    data: clayFixtureResult(role.request, "another-run"),
  };
});
await step(wrongRun.id);
const rejectedRun = await read(wrongRun.id);
assert.equal(rejectedRun.status, "failed");
assert.equal(rejectedRun.output?.["stage"], "complete");
assert.equal(
  clayRoleStateSchema.parse(rejectedRun.output?.["clayRole"]).rejectedResult?.[
    "runId"
  ],
  "another-run",
);
assert.equal((await step(wrongRun.id)).processed, 0);
assert.equal(start.mock.calls.length, 1);
metadata.mockRestore();
await independent.end();
console.log("Automatic Clay fixture passed.");
process.exit(0);
