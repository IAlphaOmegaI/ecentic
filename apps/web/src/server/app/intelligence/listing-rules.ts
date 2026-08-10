/**
 * Deterministic listing data-quality rules for the shopping surfaces that
 * ingest product feeds: Google Merchant Center (Shopping Graph → Google AI
 * Mode, also ingested by Perplexity) and ChatGPT Shopping (OpenAI product
 * feed spec).
 *
 * One registry serves every surface. Each rule is a shared check function
 * plus per-platform metadata — severity on that platform, the platform's
 * machine-readable issue code when one exists (Google `ItemLevelIssue`
 * codes; OpenAI only returns a bare accepted boolean), and the official
 * documentation URL. The OpenAI spec is deliberately a Google-feed superset,
 * so most checks run once and report per platform with different severities.
 *
 * Severity semantics:
 * - `blocker` — deterministic spec violation; the platform disapproves or
 *   rejects the item outright.
 * - `warning` — limited performance, or a heuristic for a rule whose
 *   threshold the platform does not publish (capitalization, promo text).
 * - `info` — advisory; worth fixing but no documented penalty.
 *
 * This module is pure — no server imports — so the registry can be evaluated
 * anywhere (actions, cron, tests). `listing-quality.ts` wires it to a store's
 * catalog.
 */

