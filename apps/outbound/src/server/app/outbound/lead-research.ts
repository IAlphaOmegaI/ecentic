import "server-only";
import { randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizeDomain, prospectSchema } from "@/lib/outbound";
import {
  shoppingFinding,
  shoppingResearchSchema,
  validateShoppingResearch,
} from "@/lib/outbound-shopping-research";
import { db, schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError, ValidationError } from "@/server/utils/error";
import {
  researchHash,
  researchJobInputSchema,
} from "@/server/utils/outbound/shopping-research";
import { repository } from "@/server/utils/repository";
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
  })
  .strict();

/** Persist an operator's actual captures and apply them atomically. No provider or sending operation. */
export const saveAndApply = (
  actor: string,
  input: z.infer<typeof saveResearchSchema>,
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
      if (
        normalizeDomain(parsed.receipt.product.url) !==
        normalizeDomain(prospect.details.domain)
      )
        throw new ValidationError(
          "The researched product must belong to this prospect's company.",
        );
      const problem = validateShoppingResearch(
        parsed.receipt,
        policy.settings.verificationDays,
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
              provenance: "operator-observed",
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
