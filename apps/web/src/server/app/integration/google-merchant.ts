"use server";

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import * as GoogleMerchantAPI from "../../utils/google-merchant";
import * as GoogleMerchantAccount from "../google-merchant-account";
import * as GoogleMerchantOffer from "../google-merchant-offer";
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
 * Guarantees the primary data source's defaultRule lists our supplemental
 * source first (earlier entries win attribute conflicts). Spike 1: the Shopify
 * channel's rule is `[{self: true}]` and never picks up new supplemental
 * sources on its own — without this patch, inserts return 200 and merge
 * nothing. Read-modify-write (the PATCH replaces the whole list, so existing
 * entries are preserved behind ours), then re-read to confirm.
 */
const ensureDefaultRule = async (
  accessToken: string,
  {
    primaryName,
    supplementalName,
  }: { primaryName: string; supplementalName: string },
): Promise<
  | { success: true; data: { patched: boolean; confirmed: boolean } }
  | { success: false; error: Error }
> => {
  const primary = await GoogleMerchantAPI.getDataSource(
    accessToken,
    primaryName,
  );
  if (!primary.success) return primary;

  const current =
    primary.data.primaryProductDataSource?.defaultRule?.takeFromDataSources ??
    [];

  const isOurs = (reference: GoogleMerchantAPI.DataSourceReference) =>
    reference.supplementalDataSourceName === supplementalName;

  if (current[0] && isOurs(current[0]))
    return { success: true, data: { patched: false, confirmed: true } };

  const patched = await GoogleMerchantAPI.patchDataSourceDefaultRule(
    accessToken,
    {
      name: primaryName,
      takeFromDataSources: [
        { supplementalDataSourceName: supplementalName },
        ...current.filter((reference) => !isOurs(reference)),
      ],
    },
  );
  if (!patched.success) return patched;

  const confirmation = await GoogleMerchantAPI.getDataSource(
    accessToken,
    primaryName,
  );
  if (!confirmation.success) return confirmation;

  const confirmed = (() => {
    const rule =
      confirmation.data.primaryProductDataSource?.defaultRule
        ?.takeFromDataSources ?? [];
    return rule[0] !== undefined && isOurs(rule[0]);
  })();

  return { success: true, data: { patched: true, confirmed } };
};

/**
 * Provisions (idempotently) our supplemental data source on the merchant's
 * account, with `feedLabel`/`contentLanguage` discovered from the native
 * plugin's primary feed — never assumed; Shopify's labels are strings like
 * `USD_101961335098`, not country codes. Provisioning is complete only when
 * the primary's defaultRule shows our source first ({@link ensureDefaultRule}
 * is a hard gate, not a fallback), so re-calling this also repairs the rule.
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

    const sources = await GoogleMerchantAPI.listDataSources(
      resolved.accessToken,
      record.googleAccountId,
    );
    if (!sources.success) return sources;

    const primary = (sources.data.dataSources ?? []).find(
      (source) => source.primaryProductDataSource !== undefined,
    );
    if (!primary?.name)
      return {
        success: false,
        error: new RequestError(
          "No primary product feed found on the Merchant Center account — the store's Google plugin has not finished its setup",
        ),
      };

    const supplemental = await (async (): Promise<
      | { success: true; name: string; created: boolean }
      | { success: false; error: Error }
    > => {
      if (record.dataSourceName)
        return { success: true, name: record.dataSourceName, created: false };

      const created = await GoogleMerchantAPI.createSupplementalDataSource(
        resolved.accessToken,
        {
          accountId: record.googleAccountId as string,
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
      return { success: true, name: created.data.name, created: true };
    })();
    if (!supplemental.success) return supplemental;

    const rule = await ensureDefaultRule(resolved.accessToken, {
      primaryName: primary.name,
      supplementalName: supplemental.name,
    });
    if (!rule.success) return rule;
    if (!rule.data.confirmed)
      return {
        success: false,
        error: new RequestError(
          "Primary feed rule patch did not stick — the supplemental source is not first in takeFromDataSources",
        ),
      };

    context.span.addBreadcrumb({
      category: "google.datasource.provisioned",
      data: {
        "store.id": storeId,
        "datasource.name": supplemental.name,
        "datasource.created": supplemental.created,
        "rule.patched": rule.data.patched,
      },
    });

    const update = await GoogleMerchantAccount.update(
      Environment.SERVER,
      record.id,
      {
        dataSourceName: supplemental.name,
        primaryDataSourceName: primary.name,
        feedLabel: primary.primaryProductDataSource?.feedLabel ?? null,
        contentLanguage:
          primary.primaryProductDataSource?.contentLanguage ?? null,
      },
    );
    if (!update.success) return update;

    return {
      success: true as const,
      data: {
        dataSourceName: supplemental.name,
        created: supplemental.created,
        rulePatched: rule.data.patched,
      },
    };
  },
  "GoogleMerchant.ensureSupplementalDataSource",
);

/**
 * Rule-position watchdog: a merchant can reorder or remove our supplemental
 * source in Merchant Center, silently disabling every override while inserts
 * keep returning 200. Re-checks the primary's defaultRule and repairs it.
 */