export const PLATFORMS = ["google", "chatgpt"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type Severity = "blocker" | "warning" | "info";

export type Verdict = {
  severity: Severity;
  /** Platform issue code, e.g. a Google `ItemLevelIssue` code. */
  code: string | null;
  /** Official platform documentation for the rule. */
  reference: string;
};

/** Canonical listing shape every rule checks against — never raw feed rows. */
export type Listing = {
  /** The identifier emitted into feeds (`externalId` when synced). */
  feedId: string;
  title: string;
  description: string | null;
  link: string | null;
  images: string[];
  price: number | null;
  compareAtPrice: number | null;
  currency: string | null;
  brand: string | null;
  /** Raw barcode from the platform payload, valid GTIN or not. */
  barcode: string | null;
  mpn: string | null;
};

export type Attribute =
  | "id"
  | "title"
  | "description"
  | "link"
  | "image"
  | "price"
  | "brand"
  | "gtin"
  | "mpn";

/**
 * Every rule in the registry, as a literal union — keeps the per-rule
 * translation keys (`dashboard.quality.rules.<id>`) statically checkable.
 */
export const RULE_IDS = [
  "title-missing",
  "title-too-long",
  "title-all-caps",
  "title-promo-text",
  "title-html",
  "title-extra-whitespace",
  "title-repeated-words",
  "description-missing",
  "description-too-long",
  "description-identical-title",
  "description-promo-text",
  "id-too-long",
  "link-missing",
  "link-invalid",
  "link-ip-host",
  "link-credentials",
  "image-missing",
  "image-invalid-url",
  "image-too-many",
  "price-missing",
  "price-not-positive",
  "currency-invalid",
  "sale-price-not-below",
  "brand-missing",
  "brand-too-long",
  "gtin-invalid",
  "gtin-coupon-prefix",
  "gtin-restricted-prefix",
  "gtin-missing",
  "mpn-missing-without-gtin",
] as const;

export type RuleId = (typeof RULE_IDS)[number];

export type Rule = {
  id: RuleId;
  attribute: Attribute;
  platforms: Partial<Record<Platform, Verdict>>;
  /** Returns true when the listing violates the rule. */
  check: (listing: Listing) => boolean;
};

const google = (
  severity: Severity,
  code: string | null,
  answer: number,
): Verdict => ({
  severity,
  code,
  reference: `https://support.google.com/merchants/answer/${answer}`,
});

const chatgpt = (severity: Severity): Verdict => ({
  severity,
  code: null,
  reference: "https://developers.openai.com/commerce/specs/feed",
});

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 5000;
const ID_MAX = 50;
const BRAND_MAX = 70;
const ADDITIONAL_IMAGES_MAX = 10;

/**
 * Promotional phrases both platforms reject in titles/descriptions. Neither
 * publishes a threshold, so matches surface as warnings, not blockers —
 * Google itself concedes its automated capitalization/promo detection
 * "sometimes" flags products incorrectly.
 */
const PROMO_PATTERN =
  /(free ship|free deliver|best price|price match|money back|buy now|shop now|order now|limited time|% off|\bsale\b|\bdiscount\b|clearance|hot deal|\bbogo\b|\bcoupon\b|guarantee)/i;

const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i;

const IP_HOST_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

const parseUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isWebUrl = (value: string) => {
  const url = parseUrl(value);
  return (
    url !== null && (url.protocol === "https:" || url.protocol === "http:")
  );
};

const letters = (value: string) => value.replace(/[^\p{L}]/gu, "");

const isMostlyUppercase = (value: string) => {
  const alphabetic = letters(value);
  if (alphabetic.length < 10) return false;
  const uppercase = alphabetic.replace(/[^\p{Lu}]/gu, "");
  return uppercase.length / alphabetic.length >= 0.85;
};

const hasRepeatedWords = (value: string) => {
  const counts = new Map<string, number>();
  for (const word of value.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= 3);
};

/** GS1 check-digit validation for GTIN-8/12/13/14. */
export const isValidGtin = (value: string) => {
  if (!/^\d+$/.test(value) || ![8, 12, 13, 14].includes(value.length))
    return false;
  const digits = value.split("").map(Number);
  const check = digits.pop() as number;
  const sum = digits
    .reverse()
    .reduce(
      (total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1),
      0,
    );
  return (10 - (sum % 10)) % 10 === check;
};

/** Normalized GTIN-13 view for prefix rules (coupon / restricted ranges). */
const gtinThirteen = (value: string) =>
  value.length === 14 ? value.slice(1) : value.padStart(13, "0");

const validGtin = (listing: Listing) =>
  listing.barcode !== null && isValidGtin(listing.barcode)
    ? listing.barcode
    : null;

export const RULES: Rule[] = [
  // --- Title -------------------------------------------------------------
  {
    id: "title-missing",
    attribute: "title",
    platforms: {
      google: google("blocker", "item_missing_required_attribute", 12157546),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) => listing.title.trim().length === 0,
  },
  {
    id: "title-too-long",
    attribute: "title",
    platforms: {
      google: google("blocker", "text_value_too_long", 14989281),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) => listing.title.length > TITLE_MAX,
  },
  {
    id: "title-all-caps",
    attribute: "title",
    platforms: {
      google: google("warning", null, 14987767),
      chatgpt: chatgpt("warning"),
    },
    check: (listing) => isMostlyUppercase(listing.title),
  },
  {
    id: "title-promo-text",
    attribute: "title",
    platforms: {
      google: google("warning", "non_product_data", 12470141),
      chatgpt: chatgpt("warning"),
    },
    check: (listing) => PROMO_PATTERN.test(listing.title),
  },
  {
    id: "title-html",
    attribute: "title",
    platforms: {
      google: google("warning", "invalid_attribute_value", 6324415),
      chatgpt: chatgpt("warning"),
    },
    check: (listing) => HTML_TAG_PATTERN.test(listing.title),
  },
  {
    id: "title-extra-whitespace",
    attribute: "title",
    platforms: {
      google: google("info", null, 6324415),
      chatgpt: chatgpt("info"),
    },
    check: (listing) =>
      /\s{2,}/.test(listing.title) || listing.title !== listing.title.trim(),
  },
  {
    id: "title-repeated-words",
    attribute: "title",
    platforms: {
      google: google("info", null, 6150244),
      chatgpt: chatgpt("info"),
    },
    check: (listing) => hasRepeatedWords(listing.title),
  },

  // --- Description -------------------------------------------------------
  {
    id: "description-missing",
    attribute: "description",
    platforms: {
      google: google("blocker", "item_missing_required_attribute", 6324468),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) => (listing.description ?? "").trim().length === 0,
  },
  {
    id: "description-too-long",
    attribute: "description",
    platforms: {
      google: google("blocker", "text_value_too_long", 6324468),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) => (listing.description ?? "").length > DESCRIPTION_MAX,
  },
  {
    id: "description-identical-title",
    attribute: "description",
    platforms: {
      google: google("warning", null, 15095391),
      chatgpt: chatgpt("info"),
    },
    check: (listing) =>
      listing.description !== null &&
      listing.description.trim().toLowerCase() ===
        listing.title.trim().toLowerCase() &&
      listing.title.trim().length > 0,
  },
  {
    id: "description-promo-text",
    attribute: "description",
    platforms: {
      google: google("warning", "non_product_data", 9957268),
      chatgpt: chatgpt("warning"),
    },
    check: (listing) =>
      listing.description !== null && PROMO_PATTERN.test(listing.description),
  },

  // --- Identifier --------------------------------------------------------
  {
    id: "id-too-long",
    attribute: "id",
    platforms: {
      google: google("blocker", "text_value_too_long", 6324405),
      chatgpt: chatgpt("warning"),
    },
    check: (listing) => listing.feedId.length > ID_MAX,
  },

  // --- Link --------------------------------------------------------------
  {
    id: "link-missing",
    attribute: "link",
    platforms: {
      google: google("blocker", "item_missing_required_attribute", 6324416),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) => listing.link === null,
  },
  {
    id: "link-invalid",
    attribute: "link",
    platforms: {
      google: google("blocker", "invalid_url", 7052112),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) => listing.link !== null && !isWebUrl(listing.link),
  },
  {
    id: "link-ip-host",
    attribute: "link",
    platforms: {
      google: google("blocker", "invalid_url_with_ip", 6324416),
      chatgpt: chatgpt("warning"),
    },
    check: (listing) => {
      if (listing.link === null) return false;
      const url = parseUrl(listing.link);
      return url !== null && IP_HOST_PATTERN.test(url.hostname);
    },
  },
  {
    id: "link-credentials",
    attribute: "link",
    platforms: {
      google: google("warning", "invalid_url", 7052112),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) => {
      if (listing.link === null) return false;
      const url = parseUrl(listing.link);
      return url !== null && (url.username !== "" || url.password !== "");
    },
  },

  // --- Images ------------------------------------------------------------
  {
    id: "image-missing",
    attribute: "image",
    platforms: {
      google: google("blocker", "item_missing_required_attribute", 6324350),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) => listing.images.length === 0,
  },
  {
    id: "image-invalid-url",
    attribute: "image",
    platforms: {
      google: google("blocker", "invalid_url", 6324350),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) =>
      listing.images.length > 0 &&
      listing.images.some((image) => !isWebUrl(image)),
  },
  {
    id: "image-too-many",
    attribute: "image",
    platforms: {
      google: google("warning", "attribute_has_too_many_values", 188494),
      chatgpt: chatgpt("info"),
    },
    check: (listing) => listing.images.length > 1 + ADDITIONAL_IMAGES_MAX,
  },

  // --- Price -------------------------------------------------------------
  {
    id: "price-missing",
    attribute: "price",
    platforms: {
      google: google("blocker", "item_missing_required_attribute", 12158687),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) => listing.price === null,
  },
  {
    id: "price-not-positive",
    attribute: "price",
    platforms: {
      google: google("blocker", "invalid_price", 6324371),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) => listing.price !== null && listing.price <= 0,
  },
  {
    id: "currency-invalid",
    attribute: "price",
    platforms: {
      google: google("blocker", "invalid_currency", 160637),
      chatgpt: chatgpt("blocker"),
    },
    check: (listing) =>
      listing.currency !== null && !/^[A-Z]{3}$/.test(listing.currency),
  },
  {
    id: "sale-price-not-below",
    attribute: "price",
    platforms: {
      google: google("warning", "invalid_attribute_value", 6324471),
      chatgpt: chatgpt("info"),
    },
    check: (listing) =>
      listing.price !== null &&
      listing.compareAtPrice !== null &&
      listing.compareAtPrice <= listing.price,
  },

  // --- Brand & product identifiers ---------------------------------------
  {
    id: "brand-missing",
    attribute: "brand",
    platforms: {
      google: google("warning", "item_missing_required_attribute", 6324351),
      chatgpt: chatgpt("warning"),
    },
    check: (listing) => listing.brand === null,
  },
  {
    id: "brand-too-long",
    attribute: "brand",
    platforms: {
      google: google("blocker", "invalid_attribute_value", 6324351),
      chatgpt: chatgpt("warning"),
    },
    check: (listing) =>
      listing.brand !== null && listing.brand.length > BRAND_MAX,
  },
  {
    id: "gtin-invalid",
    attribute: "gtin",
    platforms: {
      google: google("blocker", "invalid_upc", 6239388),
      chatgpt: chatgpt("warning"),
    },
    check: (listing) =>
      listing.barcode !== null && !isValidGtin(listing.barcode),
  },
  {
    id: "gtin-coupon-prefix",
    attribute: "gtin",
    platforms: {
      google: google("blocker", "coupon_gtin", 6286302),
      chatgpt: chatgpt("info"),
    },
    check: (listing) => {
      const gtin = validGtin(listing);
      return gtin !== null && /^(98|99)/.test(gtinThirteen(gtin));
    },
  },
  {
    id: "gtin-restricted-prefix",
    attribute: "gtin",
    platforms: {
      google: google("warning", "reserved_gtin", 7000684),
      chatgpt: chatgpt("info"),
    },
    check: (listing) => {
      const gtin = validGtin(listing);
      return gtin !== null && /^(02|04|2)/.test(gtinThirteen(gtin));
    },
  },
  {
    id: "gtin-missing",
    attribute: "gtin",
    platforms: {
      google: google("warning", null, 15068757),
      chatgpt: chatgpt("info"),
    },
    check: (listing) => listing.barcode === null,
  },
  {
    id: "mpn-missing-without-gtin",
    attribute: "mpn",
    platforms: {
      google: google("warning", null, 6324482),
      chatgpt: chatgpt("info"),
    },
    check: (listing) => listing.barcode === null && listing.mpn === null,
  },
];

export type Finding = {
  rule: RuleId;
  attribute: Attribute;
  platforms: { platform: Platform; verdict: Verdict }[];
};

export const evaluateListing = (listing: Listing): Finding[] =>
  RULES.filter((rule) => rule.check(listing)).map((rule) => ({
    rule: rule.id,
    attribute: rule.attribute,
    platforms: PLATFORMS.flatMap((platform) => {
      const verdict = rule.platforms[platform];
      return verdict ? [{ platform, verdict }] : [];
    }),
  }));

export type ListingStatus = Severity | "ready";

export const SEVERITY_RANK: Record<Severity, number> = {
  blocker: 3,
  warning: 2,
  info: 1,
};

export const statusFor = (
  findings: Finding[],
  platform: Platform,
): ListingStatus => {
  const worst = findings
    .flatMap((finding) => finding.platforms)
    .filter((entry) => entry.platform === platform)
    .reduce<Severity | null>(
      (current, entry) =>
        current === null ||
        SEVERITY_RANK[entry.verdict.severity] > SEVERITY_RANK[current]
          ? entry.verdict.severity
          : current,
      null,
    );
  return worst ?? "ready";
};
