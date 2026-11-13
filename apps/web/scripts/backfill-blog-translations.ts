/**
 * Backfill from corrected, published English rows. Existing reviewed locale rows stay intact.
 * Dry-run is the default. Explicit --write is required to enqueue or publish anything.
 * bun --env-file=.env.local scripts/backfill-blog-translations.ts --locales fr,de,it,ja,zh-CN --dry-run
 * bun --env-file=.env.local scripts/backfill-blog-translations.ts --write --limit 1 --max-batches 30 --concurrency 2
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { and, eq, inArray } from "drizzle-orm";
import { isLocale } from "@/i18n/locales";
import { createAzureTranslationGenerator } from "@/i18n/translation/azure";
import { createBlogTranslation } from "@/lib/blog-translation-content";
import { db, schema } from "@/server/database";
import {
  applyBlogTranslationReview,
  type BlogTargetLocale,
  blogTranslationProgress,
  drainBlogTranslationBatch,
  enqueueBlogTranslationSources,
  exportBlockedBlogUnits,
  listBlogTranslationSources,
  toBlogTranslationSource,
} from "@/server/utils/blog-translation";

const { values } = parseArgs({
  options: {
    locales: { type: "string", default: "fr,de,it,ja,zh-CN" },
    limit: { type: "string", default: "1000" },
    concurrency: { type: "string", default: "1" },
    "batch-chars": { type: "string", default: "10000" },
    "batch-units": { type: "string", default: "96" },
    "tokens-per-minute": { type: "string", default: "180000" },
    "request-timeout-ms": { type: "string", default: "180000" },
    "max-batches": { type: "string", default: "1" },
    "dry-run": { type: "boolean", default: false },
    write: { type: "boolean", default: false },
    slug: { type: "string" },
    "apply-review": { type: "string" },
    "export-blocked": { type: "string" },
    "report-dir": {
      type: "string",
      default: "/tmp/ecentic-blog-translation-reviews",
    },
  },
});
const positive = (value: string, option: string) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new Error(`${option} must be a positive integer`);
  return parsed;
};
const targets = (values.locales ?? "").split(",").map((locale) => {
  if (!isLocale(locale) || locale === "en")
    throw new Error(`Unsupported target locale: ${locale}`);
  return locale;
}) as BlogTargetLocale[];
const limit = positive(values.limit, "limit");
const concurrency = Math.min(8, positive(values.concurrency, "concurrency"));
const maxBatches = positive(values["max-batches"], "max-batches");
const characterLimit = Math.min(
  18000,
  positive(values["batch-chars"], "batch-chars"),
);
const unitLimit = Math.min(160, positive(values["batch-units"], "batch-units"));
const tokensPerMinute = Math.min(
  500000,
  positive(values["tokens-per-minute"], "tokens-per-minute"),
);
const timeoutMs = Math.min(
  180000,
  positive(values["request-timeout-ms"], "request-timeout-ms"),
);
const sources = (await listBlogTranslationSources())
  .filter((source) => !values.slug || source.slug === values.slug)
  .slice(0, limit);
const sourceSlugs = sources.map((source) => source.slug);
const existing = sources.length
  ? await db
      .select({ slug: schema.blogPost.slug, locale: schema.blogPost.locale })
      .from(schema.blogPost)
      .where(
        and(
          eq(schema.blogPost.status, "published"),
          inArray(schema.blogPost.slug, sourceSlugs),
          inArray(schema.blogPost.locale, targets),
        ),
      )
  : [];
const inventory = sources.map((source) => {
  const content = createBlogTranslation(toBlogTranslationSource(source));
  return {
    slug: source.slug,
    units: content.units.length,
    translatableCharacters: content.units.reduce(
      (sum, unit) => sum + unit.text.length,
      0,
    ),
    missing: targets.filter(
      (locale) =>
        !existing.some(
          (post) => post.slug === source.slug && post.locale === locale,
        ),
    ),
  };
});
console.log(
  JSON.stringify(
    {
      mode: values.write && !values["dry-run"] ? "write" : "dry-run",
      targets,
      sources: inventory,
      totalCharacters: inventory.reduce(
        (sum, article) =>
          sum + article.translatableCharacters * article.missing.length,
        0,
      ),
    },
    null,
    2,
  ),
);
if (values["export-blocked"]) {
  const blocked = await exportBlockedBlogUnits(sourceSlugs, targets);
  await writeFile(
    resolve(values["export-blocked"]),
    JSON.stringify(blocked, null, 2),
    { flag: "wx" },
  );
}
if (!values.write || values["dry-run"]) process.exit(0);
if (values["apply-review"]) {
  const patch = JSON.parse(
    await readFile(values["apply-review"], "utf8"),
  ) as unknown;
  console.log(JSON.stringify(await applyBlogTranslationReview(patch)));
  process.exit(0);
}

const reportDirectory = resolve(values["report-dir"]);
await mkdir(reportDirectory, { recursive: true });
const queued = await enqueueBlogTranslationSources(sources, targets);
console.log(
  JSON.stringify({
    event: "enqueued",
    jobs: queued.length,
    concurrency,
    characterLimit,
    unitLimit,
    tokensPerMinute,
    timeoutMs,
  }),
);
const generate = createAzureTranslationGenerator({
  tokensPerMinute,
  timeoutMs,
  onUsage: (usage) =>
    console.log(JSON.stringify({ event: "model-usage", ...usage })),
});
const counter = { next: 0, stopped: false };
process.on("SIGUSR1", () => {
  counter.stopped = true;
  console.log(JSON.stringify({ event: "draining", reason: "SIGUSR1" }));
});
const outcomes: unknown[] = [];
const worker = async (): Promise<void> => {
  if (counter.stopped) return;
  const sequence = counter.next++;
  if (sequence >= maxBatches) return;
  const startedAt = Date.now();
  const outcome = await drainBlogTranslationBatch({
    generate,
    targets,
    slugs: sourceSlugs,
    characterLimit,
    unitLimit,
    onReview: async (report) => {
      await writeFile(
        resolve(reportDirectory, `${Date.now()}-${randomUUID()}.json`),
        JSON.stringify(report, null, 2),
        { flag: "wx" },
      );
    },
  });
  outcomes.push(outcome);
  console.log(
    JSON.stringify({
      ...outcome,
      ...("error" in outcome && typeof outcome.error === "string"
        ? { error: outcome.error.slice(0, 300), details: "See review reports" }
        : {}),
      elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
    }),
  );
  if (outcome.status === "rate-limited") {
    counter.stopped = true;
    return;
  }
  if (outcome.status === "idle") return;
  return worker();
};
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const progress = (await blogTranslationProgress(targets)).filter((job) =>
  sourceSlugs.includes(job.slug),
);
console.log(
  JSON.stringify(
    {
      outcomes,
      progress,
      reportDirectory,
      cache:
        "After publication, purge the blog cache or deploy so ISR and sitemap see completed rows.",
    },
    null,
    2,
  ),
);
process.exit(
  outcomes.some(
    (outcome) =>
      typeof outcome === "object" &&
      outcome !== null &&
      "status" in outcome &&
      (outcome.status === "failed" || outcome.status === "rate-limited"),
  )
    ? 1
    : 0,
);
