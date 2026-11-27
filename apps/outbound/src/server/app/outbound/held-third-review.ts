import "server-only";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { type Result, resultify } from "@zenncore/utils";
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  inArray,
  ne,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import {
  playbookSchema,
  prospectSchema,
  settingsForProspect,
  settingsForSender,
} from "@/lib/outbound";
import {
  assembleSequence,
  writerPartsSchema,
  writingSnapshotSchema,
} from "@/lib/outbound-composition";
import {
  copyVerdictProblem,
  hasCompleteCopyVerdict,
} from "@/lib/outbound-copy-quality";
import { rebuildHeldReviewWritingProposal } from "@/lib/outbound-rebuild-policy";
import {
  applyRound3CopyEdits,
  ROUND3_COPY_RULES_VERSION,
} from "@/lib/outbound-round3-copy";
import { db, schema, type TransactionScope } from "@/server/database";
import { ConflictError, ValidationError } from "@/server/utils/error";
import {
  COPY_JUDGE_INPUT_VERSION,
  judgeSequenceCopy,
} from "@/server/utils/outbound/copy-quality";
import * as Draft from "@/server/utils/outbound/draft";
import { browserClaimInterval } from "@/server/utils/outbound/firecrawl-cooldown";
import {
  HELD_REVIEW_MANIFEST_HASH,
  type HeldReviewManifest,
  type HeldReviewState,
  heldManifestHash,
  heldReviewBatchSchema,
  heldReviewBudgetSchema,
  heldReviewInputSchema,
  heldReviewManifestSchema,
  heldReviewPreviewContextSchema,
  heldReviewPreviewSchema,
  heldReviewStateSchema,
  heldReviewWrittenSchema,
} from "@/server/utils/outbound/held-review-contract";
import { validateQueryPreparationRepair } from "@/server/utils/outbound/held-third-query-repair";
import {
  QUERY_PREPARATION_REPAIR_CASES,
  QUERY_PREPARATION_REPAIR_CONTROL,
} from "@/server/utils/outbound/held-third-query-repair-contract";
import {
  HELD_THIRD_REVIEW_ACTIONS,
  HELD_THIRD_REVIEW_INSTRUCTION_HASH,
  type HeldThirdProductSelections,
  type HeldThirdReviewInput,
  type HeldThirdReviewState,
  heldThirdProductSelectionsSchema,
  heldThirdPurchaseSchema,
  heldThirdReviewControlSchema,
  heldThirdReviewControlStateSchema,
  heldThirdReviewInputSchema,
  heldThirdReviewStateSchema,
  thirdReviewPurchaseAction,
} from "@/server/utils/outbound/held-third-review-contract";
import { IntegrationError } from "@/server/utils/outbound/http";
import * as Capture from "@/server/utils/outbound/live-shopping";
import { projectRound3CopyProof } from "@/server/utils/outbound/round3-copy-evidence";
import * as Assessment from "@/server/utils/outbound/shopping-assessment";
import {
  assessResultBrands,
  inspectDiscoveryPresence,
  projectRepeatedPresence,
  projectUnrankedDiscoveryAbsence,
} from "@/server/utils/outbound/shopping-fact-assessment";
import {
  compositionProspectHash,
  writingPolicyHash,
} from "@/server/utils/outbound/shopping-policy";
import { researchHash } from "@/server/utils/outbound/shopping-research";
import {
  appendWriterCandidate,
  writerDiagnosticHash,
} from "@/server/utils/outbound/writing-candidates";
import {
  assertHeldReviewEligibility,
  type HeldReviewDependencies,
} from "./held-discovery-review";
import * as Credentials from "./provider-credentials";
import * as Composition from "./sequence-composition";
import { claimShoppingProviderSlot } from "./shopping-provider-pacing";

type Job = typeof schema.outboundIntegrationJob.$inferSelect;
type Claim = {
  job: Job;
  input: HeldThirdReviewInput;
  state: HeldThirdReviewState;
};
export type HeldThirdReviewDependencies = HeldReviewDependencies & {
  prepareQuery?: typeof Capture.prepareShopperQuery;
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
const immutableReviewJobs = new Map<string, { rowHash: string; job: Job }>();
const fullJobRowHash = sql<string>`encode(sha256(convert_to(to_jsonb(${schema.outboundIntegrationJob})::text, 'UTF8')), 'hex')`;
/** A hit saves transfer only. Every reuse rechecks the entire persisted row. */
const jobAt = async (scope: TransactionScope, id: string): Promise<Job> => {
  const saved = immutableReviewJobs.get(id);
  if (saved) {
    const [current] = await scope
      .select({ rowHash: fullJobRowHash })
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.id, id))
      .limit(1);
    if (current?.rowHash === saved.rowHash) return structuredClone(saved.job);
    immutableReviewJobs.delete(id);
  }
  // Row and hash come from the same SQL statement and MVCC snapshot.
  const [loaded] = await scope
    .select({
      ...getTableColumns(schema.outboundIntegrationJob),
      cacheRowHash: fullJobRowHash,
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, id))
    .limit(1);
  if (!loaded)
    throw new ConflictError("The third-review record is unavailable.");
  const { cacheRowHash, ...job } = loaded;
  if (
    job.provider === "automation" &&
    job.input?.["operation"] === "heldDiscoveryReview" &&
    (job.input["reviewRound"] === undefined ||
      job.input["reviewRound"] === 2) &&
    ["complete", "failed", "uncertain"].includes(job.status)
  ) {
    if (immutableReviewJobs.size >= 64) {
      const oldest = immutableReviewJobs.keys().next().value;
      if (oldest) immutableReviewJobs.delete(oldest);
    }
    immutableReviewJobs.set(id, {
      rowHash: cacheRowHash,
      job: structuredClone(job),
    });
  }
  return job;
};
const manifestFor = (input: HeldReviewManifest) => {
  const manifest = heldReviewManifestSchema.parse(input);
  if (heldManifestHash(manifest.prospectIds) !== HELD_REVIEW_MANIFEST_HASH)
    throw new ValidationError("This is not the authorized held cohort.");
  return manifest;
};
const actionFor = (company: string) => {
  const action = HELD_THIRD_REVIEW_ACTIONS[company];
  if (!action)
    throw new ValidationError(
      "This merchant has no explicit third-review action.",
    );
  return action;
};
const exactQuestion = (company: string) =>
  ({
    "LA Girl Cosmetics": "color correcting concealer",
    "Tillamook Country Smoker": "beef jerky",
    Teleties: "small hair ties",
  })[company as "Teleties"];
const normalizeHost = (url: string) =>
  new URL(url).hostname.replace(/^www\./, "").toLowerCase();

