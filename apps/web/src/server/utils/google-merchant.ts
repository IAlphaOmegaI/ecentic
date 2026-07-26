import type { Result } from "@zenncore/utils";
import { RequestError } from "./error";
import * as HTTP from "./http";

/**
 * Google OAuth + Merchant API v1 client for the hybrid channel-partner
 * integration (docs/integrations/google-merchant-center.md). Merchant-consent
 * calls run with the merchant's OAuth token (scope `content`); the
 * accountManagement link is proposed from our advanced account (MCA).
 *
 * Every wrapper targets Merchant API v1 — v1beta is dead and the Content API
 * is sunsetting.
 */

const MERCHANT_API_BASE = "https://merchantapi.googleapis.com";
const OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CONTENT_SCOPE = "https://www.googleapis.com/auth/content";

export type Configuration = {
  clientId: string;
  clientSecret: string;
  /** Numeric id of our advanced (multi-client) account. */
  advancedAccountId: string;
};

export const configuration = (): Configuration | null => {
  const {
    GOOGLE_MERCHANT_CLIENT_ID,
    GOOGLE_MERCHANT_CLIENT_SECRET,
    ECENTIC_MCA_ID,
  } = process.env;

  if (
    !GOOGLE_MERCHANT_CLIENT_ID ||
    !GOOGLE_MERCHANT_CLIENT_SECRET ||
    !ECENTIC_MCA_ID
  )
    return null;

  return {
    clientId: GOOGLE_MERCHANT_CLIENT_ID,
    clientSecret: GOOGLE_MERCHANT_CLIENT_SECRET,
    advancedAccountId: ECENTIC_MCA_ID,
  };
};

// ---------------------------------------------------------------------------
// OAuth — merchant consent
// ---------------------------------------------------------------------------

