"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import * as GoogleMerchantAPI from "../../utils/google-merchant";
import * as GoogleMerchantAccount from "../google-merchant-account";
import * as Product from "../product";
import * as Store from "../store";

/**
 * Path 1 of the Google Merchant Center hybrid integration
 * (docs/integrations/google-merchant-center.md): the store's native Google
 * plugin owns the primary feed, verification, and the domain claim; ecentic
 * links the merchant's account to our MCA via accountManagement and pushes
 * attribute overrides through a supplemental data source.
 */

const SUPPLEMENTAL_DATA_SOURCE_NAME = "ecentic Optimizations";

const ownedStore = async (storeId: string, userId: string) => {
  const store = await Store.get(Environment.SERVER, storeId);
  if (!store.success) return store;
  if (!store.data)
    return {
      success: false as const,
      error: new RequestError("Store not found"),
    };
  if (store.data.userId !== userId)
    return {
      success: false as const,
      error: new RequestError("Not authorized"),
    };
  return { success: true as const, data: store.data };
};

const linkedAccount = async (storeId: string) => {
  const account = await GoogleMerchantAccount.find(Environment.SERVER, {
    where: eq(schema.googleMerchantAccount.storeId, storeId),
  });
  if (!account.success) return account;

  const record = account.data[0];
  if (!record)
    return {
      success: false as const,
      error: new RequestError("Google is not connected for this store"),
    };
  return { success: true as const, data: record };
};

/**
 * Returns a live access token for the store's Google grant, refreshing (and
 * persisting) it when it expires within five minutes — same policy as the
 * Shopify token resolver.
 */
const resolveAccessToken = async (
  storeId: string,
): Promise<
  | { success: true; accessToken: string; record: GoogleMerchantAccount.Type }
  | { success: false; error: Error }
> => {
  const account = await linkedAccount(storeId);
  if (!account.success) return account;

  const record = account.data;
  if (!record.accessToken)
    return {
      success: false,
      error: new RequestError("Missing Google access token"),
    };

  const isExpiring =
    record.accessTokenExpiresAt &&
    record.accessTokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!isExpiring)
    return { success: true, accessToken: record.accessToken, record };

  if (!record.refreshToken)
    return {
      success: false,
      error: new RequestError(
        "Google authorization has expired. Please reconnect Google.",
      ),
    };

  const config = GoogleMerchantAPI.configuration();
  if (!config)
    return { success: false, error: GoogleMerchantAPI.notConfiguredError() };

  const refreshed = await GoogleMerchantAPI.refreshAccessToken(config, {
    refreshToken: record.refreshToken,
  });
  if (!refreshed.success) return refreshed;

  const persisted = await GoogleMerchantAccount.update(
    Environment.SERVER,
    record.id,
    {
      accessToken: refreshed.data.accessToken,
      accessTokenExpiresAt: refreshed.data.accessTokenExpiresAt,
    },
  );
  if (!persisted.success) return persisted;

  return {
    success: true,
    accessToken: refreshed.data.accessToken,
    record: { ...record, accessToken: refreshed.data.accessToken },
  };
};

/**
 * OAuth callback: exchanges the code, persists the grant on the store's
 * `google_merchant_account` row, and detects the merchant's existing Merchant
 * Center accounts. Exactly one visible account → adopted immediately; zero →
 * the merchant still needs the native plugin (UI polls {@link detectAccount});
 * several → the UI offers a picker backed by {@link selectAccount}.
 */