/** Deduplicated immutable purchases, including known failures without invented answers. */
export const purchasesForThirdReview = (
  state: HeldReviewState,
  firstState?: HeldReviewState,
) => {
  const entries = [
    ...(firstState
      ? purchasesForThirdReview(firstState).map((row) => ({
          ...row,
          failureReason: row.reason,
        }))
      : []),
    ...(state.priorPurchase
      ? [
          {
            ...state.priorPurchase,
            queryReview: state.previousQueryReview,
            raw: [],
          },
        ]
      : []),
    ...(state.shoppingHistory ?? []).map((row) => ({
      ...row,
      queryReview: row.query.review,
      failureReason: null,
      raw: [],
    })),
    ...(state.shoppingJob && state.queryReservedAt
      ? [
          {
            shoppingJob: state.shoppingJob,
            answer: state.answer,
            browser: state.browser,
            queryReview: state.queryReview,
            queryReservedAt: state.queryReservedAt,
            failureReason: state.heldReason ?? null,
            raw: state.failureReceipt?.["response"]
              ? [state.failureReceipt["response"]]
              : [],
          },
        ]
      : []),
  ];
  const purchases = new Map<string, z.infer<typeof heldThirdPurchaseSchema>>();
  for (const row of entries) {
    if (row.answer && row.browser?.status !== "captured")
      throw new ValidationError(
        "A preserved answer is missing its original browser evidence.",
      );
    const parsed = heldThirdPurchaseSchema.parse({
      shoppingJob: row.shoppingJob,
      queryReservedAt: row.queryReservedAt,
      answer: row.answer,
      browser: row.browser,
      queryReview: row.queryReview,
      status: row.answer ? "captured" : "failed",
      reason: row.failureReason ?? "Preserved acknowledged purchase.",
      raw: Array.isArray(row.raw) ? row.raw : [],
    });
    const previous = purchases.get(parsed.shoppingJob.id);
    if (
      previous &&
      (!isDeepStrictEqual(previous.shoppingJob, parsed.shoppingJob) ||
        (previous.answer &&
          parsed.answer &&
          !isDeepStrictEqual(previous.answer, parsed.answer)))
    )
      throw new ValidationError(
        "A repeated provider job has conflicting preserved evidence.",
      );
    purchases.set(parsed.shoppingJob.id, {
      ...previous,
      ...parsed,
      answer: parsed.answer ?? previous?.answer,
      browser: parsed.browser ?? previous?.browser,
      queryReview: parsed.queryReview ?? previous?.queryReview,
      raw: [...(previous?.raw ?? []), ...parsed.raw].filter(
        (raw, index, all) =>
          all.findIndex((item) => item.sha256 === raw.sha256) === index,
      ),
    });
  }
  return [...purchases.values()].map((purchase) =>
    heldThirdPurchaseSchema.parse(JSON.parse(JSON.stringify(purchase))),
  );
};
export const evidenceForThirdReview = (
  state: HeldThirdReviewState,
): Assessment.Evidence => {
  const answer = Capture.aiCaptureSchema.parse(state.answer);
  const browser = Capture.browserResearchSchema.parse(state.browser);
  if (browser.status !== "captured")
    throw new ValidationError("Complete browser evidence is required.");
  return {
    answer,
    browser,
    queryReview: state.queryReview,
    previous: state.priorPurchases
      .filter((p) => p.answer && p.shoppingJob.id !== answer.job.id)
      .map((p) => {
        if (!p.answer || p.browser?.status !== "captured")
          throw new ValidationError(
            "A preserved completed purchase lost its evidence.",
          );
        return {
          answer: p.answer,
          browser: p.browser,
          queryReview: p.queryReview,
        };
      }),
    priorPurchases: state.priorPurchases
      .filter((p) => !p.answer)
      .map((p) => ({
        job: p.shoppingJob,
        status: p.status === "uncertain" ? "uncertain" : "failed",
        reason: p.reason,
        raw: p.raw,
      })),
  };
};
const controlAt = async (scope: TransactionScope, id: string) => {
  const job = await jobAt(scope, id);
  const input = heldThirdReviewControlSchema.parse(job.input);
  const state = heldThirdReviewControlStateSchema.parse(job.output);
  manifestFor(input.manifest);
  const batch = await jobAt(scope, input.batchId);
  const batchInput = heldReviewBatchSchema.parse(batch.input);
  const budget = heldReviewBudgetSchema.parse(batch.output);
  if (
    job.provider !== "automation" ||
    batchInput.manifestHash !== HELD_REVIEW_MANIFEST_HASH ||
    batchInput.requestedBy !== input.requestedBy ||
    budget.queriesReserved !==
      input.initialQueriesReserved + state.queriesReserved
  )
    throw new ConflictError(
      "The shared third-review budget changed outside its reservations.",
    );
  return { job, input, state, batch, budget };
};
const ready = async (
  scope: TransactionScope,
  input: HeldThirdReviewInput,
  state: HeldThirdReviewState,
) => {
  const preparationCase =
    input.controlId === QUERY_PREPARATION_REPAIR_CONTROL
      ? QUERY_PREPARATION_REPAIR_CASES.find(
          (row) => row.company === input.merchant.name,
        )
      : undefined;
  if (state.queryPreparationRepair || preparationCase) {
    if (!preparationCase)
      throw new ConflictError(
        "The preparation repair is outside the explicit case list.",
      );
    const audits = await scope
      .select()
      .from(schema.outboundIntegrationJob)
      .where(
        and(
          eq(schema.outboundIntegrationJob.provider, "automation"),
          sql`input->>'operation'='heldDiscoveryRound3QueryPreparationRepair'`,
          sql`input->>'sourceJobId'=${preparationCase.sourceJobId}`,
        ),
      );
    if (audits.length || state.queryPreparationRepair) {
      if (audits.length !== 1)
        throw new ConflictError(
          "The preparation repair audit is missing or ambiguous.",
        );
      const job = await jobAt(scope, preparationCase.sourceJobId);
      if (
        !isDeepStrictEqual(job.input, input) ||
        !isDeepStrictEqual(heldThirdReviewStateSchema.parse(job.output), state)
      )
        throw new ConflictError(
          "The preparation repair must validate its current persisted child.",
        );
      validateQueryPreparationRepair({ job, audit: audits[0]! });
    } else if (
      state.stage !== "complete" ||
      state.query ||
      state.shoppingJob ||
      state.answer ||
      state.shoppingReceipt
    )
      throw new ConflictError(
        "This resumed preparation requires its immutable repair audit.",
      );
  }
  const control = await controlAt(scope, input.controlId);
  if (control.state.paused || control.budget.paused)
    throw new ConflictError("The third review is paused.");
  if (
    input.batchId !== control.input.batchId ||
    input.requestedBy !== control.input.requestedBy ||
    input.instructionHash !== control.input.instructionHash ||
    !control.input.manifest.prospectIds.includes(input.prospectId)
  )
    throw new ConflictError(
      "The child is outside the authorized third review.",
    );
  const parent = await jobAt(scope, input.previousJobId);
  const parentInput = heldReviewInputSchema.parse(parent.input);
  const parentState = heldReviewStateSchema.parse(parent.output);
  if (
    digest(parent) !== input.previousJobHash ||
    digest(parent.output) !== input.previousOutputHash ||
    digest(parentInput) !== input.parentInputHash ||
    parentInput.reviewRound !== 2 ||
    parentInput.prospectId !== input.prospectId ||
    parentInput.batchId !== input.batchId ||
    actionFor(parentInput.merchant.name) !== input.action
  )
    throw new ConflictError("The immutable second-review parent changed.");
  const original = await assertHeldReviewEligibility(
    scope,
    parentInput,
    parentState,
    jobAt,
  );
  const firstState = heldReviewStateSchema.parse(original.firstReview?.output);
  if (
    compositionProspectHash(original.prospect.details) !==
      input.originalProspectHash ||
    state.prospectRevision !== original.prospect.revision ||
    state.purchaseBaseline !== parentState.shoppingQueryCount ||
    state.shoppingQueryCount !==
      state.purchaseBaseline + (state.round3ReservedAt ? 1 : 0) ||
    !isDeepStrictEqual(
      state.priorPurchases,
      purchasesForThirdReview(parentState, firstState),
    )
  )
    throw new ConflictError(
      "The original prospect or append-only purchase history changed.",
    );
  const selected = control.input.selections.find(
    (row) => row.prospectId === input.prospectId,
  );
  if (
    input.action === "new-product"
      ? !selected ||
        !isDeepStrictEqual(input.productSelection, selected) ||
        !isDeepStrictEqual(input.product, selected.product) ||
        input.category !== selected.category
      : !isDeepStrictEqual(input.product, parentInput.product) ||
        input.category !== parentInput.category
  )
    throw new ConflictError("The selected third-review product changed.");
  if (
    !isDeepStrictEqual(input.merchant, parentInput.merchant) ||
    input.country !== parentInput.country ||
    input.exactQuestion !== exactQuestion(parentInput.merchant.name)
  )
    throw new ConflictError(
      "The merchant or exact authorized question changed.",
    );
  return { ...original, control, parent, parentInput, parentState };
};
const inspectWithin = async (
  scope: TransactionScope,
  manifestInput: HeldReviewManifest,
  instructionHash: string,
  selectionsInput: HeldThirdProductSelections,
) => {
  const manifest = manifestFor(manifestInput);
  const selections = heldThirdProductSelectionsSchema.parse(selectionsInput);
  if (instructionHash !== HELD_THIRD_REVIEW_INSTRUCTION_HASH)
    throw new ValidationError(
      "The exact third-review instruction is required.",
    );
  const parents = await scope
    .select({
      id: schema.outboundIntegrationJob.id,
      prospectId: schema.outboundIntegrationJob.prospectId,
      status: schema.outboundIntegrationJob.status,
    })
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        eq(schema.outboundIntegrationJob.provider, "automation"),
        sql`input->>'operation'='heldDiscoveryReview'`,
        sql`input->>'reviewRound'='2'`,
      ),
    );
  const matching = parents.filter(
    (row) => row.prospectId && manifest.prospectIds.includes(row.prospectId),
  );
  if (
    matching.length !== 21 ||
    new Set(matching.map((row) => row.prospectId)).size !== 21 ||
    matching.some(
      (row) => !["complete", "failed", "uncertain"].includes(row.status),
    )
  )
    throw new ConflictError(
      "All twenty-one second-review parents must be settled and unique.",
    );
  const checked = [];
  for (const parentSummary of matching) {
    const parent = await jobAt(scope, parentSummary.id);
    const input = heldReviewInputSchema.parse(parent.input);
    const state = heldReviewStateSchema.parse(parent.output);
    const original = await assertHeldReviewEligibility(
      scope,
      input,
      state,
      jobAt,
    );
    const action = actionFor(input.merchant.name);
    const firstState = heldReviewStateSchema.parse(
      original.firstReview?.output,
    );
    const purchases = purchasesForThirdReview(state, firstState);
    const selection = selections.find(
      (row) => row.prospectId === input.prospectId,
    );
    if (action === "new-product") {
      if (
        !selection ||
        selection.product.url === input.product.url ||
        selection.product.name === input.product.name ||
        normalizeHost(selection.product.url) !==
          input.merchant.domain.replace(/^www\./, "")
      )
        throw new ValidationError(
          "Each new-product action needs a distinct own-merchant product and preserved selection evidence.",
        );
      if (
        input.merchant.name === "Só Dança USA" &&
        !/ballet|dance|jazz|tap|leotard/i.test(selection.category)
      )
        throw new ValidationError(
          "Só Dança requires a dance shoe or dancewear product.",
        );
    } else if (selection)
      throw new ValidationError(
        "An unrequested product replacement is not authorized.",
      );
    checked.push({
      parent,
      input,
      state,
      original,
      action,
      selection,
      purchases,
    });
  }
  if (
    checked.filter((row) => thirdReviewPurchaseAction(row.action)).length !== 11
  )
    throw new ValidationError("Exactly eleven purchase actions are required.");
  const batches = new Set(checked.map((row) => row.input.batchId));
  if (batches.size !== 1)
    throw new ConflictError("The original shared budget is not unique.");
  const first = checked[0];
  if (!first) throw new ConflictError("The checked cohort is empty.");
  return { manifest, selections, checked, batchId: first.input.batchId };
};
export const inspect = (
  manifest: HeldReviewManifest,
  instructionHash: string,
  productSelections: HeldThirdProductSelections,
) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(sql`set local transaction read only`);
      await scope.execute(sql`set local statement_timeout = '15000ms'`);
      const checked = await inspectWithin(
        scope,
        manifest,
        instructionHash,
        productSelections,
      );
      const batch = await jobAt(scope, checked.batchId);
      const budget = heldReviewBudgetSchema.parse(batch.output);
      return {
        batchId: checked.batchId,
        instructionHash,
        contacts: 21,
        authorizedSearches: 11,
        sharedQueriesReserved: budget.queriesReserved,
        targetQueriesReserved: 38,
        actions: checked.checked.map((row) => ({
          prospectId: row.input.prospectId,
          company: row.input.merchant.name,
          action: row.action,
          product: row.selection?.product ?? row.input.product,
        })),
      };
    }),
  );
