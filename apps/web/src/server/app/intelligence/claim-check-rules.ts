/**
 * The claim check's rules: the report's shape and every decision the check
 * makes from recorded evidence — catalog vs live-page comparisons, which
 * assertions are kept, how Perplexity's citations resolve, who stands behind a
 * source, and each claim's verdict. No model calls and no network here (the
 * pipeline in `claim-check-engine.ts` does those), so the spec drives it
 * directly.
 *
 * Every verdict is decided by code from evidence the run recorded, never by a
 * model's say-so:
 * - "verified" needs a page outside the merchant's store and the brand's own
 *   site that ecentic itself opened, with a verbatim quote from that page.
 *   Evidence links only ever come from the citations Perplexity returned, never
 *   from text a model wrote.
 * - A model's answer about the product (ChatGPT, Claude, Gemini) never verifies
 *   or contradicts anything; it only marks where an assistant diverges.
 * - Catalog-vs-live-page disagreement is an inconsistency between two of the
 *   merchant's own records. It says nothing about which one is right.
 */

import { createHash } from "node:crypto";
import { resultify } from "@zenncore/utils";
import type * as AI from "../../utils/ai";
import * as JsonLd from "../../utils/json-ld";
import { isValidGtin } from "./listing-rules";

export const REPORT_VERSION = 1;

/** Claims checked per run; the rest are counted, not dropped silently. */
const MAX_CLAIMS = 10;
const EXCERPT_RADIUS = 280;
const ERROR_LIMIT = 200;

export const CLAIM_KINDS = [
  "spec",
  "performance",
  "certification",
  "comparative",
  "superlative",
  "origin",
  "policy",
  "other",
] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];

/** Display order: what needs the merchant's attention first. */
export const VERDICTS = [
  "contradicted",
  "merchant-only",
  "cited",
  "verified",
  "not-checkable",
  "unresearched",
] as const;
export type Verdict = (typeof VERDICTS)[number];

export type Availability = "in_stock" | "out_of_stock" | "unknown";
export type Consistency = "consistent" | "conflicting" | "unknown";
export type AssistantStance = "agrees" | "diverges" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type Party = "merchant" | "manufacturer" | "independent";
export type StageStatus = "ok" | "partial" | "failed" | "skipped";

export const ASSISTANTS = [
  { id: "chatgpt", label: "ChatGPT", model: "gpt" },
  { id: "claude", label: "Claude", model: "claude-sonnet-4" },
  { id: "gemini", label: "Gemini", model: "gemini-2.5-flash" },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  model: AI.ModelId;
}>;
export type AssistantId = (typeof ASSISTANTS)[number]["id"];

export type ListingSnapshot = {
  productId: string;
  title: string;
  description: string | null;
  price: string | null;
  compareAtPrice: string | null;
  currency: string | null;
  sku: string | null;
  gtin: string | null;
  brand: string | null;
  /** Any variant purchasable — the product-level view. */
  availability: Availability;
  /** The variant carrying the catalog's SKU, when the payload names one. */
  skuAvailability: Availability;
  /** Variants in the platform payload; 0 when it states none. */
  variants: number;
  url: string | null;
  /** The description sent for extraction was cut to its first 4,000 chars. */
  descriptionTruncated: boolean;
  /** When the catalog last synced — the age of every listing value below. */
  syncedAt: string | null;
  /**
   * Fingerprint of the listing's full content (not its sync time), so the page
   * can tell the merchant when the listing changed after the check.
   */
  hash: string;
};

export type AssistantView = {
  assistant: AssistantId;
  stance: AssistantStance;
  /** What the assistant said, verbatim from its structured answer. */
  value: string | null;
};

export type CoreFactKey = "price" | "availability" | "gtin" | "brand";
export type CoreFactNote =
  | "no-page"
  | "no-markup"
  | "ambiguous-markup"
  | "missing-in-listing"
  | "missing-on-page"
  | "currency-mismatch"
  | "currency-missing"
  | "variant-not-matched"
  | "invalid-gtin";

export type CoreFact = {
  key: CoreFactKey;
  listing: string | null;
  page: string | null;
  consistency: Consistency;
  note: CoreFactNote | null;
  assistants: AssistantView[];
};

export type Evidence = {
  /**
   * `page` — ecentic opened the URL and read it; `quote` is verbatim from it.
   * `citation` — Perplexity cited the URL; `summary` is Perplexity's own words
   * about it, not text from the page.
   */
  kind: "page" | "citation";
  /** For `page`, the URL that actually answered — after redirects. */
  url: string;
  /** The URL Perplexity cited, when a redirect landed somewhere else. */
  citedUrl: string | null;
  host: string;
  party: Party;
  relation: "supports" | "contradicts" | "unrelated";
  quote: string | null;
  summary: string | null;
  retrievedAt: string;
};

export type GuidanceKey =
  | "verified"
  | "cited"
  | "contradicted"
  | "notCheckable"
  | "unresearched"
  | "merchantOnlySpec"
  | "merchantOnlyCertification"
  | "merchantOnlyComparative"
  | "merchantOnlyOrigin"
  | "merchantOnlyPolicy"
  | "merchantOnlyOther";

