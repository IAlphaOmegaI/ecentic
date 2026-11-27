import { mock, setSystemTime } from "bun:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
import { LEGACY_CONTACT_IMPORT_ACTOR } from "@/lib/outbound-saved-contact";
import { shoppingResearchSchema } from "@/lib/outbound-shopping-research";
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
import {
  shoppingPollUrl,
  shoppingQueryUrl,
} from "@/server/utils/outbound/scrapellm-cooldown";
import { requireTestDatabase } from "../helpers/database";
import {
  buildSyntheticShoppingCapture,
  syntheticWriterParts,
  syntheticWritingPolicy,
} from "../helpers/outbound-shopping-fixture";
import { passingCopyJudge } from "../helpers/outbound-writer-fixture";

const endpoint = requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const { db, schema } = await import("@/server/database");
const Store = await import("@/server/app/outbound/store");
const Preparation = await import(
  "@/server/app/outbound/saved-contact-preparation"
);
const Assessment = await import("@/server/utils/outbound/shopping-assessment");
const Capture = await import("@/server/utils/outbound/live-shopping");
const { projectBrowserExecution } = await import(
  "@/server/utils/outbound/live-shopping-browser"
);
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const syntheticQueryReview = async ({ prompt }: { prompt: string }) => ({
  status: "valid" as const,
  reason: "Synthetic category and one attribute identify this exact product.",
  checks: {
    naturalWordOrder: true,
    obviousProductCandidate: true,
    unbranded: true,
    productGrounding: true,
  },
  excerptIds: [JSON.parse(prompt).excerpts[0].id],
});
const syntheticBrands = async ({ prompt }: { prompt: string }) => {
  const evidence = JSON.parse(prompt).evidence as {
    id: string;
    quote: string;
  }[];
  return {
    decision: "supported" as const,
    reason: "Exact synthetic answer brands.",
    brands: ["Canvas Works", "Harbor Label"].map((name) => {
      const quote = evidence.find((item) => item.quote.includes(name));
      if (!quote) throw new Error("Missing exact synthetic brand evidence.");
      return { name, quoteId: quote.id };
    }),
  };
};
const settings = {
  ...syntheticWritingPolicy(defaultPlaybook),
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
const productCaptures = new Map<
  string,
  Extract<BrowserResearch, { status: "captured" }>
>();
const productCapture = async (product: { name: string; url: string }) => {
  const domain = new URL(product.url).hostname;
  const captured = await buildSyntheticShoppingCapture({
    prospect: {
      company: `Saved Goods ${domain.match(/\d+/)?.[0] ?? "0"}`,
      domain,
      product: product.name,
      productUrl: product.url,
    },
  });
  productCaptures.set(product.url, captured.evidence.browser);
  return captured.evidence.browser;
};
const captured = async (job: AiJob) => {
  const timestamp = new Date().toISOString();
  const polled = value(
    await Capture.pollQuery(
      { apiKey: "synthetic", job },
      {
        request: async () => ({
          success: true,
          data: Response.json({
            job_id: job.id,
            status: "done",
            scraper: job.query.surface,
            prompt: job.query.prompt,
            country: job.query.country,
            completed_at: timestamp,
            result: {
              scraper: job.query.surface,
              status: "done",
              cached: false,
              result_markdown:
                "1. Canvas Works — Large carry bag.\n2. Harbor Label — Cotton shopper.",
              citations: [],
            },
          }),
        }),
      },
    ),
  );
  if (polled.status !== "captured")
    throw new Error("Expected synthetic completed answer.");
  const browser =
    productCaptures.get(job.query.product.url) ??
    (await productCapture(job.query.product));
  return { answer: polled.capture, browser };
};
const calls = {
  start: 0,
  poll: 0,
  collect: 0,
  browse: 0,
  qualify: 0,
  inspectProduct: 0,
  generateQuery: 0,
};
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
        productCategory: "linen bags",
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
        productCategory: "linen bags",
        legitEvidence: "Own physical product brand with retail distribution.",
        productInsight: null,
      },
    };
    return { success: true, data: qualified };
  },
  inspectProduct: async ({ product }) => {
    calls.inspectProduct += 1;
    return { success: true, data: await productCapture(product) };
  },
  generateQuery: async (input) => {
    calls.generateQuery += 1;
    return Capture.generateShopperQuery(input, {
      review: syntheticQueryReview,
      generate: async ({ prompt }) => ({
        question: "large linen bags",
        category: "linen bag",
        attribute: "large",
        excerptIds: [JSON.parse(prompt).excerpts[0].id],
      }),
    });
  },
  start: async ({ query }) => {
    if (query.intent?.startsWith("unbranded-")) {
      const saved = (
        await db
          .select({ output: schema.outboundIntegrationJob.output })
          .from(schema.outboundIntegrationJob)
          .where(
            sql`${schema.outboundIntegrationJob.input}->>'operation' = 'savedContactPreparation' and ${schema.outboundIntegrationJob.output}->'query'->'product'->>'url' = ${query.product.url}`,
          )
      )[0]?.output;
      assert.deepEqual(saved?.["query"], query);
      assert.ok(saved?.["productCapture"]);
      assert.ok(saved?.["queryReservedAt"]);
      assert.equal(saved?.["shoppingQueryCount"], 1);
    }
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
      data: { status: "captured", capture: (await captured(job)).answer },
    };
  },
  browse: async ({ answer }) => {
    calls.browse += 1;
    return { success: true, data: (await captured(answer.job)).browser };
  },
  assess: async (input) => {
    const catalog = Assessment.createAssessmentCatalog(input);
    const answerQuoteId = catalog.quotes.find(
      (quote) => quote.sourceId === catalog.answerSourceId,
    )?.id;
    const productQuoteId = catalog.quotes.find(
      (quote) => quote.sourceId === catalog.productSourceId,
    )?.id;
    assert.ok(answerQuoteId && productQuoteId);
    return Assessment.assess(input, {
      brands: { generate: syntheticBrands },
      generate: async () => ({
        decision: "supported",
        reason: "Source-bound synthetic absence.",
        listed: ["Canvas Works", "Harbor Label"].map((name) => ({
          name,
          kind: "brand",
          quoteId: answerQuoteId,
          price: null,
        })),
        description: null,
        productAttributes: [{ quoteId: productQuoteId, value: "large" }],
        priceComparison: null,
        correctness: null,
        pageDataIssue: null,
      }),
    });
  },
  compose: async (actor, request) => {
    const Composition = await import(
      "@/server/app/outbound/sequence-composition"
    );
    return Composition.composeForProspect(actor, request, {
      generate: async () => {
        const receipt = shoppingResearchSchema.parse(
          (await jobFor(request.prospectId)).output?.["shoppingReceipt"],
        );
        const prospect = value(await Store.readProspect(request.prospectId));
        assert.ok(prospect);
        const variant =
          Number(prospect.details.domain.match(/\d+/)?.[0] ?? "0") % 10;
        return syntheticWriterParts(prospect.details, receipt, variant);
      },
      judge: passingCopyJudge,
    });
  },
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
const releaseJobs = async () => {
  await db.execute(
    sql`update outbound_integration_job set output = jsonb_set(output, '{availableAt}', to_jsonb('2000-01-01T00:00:00.000Z'::text)) where input->>'operation' = 'savedContactPreparation' and status = 'pending'`,
  );
};
const release = async (releaseProductBrowser = true) => {
  await releaseJobs();
  if (releaseProductBrowser)
    await db.execute(
      sql`update outbound_integration_job set output = jsonb_set(output, '{browserAvailableAt}', to_jsonb('2000-01-01T00:00:00.000Z'::text)) where input->>'operation' = 'savedContactPreparationBatch' and coalesce(output->>'browserAvailableAt','') < '2099-01-01T00:00:00.000Z'`,
    );
  await db.execute(
    sql`update outbound_integration_job set output = jsonb_set(output, '{availableAt}', to_jsonb('2000-01-01T00:00:00.000Z'::text)) where input->>'operation' = 'shoppingProviderPacing'`,
  );
  await db.execute(
    sql`update outbound_integration_job set output = jsonb_set(output, '{scrapellmAvailableAt}', to_jsonb('2000-01-01T00:00:00.000Z'::text)) where input->>'operation' = 'savedContactPreparationBatch'`,
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
assert.equal(
  calls.start,
  1,
  JSON.stringify(await jobFor(firstProspect(first))),
);
const pending = await jobFor(firstProspect(first));
assert.equal(pending.output?.["stage"], "poll");
assert.equal(calls.inspectProduct, 1);
assert.equal(calls.generateQuery, 1);
assert.equal(pending.output?.["shoppingQueryCount"], 1);
assert.equal(pending.output?.["shoppingQueryIntent"], "unbranded-specific");
const pendingQuery = Capture.preparedQuerySchema.parse(
  pending.output?.["query"],
);
assert.equal(pendingQuery.prompt, "large linen bags");
assert.equal(pendingQuery.category, "linen bags");
assert.equal(pendingQuery.basis?.category, "linen bag");
assert.equal(pendingQuery.contractVersion, "shopper-query-v2");
assert.equal(pendingQuery.review?.status, "valid");
assert.ok(pending.output?.["productCapture"]);
assert.ok(pendingQuery.basis?.promptHash);
await release();
value(await run(first.batchId));
const finished = await jobFor(firstProspect(first));
assert.equal(
  finished.status,
  "complete",
  JSON.stringify({
    status: finished.status,
    stage: finished.output?.["stage"],
    error: finished.error,
    held: finished.output?.["heldReason"],
  }),
);
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

// Skipping a paused batch reads its budget once, then refreshes it on the next claim.
const cachedBatch = await seed(4);
value(await Preparation.enqueue("fixture-operator", cachedBatch));
await db.execute(
  sql`update outbound_integration_job set output = jsonb_set(output, '{stage}', '"query"'::jsonb) where input->>'operation' = 'savedContactPreparation'`,
);
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: { queriesReserved: 0, paused: true } })
  .where(eq(schema.outboundIntegrationJob.id, cachedBatch.batchId));
