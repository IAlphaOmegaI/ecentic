import { createHash } from "node:crypto";
import { resultify } from "@zenncore/utils";
import postgres from "postgres";
import { z } from "zod";
import { applyEditorialChanges } from "./content/editorial-patch";
import input from "./content/launch-editorial-patch-2026-11-12.json";

/**
 * Dry-run by default. Updates only the reviewed public-copy leaves in five
 * local editorial articles, in EN/ES. Never run the full seed to apply these
 * changes: it would overwrite unrelated editorial work.
 *
 * bun --env-file=.env.local scripts/apply-launch-editorial-patch.ts
 * bun --env-file=<chosen-env> scripts/apply-launch-editorial-patch.ts --apply --database-fingerprint=<dry-run fingerprint>
 *
 * After applying, purge the chosen deployment's `blog` cache through its
 * authenticated /api/revalidate/blog route, then inspect the EN/ES articles.
 */
const patches = z
  .array(
    z.object({
      slug: z.string(),
      locale: z.enum(["en", "es"]),
      changes: z.array(
        z.object({
          path: z.array(z.union([z.string(), z.number().int().nonnegative()])),
          before: z.string(),
          after: z.string(),
        }),
      ),
    }),
  )
  .parse(input);

type Article = {
  id: string;
  slug: string;
  locale: string;
  source: string;
  status: string;
  contentHtml: string | null;
  description: string;
  introduction: string;
  takeaways: string[];
  sections: { number: string; title: string; content: string }[];
  faqs: { question: string; answer: string }[];
};

const address = process.env.DATABASE_URL;
if (!address) throw new Error("DATABASE_URL is required; no changes made.");
const connection = new URL(address);
const fingerprint = createHash("sha256")
  .update(`${connection.hostname}${connection.pathname}`)
  .digest("hex")
  .slice(0, 16);
const apply = process.argv.includes("--apply");
if (apply && !process.argv.includes(`--database-fingerprint=${fingerprint}`))
  throw new Error(
    "Run a dry-run and pass its database fingerprint before applying.",
  );

const database = postgres(address, { max: 1, connect_timeout: 15 });
const operation = await resultify(() =>
  database.begin(async (transaction) => {
    const results = [];
    for (const patch of patches) {
      const rows = await transaction<Article[]>`
      SELECT id, slug, locale, source, status, "contentHtml", description,
        introduction, takeaways, sections, faqs
      FROM blog_post
      WHERE slug = ${patch.slug} AND locale = ${patch.locale}
      FOR UPDATE
    `;
      const article = rows[0];
      if (
        article?.source !== "local" ||
        article.status !== "published" ||
        article.contentHtml
      )
        throw new Error(
          `Expected a published local section-based article: ${patch.slug}/${patch.locale}.`,
        );

      const { updated, changes } = applyEditorialChanges(
        article,
        patch.changes,
      );
      if (apply && changes > 0)
        await transaction`
        UPDATE blog_post SET
          description = ${updated.description}, introduction = ${updated.introduction},
          takeaways = ${transaction.json(updated.takeaways)},
          sections = ${transaction.json(updated.sections)},
          faqs = ${transaction.json(updated.faqs)}, "updatedAt" = NOW()
        WHERE id = ${article.id}
      `;
      results.push({ slug: patch.slug, locale: patch.locale, changes });
    }
    return results;
  }),
);
await database.end();
if (!operation.success) {
  // The transaction rolls back every row on conflict. Never print connection data.
  console.error("Editorial patch stopped; no article changes committed.");
  console.error(
    operation.error instanceof Error
      ? operation.error.message
      : "Unknown failure.",
  );
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      mode: apply ? "applied" : "dry-run",
      databaseFingerprint: fingerprint,
      articles: operation.data,
      cacheRevalidation: apply
        ? "Required on the matching deployment."
        : "No writes performed.",
    },
    null,
    2,
  ),
);
