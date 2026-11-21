import type { Issue, Prospect } from "./outbound";

const copyIssues = new Set([
  "emptyMessage",
  "subjectLength",
  "wordLimit",
  "unresolvedVariable",
  "dash",
  "link",
  "bullet",
  "emoji",
  "bannedPhrase",
  "exclamation",
  "templateControlsChanged",
  "draftMissing",
]);

/** Presentation only: every issue still participates in the server approval gate. */
export const reviewState = (
  prospect: Pick<Prospect, "status" | "sentStep" | "issues">,
) => {
  if (prospect.issues.some((issue) => !copyIssues.has(issue.code)))
    return "attention";
  if (prospect.status === "held") return "held";
  if (prospect.issues.length) return "update";
  if (prospect.sentStep >= 3) return "sent";
  if (["approved", "active"].includes(prospect.status)) return "approved";
  return "ready";
};

export const distinctReviewIssues = (issues: Issue[]) =>
  issues.filter(
    (issue, index) =>
      issues.findIndex((other) => other.code === issue.code) === index,
  );
