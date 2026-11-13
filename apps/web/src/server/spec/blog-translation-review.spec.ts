import { expect, test } from "bun:test";
import { translationReviewPasses } from "@/i18n/translation/policy";
import type { TranslationReviewReport } from "@/i18n/translation/runner";
import {
  blogBatchContext,
  createBlogHtmlTranslation,
} from "@/lib/blog-translation-content";
import {
  blogBlockedReviewVersion,
  nextBlockedBlogBatch,
  reviewExistingBlogUnits,
} from "../utils/blog-translation-review";

test("legacy rejected units receive one focused review, preserving group order", () => {
  const units = [
    { id: "old", text: "Original", context: "Paragraph", group: "one" },
    { id: "new", text: "Other", context: "Paragraph", group: "one" },
    { id: "pending", text: "Untranslated", context: "Paragraph" },
    { id: "reviewed", text: "Problem", context: "Paragraph" },
  ];
  const blocked = {
    old: { text: "Ancien", findings: [] },
    new: { text: "Autre", findings: [] },
    reviewed: {
      text: "Problème",
      findings: [],
      reviewVersion: blogBlockedReviewVersion,
    },
  };
  expect(
    nextBlockedBlogBatch(units, blocked, 4, 1).map((unit) => unit.id),
  ).toEqual(["old", "new"]);
});

test("cached copy still gets fresh six-pass review and actual correction without a draft call", async () => {
  const phases: string[] = [];
  const reports: TranslationReviewReport[] = [];
  const units = [
    { id: "price", text: "Price: $14.90", context: "Product price" },
  ];
  const translated = await reviewExistingBlogUnits({
    units,
    blocked: { price: { text: "Prix : $99", findings: [] } },
    targetLocale: "fr",
    documentContext: "A product price",
    generate: async (request) => {
      phases.push(request.phase);
      if (request.phase === "correct")
        return { units: [{ id: "price", text: "Prix : $14.90" }] };
      if (request.phase !== "review") throw new Error("Unexpected phase");
      return {
        checkedPasses: [...translationReviewPasses],
        reviewedIds: ["price"],
        issues: [],
      };
    },
    onReview: (report) => {
      reports.push(report);
    },
  });
  expect(translated).toEqual([{ id: "price", text: "Prix : $14.90" }]);
  expect(phases).toEqual(["review", "correct", "review"]);
  expect(reports[0]?.documentContext).toContain("existing rejected targets");
  expect(
    reports[0]?.findings.some((finding) =>
      finding.message.includes("Numeric facts differ"),
    ),
  ).toBe(true);
  expect(reports.at(-1)?.findings).toEqual([]);
});

test("review context supplies approved inline siblings without retranslating their slots", () => {
  const article = createBlogHtmlTranslation(
    '<p>The <a href="/catalog">catalog</a> is ready.</p>',
  );
  const articleUnit = article.units[0];
  expect(articleUnit).toBeDefined();
  const context = blogBatchContext(
    article.units,
    articleUnit ? [articleUnit] : [],
    "Article",
    {
      "html.body.0.1.0": "商品目录",
      "html.body.0.2": "已就绪。",
    },
  );
  expect(context.units).toHaveLength(1);
  expect(context.documentContext).toContain('"approvedTarget":"商品目录"');
  expect(context.documentContext).toContain('href=\\"/catalog\\"');
});
