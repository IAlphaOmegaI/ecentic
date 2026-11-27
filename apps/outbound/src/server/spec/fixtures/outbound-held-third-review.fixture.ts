import { mock, setSystemTime } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { prospectSchema, settingsForProspect } from "@/lib/outbound";
import { rebuildHeldReviewWritingProposal } from "@/lib/outbound-rebuild-policy";
import type { HeldThirdReviewDependencies } from "@/server/app/outbound/held-third-review";
import { IntegrationError } from "@/server/utils/outbound/http";
import { requireTestDatabase } from "../helpers/database";

const endpoint = requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const Contract = await import("@/server/utils/outbound/held-review-contract");
const ids = Array.from({ length: 21 }, () => randomUUID());
mock.module("@/server/utils/outbound/held-review-contract", () => ({
  ...Contract,
  HELD_REVIEW_MANIFEST_HASH: Contract.heldManifestHash(ids),
}));
const ThirdContract = await import(
  "@/server/utils/outbound/held-third-review-contract"
);
const { db, schema } = await import("@/server/database");
await db.execute(
  sql`truncate outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook, outbound_campaign_company, outbound_campaign cascade`,
);
const Review = await import("@/server/app/outbound/held-discovery-review");
const Third = await import("@/server/app/outbound/held-third-review");
const Capture = await import("@/server/utils/outbound/live-shopping");
const Draft = await import("@/server/utils/outbound/draft");
const Assessment = await import(
  "@/server/utils/outbound/shopping-fact-assessment"
);
const { researchHash } = await import(
  "@/server/utils/outbound/shopping-research"
);
const { compositionProspectHash, writingPolicyHash } = await import(
  "@/server/utils/outbound/shopping-policy"
);
const { writerDiagnosticHash } = await import(
  "@/server/utils/outbound/writing-candidates"
);
const { heldBrowser, heldPoll, heldAssessment } = await import(
  "../helpers/outbound-held-review-fixture"
);
const { writerFixture, passingCopyJudge } = await import(
  "../helpers/outbound-writer-fixture"
);
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const actor = "synthetic-third-review-fixture";
const settings = {
  ...writerFixture().policy,
  automationEnabled: false,
  allowProductObservations: false,
  searchesPerLead: 2 as const,
  linkedinEnabled: true,
};
await db
  .insert(schema.outboundPlaybook)
  .values({ id: "default", revision: 1, settings, updatedBy: actor });
const names = Object.keys(ThirdContract.HELD_THIRD_REVIEW_ACTIONS);
const manifest = Contract.heldReviewManifestSchema.parse({
  version: 1,
  prospectIds: ids,
  approvedHoldReason: Contract.HELD_REVIEW_REASON,
});
const oldMessages = ([1, 2, 3] as const).map((step) => ({
  step,
  afterDays: step === 1 ? 0 : 4,
  subject: "Historic synthetic draft",
  body: "Original held text, unchanged.",
}));
for (const [index, id] of ids.entries()) {
  const company = names[index];
  assert.ok(company);
  const domain =
    company === "Diamond Dotz"
      ? "diamonddotz.com"
      : company === "Terrapin Ridge Farms"
        ? "terrapinridge.com"
        : `third${index}.test`;
  const [companyRow] = await db
    .insert(schema.outboundCompany)
    .values({
      name: company,
      domain,
      website: `https://${domain}`,
      country: "US",
      source: actor,
    })
    .returning();
  assert.ok(companyRow);
  const [person] = await db
    .insert(schema.outboundPerson)
    .values({
      companyId: companyRow.id,
      identityKey: randomUUID(),
      name: "Jamie Smith",
    })
    .returning();
  assert.ok(person);
  await db.insert(schema.outboundProspect).values({
    id,
    companyId: companyRow.id,
    personId: person.id,
    revision: 1,
    playbookRevision: 1,
    status: "held",
    holdReason: Contract.HELD_REVIEW_REASON,
    details: prospectSchema.parse({
      ...writerFixture().prospect,
      id,
      company,
      domain,
      website: `https://${domain}`,
      product: "Marlow Tote",
      productUrl: `https://${domain}/products/marlow`,
      productCategory: "linen bags",
      country: "US",
      email: `jamie@${domain}`,
      emailStatus: "verified",
      assignedSenderEmail: settings.fromEmail,
      source: actor,
    }),
    messages: oldMessages,
    createdBy: actor,
  });
}
const baselineProspects = await db
  .select()
  .from(schema.outboundProspect)
  .orderBy(schema.outboundProspect.id);
