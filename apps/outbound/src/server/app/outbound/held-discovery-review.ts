import "server-only";

import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { type Result, resultify } from "@zenncore/utils";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import {
  normalizeDomain,
  playbookSchema,
  prospectSchema,
  settingsForProspect,
} from "@/lib/outbound";
import {
  assembleSequence,
  writingSnapshotSchema,
} from "@/lib/outbound-composition";
import {
  copyVerdictProblem,
  deterministicCopyIssues,
  hasCompleteCopyVerdict,
} from "@/lib/outbound-copy-quality";
import { rebuildHeldReviewWritingProposal } from "@/lib/outbound-rebuild-policy";
import { writerCandidatesSchema } from "@/lib/outbound-sequence-composition";
import { db, schema, type TransactionScope } from "@/server/database";
import { ConflictError, ValidationError } from "@/server/utils/error";
import * as Draft from "@/server/utils/outbound/draft";
import { browserClaimInterval } from "@/server/utils/outbound/firecrawl-cooldown";
import {
  HELD_CARD_ASSESSMENT_ERRORS,
  HELD_REVIEW_MANIFEST_HASH,
  HELD_REVIEW_REASON,
  HELD_REVIEW_ROUND2_INSTRUCTION_HASH,
  type HeldReviewInput,
  type HeldReviewManifest,
  type HeldReviewState,
  heldCardAssessmentRecoverySchema,
  heldManifestHash,
  heldPollRecoverySchema,
  heldPreparedQueryHash,
  heldQueryQualityHoldSchema,
  heldQueryRepairSchema,
  heldReviewBatchSchema,
  heldReviewBudgetSchema,
  heldReviewInputSchema,
  heldReviewManifestSchema,
  heldReviewPreviewContextSchema,
  heldReviewPreviewSchema,
  heldReviewStageBudget,
  heldReviewStateSchema,
  heldReviewWrittenSchema,
  heldWriterCandidateRecoverySchema,
} from "@/server/utils/outbound/held-review-contract";
import { IntegrationError } from "@/server/utils/outbound/http";
import * as Capture from "@/server/utils/outbound/live-shopping";
import {
  shoppingPollLimit,
  shoppingPollUrl,
} from "@/server/utils/outbound/scrapellm-cooldown";
import * as Assessment from "@/server/utils/outbound/shopping-assessment";
import {
  appendCaptureHistory,
  assessResultBrands,
  assessUnrankedCardAbsence,
  inspectDiscoveryPresence,
  projectRepeatedPresence,
} from "@/server/utils/outbound/shopping-fact-assessment";
import {
  compositionProspectHash,
  writingPolicyHash,
} from "@/server/utils/outbound/shopping-policy";
import {
  broaderSearchProblem,
  completedShoppingQuerySchema,
} from "@/server/utils/outbound/shopping-query-history";
import {
  researchHash,
  researchPolicyHash,
} from "@/server/utils/outbound/shopping-research";
import {
  appendWriterCandidate,
  writerDiagnosticHash,
} from "@/server/utils/outbound/writing-candidates";
import * as Credentials from "./provider-credentials";
import * as Composition from "./sequence-composition";
import { claimShoppingProviderSlot } from "./shopping-provider-pacing";
import * as Store from "./store";

type Job = typeof schema.outboundIntegrationJob.$inferSelect;
type Claim = { job: Job; input: HeldReviewInput; state: HeldReviewState };
export type HeldReviewDependencies = {
  inspectProduct?: typeof Capture.inspectProduct;
  generateQuery?: typeof Capture.generateShopperQuery;
  reviewQuery?: typeof Capture.reviewShopperQuery;
  repairQuery?: typeof Capture.repairShopperQuery;
  start?: typeof Capture.startQuery;
  poll?: typeof Capture.pollQuery;
  browse?: typeof Capture.inspectPages;
  assess?: typeof Assessment.assess;
  assessBrands?: typeof assessResultBrands;
  resolveKey?: typeof Credentials.resolveKey;
  generate?: Draft.CompositionDependencies["generate"];
  judge?: Draft.CompositionDependencies["judge"];
};
const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
const transaction = <Data>(
  operation: (scope: TransactionScope) => Promise<Data>,
) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      return operation(scope);
    }),
  );
const jobAt = async (scope: TransactionScope, id: string) => {
  const [job] = await scope
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id))
    .limit(1);
  if (!job) throw new ConflictError("The held review job is unavailable.");
  return job;
};
const validateManifest = (input: HeldReviewManifest) => {
  const manifest = heldReviewManifestSchema.parse(input);
  if (heldManifestHash(manifest.prospectIds) !== HELD_REVIEW_MANIFEST_HASH)
    throw new ValidationError(
      "This manifest is not the approved 21-person held review cohort.",
    );
  return manifest;
};
const batchAt = async (scope: TransactionScope, id: string) => {
  const job = await jobAt(scope, id);
  const input = heldReviewBatchSchema.parse(job.input);
  const budget = heldReviewBudgetSchema.parse(job.output);
  validateManifest(input.manifest);
  if (
    job.provider !== "automation" ||
    input.manifestHash !== HELD_REVIEW_MANIFEST_HASH ||
    input.maxQueries > 50
  )
    throw new ValidationError(
      "The held review batch identity or budget is invalid.",
    );
  return { job, input, budget };
};
const eligible = async (
  scope: TransactionScope,
  input: HeldReviewInput,
  state: HeldReviewState,
) => {
  const batch = await batchAt(scope, input.batchId);
  if (input.reviewRound === 2) {
    if (
      !input.previousJobId ||
      !input.previousOutputHash ||
      input.instructionHash !== HELD_REVIEW_ROUND2_INSTRUCTION_HASH
    )
      throw new ConflictError(
        "The reviewed instruction or original job binding is missing.",
      );
    const previous = await jobAt(scope, input.previousJobId);
    const previousInput = heldReviewInputSchema.parse(previous.input);
    if (
      previousInput.reviewRound ||
      previousInput.batchId !== input.batchId ||
      previousInput.prospectId !== input.prospectId ||
      writerDiagnosticHash(JSON.stringify(previous.output)) !==
        input.previousOutputHash
    )
      throw new ConflictError("The preserved first-review record changed.");
    const original = heldReviewStateSchema.parse(previous.output);
    const previousPurchase =
      original.shoppingJob && original.query && original.queryReservedAt
        ? {
            query: original.query,
            shoppingJob: original.shoppingJob,
            answer: original.answer,
            browser: original.browser,
            shoppingReceipt: original.shoppingReceipt,
            queryReservedAt: original.queryReservedAt,
            failureReason: previous.error ?? original.heldReason ?? null,
          }
        : undefined;
    const normalizedPurchase = previousPurchase
      ? heldReviewStateSchema.shape.priorPurchase.parse(previousPurchase)
      : undefined;
    if (
      JSON.stringify(state.priorPurchase) !==
        JSON.stringify(normalizedPurchase) ||
      state.shoppingQueryCount < original.shoppingQueryCount ||
      state.shoppingQueryCount > original.shoppingQueryCount + 1 ||
      state.shoppingQueryCount > 2
    )
      throw new ConflictError(
        "The original purchase or lifetime search count changed.",
      );
  } else if (
    input.previousJobId ||
    input.previousOutputHash ||
    input.instructionHash
  )
    throw new ValidationError(
      "A prior-review binding requires the explicit second review.",
    );
  if (batch.budget.paused)
    throw new ConflictError("The explicit held review batch is paused.");
  if (
    input.manifestHash !== batch.input.manifestHash ||
    input.requestedBy !== batch.input.requestedBy ||
    !batch.input.manifest.prospectIds.includes(input.prospectId)
  )
    throw new ValidationError(
      "The contact is outside this approved held review batch.",
    );
  const [prospect] = await scope
    .select()
    .from(schema.outboundProspect)
    .where(eq(schema.outboundProspect.id, input.prospectId))
    .limit(1);
  if (
    prospect?.status !== "held" ||
    prospect.holdReason !== HELD_REVIEW_REASON ||
    prospect.sentStep !== 0 ||
    prospect.approvedAt ||
    prospect.approvedBy ||
    prospect.approvalHash ||
    prospect.nextSendAt !== null ||
    prospect.revision !== state.prospectRevision
  )
    throw new ConflictError(
      "The contact changed or no longer has the exact unsent review hold.",
    );
  if (
    prospect.campaignId !== input.campaignId ||
    prospect.details.product !== input.product.name ||
    prospect.details.productUrl !== input.product.url ||
    prospect.details.productCategory !== input.category ||
    prospect.details.country !== input.country ||
    prospect.details.company !== input.merchant.name ||
    normalizeDomain(prospect.details.domain) !== input.merchant.domain
  )
    throw new ConflictError(
      "The held contact's product or company identity changed.",
    );
  const [attempts, approvals, policy] = await Promise.all([
    scope
      .select({ id: schema.outboundSendAttempt.id })
      .from(schema.outboundSendAttempt)
      .where(eq(schema.outboundSendAttempt.prospectId, prospect.id))
      .limit(1),
    scope
      .select({ id: schema.outboundRevision.id })
      .from(schema.outboundRevision)
      .where(
        and(
          eq(schema.outboundRevision.prospectId, prospect.id),
          isNotNull(schema.outboundRevision.approvedAt),
          isNull(schema.outboundRevision.revokedAt),
        ),
      )
      .limit(1),
    Store.policy(scope),
  ]);
  if (attempts.length || approvals.length)
    throw new ConflictError(
      "The held review cannot replace a sent, attempted or currently approved sequence.",
    );
  const [linkedin] = await scope
    .select({ id: schema.outboundIntegrationJob.id })
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        eq(schema.outboundIntegrationJob.prospectId, prospect.id),
        eq(schema.outboundIntegrationJob.provider, "linkedin"),
      ),
    )
    .limit(1);
  if (linkedin)
    throw new ConflictError(
      "An existing LinkedIn outreach attempt prevents replacing this research.",
    );
  if (input.campaignId) {
    const [campaign] = await scope
      .select({
        revision: schema.outboundCampaign.revision,
        status: schema.outboundCampaign.status,
      })
      .from(schema.outboundCampaign)
      .where(eq(schema.outboundCampaign.id, input.campaignId))
      .limit(1);
    if (
      !campaign ||
      campaign.revision !== input.campaignRevision ||
      campaign.status === "archived"
    )
      throw new ConflictError(
        "The held review campaign changed or was archived.",
      );
  }
  if (
    policy.revision !== input.playbookRevision ||
    researchPolicyHash(policy.settings) !== input.researchPolicyHash
  )
    throw new ConflictError(
      "The research policy changed after this held review was created.",
    );
  const preview = state.previewContext;
  if (preview) {
    const proposed = rebuildHeldReviewWritingProposal(policy.settings);
    const settings = settingsForProspect(prospect, proposed);
    const details = prospectSchema.parse({
      ...prospect.details,
      id: prospect.id,
      assignedSenderEmail: settings.fromEmail,
    });
    if (
      preview.prospectRevision !== prospect.revision ||
      preview.playbookRevision !== policy.revision ||
      preview.prospectHash !== compositionProspectHash(details) ||
      preview.baseWritingPolicyHash !==
        writingPolicyHash(settingsForProspect(prospect, policy.settings), {
          globalVoiceNotes: policy.settings.voiceNotes,
        }) ||
      preview.writingPolicyHash !==
        writingPolicyHash(settings, {
          globalVoiceNotes: proposed.voiceNotes,
        }) ||
      preview.receiptHash !== researchHash(state.shoppingReceipt)
    )
      throw new ConflictError(
        "The held preview identity, receipt or sender policy changed.",
      );
  }
  const context = value(await Store.getEnrichmentContext(prospect.id, scope));
  if (context.suppressed)
    throw new ConflictError("This contact or company is suppressed.");
  return { prospect, policy, batch };
};

