import "server-only";
import { randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizeDomain, prospectSchema } from "@/lib/outbound";
import {
  automationInputSchema,
  automationStateSchema,
} from "@/lib/outbound-automation";
import {
  shoppingFinding,
  shoppingResearchSchema,
  validateShoppingResearch,
} from "@/lib/outbound-shopping-research";
import { db, schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError, ValidationError } from "@/server/utils/error";
import {
  HELD_REVIEW_MANIFEST_HASH,
  HELD_REVIEW_REASON,
  heldManifestHash,
  heldReviewBatchSchema,
  heldReviewBudgetSchema,
  heldReviewInputSchema,
  heldReviewStateSchema,
} from "@/server/utils/outbound/held-review-contract";
import {
  aiCaptureSchema,
  browserResearchSchema,
  shopperQueryReviewSchema,
} from "@/server/utils/outbound/live-shopping";
import {
  assertReviewedCopySourcesWithin,
  loadReviewedCopyPreviewWithin,
  type ReviewedCopyBinding,
} from "@/server/utils/outbound/reviewed-copy-preview";
import {
  preparationInputSchema,
  preparationStateSchema,
} from "@/server/utils/outbound/saved-preparation-contract";
import * as Assessment from "@/server/utils/outbound/shopping-assessment";
import { researchCaptureProof } from "@/server/utils/outbound/shopping-capture-proof";
import {
  captureMatchesMerchant,
  researchHash,
  researchJobInputSchema,
  researchPolicyHash,
} from "@/server/utils/outbound/shopping-research";
import { repository } from "@/server/utils/repository";
import * as Replacement from "./replacement-sequences";
import * as Store from "./store";

const Jobs = repository(schema.outboundIntegrationJob);
const Prospects = repository(schema.outboundProspect);
const Campaigns = repository(schema.outboundCampaign);
const Attempts = repository(schema.outboundSendAttempt);
const Events = repository(schema.outboundEvent);
const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
export const saveResearchSchema = z
  .object({
    requestId: z.string().uuid(),
    prospectId: z.string().uuid(),
    expectedRevision: z.number().int().nonnegative(),
    expectedPlaybookRevision: z.number().int().nonnegative(),
    receipt: shoppingResearchSchema,
    captureJobId: z.string().uuid().optional(),
  })
  .strict();

