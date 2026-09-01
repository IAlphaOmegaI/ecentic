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

/**
 * Liveness probe for a stored access token. Google can revoke an access token
 * out-of-band — observed live: a token died ~7 minutes after minting while a
 * sibling token from the same refresh grant kept working — so a persisted
 * expiry timestamp alone cannot be trusted once a token is past its first
 * minutes. Returns `valid: false` only on Google's explicit invalid-token
 * answer; transport failures surface as errors so callers can fail open.
 */
export const introspectAccessToken = async (
  accessToken: string,
): Promise<Result<{ valid: boolean }, Error>> => {
  const response = await HTTP.request(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    { method: "GET" },
  );
  if (!response.success) return response;
  return { success: true, data: { valid: response.data.ok } };
};

// ---------------------------------------------------------------------------
// Merchant API v1 wrappers
// ---------------------------------------------------------------------------

/**
 * Retries once per backoff step on rate limiting (429) and transient server
 * errors (5xx) — Google's per-minute quota errors are expected during bulk
 * pushes and resolve on their own. Everything else surfaces immediately;
 * error MESSAGES are unstable per Google's error-handling guide, so callers
 * branching on failures should match `ErrorInfo.reason` codes when present
 * (embedded in the parsed error body), never prose.
 */
const RETRY_DELAYS_MS = [1000, 3000, 8000];

