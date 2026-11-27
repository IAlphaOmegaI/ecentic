import { mock, setSystemTime, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook } from "@/lib/outbound";
import {
  HUBSPOT_REFRESH_MS,
  HUBSPOT_STALE_MS,
  hubspotPullStateSchema,
} from "@/lib/outbound-hubspot";
import { IntegrationError } from "@/server/utils/outbound/http";
import { requireTestDatabase } from "../helpers/database";

Object.assign(process.env, {
  DATABASE_URL: requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL),
});
mock.module("server-only", () => ({}));
const { db, schema } = await import("@/server/database");
const Credentials = await import("@/server/app/outbound/provider-credentials");
const Store = await import("@/server/app/outbound/store");
const Sync = await import("@/server/app/outbound/hubspot-exclusions");
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const version = { current: "a".repeat(64) };
const metadata = spyOn(Credentials, "metadata").mockImplementation(
  async () => ({
    success: true,
    data: {
      configured: true,
      credentialStatus: "verified",
      configuration: {},
      version: version.current,
    },
  }),
);
const key = spyOn(Credentials, "resolveKey").mockResolvedValue({
  success: true,
  data: "synthetic-only",
});
const clock = { now: Date.now() };
setSystemTime(clock.now);
const advance = (duration: number) => {
  clock.now += duration;
  setSystemTime(clock.now);
};
const job = async (id: string) =>
  (
    await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.id, id))
  )[0]!;
const rows = async () =>
  db
    .select()
    .from(schema.outboundSuppression)
    .orderBy(schema.outboundSuppression.value);
const state = { domain: "original-hubspot.test", calls: 0 };
const provider: typeof import("@/server/utils/outbound/hubspot").readPage =
  async (input) => {
    state.calls++;
    return {
      success: true,
      data: {
        status: 200,
        retryAfterSeconds: null,
        value: {
          results:
            input.object === "companies"
              ? [
                  {
                    id: "1",
                    archived: false,
                    updatedAt: new Date().toISOString(),
                    properties: { domain: state.domain },
                  },
                ]
              : [],
        },
      },
    };
  };
const tick = (readPage = provider) =>
  Sync.runScheduled({ deadline: Date.now() + 30_000 }, { readPage });
// Exercise the real cron entry as well as the durable service; unrelated rails are inert.
const idle = async () => ({ success: true as const, data: { processed: 0 } });
mock.module("@/server/app/outbound/automatic-company-discovery", () => ({
  run: idle,
}));
mock.module("@/server/app/outbound/automatic-sequence-refresh", () => ({
  run: idle,
}));
mock.module("@/server/app/outbound/saved-contact-preparation", () => ({
  run: idle,
}));
mock.module("@/server/app/outbound/automatic-draft-review", () => ({
  run: idle,
}));
mock.module("@/server/app/outbound/automation", () => ({ run: idle }));
const HubSpot = await import("@/server/utils/outbound/hubspot");
spyOn(HubSpot, "readPage").mockImplementation(provider);
Object.assign(process.env, { CRON_SECRET: "offline-hubspot-cron" });
const Route = await import("@/app/(provider)/api/cron/outbound-prepare/route");
const cron = async () => {
  const response = await Route.GET(
    new Request("http://localhost/api/cron/outbound-prepare", {
      headers: { authorization: "Bearer offline-hubspot-cron" },
    }),
  );
  assert.equal(response.status, 200);
  const output = await response.json();
  return output.hubspot as { status: string; jobId?: string };
};
const completedPreview = async () => {
  const started = value(
    await Sync.start("fixture", { requestId: randomUUID(), maxPages: 3 }),
  );
  value(await Sync.runPage({ job: started.jobId }, { readPage: provider }));
  value(await Sync.runPage({ job: started.jobId }, { readPage: provider }));
  return {
    job: started.jobId,
    expectedHash: value(await Sync.preview({ job: started.jobId })).previewHash,
  };
};
await db.execute(
  sql`truncate outbound_integration_job,outbound_campaign,outbound_company,outbound_person,outbound_prospect,outbound_event,outbound_revision,outbound_playbook,outbound_suppression cascade`,
);
value(
  await Store.savePlaybook("fixture", {
    ...defaultPlaybook,
    sendingEnabled: false,
  }),
);
const beforePolicy = await db.select().from(schema.outboundPlaybook);
const beforeHistory = await db.select().from(schema.outboundSendAttempt);