const previewPeers = async (
  scope: TransactionScope,
  input: HeldReviewInput,
  jobId: string,
  prospect: Parameters<typeof Composition.recentCompositionPeers>[0],
) => {
  const staged = await scope
    .select({
      writing: sql<unknown>`${schema.outboundIntegrationJob.output}->'preview'->'messages'->0->'writing'`,
    })
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        eq(schema.outboundIntegrationJob.provider, "automation"),
        eq(schema.outboundIntegrationJob.status, "complete"),
        ne(schema.outboundIntegrationJob.id, jobId),
        sql`${schema.outboundIntegrationJob.input}->>'operation' = 'heldDiscoveryReview'`,
        sql`${schema.outboundIntegrationJob.input}->>'batchId' = ${input.batchId}`,
        sql`coalesce((${schema.outboundIntegrationJob.input}->>'reviewRound')::int, 1) = ${input.reviewRound ?? 1}`,
        sql`${schema.outboundIntegrationJob.output}->'preview' is not null`,
      ),
    )
    .orderBy(desc(schema.outboundIntegrationJob.updatedAt))
    .limit(9);
  const stagedPeers = staged.flatMap(({ writing }) => {
    const parsed = writingSnapshotSchema.safeParse(writing);
    return parsed.success
      ? [{ opening: parsed.data.parts.opening, ...parsed.data.narrative }]
      : [];
  });
  return [
    ...stagedPeers,
    ...value(await Composition.recentCompositionPeers(prospect, null, scope)),
  ].slice(0, 9);
};

/** Pure evidence and copy replay inside the caller's short transaction; no provider. */
const checkedWriterCandidate = async (
  scope: TransactionScope,
  input: HeldReviewInput,
  state: HeldReviewState,
  jobId: string,
  expectedPartsHash: string,
) => {
  const context = heldReviewPreviewContextSchema.parse(state.previewContext);
  const candidates = writerCandidatesSchema.parse(state.writerCandidates);
  const candidate = candidates.at(-1);
  if (
    candidates.length !== 2 ||
    candidates[0]?.attempt !== 1 ||
    candidate?.attempt !== 2 ||
    !candidates.every((saved) => saved.issues.length > 0) ||
    candidate.partsHash !== expectedPartsHash ||
    state.draftBeforeJudge ||
    state.preview ||
    state.composition ||
    state.researchId ||
    state.failureReceipt ||
    state.queryQualityHold
  )
    throw new ConflictError(
      "Only the exact final candidate of two deterministically rejected attempts can receive its first judgment.",
    );
  for (const saved of candidates) appendWriterCandidate([], saved, context);
  const ready = await eligible(scope, input, state);
  const receipt = captureReceipt(state);
  const answer = Capture.aiCaptureSchema.parse(state.answer);
  const browser = Capture.browserResearchSchema.parse(state.browser);
  const shoppingJob = Capture.aiJobSchema.parse(state.shoppingJob);
  const queryHash = heldPreparedQueryHash(state.query);
  if (
    !state.queryReservedAt ||
    state.shoppingQueryCount !==
      (state.shoppingQueryIntent === "unbranded-broad" ? 2 : 1) ||
    (state.shoppingHistory?.length ?? 0) !== state.shoppingQueryCount - 1 ||
    ready.batch.budget.queriesReserved < state.shoppingQueryCount ||
    queryHash !== heldPreparedQueryHash(shoppingJob.query) ||
    shoppingJob.query.intent !== state.shoppingQueryIntent ||
    !isDeepStrictEqual(shoppingJob, answer.job) ||
    browser.status !== "captured"
  )
    throw new ConflictError("The saved paid query or capture binding changed.");
  const queryIssue = queryProblem(input, state, ready.policy.settings);
  if (queryIssue) throw new ValidationError(queryIssue);
  const response = answer.raw.find(
    (raw) => raw.url === shoppingPollUrl(shoppingJob),
  );
  if (!response)
    throw new ValidationError("The original paid response is missing.");
  const restored = value(
    Capture.restoreCompletedQueryResponse(
      shoppingJob,
      response,
      answer.raw.find((raw) => raw.url !== response.url),
      Date.now(),
    ),
  );
  if (!isDeepStrictEqual(restored, answer))
    throw new ValidationError(
      "The saved answer changed from its original provider response.",
    );
  const proofIssue = Assessment.validateAutomaticResearch(
    { answer, browser },
    receipt,
    ready.policy.settings.verificationDays,
    ready.policy.settings,
  );
  if (proofIssue) throw new ValidationError(proofIssue);
  const proposedPolicy = playbookSchema.parse(
    rebuildHeldReviewWritingProposal(ready.policy.settings),
  );
  const settings = settingsForProspect(ready.prospect, proposedPolicy);
  const prospect = prospectSchema.parse({
    ...ready.prospect.details,
    id: ready.prospect.id,
    assignedSenderEmail: settings.fromEmail,
  });
  if (
    !isDeepStrictEqual(context.prospect, prospect) ||
    !isDeepStrictEqual(context.proposedPolicy, proposedPolicy) ||
    context.globalVoiceNotes !== proposedPolicy.voiceNotes
  )
    throw new ConflictError(
      "The original preview context no longer matches this held prospect and policy.",
    );
  const assembled = assembleSequence(
    prospect,
    receipt,
    settings,
    candidate.parts,
  );
  if (assembled.status !== "ready")
    throw new ValidationError(`Copy: ${assembled.reason}`);
  const currentPeers = await previewPeers(scope, input, jobId, ready.prospect);
  for (const peers of [context.peers, currentPeers]) {
    const issues = deterministicCopyIssues({
      prospect,
      receipt,
      playbook: settings,
      parts: candidate.parts,
      messages: assembled.messages,
      peers,
      globalVoiceNotes: context.globalVoiceNotes,
    });
    if (issues.length) throw new ValidationError(`Copy: ${issues.join(" ")}`);
  }
  const binding = {
    candidatePartsHash: candidate.partsHash,
    candidateAttempt: candidate.attempt,
    candidatesHash: writerDiagnosticHash(JSON.stringify(candidates)),
    queryHash,
    shoppingJobId: shoppingJob.id,
    responseSha256: response.sha256,
    receiptHash: researchHash(receipt),
    contextHash: candidate.contextHash,
    rawCaptures: [...answer.raw, ...browser.raw].map(({ url, sha256 }) => ({
      url,
      sha256,
    })),
  };
  return { candidate, candidates, context, binding };
};

/** Read-only preflight. The private IDs are never included in the returned summary. */
export const inspect = (manifest: HeldReviewManifest) =>
  transaction(async (scope) => {
    const parsed = validateManifest(manifest);
    const prospects = await scope
      .select({
        id: schema.outboundProspect.id,
        status: schema.outboundProspect.status,
        holdReason: schema.outboundProspect.holdReason,
        sentStep: schema.outboundProspect.sentStep,
        nextSendAt: schema.outboundProspect.nextSendAt,
        details: schema.outboundProspect.details,
      })
      .from(schema.outboundProspect)
      .where(inArray(schema.outboundProspect.id, parsed.prospectIds));
    return {
      manifestHash: heldManifestHash(parsed.prospectIds),
      contacts: parsed.prospectIds.length,
      found: prospects.length,
      exactHolds: prospects.filter(
        (prospect) =>
          prospect.status === "held" &&
          prospect.holdReason === HELD_REVIEW_REASON &&
          prospect.sentStep === 0 &&
          prospect.nextSendAt === null,
      ).length,
      namedProducts: prospects.filter(
        (prospect) =>
          prospect.details.product.trim() &&
          z.url().safeParse(prospect.details.productUrl).success,
      ).length,
      maximumSubmissions: 42,
      maximumPerContact: 2,
      sends: 0,
      executionMode: "unapplied" as const,
    };
  });

/** One immutable batch per approved manifest. A new request ID cannot reset its budget. */
export const start = (actor: string, manifest: HeldReviewManifest) =>
  transaction(async (scope) => {
    const parsed = validateManifest(manifest);
    if (!actor.trim())
      throw new ValidationError("An operator identity is required.");
    const requestId = `held-discovery-review:${HELD_REVIEW_MANIFEST_HASH}`;
    const [existing] = await scope
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.requestId, requestId))
      .limit(1);
    if (existing) {
      await batchAt(scope, existing.id);
      return { batchId: existing.id, repeated: true };
    }
    const policy = await Store.policy(scope);
    const batchId = randomUUID();
    const [batch] = await scope
      .insert(schema.outboundIntegrationJob)
      .values({
        id: batchId,
        provider: "automation",
        status: "pending",
        requestId,
        input: heldReviewBatchSchema.parse({
          operation: "heldDiscoveryReviewBatch",
          manifest: parsed,
          manifestHash: HELD_REVIEW_MANIFEST_HASH,
          maxQueries: 42,
          requestedBy: actor,
        }),
        output: heldReviewBudgetSchema.parse({
          queriesReserved: 0,
          paused: false,
        }),
      })
      .returning();
    if (!batch)
      throw new ConflictError("The held review batch could not be saved.");
    for (const prospectId of parsed.prospectIds) {
      const [prospect] = await scope
        .select()
        .from(schema.outboundProspect)
        .where(eq(schema.outboundProspect.id, prospectId))
        .limit(1);
      if (!prospect)
        throw new ConflictError("An approved held contact is missing.");
      const campaign = prospect.campaignId
        ? (
            await scope
              .select({ revision: schema.outboundCampaign.revision })
              .from(schema.outboundCampaign)
              .where(eq(schema.outboundCampaign.id, prospect.campaignId))
              .limit(1)
          )[0]
        : null;
      const input = heldReviewInputSchema.parse({
        operation: "heldDiscoveryReview",
        batchId,
        prospectId,
        campaignId: prospect.campaignId,
        campaignRevision: campaign?.revision ?? null,
        playbookRevision: policy.revision,
        researchPolicyHash: researchPolicyHash(policy.settings),
        manifestHash: HELD_REVIEW_MANIFEST_HASH,
        requestedBy: actor,
        product: {
          name: prospect.details.product,
          url: prospect.details.productUrl,
        },
        category: prospect.details.productCategory,
        country: prospect.details.country,
        merchant: {
          name: prospect.details.company,
          domain: normalizeDomain(prospect.details.domain),
        },
      });
      const state = heldReviewStateSchema.parse({
        stage: "renderedProduct",
        prospectRevision: prospect.revision,
        availableAt: new Date().toISOString(),
        lease: null,
        shoppingQueryIntent: "unbranded-specific",
        shoppingQueryCount: 0,
        polls: 0,
      });
      await eligible(scope, input, state);
      await scope.insert(schema.outboundIntegrationJob).values({
        provider: "automation",
        prospectId,
        status: "pending",
        requestId: `held-discovery-review:${HELD_REVIEW_MANIFEST_HASH}:${prospectId}`,
        input,
        output: state,
      });
    }
    return { batchId, repeated: false };
  });

