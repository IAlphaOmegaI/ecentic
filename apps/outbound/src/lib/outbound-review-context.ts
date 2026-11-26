import type { Message, Playbook, Prospect } from "./outbound";
import { copyVerdictProblem } from "./outbound-copy-quality";
import type { ShoppingResearch } from "./outbound-shopping-research";

export type ReviewContext = {
  prospect: Prospect;
  playbook: Playbook;
  proposal: boolean;
  copyEditable: boolean;
  copyTrusted: boolean;
  research: null | {
    query: string;
    queryIntent: string | null;
    priceDifference: boolean;
    kind: ShoppingResearch["selected"]["kind"];
    observation: string;
    position: number | null;
    total: number | null;
    listed: string[];
    checkedAt: string;
    fullAnswerAvailable: boolean;
  };
  previous: null | {
    revision: number;
    createdAt: string;
    messages: Message[];
    postalAddress: string;
  };
};

const contactFields = new Set([
  "email",
  "name",
  "first",
  "title",
  "role",
  "roleSource",
  "roleCheckedAt",
  "emailVerifiedAt",
  "emailStatus",
  "mxProvider",
  "mxCheckedAt",
  "history",
  "relationship",
  "linkedinUrl",
  "country",
  "domain",
  "company",
  "platform",
  "legitEvidence",
  "timezone",
]);
const researchFields = new Set([
  "evidence",
  "evidenceCheckedAt",
  "finding",
  "findingReviewed",
  "gap",
  "product",
  "productUrl",
  "shoppingFinding",
  "shoppingResearchId",
]);

export const isReviewCopyIssue = (issue: Prospect["issues"][number]) =>
  /^(message[123]|messages|subject|body|followupOne|followupTwo|writing|opening|result|relevance|followupFact)$/.test(
    issue.field,
  ) ||
  [
    "templateControlsChanged",
    "unknownVariable",
    "writingRequired",
    "writingChanged",
    "copyQuality",
    "claimNotAllowed",
    "wordLimit",
    "sentenceLength",
    "subjectLength",
    "emptyMessage",
    "unresolvedVariable",
    "dash",
    "link",
    "bullet",
    "emoji",
    "bannedPhrase",
    "optoutMissing",
    "signatureMissing",
    "exclamation",
    "repeatedSentence",
    "duplicateSubject",
    "automaticReviewFailed",
    "automaticReviewUncertain",
  ].includes(issue.code);

/** Presentation categories do not replace the server approval checks. */
export const reviewChecks = (context: ReviewContext) => {
  const { prospect, research } = context;
  const contact = prospect.issues.filter((issue) =>
    contactFields.has(issue.field),
  );
  const evidence = prospect.issues.filter((issue) =>
    researchFields.has(issue.field),
  );
  const copy = prospect.issues.filter(isReviewCopyIssue);
  return {
    contact: contact.length
      ? "attention"
      : prospect.email
        ? "ready"
        : "missing",
    research:
      evidence.length ||
      research?.kind === "no-gap" ||
      research?.kind === "product-observation"
        ? "attention"
        : research
          ? "ready"
          : "missing",
    copy:
      !context.copyTrusted ||
      copy.length ||
      copyVerdictProblem(prospect.messages[0]?.writing?.quality)
        ? prospect.messages.length
          ? "attention"
          : "missing"
        : "ready",
  } as const;
};

export const reviewNextAction = (context: ReviewContext) => {
  const checks = reviewChecks(context);
  if (checks.research !== "ready") {
    if (context.research?.kind === "no-gap")
      return context.research.queryIntent === "unbranded-broad"
        ? "anotherProduct"
        : "broader";
    if (context.research?.kind === "product-observation")
      return "anotherProduct";
    return "freshSearch";
  }
  return "regenerate";
};
