import { mock, setSystemTime } from "bun:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

// Build the real isolated 21-contact lifecycle first. Only synthetic authorization
// IDs below replace the production allowlist; no production guard is disabled.
const originalExit = process.exit;
process.exit = (() => undefined) as typeof process.exit;
await import("./outbound-held-third-review.fixture");
process.exit = originalExit;
const { db, schema } = await import("@/server/database");
const Third = await import("@/server/app/outbound/held-third-review");
const Contract = await import(
  "@/server/utils/outbound/held-third-review-contract"
);
const RepairContract = await import(
  "@/server/utils/outbound/held-third-query-repair-contract"
);
const Old = await import("@/server/utils/outbound/held-review-contract");
const Capture = await import("@/server/utils/outbound/live-shopping");
const { compositionProspectHash } = await import(
  "@/server/utils/outbound/shopping-policy"
);
const { heldBrowser, heldPoll } = await import(
  "../helpers/outbound-held-review-fixture"
);
const { browserResearchSchema } = await import(
  "@/server/utils/outbound/live-shopping-contract"
);
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const required = <T>(input: T | null | undefined): T => {
  assert.ok(input);
  return input;
};
const digest = (input: unknown) =>
  createHash("sha256").update(JSON.stringify(input)).digest("hex");
const rawHash = (input: string) =>
  createHash("sha256").update(input).digest("hex");
const jobAt = async (id: string) => {
  const [row] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id));
  assert.ok(row);
  return row;
};
const children = await db
  .select()
  .from(schema.outboundIntegrationJob)
  .where(sql`input->>'operation'='heldDiscoveryRound3'`);
assert.equal(children.length, 21);
const first = Contract.heldThirdReviewInputSchema.parse(
  required(children[0]).input,
);
const control = await jobAt(first.controlId);
const controlInput = Contract.heldThirdReviewControlSchema.parse(control.input);
const cases = RepairContract.QUERY_PREPARATION_REPAIR_CASES.map((entry) => {
  const child = children.find(
    (row) =>
      Contract.heldThirdReviewInputSchema.parse(row.input).merchant.name ===
      entry.company,
  );
  assert.ok(child);
  return { ...entry, sourceJobId: child.id };
});
mock.module("@/server/utils/outbound/held-third-query-repair-contract", () => ({
  ...RepairContract,
  QUERY_PREPARATION_REPAIR_CONTROL: control.id,
  QUERY_PREPARATION_REPAIR_CASES: cases,
}));
const Repair = await import("@/server/app/outbound/held-third-query-repair");
const Pure = await import("@/server/utils/outbound/held-third-query-repair");
const actor = first.requestedBy;
// The base fixture advances its test clock. Preserve source chronology here.
setSystemTime(
  new Date(
    Math.max(Date.now(), ...children.map((row) => row.updatedAt.getTime())) +
      1000,
  ),
);
for (const row of children) {
  const state = Contract.heldThirdReviewStateSchema.parse(row.output);
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "complete",
      output: { ...state, stage: "complete", lease: null },
    })
    .where(eq(schema.outboundIntegrationJob.id, row.id));
}
const good = required(cases.find((row) => row.company === "Good American"));
const goodChild = await jobAt(good.sourceJobId);
const goodInput = Contract.heldThirdReviewInputSchema.parse(goodChild.input);
const selections = controlInput.selections.map((selection) =>
  selection.prospectId === goodInput.prospectId
    ? {
        ...selection,
        product: { name: "WIDE LEG JEANS | SHORE", url: selection.product.url },
        category: "wide-leg jeans",
      }
    : selection,
);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    input: { ...controlInput, selections },
    output: { queriesReserved: 7, paused: false },
  })
  .where(eq(schema.outboundIntegrationJob.id, control.id));
await db
  .update(schema.outboundIntegrationJob)
  .set({ output: { queriesReserved: 34, paused: false } })
  .where(eq(schema.outboundIntegrationJob.id, first.batchId));
