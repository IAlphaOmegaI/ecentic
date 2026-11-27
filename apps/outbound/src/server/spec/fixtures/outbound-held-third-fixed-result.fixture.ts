import { mock, setSystemTime, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { and, eq, getTableColumns, sql } from "drizzle-orm";

// Reuse the complete isolated 21-contact lifecycle seed, including genuine raw-bound receipts.
const originalExit = process.exit;
process.exit = (() => undefined) as typeof process.exit;
await import("./outbound-held-third-review.fixture");
process.exit = originalExit;
const { db, schema } = await import("@/server/database");
const Third = await import("@/server/app/outbound/held-third-review");
const Recovery = await import("@/server/app/outbound/held-third-fixed-result");
const Contract = await import(
  "@/server/utils/outbound/held-third-review-contract"
);
const Fixed = await import(
  "@/server/utils/outbound/held-third-fixed-result-contract"
);
const Old = await import("@/server/utils/outbound/held-review-contract");
const Draft = await import("@/server/utils/outbound/draft");
const { writerDiagnosticHash } = await import(
  "@/server/utils/outbound/writing-candidates"
);
const { researchHash } = await import(
  "@/server/utils/outbound/shopping-research"
);
const { passingCopyJudge } = await import("../helpers/outbound-writer-fixture");
const { COPY_JUDGE_INPUT_VERSION } = await import(
  "@/server/utils/outbound/copy-quality"
);
const digest = (value: unknown) => writerDiagnosticHash(JSON.stringify(value));
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const textOf = (
  messages: {
    step: number;
    afterDays: number;
    subject: string;
    body: string;
  }[],
) =>
  messages.map(({ step, afterDays, subject, body }) => ({
    step,
    afterDays,
    subject,
    body,
  }));
const child = async (company: string) => {
  const [job] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        sql`input->>'operation'='heldDiscoveryRound3'`,
        sql`input->'merchant'->>'name'=${company}`,
      ),
    );
  assert.ok(job);
  return job;
};
const mainIds = (
  await db
    .select({ id: schema.outboundIntegrationJob.id })
    .from(schema.outboundIntegrationJob)
    .where(sql`input->>'operation'='heldDiscoveryRound3'`)
).map((row) => row.id);
const danessa = await child("Danessa Myricks Beauty");
const passedAudit = Contract.heldThirdReviewStateSchema.parse(
  danessa.output,
).rejudgeAudit;
assert.ok(passedAudit?.verdict.passed);
// Unrelated synthetic rows settle without contributing duplicate placeholder stories.
for (const id of mainIds) {
  const [job] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id));
  assert.ok(job);
  const state = Contract.heldThirdReviewStateSchema.parse(job.output);
  if (id === danessa.id) continue;
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "complete",
      output: {
        ...state,
        stage: "complete",
        lease: null,
        preview: undefined,
        draftBeforeJudge: undefined,
        previewContext: undefined,
      },
    })
    .where(eq(schema.outboundIntegrationJob.id, id));
}
const changeSyntheticParentCopy = async (
  company: string,
  opening: string,
  prefix = false,
) => {
  const job = await child(company);
  const input = Contract.heldThirdReviewInputSchema.parse(job.input);
  const [parent] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, input.previousJobId));
  assert.ok(parent);
  const state = Old.heldReviewStateSchema.parse(parent.output);
  const saved = Third.savedThirdReviewParentCopy(state);
  // The new brother opening is checked against current peers, not this historical window.
  const copyContext = {
    ...saved.context,
    peers:
      company === "D'IYANU"
        ? [
            {
              opening: "My brother wanted another product.",
              relationship: "brother",
              occasion: null,
            },
          ]
        : saved.context.peers,
  };
  const parts = {
    ...saved.parts,
    opening,
    result: prefix
      ? saved.parts.result.replace(/^It picked /, "That answer picked ")
      : saved.parts.result,
  };
  const composed = value(
    await Draft.composeSequence(
      saved.context.prospect,
      saved.receipt,
      saved.context.proposedPolicy,
      {
        suppliedParts: parts,
        judge: passingCopyJudge,
        globalVoiceNotes: saved.context.globalVoiceNotes,
        peers: copyContext.peers,
      },
    ),
  );
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      output: Old.heldReviewStateSchema.parse({
        ...state,
        previewContext: copyContext,
        preview: { ...copyContext, ...composed, parts },
      }),
    })
    .where(eq(schema.outboundIntegrationJob.id, parent.id));
  const [changed] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, parent.id));
  assert.ok(changed);
  const current = Contract.heldThirdReviewStateSchema.parse(job.output);
  const checkedAt = new Date().toISOString();
  const audit =
    company === "D'IYANU"
      ? {
          ...passedAudit,
          verdict: { ...passedAudit.verdict, evaluatedAt: checkedAt },
          checkedAt,
          sourceContextHash: digest(copyContext),
          sourceTextHash: digest(textOf(composed.messages)),
          sourceReceiptHash: researchHash(saved.receipt),
          originalVerdict: composed.messages[0]?.writing?.quality ?? null,
          judgeInputVersion: COPY_JUDGE_INPUT_VERSION,
        }
      : undefined;
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "pending",
      error: null,
      input: {
        ...input,
        previousJobHash: digest(changed),
        previousOutputHash: digest(changed.output),
      },
      output: Contract.heldThirdReviewStateSchema.parse({
        ...current,
        stage: "copyProof",
        heldReason: undefined,
        rejudgeAudit: audit,
        rejudgeReservedAt: audit?.checkedAt,
        suppliedParts: undefined,
        mechanicalEdits: undefined,
        draftReservedAt: undefined,
        judgeAudit: undefined,
        availableAt: new Date().toISOString(),
      }),
    })
    .where(eq(schema.outboundIntegrationJob.id, job.id));
};
await changeSyntheticParentCopy(
  "Peepers by PeeperSpecs",
  'A friend wanted a tote, so I asked Google AI Mode for "large linen bags".',
);
await changeSyntheticParentCopy(
  "D'IYANU",
  'A cousin was planning a trip, so I asked Google AI Mode for "large linen bags".',
  true,
);
const controlId = Contract.heldThirdReviewInputSchema.parse(
  danessa.input,
).controlId;
const actor = Contract.heldThirdReviewInputSchema.parse(
  danessa.input,
).requestedBy;
const focus = async (company: string) => {
  await db.execute(
    sql`update outbound_integration_job set output=jsonb_set(output,'{availableAt}',to_jsonb(${new Date(Date.now() + 86400000).toISOString()}::text)) where input->>'operation'='heldDiscoveryRound3'`,
  );
  await db.execute(
    sql`update outbound_integration_job set output=jsonb_set(output,'{availableAt}',to_jsonb(${new Date().toISOString()}::text)) where input->>'operation'='heldDiscoveryRound3' and input->'merchant'->>'name'=${company}`,
  );
};
const advance = async (
  company: string,
  dependencies: Parameters<typeof Third.runNext>[1],
) => {
  await focus(company);
  return value(
    await Third.runNext(
      { controlId, deadline: Date.now() + 300000 },
      dependencies,
    ),
  );
};
const originalCalls = { writer: 0, judge: 0 };
for (const [company, opening] of [
  [
    "Diamond Dotz",
    'A neighbor needed a bag, so I asked Google AI Mode for "large linen bags".',
  ],
  [
    "Terrapin Ridge Farms",
    'My uncle was browsing bags, so I asked Google AI Mode for "large linen bags".',
  ],
] as const) {
  const job = await child(company);
  const state = Contract.heldThirdReviewStateSchema.parse(job.output);
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "pending",
      error: null,
      output: { ...state, stage: "copyProof", heldReason: undefined },
    })
    .where(eq(schema.outboundIntegrationJob.id, job.id));
  await advance(company, {});
  await advance(company, {
    generate: async () => {
      originalCalls.writer++;
      return {
        subject: "linen bags",
        opening,
        result: `It picked ${company} didn't come up in that answer.`,
        relevance: "That's the kind of search a new customer starts with.",
      };
    },
    judge: async () => {
      originalCalls.judge++;
      return passingCopyJudge();
    },
  });
  const failed = await child(company);
  assert.equal(failed.status, "failed", JSON.stringify(failed.output));
  const failedState = Contract.heldThirdReviewStateSchema.parse(failed.output);
  assert.equal(failedState.writerCandidates?.length, 2);
  assert.ok(
    failedState.writerCandidates?.[1]?.issues.every((issue) =>
      issue.startsWith("result:"),
    ),
    JSON.stringify(failedState.writerCandidates),
  );
}
assert.equal(originalCalls.writer, 4);
assert.equal(originalCalls.judge, 0);
await advance("Peepers by PeeperSpecs", {});
await advance("Peepers by PeeperSpecs", {
  judge: async () => ({
    ...(await passingCopyJudge()),
    resultCheckable: {
      passed: false,
      reason:
        "The saved answer excerpt names Ray-Ban too, so the stated picked brands are incomplete.",
    },
  }),
});
const peepers = await child("Peepers by PeeperSpecs");
assert.equal(peepers.status, "complete", peepers.error ?? "");
assert.equal(
  Contract.heldThirdReviewStateSchema.parse(peepers.output).preview?.messages[0]
    ?.writing?.quality?.passed,
  false,
);
await advance("D'IYANU", {});
const diyanu = await child("D'IYANU");
const diyanuInput = Contract.heldThirdReviewInputSchema.parse(diyanu.input);
const diyanuState = Contract.heldThirdReviewStateSchema.parse(diyanu.output);
const context = await db.transaction((scope) =>
  Third.checkedThirdReviewCopyContext(
    scope,
    { job: diyanu, input: diyanuInput, state: diyanuState },
    diyanuState,
  ),
);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "failed",
    error:
      "Copy: The writing time budget ended before copy review could finish.",
    output: Contract.heldThirdReviewStateSchema.parse({
      ...diyanuState,
      stage: "draft",
      lease: null,
      draftReservedAt: new Date().toISOString(),
      previewContext: context.context,
      heldReason:
        "Copy: The writing time budget ended before copy review could finish.",
    }),
  })
  .where(eq(schema.outboundIntegrationJob.id, diyanu.id));
