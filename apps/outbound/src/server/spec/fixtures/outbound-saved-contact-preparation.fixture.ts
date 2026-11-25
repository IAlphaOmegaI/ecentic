import { mock } from "bun:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
import { LEGACY_CONTACT_IMPORT_ACTOR } from "@/lib/outbound-saved-contact";
import type {
  CompanyEvidence,
  Qualification,
} from "@/server/utils/outbound/automation-qualification";
import { IntegrationError } from "@/server/utils/outbound/http";
import type {
  AiCapture,
  AiJob,
  BrowserResearch,
  RawCapture,
  Source,
} from "@/server/utils/outbound/live-shopping-contract";
import { requireTestDatabase } from "../helpers/database";

const endpoint = requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const { db, schema } = await import("@/server/database");
const Store = await import("@/server/app/outbound/store");
const Preparation = await import(
  "@/server/app/outbound/saved-contact-preparation"
);
const Assessment = await import("@/server/utils/outbound/shopping-assessment");
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const settings = {
  ...defaultPlaybook,
  automationEnabled: true,
  trustSavedContactVerification: true,
  requireShoppingEvidence: true,
  allowStaleEvidence: true,
  senderConfirmed: true,
  targetRoles: "Founder",
  excludedRoles: "intern",
  maxBodyWords: 99,
};
const seed = async (count = 1) => {
  await db.execute(
    sql`truncate outbound_integration_job,outbound_campaign,outbound_company,outbound_person,outbound_prospect,outbound_event,outbound_revision,outbound_playbook,outbound_suppression,outbound_inbox cascade`,
  );
  await db
    .insert(schema.outboundPlaybook)
    .values({ id: "default", revision: 1, settings, updatedBy: "fixture" });
  const campaignId = randomUUID();
  await db.insert(schema.outboundCampaign).values({
    id: campaignId,
    name: "Saved contacts",
    status: "active",
    criteria: defaultCampaignCriteria(settings),
    revision: 1,
    createdBy: "fixture",
    updatedBy: "fixture",
  });
  const prospects: string[] = [];
  for (const index of Array.from({ length: count }, (_, index) => index)) {
    const domain = `saved${index}.test`;
    const saved = value(
      await Store.saveProspect(
        LEGACY_CONTACT_IMPORT_ACTOR,
        prospectSchema.parse({
          company: `Saved Goods ${index}`,
          domain,
          website: `https://${domain}`,
          country: "US",
          name: "Alex Smith",
          first: "Alex",
          title: "Founder",
          email: `alex@${domain}`,
          emailStatus: "verified",
          emailSource: "StoreInspect (verified)",
          source:
            "legacy W46: StoreInspect export 2026-11-10 (A: $500K-$10M, marketing/e-com contact)",
          emailVerifiedAt: "",
          roleSource: "",
          roleCheckedAt: "",
          timezone: "",
        }),
      ),
    );
    prospects.push(saved.prospect);
  }
  return { campaignId, prospects, batchId: randomUUID(), maxQueries: 50 };
};
const evidence = (domain: string): CompanyEvidence => {
  const product = {
    name: "Linen tote",
    brand: `Saved Goods ${domain.match(/\d+/)?.[0] ?? "0"}`,
    url: `https://${domain}/products/tote`,
    description: "Own brand linen tote",
    price: 25,
    currency: "USD",
  };
  const receipt = {
    checkedAt: new Date().toISOString(),
    sha256: "a".repeat(64),
  };
  return {
    platform: "shopify",
    product,
    receipts: [
      {
        ...receipt,
        url: `https://${domain}`,
        kind: "storefront",
        excerpt:
          "Our own brand linen tote. Available in retail stores. 123 Main Street, New York, NY 10001",
      },
      {
        ...receipt,
        url: product.url,
        kind: "product",
        excerpt: `Our own brand linen tote. Available in retail stores. 123 Main Street, New York, NY 10001\nObserved structured product: ${JSON.stringify(product)}`,
      },
    ],
  };
};
const captured = (job: AiJob) => {
  const timestamp = new Date().toISOString();
  const domain = new URL(job.query.product.url).origin;
  const raw = (url: string, body: string, status = 200): RawCapture => ({
    url,
    body,
    status,
    receivedAt: timestamp,
    sha256: createHash("sha256").update(body).digest("hex"),
  });
  const source = (
    id: string,
    kind: Source["kind"],
    capture: Source["capture"],
    raw: RawCapture,
  ): Source => ({
    id,
    kind,
    capture,
    url: raw.url,
    content: raw.body,
    checkedAt: timestamp,
    artifact: `sha256:${raw.sha256}`,
  });
  const answerRaw = raw(
    "https://www.google.com/search?q=linen+tote",
    "Saved Goods Linen tote costs $30 for the large variant. USD, one-time purchase.",
  );
  const productRaw = raw(
    job.query.product.url,
    "Linen tote Large $25.00. USD, one-time purchase. Small is a separate option.",
  );
  const ucpRaw = raw(`${domain}/.well-known/ucp`, "404 Not Found", 404);
  const answer: AiCapture = {
    job,
    executedAt: timestamp,
    receivedAt: timestamp,
    answer: answerRaw.body,
    source: source("answer", "search", "provider", answerRaw),
    links: [],
    cached: false,
    raw: [answerRaw],
  };
  const browser: Extract<BrowserResearch, { status: "captured" }> = {
    status: "captured",
    sources: [
      source("product", "product", "browser", productRaw),
      source("ucp", "ucp", "http", ucpRaw),
    ],
    raw: [productRaw, ucpRaw],
    ucp: {
      url: ucpRaw.url,
      status: "notObserved",
      httpStatus: 404,
      capabilities: [],
      sourceIds: ["ucp"],
    },
    checkout: {
      status: "notTested",
      sourceIds: [],
      notes: "No checkout interaction.",
    },
    candidates: [],
    limitations: ["Market was not independently established."],
  };
  return { answer, browser };
};
const calls = { start: 0, poll: 0, collect: 0, browse: 0, qualify: 0 };
const dependencies: Parameters<typeof Preparation.run>[1] = {
  resolveKey: async () => ({ success: true, data: "synthetic-fixture-key" }),
  mx: async () => ({
    success: true,
    data: {
      provider: "google",
      checkedAt: new Date().toISOString(),
      records: ["aspmx.l.google.com"],
    },
  }),
  collect: async ({ company }) => {
    calls.collect += 1;
    return { success: true, data: evidence(company.domain) };
  },
  location: async () => ({ success: true, data: [] }),
  qualify: async ({ evidence }) => {
    calls.qualify += 1;
    const qualified: Qualification = {
      status: "qualified",
      receipts: evidence.receipts,
      companyEvidence: evidence,
      assessment: {
        decision: "qualified",
        reason: "The source supports an established physical product brand.",
        productCategory: "home goods",
        ownBrandEvidence: null,
        physicalProductEvidence: null,
        establishedEvidence: null,
        criteriaEvidence: [],
        criteriaSatisfied: true,
        productInsight: null,
      },
      usage: { inputTokens: 20, outputTokens: 20 },
      providerRequestId: "fixture",
      details: {
        productCategory: "home goods",
        legitEvidence: "Own physical product brand with retail distribution.",
        productInsight: null,
      },
    };
    return { success: true, data: qualified };
  },
  start: async ({ query }) => {
    calls.start += 1;
    return {
      success: true,
      data: { id: randomUUID(), query, submittedAt: new Date().toISOString() },
    };
  },
  poll: async ({ job }) => {
    calls.poll += 1;
    return {
      success: true,
      data: { status: "captured", capture: captured(job).answer },
    };
  },
  browse: async ({ answer }) => {
    calls.browse += 1;
    return { success: true, data: captured(answer.job).browser };
  },
  assess: async ({ answer, browser }) =>
    Assessment.assembleResearch(
      { answer, browser },
      {
        decision: "supported",
        reason: "A variant-specific price difference was observed.",
        competitors: [],
        selected: {
          kind: "product-data-gap",
          observation:
            "The answer puts the large Linen tote at $30, while the product page shows $25.",
          consequence: "Should those two prices match for the large size?",
          askAbout: "the large Linen tote",
          scope:
            "One captured answer and rendered product page. The response market and checkout were not established.",
          sourceIds: ["answer", "product"],
          quotes: [
            {
              sourceId: "answer",
              quote: "Linen tote costs $30 for the large variant",
            },
            { sourceId: "product", quote: "Linen tote Large $25.00" },
          ],
        },
      },
      14,
    ),
};
const firstProspect = (batch: { prospects: string[] }) => {
  const prospect = batch.prospects[0];
  assert.ok(prospect, "Expected a seeded prospect");
  return prospect;
};
const jobFor = async (id: string) => {
  const job = (
    await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(
        eq(
          schema.outboundIntegrationJob.requestId,
          `saved-contact-preparation:${id}`,
        ),
      )
  )[0];
  assert.ok(job, "Expected a saved preparation job");
  return job;
};
const release = async () => {
  await db.execute(
    sql`update outbound_integration_job set output = jsonb_set(output, '{availableAt}', to_jsonb('2000-01-01T00:00:00.000Z'::text)) where input->>'operation' = 'savedContactPreparation' and status = 'pending'`,
  );
};
const run = (
  batchId: string,
  overrides: Parameters<typeof Preparation.run>[1] = {},
  maxSteps = 40,
) =>
  Preparation.run(
    { batchId, maxSteps, deadline: Date.now() + 240_000 },
    { ...dependencies, ...overrides },
  );