export type Claim = {
  /** Stable across runs while the wording is unchanged. */
  key: string;
  span: string;
  kind: ClaimKind;
  attribute: string;
  value: string | null;
  unit: string | null;
  qualifier: string | null;
  checkable: boolean;
  verdict: Verdict;
  /** Which way the cited source leans, for `cited` only. */
  citedStance: "supports" | "contradicts" | null;
  confidence: Confidence | null;
  evidence: Evidence[];
  assistants: AssistantView[];
  guidance: GuidanceKey;
};

export type AssistantRun = {
  assistant: AssistantId;
  label: string;
  model: string;
  status: "ok" | "failed";
  error: string | null;
  /** Whether the assistant said it knows this exact product. */
  recognized: boolean | null;
};

export type Summary = {
  claims: number;
  verified: number;
  cited: number;
  merchantOnly: number;
  contradicted: number;
  notCheckable: number;
  unresearched: number;
  /** Claims at least one assistant diverges on — overlaps the verdicts. */
  divergent: number;
  coreConflicts: number;
};

export type Report = {
  version: typeof REPORT_VERSION;
  startedAt: string;
  completedAt: string;
  listing: ListingSnapshot;
  page: {
    status: "found" | "missing" | "unreachable" | "no-url";
    url: string | null;
    retrievedAt: string | null;
  };
  coreFacts: CoreFact[];
  claims: Claim[];
  extraction: {
    status: StageStatus;
    error: string | null;
    /** Assertions found in the listing; `claims.length` of them were checked. */
    found: number;
  };
  assistants: AssistantRun[];
  research: { status: StageStatus; error: string | null; sources: number };
  sources: { attempted: number; read: number };
  judge: { status: StageStatus; error: string | null };
  summary: Summary;
};

// ─── Text helpers ───────────────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  nbsp: " ",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
  deg: "°",
  times: "×",
  frac12: "½",
  reg: "®",
  trade: "™",
  copy: "©",
};

/**
 * Decodes the entities a quote can depend on. Numeric references are decoded
 * exactly — `12&#48; hours` is "120 hours", and turning the reference into a
 * space would fabricate a "12 hours" that no reader sees. An unknown named
 * entity is left as written rather than guessed at.
 */
const decodeEntities = (text: string) =>
  text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi,
    (entity, body: string) => {
      const lower = body.toLowerCase();
      if (lower.startsWith("#")) {
        const code = lower.startsWith("#x")
          ? Number.parseInt(lower.slice(2), 16)
          : Number.parseInt(lower.slice(1), 10);
        return Number.isInteger(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : entity;
      }
      return NAMED_ENTITIES[lower] ?? entity;
    },
  );

/** Visible text of an HTML document or fragment, whitespace collapsed. */
export const plainText = (html: string) =>
  decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, ". ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

/** Comparison form: lowercase, punctuation-insensitive, single-spaced. */
export const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const slug = (value: string) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export const clip = (value: string, limit = ERROR_LIMIT) =>
  value.length <= limit ? value : `${value.slice(0, limit)}…`;

export const messageOf = (error: unknown) =>
  clip(error instanceof Error ? error.message : String(error));

const parseJson = (value: string | null): unknown => {
  if (!value) return null;
  const parsed = resultify(() => JSON.parse(value) as unknown);
  return parsed.success ? parsed.data : null;
};

export const parseAmount = (value: string | null) => {
  if (value === null) return null;
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : null;
};

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 16);

export const hostOf = (url: string) => {
  const parsed = resultify(() => new URL(url));
  return parsed.success
    ? parsed.data.hostname.toLowerCase().replace(/^www\./, "")
    : null;
};

// ─── The listing as the catalog states it ───────────────────────────────────

export type ProductInput = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  compareAtPrice: string | null;
  currency: string | null;
  sku: string | null;
  gtin: string | null;
  url: string | null;
  rawData: string | null;
  syncedAt: Date | null;
};

type RawPayload = {
  vendor?: unknown;
  brand?: unknown;
  brands?: unknown;
  variants?: unknown;
  stock_status?: unknown;
  is_in_stock?: unknown;
};

type RawVariant = {
  sku?: unknown;
  barcode?: unknown;
  inventory_quantity?: unknown;
  inventory_policy?: unknown;
  inventory_management?: unknown;
};

const rawPayload = (rawData: string | null): RawPayload | null => {
  const parsed = parseJson(rawData);
  return JsonLd.isObject(parsed) ? (parsed as RawPayload) : null;
};

const rawVariants = (payload: RawPayload | null): RawVariant[] =>
  Array.isArray(payload?.variants)
    ? (payload.variants as unknown[]).filter(JsonLd.isObject)
    : [];

/** WooCommerce states stock on the product (keyed REST / public Store API). */
const productStock = (payload: RawPayload): Availability => {
  if (payload.stock_status === "instock" || payload.is_in_stock === true)
    return "in_stock";
  if (payload.stock_status === "outofstock" || payload.is_in_stock === false)
    return "out_of_stock";
  return "unknown";
};

/**
 * Shopify: an untracked variant, one that may oversell, or one with stock on
 * hand is purchasable; tracked, empty and denying sale is out of stock;
 * anything less explicit is unknown.
 */
const variantStock = (variant: RawVariant): Availability => {
  const quantity = variant.inventory_quantity;
  if (
    variant.inventory_management === null ||
    variant.inventory_policy === "continue" ||
    (typeof quantity === "number" && quantity > 0)
  )
    return "in_stock";
  if (
    typeof variant.inventory_management === "string" &&
    variant.inventory_policy === "deny" &&
    typeof quantity === "number" &&
    quantity <= 0
  )
    return "out_of_stock";
  return "unknown";
};