const api = async <T>(
  accessToken: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<Result<T, Error>> => {
  const attempt = () =>
    HTTP.request(`${MERCHANT_API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    });

  const first = await attempt();
  const retriable = (response: Awaited<ReturnType<typeof attempt>>) =>
    response.success &&
    (response.data.status === 429 || response.data.status >= 500);

  if (!retriable(first)) return HTTP.parse<T>(first);

  const latest = await (async () => {
    for (const delay of RETRY_DELAYS_MS) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      const retried = await attempt();
      if (!retriable(retried)) return retried;
    }
    return attempt();
  })();

  return HTTP.parse<T>(latest);
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

/**
 * Lists sub-accounts of an account acting as provider. Doubles as the
 * advanced-account probe: the Account resource carries no MCA flag, so "has
 * sub-accounts" is the working signal that an account is an aggregator rather
 * than a store (a store-less advanced account errors or returns empty here).
 */
export const listSubaccounts = (accessToken: string, accountId: string) =>
  api<{ accounts?: MerchantAccount[] }>(
    accessToken,
    `/accounts/v1/accounts/${accountId}:listSubaccounts?pageSize=1`,
  );

/**
 * The account's registered store homepage — the identity signal that ties a
 * Merchant Center account to a storefront domain. Errors (including unset
 * homepages returning 404) are the caller's cue to treat the domain as
 * unknown, not to fail the flow.
 */
export const getHomepage = (accessToken: string, accountId: string) =>
  api<{ uri?: string; claimed?: boolean }>(
    accessToken,
    `/accounts/v1/accounts/${accountId}/homepage`,
  );

export type OnlineReturnPolicy = {
  name?: string;
  label?: string;
  countries?: string[];
  policy?: {
    type?:
      | "NUMBER_OF_DAYS_AFTER_DELIVERY"
      | "NO_RETURNS"
      | "LIFETIME_RETURNS"
      | string;
    /** int64 comes over the wire as a string. */
    days?: string;
  };
  returnPolicyUri?: string;
  returnMethods?: string[];
  itemConditions?: string[];
  returnShippingFee?: {
    type?: string;
    fixedFee?: { amountMicros?: string; currencyCode?: string };
  };
  processRefundDays?: number;
  returnLabelSource?: string;
};

/**
 * Return policies configured on the account. Google's UCP checkout requires at
 * least one policy with a window and a full-policy link — and on advanced
 * accounts the policies must live on each sub-account, which is the account we
 * link, so reading here audits the right place.
 */
export const listReturnPolicies = (accessToken: string, accountId: string) =>
  api<{ onlineReturnPolicies?: OnlineReturnPolicy[] }>(
    accessToken,
    `/accounts/v1/accounts/${accountId}/onlineReturnPolicies`,
  );

export type ReturnPolicyInput = {
  /** Omit for the account's default policy (applies to all products). */
  label?: string;
  /** ISO 3166 2-letter country codes. Required, immutable after create. */
  countries: string[];
  policy:
    | { type: "NUMBER_OF_DAYS_AFTER_DELIVERY"; days: string }
    | { type: "LIFETIME_RETURNS" };
  /** Required — Google sanity-checks the policy against this URL. */
  returnPolicyUri: string;
  returnMethods: ("BY_MAIL" | "IN_STORE" | "AT_A_KIOSK")[];
  itemConditions: ("NEW" | "USED")[];
  /**
   * Live validator: `FIXED` requires an explicit `fixedFee` — the discovery
   * doc's "treated as free if not set" is wrong; free = amountMicros "0".
   */
  returnShippingFee:
    | {
        type: "FIXED";
        fixedFee: { amountMicros: string; currencyCode: string };
      }
    | { type: "CUSTOMER_PAYING_ACTUAL_FEE" };
  /** Marked optional in the discovery doc, required by the live validator. */
  processRefundDays: number;
  /** Marked optional in the discovery doc, required by the live validator. */
  returnLabelSource:
    | "DOWNLOAD_AND_PRINT"
    | "IN_THE_PACKAGE"
    | "CUSTOMER_RESPONSIBILITY";
};

/**
 * Creates a return policy on the account. There is NO update/patch on this
 * resource (create/delete only) — callers must treat existing policies as
 * merchant-owned and never silently replace them. Field requirements are the
 * LIVE validator's, not the discovery document's (verified 2026-07-30):
 * `processRefundDays`, `returnLabelSource`, and `returnShippingFee.fixedFee`
 * (when FIXED) are all effectively required despite being documented optional.
 */
/**
 * Deletes a return policy by resource name
 * (`accounts/{account}/onlineReturnPolicies/{id}`). With no update/patch on
 * this resource, delete-and-recreate is the only edit mechanism — reserve it
 * for explicit merchant-invoked replacement, never silent reconciliation.
 */
export const deleteReturnPolicy = (accessToken: string, name: string) =>
  api<Record<string, never>>(accessToken, `/accounts/v1/${name}`, {
    method: "DELETE",
  });

export const createReturnPolicy = (
  accessToken: string,
  accountId: string,
  policy: ReturnPolicyInput,
) =>
  api<OnlineReturnPolicy>(
    accessToken,
    `/accounts/v1/accounts/${accountId}/onlineReturnPolicies`,
    { method: "POST", body: policy },
  );

export type BusinessInfo = {
  customerService?: {
    email?: string;
    uri?: string;
    phone?: { e164Number?: string };
  };
};

/**
 * Business info — UCP checkout requires at least one customer-service contact
 * (email, URL, or phone), which becomes the "Contact Merchant" link on
 * Google's order confirmation page.
 */
export const getBusinessInfo = (accessToken: string, accountId: string) =>
  api<BusinessInfo>(
    accessToken,
    `/accounts/v1/accounts/${accountId}/businessInfo`,
  );

/**
 * Sets the account's customer-service contact (the "Contact Merchant" link on
 * Google's order confirmation). PATCH with `updateMask=customer_service` —
 * the whole customerService object is replaced, so callers send every field
 * they want kept, not just the changed one.
 */
export const updateCustomerService = (
  accessToken: string,
  accountId: string,
  customerService: {
    email?: string;
    uri?: string;
    phone?: { e164Number: string };
  },
) =>
  api<BusinessInfo>(
    accessToken,
    `/accounts/v1/accounts/${accountId}/businessInfo?updateMask=customer_service`,
    {
      method: "PATCH",
      body: {
        name: `accounts/${accountId}/businessInfo`,
        customerService,
      },
    },
  );

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
 * Because the proposal runs on the MERCHANT's credentials, the merchant side
 * is already consented — the pending approval belongs to the PROVIDER (our
 * MCA), via {@link approveAccountService} with provider credentials (spike 3;
 * same-admin test setups self-establish, real merchants do not).
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

/**
 * Rejects an account service by resource name
 * (`accounts/{account}/services/{service}`). Works on both proposed and
 * established services, so it doubles as the API-side unlink.
 */
export const rejectAccountService = (accessToken: string, name: string) =>
  api<Record<string, never>>(accessToken, `/accounts/v1/${name}:reject`, {
    method: "POST",
    body: {},
  });

/**
 * Approves a pending account service by resource name
 * (`accounts/{account}/services/{service}`). Must run with the PROVIDER'S
 * (our MCA's) credentials — merchant-credential proposals wait on this side
 * of the handshake.
 */
export const approveAccountService = (accessToken: string, name: string) =>
  api<AccountService>(accessToken, `/accounts/v1/${name}:approve`, {
    method: "POST",
    body: {},
  });

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
 * Deletes a data source (and the product inputs it carries). A supplemental
 * source cannot be deleted while a primary's rule still references it — the
 * caller must unpatch the rule first.
 */
export const deleteDataSource = (accessToken: string, name: string) =>
  api<Record<string, never>>(accessToken, `/datasources/v1/${name}`, {
    method: "DELETE",
  });

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

/**
 * Creates an API-input supplemental data source. `feedLabel`/`contentLanguage`
 * MUST be unset here — the schema only allows (and requires) them for
 * file-input data sources; API-input sources reject them as unexpected
 * fields. The merge keys ride on each productInput instead, copied from the
 * live offer they target.
 */
export const createSupplementalDataSource = (
  accessToken: string,
  { accountId, displayName }: { accountId: string; displayName: string },
) =>
  api<DataSource>(
    accessToken,
    `/datasources/v1/accounts/${accountId}/dataSources`,
    {
      method: "POST",
      body: { displayName, supplementalProductDataSource: {} },
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

/**
 * Merchant-provided attribute, either a flat `{name, value}` pair or a group
 * with `groupValues` (exactly one of the two is set). UCP checkout data
 * (`native_commerce`, `consumer_notice`, `merchant_item_id`) rides this shape.
 */
export type CustomAttribute = {
  name: string;
  value?: string;
  groupValues?: CustomAttribute[];
};

/**
 * Google's PROCESSED view normalizes custom attributes (verified live
 * 2026-07-31): underscores become spaces in names AND enum-ish values
 * (`native_commerce` → "native commerce", `safety_warning` → "safety
 * warning"), and group members lose their group prefix (`notice_type` →
 * "type"). Any read-back comparison must normalize both sides — the pushed
 * spelling never matches verbatim.
 */
export const normalizeCustomAttributeToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .trim();

/** Matches a processed group name against the pushed one, tolerating the
 * dropped group prefix ("notice type" matches processed "type"). */
export const customAttributeGroupMatches = (
  pushedName: string,
  processedName: string,
) => {
  const pushed = normalizeCustomAttributeToken(pushedName);
  const processed = normalizeCustomAttributeToken(processedName);
  return pushed === processed || pushed.endsWith(` ${processed}`);
};

export type MerchantProduct = {
  /** Resource name, `accounts/{account}/products/{product}`. */
  name?: string;
  offerId?: string;
  contentLanguage?: string;
  feedLabel?: string;
  /** v1 GA field name is `productAttributes` (`attributes` was v1beta). */
  productAttributes?: {
    title?: string;
    description?: string;
    productTypes?: string[];
    /**
     * Google's own taxonomy for the offer, as either a path
     * ("Home & Garden > Kitchen & Dining") or a bare leaf id ("1604"). Distinct
     * from `productTypes`, which is the merchant's private taxonomy — only this
     * one maps onto `report_category_id`. See
     * {@link categoryIdFromProductCategory}.
     */
    googleProductCategory?: string;
  };
  /** Post-merge custom attributes — reading these back verifies a UCP push. */
  customAttributes?: CustomAttribute[];
  productStatus?: ProductStatus;
};

/**
 * Lists processed products (the post-merge view Google actually serves to
 * surfaces). Paginates to `maximumPages` × 250 items.
 */
export const listProducts = async (
  accessToken: string,
  accountId: string,
  // 100 pages × 1000 (the API maximum page size) = a 100k-offer ceiling, a
  // runaway guard rather than an expected bound — v1 expects pagination to
  // continue until nextPageToken is absent.
  { maximumPages = 100 }: { maximumPages?: number } = {},
): Promise<Result<MerchantProduct[], Error>> => {
  const all: MerchantProduct[] = [];
  let pageToken: string | null = null;

  for (const _ of Array.from({ length: maximumPages })) {
    const query = new URLSearchParams({ pageSize: "1000" });
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
    customAttributes,
  }: {
    accountId: string;
    dataSourceName: string;
    offerId: string;
    contentLanguage: string;
    feedLabel: string;
    attributes: ProductInputAttributes;
    customAttributes?: CustomAttribute[];
  },
) =>
  api<{ name?: string }>(
    accessToken,
    `/products/v1/accounts/${accountId}/productInputs:insert?dataSource=${encodeURIComponent(dataSourceName)}`,
    {
      method: "POST",
      // v1 GA field name is `productAttributes` (`attributes` was v1beta).
      // `customAttributes` is its top-level sibling on ProductInput.
      body: {
        offerId,
        contentLanguage,
        feedLabel,
        productAttributes: attributes,
        ...(customAttributes?.length ? { customAttributes } : {}),
      },
    },
  );

/**
 * Deletes one product input from our supplemental data source — the cleanup
 * lever when a product loses its override/UCP configuration. `name` is the
 * input's own resource name as returned by the insert response
 * (`accounts/{account}/productInputs/{id}`); never reconstructed.
 */
export const deleteProductInput = (
  accessToken: string,
  { name, dataSourceName }: { name: string; dataSourceName: string },
) =>
  api<Record<string, never>>(
    accessToken,
    `/products/v1/${name}?dataSource=${encodeURIComponent(dataSourceName)}`,
    { method: "DELETE" },
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

// ---------------------------------------------------------------------------
// UCP (agentic checkout) attributes + lint
// ---------------------------------------------------------------------------

export const UCP_NOTICE_TYPES = [
  "legal_disclaimer",
  "safety_warning",
  "prop_65",
] as const;

export type UcpNoticeType = (typeof UCP_NOTICE_TYPES)[number];

export type UcpAttributes = {
  checkoutEligible: boolean;
  noticeType?: UcpNoticeType | null;
  noticeMessage?: string | null;
  /** Maps the feed offer id to the id the checkout endpoint expects. */
  merchantItemId?: string | null;
};

const NOTICE_MESSAGE_MAXIMUM_LENGTH = 1000;

/**
 * Categories Google excludes from agentic checkout. Heuristics over the
 * product's own text — a warning gate, not a hard block: the merchant knows
 * their catalog better than a regex, but opting a subscription or
 * age-restricted item into checkout is a policy strike we should catch first.
 */
const UCP_RESTRICTED_PATTERNS: { pattern: RegExp; code: string }[] = [
  {
    pattern: /\bsubscription\b|subscribe\s*&\s*save/i,
    code: "ucp_subscription",
  },
  { pattern: /\bpre[- ]?order\b/i, code: "ucp_preorder" },
  {
    pattern: /personali[sz]ed|monogram|engrav|made to order/i,
    code: "ucp_personalized",
  },
  {
    pattern: /refurbished|final sale|\bpre[- ]owned\b|\bsecond[- ]hand\b/i,
    code: "ucp_not_new_or_final_sale",
  },
  { pattern: /\bgift card\b|\be-?gift\b/i, code: "ucp_gifting" },
  {
    pattern: /alcohol|\bwine\b|\bbeer\b|whisk(e)?y|vodka|tobacco|\bcigar/i,
    code: "ucp_age_restricted",
  },
  { pattern: /\brental\b|\blease\b|\bfor rent\b/i, code: "ucp_rental" },
  {
    pattern: /extended warranty|installation (required|included)/i,
    code: "ucp_bundled_service",
  },
];

/**
 * Lints a product opted into UCP checkout eligibility. Restricted-category
 * hits are warnings (surfaced, not blocking); malformed consumer notices are
 * errors (Google rejects or, worse, displays them broken at checkout).
 */
export const lintUcpAttributes = (
  ucp: UcpAttributes,
  product: { title?: string; description?: string },
): { errors: PolicyIssue[]; warnings: PolicyIssue[] } => {
  const errors: PolicyIssue[] = [];
  const warnings: PolicyIssue[] = [];

  if (ucp.checkoutEligible) {
    const text = `${product.title ?? ""}\n${product.description ?? ""}`;
    for (const { pattern, code } of UCP_RESTRICTED_PATTERNS) {
      if (pattern.test(text))
        warnings.push({
          code,
          message: `Product text matches a checkout-restricted category (${pattern})`,
        });
    }
  }

  const { noticeType, noticeMessage } = ucp;
  if ((noticeType && !noticeMessage) || (!noticeType && noticeMessage))
    errors.push({
      code: "ucp_notice_incomplete",
      message: "Consumer notice needs both a type and a message",
    });

  if (noticeType && !UCP_NOTICE_TYPES.includes(noticeType))
    errors.push({
      code: "ucp_notice_type_invalid",
      message: `Notice type must be one of ${UCP_NOTICE_TYPES.join(", ")}`,
    });

  if (noticeMessage) {
    if (noticeMessage.length > NOTICE_MESSAGE_MAXIMUM_LENGTH)
      errors.push({
        code: "ucp_notice_too_long",
        message: `Notice message exceeds ${NOTICE_MESSAGE_MAXIMUM_LENGTH} characters`,
      });

    const withoutAllowedTags = noticeMessage.replace(
      /<\/?(b|i|br)\s*\/?>|<a\s+href="[^"]*"\s*>|<\/a>/gi,
      "",
    );
    if (/<[^>]+>/.test(withoutAllowedTags))
      errors.push({
        code: "ucp_notice_disallowed_markup",
        message: "Notice message may only contain <b>, <i>, <br>, and <a href>",
      });
  }

  return { errors, warnings };
};

/**
 * Assembles the UCP custom attributes for a productInput. Eligibility is
 * always emitted explicitly (`true`/`false`) so flipping a product off pushes
 * a hard `FALSE` instead of silently keeping the last `TRUE` on Google.
 */
export const buildUcpCustomAttributes = (
  ucp: UcpAttributes,
): CustomAttribute[] => {
  const attributes: CustomAttribute[] = [
    {
      name: "native_commerce",
      groupValues: [
        {
          name: "checkout_eligibility",
          value: ucp.checkoutEligible ? "true" : "false",
        },
      ],
    },
  ];

  if (ucp.noticeType && ucp.noticeMessage)
    attributes.push({
      name: "consumer_notice",
      groupValues: [
        { name: "notice_type", value: ucp.noticeType },
        { name: "notice_message", value: ucp.noticeMessage },
      ],
    });

  if (ucp.merchantItemId)
    attributes.push({ name: "merchant_item_id", value: ucp.merchantItemId });

  return attributes;
};

/**
 * Level-1 Google product taxonomy categories, the unit `report_category_id`
 * accepts (the reports take categories at levels 1–3; we only ever ask at
 * level 1, which is the whole taxonomy in 21 rows).
 *
 * Hardcoded from Google's published `taxonomy-with-ids.en-US.txt`
 * (version 2021-09-21) rather than fetched: the top level has been stable for
 * years, and the alternative is shipping a 5,595-row table to resolve 21
 * values. Google's own reports example uses 536 (Home & Garden), which is the
 * cross-check that these ids are the ones the report wants.
 */
export const PRODUCT_CATEGORIES = [
  { id: 1, name: "Animals & Pet Supplies" },
  { id: 166, name: "Apparel & Accessories" },
  { id: 8, name: "Arts & Entertainment" },
  { id: 537, name: "Baby & Toddler" },
  { id: 111, name: "Business & Industrial" },
  { id: 141, name: "Cameras & Optics" },
  { id: 222, name: "Electronics" },
  { id: 412, name: "Food, Beverages & Tobacco" },
  { id: 436, name: "Furniture" },
  { id: 632, name: "Hardware" },
  { id: 469, name: "Health & Beauty" },
  { id: 536, name: "Home & Garden" },
  { id: 5181, name: "Luggage & Bags" },
  { id: 772, name: "Mature" },
  { id: 783, name: "Media" },
  { id: 922, name: "Office Supplies" },
  { id: 5605, name: "Religious & Ceremonial" },
  { id: 2092, name: "Software" },
  { id: 988, name: "Sporting Goods" },
  { id: 1239, name: "Toys & Games" },
  { id: 888, name: "Vehicles & Parts" },
] as const;

export const categoryName = (id: number) =>
  PRODUCT_CATEGORIES.find((category) => category.id === id)?.name ?? null;

/**
 * Maps a product's `googleProductCategory` to a level-1 category id.
 *
 * The attribute is a free-form string that Google accepts in two shapes: a
 * taxonomy path ("Home & Garden > Kitchen & Dining") or a bare numeric id
 * ("1604"). Only the path form is resolvable here — a numeric id is a leaf we
 * cannot walk up to its root without the full taxonomy — so a numeric value
 * returns null and the caller falls back to asking the merchant.
 */
export const categoryIdFromProductCategory = (
  value: string | null | undefined,
): number | null => {
  if (!value) return null;

  const root = value.split(">")[0]?.trim().toLowerCase();
  if (!root) return null;

  return (
    PRODUCT_CATEGORIES.find((category) => category.name.toLowerCase() === root)
      ?.id ?? null
  );
};

export type ReportRow<Key extends string, View> = {
  [K in Key]?: View;
};

/**
 * Runs one Merchant API report query, following `nextPageToken` to the end.
 *
 * The query language is snake_case (`report_country_code`) while the JSON it
 * returns is camelCase (`reportCountryCode`), and every row arrives wrapped in
 * a per-view envelope — `results: [{ competitiveVisibilityCompetitorView: {…} }]`
 * — so callers unwrap by view key rather than reading the row directly.
 */
const searchReport = async <Key extends string, View>(
  accessToken: string,
  accountId: string,
  {
    query,
    view,
    maximumPages = 10,
  }: {
    query: string;
    view: Key;
    maximumPages?: number;
  },
): Promise<Result<View[], Error>> => {
  const all: View[] = [];
  let pageToken: string | null = null;

  for (const _ of Array.from({ length: maximumPages })) {
    const page: Result<
      { results?: ReportRow<Key, View>[]; nextPageToken?: string },
      Error
    > = await api(
      accessToken,
      `/reports/v1/accounts/${accountId}/reports:search`,
      {
        method: "POST",
        body: {
          query,
          pageSize: 1000,
          ...(pageToken ? { pageToken } : {}),
        },
      },
    );
    if (!page.success) return page;

    for (const row of page.data.results ?? []) {
      const value = row[view];
      if (value) all.push(value);
    }

    pageToken = page.data.nextPageToken ?? null;
    if (!pageToken) break;
  }

  return { success: true, data: all };
};

export type CompetitiveVisibilityRow = {
  domain?: string;
  isYourDomain?: boolean;
  /** 1-based position among competing domains; lower is more visible. */
  rank?: number;
  /** Ratio 0–1 of how often this rival appeared versus the merchant. */
  relativeVisibility?: number;
  /** Ratio 0–1 of result pages carrying both this rival and the merchant. */
  pageOverlapRate?: number;
  /** Ratio 0–1 of those shared pages where the rival placed higher. */
  higherPositionRate?: number;
  adsOrganicRatio?: number;
};

export type TrafficSource = "ADS" | "ORGANIC";

/**
 * The rivals Google actually observed competing with this merchant.
 *
 * Every filter here is mandatory per the reports guide — a date range plus
 * `report_country_code`, `report_category_id` and `traffic_source` — and
 * `domain` must be selected but cannot be filtered on. An account below
 * Google's (undocumented) minimum impression volume returns zero rows rather
 * than an error, which is why callers treat empty as "not enough data yet"
 * instead of as a failure.
 */
export const competitiveVisibilityCompetitors = async (
  accessToken: string,
  accountId: string,
  {
    country,
    categoryId,
    trafficSource,
    days = 30,
  }: {
    country: string;
    categoryId: number;
    trafficSource: TrafficSource;
    days?: number;
  },
): Promise<Result<CompetitiveVisibilityRow[], Error>> => {
  // These three land in the query as string literals, and every one of them
  // arrives from a server action — that is, from the client, where the compiler's
  // types are no longer load-bearing. Validated rather than escaped: all three
  // have tiny closed domains, so an allowlist is both stricter and simpler than
  // quoting rules for a query language whose escaping we do not control.
  if (!/^[A-Z]{2}$/.test(country))
    return {
      success: false,
      error: new RequestError(`Invalid report country: ${country}`),
    };

  if (trafficSource !== "ADS" && trafficSource !== "ORGANIC")
    return {
      success: false,
      error: new RequestError(`Invalid traffic source: ${trafficSource}`),
    };

  if (!PRODUCT_CATEGORIES.some((category) => category.id === categoryId))
    return {
      success: false,
      error: new RequestError(`Unknown report category: ${categoryId}`),
    };

  const day = 24 * 60 * 60 * 1000;
  // Google's competitive data lags a few days; ending the window today
  // reliably returned nothing, so the range stops three days back.
  const until = new Date(Date.now() - 3 * day);
  // `BETWEEN` is inclusive on both ends, so the span is (days - 1) back from
  // the end date — otherwise a 30-day window would cover 31 dates.
  const since = new Date(until.getTime() - (days - 1) * day);
  const stamp = (date: Date) => date.toISOString().slice(0, 10);

  const query = [
    "SELECT report_country_code, report_category_id, traffic_source, domain,",
    "is_your_domain, rank, ads_organic_ratio, page_overlap_rate,",
    "higher_position_rate, relative_visibility",
    "FROM competitive_visibility_competitor_view",
    `WHERE date BETWEEN '${stamp(since)}' AND '${stamp(until)}'`,
    `AND report_country_code = '${country}'`,
    `AND report_category_id = ${categoryId}`,
    `AND traffic_source = '${trafficSource}'`,
    "ORDER BY rank",
  ].join(" ");

  return searchReport<
    "competitiveVisibilityCompetitorView",
    CompetitiveVisibilityRow
  >(accessToken, accountId, {
    query,
    view: "competitiveVisibilityCompetitorView",
  });
};

/*
 * `price_competitiveness_product_view` is the other half of this reporting
 * surface — benchmark price per offer — and `searchReport` already generalizes
 * to it. It is deliberately not wrapped here: it carries no rival identity
 * (Google anonymizes the benchmark), so it can price a competitor set but never
 * discover one, and nothing in the product consumes prices from it yet. Adding
 * the wrapper before a caller exists would ship an untested export.
 */

/** Extracts the numeric account id from an `accounts/{id}` resource name. */
export const accountIdFromName = (name: string): string | null => {
  const match = name.match(/^accounts\/(\d+)$/);
  return match?.[1] ?? null;
};

export const notConfiguredError = () =>
  new RequestError(
    "Google Merchant integration not configured (GOOGLE_MERCHANT_CLIENT_ID, GOOGLE_MERCHANT_CLIENT_SECRET, ECENTIC_MCA_ID)",
  );
