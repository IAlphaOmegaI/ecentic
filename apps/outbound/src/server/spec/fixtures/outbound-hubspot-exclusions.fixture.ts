import { mock, setSystemTime, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import {
  HUBSPOT_STALE_MS,
  hubspotPullStateSchema,
} from "@/lib/outbound-hubspot";
import { IntegrationError } from "@/server/utils/outbound/http";
import { requireTestDatabase } from "../helpers/database";

const endpoint = requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const { db, schema } = await import("@/server/database");
const Store = await import("@/server/app/outbound/store");
const Credentials = await import("@/server/app/outbound/provider-credentials");
const Sync = await import("@/server/app/outbound/hubspot-exclusions");
const independent = postgres(endpoint, { max: 1, onnotice: () => undefined });
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const version = { current: "a".repeat(64) };
spyOn(Credentials, "metadata").mockImplementation(async () => ({
  success: true,
  data: {
    configured: true,
    credentialStatus: "verified",
    configuration: {},
    version: version.current,
  },
}));
const key = spyOn(Credentials, "resolveKey").mockResolvedValue({
  success: true,
  data: "synthetic-only",
});
await db.execute(
  sql`truncate outbound_integration_job,outbound_campaign,outbound_company,outbound_person,outbound_prospect,outbound_event,outbound_revision,outbound_playbook,outbound_suppression cascade`,
);
value(
  await Store.savePlaybook("fixture", {
    ...defaultPlaybook,
    sendingEnabled: false,
  }),
);
const prospect = value(
  await Store.saveProspect(
    "fixture",
    prospectSchema.parse({
      company: "New CRM Company",
      name: "Fixture Person",
      email: "first@fresh-crm.test",
      domain: "fresh-crm.test",
      website: "https://fresh-crm.test",
      country: "US",
      title: "Founder",
    }),
  ),
);
await db.insert(schema.outboundSuppression).values({
  scope: "domain",
  value: "old-crm.test",
  reason: "Existing human opt-out",
  createdBy: "human",
});
const oldSuppression = await db.select().from(schema.outboundSuppression);
const boundary = async () => ({
  prospects: await db.select().from(schema.outboundProspect),
  policy: await db.select().from(schema.outboundPlaybook),
  revisions: await db.select().from(schema.outboundRevision),
  attempts: await db.select().from(schema.outboundSendAttempt),
});
const before = await boundary();
const requestId = randomUUID();
const first = value(await Sync.start("fixture", { requestId, maxPages: 4 }));
assert.equal(
  value(await Sync.start("fixture", { requestId, maxPages: 4 })).jobId,
  first.jobId,
);
assert.equal(key.mock.calls.length, 0);
assert.equal(
  (await Sync.start("fixture", { requestId: randomUUID() })).success,
  false,
);
assert.equal(value(await Sync.status()).automatic, false);
assert.equal(value(await Sync.status()).lastGood, null);
const record = (id: string, properties: Record<string, string | null>) => ({
  id,
  archived: false as const,
  updatedAt: new Date().toISOString(),
  properties,
});
const calls: { object: string; after: string | null }[] = [];
const provider: typeof import("@/server/utils/outbound/hubspot").readPage =
  async (input) => {
    calls.push({ object: input.object, after: input.after });
    const unlocked = await independent.begin(
      async (scope) =>
        scope`select pg_try_advisory_xact_lock(hashtext('ecentic-outbound-workspace')) as available`,
    );
    assert.equal(unlocked[0]!["available"], true);
    const response =
      input.object === "companies"
        ? input.after === null
          ? {
              results: [
                record("1", {
                  domain: "old-crm.test",
                  hs_additional_domains: "WWW.fresh-crm.test",
                }),
              ],
              paging: { next: { after: "second" } },
            }
          : {
              results: [
                record("2", { domain: null }),
                record("3", { domain: "https://invalid-company.test/path" }),
              ],
            }
        : {
            results: [
              record("4", {
                email: "FIRST@fresh-crm.test",
                hs_additional_emails: "other@gmail.com;bad address",
              }),
              record("5", { email: null }),
            ],
          };
    return {
      success: true,
      data: { value: response, status: 200, retryAfterSeconds: null },
    };
  };
value(await Sync.runPage({ job: first.jobId }, { readPage: provider }));
assert.equal(value(await Sync.preview({ job: first.jobId })).complete, false);
assert.equal(
  (
    await Sync.apply("fixture", {
      job: first.jobId,
      expectedHash: value(await Sync.preview({ job: first.jobId })).previewHash,
    })
  ).success,
  false,
);
value(await Sync.runPage({ job: first.jobId }, { readPage: provider }));
value(await Sync.runPage({ job: first.jobId }, { readPage: provider }));
assert.deepEqual(calls, [
  { object: "companies", after: null },
  { object: "companies", after: "second" },
  { object: "contacts", after: null },
]);
const preview = value(await Sync.preview({ job: first.jobId }));
assert.equal(preview.complete, true);
assert.equal(preview.entries.length, 4);
assert.equal(preview.skipped.length, 2);
assert.equal(preview.unaddressableRecords, 3);
assert(
  !preview.entries.some(
    (entry) => entry.scope === "domain" && entry.value === "gmail.com",
  ),
);
assert.equal(
  preview.entries.find((entry) => entry.value === "fresh-crm.test")!.sources[0]!
    .id,
  "1",
);
assert.deepEqual(
  await db.select().from(schema.outboundSuppression),
  oldSuppression,
);
assert.equal(
  (
    await Sync.apply("fixture", {
      job: first.jobId,
      expectedHash: "b".repeat(64),
    })
  ).success,
  false,
);
version.current = "b".repeat(64);
assert.equal(
  (
    await Sync.apply("fixture", {
      job: first.jobId,
      expectedHash: preview.previewHash,
    })
  ).success,
  false,
);
version.current = "a".repeat(64);
const applied = value(
  await Sync.apply("fixture", {
    job: first.jobId,
    expectedHash: preview.previewHash,
  }),
);
assert.equal(applied.added, 3);
assert.equal(applied.existing, 1);
assert.equal(
  value(
    await Sync.apply("fixture", {
      job: first.jobId,
      expectedHash: preview.previewHash,
    }),
  ).repeated,
  true,
);
assert.deepEqual(
  (
    await db
      .select()
      .from(schema.outboundSuppression)
      .where(eq(schema.outboundSuppression.id, oldSuppression[0]!.id))
  )[0],
  oldSuppression[0],
);
assert.equal(
  value(await Store.getEnrichmentContext(prospect.prospect)).suppressed,
  true,
);
assert.deepEqual(await boundary(), before);
assert.equal(value(await Sync.status()).lastGood!.jobId, first.jobId);
version.current = "b".repeat(64);
assert.equal(value(await Sync.status()).credentialChanged, true);
assert.equal(value(await Sync.status()).stale, true);
version.current = "a".repeat(64);

const [savedFirst] = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(eq(schema.outboundIntegrationJob.id, first.jobId));
assert(savedFirst);
const altered = hubspotPullStateSchema.parse(savedFirst.output);
altered.pages[0]!.response.results[0]!.properties.domain = "invented.test";
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: altered })
  .where(eq(schema.outboundIntegrationJob.id, first.jobId));
