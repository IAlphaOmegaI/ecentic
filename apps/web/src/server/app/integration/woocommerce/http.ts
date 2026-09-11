import { createHmac, randomBytes } from "node:crypto";
import * as HTTP from "../../../utils/http";

// RFC 3986 percent-encoding, as OAuth 1.0a requires — encodeURIComponent leaves
// !*'() unescaped, so encode those too.
const percentEncode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!*'()]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export const basicCredentials = (key: string, secret: string) =>
  `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;

export const normalizeStoreUrl = (url: string) => {
  const trimmed = url.replace(/\/+$/, "");
  // Preserve an explicit scheme — http is needed for local dev stores like
  // http://ecentic-test.local — and default bare domains to https.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const withQueryAuth = (url: string, key: string, secret: string) => {
  const target = new URL(url);
  target.searchParams.set("consumer_key", key);
  target.searchParams.set("consumer_secret", secret);
  return target.toString();
};

/**
 * Signs a request with OAuth 1.0a one-legged auth and returns the URL with the
 * `oauth_*` parameters (including the signature) appended to the query string.
 * This is WooCommerce's required scheme over plain HTTP — it ignores Basic /
 * key-secret auth on non-SSL requests.
 *
 * Mind the WooCommerce-specific quirks the signature depends on: wc/v3 signs
 * with HMAC-SHA256, the HMAC key is `consumerSecret&` (secret + `&` + an empty
 * token secret, per OAuth 1.0a), `oauth_version` is omitted, and the base URL
 * is scheme + host + path with the query string excluded.
 */
export const withOAuthSignature = (
  url: string,
  method: string,
  consumerKey: string,
  consumerSecret: string,
) => {
  const target = new URL(url);

  const oauth: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
  };

  // Sign over the oauth params plus any existing query params (e.g. per_page).
  const params: Record<string, string> = { ...oauth };
  for (const [key, value] of target.searchParams) params[key] = value;

  const parameterString = Object.entries(params)
    .map(([key, value]) => [percentEncode(key), percentEncode(value)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(`${target.origin}${target.pathname}`),
    percentEncode(parameterString),
  ].join("&");

  const signature = createHmac("sha256", `${consumerSecret}&`)
    .update(baseString)
    .digest("base64");

  for (const [key, value] of Object.entries(oauth))
    target.searchParams.set(key, value);
  target.searchParams.set("oauth_signature", signature);

  return target.toString();
};

/**
 * Performs an authenticated WooCommerce REST request.
 *
 * Over HTTPS, sends the consumer key/secret via HTTP Basic Auth — WooCommerce's
 * primary documented method. Many hosts (Apache + PHP-CGI/FastCGI on shared
 * hosting) strip the `Authorization` header, which surfaces as a `401 "Consumer
 * key is missing"` even for valid credentials, so on a 401 this retries once
 * with the credentials as query-string parameters.
 *
 * Over plain HTTP, WooCommerce ignores key/secret auth altogether and requires
 * OAuth 1.0a one-legged signing, so those requests are signed instead. This is
 * mainly for local dev stores (e.g. http://ecentic-test.local).
 */
export const authorizedRequest = async (
  url: string,
  consumerKey: string,
  consumerSecret: string,
  options: RequestInit = {},
) => {
  if (new URL(url).protocol === "http:") {
    const signed = withOAuthSignature(
      url,
      options.method ?? "GET",
      consumerKey,
      consumerSecret,
    );
    return HTTP.request(signed, options);
  }

  const primary = await HTTP.request(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: basicCredentials(consumerKey, consumerSecret),
    },
  });

  if (!primary.success || primary.data.status !== 401) return primary;

  return HTTP.request(withQueryAuth(url, consumerKey, consumerSecret), options);
};

// ---------------------------------------------------------------------------
// Store API — the public catalog every WooCommerce store serves without keys
// (enabled by default since WooCommerce 6). Read-only: it backs the
// `woocommerce-public` import, never a write.
// ---------------------------------------------------------------------------

/** The Store API product fields this app reads; the rest rides in `rawData`. */
export type StoreApiProduct = {
  id: number;
  name: string;
  permalink: string;
  sku: string;
  description: string;
  short_description: string;
  is_in_stock?: boolean;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_code: string;
    currency_minor_unit: number;
  };
  images: {
    id?: number;
    src: string;
    alt?: string;
    name?: string;
    thumbnail?: string;
    srcset?: string;
    sizes?: string;
  }[];
  categories?: { name: string }[];
  brands?: { name: string }[];
  /** Presentation-only payloads — dropped before a product is stored. */
  price_html?: string;
  add_to_cart?: unknown;
  extensions?: unknown;
};

