import "server-only";

import { randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizeDomain } from "@/lib/outbound";
import { db, schema, type TransactionScope } from "@/server/database";
import { ConflictError, ValidationError } from "@/server/utils/error";
import { browserClaimInterval } from "@/server/utils/outbound/firecrawl-cooldown";
import {
  HELD_REVIEW_MANIFEST_HASH,
  HELD_REVIEW_REASON,
  type HeldReviewInput,
  type HeldReviewManifest,
  type HeldReviewState,
  heldManifestHash,
  heldReviewBatchSchema,
  heldReviewBudgetSchema,
  heldReviewInputSchema,
  heldReviewManifestSchema,
  heldReviewStageBudget,
  heldReviewStateSchema,
} from "@/server/utils/outbound/held-review-contract";
import { IntegrationError } from "@/server/utils/outbound/http";
import * as Capture from "@/server/utils/outbound/live-shopping";
import { shoppingPollLimit } from "@/server/utils/outbound/scrapellm-cooldown";
import * as Assessment from "@/server/utils/outbound/shopping-assessment";
import {
  broaderSearchProblem,
  completedShoppingQuerySchema,
} from "@/server/utils/outbound/shopping-query-history";
import { researchPolicyHash } from "@/server/utils/outbound/shopping-research";
import * as LeadResearch from "./lead-research";
import * as Credentials from "./provider-credentials";
import * as Composition from "./sequence-composition";
import { claimShoppingProviderSlot } from "./shopping-provider-pacing";
import * as Store from "./store";