export const checkRuleHealth = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    const { record } = resolved;
    if (!record.primaryDataSourceName || !record.dataSourceName)
      return {
        success: false,
        error: new RequestError("Data sources are not provisioned yet"),
      };

    const rule = await ensureDefaultRule(resolved.accessToken, {
      primaryName: record.primaryDataSourceName,
      supplementalName: record.dataSourceName,
    });
    if (!rule.success) return rule;

    context.span.addBreadcrumb({
      category: "google.rule.health",
      data: {
        "store.id": storeId,
        "rule.repaired": rule.data.patched,
        "rule.confirmed": rule.data.confirmed,
      },
    });

    return {
      success: true as const,
      data: { repaired: rule.data.patched, healthy: rule.data.confirmed },
    };
  },
  "GoogleMerchant.checkRuleHealth",
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

const attributesHash = (attributes: GoogleMerchantAPI.ProductInputAttributes) =>
  crypto.createHash("sha256").update(JSON.stringify(attributes)).digest("hex");

/**
 * Pushes the store's published listing optimizations as attribute overrides
 * into the supplemental data source, one input per matching primary-feed
 * offer. Idempotent by construction: each override body is hashed and offers
 * whose last-pushed hash matches are skipped, so re-running is always safe.
 * Overrides that fail the policy lint are never inserted — Google validates
 * supplemental data as the merchant's own, and a disapproval caused by our
 * rewrite is the worst failure mode this product has. Pushed offers land in
 * `pending`; only {@link verifyOverrides} flips them to `live`.
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
        data: {
          pushed: 0,
          skippedUnchanged: 0,
          matchedProducts: 0,
          unmatchedProducts: 0,
          policyBlocked: [],
          errors: [],
        },
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

    const existingOffers = await GoogleMerchantOffer.find(Environment.SERVER, {
      where: eq(schema.googleMerchantOffer.storeId, storeId),
    });
    if (!existingOffers.success) return existingOffers;

    const existingByOfferId = new Map(
      existingOffers.data.map((offer) => [offer.offerId, offer]),
    );

    const offers = await GoogleMerchantAPI.listProducts(
      resolved.accessToken,
      record.googleAccountId,
    );
    if (!offers.success) return offers;

    let pushed = 0;
    let skippedUnchanged = 0;
    let matchedProducts = 0;
    let unmatchedProducts = 0;
    const policyBlocked: { productId: string; issues: string[] }[] = [];
    const errors: string[] = [];

    for (const product of withExternalId) {
      const optimization = optimizationByProduct.get(product.id);
      if (!optimization) continue;
      if (!optimization.proposedTitle && !optimization.proposedDescription)
        continue;

      const attributes: GoogleMerchantAPI.ProductInputAttributes = {
        ...(optimization.proposedTitle
          ? { title: optimization.proposedTitle }
          : {}),
        ...(optimization.proposedDescription
          ? { description: optimization.proposedDescription }
          : {}),
      };

      const lint = GoogleMerchantAPI.lintOverrideAttributes(attributes);
      if (lint.length > 0) {
        policyBlocked.push({
          productId: product.id,
          issues: lint.map((issue) => issue.code),
        });
        continue;
      }

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

      const hash = attributesHash(attributes);

      for (const offer of matching) {
        const offerId = offer.offerId as string;

        const existing = existingByOfferId.get(offerId);
        if (
          existing &&
          existing.attributesHash === hash &&
          existing.status !== "error"
        ) {
          skippedUnchanged += 1;
          continue;
        }

        const insertion = await GoogleMerchantAPI.insertProductInput(
          resolved.accessToken,
          {
            accountId: record.googleAccountId,
            dataSourceName: record.dataSourceName,
            offerId,
            contentLanguage: offer.contentLanguage as string,
            feedLabel: offer.feedLabel as string,
            attributes,
          },
        );

        const synced = await GoogleMerchantOffer.sync(Environment.SERVER, {
          storeId,
          productId: product.id,
          offerId,
          feedLabel: offer.feedLabel ?? null,
          contentLanguage: offer.contentLanguage ?? null,
          attributesHash: hash,
          status: insertion.success ? "pending" : "error",
          error: insertion.success ? null : insertion.error.message,
          pushedAt: insertion.success ? new Date() : null,
          verifiedAt: null,
        });
        if (!synced.success) return synced;

        if (!insertion.success) {
          errors.push(`${offerId}: ${insertion.error.message}`);
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
        "overrides.skipped": skippedUnchanged,
        "products.matched": matchedProducts,
        "products.unmatched": unmatchedProducts,
        "products.policy_blocked": policyBlocked.length,
        "overrides.errors": errors.length,
      },
    });

    return {
      success: true as const,
      data: {
        pushed,
        skippedUnchanged,
        matchedProducts,
        unmatchedProducts,
        policyBlocked,
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
 * Async verification pass — push ≠ live. Google reprocesses lazily (hours),
 * so this never asserts right after a push: for each `pending` offer it gates
 * on `productStatus.lastUpdateDate` advancing past `pushedAt`, then diffs the
 * processed title against the published optimization and flips the row to
 * `live`. An offer that reprocessed WITHOUT picking up the override is the
 * rule-broke-silently signal — reported as `reprocessedWithoutMerge` and left
 * `pending` so the next pass (after {@link checkRuleHealth} repairs the rule
 * and a re-push forces reprocessing) can settle it. Dashboard lifecycle this
 * drives: optimizing → applied, going live (may take a few hours) → live.
 */
