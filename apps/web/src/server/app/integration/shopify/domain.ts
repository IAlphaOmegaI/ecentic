import { resultify } from "@zenncore/utils";
import * as HTTP from "../../../utils/http";
import { resolveOrigin } from "../../../utils/ssrf";

/**
 * Shopify's admin OAuth host is always a single label on `myshopify.com`.
 * Custom storefronts (`brand.com`) and the current bug's output
 * (`brand.com.myshopify.com`) must never be treated as one.
 */
const ADMIN_HOST = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const HANDLE = /^[a-z0-9][a-z0-9-]*$/;
const META_TIMEOUT_MS = 5000;

export type PublicMeta = {
  id: number;
  name: string | null;
  currency: string | null;
  myshopify_domain: string;
  published_products_count: number | null;
};

export type ShopInput =
  | { kind: "admin"; host: string }
  | { kind: "storefront"; origin: string };

export const isMyshopifyAdminHost = (hostname: string) =>
  ADMIN_HOST.test(hostname);

const json = <T>(body: string) => {
  const parsed = resultify(() => JSON.parse(body) as T);
  return parsed.success ? parsed.data : null;
};

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;

const count = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;

const hostnameOf = (input: string): string | null => {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  const parsed = resultify(() => new URL(candidate));
  const host = parsed.success
    ? parsed.data.hostname.replace(/\.$/, "")
    : (trimmed.split("/")[0] ?? trimmed);

  const cleaned = host.replace(/[^a-z0-9.-]/g, "");
  return cleaned || null;
};

/**
 * Classify what the merchant typed without hitting the network.
 *
 * - `mystore` / `mystore.myshopify.com` → admin host, ready for OAuth.
 * - `brand.com` → storefront origin; the myshopify admin host has to be
 *   read from `/meta.json` (it is not the custom domain with a suffix).
 * - `brand.com.myshopify.com` and other malformed myshopify hosts → `null`.
 */
export const parseShopInput = (input: string): ShopInput | null => {
  const hostname = hostnameOf(input);
  if (!hostname) return null;

  switch (true) {
    case isMyshopifyAdminHost(hostname):
      return { kind: "admin", host: hostname };
    case hostname.endsWith(".myshopify.com"):
      return null;
    case !hostname.includes("."):
      return HANDLE.test(hostname)
        ? { kind: "admin", host: `${hostname}.myshopify.com` }
        : null;
    default: {
      const origin = resolveOrigin(input);
      return origin ? { kind: "storefront", origin: origin.origin } : null;
    }
  }
};

/**
 * `/meta.json` is every Shopify storefront's public identity card. Its `id` is
 * the same shop id the Admin API returns, which is what lets a public import
 * and a later app install of the same store recognise each other. Any site can
 * serve a `/meta.json`; only Shopify's names a myshopify admin host. Every
 * field is the storefront's say-so, so each is type-checked before it is trusted.
 */
export const fetchPublicMeta = async (
  domain: string,
): Promise<PublicMeta | null> => {
  const page = await HTTP.page(`${domain}/meta.json`, {
    timeout: META_TIMEOUT_MS,
    limit: 256 * 1024,
    accept: "application/json",
  });
  if (!page.success || page.data.status !== 200) return null;

  const meta = json<Partial<Record<keyof PublicMeta, unknown>>>(page.data.body);
  if (!meta || typeof meta.id !== "number" || !Number.isSafeInteger(meta.id))
    return null;

  const myshopify = text(meta.myshopify_domain)?.toLowerCase();
  if (!myshopify || !isMyshopifyAdminHost(myshopify)) return null;

  return {
    id: meta.id,
    name: text(meta.name),
    currency: text(meta.currency),
    myshopify_domain: myshopify,
    published_products_count: count(meta.published_products_count),
  };
};

/**
 * The `*.myshopify.com` host Shopify OAuth authorize and token exchange
 * require. A custom storefront domain is resolved through `/meta.json` rather
 * than by appending `.myshopify.com` — `brand.com` is `whatever.myshopify.com`,
 * not `brand.com.myshopify.com` or `brand.myshopify.com`.
 */
export const resolveAdminHost = async (
  input: string,
): Promise<string | null> => {
  const parsed = parseShopInput(input);
  if (!parsed) return null;
  if (parsed.kind === "admin") return parsed.host;

  const meta = await fetchPublicMeta(parsed.origin);
  return meta?.myshopify_domain ?? null;
};
