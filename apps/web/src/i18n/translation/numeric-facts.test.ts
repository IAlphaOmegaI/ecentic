import { expect, test } from "bun:test";
import type { Locale } from "../locales";
import {
  monetaryMagnitudeFacts,
  normalizeCjkDates,
  normalizeCjkMagnitudes,
} from "./numeric-facts";
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

test("an implicit billion-dollar valuation retains the exact amount and currency", () => {
  const source = "Raised $96 million at a reported billion-dollar valuation.";
  expect(
    findings(source, "評価額10億米ドルで9,600万米ドルを調達。", "ja"),
  ).toEqual([]);
  expect(findings(source, "以10亿美元的估值融资9,600万美元。")).toEqual([]);
  expect(
    findings(source, "評価額1億米ドルで9,600万米ドルを調達。", "ja").length,
  ).toBeGreaterThan(0);
  expect(
    findings(source, "評価額10億ユーロで9,600万米ドルを調達。", "ja").length,
  ).toBeGreaterThan(0);
  expect(
    findings("`a billion-dollar valuation`", "`10億米ドルの評価額`", "ja")
      .length,
  ).toBeGreaterThan(0);
  expect(normalizeCjkMagnitudes("a 2 billion-dollar valuation", "ja")).toBe(
    "a 2000000000-dollar valuation",
  );
  expect(
    normalizeCjkMagnitudes(
      "a multi-billion-dollar valuation; billion-dollar market",
      "ja",
    ),
  ).toBe("a multi-billion-dollar valuation; billion-dollar market");
  expect(
    normalizeCjkMagnitudes("a reported billion-dollar valuation", "fr"),
  ).toBe("a reported billion-dollar valuation");
});

test("currency-prefixed magnitude abbreviations preserve value and currency", () => {
  expect(findings("$67B", "670億米ドル", "ja")).toEqual([]);
  expect(findings("USD 1.25M", "125万美元")).toEqual([]);
  expect(findings("€3T", "3兆ユーロ", "ja")).toEqual([]);
  expect(findings("-$67B", "-670亿美元")).toEqual([]);
  expect(findings("$67B", "67億米ドル", "ja").length).toBeGreaterThan(0);
  expect(findings("$67B", "670亿欧元").length).toBeGreaterThan(0);
  expect(findings("`$67B`", "`670亿美元`").length).toBeGreaterThan(0);
  expect(normalizeCjkMagnitudes("67B model, 10MB file", "ja")).toBe(
    "67B model, 10MB file",
  );
  expect(normalizeCjkMagnitudes("$67B", "fr")).toBe("$67B");
});

test("a monetary range can repeat its shared magnitude in CJK", () => {
  const source = "$3 to $5 trillion globally by 2030";
  expect(findings(source, "到2030年全球规模为3万亿美元至5万亿美元")).toEqual(
    [],
  );
  expect(
    findings(source, "2030年までに世界で3兆米ドルから5兆米ドル", "ja"),
  ).toEqual([]);
  expect(
    findings(source, "到2030年全球规模为3亿美元至5万亿美元").length,
  ).toBeGreaterThan(0);
  expect(
    findings(source, "到2030年全球规模为3万欧元至5万亿欧元").length,
  ).toBeGreaterThan(0);
  expect(
    findings(source, "到2030年全球规模为5万亿美元").length,
  ).toBeGreaterThan(0);
  expect(
    findings("`$3 to $5 trillion`", "`3万亿美元至5万亿美元`").length,
  ).toBeGreaterThan(0);
  expect(normalizeCjkMagnitudes("3 to 5 trillion parameters", "ja")).toBe(
    "3 to 5000000000000 parameters",
  );
  expect(normalizeCjkMagnitudes("$3 to $5 trillion", "fr")).toBe(
    "$3 to $5 trillion",
  );
});

