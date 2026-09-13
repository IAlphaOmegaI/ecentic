import type { Result } from "@zenncore/utils";
import { RequestError } from "./error";
import * as HTTP from "./http";

/**
 * SerpApi client for product-level competitor offers — "who else sells this
 * product, and at what price".
 *
 * This is the half of competitor discovery Google Merchant Center structurally
 * cannot answer: `competitive_visibility_competitor_view` names rival domains
 * without prices, and `price_competitiveness_product_view` gives a benchmark
 * price with the rival anonymized. Neither yields a named seller at a real
 * price, which is what the judge needs to compare like with like.
 *
 * Transport only, deliberately: no `"use server"`, no session, no database.
 * Orchestration, ownership guards and persistence live in
 * `server/app/intelligence/offers.ts`, mirroring the split between
 * `utils/google-merchant.ts` and `app/integration/google-merchant.ts`.
 */

const SERPAPI_BASE = "https://serpapi.com/search.json";

export type Configuration = {
  apiKey: string;
};

export const configuration = (): Configuration | null => {
  const { SERPAPI_API_KEY } = process.env;
  if (!SERPAPI_API_KEY) return null;

  return { apiKey: SERPAPI_API_KEY };
};

export const notConfiguredError = () =>
  new RequestError("SerpApi not configured (SERPAPI_API_KEY)");

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

/**
 * Same backoff ladder as the Merchant client. 429 is SerpApi's plan-level
 * concurrency limit rather than a hard quota — it clears on its own, so
 * retrying is correct — and 5xx covers the upstream being briefly unavailable.
 */
const RETRY_DELAYS_MS = [1000, 3000, 8000];

/**
 * `HTTP.request` returns non-ok responses as *successful* Results carrying the
 * Response, which is precisely what lets us branch on status before parsing.
 */
const api = async <T>(
  parameters: Record<string, string>,
): Promise<Result<T, Error>> => {
  const query = new URLSearchParams(parameters).toString();

  const attempt = () =>
    HTTP.request(
      `${SERPAPI_BASE}?${query}`,
      { method: "GET", headers: { Accept: "application/json" } },
      // SerpApi holds the connection open while it fetches and parses the
      // underlying Google page; the p99 sits well above a default fetch
      // timeout, and a timeout here still bills the search.
      { timeout: 30000 },
    );

  const first = await attempt();
  const retriable = (response: Awaited<ReturnType<typeof attempt>>) =>
    response.success &&
    (response.data.status === 429 || response.data.status >= 500);

  if (!retriable(first)) return HTTP.parse<T>(first);

  const latest = await (async () => {
    for (const delay of RETRY_DELAYS_MS) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      const retried = await attempt();
      if (!retriable(retried)) return retried;
    }
    return attempt();
  })();

  return HTTP.parse<T>(latest);
};

/**
 * SerpApi reports business failures as HTTP 200 with an `error` string — "Google
 * hasn't returned any results for this query", an exhausted plan, a stale
 * token. Parsing straight into the success schema would read those as an empty
 * result set and silently bill for nothing, so every response is checked here
 * first.
 */
const rejected = (payload: { error?: string }) =>
  typeof payload.error === "string" && payload.error.length > 0
    ? new RequestError(`SerpApi: ${payload.error}`)
    : null;

/**
 * `gl` and `hl` are interpolated into a query string that costs money to send.
 * They arrive from a server action — that is, from the client, where the
 * compiler's types stop being load-bearing — so they are validated against a
 * closed character class rather than escaped. Same reasoning as the allowlists
 * in `google-merchant.ts`.
 */
const LOCALE_PATTERN = /^[a-z]{2}$/;

// ---------------------------------------------------------------------------
// Raw response shapes
// ---------------------------------------------------------------------------

/**
 * Every field is optional on purpose. These describe a third party's JSON, not
 * our own contract; SerpApi adds and drops keys per Google surface change, and
 * a required field here would turn a cosmetic upstream change into a parse
 * failure on a paid call.
 */
type ShoppingResult = {
  position?: number;
  title?: string;
  product_id?: string;
  immersive_product_page_token?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
};

type ShoppingResponse = {
  error?: string;
  shopping_results?: ShoppingResult[];
};

type ImmersiveStore = {
  name?: string;
  link?: string;
  logo?: string;
  title?: string;
  price?: string;
  extracted_price?: number;
  shipping?: string;
  shipping_extracted?: number;
  extracted_shipping?: number;
  estimated_tax?: string;
  extracted_estimated_tax?: number;
  total?: string;
  extracted_total?: number;
  rating?: number;
  reviews?: number;
  tag?: string;
};