// An absent schedule remains inert even with a saved credential. No secret or metadata access at all.
assert.equal((await cron()).status, "disabled");
assert.equal(metadata.mock.calls.length, 0);
assert.equal(key.mock.calls.length, 0);
assert.equal(state.calls, 0);
assert.equal((await db.select().from(schema.outboundIntegrationJob)).length, 0);
const proof = await completedPreview();
assert.equal(
  (await Sync.enable("fixture", proof)).success,
  false,
  "a completed but unapplied preview is insufficient",
);
value(await Sync.apply("fixture", proof));
assert.equal(
  (await Sync.enable("fixture", { ...proof, expectedHash: "b".repeat(64) }))
    .success,
  false,
);
version.current = "b".repeat(64);
assert.equal((await Sync.enable("fixture", proof)).success, false);
version.current = "a".repeat(64);
const enabled = value(await Sync.enable("fixture", proof));
assert.equal(enabled.enabled, true);
assert.equal(value(await Sync.enable("fixture", proof)).epoch, enabled.epoch);
assert.equal(Date.parse(enabled.nextDueAt), Date.now() + HUBSPOT_REFRESH_MS);
assert.equal(value(await tick()).status, "not-due");
const originalRows = await rows();
const originalProof = await job(proof.job);
advance(HUBSPOT_REFRESH_MS);
state.domain = "daily-hubspot.test";
const started = await cron();
assert.equal(started.status, "started");
assert.equal(
  state.calls,
  2,
  "creating a daily job is a local stage, not a read",
);
assert(started.jobId);
const ownedInput = (await job(started.jobId)).input;
assert.equal(ownedInput["mode"], "preview-only");

// Concurrent ticks cannot duplicate a reserved page. Each invocation may perform at most one GET.
const entered = Promise.withResolvers<void>();
const release = Promise.withResolvers<void>();
const pending = tick(async (input) => {
  entered.resolve();
  await release.promise;
  return provider(input);
});
await entered.promise;
assert.equal(value(await tick()).status, "busy");
assert.equal(state.calls, 2);
release.resolve();
assert.equal(value(await pending).status, "pending");
assert.equal(state.calls, 3);
assert.deepEqual(await rows(), originalRows, "partial pages never apply");
assert.equal((await cron()).status, "complete");
assert.equal(state.calls, 4);
assert.deepEqual(
  await rows(),
  originalRows,
  "complete evidence applies on a separate bounded local stage",
);
assert.equal((await cron()).status, "applied");
assert.equal(state.calls, 4);
assert.equal((await rows()).length, 2);
assert.deepEqual(
  (await rows()).find((row) => row.id === originalRows[0]!.id),
  originalRows[0],
);
assert.equal(value(await tick()).status, "not-due");
assert.deepEqual(await job(proof.job), originalProof);
const good = value(await Sync.status()).lastGood!;
assert.equal(good.jobId, started.jobId);
const protectedRows = await rows();

// Failure never advances last-good or retries the reservation; a later daily run starts from companies/null.
advance(HUBSPOT_REFRESH_MS);
const failed = value(await tick());
assert(failed.jobId);
value(await tick());
const failedRead = await tick(async () => {
  state.calls++;
  return {
    success: false,
    error: new IntegrationError("hubspot", "rate-limit", "synthetic failure"),
  };
});
assert.equal(value(failedRead).status, "failed");
const failedJob = await job(failed.jobId);
const callsAfterFailure = state.calls;
assert.equal(value(await tick()).status, "failed");
assert.equal(value(await tick()).status, "not-due");
assert.equal(state.calls, callsAfterFailure);
assert.deepEqual(value(await Sync.status()).lastGood, good);
assert.deepEqual(await rows(), protectedRows);
assert.deepEqual(await job(failed.jobId), failedJob);

// A manual pending pull is never claimed by cron, even on a due day.
advance(HUBSPOT_REFRESH_MS);
const manual = value(
  await Sync.start("fixture", { requestId: randomUUID(), maxPages: 3 }),
);
const manualBefore = await job(manual.jobId);
assert.equal(value(await tick()).status, "manual-pull-active");
assert.deepEqual(await job(manual.jobId), manualBefore);
value(await Sync.runPage({ job: manual.jobId }, { readPage: provider }));
value(await Sync.runPage({ job: manual.jobId }, { readPage: provider }));
const next = value(await tick());
assert.equal(next.status, "started");
assert(next.jobId);
assert.equal(
  hubspotPullStateSchema.parse((await job(next.jobId)).output).after,
  null,
);

// A reserved request is never replayed after expiry. Disable fences even a response arriving later.
const lateEntered = Promise.withResolvers<void>();
const lateRelease = Promise.withResolvers<void>();
const late = tick(async (input) => {
  lateEntered.resolve();
  await lateRelease.promise;
  return provider(input);
});
await lateEntered.promise;
advance(60_001);
assert.equal(value(await tick()).status, "uncertain");
const uncertain = await job(next.jobId);
lateRelease.resolve();
assert.equal((await late).success, false);
assert.deepEqual(await job(next.jobId), uncertain);
assert.equal(value(await tick()).status, "uncertain");
assert.deepEqual(await rows(), protectedRows);
value(await Sync.disable("fixture"));
const afterDisable = state.calls;
assert.equal(value(await tick()).status, "disabled");
assert.equal(state.calls, afterDisable);
assert.equal(value(await Sync.status()).automatic, false);
assert.equal(
  (await Sync.enable("fixture", proof)).success,
  false,
  "the original applied preview is now stale",
);

