/** Resumable, reviewed catalog translation. No source-language fallback is written. */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { isLocale, type Locale, locales } from "../src/i18n/locales";
import { createAzureTranslationGenerator } from "../src/i18n/translation/azure";
import {
  type TranslationUnit,
  TranslationValidationError,
  translateTextUnits,
  translationPolicyVersion,
} from "../src/i18n/translation/runner";
import {
  type CatalogValue,
  catalogBatchGroup,
  catalogTranslationUnit,
  flattenCatalog,
  mapCatalog,
  projectCatalogFragment,
  unresolvedCatalogFailures,
} from "./lib/catalog-translation";

const options = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  }),
);
const targets = (options.get("locales") ?? "fr,de,it,ja,zh-CN").split(",");
if (targets.some((locale) => !isLocale(locale) || locale === "en")) {
  throw new Error(
    `Targets must be non-English supported locales: ${locales.join(", ")}`,
  );
}
const directory = resolve(import.meta.dir, "../messages");
const output = resolve(
  options.get("output") ??
    join(import.meta.dir, "../../../output/translations-2026-11-12/catalogs"),
);
mkdirSync(output, { recursive: true });
const source = JSON.parse(
  readFileSync(join(directory, "en.json"), "utf8"),
) as CatalogValue;
const allUnits = Object.entries(flattenCatalog(source))
  .filter((entry): entry is [string, string] => typeof entry[1] === "string")
  .map(([id, text]) => catalogTranslationUnit(id, text));
const excludedNamespaces = (options.get("exclude-namespaces") ?? "")
  .split(",")
  .filter(Boolean);
const selectedIds = options.has("ids-file")
  ? new Set(
      JSON.parse(
        readFileSync(options.get("ids-file") ?? "", "utf8"),
      ) as string[],
    )
  : null;
