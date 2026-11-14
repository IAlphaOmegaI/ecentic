import type {
  Finding,
  ListingReport,
  ListingStatus,
  RuleId,
  Severity,
  Surface,
} from "@/server/app/intelligence/listing-quality";
import { SEVERITY_RANK } from "@/server/app/intelligence/listing-rules";

export type QualityScope = "all" | Surface;

const severityFor = (
  finding: Finding,
  scope: QualityScope,
): Severity | null => {
  const severities = [
    ...(scope === "all" || scope === "universal"
      ? finding.universal
        ? [finding.universal]
        : []
      : []),
    ...finding.platforms
      .filter((entry) => scope === "all" || entry.platform === scope)
      .map((entry) => entry.verdict.severity),
  ];
  return severities.reduce<Severity | null>(
    (worst, severity) =>
      worst === null || SEVERITY_RANK[severity] > SEVERITY_RANK[worst]
        ? severity
        : worst,
    null,
  );
};

export const qualityFindings = (product: ListingReport, scope: QualityScope) =>
  product.findings.filter((finding) => severityFor(finding, scope) !== null);

export const qualityStatus = (
  product: ListingReport,
  scope: QualityScope,
): ListingStatus =>
  qualityFindings(product, scope).reduce<ListingStatus>((worst, finding) => {
    const severity = severityFor(finding, scope);
    if (!severity) return worst;
    return worst === "ready" || SEVERITY_RANK[severity] > SEVERITY_RANK[worst]
      ? severity
      : worst;
  }, "ready");

export type QualityIssue = Finding & {
  count: number;
  products: ListingReport[];
  severity: Severity;
};

/** Counts each product once per rule, including rules outside the old top-eight slice. */
export const qualityIssues = (
  products: ListingReport[],
  scope: QualityScope,
): QualityIssue[] => {
  const rules = [
    ...new Set(
      products.flatMap((product) =>
        qualityFindings(product, scope).map((finding) => finding.rule),
      ),
    ),
  ];
  return rules
    .flatMap((rule: RuleId): QualityIssue[] => {
      const affected = products.filter((product) =>
        qualityFindings(product, scope).some(
          (finding) => finding.rule === rule,
        ),
      );
      const findings = affected.flatMap((product) =>
        qualityFindings(product, scope).filter(
          (finding) => finding.rule === rule,
        ),
      );
      const finding = findings[0];
      if (!finding) return [];
      const severity = findings.reduce<Severity>((worst, current) => {
        const candidate = severityFor(current, scope);
        return candidate && SEVERITY_RANK[candidate] > SEVERITY_RANK[worst]
          ? candidate
          : worst;
      }, severityFor(finding, scope) ?? "info");
      return [
        { ...finding, count: affected.length, products: affected, severity },
      ];
    })
    .sort(
      (first, second) =>
        SEVERITY_RANK[second.severity] - SEVERITY_RANK[first.severity] ||
        second.count - first.count ||
        first.rule.localeCompare(second.rule),
    );
};

/** Disjoint buckets; advisory-only products count in the no-blocker/warning share. */
export const qualitySummary = (
  products: ListingReport[] | undefined,
  scope: QualityScope,
) => {
  if (!products) return null;
  const statuses = products.map((product) => qualityStatus(product, scope));
  const count = (status: ListingStatus) =>
    statuses.filter((entry) => entry === status).length;
  const ready = count("ready");
  const info = count("info");
  return {
    total: products.length,
    blocker: count("blocker"),
    warning: count("warning"),
    info,
    ready,
    readyShare: products.length
      ? Math.round(((ready + info) / products.length) * 100)
      : null,
  };
};
