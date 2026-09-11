/**
 * Cold-prospect scanner for the internal call sheet (`/dev/call-sheet`).
 *
 * The rep says these findings out loud to someone who can open dev tools while
 * he is still talking, so every one of them is derived from a live response
 * from the prospect's own domain and carries the URL it came from plus the raw
 * fragment it was read out of. Nothing here infers, guesses, or asks a model
 * what might be wrong: an absent signal produces no finding rather than a
 * softer one.
 *
 * Kept off the `"use server"` rail — it is a plain module so the spec can drive
 * it directly and `prospect-scan.ts` can wrap it in the session gate.
 */
import { resultify } from "@zenncore/utils";
import * as HTTP from "../../utils/http";
import {
  catalogContextFor,
  evaluateListing,
  type Finding,
  type Listing,
  type RuleId,
} from "./listing-rules";
import { isCrawlerBlocked, parseRobots } from "./robots";

const FETCH_TIMEOUT_MS = 10000;
const MAX_PRODUCT_PAGES = 8;
const SNIPPET_LIMIT = 600;
const MAX_FINDINGS = 3;

/**
 * The crawlers whose access decides AI visibility. Supersets
 * `robots.CRITICAL_CRAWLERS` with the two the UCP validator tracks and the
 * shared list does not (`AppleBot-Extended`, `CCBot`), because a prospect who
 * blocks Apple Intelligence or Common Crawl is a finding the rep can state.
 */
export const AI_CRAWLERS = [
  { id: "GPTBot", label: "GPTBot", operator: "OpenAI / ChatGPT" },
  { id: "OAI-SearchBot", label: "OAI-SearchBot", operator: "ChatGPT search" },
  { id: "ClaudeBot", label: "ClaudeBot", operator: "Anthropic / Claude" },
  { id: "PerplexityBot", label: "PerplexityBot", operator: "Perplexity" },
  { id: "Google-Extended", label: "Google-Extended", operator: "Gemini" },
  {
    id: "AppleBot-Extended",
    label: "AppleBot-Extended",
    operator: "Apple Intelligence",
  },
  { id: "CCBot", label: "CCBot", operator: "Common Crawl" },
] as const;

export type CrawlerAccess = "blocked" | "allowed" | "unknown";

export type CrawlerStatus = {
  id: string;
  label: string;
  operator: string;
  access: CrawlerAccess;
};

export type Evidence = {
  /** The exact URL fetched, so the prospect can open it mid-call. */
  url: string;
  /**
   * The JSON-LD node the finding was read out of, re-serialized and truncated.
   * Deliberately not described as the literal page source: it is the parsed
   * object, so key order and whitespace differ from what the prospect sees in
   * view-source. The `url` is the thing they open to check.
   */
  snippet: string;
};

export const FINDING_KINDS = [
  "crawlers-blocked",
  "no-structured-data",
  "no-gtin",
  "no-shipping",
  "no-returns",
  "variants-split",
  "no-rating",
  "no-brand",
  "no-price",
] as const;

export type FindingKind = (typeof FINDING_KINDS)[number];

export type ProspectFinding = {
  kind: FindingKind;
  /** Plain language, no jargon — this is the sentence the rep says. */
  plain: string;
  /** What breaks because of it, concretely. */
  consequence: string;
  coverage: { affected: number; checked: number };
  evidence: Evidence[];
  /** Official platform documentation, when the underlying rule carries one. */
  reference: string | null;
};

export type ScanFailure =
  | { kind: "invalid-url"; detail: string }
  | { kind: "unreachable"; detail: string }
  | { kind: "blocked"; status: number }
  | { kind: "timeout" }
  | { kind: "not-a-store" };

export type ProspectScan = {
  domain: string;
  origin: string;
  crawlers: CrawlerStatus[];
  /** Every product page actually fetched and parsed. */
  pagesChecked: string[];
  /** How the product pages were found, for the rep's own confidence. */
  pageSource: "sitemap" | "products-json" | "homepage-links" | null;
  productTitles: string[];
  findings: ProspectFinding[];
  failure: ScanFailure | null;
};