const heldGoodCapture = (product: { name: string; url: string }) => {
  const receivedAt = new Date().toISOString();
  const raw = (url: string, body: string) => ({
    url,
    body,
    status: 200,
    receivedAt,
    sha256: rawHash(body),
  });
  const profile = raw(
    new URL("/.well-known/ucp", product.url).href,
    JSON.stringify({
      ucp: { capabilities: { "dev.ucp.shopping.catalog": {} } },
    }),
  );
  const execute = raw(
    "https://api.firecrawl.dev/v2/interact/cce23dc1-ff37-49c3-a2a0-3c2c8c8a6ad0/execute",
    JSON.stringify({
      success: true,
      stdout: JSON.stringify({
        url: product.url,
        status: 200,
        checkedAt: receivedAt,
        title: "High-Rise Palazzo Jeans - Shore Dark Wash | Sample Goods",
        headings: ["Wide Leg Jeans"],
        text: "Wide Leg Jeans\nRegular price\n$78.00\nColor: Shore\nSize Guide\nAdd to bag\nDetails\nHigh-rise\nWide legs\nSuper-stretch fabric\nDark wash",
        structured: [
          JSON.stringify({
            "@type": "ProductGroup",
            "@id": `${new URL(product.url).pathname}#product`,
            name: product.name,
            url: product.url,
            category: "Jeans",
          }),
        ],
        selected: ["Select a size"],
        locale: "en-US",
        screenshot: "c3ludGhldGlj",
      }),
      exitCode: 0,
      truncated: false,
    }),
  );
  return browserResearchSchema.parse({
    status: "held",
    reason: RepairContract.QUERY_PREPARATION_CAPTURE_REASON,
    sources: [
      {
        id: "ucp",
        kind: "ucp",
        capture: "http",
        url: profile.url,
        checkedAt: receivedAt,
        artifact: `sha256:${profile.sha256}`,
        content: `HTTP 200\n${profile.body}`,
      },
    ],
    raw: [
      raw(new URL("/robots.txt", product.url).href, "User-agent: *\nAllow: /"),
      profile,
      execute,
    ],
  });
};
for (const entry of cases) {
  const row = await jobAt(entry.sourceJobId);
  const input = Contract.heldThirdReviewInputSchema.parse(row.input);
  const state = Contract.heldThirdReviewStateSchema.parse(row.output);
  const parent = await jobAt(input.previousJobId);
  const parentInput = Old.heldReviewInputSchema.parse(parent.input);
  const [prospect] = await db
    .select()
    .from(schema.outboundProspect)
    .where(eq(schema.outboundProspect.id, input.prospectId));
  assert.ok(prospect);
  if (entry.action !== "new-product") {
    await db
      .update(schema.outboundProspect)
      .set({
        details: { ...prospect.details, productCategory: entry.category },
      })
      .where(eq(schema.outboundProspect.id, prospect.id));
    const parentState = Old.heldReviewStateSchema.parse(parent.output);
    await db
      .update(schema.outboundIntegrationJob)
      .set({
        input: { ...parentInput, category: entry.category },
        output: {
          ...parentState,
          previewContext: undefined,
          preview: undefined,
        },
      })
      .where(eq(schema.outboundIntegrationJob.id, parent.id));
  }
  const changedParent = await jobAt(parent.id);
  const [changedProspect] = await db
    .select()
    .from(schema.outboundProspect)
    .where(eq(schema.outboundProspect.id, prospect.id));
  assert.ok(changedProspect);
  const selected = selections.find(
    (selection) => selection.prospectId === input.prospectId,
  );
  const updatedInput = Contract.heldThirdReviewInputSchema.parse({
    ...input,
    category: entry.category,
    product:
      entry.action === "new-product"
        ? required(selected).product
        : input.product,
    productSelection: entry.action === "new-product" ? selected : undefined,
    previousJobHash: digest(changedParent),
    previousOutputHash: digest(changedParent.output),
    parentInputHash: digest(
      Old.heldReviewInputSchema.parse(changedParent.input),
    ),
    originalProspectHash: compositionProspectHash(changedProspect.details),
  });
  const text =
    entry.company === "LA Girl Cosmetics"
      ? `${updatedInput.product.name}. Concealer color corrects discoloration and covers redness.`
      : entry.company === "Spyderco"
        ? `${updatedInput.product.name}. Folding knives with a lightweight handle.`
        : `${updatedInput.product.name}. Leather ballet shoes for dance.`;
  const productCapture =
    entry.mode === "good-american-capture"
      ? heldGoodCapture(updatedInput.product)
      : heldBrowser(updatedInput.product, text);
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "complete",
      error: null,
      input: updatedInput,
      output: Contract.heldThirdReviewStateSchema.parse({
        stage: "complete",
        lease: null,
        availableAt: new Date().toISOString(),
        polls: 0,
        prospectRevision: state.prospectRevision,
        shoppingQueryIntent: entry.intent,
        shoppingQueryCount: state.purchaseBaseline,
        purchaseBaseline: state.purchaseBaseline,
        priorPurchases: state.priorPurchases,
        productCapture,
        queryGeneration:
          entry.attempts === null ? undefined : { attempts: entry.attempts },
        heldReason:
          entry.mode === "good-american-capture"
            ? RepairContract.QUERY_PREPARATION_CAPTURE_REASON
            : RepairContract.QUERY_PREPARATION_REPAIR_REASON,
      }),
    })
    .where(eq(schema.outboundIntegrationJob.id, row.id));
}
const snapshot = async () => ({
  jobs: await db
    .select()
    .from(schema.outboundIntegrationJob)
    .orderBy(schema.outboundIntegrationJob.id),
  prospects: await db
    .select()
    .from(schema.outboundProspect)
    .orderBy(schema.outboundProspect.id),
  revisions: await db
    .select()
    .from(schema.outboundRevision)
    .orderBy(schema.outboundRevision.id),
  policy: await db.select().from(schema.outboundPlaybook),
  attempts: await db.select().from(schema.outboundSendAttempt),
});
const before = await snapshot();
const requests = [];
for (const entry of cases) {
  const [source] = await db
    .select({
      row: sql<string>`to_jsonb(${schema.outboundIntegrationJob})::text`,
      output: sql<string>`output::text`,
      rowHash: sql<string>`encode(sha256(convert_to(to_jsonb(${schema.outboundIntegrationJob})::text,'UTF8')),'hex')`,
      outputHash: sql<string>`encode(sha256(convert_to(output::text,'UTF8')),'hex')`,
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, entry.sourceJobId));
  assert.ok(source);
  const projected = Pure.projectQueryPreparationRepair({
    originalRowCanonical: source.row,
    originalOutputCanonical: source.output,
  });
  assert.equal(projected.sourceRowHash, source.rowHash);
  assert.deepEqual(
    projected.repairedProductCapture.raw,
    required(projected.state.productCapture).raw,
  );
  requests.push({
    sourceJobId: entry.sourceJobId,
    instructionHash: first.instructionHash,
    expectedSourceRowHash: source.rowHash,
    expectedOutputHash: source.outputHash,
  });
}
const inspected = value(await Repair.inspectQueryPreparationRepairs(requests));
assert.equal(inspected.repairs.length, 4);
assert.equal(inspected.queryModelCalls, 0);
assert.deepEqual(await snapshot(), before);
assert.equal(
  (await Repair.repairQueryPreparations("wrong actor", requests)).success,
  false,
);
assert.equal(
  (await Repair.repairQueryPreparations(actor, requests.slice(0, 3))).success,
  false,
);
assert.equal(
  (
    await Repair.repairQueryPreparations(actor, [
      required(requests[0]),
      required(requests[0]),
      required(requests[2]),
      required(requests[3]),
    ])
  ).success,
  false,
);
const wrong = requests.map((request, index) =>
  index === 3 ? { ...request, expectedOutputHash: "0".repeat(64) } : request,
);
assert.equal(
  (await Repair.repairQueryPreparations(actor, wrong)).success,
  false,
);
assert.deepEqual(
  await snapshot(),
  before,
  "a bad fourth request cannot partially stage the first three",
);
const unrelated = required(
  children.find((row) => !cases.some((entry) => entry.sourceJobId === row.id)),
);
await db
  .update(schema.outboundIntegrationJob)
  .set({ status: "pending" })
  .where(eq(schema.outboundIntegrationJob.id, unrelated.id));
