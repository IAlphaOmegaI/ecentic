/**
 * Backfill Spanish `blog_post` rows for existing BLG + local English posts.
 *
 * Hits the production (or any host) cron endpoint in small batches so Azure
 * translate does not blow the serverless time budget.
 *
 * Usage (from apps/web):
 *   bun scripts/backfill-blog-spanish.ts
 *   bun scripts/backfill-blog-spanish.ts --host=https://ecentic.ai --limit=3
 *
 * Requires `CRON_SECRET` in the environment (or apps/web/.env.local).
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
    host: (args.get("host") ?? "https://ecentic.ai").replace(/\/$/, ""),
    limit: Math.max(1, Number(args.get("limit") ?? 3)),
    maxRounds: Math.max(1, Number(args.get("max-rounds") ?? 200)),
  };
};

type BackfillData = {
  translated: string[];
  failed: string[];
  remaining: number;
};

type BackfillResponse =
  | { success: true; data: BackfillData }
  | { success: false; error: string };

const main = async () => {
  const { host, limit, maxRounds } = parseArgs();
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error(
      "CRON_SECRET is missing. Set it in the environment or apps/web/.env.local.",
    );
    process.exit(1);
  }

  console.log(
    `Backfilling Spanish blog rows via ${host} (limit=${limit}/round)`,
  );

  const allTranslated: string[] = [];
  const allFailed = new Set<string>();

  for (let round = 1; round <= maxRounds; round += 1) {
    const url = `${host}/api/cron/blog-translate-backfill?limit=${limit}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });

    const body = (await response.json()) as BackfillResponse;

    if (!response.ok || !body.success) {
      const message =
        !body.success && typeof body.error === "string"
          ? body.error
          : `HTTP ${response.status}`;
      console.error(`Round ${round} failed: ${message}`);
      process.exit(1);
    }

    const { translated, failed, remaining } = body.data;
    for (const slug of translated) allTranslated.push(slug);
    for (const slug of failed) allFailed.add(slug);

    console.log(
      `Round ${round}: +${translated.length} translated, ${failed.length} failed, ${remaining} remaining`,
    );
    if (translated.length > 0) {
      console.log(`  translated: ${translated.join(", ")}`);
    }
    if (failed.length > 0) {
      console.log(`  failed: ${failed.join(", ")}`);
    }

    if (remaining === 0) break;

    // Same failures every round would loop forever — stop if we made no progress.
    if (translated.length === 0) {
      console.error(
        "No progress this round (only failures). Fix Azure/BLG errors and re-run.",
      );
      process.exit(1);
    }
  }

  console.log(
    `\nDone. translated=${allTranslated.length} failed=${allFailed.size}`,
  );
  if (allFailed.size > 0) {
    console.log(`Failed slugs: ${[...allFailed].join(", ")}`);
    process.exit(1);
  }
};

await main();
