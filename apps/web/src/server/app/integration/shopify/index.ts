"use server";

import crypto from "node:crypto";
import { resultify, unwrapResult } from "@zenncore/utils";
import { type TransactionScope, withTransaction } from "../../../database";
import { withAuthentication } from "../../../utils/authentication";
import { withContext } from "../../../utils/context";
import { Environment } from "../../../utils/environment";
import {
  ConflictError,
  IntegrationAuthError,
  NotFoundError,
  RequestError,
  ValidationError,
} from "../../../utils/error";
import * as HTTP from "../../../utils/http";
import {
  normalizeHostname,
  resolveTrackerPublicOrigin,
} from "../../../utils/tracking";
import * as Product from "../../product";
import * as Store from "../../store";
import * as StoreAccount from "../../store-account";
import { redeemRefreshToken } from "./token";

type Type = {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  status: string;
  published_at: string | null;
  variants: {
    id: number;
    price: string;
    compare_at_price: string | null;
    sku: string;
  }[];
  images: { id: number; src: string }[];
};

type ShopifyShop = {
  address1: string;
  address2: string;
  auto_configure_tax_inclusivity: boolean;
  checkout_api_supported: boolean;
  city: string;
  country: string;
  country_code: string;
  country_name: string;
  county_taxes: boolean;
  created_at: string;
  customer_email: string;
  currency: string;
  domain: string;
  enabled_presentment_currencies: string[];
  eligible_for_payments: boolean;
  email: string;
  finances: boolean;
  force_ssl: boolean;
  google_apps_domain: string | null;
  google_apps_login_enabled: boolean | null;
  has_discounts: boolean;
  has_gift_cards: boolean;
  has_storefront: boolean;
  iana_timezone: string;
  id: number;
  latitude: number;
  longitude: number;
  money_format: string;
  money_in_emails_format: string;
  money_with_currency_format: string;
  money_with_currency_in_emails_format: string;
  multi_location_enabled: boolean;
  myshopify_domain: string;
  name: string;
  password_enabled: boolean;
  phone: string | null;
  plan_display_name: string;
  pre_launch_enabled: boolean;
  plan_name: string;
  primary_locale: string;
  primary_location_id: number;
  province: string;
  province_code: string;
  requires_extra_payments_agreement: boolean;
  setup_required: boolean;
  shop_owner: string;
  source: string | null;
  taxes_included: boolean | null;
  tax_shipping: boolean | null;
  timezone: string;
  transactional_sms_disabled: boolean;
  updated_at: string;
  weight_unit: string;
  zip: string;
  marketing_sms_consent_enabled_at_checkout: boolean;
};

const API_VERSION = "2026-04";

// Store domains are persisted inconsistently — Shopify rows as a bare host
// (`ecentic.myshopify.com`), other platforms with a scheme
// (`https://shop.example.com`). `fetch`/`new URL` require an absolute URL, so a
// bare host throws `Failed to parse URL from ...`. Collapse either shape to the
// canonical host and force `https://`.
const shopBaseUrl = (domain: string) => `https://${normalizeHostname(domain)}`;

const storefrontHostsFromShop = (record: {
  domain: string;
  myshopify_domain: string;
}) => {
  const hosts = new Set<string>();
  hosts.add(normalizeHostname(record.domain));
  hosts.add(normalizeHostname(record.myshopify_domain));
  return [...hosts];
};

const fetchShopCurrency = async (
  domain: string,
  accessToken: string,
): Promise<string | null> => {
  const response = await HTTP.request(
    `${shopBaseUrl(domain)}/admin/api/${API_VERSION}/shop.json`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    },
  );

  if (!response.success) return null;

  const parsed = await HTTP.parse<{ shop: { currency: string } }>(response);
  if (!parsed.success) return null;

  return parsed.data.shop.currency;
};

/**
 * Imports products from Shopify Admin API. Used by OAuth callback (no session
 * wrapper) and by {@link syncProducts} (authenticated).
 *
 * Accepts an optional `currency` (ISO 4217) and `tx` (transaction scope).
 * When `currency` is omitted the shop's configured currency is fetched from
 * the Shopify Admin API.
 */
export const syncShopifyCatalog = withContext(
  async (
    context,
    {
      user: userId,
      store: storeId,
      storeAccount: storeAccountId,
      currency: override,
      tx,
    }: {
      user: string;
      store: string;
      storeAccount?: string;
      currency?: string;
      tx?: TransactionScope;
    },
  ) => {
    const options = tx ? { tx } : undefined;

    const store = await Store.get(Environment.SERVER, storeId, options);
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    if (
      store.data.platform !== "shopify-public" &&
      store.data.platform !== "shopify"
    )
      return {
        success: false,
        error: new Error("Store is not a Shopify store"),
      };

    const { domain } = store.data;

    const resolved = await (async () => {
      if (storeAccountId) {
        const account = await StoreAccount.get(
          Environment.SERVER,
          storeAccountId,
          options,
        );
        if (!account.success)
          return { success: false as const, error: account.error };
        if (!account.data?.accessToken)
          return {
            success: false as const,
            error: new Error("Missing Shopify access token"),
          };
        return {
          success: true as const,
          accessToken: account.data.accessToken,
        };
      }
      return resolveAccessToken(storeId);
    })();

    if (!resolved.success) return resolved;

    const { accessToken } = resolved;

    const currency =
      override ?? (await fetchShopCurrency(domain, accessToken)) ?? null;

    const update = await Store.update(
      Environment.SERVER,
      storeId,
      { status: "syncing" },
      options,
    );

    if (!update.success) return update;

    const all: Type[] = [];

    const limit = 250;
    const maximum = 10;

    let url: string | null =
      `${shopBaseUrl(domain)}/admin/api/${API_VERSION}/products.json?limit=${limit}`;

    for (const _ of Array.from({ length: maximum })) {
      if (!url) break;

      const response = await HTTP.request(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.success) break;

      const parsed = await HTTP.parse<{
        products: Type[];
      }>(response);

      if (!parsed.success) break;

      all.push(...parsed.data.products);

      url = (() => {
        const link = response.data.headers.get("Link") ?? "";
        const next = link.match(/<([^>]+)>;\s*rel="next"/);
        return next?.[1] ?? null;
      })();
    }

    const results = await Promise.all(
      all.map((item) => {
        const variant = item.variants[0];

        return Product.sync(
          Environment.SERVER,
          {
            storeId,
            userId,
            externalId: item.id.toString(),
            title: item.title,
            description: item.body_html,
            price: variant?.price ?? null,
            compareAtPrice: variant?.compare_at_price ?? null,
            currency,
            images: JSON.stringify(item.images.map((image) => image.src)),
            url: `${domain}/products/${item.handle}`,
            sku: variant?.sku ?? null,
            status: item.status === "active" ? "active" : "draft",
            rawData: JSON.stringify(item),
            syncedAt: new Date(),
          },
          options,
        );
      }),
    );

    const imported = results.filter((result) => result.success).length;

    context.span.addBreadcrumb({
      category: "shopify.catalog.sync",
      data: {
        "store.id": storeId,
        "products.fetched": all.length,
        "products.imported": imported,
      },
    });

    const insertion = await Store.update(
      Environment.SERVER,
      storeId,
      { status: "connected", lastSyncedAt: new Date() },
      options,
    );

    if (!insertion.success) return insertion;

    return { success: true, data: imported };
  },
);

