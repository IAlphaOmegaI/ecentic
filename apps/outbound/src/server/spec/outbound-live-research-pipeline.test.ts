import {
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
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook } from "@/lib/outbound";
import { IntegrationError } from "@/server/utils/outbound/http";
import { requireTestDatabase } from "./helpers/database";
import {
  buildSyntheticShoppingEvidence,
  syntheticWriterParts,
  syntheticWritingPolicy,
} from "./helpers/outbound-shopping-fixture";
import { passingCopyJudge } from "./helpers/outbound-writer-fixture";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;

const now = new Date("2026-11-19T18:00:00Z");
const product = {
  name: "Linen tote",
  url: "https://samplegoods.com/products/tote",
};
const load = async () => ({
  ...(await import("@/server/database")),
  store: await import("@/server/app/outbound/store"),
  campaigns: await import("@/server/app/outbound/campaigns"),
  automation: await import("@/server/app/outbound/automation"),
  qualification: await import(
    "@/server/utils/outbound/automation-qualification"
  ),
  providers: await import("@/server/utils/outbound/providers"),
  draft: await import("@/server/utils/outbound/draft"),
  mx: await import("@/server/utils/outbound/mx"),
  capture: await import("@/server/utils/outbound/live-shopping"),
  assessment: await import("@/server/utils/outbound/shopping-assessment"),
  readiness: await import("@/server/app/outbound/research-readiness"),
  credentials: await import("@/server/app/outbound/provider-credentials"),
});
let modules: Awaited<ReturnType<typeof load>> | null = null;
let readResearchStatus:
  | typeof import("@/server/app/outbound/research-readiness")["getStatus"]
  | null = null;
const active = () => {
  if (!modules) throw new Error("Fixture not loaded");
  return modules;
};
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
const settings = syntheticWritingPolicy({
  ...defaultPlaybook,
  automationEnabled: true,
  requireShoppingEvidence: true,
  subjectTemplate: "Linen tote pricing",
  bodyTemplate:
    "Hi {first}!\n\n{finding}\n\n{consequence}\n\n{founderLine} {callToAction}\n\n({optout})\n\n{signature}",
  senderConfirmed: true,
  historyConfirmed: true,
  competingSendersPaused: true,
  senderTested: true,
  senderEmails:
    "juri1@joinecentic.com\njuri2@joinecentic.com\njuri3@joinecentic.com\njuri4@joinecentic.com",
  senderProfiles: [1, 2, 3, 4].map((number) => ({
    email: `juri${number}@joinecentic.com`,
    fromName: defaultPlaybook.fromName,
    signature: defaultPlaybook.signature,
    founderLine: defaultPlaybook.founderLine,
    productCheckIntro: defaultPlaybook.productCheckIntro,
    voiceNotes: defaultPlaybook.voiceNotes,
  })),
});
const state = {
  ready: true,
  noAngle: false,
  pendingPoll: false,
  startError: null as IntegrationError | null,
  afterStart: null as (() => Promise<void>) | null,
};
const fixture = {
  campaignId: "",
  companyId: "",
  capture: null as Awaited<
    ReturnType<typeof buildSyntheticShoppingEvidence>
  > | null,
};
const jobs = async () =>
  active().db.select().from(active().schema.outboundIntegrationJob);
