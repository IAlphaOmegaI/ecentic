/** Final evidence adjudication of saved corrected targets; never redrafts or changes targets. */
import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { z } from "zod";
import { locales } from "../src/i18n/locales";
import { createAzureTranslationGenerator } from "../src/i18n/translation/azure";
import { translationReviewPasses } from "../src/i18n/translation/policy";
import {
  adjudicateTranslationReport,
  type TranslationReviewReport,
  translationPolicyVersion,
} from "../src/i18n/translation/runner";
import {
  type CatalogValue,
  catalogTranslationUnit,
  flattenCatalog,
} from "./lib/catalog-translation";

const options = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...values] = argument.replace(/^--/, "").split("=");
    return [key, values.join("=") || "true"];
  }),
);
if (!options.has("directory"))
  throw new Error(
    "Use --directory=/path/to/catalog/reviews. Stop catalog workers before --write-checkpoints.",
  );
const directory = resolve(options.get("directory") ?? "");
const selected = (options.get("locales") ?? "fr,de,it,ja,zh-CN").split(",");
const findingSchema = z.object({
  id: z.string(),
  pass: z.enum(translationReviewPasses),
  message: z.string(),
});
const reportSchema = z.object({
  policyVersion: z.string(),
  targetLocale: z.enum(locales),
  stage: z.enum(["draft", "corrected", "adjudicated"]),
  reviewed: z.array(z.string()),
  passes: z.array(z.enum(translationReviewPasses)),
  findings: z.array(findingSchema),
  deterministicFindings: z.array(findingSchema).optional(),
  documentContext: z.string().optional(),
  reviewedUnits: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      target: z.string(),
      context: z.string(),
      format: z.enum(["plain", "icu", "markdown"]).optional(),
      invariant: z.boolean().optional(),
      protectedTerms: z.array(z.string()).optional(),
      translatableTerms: z.array(z.string()).optional(),
    }),
  ),
  humanReview: z.literal("not_requested"),
  runtimeReview: z.literal("not_performed"),
});
const jobs = readdirSync(directory)
  .filter((name) => name.endsWith(".review.json"))
  .flatMap((name) => {
    const original = readFileSync(join(directory, name), "utf8");
    const raw = JSON.parse(original);
    if (
      raw.policyVersion !== translationPolicyVersion ||
      raw.stage !== "corrected" ||
      !selected.includes(raw.targetLocale)
    )
      return [];
    const report = reportSchema.parse(raw);
    return [
      {
        name,
        report,
        digest: createHash("sha256").update(original).digest("hex"),
      },
    ];
  })
  .filter(
    ({ report }) =>
      report.stage === "corrected" &&
      report.policyVersion === translationPolicyVersion &&
      report.findings.length > 0 &&
      selected.includes(report.targetLocale),
  )
  .slice(0, Number(options.get("limit") ?? Number.POSITIVE_INFINITY));
console.log(
  JSON.stringify({
    reports: jobs.length,
    writeCheckpoints: options.has("write-checkpoints"),
    dryRun: options.has("dry-run"),
  }),
);
if (options.has("dry-run")) process.exit(0);
const generate = createAzureTranslationGenerator({
  timeoutMs: 120_000,
  maxRetries: 1,
});
const source = flattenCatalog(
  JSON.parse(
    readFileSync(resolve(import.meta.dir, "../messages/en.json"), "utf8"),
  ) as CatalogValue,
);
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const writeAtomic = (path: string, value: unknown) => {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
};
const progress = {
  cursor: 0,
  reviewed: 0,
  cleared: 0,
  remaining: 0,
  failed: 0,
};
const worker = async () => {
  while (progress.cursor < jobs.length) {
    const job = jobs[progress.cursor++];
    if (!job) return;
    try {
      if (
        JSON.stringify(job.report.passes) !==
        JSON.stringify(translationReviewPasses)
      )
        throw new Error("Saved report did not complete all six passes");
      // A saved report is proof only for that exact source, including exception metadata.
      const units = job.report.reviewedUnits.map((unit) => {
        if (source[unit.id] !== unit.text)
          throw new Error(`Stale source: ${unit.id}`);
        return {
          ...catalogTranslationUnit(unit.id, unit.text),
          target: unit.target,
        };
      });
      const path = join(
        directory,
        job.name.replace(/\.review\.json$/, ".adjudicated.json"),
      );
      const existing = existsSync(path)
        ? (JSON.parse(readFileSync(path, "utf8")) as {
            inputDigest: string;
            report: TranslationReviewReport;
          })
        : null;
      if (existing && existing.inputDigest !== job.digest)
        throw new Error(
          `Changed report already has an adjudication: ${basename(path)}`,
        );
      const report =
        existing?.report ??
        (await adjudicateTranslationReport({
          report: {
            ...job.report,
            passes: translationReviewPasses,
            reviewedUnits: units,
          } as TranslationReviewReport,
          generate,
          documentContext:
            "Approved ecentic website catalog. Neighboring fields form connected UI and prose, including split strings separated by inline links, code or product names. Inflected glossary forms are valid. Do not infer a new capability from a keyword, image description, or contextually explicit translation. Preserve source facts, uncertainty and obligations.",
        }));
      if (!existing)
        writeFileSync(
          path,
          `${JSON.stringify({ inputDigest: job.digest, report }, null, 2)}\n`,
          { flag: "wx" },
        );
      const blocked = new Set(report.findings.map((finding) => finding.id));
      const previouslyBlocked = new Set(
        job.report.findings.map((finding) => finding.id),
      );
      const cleared = report.reviewedUnits.filter(
        (unit) => previouslyBlocked.has(unit.id) && !blocked.has(unit.id),
      );
      if (options.has("write-checkpoints")) {
        const checkpointPath = join(
          directory,
          `${report.targetLocale}.checkpoint.json`,
        );
        const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8")) as {
          policy: string;
          entries: Record<string, { sourceHash: string; text: string }>;
          failures: Record<string, { ids: string[]; reason: string }>;
        };
        if (checkpoint.policy !== translationPolicyVersion)
          throw new Error("Checkpoint policy mismatch");
        for (const unit of cleared) {
          const current = checkpoint.entries[unit.id];
          if (current?.sourceHash === hash(unit.text)) continue; // Preserve independently reviewed corrections.
          checkpoint.entries[unit.id] = {
            sourceHash: hash(unit.text),
            text: unit.target,
          };
        }
        for (const [key, failure] of Object.entries(checkpoint.failures)) {
          failure.ids = failure.ids.filter(
            (id) =>
              typeof source[id] !== "string" ||
              checkpoint.entries[id]?.sourceHash !== hash(source[id]),
          );
          if (!failure.ids.length) delete checkpoint.failures[key];
        }
        writeAtomic(checkpointPath, checkpoint);
      }
      progress.reviewed++;
      progress.cleared += cleared.length;
      progress.remaining += blocked.size;
      console.log(
        JSON.stringify({
          event: "adjudicated",
          locale: report.targetLocale,
          file: job.name,
          cleared: cleared.length,
          remaining: blocked.size,
          cached: Boolean(existing),
        }),
      );
    } catch (error) {
      progress.failed++;
      console.error(
        JSON.stringify({
          event: "failed",
          file: job.name,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
};
await Promise.all(
  Array.from(
    {
      length: Math.min(8, Math.max(1, Number(options.get("concurrency") ?? 4))),
    },
    worker,
  ),
);
console.log(JSON.stringify(progress));
if (progress.failed) process.exitCode = 1;
