import "server-only";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { type Result, resultify } from "@zenncore/utils";
import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { settingsForSender } from "@/lib/outbound";
import {
  assembleSequence,
  WRITING_CONTRACT_VERSION,
  writerPartsSchema,
  writingSnapshotSchema,
} from "@/lib/outbound-composition";
import {
  copyVerdictProblem,
  deterministicCopyIssues,
  hasCompleteCopyVerdict,
} from "@/lib/outbound-copy-quality";
import {
  applyRound3CopyEdits,
  hasRound3NoProductBrands,
  ROUND3_COPY_RULES_VERSION,
  spokenMerchantName,
} from "@/lib/outbound-round3-copy";
import { writerCandidatesSchema } from "@/lib/outbound-sequence-composition";
import {
  resultBrandNames,
  resultBrandsProblem,
} from "@/lib/outbound-shopping-research";
import { deriveWriterNarrative } from "@/lib/outbound-writing";
import { db, schema, type TransactionScope } from "@/server/database";
import { ConflictError, ValidationError } from "@/server/utils/error";
import {
  COPY_JUDGE_BRAND_SUBSET_POLICY_VERSION,
  COPY_JUDGE_INPUT_VERSION,
  type CopyQualityDependencies,
  judgeSequenceCopy,
} from "@/server/utils/outbound/copy-quality";
import {
  heldPreparedQueryHash,
  heldReviewPreviewContextSchema,
  heldReviewPreviewSchema,
} from "@/server/utils/outbound/held-review-contract";
import {
  type FixedResultRequest,
  type FixedResultState,
  fixedResultBindingSchema,
  fixedResultInputSchema,
  fixedResultRequestSchema,
  fixedResultStateSchema,
} from "@/server/utils/outbound/held-third-fixed-result-contract";
import {
  HELD_THIRD_REVIEW_INSTRUCTION_HASH,
  heldThirdReviewInputSchema,
  heldThirdReviewStateSchema,
} from "@/server/utils/outbound/held-third-review-contract";
import { researchHash } from "@/server/utils/outbound/shopping-research";
import {
  appendWriterCandidate,
  writerDiagnosticHash,
} from "@/server/utils/outbound/writing-candidates";
import {
  checkedThirdReviewCopyContext,
  recentHeldThirdReviewPeers,
  savedThirdReviewParentCopy,
} from "./held-third-review";

type Job = typeof schema.outboundIntegrationJob.$inferSelect;
export type FixedResultDependencies = {
  judge?: CopyQualityDependencies["generate"];
};
const digest = (value: unknown) => writerDiagnosticHash(JSON.stringify(value));
const value = <T>(result: Result<T, Error>): T => {
  if (!result.success) throw result.error;
  return result.data as T;
};
const transaction = <T>(operation: (scope: TransactionScope) => Promise<T>) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      return operation(scope);
    }),
  );
const rowHash = sql<string>`encode(sha256(convert_to(to_jsonb(${schema.outboundIntegrationJob})::text,'UTF8')),'hex')`;
const outputHash = sql<string>`encode(sha256(convert_to(${schema.outboundIntegrationJob.output}::text,'UTF8')),'hex')`;
const sourceAt = async (scope: TransactionScope, id: string) => {
  const [row] = await scope
    .select({
      ...getTableColumns(schema.outboundIntegrationJob),
      sourceRowHash: rowHash,
      sourceOutputHash: outputHash,
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id))
    .limit(1);
  if (!row)
    throw new ConflictError("The original third-review row is unavailable.");
  const { sourceRowHash, sourceOutputHash, ...job } = row;
  return { job, hashes: { sourceRowHash, sourceOutputHash } };
};
const jobAt = async (scope: TransactionScope, id: string) => {
  const [job] = await scope
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id))
    .limit(1);
  if (!job)
    throw new ConflictError("The fixed-result recovery is unavailable.");
  return job;
};

const textOf = (messages: FixedResultState["messages"]) =>
  messages.map(({ step, afterDays, subject, body }) => ({
    step,
    afterDays,
    subject,
    body,
  }));
const WRITING_PRECALL_TIMEOUT =
  "Copy: The writing time budget ended before copy review could finish.";
