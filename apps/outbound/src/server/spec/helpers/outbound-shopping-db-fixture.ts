import { randomUUID } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
import type { WriterParts } from "@/lib/outbound-composition";
import { requireTestDatabase } from "./database";
import {
  buildSyntheticShoppingEvidence,
  type SyntheticShoppingOptions,
  syntheticWriterParts,
} from "./outbound-shopping-fixture";
import { passingCopyJudge } from "./outbound-writer-fixture";

const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
type ProspectReference =
  | { prospect: string; revision?: number }
  | { prospectId: string; expectedRevision?: number };
const reference = (input: ProspectReference) =>
  "prospect" in input
    ? { id: input.prospect, revision: input.revision }
    : { id: input.prospectId, revision: input.expectedRevision };

/** Persist provider-shaped fixture captures and return the real research gate's request. */
export const prepareSyntheticShoppingEvidence = (
  actor: string,
  input: ProspectReference,
  options: Omit<SyntheticShoppingOptions, "prospect"> = {},
) =>
  resultify(async () => {
    requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
    const [{ db, schema }, Store] = await Promise.all([
      import("@/server/database"),
      import("@/server/app/outbound/store"),
    ]);
    const requested = reference(input);
    const initial = value(await Store.getProspect(requested.id));
    if (!initial) throw new Error("Synthetic prospect missing.");
    if (
      requested.revision !== undefined &&
      initial.revision !== requested.revision
    )
      throw new Error(
        "Synthetic research expected a current prospect revision.",
      );
    const policy = await Store.policy();
    const campaignId =
      initial.campaignId ??
      (await (async () => {
        const existing = (
          await db
            .select()
            .from(schema.outboundCampaign)
            .where(
              eq(schema.outboundCampaign.name, "Synthetic shopping fixture"),
            )
        )[0];
        const campaign =
          existing ??
          (
            await db
              .insert(schema.outboundCampaign)
              .values({
                name: "Synthetic shopping fixture",
                status: "active",
                criteria: defaultCampaignCriteria(policy.settings),
                createdBy: actor,
                updatedBy: actor,
              })
              .returning()
          )[0];
        if (!campaign) throw new Error("Synthetic campaign missing.");
        await db
          .update(schema.outboundProspect)
          .set({ campaignId: campaign.id, revision: initial.revision + 1 })
          .where(eq(schema.outboundProspect.id, initial.id));
        return campaign.id;
      })());
    const campaign = (
      await db
        .select()
        .from(schema.outboundCampaign)
        .where(eq(schema.outboundCampaign.id, campaignId))
    )[0];
    if (!campaign) throw new Error("Synthetic campaign missing.");
    const prospect = value(await Store.getProspect(requested.id));
    if (!prospect)
      throw new Error("Synthetic prospect missing after campaign attachment.");
    const qualification = (
      await db
        .select()
        .from(schema.outboundCampaignCompany)
        .where(
          and(
            eq(schema.outboundCampaignCompany.campaignId, campaignId),
            eq(schema.outboundCampaignCompany.domain, prospect.details.domain),
          ),
        )
    )[0];
    if (!qualification)
      await db.insert(schema.outboundCampaignCompany).values({
        campaignId,
        domain: prospect.details.domain,
        name: prospect.details.company,
        website: `https://${prospect.details.domain}`,
        country: prospect.details.country,
        platform:
          prospect.details.platform === "shopify" ||
          prospect.details.platform === "woocommerce"
            ? prospect.details.platform
            : null,
        source: "saved",
        sourcePayload: { synthetic: true },
        status: "added",
        prospectId: prospect.id,
        criteriaRevision: campaign.revision,
      });
    const capture = await buildSyntheticShoppingEvidence({
      ...options,
      prospect: prospect.details,
    });
    const captureJob = (
      await db
        .insert(schema.outboundIntegrationJob)
        .values({
          provider: "automation",
          prospectId: prospect.id,
          requestId: `synthetic-capture:${randomUUID()}`,
          status: "complete",
          input: {
            operation: "savedContactPreparation",
            batchId: randomUUID(),
            prospectId: prospect.id,
            campaignId,
            campaignRevision: campaign.revision,
            playbookRevision: policy.revision,
            requestedBy: actor,
          },
          output: {
            answer: capture.evidence.answer,
            browser: capture.evidence.browser,
            shoppingReceipt: capture.receipt,
          },
        })
        .returning()
    )[0];
    if (!captureJob) throw new Error("Synthetic capture job missing.");
    return {
      request: {
        requestId: randomUUID(),
        prospectId: prospect.id,
        expectedRevision: prospect.revision,
        expectedPlaybookRevision: policy.revision,
        receipt: capture.receipt,
        captureJobId: captureJob.id,
      },
      capture,
    };
  });

