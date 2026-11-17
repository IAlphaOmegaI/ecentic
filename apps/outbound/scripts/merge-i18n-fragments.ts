import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { locales } from "../src/i18n/locales";

const root = resolve(import.meta.dir, "..");
for (const locale of locales) {
  const fragment = JSON.parse(
    await readFile(
      resolve(root, `messages/fragments/outbound.${locale}.json`),
      "utf8",
    ),
  );
  if (Object.keys(fragment).length !== 1 || !fragment.outbound)
    throw new Error(`${locale}: expected only the outbound namespace`);
  await writeFile(
    resolve(root, `messages/${locale}.json`),
    `${JSON.stringify(fragment, null, 2)}\n`,
  );
}
console.log(`Merged Outbound messages for ${locales.length} locales.`);
