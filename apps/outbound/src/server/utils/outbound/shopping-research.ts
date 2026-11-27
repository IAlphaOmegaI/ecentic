import "server-only";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { type Result, resultify } from "@zenncore/utils";
import { z } from "zod";
import {
  normalizeDomain,
  type Playbook,
  type ProspectInput,
  playbookSchema,
  settingsForProspect,
} from "@/lib/outbound";
import {
  type ShoppingResearch,
  shoppingFinding,
  shoppingResearchSchema,
  validateShoppingResearch,
} from "@/lib/outbound-shopping-research";
import { schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ValidationError } from "@/server/utils/error";
import { repository } from "@/server/utils/repository";
import {
  type AiCapture,
  aiCaptureSchema,
  browserResearchSchema,
} from "./live-shopping-contract";
import * as Assessment from "./shopping-assessment";
import { researchPolicyHash } from "./shopping-policy";

export { researchPolicyHash } from "./shopping-policy";

const Jobs = repository(schema.outboundIntegrationJob);
const Prospects = repository(schema.outboundProspect);
const Playbooks = repository(schema.outboundPlaybook);
const Campaigns = repository(schema.outboundCampaign);
const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
export const researchHash = (input: unknown) =>
  createHash("sha256").update(JSON.stringify(input)).digest("hex");

/** A company-name correction must not reuse an absence check for the old identity. */
export const captureMatchesMerchant = (
  answer: AiCapture,
  prospect: Pick<ProspectInput, "company" | "domain">,
  receipt?: ShoppingResearch,
) => {
  const merchant = answer.job.query.merchant;
  if (!merchant)
    return Boolean(
      receipt?.selected.kind === "product-data-gap" &&
        receipt.discovery?.merchantPresent === null &&
        receipt.claims?.length &&
        !receipt.claims.some((claim) =>
          ["merchant-presence", "position", "count"].includes(claim.kind),
        ) &&
        normalizeDomain(answer.job.query.product.url) ===
          normalizeDomain(prospect.domain),
    );
  const canonicalName = (name: string) =>
    name.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  return Boolean(
    merchant &&
      canonicalName(merchant.name) === canonicalName(prospect.company) &&
      normalizeDomain(merchant.domain) === normalizeDomain(prospect.domain),
  );
};
export const researchJobInputSchema = z.object({
  operation: z.literal("leadResearch"),
  requestId: z.string().uuid(),
  prospectId: z.string().uuid(),
  prospectRevision: z.number().int(),
  playbookRevision: z.number().int(),
  campaignId: z.string().uuid().nullable(),
  campaignRevision: z.number().int().nullable(),
  receiptHash: z.string().length(64),
  researchPolicyHash: z.string().length(64).optional(),
});