const baselinePolicy = await db.select().from(schema.outboundPlaybook);
const batch = value(await Review.start(actor, manifest));
const originals = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(sql`input->>'operation'='heldDiscoveryReview'`);
const makeCapture = async (
  input: ReturnType<typeof Contract.heldReviewInputSchema.parse>,
  broad = false,
) => {
  const browser = heldBrowser(
    input.product,
    `${input.product.name}. Large linen bags. A large linen bag for everyday use.`,
  );
  const generated = value(
    await Capture.generateShopperQuery(
      {
        ...input,
        browser,
        deadline: Date.now() + 150000,
        intent: broad ? "unbranded-broad" : "unbranded-specific",
      },
      {
        generate: async ({ prompt }) => ({
          question: broad ? "linen bags" : "large linen bags",
          category: broad ? "bags" : "linen bags",
          attribute: broad ? "linen" : "large",
          excerptIds: [JSON.parse(prompt).excerpts[0].id],
        }),
        review: async ({ prompt }) => ({
          status: "valid",
          reason: "Synthetic grounded product candidate.",
          checks: {
            naturalWordOrder: true,
            obviousProductCandidate: true,
            unbranded: true,
            productGrounding: true,
          },
          excerptIds: [JSON.parse(prompt).excerpts[0].id],
        }),
      },
    ),
  );
  assert.equal(generated.status, "prepared", JSON.stringify(generated));
  const query = generated.query;
  const shoppingJob = value(
    await Capture.startQuery(
      { apiKey: "synthetic", query },
      {
        request: async () => ({
          success: true,
          data: Response.json(
            { job_id: randomUUID(), status: "pending" },
            { status: 202 },
          ),
        }),
      },
    ),
  );
  const noBrands = ["Diamond Dotz", "Terrapin Ridge Farms"].includes(
    input.merchant.name,
  );
  const polled = value(
    noBrands
      ? await Capture.pollQuery(
          { apiKey: "synthetic", job: shoppingJob },
          {
            request: async () => ({
              success: true,
              data: Response.json({
                job_id: shoppingJob.id,
                status: "done",
                scraper: query.surface,
                prompt: query.prompt,
                country: query.country,
                completed_at: new Date().toISOString(),
                result: {
                  scraper: query.surface,
                  status: "done",
                  cached: false,
                  result_markdown:
                    "For this query, compare bag dimensions and materials. This informational answer does not name products or brands.",
                  citations: [],
                },
              }),
            }),
          },
        )
      : await heldPoll(shoppingJob, false),
  );
  assert.equal(polled.status, "captured");
  const answer = polled.capture;
  const assessed = noBrands
    ? Assessment.projectUnrankedDiscoveryAbsence({
        answer,
        browser,
        queryReview: query.review,
      })
    : value(
        await heldAssessment({
          answer,
          browser,
          queryReview: query.review,
          playbook: settings,
          deadline: Date.now() + 10000,
        }),
      );
  assert.equal(assessed.status, "researched");
  return {
    query,
    queryReview: query.review,
    shoppingJob,
    answer,
    browser,
    productCapture: browser,
    shoppingReceipt: assessed.receipt,
    queryReservedAt: new Date().toISOString(),
  };
};
for (const job of originals) {
  const input = Contract.heldReviewInputSchema.parse(job.input);
  const capture = await makeCapture(input);
  const failed = input.merchant.name === "Teleties";
  const body = JSON.stringify({
    job_id: capture.shoppingJob.id,
    status: "failed",
  });
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "complete",
      output: Contract.heldReviewStateSchema.parse({
        ...job.output,
        ...capture,
        stage: "complete",
        shoppingQueryCount: 1,
        ...(failed
          ? {
              answer: undefined,
              browser: undefined,
              shoppingReceipt: undefined,
              failureReceipt: {
                response: {
                  url: `https://api.scrapellm.com/v1/jobs/${capture.shoppingJob.id}`,
                  status: 200,
                  body,
                  sha256: writerDiagnosticHash(body),
                  receivedAt: new Date().toISOString(),
                },
              },
            }
          : {}),
        heldReason: failed
          ? "The provider could not complete the acknowledged query."
          : "Original synthetic hold.",
      }),
    })
    .where(eq(schema.outboundIntegrationJob.id, job.id));
}
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: { queriesReserved: 21, paused: false } })
  .where(eq(schema.outboundIntegrationJob.id, batch.batchId));