// An entire unsent legacy prospect is prepared using its original ID, source, and dates.
const first = await seed();
const queued = value(await Preparation.enqueue("fixture-operator", first));
assert.ok(queued.results[0]?.jobId, JSON.stringify(queued));
assert.equal(
  value(await Preparation.enqueue("fixture-operator", first)).results[0]
    ?.repeated,
  true,
);
value(await run(first.batchId));
assert.equal(calls.start, 1);
const pending = await jobFor(firstProspect(first));
assert.equal(pending.output?.["stage"], "poll");
await release();
value(await run(first.batchId));
const finished = await jobFor(firstProspect(first));
assert.equal(finished.status, "complete", JSON.stringify(finished));
assert.equal(finished.output?.["stage"], "complete");
assert.equal(calls.start, 1);
assert.equal(calls.collect, 1);
assert.equal(calls.qualify, 1);
assert.equal(calls.browse, 1);
const prospect = value(await Store.readProspect(firstProspect(first)));
assert.ok(prospect);
assert.equal(prospect.campaignId, first.campaignId);
assert.equal(prospect.status, "draft");
assert.equal(prospect.details.emailVerifiedAt, "");
assert.equal(prospect.details.roleCheckedAt, "");
assert.equal(prospect.details.timezone, "America/New_York");
assert.equal(prospect.createdBy, LEGACY_CONTACT_IMPORT_ACTOR);
assert.ok(prospect.details.shoppingResearchId);
const research = (
  await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(
      eq(schema.outboundIntegrationJob.id, prospect.details.shoppingResearchId),
    )
)[0];
assert.equal(research?.output?.["provenance"], "provider-observed");
assert.equal(prospect.sentStep, 0);
value(await run(first.batchId));
assert.equal(calls.start, 1, "completed jobs must not repeat providers");