export type ProspectEvent =
  | { kind: "status"; message: string }
  | { kind: "crawlers"; crawlers: CrawlerStatus[] }
  | { kind: "pages"; urls: string[]; source: ProspectScan["pageSource"] }
  | { kind: "page_checked"; url: string; hasProduct: boolean }
  | { kind: "done"; scan: ProspectScan }
  | { kind: "error"; failure: ScanFailure };

type Emit = (event: ProspectEvent) => void;

const noop: Emit = () => {};

// ---------------------------------------------------------------------------
// URL handling
// ---------------------------------------------------------------------------

/**
 * Accepts what a rep actually pastes — "example.com", "www.example.com/",
 * "https://example.com/products/x" — and returns the canonical origin, or null
 * when there is no usable host.
 */
export const normalizeOrigin = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const parsed = resultify(() => new URL(withScheme));
  if (!parsed.success) return null;
  if (!parsed.data.hostname.includes(".")) return null;

  return parsed.data.origin;
};

export const hostOf = (origin: string): string => {
  const parsed = resultify(() => new URL(origin));
  return parsed.success ? parsed.data.hostname.replace(/^www\./, "") : origin;
};

type Fetched = {
  status: number;
  body: string;
  /** The URL that answered — the last hop after redirects. */
  url: string;
};

/**
 * One guarded GET. The URL is rep-supplied free text from a browser, so it goes
 * through `HTTP.request`'s SSRF guard — every redirect hop is re-checked, since
 * stores redirect constantly (apex to www, http to https, handle to canonical).
 *
 * 403/503 from a bot wall is a different conversation from "no data" — the rep
 * must not report an empty scan as though the store were bare.
 */
const fetchText = async (
  url: string,
): Promise<
  { success: true; data: Fetched } | { success: false; error: ScanFailure }