const debug = db.$client.options.debug;
const batchReads: string[] = [];
db.$client.options.debug = (_, query, parameters) => {
  if (
    /^select\b/i.test(query.trim()) &&
    query.includes('"outbound_integration_job"') &&
    parameters.includes(cachedBatch.batchId)
  )
    batchReads.push(query);
};
const beforeCachedBatch = { ...calls };
try {
  assert.equal(value(await run(cachedBatch.batchId)).steps, 0);
  assert.equal(
    batchReads.length,
    2,
    "one projected job read and one batch read",
  );
  assert.equal(value(await run(cachedBatch.batchId)).steps, 0);
  assert.equal(
    batchReads.length,
    4,
    "each transaction must read a fresh budget",
  );
} finally {
  db.$client.options.debug = debug;
}
assert.deepEqual(
  calls,
  beforeCachedBatch,
  "a paused batch must not call providers",
);
assert.equal(
  (
    await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.id, cachedBatch.batchId))
  )[0]?.output?.["queriesReserved"],
  0,
);

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

// The explicit US market window recovers old address holds without inventing a location.
const marketReview = await seed();
value(await Preparation.enqueue("fixture-operator", marketReview));
value(
  await run(marketReview.batchId, {
    collect: async () => ({ success: true, data: productWithoutAddress }),
    location: async () => ({ success: true, data: [] }),
  }),
);
const marketHeld = await jobFor(firstProspect(marketReview));
assert.equal(marketHeld.status, "complete");
const marketInput = {
  jobId: marketHeld.id,
  requestId: randomUUID(),
  expectedUpdatedAt: marketHeld.updatedAt.toISOString(),
  reason:
    "Use the explicitly enabled US market scheduling window for this recorded US contact. The person's city and timezone remain unknown.",
};
assert.equal(
  (await Preparation.resumeLocation("fixture-reviewer", marketInput)).success,
  false,
);
const marketPolicy = await Store.policy();
const marketSaved = value(
  await Store.savePlaybook(
    "fixture-operator",
    { ...marketPolicy.settings, allowUsMarketWindow: true },
    marketPolicy.revision,
  ),
);
assert.equal(marketSaved.revision, marketPolicy.revision);
const beforeMarketCalls = { ...calls };
value(await Preparation.resumeLocation("fixture-reviewer", marketInput));
const marketResumed = await jobFor(firstProspect(marketReview));
assert.equal(marketResumed.output?.["stage"], "qualify");
assert.equal(marketResumed.output?.["timezone"], undefined);
assert.deepEqual(marketResumed.output?.["schedulingWindow"], {
  kind: "us-market-window",
  timezone: "UTC",
  startHour: 18,
  endHour: 21,
});
assert.deepEqual(calls, beforeMarketCalls);
value(await run(marketReview.batchId, {}, 4));
assert.equal(
  (await jobFor(firstProspect(marketReview))).output?.["stage"],
  "query",
);
assert.equal(
  value(await Store.readProspect(firstProspect(marketReview)))?.details
    .timezone,
  "",
);
assert.equal(calls.start, beforeMarketCalls.start);
const marketCompany = (
  await db
    .select()
    .from(schema.outboundCampaignCompany)
    .where(
      eq(
        schema.outboundCampaignCompany.prospectId,
        firstProspect(marketReview),
      ),
    )
)[0];
assert.deepEqual(marketCompany?.sourcePayload["businessHours"], {
  kind: "us-market-window",
  timezone: "UTC",
  startHour: 18,
  endHour: 21,
  basis: "chosen-sending-window",
});
value(
  await Store.savePlaybook(
    "fixture-operator",
    { ...marketPolicy.settings, allowUsMarketWindow: false },
    marketPolicy.revision,
  ),
);
value(await run(marketReview.batchId));
assert.equal(
  calls.start,
  beforeMarketCalls.start,
  "turning the policy off stops the next paid stage",
);
const marketBudget = (
  await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, marketReview.batchId))
)[0];
assert.equal(marketBudget?.output?.["queriesReserved"], 0);

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
await release(false);
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
// Product-page preflight is now a browser stage too; finish it before isolating answer-page pacing.
for (let cycle = 0; cycle < 40; cycle += 1) {
  if (
    (await Promise.all(paced.prospects.map(jobFor))).every(
      (job) => job.output?.["productCapture"],
    )
  )
    break;
  await release();
  value(await run(paced.batchId, {}, 1));
}
assert.ok(
  (await Promise.all(paced.prospects.map(jobFor))).every(
    (job) => job.output?.["productCapture"],
  ),
);
// Hold answer-browser starts while the independently paced query/poll stages finish.
await db.execute(
  sql`update outbound_integration_job set output = jsonb_set(output, '{browserAvailableAt}', to_jsonb('2099-01-01T00:00:00.000Z'::text)) where id = ${paced.batchId}`,
);
for (let cycle = 0; cycle < 4; cycle += 1) {
  await release();
  value(await run(paced.batchId));
}
assert.ok(
  (await Promise.all(paced.prospects.map(jobFor))).every(
    (job) => job.output?.["stage"] === "browser",
  ),
);
await releaseBrowser();
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
// POST and GET share one durable gate even when workers compete for different jobs.
const queryPaced = await seed(2);
value(await Preparation.enqueue("fixture-operator", queryPaced));
const beforeQueryPacing = { start: calls.start, poll: calls.poll };
await Promise.all([run(queryPaced.batchId), run(queryPaced.batchId)]).then(
  (results) => results.forEach(value),
);
assert.equal(calls.start, beforeQueryPacing.start + 1);
assert.equal(calls.poll, beforeQueryPacing.poll);
assert.equal(
  (await firecrawlBatch(queryPaced.batchId)).output?.["queriesReserved"],
  1,
);
await releaseJobs();
await Promise.all([run(queryPaced.batchId), run(queryPaced.batchId)]).then(
  (results) => results.forEach(value),
);
assert.equal(calls.start, beforeQueryPacing.start + 1);
assert.equal(
  calls.poll,
  beforeQueryPacing.poll,
  "a due poll cannot bypass the shared POST gate",
);
for (let cycle = 0; cycle < 4; cycle += 1) {
  await releaseBrowser();
  await Promise.all([run(queryPaced.batchId), run(queryPaced.batchId)]).then(
    (results) => results.forEach(value),
  );
}
assert.equal(calls.start, beforeQueryPacing.start + 2);
assert.equal(calls.poll, beforeQueryPacing.poll + 2);