const boundFields = [
  "company",
  "domain",
  "website",
  "name",
  "first",
  "title",
  "email",
  "linkedinUrl",
  "platform",
  "country",
  "relationship",
  "roleSource",
  "roleCheckedAt",
  "timezone",
  "product",
  "productUrl",
  "shoppingFinding",
  "shoppingResearchId",
  "finding",
  "gap",
  "evidence",
  "evidenceCheckedAt",
  "personalLine",
  "personalSource",
  "personalPublishedAt",
  "personalCheckedAt",
  "automationEvidenceId",
] as const;
/** Store may replay only a receipt bound to an accepted, immutable fixed-bump sequence. */
export type ApprovedShoppingReplay = { receiptHash: string; approvedAt: Date };
export const assertShoppingEvidence = async (
  transaction: TransactionScope | undefined,
  prospect: Pick<
    typeof schema.outboundProspect.$inferSelect,
    "id" | "revision" | "campaignId" | "details"
  >,
  policy: { revision: number; settings: Playbook },
  approvedReplay?: ApprovedShoppingReplay,
) => {
  if (
    !policy.settings.requireShoppingEvidence &&
    prospect.details.gap !== "shopping-research"
  )
    return null;
  const identifier = z
    .string()
    .uuid()
    .safeParse(prospect.details.shoppingResearchId);
  if (!identifier.success)
    throw new ValidationError(
      "Shopping research is required before drafting, approval or delivery.",
    );
  const job = value(
    await Jobs.get(Environment.SERVER, identifier.data, { tx: transaction }),
  );
  const input = researchJobInputSchema.safeParse(job?.input);
  const receipt = shoppingResearchSchema.safeParse(job?.output?.["receipt"]);
  const snapshot = job?.output?.["details"] as
    | Partial<ProspectInput>
    | undefined;
  if (
    !input.success ||
    !receipt.success ||
    !snapshot ||
    job?.provider !== "automation" ||
    job.status !== "complete" ||
    job.prospectId !== prospect.id ||
    input.data.prospectId !== prospect.id ||
    (input.data.playbookRevision !== policy.revision &&
      input.data.researchPolicyHash !== researchPolicyHash(policy.settings)) ||
    input.data.campaignId !== prospect.campaignId ||
    input.data.receiptHash !== researchHash(receipt.data) ||
    typeof job.output?.["appliedProspectRevision"] !== "number" ||
    job.output["appliedProspectRevision"] > prospect.revision ||
    boundFields.some(
      (key) =>
        !isDeepStrictEqual(
          prospect.details[key] ?? null,
          snapshot[key] ?? null,
        ),
    ) ||
    !isDeepStrictEqual(
      prospect.details.shoppingFinding,
      shoppingFinding(receipt.data),
    )
  )
    throw new ValidationError(
      "Shopping research no longer matches this prospect or Playbook.",
    );
  const validationTime = approvedReplay?.approvedAt.getTime() ?? Date.now();
  if (
    approvedReplay &&
    (!Number.isFinite(validationTime) ||
      validationTime > Date.now() ||
      approvedReplay.receiptHash !== input.data.receiptHash)
  )
    throw new ValidationError(
      "The fixed bump no longer matches its originally approved research receipt.",
    );
  const problem = validateShoppingResearch(
    receipt.data,
    policy.settings.verificationDays,
    validationTime,
    policy.settings,
  );
  if (problem) throw new ValidationError(problem);
  if (receipt.data.discovery || receipt.data.claims) {
    const proof = z
      .object({
        captureJobId: z.string().uuid(),
        answer: aiCaptureSchema,
        browser: browserResearchSchema,
      })
      .strict()
      .safeParse(job.output?.["captureProof"]);
    if (!proof.success || proof.data.browser.status !== "captured")
      throw new ValidationError(
        "The discovery finding is missing its original provider captures.",
      );
    if (
      !captureMatchesMerchant(proof.data.answer, prospect.details, receipt.data)
    )
      throw new ValidationError(
        "The saved shopper query belongs to an earlier or different company identity.",
      );
    const replayProblem = Assessment.validateAutomaticResearch(
      { answer: proof.data.answer, browser: proof.data.browser },
      receipt.data,
      policy.settings.verificationDays,
      policy.settings,
      validationTime,
    );
    if (replayProblem) throw new ValidationError(replayProblem);
  }
  if (receipt.data.selected.kind === "no-gap")
    throw new ValidationError(
      "No gap found. Try another product before drafting.",
    );
  if (receipt.data.selected.kind === "product-observation")
    throw new ValidationError(
      "This lead needs an unbranded search before drafting or approval.",
    );
  if (input.data.campaignId) {
    const campaign = value(
      await Campaigns.get(Environment.SERVER, input.data.campaignId, {
        tx: transaction,
      }),
    );
    if (
      !campaign ||
      campaign.revision !== input.data.campaignRevision ||
      campaign.status === "archived"
    )
      throw new ValidationError(
        "Shopping research no longer matches the campaign criteria.",
      );
  }
  return receipt.data;
};

/** A direct draft call gets the same durable evidence gate as approval. */
export const evidenceForDraft = (details: ProspectInput, settings: Playbook) =>
  resultify(async () => {
    if (
      !settings.requireShoppingEvidence &&
      details.gap !== "shopping-research"
    )
      return null;
    const identifier = z.string().uuid().safeParse(details.shoppingResearchId);
    if (!identifier.success)
      throw new ValidationError(
        "Shopping research is required before drafting.",
      );
    const job = value(await Jobs.get(Environment.SERVER, identifier.data));
    const input = researchJobInputSchema.safeParse(job?.input);
    if (!input.success)
      throw new ValidationError("Shopping research is missing.");
    const row = value(
      await Prospects.get(Environment.SERVER, input.data.prospectId),
    );
    const saved = value(await Playbooks.get(Environment.SERVER, "default"));
    if (
      !row ||
      !saved ||
      !isDeepStrictEqual(row.details, details) ||
      !isDeepStrictEqual(
        settingsForProspect(row, playbookSchema.parse(saved.settings)),
        settings,
      )
    )
      throw new ValidationError(
        "The prospect or Playbook changed before drafting.",
      );
    return assertShoppingEvidence(undefined, row, {
      revision: saved.revision,
      settings,
    });
  });