value(
  await Review.startSecondReview(
    actor,
    manifest,
    Contract.HELD_REVIEW_ROUND2_INSTRUCTION_HASH,
  ),
);
const secondRows = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(sql`input->>'reviewRound'='2'`);
for (const [index, row] of secondRows.entries()) {
  const input = Contract.heldReviewInputSchema.parse(row.input);
  const state = Contract.heldReviewStateSchema.parse(row.output);
  const capture =
    index < 6 ? await makeCapture(input, true) : state.priorPurchase;
  assert.ok(capture);
  const old = state.priorPurchase;
  assert.ok(old);
  const next = Contract.heldReviewStateSchema.parse({
    ...state,
    query: capture.query,
    shoppingJob: capture.shoppingJob,
    answer: capture.answer,
    browser: capture.browser,
    shoppingReceipt: capture.shoppingReceipt,
    queryReservedAt: capture.queryReservedAt,
    queryReview: capture.query.review,
    productCapture: capture.browser,
    stage: "complete",
    shoppingQueryCount: index < 6 ? 2 : 1,
    heldReason: "Original round 2 result retained.",
  });
  if (
    next.answer &&
    next.browser?.status === "captured" &&
    next.shoppingReceipt &&
    index < 6
  ) {
    next.shoppingReceipt = Assessment.appendCaptureHistory(
      next.shoppingReceipt,
      old.answer && old.browser?.status === "captured"
        ? [
            {
              answer: old.answer,
              browser: old.browser,
              queryReview: old.query.review,
            },
          ]
        : [],
    );
  }
  if (
    ["carry", "rejudge"].includes(
      ThirdContract.HELD_THIRD_REVIEW_ACTIONS[input.merchant.name] ?? "",
    )
  ) {
    const prospect = baselineProspects.find((p) => p.id === input.prospectId);
    assert.ok(prospect && next.shoppingReceipt);
    const proposed = rebuildHeldReviewWritingProposal(settings);
    const effective = settingsForProspect(prospect, proposed);
    const details = prospectSchema.parse({
      ...prospect.details,
      id: prospect.id,
      assignedSenderEmail: effective.fromEmail,
    });
    const parts = {
      subject: "linen bags",
      opening:
        'My sister needed a bag, so I asked Google AI Mode for "large linen bags".',
      result: `${input.merchant.name === "Sunny Health & Fitness" ? "When I asked, it" : "It"} picked Canvas Works and Harbor Label. ${input.merchant.name} did not come up.`,
      relevance: "That's the kind of search a new customer starts with.",
    };
    // These unchanged synthetic copies keep the exact real ledger query in the opening.
    parts.opening = `My sister needed a bag, so I asked Google AI Mode for "${next.query?.prompt}".`;
    const composed = value(
      await Draft.composeSequence(details, next.shoppingReceipt, proposed, {
        generate: async () => parts,
        judge: passingCopyJudge,
        globalVoiceNotes: proposed.voiceNotes,
        peers: [],
      }),
    );
    const context = Contract.heldReviewPreviewContextSchema.parse({
      status: "unapplied",
      prospect: details,
      prospectRevision: 1,
      playbookRevision: 1,
      proposedPolicy: proposed,
      globalVoiceNotes: proposed.voiceNotes,
      receiptHash: researchHash(next.shoppingReceipt),
      writingPolicyHash: writingPolicyHash(effective, {
        globalVoiceNotes: proposed.voiceNotes,
      }),
      baseWritingPolicyHash: writingPolicyHash(
        settingsForProspect(prospect, settings),
        { globalVoiceNotes: settings.voiceNotes },
      ),
      prospectHash: compositionProspectHash(details),
      peers: [],
    });
    next.previewContext = context;
    next.preview = Contract.heldReviewPreviewSchema.parse({
      ...context,
      ...composed,
      parts,
    });
  }
  await db
    .update(schema.outboundIntegrationJob)
    .set({ status: "complete", output: next })
    .where(eq(schema.outboundIntegrationJob.id, row.id));
}
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: { queriesReserved: 27, paused: false } })
  .where(eq(schema.outboundIntegrationJob.id, batch.batchId));