type ImmersiveResponse = {
  error?: string;
  product_results?: {
    title?: string;
    brand?: string;
    rating?: number;
    reviews?: number;
    stores?: ImmersiveStore[];
  };
};

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * SerpApi returns a display string (`"$129.95"`) beside a parsed number
 * (`extracted_price`), and the parsed key is spelled inconsistently across
 * fields — `shipping_extracted` on some surfaces, `extracted_shipping` on
 * others. Take the first finite candidate and never parse the display string
 * ourselves; a locale that groups with "." would round by three orders of
 * magnitude.
 */
const numeric = (...candidates: (number | undefined)[]) =>
  candidates.find(
    (value) => typeof value === "number" && Number.isFinite(value),
  ) ?? null;

/**
 * No ISO currency code appears anywhere in the response, so it is inferred from
 * the display symbol. Ordered longest-prefix-first because "R$", "C$" and "A$"
 * all end in the "$" that would otherwise swallow them.
 *
 * Returns null rather than defaulting to USD when nothing matches: `formatPrice`
 * renders the "$" symbol for a null currency anyway, so a wrong guess would
 * print a confidently mislabelled price where a null merely prints an em dash.
 */
const CURRENCY_SYMBOLS: [string, string][] = [
  ["R$", "BRL"],
  ["C$", "CAD"],
  ["A$", "AUD"],
  ["NZ$", "NZD"],
  ["CHF", "CHF"],
  ["kr", "SEK"],
  ["$", "USD"],
  ["£", "GBP"],
  ["€", "EUR"],
  ["¥", "JPY"],
  ["₹", "INR"],
  ["₺", "TRY"],
  ["zł", "PLN"],
];

const currencyFrom = (display: string | undefined) => {
  if (!display) return null;
  const trimmed = display.trim();
  const match = CURRENCY_SYMBOLS.find(([symbol]) => trimmed.startsWith(symbol));
  return match?.[1] ?? null;
};

/**
 * The seller's own domain, which is the identity we actually store — a display
 * name like "Amazon.com - Seller" is not something the roster can dedupe on.
 *
 * `link` is a direct merchant URL with Google tracking parameters appended, so
 * its hostname is normally the answer. When Google hands back one of its own
 * redirector URLs instead, the real destination is in a query parameter; and
 * when there is no usable link at all, `logo` is a favicon service URL carrying
 * the domain in its own `url` parameter.
 */
const REDIRECT_PARAMETERS = ["url", "adurl", "q", "dest"];

const hostFrom = (value: string | undefined): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (!host.endsWith("google.com") && !host.endsWith("gstatic.com"))
      return host || null;

    const nested = REDIRECT_PARAMETERS.map((parameter) =>
      parsed.searchParams.get(parameter),
    ).find(Boolean);

    return nested ? hostFrom(nested) : null;
  } catch {
    return null;
  }
};

export type Offer = {
  /** Seller display name as Google renders it. */
  seller: string;
  /** Registrable host, the key the roster dedupes on. Null when unresolvable. */
  sellerDomain: string | null;
  /** The seller's own listing title, which differs from the catalog title. */
  title: string | null;
  price: number | null;
  currency: string | null;
  shipping: number | null;
  /** Price + shipping + estimated tax, when Google computed one. */
  total: number | null;
  url: string | null;
  /** Always a remote URL. Hotlinked, never copied to our storage. */
  image: string | null;
  rating: number | null;
  reviews: number | null;
  /** 1-based order Google listed the seller in. */
  position: number;
};

export type OfferLookup = {
  query: string;
  /** The catalog product Google matched the query to, for the relevance guard. */
  matched: {
    title: string | null;
    brand: string | null;
    price: number | null;
    token: string;
  } | null;
  offers: Offer[];
  /** Billable searches consumed. Two for a full chain, one for a cache-warm token. */
  credits: number;
};

const toOffer = (
  store: ImmersiveStore,
  index: number,
  fallbackImage: string | null,
): Offer => ({
  seller: store.name?.trim() || "Unknown seller",
  sellerDomain: hostFrom(store.link) ?? hostFrom(store.logo),
  title: store.title?.trim() || null,
  price: numeric(store.extracted_price),
  currency: currencyFrom(store.price),
  shipping: numeric(store.shipping_extracted, store.extracted_shipping),
  total: numeric(store.extracted_total),
  url: store.link ?? null,
  image: fallbackImage,
  rating: numeric(store.rating),
  reviews: numeric(store.reviews),
  position: index + 1,
});