/** Purchasable if any is; sold out only when every one is known sold out. */
const anyInStock = (values: Availability[]): Availability => {
  if (values.includes("in_stock")) return "in_stock";
  if (values.length > 0 && values.every((value) => value === "out_of_stock"))
    return "out_of_stock";
  return "unknown";
};

/**
 * Stock as the platform payload actually states it. Unlike the feed's
 * `extractCatalogFacts`, an absent or ambiguous signal stays `unknown`: the feed
 * must emit something, a verification must not invent an observation.
 */
export const catalogAvailability = (rawData: string | null): Availability => {
  const payload = rawPayload(rawData);
  if (!payload) return "unknown";
  const stated = productStock(payload);
  if (stated !== "unknown") return stated;
  return anyInStock(rawVariants(payload).map(variantStock));
};

/** Stock of the one variant carrying `sku`, so it can meet that SKU's offer. */
export const catalogSkuAvailability = (
  rawData: string | null,
  sku: string | null,
): Availability => {
  const payload = rawPayload(rawData);
  if (!payload) return "unknown";
  const stated = productStock(payload);
  if (stated !== "unknown") return stated;
  if (!sku) return "unknown";
  const variant = rawVariants(payload).find(
    (entry) => JsonLd.text(entry.sku) === sku,
  );
  return variant ? variantStock(variant) : "unknown";
};

export const catalogBrand = (rawData: string | null) => {
  const payload = rawPayload(rawData);
  if (!payload) return null;
  const brands = Array.isArray(payload.brands) ? payload.brands : [];
  return (
    JsonLd.text(payload.vendor) ??
    JsonLd.text(payload.brand) ??
    JsonLd.text(brands[0]) ??
    null
  );
};

const catalogGtin = (product: ProductInput) => {
  const barcode =
    product.gtin ??
    JsonLd.text(rawVariants(rawPayload(product.rawData))[0]?.barcode);
  const normalized = barcode?.replace(/[\s-]/g, "") ?? "";
  return normalized.length > 0 ? normalized : null;
};

const DESCRIPTION_LIMIT = 4000;

export const snapshotListing = (product: ProductInput): ListingSnapshot => {
  const fullDescription = product.description
    ? plainText(product.description) || null
    : null;
  const content = {
    title: product.title,
    description: fullDescription,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency,
    sku: product.sku,
    gtin: catalogGtin(product),
    brand: catalogBrand(product.rawData),
    availability: catalogAvailability(product.rawData),
    skuAvailability: catalogSkuAvailability(product.rawData, product.sku),
    variants: rawVariants(rawPayload(product.rawData)).length,
    url: product.url,
  };
  return {
    ...content,
    productId: product.id,
    description: fullDescription?.slice(0, DESCRIPTION_LIMIT) ?? null,
    descriptionTruncated: (fullDescription?.length ?? 0) > DESCRIPTION_LIMIT,
    syncedAt: product.syncedAt?.toISOString() ?? null,
    // Content only: a re-sync that changed nothing must not read as an edit.
    hash: hash(JSON.stringify(content)),
  };
};

// ─── The live product page's structured data ────────────────────────────────

export type PageOffer = {
  price: number | null;
  low: number | null;
  high: number | null;
  currency: string | null;
  availability: Availability;
  sku: string | null;
};

export type PageFacts = {
  /** Product nodes matching this listing; 0 means none could be attributed. */
  matched: number;
  ambiguous: boolean;
  offers: PageOffer[];
  brands: string[];
  /** Explicit, check-digit-valid GTINs, each with the SKU it was published on. */
  gtins: { value: string; sku: string | null }[];
};

const offerAvailability = (value: unknown): Availability => {
  const raw = JsonLd.text(value)?.toLowerCase() ?? "";
  switch (true) {
    case /instock|onlineonly|limitedavailability|instoreonly/.test(raw):
      return "in_stock";
    case /outofstock|soldout|discontinued/.test(raw):
      return "out_of_stock";
    default:
      return "unknown";
  }
};

const gtin14 = (value: string) => value.padStart(14, "0");

const skusOf = (node: JsonLd.JsonObject) =>
  [node, ...JsonLd.variantNodes(node)].flatMap((entry) =>
    [
      JsonLd.text(JsonLd.at(entry, "sku")),
      ...JsonLd.offersOf(entry).map((offer) =>
        JsonLd.text(JsonLd.at(offer, "sku")),
      ),
    ].filter((sku): sku is string => sku !== null),
  );

/**
 * How firmly a node names this listing: 3 the exact title, 2 the catalog's
 * SKU, 1 a title merely containing (or contained in) the node's name, 0 none.
 */
const matchTier = (
  node: JsonLd.JsonObject,
  listing: Pick<ListingSnapshot, "title" | "sku">,
) => {
  const title = slug(listing.title);
  const name = slug(JsonLd.text(JsonLd.at(node, "name")) ?? "");
  if (name.length > 0 && name === title) return 3;
  if (listing.sku !== null && skusOf(node).includes(listing.sku)) return 2;
  if (name.length > 0 && (name.includes(title) || title.includes(name)))
    return 1;
  return 0;
};

/**
 * The Product nodes on a page that describe THIS listing. Product pages often
 * also carry markup for related products, so only the nodes that name the
 * listing most firmly count. A lone node is the page's product unless it names
 * something else outright; several resting only on a loose name match
 * ("Acme One" in "Acme One Pro") are ambiguous, and so is none matching —
 * compared, they would manufacture conflicts out of a "you may also like"
 * carousel.
 */