export const syncProducts = withAuthentication(
  async (context, { store: id }: { store: string }) => {
    return syncShopifyCatalog(Environment.SERVER, {
      user: context.session.user.id,
      store: id,
    });
  },
  "Shopify.syncProducts",
);

export const refreshAccessToken = withContext(
  async (_, { store: storeId }: { store: string }) => {
    const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = process.env;

    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET)
      return {
        success: false,
        error: new IntegrationAuthError("Shopify integration not configured"),
      };

    const storeAccount = await StoreAccount.getForStore(Environment.SERVER, {
      store: storeId,
    });
    if (!storeAccount.success) return storeAccount;
    if (!storeAccount.data?.refreshToken)
      return {
        success: false,
        error: new IntegrationAuthError("No refresh token stored"),
      };

    const { refreshToken, refreshTokenExpiresAt } = storeAccount.data;

    if (refreshTokenExpiresAt && refreshTokenExpiresAt.getTime() < Date.now())
      return {
        success: false,
        error: new IntegrationAuthError(
          "Shopify authorization has expired. Please reconnect your store.",
        ),
      };

    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    const shopId = normalizeHostname(store.data.domain);

    const token = await redeemRefreshToken({
      shop: shopId,
      clientId: SHOPIFY_API_KEY,
      clientSecret: SHOPIFY_API_SECRET,
      refreshToken,
    });

    if (!token.success) return token;

    return StoreAccount.update(Environment.SERVER, storeAccount.data.id, {
      accessToken: token.data.access_token,
      accessTokenExpiresAt: new Date(Date.now() + token.data.expires_in * 1000),
      refreshToken: token.data.refresh_token,
      refreshTokenExpiresAt: new Date(
        Date.now() + token.data.refresh_token_expires_in * 1000,
      ),
    });
  },
  "Shopify.refreshAccessToken",
);

const resolveAccessToken = async (
  storeId: string,
): Promise<
  { success: true; accessToken: string } | { success: false; error: Error }
> => {
  const storeAccount = await StoreAccount.getForStore(Environment.SERVER, {
    store: storeId,
  });

  if (!storeAccount.success) return storeAccount;
  if (!storeAccount.data?.accessToken)
    return {
      success: false,
      error: new IntegrationAuthError("Missing Shopify access token"),
    };

  const { accessTokenExpiresAt, accessToken } = storeAccount.data;
  const isExpired =
    accessTokenExpiresAt &&
    accessTokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!isExpired) return { success: true, accessToken };

  const refreshed = await refreshAccessToken(Environment.SERVER, {
    store: storeId,
  });
  if (!refreshed.success) return refreshed;
  if (!refreshed.data?.accessToken)
    return {
      success: false,
      error: new IntegrationAuthError("Missing access token after refresh"),
    };

  return { success: true, accessToken: refreshed.data.accessToken };
};

