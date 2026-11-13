/**
 * OpenAI's product file
 * (developers.openai.com/commerce/specs/file-upload/products): one row per
 * variant, a validator for every rule that page states, and the CSV writer. Pure
 * and standalone.
 *
 * `toRows` never invents a value. A cell the store did not state stays null and
 * `validate` says so, so a row either carries what the store said or stays out
 * of the file. A row that passes is ready for ChatGPT and nothing more: organic
 * ChatGPT shopping only takes feeds from approved partners.
 *
 * `evaluateListing` is deliberately not used here. `mpn-missing-without-gtin`
 * calls a missing MPN a ChatGPT blocker, and this spec says the opposite: "do
 * not invent a value to replace a missing GTIN".
 */

import { resultify } from "@zenncore/utils";
import { isValidGtin } from "@/server/app/intelligence/listing-rules";
import type { Availability, Finding, Product, Store, Variant } from "./catalog";

const REQUIRED = [
  "item_id",
  "title",
  "description",
  "url",
  "brand",
  "seller_name",
  "image_url",
  "availability",
  "price",
] as const;

export const COLUMNS = [
  ...REQUIRED,
  "sale_price",
  "gtin",
  "mpn",
  "group_id",
  "listing_has_variations",
  "variant_dict",
  "seller_url",
  "return_policy",
  "store_country",
  "is_eligible_search",
  "is_ads_eligible",
] as const;

type Column = (typeof COLUMNS)[number];

/** Exactly what the file will say. Null is an omitted cell. */
export type Row = Record<Column, string | null>;

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 5000;

const AVAILABILITY = new Set<string>([
  "in_stock",
  "out_of_stock",
  "pre_order",
  "backorder",
  "unknown",
] satisfies Availability[]);

/** Brand-only entries included: the spec asks for "a real brand", and none of these is a real value anywhere else. */
const PLACEHOLDERS = new Set([
  "null",
  "undefined",
  "n/a",
  "na",
  "none",
  "unknown",
  "tbd",
  "-",
  "generic",
  "no brand",
  "nobrand",
  "unbranded",
]);

const MISSING: Record<(typeof REQUIRED)[number], string> = {
  item_id: "item_id is empty. Every row needs a stable ID.",
  title: "title is empty. Add a product name on the store.",
  description: "description is empty. Add a product description on the store.",
  url: "url is empty. The product needs a public page on the store.",
  brand: "brand is empty. State the brand on the product page.",
  seller_name:
    "seller_name is empty. State the store's name in its site title or structured data.",
  image_url:
    "image_url is empty. Add a JPEG or PNG product image on the store.",
  availability:
    "availability is empty. Use in_stock, out_of_stock, pre_order, backorder or unknown.",
  price: "price is empty. State a price on the product page.",
};

const LINKS = ["url", "image_url", "seller_url", "return_policy"] as const;

const FLAGS = [
  "listing_has_variations",
  "is_eligible_search",
  "is_ads_eligible",
] as const;

const IMAGE_DIRECT = new Set(["jpg", "jpeg", "png", "pjpg"]);

const IMAGE_REFUSED = new Set([
  "webp",
  "avif",
  "gif",
  "svg",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
  "ico",
]);

const HTML_TAG = /<\/?[a-z][^<>]*>/i;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const LOCAL_SUFFIX = /\.(localhost|local|internal|lan|test|invalid|example)$/;

const CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

const error = (field: string, code: string, message: string): Finding => ({
  channel: "chatgpt",
  field,
  code,
  message,
  severity: "error",
});

const warning = (field: string, code: string, message: string): Finding => ({
  channel: "chatgpt",
  field,
  code,
  message,
  severity: "warning",
});

const when = (condition: boolean, finding: Finding) =>
  condition ? [finding] : [];

const filled = (cell: string | null): cell is string =>
  cell !== null && cell.trim() !== "";

const isPlaceholder = (cell: string) =>
  PLACEHOLDERS.has(cell.trim().toLowerCase());

/** Filled with something other than a placeholder, so its format is worth checking. */
const stated = (cell: string | null): cell is string =>
  filled(cell) && !isPlaceholder(cell);

