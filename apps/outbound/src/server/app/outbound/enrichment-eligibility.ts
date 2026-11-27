import "server-only";
import { z } from "zod";
import {
  companyExcluded,
  normalizeDomain,
  prospectIssues,
  recipientMailHostAllowed,
  splitList,
} from "@/lib/outbound";
import { evidenceDateUsable } from "@/lib/outbound-evidence";
import type { TransactionScope } from "@/server/database";
import { ValidationError } from "@/server/utils/error";
import { assertShoppingEvidence } from "@/server/utils/outbound/shopping-research";
import * as Store from "./store";

const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
export const eligibleForEnrichment = async (
  id: string,
  roleCheck = false,
  transaction?: TransactionScope,
) => {
  if (!z.string().uuid().safeParse(id).success)
    throw new ValidationError("Choose a prospect.");
  const context = value(await Store.getEnrichmentContext(id, transaction));
  const { prospect: row, settings } = context;
  const details = row.details;
  const domain = normalizeDomain(details.domain);
  const countries = (value: string) =>
    splitList(value).map((country) => country.toUpperCase());
  const now = Date.now();
  const fresh = (timestamp: string, days: number) => {
    const checkedAt = Date.parse(timestamp);
    return (
      Number.isFinite(checkedAt) &&
      checkedAt <= now &&
      now - checkedAt < days * 86400_000
    );
  };
  if (
    row.sentStep ||
    !["candidate", "draft", "held", "approved"].includes(row.status) ||
    context.suppressed ||
    context.lastContactedAt ||
    details.relationship !== "cold" ||
    !domain ||
    companyExcluded(settings, details.company) ||
    splitList(settings.excludedDomains).map(normalizeDomain).includes(domain) ||
    !countries(settings.allowedCountries).includes(details.country) ||
    countries(settings.heldCountries).includes(details.country) ||
    !["shopify", "woocommerce"].includes(details.platform)
  )
    throw new ValidationError(
      "This company is outside the cold-outreach policy or already has contact history. No paid lookup was started.",
    );
  const shopping =
    details.gap === "shopping-research"
      ? await assertShoppingEvidence(
          transaction,
          row,
          await Store.policy(transaction),
        )
      : null;
  const rawFinding = Boolean(
    shopping &&
      !["no-gap", "product-observation"].includes(shopping.selected.kind),
  );
  if (
    !details.product ||
    !details.productUrl ||
    !details.gap ||
    !details.finding ||
    !details.evidence ||
    (!details.findingReviewed && !rawFinding) ||
    prospectIssues(details, settings).some(
      (issue) => issue.code === "findingReviewRequired",
    ) ||
    normalizeDomain(details.productUrl) !== domain ||
    !evidenceDateUsable(details.evidenceCheckedAt, settings, now)
  )
    throw new ValidationError(
      "Review a current product finding on this company's domain before spending on contact lookup or enrichment.",
    );
  // Initial Apollo lookup can precede having an email address to check MX for.
  if (
    details.mxProvider === "microsoft" &&
    !recipientMailHostAllowed(details.mxProvider, settings)
  )
    throw new ValidationError(
      "Check an enabled recipient mail host before enrichment. No paid lookup was started.",
    );
  if (
    roleCheck &&
    (!details.title.trim() ||
      (!details.linkedinUrl.trim() && !details.name.trim()) ||
      !details.email ||
      details.emailStatus !== "verified" ||
      !details.emailSource ||
      normalizeDomain(details.email.split("@")[1] ?? "") !== domain ||
      !fresh(details.emailVerifiedAt, settings.emailVerificationDays) ||
      !recipientMailHostAllowed(details.mxProvider, settings) ||
      !fresh(details.mxCheckedAt, 1))
  )
    throw new ValidationError(
      "Clay's role check needs a sourced contact and title, a current verified work-email receipt, and a checked enabled mail host. No routine was started.",
    );
  return row;
};