> => {
  const response = await HTTP.request(
    url,
    {
      method: "GET",
      headers: {
        // Identify honestly. A prospect who greps their logs after the call
        // should find us under our own name.
        "User-Agent": "EcenticCallSheet/1.0 (+https://ecentic.ai)",
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    },
    { timeout: FETCH_TIMEOUT_MS, guard: true },
  );

  if (!response.success)
    switch (response.error.name) {
      case "validation-error":
        return {
          success: false,
          error: {
            kind: "invalid-url",
            detail: "Not a reachable public https URL",
          },
        };
      case "timeout-error":
        return { success: false, error: { kind: "timeout" } };
      default:
        return {
          success: false,
          error: { kind: "unreachable", detail: response.error.message },
        };
    }

  if (response.data.status === 403 || response.data.status === 503)
    return {
      success: false,
      error: { kind: "blocked", status: response.data.status },
    };

  const body = await HTTP.read(response.data);
  if (!body.success)
    return {
      success: false,
      error: { kind: "unreachable", detail: "Response body unreadable" },
    };

  return {
    success: true,
    data: {
      status: response.data.status,
      body: body.data,
      url: response.data.url || url,
    },
  };
};

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

/**
 * Crawler access, per bot. Any failure to read robots.txt yields `unknown` for
 * every bot — never `allowed`. `ucp/check.ts` fails open here, which would put
 * "all AI crawlers allowed" on screen for a store whose robots.txt merely
 * timed out; on this page that is a false statement to a prospect.
 */
export const checkCrawlers = async (
  origin: string,
): Promise<{ crawlers: CrawlerStatus[]; evidence: Evidence | null }> => {
  const url = `${origin}/robots.txt`;
  const response = await fetchText(url);

  const unknown = AI_CRAWLERS.map((crawler) => ({
    id: crawler.id,
    label: crawler.label,
    operator: crawler.operator,
    access: "unknown" as const,
  }));

  if (!response.success || response.data.status !== 200)
    return { crawlers: unknown, evidence: null };

  const groups = parseRobots(response.data.body);

  return {
    crawlers: AI_CRAWLERS.map((crawler) => ({
      id: crawler.id,
      label: crawler.label,
      operator: crawler.operator,
      access: isCrawlerBlocked(groups, crawler.id)
        ? ("blocked" as const)
        : ("allowed" as const),
    })),
    evidence: { url, snippet: truncate(response.data.body) },
  };
};

// ---------------------------------------------------------------------------
// Product page discovery
// ---------------------------------------------------------------------------

const PRODUCT_PATH = /\/(products?|p|shop|item)\/[^"'\s?#]+/i;

const absolute = (href: string, origin: string): string | null => {
  const parsed = resultify(() => new URL(href, origin));
  if (!parsed.success) return null;
  if (parsed.data.origin !== origin) return null;
  return `${parsed.data.origin}${parsed.data.pathname}`;
};

const unique = (values: string[]): string[] => [...new Set(values)];

const fromSitemap = async (origin: string): Promise<string[]> => {
  const response = await fetchText(`${origin}/sitemap.xml`);
  if (!response.success || response.data.status !== 200) return [];

  const locations = [...response.data.body.matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => (match[1] ?? "").trim())
    .filter((value) => value.length > 0);

  const direct = locations.filter((value) => PRODUCT_PATH.test(value));
  if (direct.length > 0)
    return unique(
      direct
        .map((value) => absolute(value, origin))
        .filter((value): value is string => value !== null),
    );

  // A sitemap index points at child sitemaps; follow the one most likely to
  // hold products rather than fanning out across all of them.
  const child = locations.find((value) => /product/i.test(value));
  if (!child) return [];

  const nested = await fetchText(child);
  if (!nested.success || nested.data.status !== 200) return [];

  return unique(
    [...nested.data.body.matchAll(/<loc>([^<]+)<\/loc>/gi)]
      .map((match) => (match[1] ?? "").trim())
      .filter((value) => PRODUCT_PATH.test(value))
      .map((value) => absolute(value, origin))
      .filter((value): value is string => value !== null),
  );
};

const fromProductsJson = async (origin: string): Promise<string[]> => {
  const response = await fetchText(`${origin}/products.json?limit=50`);
  if (!response.success || response.data.status !== 200) return [];

  const parsed = resultify(
    () =>
      JSON.parse(response.data.body) as { products?: { handle?: string }[] },
  );
  if (!parsed.success) return [];

  return unique(
    (parsed.data.products ?? [])
      .map((product) => product.handle)
      .filter((handle): handle is string => Boolean(handle))
      .map((handle) => `${origin}/products/${handle}`),
  );
};

const fromHomepageLinks = async (origin: string): Promise<string[]> => {
  const response = await fetchText(origin);
  if (!response.success || response.data.status !== 200) return [];

  return unique(
    [...response.data.body.matchAll(/href=["']([^"']+)["']/gi)]
      .map((match) => match[1] ?? "")
      .filter((href) => PRODUCT_PATH.test(href))
      .map((href) => absolute(href, origin))
      .filter((value): value is string => value !== null),
  );
};

export const discoverProductPages = async (
  origin: string,
): Promise<{ urls: string[]; source: ProspectScan["pageSource"] }> => {
  const sitemap = await fromSitemap(origin);
  if (sitemap.length > 0)
    return { urls: sitemap.slice(0, MAX_PRODUCT_PAGES), source: "sitemap" };

  const productsJson = await fromProductsJson(origin);
  if (productsJson.length > 0)
    return {
      urls: productsJson.slice(0, MAX_PRODUCT_PAGES),
      source: "products-json",
    };

  const links = await fromHomepageLinks(origin);
  if (links.length > 0)
    return {
      urls: links.slice(0, MAX_PRODUCT_PAGES),
      source: "homepage-links",
    };

  return { urls: [], source: null };
};

// ---------------------------------------------------------------------------
// JSON-LD extraction
//
// `page-schema.ts` answers only "is there Product markup here". Everything
// below reads the markup's actual fields, which is what a finding needs.
// ---------------------------------------------------------------------------

const truncate = (value: string, limit = SNIPPET_LIMIT): string =>
  value.length <= limit ? value : `${value.slice(0, limit)}…`;

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads one property off a parsed JSON-LD node. Centralized so the index
 * access lives in a single place — `noPropertyAccessFromIndexSignature` forbids
 * dot access on these, and Biome's `useLiteralKeys` rewrites literal bracket
 * access into it.
 */
const at = (node: JsonObject, key: string): unknown => node[key];

const typesOf = (node: JsonObject): string[] => {
  const raw = at(node, "@type");
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw))
    return raw.filter((value): value is string => typeof value === "string");
  return [];
};