export const handleOAuthCallback = withContext(
  async (
    context,
    {
      code,
      store: storeId,
      user: userId,
    }: { code: string; store: string; user: string },
  ) => {
    const config = GoogleMerchantAPI.configuration();
    if (!config)
      return { success: false, error: GoogleMerchantAPI.notConfiguredError() };

    const store = await ownedStore(storeId, userId);
    if (!store.success) return store;

    const redirectUri = `${process.env.APP_HOST}/api/integrations/google/callback`;

    const grant = await GoogleMerchantAPI.exchangeCode(config, {
      code,
      redirectUri,
    });
    if (!grant.success) return grant;

    const accounts = await GoogleMerchantAPI.listAccounts(
      grant.data.accessToken,
    );
    if (!accounts.success) return accounts;

    const detected = (accounts.data.accounts ?? [])
      .map((account) => GoogleMerchantAPI.accountIdFromName(account.name))
      .filter((id): id is string => id !== null);

    const synced = await GoogleMerchantAccount.sync(Environment.SERVER, {
      storeId,
      accessToken: grant.data.accessToken,
      accessTokenExpiresAt: grant.data.accessTokenExpiresAt,
      refreshToken: grant.data.refreshToken,
      scope: grant.data.scope,
      googleAccountId: detected.length === 1 ? detected[0] : null,
      linkState: "unlinked",
      path: "native",
    });
    if (!synced.success) return synced;

    context.span.addBreadcrumb({
      category: "google.oauth.exchange",
      data: { "store.id": storeId, "accounts.detected": detected.length },
    });

    return {
      success: true,
      data: { accounts: detected, adopted: detected.length === 1 },
    };
  },
  "GoogleMerchant.handleOAuthCallback",
);

/**
 * Polls `accounts.list` for a store whose merchant had no Merchant Center
 * account at connect time (they were sent to install the native plugin). Once
 * exactly one account appears it is adopted.
 */
export const detectAccount = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    const accounts = await GoogleMerchantAPI.listAccounts(resolved.accessToken);
    if (!accounts.success) return accounts;

    const detected = (accounts.data.accounts ?? [])
      .map((account) => GoogleMerchantAPI.accountIdFromName(account.name))
      .filter((id): id is string => id !== null);

    if (detected.length === 1 && !resolved.record.googleAccountId) {
      const update = await GoogleMerchantAccount.update(
        Environment.SERVER,
        resolved.record.id,
        { googleAccountId: detected[0] },
      );
      if (!update.success) return update;
    }

    return {
      success: true,
      data: {
        accounts: detected,
        adopted: resolved.record.googleAccountId ?? detected[0] ?? null,
      },
    };
  },
  "GoogleMerchant.detectAccount",
);

/** Adopts one of several detected Merchant Center accounts for the store. */
export const selectAccount = withAuthentication(
  async (
    context,
    { store: storeId, account: accountId }: { store: string; account: string },
  ) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    const accounts = await GoogleMerchantAPI.listAccounts(resolved.accessToken);
    if (!accounts.success) return accounts;

    const visible = (accounts.data.accounts ?? []).some(
      (account) =>
        GoogleMerchantAPI.accountIdFromName(account.name) === accountId,
    );
    if (!visible)
      return {
        success: false,
        error: new RequestError(
          "That Merchant Center account is not accessible with the connected Google login",
        ),
      };

    return GoogleMerchantAccount.update(
      Environment.SERVER,
      resolved.record.id,
      { googleAccountId: accountId },
    );
  },
  "GoogleMerchant.selectAccount",
);

/**
 * Proposes the accountManagement link from our MCA to the merchant's account.
 * The merchant must approve it inside Merchant Center — the UI explains what
 * management access means before this is called.
 */
export const proposeLink = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const config = GoogleMerchantAPI.configuration();
    if (!config)
      return { success: false, error: GoogleMerchantAPI.notConfiguredError() };

    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    if (!resolved.record.googleAccountId)
      return {
        success: false,
        error: new RequestError("No Merchant Center account detected yet"),
      };

    const proposal = await GoogleMerchantAPI.proposeAccountManagement(
      resolved.accessToken,
      {
        accountId: resolved.record.googleAccountId,
        providerId: config.advancedAccountId,
      },
    );
    if (!proposal.success) return proposal;

    context.span.addBreadcrumb({
      category: "google.link.proposed",
      data: {
        "store.id": storeId,
        "google.account": resolved.record.googleAccountId,
      },
    });

    return GoogleMerchantAccount.update(
      Environment.SERVER,
      resolved.record.id,
      { linkState: "proposed" },
    );
  },
  "GoogleMerchant.proposeLink",
);