export const startThirdReview = (
  actor: string,
  manifest: HeldReviewManifest,
  instructionHash: string,
  productSelections: HeldThirdProductSelections,
) =>
  transaction(async (scope) => {
    const inspected = await inspectWithin(
      scope,
      manifest,
      instructionHash,
      productSelections,
    );
    const requestId = `held-discovery-round3:${HELD_REVIEW_MANIFEST_HASH}`;
    const [existing] = await scope
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.requestId, requestId));
    if (existing) {
      const control = await controlAt(scope, existing.id);
      if (
        control.input.requestedBy !== actor ||
        !isDeepStrictEqual(control.input.selections, inspected.selections)
      )
        throw new ConflictError(
          "The existing third-review authorization differs.",
        );
      return {
        batchId: inspected.batchId,
        controlId: existing.id,
        repeated: true,
      };
    }
    const batch = await jobAt(scope, inspected.batchId);
    const budget = heldReviewBudgetSchema.parse(batch.output);
    if (
      budget.paused ||
      budget.queriesReserved !== 27 ||
      inspected.checked.some((row) => row.input.requestedBy !== actor)
    )
      throw new ConflictError(
        "Third review must begin at the original twenty-seven reservations for the same operator.",
      );
    const controlId = randomUUID();
    await scope.insert(schema.outboundIntegrationJob).values({
      id: controlId,
      provider: "automation",
      requestId,
      status: "pending",
      input: heldThirdReviewControlSchema.parse({
        operation: "heldDiscoveryRound3Batch",
        batchId: batch.id,
        manifest: inspected.manifest,
        instructionHash,
        requestedBy: actor,
        initialQueriesReserved: 27,
        additionalQueries: 11,
        finalQueriesReserved: 38,
        selections: inspected.selections,
      }),
      output: { queriesReserved: 0, paused: false },
    });
    for (const row of inspected.checked) {
      const input = heldThirdReviewInputSchema.parse({
        ...row.input,
        operation: "heldDiscoveryRound3",
        reviewRound: 3,
        controlId,
        instructionHash,
        action: row.action,
        previousJobId: row.parent.id,
        previousJobHash: digest(row.parent),
        previousOutputHash: digest(row.parent.output),
        parentInputHash: digest(row.input),
        originalProspectHash: compositionProspectHash(
          row.original.prospect.details,
        ),
        product: row.selection?.product ?? row.input.product,
        category: row.selection?.category ?? row.input.category,
        productSelection: row.selection,
        exactQuestion: exactQuestion(row.input.merchant.name),
      });
      const paid = thirdReviewPurchaseAction(row.action);
      const state = heldThirdReviewStateSchema.parse({
        stage:
          row.action === "hold"
            ? "complete"
            : paid
              ? "renderedProduct"
              : row.action === "rejudge"
                ? "rejudge"
                : "copyProof",
        prospectRevision: row.state.prospectRevision,
        availableAt: new Date().toISOString(),
        lease: null,
        polls: 0,
        shoppingQueryIntent:
          row.action === "broader" ? "unbranded-broad" : "unbranded-specific",
        shoppingQueryCount: row.state.shoppingQueryCount,
        purchaseBaseline: row.state.shoppingQueryCount,
        priorPurchases: row.purchases,
        ...(!paid
          ? {
              query: row.state.query,
              queryReview: row.state.queryReview,
              shoppingJob: row.state.shoppingJob,
              answer: row.state.answer,
              browser: row.state.browser,
              productCapture: row.state.productCapture,
              shoppingReceipt: row.state.shoppingReceipt,
            }
          : {}),
        ...(row.action === "hold"
          ? {
              heldReason:
                "Prior absence was invalidated by merchant presence. No new purchase or copy is authorized.",
            }
          : {}),
      });
      await scope.insert(schema.outboundIntegrationJob).values({
        provider: "automation",
        prospectId: input.prospectId,
        requestId: `${requestId}:${input.prospectId}`,
        status: row.action === "hold" ? "complete" : "pending",
        input,
        output: state,
      });
    }
    return { batchId: batch.id, controlId, repeated: false };
  });