// All reservations count forever across the batch, including an uncertain POST.
const capped = { ...(await seed(2)), maxQueries: 1 };
value(await Preparation.enqueue("fixture-operator", capped));
const before = calls.start;
value(
  await run(capped.batchId, {
    start: async () => {
      calls.start += 1;
      return {
        success: false,
        error: new IntegrationError(
          "scrapellm",
          "uncertain",
          "The paid submission lost its response.",
        ),
      };
    },
  }),
);
assert.equal(calls.start, before + 1);
assert.equal(
  (
    await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.id, capped.batchId))
  )[0]?.output?.["queriesReserved"],
  1,
);
await release();
value(await run(capped.batchId));
assert.equal(
  calls.start,
  before + 1,
  "uncertain queries and used reservations must not replay",
);

// Known provider quota pauses the rest of the batch before another paid request.
const quota = await seed(2);
value(await Preparation.enqueue("fixture-operator", quota));
const beforeQuota = calls.start;
value(
  await run(quota.batchId, {
    start: async () => {
      calls.start += 1;
      return {
        success: false,
        error: new IntegrationError(
          "scrapellm",
          "quota",
          "Research credits exhausted.",
          402,
        ),
      };
    },
  }),
);
assert.equal(calls.start, beforeQuota + 1);
assert.equal(
  (
    await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.id, quota.batchId))
  )[0]?.output?.["paused"],
  true,
);
value(await run(quota.batchId));
assert.equal(calls.start, beforeQuota + 1);

// An opt-out after enqueue prevents even free external preflight and preserves the closed state.
const stopped = await seed();
value(await Preparation.enqueue("fixture-operator", stopped));
await db
  .update(schema.outboundProspect)
  .set({ status: "optedOut" })
  .where(eq(schema.outboundProspect.id, firstProspect(stopped)));
value(
  await run(stopped.batchId, {
    mx: async () => {
      throw new Error("Opted-out contact reached external DNS");
    },
  }),
);
assert.equal((await jobFor(firstProspect(stopped))).status, "failed");
assert.equal(
  value(await Store.readProspect(firstProspect(stopped)))?.status,
  "optedOut",
);

// Reply/suppression during a capture retains the observation but stops the next paid stage.
const suppressed = await seed();
value(await Preparation.enqueue("fixture-operator", suppressed));
const collectBefore = calls.collect;
value(
  await run(suppressed.batchId, {
    collect: async ({ company }) => {
      await db.insert(schema.outboundSuppression).values({
        scope: "email",
        value: `alex@${company.domain}`,
        reason: "opt-out",
        createdBy: "fixture",
      });
      calls.collect += 1;
      return { success: true, data: evidence(company.domain) };
    },
  }),
);
const stoppedJob = await jobFor(firstProspect(suppressed));
assert.equal(calls.collect, collectBefore + 1);
assert.equal(stoppedJob.status, "failed");
assert.ok(
  stoppedJob.output?.["companyEvidence"],
  "actual captured source remains available after the opt-out",
);

