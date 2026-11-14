import { and, eq } from "drizzle-orm";
import * as GoogleMerchantAccount from "../app/google-merchant-account";
import * as GoogleMerchantOffer from "../app/google-merchant-offer";
import type * as Product from "../app/product";
import type * as Store from "../app/store";
import { schema } from "../database";
import { Environment } from "./environment";
import { GOOGLE_MERCHANT_PLATFORMS } from "./google-merchant-platform";

export type ProductChannels = {
  source: {
    platform: string;
    name: string;
    domain: string;
    status: string;
    lastSyncedAt: Date | null;
    productSyncedAt: Date | null;
    url: string | null;
  } | null;
  google: {
    state: "unavailable" | "unsupported" | "not-connected" | "setup" | "ready";
    offers: Array<{
      offerId: string;
      feedLabel: string | null;
      contentLanguage: string | null;
      status: "pending" | "live" | "disapproved" | "error";
      pushedAt: Date | null;
      verifiedAt: Date | null;
    }>;
  };
};

/**
 * Saved channel state only. The caller must verify product ownership first.
 * Does not publish, sync, contact Google or expose account credentials.
 */
export const loadProductChannels = async (
  product: Product.Type,
  store: Store.Type | null,
): Promise<ProductChannels> => {
  if (
    store &&
    (store.id !== product.storeId || store.userId !== product.userId)
  )
    return { source: null, google: { state: "unavailable", offers: [] } };
  const source = store
    ? {
        platform: store.platform,
        name: store.name,
        domain: store.domain,
        status: store.status,
        lastSyncedAt: store.lastSyncedAt,
        productSyncedAt: product.syncedAt,
        url: product.url,
      }
    : null;
  if (!store) return { source, google: { state: "unavailable", offers: [] } };
  if (!GOOGLE_MERCHANT_PLATFORMS.includes(store.platform))
    return { source, google: { state: "unsupported", offers: [] } };

  const [accounts, offers] = await Promise.all([
    GoogleMerchantAccount.find(Environment.SERVER, {
      where: eq(schema.googleMerchantAccount.storeId, store.id),
    }),
    GoogleMerchantOffer.find(Environment.SERVER, {
      where: and(
        eq(schema.googleMerchantOffer.storeId, store.id),
        eq(schema.googleMerchantOffer.productId, product.id),
      ),
    }),
  ]);
  if (!accounts.success || !offers.success)
    return { source, google: { state: "unavailable", offers: [] } };

  const account = accounts.data[0];
  if (!account)
    return { source, google: { state: "not-connected", offers: [] } };

  return {
    source,
    google: {
      state:
        account.linkState === "active" && account.dataSourceName
          ? "ready"
          : "setup",
      offers: offers.data.map((offer) => ({
        offerId: offer.offerId,
        feedLabel: offer.feedLabel,
        contentLanguage: offer.contentLanguage,
        status: offer.status,
        pushedAt: offer.pushedAt,
        verifiedAt: offer.verifiedAt,
      })),
    },
  };
};
