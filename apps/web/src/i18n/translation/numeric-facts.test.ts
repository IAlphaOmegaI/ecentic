import { expect, test } from "bun:test";
import type { Locale } from "../locales";
import { normalizeCjkMagnitudes } from "./numeric-facts";
import { validateTranslationUnit } from "./validation";

const findings = (source: string, target: string, locale: Locale = "zh-CN") =>
  validateTranslationUnit(
    { id: "amount", text: source, context: "Public article monetary fact" },
    target,
    locale,
  );

test("Chinese and Japanese group large amounts without changing their value", () => {
  expect(findings("About $67 billion", "约670亿美元")).toEqual([]);
  expect(findings("About $67 billion", "約670億米ドル", "ja")).toEqual([]);
  expect(findings("USD 1.25 million", "125万美元")).toEqual([]);
  expect(findings("USD 1.25 million", "125万米ドル", "ja")).toEqual([]);
  expect(findings("€3 trillion", "3万亿欧元")).toEqual([]);
  expect(findings("€3 trillion", "3兆ユーロ", "ja")).toEqual([]);
  expect(findings("JPY 1,000", "1,000 円", "ja")).toEqual([]);
  expect(findings("CNY 50,000", "5万元")).toEqual([]);
  expect(
    findings("126 million prompts", "1億2600万件のプロンプト", "ja"),
  ).toEqual([]);
  expect(findings("12,500 products", "1万2500个商品")).toEqual([]);
  expect(findings("-$126 million", "-1億2600万米ドル", "ja")).toEqual([]);
});

test("exact decimal shifting keeps precision beyond safe JavaScript integers", () => {
  expect(normalizeCjkMagnitudes("$9007199254.740993 billion", "zh-CN")).toBe(
    "$9007199254740993000",
  );
  expect(findings("USD 0.000000001 billion", "1美元")).toEqual([]);
  expect(findings("USD 1.0000000001 billion", "10.000000001亿美元")).toEqual(
    [],
  );
});

test("incorrect magnitude, amount, currency and lost negative signs still fail", () => {
  for (const target of [
    "670万元",
    "6.7亿美元",
    "670亿欧元",
    "670元",
    "670美元",
  ])
    expect(findings("$67 billion", target).length).toBeGreaterThan(0);
  expect(findings("-$67 billion", "670亿美元").length).toBeGreaterThan(0);
  expect(findings("-$67 billion", "-670亿美元")).toEqual([]);
  expect(
    findings("USD 1.0000000001 billion", "10亿美元").length,
  ).toBeGreaterThan(0);
});

test("ordinary CJK words containing currency characters are not money", () => {
  expect(findings("Multiple elements", "多元元素")).toEqual([]);
  expect(findings("A smooth process", "円滑なプロセス", "ja")).toEqual([]);
});

test("normalization does not loosen code, other locales or unknown yen identity", () => {
  expect(findings("`$67 billion`", "`670亿美元`").length).toBeGreaterThan(0);
  expect(findings("$67 billion", "670亿人民币").length).toBeGreaterThan(0);
  expect(findings("¥1,000", "1,000日元").length).toBeGreaterThan(0);
  // Editorial review still checks translated magnitude words in European prose;
  // this change intentionally concerns CJK grouping units only.
  expect(normalizeCjkMagnitudes("67 billion", "fr")).toBe("67 billion");
});

test("dated month names preserve their calendar value when CJK uses digits", () => {
  expect(findings("Between April and July 2026", "2026年4月至7月")).toEqual([]);
  expect(findings("In October 2026", "2026年10月")).toEqual([]);
  expect(findings("In March 2026", "2026年3月", "ja")).toEqual([]);
  expect(findings("On March 10, 2026", "2026年3月10日", "ja")).toEqual([]);
  expect(
    findings("Between April and July 2026", "2026年4月至8月").length,
  ).toBeGreaterThan(0);
  expect(findings("In October 2026", "2026年").length).toBeGreaterThan(0);
});

test("a four-digit year is never partially swallowed as a three-digit grouping", () => {
  expect(findings("Versions 1 2026", "版本2026和1")).toEqual([]);
  expect(findings("Versions 1 2026", "版本1202和6").length).toBeGreaterThan(0);
});

test("CJK digits can represent explicit durations and ordinals, not invented counts", () => {
  expect(findings("Ships in a week", "発送まで1週間", "ja")).toEqual([]);
  expect(
    findings(
      "The first block and the second and third",
      "最初のブロックと2番目、3番目",
      "ja",
    ),
  ).toEqual([]);
  expect(findings("Wait a second", "2秒待つ", "ja").length).toBeGreaterThan(0);
  expect(
    findings("The third block", "4番目のブロック", "ja").length,
  ).toBeGreaterThan(0);
  expect(
    findings("126 million prompts", "1億2601万件のプロンプト", "ja").length,
  ).toBeGreaterThan(0);
});

test("a price-label dash is a separator but a monetary minus stays negative", () => {
  expect(
    findings("Add to Cart - $139", "In den Warenkorb – $139", "de"),
  ).toEqual([]);
  expect(
    findings("Add to Cart — $139", "In den Warenkorb – $139", "de"),
  ).toEqual([]);
  for (const source of ["-$10", "- $10", "Balance: - $10", "Balance − $10"]) {
    expect(findings(source, "$10", "de").length).toBeGreaterThan(0);
    expect(findings(source, "−10 $", "de")).toEqual([]);
  }
  expect(
    findings("`Add to Cart - $139`", "`Add to Cart – $139`", "de").length,
  ).toBeGreaterThan(0);
});