const REST_LINK_HEADER = /<([^>]+)>\s*;\s*rel="https:\/\/api\.w\.org\/"/i;
const REST_LINK_TAGS = [
  /<link[^>]+rel=["']https:\/\/api\.w\.org\/["'][^>]*href=["']([^"']+)["']/i,
  /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']https:\/\/api\.w\.org\/["']/i,
];

/**
 * The WordPress REST root a site advertises about itself — the `Link` header
 * or the `<link rel="https://api.w.org/">` tag. It is `https://acme.com/wp-json/`
 * on most stores, but `https://acme.com/shop/wp-json/` for an install in a
 * subfolder and `https://acme.com/?rest_route=/` without pretty permalinks —
 * guessing `/wp-json/` breaks both.
 */
export const advertisedRestRoot = (page: HTTP.Page) => {
  const header = page.headers.get("link")?.match(REST_LINK_HEADER)?.[1];
  const tag = REST_LINK_TAGS.map(
    (pattern) => page.body.match(pattern)?.[1],
  ).find(Boolean);
  const href = header ?? tag;
  if (!href) return null;

  const parsed = (() => {
    try {
      return new URL(href.replaceAll("&amp;", "&"), page.url);
    } catch {
      return null;
    }
  })();
  return parsed?.toString() ?? null;
};

export const isWordPressPage = (page: HTTP.Page) =>
  advertisedRestRoot(page) !== null || page.body.includes("/wp-content/");

/**
 * WooCommerce's own footprint — its plugin assets, its body/wrapper classes,
 * its block markup or Store API header. A page that merely mentions the word
 * (a blog post about WooCommerce) is not a store.
 */
export const isWooCommercePage = (page: HTTP.Page) =>
  page.headers.has("x-wc-store-api-nonce") ||
  page.body.includes("/wp-content/plugins/woocommerce/") ||
  /class=["'][^"']*\bwoocommerce(?:-page|-js|-no-js)?\b/i.test(page.body) ||
  /\bwc-block-/.test(page.body);

/**
 * A WordPress REST URL from an advertised root, for both the path form
 * (`/wp-json/`) and the query form (`?rest_route=/`).
 */
export const restUrl = (
  root: string,
  route: string,
  parameters: Record<string, string> = {},
) => {
  const url = new URL(root);
  const current = url.searchParams.get("rest_route");

  if (current === null)
    url.pathname = `${url.pathname.replace(/\/$/, "")}/${route}`;
  else
    url.searchParams.set(
      "rest_route",
      `${current.replace(/\/$/, "")}/${route}`,
    );

  for (const [key, value] of Object.entries(parameters))
    url.searchParams.set(key, value);

  return url.toString();
};

/**
 * Store API prices are integer strings in the currency's minor unit (`"1999"`
 * with `currency_minor_unit: 2`). Converted by string, never through a float,
 * and with the unit the store reports — a store may configure 0 decimals.
 */
export const toMajor = (minor: string | undefined, digits: number) => {
  if (!minor || !/^\d+$/.test(minor)) return null;
  if (digits <= 0) return minor.replace(/^0+(?=\d)/, "");

  const padded = minor.padStart(digits + 1, "0");
  const whole = padded.slice(0, -digits).replace(/^0+(?=\d)/, "");
  return `${whole}.${padded.slice(-digits)}`;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * The Store API runs names through `prepare_html_response`, so a title arrives
 * as `Tee &#8211; Black &amp; White`. Stored titles are plain text everywhere
 * else (the v3 importer gets them raw), so decode before they reach a listing.
 */
export const decodeEntities = (text: string) =>
  text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    const point = (() => {
      switch (true) {
        case code.startsWith("#x") || code.startsWith("#X"):
          return Number.parseInt(code.slice(2), 16);
        case code.startsWith("#"):
          return Number.parseInt(code.slice(1), 10);
        default:
          return null;
      }
    })();

    if (point === null) return NAMED_ENTITIES[code.toLowerCase()] ?? entity;

    // Out of range, a NUL (Postgres rejects it) or a lone surrogate would throw
    // here or poison the row — one bad title must not fail the whole import.
    const decodable =
      point > 0 && point <= 0x10ffff && (point < 0xd800 || point > 0xdfff);

    return decodable ? String.fromCodePoint(point) : entity;
  });