const listingNodes = (
  nodes: JsonLd.JsonObject[],
  listing: Pick<ListingSnapshot, "title" | "sku">,
) => {
  if (nodes.length === 0) return { nodes, ambiguous: false };

  const tiers = nodes.map((node) => ({ node, tier: matchTier(node, listing) }));
  const best = Math.max(...tiers.map((entry) => entry.tier));

  if (nodes.length === 1) {
    const [only] = tiers;
    const named = JsonLd.text(JsonLd.at(nodes[0] ?? {}, "name")) !== null;
    return only && only.tier === 0 && named
      ? { nodes: [], ambiguous: true }
      : { nodes, ambiguous: false };
  }

  if (best === 0) return { nodes: [], ambiguous: true };

  const matching = tiers
    .filter((entry) => entry.tier === best)
    .map((entry) => entry.node);
  const names = new Set(
    matching.map((node) => slug(JsonLd.text(JsonLd.at(node, "name")) ?? "")),
  );
  return best === 1 && names.size > 1
    ? { nodes: [], ambiguous: true }
    : { nodes: matching, ambiguous: false };
};

const GTIN_PROPERTIES = ["gtin", "gtin8", "gtin12", "gtin13", "gtin14"];

/**
 * Barcodes the markup states as barcodes. The prospect scan also reads
 * `productID` and bare `identifier` strings — fine for "is there a barcode",
 * wrong for a conflict: an internal numeric product ID is not a GTIN.
 */
const explicitGtins = (entry: JsonLd.JsonObject) => {
  const identifiers = [JsonLd.at(entry, "identifier")]
    .flat()
    .filter(JsonLd.isObject);
  return [
    ...GTIN_PROPERTIES.map((key) => JsonLd.gtinValue(JsonLd.at(entry, key))),
    ...identifiers.map((identifier) => JsonLd.gtinValue(identifier)),
  ].filter((value): value is string => value !== null && isValidGtin(value));
};

export const extractPageFacts = (
  html: string,
  listing: Pick<ListingSnapshot, "title" | "sku">,
): PageFacts => {
  const all = JsonLd.jsonLdBlocks(html).flatMap((block) => {
    const parsed = resultify(() => JSON.parse(block) as unknown);
    return parsed.success ? JsonLd.collectProductNodes(parsed.data) : [];
  });
  const { nodes, ambiguous } = listingNodes(all, listing);
  const family = nodes.flatMap((node) => [node, ...JsonLd.variantNodes(node)]);

  const offers = family.flatMap((entry) =>
    JsonLd.offersOf(entry).map(
      (offer): PageOffer => ({
        price: JsonLd.amount(JsonLd.at(offer, "price")),
        low: JsonLd.amount(JsonLd.at(offer, "lowPrice")),
        high: JsonLd.amount(JsonLd.at(offer, "highPrice")),
        currency: JsonLd.text(JsonLd.at(offer, "priceCurrency")),
        availability: offerAvailability(JsonLd.at(offer, "availability")),
        sku:
          JsonLd.text(JsonLd.at(offer, "sku")) ??
          JsonLd.text(JsonLd.at(entry, "sku")),
      }),
    ),
  );

  const unique = (values: (string | null)[]) => [
    ...new Set(values.filter((value): value is string => value !== null)),
  ];

  return {
    matched: nodes.length,
    ambiguous,
    offers,
    brands: unique(
      family.map((entry) => JsonLd.text(JsonLd.at(entry, "brand"))),
    ),
    gtins: family.flatMap((entry) => {
      const entrySku = JsonLd.text(JsonLd.at(entry, "sku"));
      return [
        ...explicitGtins(entry).map((value) => ({ value, sku: entrySku })),
        ...JsonLd.offersOf(entry).flatMap((offer) =>
          explicitGtins(offer).map((value) => ({
            value,
            sku: JsonLd.text(JsonLd.at(offer, "sku")) ?? entrySku,
          })),
        ),
      ];
    }),
  };
};

// ─── Core facts: catalog vs live page, no model involved ────────────────────

const sameAmount = (a: number, b: number) => Math.abs(a - b) < 0.01;

export const formatAmount = (amount: number, currency: string | null) =>
  `${amount.toFixed(2)}${currency ? ` ${currency.toUpperCase()}` : ""}`;

export type Comparison = Pick<
  CoreFact,
  "listing" | "page" | "consistency" | "note"
>;

type VariantScope = Pick<ListingSnapshot, "sku" | "variants">;

/**
 * The page's offers that speak for the catalog's variant. When the page labels
 * its offers with SKUs, only the catalog SKU's offers do — and if none carries
 * it, the page does not show this variant at all. Unlabelled offers all count,
 * with `complete` saying whether they could cover every catalog variant: a
 * page showing one offer for a product with five variants may simply show
 * another variant.
 */
const scopeOffers = (listing: VariantScope, offers: PageOffer[]) => {
  const labelled = offers.some((offer) => offer.sku !== null);
  if (listing.sku && labelled) {
    const own = offers.filter((offer) => offer.sku === listing.sku);
    return { offers: own, bySku: true, complete: own.length > 0 };
  }
  return {
    offers,
    bySku: false,
    complete: offers.length >= Math.max(1, listing.variants),
  };
};

