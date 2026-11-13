import {
  type MessageFormatElement,
  parse,
  TYPE,
} from "@formatjs/icu-messageformat-parser";
import { type Locale, localeMetadata } from "../locales";
import {
  currencyAndPercentFacts,
  normalizeCjkDates,
  normalizeCjkMagnitudes,
} from "./numeric-facts";
import { protectedProductTerms, type TranslationReviewPass } from "./policy";

export type TranslationUnit = {
  id: string;
  text: string;
  context: string;
  /** Connected inline slots or a question/answer pair; batch together when possible. */
  group?: string;
  /** Extracted standalone English article; its connected group still receives semantic review. */
  grammaticalArticle?: true;
  format?: "plain" | "icu" | "markdown";
  invariant?: boolean;
  protectedTerms?: readonly string[];
  /** Explicit contextual exceptions, e.g. Scale used as a verb rather than a plan. */
  translatableTerms?: readonly string[];
};

export type TranslationFinding = {
  id: string;
  pass: TranslationReviewPass;
  message: string;
};

const sorted = (values: readonly string[]) => [...values].sort();
const equal = (source: readonly string[], target: readonly string[]) =>
  JSON.stringify(sorted(source)) === JSON.stringify(sorted(target));
const matches = (text: string, expression: RegExp) =>
  Array.from(text.matchAll(expression), (match) => match[0]);
const escapePattern = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const literalMatches = (text: string, term: string, ignoreCase = false) =>
  matches(
    text,
    new RegExp(
      `(?<![A-Za-z0-9_])${escapePattern(term)}${["API", "MCP", "UCP"].includes(term) ? "s?" : ""}(?![A-Za-z0-9_])`,
      ignoreCase ? "gi" : "g",
    ),
  );
const literalOccurrences = (text: string, term: string) =>
  literalMatches(text, term).map(() => term);

const syntaxExpressions = {
  code: /```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`\n]*`+/g,
  urls: /(?:https?:\/\/|mailto:|tel:)[^\s<>`"'\])）。，；»«’”「」『』【】〈〉《》、]+/g,
  emails: /[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  tags: /<\/?[A-Za-z][^>]*>/g,
  placeholders: /\{\{[^{}]+\}\}|\{[A-Za-z_][A-Za-z0-9_.-]*\}|%\d*\$?[sdif]/g,
  links: /!?\[[^\]\n]*\]\([^\s)]*(?:\s+"[^"]*")?\)/g,
  markers: /\*\*|__/g,
  lines: /^(?:#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|>\s)/gm,
} as const;

const numericTokens = (value: string) => {
  // A sign may precede the currency marker (-$10), rather than the digits.
  const text = value.replace(
    /([−-])\s*([$€£¥]|USD|EUR|GBP|JPY|CNY)\s*(?=\d)/g,
    (match, sign: string, currency: string, offset: number) => {
      const labelSeparator =
        sign === "-" &&
        /^-\s/u.test(match) &&
        /[\p{L}\p{N}]\s+$/u.test(value.slice(0, offset));
      return labelSeparator ? currency : `${currency}${sign}`;
    },
  );
  return Array.from(
    text.matchAll(/[−-]?\d+(?:[.,]\d+)*(?:[ \u00a0\u202f]\d{3}(?!\d))*/g),
    (match) =>
      match[0].startsWith("-") &&
      (/[\d%]/.test(text[(match.index ?? 0) - 1] ?? "") ||
        /\b(?:week|day|month|year|phase|stage|step|top|iso)$/i.test(
          text.slice(0, match.index ?? 0),
        ))
        ? match[0].slice(1)
        : match[0],
  );
};

const spelledCounts = (text: string) => {
  const words = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
    "twenty",
  ];
  const cardinals = matches(
    text.toLowerCase(),
    new RegExp(`\\b(?:${words.join("|")})\\b`, "g"),
  ).map((word) => String(words.indexOf(word)));
  const ordinals = [
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
  ];
  const ordinalCounts = Array.from(
    text
      .toLowerCase()
      .matchAll(new RegExp(`\\b(?:${ordinals.join("|")})\\b`, "g")),
  )
    .filter(
      (match) =>
        !/\b(?:a|per|each|every|one)\s+$/u.test(
          text.slice(0, match.index).toLowerCase(),
        ),
    )
    .map(([word]) => String(ordinals.indexOf(word) + 1));
  const singleDurations = matches(
    text.toLowerCase(),
    /\b(?:a|an) (?:second|minute|hour|day|week|month|year)\b/g,
  ).map(() => "1");
  const singleDollars = matches(text.toLowerCase(), /\ba dollar\b/g).map(
    () => "1",
  );
  return [...cardinals, ...ordinalCounts, ...singleDurations, ...singleDollars];
};