const danessaState = Contract.heldThirdReviewStateSchema.parse(danessa.output);
await db
  .update(schema.outboundIntegrationJob)
  .set({
    status: "uncertain",
    error:
      "The copy judge did not have time to complete. Reconcile this writing job before retrying.",
    output: Contract.heldThirdReviewStateSchema.parse({
      ...danessaState,
      stage: "draft",
      lease: null,
      preview: undefined,
      judgeAudit: undefined,
      heldReason:
        "The copy judge did not have time to complete. Reconcile this writing job before retrying.",
    }),
  })
  .where(eq(schema.outboundIntegrationJob.id, danessa.id));
const protectedState = async () => ({
  prospects: await db
    .select()
    .from(schema.outboundProspect)
    .orderBy(schema.outboundProspect.id),
  policy: await db.select().from(schema.outboundPlaybook),
  jobs: await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(sql`input->>'operation'<>'heldDiscoveryRound3FixedResult'`)
    .orderBy(schema.outboundIntegrationJob.id),
});
const before = await protectedState();
const loadSource = async (company: string) => {
  const source = await child(company);
  const [row] = await db
    .select({
      ...getTableColumns(schema.outboundIntegrationJob),
      sourceRowHash: sql<string>`encode(sha256(convert_to(to_jsonb(${schema.outboundIntegrationJob})::text,'UTF8')),'hex')`,
      sourceOutputHash: sql<string>`encode(sha256(convert_to(${schema.outboundIntegrationJob.output}::text,'UTF8')),'hex')`,
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, source.id));
  assert.ok(row);
  const { sourceRowHash, sourceOutputHash, ...job } = row;
  const hashes = {
    sourceRowHash,
    sourceOutputHash,
  };
  const legacy = Recovery.fixedResultSourceProjection(job, hashes);
  assert.equal(Object.hasOwn(legacy.sourceBinding, "correctiveEdits"), false);
  const mode =
    company === "Peepers by PeeperSpecs"
      ? "brand-subset-opening"
      : company === "D'IYANU"
        ? "first-final-opening"
        : legacy.correctionMode;
  const projected = Recovery.fixedResultSourceProjection(job, hashes, {
    correctionMode: mode,
  });
  if (mode !== "brand-subset-opening" && mode !== "first-final-opening")
    assert.deepEqual(projected, legacy);
  else {
    assert.deepEqual(projected.originalParts, legacy.originalParts);
    assert.deepEqual(projected.sourceMessages, legacy.sourceMessages);
    const edit = projected.sourceBinding.correctiveEdits?.[0];
    assert.ok(edit);
    assert.deepEqual(projected.correctedParts, {
      ...legacy.originalParts,
      opening: edit.after,
    });
    assert.equal(edit.before, legacy.originalParts.opening);
    assert.equal(
      edit.after,
      edit.before.replace(
        mode === "brand-subset-opening" ? /^A friend / : /^A cousin /,
        mode === "brand-subset-opening" ? "A colleague " : "My brother ",
      ),
    );
    assert.equal(
      projected.sourceBinding.sourceCandidatePartsHash,
      legacy.sourceBinding.sourceCandidatePartsHash,
    );
  }
  return {
    job,
    projected,
    request: Fixed.fixedResultRequestSchema.parse({
      sourceJobId: job.id,
      instructionHash: Contract.HELD_THIRD_REVIEW_INSTRUCTION_HASH,
      expectedSourceRowHash: sourceRowHash,
      expectedOutputHash: sourceOutputHash,
      expectedCandidatePartsHash:
        projected.sourceBinding.sourceCandidatePartsHash,
    }),
  };
};
const calls = { judge: 0 };
const originalCopyContext = Third.checkedThirdReviewCopyContext;
const originalPeers = Third.recentHeldThirdReviewPeers;
const scenario = process.argv[2] ?? "normal";
const companies =
  scenario === "normal"
    ? [
        "Danessa Myricks Beauty",
        "D'IYANU",
        "Diamond Dotz",
        "Terrapin Ridge Farms",
        "Peepers by PeeperSpecs",
      ]
    : scenario === "opening-peer-change"
      ? ["Peepers by PeeperSpecs"]
      : ["Diamond Dotz"];