const priceMatches = (offer: PageOffer, amount: number) => {
  if (offer.price !== null) return sameAmount(offer.price, amount);
  if (offer.low !== null && offer.high !== null)
    return amount >= offer.low - 0.01 && amount <= offer.high + 0.01;
  if (offer.low !== null) return amount >= offer.low - 0.01;
  return false;
};

/**
 * The catalog stores one price (Shopify's first variant) while the page may
 * publish one offer per variant, market or seller. A conflict needs an exact
 * price, in the catalog's own currency, on an offer that certainly speaks for
 * the catalog's variant. A range can confirm a price but never refute it; an
 * offer with no currency can confirm but not refute; another currency is not
 * comparable at all.
 */
export const comparePrice = (
  listing: Pick<ListingSnapshot, "price" | "currency" | "sku" | "variants">,
  page: PageFacts | null,
): Comparison => {
  const amount = parseAmount(listing.price);
  const shown = amount === null ? null : formatAmount(amount, listing.currency);
  const priced = (page?.offers ?? []).filter(
    (offer) => offer.price !== null || offer.low !== null,
  );
  const pageShown =
    [
      ...new Set(
        priced.map((offer) =>
          offer.price !== null
            ? formatAmount(offer.price, offer.currency)
            : `${formatAmount(offer.low ?? 0, offer.currency)}–${formatAmount(offer.high ?? offer.low ?? 0, offer.currency)}`,
        ),
      ),
    ]
      .slice(0, 3)
      .join(", ") || null;

  if (amount === null)
    return {
      listing: null,
      page: pageShown,
      consistency: "unknown",
      note: "missing-in-listing",
    };
  if (priced.length === 0)
    return {
      listing: shown,
      page: null,
      consistency: "unknown",
      note: "missing-on-page",
    };

  const result = { listing: shown, page: pageShown };
  const scope = scopeOffers(
    listing,
    priced.filter((offer) => offer.price !== null || offer.low !== null),
  );
  if (scope.bySku && scope.offers.length === 0)
    return { ...result, consistency: "unknown", note: "variant-not-matched" };

  const currencyOf = (offer: PageOffer) => {
    if (!offer.currency || !listing.currency) return "missing" as const;
    return offer.currency.toUpperCase() === listing.currency.toUpperCase()
      ? ("same" as const)
      : ("other" as const);
  };

  const comparable = scope.offers.filter(
    (offer) => currencyOf(offer) !== "other",
  );
  if (comparable.some((offer) => priceMatches(offer, amount)))
    return { ...result, consistency: "consistent", note: null };

  const exact = comparable.filter(
    (offer) => offer.price !== null && currencyOf(offer) === "same",
  );
  switch (true) {
    case exact.length > 0 && scope.complete:
      return { ...result, consistency: "conflicting", note: null };
    case exact.length > 0:
      return { ...result, consistency: "unknown", note: "variant-not-matched" };
    case comparable.length === 0:
      return { ...result, consistency: "unknown", note: "currency-mismatch" };
    case comparable.some((offer) => currencyOf(offer) === "missing"):
      return { ...result, consistency: "unknown", note: "currency-missing" };
    default:
      return { ...result, consistency: "unknown", note: null };
  }
};

/**
 * Stock compared at the same scope on both sides: the catalog SKU's variant
 * against that SKU's offers when the page labels them, otherwise "any variant
 * purchasable" against every offer. A page in stock where the catalog says
 * sold out is a conflict at any scope; a page out of stock where the catalog
 * says purchasable is one only when the page could be showing every variant.
 */
export const compareAvailability = (
  listing: Pick<
    ListingSnapshot,
    "availability" | "skuAvailability" | "sku" | "variants"
  >,
  page: PageFacts | null,
): Comparison => {
  const scope = scopeOffers(listing, page?.offers ?? []);
  const catalog = scope.bySku ? listing.skuAvailability : listing.availability;
  const onPage = anyInStock(
    scope.offers
      .map((offer) => offer.availability)
      .filter((value) => value !== "unknown"),
  );
  const shown = (value: Availability) => (value === "unknown" ? null : value);
  const result = { listing: shown(catalog), page: shown(onPage) };

  switch (true) {
    case scope.bySku && scope.offers.length === 0:
      return { ...result, consistency: "unknown", note: "variant-not-matched" };
    case catalog === "unknown":
      return { ...result, consistency: "unknown", note: "missing-in-listing" };
    case onPage === "unknown":
      return { ...result, consistency: "unknown", note: "missing-on-page" };
    case catalog === onPage:
      return { ...result, consistency: "consistent", note: null };
    case onPage === "in_stock" || scope.complete:
      return { ...result, consistency: "conflicting", note: null };
    default:
      return { ...result, consistency: "unknown", note: "variant-not-matched" };
  }
};

/**
 * The catalog's barcode against the page's explicit GTINs, at the same scope
 * as price: the catalog SKU's GTIN when the page ties GTINs to SKUs, otherwise
 * a conflict only when the page lists a GTIN for every catalog variant and
 * none is the catalog's.
 */
