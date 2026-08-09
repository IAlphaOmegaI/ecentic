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

  for (const file of fragmentFiles) {
    const fragment = JSON.parse(
      readFileSync(join(fragmentDir, file), "utf8"),
    ) as Record<string, unknown>;

    for (const [key, value] of Object.entries(fragment)) {
      base[key] = value;
    }
  }

  writeFileSync(basePath, `${JSON.stringify(base, null, 2)}\n`);
  console.log(
    `Merged ${fragmentFiles.length} fragment file(s) into ${locale}.json`,
  );
}