// Discovery deduplication reuses the exact saved contact; real exclusions remain held.
const deduped = await seed();
const duplicateCompany = randomUUID();
await db.insert(schema.outboundCampaignCompany).values({
  id: duplicateCompany,
  campaignId: deduped.campaignId,
  domain: "saved0.test",
  name: "Saved Goods 0",
  website: "https://saved0.test",
  country: "US",
  source: "apollo",
  sourceId: "original-apollo-id",
  status: "excluded",
  reason: "existingProspect",
  criteriaRevision: 1,
});
const dedupeQueued = value(
  await Preparation.enqueue("fixture-operator", deduped),
);
assert.ok(dedupeQueued.results[0]?.jobId, JSON.stringify(dedupeQueued));
const beforeDeduped = calls.start;
value(await run(deduped.batchId, {}, 4));
const reused = (
  await db
    .select()
    .from(schema.outboundCampaignCompany)
    .where(eq(schema.outboundCampaignCompany.id, duplicateCompany))
)[0];
assert.equal(reused?.status, "added");
assert.equal(reused?.reason, "");
assert.equal(reused?.prospectId, firstProspect(deduped));
assert.equal(reused?.source, "apollo");
assert.equal(
  calls.start,
  beforeDeduped,
  "deduplication should not itself spend a query",
);

const explicitlyExcluded = await seed();
await db.insert(schema.outboundCampaignCompany).values({
  campaignId: explicitlyExcluded.campaignId,
  domain: "saved0.test",
  name: "Saved Goods 0",
  website: "https://saved0.test",
  source: "apollo",
  status: "excluded",
  reason: "operator-excluded",
  criteriaRevision: 1,
});
assert.ok(
  value(await Preparation.enqueue("fixture-operator", explicitlyExcluded))
    .results[0]?.error,
);
const wrongContact = await seed(2);
await db.insert(schema.outboundCampaignCompany).values({
  campaignId: wrongContact.campaignId,
  domain: "saved0.test",
  name: "Saved Goods 0",
  website: "https://saved0.test",
  source: "apollo",
  status: "excluded",
  reason: "existingProspect",
  prospectId: wrongContact.prospects[1],
  criteriaRevision: 1,
});
assert.ok(
  value(
    await Preparation.enqueue("fixture-operator", {
      ...wrongContact,
      prospects: [firstProspect(wrongContact)],
    }),
  ).results[0]?.error,
);

// An expired paid claim is uncertain, never submitted a second time.
const expired = await seed();
value(await Preparation.enqueue("fixture-operator", expired));
const expiredJob = await jobFor(firstProspect(expired));
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "starting",
    output: {
      ...expiredJob.output,
      stage: "query",
      queryReservedAt: "2026-01-01T00:00:00.000Z",
      lease: { token: randomUUID(), expiresAt: "2026-01-01T00:00:00.000Z" },
    },
  })
  .where(eq(schema.outboundIntegrationJob.id, expiredJob.id));
const expiredBefore = calls.start;
value(await run(expired.batchId));
assert.equal((await jobFor(firstProspect(expired))).status, "uncertain");
assert.equal(calls.start, expiredBefore);

assert.equal(
  Preparation.enqueueSchema.safeParse({ ...expired, maxQueries: 51 }).success,
  false,
);
assert.equal((await db.select().from(schema.outboundSendAttempt)).length, 0);

// An explicit, source-validated correction reuses saved evidence and records the original model error.
const reviewed = await seed();
value(await Preparation.enqueue("fixture-operator", reviewed));
const reviewedEvidence = evidence("saved0.test");
const source = reviewedEvidence.receipts[0];
assert.ok(source);
const supported = {
  url: source.url,
  quote: "Our own brand linen tote. Available in retail stores.",
};
const corrected = {
  decision: "qualified" as const,
  reason: "Own physical product brand with observed retail distribution.",
  productCategory: "linen tote",
  ownBrandEvidence: supported,
  physicalProductEvidence: supported,
  establishedEvidence: supported,
  criteriaEvidence: [supported],
  criteriaSatisfied: true,
  productInsight: null,
};
const invented = {
  ...corrected,
  criteriaEvidence: [
    supported,
    { url: source.url, quote: "The company was established in 2016." },
  ],
};
value(
  await run(reviewed.batchId, {
    qualify: async ({ evidence }) => ({
      success: true,
      data: {
        status: "hold",
        reason: "An assessment quote was not in the original source.",
        retryable: false,
        receipts: evidence.receipts,
        companyEvidence: evidence,
        assessment: invented,
        usage: { inputTokens: 100, outputTokens: 100 },
        providerRequestId: "original-fixture-model-call",
      },
    }),
  }),
);
const held = await jobFor(firstProspect(reviewed));
assert.equal(held.status, "complete");
const reviewedInput = {
  jobId: held.id,
  requestId: randomUUID(),
  expectedUpdatedAt: held.updatedAt.toISOString(),
  assessment: corrected,
  note: "Reviewed exact source text: the existing physical product and retail distribution quotations support the campaign. Removed the unsupported founding year.",
};
const callsBeforeReview = calls.start;
assert.equal(
  (
    await Preparation.reviewQualification("fixture-reviewer", {
      ...reviewedInput,
      assessment: invented,
    })
  ).success,
  false,
);
assert.equal(
  value(
    await Preparation.reviewQualification("fixture-reviewer", reviewedInput),
  ).repeated,
  false,
);
assert.equal(
  value(
    await Preparation.reviewQualification("fixture-reviewer", reviewedInput),
  ).repeated,
  true,
);
const repaired = await jobFor(firstProspect(reviewed));
assert.equal(repaired.output?.["stage"], "applyCompany");
assert.ok(repaired.output?.["originalQualification"]);
assert.ok(repaired.output?.["qualificationReview"]);
assert.equal(
  calls.start,
  callsBeforeReview,
  "reviewing captured source evidence must not make a provider request",
);
assert.equal(
  (
    await Preparation.reviewQualification("fixture-reviewer", {
      ...reviewedInput,
      requestId: randomUUID(),
    })
  ).success,
  false,
);
// A reviewed parser correction can retry only a completed, unpaid own-site product hold.
const parserRetry = await seed();
value(await Preparation.enqueue("fixture-operator", parserRetry));
const parserReason =
  "No unambiguous own-brand priced physical product was established from the bounded public pages.";