export const compareGtin = (
  listing: Pick<ListingSnapshot, "gtin" | "sku" | "variants">,
  page: PageFacts | null,
): Comparison => {
  const onPage = page?.gtins ?? [];
  const pageShown =
    [...new Set(onPage.map((entry) => entry.value))].slice(0, 3).join(", ") ||
    null;
  const result = { listing: listing.gtin, page: pageShown };
  if (listing.gtin === null)
    return { ...result, consistency: "unknown", note: "missing-in-listing" };
  const catalogGtin = listing.gtin;
  const invalid = isValidGtin(catalogGtin) ? null : ("invalid-gtin" as const);
  if (onPage.length === 0)
    return {
      ...result,
      consistency: "unknown",
      note: invalid ?? "missing-on-page",
    };

  const labelled = onPage.some((entry) => entry.sku !== null);
  const scoped =
    listing.sku && labelled
      ? onPage.filter((entry) => entry.sku === listing.sku)
      : onPage;
  if (scoped.length === 0)
    return { ...result, consistency: "unknown", note: "variant-not-matched" };

  const values = new Set(scoped.map((entry) => gtin14(entry.value)));
  if (values.has(gtin14(catalogGtin)))
    return { ...result, consistency: "consistent", note: invalid };
  const complete =
    (listing.sku !== null && labelled) ||
    values.size >= Math.max(1, listing.variants);
  return complete
    ? { ...result, consistency: "conflicting", note: invalid }
    : { ...result, consistency: "unknown", note: "variant-not-matched" };
};

export const compareBrand = (
  listing: string | null,
  page: PageFacts | null,
): Comparison => {
  const onPage = page?.brands ?? [];
  const pageShown = onPage.slice(0, 3).join(", ") || null;
  if (listing === null)
    return {
      listing: null,
      page: pageShown,
      consistency: "unknown",
      note: "missing-in-listing",
    };
  if (onPage.length === 0)
    return {
      listing,
      page: null,
      consistency: "unknown",
      note: "missing-on-page",
    };
  const ours = slug(listing);
  const consistent = onPage.some((brand) => {
    const theirs = slug(brand);
    return (
      theirs.length > 0 && (theirs.includes(ours) || ours.includes(theirs))
    );
  });
  return {
    listing,
    page: pageShown,
    consistency: consistent ? "consistent" : "conflicting",
    note: null,
  };
};

/** Why the page side of every core fact is blank, when it is blank for all. */
export const pageGap = (
  status: Report["page"]["status"],
  facts: PageFacts | null,
): CoreFactNote | null => {
  switch (true) {
    case status === "no-url" || status === "unreachable":
      return "no-page";
    case status === "missing":
      return "no-markup";
    case facts?.ambiguous === true:
      return "ambiguous-markup";
    default:
      return null;
  }
};

export type Assertion = Omit<
  Claim,
  | "verdict"
  | "citedStance"
  | "confidence"
  | "evidence"
  | "assistants"
  | "guidance"
>;

const RELEVANCE_RANK = { high: 0, medium: 1, low: 2 } as const;

/**
 * Words that bound or negate the claim right after them. A span that starts
 * just after one has lost it: "12 hours" out of "up to 12 hours", or
 * "waterproof" out of "not waterproof". Bounds only ever qualify a figure, so
 * they attach only to a span opening with a number — "learn more about our
 * 12-hour battery" must not become an approximate claim.
 */
const LEADING_NEGATION = /(?:\b(?:not|no|never|without)\s+|\bnon-\s*)+$/i;
const LEADING_BOUND =
  /(?:\b(?:up to|over|under|about|around|approximately|nearly|almost|roughly|more than|less than|fewer than|at least|at most|not|no|never|without)\s+|\bnon-\s*)+$/i;

/** Lowercase and quote/dash-folded, one character for one character. */
const fold = (value: string) =>
  value
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-");

const contains = (span: string, part: string | null) =>
  part !== null && normalize(span).includes(normalize(part));

/**
 * Finds the assertion's span in the listing and restores any bound or negation
 * the model left off, so the claim checked is the claim made. Null when the
 * span is not in the listing at all.
 */
const anchorSpan = (span: string, source: string) => {
  const flat = source.replace(/\s+/g, " ");
  const folded = fold(flat);
  const needle = normalize(span);
  const index = folded.indexOf(needle);
  if (needle.length < 3 || index === -1) return null;
  // Folding can change length for a few scripts; then offsets do not map back.
  if (folded.length !== flat.length) return { span: span.trim(), lead: null };

  const lead = folded
    .slice(Math.max(0, index - 40), index)
    .match(/^\d/.test(needle) ? LEADING_BOUND : LEADING_NEGATION);
  const start = lead ? index - lead[0].length : index;
  return {
    span: flat.slice(start, index + needle.length).trim(),
    lead: lead ? lead[0].trim() : null,
  };
};

/** One assertion as the extraction model returns it, before selection. */
export type RawAssertion = {
  span: string;
  kind: ClaimKind;
  attribute: string;
  value: string | null;
  unit: string | null;
  qualifier: string | null;
  checkable: boolean;
  relevance: "high" | "medium" | "low";
};

/**
 * Keeps only assertions whose span really is in the listing — a paraphrase or
 * an invented claim never reaches the report — with any dropped bound or
 * negation restored, the extracted value/unit/qualifier kept only where the
 * span itself carries them, de-duplicated, ranked by how much they decide a
 * purchase, and capped.
 */