const queryRejection = (
  url: string,
  body: unknown = { error: "Rate limit exceeded: max 5 request(s) per minute" },
) => {
  const text = JSON.stringify(body);
  return new IntegrationError(
    "scrapellm",
    "rate-limit",
    "scrapellm returned HTTP 429.",
    429,
    90,
    null,
    {
      response: {
        url,
        status: 429,
        receivedAt: new Date().toISOString(),
        body: text,
        sha256: createHash("sha256").update(text).digest("hex"),
      },
      retryAfterSeconds: 90,
    },
  );
};

// Only a rejected query with no accepted job can reuse its original reservation, at most three times.
const queryThrottled = { ...(await seed()), maxQueries: 1 };
value(await Preparation.enqueue("fixture-operator", queryThrottled));
let rejectedStarts = 0;
const rejectQuery: NonNullable<Parameters<typeof Preparation.run>[1]>["start"] =
  async ({ query }) => {
    rejectedStarts += 1;
    return { success: false, error: queryRejection(shoppingQueryUrl(query)) };
  };
const beforeQueryThrottle = Date.now();
value(await run(queryThrottled.batchId, { start: rejectQuery }));
const rejectedQuery = await jobFor(firstProspect(queryThrottled));
assert.equal(rejectedQuery.status, "pending");
assert.equal(rejectedQuery.output?.["queryRetries"], 1);
assert.equal(rejectedQuery.output?.["queryRetryPending"], true);
assert.equal(rejectedQuery.output?.["shoppingJob"], undefined);
assert.ok(
  Date.parse(String(rejectedQuery.output?.["availableAt"])) >=
    beforeQueryThrottle + 90_000,
);
const rejectedReservation = rejectedQuery.output?.["queryReservedAt"];
assert.equal(
  (await firecrawlBatch(queryThrottled.batchId)).output?.["queriesReserved"],
  1,
);
assert.equal(
  (await firecrawlBatch(queryThrottled.batchId)).output?.["paused"],
  false,
);
await releaseJobs();
assert.equal(
  value(await run(queryThrottled.batchId, { start: rejectQuery })).steps,
  0,
);
for (const retries of [2, 3]) {
  await release();
  value(await run(queryThrottled.batchId, { start: rejectQuery }));
  const deferred = await jobFor(firstProspect(queryThrottled));
  assert.equal(deferred.status, "pending");
  assert.equal(deferred.output?.["queryRetries"], retries);
  assert.equal(deferred.output?.["queryReservedAt"], rejectedReservation);
  assert.equal(
    (await firecrawlBatch(queryThrottled.batchId)).output?.["queriesReserved"],
    1,
  );
}
await release();
value(await run(queryThrottled.batchId, { start: rejectQuery }));
assert.equal(rejectedStarts, 4);
assert.equal((await jobFor(firstProspect(queryThrottled))).status, "failed");
assert.equal(
  (await firecrawlBatch(queryThrottled.batchId)).output?.["paused"],
  true,
);

