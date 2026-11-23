import "server-only";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { type Result, resultify } from "@zenncore/utils";
import { z } from "zod";
import {
  type Playbook,
  type ProspectInput,
  playbookSchema,
} from "@/lib/outbound";
import {
  shoppingFinding,
  shoppingResearchSchema,
  validateShoppingResearch,
} from "@/lib/outbound-shopping-research";
import { schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ValidationError } from "@/server/utils/error";
import { repository } from "@/server/utils/repository";
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
export const assertShoppingEvidence = async (
  transaction: TransactionScope | undefined,
  prospect: Pick<
    typeof schema.outboundProspect.$inferSelect,
    "id" | "revision" | "campaignId" | "details"
  >,
  policy: { revision: number; settings: Playbook },
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
  const problem = validateShoppingResearch(
    receipt.data,
    policy.settings.verificationDays,
  );
  if (problem) throw new ValidationError(problem);
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
      !isDeepStrictEqual(playbookSchema.parse(saved.settings), settings)
    )
      throw new ValidationError(
        "The prospect or Playbook changed before drafting.",
      );
    return assertShoppingEvidence(undefined, row, {
      revision: saved.revision,
      settings,
    });
  });