const numericValue = (token: string, locale: Locale) => {
  const parts = new Intl.NumberFormat(
    localeMetadata[locale].intlLocale,
  ).formatToParts(12345.6);
  const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
  const grouping = parts.find((part) => part.type === "group")?.value;
  const ungrouped = token.replace(/[ \u00a0\u202f]/g, "").replace("−", "-");
  const normalized = (
    grouping ? ungrouped.replaceAll(grouping, "") : ungrouped
  ).replace(decimal, ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return `literal:${token}`;
  const [integer, fraction = ""] = normalized.split(".");
  const integral = (integer ?? "0").replace(/^(-?)0+(?=\d)/, "$1");
  const fractional = fraction.replace(/0+$/, "");
  return fractional ? `${integral}.${fractional}` : integral;
};

/** Accept unchanged spelling first, then an equivalent value in target conventions. */
const sameNumbers = (source: string, target: string, locale: Locale) => {
  const originals = numericTokens(
    normalizeCjkDates(normalizeCjkMagnitudes(source, locale), locale),
  );
  const remaining = [
    ...numericTokens(
      normalizeCjkDates(normalizeCjkMagnitudes(target, locale), locale),
    ),
  ];
  const unmatched = originals.filter((token) => {
    const index = remaining.indexOf(token);
    if (index === -1) return true;
    remaining.splice(index, 1);
    return false;
  });
  const originalValues = unmatched.map((token) => numericValue(token, "en"));
  const targetValues = remaining.map((token) => numericValue(token, locale));
  const unpaired = originalValues.filter((value) => {
    const index = targetValues.indexOf(value);
    if (index === -1) return true;
    targetValues.splice(index, 1);
    return false;
  });
  if (unpaired.length) return false;
  // A small spelled-out count may naturally become a digit in CJK (two → 2つ).
  // This does not infer omitted counts; the semantic reviewer still checks prose.
  const counts = spelledCounts(source);
  return targetValues.every((value) => {
    const index = counts.indexOf(value);
    if (index === -1) return false;
    counts.splice(index, 1);
    return true;
  });
};

const stripCode = (text: string) => text.replace(syntaxExpressions.code, "");
const markdownTopology = (text: string) => {
  // A standalone negative monetary value is not a one-item Markdown list.
  if (
    /^\s*-\s+(?:[$€£¥]|USD|EUR|GBP|JPY|CNY)\s*\d+(?:[.,]\d+)*\s*$/u.test(text)
  )
    return [];
  // A complete localized date is not an ordered Markdown list. Do not exempt
  // numbered prose or list items merely because their first token is a number.
  if (
    /^\s*\d{1,2}\. (?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember) \d{4}\.?\s*$/u.test(
      text,
    )
  )
    return [];
  return matches(text, syntaxExpressions.lines);
};
const linkDestinations = (text: string) =>
  matches(text, syntaxExpressions.links).map((link) =>
    link.slice(link.indexOf("](") + 2, -1),
  );
const urls = (text: string) =>
  matches(text, syntaxExpressions.urls).map((url) =>
    url.replace(/[.,;:!?]+$/, ""),
  );
// Legacy editorial sources occasionally capitalize ecentic or lowercase named
// providers. Accept preserved source spelling or canonicalized brand spelling,
// never a newly introduced case variant. Legal company spellings stay intact.
// Ambiguous common words/plan names (Scale, Compete, Visa) stay exact.
const canonicalBrandSpelling = new Set([
  "ecentic",
  "écentic",
  "ecentic Inc",
  "ChatGPT",
  "OpenAI",
  "Anthropic",
  "Claude",
  "Gemini",
  "Google",
  "Google Merchant Center",
  "Perplexity",
  "Microsoft",
  "Copilot",
  "Shopify",
  "WooCommerce",
  "WordPress",
  "WebMCP",
]);
const brandProse = (text: string) =>
  stripCode(text)
    .replace(syntaxExpressions.urls, "")
    .replace(syntaxExpressions.emails, "");
const termFindings = (
  source: string,
  target: string,
  terms: readonly string[],
) =>
  terms
    .filter((term) => {
      if (!canonicalBrandSpelling.has(term))
        return !equal(
          literalOccurrences(source, term),
          literalOccurrences(target, term),
        );
      const original = literalMatches(brandProse(source), term, true);
      const translated = literalMatches(brandProse(target), term, true);
      return (
        original.length !== translated.length ||
        translated.some(
          (spelling) =>
            spelling !== term &&
            translated.filter((value) => value === spelling).length >
              original.filter((value) => value === spelling).length,
        )
      );
    })
    .map(
      (term) =>
        `Protected term changed or its occurrence count differs: ${term}`,
    );

const textFindings = (source: string, target: string, locale: Locale) => {
  const checks = [
    [
      "code",
      matches(source, syntaxExpressions.code),
      matches(target, syntaxExpressions.code),
    ],
    ["URLs", urls(source), urls(target)],
    [
      "email addresses",
      matches(source, syntaxExpressions.emails),
      matches(target, syntaxExpressions.emails),
    ],
    [
      "HTML tags",
      matches(source, syntaxExpressions.tags),
      matches(target, syntaxExpressions.tags),
    ],
    [
      "Markdown link destinations",
      linkDestinations(source),
      linkDestinations(target),
    ],
    [
      "Markdown emphasis markers",
      matches(stripCode(source), syntaxExpressions.markers),
      matches(stripCode(target), syntaxExpressions.markers),
    ],
    [
      "Markdown heading/list topology",
      markdownTopology(source),
      markdownTopology(target),
    ],
    [
      "currency and percent markers",
      currencyAndPercentFacts(source, locale),
      currencyAndPercentFacts(target, locale),
    ],
  ] as const;
  return [
    ...checks
      .filter(([label, original, translated]) =>
        ["HTML tags", "Markdown heading/list topology"].includes(label)
          ? JSON.stringify(original) !== JSON.stringify(translated)
          : !equal(original, translated),
      )
      .map(([label]) => `Preserve ${label} exactly; source and target differ.`),
    ...(!sameNumbers(source, target, locale)
      ? [
          "Numeric facts differ from the source (including signs, amounts, counts or versions).",
        ]
      : []),
  ];
};

const parseMessage = (message: string) => {
  // ICU's production parser is synchronous and throws on invalid resource syntax.
  try {
    return {
      success: true as const,
      data: parse(message, { captureLocation: false }),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const identity = (element: MessageFormatElement) => {
  switch (element.type) {
    case TYPE.literal:
      return "literal";
    case TYPE.pound:
      return "#";
    case TYPE.number:
    case TYPE.date:
    case TYPE.time:
      return `${element.type}:${element.value}:${JSON.stringify(element.style ?? null)}`;
    case TYPE.plural:
      return `${element.type}:${element.value}:${element.offset}:${element.pluralType}`;
    default:
      return `${element.type}:${element.value}`;
  }
};

const compareMessages = (
  source: readonly MessageFormatElement[],
  target: readonly MessageFormatElement[],
  locale: Locale,
  terms: readonly string[],
  scope = "message",
): string[] => {
  const original = source.filter((element) => element.type !== TYPE.literal);
  const translated = target.filter((element) => element.type !== TYPE.literal);
  const sourceText = source
    .map((element) =>
      element.type === TYPE.literal ? element.value : "\uFFFC",
    )
    .join("");
  const targetText = target
    .map((element) =>
      element.type === TYPE.literal ? element.value : "\uFFFC",
    )
    .join("");
  const literals = [
    ...textFindings(sourceText, targetText, locale),
    ...termFindings(sourceText, targetText, terms),
  ].map((finding) => `${scope}: ${finding}`);
  if (!equal(original.map(identity), translated.map(identity)))
    return [
      ...literals,
      `${scope}: ICU arguments, types, formatter styles, rich tags or # counts changed.`,
    ];

  return [
    ...literals,
    ...original.flatMap((element, index): string[] => {
      const occurrence = original
        .slice(0, index)
        .filter((previous) => identity(previous) === identity(element)).length;
      const candidate = translated.filter(
        (entry) => identity(entry) === identity(element),
      )[occurrence];
      if (!candidate)
        return [`${scope}: Missing ICU element ${identity(element)}.`];
      if (element.type === TYPE.tag && candidate.type === TYPE.tag)
        return compareMessages(
          element.children,
          candidate.children,
          locale,
          terms,
          `${scope}.<${element.value}>`,
        );
      if (element.type === TYPE.select && candidate.type === TYPE.select) {
        if (
          !equal(Object.keys(element.options), Object.keys(candidate.options))
        )
          return [`${scope}.${element.value}: Fixed select keys changed.`];
        return Object.entries(element.options).flatMap(([selector, option]) =>
          compareMessages(
            option.value,
            candidate.options[selector]?.value ?? [],
            locale,
            terms,
            `${scope}.${element.value}[${selector}]`,
          ),
        );
      }
      if (element.type !== TYPE.plural || candidate.type !== TYPE.plural)
        return [];
      const categories = new Intl.PluralRules(
        localeMetadata[locale].intlLocale,
        { type: element.pluralType },
      ).resolvedOptions().pluralCategories;
      const exact = Object.keys(element.options).filter((selector) =>
        selector.startsWith("="),
      );
      const received = Object.keys(candidate.options);
      const missing = [...categories, ...exact].filter(
        (selector) => !received.includes(selector),
      );
      const invalid = received.filter(
        (selector) =>
          !categories.includes(selector as Intl.LDMLPluralRule) &&
          !exact.includes(selector),
      );
      return [
        ...(missing.length
          ? [
              `${scope}.${element.value}: Missing target plural branches ${missing.join(", ")}.`,
            ]
          : []),
        ...(invalid.length
          ? [
              `${scope}.${element.value}: Invalid or invented target plural branches ${invalid.join(", ")}.`,
            ]
          : []),
        ...Object.entries(candidate.options).flatMap(([selector, option]) => {
          const { other: fallback } = element.options;
          const reference = element.options[selector] ?? fallback;
          if (!reference)
            return [
              `${scope}.${element.value}: Missing source fallback branch.`,
            ];
          if (option.value.length === 0)
            return [
              `${scope}.${element.value}[${selector}]: Empty plural branch.`,
            ];
          return compareMessages(
            reference.value,
            option.value,
            locale,
            terms,
            `${scope}.${element.value}[${selector}]`,
          );
        }),
      ];
    }),
  ];
};

export const validateTranslationUnit = (
  unit: TranslationUnit,
  target: string,
  locale: Locale,
): TranslationFinding[] => {
  if (unit.invariant)
    return unit.text === target
      ? []
      : [
          {
            id: unit.id,
            pass: "structural",
            message: "Invariant content changed.",
          },
        ];
  const omittedArticle =
    unit.grammaticalArticle === true &&
    Boolean(unit.group) &&
    unit.format === "plain" &&
    (locale === "ja" || locale === "zh-CN") &&
    /^(?:a|an|the)$/i.test(unit.text.trim());
  if (unit.text.trim() && !target.trim() && !omittedArticle)
    return [
      {
        id: unit.id,
        pass: "semantic",
        message: "Nonempty source was omitted.",
      },
    ];
  const protectedTerms = [
    ...new Set([...protectedProductTerms, ...(unit.protectedTerms ?? [])]),
  ].filter((term) => !unit.translatableTerms?.includes(term));
  const structural = (() => {
    if (unit.format !== "icu")
      return [
        ...textFindings(unit.text, target, locale),
        ...termFindings(unit.text, target, protectedTerms),
        ...(!equal(
          matches(unit.text, syntaxExpressions.placeholders),
          matches(target, syntaxExpressions.placeholders),
        )
          ? ["Placeholder names or counts changed."]
          : []),
      ];
    const original = parseMessage(unit.text);
    if (!original.success)
      return [
        `Source ICU is invalid; classify this unit as plain/invariant only if it is not a runtime message: ${original.error}`,
      ];
    const translated = parseMessage(target);
    if (!translated.success)
      return [`Target ICU cannot parse: ${translated.error}`];
    return compareMessages(
      original.data,
      translated.data,
      locale,
      protectedTerms,
    );
  })();
  return [
    ...structural.map(
      (message): TranslationFinding => ({
        id: unit.id,
        pass: message.includes("Protected term") ? "terminology" : "structural",
        message,
      }),
    ),
  ];
};