export const verifyOverrides = withAuthentication(
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

    const pending = await GoogleMerchantOffer.find(Environment.SERVER, {
      where: and(
        eq(schema.googleMerchantOffer.storeId, storeId),
        eq(schema.googleMerchantOffer.status, "pending"),
      ),
    });
    if (!pending.success) return pending;

    if (pending.data.length === 0)
      return {
        success: true as const,
        data: {
          verified: 0,
          awaitingReprocess: 0,
          reprocessedWithoutMerge: 0,
          missingOffers: 0,
        },
      };

    const optimizations = await db.query.listingOptimization.findMany({
      where: {
        status: "published",
        productId: { in: pending.data.map((offer) => offer.productId) },
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

    const processedByOfferId = new Map(
      offers.data
        .filter((offer) => offer.offerId !== undefined)
        .map((offer) => [offer.offerId as string, offer]),
    );

    let verified = 0;
    let awaitingReprocess = 0;
    let reprocessedWithoutMerge = 0;
    let missingOffers = 0;

    for (const row of pending.data) {
      const processed = processedByOfferId.get(row.offerId);
      if (!processed) {
        // The plugin removed/re-keyed the offer (market or variant change) —
        // the override now points at nothing.
        missingOffers += 1;
        const flagged = await GoogleMerchantOffer.update(
          Environment.SERVER,
          row.id,
          { status: "error", error: "Offer no longer on the account" },
        );
        if (!flagged.success) return flagged;
        continue;
      }

      const lastUpdateDate = processed.productStatus?.lastUpdateDate ?? null;
      const reprocessed =
        lastUpdateDate !== null &&
        row.pushedAt !== null &&
        new Date(lastUpdateDate).getTime() > row.pushedAt.getTime();

      if (!reprocessed) {
        awaitingReprocess += 1;
        if (lastUpdateDate !== row.lastUpdateDate) {
          const stamped = await GoogleMerchantOffer.update(
            Environment.SERVER,
            row.id,
            { lastUpdateDate },
          );
          if (!stamped.success) return stamped;
        }
        continue;
      }

      const optimization = optimizationByProduct.get(row.productId);
      const merged =
        optimization?.proposedTitle !== null &&
        optimization?.proposedTitle !== undefined
          ? processed.attributes?.title === optimization.proposedTitle
          : processed.attributes?.description ===
            optimization?.proposedDescription;

      if (!merged) {
        reprocessedWithoutMerge += 1;
        const stamped = await GoogleMerchantOffer.update(
          Environment.SERVER,
          row.id,
          { lastUpdateDate },
        );
        if (!stamped.success) return stamped;
        continue;
      }

      verified += 1;
      const flipped = await GoogleMerchantOffer.update(
        Environment.SERVER,
        row.id,
        { status: "live", verifiedAt: new Date(), lastUpdateDate },
      );
      if (!flipped.success) return flipped;
    }

    context.span.addBreadcrumb({
      category: "google.overrides.verified",
      data: {
        "store.id": storeId,
        "overrides.verified": verified,
        "overrides.awaiting": awaitingReprocess,
        "overrides.unmerged": reprocessedWithoutMerge,
        "overrides.missing": missingOffers,
      },
    });

    return {
      success: true as const,
      data: {
        verified,
        awaitingReprocess,
        reprocessedWithoutMerge,
        missingOffers,
      },
    };
  },
  "GoogleMerchant.verifyOverrides",
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