const JUDGE_PRECALL_TIMEOUT =
  "The copy judge did not have time to complete. Reconcile this writing job before retrying.";

/** Pure binding replay for the exporter. Database row hashes must be read with the row. */
export const fixedResultSourceProjection = (
  source: Job,
  hashes: { sourceRowHash: string; sourceOutputHash: string },
) => {
  const input = heldThirdReviewInputSchema.parse(source.input);
  const state = heldThirdReviewStateSchema.parse(source.output);
  if (
    source.provider !== "automation" ||
    source.prospectId !== input.prospectId ||
    input.instructionHash !== HELD_THIRD_REVIEW_INSTRUCTION_HASH ||
    state.lease ||
    !state.draftReservedAt ||
    state.failureReceipt ||
    !state.heldReason
  )
    throw new ConflictError(
      "The original third-review copy must be settled and fully bound.",
    );
  const originalContext = heldReviewPreviewContextSchema.parse(
    state.previewContext,
  );
  const receipt = state.shoppingReceipt;
  if (!receipt || originalContext.receiptHash !== researchHash(receipt))
    throw new ConflictError(
      "The original receipt and writing context must remain intact.",
    );
  const candidates = writerCandidatesSchema.parse(state.writerCandidates ?? []);
  const projection = (() => {
    if (
      ["Diamond Dotz", "Terrapin Ridge Farms"].includes(input.merchant.name)
    ) {
      if (
        source.status !== "failed" ||
        input.action !== "no-brands" ||
        state.stage !== "draft" ||
        state.draftBeforeJudge ||
        state.preview ||
        state.rejudgeAudit ||
        state.judgeAudit ||
        !source.error ||
        !hasRound3NoProductBrands(receipt, originalContext.prospect)
      )
        throw new ConflictError(
          "Only a deterministically rejected no-brand draft that was never judged may receive the literal correction.",
        );
      const candidate = candidates.at(-1);
      if (
        candidates.length !== 2 ||
        candidates[0]?.attempt !== 1 ||
        candidate?.attempt !== 2 ||
        !candidate.issues.length ||
        candidate.issues.some((issue) => !issue.startsWith("result:"))
      )
        throw new ConflictError(
          "Only the exact final candidate of two attempts with result-only failures is eligible.",
        );
      for (const saved of candidates)
        appendWriterCandidate([], saved, originalContext);
      const originalParts = writerPartsSchema.parse(candidate.parts);
      const correctedParts = writerPartsSchema.parse({
        ...originalParts,
        result: `${spokenMerchantName(originalContext.prospect)} didn't come up in that answer.`,
      });
      if (originalParts.result === correctedParts.result)
        throw new ConflictError(
          "The literal result already matches; this path cannot change other copy.",
        );
      return {
        correctionMode: "fixed-result" as const,
        candidate,
        originalParts,
        correctedParts,
        issues: candidate.issues,
        verdict: null,
        sourceMessages: null,
        attempts: 2 as const,
      };
    }
    if (input.merchant.name === "Peepers by PeeperSpecs") {
      const preview = state.preview;
      const written = state.draftBeforeJudge;
      const writing = preview?.messages[0]?.writing;
      if (
        source.status !== "complete" ||
        source.error !== null ||
        input.action !== "carry" ||
        state.stage !== "complete" ||
        !preview ||
        !written ||
        !writing ||
        writing.version !== WRITING_CONTRACT_VERSION ||
        writing.copyRulesVersion !== ROUND3_COPY_RULES_VERSION ||
        candidates.length !== 0 ||
        state.rejudgeAudit ||
        !state.judgeAudit ||
        state.judgeAudit.reusedExactRejudge ||
        state.judgeAudit.newJudgmentPasses !== 1 ||
        !writing.quality ||
        !hasCompleteCopyVerdict(writing.quality) ||
        writing.quality.passed ||
        writing.quality.deterministicIssues.length ||
        resultBrandsProblem(receipt) ||
        ![2, 3].includes(resultBrandNames(receipt).length)
      )
        throw new ConflictError(
          "Only the saved Peepers brand-subset judgment is eligible for the scoped clarification.",
        );
      const failed = writing.quality.criteria.filter(
        (criterion) => !criterion.passed,
      );
      if (
        failed.length !== 1 ||
        failed[0]?.criterion !== "resultCheckable" ||
        !/Ray[ -]?Ban/i.test(failed[0].reason) ||
        !/incomplete|omitt|exhaustiv/i.test(failed[0].reason)
      )
        throw new ConflictError(
          "The saved Peepers judgment must fail solely for omitting another brand.",
        );
      const originalParts = writerPartsSchema.parse(preview.parts);
      if (
        !isDeepStrictEqual(originalParts, state.suppliedParts) ||
        !isDeepStrictEqual(originalParts, written.parts) ||
        !isDeepStrictEqual(originalParts, writing.parts) ||
        !isDeepStrictEqual(
          textOf(preview.messages),
          textOf(written.messages),
        ) ||
        writing.receiptHash !== originalContext.receiptHash ||
        writing.writingPolicyHash !== originalContext.writingPolicyHash
      )
        throw new ConflictError(
          "The unchanged Peepers copy and failed verdict are not bound to their saved context.",
        );
      const settings = settingsForSender(
        originalContext.proposedPolicy,
        originalContext.prospect.assignedSenderEmail ??
          originalContext.proposedPolicy.fromEmail,
      );
      const assembled = assembleSequence(
        originalContext.prospect,
        receipt,
        settings,
        originalParts,
        { copyRulesVersion: ROUND3_COPY_RULES_VERSION },
      );
      if (
        assembled.status !== "ready" ||
        !isDeepStrictEqual(assembled.messages, textOf(preview.messages)) ||
        writing.contentHash !== writerDiagnosticHash(assembled.canonicalText)
      )
        throw new ConflictError(
          "The saved Peepers text no longer matches its exact assembled copy.",
        );
      return {
        correctionMode: "brand-subset" as const,
        candidate: null,
        originalParts,
        correctedParts: originalParts,
        issues: failed.map(
          (criterion) => `${criterion.criterion}: ${criterion.reason}`,
        ),
        verdict: writing.quality,
        sourceMessages: textOf(preview.messages),
        attempts: preview.generation.attempts,
      };
    }
    const exactReuse = input.merchant.name === "Danessa Myricks Beauty";
    if (!exactReuse && input.merchant.name !== "D'IYANU")
      throw new ConflictError(
        "This contact is outside the five explicitly scoped copy corrections.",
      );
    const audit = state.rejudgeAudit;
    if (
      input.action !== "rejudge" ||
      state.stage !== "draft" ||
      state.preview ||
      state.judgeAudit ||
      candidates.length ||
      !state.rejudgeReservedAt ||
      !audit ||
      copyVerdictProblem(audit.verdict) ||
      audit.judgeInputVersion !== COPY_JUDGE_INPUT_VERSION ||
      !state.suppliedParts ||
      source.error !==
        (exactReuse ? JUDGE_PRECALL_TIMEOUT : WRITING_PRECALL_TIMEOUT) ||
      state.heldReason !== source.error ||
      source.status !== (exactReuse ? "uncertain" : "failed")
    )
      throw new ConflictError(
        "Only the exact known pre-call timeout with its original passing recheck is eligible.",
      );
    const originalParts = writerPartsSchema.parse(state.suppliedParts);
    if (exactReuse) {
      const written = state.draftBeforeJudge;
      if (
        !written ||
        state.mechanicalEdits?.length !== 0 ||
        !isDeepStrictEqual(written.parts, originalParts)
      )
        throw new ConflictError(
          "Danessa must retain its exact unchanged written copy without any new attempt.",
        );
      return {
        correctionMode: "reuse-exact-rejudge" as const,
        candidate: null,
        originalParts,
        correctedParts: originalParts,
        issues: [source.error],
        verdict: audit.verdict,
        sourceMessages: textOf(written.messages),
        attempts: written.generation.attempts,
      };
    }
    const edit = state.mechanicalEdits?.[0];
    if (
      state.draftBeforeJudge ||
      state.mechanicalEdits?.length !== 1 ||
      edit?.field !== "result" ||
      edit.after !== originalParts.result ||
      edit.after !==
        edit.before.replace(/^That answer picked /, "It picked ") ||
      !edit.before.startsWith("That answer picked ")
    )
      throw new ConflictError(
        "D'IYANU must contain only the saved required result-prefix edit and no completed final judgment.",
      );
    return {
      correctionMode: "first-final-judgment" as const,
      candidate: null,
      originalParts,
      correctedParts: originalParts,
      issues: [source.error],
      verdict: audit.verdict,
      sourceMessages: null,
      attempts: 1 as const,
    };
  })();
  const sourceBinding = fixedResultBindingSchema.parse({
    sourceJobId: source.id,
    controlId: input.controlId,
    prospectId: input.prospectId,
    instructionHash: input.instructionHash,
    correctionMode: projection.correctionMode,
    ...hashes,
    sourceContextHash: digest(originalContext),
    sourceCandidatesHash: digest(candidates),
    sourceCandidatePartsHash: digest(projection.originalParts),
    sourceReceiptHash: researchHash(receipt),
    sourceQueryHash: heldPreparedQueryHash(state.query),
    sourceError: source.error,
    sourceHeldReason: state.heldReason,
    sourceCandidateIssues: projection.issues,
    sourceVerdict: projection.verdict,
    sourceMessagesHash: projection.sourceMessages
      ? digest(projection.sourceMessages)
      : null,
    sourceRejudgeHash: state.rejudgeAudit ? digest(state.rejudgeAudit) : null,
    sourceGenerationAttempts: projection.attempts,
    candidateAttempt: projection.candidate ? 2 : null,
    resultBefore: projection.originalParts.result,
    resultAfter: projection.correctedParts.result,
    correctedPartsHash: digest(projection.correctedParts),
  });
  return {
    input,
    state,
    originalContext,
    receipt,
    ...projection,
    sourceBinding,
  };
};
const settleCheck = async (scope: TransactionScope, controlId: string) => {
  const unfinished = await scope
    .select({ id: schema.outboundIntegrationJob.id })
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        eq(schema.outboundIntegrationJob.provider, "automation"),
        sql`input->>'operation'='heldDiscoveryRound3'`,
        sql`input->>'controlId'=${controlId}`,
        sql`status in ('pending','starting')`,
      ),
    )
    .limit(1);
  if (unfinished.length)
    throw new ConflictError(
      "The main third review must settle before fixed-result recovery.",
    );
};
const peersFor = async (
  scope: TransactionScope,
  source: Job,
  projected: ReturnType<typeof fixedResultSourceProjection>,
  prospect: Parameters<typeof recentHeldThirdReviewPeers>[2],
  exclude?: string,
) => {
  const prior = await scope
    .select({
      writing: sql<unknown>`output->'preview'->'messages'->0->'writing'`,
    })
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        eq(schema.outboundIntegrationJob.provider, "automation"),
        eq(schema.outboundIntegrationJob.status, "complete"),
        sql`input->>'operation'='heldDiscoveryRound3FixedResult'`,
        sql`input->'sourceBinding'->>'controlId'=${projected.input.controlId}`,
        ...(exclude ? [sql`id<>${exclude}`] : []),
      ),
    )
    .orderBy(desc(schema.outboundIntegrationJob.updatedAt))
    .limit(9);
  return [
    ...prior.flatMap((row) => {
      const parsed = writingSnapshotSchema.safeParse(row.writing);
      return parsed.success && parsed.data.quality?.passed
        ? [{ opening: parsed.data.parts.opening, ...parsed.data.narrative }]
        : [];
    }),
    ...(await recentHeldThirdReviewPeers(
      scope,
      { job: source, input: projected.input, state: projected.state },
      prospect,
    )),
  ].slice(0, 9);
};
const validateCopy = (
  projected: ReturnType<typeof fixedResultSourceProjection>,
  context: FixedResultState["context"],
  parts: FixedResultState["parts"],
  messages?: FixedResultState["messages"],
) => {
  if (
    !isDeepStrictEqual(parts, projected.correctedParts) ||
    !isDeepStrictEqual(
      { ...context, peers: projected.originalContext.peers },
      projected.originalContext,
    )
  )
    throw new ConflictError(
      "Only the fixed result and the explicit new peer context may change.",
    );
  const settings = settingsForSender(
    context.proposedPolicy,
    context.prospect.assignedSenderEmail ?? context.proposedPolicy.fromEmail,
  );
  const assembled = assembleSequence(
    context.prospect,
    projected.receipt,
    settings,
    parts,
    { copyRulesVersion: ROUND3_COPY_RULES_VERSION },
  );
  if (assembled.status !== "ready") throw new ValidationError(assembled.reason);
  if (messages && !isDeepStrictEqual(messages, assembled.messages))
    throw new ConflictError("The saved judgment messages changed.");
  if (
    projected.sourceMessages &&
    !isDeepStrictEqual(projected.sourceMessages, assembled.messages)
  )
    throw new ConflictError(
      "This scoped correction must preserve all three exact saved messages.",
    );
  const issues = deterministicCopyIssues({
    prospect: context.prospect,
    receipt: projected.receipt,
    playbook: settings,
    parts,
    messages: assembled.messages,
    peers: context.peers,
    globalVoiceNotes: context.globalVoiceNotes,
    copyRulesVersion: ROUND3_COPY_RULES_VERSION,
  });
  if (issues.length) throw new ValidationError(`Copy: ${issues.join(" ")}`);
  return { settings, assembled };
};
const validateOriginalRecheck = (
  projected: ReturnType<typeof fixedResultSourceProjection>,
  checked: Awaited<ReturnType<typeof checkedThirdReviewCopyContext>>,
) => {
  const mode = projected.sourceBinding.correctionMode;
  if (mode !== "first-final-judgment" && mode !== "reuse-exact-rejudge") return;
  const audit = projected.state.rejudgeAudit;
  const saved = savedThirdReviewParentCopy(checked.checked.parentState);
  const { round3CopyProof: _proof, ...baseDiscovery } =
    projected.receipt.discovery ?? {};
  const baseReceipt = { ...projected.receipt, discovery: baseDiscovery };
  const edits = applyRound3CopyEdits({
    prospect: saved.context.prospect,
    parts: saved.parts,
  });
  if (
    !audit ||
    edits.status !== "ready" ||
    audit.judgeInputVersion !== COPY_JUDGE_INPUT_VERSION ||
    copyVerdictProblem(audit.verdict) ||
    audit.sourceContextHash !== digest(saved.context) ||
    audit.sourceTextHash !== digest(textOf(saved.written.messages)) ||
    audit.sourceReceiptHash !== researchHash(saved.receipt) ||
    !isDeepStrictEqual(
      audit.originalVerdict,
      saved.written.messages[0]?.writing?.quality ?? null,
    ) ||
    Date.parse(audit.verdict.evaluatedAt) <
      Date.parse(projected.state.rejudgeReservedAt ?? "") ||
    Date.parse(audit.verdict.evaluatedAt) > Date.parse(audit.checkedAt) ||
    Date.parse(audit.checkedAt) >
      Date.parse(projected.state.draftReservedAt ?? "") ||
    !isDeepStrictEqual(baseReceipt, saved.receipt) ||
    !isDeepStrictEqual(checked.settings, saved.settings) ||
    !isDeepStrictEqual(
      projected.originalContext.prospect,
      saved.context.prospect,
    ) ||
    !isDeepStrictEqual(projected.originalContext.peers, saved.context.peers) ||
    projected.originalContext.globalVoiceNotes !==
      saved.context.globalVoiceNotes ||
    !isDeepStrictEqual(edits.parts, projected.correctedParts) ||
    !isDeepStrictEqual(edits.edits, projected.state.mechanicalEdits)
  )
    throw new ConflictError(
      "The original passing recheck and exact mechanical edit are not bound to the immutable second review.",
    );
  const assembled = validateCopy(
    projected,
    projected.originalContext,
    projected.correctedParts,
  ).assembled;
  const unchanged = isDeepStrictEqual(
    assembled.messages,
    textOf(saved.written.messages),
  );
  if ((mode === "reuse-exact-rejudge") !== unchanged)
    throw new ConflictError(
      "Only changed text may receive its first final judgment; unchanged text must reuse its bound passing verdict.",
    );
};
const prepare = async (
  scope: TransactionScope,
  request: FixedResultRequest,
) => {
  const { job, hashes } = await sourceAt(scope, request.sourceJobId);
  const projected = fixedResultSourceProjection(job, hashes);
  if (
    request.instructionHash !== projected.input.instructionHash ||
    request.expectedSourceRowHash !== hashes.sourceRowHash ||
    request.expectedOutputHash !== hashes.sourceOutputHash ||
    request.expectedCandidatePartsHash !==
      projected.sourceBinding.sourceCandidatePartsHash
  )
    throw new ConflictError(
      "The requested original row, output, or final candidate changed.",
    );
  await settleCheck(scope, projected.input.controlId);
  const checked = await checkedThirdReviewCopyContext(
    scope,
    { job, input: projected.input, state: projected.state },
    projected.state,
  );
  validateOriginalRecheck(projected, checked);
  const context = heldReviewPreviewContextSchema.parse({
    ...projected.originalContext,
    peers:
      projected.correctionMode === "reuse-exact-rejudge"
        ? projected.originalContext.peers
        : await peersFor(scope, job, projected, checked.checked.prospect),
  });
  const { assembled } = validateCopy(
    projected,
    context,
    projected.correctedParts,
  );
  return { source: job, projected, context, messages: assembled.messages };
};
export const inspect = (request: FixedResultRequest) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(sql`set transaction read only`);
      const ready = await prepare(
        scope,
        fixedResultRequestSchema.parse(request),
      );
      return {
        sourceBinding: ready.projected.sourceBinding,
        originalContext: ready.projected.originalContext,
        context: ready.context,
        parts: ready.projected.correctedParts,
        messages: ready.messages,
        recoveryContextHash: digest(ready.context),
        searchCalls: 0,
        writerCalls: 0,
        newJudgmentPasses:
          ready.projected.correctionMode === "reuse-exact-rejudge" ? 0 : 1,
      };
    }),
  );