test("sub-dollar transactions retain their dollar threshold", () => {
  expect(findings("sub-dollar transactions", "低于1美元的交易")).toEqual([]);
  expect(
    findings("sub-dollar transactions", "1米ドル未満の取引", "ja"),
  ).toEqual([]);
  expect(
    findings("sub-dollar transactions", "低于2美元的交易").length,
  ).toBeGreaterThan(0);
  expect(
    findings("sub-dollar transactions", "低于1欧元的交易").length,
  ).toBeGreaterThan(0);
  expect(
    findings("`sub-dollar transactions`", "`低于1美元的交易`").length,
  ).toBeGreaterThan(0);
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

test("hyphenated English cardinal compounds preserve one whole quantity", () => {
  const source =
    "Twenty-five audits a month for a 60-product store; a 600-product catalog takes two years.";
  expect(
    findings(
      source,
      "60商品を扱う店舗では月25件の監査が可能で、600商品のカタログには2年かかります。",
      "ja",
    ),
  ).toEqual([]);
  expect(findings("Thirty-one products", "31件商品")).toEqual([]);
  expect(findings("Ninety-nine products", "99件商品")).toEqual([]);
  expect(
    findings("Twenty-five audits", "24件の監査", "ja").length,
  ).toBeGreaterThan(0);
  expect(
    findings("Twenty-five audits", "20件と5件の監査", "ja").length,
  ).toBeGreaterThan(0);
  expect(findings("Twenty minus five", "25件", "ja").length).toBeGreaterThan(0);
  expect(
    findings("`Twenty-five audits`", "`25件の監査`", "ja").length,
  ).toBeGreaterThan(0);
});

test("explicit US dollar names preserve currency when localized in CJK", () => {
  const source = "Prices are monthly, in US dollars.";
  expect(findings(source, "料金は月額で、米ドル建てです。", "ja")).toEqual([]);
  expect(findings(source, "价格为月费，以美元计价。")).toEqual([]);
  expect(findings("The US dollar", "米ドル", "ja")).toEqual([]);
  expect(
    findings(source, "料金は月額で、ユーロ建てです。", "ja").length,
  ).toBeGreaterThan(0);
  expect(findings(source, "价格为月费。").length).toBeGreaterThan(0);
  expect(findings("Canadian dollars", "米ドル", "ja").length).toBeGreaterThan(
    0,
  );
  expect(findings("`US dollars`", "`米ドル`", "ja").length).toBeGreaterThan(0);
});

test("a dollar can use a natural CJK amount without changing currency", () => {
  const source = "Under $50 or $100, rather than a dollar above them.";
  expect(findings(source, "低于$50或$100，而不是高出1美元。")).toEqual([]);
  expect(findings(source, "低于$50或$100，而不是高出一美元。")).toEqual([]);
  expect(
    findings(
      source,
      "$50または$100未満にし、1米ドル上回らないようにします。",
      "ja",
    ),
  ).toEqual([]);
  expect(
    findings(source, "低于$50或$100，而不是高出2美元。").length,
  ).toBeGreaterThan(0);
  expect(
    findings(source, "低于$50或$100，而不是高出1欧元。").length,
  ).toBeGreaterThan(0);
  expect(findings("`a dollar`", "`1美元`").length).toBeGreaterThan(0);
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

test("dated month abbreviations preserve their value without rewriting prose or code", () => {
  expect(findings("Oct 2025", "2025年10月", "ja")).toEqual([]);
  expect(findings("Sept. 2026", "2026年9月")).toEqual([]);
  expect(findings("Nov. 12, 2026", "2026年11月12日", "ja")).toEqual([]);
  expect(findings("Oct 2025", "2025年11月", "ja").length).toBeGreaterThan(0);
  expect(findings("`Oct 2025`", "`2025年10月`", "ja").length).toBeGreaterThan(
    0,
  );
  expect(normalizeCjkDates("May improve in 2026; Oct release", "ja")).toBe(
    "May improve in 2026; Oct release",
  );
  expect(normalizeCjkDates("Oct 2025", "fr")).toBe("Oct 2025");
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

test("hyphenated duration ranges do not invent a negative upper endpoint", () => {
  const source = "Run a 30-to-60-day pilot before committing annually.";
  expect(
    findings(
      source,
      "Avvia un progetto pilota da 30 a 60 giorni prima di sottoscrivere un impegno annuale.",
      "it",
    ),
  ).toEqual([]);
  expect(
    findings(
      source,
      "Avvia un progetto pilota di 30–60 giorni prima di sottoscrivere un impegno annuale.",
      "it",
    ),
  ).toEqual([]);
  expect(
    findings(source, "Avvia un progetto pilota da 30 a 90 giorni.", "it")
      .length,
  ).toBeGreaterThan(0);
  expect(
    findings("`30-to-60-day`", "`30–60 giorni`", "it").length,
  ).toBeGreaterThan(0);
  expect(findings("Balance: -60", "Saldo: 60", "it").length).toBeGreaterThan(0);
});

test("hyphenated year modifiers do not turn dates into negative quantities", () => {
  expect(
    findings("Under 0.2% in mid-2025", "Unter 0,2 % Mitte 2025", "de"),
  ).toEqual([]);
  expect(
    findings("Early-2026 to late-2027", "2026年初から2027年末まで", "ja"),
  ).toEqual([]);
  expect(findings("mid-2025", "Mitte 2026", "de").length).toBeGreaterThan(0);
  expect(
    findings("Balance: -2025", "Saldo: 2025", "de").length,
  ).toBeGreaterThan(0);
  expect(findings("`mid-2025`", "`Mitte 2025`", "de").length).toBeGreaterThan(
    0,
  );
});

test("Italian monetary magnitudes preserve exact short-scale values", () => {
  expect(
    findings(
      "Over $1 trillion by 2029",
      "Oltre $1.000 miliardi entro il 2029",
      "it",
    ),
  ).toEqual([]);
  expect(findings("$15 trillion", "$15.000 miliardi", "it")).toEqual([]);
  expect(findings("€1.5 trillion", "1.500 miliardi di €", "it")).toEqual([]);
  expect(findings("USD 1.25 billion", "1.250 milioni USD", "it")).toEqual([]);
  expect(findings("€70M", "70 milioni €", "it")).toEqual([]);
  expect(findings("$1 billion", "$1M", "it").length).toBeGreaterThan(0);
  expect(findings("$1 trillion", "$1 miliardo", "it").length).toBeGreaterThan(
    0,
  );
  expect(findings("$1 trillion", "$1 trilione", "it").length).toBeGreaterThan(
    0,
  );
  expect(
    findings("$1 trillion", "€1.000 miliardi", "it").length,
  ).toBeGreaterThan(0);
  expect(
    findings("$1 trillion", "$1.001 miliardi", "it").length,
  ).toBeGreaterThan(0);
});

test("monetary magnitude matching preserves precision, signs and currency association", () => {
  expect(
    findings(
      "$9007199254.740993 billion",
      "$9.007.199.254,740993 miliardi",
      "it",
    ),
  ).toEqual([]);
  expect(
    findings("$0.0000000000001 trillion", "$0,000000000100 miliardi", "it"),
  ).toEqual([]);
  expect(
    findings(
      "$9007199254.740993 billion",
      "$9.007.199.254,740992 miliardi",
      "it",
    ).length,
  ).toBeGreaterThan(0);
  for (const source of [
    "-$1 trillion",
    "$-1 trillion",
    "Balance: - $1 trillion",
    "Balance − $1 trillion",
  ]) {
    expect(findings(source, "-1.000 miliardi $", "it")).toEqual([]);
    expect(findings(source, "$1.000 miliardi", "it").length).toBeGreaterThan(0);
  }
  // A leading spaced hyphen also forms a Markdown list; keep its topology.
  expect(findings("- $1 trillion", "- $1.000 miliardi", "it")).toEqual([]);
  expect(monetaryMagnitudeFacts("- $1 trillion", "en").values).toEqual([
    "$:-1000000000000",
  ]);
  expect(
    findings("Value - $1 trillion", "Valore – $1.000 miliardi", "it"),
  ).toEqual([]);
  expect(
    findings(
      "$1 trillion and €2 trillion",
      "$2.000 miliardi e €1.000 miliardi",
      "it",
    ).length,
  ).toBeGreaterThan(0);
});

test("Italian magnitude equivalence never loosens prose counts or literal code", () => {
  const source = "$1 trillion; 1,000 products; version 0.5; 5 steps; 40%";
  expect(
    findings(
      source,
      "$1.000 miliardi; 1.000 prodotti; versione 0.5; 5 passi; 40%",
      "it",
    ),
  ).toEqual([]);
  for (const target of [
    "$1.000 miliardi; 1 prodotto; versione 0.5; 5 passi; 40%",
    "$1.000 miliardi; 1.000 prodotti; versione 0.6; 5 passi; 40%",
    "$1.000 miliardi; 1.000 prodotti; versione 0.5; 6 passi; 40%",
    "$1.000 miliardi; 1.000 prodotti; versione 0.5; 5 passi; 41%",
  ])
    expect(findings(source, target, "it").length).toBeGreaterThan(0);
  expect(
    monetaryMagnitudeFacts("1 trillion products, 10M model, version 0.5", "en"),
  ).toEqual({
    remainder: "1 trillion products, 10M model, version 0.5",
    values: [],
  });
  expect(
    findings("1 trillion products", "1.000 miliardi di prodotti", "it").length,
  ).toBeGreaterThan(0);
  expect(
    findings("`$1 trillion`", "`$1.000 miliardi`", "it").length,
  ).toBeGreaterThan(0);
  expect(
    findings(
      "https://example.com/$1trillion",
      "https://example.com/$1000miliardi",
      "it",
    ).length,
  ).toBeGreaterThan(0);
  expect(
    findings(
      "Use `$1 trillion` for 3 examples.",
      "Usa `$1 trillion` per 3 esempi.",
      "it",
    ),
  ).toEqual([]);
  expect(
    findings(
      "Use https://example.com/$1trillion",
      "Usa https://example.com/$1trillion",
      "it",
    ),
  ).toEqual([]);
  expect(
    findings("[See](/amount/$1trillion)", "[Vedi](/amount/$1trillion)", "it"),
  ).toEqual([]);
  expect(
    findings("[See](/amount/$1trillion)", "[Vedi](/amount/$1000miliardi)", "it")
      .length,
  ).toBeGreaterThan(0);
  expect(
    findings(
      '<span title="$1 trillion">Amount</span>',
      '<span title="$1 trillion">Importo</span>',
      "it",
    ),
  ).toEqual([]);
});

test("pre/post year qualifiers preserve dates without accepting negative changes", () => {
  expect(findings("Classic SEO (pre-2015)", "经典 SEO（2015 年前）")).toEqual(
    [],
  );
  expect(findings("post-2026", "2026 年后")).toEqual([]);
  expect(findings("pre-2015", "2016 年前").length).toBeGreaterThan(0);
  expect(findings("Balance: -2015", "余额：2015").length).toBeGreaterThan(0);
  expect(findings("`pre-2015`", "`2015 年前`").length).toBeGreaterThan(0);
});

test("CSV prose plurals keep counts while code and URLs stay literal", () => {
  expect(findings("Export CSVs", "Exporter des fichiers CSV", "fr")).toEqual(
    [],
  );
  expect(findings("CSV and CSVs", "CSV et CSV", "fr")).toEqual([]);
  expect(findings("CSV and CSVs", "CSV", "fr").length).toBeGreaterThan(0);
  expect(
    findings("Export CSVs", "Exporter des fichiers TSV", "fr").length,
  ).toBeGreaterThan(0);
  expect(
    findings("Export `CSVs`", "Exporter `CSV`", "fr").length,
  ).toBeGreaterThan(0);
  expect(
    findings("https://example.com/CSVs", "https://example.com/CSV", "fr")
      .length,
  ).toBeGreaterThan(0);
});

test("written percentage units preserve both endpoints and native notation", () => {
  expect(findings("15 to 20 percent", "15 à 20 %", "fr")).toEqual([]);
  expect(findings("20 to 40 per cent", "20 à 40\u00a0%", "fr")).toEqual([]);
  expect(findings("15 to 20 percent", "15 à 20 pour cent", "fr")).toEqual([]);
  expect(findings("20%", "20 pour cent", "fr")).toEqual([]);
  expect(findings("20 percent", "20 Prozent", "de")).toEqual([]);
  expect(findings("20 per cent", "20 per cento", "it")).toEqual([]);
  expect(findings("20 percent", "20 por ciento", "es")).toEqual([]);
  expect(findings("20 percent", "20パーセント", "ja")).toEqual([]);
  expect(findings("20 percent", "百分之20", "zh-CN")).toEqual([]);
  expect(findings("20 percent", "20％", "zh-CN")).toEqual([]);
  expect(findings("20.5 percent", "20,5 %", "fr")).toEqual([]);
});

test("percentage notation never discards changed amounts, signs or currencies", () => {
  for (const target of [
    "14 à 20 %",
    "15 à 21 %",
    "15 %",
    "15 à 20",
    "15 à 20 €",
  ])
    expect(findings("15 to 20 percent", target, "fr").length).toBeGreaterThan(
      0,
    );
  expect(findings("-20 percent", "20 %", "fr").length).toBeGreaterThan(0);
  expect(findings("-20 percent", "-20 %", "fr")).toEqual([]);
  expect(
    findings("$15 and 20 percent", "15 € et 20 %", "fr").length,
  ).toBeGreaterThan(0);
  expect(
    findings("15 items and 20 percent", "14 articles et 20 %", "fr").length,
  ).toBeGreaterThan(0);
  expect(
    findings("The percentile is 20", "Le percentile est de 20 %", "fr").length,
  ).toBeGreaterThan(0);
});

test("percentage prose conversion leaves literal code and URLs protected", () => {
  const source =
    "Use `15 percent` and https://example.com/20percent for 30 percent.";
  expect(
    findings(
      source,
      "Utilisez `15 percent` et https://example.com/20percent pour 30 %.",
      "fr",
    ),
  ).toEqual([]);
  expect(
    findings(
      source,
      "Utilisez `15 %` et https://example.com/20percent pour 30 %.",
      "fr",
    ).length,
  ).toBeGreaterThan(0);
  expect(
    findings(
      source,
      "Utilisez `15 percent` et https://example.com/20% pour 30 %.",
      "fr",
    ).length,
  ).toBeGreaterThan(0);
});