export const handleOAuthCallback = withContext(
  async (
    context,
    {
      code,
      shop: shopId,
      user: userId,
    }: {
      code: string;
      shop: string;
      user: string;
    },
  ) => {
    const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = process.env;

    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      return {
        success: false,
        error: new Error("Shopify integration not configured"),
      };
    }

    const tokenResponse = await HTTP.request(
      `https://${shopId}/admin/oauth/access_token?expiring=1`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }),
      },
    );

    const t = await HTTP.parse<{
      access_token: string;
      scope: string;
      expires_in: number;
      refresh_token: string;
      refresh_token_expires_in: number;
    }>(tokenResponse);

    if (!t.success) return t;

    const accessToken = t.data.access_token;

    context.span.addBreadcrumb({
      category: "shopify.oauth.exchange",
      data: { shop: shopId },
    });

    const response = await HTTP.request(
      `https://${shopId}/admin/api/${API_VERSION}/shop.json`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
      },
    );

    // response.data.body is  readable stream, so we need to read it all
    // console.log("response", await new Response(response.data.body).text());

    const shop = await HTTP.parse<{
      shop: ShopifyShop;
    }>(response);

    if (!shop.success) {
      return {
        success: false,
        error: new Error("Failed to fetch shop"),
      };
    }

    const storefrontHosts = (() => {
      if (!shop.success) return [normalizeHostname(`https://${shopId}`)];
      return storefrontHostsFromShop(shop.data.shop);
    })();

    // const currency = shop.success ? shop.data.shop.currency : undefined;

    const trackerApiKey = crypto.randomUUID();

    const reconciliation = await Store.reconcileConnection(Environment.SERVER, {
      userId,
      domain: shopBaseUrl(shopId),
      storeId: String(shop.data.shop.id),
      verified: true,
    });
    if (!reconciliation.success) return reconciliation;

    if (reconciliation.data.kind === "claimed")
      return {
        success: false,
        error: new ConflictError(
          "This store is already connected to another écentic account.",
        ),
      };

    const existing =
      reconciliation.data.kind === "owned" ? reconciliation.data.store : null;

    // A public catalog import (matched by the shop id `/meta.json` gave it)
    // becoming a real install. The row is refreshed in place — same products,
    // same ids — but it has never had a tracker key, script tag or webhook, so
    // those steps run as they would for a fresh connect.
    const upgrading = existing?.platform === "shopify-public";

    const transaction = await resultify(() =>
      withTransaction(async (tx) => {
        const creation = existing
          ? await Store.update(
              Environment.SERVER,
              existing.id,
              {
                platform: "shopify",
                name: shop.data.shop.name,
                // Always the `*.myshopify.com` host, not `shop.domain` (which
                // can be a custom primary domain the Admin API won't answer on).
                // Matches the create path so a reconnect can't clobber the row
                // with a bare/custom-domain value.
                domain: shopBaseUrl(shopId),
                storefrontHosts,
                status: "connected",
                storeId: String(shop.data.shop.id),
                // Keeps a reconnect's live tracker key; gives an upgraded
                // public import its first one.
                trackerApiKey: existing.trackerApiKey ?? trackerApiKey,
              },
              { tx },
            )
          : await Store.create(
              Environment.SERVER,
              {
                userId,
                platform: "shopify",
                name: shopId.replace(".myshopify.com", ""),
                domain: shopBaseUrl(shopId),
                trackerApiKey,
                storefrontHosts,
                status: "connected",
                storeId: String(shop.data.shop.id),
              },
              { tx },
            );

        if (!creation.success) throw creation.error;
        if (!creation.data) throw new Error("Store creation returned no data");

        const storeAccount = await StoreAccount.sync(
          Environment.SERVER,
          {
            storeId: creation.data.id,
            accessToken,
            accessTokenExpiresAt: new Date(
              Date.now() + t.data.expires_in * 1000,
            ),
            refreshToken: t.data.refresh_token,
            refreshTokenExpiresAt: new Date(
              Date.now() + t.data.refresh_token_expires_in * 1000,
            ),
            scope: t.data.scope,
          },
          { tx },
        );

        if (!storeAccount.success) throw storeAccount.error;

        unwrapResult(
          await syncShopifyCatalog(Environment.SERVER, {
            user: userId,
            store: creation.data.id,
            storeAccount: storeAccount.data.id,
            tx,
          }),
        );

        return creation.data;
      }),
    );

    if (!transaction.success) return transaction;

    context.span.addBreadcrumb({
      category: "shopify.store.created",
      data: { "store.id": transaction.data.id, shop: shopId },
    });

    const store = transaction.data;

    // On a fresh connect, install the storefront tracker script tag. On an
    // owned reconnect the existing tag (and its tracker key) are still in place,
    // so re-posting would just create a duplicate — skip it. An upgraded public
    // import never had one, so it gets the full install.
    if (!existing || upgrading) {
      const origin = resolveTrackerPublicOrigin();

      const probe =
        process.env.ECENTIC_TRACKER_PROBE === "true" ? "&probe=1" : "";

      const src = `${origin}/tracker.js?sid=${encodeURIComponent(
        store.id,
      )}&k=${encodeURIComponent(store.trackerApiKey ?? trackerApiKey)}${probe}`;

      await HTTP.request(
        `https://${shopId}/admin/api/${API_VERSION}/script_tags.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            script_tag: {
              event: "onload",
              src,
              display_scope: "all",
            },
          }),
        },
      );

      context.span.addBreadcrumb({
        category: "shopify.script_tag.installed",
        data: { "store.id": store.id, shop: shopId },
      });

      // Register the `orders/paid` webhook so the performance-fee attribution
      // pipeline sees completed orders. Routes to the same handler as the GDPR
      // topics; failures here must not fail the connect, so we don't unwrap.
      await HTTP.request(
        `https://${shopId}/admin/api/${API_VERSION}/webhooks.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            webhook: {
              topic: "orders/paid",
              address: `${origin}/api/integrations/shopify/webhooks`,
              format: "json",
            },
          }),
        },
      );

      context.span.addBreadcrumb({
        category: "shopify.webhook.registered",
        data: { "store.id": store.id, shop: shopId, topic: "orders/paid" },
      });
    }

    // `reconnected` distinguishes a token refresh for a store this user already
    // onboarded (`kind: "owned"`) from a first-time connect. Callers use it to
    // skip the onboarding product picker on reconnects.
    return {
      success: true,
      data: { storeId: store.id, reconnected: Boolean(existing) },
    };
  },
  "Shopify.handleOAuthCallback",
);

type ShopifyMetafield = {
  namespace: string;
  key: string;
  type: string;
  value: string;
};

const UCP_NAMESPACE = "ucp";
const ECENTIC_NAMESPACE = "ecentic";

/**
 * Metafield definitions for every field this app writes. Definitions are
 * what make the values visible outside the admin: `storefront: PUBLIC_READ`
 * exposes them to Liquid (`product.metafields.ecentic.*` / `.ucp.*`) and the
 * Storefront API, which is what lets a theme/app block render the JSON-LD into
 * storefront HTML where crawling agents can actually read it. Without a
 * definition the values sit in the backend and no AI surface ever sees them.
 *
 * Naming convention: merchant-facing definition names are prefixed
 * "ecentic: " so every field this app owns is recognizable in the admin.
 */
const UCP_METAFIELD_DEFINITIONS: Record<
  "PRODUCT" | "SHOP",
  {
    key: string;
    name: string;
    type: string;
    namespace?: string;
    description?: string;
  }[]
> = {
  PRODUCT: [
    {
      namespace: ECENTIC_NAMESPACE,
      key: "structured_data",
      name: "ecentic: Structured Data (JSON-LD)",
      description:
        "AI-optimized schema.org Product JSON-LD published by ecentic. When set, the ecentic app embed renders it on the product page in place of the default markup built from the live product data.",
      type: "json",
    },
    { key: "agentic_summary", name: "ecentic: Agentic Summary", type: "json" },
  ],
  SHOP: [
    {
      key: "merchant_profile",
      name: "ecentic: Merchant Profile (UCP)",
      type: "json",
    },
    {
      key: "merchant_name",
      name: "ecentic: Merchant Name",
      type: "single_line_text_field",
    },
    {
      key: "description",
      name: "ecentic: Merchant Description",
      type: "multi_line_text_field",
    },
    { key: "logo_url", name: "ecentic: Logo URL", type: "url" },
    {
      key: "payment_methods",
      name: "ecentic: Payment Methods",
      type: "list.single_line_text_field",
    },
    {
      key: "shipping_policy",
      name: "ecentic: Shipping Policy",
      type: "multi_line_text_field",
    },
    {
      key: "return_policy",
      name: "ecentic: Return Policy",
      type: "multi_line_text_field",
    },
    {
      key: "contact_email",
      name: "ecentic: Contact Email",
      type: "single_line_text_field",
    },
    {
      key: "sustainability",
      name: "ecentic: Sustainability",
      type: "multi_line_text_field",
    },
    {
      key: "certifications",
      name: "ecentic: Certifications",
      type: "list.single_line_text_field",
    },
  ],
};