/**
 * Re-reads the account's services and promotes `proposed` → `active` once the
 * merchant has approved our accountManagement proposal in Merchant Center.
 */
export const checkLink = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const config = GoogleMerchantAPI.configuration();
    if (!config)
      return { success: false, error: GoogleMerchantAPI.notConfiguredError() };

    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    if (!resolved.record.googleAccountId)
      return {
        success: false,
        error: new RequestError("No Merchant Center account detected yet"),
      };

    const services = await GoogleMerchantAPI.listAccountServices(
      resolved.accessToken,
      resolved.record.googleAccountId,
    );
    if (!services.success) return services;

    const active = (services.data.accountServices ?? []).some(
      (service) =>
        service.accountManagement !== undefined &&
        service.provider === `providers/${config.advancedAccountId}` &&
        service.handshake?.approvalState === "ESTABLISHED",
    );

    if (active && resolved.record.linkState !== "active") {
      const update = await GoogleMerchantAccount.update(
        Environment.SERVER,
        resolved.record.id,
        { linkState: "active" },
      );
      if (!update.success) return update;
    }

    return {
      success: true,
      data: { linkState: active ? "active" : resolved.record.linkState },
    };
  },
  "GoogleMerchant.checkLink",
);

/**
 * Creates (once) our supplemental data source on the merchant's account, with
 * `feedLabel`/`contentLanguage` copied from the native plugin's primary feed —
 * supplemental data merges on (offerId, contentLanguage, feedLabel), not the
 * offer id alone. Also surfaces whether a primary product data source exists,
 * so the UI can hold the merchant on the "install the plugin" step.
 */
export const ensureSupplementalDataSource = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    const { record } = resolved;
    if (!record.googleAccountId)
      return {
        success: false,
        error: new RequestError("No Merchant Center account detected yet"),
      };
    if (record.dataSourceName)
      return {
        success: true as const,
        data: { dataSourceName: record.dataSourceName, created: false },
      };

    const sources = await GoogleMerchantAPI.listDataSources(
      resolved.accessToken,
      record.googleAccountId,
    );
    if (!sources.success) return sources;

    const primary = (sources.data.dataSources ?? []).find(
      (source) => source.primaryProductDataSource !== undefined,
    );
    if (!primary)
      return {
        success: false,
        error: new RequestError(
          "No primary product feed found on the Merchant Center account — the store's Google plugin has not finished its setup",
        ),
      };

    const created = await GoogleMerchantAPI.createSupplementalDataSource(
      resolved.accessToken,
      {
        accountId: record.googleAccountId,
        displayName: SUPPLEMENTAL_DATA_SOURCE_NAME,
        feedLabel: primary.primaryProductDataSource?.feedLabel ?? null,
        contentLanguage:
          primary.primaryProductDataSource?.contentLanguage ?? null,
      },
    );
    if (!created.success) return created;
    if (!created.data.name)
      return {
        success: false,
        error: new RequestError("Data source creation returned no name"),
      };

    context.span.addBreadcrumb({
      category: "google.datasource.created",
      data: { "store.id": storeId, "datasource.name": created.data.name },
    });

    const update = await GoogleMerchantAccount.update(
      Environment.SERVER,
      record.id,
      {
        dataSourceName: created.data.name,
        feedLabel: primary.primaryProductDataSource?.feedLabel ?? null,
        contentLanguage:
          primary.primaryProductDataSource?.contentLanguage ?? null,
      },
    );
    if (!update.success) return update;

    return {
      success: true as const,
      data: { dataSourceName: created.data.name, created: true },
    };
  },
  "GoogleMerchant.ensureSupplementalDataSource",
);

/**
 * The primary feed's offers, keyed for matching. Offer IDs are read from the
 * merchant's account — never reconstructed from the plugin's id scheme
 * (`shopify_{country}_{productId}_{variantId}`, `gla_{postId}`, …). An offer
 * matches one of our products when the product's platform id appears as a
 * whole `_`-separated segment of the offer id, or equals it outright.
 */