export const start = (actor: string, requestInput: FixedResultRequest) =>
  transaction(async (scope) => {
    const request = fixedResultRequestSchema.parse(requestInput);
    const requestId = `held-round3-fixed-result:${request.sourceJobId}`;
    const [existing] = await scope
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.requestId, requestId))
      .limit(1);
    if (existing) {
      const saved = fixedResultInputSchema.parse(existing.input);
      if (
        saved.requestedBy !== actor ||
        saved.sourceBinding.sourceRowHash !== request.expectedSourceRowHash ||
        saved.sourceBinding.sourceOutputHash !== request.expectedOutputHash ||
        saved.sourceBinding.sourceCandidatePartsHash !==
          request.expectedCandidatePartsHash ||
        saved.sourceBinding.instructionHash !== request.instructionHash
      )
        throw new ConflictError(
          "The existing correction has a different frozen source binding.",
        );
      return { jobId: existing.id, repeated: true };
    }
    const ready = await prepare(scope, request);
    if (actor !== ready.projected.input.requestedBy)
      throw new ConflictError(
        "The correction must use the original third-review operator.",
      );
    const input = fixedResultInputSchema.parse({
      operation: "heldDiscoveryRound3FixedResult",
      requestedBy: actor,
      sourceBinding: ready.projected.sourceBinding,
      recoveryContextHash: digest(ready.context),
    });
    const output = fixedResultStateSchema.parse({
      stage: "judge",
      lease: null,
      originalContext: ready.projected.originalContext,
      context: ready.context,
      parts: ready.projected.correctedParts,
      messages: ready.messages,
      judgeInputVersion: COPY_JUDGE_INPUT_VERSION,
      brandSubsetPolicyVersion:
        ready.projected.correctionMode === "reuse-exact-rejudge"
          ? null
          : COPY_JUDGE_BRAND_SUBSET_POLICY_VERSION,
      searchCalls: 0,
      writerCalls: 0,
      newJudgmentPasses: 0,
    });
    const [created] = await scope
      .insert(schema.outboundIntegrationJob)
      .values({
        provider: "automation",
        prospectId: input.sourceBinding.prospectId,
        requestId,
        status: "pending",
        input,
        output,
      })
      .returning({ id: schema.outboundIntegrationJob.id });
    if (!created)
      throw new ConflictError("The fixed-result recovery could not be staged.");
    return { jobId: created.id, repeated: false };
  });