// Historical recovery requires the exact job and batch, and never resets the paid budget.
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "failed",
    output: {
      ...rejectedQuery.output,
      queryRetries: 0,
      queryRetryPending: false,
      queryRateLimits: [],
    },
    error: "scrapellm returned HTTP 429.",
    updatedAt: new Date(),
  })
  .where(eq(schema.outboundIntegrationJob.id, rejectedQuery.id));
const oldQueryFailure = await jobFor(firstProspect(queryThrottled));
const oldQueryBudget = await firecrawlBatch(queryThrottled.batchId);
const queryRecovery = {
  jobId: oldQueryFailure.id,
  requestId: randomUUID(),
  expectedUpdatedAt: oldQueryFailure.updatedAt.toISOString(),
  expectedJobHash: Preparation.browserRecoverySnapshot(oldQueryFailure),
  expectedBatchUpdatedAt: oldQueryBudget.updatedAt.toISOString(),
  expectedBatchHash: Preparation.browserRecoverySnapshot(oldQueryBudget),
  reason:
    "Reviewed the exact minute rejection: the provider accepted no job, so retain the original single query reservation.",
};
assert.equal(
  (
    await Preparation.resumeQueryRateLimit("fixture-operator", {
      ...queryRecovery,
      expectedJobHash: "0".repeat(64),
    })
  ).success,
  false,
);
assert.equal(
  (
    await Preparation.resumeQueryRateLimit("fixture-operator", {
      ...queryRecovery,
      expectedBatchHash: "0".repeat(64),
    })
  ).success,
  false,
);
assert.equal(
  value(
    await Preparation.resumeQueryRateLimit("fixture-operator", queryRecovery),
  ).repeated,
  false,
);
assert.equal(
  value(
    await Preparation.resumeQueryRateLimit("fixture-operator", queryRecovery),
  ).repeated,
  true,
);
assert.equal(
  (
    await Preparation.resumeQueryRateLimit("fixture-operator", {
      ...queryRecovery,
      requestId: randomUUID(),
    })
  ).success,
  false,
);
assert.equal(
  (await firecrawlBatch(queryThrottled.batchId)).output?.["queriesReserved"],
  1,
);
assert.equal(
  (await jobFor(firstProspect(queryThrottled))).output?.["queryReservedAt"],
  rejectedReservation,
);
assert.equal(value(await run(queryThrottled.batchId)).steps, 0);
const beforeAcceptedRetry = calls.start;
await release();
value(await run(queryThrottled.batchId));
const acceptedRetry = await jobFor(firstProspect(queryThrottled));
assert.equal(acceptedRetry.output?.["stage"], "poll");
assert.equal(acceptedRetry.output?.["queryRetryPending"], false);
assert.equal(acceptedRetry.output?.["queryReservedAt"], rejectedReservation);
await release();
value(await run(queryThrottled.batchId));
value(await run(queryThrottled.batchId));
assert.equal((await jobFor(firstProspect(queryThrottled))).status, "complete");
assert.equal(calls.start, beforeAcceptedRetry + 1);
assert.equal(
  (await firecrawlBatch(queryThrottled.batchId)).output?.["queriesReserved"],
  1,
);

// A GET rejection resumes the same known job and consumes the existing poll bound.
const pollThrottled = await seed();
value(await Preparation.enqueue("fixture-operator", pollThrottled));
const beforePollThrottle = calls.start;
value(await run(pollThrottled.batchId));
const acceptedPollJob = (await jobFor(firstProspect(pollThrottled))).output?.[
  "shoppingJob"
];
await release();
value(
  await run(pollThrottled.batchId, {
    poll: async ({ job }) => ({
      success: false,
      error: queryRejection(shoppingPollUrl(job)),
    }),
  }),
);
const deferredPoll = await jobFor(firstProspect(pollThrottled));
assert.equal(deferredPoll.status, "pending");
assert.equal(deferredPoll.output?.["stage"], "poll");
assert.equal(deferredPoll.output?.["polls"], 1);
assert.equal(deferredPoll.output?.["queryRetries"], 0);
assert.deepEqual(deferredPoll.output?.["shoppingJob"], acceptedPollJob);
assert.equal(
  (await firecrawlBatch(pollThrottled.batchId)).output?.["queriesReserved"],
  1,
);
await releaseJobs();
assert.equal(value(await run(pollThrottled.batchId)).steps, 0);
await release();
value(await run(pollThrottled.batchId));
assert.equal((await jobFor(firstProspect(pollThrottled))).status, "complete");
assert.equal(calls.start, beforePollThrottle + 1);

