import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const messagesDir = join(import.meta.dir, "../messages");
const fragmentDir = join(messagesDir, "fragments");

const locales = ["en", "es"] as const;

for (const locale of locales) {
  const basePath = join(messagesDir, `${locale}.json`);
  const base = JSON.parse(readFileSync(basePath, "utf8")) as Record<
    string,
    unknown
  >;

  const suffix = `.${locale}.json`;
  const fragmentFiles = readdirSync(fragmentDir)
    .filter((name) => name.endsWith(suffix))
    .sort();

  const mergeDeep = (
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ) => {
    for (const [key, value] of Object.entries(source)) {
      const existing = target[key];
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        existing !== null &&
        typeof existing === "object" &&
        !Array.isArray(existing)
      ) {
        mergeDeep(
          existing as Record<string, unknown>,
          value as Record<string, unknown>,
        );
        continue;
      }
      target[key] = value;
    }
  };

  for (const file of fragmentFiles) {
    const fragment = JSON.parse(
      readFileSync(join(fragmentDir, file), "utf8"),
    ) as Record<string, unknown>;

    for (const [key, value] of Object.entries(fragment)) {
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        key in base &&
        base[key] !== null &&
        typeof base[key] === "object" &&
        !Array.isArray(base[key])
      ) {
        mergeDeep(
          base[key] as Record<string, unknown>,
          value as Record<string, unknown>,
        );
        continue;
      }
      base[key] = value;
    }
  }

  writeFileSync(basePath, `${JSON.stringify(base, null, 2)}\n`);
  console.log(
    `Merged ${fragmentFiles.length} fragment file(s) into ${locale}.json`,
  );
}