const stageBudget = (stage: HeldThirdReviewState["stage"]) =>
  ["renderedProduct", "browser"].includes(stage)
    ? 120_000
    : stage === "draft" || stage === "generateQuery"
      ? 110_000
      : stage === "poll"
        ? 20_000
        : 50_000;
const queryProblem = (
  input: HeldThirdReviewInput,
  state: HeldThirdReviewState,
  freshness: number,
) => {
  if (
    !state.query ||
    !state.queryReview ||
    state.productCapture?.status !== "captured" ||
    state.query.contractVersion !== Capture.SHOPPER_QUERY_ROUND3_VERSION ||
    state.query.intent !== state.shoppingQueryIntent ||
    ((state.queryPreparationRepair?.exactQuestion ?? input.exactQuestion) &&
      state.query.prompt !==
        (state.queryPreparationRepair?.exactQuestion ?? input.exactQuestion))
  )
    return "The exact authorized third-review query and current product-fit proof are required.";
  return Capture.validateShopperQueryReview({
    product: input.product,
    category: input.category,
    merchant: input.merchant,
    query: state.query,
    review: state.queryReview,
    browser: state.productCapture,
    discoveryFreshnessDays: freshness,
  });
};
const claimNext = (controlId: string, deadline: number) =>
  transaction(async (scope): Promise<Claim | null> => {
    const control = await controlAt(scope, controlId);
    if (control.state.paused || control.budget.paused) return null;
    const jobs = await scope
      .select({
        id: schema.outboundIntegrationJob.id,
        status: schema.outboundIntegrationJob.status,
        stage: sql<string>`output->>'stage'`,
      })
      .from(schema.outboundIntegrationJob)
      .where(
        and(
          eq(schema.outboundIntegrationJob.provider, "automation"),
          sql`input->>'operation'='heldDiscoveryRound3'`,
          sql`input->>'controlId'=${controlId}`,
          inArray(schema.outboundIntegrationJob.status, [
            "pending",
            "starting",
          ]),
        ),
      )
      .orderBy(
        sql`case when output->>'stage'='renderedProduct' then 1 else 0 end`,
        asc(schema.outboundIntegrationJob.updatedAt),
      );
    for (const summary of jobs) {
      const job = await jobAt(scope, summary.id);
      const input = heldThirdReviewInputSchema.parse(job.input);
      const state = heldThirdReviewStateSchema.parse(job.output);
      if (job.status === "starting") {
        if (state.lease && Date.parse(state.lease.expiresAt) > Date.now())
          continue;
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            status: "uncertain",
            error:
              "The third-review provider stage lost its lease. No automatic repurchase is permitted.",
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, job.id));
        continue;
      }
      if (
        Date.parse(state.availableAt) > Date.now() ||
        Date.now() + stageBudget(state.stage) > deadline
      )
        continue;
      const checked = await resultify(() => ready(scope, input, state));
      if (!checked.success) {
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            status: "failed",
            error: checked.error.message,
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, job.id));
        continue;
      }
      if (
        state.stage === "draft" &&
        jobs.some(
          (other) =>
            other.id !== job.id &&
            other.status === "starting" &&
            other.stage === "draft",
        )
      )
        continue;
      if (state.stage === "query") {
        const problem = queryProblem(
          input,
          state,
          checked.data.policy.settings.discoveryFreshnessDays,
        );
        if (
          problem ||
          !thirdReviewPurchaseAction(input.action) ||
          state.round3ReservedAt ||
          state.queryReservedAt ||
          state.shoppingQueryCount !== state.purchaseBaseline ||
          control.state.queriesReserved >= 11 ||
          control.budget.queriesReserved >= 38 ||
          control.budget.queriesReserved >= 42
        ) {
          await scope
            .update(schema.outboundIntegrationJob)
            .set({
              status: "failed",
              error:
                problem ??
                "The single authorized third-review purchase is already reserved or unavailable.",
              updatedAt: new Date(),
            })
            .where(eq(schema.outboundIntegrationJob.id, job.id));
          continue;
        }
      }
      if (
        (state.stage === "rejudge" && state.rejudgeReservedAt) ||
        (state.stage === "draft" && state.draftReservedAt)
      ) {
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            status: "uncertain",
            error:
              "This copy provider stage already has a durable reservation.",
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, job.id));
        continue;
      }
      if (
        ["query", "poll"].includes(state.stage) &&
        !(await claimShoppingProviderSlot(scope))
      )
        continue;
      if (["renderedProduct", "browser"].includes(state.stage)) {
        const [gate] = await scope
          .select({
            availableAt: sql<string | null>`max(output->>'browserAvailableAt')`,
          })
          .from(schema.outboundIntegrationJob)
          .where(eq(schema.outboundIntegrationJob.provider, "automation"));
        if (gate?.availableAt && Date.parse(gate.availableAt) > Date.now())
          continue;
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            output: {
              ...control.budget,
              browserAvailableAt: new Date(
                Date.now() + browserClaimInterval,
              ).toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, control.batch.id));
      }
      const timestamp = new Date().toISOString();
      const next = heldThirdReviewStateSchema.parse({
        ...state,
        lease: {
          token: randomUUID(),
          expiresAt: new Date(Date.now() + 180000).toISOString(),
        },
        ...(state.stage === "query"
          ? {
              queryReservedAt: timestamp,
              round3ReservedAt: timestamp,
              shoppingQueryCount: state.shoppingQueryCount + 1,
            }
          : {}),
        ...(state.stage === "rejudge" ? { rejudgeReservedAt: timestamp } : {}),
        ...(state.stage === "draft" ? { draftReservedAt: timestamp } : {}),
      });
      if (state.stage === "query") {
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            output: {
              ...control.state,
              queriesReserved: control.state.queriesReserved + 1,
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, control.job.id));
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            output: {
              ...control.budget,
              queriesReserved: control.budget.queriesReserved + 1,
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, control.batch.id));
      }
      await scope
        .update(schema.outboundIntegrationJob)
        .set({ status: "starting", output: next, updatedAt: new Date() })
        .where(eq(schema.outboundIntegrationJob.id, job.id));
      return { job, input, state: next };
    }
    return null;
  });