const parserReceipts = evidence("saved0.test").receipts;
const parserCollection = {
  status: "hold" as const,
  reason: parserReason,
  retryable: false,
  receipts: parserReceipts,
};
value(
  await run(parserRetry.batchId, {
    collect: async () => ({ success: true, data: parserCollection }),
  }),
);
const parserHeld = await jobFor(firstProspect(parserRetry));
assert.equal(parserHeld.status, "complete");
const retryInput = {
  jobId: parserHeld.id,
  requestId: randomUUID(),
  expectedUpdatedAt: parserHeld.updatedAt.toISOString(),
  reason:
    "Reviewed the stored own-site product receipt against the corrected product parser; retry only free collection with all normal source checks.",
};
const beforeRetry = { ...calls };
assert.equal(
  (
    await Preparation.retryCollection("fixture-reviewer", {
      ...retryInput,
      expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
    })
  ).success,
  false,
);
for (const restriction of [
  { status: "uncertain" as const },
  { status: "starting" as const },
  {
    output: {
      ...parserHeld.output,
      queryReservedAt: new Date().toISOString(),
    },
  },
  {
    output: {
      ...parserHeld.output,
      collection: { ...parserCollection, retryable: true },
    },
  },
  {
    output: {
      ...parserHeld.output,
      collection: {
        ...parserCollection,
        receipts: parserReceipts.filter(({ kind }) => kind !== "product"),
      },
    },
  },
  {
    output: {
      ...parserHeld.output,
      collection: {
        ...parserCollection,
        receipts: parserReceipts.map((receipt) => ({
          ...receipt,
          url: receipt.url.replace("saved0.test", "different.test"),
        })),
      },
    },
  },
  ...[
    "Storefront robots rules do not allow this public page to be collected.",
    "The storefront returned a restricted response (403).",
    "No usable storefront document was returned within the collection limits.",
  ].map((reason) => ({
    output: {
      ...parserHeld.output,
      heldReason: reason,
      collection: { ...parserCollection, reason },
    },
  })),
]) {
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "complete",
      output: parserHeld.output,
      updatedAt: parserHeld.updatedAt,
      ...restriction,
    })
    .where(eq(schema.outboundIntegrationJob.id, parserHeld.id));
  assert.equal(
    (await Preparation.retryCollection("fixture-reviewer", retryInput)).success,
    false,
    "a reviewed parser retry must not resume restricted or paid work",
  );
}
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "complete",
    output: parserHeld.output,
    updatedAt: parserHeld.updatedAt,
  })
  .where(eq(schema.outboundIntegrationJob.id, parserHeld.id));
await db
  .update(schema.outboundCampaign)
  .set({ revision: 2 })
  .where(eq(schema.outboundCampaign.id, parserRetry.campaignId));
assert.equal(
  (await Preparation.retryCollection("fixture-reviewer", retryInput)).success,
  false,
  "changed campaign criteria require a new review",
);
await db
  .update(schema.outboundCampaign)
  .set({ revision: 1 })
  .where(eq(schema.outboundCampaign.id, parserRetry.campaignId));