assert.equal(
  (await Repair.repairQueryPreparations(actor, requests)).success,
  false,
);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "complete",
    updatedAt: required(before.jobs.find((row) => row.id === unrelated.id))
      .updatedAt,
  })
  .where(eq(schema.outboundIntegrationJob.id, unrelated.id));
assert.deepEqual(await snapshot(), before);
// A database failure on the fourth update must roll back three earlier audits
// and child updates, rather than leave an incomplete repair batch.
await db.execute(
  sql`create function synthetic_repair_abort_fourth() returns trigger language plpgsql as $$ begin if NEW.id::text = '${sql.raw(good.sourceJobId)}' and NEW.status = 'pending' then raise exception 'synthetic fourth repair failure'; end if; return NEW; end $$`,
);
await db.execute(
  sql`create trigger synthetic_repair_abort_fourth before update on outbound_integration_job for each row execute function synthetic_repair_abort_fourth()`,
);
assert.equal(
  (await Repair.repairQueryPreparations(actor, requests)).success,
  false,
);
await db.execute(
  sql`drop trigger synthetic_repair_abort_fourth on outbound_integration_job`,
);
await db.execute(sql`drop function synthetic_repair_abort_fourth()`);
assert.deepEqual(
  await snapshot(),
  before,
  "fourth-row persistence failure rolls back the entire repair",
);
const repaired = value(await Repair.repairQueryPreparations(actor, requests));
assert.equal(repaired.repairs.length, 4);
assert.equal(repaired.searchCalls, 0);
assert.equal(repaired.queryModelCalls, 0);
const after = await snapshot();
assert.equal(after.jobs.length, before.jobs.length + 4);
assert.deepEqual(after.prospects, before.prospects);
assert.deepEqual(after.revisions, before.revisions);
assert.deepEqual(after.policy, before.policy);
assert.deepEqual(after.attempts, before.attempts);
assert.deepEqual(
  after.jobs.filter(
    (row) =>
      !cases.some((entry) => entry.sourceJobId === row.id) &&
      !repaired.repairs.some((repair) => repair.auditJobId === row.id),
  ),
  before.jobs.filter(
    (row) => !cases.some((entry) => entry.sourceJobId === row.id),
  ),
);
for (const repair of repaired.repairs) {
  const current = await jobAt(repair.sourceJobId);
  const audit = await jobAt(repair.auditJobId);
  const checked = Pure.validateQueryPreparationRepair({ job: current, audit });
  assert.equal(current.status, "pending");
  assert.equal(
    Contract.heldThirdReviewStateSchema.parse(current.output).stage,
    "generateQuery",
  );
  assert.equal(
    Contract.heldThirdReviewStateSchema.parse(current.output).query,
    undefined,
  );
  assert.equal(
    Contract.heldThirdReviewStateSchema.parse(current.output).queryReview,
    undefined,
  );
  assert.equal(
    Contract.heldThirdReviewStateSchema.parse(current.output).round3ReservedAt,
    undefined,
  );
  assert.equal(
    checked.input.exactQuestion,
    required(cases.find((entry) => entry.sourceJobId === current.id))
      .exactQuestion,
  );
  assert.equal(
    rawHash(checked.output.originalRowCanonical),
    checked.input.sourceRowHash,
  );
  await db.transaction((scope) =>
    Third.assertHeldThirdReviewEligibility(
      scope,
      checked.projected.input,
      Contract.heldThirdReviewStateSchema.parse(current.output),
    ),
  );
  const referenceTamper = {
    ...current,
    output: {
      ...current.output,
      queryPreparationRepair: {
        ...checked.reference,
        exactQuestion: "invented product query",
      },
    },
  };
  assert.throws(() =>
    Pure.validateQueryPreparationRepair({ job: referenceTamper, audit }),
  );
  assert.throws(() =>
    Pure.validateQueryPreparationRepair({
      job: current,
      audit: {
        ...audit,
        output: { ...audit.output, originalOutputCanonical: "{}" },
      },
    }),
  );
}
assert.ok(
  value(await Repair.repairQueryPreparations(actor, requests)).repairs.every(
    (row) => row.repeated,
  ),
);
assert.deepEqual(
  await snapshot(),
  after,
  "idempotent batch retry performs no writes",
);
if (
  ["progress", "rejected-review", "semantic-uncertain"].includes(
    process.argv[2] ?? "",
  )
) {
  const calls = {
    semantic: 0,
    generated: 0,
    search: 0,
    poll: 0,
    browser: 0,
    writer: 0,
    judge: 0,
  };
  const deps: import("@/server/app/outbound/held-third-review").HeldThirdReviewDependencies =
    {
      resolveKey: async () => ({ success: true, data: "synthetic" }),
      prepareQuery: (input) =>
        Capture.prepareShopperQuery(input, {
          review: async ({ prompt }) => {
            calls.semantic++;
            if (process.argv[2] === "semantic-uncertain")
              throw new Error("Synthetic interrupted semantic review");
            const context = JSON.parse(prompt);
            const basis =
              context.query === "color correcting concealer"
                ? { category: "concealer", attribute: "color correcting" }
                : context.query === "knives"
                  ? { category: "knives", attribute: "" }
                  : context.query === "leather ballet shoes"
                    ? { category: "ballet shoes", attribute: "leather" }
                    : { category: "jeans", attribute: "wide leg" };
            return {
              status:
                process.argv[2] === "rejected-review" ? "invalid" : "valid",
              reason: "Synthetic exact product support review.",
              checks: {
                naturalWordOrder: true,
                obviousProductCandidate: process.argv[2] !== "rejected-review",
                unbranded: true,
                productGrounding: true,
              },
              excerptIds: [context.excerpts[0].id],
              ...basis,
            };
          },
        }),
      generateQuery: async () => {
        calls.generated++;
        throw new Error("No question generation is authorized");
      },
      inspectProduct: async () => {
        calls.browser++;
        throw new Error("No new browser is needed");
      },
      generate: async () => {
        calls.writer++;
        throw new Error("No writer in preparation test");
      },
      judge: async () => {
        calls.judge++;
        throw new Error("No judge in preparation test");
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
      poll: async ({ job }) => {
        calls.poll++;
        return heldPoll(job, false);
      },
    };
  const advance = async (sourceJobId: string) => {
    setSystemTime(new Date(Date.now() + 61000));
    for (const entry of cases)
      await db
        .update(schema.outboundIntegrationJob)
        .set({
          output: {
            ...(await jobAt(entry.sourceJobId)).output,
            availableAt: new Date(
              Date.now() + (entry.sourceJobId === sourceJobId ? 0 : 86400000),
            ).toISOString(),
          },
        })
        .where(eq(schema.outboundIntegrationJob.id, entry.sourceJobId));
    return value(
      await Third.runNext(
        { controlId: control.id, deadline: Date.now() + 120000 },
        deps,
      ),
    );
  };
  if (process.argv[2] !== "progress") {
    const target = required(cases[0]);
    await advance(target.sourceJobId);
    const held = await jobAt(target.sourceJobId);
    const state = Contract.heldThirdReviewStateSchema.parse(held.output);
    assert.equal(
      held.status,
      process.argv[2] === "semantic-uncertain" ? "uncertain" : "complete",
    );
    assert.equal(state.query, undefined);
    assert.equal(state.round3ReservedAt, undefined);
    assert.equal(value(await Third.status(control.id)).queriesReserved, 34);
    await advance(target.sourceJobId);
    assert.equal(
      calls.semantic,
      1,
      "an ended or uncertain semantic review is never repeated",
    );
    assert.equal(calls.search, 0);
    assert.equal(calls.generated, 0);
    const retrySnapshot = await snapshot();
    assert.ok(
      value(
        await Repair.repairQueryPreparations(actor, requests),
      ).repairs.every((row) => row.repeated),
    );
    assert.deepEqual(
      await snapshot(),
      retrySnapshot,
      "operator retry cannot reopen ended semantic review",
    );
    console.log("Third exact-four query preparation repair contracts passed");
    process.exit(0);
  }
  for (const entry of cases) {
    await advance(entry.sourceJobId);
    const prepared = await jobAt(entry.sourceJobId);
    assert.equal(
      Contract.heldThirdReviewStateSchema.parse(prepared.output).stage,
      "query",
      `${entry.company}: ${prepared.error ?? Contract.heldThirdReviewStateSchema.parse(prepared.output).heldReason}`,
    );
    assert.equal(
      Contract.heldThirdReviewStateSchema.parse(prepared.output).query?.prompt,
      entry.exactQuestion,
    );
    assert.equal(
      Contract.heldThirdReviewStateSchema.parse(prepared.output).queryReview
        ?.status,
      "valid",
    );
    await advance(entry.sourceJobId);
    assert.equal(
      Contract.heldThirdReviewStateSchema.parse(
        (await jobAt(entry.sourceJobId)).output,
      ).stage,
      "poll",
    );
    await advance(entry.sourceJobId);
    const polled = await jobAt(entry.sourceJobId);
    assert.equal(
      Contract.heldThirdReviewStateSchema.parse(polled.output).stage,
      "browser",
      `${entry.company}: ${polled.error ?? Contract.heldThirdReviewStateSchema.parse(polled.output).heldReason}`,
    );
    assert.equal(
      Contract.heldThirdReviewStateSchema.parse(polled.output).polls,
      1,
    );
    const audit = await jobAt(
      required(
        repaired.repairs.find(
          (repair) => repair.sourceJobId === entry.sourceJobId,
        ),
      ).auditJobId,
    );
    Pure.validateQueryPreparationRepair({ job: polled, audit });
  }
  assert.deepEqual(calls, {
    semantic: 4,
    generated: 0,
    search: 4,
    poll: 4,
    browser: 0,
    writer: 0,
    judge: 0,
  });
  assert.equal(value(await Third.status(control.id)).queriesReserved, 38);
  const final = await snapshot();
  assert.deepEqual(final.prospects, before.prospects);
  assert.deepEqual(final.revisions, before.revisions);
  assert.deepEqual(final.policy, before.policy);
  assert.deepEqual(final.attempts, before.attempts);
}
console.log("Third exact-four query preparation repair contracts passed");
process.exit(0);