const SECONDHAND =
  /\b(?:refurbished|renewed|reconditioned|pre[- ]?owned|second[- ]?hand|used|open[- ]box|reacondicionado|usado)\b/i;

/**
 * Whether the store says this is not new: in its structured data, its title or a
 * "Condition" option. Google's item says `condition: new` as an inference, and
 * OpenAI's spec reads an omitted condition as new and asks that used goods say so.
 */
export const isSecondhand = ({ title, variants, condition }: Product) =>
  condition === "used" ||
  condition === "refurbished" ||
  SECONDHAND.test(title) ||
  variants.some(({ options }) =>
    Object.entries(options).some(
      ([name, value]) =>
        name.trim().toLowerCase() === "condition" && SECONDHAND.test(value),
    ),
  );

const parse = (value: string) => {
  const url = resultify(() => new URL(value));
  return url.success ? url.data : null;
};

const isPublic = (value: string) => {
  const url = parse(value);
  if (!url || /\s/.test(value)) return false;
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") || IPV4.test(host) || !host.includes("."))
    return false;
  return !LOCAL_SUFFIX.test(host);
};

const extension = (url: URL) =>
  /\.([a-z0-9]+)$/i.exec(url.pathname)?.[1]?.toLowerCase() ?? null;

const isShopifyCdn = (url: URL) =>
  url.hostname === "cdn.shopify.com" || url.pathname.startsWith("/cdn/shop/");

/**
 * A Shopify CDN image in a refused format, asked for as a JPEG instead. Every
 * other image comes back untouched. `toRows` applies it, and the caller records
 * the fix by comparing `image_url` with what the store stated.
 */
export const direct = (image: string) => {
  const url = parse(image);
  if (!url || !isShopifyCdn(url)) return image;
  if (!IMAGE_REFUSED.has(extension(url) ?? "")) return image;
  url.searchParams.set("format", "jpg");
  return url.toString();
};

/** The product page with this variant selected, where the platform allows it. */
export const landing = (product: Product, variant: Variant) => {
  if (!product.url) return null;
  if (product.variants.length < 2) return product.url;
  if (product.origin !== "shopify" || !/^\d+$/.test(variant.id))
    return product.url;
  const url = parse(product.url);
  if (!url) return product.url;
  url.searchParams.set("variant", variant.id);
  return url.toString();
};

/** A compare-at above the live price makes the compare-at the regular price, as `feed-export.ts` does. */
export const pricing = (variant: Variant) => {
  const discounted =
    variant.price !== null &&
    variant.compareAtPrice !== null &&
    Number(variant.compareAtPrice) > Number(variant.price);
  return {
    price: discounted ? variant.compareAtPrice : variant.price,
    sale: discounted ? variant.price : null,
  };
};

/** One finding per field and code, however many variants raised it. */
export const unique = (findings: Finding[]) => [
  ...new Map(
    findings.map((finding) => [`${finding.field}:${finding.code}`, finding]),
  ).values(),
];

const places = (currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;

/**
 * The amount written with the digits its currency carries, value unchanged:
 * Shopify states JPY as `1200.00`, which the file must say as `1200`, and a JSON-LD
 * `80` in USD becomes `80.00`. Non-zero excess stays as read, so `validate`
 * rejects it: rounding would change what the store charges.
 */
export const exact = (amount: string, currency: string) => {
  if (!CURRENCIES.has(currency)) return amount;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!match) return amount;
  const [, whole, fraction = ""] = match;
  const digits = places(currency);
  if (/[^0]/.test(fraction.slice(digits))) return amount;
  const kept = fraction.slice(0, digits).padEnd(digits, "0");
  return kept ? `${whole}.${kept}` : `${whole}`;
};

/** More decimals than the currency has, once trailing zeros are gone. Rounding would change the price. */
export const overprecise = (amount: string, currency: string) =>
  CURRENCIES.has(currency) &&
  (exact(amount, currency).split(".")[1]?.length ?? 0) > places(currency);