export const authorizationUrl = ({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}) => {
  const url = new URL(OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", CONTENT_SCOPE);
  // Offline access + forced consent so a refresh token is always issued, even
  // on re-connects (Google omits it otherwise once a grant exists).
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
};

export type TokenGrant = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string | null;
  scope: string | null;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

const requestToken = async (
  body: Record<string, string>,
): Promise<Result<TokenGrant, Error>> => {
  const response = await HTTP.request(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const parsed = await HTTP.parse<TokenResponse>(response);
  if (!parsed.success) return parsed;

  return {
    success: true,
    data: {
      accessToken: parsed.data.access_token,
      accessTokenExpiresAt: new Date(
        Date.now() + parsed.data.expires_in * 1000,
      ),
      refreshToken: parsed.data.refresh_token ?? null,
      scope: parsed.data.scope ?? null,
    },
  };
};

export const exchangeCode = (
  { clientId, clientSecret }: Configuration,
  { code, redirectUri }: { code: string; redirectUri: string },
) =>
  requestToken({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

export const refreshAccessToken = (
  { clientId, clientSecret }: Configuration,
  { refreshToken }: { refreshToken: string },
) =>
  requestToken({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

// ---------------------------------------------------------------------------
// Merchant API v1 wrappers
// ---------------------------------------------------------------------------

const api = async <T>(
  accessToken: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<Result<T, Error>> => {
  const response = await HTTP.request(`${MERCHANT_API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });

  return HTTP.parse<T>(response);
};

export type MerchantAccount = {
  /** Resource name, `accounts/{id}`. */
  name: string;
  accountId?: string;
  accountName?: string;
  adultContent?: boolean;
  testAccount?: boolean;
};

/** Lists the Merchant Center accounts the token's Google user can access. */
export const listAccounts = (accessToken: string) =>
  api<{ accounts?: MerchantAccount[] }>(accessToken, "/accounts/v1/accounts");

export type AccountService = {
  name?: string;
  provider?: string;
  accountManagement?: Record<string, never>;
  accountAggregation?: Record<string, never>;
  handshake?: { approvalState?: string };
};

export const listAccountServices = (accessToken: string, accountId: string) =>
  api<{ accountServices?: AccountService[] }>(
    accessToken,
    `/accounts/v1/accounts/${accountId}/services`,
  );

/**
 * Proposes the accountManagement link from our MCA to the merchant's account.
 * The merchant approves the request inside Merchant Center — approval never
 * happens via API, which is the safeguard the relationship model relies on.
 *
 * Request shape (per the accounts_v1 discovery document): `provider` is a
 * TOP-LEVEL sibling of `accountService` — `AccountService.provider` is
 * output-only, so nesting it silently sends an empty provider. On format, the
 * live validator demands `accounts/{account}` while the discovery description
 * says `providers/123`; we send what the validator asks for. The output-only
 * field may still read back as `providers/{id}`, so callers comparing it
 * should match on the numeric id, not the full string.
 */
export const providerName = (providerId: string) => `accounts/${providerId}`;

export const proposeAccountManagement = (
  accessToken: string,
  { accountId, providerId }: { accountId: string; providerId: string },
) =>
  api<AccountService>(
    accessToken,
    `/accounts/v1/accounts/${accountId}/services:propose`,
    {
      method: "POST",
      body: {
        provider: providerName(providerId),
        accountService: { accountManagement: {} },
      },
    },
  );

export type AccountIssue = {
  name?: string;
  title?: string;
  severity?: string;
  detail?: string;
};

export const listAccountIssues = (accessToken: string, accountId: string) =>
  api<{ accountIssues?: AccountIssue[] }>(
    accessToken,
    `/accounts/v1/accounts/${accountId}/issues`,
  );

/**
 * One entry of a primary data source's `defaultRule.takeFromDataSources`.
 * Order is precedence: earlier sources win attribute conflicts. Spike 1 found
 * the Shopify channel's rule is `[{self: true}]` and does NOT pick up new
 * supplemental sources automatically — provisioning must patch our source in
 * (first), read-modify-write, since PATCH replaces the whole list.
 */
export type DataSourceReference = {
  self?: boolean;
  primaryDataSourceName?: string;
  supplementalDataSourceName?: string;
};

export type DataSource = {
  /** Resource name, `accounts/{account}/dataSources/{dataSource}`. */
  name?: string;
  displayName?: string;
  primaryProductDataSource?: {
    feedLabel?: string;
    contentLanguage?: string;
    defaultRule?: { takeFromDataSources?: DataSourceReference[] };
  };
  supplementalProductDataSource?: {
    feedLabel?: string;
    contentLanguage?: string;
  };
};

export const listDataSources = (accessToken: string, accountId: string) =>
  api<{ dataSources?: DataSource[] }>(
    accessToken,
    `/datasources/v1/accounts/${accountId}/dataSources`,
  );

/** Fetches one data source by full resource name (`accounts/{a}/dataSources/{d}`). */
export const getDataSource = (accessToken: string, name: string) =>
  api<DataSource>(accessToken, `/datasources/v1/${name}`);

/**
 * Replaces a primary data source's `defaultRule.takeFromDataSources`. Callers
 * must read-modify-write: fetch the current rule, prepend/reorder, send the
 * complete list — the PATCH replaces it wholesale.
 */
export const patchDataSourceDefaultRule = (
  accessToken: string,
  {
    name,
    takeFromDataSources,
  }: { name: string; takeFromDataSources: DataSourceReference[] },
) =>
  api<DataSource>(
    accessToken,
    `/datasources/v1/${name}?updateMask=${encodeURIComponent("primaryProductDataSource.defaultRule")}`,
    {
      method: "PATCH",
      body: {
        primaryProductDataSource: { defaultRule: { takeFromDataSources } },
      },
    },
  );

export const createSupplementalDataSource = (
  accessToken: string,
  {
    accountId,
    displayName,
    feedLabel,
    contentLanguage,
  }: {
    accountId: string;
    displayName: string;
    feedLabel: string | null;
    contentLanguage: string | null;
  },
) =>
  api<DataSource>(
    accessToken,
    `/datasources/v1/accounts/${accountId}/dataSources`,
    {
      method: "POST",
      body: {
        displayName,
        supplementalProductDataSource:
          // Merge keys: supplemental data joins the primary feed on
          // (offerId, contentLanguage, feedLabel). Omitting both makes the
          // source valid for all targets of the primary feed.
          feedLabel && contentLanguage ? { feedLabel, contentLanguage } : {},
      },
    },
  );

export type ProductStatus = {
  destinationStatuses?: {
    reportingContext?: string;
    approvedCountries?: string[];
    disapprovedCountries?: string[];
  }[];
  itemLevelIssues?: {
    code?: string;
    severity?: string;
    description?: string;
    attribute?: string;
  }[];
  /**
   * RFC 3339 timestamp of the last reprocessing. Reprocessing is lazy (hours) —
   * a push is only confirmed merged once this advances past the push time, so
   * merge verification must be async, never assert-after-push. A fresh
   * `productInputs:insert` is the lever that forces reprocessing of an offer.
   */
  lastUpdateDate?: string;
};

export type MerchantProduct = {
  /** Resource name, `accounts/{account}/products/{product}`. */
  name?: string;
  offerId?: string;
  contentLanguage?: string;
  feedLabel?: string;
  attributes?: {
    title?: string;
    description?: string;
    productTypes?: string[];
  };
  productStatus?: ProductStatus;
};

/**
 * Lists processed products (the post-merge view Google actually serves to
 * surfaces). Paginates to `maximumPages` × 250 items.
 */
export const listProducts = async (
  accessToken: string,
  accountId: string,
  { maximumPages = 8 }: { maximumPages?: number } = {},
): Promise<Result<MerchantProduct[], Error>> => {
  const all: MerchantProduct[] = [];
  let pageToken: string | null = null;

  for (const _ of Array.from({ length: maximumPages })) {
    const query = new URLSearchParams({ pageSize: "250" });
    if (pageToken) query.set("pageToken", pageToken);

    const page: Result<
      { products?: MerchantProduct[]; nextPageToken?: string },
      Error
    > = await api(
      accessToken,
      `/products/v1/accounts/${accountId}/products?${query.toString()}`,
    );
    if (!page.success) return page;

    all.push(...(page.data.products ?? []));
    pageToken = page.data.nextPageToken ?? null;
    if (!pageToken) break;
  }

  return { success: true, data: all };
};

export type ProductInputAttributes = {
  title?: string;
  description?: string;
  productTypes?: string[];
  customLabel0?: string;
  gtins?: string[];
};

/**
 * Pushes one attribute override into our supplemental data source. The offer
 * identity triplet must exactly match a primary-feed offer or the input merges
 * onto nothing (docs: "read, don't reconstruct" — callers derive the triplet
 * from {@link listProducts}, never by rebuilding the plugin's id scheme).
 */
export const insertProductInput = (
  accessToken: string,
  {
    accountId,
    dataSourceName,
    offerId,
    contentLanguage,
    feedLabel,
    attributes,
  }: {
    accountId: string;
    dataSourceName: string;
    offerId: string;
    contentLanguage: string;
    feedLabel: string;
    attributes: ProductInputAttributes;
  },
) =>
  api<{ name?: string }>(
    accessToken,
    `/products/v1/accounts/${accountId}/productInputs:insert?dataSource=${encodeURIComponent(dataSourceName)}`,
    {
      method: "POST",
      body: { offerId, contentLanguage, feedLabel, attributes },
    },
  );

// ---------------------------------------------------------------------------
// Pre-push policy lint
// ---------------------------------------------------------------------------

export type PolicyIssue = { code: string; message: string };

const PROMOTIONAL_PATTERNS: { pattern: RegExp; code: string }[] = [
  { pattern: /free shipping/i, code: "promotional_free_shipping" },
  { pattern: /best price/i, code: "promotional_best_price" },
  { pattern: /\d+\s*%\s*off/i, code: "promotional_percent_off" },
  { pattern: /buy now/i, code: "promotional_call_to_action" },
  { pattern: /!{2,}/, code: "repeated_exclamation" },
];

const TITLE_MAXIMUM_LENGTH = 150;
const DESCRIPTION_MAXIMUM_LENGTH = 5000;
const CAPS_RATIO_LIMIT = 0.5;

/**
 * Lints override attributes before push. Google policy-validates supplemental
 * overrides exactly as if they were the merchant's own feed data — spike 1's
 * test title drew a `title_all_caps` flag immediately. A disapproval caused by
 * our own rewrite is the worst failure mode this product has, so anything
 * flagged here must not be inserted.
 */
export const lintOverrideAttributes = (
  attributes: ProductInputAttributes,
): PolicyIssue[] => {
  const issues: PolicyIssue[] = [];

  const { title, description } = attributes;

  if (title) {
    if (title.length > TITLE_MAXIMUM_LENGTH)
      issues.push({
        code: "title_too_long",
        message: `Title exceeds ${TITLE_MAXIMUM_LENGTH} characters`,
      });

    const letters = title.replace(/[^a-zA-Z]/g, "");
    const uppercase = letters.replace(/[^A-Z]/g, "");
    if (
      letters.length > 10 &&
      uppercase.length / letters.length > CAPS_RATIO_LIMIT
    )
      issues.push({
        code: "title_all_caps",
        message: "Title is mostly uppercase",
      });

    for (const { pattern, code } of PROMOTIONAL_PATTERNS) {
      if (pattern.test(title))
        issues.push({ code, message: `Title matches ${pattern}` });
    }
  }

  if (description) {
    if (description.length > DESCRIPTION_MAXIMUM_LENGTH)
      issues.push({
        code: "description_too_long",
        message: `Description exceeds ${DESCRIPTION_MAXIMUM_LENGTH} characters`,
      });

    for (const { pattern, code } of PROMOTIONAL_PATTERNS) {
      if (pattern.test(description))
        issues.push({ code, message: `Description matches ${pattern}` });
    }
  }

  return issues;
};

/** Extracts the numeric account id from an `accounts/{id}` resource name. */
export const accountIdFromName = (name: string): string | null => {
  const match = name.match(/^accounts\/(\d+)$/);
  return match?.[1] ?? null;
};

export const notConfiguredError = () =>
  new RequestError(
    "Google Merchant integration not configured (GOOGLE_MERCHANT_CLIENT_ID, GOOGLE_MERCHANT_CLIENT_SECRET, ECENTIC_MCA_ID)",
  );