/** The owner's second review creates new records and keeps the original budget. */
export const startSecondReview = (
  actor: string,
  manifest: HeldReviewManifest,
  instructionHash: string,
) =>
  transaction(async (scope) => {
    const approved = validateManifest(manifest);
    if (instructionHash !== HELD_REVIEW_ROUND2_INSTRUCTION_HASH)
      throw new ValidationError(
        "Use the exact reviewed section 7 and section 16 instructions.",
      );
    const [batchJob] = await scope
      .select()
      .from(schema.outboundIntegrationJob)
      .where(
        eq(
          schema.outboundIntegrationJob.requestId,
          `held-discovery-review:${HELD_REVIEW_MANIFEST_HASH}`,
        ),
      )
      .limit(1);
    if (!batchJob)
      throw new ConflictError(
        "The original approved review budget is missing.",
      );
    const batch = await batchAt(scope, batchJob.id);
    if (batch.input.requestedBy !== actor || batch.budget.paused)
      throw new ConflictError(
        "The original operator or active shared budget does not match.",
      );
    // A repeated invocation only needs the manifest metadata, not every raw capture.
    const existing = await scope
      .select({
        input: schema.outboundIntegrationJob.input,
        prospectId: schema.outboundIntegrationJob.prospectId,
      })
      .from(schema.outboundIntegrationJob)
      .where(
        and(
          eq(schema.outboundIntegrationJob.provider, "automation"),
          sql`${schema.outboundIntegrationJob.input}->>'operation' = 'heldDiscoveryReview'`,
          sql`${schema.outboundIntegrationJob.input}->>'batchId' = ${batchJob.id}`,
          sql`${schema.outboundIntegrationJob.input}->>'reviewRound' = '2'`,
        ),
      );
    if (existing.length) {
      if (
        existing.length !== 21 ||
        new Set(existing.map((job) => job.prospectId)).size !== 21 ||
        existing.some(
          (job) =>
            job.input["instructionHash"] !== instructionHash ||
            !approved.prospectIds.includes(job.prospectId ?? ""),
        )
      )
        throw new ConflictError(
          "The existing second-review manifest is incomplete or changed.",
        );
      return {
        batchId: batchJob.id,
        reviewRound: 2 as const,
        repeated: true,
        queriesReserved: batch.budget.queriesReserved,
      };
    }
    const originals = await scope
      .select()
      .from(schema.outboundIntegrationJob)
      .where(
        and(
          eq(schema.outboundIntegrationJob.provider, "automation"),
          sql`${schema.outboundIntegrationJob.input}->>'operation' = 'heldDiscoveryReview'`,
          sql`${schema.outboundIntegrationJob.input}->>'batchId' = ${batchJob.id}`,
          sql`not (${schema.outboundIntegrationJob.input} ? 'reviewRound')`,
        ),
      );
    if (
      originals.length !== 21 ||
      originals.some(
        (job) => !["complete", "failed", "uncertain"].includes(job.status),
      )
    )
      throw new ConflictError(
        "Every first-review job must be retained and settled before another review.",
      );
    const sources = originals.map((job) => ({
      job,
      input: heldReviewInputSchema.parse(job.input),
      state: heldReviewStateSchema.parse(job.output),
    }));
    if (
      sources.reduce(
        (sum, source) => sum + source.state.shoppingQueryCount,
        0,
      ) !== batch.budget.queriesReserved
    )
      throw new ConflictError(
        "Original per-contact reservations do not match the shared budget.",
      );
    const policy = await Store.policy(scope);
    for (const prospectId of approved.prospectIds) {
      const source = sources.find(
        (item) => item.input.prospectId === prospectId,
      );
      if (!source || source.state.shoppingQueryCount > 1)
        throw new ConflictError(
          "The original contact has no remaining authorized review search.",
        );
      const [prospect] = await scope
        .select()
        .from(schema.outboundProspect)
        .where(eq(schema.outboundProspect.id, prospectId))
        .limit(1);
      if (!prospect) throw new ConflictError("A reviewed prospect is missing.");
      const campaign = prospect.campaignId
        ? (
            await scope
              .select({ revision: schema.outboundCampaign.revision })
              .from(schema.outboundCampaign)
              .where(eq(schema.outboundCampaign.id, prospect.campaignId))
              .limit(1)
          )[0]
        : null;
      const input = heldReviewInputSchema.parse({
        ...source.input,
        requestedBy: actor,
        reviewRound: 2,
        previousJobId: source.job.id,
        previousOutputHash: writerDiagnosticHash(
          JSON.stringify(source.job.output),
        ),
        instructionHash,
        playbookRevision: policy.revision,
        researchPolicyHash: researchPolicyHash(policy.settings),
        campaignId: prospect.campaignId,
        campaignRevision: campaign?.revision ?? null,
      });
      const priorPurchase =
        source.state.shoppingJob &&
        source.state.query &&
        source.state.queryReservedAt
          ? {
              query: source.state.query,
              shoppingJob: source.state.shoppingJob,
              answer: source.state.answer,
              browser: source.state.browser,
              shoppingReceipt: source.state.shoppingReceipt,
              queryReservedAt: source.state.queryReservedAt,
              failureReason:
                source.job.error ?? source.state.heldReason ?? null,
            }
          : undefined;
      if (source.state.shoppingQueryCount && !priorPurchase)
        throw new ConflictError(
          "An uncertain original submission must be reconciled before another search.",
        );
      const productCapture =
        source.state.productCapture?.status === "captured"
          ? source.state.productCapture
          : undefined;
      const state = heldReviewStateSchema.parse({
        stage: productCapture
          ? priorPurchase
            ? "reviewQuery"
            : "generateQuery"
          : "renderedProduct",
        prospectRevision: prospect.revision,
        availableAt: new Date().toISOString(),
        lease: null,
        shoppingQueryIntent: "unbranded-specific",
        shoppingQueryCount: source.state.shoppingQueryCount,
        polls: 0,
        productCapture,
        queryPurpose: priorPurchase ? "reuse" : "initial",
        priorPurchase,
        ...(priorPurchase
          ? {
              query: priorPurchase.query,
              shoppingJob: priorPurchase.shoppingJob,
              answer: priorPurchase.answer,
              browser: priorPurchase.browser,
              queryReservedAt: priorPurchase.queryReservedAt,
            }
          : {}),
      });
      await eligible(scope, input, state);
      await scope.insert(schema.outboundIntegrationJob).values({
        provider: "automation",
        prospectId,
        status: "pending",
        requestId: `held-discovery-review:${HELD_REVIEW_MANIFEST_HASH}:review-2:${prospectId}`,
        input,
        output: state,
      });
    }
    return {
      batchId: batchJob.id,
      reviewRound: 2 as const,
      repeated: false,
      queriesReserved: batch.budget.queriesReserved,
    };
  });

const owns = async (scope: TransactionScope, claim: Claim) => {
  const job = await jobAt(scope, claim.job.id);
  const state = heldReviewStateSchema.parse(job.output);
  if (
    job.status !== "starting" ||
    !state.lease ||
    state.lease.token !== claim.state.lease?.token ||
    Date.parse(state.lease.expiresAt) <= Date.now()
  )
    throw new ConflictError("The held review stage lease expired or changed.");
  return state;
};
const unspentFirstQuery = (
  state: HeldReviewState,
  maximumAttempts: 1 | 2 = 1,
) => {
  if (
    !state.query?.basis ||
    state.productCapture?.status !== "captured" ||
    state.shoppingQueryIntent !== "unbranded-specific" ||
    state.query.intent !== "unbranded-specific" ||
    !state.queryGeneration?.attempts ||
    state.queryGeneration.attempts > maximumAttempts ||
    state.shoppingQueryCount !== 0 ||
    state.polls !== 0 ||
    state.queryReservedAt ||
    state.shoppingJob ||
    state.answer ||
    state.browser ||
    state.shoppingReceipt ||
    state.shoppingHistory?.length ||
    state.composition ||
    state.researchId ||
    state.writerCandidates?.length ||
    state.previewContext ||
    state.draftBeforeJudge ||
    state.preview ||
    state.failureReceipt ||
    state.heldReason
  )
    throw new ValidationError(
      `Only an unspent first query with one to ${maximumAttempts} completed generation attempts is eligible.`,
    );
  return state.query;
};
type UnspentQueryOperatorInput = {
  manifest: HeldReviewManifest;
  jobId: string;
  expectedQueryHash: string;
  execute?: boolean;
};
const pendingUnspentQuery = async (
  scope: TransactionScope,
  input: UnspentQueryOperatorInput,
  maximumAttempts: 1 | 2,
) => {
  const manifest = validateManifest(input.manifest);
  const job = await jobAt(scope, z.string().uuid().parse(input.jobId));
  const details = heldReviewInputSchema.parse(job.input);
  const state = heldReviewStateSchema.parse(job.output);
  if (
    job.provider !== "automation" ||
    job.prospectId !== details.prospectId ||
    !manifest.prospectIds.includes(details.prospectId) ||
    job.status !== "pending" ||
    job.error ||
    state.stage !== "query" ||
    state.lease !== null ||
    state.queryQualityHold
  )
    throw new ConflictError(
      "Only a pending, unleased query in this approved manifest is eligible; terminal or uncertain jobs cannot reopen.",
    );
  const query = unspentFirstQuery(state, maximumAttempts);
  const queryHash = heldPreparedQueryHash(query);
  if (
    queryHash !==
    z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(input.expectedQueryHash)
  )
    throw new ConflictError(
      "The saved query changed. Inspect its current hash before an operator decision.",
    );
  const ready = await eligible(scope, details, state);
  return { job, details, state, query, queryHash, ready };
};