const METAFIELD_DEFINITION_CREATE = `#graphql
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

/** Shops whose definitions were already ensured this process lifetime. */
const ensuredDefinitionOwners = new Set<string>();

/**
 * Idempotently creates the `ucp` metafield definitions for a shop. A `TAKEN`
 * user error means the definition already exists (possibly created before this
 * code shipped) and counts as success — existing values with a matching type
 * are adopted by the definition. Best-effort: callers push values regardless.
 */
const ensureUcpMetafieldDefinitions = async (
  domain: string,
  accessToken: string,
  ownerType: "PRODUCT" | "SHOP",
): Promise<{ ensured: number; errors: string[] }> => {
  const cacheKey = `${normalizeHostname(domain)}:${ownerType}`;
  if (ensuredDefinitionOwners.has(cacheKey))
    return { ensured: UCP_METAFIELD_DEFINITIONS[ownerType].length, errors: [] };

  const errors: string[] = [];

  for (const definition of UCP_METAFIELD_DEFINITIONS[ownerType]) {
    const result = await graphqlRequest<{
      metafieldDefinitionCreate: {
        createdDefinition: { id: string } | null;
        userErrors: { code: string; message: string }[];
      };
    }>(domain, accessToken, METAFIELD_DEFINITION_CREATE, {
      definition: {
        name: definition.name,
        namespace: definition.namespace ?? UCP_NAMESPACE,
        key: definition.key,
        type: definition.type,
        ownerType,
        access: { storefront: "PUBLIC_READ" },
        ...(definition.description && {
          description: definition.description,
        }),
      },
    });

    if (!result.success) {
      errors.push(`${definition.key}: ${result.error.message}`);
      continue;
    }

    const blocking = result.data.metafieldDefinitionCreate.userErrors.filter(
      (entry) => entry.code !== "TAKEN",
    );
    if (blocking.length > 0) {
      errors.push(
        `${definition.key}: ${blocking.map((entry) => entry.message).join(", ")}`,
      );
    }
  }

  if (errors.length === 0) ensuredDefinitionOwners.add(cacheKey);

  return {
    ensured: UCP_METAFIELD_DEFINITIONS[ownerType].length - errors.length,
    errors,
  };
};

const metafieldBasePath = (ownerPath: string) =>
  ownerPath ? `${ownerPath}/metafields` : "metafields";

const findExistingMetafield = async (
  domain: string,
  accessToken: string,
  ownerPath: string,
  namespace: string,
  key: string,
): Promise<number | null> => {
  const response = await HTTP.request(
    `${shopBaseUrl(domain)}/admin/api/${API_VERSION}/${metafieldBasePath(
      ownerPath,
    )}.json?namespace=${encodeURIComponent(namespace)}&key=${encodeURIComponent(key)}`,
    {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.success) return null;

  const parsed = await HTTP.parse<{
    metafields: { id: number; namespace: string; key: string }[];
  }>(response);

  if (!parsed.success) return null;

  const match = parsed.data.metafields.find(
    (entry) => entry.namespace === namespace && entry.key === key,
  );
  return match?.id ?? null;
};

const upsertMetafield = async (
  domain: string,
  accessToken: string,
  ownerPath: string,
  field: ShopifyMetafield,
) => {
  const existingId = await findExistingMetafield(
    domain,
    accessToken,
    ownerPath,
    field.namespace,
    field.key,
  );

  if (existingId !== null) {
    return HTTP.request(
      `${shopBaseUrl(domain)}/admin/api/${API_VERSION}/${ownerPath}/metafields/${existingId}.json`,
      {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metafield: {
            id: existingId,
            value: field.value,
            type: field.type,
          },
        }),
      },
    );
  }

  return HTTP.request(
    `${shopBaseUrl(domain)}/admin/api/${API_VERSION}/${ownerPath}/metafields.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metafield: field }),
    },
  );
};

const splitList = (value: string | null | undefined): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const buildShopMetafields = (input: {
  profile: {
    merchantName?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    paymentMethods?: string | null;
    shippingPolicy?: string | null;
    returnPolicy?: string | null;
    contactEmail?: string | null;
    sustainability?: string | null;
    certifications?: string | null;
  };
  generatedJson: string;
}): ShopifyMetafield[] => {
  const fields: ShopifyMetafield[] = [
    {
      namespace: UCP_NAMESPACE,
      key: "merchant_profile",
      type: "json",
      value: input.generatedJson,
    },
  ];

  const facets: {
    key: string;
    type: string;
    value: string | string[] | null | undefined;
  }[] = [
    {
      key: "merchant_name",
      type: "single_line_text_field",
      value: input.profile.merchantName,
    },
    {
      key: "description",
      type: "multi_line_text_field",
      value: input.profile.description,
    },
    { key: "logo_url", type: "url", value: input.profile.logoUrl },
    {
      key: "payment_methods",
      type: "list.single_line_text_field",
      value: splitList(input.profile.paymentMethods),
    },
    {
      key: "shipping_policy",
      type: "multi_line_text_field",
      value: input.profile.shippingPolicy,
    },
    {
      key: "return_policy",
      type: "multi_line_text_field",
      value: input.profile.returnPolicy,
    },
    {
      key: "contact_email",
      type: "single_line_text_field",
      value: input.profile.contactEmail,
    },
    {
      key: "sustainability",
      type: "multi_line_text_field",
      value: input.profile.sustainability,
    },
    {
      key: "certifications",
      type: "list.single_line_text_field",
      value: splitList(input.profile.certifications),
    },
  ];

  for (const facet of facets) {
    if (facet.value === null || facet.value === undefined) continue;
    if (Array.isArray(facet.value)) {
      if (facet.value.length === 0) continue;
      fields.push({
        namespace: UCP_NAMESPACE,
        key: facet.key,
        type: facet.type,
        value: JSON.stringify(facet.value),
      });
      continue;
    }
    if (facet.value.trim().length === 0) continue;
    fields.push({
      namespace: UCP_NAMESPACE,
      key: facet.key,
      type: facet.type,
      value: facet.value,
    });
  }

  return fields;
};

