/** Apply an authored/adjudicated review after that locale's generation workers stop. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { isLocale } from "../src/i18n/locales";
import {
  translationPolicyVersionFor,
  validateTranslationUnit,
} from "../src/i18n/translation/runner";
import {
  type CatalogValue,
  catalogTranslationUnit,
  flattenCatalog,
} from "./lib/catalog-translation";

const { values } = parseArgs({
  options: {
    file: { type: "string" },
    locale: { type: "string" },
    "review-notes": { type: "string" },
    "checkpoint-dir": {
      type: "string",
      default: resolve(
        import.meta.dir,
        "../../../output/translations-2026-11-12/catalogs",
      ),
    },
  },
});
if (
  !values.file ||
  !values["review-notes"] ||
  !existsSync(values["review-notes"])
) {
  throw new Error(
    "Provide --file and --review-notes for the completed source/target review.",
  );
}
const patch = JSON.parse(readFileSync(values.file, "utf8"));
const source = flattenCatalog(
  JSON.parse(
    readFileSync(resolve(import.meta.dir, "../messages/en.json"), "utf8"),
  ) as CatalogValue,
);
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const patches: {
  locale: string;
  units: { id: string; text: string; sourceHash?: string }[];
}[] = Array.isArray(patch.units)
  ? [{ locale: patch.locale, units: patch.units }]
  : Object.entries(patch)
      .filter(([locale]) => isLocale(locale))
      .map(([locale, entries]) => ({
        locale,
        units: Object.entries(entries as Record<string, string>).map(
          ([id, text]) => ({ id, text }),
        ),
      }));
for (const { locale, units } of patches) {
  if (values.locale && values.locale !== locale) continue;
  if (!isLocale(locale) || locale === "en")
    throw new Error(`Invalid target: ${locale}`);
  const checkpointPath = resolve(
    values["checkpoint-dir"],
    `${locale}.checkpoint.json`,
  );
  const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
  if (checkpoint.policy !== translationPolicyVersionFor(locale))
    throw new Error(`Stale checkpoint policy: ${locale}`);
  const checked = units.map((entry) => {
    if (
      !Object.hasOwn(source, entry.id) ||
      typeof source[entry.id] !== "string" ||
      typeof entry.text !== "string"
    ) {
      throw new Error(`Unknown or invalid reviewed unit: ${entry.id}`);
    }
    const text = source[entry.id] as string;
    if (entry.sourceHash && entry.sourceHash !== hash(text))
      throw new Error(`Source changed: ${entry.id}`);
    const findings = validateTranslationUnit(
      catalogTranslationUnit(entry.id, text),
      entry.text,
      locale,
    );
    if (findings.length)
      throw new Error(
        `${entry.id}: ${findings.map((finding) => finding.message).join("; ")}`,
      );
    return { id: entry.id, text: entry.text, sourceHash: hash(text) };
  });
  const ids = new Set(checked.map((entry) => entry.id));
  for (const { id, ...entry } of checked) checkpoint.entries[id] = entry;
  for (const [id, failure] of Object.entries(checkpoint.failures) as [
    string,
    { ids: string[]; reason: string },
  ][]) {
    failure.ids = failure.ids.filter((unit) => !ids.has(unit));
    if (failure.ids.length === 0) delete checkpoint.failures[id];
  }
  checkpoint.reviewPatches = [
    ...(checkpoint.reviewPatches ?? []),
    {
      file: resolve(values.file),
      notes: resolve(values["review-notes"]),
      ids: [...ids],
      appliedAt: new Date().toISOString(),
      humanReview: "not_requested",
    },
  ];
  writeFileSync(
    `${checkpointPath}.tmp`,
    `${JSON.stringify(checkpoint, null, 2)}\n`,
  );
  renameSync(`${checkpointPath}.tmp`, checkpointPath);
  console.log(`${locale}: applied ${checked.length} reviewed entries`);
}