// ---------------------------------------------------------------------------
// The two legs
// ---------------------------------------------------------------------------

export type LookupOptions = {
  /** Two-letter country, lowercase. Defaults to "us". */
  country?: string;
  /** Two-letter language, lowercase. Defaults to "en". */
  language?: string;
  /**
   * Ask for up to 13 sellers instead of the default 3-5. Free — it does not
   * cost an extra search — so it is on by default.
   */
  moreStores?: boolean;
};

const locale = ({
  country,
  language,
}: LookupOptions): Result<{ gl: string; hl: string }, RequestError> => {
  const gl = country?.toLowerCase() ?? "us";
  const hl = language?.toLowerCase() ?? "en";

  if (!LOCALE_PATTERN.test(gl))
    return {
      success: false,
      error: new RequestError(`Unsupported country: ${country}`),
    };
  if (!LOCALE_PATTERN.test(hl))
    return {
      success: false,
      error: new RequestError(`Unsupported language: ${language}`),
    };

  return { success: true, data: { gl, hl } };
};

/**
 * Leg one. Exists only to mint the `page_token` leg two requires — the offer
 * endpoint accepts no query, no product id and no GTIN, so there is no way to
 * skip this. `google_shopping_light` is used rather than `google_shopping`
 * because it emits the same token roughly twice as fast (~1.4s vs ~2.9s) and
 * omits blocks we do not read.
 *
 * The results are not wasted: each already carries a competing product with a
 * seller name and price, which is what makes a token-only failure degrade to a
 * usable-but-thinner answer rather than nothing.
 */
export const searchShopping = async (
  query: string,
  options: LookupOptions = {},
): Promise<Result<ShoppingResult[], Error>> => {
  const config = configuration();
  if (!config) return { success: false, error: notConfiguredError() };

  const resolved = locale(options);
  if (!resolved.success) return resolved;

  const response = await api<ShoppingResponse>({
    engine: "google_shopping_light",
    q: query,
    gl: resolved.data.gl,
    hl: resolved.data.hl,
    // Named so `redactArguments` strips it from Sentry breadcrumbs.
    api_key: config.apiKey,
  });

  if (!response.success) return response;

  const failure = rejected(response.data);
  if (failure) return { success: false, error: failure };

  return { success: true, data: response.data.shopping_results ?? [] };
};

/**
 * Leg two. Given a token from leg one, returns the sellers carrying that
 * catalog product with each one's price, shipping and estimated tax.
 *
 * Note what is absent and cannot be recovered here: GTIN, MPN, an ISO currency
 * code, and structured condition/availability. Anything downstream that wants
 * to match on a barcode has to get it from our own catalog, not from this.
 */
export const immersiveProduct = async (
  pageToken: string,
  options: LookupOptions = {},
): Promise<Result<ImmersiveResponse["product_results"], Error>> => {
  const config = configuration();
  if (!config) return { success: false, error: notConfiguredError() };

  const response = await api<ImmersiveResponse>({
    engine: "google_immersive_product",
    page_token: pageToken,
    ...(options.moreStores === false ? {} : { more_stores: "true" }),
    api_key: config.apiKey,
  });

  if (!response.success) return response;

  const failure = rejected(response.data);
  if (failure) return { success: false, error: failure };

  return { success: true, data: response.data.product_results };
};

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * The seam every caller programs against, so a second adapter can be added
 * without touching orchestration.
 *
 * The reason it exists: SerpApi's ~2.7s chain is the only one fast enough for
 * interactive onboarding, but paying its rate for a weekly batch refresh is
 * indefensible when DataForSEO does the same job for a fraction and its queue
 * latency is irrelevant to a cron. Expect two adapters behind this type.
 */
export type OfferProvider = {
  readonly name: string;
  configured: () => boolean;
  lookup: (
    query: string,
    options?: LookupOptions,
  ) => Promise<Result<OfferLookup, Error>>;
};

/**
 * Picks which catalog product the query resolved to.
 *
 * Deliberately the first result rather than a cleverer choice: Google has
 * already ranked them for this query, and any re-ranking we do here is a guess
 * layered on a guess. Whether the pick is actually the same product is the
 * relevance guard's job, and it runs against the merchant's own product where
 * the comparison is meaningful.
 */
const firstTokenized = (results: ShoppingResult[]) =>
  results.find((result) => Boolean(result.immersive_product_page_token)) ??
  null;

