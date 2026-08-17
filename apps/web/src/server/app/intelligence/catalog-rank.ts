"use server";

/**
 * Shopify Global Catalog MCP client. The Global Catalog is the retrieval index
 * agent surfaces (ChatGPT, Perplexity, Copilot) query for Shopify products, so
 * ranking a store's product here — with real buyer signals — is a direct,
 * deterministic measurement of agent-shelf position, unlike the LLM role-play
 * scans. Re-running the same query after a listing change gives a causal
 * before/after read.
 *
 * Requires credentials from the Shopify Dev Dashboard (Catalogs → "Get an
 * API key" — these are catalog keys, not the app's SHOPIFY_API_KEY/SECRET):
 *   SHOPIFY_CATALOG_CLIENT_ID / SHOPIFY_CATALOG_CLIENT_SECRET
 * Optional overrides: SHOPIFY_CATALOG_TOKEN_URL, SHOPIFY_CATALOG_MCP_URL.
 * Plus a public UCP agent profile, served by this app at /ucp/agent-profile.
 */

import { withContext } from "../../utils/context";
import { withSubscription } from "../../utils/entitlement";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import * as HTTP from "../../utils/http";
import * as Store from "../store";

const DEFAULT_MCP_URL = "https://catalog.shopify.com/api/ucp/mcp";
/** Global token endpoint for Dev Dashboard catalog credentials (fixed URL). */
const DEFAULT_TOKEN_URL = "https://api.shopify.com/auth/access_token";

const configuration = () => {
  const clientId = process.env.SHOPIFY_CATALOG_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CATALOG_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // The catalog fetches the agent profile at request time and requires HTTPS,
  // so a localhost APP_HOST (dev) falls back to the deployed profile.
  const origin = (
    process.env.APP_HOST ??
    process.env.BETTER_AUTH_BASE_URL ??
    ""
  ).replace(/\/+$/, "");
  const derivedProfileUrl = origin.startsWith("https://")
    ? `${origin}/ucp/agent-profile`
    : "https://ecentic.ai/ucp/agent-profile";

  return {
    clientId,
    clientSecret,
    tokenUrl: process.env.SHOPIFY_CATALOG_TOKEN_URL ?? DEFAULT_TOKEN_URL,
    mcpUrl: process.env.SHOPIFY_CATALOG_MCP_URL ?? DEFAULT_MCP_URL,
    agentProfileUrl: process.env.UCP_AGENT_PROFILE_URL ?? derivedProfileUrl,
  };
};

export const isCatalogConfigured = async () => configuration() !== null;

const tokenCache: { value: string | null; expiresAt: number } = {
  value: null,
  expiresAt: 0,
};

/**
 * The token response carries only `access_token` (a JWT, valid 60 minutes);
 * expiry comes from the JWT's `exp` claim, falling back to 50 minutes.
 */
const tokenExpiry = (token: string): number => {
  const payload = token.split(".")[1];
  if (!payload) return Date.now() + 50 * 60 * 1000;
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: number };
    if (typeof decoded.exp === "number") return decoded.exp * 1000;
  } catch {
    // Not a decodable JWT — use the documented 60-minute lifetime, shortened.
  }
  return Date.now() + 50 * 60 * 1000;
};

const fetchToken = async (
  config: NonNullable<ReturnType<typeof configuration>>,
) => {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt - 60_000)
    return { success: true as const, data: tokenCache.value };

  const response = await HTTP.request(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!response.success) return response;

  const parsed = await HTTP.parse<{ access_token?: string }>(response);
  if (!parsed.success) return parsed;

  if (!parsed.data.access_token)
    return {
      success: false as const,
      error: new RequestError("Catalog token endpoint returned no token"),
    };

  tokenCache.value = parsed.data.access_token;
  tokenCache.expiresAt = tokenExpiry(parsed.data.access_token);

  return { success: true as const, data: parsed.data.access_token };
};

type CatalogSeller = {
  name?: string;
  domain?: string;
  url?: string;
};

/**
 * Observed offer-view shape (verified against the live endpoint): variants
 * carry the retailer's product `url` — its hostname is the seller identity —
 * and money amounts are in minor units (15995 = $159.95).
 */
type CatalogVariant = {
  id?: string;
  url?: string;
  price?: { amount?: number; currency?: string };
  seller?: CatalogSeller;
  checkout_url?: string;
};

type CatalogProduct = {
  id?: string;
  title?: string;
  url?: string;
  price_range?: {
    min?: { amount?: string | number; currency?: string };
    max?: { amount?: string | number; currency?: string };
  };
  rating?: { value?: number; count?: number };
  variants?: CatalogVariant[];
};