/** A bare amount when the store states no currency: `validate` rejects it, and none is ever assumed. */
const cell = (amount: string | null, currency: string | null) => {
  if (amount === null) return null;
  return currency ? `${exact(amount, currency)} ${currency}` : amount;
};

const titled = (product: Product, variant: Variant) => {
  const options = Object.values(variant.options)
    .map((value) => value.trim())
    .filter(Boolean);
  if (product.variants.length < 2 || options.length === 0) return product.title;
  if (!filled(product.title)) return product.title;
  return `${product.title} - ${options.join(" / ")}`;
};

const dictionary = (options: Variant["options"]) => {
  const entries = Object.entries(options)
    .map(([name, value]) => [name.trim().toLowerCase(), value.trim()])
    .filter(([name, value]) => name && value);
  return entries.length === 0
    ? null
    : JSON.stringify(Object.fromEntries(entries));
};

export const toRows = (
  product: Product,
  store: Store,
  { ads = false }: { ads?: boolean } = {},
): Row[] => {
  const several = product.variants.length > 1;
  // A read can hand back a product id equal to one of its variant ids, and the
  // group must differ from every item in it.
  const group = product.variants.some(({ id }) => id === product.id)
    ? `group-${product.id}`
    : product.id;

  return product.variants.map((variant) => {
    const { price, sale } = pricing(variant);
    const image = variant.image ?? product.images[0] ?? null;
    return {
      item_id: variant.id,
      title: titled(product, variant),
      description: product.description,
      url: landing(product, variant),
      brand: product.brand,
      seller_name: store.name,
      image_url: image && direct(image),
      availability: variant.availability,
      price: cell(price, product.currency),
      sale_price: cell(sale, product.currency),
      gtin:
        filled(variant.barcode) && isValidGtin(variant.barcode)
          ? variant.barcode
          : null,
      mpn: product.mpn,
      group_id: several ? group : null,
      listing_has_variations: several ? "true" : "false",
      variant_dict: several ? dictionary(variant.options) : null,
      seller_url: store.origin,
      return_policy: store.returnPolicy,
      // Optional, and we do not know it: `.de` or a German page proves nothing.
      store_country: null,
      is_eligible_search: "true",
      is_ads_eligible: ads ? "true" : null,
    };
  });
};

const money = (cell: string) => {
  const match = /^(\d+)(?:\.(\d+))?(?: ([A-Z]{3}))?$/.exec(cell);
  if (!match) return null;
  const [, whole, fraction = "", currency = null] = match;
  return { amount: Number(`${whole}.${fraction || "0"}`), fraction, currency };
};

const checkMoney = (field: "price" | "sale_price", cell: string): Finding[] => {
  const parsed = money(cell);
  if (!parsed)
    return [
      error(
        field,
        `${field}_format`,
        `${field} is "${cell}". Write it as an amount and currency such as 79.99 USD, with a decimal point and no thousands separators.`,
      ),
    ];
  if (parsed.currency === null)
    return [
      error(
        field,
        "currency_missing",
        `${field} has no currency. State the currency on the product page; ecentic never assumes one.`,
      ),
    ];
  if (!CURRENCIES.has(parsed.currency))
    return [
      error(
        field,
        "currency_invalid",
        `${field} uses ${parsed.currency}, which is not an ISO 4217 currency. Correct it on the store.`,
      ),
    ];
  if (parsed.fraction.length > places(parsed.currency))
    return [
      error(
        field,
        `${field}_digits`,
        `${field} is "${cell}", with more decimals than ${parsed.currency} allows. Use at most ${places(parsed.currency)}.`,
      ),
    ];
  if (parsed.amount <= 0)
    return [
      error(
        field,
        `${field}_not_positive`,
        `${field} is "${cell}". It must be above zero, so state the real price on the store.`,
      ),
    ];
  return [];
};

