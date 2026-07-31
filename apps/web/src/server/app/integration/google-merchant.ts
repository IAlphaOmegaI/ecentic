"use server";

import crypto from "node:crypto";
import { resultify } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import * as GoogleMerchantAPI from "../../utils/google-merchant";
import { normalizeHostname } from "../../utils/tracking";
import * as GoogleMerchantAccount from "../google-merchant-account";
import * as GoogleMerchantOffer from "../google-merchant-offer";
import * as GoogleMerchantUcp from "../google-merchant-ucp";
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

/**
 * Path 1 is validated end-to-end on Shopify only (spike 1). WooCommerce waits
 * on spike 2 — offer-ID format, feed-label convention, and whether Google for
 * WooCommerce's primary accepts the rule patch are unverified — and other
 * platforms have no native Google plugin at all (they'd need Path 2).
 */
const SUPPORTED_PLATFORMS = ["shopify", "shopify-public"];

const unsupportedPlatformError = (platform: string) =>
  new RequestError(
    platform === "woocommerce"
      ? "Google Shopping optimization for WooCommerce is coming soon"
      : "Google Shopping optimization is currently available for Shopify stores only",
  );

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

type CandidateAccount = {
  id: string;
  name: string | null;
  /** Host of the account's registered homepage, null when unset/unreadable. */
  domain: string | null;
  /** Whether that homepage host matches one of the store's known hosts. */
  matchesStore: boolean;
};

/** Every host this ecentic store is known by (primary domain + storefront hosts). */
const storeHosts = (store: Store.Type): string[] => {
  const hosts = new Set<string>();
  hosts.add(normalizeHostname(store.domain));
  for (const host of store.storefrontHosts ?? [])
    hosts.add(normalizeHostname(host));
  return [...hosts];
};

/**
 * Lists the Merchant Center accounts visible to the token and enriches each
 * with its registered homepage domain, matched against the ecentic store's
 * hosts. The match verdict is the identity check that keeps a merchant with
 * several accounts from linking the wrong one — auto-adoption requires it,
 * and a mismatched manual pick requires explicit confirmation.
 */
const detectCandidates = async (
  accessToken: string,
  store: Store.Type,
): Promise<
  { success: true; data: CandidateAccount[] } | { success: false; error: Error }
> => {
  const accounts = await GoogleMerchantAPI.listAccounts(accessToken);
  if (!accounts.success) return accounts;

  const hosts = storeHosts(store);
  const advancedAccountId =
    GoogleMerchantAPI.configuration()?.advancedAccountId;

  const probed = await Promise.all(
    (accounts.data.accounts ?? [])
      .map((account) => ({
        id: GoogleMerchantAPI.accountIdFromName(account.name),
        name: account.accountName ?? null,
      }))
      .filter(
        (candidate): candidate is { id: string; name: string | null } =>
          candidate.id !== null,
      )
      // ecentic's own MCA is visible to any login that administers it and can
      // never be a store — never a candidate.
      .filter((candidate) => candidate.id !== advancedAccountId)
      .map(async (candidate) => {
        const [homepage, subaccounts] = await Promise.all([
          GoogleMerchantAPI.getHomepage(accessToken, candidate.id),
          GoogleMerchantAPI.listSubaccounts(accessToken, candidate.id),
        ]);
        const domain =
          homepage.success && homepage.data.uri
            ? normalizeHostname(homepage.data.uri)
            : null;
        return {
          candidate: {
            ...candidate,
            domain,
            matchesStore: domain !== null && hosts.includes(domain),
          },
          // An account with sub-accounts is an advanced account (aggregator),
          // not a store that can hold products. The probe erring means "not
          // an aggregator" and keeps the candidate.
          isAdvanced:
            subaccounts.success && (subaccounts.data.accounts?.length ?? 0) > 0,
        };
      }),
  );

  return {
    success: true,
    data: probed
      .filter((entry) => !entry.isAdvanced)
      .map((entry) => entry.candidate),
  };
};