assert.equal(
  value(await Preparation.retryCollection("fixture-reviewer", retryInput))
    .repeated,
  false,
);
assert.equal(
  value(await Preparation.retryCollection("fixture-reviewer", retryInput))
    .repeated,
  true,
);
const retried = await jobFor(firstProspect(parserRetry));
assert.equal(retried.status, "pending");
assert.equal(retried.output?.["stage"], "collect");
assert.equal(retried.output?.["lease"], null);
assert.equal(retried.output?.["heldReason"], null);
assert.equal(retried.output?.["collection"], undefined);
assert.deepEqual(retried.output?.["originalCollection"], parserCollection);
assert.deepEqual(calls, beforeRetry, "reviewing must not call any provider");
assert.equal(
  (
    await Preparation.retryCollection("fixture-reviewer", {
      ...retryInput,
      requestId: randomUUID(),
    })
  ).success,
  false,
);
assert.equal(
  (
    await Preparation.retryCollection("fixture-reviewer", {
      ...retryInput,
      reason: "A different review cannot reuse the first request identifier.",
    })
  ).success,
  false,
);
const retryBudget = (
  await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, parserRetry.batchId))
)[0];
assert.equal(retryBudget?.output?.["queriesReserved"], 0);
value(await run(parserRetry.batchId, {}, 1));
assert.equal(
  (await jobFor(firstProspect(parserRetry))).output?.["stage"],
  "qualify",
);
assert.equal(calls.start, beforeRetry.start);
assert.equal(calls.collect, beforeRetry.collect + 1);
// Reviewed location corrections reuse the original public address without a new lookup.
const locationReview = await seed();
value(await Preparation.enqueue("fixture-operator", locationReview));
const productWithoutAddress = evidence("saved0.test");
productWithoutAddress.receipts = productWithoutAddress.receipts.map(
  (receipt) => ({
    ...receipt,
    excerpt: receipt.excerpt.replace(
      " 123 Main Street, New York, NY 10001",
      "",
    ),
  }),
);
value(
  await run(
    locationReview.batchId,
    {
      collect: async () => ({ success: true, data: productWithoutAddress }),
    },
    2,
  ),
);
const beforeLocation = await jobFor(firstProspect(locationReview));
assert.equal(beforeLocation.output?.["stage"], "location");
const originalAddress = {
  url: "https://saved0.test/pages/contact-us",
  kind: "company" as const,
  checkedAt: new Date(Date.now() - 5000).toISOString(),
  sha256: "b".repeat(64),
  excerpt: "LOCATION: 2141 Blount Road Pompano Beach, Florida, 33069 USA",
};
const locationHeldOutput = {
  ...beforeLocation.output,
  stage: "complete",
  lease: null,
  locationReceipts: [originalAddress],
  heldReason:
    "No unambiguous public business address was found for local sending hours.",
};
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "complete",
    output: locationHeldOutput,
    updatedAt: new Date(),
  })
  .where(eq(schema.outboundIntegrationJob.id, beforeLocation.id));
const locationHeld = await jobFor(firstProspect(locationReview));
const locationInput = {
  jobId: locationHeld.id,
  requestId: randomUUID(),
  expectedUpdatedAt: locationHeld.updatedAt.toISOString(),
  reason:
    "Reviewed the original stored contact-page address after the full-state-name parser correction. Preserve the captured source and observation time.",
};
const beforeLocationCalls = { ...calls };
assert.equal(
  (
    await Preparation.resumeLocation("fixture-reviewer", {
      ...locationInput,
      expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
    })
  ).success,
  false,
);
for (const restriction of [
  { status: "uncertain" as const },
  {
    output: {
      ...locationHeldOutput,
      queryReservedAt: new Date().toISOString(),
    },
  },
  {
    output: {
      ...locationHeldOutput,
      heldReason: "Storefront access is restricted.",
    },
  },
  { output: { ...locationHeldOutput, locationReceipts: [] } },
  {
    output: {
      ...locationHeldOutput,
      locationReceipts: [
        { ...originalAddress, url: "https://different.test/contact" },
      ],
    },
  },
  {
    output: {
      ...locationHeldOutput,
      locationReceipts: [
        originalAddress,
        {
          ...originalAddress,
          excerpt: "Other office: 123 Main Street, Los Angeles, CA 90001",
        },
      ],
    },
  },
]) {
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "complete",
      output: locationHeldOutput,
      updatedAt: locationHeld.updatedAt,
      ...restriction,
    })
    .where(eq(schema.outboundIntegrationJob.id, locationHeld.id));
  assert.equal(
    (await Preparation.resumeLocation("fixture-reviewer", locationInput))
      .success,
    false,
  );
}
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "complete",
    output: locationHeldOutput,
    updatedAt: locationHeld.updatedAt,
  })
  .where(eq(schema.outboundIntegrationJob.id, locationHeld.id));
await db
  .update(schema.outboundPlaybook)
  .set({ revision: 2 })
  .where(eq(schema.outboundPlaybook.id, "default"));
assert.equal(
  (await Preparation.resumeLocation("fixture-reviewer", locationInput)).success,
  false,
);
await db
  .update(schema.outboundPlaybook)
  .set({ revision: 1 })
  .where(eq(schema.outboundPlaybook.id, "default"));
await db
  .update(schema.outboundCampaign)
  .set({ revision: 2 })
  .where(eq(schema.outboundCampaign.id, locationReview.campaignId));
assert.equal(
  (await Preparation.resumeLocation("fixture-reviewer", locationInput)).success,
  false,
);
await db
  .update(schema.outboundCampaign)
  .set({ revision: 1 })
  .where(eq(schema.outboundCampaign.id, locationReview.campaignId));
await db
  .update(schema.outboundProspect)
  .set({ status: "optedOut" })
  .where(eq(schema.outboundProspect.id, firstProspect(locationReview)));
assert.equal(
  (await Preparation.resumeLocation("fixture-reviewer", locationInput)).success,
  false,
);
await db
  .update(schema.outboundProspect)
  .set({ status: "candidate" })
  .where(eq(schema.outboundProspect.id, firstProspect(locationReview)));
