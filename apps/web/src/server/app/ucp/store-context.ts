/**
 * Resolves the tenant for a hosted UCP request: the store, its credentials,
 * and derived storefront URLs. Every agent-facing UCP route is scoped by the
 * Ecentic store id in the path.
 */

import { db } from "@/server/database";

export type UcpStoreContext = {
  store: {
    id: string;
    userId: string;
    platform: string;
    name: string;
    domain: string;
    status: string;
  };
  credentials: { consumerKey: string; consumerSecret: string } | null;
  bridgeSecret: string | null;
};

/**
 * Loads the store + credentials for a UCP request. Returns null when the
 * store doesn't exist or isn't a WooCommerce store — the router serves 404
 * without acknowledging store existence details.
 */
export const resolveStoreContext = async (
  storeId: string,
): Promise<UcpStoreContext | null> => {
  if (!/^[a-zA-Z0-9_-]+$/.test(storeId)) return null;

  const store = await db.query.store.findFirst({
    where: { id: storeId },
  });
  if (!store || store.platform !== "woocommerce") return null;

  const account = await db.query.store_account.findFirst({
    where: { storeId: store.id },
  });

  const credentials =
    account?.consumerKey && account?.consumerSecret
      ? {
          consumerKey: account.consumerKey,
          consumerSecret: account.consumerSecret,
        }
      : null;

  return {
    store: {
      id: store.id,
      userId: store.userId,
      platform: store.platform,
      name: store.name,
      domain: store.domain,
      status: store.status,
    },
    credentials,
    bridgeSecret: account?.bridgeSecret ?? null,
  };
};

/** Normalized `https://…` storefront origin for the store (no trailing slash). */
export const storefrontOrigin = (domain: string): string => {
  const trimmed = domain.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

/**
 * Stateless WooCommerce checkout link that prefills the buyer's cart in the
 * browser — the hand-off target when an agent escalates to the storefront.
 * `products` pairs WooCommerce product ids with quantities.
 */
export const checkoutLinkUrl = (
  domain: string,
  products: { externalId: string; quantity: number }[],
  couponCode?: string,
): string => {
  const origin = storefrontOrigin(domain);
  if (products.length === 0) return `${origin}/`;
  const pairs = products
    .map((product) => `${product.externalId}:${product.quantity}`)
    .join(",");
  const coupon = couponCode ? `&coupon=${encodeURIComponent(couponCode)}` : "";
  return `${origin}/checkout-link/?products=${encodeURIComponent(pairs)}${coupon}`;
};

/** Public base URL of this deployment. */
export const appHost = (): string =>
  process.env.APP_HOST ?? "https://ecentic.ai";

/** REST base agents call for a store — the discovery profile `endpoint`. */
export const ucpEndpointUrl = (storeId: string): string =>
  `${appHost()}/api/ucp/stores/${storeId}`;

/** Hosted discovery profile URL for a store (proxied by the store plugin). */
export const ucpProfileUrl = (storeId: string): string =>
  `${ucpEndpointUrl(storeId)}/profile`;