// A ScrapeLLM pause holds new paid starts but does not strand answers already purchased.
const savedAnswerBatch = await seed(2);
value(await Preparation.enqueue("fixture-operator", savedAnswerBatch));
value(await run(savedAnswerBatch.batchId));
const acceptedForPause = (
  await Promise.all(savedAnswerBatch.prospects.map(jobFor))
).find((job) => job.output?.["stage"] === "poll");
assert.ok(acceptedForPause);
const pausedBatch = await firecrawlBatch(savedAnswerBatch.batchId);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    output: {
      ...pausedBatch.output,
      paused: true,
      failureProvider: "scrapellm",
      failureCode: "rate-limit",
    },
  })
  .where(eq(schema.outboundIntegrationJob.id, pausedBatch.id));
const beforePaused = { start: calls.start, browse: calls.browse };
await release();
value(await run(savedAnswerBatch.batchId));
const completedDuringPause = await jobFor(String(acceptedForPause.prospectId));
assert.equal(
  completedDuringPause.status,
  "complete",
  JSON.stringify(completedDuringPause),
);
assert.equal(calls.start, beforePaused.start);
assert.equal(calls.browse, beforePaused.browse + 1);
assert.equal(
  (await firecrawlBatch(savedAnswerBatch.batchId)).output?.["paused"],
  true,
);

// Unknown/quota-like 429s and responses containing an accepted ID must stay held.
for (const payload of [
  { error: "Daily quota exceeded" },
  { error: "Rate limit exceeded" },
  {
    error: "Rate limit exceeded: max 5 request(s) per minute",
    job_id: randomUUID(),
  },
]) {
  const rejected = await seed();
  value(await Preparation.enqueue("fixture-operator", rejected));
  value(
    await run(rejected.batchId, {
      start: async ({ query }) => ({
        success: false,
        error: queryRejection(shoppingQueryUrl(query), payload),
      }),
    }),
  );
  const job = await jobFor(firstProspect(rejected));
  const batch = await firecrawlBatch(rejected.batchId);
  assert.equal(job.status, "failed");
  assert.equal(job.output?.["queryRetries"], 0);
  assert.equal(batch.output?.["paused"], true);
  assert.equal(
    (
      await Preparation.resumeQueryRateLimit("fixture-operator", {
        ...queryRecovery,
        requestId: randomUUID(),
        jobId: job.id,
        expectedUpdatedAt: job.updatedAt.toISOString(),
        expectedJobHash: Preparation.browserRecoverySnapshot(job),
        expectedBatchUpdatedAt: batch.updatedAt.toISOString(),
        expectedBatchHash: Preparation.browserRecoverySnapshot(batch),
      })
    ).success,
    false,
  );
}
// A reviewed collection omission can refresh source evidence once, before any shopping request.
const qualificationRetry = await seed();
value(await Preparation.enqueue("fixture-operator", qualificationRetry));
const missingQualification =
  "The saved excerpts do not establish the observed commerce platform.";
