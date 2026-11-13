/** Standalone write rail: no Next request APIs, so CLI and cron share resumable work. */

import { randomUUID } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { isLocale, type Locale, locales } from "@/i18n/locales";
import { translationReviewPasses } from "@/i18n/translation/policy";
import {
  isTranslationEnvelopeFailure,
  translationRetryDisposition,
} from "@/i18n/translation/retry";
import {
  type TranslationGenerator,
  type TranslationReviewReport,
  type TranslationUnit,
  TranslationValidationError,
  translateTextUnits,
  translationPolicyVersionFor,
  validateTranslationUnit,
} from "@/i18n/translation/runner";
import { blogReadingMinutes } from "@/lib/blog-locale";
import {
  type BlogTranslationSource,
  blogBatchContext,
  blogSourceHash,
  createBlogTranslation,
  nextBlogTranslationBatch,
} from "@/lib/blog-translation-content";
import {
  absentBlogTranslationTarget,
  blogTranslationTargetHash,
  blogTranslationTargetMatches,
} from "@/lib/blog-translation-target";
import { db, schema } from "@/server/database";
import {
  blogBlockedReviewVersion,
  nextBlockedBlogBatch,
  reviewExistingBlogUnits,
} from "./blog-translation-review";

export type BlogTargetLocale = Exclude<Locale, "en">;
export const blogTargetLocales = locales.filter(
  (locale): locale is BlogTargetLocale => locale !== "en",
);
const jobs = schema.blogTranslation;
const posts = schema.blogPost;

export const toBlogTranslationSource = (
  post: typeof posts.$inferSelect,
): BlogTranslationSource => ({
  slug: post.slug,
  source: post.source,
  externalId: post.externalId,
  title: post.title,
  description: post.description,
  introduction: post.introduction,
  category: post.category,
  tags: post.tags,
  takeaways: post.takeaways,
  faqs: post.faqs,
  sections: post.sections,
  contentHtml: post.contentHtml,
  publishedAt: post.publishedAt,
  thumbnailUrl: post.thumbnailUrl,
});

export const listBlogTranslationSources = async () =>
  db
    .select()
    .from(posts)
    .where(and(eq(posts.locale, "en"), eq(posts.status, "published")))
    .orderBy(asc(posts.publishedAt), asc(posts.slug));

/** Snapshot locale coverage once, then upsert bounded job groups. Existing reviewed legacy rows stay intact. */
export const enqueueBlogTranslationSources = async (
  sources: readonly (typeof posts.$inferSelect)[],
  targets: readonly BlogTargetLocale[] = blogTargetLocales,
  { replacePublished = false } = {},
) => {
  if (!sources.length || !targets.length) return [];
  const slugs = sources.map((source) => source.slug);
  const [published, tracked] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(
        and(inArray(posts.slug, slugs), inArray(posts.locale, [...targets])),
      ),
    db
      .select({ slug: jobs.slug, locale: jobs.locale })
      .from(jobs)
      .where(
        and(inArray(jobs.slug, slugs), inArray(jobs.locale, [...targets])),
      ),
  ]);
  const key = (slug: string, locale: string) => JSON.stringify([slug, locale]);
  const existing = new Set(
    published
      .filter((row) => row.status === "published")
      .map((row) => key(row.slug, row.locale)),
  );
  const targetSnapshots = new Map(
    published.map((row) => [key(row.slug, row.locale), row]),
  );
  const known = new Set(tracked.map((row) => key(row.slug, row.locale)));
  const values = sources.flatMap((source) => {
    const content = toBlogTranslationSource(source);
    const totalUnits = createBlogTranslation(content).units.length;
    return targets
      .filter(
        (locale) =>
          replacePublished ||
          !existing.has(key(source.slug, locale)) ||
          known.has(key(source.slug, locale)),
      )
      .map((locale) => ({
        slug: source.slug,
        locale,
        sourceHash: blogSourceHash(
          content,
          translationPolicyVersionFor(locale),
        ),
        targetSnapshotHash: blogTranslationTargetHash(
          targetSnapshots.get(key(source.slug, locale)) ?? null,
        ),
        policyVersion: translationPolicyVersionFor(locale),
        totalUnits,
      }));
  });
  for (const offset of Array.from(
    { length: Math.ceil(values.length / 100) },
    (_, index) => index * 100,
  )) {
    await db
      .insert(jobs)
      .values(values.slice(offset, offset + 100))
      .onConflictDoUpdate({
        target: [jobs.slug, jobs.locale],
        set: {
          sourceHash: sql`excluded."sourceHash"`,
          targetSnapshotHash: sql`excluded."targetSnapshotHash"`,
          policyVersion: sql`excluded."policyVersion"`,
          totalUnits: sql`excluded."totalUnits"`,
          status: "pending",
          completedUnits: {},
          blockedUnits: {},
          attempts: 0,
          availableAt: new Date(),
          lockedUntil: null,
          lease: null,
          error: null,
          updatedAt: new Date(),
        },
        setWhere: sql`${jobs.sourceHash} <> excluded."sourceHash"`,
      });
  }
  return values.map(({ slug, locale }) => ({ slug, locale }));
};

