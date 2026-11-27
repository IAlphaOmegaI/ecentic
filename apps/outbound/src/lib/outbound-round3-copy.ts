import { z } from "zod";
import type { ProspectInput } from "./outbound";
import type { WriterParts } from "./outbound-composition";
import type { ShoppingResearch } from "./outbound-shopping-research";

/** Explicit opt-in: historical writing and verdicts keep their original rules. */
export const ROUND3_COPY_RULES_VERSION = "spoken-copy-v3";
export const REVIEWED_COPY_RULES_VERSION = "spoken-copy-v4";
export type CopyRulesVersion =
  | typeof ROUND3_COPY_RULES_VERSION
  | typeof REVIEWED_COPY_RULES_VERSION;
/** An operator-recorded human decision, never a field returned by the writer. */
export const openingRuleExceptionSchema = z
  .object({
    kind: z.literal("owner-approved-existing-body"),
    opening: z.string().min(1).max(1200),
    approvedBody: z.string().min(1).max(8000),
    approvalReference: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type OpeningRuleException = z.infer<typeof openingRuleExceptionSchema>;
export type CopyRulesContext = {
  copyRulesVersion?: CopyRulesVersion;
  openingRuleException?: OpeningRuleException;
};
export const usesSpokenCopyRules = (context: CopyRulesContext) =>
  context.copyRulesVersion === ROUND3_COPY_RULES_VERSION ||
  context.copyRulesVersion === REVIEWED_COPY_RULES_VERSION;

const spokenNames: Record<string, string> = {
  "Alice Lane Home Collection": "Alice Lane",
  "Peepers by PeeperSpecs": "Peepers",
  "Só Dança USA": "Só Dança",
};
export const spokenMerchantName = (prospect: Pick<ProspectInput, "company">) =>
  spokenNames[prospect.company] ?? prospect.company;

export const round3CopyProofProblem = (
  receipt: ShoppingResearch,
  prospect: Pick<ProspectInput, "company" | "domain">,
): string | null => {
  if (receipt.selected.kind !== "discovery-absence") return null;
  const discovery = receipt.discovery;
  const proof = discovery?.round3CopyProof;
  if (
    !proof ||
    proof.fullName !== prospect.company ||
    proof.spokenName !== spokenMerchantName(prospect) ||
    proof.domain !== prospect.domain.replace(/^www\./i, "").toLowerCase() ||
    proof.answerHash !== discovery?.answerHash ||
    proof.linksHash !== discovery.linksHash ||
    proof.sourceId !== discovery.sourceId ||
    !proof.namesAbsent ||
    discovery.merchantPresent !== false ||
    discovery.completeness.status !== "complete"
  )
    return "Round three needs intact full-name and spoken-name absence proof from the complete answer and saved cited pages.";
  if (
    proof.noProductBrands &&
    (proof.noProductBrands.expectedAnswerHash !== proof.answerHash ||
      proof.noProductBrands.expectedLinksHash !== proof.linksHash ||
      receipt.claims?.some((claim) => claim.kind === "brand") ||
      discovery.brandProjection ||
      !(
        (proof.fullName === "Diamond Dotz" &&
          proof.domain === "diamonddotz.com") ||
        (proof.fullName === "Terrapin Ridge Farms" &&
          proof.domain === "terrapinridge.com")
      ))
  )
    return "The explicit no-product-brand review does not match this saved answer.";
  return null;
};

export const hasRound3NoProductBrands = (
  receipt: ShoppingResearch,
  prospect: Pick<ProspectInput, "company" | "domain">,
) =>
  Boolean(receipt.discovery?.round3CopyProof?.noProductBrands) &&
  round3CopyProofProblem(receipt, prospect) === null;

export const reviewedCopyProofProblem = (
  receipt: ShoppingResearch,
): string | null => {
  if (receipt.selected.kind !== "discovery-absence") return null;
  const discovery = receipt.discovery;
  const proof = discovery?.productListings;
  return !proof?.entries.length ||
    proof.sourceId !== discovery?.sourceId ||
    proof.answerHash !== discovery?.answerHash ||
    proof.linksHash !== discovery?.linksHash
    ? "An absence claim needs bound product listings with product links from this answer."
    : null;
};

export type Round3CopyEdit = {
  field: keyof WriterParts;
  before: string;
  after: string;
};
/** Only the user's mechanical edits; validation and a new judgment remain required. */
export const applyRound3CopyEdits = ({
  prospect,
  parts,
}: {
  prospect: Pick<ProspectInput, "company">;
  parts: WriterParts;
}):
  | { status: "ready"; parts: WriterParts; edits: Round3CopyEdit[] }
  | { status: "held"; reason: string } => {
  const spoken = spokenMerchantName(prospect);
  const fullName = prospect.company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const replaceName = (text: string) =>
    spoken === prospect.company
      ? text
      : text.replace(
          new RegExp(`(?<![\\p{L}\\p{N}])${fullName}(?![\\p{L}\\p{N}])`, "gu"),
          spoken,
        );
  const updated: WriterParts = {
    subject: replaceName(parts.subject)
      .replace(/(?<![\p{L}\p{N}])search(?![\p{L}\p{N}])/giu, " ")
      .replace(/\s+/g, " ")
      .trim(),
    opening: replaceName(parts.opening),
    result: replaceName(parts.result).replace(
      /^(?:When I asked,\s*)?(?:It|it|The answer|That answer|Google AI Mode)\s+picked\s+/,
      "It picked ",
    ),
    relevance: replaceName(parts.relevance),
  };
  if (!updated.subject)
    return {
      status: "held",
      reason:
        "Removing search leaves no subject; supply a researched topic before review.",
    };
  const fields: (keyof WriterParts)[] = [
    "subject",
    "opening",
    "result",
    "relevance",
  ];
  return {
    status: "ready",
    parts: updated,
    edits: fields.flatMap((field) =>
      parts[field] === updated[field]
        ? []
        : [{ field, before: parts[field], after: updated[field] }],
    ),
  };
};
