/**
 * The Google Merchant Center side of the agent storefront: one item per variant,
 * mapped like `server/app/feed-export.ts` but without its defaults, validated by
 * the listing registry and the override lint, and written as RSS 2.0 with the
 * `g:` namespace.
 *
 * A value the store did not state stays null and `validate` says so. Price,
 * currency, availability and identifiers are never filled in here. `condition`
 * and `identifier_exists=false` are ecentic's inferences, so `prepare` records
 * them as fixes.
 */

import {
  type CatalogContext,
  catalogContextFor,
  evaluateListing,
  isValidGtin,
  type Listing,
  type RuleId,
} from "@/server/app/intelligence/listing-rules";
import * as GoogleMerchantAPI from "@/server/utils/google-merchant";
import type { Availability, Finding, Product, Store, Variant } from "./catalog";
import {
  exact,
  isSecondhand,
  landing,
  overprecise,
  pricing,
  unique,
} from "./chatgpt";

export { isSecondhand };

export type Item = {
  id: string;
  itemGroupId: string | null;
  title: string;
  description: string | null;
  link: string | null;
  imageLink: string | null;
  additionalImageLinks: string[];
  /** The regular price, amount only. `feed` writes it with the currency. */
  price: string | null;
  /** The live price, set only when the store states a higher compare-at. */
  salePrice: string | null;
  currency: string | null;
  /** Null when the store does not state it. Merchant Center requires one, so `validate` errors. */
  availability: "in stock" | "out of stock" | "preorder" | "backorder" | null;
  condition: "new";
  brand: string | null;
  /** Only a valid GTIN. A barcode that fails the check digit stays out. */
  gtin: string | null;
  /** Only what the store states as an MPN. A SKU is not one. */
  mpn: string | null;
  /** False when there is neither a GTIN nor an MPN. */
  identifierExists: boolean;
  productType: string | null;
  /** Google's variant attributes, from the store's option names. */
  color: string | null;
  size: string | null;
  material: string | null;
  pattern: string | null;
};

const ADDITIONAL_IMAGES_MAX = 10;
const DECIMAL = /^\d+(\.\d+)?$/;

const AVAILABILITY: Record<Availability, Item["availability"]> = {
  in_stock: "in stock",
  out_of_stock: "out of stock",
  pre_order: "preorder",
  backorder: "backorder",
  unknown: null,
};

const MESSAGES: Record<RuleId, string> = {
  "id-duplicate":
    "id is used by more than one item. Give each variant its own.",
  "id-too-long":
    "id is over 50 characters, Merchant Center's limit. Use a shorter one.",
  "title-missing": "title is empty. Add a product name on the store.",
  "title-too-long": "title is over 150 characters. Shorten it.",
  "title-all-caps": "title is mostly capitals. Rewrite it in sentence case.",
  "title-promo-text":
    "title has promotional wording such as sale or discount. Remove it.",
  "title-html": "title contains HTML tags. Remove them.",
  "title-gimmick-symbols":
    "title has repeated punctuation or emoji. Remove them.",
  "title-invalid-characters":
    "title contains corrupted characters. Retype it on the store.",
  "title-extra-whitespace": "title has extra spaces. Remove them.",
  "title-repeated-words":
    "title repeats a word three or more times. Remove the repeats.",
  "description-missing":
    "description is empty. Add a product description on the store.",
  "description-too-long": "description is over 5000 characters. Shorten it.",
  "description-identical-title":
    "description only repeats the title. Describe the product.",
  "description-promo-text":
    "description has promotional wording such as sale or discount. Remove it.",
  "link-missing":
    "link is empty. The product needs a public page on the store.",
  "link-invalid": "link is not a valid http or https URL. Correct it.",
  "link-ip-host": "link points at an IP address. Use the store's domain.",
  "link-credentials": "link contains a username or password. Remove them.",
  "image-missing": "image_link is empty. Add a product image on the store.",
  "image-invalid-url":
    "image_link is not a valid http or https URL. Correct it.",
  "image-too-many":
    "image_link has more additional images than the 10 Google takes. Remove some.",
  "price-missing": "price is empty. State a price on the product page.",
  "price-not-positive":
    "price is zero or below. State the real price on the store.",
  "currency-invalid":
    "price currency is not a three-letter ISO 4217 code. Correct it on the store.",
  "sale-price-not-below":
    "sale_price is not below price. Correct the compare-at price on the store.",
  "brand-missing": "brand is empty. State the brand on the product page.",
  "brand-too-long": "brand is over 70 characters. Shorten it.",
  "brand-placeholder":
    "brand is a placeholder such as unknown. Use the real brand.",
  "gtin-invalid":
    "gtin fails the check-digit test. Correct the barcode on the store.",
  "gtin-coupon-prefix":
    "gtin is in the range reserved for coupons. Use the product's real GTIN.",
  "gtin-restricted-prefix":
    "gtin is in a range reserved for internal use. Use the product's real GTIN.",
  "gtin-missing":
    "gtin is empty. Add the barcode on the store if the product has one.",
  "mpn-missing-without-gtin":
    "mpn is empty and there is no gtin. Add the part number on the store if there is one.",
};