export const enqueueBlogTranslations = async (
  source: typeof posts.$inferSelect,
  targets: readonly BlogTargetLocale[] = blogTargetLocales,
  options = {},
) =>
  (await enqueueBlogTranslationSources([source], targets, options)).map(
    (job) => job.locale,
  );

export { nextBlogTranslationBatch } from "@/lib/blog-translation-content";

const claim = async (
  targets: readonly BlogTargetLocale[],
  slugs?: readonly string[],
  reviewBlocked = false,
) =>
  db.transaction(async (transaction) => {
    const now = new Date();
    const [job] = await transaction
      .select()
      .from(jobs)
      .where(
        and(
          inArray(
            jobs.status,
            reviewBlocked
              ? ["pending", "processing", "blocked"]
              : ["pending", "processing"],
          ),
          reviewBlocked
            ? sql`EXISTS (SELECT 1 FROM jsonb_each(${jobs.blockedUnits}) AS entry WHERE entry.value->>'reviewVersion' IS DISTINCT FROM ${blogBlockedReviewVersion})`
            : undefined,
          inArray(jobs.locale, [...targets]),
          lte(jobs.availableAt, now),
          or(isNull(jobs.lockedUntil), lte(jobs.lockedUntil, now)),
          slugs ? inArray(jobs.slug, [...slugs]) : undefined,
        ),
      )
      .orderBy(
        ...(reviewBlocked
          ? [
              asc(sql`${jobs.totalUnits}
                - (SELECT count(*)::int FROM jsonb_object_keys(${jobs.completedUnits}))
                - (SELECT count(*)::int FROM jsonb_object_keys(${jobs.blockedUnits}))`),
            ]
          : []),
        asc(jobs.availableAt),
        asc(jobs.createdAt),
      )
      .limit(1)
      .for("update", { skipLocked: true });
    if (!job) return null;
    const lease = randomUUID();
    const [claimed] = await transaction
      .update(jobs)
      .set({
        lease,
        status: "processing",
        lockedUntil: new Date(Date.now() + 10 * 60_000),
        updatedAt: now,
      })
      .where(eq(jobs.id, job.id))
      .returning();
    return claimed ?? null;
  });

const reset = (
  source: typeof posts.$inferSelect,
  target: typeof posts.$inferSelect | null,
  locale: string,
) => {
  const content = toBlogTranslationSource(source);
  return {
    sourceHash: blogSourceHash(content, translationPolicyVersionFor(locale)),
    targetSnapshotHash: blogTranslationTargetHash(target),
    policyVersion: translationPolicyVersionFor(locale),
    totalUnits: createBlogTranslation(content).units.length,
    completedUnits: {},
    blockedUnits: {},
    status: "pending",
    attempts: 0,
    availableAt: new Date(),
    lockedUntil: null,
    lease: null,
    error: null,
    updatedAt: new Date(),
  };
};