/** The single account to auto-adopt, or null when the choice isn't safe. */
const adoptableCandidate = (
  candidates: CandidateAccount[],
): CandidateAccount | null => {
  const matching = candidates.filter((candidate) => candidate.matchesStore);
  if (matching.length === 1) return matching[0] ?? null;
  // No domain evidence at all and only one account visible: adopt it — a
  // fresh plugin-created account may briefly lack a homepage.
  if (
    matching.length === 0 &&
    candidates.length === 1 &&
    candidates[0]?.domain === null
  )
    return candidates[0] ?? null;
  return null;
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

type ResolvedToken =
  | { success: true; accessToken: string; record: GoogleMerchantAccount.Type }
  | { success: false; error: Error };

const ACCESS_TOKEN_LIFETIME = 60 * 60 * 1000;
const EXPIRY_BUFFER = 5 * 60 * 1000;
/** How long after minting a token is trusted without a liveness probe. */
const TRUSTED_MINT_AGE = 10 * 60 * 1000;

/**
 * Single refresh per store at a time. A page load fans several server actions
 * out in parallel and each resolves a token — without this, every one of them
 * minted its own access token from the same refresh grant, and whichever
 * persist landed last decided which token the NEXT request would use.
 */
const refreshFlights = new Map<string, Promise<ResolvedToken>>();

const refreshAndPersist = (
  record: GoogleMerchantAccount.Type,
  refreshToken: string,
): Promise<ResolvedToken> => {
  const inFlight = refreshFlights.get(record.storeId);
  if (inFlight) return inFlight;

  const flight = (async (): Promise<ResolvedToken> => {
    const config = GoogleMerchantAPI.configuration();
    if (!config)
      return { success: false, error: GoogleMerchantAPI.notConfiguredError() };

    const refreshed = await GoogleMerchantAPI.refreshAccessToken(config, {
      refreshToken,
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
      record: {
        ...record,
        accessToken: refreshed.data.accessToken,
        accessTokenExpiresAt: refreshed.data.accessTokenExpiresAt,
      },
    };
  })();

  refreshFlights.set(record.storeId, flight);
  void flight.finally(() => refreshFlights.delete(record.storeId));
  return flight;
};

/**
 * Returns a live access token for the store's Google grant. Expiry math alone
 * is not trusted: Google has revoked a stored access token out-of-band
 * (observed live — dead ~7 minutes after minting, expiry timestamp still an
 * hour out, Merchant API answering 401 UNAUTHENTICATED). Policy:
 *
 * - unknown expiry counts as expired, never as forever-valid;
 * - expiring within five minutes → refresh (single-flight per store);
 * - within ten minutes of minting → trusted as-is;
 * - older than that → cheap tokeninfo liveness probe, force-refresh when
 *   Google says the token is dead (probe transport failures fail open — the
 *   real API call surfaces genuine errors).
 */
const resolveAccessToken = async (storeId: string): Promise<ResolvedToken> => {
  const account = await linkedAccount(storeId);
  if (!account.success) return account;

  const record = account.data;
  if (!record.accessToken)
    return {
      success: false,
      error: new RequestError("Missing Google access token"),
    };

  const remaining = (record.accessTokenExpiresAt?.getTime() ?? 0) - Date.now();
  const needsRefresh = remaining < EXPIRY_BUFFER;
  const isRecentlyMinted = remaining > ACCESS_TOKEN_LIFETIME - TRUSTED_MINT_AGE;

  if (!needsRefresh && isRecentlyMinted)
    return { success: true, accessToken: record.accessToken, record };

  if (!needsRefresh) {
    const probe = await GoogleMerchantAPI.introspectAccessToken(
      record.accessToken,
    );
    const alive = probe.success ? probe.data.valid : true;
    if (alive)
      return { success: true, accessToken: record.accessToken, record };
  }

  if (!record.refreshToken)
    return {
      success: false,
      error: new RequestError(
        "Google authorization has expired. Please reconnect Google.",
      ),
    };

  return refreshAndPersist(record, record.refreshToken);
};

/**
 * Access token for ecentic's OWN advanced account (MCA) — the provider side
 * of the link handshake. Backed by the optional
 * `GOOGLE_MERCHANT_MCA_REFRESH_TOKEN` env (a one-time OAuth grant by an MCA
 * admin through the same client); absent env means provider-side approval
 * falls back to the MCA's Merchant Center UI. Cached for the token lifetime.
 */
const providerTokenCache = { accessToken: null as string | null, expiresAt: 0 };

const resolveProviderAccessToken = async (): Promise<string | null> => {
  const refreshToken = process.env.GOOGLE_MERCHANT_MCA_REFRESH_TOKEN;
  const config = GoogleMerchantAPI.configuration();
  if (!refreshToken || !config) return null;

  if (
    providerTokenCache.accessToken &&
    providerTokenCache.expiresAt - Date.now() > 5 * 60 * 1000
  )
    return providerTokenCache.accessToken;

  const refreshed = await GoogleMerchantAPI.refreshAccessToken(config, {
    refreshToken,
  });
  if (!refreshed.success) return null;

  providerTokenCache.accessToken = refreshed.data.accessToken;
  providerTokenCache.expiresAt = refreshed.data.accessTokenExpiresAt.getTime();
  return refreshed.data.accessToken;
};

/**
 * OAuth callback: exchanges the code, persists the grant on the store's
 * `google_merchant_account` row, and detects the merchant's existing Merchant
 * Center accounts. Exactly one visible account → adopted immediately; zero →
 * the merchant still needs the native plugin (UI polls {@link detectAccount});
 * several → the UI offers a picker backed by {@link selectAccount}.
 */
export const handleOAuthCallback = withAuthentication(
  async (
    context,
    { code, store: storeId }: { code: string; store: string },
  ) => {
    const config = GoogleMerchantAPI.configuration();
    if (!config)
      return { success: false, error: GoogleMerchantAPI.notConfiguredError() };

    // The user is the SESSION's, never a caller-supplied id — an exported
    // server action is a public endpoint, and a trusted `user` parameter
    // would let any caller bind a Google grant to someone else's store.
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    if (!SUPPORTED_PLATFORMS.includes(store.data.platform))
      return {
        success: false,
        error: unsupportedPlatformError(store.data.platform),
      };

    const redirectUri = `${process.env.APP_HOST}/api/integrations/google/callback`;

    const grant = await GoogleMerchantAPI.exchangeCode(config, {
      code,
      redirectUri,
    });
    if (!grant.success) return grant;

    const candidates = await detectCandidates(
      grant.data.accessToken,
      store.data,
    );
    if (!candidates.success) return candidates;

    const adoptable = adoptableCandidate(candidates.data);

    const synced = await GoogleMerchantAccount.sync(Environment.SERVER, {
      storeId,
      accessToken: grant.data.accessToken,
      accessTokenExpiresAt: grant.data.accessTokenExpiresAt,
      refreshToken: grant.data.refreshToken,
      scope: grant.data.scope,
      googleAccountId: adoptable?.id ?? null,
      candidateAccounts: candidates.data,
      linkState: "unlinked",
      path: "native",
    });
    if (!synced.success) return synced;

    context.span.addBreadcrumb({
      category: "google.oauth.exchange",
      data: {
        "store.id": storeId,
        "accounts.detected": candidates.data.length,
        "accounts.adopted": adoptable !== null,
      },
    });

    return {
      success: true,
      data: { accounts: candidates.data, adopted: adoptable !== null },
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

    const candidates = await detectCandidates(resolved.accessToken, store.data);
    if (!candidates.success) return candidates;

    const adopted =
      resolved.record.googleAccountId ??
      adoptableCandidate(candidates.data)?.id ??
      null;

    const update = await GoogleMerchantAccount.update(
      Environment.SERVER,
      resolved.record.id,
      { candidateAccounts: candidates.data, googleAccountId: adopted },
    );
    if (!update.success) return update;

    return {
      success: true,
      data: { accounts: candidates.data, adopted },
    };
  },
  "GoogleMerchant.detectAccount",
);

/**
 * Adopts one of several detected Merchant Center accounts for the store.
 * Identity check: the account's registered homepage domain must match one of
 * the store's hosts — linking a mismatched account requires the caller to
 * pass `force` (the UI shows the mismatch and asks for explicit
 * confirmation). Never silent, mirroring the domain-conflict principle.
 */
export const selectAccount = withAuthentication(
  async (
    context,
    {
      store: storeId,
      account: accountId,
      force = false,
    }: { store: string; account: string; force?: boolean },
  ) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    const candidates = await detectCandidates(resolved.accessToken, store.data);
    if (!candidates.success) return candidates;

    const candidate = candidates.data.find((entry) => entry.id === accountId);
    if (!candidate)
      return {
        success: false,
        error: new RequestError(
          "That Merchant Center account is not accessible with the connected Google login",
        ),
      };

    if (!candidate.matchesStore && !force)
      return {
        success: false,
        error: new RequestError(
          `This Merchant Center account's website (${candidate.domain ?? "not set"}) doesn't match this store (${normalizeHostname(store.data.domain)})`,
        ),
      };

    context.span.addBreadcrumb({
      category: "google.account.selected",
      data: {
        "store.id": storeId,
        "google.account": accountId,
        "domain.matches": candidate.matchesStore,
        forced: force,
      },
    });

    return GoogleMerchantAccount.update(
      Environment.SERVER,
      resolved.record.id,
      { googleAccountId: accountId, candidateAccounts: candidates.data },
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

    // Relink path: after a local-only disconnect (or a re-connect with the
    // same Google account) the accountManagement service may still be
    // established on Google — adopt it instead of proposing a duplicate.
    const existing = await reconcileLinkState(
      resolved.accessToken,
      resolved.record,
    );
    if (existing.success && existing.data.linkState === "active")
      return existing;

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
 * Session-free core of {@link checkLink}: re-reads the account's services and
 * promotes `proposed` → `active` once the merchant has approved our
 * accountManagement proposal in Merchant Center. Shared with the approval
 * poller in {@link runMaintenance}.
 */
const reconcileLinkState = async (
  accessToken: string,
  record: GoogleMerchantAccount.Type,
): Promise<
  | { success: true; data: { linkState: "unlinked" | "proposed" | "active" } }
  | { success: false; error: Error }
> => {
  const config = GoogleMerchantAPI.configuration();
  if (!config)
    return { success: false, error: GoogleMerchantAPI.notConfiguredError() };

  if (!record.googleAccountId)
    return {
      success: false,
      error: new RequestError("No Merchant Center account detected yet"),
    };

  const services = await GoogleMerchantAPI.listAccountServices(
    accessToken,
    record.googleAccountId,
  );
  if (!services.success) return services;

  // The output-only provider may read back as `providers/{id}` or
  // `accounts/{id}` (the API docs and validator disagree on the format), so
  // match on the numeric id rather than the full resource name.
  const ours = (services.data.accountServices ?? []).filter(
    (service) =>
      service.accountManagement !== undefined &&
      service.provider?.split("/").pop() === config.advancedAccountId,
  );
  const established = ours.some(
    (service) => service.handshake?.approvalState === "ESTABLISHED",
  );
  const pending = ours.find(
    (service) =>
      service.name !== undefined &&
      (service.handshake?.approvalState === "PENDING" ||
        service.handshake?.approvalState === "WAITING"),
  );

  // Merchant-credential proposals wait on the PROVIDER side of the handshake
  // (spike 3) — approve with our MCA credentials when they're configured.
  // Without them the link stays proposed until someone approves it from the
  // MCA's Merchant Center UI.
  const approved = await (async () => {
    if (established || !pending?.name) return established;
    const providerToken = await resolveProviderAccessToken();
    if (!providerToken) return false;
    const approval = await GoogleMerchantAPI.approveAccountService(
      providerToken,
      pending.name,
    );
    return approval.success;
  })();

  const linkState: "unlinked" | "proposed" | "active" = (() => {
    switch (true) {
      case established || approved:
        return "active" as const;
      case pending !== undefined:
        return "proposed" as const;
      // No trace of our service on Google: a previously-active link was
      // revoked in Merchant Center — downgrade instead of lying "active".
      default:
        return "unlinked" as const;
    }
  })();

  if (linkState !== record.linkState) {
    const update = await GoogleMerchantAccount.update(
      Environment.SERVER,
      record.id,
      { linkState },
    );
    if (!update.success) return update;
  }

  return { success: true, data: { linkState } };
};

export const checkLink = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    return reconcileLinkState(resolved.accessToken, resolved.record);
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
  | {
      success: true;
      data: { patched: boolean; confirmed: boolean; observedRule: string };
    }
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

  // Match by dataSource id, not the full resource name — read-backs may
  // normalize the account segment differently than the name we stored.
  const supplementalId = supplementalName.split("/").pop();
  const isOurs = (reference: GoogleMerchantAPI.DataSourceReference) =>
    reference.supplementalDataSourceName?.split("/").pop() === supplementalId;

  const ruleOf = (source: GoogleMerchantAPI.DataSource) =>
    source.primaryProductDataSource?.defaultRule?.takeFromDataSources ?? [];

  const hasSelf = (references: GoogleMerchantAPI.DataSourceReference[]) =>
    references.some((reference) => reference.self === true);

  // A healthy rule needs BOTH: our source first (overrides win attribute
  // conflicts) and `self` present anywhere. Google: "If `self` is missing
  // from the list of take_from_data_sources, the API will ignore attributes
  // from the primary data source itself" — a rule without self suppresses the
  // merchant's whole primary feed, the worst state this integration can
  // produce.
  const isHealthy = (references: GoogleMerchantAPI.DataSourceReference[]) =>
    references[0] !== undefined && isOurs(references[0]) && hasSelf(references);

  if (isHealthy(current))
    return {
      success: true,
      data: {
        patched: false,
        confirmed: true,
        observedRule: JSON.stringify(current),
      },
    };

  const patched = await GoogleMerchantAPI.patchDataSourceDefaultRule(
    accessToken,
    {
      name: primaryName,
      takeFromDataSources: [
        { supplementalDataSourceName: supplementalName },
        ...current.filter((reference) => !isOurs(reference)),
        ...(hasSelf(current) ? [] : [{ self: true }]),
      ],
    },
  );
  if (!patched.success) return patched;

  // The PATCH response carries the updated resource — trust it first so a
  // stale read-after-write can't fail a patch that actually landed.
  const patchedRule = ruleOf(patched.data);
  if (isHealthy(patchedRule))
    return {
      success: true,
      data: {
        patched: true,
        confirmed: true,
        observedRule: JSON.stringify(patchedRule),
      },
    };

  const confirmation = await GoogleMerchantAPI.getDataSource(
    accessToken,
    primaryName,
  );
  if (!confirmation.success) return confirmation;

  const confirmedRule = ruleOf(confirmation.data);
  const confirmed = isHealthy(confirmedRule);

  return {
    success: true,
    data: {
      patched: true,
      confirmed,
      observedRule: JSON.stringify(
        confirmedRule.length > 0 ? confirmedRule : patchedRule,
      ),
    },
  };
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

    const primaries = (sources.data.dataSources ?? []).filter(
      (source) =>
        source.primaryProductDataSource !== undefined &&
        source.name !== undefined,
    );
    const primary = primaries[0];
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

    // Wire the supplemental source into EVERY primary feed, not just the
    // first — a multi-market plugin setup runs one primary per market, and an
    // unwired primary would silently never merge our overrides.
    const rules = [];
    for (const source of primaries) {
      const rule = await ensureDefaultRule(resolved.accessToken, {
        primaryName: source.name as string,
        supplementalName: supplemental.name,
      });
      if (!rule.success) return rule;
      if (!rule.data.confirmed)
        return {
          success: false,
          error: new RequestError(
            `Primary feed rule patch did not stick on ${source.name} — the supplemental source is not first in takeFromDataSources (with self preserved). Observed rule: ${rule.data.observedRule}`,
          ),
        };
      rules.push(rule.data);
    }
    const rule = { data: { patched: rules.some((entry) => entry.patched) } };

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
    if (
      !record.googleAccountId ||
      !record.primaryDataSourceName ||
      !record.dataSourceName
    )
      return {
        success: false,
        error: new RequestError("Data sources are not provisioned yet"),
      };

    // Check EVERY primary feed live rather than only the stored one — the
    // plugin can add market feeds after provisioning, and each needs the
    // supplemental source wired in.
    const sources = await GoogleMerchantAPI.listDataSources(
      resolved.accessToken,
      record.googleAccountId,
    );
    if (!sources.success) return sources;

    const primaries = (sources.data.dataSources ?? []).filter(
      (source) =>
        source.primaryProductDataSource !== undefined &&
        source.name !== undefined,
    );

    let repaired = false;
    let healthy = true;
    for (const source of primaries) {
      const rule = await ensureDefaultRule(resolved.accessToken, {
        primaryName: source.name as string,
        supplementalName: record.dataSourceName,
      });
      if (!rule.success) return rule;
      repaired = repaired || rule.data.patched;
      healthy = healthy && rule.data.confirmed;
    }

    context.span.addBreadcrumb({
      category: "google.rule.health",
      data: {
        "store.id": storeId,
        "rule.primaries": primaries.length,
        "rule.repaired": repaired,
        "rule.confirmed": healthy,
      },
    });

    return {
      success: true as const,
      data: { repaired, healthy },
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

/**
 * Google's full offer identity — offerId alone collides across markets and
 * languages (same shopify_… id, different feedLabel per market feed).
 */
const offerKeyOf = ({
  contentLanguage,
  feedLabel,
  offerId,
}: {
  contentLanguage?: string | null;
  feedLabel?: string | null;
  offerId: string;
}) => `${contentLanguage ?? ""}~${feedLabel ?? ""}~${offerId}`;

/**
 * Google expires API product inputs that are not refreshed "at least every
 * 30 days" — unchanged inputs must be re-inserted before that. 20 days keeps
 * a 10-day cushion over the cron cadence.
 */
const INPUT_REFRESH_AGE = 20 * 24 * 60 * 60 * 1000;

/**
 * A pending offer whose insert is this old has either been rule-repaired
 * after the fact or lost by Google — a fresh insert is the reprocessing
 * lever either way (spike 1), and without it a repaired rule never converges.
 */
const PENDING_NUDGE_AGE = 48 * 60 * 60 * 1000;

const needsRefresh = (offer: GoogleMerchantOffer.Type) => {
  if (!offer.pushedAt) return true;
  const age = Date.now() - offer.pushedAt.getTime();
  if (age > INPUT_REFRESH_AGE) return true;
  return offer.status === "pending" && age > PENDING_NUDGE_AGE;
};

/**
 * Hash of the pushed input body for skip-if-unchanged idempotency. Callers
 * pass the bare attributes object when no UCP custom attributes ride along —
 * keeping those hashes byte-identical to pre-UCP pushes so enabling the
 * feature does not re-push every unchanged offer.
 */
const attributesHash = (body: unknown) =>
  crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");

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
          ucpProducts: 0,
          removedStale: 0,
          policyBlocked: [],
          ucpWarnings: [],
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

    const ucpRows = await GoogleMerchantUcp.find(Environment.SERVER, {
      where: eq(schema.googleMerchantUcp.storeId, storeId),
    });
    if (!ucpRows.success) return ucpRows;

    const ucpByProduct = new Map(
      ucpRows.data.map((row) => [row.productId, row]),
    );

    const existingOffers = await GoogleMerchantOffer.find(Environment.SERVER, {
      where: eq(schema.googleMerchantOffer.storeId, storeId),
    });
    if (!existingOffers.success) return existingOffers;

    const existingByKey = new Map(
      existingOffers.data.map((offer) => [offer.offerKey, offer]),
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
    let ucpProducts = 0;
    let removedStale = 0;
    const policyBlocked: { productId: string; issues: string[] }[] = [];
    const ucpWarnings: { productId: string; issues: string[] }[] = [];
    const errors: string[] = [];
    /** Products that still have something to push — rows outside this set are
     * stale and their inputs get deleted below. */
    const configuredProducts = new Set<string>();

    for (const product of withExternalId) {
      const optimization = optimizationByProduct.get(product.id);
      const ucp = ucpByProduct.get(product.id) ?? null;
      const hasOverride = Boolean(
        optimization?.proposedTitle || optimization?.proposedDescription,
      );
      // A product participates when it has a published override, UCP checkout
      // settings, or both — one insert per offer carries everything, since an
      // insert fully replaces the previous input in the supplemental source.
      if (!hasOverride && !ucp) continue;
      configuredProducts.add(product.id);

      const attributes: GoogleMerchantAPI.ProductInputAttributes = {
        ...(optimization?.proposedTitle
          ? { title: optimization.proposedTitle }
          : {}),
        ...(optimization?.proposedDescription
          ? { description: optimization.proposedDescription }
          : {}),
      };

      const ucpAttributes: GoogleMerchantAPI.UcpAttributes | null = ucp
        ? {
            checkoutEligible: ucp.checkoutEligible,
            noticeType: ucp.noticeType,
            noticeMessage: ucp.noticeMessage,
            merchantItemId: ucp.merchantItemId,
          }
        : null;

      const lint = GoogleMerchantAPI.lintOverrideAttributes(attributes);
      const ucpLint = ucpAttributes
        ? GoogleMerchantAPI.lintUcpAttributes(ucpAttributes, {
            title: product.title,
            description: product.description ?? undefined,
          })
        : { errors: [], warnings: [] };

      if (lint.length > 0 || ucpLint.errors.length > 0) {
        policyBlocked.push({
          productId: product.id,
          issues: [...lint, ...ucpLint.errors].map((issue) => issue.code),
        });
        continue;
      }

      // Restricted-category heuristics warn but never block — the merchant
      // knows their catalog; we surface the risk and push what they chose.
      if (ucpLint.warnings.length > 0)
        ucpWarnings.push({
          productId: product.id,
          issues: ucpLint.warnings.map((issue) => issue.code),
        });

      const customAttributes = ucpAttributes
        ? GoogleMerchantAPI.buildUcpCustomAttributes(ucpAttributes)
        : undefined;

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
      if (customAttributes) ucpProducts += 1;

      // Bare-attributes hash when no UCP settings ride along, so pre-UCP
      // hashes stay valid and enabling the feature never mass re-pushes.
      const hash = customAttributes
        ? attributesHash({ attributes, customAttributes })
        : attributesHash(attributes);

      for (const offer of matching) {
        const offerId = offer.offerId as string;
        const offerKey = offerKeyOf({
          contentLanguage: offer.contentLanguage,
          feedLabel: offer.feedLabel,
          offerId,
        });

        const existing = existingByKey.get(offerKey);
        // Skip only when the body is unchanged AND the input is fresh —
        // Google expires unrefreshed API inputs, and re-inserting is also the
        // reprocessing lever for offers stuck pending after a rule repair.
        if (
          existing &&
          existing.attributesHash === hash &&
          existing.status !== "error" &&
          !needsRefresh(existing)
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
            customAttributes,
          },
        );

        const synced = await GoogleMerchantOffer.sync(Environment.SERVER, {
          storeId,
          productId: product.id,
          offerId,
          offerKey,
          feedLabel: offer.feedLabel ?? null,
          contentLanguage: offer.contentLanguage ?? null,
          inputName: insertion.success
            ? (insertion.data.name ?? existing?.inputName ?? null)
            : (existing?.inputName ?? null),
          attributesHash: hash,
          status: insertion.success ? "pending" : "error",
          error: insertion.success ? null : insertion.error.message,
          pushedAt: insertion.success ? new Date() : null,
          // Google-clock baseline for verification: reprocessing is detected
          // by this value advancing, never by comparing Google's clock to our
          // own (which skews by more than the insert-to-reprocess latency).
          lastUpdateDate: offer.productStatus?.lastUpdateDate ?? null,
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

    // Stale cleanup: offer rows whose product no longer has any override or
    // UCP configuration. Without productInputs.delete the last-pushed title
    // or eligibility flag would sit on Google until the 30-day expiry.
    for (const row of existingOffers.data) {
      if (configuredProducts.has(row.productId)) continue;

      if (row.inputName) {
        const deleted = await GoogleMerchantAPI.deleteProductInput(
          resolved.accessToken,
          { name: row.inputName, dataSourceName: record.dataSourceName },
        );
        // A 404 means the input is already gone (expired or hand-deleted) —
        // that is the desired end state, not a failure.
        if (!deleted.success && !/404|not found/i.test(deleted.error.message)) {
          errors.push(`${row.offerId}: cleanup — ${deleted.error.message}`);
          continue;
        }
      }
      // Rows pushed before inputName existed can't be deleted remotely; drop
      // the row anyway — the orphan input expires on Google within 30 days.

      const destroyed = await GoogleMerchantOffer.destroy(
        Environment.SERVER,
        row.id,
      );
      if (!destroyed.success) return destroyed;
      removedStale += 1;
    }

    context.span.addBreadcrumb({
      category: "google.overrides.pushed",
      data: {
        "store.id": storeId,
        "overrides.pushed": pushed,
        "overrides.skipped": skippedUnchanged,
        "products.matched": matchedProducts,
        "products.unmatched": unmatchedProducts,
        "products.ucp": ucpProducts,
        "products.policy_blocked": policyBlocked.length,
        "overrides.removed_stale": removedStale,
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
        ucpProducts,
        removedStale,
        policyBlocked,
        ucpWarnings,
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

    // Google repeats each issue once per reporting context (Shopping ads,
    // free listings, …) — collapse to one row per (offer, code, attribute).
    const itemIssues = [
      ...new Map(
        offers.data
          .flatMap((offer) =>
            (offer.productStatus?.itemLevelIssues ?? []).map((issue) => ({
              offerId: offer.offerId ?? null,
              code: issue.code ?? null,
              severity: issue.severity ?? null,
              description: issue.description ?? null,
              attribute: issue.attribute ?? null,
            })),
          )
          .map((issue) => [
            `${issue.offerId}:${issue.code}:${issue.attribute}`,
            issue,
          ]),
      ).values(),
    ];

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

export type CurrentReturnPolicy = {
  countries: string[];
  /** null = no day-based window (lifetime, or no window at all). */
  windowDays: number | null;
  lifetime: boolean;
  policyUrl: string | null;
  returnMethods: string[];
  itemConditions: string[];
  customerPaysShipping: boolean;
  processRefundDays: number | null;
};

export type UcpReadiness = {
  /** null = homepage read failed (unset homepages 404) — treat as unknown. */
  homepage: { claimed: boolean; uri: string | null } | null;
  returnPolicy: {
    configured: boolean;
    count: number;
    /** Some policy defines a return window (days after delivery / lifetime). */
    hasWindow: boolean;
    /** Some policy links to the full policy text. */
    hasPolicyLink: boolean;
    /** Some policy states the return shipping cost — Google's UCP checklist
     * requires cost alongside window and link. */
    hasCost: boolean;
    /** The default (unlabeled) policy, for prefilling the replace form. */
    current: CurrentReturnPolicy | null;
  };
  customerSupport: {
    configured: boolean;
    methods: string[];
    email: string | null;
    uri: string | null;
    phone: string | null;
  };
  offers: {
    total: number;
    /** Approved specifically for free listings — the UCP prerequisite. */
    approved: number;
    /** Disapproved in free listings or the UCP checkout context. */
    disapproved: number;
    /** Approved in FREE_LISTINGS_UCP_CHECKOUT — actually accepted into
     * agentic checkout, the end state (attribute merge alone isn't it). */
    ucpCheckoutApproved: number;
    /** Offers whose merged view already carries our `native_commerce` flag. */
    checkoutAttributeLive: number;
  };
  ready: boolean;
};

/**
 * Audits Google's UCP agentic-checkout prerequisites that are readable via
 * the Merchant API (docs/integrations/google-ucp.md): claimed homepage,
 * return policy with a window and a full-policy link, at least one customer
 * support contact, and approved offers. Everything else on Google's checklist
 * (waitlist, Google Pay handler, checkout rails) is not API-auditable — the
 * UI renders those as static informational items.
 */
export const getUcpReadiness = withAuthentication(
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

    const [homepage, returnPolicies, businessInfo, offers] = await Promise.all([
      GoogleMerchantAPI.getHomepage(
        resolved.accessToken,
        record.googleAccountId,
      ),
      GoogleMerchantAPI.listReturnPolicies(
        resolved.accessToken,
        record.googleAccountId,
      ),
      GoogleMerchantAPI.getBusinessInfo(
        resolved.accessToken,
        record.googleAccountId,
      ),
      GoogleMerchantAPI.listProducts(
        resolved.accessToken,
        record.googleAccountId,
      ),
    ]);
    if (!returnPolicies.success) return returnPolicies;
    if (!businessInfo.success) return businessInfo;
    if (!offers.success) return offers;

    const policies = returnPolicies.data.onlineReturnPolicies ?? [];
    const defaultPolicy = policies.find((policy) => !policy.label) ?? null;
    const returnPolicy = {
      configured: policies.length > 0,
      count: policies.length,
      hasWindow: policies.some(
        (policy) =>
          policy.policy?.type === "LIFETIME_RETURNS" ||
          (policy.policy?.type === "NUMBER_OF_DAYS_AFTER_DELIVERY" &&
            Boolean(policy.policy.days)),
      ),
      hasPolicyLink: policies.some((policy) => Boolean(policy.returnPolicyUri)),
      hasCost: policies.some((policy) =>
        Boolean(policy.returnShippingFee?.type),
      ),
      current: defaultPolicy
        ? {
            countries: defaultPolicy.countries ?? [],
            windowDays:
              defaultPolicy.policy?.type === "NUMBER_OF_DAYS_AFTER_DELIVERY"
                ? Number(defaultPolicy.policy.days) || null
                : null,
            lifetime: defaultPolicy.policy?.type === "LIFETIME_RETURNS",
            policyUrl: defaultPolicy.returnPolicyUri ?? null,
            returnMethods: defaultPolicy.returnMethods ?? [],
            itemConditions: defaultPolicy.itemConditions ?? [],
            customerPaysShipping:
              defaultPolicy.returnShippingFee?.type ===
              "CUSTOMER_PAYING_ACTUAL_FEE",
            processRefundDays: defaultPolicy.processRefundDays ?? null,
          }
        : null,
    };

    const service = businessInfo.data.customerService;
    const methods = [
      ...(service?.uri ? ["website"] : []),
      ...(service?.email ? ["email"] : []),
      ...(service?.phone?.e164Number ? ["phone"] : []),
    ];

    // Context-specific counts: general free-listings approval is the UCP
    // prerequisite; FREE_LISTINGS_UCP_CHECKOUT approval is the end state —
    // an offer actually accepted into agentic checkout. Any-context approval
    // (e.g. Shopping ads only) would overstate readiness.
    const countByContext = (
      contexts: string[],
      field: "approvedCountries" | "disapprovedCountries",
    ) =>
      offers.data.filter((offer) =>
        (offer.productStatus?.destinationStatuses ?? []).some(
          (destination) =>
            contexts.includes(destination.reportingContext ?? "") &&
            (destination[field] ?? []).length > 0,
        ),
      ).length;

    const approved = countByContext(["FREE_LISTINGS"], "approvedCountries");
    const disapproved = countByContext(
      ["FREE_LISTINGS", "FREE_LISTINGS_UCP_CHECKOUT"],
      "disapprovedCountries",
    );
    const ucpCheckoutApproved = countByContext(
      ["FREE_LISTINGS_UCP_CHECKOUT"],
      "approvedCountries",
    );
    const checkoutAttributeLive = offers.data.filter((offer) =>
      (offer.customAttributes ?? []).some(
        (attribute) =>
          // Google's processed view spells it "native commerce".
          GoogleMerchantAPI.normalizeCustomAttributeToken(attribute.name) ===
          "native commerce",
      ),
    ).length;

    const readiness: UcpReadiness = {
      homepage: homepage.success
        ? {
            claimed: homepage.data.claimed ?? false,
            uri: homepage.data.uri ?? null,
          }
        : null,
      returnPolicy,
      customerSupport: {
        configured: methods.length > 0,
        methods,
        email: service?.email ?? null,
        uri: service?.uri ?? null,
        phone: service?.phone?.e164Number ?? null,
      },
      offers: {
        total: offers.data.length,
        approved,
        disapproved,
        ucpCheckoutApproved,
        checkoutAttributeLive,
      },
      ready:
        (homepage.success ? (homepage.data.claimed ?? false) : false) &&
        returnPolicy.configured &&
        returnPolicy.hasWindow &&
        returnPolicy.hasPolicyLink &&
        returnPolicy.hasCost &&
        methods.length > 0 &&
        approved > 0,
    };

    context.span.addBreadcrumb({
      category: "google.ucp.readiness",
      data: {
        "store.id": storeId,
        "ucp.ready": readiness.ready,
        "ucp.return_policies": returnPolicy.count,
        "ucp.support_methods": methods.length,
        "ucp.offers.approved": approved,
        "ucp.offers.ucp_checkout_approved": ucpCheckoutApproved,
        "ucp.offers.checkout_attribute_live": checkoutAttributeLive,
      },
    });

    return { success: true as const, data: readiness };
  },
  "GoogleMerchant.getUcpReadiness",
);

const E164_PATTERN = /^\+[1-9]\d{6,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

/**
 * Writes the account's customer-service contact to Merchant Center — the
 * "Contact Merchant" link on Google's order confirmation, and one of the UCP
 * checkout prerequisites. At least one contact method is required (Google's
 * own rule). The PATCH replaces the whole customerService object, so this is
 * a full set, not a merge.
 */
export const setCustomerSupport = withAuthentication(
  async (
    context,
    {
      store: storeId,
      email,
      uri,
      phone,
    }: {
      store: string;
      email?: string | null;
      uri?: string | null;
      phone?: string | null;
    },
  ) => {
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

    const trimmedEmail = email?.trim() || null;
    const trimmedUri = uri?.trim() || null;
    const trimmedPhone = phone?.trim() || null;

    if (!trimmedEmail && !trimmedUri && !trimmedPhone)
      return {
        success: false,
        error: new RequestError(
          "Provide at least one contact method — website, email, or phone",
        ),
      };
    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail))
      return {
        success: false,
        error: new RequestError("Enter a valid customer service email"),
      };
    if (trimmedUri && !/^https?:\/\//.test(trimmedUri))
      return {
        success: false,
        error: new RequestError(
          "The customer service URL must start with http:// or https://",
        ),
      };
    if (trimmedPhone && !E164_PATTERN.test(trimmedPhone))
      return {
        success: false,
        error: new RequestError(
          "Enter the phone in international format, e.g. +15551234567",
        ),
      };

    const updated = await GoogleMerchantAPI.updateCustomerService(
      resolved.accessToken,
      record.googleAccountId,
      {
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        ...(trimmedUri ? { uri: trimmedUri } : {}),
        ...(trimmedPhone ? { phone: { e164Number: trimmedPhone } } : {}),
      },
    );
    if (!updated.success) return updated;

    // Google's reads can lag the write by a moment. Hold the action until the
    // contact is visible to the same read the readiness audit uses, so the
    // client's post-submit refresh re-renders with the row already green.
    for (const _ of Array.from({ length: 5 })) {
      const visible = await GoogleMerchantAPI.getBusinessInfo(
        resolved.accessToken,
        record.googleAccountId,
      );
      const service = visible.success ? visible.data.customerService : null;
      if (service?.email || service?.uri || service?.phone?.e164Number) break;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    context.span.addBreadcrumb({
      category: "google.ucp.customer_support_set",
      data: {
        "store.id": storeId,
        "support.email": Boolean(trimmedEmail),
        "support.uri": Boolean(trimmedUri),
        "support.phone": Boolean(trimmedPhone),
      },
    });

    return { success: true as const, data: updated.data.customerService ?? {} };
  },
  "GoogleMerchant.setCustomerSupport",
);

/**
 * Creates the account's default return policy from ecentic. Create-only by
 * design: the Merchant API has no update/patch for return policies, so when
 * an unlabeled policy already covers a requested country we refuse instead of
 * silently deleting a merchant-authored policy — edits happen in Merchant
 * Center. The content (window, URL, fees) is the merchant's input; ecentic
 * only transports it.
 */
export const setReturnPolicy = withAuthentication(
  async (
    context,
    {
      store: storeId,
      countries,
      windowDays,
      policyUrl,
      returnMethods,
      itemConditions,
      customerPaysShipping,
      processRefundDays,
      replace,
    }: {
      store: string;
      /** ISO 3166 2-letter codes, e.g. ["US"]. */
      countries: string[];
      /** null = lifetime returns. */
      windowDays: number | null;
      policyUrl: string;
      returnMethods: ("BY_MAIL" | "IN_STORE" | "AT_A_KIOSK")[];
      itemConditions: ("NEW" | "USED")[];
      customerPaysShipping: boolean;
      /** Days the business takes to process a refund (live-required). */
      processRefundDays: number;
      /**
       * Delete conflicting default policies before creating. The API has no
       * update — replace is the only edit mechanism, so it must be an
       * explicit merchant choice, never a silent default.
       */
      replace?: boolean;
    },
  ) => {
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

    const normalizedCountries = countries.map((country) =>
      country.trim().toUpperCase(),
    );
    if (
      normalizedCountries.length === 0 ||
      normalizedCountries.some((country) => !COUNTRY_CODE_PATTERN.test(country))
    )
      return {
        success: false,
        error: new RequestError(
          "Countries must be 2-letter ISO codes, e.g. US, GB, DE",
        ),
      };
    if (!/^https?:\/\//.test(policyUrl.trim()))
      return {
        success: false,
        error: new RequestError(
          "The return policy URL must start with http:// or https://",
        ),
      };
    if (windowDays !== null && (windowDays < 1 || windowDays > 365))
      return {
        success: false,
        error: new RequestError("Return window must be between 1 and 365 days"),
      };
    if (returnMethods.length === 0 || itemConditions.length === 0)
      return {
        success: false,
        error: new RequestError(
          "Pick at least one return method and one accepted item condition",
        ),
      };
    if (processRefundDays < 1 || processRefundDays > 60)
      return {
        success: false,
        error: new RequestError(
          "Refund processing time must be between 1 and 60 days",
        ),
      };

    const existing = await GoogleMerchantAPI.listReturnPolicies(
      resolved.accessToken,
      record.googleAccountId,
    );
    if (!existing.success) return existing;

    const conflicting = (existing.data.onlineReturnPolicies ?? []).filter(
      (policy) =>
        !policy.label &&
        (policy.countries ?? []).some((country) =>
          normalizedCountries.includes(country),
        ),
    );
    if (conflicting.length > 0 && !replace)
      return {
        success: false,
        error: new RequestError(
          `A default return policy already covers ${conflicting
            .flatMap((policy) => policy.countries ?? [])
            .join(
              ", ",
            )} — submit again with replace to overwrite it (the API cannot update policies in place)`,
        ),
      };

    // Replace = delete-and-recreate, the only edit the API offers. Only ever
    // reached on the merchant's explicit submit. The deleted bodies are kept
    // so a failed create can restore them — never leave the merchant with no
    // policy at all.
    const removedPolicies: GoogleMerchantAPI.OnlineReturnPolicy[] = [];
    for (const policy of conflicting) {
      if (!policy.name) continue;
      const deleted = await GoogleMerchantAPI.deleteReturnPolicy(
        resolved.accessToken,
        policy.name,
      );
      if (!deleted.success) return deleted;
      removedPolicies.push(policy);
    }

    // Free return shipping must be an explicit zero price (live validator);
    // the currency rides along for display, taken from the store's catalog.
    const firstProduct = await resultify(async () =>
      db.query.product.findFirst({ where: { storeId } }),
    );
    const currencyCode =
      (firstProduct.success ? firstProduct.data?.currency : null) ?? "USD";

    const created = await GoogleMerchantAPI.createReturnPolicy(
      resolved.accessToken,
      record.googleAccountId,
      {
        countries: normalizedCountries,
        policy:
          windowDays === null
            ? { type: "LIFETIME_RETURNS" }
            : {
                type: "NUMBER_OF_DAYS_AFTER_DELIVERY",
                days: String(windowDays),
              },
        returnPolicyUri: policyUrl.trim(),
        returnMethods,
        itemConditions,
        returnShippingFee: customerPaysShipping
          ? { type: "CUSTOMER_PAYING_ACTUAL_FEE" }
          : { type: "FIXED", fixedFee: { amountMicros: "0", currencyCode } },
        processRefundDays,
        // Who supplies the return label; download-and-print is the common
        // default for BY_MAIL and accepted alongside the other methods.
        returnLabelSource: "DOWNLOAD_AND_PRINT",
      },
    );
    if (!created.success) {
      // Best-effort rollback of the replace: recreate what was deleted from
      // the captured bodies so the merchant is not left without a policy.
      const restoredAll = await (async () => {
        for (const policy of removedPolicies) {
          const restored = await GoogleMerchantAPI.createReturnPolicy(
            resolved.accessToken,
            record.googleAccountId as string,
            {
              countries: policy.countries ?? [],
              policy:
                policy.policy?.type === "LIFETIME_RETURNS"
                  ? { type: "LIFETIME_RETURNS" }
                  : {
                      type: "NUMBER_OF_DAYS_AFTER_DELIVERY",
                      days: policy.policy?.days ?? "30",
                    },
              returnPolicyUri: policy.returnPolicyUri ?? "",
              returnMethods: (policy.returnMethods ?? [
                "BY_MAIL",
              ]) as GoogleMerchantAPI.ReturnPolicyInput["returnMethods"],
              itemConditions: (policy.itemConditions ?? [
                "NEW",
              ]) as GoogleMerchantAPI.ReturnPolicyInput["itemConditions"],
              returnShippingFee:
                policy.returnShippingFee?.type === "CUSTOMER_PAYING_ACTUAL_FEE"
                  ? { type: "CUSTOMER_PAYING_ACTUAL_FEE" }
                  : {
                      type: "FIXED",
                      fixedFee: {
                        amountMicros:
                          policy.returnShippingFee?.fixedFee?.amountMicros ??
                          "0",
                        currencyCode:
                          policy.returnShippingFee?.fixedFee?.currencyCode ??
                          currencyCode,
                      },
                    },
              processRefundDays: policy.processRefundDays ?? 14,
              returnLabelSource:
                (policy.returnLabelSource as
                  | GoogleMerchantAPI.ReturnPolicyInput["returnLabelSource"]
                  | undefined) ?? "DOWNLOAD_AND_PRINT",
            },
          );
          if (!restored.success) return false;
        }
        return true;
      })();

      return {
        success: false,
        error: new RequestError(
          removedPolicies.length === 0
            ? created.error.message
            : `${created.error.message} — ${
                restoredAll
                  ? "the previous policy was restored"
                  : "the previous policy could NOT be fully restored; re-create it in Merchant Center"
              }`,
        ),
      };
    }

    // Google's list lags the create by a moment. Hold the action until the
    // new policy is visible to the readiness audit's read, so the client's
    // post-submit refresh re-renders with the row already green.
    for (const _ of Array.from({ length: 5 })) {
      const visible = await GoogleMerchantAPI.listReturnPolicies(
        resolved.accessToken,
        record.googleAccountId,
      );
      if (
        visible.success &&
        (visible.data.onlineReturnPolicies ?? []).some(
          (policy) => policy.name === created.data.name,
        )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    context.span.addBreadcrumb({
      category: "google.ucp.return_policy_created",
      data: {
        "store.id": storeId,
        "policy.countries": normalizedCountries.join(","),
        "policy.window_days": windowDays ?? "lifetime",
      },
    });

    return { success: true as const, data: created.data };
  },
  "GoogleMerchant.setReturnPolicy",
);

export type UcpProduct = {
  id: string;
  title: string;
  ucp: {
    checkoutEligible: boolean;
    noticeType: "legal_disclaimer" | "safety_warning" | "prop_65" | null;
    noticeMessage: string | null;
    merchantItemId: string | null;
  } | null;
  /** Restricted-category heuristic hits — pre-computed so the UI can warn
   * before the merchant even toggles eligibility on. */
  restrictedHints: string[];
  offers: { live: number; pending: number; error: number };
};

/** The store's products with their UCP checkout settings and offer state. */
export const getUcpProducts = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const [products, ucpRows, offerRows] = await Promise.all([
      Product.find(Environment.SERVER, {
        where: and(
          eq(schema.product.storeId, storeId),
          eq(schema.product.status, "active"),
        ),
      }),
      GoogleMerchantUcp.find(Environment.SERVER, {
        where: eq(schema.googleMerchantUcp.storeId, storeId),
      }),
      GoogleMerchantOffer.find(Environment.SERVER, {
        where: eq(schema.googleMerchantOffer.storeId, storeId),
      }),
    ]);
    if (!products.success) return products;
    if (!ucpRows.success) return ucpRows;
    if (!offerRows.success) return offerRows;

    const ucpByProduct = new Map(
      ucpRows.data.map((row) => [row.productId, row]),
    );
    const offersByProduct = new Map<string, UcpProduct["offers"]>();
    for (const offer of offerRows.data) {
      const counts = offersByProduct.get(offer.productId) ?? {
        live: 0,
        pending: 0,
        error: 0,
      };
      switch (true) {
        case offer.status === "live":
          counts.live += 1;
          break;
        case offer.status === "pending":
          counts.pending += 1;
          break;
        default:
          counts.error += 1;
      }
      offersByProduct.set(offer.productId, counts);
    }

    const data: UcpProduct[] = products.data
      .filter((product) => product.externalId !== null)
      .map((product) => {
        const ucp = ucpByProduct.get(product.id) ?? null;
        const hints = GoogleMerchantAPI.lintUcpAttributes(
          { checkoutEligible: true },
          {
            title: product.title,
            description: product.description ?? undefined,
          },
        ).warnings.map((warning) => warning.code);

        return {
          id: product.id,
          title: product.title,
          ucp: ucp
            ? {
                checkoutEligible: ucp.checkoutEligible,
                noticeType: ucp.noticeType,
                noticeMessage: ucp.noticeMessage,
                merchantItemId: ucp.merchantItemId,
              }
            : null,
          restrictedHints: hints,
          offers: offersByProduct.get(product.id) ?? {
            live: 0,
            pending: 0,
            error: 0,
          },
        };
      });

    return { success: true as const, data };
  },
  "GoogleMerchant.getUcpProducts",
);

/**
 * Saves a product's UCP checkout settings. Lint errors (malformed consumer
 * notices) reject the save; restricted-category heuristics come back as
 * warnings — the merchant's call, and the push surfaces them again. Settings
 * reach Google on the next {@link pushOverrides} run.
 */
export const setUcpProduct = withAuthentication(
  async (
    context,
    {
      store: storeId,
      product: productId,
      checkoutEligible,
      noticeType,
      noticeMessage,
      merchantItemId,
    }: {
      store: string;
      product: string;
      checkoutEligible: boolean;
      noticeType?: "legal_disclaimer" | "safety_warning" | "prop_65" | null;
      noticeMessage?: string | null;
      merchantItemId?: string | null;
    },
  ) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const product = await Product.get(Environment.SERVER, productId);
    if (!product.success) return product;
    if (!product.data || product.data.storeId !== storeId)
      return {
        success: false,
        error: new RequestError("Product not found in this store"),
      };

    const ucpAttributes: GoogleMerchantAPI.UcpAttributes = {
      checkoutEligible,
      noticeType: noticeType ?? null,
      noticeMessage: noticeMessage ?? null,
      merchantItemId: merchantItemId ?? null,
    };

    const lint = GoogleMerchantAPI.lintUcpAttributes(ucpAttributes, {
      title: product.data.title,
      description: product.data.description ?? undefined,
    });
    if (lint.errors.length > 0)
      return {
        success: false,
        error: new RequestError(
          lint.errors.map((issue) => issue.message).join("; "),
        ),
      };

    const synced = await GoogleMerchantUcp.sync(Environment.SERVER, {
      storeId,
      productId,
      checkoutEligible,
      noticeType: noticeType ?? null,
      noticeMessage: noticeMessage ?? null,
      merchantItemId: merchantItemId ?? null,
    });
    if (!synced.success) return synced;

    context.span.addBreadcrumb({
      category: "google.ucp.product_saved",
      data: {
        "store.id": storeId,
        "product.id": productId,
        "ucp.eligible": checkoutEligible,
        "ucp.warnings": lint.warnings.length,
      },
    });

    return {
      success: true as const,
      data: { warnings: lint.warnings.map((issue) => issue.code) },
    };
  },
  "GoogleMerchant.setUcpProduct",
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
const runVerification = async (
  accessToken: string,
  record: GoogleMerchantAccount.Type,
): Promise<
  | {
      success: true;
      data: {
        verified: number;
        awaitingReprocess: number;
        reprocessedWithoutMerge: number;
        missingOffers: number;
        disapproved: number;
      };
    }
  | { success: false; error: Error }
> => {
  const { storeId } = record;
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
        disapproved: 0,
      },
    };

  const optimizations = await db.query.listingOptimization.findMany({
    where: {
      status: "published",
      productId: { in: pending.data.map((offer) => offer.productId) },
    },
  });
  const optimizationByProduct = new Map(
    optimizations.map((optimization) => [optimization.productId, optimization]),
  );

  const ucpRows = await GoogleMerchantUcp.find(Environment.SERVER, {
    where: eq(schema.googleMerchantUcp.storeId, storeId),
  });
  if (!ucpRows.success) return ucpRows;

  const ucpByProduct = new Map(ucpRows.data.map((row) => [row.productId, row]));

  const offers = await GoogleMerchantAPI.listProducts(
    accessToken,
    record.googleAccountId,
  );
  if (!offers.success) return offers;

  const processedByKey = new Map(
    offers.data
      .filter((offer) => offer.offerId !== undefined)
      .map((offer) => [
        offerKeyOf({
          contentLanguage: offer.contentLanguage,
          feedLabel: offer.feedLabel,
          offerId: offer.offerId as string,
        }),
        offer,
      ]),
  );

  let verified = 0;
  let awaitingReprocess = 0;
  let reprocessedWithoutMerge = 0;
  let missingOffers = 0;
  let disapproved = 0;

  for (const row of pending.data) {
    const processed = processedByKey.get(row.offerKey);
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
    const optimization = optimizationByProduct.get(row.productId);
    const ucp = ucpByProduct.get(row.productId);

    // The processed attributes carrying our push IS the merge — flip to live
    // on that evidence alone, no timestamp gate. Timestamps only decide how
    // to classify a NOT-merged offer below. EVERY pushed piece contributes
    // its own check (null = that piece wasn't pushed) and all present checks
    // must pass: title AND description when both were overridden, and each
    // UCP custom attribute we sent (eligibility value, consumer notice,
    // checkout item id).
    // Compare through Google's normalization (underscores → spaces, dropped
    // group prefixes) — the pushed spelling never matches the processed view.
    const normalized = GoogleMerchantAPI.normalizeCustomAttributeToken;
    const merchantAttributes = processed.customAttributes ?? [];
    const hasGroupValue = (
      attributeName: string,
      groupName: string,
      expected: string,
    ) =>
      merchantAttributes.some(
        (attribute) =>
          normalized(attribute.name) === normalized(attributeName) &&
          (attribute.groupValues ?? []).some(
            (group) =>
              GoogleMerchantAPI.customAttributeGroupMatches(
                groupName,
                group.name,
              ) && normalized(group.value ?? "") === normalized(expected),
          ),
      );

    const checks = [
      optimization?.proposedTitle
        ? processed.productAttributes?.title === optimization.proposedTitle
        : null,
      optimization?.proposedDescription
        ? processed.productAttributes?.description ===
          optimization.proposedDescription
        : null,
      ucp
        ? hasGroupValue(
            "native_commerce",
            "checkout_eligibility",
            ucp.checkoutEligible ? "true" : "false",
          )
        : null,
      ucp?.noticeType && ucp.noticeMessage
        ? hasGroupValue("consumer_notice", "notice_type", ucp.noticeType)
        : null,
      ucp?.merchantItemId
        ? merchantAttributes.some(
            (attribute) =>
              normalized(attribute.name) === "merchant item id" &&
              attribute.value === ucp.merchantItemId,
          )
        : null,
    ].filter((check) => check !== null);
    const merged = checks.length > 0 && checks.every(Boolean);

    if (merged) {
      // Merged is necessary but not sufficient — a merged offer that Google
      // then disapproves (in free listings or the UCP checkout context) must
      // surface as needs-attention, not sit green.
      const isDisapproved = (
        processed.productStatus?.destinationStatuses ?? []
      ).some(
        (destination) =>
          (destination.reportingContext === "FREE_LISTINGS" ||
            destination.reportingContext === "FREE_LISTINGS_UCP_CHECKOUT") &&
          (destination.disapprovedCountries ?? []).length > 0,
      );

      if (isDisapproved) disapproved += 1;
      else verified += 1;

      const flipped = await GoogleMerchantOffer.update(
        Environment.SERVER,
        row.id,
        {
          status: isDisapproved ? "disapproved" : "live",
          verifiedAt: new Date(),
          lastUpdateDate,
        },
      );
      if (!flipped.success) return flipped;
      continue;
    }

    // Not merged: has Google even reprocessed since the push? Compare
    // Google's clock against the Google-clock baseline captured at push time
    // — never against our own `pushedAt`, which Google's processing
    // timestamp can precede (observed live: an insert-triggered reprocess
    // was stamped ~1s BEFORE our post-insert wall clock).
    const baseline = row.lastUpdateDate;
    const reprocessed =
      lastUpdateDate !== null &&
      (baseline !== null
        ? new Date(lastUpdateDate).getTime() > new Date(baseline).getTime()
        : row.pushedAt !== null &&
          new Date(lastUpdateDate).getTime() > row.pushedAt.getTime());

    if (!reprocessed) {
      awaitingReprocess += 1;
      continue;
    }

    reprocessedWithoutMerge += 1;
    const stamped = await GoogleMerchantOffer.update(
      Environment.SERVER,
      row.id,
      { lastUpdateDate },
    );
    if (!stamped.success) return stamped;
  }

  return {
    success: true as const,
    data: {
      verified,
      awaitingReprocess,
      reprocessedWithoutMerge,
      missingOffers,
      disapproved,
    },
  };
};

export const verifyOverrides = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    const verification = await runVerification(
      resolved.accessToken,
      resolved.record,
    );
    if (!verification.success) return verification;

    context.span.addBreadcrumb({
      category: "google.overrides.verified",
      data: {
        "store.id": storeId,
        "overrides.verified": verification.data.verified,
        "overrides.awaiting": verification.data.awaitingReprocess,
        "overrides.unmerged": verification.data.reprocessedWithoutMerge,
        "overrides.missing": verification.data.missingOffers,
      },
    });

    return verification;
  },
  "GoogleMerchant.verifyOverrides",
);

/**
 * Full unlink: best-effort teardown of everything ecentic created on the
 * merchant's Google account — remove our entry from the primary feed's rule,
 * delete the supplemental data source (which removes its product inputs;
 * ordering matters, a referenced supplemental cannot be deleted), reject the
 * accountManagement service (reject works on established links) — then drop
 * the local offer rows and credentials. Google-side failures degrade to
 * warnings so a revoked token can never strand the local state; the merchant
 * can always finish cleanup in Merchant Center. Reconnecting afterwards runs
 * the normal flow from scratch.
 */
export const disconnect = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const account = await linkedAccount(storeId);
    if (!account.success) return account;
    const record = account.data;

    const warnings: string[] = [];

    const resolved = await resolveAccessToken(storeId);
    if (resolved.success) {
      const { accessToken } = resolved;

      if (record.primaryDataSourceName && record.dataSourceName) {
        const primary = await GoogleMerchantAPI.getDataSource(
          accessToken,
          record.primaryDataSourceName,
        );
        if (primary.success) {
          const current =
            primary.data.primaryProductDataSource?.defaultRule
              ?.takeFromDataSources ?? [];
          const supplementalId = record.dataSourceName.split("/").pop();
          const remaining = current.filter(
            (reference) =>
              reference.supplementalDataSourceName?.split("/").pop() !==
              supplementalId,
          );
          if (remaining.length !== current.length) {
            const patched = await GoogleMerchantAPI.patchDataSourceDefaultRule(
              accessToken,
              {
                name: record.primaryDataSourceName,
                takeFromDataSources:
                  remaining.length > 0 ? remaining : [{ self: true }],
              },
            );
            if (!patched.success)
              warnings.push(`rule: ${patched.error.message}`);
          }
        } else {
          warnings.push(`rule: ${primary.error.message}`);
        }
      }

      if (record.dataSourceName) {
        const deleted = await GoogleMerchantAPI.deleteDataSource(
          accessToken,
          record.dataSourceName,
        );
        if (!deleted.success)
          warnings.push(`dataSource: ${deleted.error.message}`);
      }

      const config = GoogleMerchantAPI.configuration();
      if (record.googleAccountId && config) {
        const services = await GoogleMerchantAPI.listAccountServices(
          accessToken,
          record.googleAccountId,
        );
        if (services.success) {
          const ours = (services.data.accountServices ?? []).find(
            (service) =>
              service.accountManagement !== undefined &&
              service.provider?.split("/").pop() === config.advancedAccountId,
          );
          if (ours?.name) {
            const rejected = await GoogleMerchantAPI.rejectAccountService(
              accessToken,
              ours.name,
            );
            if (!rejected.success)
              warnings.push(`link: ${rejected.error.message}`);
          }
        } else {
          warnings.push(`link: ${services.error.message}`);
        }
      }
    } else {
      warnings.push(
        `google: ${resolved.error.message} — removed the local connection only`,
      );
    }

    const offers = await resultify(() =>
      db
        .delete(schema.googleMerchantOffer)
        .where(eq(schema.googleMerchantOffer.storeId, storeId)),
    );
    if (!offers.success) return offers;

    const destroyed = await GoogleMerchantAccount.destroy(
      Environment.SERVER,
      record.id,
    );
    if (!destroyed.success) return destroyed;

    context.span.addBreadcrumb({
      category: "google.disconnected",
      data: { "store.id": storeId, "warnings.count": warnings.length },
    });

    return { success: true as const, data: { warnings } };
  },
  "GoogleMerchant.disconnect",
);

export type Status = {
  /** False for platforms Path 1 doesn't cover yet (WooCommerce, feed, CSV). */
  supported: boolean;
  connected: boolean;
  googleAccountId: string | null;
  /** Accounts visible to the Google login — the picker when several exist. */
  candidateAccounts: {
    id: string;
    name: string | null;
    domain?: string | null;
    matchesStore?: boolean;
  }[];
  linkState: "unlinked" | "proposed" | "active";
  provisioned: boolean;
  offers: { pending: number; live: number; disapproved: number; error: number };
  /** Stored error text of up to three errored offers, for the settings card. */
  offerErrors: { offerId: string; error: string }[];
};

/**
 * Connection/link/offer summary for one store, driving the settings UI's
 * Google Shopping card and its optimizing → going live → live lifecycle.
 */
export const getStatus = withAuthentication(
  async (
    context,
    { store: storeId }: { store: string },
  ): Promise<
    { success: true; data: Status } | { success: false; error: Error }
  > => {
    const store = await ownedStore(storeId, context.session.user.id);
    if (!store.success) return store;

    const supported = SUPPORTED_PLATFORMS.includes(store.data.platform);

    const empty: Status = {
      supported,
      connected: false,
      googleAccountId: null,
      candidateAccounts: [],
      linkState: "unlinked",
      provisioned: false,
      offers: { pending: 0, live: 0, disapproved: 0, error: 0 },
      offerErrors: [],
    };

    const account = await GoogleMerchantAccount.find(Environment.SERVER, {
      where: eq(schema.googleMerchantAccount.storeId, storeId),
    });
    if (!account.success) return account;

    const record = account.data[0];
    if (!record) return { success: true, data: empty };

    const offerRows = await GoogleMerchantOffer.find(Environment.SERVER, {
      where: eq(schema.googleMerchantOffer.storeId, storeId),
    });
    if (!offerRows.success) return offerRows;

    const offers = { pending: 0, live: 0, disapproved: 0, error: 0 };
    for (const offer of offerRows.data) offers[offer.status] += 1;

    const offerErrors = offerRows.data
      .filter((offer) => offer.status === "error" && offer.error !== null)
      .slice(0, 3)
      .map((offer) => ({
        offerId: offer.offerId,
        error: offer.error as string,
      }));

    return {
      success: true,
      data: {
        supported,
        connected: true,
        googleAccountId: record.googleAccountId,
        candidateAccounts: record.candidateAccounts ?? [],
        linkState: record.linkState,
        provisioned: record.dataSourceName !== null,
        offers,
        offerErrors,
      },
    };
  },
  "GoogleMerchant.getStatus",
);

/**
 * Cron sweep over every linked store (Bearer-gated route at
 * /api/cron/google-merchant): polls pending accountManagement approvals,
 * repairs primary-feed rules that merchants reordered in Merchant Center, and
 * runs the async override verification. Every step is idempotent, so the
 * sweep is safe at any cadence; per-store failures are collected, never fatal
 * to the rest of the sweep.
 */
export const runMaintenance = withContext(
  async (context, { secret }: { secret: string }) => {
    // Exported server actions are publicly invocable endpoints — the cron
    // secret gates this one even though the cron route also checks it, so a
    // direct action invocation can't sweep every merchant account at will.
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
      return {
        success: false as const,
        error: new RequestError("Not authorized"),
      };

    const accounts = await GoogleMerchantAccount.find(Environment.SERVER, {});
    if (!accounts.success) return accounts;

    const summary = {
      stores: accounts.data.length,
      linksChecked: 0,
      linksEstablished: 0,
      linksRevoked: 0,
      rulesRepaired: 0,
      verified: 0,
      disapproved: 0,
      awaitingReprocess: 0,
      reprocessedWithoutMerge: 0,
      errors: [] as string[],
    };

    for (const record of accounts.data) {
      const resolved = await resolveAccessToken(record.storeId);
      if (!resolved.success) {
        summary.errors.push(`${record.storeId}: ${resolved.error.message}`);
        continue;
      }

      // Reconcile both directions: proposed links may have established, and
      // active links may have been revoked in Merchant Center.
      if (
        (record.linkState === "proposed" || record.linkState === "active") &&
        record.googleAccountId
      ) {
        summary.linksChecked += 1;
        const link = await reconcileLinkState(resolved.accessToken, record);
        if (!link.success) {
          summary.errors.push(`${record.storeId}: ${link.error.message}`);
        } else if (
          link.data.linkState === "active" &&
          record.linkState !== "active"
        ) {
          summary.linksEstablished += 1;
        } else if (
          link.data.linkState !== "active" &&
          record.linkState === "active"
        ) {
          summary.linksRevoked += 1;
        }
      }

      if (record.dataSourceName && record.googleAccountId) {
        const sources = await GoogleMerchantAPI.listDataSources(
          resolved.accessToken,
          record.googleAccountId,
        );
        if (!sources.success) {
          summary.errors.push(`${record.storeId}: ${sources.error.message}`);
        } else {
          for (const source of (sources.data.dataSources ?? []).filter(
            (candidate) =>
              candidate.primaryProductDataSource !== undefined &&
              candidate.name !== undefined,
          )) {
            const rule = await ensureDefaultRule(resolved.accessToken, {
              primaryName: source.name as string,
              supplementalName: record.dataSourceName,
            });
            if (!rule.success) {
              summary.errors.push(`${record.storeId}: ${rule.error.message}`);
            } else if (rule.data.patched) {
              summary.rulesRepaired += 1;
            }
          }
        }
      }

      if (record.dataSourceName && record.googleAccountId) {
        const verification = await runVerification(
          resolved.accessToken,
          record,
        );
        if (!verification.success) {
          summary.errors.push(
            `${record.storeId}: ${verification.error.message}`,
          );
        } else {
          summary.verified += verification.data.verified;
          summary.disapproved += verification.data.disapproved;
          summary.awaitingReprocess += verification.data.awaitingReprocess;
          summary.reprocessedWithoutMerge +=
            verification.data.reprocessedWithoutMerge;
        }
      }
    }

    context.span.addBreadcrumb({
      category: "google.maintenance",
      data: {
        "stores.total": summary.stores,
        "links.established": summary.linksEstablished,
        "rules.repaired": summary.rulesRepaired,
        "overrides.verified": summary.verified,
        "errors.count": summary.errors.length,
      },
    });

    return { success: true as const, data: summary };
  },
  "GoogleMerchant.runMaintenance",
);