const currentJob = async () => {
  const job = (await jobs()).find(
    (job) => job.input["operation"] === "campaignAutomation",
  );
  if (!job) throw new Error("Missing automation job");
  return job;
};
const advance = async (maxSteps = 20) => {
  setSystemTime(new Date(Date.now() + 15_000));
  const { db, schema, automation } = active();
  for (const job of (await jobs()).filter(
    (job) => job.provider === "automation" && job.status === "pending",
  ))
    await db
      .update(schema.outboundIntegrationJob)
      .set({
        output: { ...job.output, availableAt: new Date(0).toISOString() },
      })
      .where(eq(schema.outboundIntegrationJob.id, job.id));
  return value(
    await automation.run({ campaignId: fixture.campaignId, maxSteps }),
  );
};
const configure = () => {
  const {
    readiness,
    credentials,
    qualification,
    capture,
    assessment,
    providers,
    mx,
    draft,
  } = active();
  spyOn(readiness, "getStatus").mockImplementation(async () => ({
    success: true,
    data: {
      required: true,
      ready: state.ready,
      missing: state.ready ? [] : ["scrapellm", "firecrawl"],
      blocked: [],
    },
  }));
  spyOn(credentials, "resolveKey").mockResolvedValue({
    success: true,
    data: "fixture-only-never-sent",
  });
  spyOn(qualification, "enrichCompany").mockResolvedValue({
    success: true,
    data: {
      domain: "samplegoods.com",
      name: "Sample Goods",
      website: "https://samplegoods.com",
      country: "US",
      platform: "shopify",
      teamSize: 10,
      annualRevenue: null,
      source: "apollo",
      sourceId: "organization_fixture",
      observedAt: now.toISOString(),
      sourcePayload: {
        _outboundSource: "apollo-organization-enrichment",
        _outboundObservedAt: now.toISOString(),
      },
    },
  });
  const insight = {
    sourceUrl: product.url,
    sourceQuote: "Made from durable woven linen for everyday carrying.",
    feature: "durable woven linen",
    kind: "material" as const,
    relevance: "Material is useful for a shopper comparing everyday tote bags.",
  };
  spyOn(qualification, "qualifyCompany").mockResolvedValue({
    success: true,
    data: {
      status: "qualified",
      details: {
        company: "Sample Goods",
        domain: "samplegoods.com",
        website: "https://samplegoods.com",
        country: "US",
        platform: "shopify",
        product: product.name,
        productUrl: product.url,
        gap: "product-published-data",
        finding: "your product page lists Linen tote",
        productInsight: insight,
        evidence: "Observed named own-brand product with a priced offer",
        evidenceCheckedAt: now.toISOString(),
        findingReviewed: false,
        legitEvidence:
          "https://samplegoods.com/about: Established consumer products team",
        productCategory: "linen tote bags",
      },
      receipts: [
        {
          url: product.url,
          kind: "product",
          checkedAt: now.toISOString(),
          sha256: "a".repeat(64),
          excerpt: "Linen tote by Sample Goods, USD 30",
        },
      ],
      assessment: {
        productInsight: insight,
        decision: "qualified",
        reason: "Sourced fit",
        productCategory: "linen tote bags",
        ownBrandEvidence: null,
        physicalProductEvidence: null,
        establishedEvidence: null,
        criteriaEvidence: [],
        criteriaSatisfied: true,
      },
      usage: { inputTokens: 10, outputTokens: 10 },
      providerRequestId: "fixture",
    },
  });
  const originalGenerate = capture.generateShopperQuery;
  const originalPoll = capture.pollQuery;
  const originalAssess = assessment.assess;
  const originalCompose = draft.composeSequence;
  spyOn(capture, "inspectProduct").mockImplementation(async () => ({
    success: true,
    data: fixture.capture!.evidence.browser,
  }));
  spyOn(capture, "generateShopperQuery").mockImplementation(async (input) =>
    originalGenerate(input, {
      review: syntheticQueryReview,
      generate: async ({ prompt }) => ({
        question: "large linen tote bags",
        category: "linen tote bag",
        attribute: "large",
        excerptIds: [JSON.parse(prompt).excerpts[0].id],
      }),
    }),
  );
  spyOn(capture, "startQuery").mockImplementation(async ({ query }) => {
    if (state.startError) return { success: false, error: state.startError };
    if (state.afterStart) await state.afterStart();
    return {
      success: true,
      data: { id: randomUUID(), query, submittedAt: new Date().toISOString() },
    };
  });
  spyOn(capture, "pollQuery").mockImplementation(async ({ job }) =>
    state.pendingPoll
      ? { success: true, data: { status: "pending" } }
      : originalPoll(
          { apiKey: "synthetic", job },
          {
            request: async () => ({
              success: true,
              data: Response.json({
                job_id: job.id,
                status: "done",
                scraper: job.query.surface,
                prompt: job.query.prompt,
                country: "US",
                completed_at: new Date().toISOString(),
                result: {
                  scraper: job.query.surface,
                  status: "done",
                  cached: false,
                  result_markdown: state.noAngle
                    ? "Sample Goods linen tote is included. Other options are Canvas Works and Harbor Label."
                    : "1. [Canvas Works — Large carry bag](https://canvas.example/products/carry-bag).\n2. [Harbor Label — Cotton shopper](https://harbor.example/products/shopper).",
                  citations: [],
                },
              }),
            }),
          },
        ),
  );
  spyOn(capture, "inspectPages").mockImplementation(async () => ({
    success: true,
    data: fixture.capture!.evidence.browser,
  }));
  spyOn(assessment, "assess").mockImplementation(async (input) =>
    originalAssess(input, {
      brands: { generate: syntheticBrands },
      generate: async () => {
        const catalog = assessment.createAssessmentCatalog(input);
        const answerQuote = catalog.quotes.find(
          (q) => q.sourceId === catalog.answerSourceId,
        )!;
        const pageQuote = catalog.quotes.find(
          (q) => q.sourceId === catalog.productSourceId,
        )!;
        return {
          ...fixture.capture!.selection,
          decision: state.noAngle ? "hold" : "supported",
          reason: state.noAngle
            ? "No supported angle."
            : "Exact synthetic facts.",
          listed: ["Canvas Works", "Harbor Label"].map((name) => ({
            name,
            kind: "brand" as const,
            quoteId: answerQuote.id,
            price: null,
          })),
          productAttributes: [{ value: "large", quoteId: pageQuote.id }],
        };
      },
    }),
  );
  const person = {
    id: "person_fixture",
    name: "Jane Smith",
    first: "Jane",
    title: "Head of Growth",
    domain: "samplegoods.com",
    company: "Sample Goods",
    linkedinUrl: "https://www.linkedin.com/in/jane-fixture",
    email: "jane@samplegoods.com",
    emailStatus: "unknown",
    matchConfidence: "exact",
    source: "apollo" as const,
    timezone: "America/New_York",
  };
  spyOn(providers, "searchApolloPeople").mockResolvedValue({
    success: true,
    data: { people: [person], page: 1, total: 1 },
  });
  spyOn(providers, "enrichApolloPerson").mockResolvedValue({
    success: true,
    data: person,
  });
  spyOn(providers, "verifyApolloEmails").mockResolvedValue({
    success: true,
    data: {
      requestId: "verify_fixture",
      status: "pending",
      records: [
        { record_id: "record_fixture", input: { email: person.email } },
      ],
      requestedAt: now.toISOString(),
    },
  });
  spyOn(providers, "pollApolloVerification").mockResolvedValue({
    success: true,
    data: {
      requestId: "verify_fixture",
      status: "complete",
      results: [
        {
          email: person.email,
          status: "verified",
          verdict: "validated",
          verifiedAt: now.toISOString(),
          source: "apollo",
          recordId: "record_fixture",
        },
      ],
      retryAfterSeconds: 30,
    },
  });
  spyOn(mx, "check").mockResolvedValue({
    success: true,
    data: { provider: "google", checkedAt: now.toISOString(), records: [] },
  });
  spyOn(draft, "composeSequence").mockImplementation(
    async (details, receipt, policy, dependencies) =>
      originalCompose(details, receipt, policy, {
        ...dependencies,
        generate: async () => syntheticWriterParts(details, receipt!),
        judge: passingCopyJudge,
      }),
  );
};