const selections = baselineProspects
  .filter(
    (p) =>
      ThirdContract.HELD_THIRD_REVIEW_ACTIONS[p.details.company] ===
      "new-product",
  )
  .map((p) => ({
    prospectId: p.id,
    product: {
      name: "Replacement Dance Shoe",
      url: `https://${p.details.domain}/products/replacement`,
    },
    category: "ballet shoes",
    evidence: { source: "Labeled synthetic catalogue fixture" },
  }));
const frozenParents = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(sql`input->>'operation'='heldDiscoveryReview'`)
  .orderBy(schema.outboundIntegrationJob.id);
assert.equal(
  (await Third.inspect(manifest, "0".repeat(64), selections)).success,
  false,
);
assert.equal(
  value(
    await Third.inspect(
      manifest,
      ThirdContract.HELD_THIRD_REVIEW_INSTRUCTION_HASH,
      selections,
    ),
  ).authorizedSearches,
  11,
);
const started = value(
  await Third.startThirdReview(
    actor,
    manifest,
    ThirdContract.HELD_THIRD_REVIEW_INSTRUCTION_HASH,
    selections,
  ),
);
assert.equal(
  value(
    await Third.startThirdReview(
      actor,
      manifest,
      ThirdContract.HELD_THIRD_REVIEW_INSTRUCTION_HASH,
      selections,
    ),
  ).repeated,
  true,
);
assert.equal(value(await Third.status(started.controlId)).counts.total, 21);
const child = async (company: string) => {
  const [row] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        sql`input->>'operation'='heldDiscoveryRound3'`,
        sql`input->'merchant'->>'name'=${company}`,
      ),
    );
  assert.ok(row);
  return row;
};
const focus = async (company: string) => {
  await db.execute(
    sql`update outbound_integration_job set output=jsonb_set(output,'{availableAt}',to_jsonb(${new Date(Date.now() + 86400000).toISOString()}::text)) where input->>'operation'='heldDiscoveryRound3'`,
  );
  await db.execute(
    sql`update outbound_integration_job set output=jsonb_set(output,'{availableAt}',to_jsonb(${new Date().toISOString()}::text)) where input->>'operation'='heldDiscoveryRound3' and input->'merchant'->>'name'=${company}`,
  );
};
const calls = { writer: 0, judge: 0, search: 0, browser: 0 };
const deps: HeldThirdReviewDependencies = {
  resolveKey: async () => ({ success: true, data: "synthetic" }),
  inspectProduct: async (input) => {
    calls.browser++;
    return { success: true, data: heldBrowser(input.product) };
  },
  generate: async () => {
    calls.writer++;
    throw new Error("Unexpected writer purchase");
  },
  judge: async (_input) => {
    calls.judge++;
    return passingCopyJudge();
  },
  start: async (input) => {
    calls.search++;
    return Capture.startQuery(input, {
      request: async () => ({
        success: true,
        data: Response.json(
          { job_id: randomUUID(), status: "pending" },
          { status: 202 },
        ),
      }),
    });
  },
};
const advance = async (
  company: string,
  custom: HeldThirdReviewDependencies = deps,
) => {
  await focus(company);
  return value(
    await Third.runNext(
      { controlId: started.controlId, deadline: Date.now() + 300000 },
      custom,
    ),
  );
};
// Cached loading preserves the same field order and Date representation used by
// already-created child parent hashes; it does not require rewriting old input.
const plainParent = frozenParents.find(
  (row) => row.input?.["reviewRound"] === 2,
);
assert.ok(plainParent);
const plainParentCompany = Contract.heldReviewInputSchema.parse(
  plainParent.input,
).merchant.name;
const boundChild = ThirdContract.heldThirdReviewInputSchema.parse(
  (await child(plainParentCompany)).input,
);
assert.equal(
  boundChild.previousJobHash,
  writerDiagnosticHash(JSON.stringify(plainParent)),
);
// Startup warms the immutable cache. Changing either prior row is still detected
// from its full database row before any browser, search, writer, or judge call.
const obagiParent = frozenParents.find(
  (row) =>
    row.input?.["reviewRound"] === 2 &&
    (row.input?.["merchant"] as { name?: string })?.name === "Obagi",
);
assert.ok(obagiParent);
await db
  .update(schema.outboundIntegrationJob)
  .set({ error: "Synthetic cached-parent tamper" })
  .where(eq(schema.outboundIntegrationJob.id, obagiParent.id));
