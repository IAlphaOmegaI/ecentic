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
import { eq, sql } from "drizzle-orm";
import {
  defaultPlaybook,
  prospectSchema,
  renderMessages,
} from "@/lib/outbound";
import { IntegrationError } from "@/server/utils/outbound/http";

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
    !modules.mx
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
  };
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const settings = {
  ...defaultPlaybook,
  automationEnabled: true,
  senderConfirmed: true,
  historyConfirmed: true,
  competingSendersPaused: true,
  senderTested: true,
  senderEmails:
    "juri1@joinecentic.com\njuri2@joinecentic.com\njuri3@joinecentic.com\njuri4@joinecentic.com",
};
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
    if (!endpoint) throw new Error("Disposable database required");
    const location = new URL(endpoint);
    if (
      !["localhost", "127.0.0.1"].includes(location.hostname) ||
      location.pathname !== "/outbound_test"
    )
      throw new Error("Local outbound_test only");
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
  test("the normal draft stage corrects broad categories before spending on a draft", async () => {
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
    const generate = spyOn(draft, "generateDraft").mockImplementation(
      async (details, policy) => ({
        success: true,
        data: { messages: renderMessages(details, policy), issues: [] },
      }),
    );
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
    ).toBe("applyDraft");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]?.[0].productCategory).toBe("Multi-Stick");
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
  test.each([false, true])(
    "the real stage workflow preserves atomic draft revisions (concurrent edit: %s)",
    async (concurrentEdit) => {
      const { automation, qualification, providers, draft, mx, db, schema } =
        active();
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
        data: { provider: "google", checkedAt: now, records: [] },
      });
      spyOn(draft, "generateDraft").mockImplementation(
        async (details, policy) => ({
          success: true,
          data: { messages: renderMessages(details, policy), issues: [] },
        }),
      );
      if (concurrentEdit) {
        const store = active().store;
        const original = store.saveDraft;
        spyOn(store, "saveDraft").mockImplementation(async (actor, input) => {
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
        });
      }
      const first = value(await automation.run({ maxSteps: 20 }));
      expect(first.results.at(-1)?.stage).toBe("pollVerification");
      const [pending] = await jobs();
      if (!pending) throw new Error("Missing job");
      await db
        .update(schema.outboundIntegrationJob)
        .set({
          output: { ...pending.output, availableAt: new Date(0).toISOString() },
        })
        .where(eq(schema.outboundIntegrationJob.id, pending.id));
      const second = value(await automation.run({ maxSteps: 20 }));
      if (concurrentEdit) {
        const [changed] = await db.select().from(schema.outboundProspect);
        const [job] = await jobs();
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
      expect(draft.generateDraft).toHaveBeenCalledTimes(1);
    },
  );
});
