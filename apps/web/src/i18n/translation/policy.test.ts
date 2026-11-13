import { expect, test } from "bun:test";
import {
  type BlogTranslationSource,
  blogSourceHash,
} from "@/lib/blog-translation-content";
import { locales } from "../locales";
import {
  translationInstructions,
  translationPolicyVersion,
  translationPolicyVersionFor,
  translationReviewPasses,
} from "./policy";
import { type TranslationReviewReport, translateTextUnits } from "./runner";

test("Spanish policy changes leave all other locale source hashes unchanged", () => {
  const source: BlogTranslationSource = {
    slug: "example",
    source: "local",
    externalId: null,
    title: "Guide",
    description: "A guide",
    introduction: "Read the guide.",
    category: "Guide",
    tags: [],
    takeaways: [],
    sections: [],
    faqs: [],
    contentHtml: null,
    publishedAt: "2026-11-13",
    thumbnailUrl: null,
  };
  const originalHash = blogSourceHash(source, translationPolicyVersion);
  for (const locale of locales.filter((locale) => locale !== "es")) {
    expect(translationPolicyVersionFor(locale)).toBe("2026-11-12.2");
    expect(blogSourceHash(source, translationPolicyVersionFor(locale))).toBe(
      originalHash,
    );
  }
  expect(translationPolicyVersionFor("es")).toBe("2026-11-13.1");
  expect(blogSourceHash(source, translationPolicyVersionFor("es"))).not.toBe(
    originalHash,
  );
  expect(translationInstructions("es")).toContain("último contacto");
  expect(translationInstructions("es")).toContain(
    "complete Spanish paragraphs",
  );
});

test("Spanish reviewed artifacts pin the actual Spanish requirements", async () => {
  const reports: TranslationReviewReport[] = [];
  await translateTextUnits({
    units: [
      {
        id: "label",
        text: "Last-touch attribution",
        context: "Attribution model label",
      },
    ],
    targetLocale: "es",
    generate: async (request) =>
      request.phase === "draft"
        ? { units: [{ id: "label", text: "Atribución de último contacto" }] }
        : {
            checkedPasses: translationReviewPasses,
            reviewedIds: ["label"],
            issues: [],
          },
    onReview: (report) => {
      reports.push(report);
    },
  });
  expect(reports).toHaveLength(1);
  expect(reports[0]?.policyVersion).toBe("2026-11-13.1");
});
