/**
 * Backfill Spanish `blog_post` rows against whatever DATABASE_URL is loaded
 * (point it at production for a one-shot prod fill). Runs Azure translate
 * locally — no cron HTTP / CRON_SECRET.
 *
 * Usage (from apps/web):
 *   # temporarily set DATABASE_URL to the production Postgres URL, then:
 *   bun run blog:backfill-spanish
 *   bun scripts/backfill-blog-spanish.ts --limit=5
 *
 * Needs: DATABASE_URL, BABYLOVEGROWTH_BLOG_API_KEY, Azure gpt seat env.
 * Afterward: redeploy (or purge blog cache) so static `/es/blog/*` pages regenerate.
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
    limit: Math.max(1, Number(args.get("limit") ?? 5)),
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

  const required = ["BABYLOVEGROWTH_BLOG_API_KEY"] as const;

  const missingEnv = required.filter((key) => !process.env[key]);
  if (missingEnv.length > 0) {
    console.error(`Missing env: ${missingEnv.join(", ")}`);
    process.exit(1);
  }

  if (
    !process.env.AZURE_DEPLOYMENT_GPT &&
    !process.env.AI_GATEWAY_API_KEY &&
    !process.env.AZURE_API_KEY
  ) {
    console.error(
      "Need Azure gpt seat (AZURE_*) and/or AI_GATEWAY_API_KEY for translate.",
    );
    process.exit(1);
  }

  console.log(`Backfill target DB host: ${host}`);
  console.log(`Batch size: ${limit}/round (Azure translate runs in-process)`);

  if (!yes && /localhost|127\.0\.0\.1/i.test(host)) {
    console.warn(
      "This looks like a local database. Pass --yes to continue, or point DATABASE_URL at production.",
    );
    process.exit(1);
  }

  if (!yes) {
    console.warn(
      "About to write Spanish rows to the DB above. Re-run with --yes to confirm.",
    );
    process.exit(1);
  }

  // Dynamic import after env is loaded so db/ai pick up DATABASE_URL / Azure.
  const Blog = await import("@/server/app/blog");

  const allTranslated: string[] = [];
  const allFailed = new Set<string>();

  for (let round = 1; round <= maxRounds; round += 1) {
    const result = await Blog.translateMissingSpanishCore({ limit });

    if (!result.success) {
      console.error(
        `Round ${round} failed:`,
        result.error instanceof Error
          ? result.error.message
          : String(result.error),
      );
      process.exit(1);
    }

    const { translated, failed, remaining, missingTotal } = result.data;

    if (round === 1) {
      console.log(`Missing Spanish rows at start of run: ${missingTotal}`);
    }

    for (const slug of translated) allTranslated.push(slug);
    for (const slug of failed) allFailed.add(slug);

    console.log(
      `Round ${round}: +${translated.length} translated, ${failed.length} failed, ${remaining} remaining`,
    );
    if (translated.length > 0) {
      console.log(`  ok: ${translated.join(", ")}`);
    }
    if (failed.length > 0) {
      console.log(`  failed: ${failed.join(", ")}`);
    }

    if (remaining === 0) break;

    if (translated.length === 0) {
      console.error(
        "No progress this round (only failures). Check Azure / BLG and re-run.",
      );
      process.exit(1);
    }
  }

  console.log(
    `\nDone. translated=${allTranslated.length} failed=${allFailed.size}`,
  );
  if (allFailed.size > 0) {
    console.log(`Failed slugs: ${[...allFailed].join(", ")}`);
  }

  console.log(
    "Redeploy production (or call /api/revalidate/blog) so static /es/blog pages pick up the new rows.",
  );

  if (allFailed.size > 0) process.exit(1);
};

await main();