const currentClaim = async (
  scope: TransactionScope,
  claim: Claim,
  allowExpired = false,
) => {
  const job = await jobAt(scope, claim.job.id);
  const state = heldThirdReviewStateSchema.parse(job.output);
  if (
    state.lease?.token !== claim.state.lease?.token ||
    !state.lease ||
    (!allowExpired &&
      (job.status !== "starting" ||
        Date.parse(state.lease.expiresAt) <= Date.now()))
  )
    throw new ConflictError("The third-review stage lease expired or changed.");
  return { job, state };
};
const persist = (
  claim: Claim,
  patch: Partial<HeldThirdReviewState>,
  continueStage = false,
) =>
  transaction(async (scope) => {
    const current = await currentClaim(scope, claim, true);
    const eligible = await resultify(() =>
      ready(scope, claim.input, current.state),
    );
    const expired =
      current.job.status !== "starting" ||
      Date.parse(current.state.lease?.expiresAt ?? "") <= Date.now();
    const reason = expired
      ? "The completed result arrived after its lease and is retained unapproved without retry."
      : eligible.success
        ? null
        : eligible.error.message;
    const output = heldThirdReviewStateSchema.parse({
      ...current.state,
      ...patch,
      ...(!continueStage || reason ? { lease: null } : {}),
      ...(reason ? { heldReason: reason } : {}),
    });
    await scope
      .update(schema.outboundIntegrationJob)
      .set({
        output,
        status: expired
          ? "uncertain"
          : reason
            ? "failed"
            : continueStage
              ? "starting"
              : output.stage === "complete"
                ? "complete"
                : "pending",
        error: reason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.outboundIntegrationJob.id, claim.job.id));
    return reason;
  });
