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
  K: 3,
  M: 6,
  B: 9,
  T: 12,
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

/**
 * Italian uses the long scale: one English trillion is 1.000 miliardi.
 * Extract only explicit currency amounts, keeping their currency and value
 * paired. Bare product counts, versions and other magnitudes stay untouched.
 */
export const monetaryMagnitudeFacts = (text: string, locale: "en" | "it") => {
  const powers: Readonly<Record<string, number>> =
    locale === "en"
      ? {
          k: 3,
          m: 6,
          b: 9,
          t: 12,
          thousand: 3,
          million: 6,
          billion: 9,
          trillion: 12,
        }
      : {
          k: 3,
          m: 6,
          b: 9,
          t: 12,
          mille: 3,
          mila: 3,
          milione: 6,
          milioni: 6,
          miliardo: 9,
          miliardi: 9,
          bilione: 12,
          bilioni: 12,
          biliardo: 15,
          biliardi: 15,
          trilione: 18,
          trilioni: 18,
        };
  const grouping = locale === "en" ? "," : "\\.";
  const decimal = locale === "en" ? "\\." : ",";
  const number = `[−-]?(?:\\d{1,3}(?:${grouping}\\d{3})+|\\d+)(?:${decimal}\\d+)?`;
  const currency = "(?:\\bUS\\$|[$€£¥]|\\b(?:USD|EUR|GBP|JPY|CNY)\\b)";
  const magnitude = `(?:${Object.keys(powers).join("|")})(?![\\p{L}\\p{N}_])`;
  const values: string[] = [];
  const extract = (marker: string, amount: string, unit: string) => {
    const canonical =
      locale === "it"
        ? amount.replaceAll(".", "").replace(",", ".")
        : amount.replaceAll(",", "");
    const scaled = scaleDecimal(canonical, powers[unit.toLowerCase()] ?? 0)
      .replace(/(\.\d*?)0+$/u, "$1")
      .replace(/\.$/u, "");
    values.push(`${marker}:${scaled}`);
    // A nonnumeric boundary prevents adjacent prose counts from joining.
    return "\uFFFC";
  };
  const prefix = text.replace(
    new RegExp(
      `([−-]\\s*)?(${currency})\\s*(${number})\\s*(${magnitude})`,
      "giu",
    ),
    (
      match,
      sign: string | undefined,
      marker: string,
      amount: string,
      unit: string,
      offset: number,
    ) => {
      if (sign && /^[−-]/u.test(amount)) return match;
      const labelSeparator =
        sign !== undefined &&
        /^-\s/u.test(sign) &&
        /[\p{L}\p{N}]\s+$/u.test(text.slice(0, offset));
      return extract(
        marker,
        sign && !labelSeparator ? `${sign.trim()}${amount}` : amount,
        unit,
      );
    },
  );
  const remainder = prefix.replace(
    new RegExp(
      `(?<![\\p{L}\\p{N}_.,])(${number})\\s*(${magnitude})\\s*(?:di\\s+)?(${currency})`,
      "giu",
    ),
    (_, amount: string, unit: string, marker: string) =>
      extract(marker, amount, unit),
  );
  return { remainder, values };
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

// This compound supplies its own unit amount. Keep the match limited to the
// explicit valuation phrase; bare magnitudes and differently qualified amounts
// must not acquire an invented numeral or currency.
const normalizeImplicitDollarAmounts = (text: string) =>
  text
    .replace(
      /\ba(?: reported)? billion-dollar(?= valuation\b)/giu,
      "USD 1 billion",
    )
    .replace(/\bsub-dollar(?= transactions\b)/giu, "under USD 1");

/** Both endpoints of “$3 to $5 trillion” share the trailing magnitude. */
const expandMonetaryRange = (text: string) =>
  text.replace(
    /((?:US\$|[$€£¥]|\b(?:USD|EUR|GBP|JPY|CNY)))\s*(\d+(?:,\d{3})*(?:\.\d+)?)(\s+(?:to|through|[–—-])\s+)((?:US\$|[$€£¥]|\b(?:USD|EUR|GBP|JPY|CNY)))\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s+(thousand\b|million\b|billion\b|trillion\b)/gu,
    (
      match,
      firstCurrency: string,
      firstAmount: string,
      connector: string,
      secondCurrency: string,
      secondAmount: string,
      magnitude: string,
    ) => {
      if (firstCurrency !== secondCurrency) return match;
      const exponent = magnitudePowers[magnitude] ?? 0;
      return `${firstCurrency}${scaleDecimal(firstAmount, exponent)}${connector}${secondCurrency}${scaleDecimal(secondAmount, exponent)}`;
    },
  );

/**
 * CJK changes the grouping unit, not the quantity: $67 billion = 670亿美元.
 * Only explicit magnitudes are normalized; ordinary counts, versions and signs
 * continue through the existing exact numeric comparison.
 */
export const normalizeCjkMagnitudes = (text: string, locale: Locale) => {
  if (locale !== "ja" && locale !== "zh-CN") return text;
  // A monetary $67B is unambiguous; a model ID, file size or bare 67B is not.
  const monetary = expandMonetaryRange(
    normalizeImplicitDollarAmounts(text),
  ).replace(
    /((?:US\$|[$€£¥]|\b(?:USD|EUR|GBP|JPY|CNY)\s*)\s*)([−-]?\d+(?:,\d{3})*(?:\.\d+)?)\s*([KMBT])\b/gu,
    (_, currency: string, decimal: string, magnitude: string) =>
      `${currency}${scaleDecimal(decimal, magnitudePowers[magnitude] ?? 0)}`,
  );
  const english = monetary.replace(
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
  const monthLabels = [
    ...monthNames,
    ...monthNames.map((month) => month.slice(0, 3)),
    "Sept",
  ];
  const monthPattern = `(?:${[...new Set(monthLabels)].join("|")})\\b\\.?`;
  return text.replace(
    new RegExp(
      `\\b(?:${monthPattern})(?:\\s*(?:and|to|through|[–—-])\\s*(?:${monthPattern}))?(?:\\s+\\d{1,2}(?:st|nd|rd|th)?[,]?)?\\s+\\d{4}\\b`,
      "g",
    ),
    (date) =>
      date.replace(
        new RegExp(`\\b${monthPattern}`, "g"),
        (month) =>
          `${monthNames.findIndex((name) => name.startsWith(month.replace(/\.$/u, ""))) + 1}|`,
      ),
  );
};

/** Written units after explicit numerals are equivalent to the percent symbol. */
const normalizePercentageWords = (text: string, locale: Locale) => {
  const localeUnits: Readonly<Record<Locale, string>> = {
    en: "percent|per[ \\u00a0\\u202f]+cent",
    es: "por[ \\u00a0\\u202f]+ciento",
    fr: "pour[ \\u00a0\\u202f]*cents?",
    de: "Prozent",
    it: "per[ \\u00a0\\u202f]+cento",
    ja: "パーセント",
    "zh-CN": "",
  };
  const units = [localeUnits.en, localeUnits[locale]].filter(Boolean).join("|");
  const suffix = text.replace(
    new RegExp(
      `(\\d(?:[.,]\\d+)*[ \\u00a0\\u202f]*)(?:${units})(?![\\p{L}\\p{N}_])`,
      "giu",
    ),
    "$1%",
  );
  // Chinese places the unit before its numeral; keep the numeral untouched.
  return locale === "zh-CN"
    ? suffix.replace(/百分之(?=[ \u00a0\u202f]*[−-]?\d)/gu, "%")
    : suffix;
};

/** Unambiguous currency names may be localized, but never exchanged. */
export const currencyAndPercentFacts = (
  text: string,
  locale: Locale,
  dollarCurrency?: "USD",
) => {
  const normalized = normalizePercentageWords(text, locale);
  if (locale !== "ja" && locale !== "zh-CN")
    return Array.from(
      normalized.matchAll(/[$€£¥%％]|\b(?:USD|EUR|GBP|JPY|CNY)\b/g),
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
    normalizeImplicitDollarAmounts(
      dollarCurrency === "USD"
        ? normalized.replace(/\bdollars?\b/giu, "USD")
        : normalized,
    )
      .replace(/\ba dollar\b/giu, "USD")
      .replace(/\bUS dollars?\b/giu, "USD")
      .matchAll(
        /US\$|\b(?:USD|EUR|GBP|JPY|CNY)\b|アメリカドル|米ドル|英ポンド|ユーロ|人民币|人民元|美元|欧元|英镑|日元|日円|(?<=[\d万萬亿億兆])\s*[元円]|[$€£¥%％]/gu,
      ),
    ([token]) => currencies[token.trim()] ?? token,
  );
};