await advance("Obagi");
assert.equal((await child("Obagi")).status, "failed");
assert.match(
  (await child("Obagi")).error ?? "",
  /immutable second-review parent changed/,
);
assert.deepEqual(calls, { writer: 0, judge: 0, search: 0, browser: 0 });
await db
  .update(schema.outboundIntegrationJob)
  .set({ error: obagiParent.error, updatedAt: obagiParent.updatedAt })
  .where(eq(schema.outboundIntegrationJob.id, obagiParent.id));
const patternFirst = frozenParents.find(
  (row) =>
    !row.input?.["reviewRound"] &&
    (row.input?.["merchant"] as { name?: string })?.name === "Pattern Beauty",
);
assert.ok(patternFirst);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    output: {
      ...patternFirst.output,
      heldReason: "Synthetic cached R1 output tamper",
    },
  })
  .where(eq(schema.outboundIntegrationJob.id, patternFirst.id));
await advance("Pattern Beauty");
assert.equal((await child("Pattern Beauty")).status, "failed");
assert.match(
  (await child("Pattern Beauty")).error ?? "",
  /preserved first-review record changed/,
);
assert.deepEqual(calls, { writer: 0, judge: 0, search: 0, browser: 0 });
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: patternFirst.output, updatedAt: patternFirst.updatedAt })
  .where(eq(schema.outboundIntegrationJob.id, patternFirst.id));