/** Lint codes in merchant words. The lint's own message for a promo hit prints its regex. */
const POLICY: Record<string, string> = {
  title_too_long: "is over the length limit. Shorten it.",
  description_too_long: "is over the length limit. Shorten it.",
  title_all_caps: "is mostly capitals. Rewrite it in sentence case.",
  promotional_free_shipping: "mentions free shipping. Remove it.",
  promotional_best_price: "claims the best price. Remove it.",
  promotional_percent_off: "advertises a percentage off. Remove it.",
  promotional_call_to_action:
    "has a call to action such as buy now. Remove it.",
  repeated_exclamation: "has repeated exclamation marks. Remove them.",
};

/** Lint codes that restate a registry rule. The lint's error replaces the registry's verdict. */
const RESTATED: Record<string, RuleId> = {
  title_too_long: "title-too-long",
  description_too_long: "description-too-long",
  title_all_caps: "title-all-caps",
};

const error = (field: string, code: string, message: string): Finding => ({
  channel: "google",
  field,
  code,
  message,
  severity: "error",
});

const decimal = (amount: string | null) =>
  amount !== null && DECIMAL.test(amount) ? Number(amount) : null;

const attribute = (variant: Variant, ...names: string[]) =>
  Object.entries(variant.options)
    .find(([name]) => names.includes(name.trim().toLowerCase()))?.[1]
    ?.trim() || null;

/** `_store` keeps the signature shared with the ChatGPT channel. No Google field reads it. */
export const toItems = (product: Product, _store: Store): Item[] =>
  product.variants.map((variant) => {
    const { price, sale } = pricing(variant);
    const image = variant.image ?? product.images[0] ?? null;
    const gtin =
      variant.barcode !== null && isValidGtin(variant.barcode)
        ? variant.barcode
        : null;
    return {
      id: variant.id,
      itemGroupId: product.variants.length > 1 ? product.id : null,
      title: product.title,
      description: product.description,
      link: landing(product, variant),
      imageLink: image,
      additionalImageLinks: product.images
        .filter((other) => other !== image)
        .slice(0, ADDITIONAL_IMAGES_MAX),
      price,
      salePrice: sale,
      currency: product.currency,
      availability: AVAILABILITY[variant.availability],
      condition: "new",
      brand: product.brand,
      gtin,
      mpn: product.mpn,
      identifierExists: gtin !== null || product.mpn !== null,
      productType: product.productType,
      color: attribute(variant, "color", "colour"),
      size: attribute(variant, "size"),
      material: attribute(variant, "material"),
      pattern: attribute(variant, "pattern"),
    };
  });

const toListing = (item: Item): Listing => ({
  feedId: item.id,
  title: item.title,
  description: item.description,
  link: item.link,
  images: [
    ...(item.imageLink === null ? [] : [item.imageLink]),
    ...item.additionalImageLinks,
  ],
  price: decimal(item.salePrice ?? item.price),
  compareAtPrice: item.salePrice === null ? null : decimal(item.price),
  currency: item.currency,
  brand: item.brand,
  barcode: item.gtin,
  mpn: item.mpn,
});

const evaluate = (item: Item, catalog?: CatalogContext): Finding[] =>
  evaluateListing(toListing(item), catalog).flatMap((finding) => {
    const verdict = finding.platforms.find(
      ({ platform }) => platform === "google",
    )?.verdict;
    if (!verdict || verdict.severity === "info") return [];
    return [
      {
        channel: "google" as const,
        field: finding.attribute === "image" ? "image_link" : finding.attribute,
        code: finding.rule,
        message: MESSAGES[finding.rule],
        severity:
          verdict.severity === "blocker"
            ? ("error" as const)
            : ("warning" as const),
      },
    ];
  });

const lint = (
  field: "title" | "description",
  attributes: GoogleMerchantAPI.ProductInputAttributes,
) =>
  GoogleMerchantAPI.lintOverrideAttributes(attributes).map((issue) =>
    error(field, issue.code, `${field} ${POLICY[issue.code] ?? issue.message}`),
  );

/**
 * Registry verdicts for Google, plus what the registry lacks. Google policy-checks
 * overridden attributes as if they were the merchant's own, and the lint's rule is
 * that anything it flags must not be inserted, so every lint hit is an error.
 */