assert.equal((await Sync.preview({ job: first.jobId })).success, false);
assert.equal(
  (
    await Sync.apply("fixture", {
      job: first.jobId,
      expectedHash: preview.previewHash,
    })
  ).success,
  false,
);
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: savedFirst.output })
  .where(eq(schema.outboundIntegrationJob.id, first.jobId));

const failure = value(await Sync.start("fixture", { requestId: randomUUID() }));
value(await Sync.runPage({ job: failure.jobId }, { readPage: provider }));
const unavailable = mock(async () => ({
  success: false as const,
  error: new IntegrationError(
    "hubspot",
    "rate-limit",
    "secret must not be stored",
    429,
  ),
}));
value(await Sync.runPage({ job: failure.jobId }, { readPage: unavailable }));
value(await Sync.runPage({ job: failure.jobId }, { readPage: unavailable }));
assert.equal(unavailable.mock.calls.length, 1);
assert.equal(value(await Sync.status()).lastGood!.jobId, first.jobId);
assert(
  !JSON.stringify(value(await Sync.preview({ job: failure.jobId }))).includes(
    "secret must not",
  ),
);

const loop = value(await Sync.start("fixture", { requestId: randomUUID() }));
value(
  await Sync.runPage(
    { job: loop.jobId },
    {
      readPage: async () => ({
        success: true,
        data: {
          status: 200,
          retryAfterSeconds: null,
          value: { results: [], paging: { next: { after: "loop" } } },
        },
      }),
    },
  ),
);
value(
  await Sync.runPage(
    { job: loop.jobId },
    {
      readPage: async () => ({
        success: true,
        data: {
          status: 200,
          retryAfterSeconds: null,
          value: { results: [], paging: { next: { after: "loop" } } },
        },
      }),
    },
  ),
);
assert.equal(value(await Sync.preview({ job: loop.jobId })).status, "failed");