const isProductNode = (node: JsonObject): boolean => {
  const types = typesOf(node);
  return types.includes("Product") || types.includes("ProductGroup");
};

/**
 * The *outermost* Product / ProductGroup nodes in a JSON-LD document — arrays,
 * `@graph` envelopes and nested nodes alike, since real stores use all three
 * shapes.
 *
 * Descent stops at each product it finds. A page publishing one ProductGroup
 * with forty sized variants is one product, not forty-one: counting the
 * subtree would inflate every coverage number the rep reads out ("286 of 286
 * products" off eight pages) and would report a variant twice.
 */
const collectProductNodes = (value: unknown, depth = 0): JsonObject[] => {
  if (depth > 6) return [];
  if (Array.isArray(value))
    return value.flatMap((entry) => collectProductNodes(entry, depth + 1));
  if (!isObject(value)) return [];
  if (isProductNode(value)) return [value];

  return Object.values(value).flatMap((entry) =>
    Array.isArray(entry) || isObject(entry)
      ? collectProductNodes(entry, depth + 1)
      : [],
  );
};

/** Every Product node inside a group's `hasVariant`, one level down. */
const variantNodes = (node: JsonObject): JsonObject[] => {
  const variants = at(node, "hasVariant");
  if (Array.isArray(variants)) return variants.filter(isObject);
  return isObject(variants) ? [variants] : [];
};

