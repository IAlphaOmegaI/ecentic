/**
 * Backfill English `blog_post` rows from BabyLoveGrowth against whatever
 * DATABASE_URL is loaded (point it at production for a one-shot prod fill).
 * No Azure — EN only. Respects BLG's 2 req/s cap via the shared client queue.
 *
 * Usage (from apps/web):
 *   bun run blog:backfill-english -- --yes
 *   bun scripts/backfill-blog-english.ts --limit=20 --yes
 *
 * Needs: DATABASE_URL, BABYLOVEGROWTH_BLOG_API_KEY.
 * Afterward: redeploy (or purge blog cache) so static `/blog/*` pages regenerate.
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const parseArgs = () => {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key !== undefined && value !== undefined) args.set(key, value);
  }

  return {
    limit: Math.max(1, Number(args.get("limit") ?? 50)),
    maxRounds: Math.max(1, Number(args.get("max-rounds") ?? 500)),
    yes: process.argv.includes("--yes"),
  };
};

const databaseHost = (url: string | undefined) => {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
};

const main = async () => {
  const { limit, maxRounds, yes } = parseArgs();
  const host = databaseHost(process.env.DATABASE_URL);

  if (!host) {
    console.error("DATABASE_URL is missing.");
    process.exit(1);
  }

  if (!process.env.BABYLOVEGROWTH_BLOG_API_KEY) {
    console.error("Missing env: BABYLOVEGROWTH_BLOG_API_KEY");
    process.exit(1);
  }

  console.log(`Backfill target DB host: ${host}`);
  console.log(`Batch size: ${limit}/round (BLG ≤2 req/s)`);

  if (!yes && /localhost|127\.0\.0\.1/i.test(host)) {
    console.warn(
      "This looks like a local database. Pass --yes to continue, or point DATABASE_URL at production.",
    );
    process.exit(1);
  }

  if (!yes) {
    console.warn(
      "About to write English rows to the DB above. Re-run with --yes to confirm.",
    );
    process.exit(1);
  }

  const Blog = await import("@/server/app/blog");

  const allUpserted: string[] = [];
  const allFailed = new Set<string>();

  for (let round = 1; round <= maxRounds; round += 1) {
    const result = await Blog.backfillMissingEnglishCore({ limit });

    if (!result.success) {
      console.error(
        `Round ${round} failed:`,
        result.error instanceof Error
          ? result.error.message
          : String(result.error),
      );
      process.exit(1);
    }

    const { summariesUpserted, upserted, failed, remaining, missingTotal } =
      result.data;

    if (round === 1) {
      console.log(`Bodies still needing full BLG fetch: ${missingTotal}`);
    }

    if (summariesUpserted.length > 0) {
      console.log(
        `Round ${round}: +${summariesUpserted.length} summaries from list`,
      );
      console.log(`  summaries: ${summariesUpserted.join(", ")}`);
    }

    for (const slug of upserted) allUpserted.push(slug);
    for (const slug of failed) allFailed.add(slug);

    console.log(
      `Round ${round}: +${upserted.length} full bodies, ${failed.length} failed, ${remaining} remaining`,
    );
    if (upserted.length > 0) {
      console.log(`  ok: ${upserted.join(", ")}`);
    }
    if (failed.length > 0) {
      console.log(`  failed: ${failed.join(", ")}`);
    }

    if (remaining === 0) break;

    if (upserted.length === 0 && summariesUpserted.length === 0) {
      console.error(
        "No progress this round (only failures). Check BLG API key / rate limits and re-run.",
      );
      process.exit(1);
    }
  }

  console.log(
    `\nDone. upserted=${allUpserted.length} failed=${allFailed.size}`,
  );
  if (allFailed.size > 0) {
    console.log(`Failed slugs: ${[...allFailed].join(", ")}`);
  }

  console.log(
    "Redeploy production (or call /api/revalidate/blog) so static /blog pages pick up the new rows.",
  );

  if (allFailed.size > 0) process.exit(1);
};

await main();
