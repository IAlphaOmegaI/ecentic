/**
 * Compare message catalogs for key parity across locales.
 *
 *   bun run scripts/check-i18n-keys.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isLocale, locales, publishedLocales } from "../src/i18n/locales";
import { validateTranslationUnit } from "../src/i18n/translation/runner";
import { catalogTranslationUnit } from "./lib/catalog-translation";

const messagesDirectory = join(import.meta.dirname, "../messages");
const files = readdirSync(messagesDirectory).filter((name) =>
  name.endsWith(".json"),
);

const flatten = (
  value: unknown,
  prefix = "",
): Record<string, string | number | boolean | null> => {
  if (Array.isArray(value)) {
    return value.reduce<Record<string, string | number | boolean | null>>(
      (result, item, index) => {
        Object.assign(result, flatten(item, `${prefix}.${index}`));
        return result;
      },
      {},
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce<
      Record<string, string | number | boolean | null>
    >((result, [key, nested]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      Object.assign(result, flatten(nested, path));
      return result;
    }, {});
  }

  return {
    [prefix]: value as string | number | boolean | null,
  };
};

const catalogs = files.map((file) => {
  const locale = file.replace(/\.json$/, "");
  const raw = JSON.parse(readFileSync(join(messagesDirectory, file), "utf8"));
  return { locale, keys: flatten(raw) };
});

const reference =
  catalogs.find((catalog) => catalog.locale === "en") ?? catalogs[0];
if (!reference) {
  console.error("No message catalogs found in apps/web/messages/");
  process.exit(1);
}

const result = { failed: false };

for (const locale of process.argv.includes("--all")
  ? locales
  : publishedLocales) {
  if (catalogs.some((catalog) => catalog.locale === locale)) continue;
  result.failed = true;
  console.error(`${locale}: missing completed catalog`);
}

for (const catalog of catalogs) {
  if (catalog.locale === reference.locale) continue;

  const missing = Object.keys(reference.keys).filter(
    (key) => !(key in catalog.keys),
  );
  const extra = Object.keys(catalog.keys).filter(
    (key) => !(key in reference.keys),
  );

  console.log(
    `${catalog.locale}: ${Object.keys(catalog.keys).length} keys (ref ${reference.locale}: ${Object.keys(reference.keys).length})`,
  );

  if (missing.length > 0) {
    result.failed = true;
    console.log(`  missing (${missing.length}):`);
    for (const key of missing) console.log(`    - ${key}`);
  }

  if (extra.length > 0) {
    result.failed = true;
    console.log(`  extra (${extra.length}):`);
    for (const key of extra) console.log(`    + ${key}`);
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log("  ok — key parity with en");
  }

  // The five new catalogs have a strict executable/protected-content contract.
  // Spanish predates this rollout and retains its existing key-parity gate.
  if (catalog.locale !== "es" && isLocale(catalog.locale)) {
    const locale = catalog.locale;
    const findings = Object.entries(reference.keys).flatMap(([id, source]) => {
      const target = catalog.keys[id];
      if (typeof source !== "string" || typeof target !== "string") return [];
      return validateTranslationUnit(
        catalogTranslationUnit(id, source),
        target,
        locale,
      );
    });
    if (findings.length) {
      result.failed = true;
      console.error(`  ${findings.length} translation integrity failure(s):`);
      for (const finding of findings)
        console.error(`    ${finding.id}: ${finding.message}`);
    } else {
      console.log(
        "  ok — ICU, protected syntax, numbers and resource identities",
      );
    }
  }
}

process.exit(result.failed ? 1 : 0);