/** Explicit operator reconciliation only; this function never calls a provider. */
export const repairUnspentQuery = (
  actor: string,
  input: UnspentQueryOperatorInput,
) =>
  transaction(async (scope) => {
    const { job, details, state, query, queryHash, ready } =
      await pendingUnspentQuery(scope, input, 1);
    const requestedBy = z.string().trim().min(1).max(200).parse(actor);
    if (state.queryRepair)
      throw new ConflictError(
        "A previously repaired query cannot receive another generation.",
      );
    const validationFailure = queryProblem(
      details,
      state,
      ready.policy.settings,
    );
    if (!validationFailure)
      throw new ValidationError(
        "This query still passes deterministic validation and does not qualify for another generation.",
      );
    const queryRepair = heldQueryRepairSchema.parse({
      originalQuery: query,
      originalQueryHash: queryHash,
      originalGeneration: state.queryGeneration,
      validationFailure,
      requestedBy,
      requestedAt: new Date().toISOString(),
    });
    if (input.execute === true)
      await scope
        .update(schema.outboundIntegrationJob)
        .set({
          output: heldReviewStateSchema.parse({
            ...state,
            stage: "repairQuery",
            queryRepair,
            availableAt: new Date().toISOString(),
          }),
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundIntegrationJob.id, job.id));
    return {
      jobId: job.id,
      batchId: details.batchId,
      staged: input.execute === true,
      originalQueryHash: queryHash,
      remainingModelAttempts: 1 as const,
      validationFailure,
    };
  });

/** Terminal quality decision only; preserves every capture and buys no providers. */
export const holdUnspentQuery = (
  actor: string,
  input: UnspentQueryOperatorInput & { reason: string },
) =>
  transaction(async (scope) => {
    const { job, details, state, queryHash } = await pendingUnspentQuery(
      scope,
      input,
      2,
    );
    const queryQualityHold = heldQueryQualityHoldSchema.parse({
      queryHash,
      reason: input.reason,
      requestedBy: actor,
      heldAt: new Date().toISOString(),
    });
    if (input.execute === true)
      await scope
        .update(schema.outboundIntegrationJob)
        .set({
          status: "complete",
          output: heldReviewStateSchema.parse({
            ...state,
            stage: "complete",
            heldReason: queryQualityHold.reason,
            queryQualityHold,
          }),
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundIntegrationJob.id, job.id));
    return {
      jobId: job.id,
      batchId: details.batchId,
      held: input.execute === true,
      queryHash,
      reason: queryQualityHold.reason,
    };
  });

/** Replays saved bytes only; cannot poll, submit, regenerate or reset a budget. */
export const reconcileFailedPoll = (
  actor: string,
  input: {
    manifest: HeldReviewManifest;
    jobId: string;
    expectedShoppingJobId: string;
    expectedResponseSha256: string;
    execute?: boolean;
  },
) =>
  transaction(async (scope) => {
    const manifest = validateManifest(input.manifest);
    const job = await jobAt(scope, z.string().uuid().parse(input.jobId));
    const details = heldReviewInputSchema.parse(job.input);
    const state = heldReviewStateSchema.parse(job.output);
    const shoppingJob = Capture.aiJobSchema.parse(state.shoppingJob);
    const queryHash = heldPreparedQueryHash(state.query);
    if (
      job.provider !== "automation" ||
      job.prospectId !== details.prospectId ||
      !manifest.prospectIds.includes(details.prospectId) ||
      job.status !== "failed" ||
      state.stage !== "poll" ||
      state.lease !== null ||
      !state.queryReservedAt ||
      state.shoppingQueryCount !==
        (state.shoppingQueryIntent === "unbranded-broad" ? 2 : 1) ||
      (state.shoppingHistory?.length ?? 0) !== state.shoppingQueryCount - 1 ||
      queryHash !== heldPreparedQueryHash(shoppingJob.query) ||
      shoppingJob.query.intent !== state.shoppingQueryIntent ||
      shoppingJob.id !== z.string().uuid().parse(input.expectedShoppingJobId) ||
      state.heldReason !== job.error ||
      state.queryQualityHold ||
      state.answer ||
      state.browser ||
      state.shoppingReceipt ||
      state.composition ||
      state.researchId ||
      state.writerCandidates?.length ||
      state.previewContext ||
      state.draftBeforeJudge ||
      state.preview ||
      state.pollRecoveries?.some(
        (recovery) => recovery.shoppingJobId === shoppingJob.id,
      )
    )
      throw new ConflictError(
        "Only a failed, unleased poll with its existing paid reservation can be reconciled once.",
      );
    const receipt = z
      .object({
        response: Capture.rawCaptureSchema,
        capture: Capture.aiCaptureSchema.optional(),
      })
      .passthrough()
      .parse(state.failureReceipt);
    if (
      receipt.response.sha256 !==
        z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .parse(input.expectedResponseSha256) ||
      (receipt.capture &&
        (!isDeepStrictEqual(receipt.capture.job, shoppingJob) ||
          !receipt.capture.raw.some((raw) =>
            isDeepStrictEqual(raw, receipt.response),
          )))
    )
      throw new ConflictError(
        "The saved provider response or paid query changed before reconciliation.",
      );
    const recovery = heldPollRecoverySchema.parse({
      shoppingJobId: shoppingJob.id,
      responseSha256: receipt.response.sha256,
      queryHash,
      originalError: job.error,
      originalHeldReason: state.heldReason,
      originalFailureReceipt: state.failureReceipt,
      requestedBy: actor,
      recoveredAt: new Date().toISOString(),
    });
    const ready = await eligible(scope, details, state);
    if (ready.batch.budget.queriesReserved < state.shoppingQueryCount)
      throw new ConflictError("The existing paid reservation is missing.");
    const problem = queryProblem(details, state, ready.policy.settings);
    if (problem) throw new ValidationError(problem);
    const answer = value(
      Capture.restoreCompletedQueryResponse(
        shoppingJob,
        receipt.response,
        receipt.capture?.raw.find((raw) => raw.url !== receipt.response.url),
        Date.now(),
      ),
    );
    if (answer.completeness?.status !== "complete")
      throw new ValidationError(
        "The saved provider response still lacks complete capture proof.",
      );
    if (input.execute === true) {
      const {
        heldReason: _heldReason,
        failureReceipt: _failureReceipt,
        ...retained
      } = state;
      await scope
        .update(schema.outboundIntegrationJob)
        .set({
          status: "pending",
          error: null,
          output: heldReviewStateSchema.parse({
            ...retained,
            stage: "browser",
            answer,
            pollRecoveries: [...(state.pollRecoveries ?? []), recovery],
          }),
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundIntegrationJob.id, job.id));
    }
    return {
      jobId: job.id,
      batchId: details.batchId,
      shoppingJobId: shoppingJob.id,
      responseSha256: receipt.response.sha256,
      reconciled: input.execute === true,
      stage: input.execute === true ? ("browser" as const) : ("poll" as const),
    };
  });
/** Rebuilds only two known card-assessment holds from saved evidence, without AI. */
export const reconcileCardAssessment = (
  actor: string,
  input: {
    manifest: HeldReviewManifest;
    jobId: string;
    expectedShoppingJobId: string;
    expectedResponseSha256: string;
    execute?: boolean;
  },
) =>
  transaction(async (scope) => {
    const manifest = validateManifest(input.manifest);
    const job = await jobAt(scope, z.string().uuid().parse(input.jobId));
    const details = heldReviewInputSchema.parse(job.input);
    const state = heldReviewStateSchema.parse(job.output);
    const shoppingJob = Capture.aiJobSchema.parse(state.shoppingJob);
    const answer = Capture.aiCaptureSchema.parse(state.answer);
    const browser = Capture.browserResearchSchema.parse(state.browser);
    const queryHash = heldPreparedQueryHash(state.query);
    if (
      job.provider !== "automation" ||
      job.prospectId !== details.prospectId ||
      !manifest.prospectIds.includes(details.prospectId) ||
      job.status !== "complete" ||
      state.stage !== "complete" ||
      !HELD_CARD_ASSESSMENT_ERRORS.some(
        (reason) => reason === state.heldReason,
      ) ||
      state.lease !== null ||
      !state.queryReservedAt ||
      state.shoppingQueryCount !==
        (state.shoppingQueryIntent === "unbranded-broad" ? 2 : 1) ||
      (state.shoppingHistory?.length ?? 0) !== state.shoppingQueryCount - 1 ||
      queryHash !== heldPreparedQueryHash(shoppingJob.query) ||
      shoppingJob.query.intent !== state.shoppingQueryIntent ||
      shoppingJob.id !== z.string().uuid().parse(input.expectedShoppingJobId) ||
      !isDeepStrictEqual(shoppingJob, answer.job) ||
      (job.error !== null && job.error !== state.heldReason) ||
      browser.status !== "captured" ||
      state.queryQualityHold ||
      state.failureReceipt ||
      state.shoppingReceipt ||
      state.composition ||
      state.researchId ||
      state.writerCandidates?.length ||
      state.previewContext ||
      state.draftBeforeJudge ||
      state.preview ||
      state.cardAssessmentRecovery
    )
      throw new ConflictError(
        "Only a completed card-assessment hold with its unchanged paid capture and no receipt or preview can be reconciled once.",
      );
    const response = answer.raw.find(
      (raw) => raw.url === shoppingPollUrl(shoppingJob),
    );
    if (
      !response ||
      response.sha256 !==
        z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .parse(input.expectedResponseSha256)
    )
      throw new ConflictError(
        "The saved paid response changed before card-assessment reconciliation.",
      );
    const ready = await eligible(scope, details, state);
    if (ready.batch.budget.queriesReserved < state.shoppingQueryCount)
      throw new ConflictError("The existing paid reservation is missing.");
    const queryIssue = queryProblem(details, state, ready.policy.settings);
    if (queryIssue) throw new ValidationError(queryIssue);
    const restored = value(
      Capture.restoreCompletedQueryResponse(
        shoppingJob,
        response,
        answer.raw.find((raw) => raw.url !== response.url),
        Date.now(),
      ),
    );
    if (!isDeepStrictEqual(restored, answer))
      throw new ValidationError(
        "The saved answer differs from its complete original provider response.",
      );
    const assessed = assessUnrankedCardAbsence({ answer, browser }, Date.now());
    if (assessed.status !== "researched")
      throw new ValidationError(assessed.reason);
    const receipt = assessed.receipt;
    if (
      receipt.selected.kind !== "discovery-absence" ||
      receipt.discovery?.order !== "unranked" ||
      receipt.discovery.merchantPresent !== false ||
      receipt.discovery.merchantPosition !== null ||
      receipt.discovery.totalListed !== null ||
      !receipt.discovery.listed.length ||
      receipt.discovery.listed.length > 3
    )
      throw new ValidationError(
        "This saved capture does not establish a bounded unranked absence finding.",
      );
    const proofIssue = Assessment.validateAutomaticResearch(
      { answer, browser },
      receipt,
      ready.policy.settings.verificationDays,
      ready.policy.settings,
    );
    if (proofIssue) throw new ValidationError(proofIssue);
    const recovery = heldCardAssessmentRecoverySchema.parse({
      shoppingJobId: shoppingJob.id,
      responseSha256: response.sha256,
      queryHash,
      originalHeldReason: state.heldReason,
      originalError: job.error,
      originalReceiptHash: null,
      receiptHash: researchHash(receipt),
      rawCaptures: [...answer.raw, ...browser.raw].map(({ url, sha256 }) => ({
        url,
        sha256,
      })),
      requestedBy: actor,
      recoveredAt: new Date().toISOString(),
    });
    if (input.execute === true) {
      const { heldReason: _heldReason, ...retained } = state;
      await scope
        .update(schema.outboundIntegrationJob)
        .set({
          status: "pending",
          error: null,
          output: heldReviewStateSchema.parse({
            ...retained,
            stage: "draft",
            shoppingReceipt: receipt,
            cardAssessmentRecovery: recovery,
          }),
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundIntegrationJob.id, job.id));
    }
    return {
      jobId: job.id,
      batchId: details.batchId,
      shoppingJobId: shoppingJob.id,
      responseSha256: response.sha256,
      reconciled: input.execute === true,
      stage:
        input.execute === true ? ("draft" as const) : ("complete" as const),
      receiptHash: recovery.receiptHash,
      alternatives: receipt.discovery.listed.length,
    };
  });