const offerMatchesExternalId = (offerId: string, externalId: string) => {
  if (offerId === externalId) return true;
  return offerId.split("_").includes(externalId);
};

/**
 * Pushes the store's published listing optimizations as attribute overrides
 * into the supplemental data source, one input per matching primary-feed
 * offer. Returns per-product match results so the UI can show which
 * optimizations are live on Google and which found no offer.
 */
export const pushOverrides = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    const { record } = resolved;
    if (!record.googleAccountId || !record.dataSourceName)
      return {
        success: false,
        error: new RequestError(
          "Google account is not fully linked — detect the account and create the data source first",
        ),
      };

    const products = await Product.find(Environment.SERVER, {
      where: and(
        eq(schema.product.storeId, storeId),
        eq(schema.product.status, "active"),
      ),
    });
    if (!products.success) return products;

    const withExternalId = products.data.filter(
      (product) => product.externalId !== null,
    );
    if (withExternalId.length === 0)
      return {
        success: true as const,
        data: { pushed: 0, matchedProducts: 0, unmatchedProducts: 0 },
      };

    const optimizations = await db.query.listingOptimization.findMany({
      where: {
        status: "published",
        productId: {
          in: withExternalId.map((product) => product.id),
        },
      },
    });

    const optimizationByProduct = new Map(
      optimizations.map((optimization) => [
        optimization.productId,
        optimization,
      ]),
    );

    const offers = await GoogleMerchantAPI.listProducts(
      resolved.accessToken,
      record.googleAccountId,
    );
    if (!offers.success) return offers;

    let pushed = 0;
    let matchedProducts = 0;
    let unmatchedProducts = 0;
    const errors: string[] = [];

    for (const product of withExternalId) {
      const optimization = optimizationByProduct.get(product.id);
      if (!optimization) continue;
      if (!optimization.proposedTitle && !optimization.proposedDescription)
        continue;

      const externalId = product.externalId as string;
      const matching = offers.data.filter(
        (offer) =>
          offer.offerId !== undefined &&
          offer.contentLanguage !== undefined &&
          offer.feedLabel !== undefined &&
          offerMatchesExternalId(offer.offerId, externalId),
      );

      if (matching.length === 0) {
        unmatchedProducts += 1;
        continue;
      }
      matchedProducts += 1;

      for (const offer of matching) {
        const insertion = await GoogleMerchantAPI.insertProductInput(
          resolved.accessToken,
          {
            accountId: record.googleAccountId,
            dataSourceName: record.dataSourceName,
            offerId: offer.offerId as string,
            contentLanguage: offer.contentLanguage as string,
            feedLabel: offer.feedLabel as string,
            attributes: {
              ...(optimization.proposedTitle
                ? { title: optimization.proposedTitle }
                : {}),
              ...(optimization.proposedDescription
                ? { description: optimization.proposedDescription }
                : {}),
            },
          },
        );

        if (!insertion.success) {
          errors.push(`${offer.offerId}: ${insertion.error.message}`);
          continue;
        }
        pushed += 1;
      }
    }

    context.span.addBreadcrumb({
      category: "google.overrides.pushed",
      data: {
        "store.id": storeId,
        "overrides.pushed": pushed,
        "products.matched": matchedProducts,
        "products.unmatched": unmatchedProducts,
        "overrides.errors": errors.length,
      },
    });

    return {
      success: true as const,
      data: {
        pushed,
        matchedProducts,
        unmatchedProducts,
        errors: errors.slice(0, 10),
      },
    };
  },
  "GoogleMerchant.pushOverrides",
);

/**
 * Diagnostics for the dashboard: account-level issues plus item-level issues
 * and disapprovals aggregated from the processed products view.
 */