const key = async (
  provider: "scrapellm" | "firecrawl",
  dependencies: HeldThirdReviewDependencies,
) => {
  const found = value(
    await (dependencies.resolveKey ?? Credentials.resolveKey)(provider),
  );
  if (!found)
    throw new IntegrationError(
      provider,
      "configuration",
      "Provider credentials are unavailable.",
    );
  return found;
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
const savedCopy = (parent: HeldReviewState) => {
  const context = parent.previewContext;
  const written = parent.preview ?? parent.draftBeforeJudge;
  if (!context || !written || !parent.shoppingReceipt)
    throw new ValidationError(
      "The exact saved copy and its original context are unavailable.",
    );
  const parts = writerPartsSchema.parse(written.parts);
  const settings = settingsForSender(
    context.proposedPolicy,
    context.prospect.assignedSenderEmail ?? context.proposedPolicy.fromEmail,
  );
  const assembled = assembleSequence(
    context.prospect,
    parent.shoppingReceipt,
    settings,
    parts,
  );
  if (
    assembled.status !== "ready" ||
    !isDeepStrictEqual(textOf(assembled.messages), textOf(written.messages)) ||
    context.receiptHash !== researchHash(parent.shoppingReceipt)
  )
    throw new ValidationError(
      "The exact saved copy no longer matches its original receipt and sender controls.",
    );
  return { context, written, parts, settings, receipt: parent.shoppingReceipt };
};
const execute = async (
  claim: Claim,
  deadline: number,
  dependencies: HeldThirdReviewDependencies,
) => {
  const checked = value(
    await transaction(async (scope) => {
      await currentClaim(scope, claim);
      return ready(scope, claim.input, claim.state);
    }),
  );
  const { input, state } = claim;
  const policy = checked.policy.settings;
  const next = (
    stage: HeldThirdReviewState["stage"],
    patch: Partial<HeldThirdReviewState> = {},
  ) =>
    persist(claim, { stage, availableAt: new Date().toISOString(), ...patch });
  const held = (reason: string, patch: Partial<HeldThirdReviewState> = {}) =>
    next("complete", { ...patch, heldReason: reason });
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
        ? next("generateQuery", { productCapture: capture })
        : held(capture.reason, { productCapture: capture });
    }
    case "generateQuery": {
      if (state.productCapture?.status !== "captured")
        throw new ValidationError("The rendered selected product is missing.");
      const context = {
        product: input.product,
        category: input.category,
        country: input.country,
        merchant: input.merchant,
        browser: state.productCapture,
        intent: state.shoppingQueryIntent,
        queryStyle: policy.queryStyle,
        discoveryFreshnessDays: policy.discoveryFreshnessDays,
        contractVersion:
          Capture.SHOPPER_QUERY_ROUND3_VERSION as typeof Capture.SHOPPER_QUERY_ROUND3_VERSION,
        deadline,
      };
      const exactQuestion =
        state.queryPreparationRepair?.exactQuestion ?? input.exactQuestion;
      const generated = value(
        await (exactQuestion
          ? (dependencies.prepareQuery ?? Capture.prepareShopperQuery)({
              ...context,
              question: exactQuestion,
            })
          : (dependencies.generateQuery ?? Capture.generateShopperQuery)({
              ...context,
              previousQuestion:
                input.action === "broader"
                  ? checked.parentState.query?.prompt
                  : undefined,
            })),
      );
      return generated.status === "prepared"
        ? next("query", {
            query: generated.query,
            queryReview: generated.query.review,
            queryGeneration: generated.generation,
          })
        : held(generated.reason, { queryGeneration: generated.generation });
    }
    case "query": {
      const problem = queryProblem(input, state, policy.discoveryFreshnessDays);
      if (
        problem ||
        !state.round3ReservedAt ||
        state.shoppingQueryCount !== state.purchaseBaseline + 1
      )
        throw new ValidationError(
          problem ?? "The paid reservation is missing.",
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
        availableAt: new Date(Date.now() + 20000).toISOString(),
      });
    }
    case "poll": {
      const job = Capture.aiJobSchema.parse(state.shoppingJob);
      if (
        state.polls >= 40 ||
        Date.now() - Date.parse(job.submittedAt) > 86400000
      )
        return held(
          "The acknowledged query needs reconciliation; no replacement was purchased.",
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
            availableAt: new Date(Date.now() + 30000).toISOString(),
          })
        : next("browser", { answer: result.capture, polls: state.polls + 1 });
    }
    case "browser": {
      const answer = Capture.aiCaptureSchema.parse(state.answer);
      const browser = value(
        await (dependencies.browse ?? Capture.inspectPages)({
          apiKey: await key("firecrawl", dependencies),
          product: input.product,
          country: input.country,
          answer,
          productCapture:
            state.productCapture?.status === "captured"
              ? state.productCapture
              : undefined,
          deadline,
        }),
      );
      return browser.status === "captured"
        ? next("assess", { browser })
        : held(browser.reason, { browser });
    }
    case "assess": {
      const evidence = evidenceForThirdReview(state);
      const presence = inspectDiscoveryPresence(evidence);
      if (presence.status !== "verified") return held(presence.reason);
      const assessed =
        input.action === "broader" &&
        presence.discovery.merchantPresent === true
          ? projectRepeatedPresence(evidence)
          : value(
              await (dependencies.assess ?? Assessment.assess)({
                ...evidence,
                playbook: policy,
                deadline,
                deferBrands: true,
              }),
            );
      if (assessed.status !== "researched") return held(assessed.reason);
      const problem = Assessment.validateAutomaticResearch(
        evidence,
        assessed.receipt,
        policy.verificationDays,
        policy,
      );
      if (problem) return held(problem, { shoppingReceipt: assessed.receipt });
      return assessed.receipt.selected.kind === "no-gap"
        ? held("No gap found", { shoppingReceipt: assessed.receipt })
        : next("brands", { shoppingReceipt: assessed.receipt });
    }
    case "brands": {
      if (!state.shoppingReceipt)
        throw new ValidationError("The current receipt is missing.");
      const assessed = value(
        await (dependencies.assessBrands ?? assessResultBrands)({
          ...evidenceForThirdReview(state),
          receipt: state.shoppingReceipt,
          deadline,
        }),
      );
      return assessed.status === "researched"
        ? next("copyProof", { shoppingReceipt: assessed.receipt })
        : held(assessed.reason);
    }
    case "rejudge": {
      if (!state.rejudgeReservedAt || state.rejudgeAudit)
        throw new ConflictError(
          "This exact-copy rejudge is already resolved or not reserved.",
        );
      const saved = savedCopy(checked.parentState);
      const evidence = evidenceForThirdReview(state);
      const problem = Assessment.validateAutomaticResearch(
        evidence,
        saved.receipt,
        policy.verificationDays,
        policy,
      );
      if (problem) return held(problem);
      const verdict = value(
        await judgeSequenceCopy(
          {
            prospect: saved.context.prospect,
            receipt: saved.receipt,
            playbook: saved.settings,
            parts: saved.parts,
            messages: saved.written.messages,
            peers: saved.context.peers,
            globalVoiceNotes: saved.context.globalVoiceNotes,
          },
          { generate: dependencies.judge, deadline },
        ),
      );
      const rejudgeAudit = {
        sourceContextHash: digest(saved.context),
        sourceTextHash: digest(textOf(saved.written.messages)),
        sourceReceiptHash: researchHash(saved.receipt),
        originalVerdict:
          checked.parentState.preview?.messages[0]?.writing?.quality ?? null,
        verdict,
        judgeInputVersion: COPY_JUDGE_INPUT_VERSION,
        checkedAt: new Date().toISOString(),
      };
      const issue = copyVerdictProblem(verdict);
      return issue
        ? held(`Copy: ${issue}`, { rejudgeAudit })
        : next("copyProof", { rejudgeAudit });
    }
    case "copyProof": {
      const evidence = evidenceForThirdReview(state);
      const base =
        input.action === "no-brands"
          ? projectUnrankedDiscoveryAbsence(evidence)
          : state.shoppingReceipt
            ? { status: "researched" as const, receipt: state.shoppingReceipt }
            : null;
      if (base?.status !== "researched")
        return held(base?.reason ?? "The saved receipt is missing.");
      if (!base.receipt.discovery)
        throw new ValidationError("The saved discovery proof is missing.");
      const receipt = value(
        projectRound3CopyProof(
          evidence,
          base.receipt,
          input.action === "no-brands"
            ? {
                noProductBrands: {
                  reviewedBy: input.requestedBy,
                  reviewedAt: new Date().toISOString(),
                  reason:
                    "The explicit third-review instruction authorizes the absence-only result for this saved answer without product brands.",
                  expectedAnswerHash: base.receipt.discovery.answerHash,
                  expectedLinksHash: base.receipt.discovery.linksHash,
                },
              }
            : {},
        ),
      );
      const problem = Assessment.validateAutomaticResearch(
        evidence,
        receipt,
        policy.verificationDays,
        policy,
      );
      if (problem) return held(problem, { shoppingReceipt: receipt });
      if (input.action === "carry" || input.action === "rejudge") {
        const saved = savedCopy(checked.parentState);
        if (
          input.action === "rejudge" &&
          (!state.rejudgeAudit ||
            copyVerdictProblem(state.rejudgeAudit.verdict))
        )
          return held("The single exact-copy rejudge did not pass.");
        if (
          input.action === "carry" &&
          copyVerdictProblem(
            checked.parentState.preview?.messages[0]?.writing?.quality,
          )
        )
          return held("The original carried copy is not a complete pass.");
        const edited = applyRound3CopyEdits({
          prospect: saved.context.prospect,
          parts: saved.parts,
        });
        return edited.status === "held"
          ? held(edited.reason, { shoppingReceipt: receipt })
          : next("draft", {
              shoppingReceipt: receipt,
              suppliedParts: edited.parts,
              mechanicalEdits: edited.edits,
            });
      }
      return next("draft", { shoppingReceipt: receipt });
    }
    case "draft":
      return draft(claim, deadline, dependencies);
    case "complete":
      return next("complete");
  }
};

