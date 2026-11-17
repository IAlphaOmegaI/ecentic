import { expect, test } from "bun:test";
import { splitList } from "@/lib/outbound";
import { campaignCriteriaSchema } from "@/lib/outbound-campaigns";
import { campaignCriteriaFormValues } from "./criteria-values";

test("campaign list prefills survive single-line input normalization", () => {
  const criteria = campaignCriteriaSchema.parse({
    objective: "Find consumer brands",
    qualificationNotes: "",
    countries: ["US", "GB", "DE"],
    platforms: ["shopify", "woocommerce"],
    keywords: ["consumer brand", "direct-to-consumer", "DTC"],
    excludedKeywords: ["marketing agency", "consulting", "software"],
    targetRoles: ["Founder", "CEO"],
    excludedRoles: ["Intern"],
    excludedDomains: ["example.com", "example.org"],
    teamSizeMin: null,
    teamSizeMax: 50,
    annualRevenueMin: 1000000,
    annualRevenueMax: null,
  });
  const values = campaignCriteriaFormValues(criteria);

  for (const key of ["countries", "keywords", "excludedKeywords"] as const) {
    // A text input removes line breaks from its value before submission.
    const submittedValue = (values[key] ?? "").replace(/[\r\n]/g, "");
    expect(splitList(submittedValue)).toEqual(criteria[key]);
  }
  for (const key of [
    "targetRoles",
    "excludedRoles",
    "excludedDomains",
  ] as const)
    expect(splitList(values[key] ?? "")).toEqual(criteria[key]);
});
