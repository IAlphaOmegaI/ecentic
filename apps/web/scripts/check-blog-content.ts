/**
 * `bun run blog:check` — the gate for posts in `apps/web/content/blog`.
 *
 * Runs the same checks the blog cron applies before it publishes a file
 * (frontmatter, slug, markdown structure, house voice), plus the one the cron
 * cannot: that every image a post names exists under `public/`. Prints each
 * problem with its file, line and a short fix, and exits 1 if any post has an
 * error. In CI the errors are also emitted as GitHub annotations, so they
 * show up on the lines of the pull request diff.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import * as BlogContent from "@/server/utils/blog-content";

const root = join(import.meta.dir, "..");
const files = await BlogContent.read(join(root, BlogContent.CONTENT_DIRECTORY));
const sources = new Map(files.map((file) => [file.path, file.raw]));

const lineOf = (raw: string, needle: string) =>
  raw.slice(0, Math.max(0, raw.indexOf(needle))).split("\n").length;

const reports = BlogContent.validate(files).map((report) => {
  const raw = sources.get(report.path) ?? "";
  const missing = report.images
    .map((image) => image.split(/[?#]/)[0] ?? image)
    .filter((image) => !existsSync(join(root, "public", image)))
    .map((image) => ({
      line: lineOf(raw, image),
      rule: "image",
      message: `${image} is not in apps/web/public`,
      fix: `add apps/web/public${image}, or fix the path`,
    }));

  return {
    ...report,
    errors: [...report.errors, ...missing].sort(
      (first, second) => first.line - second.line,
    ),
  };
});

// `CI` is set by GitHub Actions; the `::error` lines are its annotation syntax.
const annotate = process.env.CI === "true";

for (const report of reports) {
  const file = `apps/web/${report.path}`;
  for (const [level, issues] of [
    ["error", report.errors],
    ["warning", report.warnings],
  ] as const)
    for (const issue of issues) {
      const fix = issue.fix ? ` (fix: ${issue.fix})` : "";
      console.log(
        `${file}:${issue.line}  ${level}  ${issue.rule}  ${issue.message}${fix}`,
      );
      if (annotate)
        console.log(
          `::${level} file=${file},line=${issue.line},title=blog:check ${issue.rule}::${issue.message}${fix}`,
        );
    }
}

const failing = reports.filter((report) => report.errors.length > 0);
const errors = failing.reduce(
  (total, report) => total + report.errors.length,
  0,
);

console.log(
  failing.length === 0
    ? `blog:check: ${reports.length} post(s) OK`
    : `blog:check: ${errors} error(s) in ${failing.length} of ${reports.length} post(s)`,
);

process.exit(failing.length === 0 ? 0 : 1);
