import type { Locale } from "../locales";

/** Decimal shifting stays exact, including values above Number.MAX_SAFE_INTEGER. */
const scaleDecimal = (decimal: string, exponent: number) => {
  const sign = decimal.startsWith("-") || decimal.startsWith("−") ? "-" : "";
  const [integer = "0", fraction = ""] = decimal
    .replace(/^[−-]/u, "")
    .replaceAll(",", "")
    .split(".");
  const coefficient = BigInt(`${integer}${fraction}`);
  const shift = exponent - fraction.length;
  if (shift >= 0) return `${sign}${coefficient * 10n ** BigInt(shift)}`;
  const digits = coefficient.toString().padStart(-shift + 1, "0");
  const point = digits.length + shift;
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
};

const magnitudePowers: Readonly<Record<string, number>> = {
  thousand: 3,
  million: 6,
  billion: 9,
  trillion: 12,
  万: 4,
  萬: 4,
  亿: 8,
  億: 8,
  万亿: 12,
  萬億: 12,
  兆: 12,
};

const sumDecimals = (values: readonly string[]) => {
  const parts = values.map((value) => {
    const [integer = "0", fraction = ""] = value.split(".");
    return {
      coefficient: BigInt(`${integer}${fraction}`),
      scale: fraction.length,
    };
  });
  const scale = Math.max(...parts.map((part) => part.scale));
  const total = parts.reduce(
    (sum, part) => sum + part.coefficient * 10n ** BigInt(scale - part.scale),
    0n,
  );
  return scaleDecimal(`${total}`, -scale);
};

/**
 * CJK changes the grouping unit, not the quantity: $67 billion = 670亿美元.
 * Only explicit magnitudes are normalized; ordinary counts, versions and signs
 * continue through the existing exact numeric comparison.
 */
export const normalizeCjkMagnitudes = (text: string, locale: Locale) => {
  if (locale !== "ja" && locale !== "zh-CN") return text;
  const english = text.replace(
    /([−-]?\d+(?:,\d{3})*(?:\.\d+)?)\s*(thousand\b|million\b|billion\b|trillion\b)/giu,
    (_, decimal: string, magnitude: string) =>
      scaleDecimal(decimal, magnitudePowers[magnitude.toLowerCase()] ?? 0),
  );
  return english.replace(
    /[−-]?(?:\d+(?:,\d{3})*(?:\.\d+)?\s*(?:万亿|萬億|万|萬|亿|億|兆))+(?:\d+(?:\.\d+)?)?/gu,
    (amount) => {
      const sign = /^[−-]/u.test(amount) ? "-" : "";
      const parts = Array.from(
        amount
          .replace(/^[−-]/u, "")
          .matchAll(
            /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(万亿|萬億|万|萬|亿|億|兆)?/gu,
          ),
        ([, decimal = "0", magnitude]) => ({
          decimal,
          exponent: magnitude ? (magnitudePowers[magnitude] ?? 0) : 0,
        }),
      );
      // Compound forms such as 1億2600万 must proceed from larger to smaller units.
      if (
        parts.some(
          (part, index) =>
            index > 0 && part.exponent >= (parts[index - 1]?.exponent ?? 0),
        )
      )
        return amount;
      return `${sign}${sumDecimals(parts.map((part) => scaleDecimal(part.decimal, part.exponent)))}`;
    },
  );
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Named months become numeric months in CJK dates, including dated ranges. */
export const normalizeCjkDates = (text: string, locale: Locale) => {
  if (locale !== "ja" && locale !== "zh-CN") return text;
  const monthPattern = monthNames.join("|");
  return text.replace(
    new RegExp(
      `\\b(?:${monthPattern})(?:\\s*(?:and|to|through|[–—-])\\s*(?:${monthPattern}))?(?:\\s+\\d{1,2}(?:st|nd|rd|th)?[,]?)?\\s+\\d{4}\\b`,
      "g",
    ),
    (date) =>
      date.replace(
        new RegExp(`\\b(${monthPattern})\\b`, "g"),
        (month) =>
          `${monthNames.indexOf(month as (typeof monthNames)[number]) + 1}|`,
      ),
  );
};

/** Unambiguous currency names may be localized, but never exchanged. */
export const currencyAndPercentFacts = (text: string, locale: Locale) => {
  if (locale !== "ja" && locale !== "zh-CN")
    return Array.from(
      text.matchAll(/[$€£¥%％]|\b(?:USD|EUR|GBP|JPY|CNY)\b/g),
      ([token]) => token.replace("％", "%"),
    );
  const currencies: Readonly<Record<string, string>> = {
    $: "USD",
    US$: "USD",
    USD: "USD",
    美元: "USD",
    米ドル: "USD",
    アメリカドル: "USD",
    "€": "EUR",
    EUR: "EUR",
    欧元: "EUR",
    ユーロ: "EUR",
    "£": "GBP",
    GBP: "GBP",
    英镑: "GBP",
    英ポンド: "GBP",
    JPY: "JPY",
    日元: "JPY",
    日円: "JPY",
    円: "JPY",
    CNY: "CNY",
    人民币: "CNY",
    人民元: "CNY",
    元: "CNY",
    // A bare yen/yuan symbol does not tell us which currency the author meant.
    "¥": "¥",
    "%": "%",
    "％": "%",
  };
  return Array.from(
    text.matchAll(
      /US\$|\b(?:USD|EUR|GBP|JPY|CNY)\b|アメリカドル|米ドル|英ポンド|ユーロ|人民币|人民元|美元|欧元|英镑|日元|日円|(?<=[\d万萬亿億兆])\s*[元円]|[$€£¥%％]/gu,
    ),
    ([token]) => currencies[token.trim()] ?? token,
  );
};
