import { expect, test } from "bun:test";
import { validateTranslationUnit } from "./validation";

test("hyphenated week labels keep their positive number when French uses a space", () => {
  expect(
    validateTranslationUnit(
      {
        id: "readout",
        text: "Agreed baseline and week-6 readout",
        context: "A pilot deliverable in the sixth week",
      },
      "Référence convenue et compte rendu à la semaine 6",
      "fr",
    ),
  ).toEqual([]);
});

test("a genuine spaced negative week cannot lose its sign", () => {
  expect(
    validateTranslationUnit(
      {
        id: "offset",
        text: "Readout at week -6",
        context: "A negative offset from launch",
      },
      "Compte rendu à la semaine 6",
      "fr",
    ).length,
  ).toBeGreaterThan(0);
});

test("German hyphenated ranking and standard compounds retain positive numbers", () => {
  for (const [source, target] of [
    ["Top 10 products", "Top-10-Produkte"],
    ["ISO 4217 currency code", "ISO-4217-Währungscode"],
  ] as const) {
    expect(
      validateTranslationUnit(
        { id: "label", text: source, context: "Technical label" },
        target,
        "de",
      ),
    ).toEqual([]);
  }
});

test("German standalone ordinal dates are not Markdown lists", () => {
  for (const [source, target] of [
    ["10 November 2026", "10. November 2026"],
    ["November 12, 2026", "12. November 2026"],
  ] as const) {
    expect(
      validateTranslationUnit(
        { id: "date", text: source, context: "Publication date" },
        target,
        "de",
      ),
    ).toEqual([]);
  }
});

test("ICU argument boundaries do not invent Markdown headings", () => {
  expect(
    validateTranslationUnit(
      {
        id: "rank",
        text: "#{position} on Google",
        context: "Rank badge",
        format: "icu",
      },
      "Nr. {position} bei Google",
      "de",
    ),
  ).toEqual([]);
});

test("real ordered lists and negative quantities remain protected", () => {
  expect(
    validateTranslationUnit(
      {
        id: "list",
        text: "1. Review\n2. Publish",
        context: "Markdown steps",
        format: "markdown",
      },
      "Prüfen\nVeröffentlichen",
      "de",
    ).length,
  ).toBeGreaterThan(0);
  expect(
    validateTranslationUnit(
      { id: "offset", text: "Temperature -10", context: "Negative value" },
      "Temperatur 10",
      "de",
    ).length,
  ).toBeGreaterThan(0);
});