assert.equal(
  value(await Preparation.resumeLocation("fixture-reviewer", locationInput))
    .repeated,
  false,
);
assert.equal(
  value(await Preparation.resumeLocation("fixture-reviewer", locationInput))
    .repeated,
  true,
);
const resumedLocation = await jobFor(firstProspect(locationReview));
assert.equal(resumedLocation.status, "pending");
assert.equal(resumedLocation.output?.["stage"], "qualify");
assert.deepEqual(resumedLocation.output?.["timezone"], {
  timezone: "America/New_York",
  quote: "2141 Blount Road Pompano Beach, Florida, 33069",
  sourceUrl: originalAddress.url,
  checkedAt: originalAddress.checkedAt,
});
assert.deepEqual(resumedLocation.output?.["originalLocation"], {
  status: locationHeld.status,
  input: locationHeld.input,
  output: locationHeld.output,
  error: locationHeld.error,
  updatedAt: locationHeld.updatedAt.toISOString(),
});
assert.deepEqual(
  calls,
  beforeLocationCalls,
  "location review must not fetch or call a provider",
);
assert.equal(
  (
    await Preparation.resumeLocation("fixture-reviewer", {
      ...locationInput,
      requestId: randomUUID(),
    })
  ).success,
  false,
);
assert.equal(
  (
    await Preparation.resumeLocation("fixture-reviewer", {
      ...locationInput,
      reason:
        "A changed explanation cannot reuse the first request identifier.",
    })
  ).success,
  false,
);
const locationBudget = (
  await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, locationReview.batchId))
)[0];
assert.equal(locationBudget?.output?.["queriesReserved"], 0);

const firecrawlRejection = (execute = false) => {
  const body = JSON.stringify({
    success: false,
    error:
      "Rate limit exceeded. Consumed (req/min): 3, Remaining (req/min): 0. Retry after 1s.",
    retry_after_seconds: 1,
  });
  return new IntegrationError(
    "firecrawl",
    "rate-limit",
    "firecrawl returned HTTP 429.",
    429,
    null,
    null,
    {
      response: {
        url: execute
          ? "https://api.firecrawl.dev/v2/interact/accepted-session/execute"
          : "https://api.firecrawl.dev/v2/interact",
        status: 429,
        receivedAt: new Date().toISOString(),
        body,
        sha256: createHash("sha256").update(body).digest("hex"),
      },
    },
  );
};
const firecrawlBatch = async (id: string) => {
  const [batch] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id));
  assert.ok(batch);
  return batch;
};
const releaseBrowser = async () => {
  await release();
  await db.execute(
    sql`update outbound_integration_job set output = jsonb_set(output, '{browserAvailableAt}', to_jsonb('2000-01-01T00:00:00.000Z'::text)) where input->>'operation' = 'savedContactPreparationBatch'`,
  );
};

// A creation-only 429 defers the exact browser stage and keeps the one paid answer.
const throttled = await seed();
value(await Preparation.enqueue("fixture-operator", throttled));
const startsBeforeThrottle = calls.start;
value(await run(throttled.batchId));
await release();
const rejectedBrowser = async () => ({
  success: false as const,
  error: firecrawlRejection(),
});
const beforeThrottle = Date.now();
value(await run(throttled.batchId, { browse: rejectedBrowser }));
const deferredBrowser = await jobFor(firstProspect(throttled));
assert.equal(deferredBrowser.status, "pending");
assert.equal(deferredBrowser.output?.["stage"], "browser");
assert.equal(deferredBrowser.output?.["browserRetries"], 1);
assert.ok(
  Date.parse(String(deferredBrowser.output?.["availableAt"])) >=
    beforeThrottle + 60_000,
);
const originalAnswer = deferredBrowser.output?.["answer"];
const originalQuery = deferredBrowser.output?.["shoppingJob"];
const originalReservation = deferredBrowser.output?.["queryReservedAt"];
assert.equal(
  (await firecrawlBatch(throttled.batchId)).output?.["paused"],
  false,
);
assert.equal(
  (await firecrawlBatch(throttled.batchId)).output?.["queriesReserved"],
  1,
);
assert.equal(
  value(await run(throttled.batchId, { browse: rejectedBrowser })).steps,
  0,
);
await release();
assert.equal(
  value(await run(throttled.batchId, { browse: rejectedBrowser })).steps,
  0,
  "the batch cooldown remains durable even if the individual job is due",
);
for (const retries of [2, 3]) {
  await releaseBrowser();
  value(await run(throttled.batchId, { browse: rejectedBrowser }));
  const delayed = await jobFor(firstProspect(throttled));
  assert.equal(delayed.status, "pending");
  assert.equal(delayed.output?.["browserRetries"], retries);
  assert.deepEqual(delayed.output?.["answer"], originalAnswer);
  assert.deepEqual(delayed.output?.["shoppingJob"], originalQuery);
}
await releaseBrowser();
value(await run(throttled.batchId, { browse: rejectedBrowser }));
assert.equal((await jobFor(firstProspect(throttled))).status, "failed");
assert.equal(
  (await firecrawlBatch(throttled.batchId)).output?.["paused"],
  true,
);
assert.equal(
  calls.start,
  startsBeforeThrottle + 1,
  "browser retries never submit another query",
);