value(
  await run(qualificationRetry.batchId, {
    qualify: async ({ evidence }) => ({
      success: true,
      data: {
        status: "hold",
        reason: missingQualification,
        retryable: false,
        receipts: evidence.receipts,
        companyEvidence: evidence,
        assessment: {
          ...corrected,
          decision: "hold",
          reason: missingQualification,
          criteriaSatisfied: false,
        },
        usage: { inputTokens: 40, outputTokens: 20 },
        providerRequestId: "original-qualified-collection-fixture",
      },
    }),
  }),
);
const qualificationHeld = await jobFor(firstProspect(qualificationRetry));
assert.equal(qualificationHeld.status, "complete");
const qualificationRetryInput = {
  jobId: qualificationHeld.id,
  requestId: randomUUID(),
  expectedUpdatedAt: qualificationHeld.updatedAt.toISOString(),
  expectedJobHash: Preparation.browserRecoverySnapshot(qualificationHeld),
  reason:
    "Reviewed the commerce-platform extraction omission. Recollect public facts and requalify; retain original receipts with their original dates and hashes.",
};
const beforeQualificationRetry = { ...calls };
const qualificationRetryBudget = await firecrawlBatch(
  qualificationRetry.batchId,
);
for (const mutation of [
  { status: "uncertain" as const },
  {
    output: {
      ...qualificationHeld.output,
      lease: {
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    },
  },
  {
    output: {
      ...qualificationHeld.output,
      queryReservedAt: new Date().toISOString(),
    },
  },
  {
    output: {
      ...qualificationHeld.output,
      failureReceipt: { status: "unknown" },
    },
  },
  {
    output: {
      ...qualificationHeld.output,
      qualification: {
        ...(qualificationHeld.output?.["qualification"] as Record<
          string,
          unknown
        >),
        status: "skip",
      },
    },
  },
]) {
  await db
    .update(schema.outboundIntegrationJob)
    .set(mutation)
    .where(eq(schema.outboundIntegrationJob.id, qualificationHeld.id));
  const changed = await jobFor(firstProspect(qualificationRetry));
  assert.equal(
    (
      await Preparation.retryQualificationCollection("fixture-reviewer", {
        ...qualificationRetryInput,
        expectedJobHash: Preparation.browserRecoverySnapshot(changed),
      })
    ).success,
    false,
  );
  await db
    .update(schema.outboundIntegrationJob)
    .set({ status: qualificationHeld.status, output: qualificationHeld.output })
    .where(eq(schema.outboundIntegrationJob.id, qualificationHeld.id));
}
assert.equal(
  (
    await Preparation.retryQualificationCollection("fixture-reviewer", {
      ...qualificationRetryInput,
      expectedJobHash: "0".repeat(64),
    })
  ).success,
  false,
);
assert.equal(
  value(
    await Preparation.retryQualificationCollection(
      "fixture-reviewer",
      qualificationRetryInput,
    ),
  ).repeated,
  false,
);
assert.equal(
  value(
    await Preparation.retryQualificationCollection(
      "fixture-reviewer",
      qualificationRetryInput,
    ),
  ).repeated,
  true,
);
assert.deepEqual(
  calls,
  beforeQualificationRetry,
  "reviewed recollection schedules normal collection without network calls",
);
const recollecting = await jobFor(firstProspect(qualificationRetry));
assert.equal(recollecting.output?.["stage"], "collect");
assert.equal(recollecting.output?.["companyEvidence"], undefined);
assert.equal(recollecting.output?.["qualification"], undefined);
const archivedQualification = recollecting.output?.[
  "originalQualificationCollection"
] as Record<string, unknown>;
assert.deepEqual(
  archivedQualification["companyEvidence"],
  qualificationHeld.output?.["companyEvidence"],
);
assert.deepEqual(
  archivedQualification["qualification"],
  qualificationHeld.output?.["qualification"],
);
assert.deepEqual(
  (await firecrawlBatch(qualificationRetry.batchId)).output,
  qualificationRetryBudget.output,
);
assert.equal(
  (
    await Preparation.retryQualificationCollection("fixture-reviewer", {
      ...qualificationRetryInput,
      requestId: randomUUID(),
    })
  ).success,
  false,
);
const recollectedEvidence = evidence("saved0.test");
const recollectedStorefront = recollectedEvidence.receipts[0];
assert.ok(recollectedStorefront);
recollectedEvidence.receipts[0] = {
  ...recollectedStorefront,
  checkedAt: new Date().toISOString(),
  sha256: "b".repeat(64),
  excerpt: `${recollectedEvidence.receipts[0]?.excerpt}\nObserved commerce platform: shopify. Published HTML marker: Shopify.shop =`,
};
value(
  await run(
    qualificationRetry.batchId,
    {
      collect: async () => ({ success: true, data: recollectedEvidence }),
    },
    1,
  ),
);
const recollected = await jobFor(firstProspect(qualificationRetry));
assert.equal(recollected.output?.["stage"], "qualify");
assert.deepEqual(recollected.output?.["companyEvidence"], recollectedEvidence);
assert.deepEqual(
  recollected.output?.["originalQualificationCollection"],
  archivedQualification,
);
assert.equal(calls.start, beforeQualificationRetry.start);
assert.equal(
  (await firecrawlBatch(qualificationRetry.batchId)).output?.[
    "queriesReserved"
  ],
  0,
);
assert.equal(
  (
    await db
      .select()
      .from(schema.outboundEvent)
      .where(
        eq(schema.outboundEvent.kind, "savedQualificationCollectionRetried"),
      )
  ).length,
  1,
);
// The gift-navigation defect gets one separately audited retry only after two intact gift-only attempts.
const giftNavigation = await seed();
value(await Preparation.enqueue("fixture-operator", giftNavigation));
const giftReceipts = evidence("saved0.test").receipts.map((receipt) => ({
  ...receipt,
  ...(receipt.kind === "product"
    ? {
        url: "https://saved0.test/products/e-gift-card",
        excerpt:
          "Saved Goods electronic gift card. Choose a value of $25, $50, or $100.",
      }
    : {}),
}));
const giftCollection = { ...parserCollection, receipts: giftReceipts };
const giftCollector: Parameters<typeof run>[1] = {
  collect: async () => ({ success: true, data: giftCollection }),
};
value(await run(giftNavigation.batchId, giftCollector));
const firstGiftHold = await jobFor(firstProspect(giftNavigation));
const firstGiftRetry = {
  jobId: firstGiftHold.id,
  requestId: randomUUID(),
  expectedUpdatedAt: firstGiftHold.updatedAt.toISOString(),
  reason:
    "Reviewed the earlier product-parser defect; preserve original receipt before retrying free collection.",
};
value(await Preparation.retryCollection("fixture-reviewer", firstGiftRetry));
value(await run(giftNavigation.batchId, giftCollector, 1));
const secondGiftHold = await jobFor(firstProspect(giftNavigation));
const giftRetry = {
  jobId: secondGiftHold.id,
  requestId: randomUUID(),
  expectedUpdatedAt: secondGiftHold.updatedAt.toISOString(),
  expectedJobHash: Preparation.browserRecoverySnapshot(secondGiftHold),
  defect: "giftNavigation" as const,
  reason:
    "Both saved public collection attempts reached only the digital gift-card product. Retry once after the confirmed gift-navigation filter fix; preserve both receipts and all access rules.",
};
for (const changedOutput of [
  { ...secondGiftHold.output, queryReservedAt: new Date().toISOString() },
  { ...secondGiftHold.output, failureReceipt: { outcome: "unknown" } },
  {
    ...secondGiftHold.output,
    collection: { ...giftCollection, receipts: parserReceipts },
  },
  {
    ...secondGiftHold.output,
    originalCollection: { ...giftCollection, receipts: parserReceipts },
  },
  {
    ...secondGiftHold.output,
    collection: {
      ...giftCollection,
      receipts: giftReceipts.map((receipt) =>
        receipt.kind === "storefront"
          ? { ...receipt, url: "https://saved0.test/password" }
          : receipt,
      ),
    },
  },
  {
    ...secondGiftHold.output,
    originalCollection: {
      ...giftCollection,
      receipts: giftReceipts.map((receipt) => ({
        ...receipt,
        url: "https://unrelated.test/products/gift-card",
      })),
    },
  },
  { ...secondGiftHold.output, collectionRetry: undefined },
]) {
  await db
    .update(schema.outboundIntegrationJob)
    .set({ output: changedOutput })
    .where(eq(schema.outboundIntegrationJob.id, secondGiftHold.id));
  const changed = await jobFor(firstProspect(giftNavigation));
  assert.equal(
    (
      await Preparation.retryCollection("fixture-reviewer", {
        ...giftRetry,
        expectedJobHash: Preparation.browserRecoverySnapshot(changed),
      })
    ).success,
    false,
  );
}
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: secondGiftHold.output })
  .where(eq(schema.outboundIntegrationJob.id, secondGiftHold.id));