/** Source row + lease are locked for the atomic publication, so stale source work cannot win a race. */
const finish = async (
  job: typeof jobs.$inferSelect,
  completed: Record<string, string>,
) =>
  db.transaction(async (transaction) => {
    const [owned] = await transaction
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, job.id), eq(jobs.lease, job.lease ?? "")))
      .limit(1)
      .for("update");
    if (!owned) return "lease-lost" as const;
    const [source] = await transaction
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.slug, job.slug),
          eq(posts.locale, "en"),
          eq(posts.status, "published"),
        ),
      )
      .limit(1)
      .for("update");
    if (!source) {
      await transaction
        .update(jobs)
        .set({
          status: "blocked",
          error: "English source is not published",
          lease: null,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));
      return "blocked" as const;
    }
    const content = toBlogTranslationSource(source);
    const [target] = await transaction
      .select()
      .from(posts)
      .where(and(eq(posts.slug, job.slug), eq(posts.locale, job.locale)))
      .limit(1)
      .for("update");
    if (
      blogSourceHash(content, translationPolicyVersionFor(job.locale)) !==
      job.sourceHash
    ) {
      await transaction
        .update(jobs)
        .set(reset(source, target ?? null, job.locale))
        .where(eq(jobs.id, job.id));
      return "source-changed" as const;
    }
    if (!isLocale(job.locale) || job.locale === "en")
      throw new Error("Invalid translation target locale");
    const targetChanged = async () => {
      await transaction
        .update(jobs)
        .set({
          status: "blocked",
          completedUnits: completed,
          blockedUnits: {},
          error:
            "Published target changed after translation began; reviewed work retained",
          lease: null,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));
      return "target-changed" as const;
    };
    if (!blogTranslationTargetMatches(owned.targetSnapshotHash, target ?? null))
      return targetChanged();
    const translated = createBlogTranslation(content).apply(
      new Map(Object.entries(completed)),
    );
    const payload = {
      ...translated,
      source: source.source,
      locale: job.locale,
      status: "published",
      readTime: `${blogReadingMinutes(translated.contentHtml ?? translated.sections.map((section) => section.content).join("\n"), job.locale)} min`,
      updatedAt: new Date(),
    };
    if (owned.targetSnapshotHash === absentBlogTranslationTarget) {
      // A row can be inserted after an absent-target read. Never upsert over it.
      const inserted = await transaction
        .insert(posts)
        .values(payload)
        .onConflictDoNothing({ target: [posts.slug, posts.locale] })
        .returning({ id: posts.id });
      if (!inserted.length) return targetChanged();
    } else if (target && owned.targetSnapshotHash !== null) {
      await transaction
        .update(posts)
        .set(payload)
        .where(eq(posts.id, target.id));
    } else {
      // Completed legacy jobs predate target snapshots; preserve their behavior.
      await transaction
        .insert(posts)
        .values(payload)
        .onConflictDoUpdate({
          target: [posts.slug, posts.locale],
          set: payload,
        });
    }
    await transaction
      .update(jobs)
      .set({
        status: "completed",
        completedUnits: completed,
        blockedUnits: {},
        lease: null,
        lockedUntil: null,
        error: null,
        attempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));
    return "published" as const;
  });