const checkSale = (row: Row): Finding[] => {
  if (!stated(row.sale_price)) return [];
  const format = checkMoney("sale_price", row.sale_price);
  if (format.length > 0 || !stated(row.price)) return format;
  const current = money(row.sale_price);
  const regular = money(row.price);
  if (!current || !regular) return [];
  return [
    ...when(
      current.currency !== regular.currency,
      error(
        "sale_price",
        "sale_price_currency",
        `sale_price is in ${current.currency} and price is in ${regular.currency}. Use one currency for both.`,
      ),
    ),
    ...when(
      current.currency === regular.currency && current.amount >= regular.amount,
      error(
        "sale_price",
        "sale_price_not_below",
        `sale_price "${row.sale_price}" is not below price "${row.price}". Correct the compare-at price on the store.`,
      ),
    ),
  ];
};

const checkImage = (cell: string): Finding[] => {
  const url = parse(cell);
  if (!url || !isPublic(cell)) return [];
  const served = isShopifyCdn(url)
    ? url.searchParams.get("format")?.toLowerCase()
    : null;
  const format = served ?? extension(url) ?? "";
  if (IMAGE_DIRECT.has(format)) return [];
  if (IMAGE_REFUSED.has(format))
    return [
      error(
        "image_url",
        "image_url_format",
        `image_url is a ${format} file. Use a direct JPEG or PNG on the store.`,
      ),
    ];
  return [
    warning(
      "image_url",
      "image_url_unconfirmed",
      "image_url does not show its format. Confirm it serves a JPEG or PNG directly.",
    ),
  ];
};

const isOptions = (cell: string) => {
  const parsed = resultify(() => JSON.parse(cell) as unknown);
  if (!parsed.success) return false;
  if (typeof parsed.data !== "object" || parsed.data === null) return false;
  if (Array.isArray(parsed.data)) return false;
  const entries = Object.entries(parsed.data);
  return (
    entries.length > 0 &&
    entries.every(
      ([name, value]) =>
        name.trim() !== "" && typeof value === "string" && value.trim() !== "",
    )
  );
};

const checkVariation = (row: Row): Finding[] => {
  const listed = row.listing_has_variations === "true";
  const grouped = stated(row.group_id);
  const distinct = grouped && row.group_id !== row.item_id;
  return [
    ...when(
      grouped && !distinct,
      error(
        "group_id",
        "group_id_same",
        "group_id equals item_id. Use the parent listing's ID, shared by every variant.",
      ),
    ),
    ...when(
      grouped && !listed,
      error(
        "listing_has_variations",
        "listing_has_variations_missing",
        "listing_has_variations must be true on every variant row that has a group_id.",
      ),
    ),
    ...when(
      listed && !grouped,
      error(
        "group_id",
        "group_id_missing",
        "group_id is empty on a variant row. Use the parent listing's ID.",
      ),
    ),
    ...when(
      listed && !filled(row.variant_dict),
      error(
        "variant_dict",
        "variant_dict_missing",
        "variant_dict is empty on a variant row. Name each variant's options on the store, such as color and size.",
      ),
    ),
    ...when(
      filled(row.variant_dict) && !isOptions(row.variant_dict),
      error(
        "variant_dict",
        "variant_dict_invalid",
        'variant_dict must be a JSON object of non-empty option names and values, such as {"color":"Black","size":"10"}.',
      ),
    ),
    ...when(
      filled(row.variant_dict) && !(listed && distinct),
      warning(
        "variant_dict",
        "variant_dict_ignored",
        "variant_dict is ignored unless listing_has_variations is true and group_id differs from item_id.",
      ),
    ),
  ];
};