const foreign = value(await Sync.start("fixture", { requestId: randomUUID() }));
const foreignToken = randomUUID();
const changed = await Sync.runPage(
  { job: foreign.jobId },
  {
    readPage: async () => {
      await db.execute(
        sql`update outbound_integration_job set output=jsonb_set(output,'{lease,token}',${JSON.stringify(foreignToken)}::jsonb) where id=${foreign.jobId}`,
      );
      return {
        success: true,
        data: { status: 200, retryAfterSeconds: null, value: { results: [] } },
      };
    },
  },
);
assert.equal(changed.success, false);
const [foreignRow] = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(eq(schema.outboundIntegrationJob.id, foreign.jobId));
assert.equal(
  hubspotPullStateSchema.parse(foreignRow?.output).lease?.token,
  foreignToken,
);
setSystemTime(new Date(Date.now() + 61_000));
value(await Sync.runPage({ job: foreign.jobId }, { readPage: provider }));
assert.equal(
  value(await Sync.preview({ job: foreign.jobId })).status,
  "uncertain",
);

const expired = value(await Sync.start("fixture", { requestId: randomUUID() }));
const expiredCalls = { count: 0 };
value(
  await Sync.runPage(
    { job: expired.jobId },
    {
      readPage: async () => {
        expiredCalls.count += 1;
        setSystemTime(new Date(Date.now() + 61_000));
        return {
          success: true,
          data: {
            status: 200,
            retryAfterSeconds: null,
            value: { results: [] },
          },
        };
      },
    },
  ),
);
assert.equal(
  value(await Sync.preview({ job: expired.jobId })).status,
  "uncertain",
);
value(await Sync.runPage({ job: expired.jobId }, { readPage: provider }));
assert.equal(expiredCalls.count, 1);
assert.equal(value(await Sync.preview({ job: expired.jobId })).pages, 0);

const limited = value(
  await Sync.start("fixture", { requestId: randomUUID(), maxPages: 2 }),
);
for (const after of ["two", "three"])
  value(
    await Sync.runPage(
      { job: limited.jobId },
      {
        readPage: async () => ({
          success: true,
          data: {
            status: 200,
            retryAfterSeconds: null,
            value: { results: [], paging: { next: { after } } },
          },
        }),
      },
    ),
  );
assert.equal(
  value(await Sync.preview({ job: limited.jobId })).status,
  "failed",
);
assert.equal(value(await Sync.preview({ job: limited.jobId })).pages, 2);
assert.equal(value(await Sync.status()).lastGood!.jobId, first.jobId);

const changedCredential = value(
  await Sync.start("fixture", { requestId: randomUUID() }),
);
value(
  await Sync.runPage(
    { job: changedCredential.jobId },
    {
      readPage: async () => {
        version.current = "b".repeat(64);
        return {
          success: true,
          data: {
            status: 200,
            retryAfterSeconds: null,
            value: { results: [] },
          },
        };
      },
    },
  ),
);
assert.equal(
  value(await Sync.preview({ job: changedCredential.jobId })).status,
  "uncertain",
);
version.current = "a".repeat(64);

const empty = value(await Sync.start("fixture", { requestId: randomUUID() }));
const emptyPage: typeof provider = async () => ({
  success: true,
  data: { status: 200, retryAfterSeconds: null, value: { results: [] } },
});
value(await Sync.runPage({ job: empty.jobId }, { readPage: emptyPage }));
value(await Sync.runPage({ job: empty.jobId }, { readPage: emptyPage }));
const emptyPreview = value(await Sync.preview({ job: empty.jobId }));
value(
  await Sync.apply("fixture", {
    job: empty.jobId,
    expectedHash: emptyPreview.previewHash,
  }),
);
assert.equal((await db.select().from(schema.outboundSuppression)).length, 4);
assert.equal(value(await Sync.status()).lastGood!.jobId, empty.jobId);
setSystemTime(new Date(Date.now() + HUBSPOT_STALE_MS + 1));
assert.equal(value(await Sync.status()).stale, true);
assert.equal(
  value(await Store.getEnrichmentContext(prospect.prospect)).suppressed,
  true,
);
assert.deepEqual(await boundary(), before);
setSystemTime();
await independent.end();
console.log(
  "HubSpot preview/apply lifecycle passed: bounded GETs, exact proof, additive exclusions, last-good/stale, lease and immutable outreach history.",
);
process.exit(0);