export const drainBlogTranslationBatch = async ({
  generate,
  targets = blogTargetLocales,
  slug,
  slugs,
  characterLimit = 4500,
  unitLimit = 48,
  onReview,
  reviewBlocked = false,
}: {
  generate: TranslationGenerator;
  targets?: readonly BlogTargetLocale[];
  slug?: string;
  slugs?: readonly string[];
  characterLimit?: number;
  unitLimit?: number;
  onReview?: (report: TranslationReviewReport) => void | Promise<void>;
  reviewBlocked?: boolean;
}) => {
  const job = await claim(
    targets,
    slugs ?? (slug ? [slug] : undefined),
    reviewBlocked,
  );
  if (!job) return { status: "idle" as const };
  const work = {
    units: [] as readonly TranslationUnit[],
    batch: [] as readonly TranslationUnit[],
  };
  const operation = await resultify(async () => {
    if (!isLocale(job.locale) || job.locale === "en")
      throw new Error("Invalid translation target locale");
    const [source] = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.slug, job.slug),
          eq(posts.locale, "en"),
          eq(posts.status, "published"),
        ),
      )
      .limit(1);
    if (!source) throw new Error("English source is not published");
    const content = toBlogTranslationSource(source);
    if (
      blogSourceHash(content, translationPolicyVersionFor(job.locale)) !==
      job.sourceHash
    ) {
      const [target] = await db
        .select()
        .from(posts)
        .where(and(eq(posts.slug, job.slug), eq(posts.locale, job.locale)))
        .limit(1);
      await db
        .update(jobs)
        .set(reset(source, target ?? null, job.locale))
        .where(and(eq(jobs.id, job.id), eq(jobs.lease, job.lease ?? "")));
      return "source-changed" as const;
    }
    const article = createBlogTranslation(content);
    work.units = article.units;
    const batch = reviewBlocked
      ? nextBlockedBlogBatch(
          article.units,
          job.blockedUnits,
          characterLimit,
          unitLimit,
        )
      : nextBlogTranslationBatch(
          article.units,
          job.completedUnits,
          characterLimit,
          job.blockedUnits,
          unitLimit,
        );
    work.batch = batch;
    if (!batch.length && Object.keys(job.blockedUnits).length) {
      await db
        .update(jobs)
        .set({
          status: "blocked",
          lease: null,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(and(eq(jobs.id, job.id), eq(jobs.lease, job.lease ?? "")));
      return "blocked" as const;
    }
    const context = blogBatchContext(
      article.units,
      batch,
      article.documentContext,
      job.completedUnits,
    );
    const translate = reviewBlocked
      ? reviewExistingBlogUnits
      : translateTextUnits;
    const translated = batch.length
      ? await translate({
          units: context.units,
          targetLocale: job.locale,
          documentContext: context.documentContext,
          generate,
          blocked: job.blockedUnits,
          onReview: async (report) => {
            const renewed = await db
              .update(jobs)
              .set({
                lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
                updatedAt: new Date(),
              })
              .where(and(eq(jobs.id, job.id), eq(jobs.lease, job.lease ?? "")))
              .returning({ id: jobs.id });
            if (!renewed.length)
              throw new Error("Translation job lease lost during review");
            await onReview?.(report);
          },
        })
      : [];
    const completed = {
      ...job.completedUnits,
      ...Object.fromEntries(translated.map((unit) => [unit.id, unit.text])),
    };
    const blockedUnits = Object.fromEntries(
      Object.entries(job.blockedUnits).filter(
        ([id]) => completed[id] === undefined,
      ),
    );
    if (article.units.every((unit) => completed[unit.id] !== undefined))
      return finish(job, completed);
    const updated = await db
      .update(jobs)
      .set({
        completedUnits: completed,
        blockedUnits,
        status: "pending",
        lease: null,
        lockedUntil: null,
        attempts: 0,
        availableAt: new Date(),
        error: null,
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, job.id), eq(jobs.lease, job.lease ?? "")))
      .returning({ id: jobs.id });
    return updated.length ? ("checkpointed" as const) : ("lease-lost" as const);
  });
  if (!operation.success) {
    const error =
      operation.error instanceof Error
        ? operation.error.message
        : String(operation.error);
    const retry = translationRetryDisposition(error, job.attempts);
    const semantic =
      !isTranslationEnvelopeFailure(error) &&
      (operation.error instanceof TranslationValidationError ||
        /protected|missing.*unit|markup|fidelity/i.test(error));
    // A completed editorial review is not a transport failure. Keep the retry
    // budget for consecutive network/envelope failures on the next request.
    const attempts = semantic ? 0 : retry.attempts;
    const approved =
      operation.error instanceof TranslationValidationError
        ? operation.error.approvedUnits
        : [];
    const completedUnits = {
      ...job.completedUnits,
      ...Object.fromEntries(approved.map((unit) => [unit.id, unit.text])),
    };
    const rejected =
      operation.error instanceof TranslationValidationError
        ? operation.error.rejectedUnits
        : [];
    const findings =
      operation.error instanceof TranslationValidationError
        ? operation.error.findings
        : [];
    const blockedUnits = {
      ...Object.fromEntries(
        Object.entries(job.blockedUnits).filter(
          ([id]) => completedUnits[id] === undefined,
        ),
      ),
      ...(semantic
        ? Object.fromEntries(
            (rejected.length
              ? rejected
              : work.batch
                  .filter((unit) => completedUnits[unit.id] === undefined)
                  .map((unit) => ({ id: unit.id, text: "" }))
            ).map((unit) => [
              unit.id,
              {
                text: unit.text,
                findings: findings.filter(
                  (finding) => finding.id === unit.id || finding.id === "batch",
                ),
                ...(reviewBlocked
                  ? { reviewVersion: blogBlockedReviewVersion }
                  : {}),
              },
            ]),
          )
        : {}),
    };
    const hasIndependentUnits = work.units.some(
      (unit) =>
        completedUnits[unit.id] === undefined &&
        blockedUnits[unit.id] === undefined,
    );
    await db
      .update(jobs)
      .set({
        status: semantic
          ? hasIndependentUnits
            ? "pending"
            : "blocked"
          : retry.exhausted
            ? "blocked"
            : "pending",
        completedUnits,
        blockedUnits,
        attempts,
        availableAt: new Date(Date.now() + (semantic ? 0 : retry.delayMs)),
        lease: null,
        lockedUntil: null,
        error: error.slice(0, 1500),
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, job.id), eq(jobs.lease, job.lease ?? "")));
    return {
      status:
        !semantic && retry.rateLimited
          ? ("rate-limited" as const)
          : ("failed" as const),
      slug: job.slug,
      locale: job.locale,
      error,
    };
  }
  return { status: operation.data, slug: job.slug, locale: job.locale };
};