// Reproduce a pre-upgrade failed job and recover it against both immutable snapshots.
await db
  .update(schema.outboundIntegrationJob)
  .set({
    output: {
      ...deferredBrowser.output,
      browserRetries: 0,
      browserRateLimits: [],
    },
    status: "failed",
    error: "firecrawl returned HTTP 429.",
    updatedAt: new Date(),
  })
  .where(eq(schema.outboundIntegrationJob.id, deferredBrowser.id));
const legacyFailure = await jobFor(firstProspect(throttled));
const legacyBudget = await firecrawlBatch(throttled.batchId);
const recovery = {
  jobId: legacyFailure.id,
  requestId: randomUUID(),
  expectedUpdatedAt: legacyFailure.updatedAt.toISOString(),
  expectedJobHash: Preparation.browserRecoverySnapshot(legacyFailure),
  expectedBatchUpdatedAt: legacyBudget.updatedAt.toISOString(),
  expectedBatchHash: Preparation.browserRecoverySnapshot(legacyBudget),
  reason:
    "Confirmed this saved HTTP 429 rejected browser creation; retain the existing shopping answer and query reservation.",
};
assert.equal(
  (
    await Preparation.resumeBrowserRateLimit("fixture-operator", {
      ...recovery,
      expectedJobHash: "0".repeat(64),
    })
  ).success,
  false,
);
assert.equal(
  (
    await Preparation.resumeBrowserRateLimit("fixture-operator", {
      ...recovery,
      expectedBatchHash: "0".repeat(64),
    })
  ).success,
  false,
);
assert.equal(
  value(await Preparation.resumeBrowserRateLimit("fixture-operator", recovery))
    .repeated,
  false,
);
assert.equal(
  value(await Preparation.resumeBrowserRateLimit("fixture-operator", recovery))
    .repeated,
  true,
);
assert.equal(
  (
    await Preparation.resumeBrowserRateLimit("fixture-operator", {
      ...recovery,
      requestId: randomUUID(),
    })
  ).success,
  false,
);
const recoveredBrowser = await jobFor(firstProspect(throttled));
assert.equal(recoveredBrowser.status, "pending");
assert.deepEqual(recoveredBrowser.output?.["answer"], originalAnswer);
assert.deepEqual(recoveredBrowser.output?.["shoppingJob"], originalQuery);
assert.equal(recoveredBrowser.output?.["queryReservedAt"], originalReservation);
assert.equal(
  (await firecrawlBatch(throttled.batchId)).output?.["queriesReserved"],
  1,
);
assert.equal(
  (await firecrawlBatch(throttled.batchId)).output?.["paused"],
  false,
);
assert.equal(value(await run(throttled.batchId)).steps, 0);
await releaseBrowser();
value(await run(throttled.batchId));
assert.equal((await jobFor(firstProspect(throttled))).status, "complete");
assert.equal(calls.start, startsBeforeThrottle + 1);

// One shared batch pacing reservation prevents two workers from starting browsers together.
const paced = await seed(2);
value(await Preparation.enqueue("fixture-operator", paced));
value(await run(paced.batchId));
await release();
const browserBeforePacing = calls.browse;
value(await run(paced.batchId));
assert.equal(calls.browse, browserBeforePacing + 1);
value(await run(paced.batchId));
assert.equal(calls.browse, browserBeforePacing + 1);
await releaseBrowser();
value(await run(paced.batchId));
assert.equal(calls.browse, browserBeforePacing + 2);
assert.equal(
  (await firecrawlBatch(paced.batchId)).output?.["queriesReserved"],
  2,
);

// An execute rejection has an accepted browser and must never create another one.
const executeRejected = await seed();
value(await Preparation.enqueue("fixture-operator", executeRejected));
value(await run(executeRejected.batchId));
await release();
value(
  await run(executeRejected.batchId, {
    browse: async () => ({ success: false, error: firecrawlRejection(true) }),
  }),
);
const executeFailure = await jobFor(firstProspect(executeRejected));
assert.equal(executeFailure.status, "failed");
assert.equal(executeFailure.output?.["browserRetries"], 0);
const executeBudget = await firecrawlBatch(executeRejected.batchId);
assert.equal(executeBudget.output?.["paused"], true);
assert.equal(
  (
    await Preparation.resumeBrowserRateLimit("fixture-operator", {
      ...recovery,
      jobId: executeFailure.id,
      requestId: randomUUID(),
      expectedUpdatedAt: executeFailure.updatedAt.toISOString(),
      expectedJobHash: Preparation.browserRecoverySnapshot(executeFailure),
      expectedBatchUpdatedAt: executeBudget.updatedAt.toISOString(),
      expectedBatchHash: Preparation.browserRecoverySnapshot(executeBudget),
    })
  ).success,
  false,
);
assert.equal(value(await run(executeRejected.batchId)).steps, 0);
console.log("Saved contact preparation contracts passed");