/** Every rule on the spec page. An `error` keeps the row out of the file. */
export const validate = (row: Row): Finding[] => [
  ...REQUIRED.flatMap((column) =>
    when(
      !filled(row[column]),
      error(column, `${column}_missing`, MISSING[column]),
    ),
  ),
  ...COLUMNS.flatMap((column) => {
    const value = row[column];
    return when(
      column !== "availability" && filled(value) && isPlaceholder(value),
      error(
        column,
        `${column}_placeholder`,
        `${column} is "${value}", a placeholder. Replace it with the real value on the store, or leave the cell empty if it is optional.`,
      ),
    );
  }),
  ...when(
    (row.title ?? "").length > TITLE_MAX,
    error(
      "title",
      "title_too_long",
      `title is ${row.title?.length} characters with its variant options. Shorten it to ${TITLE_MAX} or fewer.`,
    ),
  ),
  ...when(
    HTML_TAG.test(row.title ?? ""),
    error("title", "title_html", "title contains HTML tags. Remove them."),
  ),
  ...when(
    (row.description ?? "").length > DESCRIPTION_MAX,
    error(
      "description",
      "description_too_long",
      `description is ${row.description?.length} characters. Shorten it to ${DESCRIPTION_MAX} or fewer.`,
    ),
  ),
  ...when(
    HTML_TAG.test(row.description ?? ""),
    error(
      "description",
      "description_html",
      "description contains HTML tags. It must be plain text, so remove them.",
    ),
  ),
  ...when(
    filled(row.availability) && !AVAILABILITY.has(row.availability),
    error(
      "availability",
      "availability_invalid",
      `availability is "${row.availability}". Use exactly in_stock, out_of_stock, pre_order, backorder or unknown.`,
    ),
  ),
  ...when(
    row.availability === "unknown",
    warning(
      "availability",
      "availability_unknown",
      "availability is unknown because the store does not state it. State stock status on the product page.",
    ),
  ),
  ...(stated(row.price) ? checkMoney("price", row.price) : []),
  ...checkSale(row),
  ...when(
    stated(row.gtin) && !isValidGtin(row.gtin),
    error(
      "gtin",
      "gtin_invalid",
      `gtin "${row.gtin}" must be 8, 12, 13 or 14 digits with a valid check digit and no spaces or dashes. Correct the barcode on the store, or leave it empty if none is assigned.`,
    ),
  ),
  ...LINKS.flatMap((column) => {
    const value = row[column];
    return when(
      stated(value) && !isPublic(value),
      error(
        column,
        `${column}_invalid`,
        `${column} is not a public http or https URL. Use an absolute address on a public domain, with no credentials.`,
      ),
    );
  }),
  ...(stated(row.image_url) ? checkImage(row.image_url) : []),
  ...FLAGS.flatMap((column) => {
    const value = row[column];
    return when(
      stated(value) && value !== "true" && value !== "false",
      error(
        column,
        `${column}_invalid`,
        `${column} is "${value}". Use lowercase true or false.`,
      ),
    );
  }),
  ...when(
    stated(row.store_country) && !/^[A-Z]{2}$/.test(row.store_country),
    error(
      "store_country",
      "store_country_invalid",
      `store_country is "${row.store_country}". Use an uppercase two-letter country code.`,
    ),
  ),
  ...checkVariation(row),
];

/**
 * What stands between this product and the file: its rows' findings, one per
 * field and code, plus the barcode `toRows` left out because it is not a GTIN.
 * That one is a warning, since the spec says to omit a GTIN nobody assigned.
 */
export const assess = (product: Product, store: Store): Finding[] => {
  const rows = toRows(product, store);
  const ids = rows.map((row) => row.item_id);
  return unique([
    ...rows.flatMap((row) => validate(row)),
    ...when(
      new Set(ids).size < ids.length,
      error(
        "item_id",
        "item_id_duplicate",
        "item_id repeats within this product. Give each variant its own stable ID.",
      ),
    ),
    ...when(
      isSecondhand(product),
      error(
        "condition",
        "condition_not_new",
        "condition must be stated for used or refurbished goods, and this file does not carry it yet. This listing says it is used or refurbished, so it stays out rather than read as new.",
      ),
    ),
    ...when(
      product.variants.some(
        ({ barcode }) => filled(barcode) && !isValidGtin(barcode),
      ),
      warning(
        "gtin",
        "gtin_ignored",
        "gtin was left out because the store's barcode is not a valid GTIN. Correct it on the store if the product has a real one.",
      ),
    ),
  ]);
};

const quoted = (value: string | null) => {
  const text = value ?? "";
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** Header plus the rows passed in. The caller filters out rows `validate` rejects. */
export const csv = (rows: Row[]) =>
  [
    COLUMNS.join(","),
    ...rows.map((row) =>
      COLUMNS.map((column) => quoted(row[column])).join(","),
    ),
  ].join("\n");
