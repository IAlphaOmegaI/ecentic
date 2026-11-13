import { describe, expect, test } from "bun:test";
import { translationPolicyVersion, translationReviewPasses } from "./policy";
import {
  adjudicateTranslationReport,
  type TranslationReviewReport,
  TranslationValidationError,
  translateTextUnits,
} from "./runner";

const report = (
  text = "Review catalogs.",
  target = "Examinez les catalogues.",
): TranslationReviewReport => ({
  policyVersion: translationPolicyVersion,
  targetLocale: "fr",
  stage: "corrected",
  reviewed: ["body"],
  passes: translationReviewPasses,
  findings: [
    {
      id: "body",
      pass: "terminology",
      message: "catalogues is not glossary singular catalogue",
    },
  ],
  deterministicFindings: [],
  reviewedUnits: [{ id: "body", text, target, context: "Catalog management" }],
  humanReview: "not_requested",
  runtimeReview: "not_performed",
});
const decision = (
  classification = "not-material",
  sourceQuote = "catalogs",
  targetQuote = "catalogues",
) => ({
  decisions: [
    {
      id: "finding-0",
      classification,
      sourceQuote,
      targetQuote,
      rationale:
        "The plural preserves the plural source and is normal French inflection.",
    },
  ],
});

describe("final finding adjudication", () => {
  test("clears a pedantic finding with exact evidence, without changing any copy", async () => {
    const original = report();
    const checked = await adjudicateTranslationReport({
      report: original,
      generate: async () => decision(),
    });
    expect(checked.findings).toEqual([]);
    expect(checked.reviewedUnits).toEqual(original.reviewedUnits);
    expect(checked.stage).toBe("adjudicated");
    expect(checked.adjudication?.originalFindings).toEqual(original.findings);
    expect(checked.adjudication?.decisions[0]?.evidenceValid).toBe(true);
  });
  test("does not submit or discard a deterministic numeric fault", async () => {
    const original = report("Costs $14.90.", "Coûte $99.");
    const checked = await adjudicateTranslationReport({
      report: { ...original, findings: [] },
      generate: async () => {
        throw new Error("Must not call the model for deterministic findings");
      },
    });
    expect(
      checked.findings.some((finding) =>
        finding.message.startsWith("Numeric facts differ"),
      ),
    ).toBe(true);
  });
  test("keeps a historical deterministic finding locked even after validator behavior changes", async () => {
    const original = report("Two hands", "2 mains");
    const checked = await adjudicateTranslationReport({
      report: {
        ...original,
        deterministicFindings: undefined,
        findings: [
          {
            id: "body",
            pass: "structural",
            message:
              "Numeric facts differ from the source (including signs, amounts, counts or versions).",
          },
        ],
      },
      generate: async () => {
        throw new Error("Must remain locked");
      },
    });
    expect(checked.findings).toHaveLength(1);
  });
  test("uncertain and material findings remain blocked", async () => {
    for (const classification of ["uncertain", "material"]) {
      const checked = await adjudicateTranslationReport({
        report: report(),
        generate: async () => decision(classification),
      });
      expect(checked.findings).toHaveLength(1);
    }
  });
  test("fabricated evidence cannot clear a finding", async () => {
    const checked = await adjudicateTranslationReport({
      report: report(),
      generate: async () => decision("not-material", "invented source phrase"),
    });
    expect(checked.findings).toHaveLength(1);
    expect(checked.adjudication?.decisions[0]?.classification).toBe(
      "uncertain",
    );
    expect(checked.adjudication?.decisions[0]?.evidenceValid).toBe(false);
  });
  test("requires all finding IDs and final six-pass provenance", async () => {
    await expect(
      adjudicateTranslationReport({
        report: report(),
        generate: async () => ({ decisions: [] }),
      }),
    ).rejects.toThrow("missing, duplicate or unexpected");
    await expect(
      adjudicateTranslationReport({
        report: { ...report(), stage: "draft" },
        generate: async () => decision(),
      }),
    ).rejects.toThrow("final corrected review");
  });
  test("uses a fifth evidence request after one correction, never a third draft", async () => {
    const phases: string[] = [];
    const result = await translateTextUnits({
      units: [
        { id: "body", text: "Review catalogs.", context: "Catalog management" },
      ],
      targetLocale: "fr",
      generate: async ({ phase }) => {
        phases.push(phase);
        if (phase === "adjudicate") return decision();
        if (phase !== "review")
          return { units: [{ id: "body", text: "Examinez les catalogues." }] };
        return {
          checkedPasses: translationReviewPasses,
          reviewedIds: ["body"],
          issues: [
            {
              id: "body",
              pass: "terminology",
              message: "catalogues is not glossary singular catalogue",
            },
          ],
        };
      },
    });
    expect(result).toEqual([{ id: "body", text: "Examinez les catalogues." }]);
    expect(phases).toEqual([
      "draft",
      "review",
      "correct",
      "review",
      "adjudicate",
    ]);
  });
  test("exposes independently approved rows when adjudication leaves uncertainty", async () => {
    const result = await translateTextUnits({
      units: [
        { id: "body", text: "Review catalogs.", context: "Catalog management" },
      ],
      targetLocale: "fr",
      generate: async ({ phase }) => {
        if (phase === "adjudicate") return decision("uncertain");
        if (phase !== "review")
          return { units: [{ id: "body", text: "Examinez les catalogues." }] };
        return {
          checkedPasses: translationReviewPasses,
          reviewedIds: ["body"],
          issues: [
            {
              id: "body",
              pass: "terminology",
              message: "Requires terminology decision",
            },
          ],
        };
      },
    }).catch((error: unknown) => error);
    expect(result).toBeInstanceOf(TranslationValidationError);
    if (result instanceof TranslationValidationError)
      expect(result.rejectedUnits).toHaveLength(1);
  });
});
