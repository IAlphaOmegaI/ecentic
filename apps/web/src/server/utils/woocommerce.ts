import { createHmac, randomBytes } from "node:crypto";
import * as HTTP from "./http";

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