export const jsonLdBlocks = (html: string): string[] =>
  [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((match) => (match[1] ?? "").trim())
    .filter((block) => block.length > 0);

const text = (value: unknown): string | null => {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return text(value[0]);
  if (isObject(value)) return text(at(value, "name") ?? at(value, "@value"));
  return null;
};

/**
 * Every offer on a node. `offers` is routinely an array — one per variant or
 * per seller — and a field published on the second offer is just as visible to
 * an agent as one on the first. Reading only `offers[0]` would report it
 * absent and put a false claim on the call.
 */
const offersOf = (node: JsonObject): JsonObject[] => {
  const offers = at(node, "offers");
  if (Array.isArray(offers)) return offers.filter(isObject);
  return isObject(offers) ? [offers] : [];
};

/**
 * Where a barcode actually appears in the wild. Beyond the schema.org `gtin*`
 * properties, themes commonly publish the same number as `productID`, or in an
 * `identifier` / `PropertyValue` pair. Treating those as absent would
 * over-report "no barcode" — the most damaging false claim this page can make.
 */
const GTIN_KEYS = [
  "gtin",
  "gtin14",
  "gtin13",
  "gtin12",
  "gtin8",
  "productID",
  "identifier",
] as const;

/** A bare GTIN, or one wrapped as `{ propertyID: "gtin13", value: "…" }`. */
const gtinValue = (value: unknown): string | null => {
  const direct = text(value)?.replace(/[\s-]/g, "") ?? null;
  if (direct && /^\d{8,14}$/.test(direct)) return direct;

  if (Array.isArray(value))
    return value.map(gtinValue).find((entry) => entry !== null) ?? null;

  if (isObject(value)) {
    const property = (text(at(value, "propertyID")) ?? "").toLowerCase();
    const identifies =
      property.includes("gtin") ||
      property.includes("upc") ||
      property.includes("ean");
    return identifies ? gtinValue(at(value, "value")) : null;
  }

  return null;
};

const gtinOf = (node: JsonObject, offers: JsonObject[]): string | null =>
  [node, ...offers]
    .flatMap((entry) => GTIN_KEYS.map((key) => gtinValue(at(entry, key))))
    .find((value): value is string => value !== null) ?? null;

export type ExtractedProduct = {
  url: string;
  isVariantGroup: boolean;
  hasVariants: boolean;
  name: string | null;
  brand: string | null;
  description: string | null;
  image: string | null;
  sku: string | null;
  mpn: string | null;
  gtin: string | null;
  price: number | null;
  currency: string | null;
  hasShipping: boolean;
  hasReturnPolicy: boolean;
  hasRating: boolean;
  /** The parsed node this was read out of, for the evidence panel. */
  snippet: string;
};

const amount = (value: unknown): number | null => {
  const raw = text(value);
  if (raw === null) return null;
  const parsed = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Every schema.org Product / ProductGroup on one page, with the fields an AI
 * shopping agent reads. Malformed JSON in one block never discards the others.
 */
export const extractProducts = (
  html: string,
  url: string,
): ExtractedProduct[] => {
  const nodes = jsonLdBlocks(html).flatMap((block) => {
    const parsed = resultify(() => JSON.parse(block) as unknown);
    return parsed.success ? collectProductNodes(parsed.data) : [];
  });

  const extracted = nodes.map((node): ExtractedProduct => {
    const variants = variantNodes(node);
    // A field counts as published when it is on the group OR on any of its
    // variants: an agent reading this page would find it either way, and
    // telling a prospect "there is no barcode anywhere" when their variants
    // carry one is the exact claim that loses the call.
    const family = [node, ...variants];
    const offers = family.flatMap(offersOf);
    const offer = offers[0] ?? null;

    return {
      url,
      isVariantGroup: typesOf(node).includes("ProductGroup"),
      hasVariants: variants.length > 0,
      name: text(at(node, "name")),
      brand:
        family.map((entry) => text(at(entry, "brand"))).find(Boolean) ?? null,
      description: text(at(node, "description")),
      image: text(at(node, "image")),
      sku: text(at(node, "sku")),
      mpn: family.map((entry) => text(at(entry, "mpn"))).find(Boolean) ?? null,
      gtin:
        family
          .map((entry) => gtinOf(entry, offersOf(entry)))
          .find((value): value is string => value !== null) ?? null,
      price: offer ? amount(at(offer, "price")) : null,
      currency: offer ? text(at(offer, "priceCurrency")) : null,
      hasShipping: offers.some(
        (entry) => at(entry, "shippingDetails") !== undefined,
      ),
      hasReturnPolicy: offers.some(
        (entry) => at(entry, "hasMerchantReturnPolicy") !== undefined,
      ),
      hasRating: family.some(
        (entry) =>
          at(entry, "aggregateRating") !== undefined ||
          at(entry, "review") !== undefined,
      ),
      snippet: truncate(JSON.stringify(node)),
    };
  });

  // A page routinely publishes the same item twice — once as `Product` for
  // older consumers and once as `ProductGroup` with the variants. Counting
  // both would double every coverage number, so keep one per name and prefer
  // the group, which carries strictly more.
  return [
    ...extracted
      .reduce((deduped, product) => {
        const key = (product.name ?? product.url).toLowerCase();
        const existing = deduped.get(key);
        if (!existing || (product.isVariantGroup && !existing.isVariantGroup))
          deduped.set(key, product);
        return deduped;
      }, new Map<string, ExtractedProduct>())
      .values(),
  ];
};

/** The extracted node mapped onto the shape the shared rule registry checks. */
export const toListing = (product: ExtractedProduct): Listing => ({
  feedId: product.sku ?? product.url,
  title: product.name ?? "",
  description: product.description,
  link: product.url,
  images: product.image ? [product.image] : [],
  price: product.price,
  compareAtPrice: null,
  currency: product.currency,
  brand: product.brand,
  barcode: product.gtin,
  mpn: product.mpn,
});

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

/**
 * Ordered by how fast a non-technical prospect grasps the consequence, not by
 * technical severity — the first one is the one the rep leads with. A blocked
 * crawler is binary and checkable in ten seconds; a missing barcode needs a
 * sentence of setup; a split variant group needs two.
 */
const KIND_RANK: Record<FindingKind, number> = {
  "crawlers-blocked": 1,
  "no-structured-data": 2,
  "no-gtin": 3,
  "no-shipping": 4,
  "no-returns": 5,
  "variants-split": 6,
  "no-rating": 7,
  "no-brand": 8,
  "no-price": 9,
};

/**
 * The rules from the shared registry worth saying on a phone call. The other
 * 25 are feed-hygiene (title length, promo text, whitespace) — real, but they
 * do not survive being read aloud to a founder.
 */
const RULE_TO_KIND: Partial<Record<RuleId, FindingKind>> = {
  "gtin-missing": "no-gtin",
  "gtin-invalid": "no-gtin",
  "brand-missing": "no-brand",
  "price-missing": "no-price",
};

const COPY: Record<FindingKind, { plain: string; consequence: string }> = {
  "crawlers-blocked": {
    plain: "The store's robots.txt turns away the AI crawlers by name.",
    consequence:
      "These are the crawlers that build what ChatGPT, Claude, Gemini and Perplexity know about a store. Turned away at the door, they have nothing to recommend from — the products aren't ranked badly, they're absent.",
  },
  "no-structured-data": {
    // Deliberately says "in the HTML the server sends". Some stores inject
    // their JSON-LD client-side: our fetch does not run JavaScript, and
    // neither do most crawlers — but the prospect's dev tools show the
    // rendered DOM and *would* display it. Without this qualifier they can
    // appear to disprove a finding that is substantively true.
    plain:
      "The HTML the store's server sends carries no machine-readable product data — no product markup arrives with the page.",
    consequence:
      "A shopping agent reads that markup rather than the page a person sees, and most crawlers never run the store's JavaScript. With nothing in the delivered HTML they have to guess the price, the name and whether the item is in stock — so they usually skip the product rather than risk quoting it wrong. Worth asking whether their theme adds it in the browser: if so, a shopper sees it and an agent still doesn't.",
  },
  "no-gtin": {
    plain: "There's no barcode published anywhere on the product pages.",
    consequence:
      "The barcode is how an agent works out that this bottle and that bottle are the same bottle. Without one it can't match the product to the same product on any other site, so reviews and prices never consolidate and the product drops out of the comparison entirely.",
  },
  "no-shipping": {
    plain: "The product data carries a price but no shipping information.",
    consequence:
      "The agent knows the sticker price and not the delivered cost. When it compares against a competitor that publishes shipping, it is comparing an incomplete number against a complete one — and it tends to prefer the one it can actually total up.",
  },
  "no-returns": {
    plain: "There's no returns policy attached to the product data.",
    consequence:
      "Return terms are one of the few trust signals an agent can read directly. A competitor who publishes theirs gets recommended for the cautious buyer; a store with nothing attached doesn't get considered for that shopper at all.",
  },
  "variants-split": {
    plain:
      "The same product is published as several separate products rather than one product with options.",
    consequence:
      "The agent sees four weak listings instead of one strong one. Reviews, ratings and stock get split across all of them, and none of the four looks as good as the single product actually is.",
  },
  "no-rating": {
    plain: "No ratings or review counts are published in the product data.",
    consequence:
      "The store may show plenty of reviews to a human on the page, but none of it reaches the agent. A shopper who asks for something well-reviewed excludes the store by construction — not on merit, on a missing field.",
  },
  "no-brand": {
    plain: "The product data doesn't say what brand the product is.",
    consequence:
      "Anyone asking an agent for a brand by name never reaches these pages, because nothing in the data connects the product to the brand.",
  },
  "no-price": {
    plain: "The product data doesn't carry a price.",
    consequence:
      "Price is the first thing an agent filters on. A product with no price in its data can't enter a price comparison at all.",
  },
};

/** The official platform doc for a rule-derived finding, when one exists. */
const referenceFor = (
  findings: Finding[],
  kind: FindingKind,
): string | null => {
  const match = findings.find((finding) => RULE_TO_KIND[finding.rule] === kind);
  if (!match) return null;
  return match.platforms[0]?.verdict.reference ?? null;
};

/**
 * The base a variant title hangs off — "Shirt - Large" and "Shirt, Blue" both
 * reduce to "shirt". Used only to spot the same product published more than
 * once; never shown to anyone.
 */
const baseTitle = (title: string): string =>
  title
    .toLowerCase()
    .split(/\s+[-–—]\s+|,\s+/)[0]
    ?.replace(/[^a-z0-9 ]/g, "")
    .trim() ?? "";

const finding = (
  kind: FindingKind,
  affected: number,
  checked: number,
  evidence: Evidence[],
  reference: string | null = null,
): ProspectFinding => ({
  kind,
  plain: COPY[kind].plain,
  consequence: COPY[kind].consequence,
  coverage: { affected, checked },
  evidence,
  reference,
});

export const buildFindings = ({
  crawlers,
  crawlersEvidence,
  pages,
  products,
}: {
  crawlers: CrawlerStatus[];
  crawlersEvidence: Evidence | null;
  pages: { url: string; products: ExtractedProduct[]; html: string }[];
  products: ExtractedProduct[];
}): ProspectFinding[] => {
  const checked = pages.length;

  const blocked = crawlers.filter((crawler) => crawler.access === "blocked");

  const listingFindings = products.flatMap((product) =>
    evaluateListing(
      toListing(product),
      catalogContextFor(products.map(toListing)),
    ),
  );

  const withoutMarkup = pages.filter((page) => page.products.length === 0);

  const affectedBy = (
    predicate: (product: ExtractedProduct) => boolean,
  ): ExtractedProduct[] => products.filter(predicate);

  const evidenceFrom = (matched: ExtractedProduct[]): Evidence[] =>
    matched
      .slice(0, 3)
      .map((product) => ({ url: product.url, snippet: product.snippet }));

  // Same base title on two different URLs, with neither page declaring a
  // variant group — two URLs the rep can open side by side.
  const splitVariants = (() => {
    const grouped = new Map<string, ExtractedProduct[]>();
    for (const product of products) {
      if (product.isVariantGroup || product.hasVariants) continue;
      if (!product.name) continue;
      const base = baseTitle(product.name);
      if (base.length < 4) continue;
      grouped.set(base, [...(grouped.get(base) ?? []), product]);
    }
    return [...grouped.values()].filter(
      (group) => new Set(group.map((product) => product.url)).size > 1,
    );
  })();

  const candidates: (ProspectFinding | null)[] = [
    blocked.length > 0 && crawlersEvidence
      ? {
          ...finding("crawlers-blocked", blocked.length, crawlers.length, [
            crawlersEvidence,
          ]),
          plain: `${COPY["crawlers-blocked"].plain} Blocked: ${blocked
            .map((crawler) => crawler.label)
            .join(", ")}.`,
        }
      : null,

    withoutMarkup.length > 0
      ? finding(
          "no-structured-data",
          withoutMarkup.length,
          checked,
          withoutMarkup.slice(0, 3).map((page) => ({
            url: page.url,
            snippet:
              jsonLdBlocks(page.html).length > 0
                ? truncate(jsonLdBlocks(page.html)[0] ?? "")
                : 'No <script type="application/ld+json"> block on the page.',
          })),
        )
      : null,

    ...(
      [
        ["no-gtin", (product: ExtractedProduct) => product.gtin === null],
        ["no-shipping", (product: ExtractedProduct) => !product.hasShipping],
        ["no-returns", (product: ExtractedProduct) => !product.hasReturnPolicy],
        ["no-rating", (product: ExtractedProduct) => !product.hasRating],
        ["no-brand", (product: ExtractedProduct) => product.brand === null],
        ["no-price", (product: ExtractedProduct) => product.price === null],
      ] as const
    ).map(([kind, predicate]) => {
      const matched = affectedBy(predicate);
      // Only a finding when it holds for every product we looked at. "Some of
      // your products" invites "which ones?" and the rep cannot answer from a
      // sample of eight.
      if (products.length === 0 || matched.length !== products.length)
        return null;
      return finding(
        kind,
        matched.length,
        products.length,
        evidenceFrom(matched),
        referenceFor(listingFindings, kind),
      );
    }),

    splitVariants.length > 0
      ? finding(
          "variants-split",
          splitVariants.reduce((total, group) => total + group.length, 0),
          products.length,
          evidenceFrom(splitVariants.flat()),
        )
      : null,
  ];

  return candidates
    .filter((entry): entry is ProspectFinding => entry !== null)
    .sort((first, second) => KIND_RANK[first.kind] - KIND_RANK[second.kind])
    .slice(0, MAX_FINDINGS);
};

// ---------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------

const empty = (
  domain: string,
  origin: string,
  crawlers: CrawlerStatus[],
  failure: ScanFailure | null,
): ProspectScan => ({
  domain,
  origin,
  crawlers,
  pagesChecked: [],
  pageSource: null,
  productTitles: [],
  findings: [],
  failure,
});

/**
 * Scan one prospect. Emits progress as it goes so the rep watches real state
 * rather than a spinner — he is about to dial, and a stalled scan he can't read
 * is worse than a slow one he can.
 *
 * Every exit is explicit: a failure kind, or findings, or an empty findings
 * list on a store that genuinely has nothing worth saying. There is no branch
 * that returns a plausible-looking result it did not measure.
 */
export const scanProspect = async (
  input: { store: string },
  emit: Emit = noop,
): Promise<ProspectScan> => {
  const origin = normalizeOrigin(input.store);

  if (origin === null) {
    const failure: ScanFailure = {
      kind: "invalid-url",
      detail: "That doesn't look like a store address.",
    };
    emit({ kind: "error", failure });
    return empty(input.store, input.store, [], failure);
  }

  const domain = hostOf(origin);

  emit({ kind: "status", message: `Reading ${domain}/robots.txt` });
  const { crawlers, evidence: crawlersEvidence } = await checkCrawlers(origin);
  emit({ kind: "crawlers", crawlers });

  emit({ kind: "status", message: "Looking for product pages" });
  const discovered = await discoverProductPages(origin);

  if (discovered.urls.length === 0) {
    // Distinguish "the site is down" from "the site is up and sells nothing we
    // can find". They are different sentences on a call.
    const reachable = await fetchText(origin);
    const failure: ScanFailure = reachable.success
      ? { kind: "not-a-store" }
      : reachable.error;

    emit({ kind: "error", failure });
    return empty(domain, origin, crawlers, failure);
  }

  emit({ kind: "pages", urls: discovered.urls, source: discovered.source });

  const fetched = await Promise.all(
    discovered.urls.map(async (url) => {
      const response = await fetchText(url);
      if (!response.success) return null;

      const products = extractProducts(response.data.body, url);
      emit({ kind: "page_checked", url, hasProduct: products.length > 0 });

      return { url, html: response.data.body, products };
    }),
  );

  const pages = fetched.filter((page) => page !== null);

  if (pages.length === 0) {
    const failure: ScanFailure = {
      kind: "unreachable",
      detail: "No product page could be fetched.",
    };
    emit({ kind: "error", failure });
    return empty(domain, origin, crawlers, failure);
  }

  const products = pages.flatMap((page) => page.products);

  const scan: ProspectScan = {
    domain,
    origin,
    crawlers,
    pagesChecked: pages.map((page) => page.url),
    pageSource: discovered.source,
    productTitles: products
      .map((product) => product.name)
      .filter((name): name is string => name !== null)
      .slice(0, 10),
    findings: buildFindings({
      crawlers,
      crawlersEvidence,
      pages,
      products,
    }),
    failure: null,
  };

  emit({ kind: "done", scan });
  return scan;
};