describe.skipIf(!endpoint)(
  "live shopping research in the durable company pipeline",
  () => {
    beforeAll(async () => {
      requireTestDatabase(endpoint);
      Object.assign(process.env, {
        DATABASE_URL: endpoint,
        CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
      });
      mock.module("server-only", () => ({}));
      modules = await load();
      readResearchStatus = modules.readiness.getStatus;
    });
    beforeEach(async () => {
      setSystemTime(now);
      const { db, schema, store, campaigns } = active();
      await db.execute(sql`set client_min_messages to warning`);
      await db.execute(
        sql`truncate outbound_integration_job,outbound_campaign,outbound_company,outbound_person,outbound_prospect,outbound_event,outbound_revision,outbound_playbook,outbound_provider_credential,outbound_suppression,outbound_inbox cascade`,
      );
      value(await store.savePlaybook("fixture", settings));
      const campaign = value(
        await campaigns.create("fixture", { name: "Research fixture" }),
      );
      value(
        await campaigns.update("fixture", {
          id: campaign.id,
          name: "Research fixture",
          expectedRevision: 1,
          status: "active",
        }),
      );
      const [company] = await db
        .insert(schema.outboundCampaignCompany)
        .values({
          campaignId: campaign.id,
          domain: "samplegoods.com",
          name: "Sample Goods",
          website: "https://samplegoods.com",
          source: "apollo",
          sourceId: "organization_fixture",
          criteriaRevision: 1,
          country: "US",
          platform: "shopify",
          teamSize: 10,
          annualRevenue: null,
          sourcePayload: {},
        })
        .returning();
      if (!company) throw new Error("Missing company");
      Object.assign(fixture, {
        campaignId: campaign.id,
        companyId: company.id,
      });
      Object.assign(state, {
        ready: true,
        noAngle: false,
        pendingPoll: false,
        startError: null,
        afterStart: null,
      });
      fixture.capture = await buildSyntheticShoppingEvidence({
        prospect: {
          company: "Sample Goods",
          domain: "samplegoods.com",
          product: product.name,
          productUrl: product.url,
        },
        now: now.getTime(),
        pageText: "Linen tote is a large linen tote bag.",
      });
      configure();
    });
    afterEach(() => {
      mock.restore();
      setSystemTime();
    });

    test("missing research credentials prevent qualification and every paid provider operation", async () => {
      state.ready = false;
      const { automation, qualification, capture, providers } = active();
      const result = value(await automation.run({ maxSteps: 20 }));
      expect(result.processed).toBe(0);
      expect(await jobs()).toHaveLength(0);
      expect(qualification.enrichCompany).not.toHaveBeenCalled();
      expect(capture.startQuery).not.toHaveBeenCalled();
      expect(providers.searchApolloPeople).not.toHaveBeenCalled();
    });
    test("real readiness reports missing connections without contacting either provider", async () => {
      if (!readResearchStatus) throw new Error("Missing readiness function");
      const { credentials, capture } = active();
      spyOn(credentials, "metadata").mockResolvedValue({
        success: true,
        data: {
          configured: false,
          configuration: {},
          credentialStatus: "missing",
        },
      });
      expect(value(await readResearchStatus(settings))).toMatchObject({
        required: true,
        ready: false,
        missing: ["scrapellm", "firecrawl"],
        blocked: [],
      });
      expect(capture.startQuery).not.toHaveBeenCalled();
      expect(capture.inspectPages).not.toHaveBeenCalled();
    });
    test("real readiness backs off a rejected research account until its saved key changes", async () => {
      if (!readResearchStatus) throw new Error("Missing readiness function");
      const { credentials, db, schema, capture } = active();
      spyOn(credentials, "metadata").mockResolvedValue({
        success: true,
        data: {
          configured: true,
          configuration: {},
          credentialStatus: "saved",
        },
      });
      // Readiness deliberately uses the database clock for persisted account cooldowns.
      setSystemTime();
      const failedAt = new Date();
      await db.insert(schema.outboundIntegrationJob).values({
        provider: "automation",
        status: "failed",
        error: "provider-access",
        updatedAt: failedAt,
        input: { operation: "campaignAutomation" },
        output: { failureProvider: "scrapellm" },
      });
      expect(value(await readResearchStatus(settings))).toMatchObject({
        ready: false,
        missing: [],
        blocked: ["scrapellm"],
      });
      await db.insert(schema.outboundProviderCredential).values({
        provider: "scrapellm",
        apiKey: "fixture-only-key",
        createdBy: "fixture",
        updatedBy: "fixture",
        validatedAt: new Date(failedAt.getTime() + 1000),
        updatedAt: new Date(failedAt.getTime() + 1000),
      });
      expect(value(await readResearchStatus(settings))).toMatchObject({
        ready: true,
        blocked: [],
      });
      expect(capture.startQuery).not.toHaveBeenCalled();
    });
    test("one saved query progresses through polling, evidence, contacts, verification, draft and approval", async () => {
      const { capture, providers, db, schema, draft } = active();
      expect((await advance()).results.at(-1)?.stage).toBe("pollShoppingQuery");
      const submitted = await currentJob();
      expect(submitted.output?.["shoppingQuery"]).toMatchObject({
        product,
        category: "linen tote bags",
        basis: { category: "linen tote bag" },
        contractVersion: "shopper-query-v2",
        review: { status: "valid" },
        surface: "google_ai_mode",
      });
      expect(submitted.output?.["shoppingRequestId"]).toEqual(
        expect.any(String),
      );
      state.pendingPoll = true;
      expect((await advance()).results.at(-1)?.stage).toBe("pollShoppingQuery");
      expect(capture.startQuery).toHaveBeenCalledTimes(1);
      state.pendingPoll = false;
      expect((await advance()).results.at(-1)?.stage).toBe("pollVerification");
      expect((await advance()).results.at(-1)?.status).toBe("complete");
      const [prospect] = await db.select().from(schema.outboundProspect);
      expect(prospect?.status).toBe("approved");
      expect(prospect?.details.shoppingFinding?.kind).toBe("discovery-absence");
      expect(prospect?.details.shoppingResearchId).toEqual(expect.any(String));
      expect(prospect?.approvedBy).toBe("automatic:outbound-automation");
      expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(
        0,
      );
      expect(capture.startQuery).toHaveBeenCalledTimes(1);
      expect(capture.inspectPages).toHaveBeenCalledTimes(1);
      expect(providers.searchApolloPeople).toHaveBeenCalledTimes(1);
      expect(providers.verifyApolloEmails).toHaveBeenCalledTimes(1);
      expect(draft.composeSequence).toHaveBeenCalledTimes(1);
      expect((await advance()).processed).toBe(0);
    });
    test("an unsubmitted legacy query cannot spend without a current semantic review", async () => {
      const { capture, db, schema } = active();
      expect((await advance(4)).results.at(-1)?.stage).toBe(
        "startShoppingQuery",
      );
      const queued = await currentJob();
      const {
        contractVersion: _version,
        review: _review,
        ...legacy
      } = capture.preparedQuerySchema.parse(queued.output?.["shoppingQuery"]);
      await db
        .update(schema.outboundIntegrationJob)
        .set({ output: { ...queued.output, shoppingQuery: legacy } })
        .where(eq(schema.outboundIntegrationJob.id, queued.id));
      const result = await advance(1);
      expect(result.results.at(-1)?.reason).toBe("shopping-query-held");
      expect(capture.startQuery).not.toHaveBeenCalled();
      expect((await currentJob()).output?.["shoppingQuery"]).toEqual(legacy);
      expect(
        (await currentJob()).output?.["shoppingQueryValidation"],
      ).toContain("semantic product-fit");
    });
    test("an acknowledged legacy job resumes polling without another submission", async () => {
      const { capture, db, schema } = active();
      await advance();
      const submitted = await currentJob();
      const paid = capture.aiJobSchema.parse(submitted.output?.["shoppingJob"]);
      const {
        contractVersion: _version,
        review: _review,
        ...legacy
      } = paid.query;
      const legacyJob = { ...paid, query: legacy };
      await db
        .update(schema.outboundIntegrationJob)
        .set({
          status: "pending",
          output: {
            ...submitted.output,
            stage: "startShoppingQuery",
            shoppingQuery: legacy,
            shoppingJob: legacyJob,
          },
        })
        .where(eq(schema.outboundIntegrationJob.id, submitted.id));
      expect((await advance(1)).results.at(-1)?.stage).toBe(
        "pollShoppingQuery",
      );
      expect(capture.startQuery).toHaveBeenCalledTimes(1);
      expect((await currentJob()).output?.["shoppingJob"]).toEqual(legacyJob);
      expect((await advance(1)).results.at(-1)?.stage).toBe("browseShopping");
      expect(capture.startQuery).toHaveBeenCalledTimes(1);
      expect(capture.pollQuery).toHaveBeenCalledTimes(1);
      expect((await currentJob()).output?.["shoppingJob"]).toEqual(legacyJob);
    });
    test("no supported shopping angle holds before buying contacts or creating a prospect", async () => {
      state.noAngle = true;
      const { providers, draft, db, schema } = active();
      await advance();
      expect((await advance()).results.at(-1)?.reason).toBe(
        "shopping-research-held",
      );
      expect(providers.searchApolloPeople).not.toHaveBeenCalled();
      expect(draft.composeSequence).not.toHaveBeenCalled();
      expect(await db.select().from(schema.outboundProspect)).toHaveLength(0);
      expect((await advance()).processed).toBe(0);
    });
    test.each(["scrapellm", "firecrawl"] as const)(
      "saved shopping captures can be assessed during a %s cooldown",
      async (provider) => {
        const { readiness, assessment, capture, providers } = active();
        await advance();
        expect((await advance(2)).results.at(-1)?.stage).toBe("assessShopping");
        const captured = await currentJob();
        expect(captured.output?.["shoppingReceipt"]).toBeUndefined();
        spyOn(readiness, "getStatus").mockResolvedValue({
          success: true,
          data: {
            required: true,
            ready: false,
            missing: [],
            blocked: [provider],
          },
        });
        const result = await advance(1);
        expect(result.processed).toBe(1);
        expect(result.results.at(-1)?.stage).toBe("findContacts");
        const assessed = await currentJob();
        expect(assessed.output?.["shoppingReceipt"]).toMatchObject({ product });
        expect(assessed.output?.["shoppingAnswer"]).toEqual(
          captured.output?.["shoppingAnswer"],
        );
        expect(assessed.output?.["shoppingBrowser"]).toEqual(
          captured.output?.["shoppingBrowser"],
        );
        expect(assessment.assess).toHaveBeenCalledTimes(1);
        expect(capture.startQuery).toHaveBeenCalledTimes(1);
        expect(capture.pollQuery).toHaveBeenCalledTimes(1);
        expect(capture.inspectPages).toHaveBeenCalledTimes(1);
        expect(providers.searchApolloPeople).not.toHaveBeenCalled();
      },
    );
    test.each([
      "startShoppingQuery",
      "pollShoppingQuery",
      "browseShopping",
    ] as const)(
      "cooldown leaves queued %s capture work unclaimed",
      async (stage) => {
        const { automation, readiness, assessment, capture } = active();
        if (stage === "startShoppingQuery") await advance(4);
        else {
          await advance();
          if (stage === "browseShopping") await advance(1);
        }
        const queued = await currentJob();
        expect(queued.output?.["stage"]).toBe(stage);
        spyOn(readiness, "getStatus").mockResolvedValue({
          success: true,
          data: {
            required: true,
            ready: false,
            missing: [],
            blocked: ["scrapellm", "firecrawl"],
          },
        });
        const result = value(
          await automation.run({
            campaignId: fixture.campaignId,
            maxSteps: 20,
          }),
        );
        expect(result.processed).toBe(0);
        expect(await currentJob()).toEqual(queued);
        expect(capture.startQuery).toHaveBeenCalledTimes(
          stage === "startShoppingQuery" ? 0 : 1,
        );
        expect(capture.pollQuery).toHaveBeenCalledTimes(
          stage === "browseShopping" ? 1 : 0,
        );
        expect(capture.inspectPages).not.toHaveBeenCalled();
        expect(assessment.assess).not.toHaveBeenCalled();
      },
    );
    test("a cooldown appearing after claim delays capture execution without submitting", async () => {
      const { readiness, capture } = active();
      expect((await advance(4)).results.at(-1)?.stage).toBe(
        "startShoppingQuery",
      );
      let checks = 0;
      spyOn(readiness, "getStatus").mockImplementation(async () => {
        const ready = checks++ === 0;
        return {
          success: true,
          data: {
            required: true,
            ready,
            missing: [],
            blocked: ready ? [] : ["firecrawl"],
          },
        };
      });
      const result = await advance(1);
      expect(result.processed).toBe(1);
      expect(result.results.at(-1)?.stage).toBe("startShoppingQuery");
      expect(result.results.at(-1)?.status).toBe("queued");
      expect((await currentJob()).output?.["availableAt"]).toBe(
        new Date(Date.now() + 60_000).toISOString(),
      );
      expect(capture.startQuery).not.toHaveBeenCalled();
      expect(capture.inspectPages).not.toHaveBeenCalled();
    });
    test.each(["unavailable", "rate-limit"] as const)(
      "transient %s polling retries the same job within its delay and forty-poll budget",
      async (code) => {
        const { automation, capture } = active();
        await advance();
        const submitted = await currentJob();
        const providerJob = capture.aiJobSchema.parse(
          submitted.output?.["shoppingJob"],
        );
        const poll = spyOn(capture, "pollQuery").mockResolvedValue({
          success: false,
          error: new IntegrationError(
            "scrapellm",
            code,
            "Fixture temporary polling failure",
            code === "rate-limit" ? 429 : 503,
            code === "rate-limit" ? 600 : null,
          ),
        });
        expect((await advance()).results.at(-1)?.status).toBe("queued");
        const retry = await currentJob();
        expect(retry.output?.["shoppingJob"]).toEqual(providerJob);
        expect(retry.output?.["shoppingPolls"]).toBe(1);
        expect(retry.output?.["shoppingPollError"]).toBe(code);
        expect(retry.output?.["availableAt"]).toBe(
          new Date(
            Date.now() + (code === "rate-limit" ? 300_000 : 60_000),
          ).toISOString(),
        );
        expect(
          value(
            await automation.run({
              campaignId: fixture.campaignId,
              maxSteps: 20,
            }),
          ).processed,
        ).toBe(0);
        for (let attempt = 1; attempt < 40; attempt++) await advance();
        expect((await currentJob()).output?.["shoppingPolls"]).toBe(40);
        expect((await advance()).results.at(-1)?.reason).toBe(
          "shopping-research-expired",
        );
        expect((await advance()).processed).toBe(0);
        expect(capture.startQuery).toHaveBeenCalledTimes(1);
        expect(poll).toHaveBeenCalledTimes(40);
        for (const [request] of poll.mock.calls)
          expect(request.job.id).toBe(providerJob.id);
        expect(capture.inspectPages).not.toHaveBeenCalled();
      },
    );
    test("an unknown paid submission is held permanently rather than submitted again", async () => {
      state.startError = new IntegrationError(
        "scrapellm",
        "uncertain",
        "Fixture lost submission response",
      );
      const { capture, store } = active();
      expect((await advance()).results.at(-1)?.status).toBe("uncertain");
      state.startError = null;
      value(
        await store.savePlaybook("fixture", {
          ...settings,
          weeklyTarget: settings.weeklyTarget + 1,
        }),
      );
      expect((await advance()).processed).toBe(0);
      expect(capture.startQuery).toHaveBeenCalledTimes(1);
      expect(capture.pollQuery).not.toHaveBeenCalled();
    });
    test.each(["pause", "criteria", "playbook"] as const)(
      "a %s change during submission keeps its receipt without advancing",
      async (change) => {
        const { store, db, schema, capture } = active();
        state.afterStart = async () => {
          if (change === "pause")
            value(
              await store.savePlaybook("fixture", {
                ...settings,
                automationEnabled: false,
              }),
            );
          if (change === "playbook")
            value(
              await store.savePlaybook("fixture", {
                ...settings,
                researchInstructions: `${settings.researchInstructions} Confirm the selected variant.`,
              }),
            );
          if (change === "criteria")
            await db
              .update(schema.outboundCampaign)
              .set({ revision: 2 })
              .where(eq(schema.outboundCampaign.id, fixture.campaignId));
        };
        await advance();
        const saved = await currentJob();
        expect(saved.output?.["shoppingJob"]).toMatchObject({
          query: { product },
        });
        expect(saved.status).toBe("failed");
        expect(capture.startQuery).toHaveBeenCalledTimes(1);
        expect(capture.pollQuery).not.toHaveBeenCalled();
      },
    );
    test("an expired pending query cannot be polled or resubmitted", async () => {
      const { capture, providers } = active();
      await advance();
      setSystemTime(new Date(now.getTime() + 2 * 86400_000));
      expect((await advance()).results.at(-1)?.reason).toBe(
        "shopping-research-expired",
      );
      expect(capture.startQuery).toHaveBeenCalledTimes(1);
      expect(capture.pollQuery).not.toHaveBeenCalled();
      expect(providers.searchApolloPeople).not.toHaveBeenCalled();
    });
    test.each(["expired", "changed"] as const)(
      "%s captured evidence cannot proceed to contact discovery",
      async (change) => {
        const { db, schema, providers, capture } = active();
        await advance();
        expect((await advance(3)).results.at(-1)?.stage).toBe("findContacts");
        if (change === "expired")
          setSystemTime(
            new Date(
              now.getTime() + (settings.verificationDays + 1) * 86400_000,
            ),
          );
        else {
          const job = await currentJob();
          const captured = capture.aiCaptureSchema.parse(
            job.output?.["shoppingAnswer"],
          );
          const first = captured.raw[0];
          if (!first) throw new Error("Missing original capture");
          first.body = "Changed provider body after capture";
          await db
            .update(schema.outboundIntegrationJob)
            .set({
              output: { ...job.output, shoppingAnswer: captured },
            })
            .where(eq(schema.outboundIntegrationJob.id, job.id));
        }
        expect((await advance()).results.at(-1)?.status).toBe("held");
        expect(providers.searchApolloPeople).not.toHaveBeenCalled();
        expect(capture.startQuery).toHaveBeenCalledTimes(1);
        expect((await advance()).processed).toBe(0);
      },
    );
  },
);