/** Persist an operator's actual captures and apply them atomically. No provider or sending operation. */
const save = (
  actor: string,
  input: z.infer<typeof saveResearchSchema>,
  automatic?: { jobId: string; leaseToken: string; kind?: "saved" | "held" },
  reviewedBinding?: ReviewedCopyBinding,
) =>
  resultify(async () => {
    const parsed = saveResearchSchema.parse(input);
    const receiptHash = researchHash(parsed.receipt);
    return db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      const prior = value(
        await Jobs.find(
          Environment.SERVER,
          {
            where: eq(
              schema.outboundIntegrationJob.requestId,
              `lead-research:${parsed.requestId}`,
            ),
            limit: 1,
          },
          { tx: transaction },
        ),
      )[0];
      if (prior) {
        if (reviewedBinding) {
          const provenance = prior.output?.["reviewedPreview"];
          if (
            !provenance ||
            typeof provenance !== "object" ||
            !("previewJobId" in provenance) ||
            provenance.previewJobId !== reviewedBinding.previewJobId ||
            !("previewJobHash" in provenance) ||
            provenance.previewJobHash !== reviewedBinding.previewJobHash ||
            !("authorizationReference" in provenance) ||
            provenance.authorizationReference !==
              reviewedBinding.authorizationReference
          )
            throw new ConflictError(
              "The saved research belongs to another reviewed preview.",
            );
          await assertReviewedCopySourcesWithin(transaction, reviewedBinding);
        }
        const original = researchJobInputSchema.parse(prior.input);
        if (
          prior.status !== "complete" ||
          original.prospectId !== parsed.prospectId ||
          original.receiptHash !== receiptHash ||
          original.prospectRevision !== parsed.expectedRevision ||
          original.playbookRevision !== parsed.expectedPlaybookRevision
        )
          throw new ConflictError(
            "The research request ID already belongs to another saved result.",
          );
        return {
          researchId: prior.id,
          prospectId: parsed.prospectId,
          revision: Number(prior.output?.["appliedProspectRevision"]),
          repeated: true,
        };
      }
      if (
        !parsed.receipt.discovery ||
        !parsed.receipt.claims?.length ||
        !parsed.receipt.claimExcerpts?.length
      )
        throw new ValidationError(
          "New research needs the fact ledger and original provider captures. Historical receipts remain unchanged.",
        );
      const policy = await Store.policy(transaction);
      const prospect = value(
        await Prospects.get(Environment.SERVER, parsed.prospectId, {
          tx: transaction,
        }),
      );
      if (
        !prospect ||
        prospect.revision !== parsed.expectedRevision ||
        policy.revision !== parsed.expectedPlaybookRevision
      )
        throw new ConflictError(
          "The prospect or Playbook changed before the research was saved.",
        );
      const reviewed = reviewedBinding
        ? await loadReviewedCopyPreviewWithin(
            transaction,
            reviewedBinding,
            prospect,
            policy,
          )
        : null;
      if (
        reviewed &&
        (parsed.requestId !== reviewedBinding?.previewJobId ||
          parsed.captureJobId !== reviewedBinding?.previewJobId ||
          researchHash(reviewed.receipt) !== receiptHash)
      )
        throw new ValidationError(
          "The requested research differs from the unchanged reviewed preview.",
        );
      if (
        prospect.sentStep ||
        ["replied", "optedOut", "bounced", "finished", "skipped"].includes(
          prospect.status,
        )
      )
        throw new ConflictError(
          "Research can only replace an unsent, open prospect's draft evidence.",
        );
      if (
        value(
          await Attempts.find(
            Environment.SERVER,
            {
              where: eq(schema.outboundSendAttempt.prospectId, prospect.id),
              limit: 1,
            },
            { tx: transaction },
          ),
        ).length
      )
        throw new ConflictError(
          "Reconcile existing delivery attempts before replacing research.",
        );
      const linkedin = value(
        await Jobs.find(
          Environment.SERVER,
          {
            where: and(
              eq(schema.outboundIntegrationJob.provider, "linkedin"),
              eq(schema.outboundIntegrationJob.prospectId, prospect.id),
            ),
            limit: 1,
          },
          { tx: transaction },
        ),
      )[0];
      if (linkedin)
        throw new ConflictError(
          "An existing LinkedIn outreach attempt prevents replacing research.",
        );
      const campaign = prospect.campaignId
        ? value(
            await Campaigns.get(Environment.SERVER, prospect.campaignId, {
              tx: transaction,
            }),
          )
        : null;
      if (prospect.campaignId && (!campaign || campaign.status === "archived"))
        throw new ConflictError("The campaign is unavailable for research.");
      if (automatic?.kind === "held") {
        const job = value(
          await Jobs.get(Environment.SERVER, automatic.jobId, {
            tx: transaction,
          }),
        );
        const claim = heldReviewInputSchema.safeParse(job?.input);
        const state = heldReviewStateSchema.safeParse(job?.output);
        if (
          !claim.success ||
          !state.success ||
          job?.status !== "starting" ||
          job.provider !== "automation" ||
          job.prospectId !== prospect.id ||
          claim.data.prospectId !== prospect.id ||
          claim.data.requestedBy !== actor ||
          state.data.stage !== "applyResearch" ||
          state.data.lease?.token !== automatic.leaseToken ||
          Date.parse(state.data.lease.expiresAt) <= Date.now() ||
          state.data.prospectRevision !== prospect.revision ||
          parsed.requestId !== job.id ||
          researchHash(state.data.shoppingReceipt) !== receiptHash ||
          claim.data.playbookRevision !== policy.revision ||
          claim.data.researchPolicyHash !==
            researchPolicyHash(policy.settings) ||
          claim.data.campaignId !== (campaign?.id ?? null) ||
          claim.data.campaignRevision !== (campaign?.revision ?? null) ||
          claim.data.manifestHash !== HELD_REVIEW_MANIFEST_HASH ||
          prospect.status !== "held" ||
          prospect.holdReason !== HELD_REVIEW_REASON ||
          prospect.approvedAt ||
          prospect.approvedBy ||
          prospect.approvalHash ||
          prospect.nextSendAt
        )
          throw new ConflictError(
            "The held review claim, original hold or saved policy changed.",
          );
        const batch = value(
          await Jobs.get(Environment.SERVER, claim.data.batchId, {
            tx: transaction,
          }),
        );
        const manifest = heldReviewBatchSchema.safeParse(batch?.input);
        const budget = heldReviewBudgetSchema.safeParse(batch?.output);
        if (
          batch?.provider !== "automation" ||
          !manifest.success ||
          !budget.success ||
          budget.data.paused ||
          manifest.data.requestedBy !== actor ||
          manifest.data.manifestHash !== HELD_REVIEW_MANIFEST_HASH ||
          heldManifestHash(manifest.data.manifest.prospectIds) !==
            HELD_REVIEW_MANIFEST_HASH ||
          !manifest.data.manifest.prospectIds.includes(prospect.id)
        )
          throw new ConflictError(
            "The explicit held review batch is unavailable.",
          );
        const context = value(
          await Store.getEnrichmentContext(prospect.id, transaction),
        );
        if (context.suppressed)
          throw new ConflictError("This contact or company is suppressed.");
        const approved = await transaction
          .select({ id: schema.outboundRevision.id })
          .from(schema.outboundRevision)
          .where(
            and(
              eq(schema.outboundRevision.prospectId, prospect.id),
              isNotNull(schema.outboundRevision.approvedAt),
              isNull(schema.outboundRevision.revokedAt),
            ),
          )
          .limit(1);
        if (approved.length)
          throw new ConflictError(
            "The held prospect still has an active approval.",
          );
      } else if (automatic?.kind === "saved") {
        const job = value(
          await Jobs.get(Environment.SERVER, automatic.jobId, {
            tx: transaction,
          }),
        );
        const claim = preparationInputSchema.safeParse(job?.input);
        const state = preparationStateSchema.safeParse(job?.output);
        if (
          !claim.success ||
          !state.success ||
          job?.status !== "starting" ||
          job.provider !== "automation" ||
          job.prospectId !== prospect.id ||
          state.data.stage !== "applyResearch" ||
          state.data.lease?.token !== automatic.leaseToken ||
          Date.parse(state.data.lease.expiresAt) <= Date.now() ||
          state.data.prospectRevision !== prospect.revision ||
          parsed.requestId !== job.id ||
          researchHash(state.data.shoppingReceipt) !== receiptHash ||
          claim.data.playbookRevision !== policy.revision ||
          claim.data.campaignId !== campaign?.id ||
          claim.data.campaignRevision !== campaign?.revision ||
          campaign?.status !== "active" ||
          !policy.settings.automationEnabled ||
          !policy.settings.trustSavedContactVerification ||
          !["candidate", "draft"].includes(prospect.status) ||
          !["", "playbookChanged"].includes(prospect.holdReason)
        )
          throw new ConflictError(
            "The saved contact research claim changed or was held.",
          );
        const browser = browserResearchSchema.parse(state.data.browser);
        if (browser.status !== "captured")
          throw new ValidationError("The browser capture is incomplete.");
        const evidence = researchCaptureProof(
          automatic.jobId,
          { answer: aiCaptureSchema.parse(state.data.answer), browser },
          parsed.receipt,
          state.data,
        );
        const problem = Assessment.validateAutomaticResearch(
          evidence,
          parsed.receipt,
          policy.settings.verificationDays,
          policy.settings,
        );
        if (problem) throw new ValidationError(problem);
        const context = value(
          await Store.getEnrichmentContext(prospect.id, transaction),
        );
        if (context.suppressed)
          throw new ConflictError("This contact or company is suppressed.");
      } else if (automatic) {
        const job = value(
          await Jobs.get(Environment.SERVER, automatic.jobId, {
            tx: transaction,
          }),
        );
        const claim = automationInputSchema.safeParse(job?.input);
        const state = automationStateSchema.safeParse(job?.output);
        if (
          !claim.success ||
          !state.success ||
          job?.status !== "starting" ||
          job.provider !== "automation" ||
          job.prospectId !== prospect.id ||
          state.data.stage !== "applyShopping" ||
          state.data.lease?.token !== automatic.leaseToken ||
          Date.parse(state.data.lease.expiresAt) <= Date.now() ||
          state.data["prospectRevision"] !== prospect.revision ||
          state.data["shoppingRequestId"] !== parsed.requestId ||
          researchHash(
            shoppingResearchSchema.parse(state.data["shoppingReceipt"]),
          ) !== receiptHash ||
          state.data["shoppingPolicyHash"] !==
            researchPolicyHash(policy.settings) ||
          claim.data.playbookRevision !== policy.revision ||
          claim.data.campaignId !== campaign?.id ||
          claim.data.campaignRevision !== campaign?.revision ||
          campaign?.status !== "active" ||
          !policy.settings.automationEnabled ||
          !["candidate", "draft"].includes(prospect.status) ||
          prospect.holdReason ||
          prospect.details.automationEvidenceId !== job.id
        )
          throw new ConflictError(
            "The automatic research claim changed or the prospect was held.",
          );
      }
      if (
        normalizeDomain(parsed.receipt.product.url) !==
        normalizeDomain(prospect.details.domain)
      )
        throw new ValidationError(
          "The researched product must belong to this prospect's company.",
        );
      const captureProof = await (async () => {
        if (reviewed) return reviewed.proof;
        if (prospect.replacementOf) {
          const family = await Replacement.assertSequenceFamilyWithin(
            transaction,
            prospect,
            policy.settings,
          );
          if (
            !family ||
            parsed.captureJobId !== family.authorization.previewJobId
          )
            throw new ValidationError(
              "Use the replacement's exact reviewed research source.",
            );
          const fresh = await Replacement.loadReplacementPreviewWithin(
            transaction,
            family.authorization,
            policy,
          );
          if (researchHash(fresh.receipt) !== receiptHash)
            throw new ValidationError(
              "The replacement research differs from the reviewed receipt.",
            );
          return fresh.proof;
        }
        const captureJobId = automatic?.jobId ?? parsed.captureJobId;
        if (!captureJobId)
          throw new ValidationError(
            "A new discovery finding needs its durably saved provider captures.",
          );
        const captureJob = value(
          await Jobs.get(Environment.SERVER, captureJobId, { tx: transaction }),
        );
        const savedInput = preparationInputSchema.safeParse(captureJob?.input);
        const automaticInput = automationInputSchema.safeParse(
          captureJob?.input,
        );
        const heldInput = heldReviewInputSchema.safeParse(captureJob?.input);
        const validIdentity = savedInput.success
          ? savedInput.data.prospectId === prospect.id &&
            savedInput.data.campaignId === prospect.campaignId
          : heldInput.success
            ? heldInput.data.prospectId === prospect.id &&
              heldInput.data.campaignId === prospect.campaignId &&
              heldInput.data.manifestHash === HELD_REVIEW_MANIFEST_HASH
            : automaticInput.success &&
              automaticInput.data.campaignId === prospect.campaignId;
        if (
          captureJob?.provider !== "automation" ||
          captureJob.prospectId !== prospect.id ||
          !validIdentity ||
          (!automatic && captureJob.status !== "complete")
        )
          throw new ValidationError(
            "The saved discovery capture belongs to another prospect or is unfinished.",
          );
        const captured = captureJob.output ?? {};
        const answer = aiCaptureSchema.parse(
          savedInput.success || heldInput.success
            ? captured["answer"]
            : captured["shoppingAnswer"],
        );
        if (!captureMatchesMerchant(answer, prospect.details, parsed.receipt))
          throw new ValidationError(
            "The saved shopper query belongs to an earlier or different company identity.",
          );
        const browser = browserResearchSchema.parse(
          savedInput.success || heldInput.success
            ? captured["browser"]
            : captured["shoppingBrowser"],
        );
        if (
          browser.status !== "captured" ||
          researchHash(
            shoppingResearchSchema.parse(captured["shoppingReceipt"]),
          ) !== receiptHash
        )
          throw new ValidationError(
            "The discovery receipt does not match its completed captures.",
          );
        const proof = researchCaptureProof(
          captureJobId,
          {
            answer,
            browser,
            ...(captured["queryReview"]
              ? {
                  queryReview: shopperQueryReviewSchema.parse(
                    captured["queryReview"],
                  ),
                }
              : {}),
          },
          parsed.receipt,
          captured,
        );
        const problem = Assessment.validateAutomaticResearch(
          proof,
          parsed.receipt,
          policy.settings.verificationDays,
          policy.settings,
        );
        if (problem) throw new ValidationError(problem);
        return proof;
      })();
      const problem = validateShoppingResearch(
        parsed.receipt,
        policy.settings.verificationDays,
        Date.now(),
        policy.settings,
      );
      if (problem) throw new ValidationError(problem);
      await Store.assertAutomaticContactEvidence(transaction, prospect);
      const identifier = randomUUID();
      const finding = shoppingFinding(parsed.receipt);
      const details = prospectSchema.parse({
        ...prospect.details,
        id: prospect.id,
        product: parsed.receipt.product.name,
        productUrl: parsed.receipt.product.url,
        ...(reviewed
          ? { productCategory: reviewed.projectedProspect.productCategory }
          : {}),
        gap: "shopping-research",
        finding: finding.observation,
        shoppingFinding: finding,
        shoppingResearchId: identifier,
        evidence: `Observed shopping research ${identifier}; SHA256 ${receiptHash}. Scope: ${finding.scope}`,
        evidenceCheckedAt: finding.checkedAt,
        findingReviewed: false,
        automationRefreshId: "",
      });
      const saved = await Store.saveProspectWithin(transaction, actor, details);
      if (automatic?.kind === "held") {
        const job = value(
          await Jobs.get(Environment.SERVER, automatic.jobId, {
            tx: transaction,
          }),
        );
        const state = heldReviewStateSchema.parse(job?.output);
        const complete = ["no-gap", "product-observation"].includes(
          finding.kind,
        );
        value(
          await Jobs.update(
            Environment.SERVER,
            automatic.jobId,
            {
              status: complete ? "complete" : "pending",
              output: heldReviewStateSchema.parse({
                ...state,
                stage: complete ? "complete" : "draft",
                prospectRevision: saved.revision,
                researchId: identifier,
                lease: null,
                availableAt: new Date().toISOString(),
              }),
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
      } else if (automatic?.kind === "saved") {
        const job = value(
          await Jobs.get(Environment.SERVER, automatic.jobId, {
            tx: transaction,
          }),
        );
        const state = preparationStateSchema.parse(job?.output);
        value(
          await Jobs.update(
            Environment.SERVER,
            automatic.jobId,
            {
              status: "pending",
              output: {
                ...state,
                stage: "draft",
                prospectRevision: saved.revision,
                lease: null,
                availableAt: new Date().toISOString(),
              },
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
      }
      value(
        await Jobs.create(
          Environment.SERVER,
          {
            id: identifier,
            provider: "automation",
            prospectId: prospect.id,
            requestId: `lead-research:${parsed.requestId}`,
            status: "complete",
            input: researchJobInputSchema.parse({
              operation: "leadResearch",
              requestId: parsed.requestId,
              prospectId: prospect.id,
              prospectRevision: parsed.expectedRevision,
              playbookRevision: policy.revision,
              campaignId: prospect.campaignId,
              campaignRevision: campaign?.revision ?? null,
              receiptHash,
              researchPolicyHash: researchPolicyHash(policy.settings),
            }),
            output: {
              receipt: parsed.receipt,
              details,
              appliedProspectRevision: saved.revision,
              sourceHashes: Object.fromEntries(
                parsed.receipt.sources.map((source) => [
                  source.id,
                  researchHash(source.content),
                ]),
              ),
              capturedBy: actor,
              provenance: reviewed
                ? "reviewed-preview"
                : automatic
                  ? "provider-observed"
                  : "operator-observed",
              ...(reviewed ? { reviewedPreview: reviewed.provenance } : {}),
              ...(automatic ? { automationJobId: automatic.jobId } : {}),
              ...(captureProof ? { captureProof } : {}),
              appliedAt: new Date().toISOString(),
            },
          },
          { tx: transaction },
        ),
      );
      value(
        await Events.create(
          Environment.SERVER,
          {
            prospectId: prospect.id,
            actor,
            kind: "shoppingResearchApplied",
            detail: `${finding.kind}; ${finding.scope}`,
            externalId: `lead-research:${parsed.requestId}`,
          },
          { tx: transaction },
        ),
      );
      return {
        researchId: identifier,
        prospectId: prospect.id,
        revision: saved.revision,
        repeated: false,
      };
    });
  });

/** Explicit operator input and automatic provider captures share the same evidence validator. */
export const saveAndApply = (
  actor: string,
  input: z.infer<typeof saveResearchSchema>,
) => save(actor, input);
/** Server-only operator adoption; full preview/source/policy/authorization proof is rechecked in the save transaction. */
export const saveReviewedPreviewAndApply = (
  actor: string,
  input: z.infer<typeof saveResearchSchema>,
  binding: ReviewedCopyBinding,
) => save(actor, input, undefined, binding);
export const saveAutomaticAndApply = (
  actor: string,
  input: z.infer<typeof saveResearchSchema>,
  claim: { jobId: string; leaseToken: string },
) => save(actor, input, claim);
export const savePreparedAndApply = (
  actor: string,
  input: z.infer<typeof saveResearchSchema>,
  claim: { jobId: string; leaseToken: string },
) => save(actor, input, { ...claim, kind: "saved" });

/** Explicit 21-prospect research review; preserves its original hold and cannot approve. */
export const saveHeldAndApply = (
  actor: string,
  input: z.infer<typeof saveResearchSchema>,
  claim: { jobId: string; leaseToken: string },
) => save(actor, input, { ...claim, kind: "held" });