export const saveSyntheticShoppingEvidence = (
  actor: string,
  input: ProspectReference,
  options: Omit<SyntheticShoppingOptions, "prospect"> = {},
) =>
  resultify(async () => {
    const prepared = value(
      await prepareSyntheticShoppingEvidence(actor, input, options),
    );
    const LeadResearch = await import("@/server/app/outbound/lead-research");
    const applied = value(
      await LeadResearch.saveAndApply(actor, prepared.request),
    );
    return {
      ...applied,
      prospect: prepared.request.prospectId,
      receipt: prepared.request.receipt,
      capture: prepared.capture,
    };
  });

/** Exercise the durable writer and trusted Store save with injected words and judge only. */
export const draftSyntheticProspect = (
  actor: string,
  input: ProspectReference,
  options: { variant?: number; parts?: WriterParts; now?: number } = {},
) =>
  resultify(async () => {
    requireTestDatabase(process.env.OUTBOUND_TEST_DATABASE_URL);
    const [Store, Research, Composition] = await Promise.all([
      import("@/server/app/outbound/store"),
      import("@/server/utils/outbound/shopping-research"),
      import("@/server/app/outbound/sequence-composition"),
    ]);
    const requested = reference(input);
    const initial = value(await Store.getProspect(requested.id));
    if (!initial) throw new Error("Synthetic prospect missing.");
    if (
      requested.revision !== undefined &&
      requested.revision !== initial.revision
    )
      throw new Error("Synthetic draft expected a current prospect revision.");
    if (!initial.details.shoppingResearchId)
      value(
        await saveSyntheticShoppingEvidence(actor, input, { now: options.now }),
      );
    const prospect = value(await Store.getProspect(requested.id));
    if (!prospect)
      throw new Error("Synthetic prospect missing after research.");
    const receipt = await Research.assertShoppingEvidence(
      undefined,
      prospect,
      await Store.policy(),
    );
    if (!receipt)
      throw new Error("Synthetic draft requires real bound research.");
    const now = options.now;
    const composed = value(
      await Composition.composeForProspect(
        actor,
        {
          prospectId: prospect.id,
          expectedRevision: prospect.revision,
        },
        {
          generate: async ({ prompt }) => {
            const peers = JSON.parse(prompt).recentOpenings as {
              opening: string;
            }[];
            const variants = Array.from({ length: 10 }, (_, index) =>
              syntheticWriterParts(
                prospect.details,
                receipt,
                (options.variant ?? 0) + index,
              ),
            );
            const parts =
              options.parts ??
              variants.find(
                (parts) =>
                  !peers?.some((peer) => peer.opening === parts.opening),
              ) ??
              variants[0];
            if (!parts) throw new Error("Synthetic writer variant missing.");
            return parts;
          },
          judge: passingCopyJudge,
          ...(now === undefined ? {} : { now: () => now }),
        },
      ),
    );
    return value(
      await Store.saveComposedDraft(actor, {
        prospect: prospect.id,
        revision: prospect.revision,
        compositionJobId: composed.composition.jobId,
      }),
    );
  });