export const selectAssertions = (raw: RawAssertion[], source: string) => {
  const seen = new Set<string>();
  const kept = raw
    .map((entry, index) => ({
      entry,
      index,
      anchored: anchorSpan(entry.span, source),
    }))
    .flatMap(({ entry, index, anchored }) => {
      if (!anchored) return [];
      const key = normalize(anchored.span);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ entry, index, span: anchored.span, lead: anchored.lead }];
    })
    .sort(
      (a, b) =>
        RELEVANCE_RANK[a.entry.relevance] - RELEVANCE_RANK[b.entry.relevance] ||
        a.index - b.index,
    )
    .map(({ entry, span, lead }): Assertion => {
      const value = entry.value?.trim() || null;
      const unit = entry.unit?.trim() || null;
      const qualifier = entry.qualifier?.trim() || lead;
      return {
        key: hash(normalize(span)).slice(0, 10),
        span,
        kind: entry.kind,
        attribute: entry.attribute.trim(),
        value: contains(span, value) ? value : null,
        unit: contains(span, unit) ? unit : null,
        qualifier: contains(span, qualifier) ? qualifier : null,
        checkable: entry.checkable,
      };
    });
  return { found: kept.length, claims: kept.slice(0, MAX_CLAIMS) };
};

export type ResearchFinding = {
  status: "supported" | "contradicted" | "none";
  note: string | null;
  /** URLs resolved from the citation markers inside this claim's section. */
  urls: string[];
};

const LABEL_HEADING =
  /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*(C\d+)\s*(?:\*\*|__)?\s*[:.)-]?\s*(.*)$/;
const ANY_HEADING = /^\s*#{1,6}\s+\S/;
const CITATION_MARKER = /[[【]\s*(\d{1,3}(?:\s*[,，]\s*\d{1,3})*)\s*[\]】]/g;

/**
 * Reads Perplexity's answer section by section. A section counts only under a
 * label we sent, and ends at the next heading of any kind — an unknown heading
 * never lends its text or citations to the claim before it. Citation markers
 * (`[2]`, `[1][3]`, `[1, 3]`, `【2】`) resolve to the n-th source the provider
 * returned; a marker with no URL there is dropped. The section text is
 * Perplexity's summary — it is shown as such, never as a quote. A label with no
 * section is absent from the map: that claim was not researched.
 */
export const parseResearch = (
  text: string,
  labels: string[],
  sources: (string | null)[],
): Map<string, ResearchFinding> => {
  const known = new Set(labels);
  const findings = new Map<string, ResearchFinding>();

  const sections: { label: string | null; lines: string[] }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(LABEL_HEADING);
    if (match?.[1] && known.has(match[1])) {
      sections.push({ label: match[1], lines: match[2] ? [match[2]] : [] });
      continue;
    }
    if (match?.[1] || ANY_HEADING.test(line)) {
      sections.push({ label: null, lines: [] });
      continue;
    }
    sections.at(-1)?.lines.push(line);
  }

  for (const section of sections) {
    if (section.label === null || findings.has(section.label)) continue;
    const body = section.lines.join("\n").trim();
    const statusLine =
      body.match(/STATUS\W{0,3}:\W{0,3}([a-z][a-z -]*)/i)?.[1] ?? "";
    const status = (() => {
      switch (true) {
        case /contradict/i.test(statusLine):
          return "contradicted" as const;
        case /^\s*support/i.test(statusLine):
          return "supported" as const;
        default:
          return "none" as const;
      }
    })();
    const note =
      body
        .replace(/\**STATUS\**\s*:[^\n]*/i, "")
        .replace(/\**NOTE\**\s*:\**/i, "")
        .replace(/\s+/g, " ")
        .trim() || null;
    const urls = [
      ...new Set(
        [...body.matchAll(CITATION_MARKER)]
          .flatMap((match) => (match[1] ?? "").split(/[,，]/))
          .map((marker) => sources[Number(marker.trim()) - 1])
          .filter((url): url is string => typeof url === "string"),
      ),
    ];
    findings.set(section.label, {
      status,
      note: note ? clip(note, 400) : null,
      urls,
    });
  }

  return findings;
};

// ─── Reading the cited pages ourselves ──────────────────────────────────────

/**
 * Who stands behind a source. The merchant's own hosts can never corroborate
 * the merchant; neither can the brand's own site, which publishes the same
 * marketing the listing repeats. A host carrying the brand's name as a label is
 * taken as the brand's — a heuristic, stated as such in the UI.
 */