export const blogTranslationProgress = async (
  targets: readonly BlogTargetLocale[] = blogTargetLocales,
) =>
  db
    .select({
      slug: jobs.slug,
      locale: jobs.locale,
      status: jobs.status,
      sourceHash: jobs.sourceHash,
      blocked: sql<number>`(SELECT count(*)::int FROM jsonb_object_keys(${jobs.blockedUnits}))`,
      completed: sql<number>`(SELECT count(*)::int FROM jsonb_object_keys(${jobs.completedUnits}))`,
      totalUnits: jobs.totalUnits,
      error: jobs.error,
    })
    .from(jobs)
    .where(inArray(jobs.locale, [...targets]));

/** Targeted corrections require the exact source version and a clean six-pass review of the supplied targets. */
export const blogReviewPatchSchema = z.object({
  slug: z.string().min(1),
  locale: z.string(),
  sourceHash: z.string().min(1),
  policyVersion: z.string().min(1),
  units: z.array(z.object({ id: z.string(), text: z.string() })).min(1),
  review: z.object({
    policyVersion: z.string(),
    targetLocale: z.string(),
    passes: z.array(z.string()),
    findings: z.array(
      z.object({ id: z.string(), pass: z.string(), message: z.string() }),
    ),
    reviewedUnits: z.array(
      z.object({ id: z.string(), text: z.string(), target: z.string() }),
    ),
  }),
});