const previewPeers = async (
  scope: TransactionScope,
  claim: Claim,
  prospect: Parameters<typeof Composition.recentCompositionPeers>[0],
) => {
  const staged = await scope
    .select({
      writing: sql<unknown>`output->'preview'->'messages'->0->'writing'`,
    })
    .from(schema.outboundIntegrationJob)
    .where(
      and(
        eq(schema.outboundIntegrationJob.provider, "automation"),
        eq(schema.outboundIntegrationJob.status, "complete"),
        ne(schema.outboundIntegrationJob.id, claim.job.id),
        sql`input->>'operation'='heldDiscoveryRound3'`,
        sql`input->>'controlId'=${claim.input.controlId}`,
      ),
    )
    .orderBy(desc(schema.outboundIntegrationJob.updatedAt))
    .limit(9);
  return [
    ...staged.flatMap((row) => {
      const parsed = writingSnapshotSchema.safeParse(row.writing);
      return parsed.success && parsed.data.quality?.passed
        ? [{ opening: parsed.data.parts.opening, ...parsed.data.narrative }]
        : [];
    }),
    ...value(await Composition.recentCompositionPeers(prospect, null, scope)),
  ].slice(0, 9);
};
const copyContext = async (
  scope: TransactionScope,
  claim: Claim,
  state: HeldThirdReviewState,
) => {
  const checked = await ready(scope, claim.input, state);
  if (!state.shoppingReceipt)
    throw new ValidationError("The current third-review receipt is missing.");
  const problem = Assessment.validateAutomaticResearch(
    evidenceForThirdReview(state),
    state.shoppingReceipt,
    checked.policy.settings.verificationDays,
    checked.policy.settings,
  );
  if (problem) throw new ValidationError(problem);
  const proposedPolicy = playbookSchema.parse(
    rebuildHeldReviewWritingProposal(checked.policy.settings),
  );
  const settings = settingsForProspect(checked.prospect, proposedPolicy);
  const prospect = prospectSchema.parse({
    ...checked.prospect.details,
    id: checked.prospect.id,
    product: claim.input.product.name,
    productUrl: claim.input.product.url,
    productCategory: claim.input.category,
    assignedSenderEmail: settings.fromEmail,
  });
  const context = heldReviewPreviewContextSchema.parse({
    status: "unapplied",
    prospect,
    prospectRevision: checked.prospect.revision,
    playbookRevision: checked.policy.revision,
    proposedPolicy,
    globalVoiceNotes: proposedPolicy.voiceNotes,
    receiptHash: researchHash(state.shoppingReceipt),
    writingPolicyHash: writingPolicyHash(settings, {
      globalVoiceNotes: proposedPolicy.voiceNotes,
      copyRulesVersion: ROUND3_COPY_RULES_VERSION,
    }),
    baseWritingPolicyHash: writingPolicyHash(
      settingsForProspect(checked.prospect, checked.policy.settings),
      { globalVoiceNotes: checked.policy.settings.voiceNotes },
    ),
    prospectHash: compositionProspectHash(prospect),
    peers:
      state.previewContext?.peers ??
      (claim.input.action === "rejudge"
        ? checked.parentState.previewContext?.peers
        : undefined) ??
      (await previewPeers(scope, claim, checked.prospect)),
  });
  if (state.previewContext && !isDeepStrictEqual(context, state.previewContext))
    throw new ConflictError(
      "The third-review copy context changed after it was saved.",
    );
  return { checked, context, settings, receipt: state.shoppingReceipt };
};
const draft = async (
  claim: Claim,
  deadline: number,
  dependencies: HeldThirdReviewDependencies,
) => {
  const prepared = value(
    await transaction(async (scope) => {
      const current = await currentClaim(scope, claim);
      if (
        !current.state.draftReservedAt ||
        current.state.previewContext ||
        current.state.writerCandidates?.length ||
        current.state.draftBeforeJudge ||
        current.state.preview
      )
        throw new ConflictError(
          "This draft already started or lacks its durable reservation.",
        );
      const ready = await copyContext(scope, claim, current.state);
      await scope
        .update(schema.outboundIntegrationJob)
        .set({
          output: heldThirdReviewStateSchema.parse({
            ...current.state,
            previewContext: ready.context,
          }),
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundIntegrationJob.id, claim.job.id));
      return ready;
    }),
  );
  const { context, settings, receipt } = prepared;
  const reuseVerdict = (() => {
    if (claim.input.action !== "rejudge") return null;
    const audit = claim.state.rejudgeAudit;
    if (
      !audit ||
      copyVerdictProblem(audit.verdict) ||
      !claim.state.suppliedParts
    )
      throw new ConflictError("The exact-copy rejudge has not passed.");
    const saved = savedCopy(prepared.checked.parentState);
    const assembled = assembleSequence(
      context.prospect,
      receipt,
      settings,
      claim.state.suppliedParts,
      { copyRulesVersion: ROUND3_COPY_RULES_VERSION },
    );
    if (assembled.status !== "ready")
      throw new ValidationError("The edited copy cannot be assembled.");
    const unchanged = isDeepStrictEqual(
      textOf(assembled.messages),
      textOf(saved.written.messages),
    );
    if (!unchanged) return null;
    const { round3CopyProof: _proof, ...baseDiscovery } =
      receipt.discovery ?? {};
    const baseReceipt = { ...receipt, discovery: baseDiscovery };
    if (
      audit.judgeInputVersion !== COPY_JUDGE_INPUT_VERSION ||
      audit.sourceContextHash !== digest(saved.context) ||
      audit.sourceTextHash !== digest(textOf(saved.written.messages)) ||
      audit.sourceReceiptHash !== researchHash(saved.receipt) ||
      !isDeepStrictEqual(baseReceipt, saved.receipt) ||
      !isDeepStrictEqual(settings, saved.settings) ||
      !isDeepStrictEqual(context.prospect, saved.context.prospect) ||
      !isDeepStrictEqual(context.peers, saved.context.peers) ||
      context.globalVoiceNotes !== saved.context.globalVoiceNotes
    )
      throw new ConflictError(
        "Unchanged copy cannot receive a second model judgment when its original context binding differs.",
      );
    return audit.verdict;
  })();
  const saveCopyProgress = async (
    patch: (state: HeldThirdReviewState) => Partial<HeldThirdReviewState>,
  ) => {
    const reason = value(
      await transaction(async (scope) => {
        const current = await currentClaim(scope, claim, true);
        const checked = await resultify(() =>
          copyContext(scope, claim, current.state),
        );
        const active =
          current.job.status === "starting" &&
          !!current.state.lease &&
          Date.parse(current.state.lease.expiresAt) > Date.now();
        const problem = !active
          ? "The completed copy result arrived after its lease and is retained unapproved without another attempt."
          : checked.success
            ? null
            : checked.error.message;
        const output = heldThirdReviewStateSchema.parse({
          ...current.state,
          ...patch(current.state),
          ...(problem ? { lease: null, heldReason: problem } : {}),
        });
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            output,
            status: !active ? "uncertain" : problem ? "failed" : "starting",
            error: problem,
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, claim.job.id));
        return problem;
      }),
    );
    if (reason) throw new ConflictError(reason);
  };
  const composed = value(
    await Draft.composeSequence(
      context.prospect,
      receipt,
      context.proposedPolicy,
      {
        generate: dependencies.generate,
        judge: reuseVerdict
          ? async () =>
              Object.fromEntries(
                reuseVerdict.criteria.map((row) => [
                  row.criterion,
                  { passed: row.passed, reason: row.reason },
                ]),
              )
          : dependencies.judge,
        suppliedParts: claim.state.suppliedParts,
        copyRulesVersion: ROUND3_COPY_RULES_VERSION,
        deadline,
        peers: context.peers,
        globalVoiceNotes: context.globalVoiceNotes,
        onCandidate: claim.state.suppliedParts
          ? undefined
          : async (candidate) =>
              saveCopyProgress((state) => ({
                writerCandidates: appendWriterCandidate(
                  state.writerCandidates,
                  candidate,
                  context,
                ),
              })),
        onWritten: async (written) =>
          saveCopyProgress(() => ({
            draftBeforeJudge: heldReviewWrittenSchema.parse({
              parts: written.parts,
              messages: written.messages,
              generation: { attempts: written.attempts },
              writerCompletedAt: new Date().toISOString(),
            }),
          })),
      },
    ),
  );
  const writing = composed.messages[0]?.writing;
  if (
    !writing ||
    !hasCompleteCopyVerdict(writing.quality) ||
    writing.receiptHash !== context.receiptHash ||
    writing.writingPolicyHash !== context.writingPolicyHash ||
    writing.version !== "discovery-email-v2" ||
    writing.copyRulesVersion !== ROUND3_COPY_RULES_VERSION
  )
    throw new ValidationError(
      "The completed third-review preview does not match its reserved context.",
    );
  const preview = heldReviewPreviewSchema.parse({
    ...context,
    ...composed,
    parts: writing.parts,
  });
  const problem = copyVerdictProblem(writing.quality);
  return persist(claim, {
    stage: "complete",
    preview,
    judgeAudit: {
      reusedExactRejudge: !!reuseVerdict,
      newJudgmentPasses: reuseVerdict ? 0 : 1,
      judgeInputVersion: COPY_JUDGE_INPUT_VERSION,
    },
    ...(problem ? { heldReason: `Copy: ${problem}` } : {}),
  });
};
const fail = (claim: Claim, error: Error) =>
  transaction(async (scope) => {
    const job = await jobAt(scope, claim.job.id);
    const state = heldThirdReviewStateSchema.parse(job.output);
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
        output: heldThirdReviewStateSchema.parse({
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
      const control = await controlAt(scope, claim.input.controlId);
      await scope
        .update(schema.outboundIntegrationJob)
        .set({
          output: { ...control.state, paused: true },
          error: error.message,
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundIntegrationJob.id, control.job.id));
      await scope
        .update(schema.outboundIntegrationJob)
        .set({
          output: { ...control.budget, paused: true },
          error: error.message,
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundIntegrationJob.id, control.batch.id));
    }
  });
/** One claimed durable stage per call. No automatic provider retry or additional search. */
export const runNext = (
  input: { controlId: string; deadline?: number },
  dependencies: HeldThirdReviewDependencies = {},
) =>
  resultify(async () => {
    const deadline = input.deadline ?? Date.now() + 150000;
    const claim = value(
      await claimNext(z.string().uuid().parse(input.controlId), deadline),
    );
    if (!claim) return { advanced: false as const };
    const executed = await resultify(async () => {
      const leaseExpiresAt = claim.state.lease?.expiresAt;
      if (!leaseExpiresAt)
        throw new ConflictError(
          "The claimed review stage has no active lease.",
        );
      const executionDeadline = Math.min(
        deadline,
        Date.parse(leaseExpiresAt) - 30_000,
      );
      const result = await execute(claim, executionDeadline, dependencies);
      const reason = value(result);
      if (reason) throw new ConflictError(reason);
    });
    if (!executed.success) value(await fail(claim, executed.error));
    return {
      advanced: true as const,
      jobId: claim.job.id,
      stage: claim.state.stage,
      status: executed.success ? "checkpointed" : "held",
    };
  });
export const status = (controlId: string) =>
  transaction(async (scope) => {
    const control = await controlAt(scope, z.string().uuid().parse(controlId));
    const jobs = await scope
      .select({
        id: schema.outboundIntegrationJob.id,
        prospectId: schema.outboundIntegrationJob.prospectId,
        status: schema.outboundIntegrationJob.status,
        error: schema.outboundIntegrationJob.error,
        stage: sql<string>`output->>'stage'`,
        action: sql<string>`input->>'action'`,
        availableAt: sql<string>`output->>'availableAt'`,
        leaseExpiresAt: sql<string | null>`output->'lease'->>'expiresAt'`,
        queryCount: sql<number>`(output->>'shoppingQueryCount')::int`,
        finding: sql<
          string | null
        >`output->'shoppingReceipt'->'selected'->>'kind'`,
      })
      .from(schema.outboundIntegrationJob)
      .where(
        and(
          eq(schema.outboundIntegrationJob.provider, "automation"),
          sql`input->>'operation'='heldDiscoveryRound3'`,
          sql`input->>'controlId'=${controlId}`,
        ),
      );
    return {
      controlId,
      batchId: control.input.batchId,
      reviewRound: 3 as const,
      executionMode: "unapplied" as const,
      queriesReserved: control.budget.queriesReserved,
      additionalQueriesReserved: control.state.queriesReserved,
      maximumSubmissions: 42,
      authorizedFinalSubmissions: 38,
      paused: control.state.paused || control.budget.paused,
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

/** Supplemental review reuses the same current hold, policy and evidence gates. */
export const assertHeldThirdReviewEligibility = ready;
export const checkedThirdReviewCopyContext = copyContext;
export const recentHeldThirdReviewPeers = previewPeers;
export const savedThirdReviewParentCopy = savedCopy;
