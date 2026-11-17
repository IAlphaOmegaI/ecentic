import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  type MessageFormatElement,
  parse,
  TYPE,
} from "@formatjs/icu-messageformat-parser";
import { locales } from "../src/i18n/locales";

const root = resolve(import.meta.dir, "..");
const flatten = (value: unknown, path = ""): Record<string, string> => {
  if (typeof value === "string") return { [path]: value };
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Expected a message or namespace at ${path}`);
  return Object.assign(
    {},
    ...Object.entries(value).map(([key, child]) =>
      flatten(child, path ? `${path}.${key}` : key),
    ),
  );
};

const contract = (elements: MessageFormatElement[]): string[] =>
  elements.flatMap((element) => {
    switch (element.type) {
      case TYPE.literal:
      case TYPE.pound:
        return [];
      case TYPE.tag:
        return [`tag:${element.value}`, ...contract(element.children)];
      case TYPE.select:
        return [
          `select:${element.value}:${Object.keys(element.options).sort().join(",")}`,
          ...Object.values(element.options).flatMap((option) =>
            contract(option.value),
          ),
        ];
      case TYPE.plural:
        return [
          `plural:${element.value}:${element.pluralType}:${element.offset}`,
          ...Object.keys(element.options)
            .filter((key) => key.startsWith("="))
            .map((key) => `exact:${key}`),
          ...Object.values(element.options).flatMap((option) =>
            contract(option.value),
          ),
        ];
      default:
        return [`argument:${element.value}:${element.type}`];
    }
  });

const read = async (path: string) =>
  flatten(JSON.parse(await readFile(resolve(root, path), "utf8")));
const source = await read("messages/en.json");
const failures: string[] = [];
const sourceKeys = Object.keys(source).sort();
for (const locale of locales) {
  const messages = await read(`messages/${locale}.json`);
  const fragment = await read(`messages/fragments/outbound.${locale}.json`);
  if (
    JSON.stringify(Object.keys(messages).sort()) !== JSON.stringify(sourceKeys)
  )
    failures.push(`${locale}: catalog keys differ from English`);
  if (JSON.stringify(messages) !== JSON.stringify(fragment))
    failures.push(
      `${locale}: fragment and merged catalog differ; run the merge script`,
    );
  for (const [key, value] of Object.entries(messages)) {
    if (!value.trim()) failures.push(`${locale}:${key}: empty message`);
    try {
      const expected = [...new Set(contract(parse(source[key] ?? "")))].sort();
      const actual = [...new Set(contract(parse(value)))].sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        failures.push(`${locale}:${key}: ICU arguments or structure differ`);
    } catch (error) {
      failures.push(
        `${locale}:${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${sourceKeys.length} Outbound messages in ${locales.length} locales.`,
  );
}