assert.equal(
  (
    await Preparation.retryCollection("fixture-reviewer", {
      ...giftRetry,
      expectedJobHash: undefined,
    })
  ).success,
  false,
);
assert.equal(
  (
    await Preparation.retryCollection("fixture-reviewer", {
      ...giftRetry,
      expectedJobHash: "0".repeat(64),
    })
  ).success,
  false,
);
const giftCallsBefore = { ...calls };
assert.equal(
  value(await Preparation.retryCollection("fixture-reviewer", giftRetry))
    .repeated,
  false,
);
assert.equal(
  value(await Preparation.retryCollection("fixture-reviewer", giftRetry))
    .repeated,
  true,
);
assert.equal(
  value(await Preparation.retryCollection("fixture-reviewer", firstGiftRetry))
    .repeated,
  true,
);
const recoveredGift = await jobFor(firstProspect(giftNavigation));
assert.deepEqual(
  recoveredGift.output?.["originalCollection"],
  firstGiftHold.output?.["collection"],
);
assert.deepEqual(
  recoveredGift.output?.["originalGiftNavigationCollection"],
  secondGiftHold.output?.["collection"],
);
assert.deepEqual(
  recoveredGift.output?.["collectionRetry"],
  secondGiftHold.output?.["collectionRetry"],
);
assert.equal(recoveredGift.output?.["stage"], "collect");
assert.equal(recoveredGift.output?.["collection"], undefined);
assert.deepEqual(calls, giftCallsBefore);
assert.equal(
  (await firecrawlBatch(giftNavigation.batchId)).output?.["queriesReserved"],
  0,
);
assert.equal(
  (
    await Preparation.retryCollection("fixture-reviewer", {
      ...giftRetry,
      requestId: randomUUID(),
    })
  ).success,
  false,
);
value(await run(giftNavigation.batchId, {}, 1));
assert.equal(
  (await jobFor(firstProspect(giftNavigation))).output?.["stage"],
  "qualify",
);
assert.equal(calls.start, giftCallsBefore.start);
assert.equal(
  (
    await db
      .select()
      .from(schema.outboundEvent)
      .where(eq(schema.outboundEvent.kind, "savedGiftNavigationRetried"))
  ).length,
  1,
);
// Microsoft delivery is opt-in and must remain enabled at every subsequent stage.
const microsoftMx: Parameters<typeof Preparation.run>[1] = {
  mx: async () => ({
    success: true,
    data: {
      provider: "microsoft",
      checkedAt: new Date().toISOString(),
      records: ["saved.test.mail.protection.outlook.com"],
    },
  }),
};
const setMicrosoft = async (enabled: boolean) => {
  const policy = await Store.policy();
  const saved = value(
    await Store.savePlaybook(
      "fixture-operator",
      { ...policy.settings, allowMicrosoftRecipients: enabled },
      policy.revision,
    ),
  );
  assert.equal(saved.revision, policy.revision);
};
const disabledMicrosoft = await seed();
value(await Preparation.enqueue("fixture-operator", disabledMicrosoft));
const beforeDisabledMicrosoft = { ...calls };
value(await run(disabledMicrosoft.batchId, microsoftMx));
assert.equal((await jobFor(firstProspect(disabledMicrosoft))).status, "failed");
assert.deepEqual(calls, beforeDisabledMicrosoft);
const enabledMicrosoft = await seed();
await setMicrosoft(true);
value(await Preparation.enqueue("fixture-operator", enabledMicrosoft));
value(await run(enabledMicrosoft.batchId, microsoftMx, 1));
assert.equal(
  (await jobFor(firstProspect(enabledMicrosoft))).output?.["stage"],
  "collect",
);
await setMicrosoft(false);
const beforeRevokedMicrosoft = { ...calls };
value(await run(enabledMicrosoft.batchId, microsoftMx));
assert.equal((await jobFor(firstProspect(enabledMicrosoft))).status, "failed");
assert.deepEqual(calls, beforeRevokedMicrosoft);
const verifiedMicrosoft = await seed();
await setMicrosoft(true);
value(await Preparation.enqueue("fixture-operator", verifiedMicrosoft));
const beforeVerifiedMicrosoft = { ...calls };
value(await run(verifiedMicrosoft.batchId, microsoftMx));
await release();
value(await run(verifiedMicrosoft.batchId, microsoftMx));
const microsoftProspect = value(
  await Store.readProspect(firstProspect(verifiedMicrosoft)),
);
assert.equal(microsoftProspect?.status, "draft");
assert.equal(microsoftProspect?.details.mxProvider, "microsoft");
assert.equal(microsoftProspect?.details.emailVerifiedAt, "");
assert.ok(microsoftProspect?.details.savedContactVerificationId);
assert.equal(calls.start - beforeVerifiedMicrosoft.start, 1);
const unknownMx = await seed();
await setMicrosoft(true);
value(await Preparation.enqueue("fixture-operator", unknownMx));
const beforeUnknownMx = { ...calls };
value(
  await run(unknownMx.batchId, {
    mx: async () => ({
      success: true,
      data: {
        provider: "unknown",
        checkedAt: new Date().toISOString(),
        records: ["unknown.saved.test"],
      },
    }),
  }),
);
assert.equal((await jobFor(firstProspect(unknownMx))).status, "failed");
assert.deepEqual(calls, beforeUnknownMx);