/** Stages exact saved text for its first judge; cannot call a writer or a search. */
export const reconcileWriterCandidate = (
  actor: string,
  input: {
    manifest: HeldReviewManifest;
    jobId: string;
    expectedCandidatePartsHash: string;
    execute?: boolean;
  },
) =>
  transaction(async (scope) => {
    const manifest = validateManifest(input.manifest);
    const job = await jobAt(scope, z.string().uuid().parse(input.jobId));
    const details = heldReviewInputSchema.parse(job.input);
    const state = heldReviewStateSchema.parse(job.output);
    if (
      job.provider !== "automation" ||
      job.prospectId !== details.prospectId ||
      !manifest.prospectIds.includes(details.prospectId) ||
      job.status !== "failed" ||
      state.stage !== "draft" ||
      state.lease !== null ||
      state.writerCandidateRecovery ||
      !job.error ||
      state.heldReason !== job.error
    )
      throw new ConflictError(
        "Only a failed, unleased draft with no prior candidate recovery can be staged once.",
      );
    const checked = await checkedWriterCandidate(
      scope,
      details,
      state,
      job.id,
      z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(input.expectedCandidatePartsHash),
    );
    if (job.error !== `Copy: ${checked.candidate.issues.join(" ")}`)
      throw new ConflictError(
        "The saved failure is not this candidate's deterministic rejection.",
      );
    const recovery = heldWriterCandidateRecoverySchema.parse({
      ...checked.binding,
      originalError: job.error,
      originalHeldReason: state.heldReason,
      originalIssues: checked.candidate.issues,
      requestedBy: actor,
      recoveredAt: new Date().toISOString(),
    });
    if (input.execute === true) {
      const { heldReason: _heldReason, ...retained } = state;
      await scope
        .update(schema.outboundIntegrationJob)
        .set({
          status: "pending",
          error: null,
          output: heldReviewStateSchema.parse({
            ...retained,
            availableAt: new Date().toISOString(),
            writerCandidateRecovery: recovery,
          }),
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundIntegrationJob.id, job.id));
    }
    return {
      jobId: job.id,
      batchId: details.batchId,
      candidatePartsHash: checked.candidate.partsHash,
      originalWriterAttempts: checked.candidate.attempt,
      newWriterCalls: 0,
      newSearchCalls: 0,
      judgeCalls: 0,
      reconciled: input.execute === true,
    };
  });

const checkpoint = (
  claim: Claim,
  patch: Partial<HeldReviewState>,
  status: Job["status"] = "pending",
) =>
  transaction(async (scope) => {
    const job = await jobAt(scope, claim.job.id);
    const state = heldReviewStateSchema.parse(job.output);
    if (!state.lease || state.lease.token !== claim.state.lease?.token)
      throw new ConflictError(
        "The provider result belongs to a superseded stage lease.",
      );
    const current = await resultify(() => eligible(scope, claim.input, state));
    const expired =
      job.status !== "starting" ||
      Date.parse(state.lease.expiresAt) <= Date.now();
    const reason = expired
      ? "The completed provider result arrived after its lease. It is retained for reconciliation without a retry."
      : current.success
        ? null
        : current.error.message;
    const output = heldReviewStateSchema.parse({
      ...state,
      ...patch,
      lease: null,
      ...(reason ? { heldReason: reason } : {}),
    });
    await scope
      .update(schema.outboundIntegrationJob)
      .set({
        status: expired ? "uncertain" : reason ? "failed" : status,
        output,
        ...(reason ? { error: reason } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.outboundIntegrationJob.id, claim.job.id));
  });
const browserAvailableAt = async (scope: TransactionScope) => {
  const [cooldowns] = await scope
    .select({
      availableAt: sql<
        string | null
      >`max(${schema.outboundIntegrationJob.output}->>'browserAvailableAt')`,
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.provider, "automation"));
  return cooldowns?.availableAt ? Date.parse(cooldowns.availableAt) : 0;
};
const claimNext = (batchId: string, deadline: number, reviewRound: 1 | 2 = 1) =>
  transaction(async (scope): Promise<Claim | null> => {
    const batch = await batchAt(scope, batchId);
    if (batch.budget.paused) return null;
    const jobs = await scope
      .select({ id: schema.outboundIntegrationJob.id })
      .from(schema.outboundIntegrationJob)
      .where(
        and(
          eq(schema.outboundIntegrationJob.provider, "automation"),
          sql`${schema.outboundIntegrationJob.input}->>'operation' = 'heldDiscoveryReview'`,
          sql`${schema.outboundIntegrationJob.input}->>'batchId' = ${batchId}`,
          sql`coalesce((${schema.outboundIntegrationJob.input}->>'reviewRound')::int, 1) = ${reviewRound}`,
          inArray(schema.outboundIntegrationJob.status, [
            "pending",
            "starting",
          ]),
        ),
      )
      .orderBy(
        sql`case when ${schema.outboundIntegrationJob.output}->>'stage' = 'renderedProduct' then 1 else 0 end`,
        asc(schema.outboundIntegrationJob.updatedAt),
      )
      .limit(21);
    let cachedBrowserAvailableAt: number | undefined;
    for (const { id } of jobs) {
      const job = await jobAt(scope, id);
      const input = heldReviewInputSchema.parse(job.input);
      const state = heldReviewStateSchema.parse(job.output);
      if (job.status === "starting") {
        if (state.lease && Date.parse(state.lease.expiresAt) > Date.now())
          continue;
        if (
          !["applyResearch", "applyDraft", "complete"].includes(state.stage)
        ) {
          await scope
            .update(schema.outboundIntegrationJob)
            .set({
              status: "uncertain",
              error:
                "The provider stage lost its lease. No automatic replacement or retry is allowed.",
              updatedAt: new Date(),
            })
            .where(eq(schema.outboundIntegrationJob.id, id));
          continue;
        }
      }
      if (
        Date.parse(state.availableAt) > Date.now() ||
        Date.now() + heldReviewStageBudget(state.stage, input.reviewRound) >
          deadline
      )
        continue;
      if (["renderedProduct", "browser"].includes(state.stage)) {
        cachedBrowserAvailableAt ??= await browserAvailableAt(scope);
        if (
          !Number.isFinite(cachedBrowserAvailableAt) ||
          cachedBrowserAvailableAt > Date.now()
        )
          continue;
      }
      const ready = await resultify(() => eligible(scope, input, state));
      if (!ready.success) {
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            status: "failed",
            error: ready.error.message,
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, id));
        continue;
      }
      if (state.stage === "repairQuery") {
        if (state.queryRepair?.reservedAt) {
          await scope
            .update(schema.outboundIntegrationJob)
            .set({
              status: "uncertain",
              error:
                "The remaining query repair was already reserved. Reconcile its outcome without another generation.",
              updatedAt: new Date(),
            })
            .where(eq(schema.outboundIntegrationJob.id, id));
          continue;
        }
        const repairable = await resultify(() => {
          const query = unspentFirstQuery(state);
          if (
            !state.queryRepair ||
            heldPreparedQueryHash(query) !==
              state.queryRepair.originalQueryHash ||
            !queryProblem(input, state, ready.data.policy.settings)
          )
            throw new ValidationError(
              "The preserved invalid query no longer qualifies for its reserved one-shot repair.",
            );
        });
        if (!repairable.success) {
          await scope
            .update(schema.outboundIntegrationJob)
            .set({
              status: "failed",
              error: repairable.error.message,
              updatedAt: new Date(),
            })
            .where(eq(schema.outboundIntegrationJob.id, id));
          continue;
        }
      }
      if (state.stage === "draft") {
        const [writing] = await scope
          .select({ id: schema.outboundIntegrationJob.id })
          .from(schema.outboundIntegrationJob)
          .where(
            and(
              eq(schema.outboundIntegrationJob.provider, "automation"),
              ne(schema.outboundIntegrationJob.id, id),
              eq(schema.outboundIntegrationJob.status, "starting"),
              sql`${schema.outboundIntegrationJob.input}->>'operation' = 'heldDiscoveryReview'`,
              sql`${schema.outboundIntegrationJob.input}->>'batchId' = ${batchId}`,
              sql`coalesce((${schema.outboundIntegrationJob.input}->>'reviewRound')::int, 1) = ${reviewRound}`,
              sql`${schema.outboundIntegrationJob.output}->>'stage' = 'draft'`,
              sql`${schema.outboundIntegrationJob.output}->'lease'->>'expiresAt' > ${new Date().toISOString()}`,
            ),
          )
          .limit(1);
        if (writing) continue;
      }
      if (state.stage === "query") {
        if (state.queryReservedAt) {
          await scope
            .update(schema.outboundIntegrationJob)
            .set({
              status: "uncertain",
              error:
                "This query already has a durable reservation. Reconcile it without repurchasing.",
              updatedAt: new Date(),
            })
            .where(eq(schema.outboundIntegrationJob.id, id));
          continue;
        }
        if (
          batch.budget.queriesReserved >= 42 ||
          batch.budget.queriesReserved >= batch.input.maxQueries ||
          state.shoppingQueryCount >= 2 ||
          state.shoppingQueryCount >= ready.data.policy.settings.searchesPerLead
        ) {
          await scope
            .update(schema.outboundIntegrationJob)
            .set({
              status: "complete",
              output: heldReviewStateSchema.parse({
                ...state,
                stage: "complete",
                lease: null,
                heldReason:
                  "The approved batch or per-contact search budget is exhausted.",
              }),
              updatedAt: new Date(),
            })
            .where(eq(schema.outboundIntegrationJob.id, id));
          continue;
        }
        if (
          state.shoppingQueryCount !==
          (input.reviewRound === 2
            ? state.priorPurchase
              ? 1
              : 0
            : state.shoppingQueryIntent === "unbranded-broad"
              ? 1
              : 0)
        ) {
          await scope
            .update(schema.outboundIntegrationJob)
            .set({
              status: "failed",
              error:
                "The per-contact reservation history does not match this question.",
              updatedAt: new Date(),
            })
            .where(eq(schema.outboundIntegrationJob.id, id));
          continue;
        }
        const problem = queryProblem(input, state, ready.data.policy.settings);
        if (problem) {
          await scope
            .update(schema.outboundIntegrationJob)
            .set({ status: "failed", error: problem, updatedAt: new Date() })
            .where(eq(schema.outboundIntegrationJob.id, id));
          continue;
        }
      }
      if (
        ["query", "poll"].includes(state.stage) &&
        !(await claimShoppingProviderSlot(scope))
      )
        continue;
      if (["renderedProduct", "browser"].includes(state.stage)) {
        // The cached precheck only avoids work; reservation still uses a fresh read.
        const availableAt = await browserAvailableAt(scope);
        if (!Number.isFinite(availableAt) || availableAt > Date.now()) continue;
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            output: {
              ...batch.budget,
              browserAvailableAt: new Date(
                Date.now() + browserClaimInterval,
              ).toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, batchId));
      }
      const next = heldReviewStateSchema.parse({
        ...state,
        lease: {
          token: randomUUID(),
          expiresAt: new Date(Date.now() + 180_000).toISOString(),
        },
        ...(state.stage === "query"
          ? {
              queryReservedAt: new Date().toISOString(),
              shoppingQueryCount: state.shoppingQueryCount + 1,
            }
          : {}),
        ...(state.stage === "repairQuery" && state.queryRepair
          ? {
              queryRepair: {
                ...state.queryRepair,
                reservedAt: new Date().toISOString(),
              },
            }
          : {}),
      });
      if (state.stage === "query")
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            output: {
              ...batch.budget,
              queriesReserved: batch.budget.queriesReserved + 1,
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, batchId));
      await scope
        .update(schema.outboundIntegrationJob)
        .set({
          status: "starting",
          output: next,
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundIntegrationJob.id, id));
      return { job, input, state: next };
    }
    return null;
  });