export const partyOf = (
  url: string,
  merchantHosts: string[],
  brand: string | null,
): Party => {
  const host = hostOf(url);
  if (!host) return "merchant";
  if (
    merchantHosts.some((owned) => host === owned || host.endsWith(`.${owned}`))
  )
    return "merchant";
  const brandSlug = brand ? slug(brand) : "";
  if (
    brandSlug.length >= 3 &&
    host.split(".").some((label) => slug(label) === brandSlug)
  )
    return "manufacturer";
  return "independent";
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const occurrences = (haystack: string, needle: string) =>
  [...haystack.matchAll(new RegExp(escapeRegExp(needle), "g"))]
    .slice(0, 40)
    .map((match) => match.index ?? 0);

/** "weight" must find "weighs", "battery" must find "batteries". */
const stem = (word: string) =>
  word.length > 5 ? word.slice(0, word.length - 2) : word;

/**
 * Up to `limit` windows of page text where the page talks about this claim's
 * attribute. Windows are found from the attribute's words as well as the
 * asserted value, and ranked without regard to whether the value agrees —
 * "battery life is 8 hours" must reach the judge for a 12-hour claim as surely
 * as "12 hours" does. A page that never mentions the attribute yields nothing.
 */
export const excerptsFor = (
  text: string,
  claim: Pick<Claim, "attribute" | "value" | "unit">,
  limit = 3,
) => {
  const lower = text.toLowerCase();
  const stems = claim.attribute
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3)
    .map(stem);
  const value = claim.value?.toLowerCase() ?? null;
  const unit = claim.unit?.toLowerCase() ?? null;
  const anchors = [...stems, ...(value ? [value] : [])];

  const windows = anchors
    .flatMap((anchor) => occurrences(lower, anchor))
    .map((position) => {
      const start = Math.max(0, position - EXCERPT_RADIUS);
      const window = lower.slice(start, position + EXCERPT_RADIUS);
      const attributeHits = stems.filter((word) =>
        window.includes(word),
      ).length;
      const valueHit = value !== null && window.includes(value);
      const unitHit = unit !== null && window.includes(unit);
      const relevant =
        stems.length === 0
          ? valueHit
          : attributeHits >= Math.min(2, stems.length) ||
            (attributeHits >= 1 && (valueHit || unitHit));
      // Any figure counts, agreeing or not: a conflicting value is evidence too.
      const score =
        attributeHits * 2 + (/\d/.test(window) ? 1 : 0) + (unitHit ? 1 : 0);
      return { start, relevant, score };
    })
    .filter(({ relevant }) => relevant)
    .sort((a, b) => b.score - a.score);

  const chosen: number[] = [];
  for (const { start } of windows) {
    if (chosen.length >= limit) break;
    if (chosen.every((other) => Math.abs(other - start) >= EXCERPT_RADIUS * 2))
      chosen.push(start);
  }
  return chosen.map((start) =>
    text.slice(start, start + EXCERPT_RADIUS * 2).trim(),
  );
};

export const quoteIn = (quote: string | null, excerpt: string) => {
  if (!quote) return null;
  const trimmed = quote.trim().replace(/^["“]|["”]$/g, "");
  return trimmed.length >= 8 && normalize(excerpt).includes(normalize(trimmed))
    ? trimmed
    : null;
};

// ─── Verdicts ───────────────────────────────────────────────────────────────

/**
 * The verdict for one claim, from recorded evidence only. Order matters:
 * contradiction on an opened independent page outranks support, and a claim
 * the research never reached is "unresearched", not "merchant-only" — the
 * absence of evidence is only meaningful when someone looked.
 */
export const decideVerdict = ({
  checkable,
  researched,
  evidence,
  cited,
}: {
  checkable: boolean;
  researched: boolean;
  evidence: Evidence[];
  cited: ResearchFinding | null;
}): Pick<Claim, "verdict" | "citedStance" | "confidence"> => {
  if (!checkable)
    return { verdict: "not-checkable", citedStance: null, confidence: null };

  const independent = evidence.filter(
    (entry) =>
      entry.kind === "page" && entry.party === "independent" && entry.quote,
  );
  const hosts = (relation: Evidence["relation"]) =>
    new Set(
      independent
        .filter((entry) => entry.relation === relation)
        .map((entry) => entry.host),
    ).size;

  const contradicting = hosts("contradicts");
  if (contradicting > 0)
    return {
      verdict: "contradicted",
      citedStance: null,
      confidence: contradicting >= 2 ? "high" : "medium",
    };

  const supporting = hosts("supports");
  if (supporting > 0)
    return {
      verdict: "verified",
      citedStance: null,
      confidence: supporting >= 2 ? "high" : "medium",
    };

  if (!researched)
    return { verdict: "unresearched", citedStance: null, confidence: null };

  const citedIndependently = evidence.some(
    (entry) => entry.kind === "citation" && entry.party === "independent",
  );
  if (cited && cited.status !== "none" && citedIndependently)
    return {
      verdict: "cited",
      citedStance: cited.status === "supported" ? "supports" : "contradicts",
      confidence: "low",
    };

  return { verdict: "merchant-only", citedStance: null, confidence: null };
};

export const guidanceFor = (verdict: Verdict, kind: ClaimKind): GuidanceKey => {
  switch (verdict) {
    case "verified":
      return "verified";
    case "cited":
      return "cited";
    case "contradicted":
      return "contradicted";
    case "not-checkable":
      return "notCheckable";
    case "unresearched":
      return "unresearched";
    default:
      switch (kind) {
        case "spec":
        case "performance":
          return "merchantOnlySpec";
        case "certification":
          return "merchantOnlyCertification";
        case "comparative":
        case "superlative":
          return "merchantOnlyComparative";
        case "origin":
          return "merchantOnlyOrigin";
        case "policy":
          return "merchantOnlyPolicy";
        default:
          return "merchantOnlyOther";
      }
  }
};

export const summarize = (claims: Claim[], coreFacts: CoreFact[]): Summary => {
  const count = (verdict: Verdict) =>
    claims.filter((claim) => claim.verdict === verdict).length;
  return {
    claims: claims.length,
    verified: count("verified"),
    cited: count("cited"),
    merchantOnly: count("merchant-only"),
    contradicted: count("contradicted"),
    notCheckable: count("not-checkable"),
    unresearched: count("unresearched"),
    divergent: claims.filter((claim) =>
      claim.assistants.some((view) => view.stance === "diverges"),
    ).length,
    coreConflicts: coreFacts.filter(
      (fact) => fact.consistency === "conflicting",
    ).length,
  };
};