// Scheduling is a batch barrier, even when a recovery makes a stage available early.
setSystemTime(new Date("2026-11-25T23:59:00.000Z"));
const scheduled = {
  ...(await seed(2)),
  maxQueries: 1,
  startsAt: "2026-11-26T00:05:00Z",
};
const scheduledResult = value(
  await Preparation.enqueue("fixture-operator", scheduled),
);
assert.equal(scheduledResult.startsAt, "2026-11-26T00:05:00.000Z");
assert.equal(
  (await jobFor(firstProspect(scheduled))).output?.["availableAt"],
  scheduledResult.startsAt,
);
const beforeScheduled = { ...calls };
value(await run(scheduled.batchId));
await release();
value(await run(scheduled.batchId));
assert.deepEqual(calls, beforeScheduled);
assert.equal(
  (await firecrawlBatch(scheduled.batchId)).output?.["queriesReserved"],
  0,
);
assert.equal(
  (
    await Preparation.enqueue("fixture-operator", {
      ...scheduled,
      startsAt: "2026-11-25T23:59:00Z",
    })
  ).success,
  false,
);
assert.equal(
  value(await Preparation.enqueue("fixture-operator", scheduled)).results[0]
    ?.repeated,
  true,
);
setSystemTime(new Date("2026-11-26T23:59:50.000Z"));
value(await run(scheduled.batchId));
assert.equal(calls.start - beforeScheduled.start, 1);
const reserved = (await Promise.all(scheduled.prospects.map(jobFor))).find(
  (job) => job.output?.["stage"] === "poll",
);
assert.ok(
  reserved?.prospectId,
  "One accepted query must await its existing poll",
);
const reservedAt = reserved.output?.["queryReservedAt"];
const scheduledOriginalQuery = reserved.output?.["shoppingJob"];
const budgetBeforeMidnight = await firecrawlBatch(scheduled.batchId);
assert.equal(budgetBeforeMidnight.output?.["queriesReserved"], 1);
setSystemTime(new Date("2026-11-27T00:00:30.000Z"));
assert.equal(
  value(await Preparation.enqueue("fixture-operator", scheduled)).results[0]
    ?.repeated,
  true,
);
assert.deepEqual(
  (await firecrawlBatch(scheduled.batchId)).output,
  budgetBeforeMidnight.output,
);
for (let cycle = 0; cycle < 4; cycle += 1) {
  await release();
  value(await run(scheduled.batchId));
  if ((await jobFor(reserved.prospectId)).status === "complete") break;
}
const completedScheduled = await jobFor(reserved.prospectId);
assert.equal(completedScheduled.status, "complete");
assert.equal(completedScheduled.output?.["queryReservedAt"], reservedAt);
assert.deepEqual(
  completedScheduled.output?.["shoppingJob"],
  scheduledOriginalQuery,
);
assert.equal(calls.start - beforeScheduled.start, 1);
assert.equal(calls.browse - beforeScheduled.browse, 1);
assert.equal(
  (await firecrawlBatch(scheduled.batchId)).output?.["queriesReserved"],
  1,
);
assert.equal(
  (await firecrawlBatch(scheduled.batchId)).input?.["startsAt"],
  "2026-11-26T00:05:00.000Z",
);
setSystemTime();

// A full page of future jobs must not hide due work from another explicit batch.
const scheduleQueue = await seed(2);
const futureQueue = {
  ...scheduleQueue,
  prospects: [firstProspect(scheduleQueue)],
  startsAt: new Date(Date.now() + 86_400_000).toISOString(),
};
value(await Preparation.enqueue("fixture-operator", futureQueue));
const futureQueueJob = await jobFor(firstProspect(scheduleQueue));
await db.insert(schema.outboundIntegrationJob).values(
  Array.from({ length: 199 }, () => ({
    provider: "automation" as const,
    status: "pending" as const,
    prospectId: futureQueueJob.prospectId,
    requestId: randomUUID(),
    input: futureQueueJob.input,
    output: futureQueueJob.output,
    updatedAt: new Date(0),
  })),
);
const dueProspect = scheduleQueue.prospects[1];
assert.ok(dueProspect);
value(
  await Preparation.enqueue("fixture-operator", {
    ...scheduleQueue,
    batchId: randomUUID(),
    prospects: [dueProspect],
  }),
);
value(
  await Preparation.run(
    { maxSteps: 1, deadline: Date.now() + 240_000 },
    dependencies,
  ),
);
assert.equal((await jobFor(dueProspect)).output?.["stage"], "collect");
assert.equal(
  (await jobFor(firstProspect(scheduleQueue))).output?.["stage"],
  "preflight",
);
// New reservations require v2, while acknowledged historical queries keep their exact job.
const unpaidLegacy = await seed();
value(await Preparation.enqueue("fixture-operator", unpaidLegacy));
const legacyStarts = calls.start;
value(
  await run(unpaidLegacy.batchId, {
    generateQuery: (input) =>
      Capture.generateLegacyShopperQuery(input, {
        generate: async ({ prompt }) => ({
          question: "large linen bags",
          category: "linen bag",
          attribute: "large",
          excerptIds: [JSON.parse(prompt).excerpts[0].id],
        }),
      }),
  }),
);
const unpaidLegacyHeld = await jobFor(firstProspect(unpaidLegacy));
assert.equal(unpaidLegacyHeld.status, "complete");
assert.match(
  String(unpaidLegacyHeld.output?.["heldReason"]),
  /current semantic product-fit/,
);
assert.equal(unpaidLegacyHeld.output?.["queryReservedAt"], undefined);
assert.equal(unpaidLegacyHeld.output?.["shoppingQueryCount"], 0);
assert.equal(calls.start, legacyStarts);
assert.equal(
  (await firecrawlBatch(unpaidLegacy.batchId)).output?.["queriesReserved"],
  0,
);
const legacyPaid = await seed();
value(await Preparation.enqueue("fixture-operator", legacyPaid));
value(await run(legacyPaid.batchId));
const paidLegacyRow = await jobFor(firstProspect(legacyPaid));
assert.equal(paidLegacyRow.output?.["stage"], "poll");
const acknowledged = Capture.aiJobSchema.parse(
  paidLegacyRow.output?.["shoppingJob"],
);
const {
  contractVersion: _legacyVersion,
  review: _legacyReview,
  ...oldQuery
} = acknowledged.query;
const oldJob = { ...acknowledged, query: oldQuery };
await db
  .update(schema.outboundIntegrationJob)
  .set({
    output: { ...paidLegacyRow.output, query: oldQuery, shoppingJob: oldJob },
  })
  .where(eq(schema.outboundIntegrationJob.id, paidLegacyRow.id));
const beforeLegacyPoll = { start: calls.start, poll: calls.poll };
await release();
value(await run(legacyPaid.batchId, {}, 1));
const polledLegacy = await jobFor(firstProspect(legacyPaid));
assert.equal(polledLegacy.output?.["stage"], "browser");
assert.deepEqual(polledLegacy.output?.["shoppingJob"], oldJob);
assert.deepEqual(polledLegacy.output?.["query"], oldQuery);
assert.equal(calls.start, beforeLegacyPoll.start);
assert.equal(calls.poll, beforeLegacyPoll.poll + 1);
assert.equal(
  (await firecrawlBatch(legacyPaid.batchId)).output?.["queriesReserved"],
  1,
);
console.log("Saved contact preparation contracts passed");