const buildProductMetafields = (input: {
  structuredJson: string;
  product: {
    title: string;
    sku: string | null;
    price: string | null;
    currency: string | null;
  };
}): ShopifyMetafield[] => {
  const summary = (() => {
    try {
      const parsed = JSON.parse(input.structuredJson) as { name?: unknown };
      return {
        name:
          typeof parsed.name === "string" ? parsed.name : input.product.title,
        sku: input.product.sku ?? null,
        price: input.product.price ?? null,
        currency: input.product.currency ?? null,
      };
    } catch {
      return {
        name: input.product.title,
        sku: input.product.sku ?? null,
        price: input.product.price ?? null,
        currency: input.product.currency ?? null,
      };
    }
  })();

  return [
    {
      namespace: ECENTIC_NAMESPACE,
      key: "structured_data",
      type: "json",
      value: input.structuredJson,
    },
    {
      namespace: UCP_NAMESPACE,
      key: "agentic_summary",
      type: "json",
      value: JSON.stringify(summary),
    },
  ];
};

export const pushShopMetafields = withContext(
  async (
    context,
    {
      store: storeId,
      profile,
      generatedJson,
    }: {
      store: string;
      profile: Parameters<typeof buildShopMetafields>[0]["profile"];
      generatedJson: string;
    },
  ) => {
    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false as const, error: new Error("Store not found") };
    if (
      store.data.platform !== "shopify-public" &&
      store.data.platform !== "shopify"
    )
      return {
        success: false as const,
        error: new Error("Store is not a Shopify store"),
      };

    const resolved = await resolveAccessToken(storeId);
    if (!resolved.success) return resolved;

    const { domain } = store.data;
    const { accessToken } = resolved;

    const definitions = await ensureUcpMetafieldDefinitions(
      domain,
      accessToken,
      "SHOP",
    );

    const fields = buildShopMetafields({ profile, generatedJson });
    const errors: string[] = [];

    for (const field of fields) {
      const response = await upsertMetafield(
        domain,
        accessToken,
        "",
        field,
      ).then((result) => {
        if (!result.success) return result;
        return HTTP.parse<{ metafield?: unknown; errors?: unknown }>(result);
      });

      if (!response.success) {
        errors.push(`${field.key}: ${response.error.message}`);
        continue;
      }

      if (response.data?.errors) {
        errors.push(`${field.key}: ${JSON.stringify(response.data.errors)}`);
      }
    }

    context.span.addBreadcrumb({
      category: "shopify.shop.metafields",
      data: {
        "store.id": storeId,
        "metafields.written": fields.length - errors.length,
        "metafields.errors": errors.length,
        "definitions.ensured": definitions.ensured,
        "definitions.errors": definitions.errors.length,
      },
    });

    if (errors.length === fields.length)
      return {
        success: false as const,
        error: new Error(errors.slice(0, 3).join("; ")),
      };

    return {
      success: true as const,
      data: { written: fields.length - errors.length, errors },
    };
  },
  "Shopify.pushShopMetafields",
);

export const pushProductMetafields = withContext(
  async (
    context,
    {
      product: productId,
      structuredJson,
    }: {
      product: string;
      structuredJson: string;
    },
  ) => {
    const product = await Product.get(Environment.SERVER, productId);
    if (!product.success) return product;
    if (!product.data)
      return { success: false as const, error: new Error("Product not found") };

    if (!product.data.externalId)
      return {
        success: false as const,
        error: new Error("Product has no Shopify external ID"),
      };

    const store = await Store.get(Environment.SERVER, product.data.storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false as const, error: new Error("Store not found") };
    if (
      store.data.platform !== "shopify-public" &&
      store.data.platform !== "shopify"
    )
      return {
        success: false as const,
        error: new Error("Store is not a Shopify store"),
      };

    const resolved = await resolveAccessToken(store.data.id);
    if (!resolved.success) return resolved;

    const { domain } = store.data;
    const { accessToken } = resolved;

    const definitions = await ensureUcpMetafieldDefinitions(
      domain,
      accessToken,
      "PRODUCT",
    );

    const fields = buildProductMetafields({
      structuredJson,
      product: {
        title: product.data.title,
        sku: product.data.sku,
        price: product.data.price,
        currency: product.data.currency,
      },
    });

    const ownerPath = `products/${product.data.externalId}`;
    const errors: string[] = [];

    for (const field of fields) {
      const response = await upsertMetafield(
        domain,
        accessToken,
        ownerPath,
        field,
      );
      if (!response.success) {
        errors.push(`${field.key}: ${response.error.message}`);
      }
    }

    context.span.addBreadcrumb({
      category: "shopify.product.metafields",
      data: {
        "product.id": productId,
        "metafields.written": fields.length - errors.length,
        "metafields.errors": errors.length,
        "definitions.ensured": definitions.ensured,
        "definitions.errors": definitions.errors.length,
      },
    });

    if (errors.length === fields.length)
      return {
        success: false as const,
        error: new Error(errors.slice(0, 3).join("; ")),
      };

    return {
      success: true as const,
      data: { written: fields.length - errors.length, errors },
    };
  },
  "Shopify.pushProductMetafields",
);

export const updateProduct = withAuthentication(
  async (
    _context,
    {
      product: id,
      data,
    }: {
      product: string;
      data: {
        title?: string;
        body_html?: string;
      };
    },
  ) => {
    const product = await Product.get(Environment.SERVER, id);
    if (!product.success) return product;

    if (!product.data)
      return { success: false, error: new Error("Product not found") };

    const store = await Store.get(Environment.SERVER, product.data.storeId);
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    if (
      store.data.platform !== "shopify-public" &&
      store.data.platform !== "shopify"
    )
      return {
        success: false,
        error: new Error("Store is not a Shopify store"),
      };

    const resolved = await resolveAccessToken(store.data.id);
    if (!resolved.success) return resolved;

    const { domain } = store.data;
    const { accessToken } = resolved;

    if (!product.data.externalId)
      return { success: false, error: new Error("Product has no external ID") };

    const url = `${shopBaseUrl(domain)}/admin/api/${API_VERSION}/products/${product.data.externalId}.json`;

    const response = await HTTP.request(url, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product: data }),
    });

    if (!response.success) return response;

    const parsed = await HTTP.parse<{ product: Type }>(response);
    if (!parsed.success) return parsed;

    const updated = parsed.data.product;

    await Product.update(Environment.SERVER, id, {
      title: updated.title,
      description: updated.body_html,
      rawData: JSON.stringify(updated),
      syncedAt: new Date(),
    });

    return { success: true, data: updated };
  },
  "Shopify.updateProduct",
);

