import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import { IntegrationError } from "@/server/utils/outbound/http";
import { requireTestDatabase } from "./helpers/database";
import { saveSyntheticShoppingEvidence } from "./helpers/outbound-shopping-db-fixture";
import {
  syntheticWriterParts,
  syntheticWritingPolicy,
} from "./helpers/outbound-shopping-fixture";
import { passingCopyJudge } from "./helpers/outbound-writer-fixture";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const modules: {
  database?: typeof import("@/server/database");
  store?: typeof import("@/server/app/outbound/store");
  campaigns?: typeof import("@/server/app/outbound/campaigns");
  automation?: typeof import("@/server/app/outbound/automation");
  qualification?: typeof import("@/server/utils/outbound/automation-qualification");
  providers?: typeof import("@/server/utils/outbound/providers");
  draft?: typeof import("@/server/utils/outbound/draft");
  mx?: typeof import("@/server/utils/outbound/mx");
  recovery?: typeof import("@/server/utils/outbound/automation-recovery");
  research?: typeof import("@/server/utils/outbound/shopping-research");
  readiness?: typeof import("@/server/app/outbound/research-readiness");
} = {};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.campaigns ||
    !modules.automation ||
    !modules.qualification ||
    !modules.providers ||
    !modules.draft ||
    !modules.mx ||
    !modules.recovery ||
    !modules.research ||
    !modules.readiness
  )
    throw new Error("Fixture not loaded");
  return {
    ...modules.database,
    store: modules.store,
    campaigns: modules.campaigns,
    automation: modules.automation,
    qualification: modules.qualification,
    providers: modules.providers,
    draft: modules.draft,
    mx: modules.mx,
    recovery: modules.recovery,
    research: modules.research,
    readiness: modules.readiness,
  };
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const settings = syntheticWritingPolicy({
  ...defaultPlaybook,
  automationEnabled: true,
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
const fixture = { campaignId: "", companyId: "" };
const create = async (domain = "samplegoods.com") => {
  const { db, schema, campaigns } = active();
  const campaign = value(await campaigns.create("fixture", { name: domain }));
  value(
    await campaigns.update("fixture", {
      id: campaign.id,
      name: domain,
      status: "active",
      expectedRevision: 1,
    }),
  );
  const [company] = await db
    .insert(schema.outboundCampaignCompany)
    .values({
      campaignId: campaign.id,
      domain,
      name: "Sample Goods",
      website: `https://${domain}`,
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
  if (!company) throw new Error("Fixture missing");
  return { campaignId: campaign.id, companyId: company.id };
};
const jobs = async () =>
  active().db.select().from(active().schema.outboundIntegrationJob);
const recoveryJob = async (
  kind: "qualification" | "assessment" = "qualification",
) => {
  const { db, schema, store, research } = active();
  value(
    await store.savePlaybook("fixture", {
      ...settings,
      requireShoppingEvidence: true,
    }),
  );
  const policy = await store.policy();
  const [campaign] = await db
    .select()
    .from(schema.outboundCampaign)
    .where(eq(schema.outboundCampaign.id, fixture.campaignId));
  if (!campaign) throw new Error("Missing recovery campaign");
  const timestamp = new Date().toISOString();
  const product = {
    name: "Linen tote",
    brand: "Sample Goods",
    url: "https://samplegoods.com/products/tote",
    description: "A washable linen tote",
    price: 25,
    currency: "USD",
  };
  const digest = (body: string) =>
    createHash("sha256").update(body).digest("hex");
  const provider = JSON.stringify({
    domain: "samplegoods.com",
    platform: "shopify",
    source: "apollo",
    sourceId: "organization_fixture",
    sourceObservedAt: timestamp,
  });
  const receipts = [
    {
      kind: "provider",
      url: "https://app.apollo.io/#/organizations/organization_fixture",
      excerpt: provider,
      sha256: digest(provider),
      checkedAt: timestamp,
    },
    {
      kind: "storefront",
      url: "https://samplegoods.com",
      excerpt: "Sample Goods makes physical linen bags.",
      sha256: digest("original storefront HTML"),
      checkedAt: timestamp,
    },
    {
      kind: "product",
      url: product.url,
      excerpt: `A washable linen tote.\nObserved structured product: ${JSON.stringify(product)}`,
      sha256: digest("original product HTML"),
      checkedAt: timestamp,
    },
  ];
  const assessment = {
    decision: "hold",
    reason: "A verified AI shopping gap is required before qualification.",
    productCategory: "linen bags",
    ownBrandEvidence: null,
    physicalProductEvidence: null,
    establishedEvidence: null,
    criteriaEvidence: [],
    criteriaSatisfied: false,
    productInsight: null,
  };
  const qualification = {
    status: "hold",
    reason: assessment.reason,
    retryable: false,
    assessment,
    observedProduct: product,
    receipts,
    providerRequestId: "completed_qualification_fixture",
    usage: { inputTokens: 20, outputTokens: 10 },
  };
  const raw = (url: string, body: string, status = 200) => ({
    url,
    body,
    status,
    receivedAt: timestamp,
    sha256: digest(body),
  });
  const answer = raw(
    "https://www.google.com/search?q=linen+tote",
    "Linen tote large: USD 30, one-time purchase.",
  );
  const page = raw(product.url, "Linen tote large: USD 25, one-time purchase.");
  const ucp = raw(
    "https://samplegoods.com/.well-known/ucp",
    "404 Not Found",
    404,
  );
  const source = (
    id: string,
    kind: string,
    capture: string,
    captured: ReturnType<typeof raw>,
  ) => ({
    id,
    kind,
    capture,
    url: captured.url,
    content: captured.body,
    checkedAt: timestamp,
    artifact: `sha256:${captured.sha256}`,
  });
  const output =
    kind === "qualification"
      ? { qualification }
      : {
          qualification: {
            ...qualification,
            status: "qualified",
            details: { product: product.name, productUrl: product.url },
          },
          shoppingPolicyHash: research.researchPolicyHash(policy.settings),
          shoppingAnswer: {
            job: {
              id: crypto.randomUUID(),
              submittedAt: timestamp,
              query: {
                product: { name: product.name, url: product.url },
                category: "linen bags",
                country: "US",
                surface: "google_ai_mode",
                prompt: "Where can I buy a large linen tote?",
              },
            },
            executedAt: timestamp,
            receivedAt: timestamp,
            answer: answer.body,
            source: source("answer", "search", "provider", answer),
            links: [],
            cached: false,
            raw: [answer],
          },
          shoppingBrowser: {
            status: "captured",
            sources: [
              source("product", "product", "browser", page),
              source("ucp", "ucp", "http", ucp),
            ],
            raw: [page, ucp],
            candidates: [],
            limitations: [],
            ucp: {
              url: ucp.url,
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
          },
          shoppingAssessment: {
            status: "held",
            reason:
              "The finding needs more words than the first-email template allows; do not remove evidence qualifiers to fit.",
            assessment: { decision: "hold", selected: null, competitors: [] },
            providerRequestId: "completed_assessment_fixture",
            usage: { inputTokens: 20, outputTokens: 10 },
          },
        };
  const [job] = await db
    .insert(schema.outboundIntegrationJob)
    .values({
      provider: "automation",
      status: "failed",
      error:
        kind === "qualification"
          ? "qualification-held"
          : "shopping-research-held",
      requestId: `recovery_${crypto.randomUUID()}`,
      input: {
        operation: "campaignAutomation",
        ...fixture,
        companyName: "Sample Goods",
        companyDomain: "samplegoods.com",
        campaignRevision: campaign.revision,
        playbookRevision: policy.revision,
        actor: "fixture",
      },
      output: {
        ...output,
        stage: kind === "qualification" ? "qualify" : "assessShopping",
        availableAt: timestamp,
        lease: null,
      },
    })
    .returning();
  if (!job) throw new Error("Missing recovery job");
  return job;
};
const recoveryRequest = (job: Awaited<ReturnType<typeof recoveryJob>>) => ({
  jobId: job.id,
  expectedStateHash: active().recovery.researchStateHash(job.output),
  expectedInputHash: active().recovery.researchStateHash(job.input),
});
const recoverySnapshot = async () => {
  const { db, schema } = active();
  return Promise.all([
    jobs(),
    db.select().from(schema.outboundCampaignCompany),
    db.select().from(schema.outboundProspect),
    db.select().from(schema.outboundEvent),
    db.select().from(schema.outboundPlaybook),
  ]);
};
const contactPerson = (index: number) => ({
  id: `person_${index}`,
  name: `Jane${index} Smith`,
  first: `Jane${index}`,
  title: "Head of Growth",
  domain: "samplegoods.com",
  company: "Sample Goods",
  linkedinUrl: `https://www.linkedin.com/in/jane-${index}`,
  email: "",
  emailStatus: "unknown",
  matchConfidence: "exact",
  source: "apollo" as const,
  timezone: "America/New_York",
});
const contactJob = async (count = 4) => {
  const { automation } = active();
  value(
    await automation.run({ maxSteps: 1 }, async () => ({
      stage: "selectContact",
      output: {
        people: Array.from({ length: count }, (_, index) =>
          contactPerson(index + 1),
        ),
        peopleObservedAt: new Date().toISOString(),
        qualification: { status: "qualified", details: {}, receipts: [] },
      },
    })),
  );
  const [job] = await jobs();
  if (!job) throw new Error("Missing contact job");
  return job;
};
const undatedVerificationJob = async (title = "Head of Growth") => {
  const { automation, store } = active();
  value(
    await automation.run({ maxSteps: 1 }, async (claimed) => {
      const now = new Date().toISOString();
      const person = {
        ...contactPerson(1),
        email: "jane1@samplegoods.com",
        title,
      };
      const { id: _personId, ...personDetails } = person;
      const details = prospectSchema.parse({
        ...personDetails,
        company: "Sample Goods",
        website: "https://samplegoods.com",
        country: "US",
        platform: "shopify",
        product: "Multi-Stick",
        productUrl: "https://samplegoods.com/products/multi-stick",
        productCategory: "beauty and personal care",
        gap: "product-published-data",
        finding: "the page highlights Orange Peel Wax",
        productInsight: {
          sourceUrl: "https://samplegoods.com/products/multi-stick",
          sourceQuote: "Multi-Stick is formulated with Orange Peel Wax.",
          feature: "Orange Peel Wax",
          kind: "ingredient",
          relevance:
            "A shopper may use the ingredient when comparing makeup products.",
        },
        evidence: "Observed Multi-Stick with priced offer and product details",
        evidenceCheckedAt: now,
        legitEvidence: "Established physical consumer product brand",
        roleSource: "https://app.apollo.io/#/people/person_1",
        roleCheckedAt: now,
        emailSource: "Apollo person person_1",
        automationEvidenceId: claimed.job.id,
      });
      const saved = value(
        await store.saveCampaignProspect("fixture", {
          company: claimed.company.id,
          revision: claimed.campaign.revision,
          prospect: details,
        }),
      );
      return {
        stage: "applyVerification",
        reason: "verification-held",
        output: {
          prospectId: saved.prospect,
          prospectRevision: saved.revision,
          qualification: {
            status: "qualified",
            details,
            receipts: [
              {
                url: details.productUrl,
                kind: "product",
                checkedAt: now,
                sha256: "a".repeat(64),
                excerpt: "Multi-Stick is formulated with Orange Peel Wax.",
              },
            ],
            assessment: { productCategory: "beauty and personal care" },
          },
          selection: {
            status: "selected",
            provisional: false,
            person,
            details,
          },
          verification: {
            requestId: "verification_fixture",
            requestedAt: now,
            records: [
              { record_id: "verified_record", input: { email: person.email } },
            ],
          },
          verificationResult: {
            requestId: "verification_fixture",
            status: "complete",
            results: [
              {
                email: person.email,
                recordId: "verified_record",
                status: "verified",
                verifiedAt: null,
              },
            ],
          },
          verificationPolls: 1,
        },
      };
    }),
  );
  const [job] = await jobs();
  if (!job?.prospectId) throw new Error("Missing verification fixture");
  return job;
};

describe.skipIf(!endpoint)("isolated campaign automation ledger", () => {
  beforeAll(async () => {
    requireTestDatabase(endpoint);
    Object.assign(process.env, {
      DATABASE_URL: endpoint,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
    });
    mock.module("server-only", () => ({}));
    modules.database = await import("@/server/database");
    modules.store = await import("@/server/app/outbound/store");
    modules.campaigns = await import("@/server/app/outbound/campaigns");
    modules.automation = await import("@/server/app/outbound/automation");
    modules.qualification = await import(
      "@/server/utils/outbound/automation-qualification"
    );
    modules.providers = await import("@/server/utils/outbound/providers");
    modules.draft = await import("@/server/utils/outbound/draft");
    modules.mx = await import("@/server/utils/outbound/mx");
    modules.recovery = await import(
      "@/server/utils/outbound/automation-recovery"
    );
    modules.research = await import(
      "@/server/utils/outbound/shopping-research"
    );
    modules.readiness = await import(
      "@/server/app/outbound/research-readiness"
    );
  });
  beforeEach(async () => {
    const { db, store } = active();
    await db.execute(sql`set client_min_messages to warning`);
    await db.execute(
      sql`truncate outbound_integration_job, outbound_campaign, outbound_company, outbound_person, outbound_prospect, outbound_event, outbound_revision, outbound_playbook, outbound_provider_credential, outbound_suppression, outbound_inbox cascade`,
    );
    value(await store.savePlaybook("fixture", settings));
    Object.assign(fixture, await create());
  });
  afterEach(() => mock.restore());

  const rejectedQuery = async () => {
    const { db, schema } = active();
    const job = await recoveryJob();
    const output = {
      ...job.output,
      stage: "startShoppingQuery",
      failureProvider: "scrapellm",
      failureReceipt: { statusCode: 429, code: "rate-limit" },
      qualification: {
        status: "qualified",
        details: { productUrl: "https://samplegoods.com/products/tote" },
        receipts: [{ checkedAt: "2026-11-20T10:00:00.000Z" }],
      },
      shoppingQuery: {
        product: {
          name: "Linen tote",
          url: "https://samplegoods.com/products/tote",
        },
        country: "US",
        surface: "google_ai_mode",
        category: "linen tote",
        prompt: "Where can I buy a linen tote?",
      },
    };
    const [saved] = await db
      .update(schema.outboundIntegrationJob)
      .set({ output, error: "provider-rate-limit" })
      .where(eq(schema.outboundIntegrationJob.id, job.id))
      .returning();
    if (!saved) throw new Error("Missing rejected query");
    return saved;
  };

  test("definitively rejected research resumes exactly once from saved query and qualification", async () => {
    const { automation } = active();
    const job = await rejectedQuery();
    const request = recoveryRequest(job);
    const before = await recoverySnapshot();
    expect(
      value(
        await automation.resumeProviderFailure("operator", {
          ...request,
          dryRun: true,
        }),
      ),
    ).toMatchObject({ repeated: false, dryRun: true, job: { status: "held" } });
    expect(await recoverySnapshot()).toEqual(before);
    const resumed = await Promise.all([
      automation.resumeProviderFailure("operator", request),
      automation.resumeProviderFailure("operator", request),
    ]);
    expect(resumed.map((result) => value(result).repeated).sort()).toEqual([
      false,
      true,
    ]);
    const [saved] = await jobs();
    expect(saved?.status).toBe("pending");
    expect(saved?.error).toBeNull();
    expect(saved?.input).toEqual(job.input);
    expect(saved?.requestId).toBe(job.requestId);
    expect(saved?.output?.["stage"]).toBe("startShoppingQuery");
    expect(saved?.output?.["qualification"]).toEqual(
      job.output?.["qualification"],
    );
    expect(saved?.output?.["shoppingQuery"]).toEqual(
      job.output?.["shoppingQuery"],
    );
    expect(saved?.output?.["providerRecovery"]).toMatchObject({
      version: 1,
      actor: "operator",
      provider: "scrapellm",
      sourceStateHash: request.expectedStateHash,
      previousReason: "provider-rate-limit",
      previousReceipt: { statusCode: 429, code: "rate-limit" },
    });
    expect((await recoverySnapshot()).slice(1)).toEqual(before.slice(1));
  });

  test.each([
    "uncertain",
    "starting",
    "active-lease",
    "wrong-error",
    "wrong-provider",
    "wrong-stage",
    "accepted-query",
    "changed-state",
  ])(
    "provider recovery refuses %s without changing saved work",
    async (kind) => {
      const { automation, db, schema } = active();
      const job = await rejectedQuery();
      const original = recoveryRequest(job);
      const output = {
        ...job.output,
        ...(kind === "active-lease"
          ? {
              lease: {
                token: crypto.randomUUID(),
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
              },
            }
          : {}),
        ...(kind === "wrong-provider" ? { failureProvider: "apollo" } : {}),
        ...(kind === "wrong-stage" ? { stage: "browseShopping" } : {}),
        ...(kind === "accepted-query"
          ? { shoppingJob: { id: "accepted" } }
          : {}),
        ...(kind === "changed-state" ? { note: "changed after review" } : {}),
      };
      const [changed] = await db
        .update(schema.outboundIntegrationJob)
        .set({
          output,
          ...(kind === "uncertain" || kind === "starting"
            ? { status: kind }
            : {}),
          ...(kind === "wrong-error" ? { error: "provider-input" } : {}),
        })
        .where(eq(schema.outboundIntegrationJob.id, job.id))
        .returning();
      if (!changed) throw new Error("Missing changed query");
      const before = await recoverySnapshot();
      expect(
        (
          await automation.resumeProviderFailure(
            "operator",
            kind === "changed-state" ? original : recoveryRequest(changed),
          )
        ).success,
      ).toBe(false);
      expect(await recoverySnapshot()).toEqual(before);
    },
  );

  test.each(["qualification", "assessment"] as const)(
    "%s recovery dry runs leave the entire checkpoint and related records unchanged",
    async (kind) => {
      const { automation } = active();
      const job = await recoveryJob(kind);
      const before = await recoverySnapshot();
      const response = value(
        await automation.resumeResearchReview("reviewer", {
          ...recoveryRequest(job),
          dryRun: true,
        }),
      );
      expect(response).toMatchObject({
        repeated: false,
        dryRun: true,
        job: { status: "held" },
      });
      expect(await recoverySnapshot()).toEqual(before);
    },
  );

  test.each(["qualification", "assessment"] as const)(
    "%s recovery is atomic under concurrent admission and can be used only once",
    async (kind) => {
      const { automation, readiness } = active();
      const job = await recoveryJob(kind);
      const request = recoveryRequest(job);
      const responses = await Promise.all([
        automation.resumeResearchReview("reviewer-one", request),
        automation.resumeResearchReview("reviewer-two", request),
      ]);
      expect(
        responses.map((response) => value(response).repeated).sort(),
      ).toEqual([false, true]);
      const [resumed] = await jobs();
      expect(resumed?.status).toBe("pending");
      expect(resumed?.error).toBeNull();
      expect(resumed?.output?.["researchReviewRecovery"]).toMatchObject({
        kind,
        sourceStateHash: request.expectedStateHash,
        sourceInputHash: request.expectedInputHash,
        previousReason: job.error,
        previousAssessment:
          job.output?.[
            kind === "qualification" ? "qualification" : "shoppingAssessment"
          ],
      });
      expect(resumed?.output?.["shoppingAnswer"]).toEqual(
        job.output?.["shoppingAnswer"],
      );
      expect(resumed?.output?.["shoppingBrowser"]).toEqual(
        job.output?.["shoppingBrowser"],
      );
      expect(resumed?.input).toEqual(job.input);
      expect(resumed?.requestId).toBe(job.requestId);
      spyOn(readiness, "getStatus").mockResolvedValue({
        success: true,
        data: { required: true, ready: true, missing: [], blocked: [] },
      });
      const execute = mock(async () => ({
        stage:
          kind === "qualification"
            ? ("qualify" as const)
            : ("assessShopping" as const),
        reason:
          kind === "qualification"
            ? "qualification-held"
            : "shopping-research-held",
        output: { completedRecoveryAssessment: "held again" },
      }));
      expect(
        value(await automation.run({ jobId: job.id, maxSteps: 3 }, execute))
          .processed,
      ).toBe(1);
      const [held] = await jobs();
      if (!held) throw new Error("Missing recovered checkpoint");
      const before = await recoverySnapshot();
      expect(
        (
          await automation.resumeResearchReview(
            "reviewer",
            recoveryRequest(held),
          )
        ).success,
      ).toBe(false);
      expect(
        value(await automation.resumeResearchReview("reviewer", request))
          .repeated,
      ).toBe(true);
      expect(await recoverySnapshot()).toEqual(before);
      expect(execute).toHaveBeenCalledTimes(1);
    },
  );

  test.each(["state", "input"] as const)(
    "recovery rejects an exact %s checkpoint changed since the audit, then accepts a current snapshot",
    async (field) => {
      const { automation, db, schema } = active();
      const job = await recoveryJob();
      const request = recoveryRequest(job);
      await db
        .update(schema.outboundIntegrationJob)
        .set(
          field === "state"
            ? {
                output: {
                  ...job.output,
                  auditNote: "changed after inspection",
                },
              }
            : { input: { ...job.input, actor: "changed after inspection" } },
        )
        .where(eq(schema.outboundIntegrationJob.id, job.id));
      const before = await recoverySnapshot();
      expect(
        (await automation.resumeResearchReview("reviewer", request)).success,
      ).toBe(false);
      expect(await recoverySnapshot()).toEqual(before);
      const [changed] = await jobs();
      if (!changed) throw new Error("Missing changed checkpoint");
      expect(
        value(
          await automation.resumeResearchReview(
            "reviewer",
            recoveryRequest(changed),
          ),
        ).job.status,
      ).toBe("queued");
    },
  );

  test.each([
    "uncertain",
    "starting",
    "active-lease",
    "expired-lease",
    "wrong-error",
    "wrong-stage",
    "explicit-skip",
    "post-contact",
    "explicit-variant-mismatch",
  ])(
    "recovery preserves the %s job even when its current hashes are supplied",
    async (condition) => {
      const { automation, db, schema } = active();
      const job = await recoveryJob(
        condition === "explicit-variant-mismatch"
          ? "assessment"
          : "qualification",
      );
      const qualification = job.output?.["qualification"] as Record<
        string,
        unknown
      >;
      const output = {
        ...job.output,
        ...(condition === "active-lease" || condition === "expired-lease"
          ? {
              lease: {
                token: crypto.randomUUID(),
                expiresAt: new Date(
                  Date.now() + (condition === "active-lease" ? 60000 : -60000),
                ).toISOString(),
              },
            }
          : {}),
        ...(condition === "wrong-stage" ? { stage: "draft" } : {}),
        ...(condition === "explicit-skip"
          ? {
              qualification: {
                ...qualification,
                status: "skip",
                assessment: { decision: "skip" },
              },
            }
          : {}),
        ...(condition === "post-contact" ? { people: [contactPerson(1)] } : {}),
        ...(condition === "explicit-variant-mismatch"
          ? {
              shoppingAssessment: {
                status: "held",
                reason:
                  "The captured answer and page compare different product variants.",
              },
            }
          : {}),
      };
      const [changed] = await db
        .update(schema.outboundIntegrationJob)
        .set({
          output,
          ...(condition === "uncertain" || condition === "starting"
            ? { status: condition }
            : {}),
          ...(condition === "wrong-error"
            ? { error: "provider-uncertain" }
            : {}),
        })
        .where(eq(schema.outboundIntegrationJob.id, job.id))
        .returning();
      if (!changed) throw new Error("Missing ineligible job");
      const before = await recoverySnapshot();
      expect(
        (
          await automation.resumeResearchReview(
            "reviewer",
            recoveryRequest(changed),
          )
        ).success,
      ).toBe(false);
      expect(await recoverySnapshot()).toEqual(before);
    },
  );

  test.each([
    "campaign-revision",
    "playbook-revision",
    "company-criteria-revision",
    "campaign-inactive",
    "automation-disabled",
    "company-excluded",
    "company-domain",
  ])(
    "recovery rechecks current %s rather than trusting the audited input",
    async (condition) => {
      const { automation, db, schema, store } = active();
      const job = await recoveryJob();
      if (
        condition === "campaign-revision" ||
        condition === "campaign-inactive"
      )
        await db
          .update(schema.outboundCampaign)
          .set(
            condition === "campaign-revision"
              ? { revision: Number(job.input?.["campaignRevision"]) + 1 }
              : { status: "paused" },
          )
          .where(eq(schema.outboundCampaign.id, fixture.campaignId));
      if (
        condition === "playbook-revision" ||
        condition === "automation-disabled"
      )
        value(
          await store.savePlaybook("fixture", {
            ...settings,
            requireShoppingEvidence: true,
            targetingNotes: "Changed after audit",
            automationEnabled: condition !== "automation-disabled",
          }),
        );
      if (condition.startsWith("company-"))
        await db
          .update(schema.outboundCampaignCompany)
          .set(
            condition === "company-criteria-revision"
              ? {
                  criteriaRevision: Number(job.input?.["campaignRevision"]) + 1,
                }
              : condition === "company-excluded"
                ? { status: "excluded" }
                : { domain: "changedgoods.com" },
          )
          .where(eq(schema.outboundCampaignCompany.id, fixture.companyId));
      const before = await recoverySnapshot();
      expect(
        (
          await automation.resumeResearchReview(
            "reviewer",
            recoveryRequest(job),
          )
        ).success,
      ).toBe(false);
      expect(await recoverySnapshot()).toEqual(before);
    },
  );

  test.each(["pending", "starting", "uncertain"] as const)(
    "the %s operation for the domain in another campaign blocks recovery",
    async (status) => {
      const { automation, db, schema } = active();
      const job = await recoveryJob();
      const other = await create();
      await db.insert(schema.outboundIntegrationJob).values({
        provider: "automation",
        status,
        input: { ...job.input, ...other },
        output: { ...job.output },
      });
      const before = await recoverySnapshot();
      expect(
        (
          await automation.resumeResearchReview(
            "reviewer",
            recoveryRequest(job),
          )
        ).success,
      ).toBe(false);
      expect(await recoverySnapshot()).toEqual(before);
    },
  );

  test.each(["held", "uncertain"] as const)(
    "qualification recovery preserves its %s assessment result without recollecting pages or replaying",
    async (status) => {
      const { automation, qualification, readiness } = active();
      const job = await recoveryJob();
      const original = qualification.companyEvidenceSchema
        .pick({ receipts: true })
        .extend({
          observedProduct: qualification.companyEvidenceSchema.shape.product,
        })
        .parse(job.output?.["qualification"]);
      value(
        await automation.resumeResearchReview("reviewer", recoveryRequest(job)),
      );
      const collect = spyOn(qualification, "qualifyCompany");
      const assess = spyOn(
        qualification,
        "qualifyCompanyEvidence",
      ).mockImplementation(async (input) => {
        expect(input.evidence).toEqual({
          platform: "shopify",
          product: original.observedProduct,
          receipts: original.receipts,
        });
        expect((await jobs())[0]?.status).toBe("starting");
        if (status === "uncertain")
          return {
            success: false,
            error: new IntegrationError(
              "azure",
              "uncertain",
              "Lost model response",
            ),
          };
        return {
          success: true,
          data: {
            status: "hold",
            reason: "Company fit remains unproven.",
            retryable: false,
            receipts: input.evidence.receipts,
          },
        };
      });
      spyOn(readiness, "getStatus").mockResolvedValue({
        success: true,
        data: { required: true, ready: true, missing: [], blocked: [] },
      });
      const response = value(
        await automation.run({ jobId: job.id, maxSteps: 3 }),
      );
      expect(response.processed).toBe(1);
      expect(response.results[0]).toMatchObject({
        stage: "qualify",
        status,
        reason: status === "held" ? "qualification-held" : "provider-uncertain",
      });
      expect(assess).toHaveBeenCalledTimes(1);
      expect(collect).not.toHaveBeenCalled();
      expect(
        value(await automation.run({ jobId: job.id, maxSteps: 3 })).processed,
      ).toBe(0);
      expect(assess).toHaveBeenCalledTimes(1);
      const [finished] = await jobs();
      if (!finished) throw new Error("Missing completed recovery");
      const before = await recoverySnapshot();
      expect(
        (
          await automation.resumeResearchReview(
            "reviewer",
            recoveryRequest(finished),
          )
        ).success,
      ).toBe(false);
      expect(
        value(
          await automation.resumeResearchReview(
            "reviewer",
            recoveryRequest(job),
          ),
        ).job.status,
      ).toBe(status);
      expect(await recoverySnapshot()).toEqual(before);
    },
  );

  test("source-backed category correction accepts the same VP alias as selection without altering the actual title", async () => {
    const { db, schema, store, automation } = active();
    value(
      await store.savePlaybook("fixture", {
        ...settings,
        targetRoles: "VP Digital",
      }),
    );
    const [campaign] = await db
      .select()
      .from(schema.outboundCampaign)
      .where(eq(schema.outboundCampaign.id, fixture.campaignId));
    if (!campaign) throw new Error("Missing campaign");
    await db
      .update(schema.outboundCampaign)
      .set({ criteria: { ...campaign.criteria, targetRoles: ["VP Digital"] } })
      .where(eq(schema.outboundCampaign.id, campaign.id));
    const actualTitle = "Vice President of Digital & eCommerce";
    const job = await undatedVerificationJob(actualTitle);
    expect(
      value(
        await automation.normalizeProductCategoryForJob("fixture", {
          jobId: job.id,
          expectedProspectRevision: Number(job.output?.["prospectRevision"]),
        }),
      ).corrected,
    ).toBe(true);
    expect(
      (await db.select().from(schema.outboundProspect))[0]?.details.title,
    ).toBe(actualTitle);
    expect(
      (await db.select().from(schema.outboundCampaign))[0]?.criteria
        .targetRoles,
    ).toEqual(["VP Digital"]);
  });

  test("a broad category is corrected atomically from the original product receipt with an audit record", async () => {
    const { automation, db, schema } = active();
    const job = await undatedVerificationJob();
    const previousRevision = Number(job.output?.["prospectRevision"]);
    const fixed = value(
      await automation.normalizeProductCategoryForJob("fixture-correction", {
        jobId: job.id,
        expectedProspectRevision: previousRevision,
      }),
    );
    expect(fixed.corrected).toBe(true);
    expect(fixed.revision).toBe(previousRevision + 1);
    const [prospect] = await db.select().from(schema.outboundProspect);
    const [current] = await jobs();
    expect(prospect?.details.productCategory).toBe("Multi-Stick");
    expect(current?.output?.["prospectRevision"]).toBe(prospect?.revision);
    expect(current?.output?.["qualification"]).toMatchObject({
      details: { productCategory: "Multi-Stick" },
      assessment: { productCategory: "beauty and personal care" },
    });
    expect(current?.output?.["categoryCorrections"]).toMatchObject([
      {
        before: "beauty and personal care",
        after: "Multi-Stick",
        receiptSha256: "a".repeat(64),
        previousProspectRevision: previousRevision,
        prospectRevision: fixed.revision,
        actor: "fixture-correction",
      },
    ]);
    expect(current?.status).toBe("failed");
    expect(current?.error).toBe("verification-held");
    expect(current?.output?.["stage"]).toBe("applyVerification");
    expect(prospect?.approvedAt).toBeNull();
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(0);
  });
  test.each(["revision", "receipt", "approved", "sent"])(
    "category correction rejects a changed %s instead of rebinding evidence",
    async (changed) => {
      const { automation, db, schema } = active();
      const job = await undatedVerificationJob();
      const revision = Number(job.output?.["prospectRevision"]);
      if (changed === "receipt") {
        const qualification = job.output?.["qualification"] as Record<
          string,
          unknown
        >;
        await db
          .update(schema.outboundIntegrationJob)
          .set({
            output: {
              ...job.output,
              qualification: { ...qualification, receipts: [] },
            },
          })
          .where(eq(schema.outboundIntegrationJob.id, job.id));
      }
      if (changed === "approved")
        await db
          .update(schema.outboundProspect)
          .set({ approvedAt: new Date(), approvedBy: "fixture" });
      if (changed === "sent")
        await db.update(schema.outboundProspect).set({ sentStep: 1 });
      expect(
        (
          await automation.normalizeProductCategoryForJob("fixture", {
            jobId: job.id,
            expectedProspectRevision:
              changed === "revision" ? revision + 1 : revision,
          })
        ).success,
      ).toBe(false);
      expect(
        (await db.select().from(schema.outboundProspect))[0]?.details
          .productCategory,
      ).toBe("beauty and personal care");
    },
  );
  test("the normal draft stage corrects broad categories but holds legacy product-only evidence before buying copy", async () => {
    const { automation, db, schema, draft } = active();
    const job = await undatedVerificationJob();
    await db
      .update(schema.outboundIntegrationJob)
      .set({
        status: "pending",
        error: null,
        output: { ...job.output, stage: "draft" },
      })
      .where(eq(schema.outboundIntegrationJob.id, job.id));
    const generate = spyOn(draft, "composeSequence");
    expect(
      value(await automation.run({ jobId: job.id, maxSteps: 1 })).results.at(-1)
        ?.stage,
    ).toBe("draft");
    expect(generate).not.toHaveBeenCalled();
    expect(
      (await db.select().from(schema.outboundProspect))[0]?.details
        .productCategory,
    ).toBe("Multi-Stick");
    expect(
      value(await automation.run({ jobId: job.id, maxSteps: 1 })).results.at(-1)
        ?.stage,
    ).toBe("draft");
    expect(generate).not.toHaveBeenCalled();
    expect((await jobs()).find((entry) => entry.id === job.id)?.status).toBe(
      "failed",
    );
  });
  test("a verified-but-undated result rechecks only its original request and never submits verification again", async () => {
    const { automation, providers, db, schema } = active();
    const job = await undatedVerificationJob();
    const verify = spyOn(providers, "verifyApolloEmails");
    const completedAt = new Date().toISOString();
    const poll = spyOn(providers, "pollApolloVerification").mockResolvedValue({
      success: true,
      data: {
        requestId: "verification_fixture",
        status: "complete",
        results: [
          {
            email: "jane1@samplegoods.com",
            recordId: "verified_record",
            status: "verified",
            verifiedAt: completedAt,
            source: "apollo",
            verdict: "validated",
            timestampProof: {
              kind: "request-completed",
              requestId: "verification_fixture",
              action: "email_verifier",
              initiatedAt: job.createdAt.toISOString(),
              completedAt,
            },
          },
        ],
        retryAfterSeconds: 30,
      },
    });
    value(
      await automation.resumeVerificationDateCheck("fixture", {
        jobId: job.id,
        expectedProspectRevision: Number(job.output?.["prospectRevision"]),
      }),
    );
    expect(poll).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
    expect(
      value(await automation.run({ jobId: job.id, maxSteps: 2 })).results.at(-1)
        ?.stage,
    ).toBe("mx");
    expect(poll.mock.calls.map(([input]) => input.requestId)).toEqual([
      "verification_fixture",
    ]);
    expect(verify).not.toHaveBeenCalled();
    expect(
      (await db.select().from(schema.outboundProspect))[0]?.details
        .emailVerifiedAt,
    ).toBe(completedAt);
  });
  test("verification date recheck refuses an uncertain job or mismatched request", async () => {
    const { automation, db, schema } = active();
    const job = await undatedVerificationJob();
    await db
      .update(schema.outboundIntegrationJob)
      .set({ status: "uncertain" })
      .where(eq(schema.outboundIntegrationJob.id, job.id));
    expect(
      (
        await automation.resumeVerificationDateCheck("fixture", {
          jobId: job.id,
          expectedProspectRevision: Number(job.output?.["prospectRevision"]),
        })
      ).success,
    ).toBe(false);
    const result = job.output?.["verificationResult"] as Record<
      string,
      unknown
    >;
    await db
      .update(schema.outboundIntegrationJob)
      .set({
        status: "failed",
        output: {
          ...job.output,
          verificationResult: { ...result, requestId: "different_request" },
        },
      })
      .where(eq(schema.outboundIntegrationJob.id, job.id));
    expect(
      (
        await automation.resumeVerificationDateCheck("fixture", {
          jobId: job.id,
          expectedProspectRevision: Number(job.output?.["prospectRevision"]),
        })
      ).success,
    ).toBe(false);
  });

  test.each(["email-unavailable", "actual-assistant"])(
    "a completed %s enrichment advances to the next saved candidate and journals each paid attempt first",
    async (failure) => {
      const { db, schema, automation, providers } = active();
      const job = await contactJob();
      const enriched = spyOn(
        providers,
        "enrichApolloPerson",
      ).mockImplementation(async ({ id }) => {
        const [current] = await jobs();
        const attempts = current?.output?.["contactAttempts"] as {
          personId: string;
          status: string;
        }[];
        expect(attempts.at(-1)).toMatchObject({
          personId: id,
          status: "selected",
        });
        expect(current?.status).toBe("starting");
        const index = Number(id?.split("_")[1]);
        const person = contactPerson(index);
        return {
          success: true,
          data: {
            ...person,
            email:
              index === 1 && failure === "email-unavailable"
                ? ""
                : `jane${index}@samplegoods.com`,
            title:
              index === 1 && failure === "actual-assistant"
                ? "Assistant to Head of Growth"
                : person.title,
          },
        };
      });
      const result = value(
        await automation.run({ jobId: job.id, maxSteps: 4 }),
      );
      expect(result.results.at(-1)?.stage).toBe("promote");
      const [finished] = await jobs();
      expect(finished?.output?.["contactAttempts"]).toMatchObject([
        { personId: "person_1", status: "unavailable" },
        { personId: "person_2", status: "enriched" },
      ]);
      expect(finished?.output?.["selection"]).toMatchObject({
        person: { id: "person_2" },
      });
      expect(enriched).toHaveBeenCalledTimes(2);
      expect(await db.select().from(schema.outboundProspect)).toHaveLength(0);
    },
  );
  test("contact fallback stops at three distinct completed enrichments without buying another search", async () => {
    const { automation, providers } = active();
    const job = await contactJob(4);
    const search = spyOn(providers, "searchApolloPeople");
    const enriched = spyOn(providers, "enrichApolloPerson").mockImplementation(
      async ({ id }) => ({
        success: true,
        data: contactPerson(Number(id?.split("_")[1])),
      }),
    );
    const result = value(await automation.run({ jobId: job.id, maxSteps: 20 }));
    expect(result.results.at(-1)).toMatchObject({
      stage: "selectContact",
      status: "held",
      reason: "contact-held",
    });
    expect((await jobs())[0]?.output?.["contactAttempts"]).toHaveLength(3);
    expect(enriched).toHaveBeenCalledTimes(3);
    expect(new Set(enriched.mock.calls.map(([input]) => input.id)).size).toBe(
      3,
    );
    expect(search).not.toHaveBeenCalled();
    expect(
      value(await automation.run({ jobId: job.id, maxSteps: 20 })).processed,
    ).toBe(0);
    expect(enriched).toHaveBeenCalledTimes(3);
  });
  test("an unknown enrichment result holds the whole company and cannot advance or be resumed", async () => {
    const { automation, providers } = active();
    const job = await contactJob();
    const enriched = spyOn(providers, "enrichApolloPerson").mockResolvedValue({
      success: false,
      error: new IntegrationError(
        "apollo",
        "uncertain",
        "fixture lost response",
      ),
    });
    expect(
      value(await automation.run({ jobId: job.id, maxSteps: 20 })).results.at(
        -1,
      )?.status,
    ).toBe("uncertain");
    expect((await jobs())[0]?.output?.["contactAttempts"]).toMatchObject([
      { personId: "person_1", status: "selected" },
    ]);
    expect(
      (await automation.resumeContactFallback("fixture", { jobId: job.id }))
        .success,
    ).toBe(false);
    expect(
      value(await automation.run({ jobId: job.id, maxSteps: 20 })).processed,
    ).toBe(0);
    expect(enriched).toHaveBeenCalledTimes(1);
  });
  test("a known legacy contact miss resumes from the saved search and counts its previous paid attempt", async () => {
    const { db, schema, automation, providers } = active();
    const job = await contactJob();
    await db
      .update(schema.outboundIntegrationJob)
      .set({
        status: "failed",
        error: "contact-held",
        output: {
          ...job.output,
          stage: "enrich",
          selection: {
            status: "selected",
            person: contactPerson(1),
            details: {},
            provisional: false,
          },
          enrichment: contactPerson(1),
        },
      })
      .where(eq(schema.outboundIntegrationJob.id, job.id));
    const enriched = spyOn(providers, "enrichApolloPerson").mockImplementation(
      async ({ id }) => ({
        success: true,
        data: {
          ...contactPerson(Number(id?.split("_")[1])),
          email: "jane2@samplegoods.com",
        },
      }),
    );
    expect(
      value(
        await automation.resumeContactFallback("fixture", { jobId: job.id }),
      ).stage,
    ).toBe("selectContact");
    expect(enriched).not.toHaveBeenCalled();
    expect(
      value(await automation.run({ jobId: job.id, maxSteps: 2 })).results.at(-1)
        ?.stage,
    ).toBe("promote");
    expect((await jobs())[0]?.output?.["contactAttempts"]).toMatchObject([
      { personId: "person_1", status: "unavailable" },
      { personId: "person_2", status: "enriched" },
    ]);
    expect(enriched.mock.calls.map(([input]) => input.id)).toEqual([
      "person_2",
    ]);
  });

  test("sequence refresh jobs are never claimed or counted as company preparation", async () => {
    const { db, schema, automation } = active();
    await db.insert(schema.outboundIntegrationJob).values({
      provider: "automation",
      requestId: "refresh_fixture",
      status: "pending",
      input: { operation: "sequenceRefresh" },
      output: { stage: "verify" },
    });
    const execute = mock(async () => ({ stage: "complete" as const }));
    value(await automation.run({ maxSteps: 1 }, execute));
    expect(execute).toHaveBeenCalledTimes(1);
    const [refresh] = await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.requestId, "refresh_fixture"));
    expect(refresh?.status).toBe("pending");
    expect(
      value(await automation.getStatus()).jobs.some(
        (job) => job.id === refresh?.id,
      ),
    ).toBe(false);
  });

  test("disabled mode and inactive campaigns cannot execute or reserve paid work", async () => {
    const { automation, store, campaigns } = active();
    const execute = mock(async () => ({ stage: "complete" as const }));
    value(
      await store.savePlaybook("fixture", {
        ...settings,
        automationEnabled: false,
      }),
    );
    expect(value(await automation.run({}, execute)).processed).toBe(0);
    expect(await jobs()).toHaveLength(0);
    value(await store.savePlaybook("fixture", settings));
    value(
      await campaigns.update("fixture", {
        id: fixture.campaignId,
        name: "Paused",
        status: "paused",
        expectedRevision: 1,
      }),
    );
    expect(value(await automation.run({}, execute)).processed).toBe(0);
    expect(execute).not.toHaveBeenCalled();
  });
  test("Apollo pause keeps billable preparation pending and resumes its exact checkpoint once", async () => {
    const { automation, store } = active();
    const before = await store.policy();
    value(
      await store.savePlaybook("fixture", {
        ...before.settings,
        automaticApolloEnabled: false,
      }),
    );
    const execute = mock(async () => ({ stage: "qualify" as const }));
    const result = value(await automation.run({ maxSteps: 3 }, execute));
    expect(result.processed).toBe(0);
    expect(result.blockers).toContain("apollo-paused");
    expect(execute).not.toHaveBeenCalled();
    const [paused] = await jobs();
    if (!paused) throw new Error("Missing paused job");
    expect(paused).toMatchObject({
      status: "pending",
      error: "apollo-paused",
      output: { stage: "companyFacts", lease: null },
    });
    value(await automation.run({ maxSteps: 3 }, execute));
    expect(await jobs()).toEqual([paused]);
    expect((await store.policy()).revision).toBe(before.revision);
    value(await store.savePlaybook("fixture", before.settings));
    expect(
      value(await automation.run({ maxSteps: 1 }, execute)).processed,
    ).toBe(1);
    expect(execute).toHaveBeenCalledTimes(1);
    const [resumed] = await jobs();
    expect(resumed).toMatchObject({
      id: paused?.id,
      input: paused?.input,
      requestId: paused?.requestId,
      status: "pending",
      error: null,
      output: { stage: "qualify", lease: null },
    });
  });
  test.each(["enrich", "verify"] as const)(
    "Apollo pause prevents new %s requests without discarding saved receipts",
    async (stage) => {
      const { automation, store } = active();
      value(
        await automation.run({ maxSteps: 1 }, async () => ({
          stage,
          output: { receipt: "saved-before-pause" },
        })),
      );
      const [original] = await jobs();
      value(
        await store.savePlaybook("fixture", {
          ...settings,
          automaticApolloEnabled: false,
        }),
      );
      const execute = mock(async () => ({ stage: "complete" as const }));
      expect(
        value(await automation.run({ maxSteps: 3 }, execute)).processed,
      ).toBe(0);
      expect(execute).not.toHaveBeenCalled();
      const [paused] = await jobs();
      expect(paused).toMatchObject({
        id: original?.id,
        status: "pending",
        error: "apollo-paused",
        output: original?.output,
      });
    },
  );
  test("Apollo pause allows accepted request reconciliation and saved company facts without another enrichment", async () => {
    const { automation, store, qualification, db, schema } = active();
    const sourcePayload = {
      id: "organization_fixture",
      name: "Sample Goods",
      primary_domain: "samplegoods.com",
      country: "United States",
      estimated_num_employees: 10,
      sourceObservedAt: "2026-11-20T10:00:00.000Z",
    };
    await db
      .update(schema.outboundCampaignCompany)
      .set({ sourcePayload })
      .where(eq(schema.outboundCampaignCompany.id, fixture.companyId));
    value(
      await store.savePlaybook("fixture", {
        ...settings,
        automaticApolloEnabled: false,
      }),
    );
    const enrichment = spyOn(qualification, "enrichCompany").mockImplementation(
      async () => {
        throw new Error("Apollo spending must remain paused");
      },
    );
    expect(value(await automation.run({ maxSteps: 1 })).processed).toBe(1);
    expect(enrichment).not.toHaveBeenCalled();
    const [saved] = await jobs();
    expect(saved?.output).toMatchObject({
      stage: "qualify",
      companyFacts: { sourcePayload },
    });
    if (!saved) throw new Error("Fixture missing");
    const output = {
      ...saved.output,
      stage: "pollVerification",
      verification: { requestId: "already-accepted" },
    };
    await db
      .update(schema.outboundIntegrationJob)
      .set({ output })
      .where(eq(schema.outboundIntegrationJob.id, saved.id));
    const reconcile = mock(async () => ({
      stage: "applyVerification" as const,
      output: { verificationResult: "reconciled-original-request" },
    }));
    expect(
      value(await automation.run({ maxSteps: 1 }, reconcile)).processed,
    ).toBe(1);
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect((await jobs())[0]?.output).toMatchObject({
      stage: "applyVerification",
      verification: output.verification,
    });
  });
  test("concurrent ticks reserve one leased operation and checkpoint its result", async () => {
    const { automation } = active();
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const execute = mock(async () => {
      entered.resolve();
      await release.promise;
      return { stage: "qualify" as const, output: { paidReceipt: "one" } };
    });
    const first = automation.run({ maxSteps: 1 }, execute);
    await entered.promise;
    expect(
      value(await automation.run({ maxSteps: 1 }, execute)).processed,
    ).toBe(0);
    release.resolve();
    expect(value(await first).processed).toBe(1);
    expect(execute).toHaveBeenCalledTimes(1);
    const records = await jobs();
    expect(records).toHaveLength(1);
    expect(records[0]?.status).toBe("pending");
    expect(records[0]?.output).toMatchObject({
      stage: "qualify",
      paidReceipt: "one",
      lease: null,
    });
  });
  test("uncertain provider outcomes block replay across ticks and policy revisions", async () => {
    const { automation, store } = active();
    const execute = mock(async () => {
      throw new IntegrationError(
        "apollo",
        "uncertain",
        "Unknown response",
        502,
      );
    });
    expect(
      value(await automation.run({ maxSteps: 1 }, execute)).results[0]?.status,
    ).toBe("uncertain");
    value(
      await store.savePlaybook("fixture", {
        ...settings,
        targetingNotes: "Changed policy",
      }),
    );
    expect(
      value(await automation.run({ maxSteps: 3 }, execute)).processed,
    ).toBe(0);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(await jobs()).toHaveLength(1);
  });
  test("expired leases become uncertain without rerunning their provider stage", async () => {
    const { automation, db, schema } = active();
    value(
      await automation.run({ maxSteps: 1 }, async () => ({ stage: "qualify" })),
    );
    const [job] = await jobs();
    if (!job) throw new Error("Missing job");
    await db
      .update(schema.outboundIntegrationJob)
      .set({
        status: "starting",
        output: {
          ...job.output,
          lease: {
            token: crypto.randomUUID(),
            expiresAt: new Date(Date.now() - 1000).toISOString(),
          },
        },
      })
      .where(eq(schema.outboundIntegrationJob.id, job.id));
    const execute = mock(async () => ({ stage: "complete" as const }));
    expect(value(await automation.run({}, execute)).processed).toBe(0);
    expect((await jobs())[0]?.error).toBe("lease-expired");
    expect(execute).not.toHaveBeenCalled();
  });
  test("criteria changed during a provider call retains the receipt but cannot advance", async () => {
    const { automation, campaigns } = active();
    const current = value(
      await campaigns.get({ id: fixture.campaignId }),
    ).campaign;
    const result = value(
      await automation.run({ maxSteps: 1 }, async () => {
        value(
          await campaigns.saveCriteria("fixture", {
            id: current.id,
            expectedRevision: current.revision,
            criteria: { ...current.criteria, objective: "New audience" },
            answers: "",
          }),
        );
        return { stage: "qualify", output: { providerReceipt: "paid-once" } };
      }),
    );
    expect(result.results[0]?.status).toBe("held");
    expect(result.results[0]?.reason).toBe("campaign-criteria-changed");
    expect((await jobs())[0]?.output).toMatchObject({
      providerReceipt: "paid-once",
    });
  });
  test("only one campaign can reserve the same company domain concurrently", async () => {
    const { automation } = active();
    await create();
    const execute = mock(async () => ({ stage: "qualify" as const }));
    value(await automation.run({ maxSteps: 1 }, execute));
    expect(await jobs()).toHaveLength(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });
  test("disabling automation while a provider runs preserves its receipt without applying company facts", async () => {
    const { automation, store, db, schema } = active();
    const result = value(
      await automation.run({ maxSteps: 1 }, async () => {
        value(
          await store.savePlaybook("fixture", {
            ...settings,
            automationEnabled: false,
          }),
        );
        return {
          stage: "qualify",
          output: { providerReceipt: "retained" },
          companyFacts: {
            country: "CA",
            platform: "shopify",
            teamSize: 500,
            annualRevenue: null,
            sourcePayload: {},
          },
        };
      }),
    );
    expect(result.results[0]?.reason).toBe("automation-disabled");
    expect((await jobs())[0]?.output).toMatchObject({
      providerReceipt: "retained",
    });
    const [company] = await db
      .select()
      .from(schema.outboundCampaignCompany)
      .where(eq(schema.outboundCampaignCompany.id, fixture.companyId));
    expect(company?.country).toBe("US");
    expect(company?.teamSize).toBe(10);
  });
  test("status counts all scoped jobs while returning only the latest fifty rows", async () => {
    const { automation, db, schema } = active();
    value(
      await automation.run({ maxSteps: 1 }, async () => ({
        stage: "qualify",
        reason: "qualification-held",
      })),
    );
    const [job] = await jobs();
    if (!job) throw new Error("Missing fixture job");
    await db.insert(schema.outboundIntegrationJob).values(
      Array.from({ length: 51 }, () => ({
        provider: "automation" as const,
        status: "failed" as const,
        input: job.input,
        output: job.output,
        error: "qualification-held",
      })),
    );
    const status = value(
      await automation.getStatus({ campaignId: fixture.campaignId }),
    );
    expect(status.jobs).toHaveLength(50);
    expect(status.counts.held).toBe(52);
    expect(status.delivery.ready).toBe(false);
    expect(status.delivery.blockers).toContain("sendingPaused");
  });
  test("a hold advances the next company without retrying the held operation", async () => {
    const { automation, db, schema } = active();
    await db.insert(schema.outboundCampaignCompany).values({
      campaignId: fixture.campaignId,
      domain: "secondgoods.com",
      name: "Second Goods",
      website: "https://secondgoods.com",
      source: "apollo",
      criteriaRevision: 1,
      sourcePayload: {},
    });
    const execute = mock(async () => ({
      stage: "qualify" as const,
      reason: "qualification-held",
    }));
    value(await automation.run({ maxSteps: 1 }, execute));
    value(await automation.run({ maxSteps: 1 }, execute));
    value(await automation.run({ maxSteps: 1 }, execute));
    expect(execute).toHaveBeenCalledTimes(2);
    expect(await jobs()).toHaveLength(2);
  });
  test.each([
    { provider: "google", enabled: false, concurrentEdit: false },
    { provider: "google", enabled: false, concurrentEdit: true },
    { provider: "microsoft", enabled: true, concurrentEdit: false },
    { provider: "microsoft", enabled: false, concurrentEdit: false },
    { provider: "unknown", enabled: true, concurrentEdit: false },
  ] as const)(
    "the real stage workflow enforces current mail-host policy and atomic draft revisions (%j)",
    async ({ provider, enabled, concurrentEdit }) => {
      const { automation, qualification, providers, draft, mx, db, schema } =
        active();
      if (enabled)
        value(
          await active().store.savePlaybook("fixture", {
            ...settings,
            allowMicrosoftRecipients: true,
          }),
        );
      const now = new Date().toISOString();
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
          sourcePayload: {
            _outboundSource: "apollo-organization-enrichment",
            _outboundObservedAt: now,
          },
          observedAt: now,
        },
      });
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
            product: "Linen tote",
            productUrl: "https://samplegoods.com/products/tote",
            gap: "product-published-data",
            finding: "your product page lists Linen tote",
            productInsight: {
              sourceUrl: "https://samplegoods.com/products/tote",
              sourceQuote:
                "Made from durable woven linen for everyday carrying.",
              feature: "durable woven linen",
              kind: "material",
              relevance:
                "Material is useful for a shopper comparing everyday tote bags.",
            },
            evidence: "Observed named own-brand product with a priced offer",
            evidenceCheckedAt: now,
            findingReviewed: false,
            legitEvidence:
              "https://samplegoods.com/about: Established consumer products team",
            productCategory: "accessories",
          },
          receipts: [
            {
              url: "https://samplegoods.com/products/tote",
              kind: "product",
              checkedAt: now,
              sha256: "a".repeat(64),
              excerpt: "Linen tote by Sample Goods, USD 25",
            },
          ],
          assessment: {
            productInsight: {
              sourceUrl: "https://samplegoods.com/products/tote",
              sourceQuote:
                "Made from durable woven linen for everyday carrying.",
              feature: "durable woven linen",
              kind: "material",
              relevance:
                "Material is useful for a shopper comparing everyday tote bags.",
            },
            decision: "qualified",
            reason: "Sourced fit",
            productCategory: "accessories",
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
          requestedAt: now,
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
              verifiedAt: now,
              source: "apollo",
              recordId: "record_fixture",
            },
          ],
          retryAfterSeconds: 30,
        },
      });
      spyOn(mx, "check").mockResolvedValue({
        success: true,
        data: { provider, checkedAt: now, records: [] },
      });
      const originalCompose = draft.composeSequence;
      spyOn(draft, "composeSequence").mockImplementation(
        async (details, receipt, policy, dependencies) =>
          originalCompose(details, receipt, policy, {
            ...dependencies,
            generate: async () => syntheticWriterParts(details, receipt!),
            judge: passingCopyJudge,
          }),
      );
      if (concurrentEdit) {
        const store = active().store;
        const original = store.saveComposedDraft;
        spyOn(store, "saveComposedDraft").mockImplementation(
          async (actor, input) => {
            const result = await original(actor, input);
            if (result.success)
              value(
                await store.patchProspect(
                  "concurrent-staff",
                  result.data.prospect,
                  { email: "different@samplegoods.com" },
                  result.data.revision,
                ),
              );
            return result;
          },
        );
      }
      const first = value(await automation.run({ maxSteps: 20 }));
      expect(first.results.at(-1)?.stage).toBe("pollVerification");
      const [pending] = await jobs();
      if (!pending) throw new Error("Missing job");
      const prospectId = pending.output?.["prospectId"];
      if (typeof prospectId !== "string")
        throw new Error("Missing selected prospect");
      const researched = value(
        await saveSyntheticShoppingEvidence("fixture", { prospectId }),
      );
      await db
        .update(schema.outboundIntegrationJob)
        .set({
          output: {
            ...pending.output,
            prospectRevision: researched.revision,
            availableAt: new Date(0).toISOString(),
          },
        })
        .where(eq(schema.outboundIntegrationJob.id, pending.id));
      const second = value(await automation.run({ maxSteps: 20 }));
      if (provider === "unknown" || (provider === "microsoft" && !enabled)) {
        expect(second.results.at(-1)).toMatchObject({
          stage: "applyMx",
          status: "held",
          reason: "mx-held",
        });
        expect(draft.composeSequence).not.toHaveBeenCalled();
        expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(
          0,
        );
        return;
      }
      if (concurrentEdit) {
        const [changed] = await db.select().from(schema.outboundProspect);
        const job = (await jobs()).find(
          (entry) => entry.input["operation"] === "campaignAutomation",
        );
        expect(second.results.at(-1)?.status).toBe("held");
        expect(changed?.details.email).toBe("different@samplegoods.com");
        expect(changed?.approvedBy).toBeNull();
        expect(Number(job?.output?.["prospectRevision"])).toBeLessThan(
          changed?.revision ?? 0,
        );
        return;
      }
      expect(second.results.at(-1)?.status).toBe("complete");
      const [prospect] = await db.select().from(schema.outboundProspect);
      expect(prospect?.status).toBe("approved");
      expect(prospect?.approvedBy).toBe("automatic:outbound-automation");
      expect(prospect?.sentStep).toBe(0);
      expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(
        0,
      );
      expect(providers.verifyApolloEmails).toHaveBeenCalledTimes(1);
      expect(providers.enrichApolloPerson).toHaveBeenCalledTimes(1);
      expect(qualification.qualifyCompany).toHaveBeenCalledTimes(1);
      expect(value(await automation.run({ maxSteps: 20 })).processed).toBe(0);
      expect(draft.composeSequence).toHaveBeenCalledTimes(1);
    },
  );
});