// Re-enable is explicit and needs a new fresh applied snapshot. Rotation disables before another read.
const fresh = await completedPreview();
value(await Sync.apply("fixture", fresh));
value(await Sync.enable("fixture", fresh));
advance(HUBSPOT_REFRESH_MS);
const rotation = value(await tick());
assert(rotation.jobId);
const beforeRotationCalls = state.calls;
version.current = "b".repeat(64);
assert.equal(value(await Sync.status()).automatic, false);
assert.equal(value(await tick()).status, "credential-changed");
assert.equal(value(await Sync.status()).automation.enabled, false);
assert.equal((await job(rotation.jobId)).status, "failed");
assert.equal(state.calls, beforeRotationCalls);
assert.equal(value(await tick()).status, "disabled");
assert.equal(
  (await Sync.runPage({ job: rotation.jobId }, { readPage: provider })).success,
  false,
);
assert.equal((await Sync.enable("fixture", fresh)).success, false);
assert.equal(value(await Sync.status()).stale, true);

// Explicit disable/re-enable cannot reset the existing daily cooldown.
const rotatedProof = await completedPreview();
value(await Sync.apply("fixture", rotatedProof));
value(await Sync.enable("fixture", rotatedProof));
advance(HUBSPOT_REFRESH_MS);
const disabledPending = value(await tick());
assert(disabledPending.jobId);
value(await Sync.disable("fixture"));
assert.equal((await job(disabledPending.jobId)).status, "failed");
const pendingNextDue = value(await Sync.status()).automation.nextDueAt;
value(await Sync.enable("fixture", rotatedProof));
assert.equal(value(await Sync.status()).automation.nextDueAt, pendingNextDue);
assert.equal(value(await tick()).status, "not-due");
advance(HUBSPOT_REFRESH_MS);
const disabledInFlight = value(await tick());
assert(disabledInFlight.jobId);
const disableEntered = Promise.withResolvers<void>();
const disableRelease = Promise.withResolvers<void>();
const inFlight = tick(async (input) => {
  disableEntered.resolve();
  await disableRelease.promise;
  return provider(input);
});
await disableEntered.promise;
value(await Sync.disable("fixture"));
const fenced = await job(disabledInFlight.jobId);
assert.equal(fenced.status, "uncertain");
assert.equal(hubspotPullStateSchema.parse(fenced.output).pages.length, 0);
disableRelease.resolve();
assert.equal((await inFlight).success, false);
assert.deepEqual(await job(disabledInFlight.jobId), fenced);
assert.equal(value(await tick()).status, "disabled");

// An outage cannot leave stale unapplied work pinning the schedule forever. Its exact evidence is retained.
value(await Sync.enable("fixture", rotatedProof));
advance(HUBSPOT_REFRESH_MS);
const lastApplied = value(await Sync.status()).lastGood!;
const lastAppliedJob = await job(lastApplied.jobId);
for (const completed of [false, true]) {
  const outage = value(await tick());
  assert.equal(outage.status, "started");
  assert(outage.jobId);
  value(await tick());
  if (completed) value(await tick());
  const old = await job(outage.jobId);
  assert.equal(old.status, completed ? "complete" : "pending");
  const callsBeforeOutage: number = state.calls;
  advance(HUBSPOT_STALE_MS + 1);
  assert.equal(value(await tick()).status, "failed");
  assert.equal(state.calls, callsBeforeOutage);
  assert.deepEqual((await job(outage.jobId)).output, old.output);
  assert.equal(value(await Sync.status()).automation.currentJobId, null);
  assert.deepEqual(value(await Sync.status()).lastGood, lastApplied);
  assert.deepEqual(await job(lastApplied.jobId), lastAppliedJob);
}
const afterOutage = value(await tick());
assert.equal(afterOutage.status, "started");
assert(afterOutage.jobId);
assert.deepEqual(
  hubspotPullStateSchema.parse((await job(afterOutage.jobId)).output).pages,
  [],
);
assert.equal(
  hubspotPullStateSchema.parse((await job(afterOutage.jobId)).output).after,
  null,
);
advance(HUBSPOT_STALE_MS + 1);
assert.equal(value(await Sync.status()).stale, true);
assert.deepEqual(await db.select().from(schema.outboundPlaybook), beforePolicy);
assert.deepEqual(
  await db.select().from(schema.outboundSendAttempt),
  beforeHistory,
);
assert.deepEqual(await job(failed.jobId), failedJob);
console.log(
  "HubSpot daily lifecycle passed: default off, proof, cadence, concurrent reservation, additive apply, failure, rotation and reversible disable.",
);
setSystemTime();
process.exit(0);