const normalizeDomain = (domain: string): string => {
  const trimmed = domain.trim().replace(/\/+$/, "");

  const withProtocol = (() => {
    if (trimmed.startsWith("http")) return trimmed;
    return `https://${trimmed}`;
  })();

  const url = new URL(withProtocol);

  if (!url.hostname.includes(".")) {
    url.hostname = `${url.hostname}.myshopify.com`;
  }

  // Storefronts serve https; the SSRF guard refuses plain http in production,
  // so a typed `http://` must not turn into "no public catalog".
  const protocol =
    process.env.NODE_ENV === "production" ? "https:" : url.protocol;

  return `${protocol}//${url.hostname}`;
};

// ---------------------------------------------------------------------------
// Public storefront — what any Shopify store serves without credentials. Every
// request goes through `HTTP.request`'s SSRF guard: the domain is typed by a
// visitor, and a storefront is free to redirect wherever it likes.
// ---------------------------------------------------------------------------

const PROBE_TIMEOUT_MS = 5000;
const CATALOG_TIMEOUT_MS = 20000;
const CATALOG_LIMIT_BYTES = 16 * 1024 * 1024;
const CATALOG_PAGE_SIZE = 250;
const CATALOG_MAX_PAGES = 10;

type PublicMeta = {
  id: number;
  name: string | null;
  currency: string | null;
  myshopify_domain: string;
  published_products_count: number | null;
};

/**
 * Whether a storefront's public catalog is readable. `closed` is an answer —
 * a password page, a 404, a non-JSON body; `unreachable` is the absence of one
 * (timeout, 429, 5xx) and is worth a retry, so the two must never be merged.
 */
type CatalogState = "open" | "closed" | "unreachable";

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

/**
 * `/meta.json` is every Shopify storefront's public identity card. Its `id` is
 * the same shop id the Admin API returns, which is what lets a public import
 * and a later app install of the same store recognise each other. Any site can
 * serve a `/meta.json`; only Shopify's names a myshopify host. Every field is
 * the storefront's say-so, so each is type-checked before it is trusted.
 */
const fetchPublicMeta = async (domain: string): Promise<PublicMeta | null> => {
  const page = await HTTP.page(`${domain}/meta.json`, {
    timeout: PROBE_TIMEOUT_MS,
    limit: 256 * 1024,
    accept: "application/json",
  });
  if (!page.success || page.data.status !== 200) return null;

  const meta = json<Partial<Record<keyof PublicMeta, unknown>>>(page.data.body);
  if (!meta || typeof meta.id !== "number" || !Number.isSafeInteger(meta.id))
    return null;

  const myshopify = text(meta.myshopify_domain);
  if (!myshopify?.endsWith(".myshopify.com")) return null;

  return {
    id: meta.id,
    name: text(meta.name),
    currency: text(meta.currency),
    myshopify_domain: myshopify,
    published_products_count: count(meta.published_products_count),
  };
};

const catalogState = async (domain: string): Promise<CatalogState> => {
  const page = await HTTP.page(`${domain}/products.json?limit=1`, {
    timeout: PROBE_TIMEOUT_MS,
    limit: 1024 * 1024,
    accept: "application/json",
  });

  if (!page.success)
    return page.error.name === "validation-error" ? "closed" : "unreachable";

  const { status } = page.data;
  if (status === 429 || status >= 500) return "unreachable";
  if (status !== 200) return "closed";

  return Array.isArray(json<{ products?: unknown }>(page.data.body)?.products)
    ? "open"
    : "closed";
};

const isShopifyMarkup = (page: HTTP.Page) =>
  page.headers.has("x-shopid") ||
  page.headers.has("x-shopify-stage") ||
  /shopify/i.test(page.headers.get("powered-by") ?? "") ||
  page.body.includes("Shopify.shop") ||
  // Theme stylesheets: `cdn.shopify.com/s/files/…` on older themes, the
  // store's own `/cdn/shop/…` on current ones.
  /<link[^>]+href=["'][^"']*(?:cdn\.shopify\.com\/s\/files|\/cdn\/shop\/)[^"']*\.css/i.test(
    page.body,
  );

/**
 * Whether `domain` is a Shopify storefront and whether its public catalog
 * answers — `null` when it is not Shopify at all. A password-protected store
 * hides `/meta.json` and `/products.json` behind its password page, but that
 * page is still Shopify's markup (its theme stylesheets live on Shopify's
 * CDN — a Buy Button script embedded on another platform does not count):
 * recognisably Shopify, just not importable without the app.
 *
 * `home` is the storefront's homepage when the caller already read it (the
 * landing hero's check shares one read between platforms); omitted, it is
 * fetched only if the identity card is missing.
 */
export const probe = withContext(
  async (_, { domain, home }: { domain: string; home?: HTTP.Page | null }) => {
    const [meta, catalog] = await Promise.all([
      fetchPublicMeta(domain),
      catalogState(domain),
    ]);

    if (meta)
      return {
        success: true as const,
        data: {
          importable: catalog === "open",
          name: meta.name,
          products: meta.published_products_count,
        },
      };

    const page = await (async () => {
      if (home !== undefined) return home;

      const fetched = await HTTP.page(domain, {
        timeout: PROBE_TIMEOUT_MS,
        limit: 3 * 1024 * 1024,
      });
      return fetched.success ? fetched.data : null;
    })();

    if (!page || !isShopifyMarkup(page))
      return { success: true as const, data: null };

    return {
      success: true as const,
      data: { importable: catalog === "open", name: null, products: null },
    };
  },
  "Shopify.probe",
);

/**
 * Every product the public `/products.json` lists, page by page — fetched in
 * full *before* anything is written, so a storefront that stops answering
 * never leaves an empty store behind (or holds a transaction open while it
 * thinks). A first page that fails is a catalog we could not read; a later
 * page that fails ends the walk with what was gathered.
 */
const fetchPublicProducts = async (
  domain: string,
  page = 1,
  gathered: Type[] = [],
): Promise<
  { success: true; data: Type[] } | { success: false; error: Error }
> => {
  const response = await HTTP.page(
    `${domain}/products.json?limit=${CATALOG_PAGE_SIZE}&page=${page}`,
    {
      timeout: CATALOG_TIMEOUT_MS,
      limit: CATALOG_LIMIT_BYTES,
      accept: "application/json",
    },
  );

  const products =
    response.success && response.data.status === 200
      ? json<{ products?: Type[] }>(response.data.body)?.products
      : null;

  if (!Array.isArray(products))
    return page === 1
      ? {
          success: false,
          error: new RequestError(
            "Could not read this store's public catalog. Try again, or connect it with the Shopify app.",
          ),
        }
      : { success: true, data: gathered };

  const all = [...gathered, ...products];
  const done = products.length < CATALOG_PAGE_SIZE || page >= CATALOG_MAX_PAGES;

  return done
    ? { success: true, data: all }
    : fetchPublicProducts(domain, page + 1, all);
};

