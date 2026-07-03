/**
 * Store facts fetched over the bridge (`GET /wc-ucp/v1/store`) and cached in
 * redis: the configured legal pages (the mandatory checkout `links`), the
 * real storefront page URLs used as buyer hand-off targets, and presentment
 * units. A bridge outage degrades gracefully — callers fall back to derived
 * defaults.
 */

import { redis } from "@/server/utils/durable";
import * as Bridge from "./bridge";
import type { StorefrontInfo, UcpStoreContext } from "./store-context";

const STORE_INFO_CACHE_TTL = 3600;

const cacheKey = (storeId: string) => `ucp:wc:store:${storeId}`;

export const loadStorefrontInfo = async (
  context: UcpStoreContext,
): Promise<StorefrontInfo | null> => {
  if (!context.credentials) return null;

  const cached = await (async () => {
    try {
      return await redis.get<StorefrontInfo>(cacheKey(context.store.id));
    } catch {
      return null;
    }
  })();
  if (cached) return cached;

  const fetched = await Bridge.getStoreInfo({
    domain: context.store.domain,
    consumerKey: context.credentials.consumerKey,
    consumerSecret: context.credentials.consumerSecret,
  });
  if (!fetched.success) return null;

  const info: StorefrontInfo = {
    links: (fetched.data.links ?? []).filter((link) => link?.type && link.url),
    urls: fetched.data.urls,
  };

  try {
    await redis.set(cacheKey(context.store.id), info, {
      ex: STORE_INFO_CACHE_TTL,
    });
  } catch {
    // Best-effort cache.
  }

  return info;
};