export const validate = (item: Item, catalog?: CatalogContext): Finding[] => {
  const policy = [
    ...lint("title", { title: item.title }),
    ...lint("description", { description: item.description ?? undefined }),
  ];
  const restated = new Set(policy.map(({ code }) => RESTATED[code]));
  const amounts = (["price", "sale_price"] as const).map((field) => ({
    field,
    amount: field === "price" ? item.price : item.salePrice,
  }));
  const malformed = amounts.flatMap(({ field, amount }) =>
    amount !== null && decimal(amount) === null ? [field] : [],
  );
  // `1.299 EUR` is a real offer for a euro and thirty cents, or a misread 1,299.
  const excess = amounts.flatMap(({ field, amount }) =>
    amount !== null &&
    decimal(amount) !== null &&
    item.currency !== null &&
    overprecise(amount, item.currency)
      ? [field]
      : [],
  );

  return [
    ...evaluate(item, catalog).filter(
      ({ code }) =>
        !restated.has(code as RuleId) &&
        // An unreadable amount is reported as that, not as an empty cell.
        !(code === "price-missing" && item.price !== null),
    ),
    ...policy,
    ...malformed.map((field) =>
      error(
        field,
        `${field}_format`,
        `${field} is not a plain decimal amount such as 79.99. Remove any thousands separators on the store.`,
      ),
    ),
    ...excess.map((field) =>
      error(
        field,
        `${field}_digits`,
        `${field} has more decimals than ${item.currency} allows. State the exact price on the store.`,
      ),
    ),
    ...(item.availability === "preorder" || item.availability === "backorder"
      ? [
          error(
            "availability",
            "availability_date_missing",
            `availability is ${item.availability}, and Merchant Center then requires the date it ships, which the store does not state. List it in Merchant Center with that date.`,
          ),
        ]
      : []),
    ...(item.availability === null
      ? [
          error(
            "availability",
            "availability_unknown",
            "availability is not stated by the store, and Merchant Center requires it. State stock status on the product page.",
          ),
        ]
      : []),
    ...(item.currency === null
      ? [
          error(
            "price",
            "currency_missing",
            "price has no currency. State the currency on the product page; ecentic never assumes one.",
          ),
        ]
      : []),
  ];
};

/**
 * What stands between this product and the feed: its items' findings, one per
 * field and code, plus the barcode `toItems` left out because it is not a GTIN.
 */
export const assess = (product: Product, store: Store): Finding[] => {
  const items = toItems(product, store);
  const catalog = catalogContextFor(items.map(toListing));
  return unique([
    ...items.flatMap((item) => validate(item, catalog)),
    ...(isSecondhand(product)
      ? [
          error(
            "condition",
            "condition_not_new",
            "condition can only be new in this feed, and this listing says it is used or refurbished. List it in Merchant Center with its real condition.",
          ),
        ]
      : []),
    ...(product.variants.some(
      ({ barcode }) => barcode !== null && !isValidGtin(barcode),
    )
      ? [
          {
            channel: "google" as const,
            field: "gtin",
            code: "gtin_ignored",
            message:
              "gtin was left out because the store's barcode is not a valid GTIN. Correct it on the store if the product has a real one.",
            severity: "warning" as const,
          },
        ]
      : []),
  ]);
};

/**
 * Copied from `escapeXml` in `server/app/feed-export.ts`, which imports the
 * database and cannot be imported by this pure module. The first replace is
 * added: these bodies are scraped from any store, and one stray control character
 * would make the whole feed unparseable.
 */
const escapeXml = (value: string) =>
  value
    // biome-ignore lint/suspicious/noControlCharactersInRegex: matching the characters XML 1.0 forbids is the point
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const tag = (name: string, value: string | null) =>
  value ? `<${name}>${escapeXml(value)}</${name}>` : "";

/** Written the way the ChatGPT file writes it, so the two feeds say one price. */
const priced = (amount: string | null, currency: string | null) =>
  amount && currency ? `${exact(amount, currency)} ${currency}` : null;

const entry = (item: Item) =>
  `<item>${[
    tag("g:id", item.id),
    tag("g:item_group_id", item.itemGroupId),
    tag("title", item.title),
    tag("description", item.description),
    tag("link", item.link),
    tag("g:image_link", item.imageLink),
    ...item.additionalImageLinks.map((image) =>
      tag("g:additional_image_link", image),
    ),
    tag("g:price", priced(item.price, item.currency)),
    tag("g:sale_price", priced(item.salePrice, item.currency)),
    tag("g:availability", item.availability),
    tag("g:condition", item.condition),
    tag("g:brand", item.brand),
    tag("g:gtin", item.gtin),
    tag("g:mpn", item.mpn),
    item.identifierExists ? "" : tag("g:identifier_exists", "false"),
    tag("g:product_type", item.productType),
    tag("g:color", item.color),
    tag("g:size", item.size),
    tag("g:material", item.material),
    tag("g:pattern", item.pattern),
  ].join("")}</item>`;

/** RSS 2.0 for the items passed in. The caller filters out items `validate` rejects. */
export const feed = (store: Store, items: Item[]) => {
  const name = store.name ?? store.host;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    `<title>${escapeXml(name)}</title>`,
    `<link>${escapeXml(store.origin)}</link>`,
    `<description>${escapeXml(`Product feed for ${name}, generated by ecentic`)}</description>`,
    ...items.map(entry),
    "</channel>",
    "</rss>",
  ].join("\n");
};