const savePublicCatalog = async ({
  user,
  store,
  domain,
  products,
  currency,
  tx,
}: {
  user: string;
  store: string;
  domain: string;
  products: Type[];
  currency: string;
  tx?: TransactionScope;
}) => {
  const options = tx ? { tx } : undefined;

  const results = await Promise.all(
    products.map((item) => {
      const variant = item.variants[0];

      return Product.sync(
        Environment.SERVER,
        {
          storeId: store,
          userId: user,
          externalId: item.id.toString(),
          title: item.title,
          description: item.body_html,
          price: variant?.price ?? null,
          compareAtPrice: variant?.compare_at_price ?? null,
          currency,
          images: JSON.stringify(item.images.map((image) => image.src)),
          url: `${domain}/products/${item.handle}`,
          sku: variant?.sku ?? null,
          status: item.published_at ? "active" : "draft",
          rawData: JSON.stringify(item),
          syncedAt: new Date(),
        },
        options,
      );
    }),
  );

  const update = await Store.update(
    Environment.SERVER,
    store,
    { status: "connected", lastSyncedAt: new Date() },
    options,
  );
  if (!update.success) return update;

  return {
    success: true as const,
    data: results.filter((result) => result.success).length,
  };
};

/**
 * Re-imports a public Shopify store from its storefront `/products.json`. No
 * OAuth or access token required.
 */
export const syncPublicCatalog = withContext(
  async (
    context,
    {
      user: userId,
      store: storeId,
      tx,
    }: {
      user: string;
      store: string;
      tx?: TransactionScope;
    },
  ) => {
    const options = tx ? { tx } : undefined;

    const store = await Store.get(Environment.SERVER, storeId, options);
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    if (store.data.platform !== "shopify-public")
      return {
        success: false,
        error: new Error("Store is not a public Shopify store"),
      };

    const domain = normalizeDomain(store.data.domain);

    const [products, meta] = await Promise.all([
      fetchPublicProducts(domain),
      fetchPublicMeta(domain),
    ]);
    if (!products.success) return products;

    const update = await Store.update(
      Environment.SERVER,
      storeId,
      { status: "syncing" },
      options,
    );
    if (!update.success) return update;

    const saved = await savePublicCatalog({
      user: userId,
      store: storeId,
      domain,
      products: products.data,
      currency: meta?.currency || "USD",
      tx,
    });
    if (!saved.success) return saved;

    context.span.addBreadcrumb({
      category: "shopify-public.catalog.sync",
      data: {
        "store.id": storeId,
        "products.fetched": products.data.length,
        "products.imported": saved.data,
      },
    });

    return saved;
  },
  "Shopify.syncPublicCatalog",
);

export const connectPublic = withAuthentication(
  async (context, { domain }: { domain: string }) => {
    const host = normalizeDomain(domain);

    const [meta, catalog] = await Promise.all([
      fetchPublicMeta(host),
      catalogState(host),
    ]);

    if (catalog === "unreachable")
      return {
        success: false,
        error: new RequestError(
          "Could not reach the Shopify store. Check the domain and try again.",
        ),
      };

    if (catalog === "closed")
      return {
        success: false,
        error: new ValidationError(
          "This store does not expose a public product catalog. Check the domain, or connect it with the Shopify app.",
        ),
      };

    // The whole catalog before any write — see `fetchPublicProducts`.
    const products = await fetchPublicProducts(host);
    if (!products.success) return products;

    context.span.addBreadcrumb({
      category: "shopify-public.probe",
      data: { "store.host": host, "products.fetched": products.data.length },
    });

    const storefrontHosts = [normalizeHostname(host)];

    // The shop id from `/meta.json` is what an app install of this store will
    // also carry — reconciling on it lets that install upgrade this row in
    // place, and stops a public import of a store another account installed.
    const reconciliation = await Store.reconcileConnection(Environment.SERVER, {
      userId: context.session.user.id,
      domain: host,
      storeId: meta ? String(meta.id) : null,
    });
    if (!reconciliation.success) return reconciliation;

    if (reconciliation.data.kind === "claimed")
      return {
        success: false,
        error: new ConflictError(
          "This store is already connected to another écentic account.",
        ),
      };

    const existing =
      reconciliation.data.kind === "owned" ? reconciliation.data.store : null;

    // Never downgrade a verified install. The app-connected row keeps its
    // tokens, tracker and webhooks; the caller just lands on that store.
    if (existing && existing.platform !== "shopify-public")
      return {
        success: true as const,
        data: { store: existing, reconnected: true },
      };

    const name =
      meta?.name || new URL(host).hostname.replace(".myshopify.com", "");

    const transaction = await resultify(() =>
      withTransaction(async (tx) => {
        const store = existing
          ? await Store.update(
              Environment.SERVER,
              existing.id,
              {
                platform: "shopify-public",
                name,
                domain: host,
                storefrontHosts,
                status: "syncing",
                storeId: meta ? String(meta.id) : existing.storeId,
              },
              { tx },
            )
          : await Store.create(
              Environment.SERVER,
              {
                userId: context.session.user.id,
                platform: "shopify-public",
                name,
                domain: host,
                storefrontHosts,
                status: "syncing",
                storeId: meta ? String(meta.id) : null,
              },
              { tx },
            );

        if (!store.success) throw store.error;
        if (!store.data) throw new Error("Store creation returned no data");

        const saved = await savePublicCatalog({
          user: context.session.user.id,
          store: store.data.id,
          domain: host,
          products: products.data,
          currency: meta?.currency || "USD",
          tx,
        });
        if (!saved.success) throw saved.error;

        return store.data;
      }),
    );

    if (!transaction.success) return transaction;

    context.span.addBreadcrumb({
      category: "shopify-public.connect.complete",
      data: { "store.id": transaction.data.id, "store.host": host },
    });

    // `reconnected` marks a re-import of a store this user already onboarded.
    // Callers use it to skip the onboarding product picker, which would
    // otherwise let them select past their plan's product limit.
    return {
      success: true as const,
      data: { store: transaction.data, reconnected: Boolean(existing) },
    };
  },
  "Shopify.connectPublic",
);