export const pullDiagnostics = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    const { record } = resolved;
    if (!record.googleAccountId)
      return {
        success: false,
        error: new RequestError("No Merchant Center account detected yet"),
      };

    const [issues, offers] = await Promise.all([
      GoogleMerchantAPI.listAccountIssues(
        resolved.accessToken,
        record.googleAccountId,
      ),
      GoogleMerchantAPI.listProducts(
        resolved.accessToken,
        record.googleAccountId,
      ),
    ]);
    if (!issues.success) return issues;
    if (!offers.success) return offers;

    const itemIssues = offers.data.flatMap((offer) =>
      (offer.productStatus?.itemLevelIssues ?? []).map((issue) => ({
        offerId: offer.offerId ?? null,
        code: issue.code ?? null,
        severity: issue.severity ?? null,
        description: issue.description ?? null,
        attribute: issue.attribute ?? null,
      })),
    );

    const disapprovedOffers = offers.data.filter((offer) =>
      (offer.productStatus?.destinationStatuses ?? []).some(
        (destination) => (destination.disapprovedCountries ?? []).length > 0,
      ),
    ).length;

    const stamped = await GoogleMerchantAccount.update(
      Environment.SERVER,
      record.id,
      { lastDiagnosticsAt: new Date() },
    );
    if (!stamped.success) return stamped;

    context.span.addBreadcrumb({
      category: "google.diagnostics.pulled",
      data: {
        "store.id": storeId,
        "offers.total": offers.data.length,
        "offers.disapproved": disapprovedOffers,
        "issues.account": issues.data.accountIssues?.length ?? 0,
        "issues.item": itemIssues.length,
      },
    });

    return {
      success: true as const,
      data: {
        accountIssues: issues.data.accountIssues ?? [],
        itemIssues,
        offerCount: offers.data.length,
        disapprovedOffers,
      },
    };
  },
  "GoogleMerchant.pullDiagnostics",
);

/**
 * Merge health: are the overrides we pushed actually live on the processed
 * offers? Compares each published optimization's title against the processed
 * attribute value — a stronger signal than disapproval counts, since offer-id
 * schemes change silently when the merchant changes markets or variants.
 */
export const checkMergeHealth = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    const { record } = resolved;
    if (!record.googleAccountId)
      return {
        success: false,
        error: new RequestError("No Merchant Center account detected yet"),
      };

    const products = await Product.find(Environment.SERVER, {
      where: eq(schema.product.storeId, storeId),
    });
    if (!products.success) return products;

    const withExternalId = products.data.filter(
      (product) => product.externalId !== null,
    );

    const optimizations =
      withExternalId.length === 0
        ? []
        : await db.query.listingOptimization.findMany({
            where: {
              status: "published",
              productId: { in: withExternalId.map((product) => product.id) },
            },
          });

    const offers = await GoogleMerchantAPI.listProducts(
      resolved.accessToken,
      record.googleAccountId,
    );
    if (!offers.success) return offers;

    const externalIdByProduct = new Map(
      withExternalId.map((product) => [product.id, product.externalId]),
    );

    const results = optimizations
      .filter((optimization) => optimization.proposedTitle)
      .map((optimization) => {
        const externalId = externalIdByProduct.get(optimization.productId);
        if (!externalId)
          return { productId: optimization.productId, applied: false };

        const applied = offers.data.some(
          (offer) =>
            offer.offerId !== undefined &&
            offerMatchesExternalId(offer.offerId, externalId) &&
            offer.attributes?.title === optimization.proposedTitle,
        );
        return { productId: optimization.productId, applied };
      });

    const applied = results.filter((result) => result.applied).length;

    context.span.addBreadcrumb({
      category: "google.merge.health",
      data: {
        "store.id": storeId,
        "overrides.applied": applied,
        "overrides.total": results.length,
      },
    });

    return {
      success: true as const,
      data: { applied, total: results.length, results },
    };
  },
  "GoogleMerchant.checkMergeHealth",
);

/** Removes the store's Google link and stored tokens. */
export const disconnect = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const account = await linkedAccount(storeId);
    if (!account.success) return account;

    return GoogleMerchantAccount.destroy(Environment.SERVER, account.data.id);
  },
  "GoogleMerchant.disconnect",
);