// A carried result receives no writer and can never change the prospect row.
assert.equal((await advance("Alice Lane Home Collection")).stage, "copyProof");
const alice = ThirdContract.heldThirdReviewStateSchema.parse(
  (await child("Alice Lane Home Collection")).output,
);
assert.equal(alice.stage, "draft");
assert.ok(alice.suppliedParts?.result.includes("Alice Lane"));
await advance("Alice Lane Home Collection");
assert.equal(calls.writer, 0);
assert.equal(calls.judge, 1);
const carried = ThirdContract.heldThirdReviewStateSchema.parse(
  (await child("Alice Lane Home Collection")).output,
);
assert.equal(carried.stage, "complete");
assert.ok(carried.preview);
// A first rejudge sees unchanged old text, then exact unchanged text reuses that decision.
calls.judge = 0;
await advance("Danessa Myricks Beauty");
assert.equal(calls.judge, 1);
await advance("Danessa Myricks Beauty");
await advance("Danessa Myricks Beauty");
const danessa = ThirdContract.heldThirdReviewStateSchema.parse(
  (await child("Danessa Myricks Beauty")).output,
);
assert.equal(calls.judge, 1);
assert.equal(danessa.judgeAudit?.reusedExactRejudge, true);
assert.equal(danessa.judgeAudit?.newJudgmentPasses, 0);
assert.equal(danessa.preview?.messages[0]?.writing?.quality?.passed, true);
// Mechanically changed copy is judged once for each distinct text, with no writer.
const beforeSunny = calls.judge;
await advance("Sunny Health & Fitness");
await advance("Sunny Health & Fitness");
await advance("Sunny Health & Fitness");
const sunny = ThirdContract.heldThirdReviewStateSchema.parse(
  (await child("Sunny Health & Fitness")).output,
);
assert.equal(calls.judge - beforeSunny, 2);
assert.equal(sunny.judgeAudit?.reusedExactRejudge, false);
assert.equal(sunny.judgeAudit?.newJudgmentPasses, 1);
assert.equal(sunny.preview?.parts.result.startsWith("It picked "), true);
// Failed first judgment is terminal: no rewrite, second judgment, or shopping.
await advance("D'IYANU", {
  ...deps,
  judge: async (_input) => {
    calls.judge++;
    const verdict = await passingCopyJudge();
    return {
      ...verdict,
      naturalVoice: { passed: false, reason: "Synthetic exact-copy failure." },
    };
  },
});
const failed = await child("D'IYANU");
assert.equal(failed.status, "complete");
assert.match(String(failed.output?.["heldReason"]), /Copy:/);
const judged = calls.judge;
await advance("D'IYANU");
assert.equal(calls.judge, judged);
// An exact retry preserves the acknowledged failed prior response and makes one new reservation.
const teletiesBefore = ThirdContract.heldThirdReviewStateSchema.parse(
  (await child("Teleties")).output,
);
assert.equal(teletiesBefore.priorPurchases[0]?.raw.length, 1);
// Query source is synthetic and explicitly supports the three exact words.
const exactDeps: HeldThirdReviewDependencies = {
  ...deps,
  inspectProduct: async (input) => {
    const state = ThirdContract.heldThirdReviewStateSchema.parse(
      (await child("Teleties")).output,
    );
    assert.ok(state.lease);
    assert.ok(input.deadline);
    assert.ok(input.deadline <= Date.parse(state.lease.expiresAt) - 30000);
    return {
      success: true,
      data: heldBrowser(
        input.product,
        `${input.product.name}. Small hair ties. Soft spiral hair ties for an easy hold.`,
      ),
    };
  },
  prepareQuery: (input) =>
    Capture.prepareShopperQuery(input, {
      review: async ({ prompt }) => ({
        status: "valid",
        reason: "Synthetic exact shopper query.",
        checks: {
          naturalWordOrder: true,
          obviousProductCandidate: true,
          unbranded: true,
          productGrounding: true,
        },
        excerptIds: [JSON.parse(prompt).excerpts[0].id],
        category: "hair ties",
        attribute: "small",
      }),
    }),
};
await advance("Teleties", exactDeps);
await advance("Teleties", exactDeps);
await advance("Teleties", exactDeps);
const retry = ThirdContract.heldThirdReviewStateSchema.parse(
  (await child("Teleties")).output,
);
assert.equal(
  retry.stage,
  "poll",
  JSON.stringify({
    error: (await child("Teleties")).error,
    heldReason: retry.heldReason,
  }),
);
assert.equal(retry.query?.prompt, "small hair ties");
assert.equal(retry.queryGeneration?.attempts, 0);
assert.equal(calls.search, 1);
assert.equal(value(await Third.status(started.controlId)).queriesReserved, 28);
// Expired paid lease is never replayed; original jobs, prospects and policy stay byte-identical.
const retryJob = await child("Teleties");
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "starting",
    output: {
      ...retryJob.output,
      lease: {
        token: randomUUID(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    },
  })
  .where(eq(schema.outboundIntegrationJob.id, retryJob.id));