export const syncPublicProducts = withAuthentication(
  async (context, { store: id }: { store: string }) => {
    const store = await Store.get(Environment.SERVER, id);
    if (!store.success) return store;

    // The sync writes every product under the caller's id — only the owner's
    // own store may be synced.
    if (!store.data || store.data.userId !== context.session.user.id)
      return { success: false, error: new NotFoundError("Store") };

    return syncPublicCatalog(Environment.SERVER, {
      user: context.session.user.id,
      store: id,
    });
  },
  "Shopify.syncPublicProducts",
);

// ---------------------------------------------------------------------------
// Billing — Shopify usage records for the AI-attributed performance fee.
//
// Shopify-installed merchants must be charged through Shopify Billing, so the
// performance fee is a capped usage line on an app subscription. These helpers
// speak the GraphQL Admin API (the REST calls above pre-date billing); the
// period-close cron routes here for stores that carry a `shopifyUsageLineId`.
// ---------------------------------------------------------------------------

const graphqlRequest = async <T>(
  domain: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<{ success: true; data: T } | { success: false; error: Error }> => {
  const response = await HTTP.request(
    `${shopBaseUrl(domain)}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!response.success) return response;

  const parsed = await HTTP.parse<{
    data: T;
    errors?: { message: string }[];
  }>(response);
  if (!parsed.success) return parsed;

  if (parsed.data.errors?.length)
    return {
      success: false,
      error: new RequestError(
        parsed.data.errors.map((entry) => entry.message).join("; "),
      ),
    };

  return { success: true, data: parsed.data.data };
};

const APP_SUBSCRIPTION_CREATE = `#graphql
  mutation CreateAppSubscription(
    $name: String!
    $returnUrl: URL!
    $cappedAmount: MoneyInput!
    $terms: String!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      lineItems: [
        { plan: { appUsagePricingDetails: { cappedAmount: $cappedAmount, terms: $terms } } }
      ]
    ) {
      appSubscription {
        id
        lineItems {
          id
        }
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Creates (once) a capped usage line on a Shopify app subscription for this
 * store's performance fee and persists the returned `lineItem.id` as
 * `store.shopifyUsageLineId`. Returns a `confirmationUrl` the merchant must
 * approve before usage records can be created — redirect them per the embedded
 * app UX. Idempotent: a store that already has a usage line returns early.
 */
export const ensureUsageSubscription = withAuthentication(
  async (
    context,
    {
      store: id,
      capCents,
      currency = "USD",
    }: { store: string; capCents: number; currency?: string },
  ) => {
    const store = await Store.get(Environment.SERVER, id);
    if (!store.success) return store;
    if (!store.data)
      return { success: false, error: new RequestError("Store not found") };
    if (store.data.userId !== context.session.user.id)
      return { success: false, error: new RequestError("Not authorized") };
    if (
      store.data.platform !== "shopify" &&
      store.data.platform !== "shopify-public"
    )
      return {
        success: false,
        error: new RequestError("Store is not a Shopify store"),
      };
    if (store.data.shopifyUsageLineId)
      return { success: true as const, data: { confirmationUrl: null } };

    const resolved = await resolveAccessToken(store.data.id);
    if (!resolved.success) return resolved;

    const origin = resolveTrackerPublicOrigin();
    const capAmount = (capCents / 100).toFixed(2);

    const result = await graphqlRequest<{
      appSubscriptionCreate: {
        appSubscription: { id: string; lineItems: { id: string }[] } | null;
        confirmationUrl: string | null;
        userErrors: { field: string[] | null; message: string }[];
      };
    }>(store.data.domain, resolved.accessToken, APP_SUBSCRIPTION_CREATE, {
      name: "ecentic performance fee",
      returnUrl: `${origin}/dashboard/settings?billing=connected`,
      cappedAmount: { amount: capAmount, currencyCode: currency },
      terms: `Up to ${capAmount} ${currency} per 30 days on AI-attributed orders`,
    });
    if (!result.success) return result;

    const payload = result.data.appSubscriptionCreate;
    if (payload.userErrors.length)
      return {
        success: false,
        error: new RequestError(
          payload.userErrors.map((entry) => entry.message).join("; "),
        ),
      };

    const lineId = payload.appSubscription?.lineItems[0]?.id ?? null;
    if (lineId)
      await Store.update(Environment.SERVER, store.data.id, {
        shopifyUsageLineId: lineId,
        updatedAt: new Date(),
      });

    return {
      success: true as const,
      data: { confirmationUrl: payload.confirmationUrl },
    };
  },
  "Shopify.ensureUsageSubscription",
);

const APP_USAGE_RECORD_CREATE = `#graphql
  mutation CreateUsageRecord(
    $subscriptionLineItemId: ID!
    $price: MoneyInput!
    $description: String!
  ) {
    appUsageRecordCreate(
      subscriptionLineItemId: $subscriptionLineItemId
      price: $price
      description: $description
    ) {
      appUsageRecord {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Reports a usage charge (in cents) against the store's capped usage line. The
 * caller (period-close cron) has already clamped `cents` to the remaining cap
 * delta, so a cap-exceeded `userError` is treated as terminal — surfaced as a
 * failure rather than retried.
 */
export const createUsageRecord = withContext(
  async (
    _,
    {
      store: id,
      cents,
      currency = "USD",
      description,
    }: {
      store: string;
      cents: number;
      currency?: string;
      description: string;
    },
  ) => {
    if (cents <= 0) return { success: true as const, data: { recordId: null } };

    const store = await Store.get(Environment.SERVER, id);
    if (!store.success) return store;
    if (!store.data)
      return { success: false, error: new RequestError("Store not found") };

    const lineId = store.data.shopifyUsageLineId;
    if (!lineId)
      return {
        success: false,
        error: new RequestError("Store has no Shopify usage line"),
      };

    const resolved = await resolveAccessToken(store.data.id);
    if (!resolved.success) return resolved;

    const result = await graphqlRequest<{
      appUsageRecordCreate: {
        appUsageRecord: { id: string } | null;
        userErrors: { field: string[] | null; message: string }[];
      };
    }>(store.data.domain, resolved.accessToken, APP_USAGE_RECORD_CREATE, {
      subscriptionLineItemId: lineId,
      price: { amount: (cents / 100).toFixed(2), currencyCode: currency },
      description,
    });
    if (!result.success) return result;

    const payload = result.data.appUsageRecordCreate;
    if (payload.userErrors.length)
      return {
        success: false,
        error: new RequestError(
          payload.userErrors.map((entry) => entry.message).join("; "),
        ),
      };

    return {
      success: true as const,
      data: { recordId: payload.appUsageRecord?.id ?? null },
    };
  },
  "Shopify.createUsageRecord",
);