const selectedUnits = allUnits.filter(
  (unit) =>
    (!selectedIds || selectedIds.has(unit.id)) &&
    (!options.has("namespace") ||
      unit.id.startsWith(`${options.get("namespace")}.`)) &&
    !excludedNamespaces.some((namespace) =>
      unit.id.startsWith(`${namespace}.`),
    ),
);
const concurrency = Math.max(
  1,
  Math.min(12, Number(options.get("concurrency") ?? 6)),
);
const maxUnits = Number(options.get("batch-units") ?? 120);
const maxCharacters = Number(options.get("batch-chars") ?? 10_000);
const generate = options.has("dry-run")
  ? null
  : createAzureTranslationGenerator({
      tokensPerMinute: Number(options.get("tokens-per-minute") ?? 180_000),
      timeoutMs: Number(options.get("timeout-ms") ?? 180_000),
      onUsage: (usage) =>
        console.log(JSON.stringify({ event: "usage", ...usage })),
    });
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const sourceHashes = new Map(
  allUnits.map((unit) => [unit.id, hash(unit.text)]),
);
type Checkpoint = {
  locale: string;
  policy: string;
  entries: Record<string, { sourceHash: string; text: string }>;
  failures: Record<string, { ids: string[]; reason: string }>;
};
const writeAtomic = (path: string, value: unknown) => {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
};
const states = targets.map((locale) => {
  const path = join(output, `${locale}.checkpoint.json`);
  const existing = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as Checkpoint)
    : null;
  const checkpoint: Checkpoint =
    existing?.policy === translationPolicyVersion
      ? existing
      : { locale, policy: translationPolicyVersion, entries: {}, failures: {} };
  for (const unit of allUnits.filter((unit) => unit.invariant)) {
    checkpoint.entries[unit.id] = {
      sourceHash: hash(unit.text),
      text: unit.text,
    };
  }
  checkpoint.failures = unresolvedCatalogFailures(
    checkpoint.failures,
    checkpoint.entries,
    sourceHashes,
  );
  return { locale: locale as Exclude<Locale, "en">, path, checkpoint };
});
const jobs = states.flatMap((state) => {
  const failures = Object.values(state.checkpoint.failures);
  const unresolved = new Set(failures.flatMap((failure) => failure.ids));
  const retryTransport = (id: string) =>
    options.has("retry-transport-failures") &&
    failures
      .filter((failure) => failure.ids.includes(id))
      .every((failure) =>
        /rate limit|timed out|ECONNRESET|ETIMEDOUT|missing, duplicate or unexpected unit IDs/i.test(
          failure.reason,
        ),
      );
  const pending = selectedUnits.filter(
    (unit) =>
      !unit.invariant &&
      state.checkpoint.entries[unit.id]?.sourceHash !== hash(unit.text) &&
      (!unresolved.has(unit.id) ||
        options.has("retry-reviewed-failures") ||
        retryTransport(unit.id)),
  );
  const batches: TranslationUnit[][] = [];
  for (const unit of pending) {
    const current = batches.at(-1);
    if (
      !current ||
      current.length >= maxUnits ||
      current.reduce((sum, item) => sum + item.text.length, 0) +
        unit.text.length >
        maxCharacters ||
      (!options.has("combine-namespaces") &&
        current.length >= 50 &&
        catalogBatchGroup(current[0]?.id ?? "") !== catalogBatchGroup(unit.id))
    ) {
      batches.push([unit]);
    } else {
      current.push(unit);
    }
  }
  return batches.map((units) => ({
    state,
    units,
    id: hash(units.map((unit) => `${unit.id}:${hash(unit.text)}`).join("\n")),
  }));
});
console.log(
  JSON.stringify({
    targets,
    stringEntries: allUnits.length,
    pendingBatches: jobs.length,
    pendingUnits: jobs.reduce((sum, job) => sum + job.units.length, 0),
    concurrency,
    output,
  }),
);
if (options.has("dry-run")) process.exit(0);
const progress = { cursor: 0, completed: 0, failed: 0 };
const shutdown = { requested: false };
process.on("SIGUSR1", () => {
  shutdown.requested = true;
  console.log(JSON.stringify({ event: "draining" }));
});
const worker = async () => {
  while (!shutdown.requested && progress.cursor < jobs.length) {
    const job = jobs[progress.cursor++];
    if (!job || !generate) return;
    try {
      console.log(
        JSON.stringify({
          event: "start",
          locale: job.state.locale,
          first: job.units[0]?.id,
          count: job.units.length,
        }),
      );
      const translated = await translateTextUnits({
        units: job.units,
        targetLocale: job.state.locale,
        documentContext:
          "ecentic is a B2B commerce product. Translate the complete group in context, including neighboring heading fragments, explanatory copy and actions. Source is the approved English catalog. Keep support/calls English-only if the source says so. Preserve all product behavior, evidence qualifications, USD prices and consent obligations. Do not translate identifiers, brand or plan names. Marketing should read as written for this market; interface labels should remain concise.",
        generate: async (request) => {
          const artifact = await generate(request);
          writeAtomic(
            join(output, `${job.state.locale}-${job.id}.${request.phase}.json`),
            artifact,
          );
          return artifact;
        },
        onReview: (report) =>
          writeAtomic(
            join(output, `${job.state.locale}-${job.id}.review.json`),
            report,
          ),
      });
      const byId = new Map(translated.map((unit) => [unit.id, unit.text]));
      for (const unit of job.units) {
        const text = byId.get(unit.id);
        if (text === undefined)
          throw new Error(`Missing translated unit ${unit.id}`);
        job.state.checkpoint.entries[unit.id] = {
          sourceHash: hash(unit.text),
          text,
        };
      }
      delete job.state.checkpoint.failures[job.id];
      job.state.checkpoint.failures = unresolvedCatalogFailures(
        job.state.checkpoint.failures,
        job.state.checkpoint.entries,
        sourceHashes,
      );
      progress.completed++;
      writeAtomic(job.state.path, job.state.checkpoint);
      console.log(
        JSON.stringify({
          event: "complete",
          locale: job.state.locale,
          first: job.units[0]?.id,
          completed: progress.completed,
          total: jobs.length,
        }),
      );
    } catch (error) {
      progress.failed++;
      const reason =
        error instanceof Error ? error.message : "Translation failed";
      if (error instanceof TranslationValidationError) {
        for (const approved of error.approvedUnits) {
          const sourceUnit = job.units.find((unit) => unit.id === approved.id);
          if (sourceUnit)
            job.state.checkpoint.entries[approved.id] = {
              sourceHash: hash(sourceUnit.text),
              text: approved.text,
            };
        }
      }
      job.state.checkpoint.failures[job.id] = {
        ids: job.units
          .filter(
            (unit) =>
              job.state.checkpoint.entries[unit.id]?.sourceHash !==
              hash(unit.text),
          )
          .map((unit) => unit.id),
        reason,
      };
      job.state.checkpoint.failures = unresolvedCatalogFailures(
        job.state.checkpoint.failures,
        job.state.checkpoint.entries,
        sourceHashes,
      );
      writeAtomic(job.state.path, job.state.checkpoint);
      console.error(
        JSON.stringify({
          event: "failed",
          locale: job.state.locale,
          first: job.units[0]?.id,
          reason,
        }),
      );
    }
  }
};
await Promise.all(
  Array.from({ length: Math.min(concurrency, jobs.length) }, worker),
);
for (const state of states) {
  const missing = allUnits.filter(
    (unit) => state.checkpoint.entries[unit.id]?.sourceHash !== hash(unit.text),
  );
  if (missing.length) {
    console.log(
      JSON.stringify({
        event: "incomplete",
        locale: state.locale,
        remaining: missing.length,
      }),
    );
    continue;
  }
  const lookup = (id: string, text: string) => {
    const entry = state.checkpoint.entries[id];
    if (!entry || entry.sourceHash !== hash(text))
      throw new Error(`Unreviewed or stale translation: ${id}`);
    return entry.text;
  };
  const translated = mapCatalog(source, lookup);
  writeAtomic(join(directory, `${state.locale}.json`), translated);
  for (const name of readdirSync(join(directory, "fragments")).filter((name) =>
    name.endsWith(".en.json"),
  )) {
    const fragment = JSON.parse(
      readFileSync(join(directory, "fragments", name), "utf8"),
    ) as CatalogValue;
    // Older overlapping fragments are projected from the final source so merge stays idempotent.
    const translatedFragment = mapCatalog(
      projectCatalogFragment(fragment, source),
      (id) => {
        const entry = state.checkpoint.entries[id];
        if (!entry)
          throw new Error(
            `Fragment has a key outside the completed catalog: ${id}`,
          );
        return entry.text;
      },
    );
    writeAtomic(
      join(
        directory,
        "fragments",
        name.replace(/\.en\.json$/, `.${state.locale}.json`),
      ),
      translatedFragment,
    );
  }
  console.log(
    JSON.stringify({
      event: "catalog-written",
      locale: state.locale,
      entries: allUnits.length,
    }),
  );
}
console.log(JSON.stringify({ event: "finished", ...progress }));
if (
  progress.failed ||
  states.some((state) =>
    allUnits.some(
      (unit) =>
        state.checkpoint.entries[unit.id]?.sourceHash !== hash(unit.text),
    ),
  )
)
  process.exitCode = 1;