const evidenceForState = (state: HeldReviewState): Assessment.Evidence => {
  const answer = Capture.aiCaptureSchema.parse(state.answer);
  const browser = Capture.browserResearchSchema.parse(state.browser);
  if (browser.status !== "captured")
    throw new ValidationError("The browser evidence is incomplete.");
  const previous = state.priorPurchase;
  return {
    answer,
    browser,
    ...(state.queryReview ? { queryReview: state.queryReview } : {}),
    ...(state.queryPurpose !== "reuse" &&
    previous?.answer &&
    previous.browser?.status === "captured"
      ? {
          previous: [
            {
              answer: previous.answer,
              browser: previous.browser,
              ...(state.previousQueryReview
                ? { queryReview: state.previousQueryReview }
                : {}),
            },
          ],
        }
      : {}),
  };
};
const previousQueryProblem = (
  input: HeldReviewInput,
  state: HeldReviewState,
) => {
  if (
    !state.priorPurchase ||
    !state.previousQueryReview ||
    state.productCapture?.status !== "captured"
  )
    return "The original paid query and its revised review are missing.";
  return Capture.validateShopperQueryReviewBinding({
    query: state.priorPurchase.query,
    review: state.previousQueryReview,
    product: input.product,
    category: input.category,
    merchant: input.merchant,
    browser: state.productCapture,
  });
};
const queryProblem = (
  input: HeldReviewInput,
  state: HeldReviewState,
  policy: Awaited<ReturnType<typeof Store.policy>>["settings"],
) => {
  if (
    !state.query ||
    state.productCapture?.status !== "captured" ||
    state.query.intent !== state.shoppingQueryIntent
  )
    return "The validated unbranded query and product capture are missing.";
  if (input.reviewRound === 2) {
    if (!state.queryReview)
      return "The revised query has no intact semantic review.";
    const reviewed = Capture.validateShopperQueryReview({
      query: state.query,
      review: state.queryReview,
      product: input.product,
      category: input.category,
      merchant: input.merchant,
      browser: state.productCapture,
      discoveryFreshnessDays: policy.discoveryFreshnessDays,
    });
    if (reviewed) return reviewed;
    if (state.queryPurpose === "reuse")
      return "A saved valid query is reused without a new shopping purchase.";
    if (state.priorPurchase) {
      const priorProblem = previousQueryProblem(input, state);
      if (priorProblem) return priorProblem;
      if (state.query.prompt === state.priorPurchase.query.prompt)
        return "The authorized replacement must differ from the original query.";
      if (state.queryPurpose === "correction") {
        if (
          state.priorPurchase.answer &&
          state.priorPurchase.browser?.status !== "captured"
        )
          return "The original answer needs its browser evidence reconciled before a corrected purchase.";
        if (state.previousQueryReview?.status !== "invalid")
          return "A corrected search requires an invalid original query.";
      } else if (state.queryPurpose === "broader") {
        if (
          state.previousQueryReview?.status !== "valid" ||
          state.shoppingQueryIntent !== "unbranded-broad"
        )
          return "A broader search requires a valid original query.";
        const prior = state.priorPurchase;
        if (!prior.answer || prior.browser?.status !== "captured")
          return "The original merchant-presence evidence is missing.";
        const presence = inspectDiscoveryPresence({
          answer: prior.answer,
          browser: prior.browser,
          queryReview: state.previousQueryReview,
        });
        if (presence.status !== "verified" || !presence.canBroaden)
          return "A broader search requires verified merchant presence in the original answer.";
      } else
        return "This prior purchase has no authorized correction or broader-search purpose.";
    } else if (state.queryPurpose !== "initial")
      return "A first search requires an initial-query purpose.";
    return null;
  }
  if (state.shoppingQueryIntent === "unbranded-broad") {
    const problem = broaderSearchProblem(
      state.shoppingHistory?.[0],
      Date.now(),
      policy,
    );
    if (problem) return problem;
    if (state.query.prompt === state.shoppingHistory?.[0]?.query.prompt)
      return "A broader query must differ from the completed first query.";
  } else if (state.shoppingHistory?.length)
    return "The first question cannot be purchased again.";
  return Capture.validateShopperQuery({
    query: state.query,
    product: input.product,
    category: input.category,
    merchant: input.merchant,
    browser: state.productCapture,
    discoveryFreshnessDays: policy.discoveryFreshnessDays,
  });
};
const key = async (
  provider: "scrapellm" | "firecrawl",
  dependencies: HeldReviewDependencies,
) => {
  const apiKey = value(
    await (dependencies.resolveKey ?? Credentials.resolveKey)(provider),
  );
  if (!apiKey)
    throw new IntegrationError(
      provider,
      "configuration",
      `${provider} credentials are unavailable.`,
      409,
    );
  return apiKey;
};
const execute = async (
  claim: Claim,
  deadline: number,
  dependencies: HeldReviewDependencies,
) => {
  const { policy } = value(
    await transaction(async (scope) => {
      await owns(scope, claim);
      return eligible(scope, claim.input, claim.state);
    }),
  );
  const { input, state } = claim;
  const next = (
    stage: HeldReviewState["stage"],
    patch: Partial<HeldReviewState> = {},
  ) =>
    checkpoint(claim, {
      stage,
      availableAt: new Date().toISOString(),
      ...patch,
    });
  const held = (reason: string, patch: Partial<HeldReviewState> = {}) =>
    checkpoint(
      claim,
      { stage: "complete", heldReason: reason, ...patch },
      "complete",
    );
  switch (state.stage) {
    case "renderedProduct": {
      const capture = value(
        await (dependencies.inspectProduct ?? Capture.inspectProduct)({
          apiKey: await key("firecrawl", dependencies),
          product: input.product,
          country: input.country,
          deadline,
        }),
      );
      return capture.status === "captured"
        ? next(
            input.reviewRound === 2 && state.priorPurchase
              ? "reviewQuery"
              : "generateQuery",
            { productCapture: capture },
          )
        : held(capture.reason, { productCapture: capture });
    }
    case "reviewQuery": {
      const prior = state.priorPurchase;
      if (!prior || state.productCapture?.status !== "captured")
        throw new ValidationError(
          "The original query and rendered product are missing.",
        );
      const review = value(
        await (dependencies.reviewQuery ?? Capture.reviewShopperQuery)({
          product: input.product,
          category: input.category,
          merchant: input.merchant,
          browser: state.productCapture,
          query: prior.query,
          discoveryFreshnessDays: policy.settings.discoveryFreshnessDays,
          deadline,
        }),
      );
      const replaceQuery = (purpose: "correction" | "broader") =>
        next("generateQuery", {
          queryPurpose: purpose,
          previousQueryReview: review,
          shoppingQueryIntent:
            purpose === "broader" ? "unbranded-broad" : "unbranded-specific",
          query: undefined,
          queryReview: undefined,
          queryGeneration: undefined,
          shoppingJob: undefined,
          answer: undefined,
          browser: undefined,
          shoppingReceipt: undefined,
          queryReservedAt: undefined,
          polls: 0,
        });
      if (review.status === "uncertain")
        return held(review.reason, { queryReview: review });
      if (review.status === "invalid") {
        if (prior.answer && prior.browser?.status !== "captured")
          return held(
            "The original answer needs its browser evidence reconciled before a corrected purchase.",
            { queryReview: review },
          );
        return replaceQuery("correction");
      }
      if (!prior.answer)
        return held(
          "The original valid query has no completed provider answer. No replacement was purchased.",
          { queryReview: review },
        );
      if (prior.browser?.status !== "captured")
        return next("browser", { queryReview: review, queryPurpose: "reuse" });
      const presence = inspectDiscoveryPresence({
        answer: prior.answer,
        browser: prior.browser,
        queryReview: review,
      });
      if (presence.status !== "verified")
        return held(presence.reason, { queryReview: review });
      if (presence.canBroaden) return replaceQuery("broader");
      return next("assess", { queryReview: review, queryPurpose: "reuse" });
    }
    case "generateQuery": {
      if (state.productCapture?.status !== "captured")
        throw new ValidationError("The rendered product capture is missing.");
      if (
        input.reviewRound !== 2 &&
        state.shoppingQueryIntent === "unbranded-broad"
      ) {
        const problem = broaderSearchProblem(
          state.shoppingHistory?.[0],
          Date.now(),
          policy.settings,
        );
        if (problem || state.shoppingQueryCount !== 1)
          return held(problem ?? "Only one broader query is allowed.");
      }
      const generated = value(
        await (dependencies.generateQuery ?? Capture.generateShopperQuery)({
          product: input.product,
          category: input.category,
          country: input.country,
          merchant: input.merchant,
          browser: state.productCapture,
          intent: state.shoppingQueryIntent,
          queryStyle: policy.settings.queryStyle,
          discoveryFreshnessDays: policy.settings.discoveryFreshnessDays,
          previousQuestion:
            state.priorPurchase?.query.prompt ??
            state.shoppingHistory?.[0]?.query.prompt,
          deadline,
        }),
      );
      return generated.status === "prepared"
        ? next("query", {
            query: generated.query,
            queryGeneration: generated.generation,
            ...(input.reviewRound === 2
              ? { queryReview: generated.query.review }
              : {}),
          })
        : held(generated.reason, { queryGeneration: generated.generation });
    }
    case "repairQuery": {
      const query = unspentFirstQuery(state);
      const repair = state.queryRepair;
      if (
        !repair?.reservedAt ||
        heldPreparedQueryHash(query) !== repair.originalQueryHash ||
        state.productCapture?.status !== "captured"
      )
        throw new ValidationError(
          "The original query and reserved remaining repair are missing or changed.",
        );
      const repaired = value(
        await (dependencies.repairQuery ?? Capture.repairShopperQuery)({
          product: input.product,
          category: input.category,
          country: input.country,
          merchant: input.merchant,
          browser: state.productCapture,
          intent: "unbranded-specific",
          queryStyle: policy.settings.queryStyle,
          discoveryFreshnessDays: policy.settings.discoveryFreshnessDays,
          previousQuery: repair.originalQuery,
          deadline,
        }),
      );
      if (repaired.status === "prepared" && repaired.generation.attempts !== 2)
        throw new ValidationError(
          "The repaired query must account for the original candidate and exactly one remaining attempt.",
        );
      return repaired.status === "prepared"
        ? next("query", {
            query: repaired.query,
            queryGeneration: repaired.generation,
          })
        : held(repaired.reason, { queryGeneration: repaired.generation });
    }
    case "query": {
      const problem = queryProblem(input, state, policy.settings);
      if (
        problem ||
        state.shoppingQueryCount !==
          (input.reviewRound === 2
            ? state.priorPurchase
              ? 2
              : 1
            : state.shoppingQueryIntent === "unbranded-broad"
              ? 2
              : 1)
      )
        throw new ValidationError(
          problem ?? "The saved reservation does not match this query.",
        );
      const shoppingJob = value(
        await (dependencies.start ?? Capture.startQuery)({
          apiKey: await key("scrapellm", dependencies),
          query: Capture.preparedQuerySchema.parse(state.query),
          deadline,
        }),
      );
      return next("poll", {
        shoppingJob,
        availableAt: new Date(Date.now() + 20_000).toISOString(),
      });
    }
    case "poll": {
      const job = Capture.aiJobSchema.parse(state.shoppingJob);
      if (
        state.polls >= shoppingPollLimit ||
        Date.now() - Date.parse(job.submittedAt) > 86_400_000
      )
        return held(
          "The existing provider job needs reconciliation. No replacement was purchased.",
        );
      const result = value(
        await (dependencies.poll ?? Capture.pollQuery)({
          apiKey: await key("scrapellm", dependencies),
          job,
          deadline,
        }),
      );
      return result.status === "pending"
        ? next("poll", {
            polls: state.polls + 1,
            availableAt: new Date(Date.now() + 30_000).toISOString(),
          })
        : next("browser", { polls: state.polls + 1, answer: result.capture });
    }
    case "browser": {
      const answer = Capture.aiCaptureSchema.parse(state.answer);
      const browser = value(
        await (dependencies.browse ?? Capture.inspectPages)({
          apiKey: await key("firecrawl", dependencies),
          product: input.product,
          answer,
          country: input.country,
          ...(state.productCapture?.status === "captured"
            ? { productCapture: state.productCapture }
            : {}),
          deadline,
        }),
      );
      return browser.status === "captured"
        ? next("assess", { browser })
        : held(browser.reason, { browser });
    }
    case "assess": {
      const answer = Capture.aiCaptureSchema.parse(state.answer);
      const browser = Capture.browserResearchSchema.parse(state.browser);
      if (browser.status !== "captured")
        throw new ValidationError("The browser evidence is incomplete.");
      const evidence = evidenceForState(state);
      const presence =
        input.reviewRound === 2 && state.queryPurpose === "broader"
          ? inspectDiscoveryPresence(evidence)
          : null;
      const assessed =
        presence?.status === "verified" && presence.discovery.merchantPresent
          ? projectRepeatedPresence(evidence)
          : value(
              await (dependencies.assess ?? Assessment.assess)({
                ...evidence,
                playbook: policy.settings,
                deadline,
                ...(input.reviewRound === 2 ? { deferBrands: true } : {}),
              }),
            );
      if (assessed.status !== "researched") return held(assessed.reason);
      const receipt =
        input.reviewRound === 2
          ? appendCaptureHistory(assessed.receipt, evidence.previous)
          : assessed.receipt;
      const problem = Assessment.validateAutomaticResearch(
        evidence,
        receipt,
        policy.settings.verificationDays,
        policy.settings,
      );
      if (problem) return held(problem, { shoppingReceipt: receipt });
      if (receipt.selected.kind === "product-observation")
        return held("needs-unbranded-search", { shoppingReceipt: receipt });
      if (
        input.reviewRound !== 2 &&
        receipt.selected.kind === "no-gap" &&
        state.shoppingQueryCount === 1 &&
        !state.shoppingHistory?.length &&
        policy.settings.searchesPerLead === 2
      ) {
        const completed = completedShoppingQuerySchema.parse({
          query: state.query,
          shoppingJob: state.shoppingJob,
          answer,
          browser,
          shoppingReceipt: receipt,
          queryReservedAt: state.queryReservedAt,
          policyHash: input.researchPolicyHash,
        });
        const broaderProblem = broaderSearchProblem(
          completed,
          Date.now(),
          policy.settings,
        );
        if (!broaderProblem) {
          // Archive the complete first purchase in the same durable checkpoint that
          // opens generation of the second question. No reservation is replayed.
          return transaction(async (scope) => {
            await owns(scope, claim);
            await eligible(scope, input, state);
            const {
              query: _query,
              shoppingJob: _job,
              answer: _answer,
              browser: _browser,
              shoppingReceipt: _receipt,
              queryReservedAt: _reservation,
              queryGeneration: _generation,
              ...retained
            } = state;
            const output = heldReviewStateSchema.parse({
              ...retained,
              shoppingHistory: [completed],
              shoppingQueryIntent: "unbranded-broad",
              stage: "generateQuery",
              polls: 0,
              lease: null,
              availableAt: new Date().toISOString(),
            });
            await scope
              .update(schema.outboundIntegrationJob)
              .set({ status: "pending", output, updatedAt: new Date() })
              .where(eq(schema.outboundIntegrationJob.id, claim.job.id));
          });
        }
      }
      return receipt.selected.kind === "no-gap"
        ? held("No gap found. Try another product.", {
            shoppingReceipt: receipt,
          })
        : next(input.reviewRound === 2 ? "brands" : "draft", {
            shoppingReceipt: receipt,
          });
    }
    case "brands": {
      const evidence = evidenceForState(state);
      const assessed = value(
        await (dependencies.assessBrands ?? assessResultBrands)({
          ...evidence,
          receipt: captureReceipt(state),
          deadline,
        }),
      );
      if (assessed.status !== "researched") return held(assessed.reason);
      const problem = Assessment.validateAutomaticResearch(
        evidence,
        assessed.receipt,
        policy.settings.verificationDays,
        policy.settings,
      );
      return problem
        ? held(problem, { shoppingReceipt: assessed.receipt })
        : next("draft", { shoppingReceipt: assessed.receipt });
    }
    case "applyResearch":
    case "applyDraft":
      throw new ValidationError(
        "A compatible release is required before applying held research or previews.",
      );
    case "draft": {
      const receipt = captureReceipt(state);
      if (["no-gap", "product-observation"].includes(receipt.selected.kind))
        return held("This research has no eligible finding for a preview.");
      const prepared = value(
        await transaction(async (scope) => {
          const current = await owns(scope, claim);
          const ready = await eligible(scope, input, current);
          if (current.writerCandidateRecovery) {
            const recovery = current.writerCandidateRecovery;
            if (recovery.reservedAt)
              throw new ConflictError(
                "This cached candidate's first judgment was already reserved.",
              );
            const checked = await checkedWriterCandidate(
              scope,
              input,
              current,
              claim.job.id,
              recovery.candidatePartsHash,
            );
            if (
              Object.entries(checked.binding).some(
                ([key, expected]) =>
                  !isDeepStrictEqual(
                    recovery[key as keyof typeof recovery],
                    expected,
                  ),
              ) ||
              recovery.originalError !==
                `Copy: ${checked.candidate.issues.join(" ")}` ||
              recovery.originalHeldReason !== recovery.originalError ||
              !isDeepStrictEqual(
                recovery.originalIssues,
                checked.candidate.issues,
              )
            )
              throw new ConflictError(
                "The cached candidate recovery no longer matches its original audit.",
              );
            const reservedRecovery = {
              ...recovery,
              reservedAt: new Date().toISOString(),
            };
            await scope
              .update(schema.outboundIntegrationJob)
              .set({
                output: heldReviewStateSchema.parse({
                  ...current,
                  writerCandidateRecovery: reservedRecovery,
                }),
                updatedAt: new Date(),
              })
              .where(eq(schema.outboundIntegrationJob.id, claim.job.id));
            return {
              context: checked.context,
              cachedCandidate: checked.candidate,
              recovery: reservedRecovery,
            };
          }
          if (
            current.previewContext ||
            current.draftBeforeJudge ||
            current.writerCandidates?.length ||
            current.preview
          )
            throw new ConflictError(
              "A preview already started. Reconcile its saved result without repurchasing the writer.",
            );
          const answer = Capture.aiCaptureSchema.parse(current.answer);
          const browser = Capture.browserResearchSchema.parse(current.browser);
          if (browser.status !== "captured")
            throw new ValidationError(
              "The preview browser evidence is incomplete.",
            );
          const problem = Assessment.validateAutomaticResearch(
            evidenceForState(current),
            receipt,
            ready.policy.settings.verificationDays,
            ready.policy.settings,
          );
          if (problem) throw new ValidationError(problem);
          const proposedPolicy = playbookSchema.parse(
            rebuildHeldReviewWritingProposal(ready.policy.settings),
          );
          const settings = settingsForProspect(ready.prospect, proposedPolicy);
          const prospect = prospectSchema.parse({
            ...ready.prospect.details,
            id: ready.prospect.id,
            assignedSenderEmail: settings.fromEmail,
          });
          const peers = await previewPeers(
            scope,
            input,
            claim.job.id,
            ready.prospect,
          );
          const previewContext = heldReviewPreviewContextSchema.parse({
            status: "unapplied",
            prospect,
            prospectRevision: ready.prospect.revision,
            playbookRevision: ready.policy.revision,
            proposedPolicy,
            globalVoiceNotes: proposedPolicy.voiceNotes,
            receiptHash: researchHash(receipt),
            writingPolicyHash: writingPolicyHash(settings, {
              globalVoiceNotes: proposedPolicy.voiceNotes,
            }),
            baseWritingPolicyHash: writingPolicyHash(
              settingsForProspect(ready.prospect, ready.policy.settings),
              { globalVoiceNotes: ready.policy.settings.voiceNotes },
            ),
            prospectHash: compositionProspectHash(prospect),
            peers,
          });
          await scope
            .update(schema.outboundIntegrationJob)
            .set({
              output: heldReviewStateSchema.parse({
                ...current,
                previewContext,
              }),
              updatedAt: new Date(),
            })
            .where(eq(schema.outboundIntegrationJob.id, claim.job.id));
          return {
            context: previewContext,
            cachedCandidate: null,
            recovery: null,
          };
        }),
      );
      const { context, cachedCandidate } = prepared;
      const composed = value(
        await Draft.composeSequence(
          context.prospect,
          receipt,
          context.proposedPolicy,
          {
            generate: dependencies.generate,
            ...(cachedCandidate
              ? { suppliedParts: cachedCandidate.parts }
              : {}),
            judge: dependencies.judge,
            deadline,
            peers: context.peers,
            globalVoiceNotes: context.globalVoiceNotes,
            onCandidate: cachedCandidate
              ? undefined
              : async (candidate) => {
                  const problem = value(
                    await transaction(async (scope) => {
                      const currentJob = await jobAt(scope, claim.job.id);
                      const current = heldReviewStateSchema.parse(
                        currentJob.output,
                      );
                      if (
                        !current.lease ||
                        current.lease.token !== state.lease?.token
                      )
                        throw new ConflictError(
                          "The completed candidate belongs to a superseded preview lease.",
                        );
                      const ready = await resultify(async () => {
                        if (!isDeepStrictEqual(current.previewContext, context))
                          throw new ConflictError(
                            "The original preview writing context changed.",
                          );
                        return eligible(scope, input, current);
                      });
                      const active =
                        currentJob.status === "starting" &&
                        Date.parse(current.lease.expiresAt) > Date.now();
                      const reason = !active
                        ? "The candidate completed after its lease expired. Its unapproved text is retained without another writer purchase."
                        : ready.success
                          ? null
                          : ready.error.message;
                      const writerCandidates = appendWriterCandidate(
                        current.writerCandidates,
                        candidate,
                        context,
                      );
                      await scope
                        .update(schema.outboundIntegrationJob)
                        .set({
                          status: !active
                            ? "uncertain"
                            : reason
                              ? "failed"
                              : "starting",
                          output: heldReviewStateSchema.parse({
                            ...current,
                            writerCandidates,
                            ...(reason
                              ? { lease: null, heldReason: reason }
                              : {}),
                          }),
                          ...(reason ? { error: reason } : {}),
                          updatedAt: new Date(),
                        })
                        .where(
                          eq(schema.outboundIntegrationJob.id, claim.job.id),
                        );
                      return reason;
                    }),
                  );
                  if (problem) throw new ConflictError(problem);
                },
            onWritten: async (draft) => {
              const mayJudge = value(
                await transaction(async (scope) => {
                  const currentJob = await jobAt(scope, claim.job.id);
                  const current = heldReviewStateSchema.parse(
                    currentJob.output,
                  );
                  if (
                    !current.lease ||
                    current.lease.token !== state.lease?.token
                  )
                    throw new ConflictError(
                      "The preview writer result belongs to a superseded lease.",
                    );
                  const ready = await resultify(async () => {
                    if (!isDeepStrictEqual(current.previewContext, context))
                      throw new ConflictError(
                        "The original preview writing context changed.",
                      );
                    if (cachedCandidate) {
                      if (
                        !isDeepStrictEqual(
                          current.writerCandidateRecovery,
                          prepared.recovery,
                        )
                      )
                        throw new ConflictError(
                          "The cached candidate judgment reservation changed.",
                        );
                      const checked = await checkedWriterCandidate(
                        scope,
                        input,
                        current,
                        claim.job.id,
                        cachedCandidate.partsHash,
                      );
                      if (
                        !isDeepStrictEqual(checked.candidate, cachedCandidate)
                      )
                        throw new ConflictError(
                          "The cached candidate changed before its first judgment.",
                        );
                    }
                    return eligible(scope, input, current);
                  });
                  const active =
                    currentJob.status === "starting" &&
                    Date.parse(current.lease.expiresAt) > Date.now();
                  const reason = !active
                    ? "The writer completed after its lease expired. Its text is retained without another writer purchase."
                    : ready.success
                      ? null
                      : ready.error.message;
                  const draftBeforeJudge = heldReviewWrittenSchema.parse({
                    parts: draft.parts,
                    messages: draft.messages,
                    generation: {
                      attempts: cachedCandidate?.attempt ?? draft.attempts,
                    },
                    writerCompletedAt: new Date().toISOString(),
                  });
                  await scope
                    .update(schema.outboundIntegrationJob)
                    .set({
                      status: !active
                        ? "uncertain"
                        : reason
                          ? "failed"
                          : "starting",
                      output: heldReviewStateSchema.parse({
                        ...current,
                        draftBeforeJudge,
                        ...(reason ? { lease: null, heldReason: reason } : {}),
                      }),
                      ...(reason ? { error: reason } : {}),
                      updatedAt: new Date(),
                    })
                    .where(eq(schema.outboundIntegrationJob.id, claim.job.id));
                  return reason;
                }),
              );
              if (mayJudge) throw new ConflictError(mayJudge);
            },
          },
        ),
      );
      const writing = composed.messages[0]?.writing;
      if (
        !writing ||
        !hasCompleteCopyVerdict(writing.quality) ||
        writing.receiptHash !== context.receiptHash ||
        writing.writingPolicyHash !== context.writingPolicyHash
      )
        throw new ValidationError(
          "The completed preview does not match its saved copy context.",
        );
      const preview = heldReviewPreviewSchema.parse({
        ...context,
        ...composed,
        ...(cachedCandidate
          ? { generation: { attempts: cachedCandidate.attempt } }
          : {}),
        parts: writing.parts,
      });
      const problem = copyVerdictProblem(writing.quality);
      return checkpoint(
        claim,
        {
          stage: "complete",
          preview,
          ...(problem ? { heldReason: `Copy: ${problem}` } : {}),
        },
        "complete",
      );
    }
    case "complete":
      return checkpoint(claim, {}, "complete");
  }
};
const captureReceipt = (state: HeldReviewState) => {
  if (!state.shoppingReceipt)
    throw new ValidationError("The completed research receipt is missing.");
  return state.shoppingReceipt;
};
const fail = (claim: Claim, error: Error) =>
  transaction(async (scope) => {
    const job = await jobAt(scope, claim.job.id);
    const state = heldReviewStateSchema.parse(job.output);
    if (
      job.status !== "starting" ||
      state.lease?.token !== claim.state.lease?.token
    )
      return;
    const provider = error instanceof IntegrationError ? error : null;
    const uncertain =
      provider?.code === "uncertain" ||
      (!provider &&
        ![ValidationError.errorName, ConflictError.errorName].some(
          (name) => name === error.name,
        ));
    await scope
      .update(schema.outboundIntegrationJob)
      .set({
        status: uncertain ? "uncertain" : "failed",
        output: heldReviewStateSchema.parse({
          ...state,
          lease: null,
          heldReason: error.message,
          ...(provider?.receipt ? { failureReceipt: provider.receipt } : {}),
        }),
        error: error.message,
        updatedAt: new Date(),
      })
      .where(eq(schema.outboundIntegrationJob.id, job.id));
    if (
      provider &&
      ["configuration", "access", "quota", "rate-limit"].includes(provider.code)
    ) {
      const batch = await batchAt(scope, claim.input.batchId);
      await scope
        .update(schema.outboundIntegrationJob)
        .set({
          output: { ...batch.budget, paused: true },
          error: error.message,
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundIntegrationJob.id, batch.job.id));
    }
  });