const searchCatalog = withContext(
  async (
    _context,
    input: {
      query: string;
      country?: string;
      language?: string;
      intent?: string;
      limit?: number;
    },
  ) => {
    const config = configuration();
    if (!config)
      return {
        success: false as const,
        error: new RequestError(
          "Global Catalog is not configured. Set SHOPIFY_CATALOG_CLIENT_ID and SHOPIFY_CATALOG_CLIENT_SECRET (Dev Dashboard → Catalogs → Get an API key).",
        ),
      };

    const token = await fetchToken(config);
    if (!token.success) return token;

    const response = await HTTP.request(
      config.mcpUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.data}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          id: 1,
          params: {
            name: "search_catalog",
            arguments: {
              meta: { "ucp-agent": { profile: config.agentProfileUrl } },
              catalog: {
                query: input.query,
                // Offer view is what populates variant URLs (seller identity)
                // — without it results carry no retailer attribution at all.
                view: "offer",
                context: {
                  ...(input.country ? { address_country: input.country } : {}),
                  ...(input.language ? { language: input.language } : {}),
                  ...(input.intent ? { intent: input.intent } : {}),
                },
                pagination: { limit: Math.min(input.limit ?? 25, 50) },
              },
            },
          },
        }),
      },
      { timeout: 30000 },
    );
    if (!response.success) return response;

    const parsed = await HTTP.parse<{
      result?: {
        structuredContent?: { products?: CatalogProduct[] };
        isError?: boolean;
        content?: { text?: string }[];
      };
      error?: { message?: string };
    }>(response);
    if (!parsed.success) return parsed;

    if (parsed.data.error)
      return {
        success: false as const,
        error: new RequestError(
          parsed.data.error.message ?? "Catalog MCP error",
        ),
      };

    const products = parsed.data.result?.structuredContent?.products;
    if (!products)
      return {
        success: false as const,
        error: new RequestError(
          parsed.data.result?.content?.[0]?.text ??
            "Catalog returned no product list",
        ),
      };

    return { success: true as const, data: products };
  },
  "CatalogRank.searchCatalog",
);

export type RankedOffer = {
  position: number;
  title: string;
  url: string | null;
  seller: string | null;
  price: string | null;
  rating: string | null;
  mine: boolean;
};

export type RankMeasurement = {
  query: string;
  rank: number | null;
  totalReturned: number;
  offers: RankedOffer[];
};

/**
 * Ranks the store against the live Global Catalog for a buyer query. `rank` is
 * the 1-based position of the store's first product in the result list, null
 * when the store doesn't appear at all — which is itself the finding.
 */
export const measureCatalogRank = withSubscription(
  async (
    context,
    input: {
      store: string;
      query: string;
      country?: string;
      language?: string;
      intent?: string;
    },
  ) => {
    const store = await Store.get(Environment.SERVER, input.store);
    if (!store.success) return store;
    if (!store.data)
      return { success: false as const, error: new Error("Store not found") };
    if (store.data.userId !== context.session.user.id)
      return { success: false as const, error: new Error("Not authorized") };

    const normalizeHost = (host: string) =>
      host
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .replace(/^www\./, "")
        .toLowerCase();

    const hosts = new Set(
      [store.data.domain, ...(store.data.storefrontHosts ?? [])].map(
        normalizeHost,
      ),
    );

    const searched = await searchCatalog(Environment.SERVER, {
      query: input.query,
      country: input.country,
      language: input.language,
      intent: input.intent,
    });
    if (!searched.success) return searched;

    const hostOf = (url: string | undefined | null) => {
      if (!url) return null;
      try {
        return normalizeHost(new URL(url).hostname);
      } catch {
        return null;
      }
    };

    const formatMoney = (
      amount: string | number | undefined,
      currency: string | undefined,
    ) => {
      if (amount === undefined || amount === null) return null;
      // Live responses carry minor units as numbers (15995 = $159.95);
      // string amounts are passed through as-is.
      const display =
        typeof amount === "number" ? (amount / 100).toFixed(2) : amount;
      return `${display} ${currency ?? ""}`.trim();
    };

    const offers: RankedOffer[] = searched.data.map((product, index) => {
      // In the offer view the retailer identity lives in each variant's URL
      // hostname; a `seller` object is only present for some catalogs.
      const variantUrl = product.variants?.find((variant) => variant.url)?.url;
      const seller = product.variants?.find(
        (variant) => variant.seller,
      )?.seller;

      const candidateHosts = [
        hostOf(product.url),
        hostOf(variantUrl),
        hostOf(seller?.url),
        seller?.domain ? normalizeHost(seller.domain) : null,
        ...(product.variants ?? []).map((variant) => hostOf(variant.url)),
      ].filter((host): host is string => Boolean(host));

      const mine = candidateHosts.some((host) => hosts.has(host));

      const price =
        formatMoney(
          product.price_range?.min?.amount,
          product.price_range?.min?.currency,
        ) ??
        formatMoney(
          product.variants?.[0]?.price?.amount,
          product.variants?.[0]?.price?.currency,
        );

      return {
        position: index + 1,
        title: product.title ?? "(untitled)",
        url: product.url ?? variantUrl ?? null,
        seller: seller?.name ?? seller?.domain ?? hostOf(variantUrl),
        price,
        rating: product.rating?.value
          ? `${product.rating.value} (${product.rating.count ?? 0})`
          : null,
        mine,
      };
    });

    const first = offers.find((offer) => offer.mine);

    context.span.addBreadcrumb({
      category: "catalog.rank",
      data: {
        "store.id": input.store,
        query: input.query,
        rank: first?.position ?? null,
        "results.total": offers.length,
      },
    });

    return {
      success: true as const,
      data: {
        query: input.query,
        rank: first?.position ?? null,
        totalReturned: offers.length,
        offers,
      } satisfies RankMeasurement,
    };
  },
  "CatalogRank.measureCatalogRank",
);