const checkedRecovery = async (scope: TransactionScope, job: Job) => {
  const input = fixedResultInputSchema.parse(job.input);
  const state = fixedResultStateSchema.parse(job.output);
  if (
    job.requestId !==
      `held-round3-fixed-result:${input.sourceBinding.sourceJobId}` ||
    job.provider !== "automation" ||
    job.prospectId !== input.sourceBinding.prospectId ||
    state.judgeInputVersion !== COPY_JUDGE_INPUT_VERSION ||
    state.brandSubsetPolicyVersion !==
      (input.sourceBinding.correctionMode === "reuse-exact-rejudge"
        ? null
        : COPY_JUDGE_BRAND_SUBSET_POLICY_VERSION) ||
    digest(state.context) !== input.recoveryContextHash
  )
    throw new ConflictError("The saved fixed-result judgment context changed.");
  const source = await sourceAt(scope, input.sourceBinding.sourceJobId);
  const projected = fixedResultSourceProjection(source.job, source.hashes);
  if (
    !isDeepStrictEqual(projected.sourceBinding, input.sourceBinding) ||
    !isDeepStrictEqual(projected.originalContext, state.originalContext)
  )
    throw new ConflictError(
      "The original failed candidate or evidence changed.",
    );
  await settleCheck(scope, projected.input.controlId);
  const checked = await checkedThirdReviewCopyContext(
    scope,
    { job: source.job, input: projected.input, state: projected.state },
    projected.state,
  );
  validateOriginalRecheck(projected, checked);
  const copy = validateCopy(
    projected,
    state.context,
    state.parts,
    state.messages,
  );
  // The model judges its immutable snapshot; current duplicate-story checks also remain mandatory.
  validateCopy(
    projected,
    {
      ...state.context,
      peers: await peersFor(
        scope,
        source.job,
        projected,
        checked.checked.prospect,
        job.id,
      ),
    },
    state.parts,
    state.messages,
  );
  return { input, state, projected, ...copy };
};
export const run = (
  request: { jobId: string; deadline?: number },
  dependencies: FixedResultDependencies = {},
) =>
  resultify(async () => {
    const claim = value(
      await transaction(async (scope) => {
        const job = await jobAt(scope, request.jobId);
        const state = fixedResultStateSchema.parse(job.output);
        if (job.status !== "pending") {
          if (
            job.status === "starting" &&
            state.lease &&
            Date.parse(state.lease.expiresAt) <= Date.now()
          )
            await scope
              .update(schema.outboundIntegrationJob)
              .set({
                status: "uncertain",
                error:
                  "The one judgment reservation expired. No automatic retry is allowed.",
                updatedAt: new Date(),
              })
              .where(eq(schema.outboundIntegrationJob.id, job.id));
          return null;
        }
        if (state.reservedAt || state.newJudgmentPasses !== 0)
          throw new ConflictError(
            "This fixed-result judgment already has a reservation.",
          );
        const checked = await checkedRecovery(scope, job);
        const timestamp = new Date().toISOString();
        const next = fixedResultStateSchema.parse({
          ...state,
          newJudgmentPasses:
            checked.projected.correctionMode === "reuse-exact-rejudge" ? 0 : 1,
          reservedAt: timestamp,
          lease: {
            token: randomUUID(),
            expiresAt: new Date(Date.now() + 180000).toISOString(),
          },
        });
        await scope
          .update(schema.outboundIntegrationJob)
          .set({ status: "starting", output: next, updatedAt: new Date() })
          .where(eq(schema.outboundIntegrationJob.id, job.id));
        return { job, checked, state: next };
      }),
    );
    if (!claim) return { advanced: false };
    const judged =
      claim.checked.projected.correctionMode === "reuse-exact-rejudge"
        ? {
            success: true as const,
            data: claim.checked.projected.sourceBinding.sourceVerdict,
          }
        : await judgeSequenceCopy(
            {
              prospect: claim.state.context.prospect,
              receipt: claim.checked.projected.receipt,
              playbook: claim.checked.settings,
              parts: claim.state.parts,
              messages: claim.state.messages,
              peers: claim.state.context.peers,
              globalVoiceNotes: claim.state.context.globalVoiceNotes,
              copyRulesVersion: ROUND3_COPY_RULES_VERSION,
            },
            {
              generate: dependencies.judge,
              deadline: Math.min(
                request.deadline ?? Date.now() + 45000,
                Date.parse(claim.state.lease?.expiresAt ?? "") - 30000,
              ),
            },
          );
    return value(
      await transaction(async (scope) => {
        const job = await jobAt(scope, claim.job.id);
        const state = fixedResultStateSchema.parse(job.output);
        if (!state.lease || state.lease.token !== claim.state.lease?.token)
          throw new ConflictError(
            "The completed judgment belongs to a superseded recovery lease.",
          );
        const checked = await resultify(() => checkedRecovery(scope, job));
        const publishedAt = Date.now();
        const active =
          job.status === "starting" &&
          Date.parse(state.lease.expiresAt) > publishedAt;
        const judgmentTimeProblem =
          judged.success &&
          claim.checked.projected.correctionMode !== "reuse-exact-rejudge" &&
          (!judged.data ||
            Date.parse(judged.data.evaluatedAt) <
              Date.parse(state.reservedAt ?? "") ||
            Date.parse(judged.data.evaluatedAt) > publishedAt)
            ? "The new judgment timestamp is outside its durable reservation. Its decision is retained unapproved."
            : null;
        const problem = !active
          ? "The judgment arrived after its lease. Its decision is retained unapproved without retry."
          : !checked.success
            ? checked.error.message
            : !judged.success
              ? judged.error.message
              : judgmentTimeProblem;
        if (problem) {
          await scope
            .update(schema.outboundIntegrationJob)
            .set({
              status: !active || !judged.success ? "uncertain" : "failed",
              error: problem,
              output: fixedResultStateSchema.parse({
                ...state,
                lease: null,
                heldReason: problem,
                ...(judged.success ? { unappliedVerdict: judged.data } : {}),
              }),
              updatedAt: new Date(),
            })
            .where(eq(schema.outboundIntegrationJob.id, job.id));
          return { advanced: true, jobId: job.id, status: "held" };
        }
        if (
          !judged.success ||
          !checked.success ||
          !hasCompleteCopyVerdict(judged.data)
        )
          throw new ValidationError("A complete bound judgment is required.");
        const narrative = deriveWriterNarrative(
          state.parts.opening,
          checked.data.projected.receipt.queries[
            checked.data.projected.receipt.selected.queryIndex
          ]?.query ?? "",
        );
        const writing = writingSnapshotSchema.parse({
          version: WRITING_CONTRACT_VERSION,
          copyRulesVersion: ROUND3_COPY_RULES_VERSION,
          writingPolicyHash: state.context.writingPolicyHash,
          receiptHash: state.context.receiptHash,
          contentHash: writerDiagnosticHash(
            checked.data.assembled.canonicalText,
          ),
          revision: null,
          generatedAt: new Date().toISOString(),
          parts: state.parts,
          queryTopic: checked.data.assembled.queryTopic,
          narrative: {
            relationship: narrative.relationship,
            occasion: narrative.occasion,
          },
          quality: judged.data,
        });
        const qualityProblem = copyVerdictProblem(judged.data);
        const preview = heldReviewPreviewSchema.parse({
          ...state.context,
          parts: state.parts,
          messages: state.messages.map((message) =>
            message.step === 1 ? { ...message, writing } : message,
          ),
          generation: {
            attempts:
              checked.data.projected.sourceBinding.sourceGenerationAttempts,
          },
          issues: qualityProblem
            ? [{ code: "copyQuality", field: `Copy: ${qualityProblem}` }]
            : [],
        });
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            status: "complete",
            error: null,
            output: fixedResultStateSchema.parse({
              ...state,
              stage: "complete",
              lease: null,
              verdict: judged.data,
              preview,
              ...(qualityProblem
                ? { heldReason: `Copy: ${qualityProblem}` }
                : {}),
            }),
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, job.id));
        return {
          advanced: true,
          jobId: job.id,
          status: qualityProblem ? "held" : "copy-passed",
        };
      }),
    );
  });
