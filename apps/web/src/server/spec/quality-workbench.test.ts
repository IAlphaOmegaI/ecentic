import { describe, expect, test } from "bun:test";
import {
  qualityFindings,
  qualityIssues,
  qualityStatus,
  qualitySummary,
} from "@/app/[locale]/(main)/dashboard/[store]/quality/_components/quality-data";
import type { ListingReport } from "../app/intelligence/listing-quality";
import {
  type Finding,
  PLATFORMS,
  RULES,
  type RuleId,
  statusFor,
} from "../app/intelligence/listing-rules";

const finding = (rule: RuleId): Finding => {
  const definition = RULES.find((entry) => entry.id === rule);
  if (!definition) throw new Error(`Missing fixture rule: ${rule}`);
  return {
    rule,
    attribute: definition.attribute,
    universal: definition.universal,
    platforms: PLATFORMS.flatMap((platform) => {
      const verdict = definition.platforms[platform];
      return verdict ? [{ platform, verdict }] : [];
    }),
  };
};

const product = (id: string, findings: Finding[]): ListingReport => ({
  id,
  title: `Product ${id}`,
  image: null,
  link: null,
  findings,
  status: {
    universal: statusFor(findings, "universal"),
    google: statusFor(findings, "google"),
    chatgpt: statusFor(findings, "chatgpt"),
  },
});

describe("Data Quality workbench evidence", () => {
  test("missing data, no active listings, and measured zero are distinct", () => {
    expect(qualitySummary(undefined, "all")).toBeNull();
    expect(qualitySummary([], "all")).toEqual({
      total: 0,
      blocker: 0,
      warning: 0,
      info: 0,
      ready: 0,
      readyShare: null,
    });
    expect(
      qualitySummary([product("blocked", [finding("title-missing")])], "all")
        ?.readyShare,
    ).toBe(0);
  });

  test("surface results preserve the registry's different severity and applicability", () => {
    const listing = product("limits", [finding("id-too-long")]);
    expect(qualityStatus(listing, "google")).toBe("blocker");
    expect(qualityStatus(listing, "chatgpt")).toBe("warning");
    expect(qualityStatus(listing, "universal")).toBe("warning");
    expect(qualityStatus(listing, "all")).toBe("blocker");

    const platformOnly = product("images", [finding("image-too-many")]);
    expect(qualityFindings(platformOnly, "universal")).toEqual([]);
    expect(qualityStatus(platformOnly, "universal")).toBe("ready");
    expect(qualityIssues([platformOnly], "universal")).toEqual([]);
    expect(qualityStatus(platformOnly, "chatgpt")).toBe("info");
  });

  test("counts disjoint product statuses while retaining advisory-only passes", () => {
    const advisory: Finding = {
      rule: "mpn-missing-without-gtin",
      attribute: "mpn",
      universal: "info",
      platforms: [],
    };
    const listings = [
      product("ready", []),
      product("advisory", [advisory]),
      product("warning", [finding("title-all-caps")]),
      product("blocked", [finding("title-missing"), finding("title-all-caps")]),
    ];
    expect(qualitySummary(listings, "all")).toEqual({
      total: 4,
      blocker: 1,
      warning: 1,
      info: 1,
      ready: 1,
      readyShare: 50,
    });
    expect(
      qualityIssues(listings, "all").map((issue) => issue.severity),
    ).toEqual(["blocker", "warning", "info"]);
  });

  test("a rule counts each affected product once and prioritizes severity before prevalence", () => {
    const missing = finding("title-missing");
    const warning = finding("title-all-caps");
    const listings = [
      product("one", [missing, missing, warning]),
      product("two", [warning]),
      product("three", [warning]),
    ];
    expect(
      qualityIssues(listings, "all").map(({ rule, count, products }) => ({
        rule,
        count,
        ids: products.map((entry) => entry.id),
      })),
    ).toEqual([
      { rule: "title-missing", count: 1, ids: ["one"] },
      { rule: "title-all-caps", count: 3, ids: ["one", "two", "three"] },
    ]);
  });

  test("the issue queue includes rules after the former eight-item limit", () => {
    const findings = RULES.slice(0, 12).map((rule) => finding(rule.id));
    const issues = qualityIssues([product("many", findings)], "all");
    expect(issues).toHaveLength(12);
    expect(new Set(issues.map((issue) => issue.rule))).toEqual(
      new Set(findings.map((entry) => entry.rule)),
    );
    expect(issues.every((issue) => issue.count === 1)).toBe(true);
  });

  test("per-surface statuses agree with the existing rule engine across the registry", () => {
    for (const rule of RULES) {
      const listing = product(rule.id, [finding(rule.id)]);
      for (const surface of ["universal", "google", "chatgpt"] as const)
        expect(qualityStatus(listing, surface)).toBe(listing.status[surface]);
    }
  });
});