/** Execute at most one stage. No loop can replay a submission or acquire another budget. */
export const runNext = (
  input: { batchId: string; deadline?: number; reviewRound?: 1 | 2 },
  dependencies: HeldReviewDependencies = {},
) =>
  resultify(async () => {
    const batchId = z.string().uuid().parse(input.batchId);
    const deadline = input.deadline ?? Date.now() + 150_000;
    const claim = value(await claimNext(batchId, deadline, input.reviewRound));
    if (!claim) return { advanced: false as const };
    const result = await resultify(async () => {
      const executed = await execute(claim, deadline, dependencies);
      if (!executed.success) throw executed.error;
    });
    if (!result.success) value(await fail(claim, result.error));
    return {
      advanced: true as const,
      jobId: claim.job.id,
      stage: claim.state.stage,
      status: result.success ? "checkpointed" : "held",
    };
  });

export const status = (batchId: string, reviewRound: 1 | 2 = 1) =>
  transaction(async (scope) => {
    const batch = await batchAt(scope, z.string().uuid().parse(batchId));
    const jobs = await scope
      .select({
        id: schema.outboundIntegrationJob.id,
        status: schema.outboundIntegrationJob.status,
        stage: sql<string>`${schema.outboundIntegrationJob.output}->>'stage'`,
        availableAt: sql<string>`${schema.outboundIntegrationJob.output}->>'availableAt'`,
        leaseExpiresAt: sql<
          string | null
        >`${schema.outboundIntegrationJob.output}->'lease'->>'expiresAt'`,
        queryCount: sql<number>`coalesce((${schema.outboundIntegrationJob.output}->>'shoppingQueryCount')::int,0)`,
        finding: sql<
          string | null
        >`${schema.outboundIntegrationJob.output}->'shoppingReceipt'->'selected'->>'kind'`,
      })
      .from(schema.outboundIntegrationJob)
      .where(
        and(
          eq(schema.outboundIntegrationJob.provider, "automation"),
          sql`${schema.outboundIntegrationJob.input}->>'operation' = 'heldDiscoveryReview'`,
          sql`${schema.outboundIntegrationJob.input}->>'batchId' = ${batchId}`,
          sql`coalesce((${schema.outboundIntegrationJob.input}->>'reviewRound')::int, 1) = ${reviewRound}`,
        ),
      );
    return {
      batchId,
      reviewRound,
      executionMode: "unapplied" as const,
      ...batch.budget,
      maximumSubmissions: batch.input.maxQueries,
      counts: {
        total: jobs.length,
        pending: jobs.filter((job) => job.status === "pending").length,
        running: jobs.filter((job) => job.status === "starting").length,
        complete: jobs.filter((job) => job.status === "complete").length,
        failed: jobs.filter((job) => job.status === "failed").length,
        uncertain: jobs.filter((job) => job.status === "uncertain").length,
      },
      jobs,
    };
  });