export const applyBlogTranslationReview = async (input: unknown) => {
  const patch = blogReviewPatchSchema.parse(input);
  if (!isLocale(patch.locale) || patch.locale === "en")
    throw new Error("Invalid target locale");
  const locale = patch.locale;
  if (
    patch.policyVersion !== translationPolicyVersionFor(locale) ||
    patch.review.policyVersion !== translationPolicyVersionFor(locale) ||
    patch.review.targetLocale !== locale ||
    patch.review.findings.length ||
    !translationReviewPasses.every((pass) => patch.review.passes.includes(pass))
  )
    throw new Error("A clean current-policy six-pass review is required");
  if (
    new Set(patch.review.reviewedUnits.map((unit) => unit.id)).size !==
    patch.review.reviewedUnits.length
  )
    throw new Error("Duplicate review record IDs");
  if (new Set(patch.units.map((unit) => unit.id)).size !== patch.units.length)
    throw new Error("Duplicate review patch IDs");
  return db.transaction(async (transaction) => {
    const [job] = await transaction
      .select()
      .from(jobs)
      .where(and(eq(jobs.slug, patch.slug), eq(jobs.locale, locale)))
      .limit(1)
      .for("update");
    if (!job || job.sourceHash !== patch.sourceHash)
      throw new Error("Review patch source hash does not match the job");
    if (job.lockedUntil && job.lockedUntil.getTime() > Date.now())
      throw new Error("Translation job is currently leased");
    const [source] = await transaction
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.slug, patch.slug),
          eq(posts.locale, "en"),
          eq(posts.status, "published"),
        ),
      )
      .limit(1)
      .for("update");
    if (
      !source ||
      blogSourceHash(
        toBlogTranslationSource(source),
        translationPolicyVersionFor(locale),
      ) !== patch.sourceHash
    )
      throw new Error("English source changed after this review");
    const article = createBlogTranslation(toBlogTranslationSource(source));
    const byId = new Map(article.units.map((unit) => [unit.id, unit]));
    for (const correction of patch.units) {
      const unit = byId.get(correction.id);
      if (!unit || !job.blockedUnits[correction.id])
        throw new Error(`Unit is not awaiting review: ${correction.id}`);
      const reviewed = patch.review.reviewedUnits.find(
        (entry) => entry.id === correction.id,
      );
      if (
        !reviewed ||
        reviewed.text !== unit.text ||
        reviewed.target !== correction.text
      )
        throw new Error(
          `Review does not cover the exact source and target: ${correction.id}`,
        );
      const findings = validateTranslationUnit(unit, correction.text, locale);
      if (findings.length) throw new TranslationValidationError(findings);
      if (!correction.text.trim() && unit.grammaticalArticle) {
        const group = article.units.filter(
          (entry) => entry.group === unit.group,
        );
        for (const sibling of group) {
          const target =
            patch.units.find((entry) => entry.id === sibling.id)?.text ??
            job.completedUnits[sibling.id];
          const evidence = patch.review.reviewedUnits.find(
            (entry) => entry.id === sibling.id,
          );
          if (
            target === undefined ||
            !evidence ||
            evidence.text !== sibling.text ||
            evidence.target !== target
          )
            throw new Error(
              `Grammatical article omission requires the complete reviewed inline group: ${unit.group}`,
            );
        }
      }
    }
    const corrected = new Set(patch.units.map((unit) => unit.id));
    const blockedUnits = Object.fromEntries(
      Object.entries(job.blockedUnits).filter(([id]) => !corrected.has(id)),
    );
    const completedUnits = {
      ...job.completedUnits,
      ...Object.fromEntries(patch.units.map((unit) => [unit.id, unit.text])),
    };
    const independent = article.units.some(
      (unit) =>
        completedUnits[unit.id] === undefined &&
        blockedUnits[unit.id] === undefined,
    );
    const status =
      !Object.keys(blockedUnits).length || independent ? "pending" : "blocked";
    await transaction
      .update(jobs)
      .set({
        completedUnits,
        blockedUnits,
        status,
        attempts: 0,
        availableAt: new Date(),
        lease: null,
        lockedUntil: null,
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));
    return {
      slug: patch.slug,
      locale,
      accepted: patch.units.map((unit) => unit.id),
      status,
    };
  });
};

export const exportBlockedBlogUnits = async (
  slugs: readonly string[],
  targets: readonly BlogTargetLocale[],
) => {
  if (!slugs.length) return [];
  const records = await db
    .select()
    .from(jobs)
    .where(
      and(inArray(jobs.slug, [...slugs]), inArray(jobs.locale, [...targets])),
    );
  const sources = await listBlogTranslationSources();
  return records
    .filter((job) => Object.keys(job.blockedUnits).length)
    .map((job) => {
      const source = sources.find((post) => post.slug === job.slug);
      const article = source
        ? createBlogTranslation(toBlogTranslationSource(source))
        : null;
      const units =
        article?.units.filter((unit) => job.blockedUnits[unit.id]) ?? [];
      return {
        slug: job.slug,
        locale: job.locale,
        sourceHash: job.sourceHash,
        policyVersion: job.policyVersion,
        sourceStillCurrent: Boolean(
          source &&
            blogSourceHash(
              toBlogTranslationSource(source),
              translationPolicyVersionFor(job.locale),
            ) === job.sourceHash,
        ),
        documentContext: article?.documentContext ?? "",
        contextUnits:
          article?.units.map((unit) => ({
            ...unit,
            target:
              job.completedUnits[unit.id] ??
              job.blockedUnits[unit.id]?.text ??
              null,
          })) ?? [],
        units: units.map((unit) => ({
          ...unit,
          ...job.blockedUnits[unit.id],
          source: unit.text,
        })),
      };
    });
};
