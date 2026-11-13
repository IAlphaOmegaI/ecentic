import type { Locale } from "@/i18n/locales";
import {
  type TranslationGenerator,
  type TranslationReviewReport,
  type TranslationUnit,
  translateTextUnits,
} from "@/i18n/translation/runner";
import { nextBlogTranslationBatch } from "@/lib/blog-translation-content";

/** One fresh review of legacy rejected targets under the corrected source/slot contract. */
export const blogBlockedReviewVersion = "2026-11-13.1";

export type BlockedBlogUnit = {
  text: string;
  findings: readonly { id: string; pass: string; message: string }[];
  reviewVersion?: string;
};

export const nextBlockedBlogBatch = (
  units: readonly TranslationUnit[],
  blocked: Readonly<Record<string, BlockedBlogUnit>>,
  characterLimit: number,
  unitLimit: number,
) =>
  nextBlogTranslationBatch(
    units.filter((unit) => {
      const rejected = blocked[unit.id];
      return rejected && rejected.reviewVersion !== blogBlockedReviewVersion;
    }),
    {},
    characterLimit,
    {},
    unitLimit,
  );

/** Reuse the rejected copy as the draft; every review and correction is a fresh model request. */
export const reviewExistingBlogUnits = ({
  units,
  blocked,
  targetLocale,
  documentContext,
  generate,
  onReview,
}: {
  units: readonly TranslationUnit[];
  blocked: Readonly<Record<string, BlockedBlogUnit>>;
  targetLocale: Locale;
  documentContext: string;
  generate: TranslationGenerator;
  onReview?: (report: TranslationReviewReport) => void | Promise<void>;
}) => {
  const cached = units.map((unit) => {
    const rejected = blocked[unit.id];
    if (!rejected) throw new Error(`Missing rejected target ${unit.id}`);
    return { id: unit.id, text: rejected.text };
  });
  return translateTextUnits({
    units,
    targetLocale,
    documentContext: `${documentContext} Review provenance: existing rejected targets are being reviewed afresh (${blogBlockedReviewVersion}); no source or approved sibling may be rewritten. Inspect the complete connected source and target group. Correct actual errors; retain idiomatic, faithful wording.`,
    generate: (request) =>
      request.phase === "draft"
        ? Promise.resolve({ units: cached })
        : generate(request),
    onReview,
  });
};
