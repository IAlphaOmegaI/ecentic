import { expect, test } from "bun:test";
import { validateTranslationUnit } from "./validation";

test("legacy brand capitalization can become the canonical prose spelling", () => {
  expect(
    validateTranslationUnit(
      {
        id: "brand",
        text: "Ecentic helps you rank in chatgpt.",
        context: "Article prose",
      },
      "ecentic hilft Ihnen beim Ranking in ChatGPT.",
      "de",
    ),
  ).toEqual([]);
  for (const target of [
    "ecentic hilft Ihnen.",
    "ecentic hilft Ihnen in ChatGPT und chatgpt.",
  ]) {
    expect(
      validateTranslationUnit(
        {
          id: "brand",
          text: "Ecentic helps you rank in chatgpt.",
          context: "Article prose",
        },
        target,
        "de",
      ).length,
    ).toBeGreaterThan(0);
  }
  expect(
    validateTranslationUnit(
      {
        id: "brand",
        text: "ecentic helps with ChatGPT.",
        context: "Article prose",
      },
      "Ecentic hilft mit ChatGPT.",
      "de",
    ).length,
  ).toBeGreaterThan(0);
  const legal = "ECENTIC SH.P.K. · Pallatet, Albania";
  expect(
    validateTranslationUnit(
      { id: "legal", text: legal, context: "Legal company name and address" },
      legal,
      "it",
    ),
  ).toEqual([]);
});

test("brand normalization never edits code or URLs or protects ordinary plan verbs", () => {
  const unit = {
    id: "code",
    text: "Use `chatgpt` at https://ecentic.ai/chatgpt to scale.",
    context: "Code and URL",
  };
  expect(
    validateTranslationUnit(
      unit,
      "Nutzen Sie `chatgpt` unter https://ecentic.ai/chatgpt, um zu wachsen.",
      "de",
    ),
  ).toEqual([]);
  expect(
    validateTranslationUnit(
      unit,
      "Nutzen Sie `ChatGPT` unter https://ecentic.ai/ChatGPT, um zu wachsen.",
      "de",
    ).length,
  ).toBeGreaterThan(0);
});

test("only trusted inline English articles may have empty CJK targets", () => {
  const unit = {
    id: "html.body.1.0",
    text: "The",
    context: "The <a>linked report</a> says…",
    group: "html.body.1",
    format: "plain" as const,
    grammaticalArticle: true as const,
  };
  expect(validateTranslationUnit(unit, "", "ja")).toEqual([]);
  expect(validateTranslationUnit(unit, "", "zh-CN")).toEqual([]);
  expect(validateTranslationUnit(unit, "", "fr").length).toBeGreaterThan(0);
  for (const guarded of [
    { ...unit, grammaticalArticle: undefined },
    { ...unit, group: undefined },
    { ...unit, text: "The report" },
    { ...unit, format: "icu" as const },
    { ...unit, invariant: true },
  ])
    expect(validateTranslationUnit(guarded, "", "ja").length).toBeGreaterThan(
      0,
    );
});

test("case normalization still preserves mentions within each ICU branch", () => {
  const unit = {
    id: "choices",
    text: "{kind, select, a {Ecentic} other {chatgpt}}",
    context: "Provider label",
    format: "icu" as const,
  };
  expect(
    validateTranslationUnit(
      unit,
      "{kind, select, a {ecentic} other {ChatGPT}}",
      "de",
    ),
  ).toEqual([]);
  expect(
    validateTranslationUnit(
      unit,
      "{kind, select, a {ChatGPT} other {ecentic}}",
      "de",
    ).length,
  ).toBeGreaterThan(0);
});

test("backtick URLs stop before adjacent Japanese prose without relaxing code", () => {
  const unit = {
    id: "scope",
    context: "OAuth scope in consent copy",
    text: "Requires `https://www.googleapis.com/auth/content`.",
    format: "plain" as const,
  };
  expect(
    validateTranslationUnit(
      unit,
      "`https://www.googleapis.com/auth/content`を要求します。",
      "ja",
    ),
  ).toEqual([]);
  expect(
    validateTranslationUnit(
      unit,
      "`https://www.googleapis.com/auth/other`を要求します。",
      "ja",
    ).length,
  ).toBeGreaterThan(0);
});