type Job = typeof schema.outboundIntegrationJob.$inferSelect;
type Claim = { job: Job; input: HeldReviewInput; state: HeldReviewState };
export type HeldReviewDependencies = {
  inspectProduct?: typeof Capture.inspectProduct;
  generateQuery?: typeof Capture.generateShopperQuery;
  start?: typeof Capture.startQuery;
  poll?: typeof Capture.pollQuery;
  browse?: typeof Capture.inspectPages;
  assess?: typeof Assessment.assess;
  resolveKey?: typeof Credentials.resolveKey;
  compose?: typeof Composition.composeForProspect;
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
  const context = value(await Store.getEnrichmentContext(prospect.id, scope));
  if (context.suppressed)
    throw new ConflictError("This contact or company is suppressed.");
  return { prospect, policy, batch };
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
    await scope.insert(schema.outboundEvent).values({
      actor,
      kind: "heldDiscoveryReview",
      detail:
        "Started the approved 21-contact review. Maximum 42 submissions; all holds retained.",
      externalId: requestId,
    });
    return { batchId, repeated: false };
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
const claimNext = (batchId: string, deadline: number) =>
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
          inArray(schema.outboundIntegrationJob.status, [
            "pending",
            "starting",
          ]),
        ),
      )
      .orderBy(asc(schema.outboundIntegrationJob.updatedAt))
      .limit(21);
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
        Date.now() + heldReviewStageBudget(state.stage) > deadline
      )
        continue;
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
          (state.shoppingQueryIntent === "unbranded-broad" ? 1 : 0)
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
        const [cooldowns] = await scope
          .select({
            availableAt: sql<
              string | null
            >`max(${schema.outboundIntegrationJob.output}->>'browserAvailableAt')`,
          })
          .from(schema.outboundIntegrationJob)
          .where(eq(schema.outboundIntegrationJob.provider, "automation"));
        const availableAt = cooldowns?.availableAt
          ? Date.parse(cooldowns.availableAt)
          : 0;
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
        ? next("generateQuery", { productCapture: capture })
        : held(capture.reason, { productCapture: capture });
    }
    case "generateQuery": {
      if (state.productCapture?.status !== "captured")
        throw new ValidationError("The rendered product capture is missing.");
      if (state.shoppingQueryIntent === "unbranded-broad") {
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
          previousQuestion: state.shoppingHistory?.[0]?.query.prompt,
          deadline,
        }),
      );
      return generated.status === "prepared"
        ? next("query", {
            query: generated.query,
            queryGeneration: generated.generation,
          })
        : held(generated.reason, { queryGeneration: generated.generation });
    }
    case "query": {
      const problem = queryProblem(input, state, policy.settings);
      if (
        problem ||
        state.shoppingQueryCount !==
          (state.shoppingQueryIntent === "unbranded-broad" ? 2 : 1)
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
      const assessed = value(
        await (dependencies.assess ?? Assessment.assess)({
          answer,
          browser,
          playbook: policy.settings,
          deadline,
        }),
      );
      if (assessed.status !== "researched") return held(assessed.reason);
      const receipt = assessed.receipt;
      const problem = Assessment.validateAutomaticResearch(
        { answer, browser },
        receipt,
        policy.settings.verificationDays,
        policy.settings,
      );
      if (problem) return held(problem, { shoppingReceipt: receipt });
      if (receipt.selected.kind === "product-observation")
        return held("needs-unbranded-search", { shoppingReceipt: receipt });
      if (
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
      return next("applyResearch", { shoppingReceipt: receipt });
    }
    case "applyResearch":
      return LeadResearch.saveHeldAndApply(
        input.requestedBy,
        {
          requestId: claim.job.id,
          prospectId: input.prospectId,
          expectedRevision: state.prospectRevision,
          expectedPlaybookRevision: input.playbookRevision,
          receipt: captureReceipt(state),
          captureJobId: claim.job.id,
        },
        {
          jobId: claim.job.id,
          leaseToken: z.string().uuid().parse(state.lease?.token),
        },
      );
    case "draft": {
      const receipt = captureReceipt(state);
      if (["no-gap", "product-observation"].includes(receipt.selected.kind))
        return held("This research has no eligible finding for a preview.");
      const composed = value(
        await (dependencies.compose ?? Composition.composeForProspect)(
          input.requestedBy,
          {
            prospectId: input.prospectId,
            expectedRevision: state.prospectRevision,
            expectedPlaybookRevision: input.playbookRevision,
            preview: true,
          },
        ),
      );
      return next("applyDraft", { composition: composed.composition });
    }
    case "applyDraft":
      return transaction(async (scope) => {
        await owns(scope, claim);
        await eligible(scope, input, state);
        if (!state.composition)
          throw new ValidationError(
            "The completed preview reference is missing.",
          );
        const saved = await Store.saveComposedDraftWithin(
          scope,
          input.requestedBy,
          {
            prospect: input.prospectId,
            revision: state.prospectRevision,
            compositionJobId: state.composition.jobId,
          },
        );
        const [prospect] = await scope
          .select({
            status: schema.outboundProspect.status,
            holdReason: schema.outboundProspect.holdReason,
            nextSendAt: schema.outboundProspect.nextSendAt,
          })
          .from(schema.outboundProspect)
          .where(eq(schema.outboundProspect.id, input.prospectId));
        if (
          prospect?.status !== "held" ||
          prospect.holdReason !== HELD_REVIEW_REASON ||
          prospect.nextSendAt !== null
        )
          throw new ConflictError(
            "The preview did not preserve the exact review hold.",
          );
        await scope
          .update(schema.outboundIntegrationJob)
          .set({
            status: "complete",
            output: heldReviewStateSchema.parse({
              ...state,
              stage: "complete",
              prospectRevision: saved.revision,
              lease: null,
              ...(saved.copyProblem ? { heldReason: saved.copyProblem } : {}),
            }),
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundIntegrationJob.id, claim.job.id));
      });
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
  input: { batchId: string; deadline?: number },
  dependencies: HeldReviewDependencies = {},
) =>
  resultify(async () => {
    const batchId = z.string().uuid().parse(input.batchId);
    const deadline = input.deadline ?? Date.now() + 150_000;
    const claim = value(await claimNext(batchId, deadline));
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

export const status = (batchId: string) =>
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
        ),
      );
    return {
      batchId,
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