for (const company of companies) {
  const { job, projected, request } = await loadSource(company);
  const hashes = {
    sourceRowHash: request.expectedSourceRowHash,
    sourceOutputHash: request.expectedOutputHash,
  };
  assert.throws(() =>
    Recovery.fixedResultSourceProjection(
      {
        ...job,
        error: "A different provider failure must not become a retry",
        output: {
          ...job.output,
          judgeAudit: {
            reusedExactRejudge: false,
            newJudgmentPasses: 1,
            judgeInputVersion: COPY_JUDGE_INPUT_VERSION,
          },
        },
      },
      hashes,
    ),
  );
  if (projected.correctionMode === "fixed-result") {
    const candidates = projected.state.writerCandidates;
    assert.ok(candidates);
    assert.throws(() =>
      Recovery.fixedResultSourceProjection(
        {
          ...job,
          output: {
            ...job.output,
            writerCandidates: candidates.map((candidate) =>
              candidate.attempt === 2
                ? {
                    ...candidate,
                    issues: [
                      ...candidate.issues,
                      "opening: unsupported synthetic claim",
                    ],
                  }
                : candidate,
            ),
          },
        },
        hashes,
      ),
    );
  }
  const inspected = value(await Recovery.inspect(request));
  assert.deepEqual(inspected.parts, projected.correctedParts);
  if (projected.correctionMode === "reuse-exact-rejudge")
    assert.deepEqual(inspected.parts, projected.originalParts);
  const noCallBefore = calls.judge;
  assert.equal(
    (await Recovery.inspect({ ...request, expectedOutputHash: "0".repeat(64) }))
      .success,
    false,
  );
  const started = value(await Recovery.start(actor, request));
  assert.equal(
    value(await Recovery.start(actor, request)).jobId,
    started.jobId,
  );
  const openingEdit = projected.sourceBinding.correctiveEdits?.[0];
  if (openingEdit) {
    const relationship =
      projected.correctionMode === "brand-subset-opening"
        ? "colleague"
        : "brother";
    const conflict = {
      opening: `My ${relationship} wanted another product.`,
      relationship,
      occasion: null,
    };
    const peerSpy = spyOn(
      Third,
      "recentHeldThirdReviewPeers",
    ).mockResolvedValue([conflict]);
    const rejected = await Recovery.run(
      { jobId: started.jobId },
      {
        judge: async () => {
          calls.judge++;
          return passingCopyJudge();
        },
      },
    );
    assert.equal(rejected.success, false);
    if (!rejected.success)
      assert.match(rejected.error.message, /relationship was already used/);
    assert.equal(calls.judge, noCallBefore);
    const [unreserved] = await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.id, started.jobId));
    assert.equal(unreserved?.status, "pending");
    assert.equal(
      Fixed.fixedResultStateSchema.parse(unreserved?.output).newJudgmentPasses,
      0,
    );
    peerSpy.mockRestore();
  }
  if (company === "Diamond Dotz") {
    const [prospect] = await db
      .select()
      .from(schema.outboundProspect)
      .where(eq(schema.outboundProspect.id, projected.input.prospectId));
    assert.ok(prospect);
    await db
      .update(schema.outboundProspect)
      .set({ holdReason: "Synthetic changed hold" })
      .where(eq(schema.outboundProspect.id, prospect.id));
    assert.equal(
      (
        await Recovery.run(
          { jobId: started.jobId },
          {
            judge: async () => {
              calls.judge++;
              return passingCopyJudge();
            },
          },
        )
      ).success,
      false,
    );
    assert.equal(calls.judge, noCallBefore);
    await db
      .update(schema.outboundProspect)
      .set({ holdReason: prospect.holdReason, updatedAt: prospect.updatedAt })
      .where(eq(schema.outboundProspect.id, prospect.id));
  }
  // A changed source row is caught before the reserved judge, then exact restoration allows its one attempt.
  await db
    .update(schema.outboundIntegrationJob)
    .set({ error: "Synthetic source tamper" })
    .where(eq(schema.outboundIntegrationJob.id, job.id));
  assert.equal(
    (
      await Recovery.run(
        { jobId: started.jobId },
        {
          judge: async () => {
            calls.judge++;
            return passingCopyJudge();
          },
        },
      )
    ).success,
    false,
  );
  assert.equal(calls.judge, noCallBefore);
  await db
    .update(schema.outboundIntegrationJob)
    .set({ error: job.error, updatedAt: job.updatedAt })
    .where(eq(schema.outboundIntegrationJob.id, job.id));
  const result = await Recovery.run(
    { jobId: started.jobId, deadline: Date.now() + 300000 },
    {
      judge: async () => {
        calls.judge++;
        if (scenario === "opening-peer-change")
          spyOn(Third, "recentHeldThirdReviewPeers").mockResolvedValue([
            {
              opening: "A colleague wanted a different product.",
              relationship: "colleague",
              occasion: null,
            },
          ]);
        if (scenario === "source-change") {
          await db
            .update(schema.outboundIntegrationJob)
            .set({ error: "Synthetic changed source after model start" })
            .where(eq(schema.outboundIntegrationJob.id, job.id));
        }
        if (scenario === "expired" || scenario === "superseded") {
          const [current] = await db
            .select()
            .from(schema.outboundIntegrationJob)
            .where(eq(schema.outboundIntegrationJob.id, started.jobId));
          assert.ok(current);
          const output = Fixed.fixedResultStateSchema.parse(current.output);
          assert.ok(output.lease);
          await db
            .update(schema.outboundIntegrationJob)
            .set({
              output: {
                ...output,
                lease: {
                  ...output.lease,
                  ...(scenario === "expired"
                    ? { expiresAt: new Date(Date.now() - 1000).toISOString() }
                    : { token: crypto.randomUUID() }),
                },
              },
            })
            .where(eq(schema.outboundIntegrationJob.id, started.jobId));
        }
        if (scenario === "provider-failure")
          throw new Error("Synthetic interrupted provider response");
        if (scenario === "replay-expired") {
          spyOn(Third, "checkedThirdReviewCopyContext").mockImplementation(
            async (...args) => {
              const checked = await originalCopyContext(...args);
              setSystemTime(new Date(Date.now() + 181000));
              return checked;
            },
          );
        }
        if (scenario.startsWith("judgment-")) {
          spyOn(Third, "checkedThirdReviewCopyContext").mockImplementation(
            async (...args) => {
              setSystemTime();
              return originalCopyContext(...args);
            },
          );
          setSystemTime(
            new Date(
              Date.now() + (scenario === "judgment-future" ? 10000 : -10000),
            ),
          );
        }
        return passingCopyJudge();
      },
    },
  );
  if (scenario === "superseded") assert.equal(result.success, false);
  else assert.equal(value(result).advanced, true);
  const [saved] = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, started.jobId));
  assert.ok(saved);
  const state = Fixed.fixedResultStateSchema.parse(saved.output);
  if (scenario === "normal") {
    assert.equal(
      state.preview?.messages[0]?.writing?.quality?.passed,
      true,
      saved.error ?? JSON.stringify(state),
    );
    assert.equal(
      state.preview?.generation.attempts,
      projected.sourceBinding.sourceGenerationAttempts,
    );
    if (openingEdit) {
      assert.equal(state.preview?.parts.opening, openingEdit.after);
      assert.deepEqual(state.preview?.parts, {
        ...projected.originalParts,
        opening: openingEdit.after,
      });
      assert.equal(
        state.preview?.messages[0]?.writing?.narrative.relationship,
        projected.correctionMode === "brand-subset-opening"
          ? "colleague"
          : "brother",
      );
      if (projected.sourceMessages) {
        assert.deepEqual(
          textOf(state.preview.messages).slice(1),
          projected.sourceMessages.slice(1),
        );
        assert.equal(
          state.preview.messages[0]?.subject,
          projected.sourceMessages[0]?.subject,
        );
        assert.equal(
          state.preview.messages[0]?.body,
          projected.sourceMessages[0]?.body.replace(
            openingEdit.before,
            openingEdit.after,
          ),
        );
      }
    }
  } else {
    assert.equal(state.preview, undefined);
    assert.equal(
      saved.status,
      scenario === "source-change" ||
        scenario === "opening-peer-change" ||
        scenario.startsWith("judgment-")
        ? "failed"
        : scenario === "superseded"
          ? "starting"
          : "uncertain",
    );
    assert.equal(
      !!state.unappliedVerdict,
      scenario === "source-change" ||
        scenario === "opening-peer-change" ||
        scenario === "expired" ||
        scenario === "replay-expired" ||
        scenario.startsWith("judgment-"),
    );
    if (scenario.startsWith("judgment-"))
      assert.match(saved.error ?? "", /timestamp is outside/);
  }
  assert.equal(
    state.newJudgmentPasses,
    company === "Danessa Myricks Beauty" ? 0 : 1,
  );
  assert.equal(
    calls.judge - noCallBefore,
    company === "Danessa Myricks Beauty" ? 0 : 1,
  );
  if (scenario === "source-change")
    await db
      .update(schema.outboundIntegrationJob)
      .set({ error: job.error, updatedAt: job.updatedAt })
      .where(eq(schema.outboundIntegrationJob.id, job.id));
  const repeated = value(
    await Recovery.run(
      { jobId: started.jobId },
      {
        judge: async () => {
          throw new Error("Forbidden second judgment");
        },
      },
    ),
  );
  assert.equal(repeated.advanced, false);
  mock.restore();
  assert.equal(Third.recentHeldThirdReviewPeers, originalPeers);
  setSystemTime();
}
assert.equal(calls.judge, scenario === "normal" ? 4 : 1);
assert.deepEqual(await protectedState(), before);
console.log("Third fixed-result supplemental contracts passed");
process.exit(0);