export const serpApi: OfferProvider = {
  name: "SerpApi",

  configured: () => configuration() !== null,

  lookup: async (query, options = {}) => {
    const trimmed = query.trim();
    if (!trimmed)
      return { success: false, error: new RequestError("Empty lookup query") };

    const search = await searchShopping(trimmed, options);
    if (!search.success) return search;

    const candidate = firstTokenized(search.data);

    // A search that returned products but no token is the common shape for a
    // long-tail or private-label item: Google found listings but no catalog
    // cluster to expand. Reported as an empty-but-successful lookup, because
    // "nobody else sells this" is an answer, not a failure.
    if (!candidate?.immersive_product_page_token)
      return {
        success: true,
        data: { query: trimmed, matched: null, offers: [], credits: 1 },
      };

    const token = candidate.immersive_product_page_token;
    const product = await immersiveProduct(token, options);
    if (!product.success) return product;

    const image = candidate.thumbnail ?? null;

    return {
      success: true,
      data: {
        query: trimmed,
        matched: {
          title: product.data?.title ?? candidate.title ?? null,
          brand: product.data?.brand ?? null,
          price: numeric(candidate.extracted_price),
          token,
        },
        offers: (product.data?.stores ?? []).map((store, index) =>
          toOffer(store, index, image),
        ),
        credits: 2,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Category peers (light results only — no immersive expansion)
// ---------------------------------------------------------------------------

/** How many distinct shopping hits to keep as category rivals. */
const CATEGORY_PEER_LIMIT = 5;

/**
 * Turn a Shopping `source` label ("Amazon.com", "Target") into a registrable
 * host when the string already looks like one; otherwise null so the caller
 * can mint a stable synthetic key.
 */
const hostFromSource = (source: string | undefined): string | null => {
  if (!source) return null;
  const trimmed = source.trim().toLowerCase();
  if (!trimmed) return null;

  // "Amazon.com - Seller" / "Walmart.com"
  const dotted = trimmed.match(
    /\b([a-z0-9][a-z0-9-]*\.[a-z]{2,}(?:\.[a-z]{2})?)\b/,
  );
  if (dotted?.[1]) return dotted[1].replace(/^www\./, "");

  return null;
};

/**
 * Identity key for a category peer. Same-SKU offers dedupe on seller domain
 * alone; category peers are distinct *products*, so two Amazon hits must not
 * collapse under one `sellerDomain`. The host (when known) stays as a prefix
 * so favicon helpers can still recover a real domain.
 */
export const categoryPeerDomain = (
  source: string | undefined,
  title: string,
): string => {
  const host = hostFromSource(source) ?? "peer";
  const titleKey = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .slice(0, 6)
    .join("-");
  return `${host}#${titleKey || "item"}`;
};

/** Host portion of a {@link categoryPeerDomain} key, for favicons. */
export const categoryPeerHost = (sellerDomain: string) =>
  sellerDomain.split("#")[0] || sellerDomain;

/**
 * Category-peer lookup: one `google_shopping_light` call, no immersive
 * expansion. Each priced result becomes its own rival product — the shape
 * private-label merchants need when nobody else sells their exact SKU.
 *
 * Returned as {@link OfferLookup} so the offer cache and budget layers stay
 * shared with the same-SKU path.
 */
export const searchCategoryPeers = async (
  query: string,
  options: LookupOptions = {},
): Promise<Result<OfferLookup, Error>> => {
  const trimmed = query.trim();
  if (!trimmed)
    return { success: false, error: new RequestError("Empty lookup query") };

  const search = await searchShopping(trimmed, options);
  if (!search.success) return search;

  const seen = new Set<string>();
  const offers: Offer[] = [];

  for (const result of search.data) {
    const title = result.title?.trim() || null;
    const price = numeric(result.extracted_price);
    if (!title || price === null) continue;

    const domain = categoryPeerDomain(result.source, title);
    if (seen.has(domain)) continue;
    seen.add(domain);

    offers.push({
      seller: result.source?.trim() || "Unknown seller",
      sellerDomain: domain,
      title,
      price,
      currency: currencyFrom(result.price),
      shipping: null,
      total: null,
      url: null,
      image: result.thumbnail ?? null,
      rating: numeric(result.rating),
      reviews: numeric(result.reviews),
      position: offers.length + 1,
    });

    if (offers.length >= CATEGORY_PEER_LIMIT) break;
  }

  return {
    success: true,
    data: {
      query: trimmed,
      matched: null,
      offers,
      credits: 1,
    },
  };
};