await advance("Teleties", exactDeps);
assert.equal((await child("Teleties")).status, "uncertain");
assert.equal(calls.search, 1);
// Every remaining paid action gets exactly one atomic reservation, including unknown submission outcomes.
for (const company of names.filter(
  (name) =>
    ThirdContract.thirdReviewPurchaseAction(
      ThirdContract.HELD_THIRD_REVIEW_ACTIONS[name] ?? "",
    ) && name !== "Teleties",
)) {
  setSystemTime(new Date(Date.now() + 20000));
  const row = await child(company);
  const input = ThirdContract.heldThirdReviewInputSchema.parse(row.input);
  const saved = ThirdContract.heldThirdReviewStateSchema.parse(row.output);
  const broad = input.action === "broader";
  const question =
    input.exactQuestion ??
    (input.action === "new-product" ? "leather ballet shoes" : "linen bags");
  const category =
    input.exactQuestion === "color correcting concealer"
      ? "concealer"
      : input.exactQuestion === "beef jerky"
        ? "beef jerky"
        : input.action === "new-product"
          ? "ballet shoes"
          : "linen bags";
  const attribute =
    input.exactQuestion === "color correcting concealer"
      ? "color correcting"
      : input.action === "new-product"
        ? "leather"
        : "";
  const productCapture = heldBrowser(
    input.product,
    `${input.product.name}. ${question}. Available in the described style.`,
  );
  const generated = value(
    await Capture.prepareShopperQuery(
      {
        ...input,
        browser: productCapture,
        question,
        contractVersion: Capture.SHOPPER_QUERY_ROUND3_VERSION,
        intent: broad ? "unbranded-broad" : "unbranded-specific",
        deadline: Date.now() + 150000,
      },
      {
        review: async ({ prompt }) => ({
          status: "valid",
          reason: "Synthetic explicitly authorized shopper phrase.",
          checks: {
            naturalWordOrder: true,
            obviousProductCandidate: true,
            unbranded: true,
            productGrounding: true,
          },
          excerptIds: [JSON.parse(prompt).excerpts[0].id],
          category,
          attribute,
        }),
      },
    ),
  );
  assert.equal(generated.status, "prepared", JSON.stringify(generated));
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "pending",
      output: ThirdContract.heldThirdReviewStateSchema.parse({
        ...saved,
        stage: "query",
        productCapture,
        query: generated.query,
        queryReview: generated.query.review,
        queryGeneration: generated.generation,
      }),
    })
    .where(eq(schema.outboundIntegrationJob.id, row.id));
  await advance(
    company,
    company === "Good American"
      ? {
          ...deps,
          start: async () => {
            calls.search++;
            return {
              success: false,
              error: new IntegrationError(
                "scrapellm",
                "uncertain",
                "Synthetic interrupted POST; do not retry.",
              ),
            };
          },
        }
      : deps,
  );
  const after = await child(company);
  assert.ok(
    ThirdContract.heldThirdReviewStateSchema.parse(after.output)
      .round3ReservedAt,
    after.error ?? "",
  );
  if (company === "Good American") {
    assert.equal(after.status, "uncertain");
    const bought: number = calls.search;
    await advance(company);
    assert.equal(calls.search, bought);
  }
}
assert.equal(calls.search, 11);
assert.equal(value(await Third.status(started.controlId)).queriesReserved, 38);
assert.equal(
  value(await Third.status(started.controlId)).additionalQueriesReserved,
  11,
);
const capped = await child("DPS Skis");
await db
  .update(schema.outboundIntegrationJob)
  .set({ status: "pending", output: { ...capped.output, stage: "query" } })
  .where(eq(schema.outboundIntegrationJob.id, capped.id));
await advance("DPS Skis");
assert.equal(calls.search, 11);
assert.equal((await child("DPS Skis")).status, "failed");
setSystemTime();
assert.deepEqual(
  await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(sql`input->>'operation'='heldDiscoveryReview'`)
    .orderBy(schema.outboundIntegrationJob.id),
  frozenParents,
);
assert.deepEqual(
  await db
    .select()
    .from(schema.outboundProspect)
    .orderBy(schema.outboundProspect.id),
  baselineProspects,
);
assert.deepEqual(
  await db.select().from(schema.outboundPlaybook),
  baselinePolicy,
);
console.log("Third held review contracts passed");
process.exit(0);
