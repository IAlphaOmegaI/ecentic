"use server";

import crypto from "node:crypto";
import { resultify, unwrapResult } from "@zenncore/utils";
import { type TransactionScope, withTransaction } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import * as HTTP from "../../utils/http";
import {
  normalizeHostname,
  resolveTrackerPublicOrigin,
} from "../../utils/tracking";
import * as Product from "../product";
import * as Store from "../store";
import * as StoreAccount from "../store-account";

type Type = {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  status: string;
  variants: {
    id: number;
    price: string;
    compare_at_price: string | null;
    sku: string;
  }[];
  images: { id: number; src: string }[];
};

const API_VERSION = "2026-04";

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
    `${domain}/admin/api/${API_VERSION}/shop.json`,
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

    const storeAccount = await (async () => {
      const account = storeAccountId
        ? await StoreAccount.get(Environment.SERVER, storeAccountId, options)
        : await StoreAccount.getByStore(Environment.SERVER, {
            store: storeId,
          });

      if (!account.success || !account.data) return account;

      const { accessTokenExpiresAt } = account.data;
      const isExpired =
        accessTokenExpiresAt &&
        accessTokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000;

      if (!isExpired) return account;

      const refreshed = await refreshAccessToken(Environment.SERVER, {
        store: storeId,
      });

      if (!refreshed.success) return refreshed;
      if (!refreshed.data) return account;

      return { success: true as const, data: refreshed.data };
    })();

    if (!storeAccount.success || !storeAccount.data?.accessToken) {
      return {
        success: false,
        error: new Error("Missing Shopify access token"),
      };
    }

    const { accessToken } = storeAccount.data;

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
      `${domain}/admin/api/${API_VERSION}/products.json?limit=${limit}`;

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

        return Product.create(
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
        error: new Error("Shopify integration not configured"),
      };

    const storeAccount = await StoreAccount.getForStore(Environment.SERVER, {
      store: storeId,
    });
    if (!storeAccount.success) return storeAccount;
    if (!storeAccount.data?.refreshToken)
      return { success: false, error: new Error("No refresh token stored") };

    const { refreshTokenExpiresAt } = storeAccount.data;

    if (refreshTokenExpiresAt && refreshTokenExpiresAt.getTime() < Date.now())
      return {
        success: false,
        error: new Error(
          "Shopify authorization has expired. Please reconnect your store.",
        ),
      };

    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    const shopId = new URL(store.data.domain).hostname;

    const tokenResponse = await HTTP.request(
      `https://${shopId}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          grant_type: "refresh_token",
          refresh_token: storeAccount.data.refreshToken,
        }),
      },
    );

    const t = await HTTP.parse<{
      access_token: string;
      expires_in: number;
      refresh_token: string;
      refresh_token_expires_in: number;
    }>(tokenResponse);

    if (!t.success) return t;

    return StoreAccount.update(Environment.SERVER, storeAccount.data.id, {
      accessToken: t.data.access_token,
      accessTokenExpiresAt: new Date(Date.now() + t.data.expires_in * 1000),
      refreshToken: t.data.refresh_token,
      refreshTokenExpiresAt: new Date(
        Date.now() + t.data.refresh_token_expires_in * 1000,
      ),
    });
  },
  "Shopify.refreshAccessToken",
);

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
      shop: {
        id: number;
        domain: string;
        myshopify_domain: string;
        currency: string;
      };
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

    const transaction = await resultify(() =>
      withTransaction(async (tx) => {
        const creation = await Store.create(
          Environment.SERVER,
          {
            userId,
            platform: "shopify",
            name: shopId.replace(".myshopify.com", ""),
            domain: `https://${shopId}`,
            trackerApiKey,
            storefrontHosts,
            status: "connected",
            storeId: String(shop.data.shop.id),
          },
          { tx },
        );

        if (!creation.success) throw creation.error;
        if (!creation.data) throw new Error("Store creation returned no data");

        const storeAccount = await StoreAccount.create(
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

    const origin = resolveTrackerPublicOrigin();

    const probe =
      process.env.ECENTIC_TRACKER_PROBE === "true" ? "&probe=1" : "";

    const src = `${origin}/tracker.js?sid=${encodeURIComponent(
      store.id,
    )}&k=${encodeURIComponent(trackerApiKey)}${probe}`;

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

    return { success: true, data: { storeId: store.id } };
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
    `${domain}/admin/api/${API_VERSION}/${metafieldBasePath(
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
      `${domain}/admin/api/${API_VERSION}/${ownerPath}/metafields/${existingId}.json`,
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
    `${domain}/admin/api/${API_VERSION}/${ownerPath}/metafields.json`,
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
      namespace: UCP_NAMESPACE,
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

export const pushShopUcpMetafields = withContext(
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

    const storeAccount = await StoreAccount.get(Environment.SERVER, storeId);

    if (!storeAccount.success || !storeAccount.data?.accessToken) {
      return {
        success: false,
        error: new Error("Missing Shopify access token"),
      };
    }

    const { domain } = store.data;
    const { accessToken } = storeAccount.data;

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
      category: "shopify.ucp.shop.metafields",
      data: {
        "store.id": storeId,
        "metafields.written": fields.length - errors.length,
        "metafields.errors": errors.length,
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
  "Shopify.pushShopUcpMetafields",
);

export const pushProductUcpMetafields = withContext(
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

    const storeAccount = await StoreAccount.get(
      Environment.SERVER,
      store.data.id,
    );

    if (!storeAccount.success || !storeAccount.data?.accessToken) {
      return {
        success: false,
        error: new Error("Missing Shopify access token"),
      };
    }
    const { domain } = store.data;
    const { accessToken } = storeAccount.data;

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
      category: "shopify.ucp.product.metafields",
      data: {
        "product.id": productId,
        "metafields.written": fields.length - errors.length,
        "metafields.errors": errors.length,
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
  "Shopify.pushProductUcpMetafields",
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

    const storeAccount = await StoreAccount.get(
      Environment.SERVER,
      store.data.id,
    );

    if (!storeAccount.success || !storeAccount.data?.accessToken) {
      return {
        success: false,
        error: new Error("Missing Shopify access token"),
      };
    }
    const { domain } = store.data;
    const { accessToken } = storeAccount.data;

    if (!product.data.externalId)
      return { success: false, error: new Error("Product has no external ID") };

    const url = `${domain}/admin/api/${API_VERSION}/products/${product.data.externalId}.json`;

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

  return `${url.protocol}//${url.hostname}`;
};

const detectCurrency = async (domain: string): Promise<string> => {
  const response = await HTTP.request(`${domain}/meta.json`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.success) return "USD";

  const parsed = await HTTP.parse<{ currency: string }>(response);
  if (!parsed.success) return "USD";

  return parsed.data.currency || "USD";
};

/**
 * Imports products from the public Shopify storefront `/products.json` endpoint.
 * No OAuth or access token required.
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

    const { domain } = store.data;

    const currency = await detectCurrency(domain);

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

    for (const page of Array.from({ length: maximum }, (_, i) => i + 1)) {
      const response = await HTTP.request(
        `${domain}/products.json?limit=${limit}&page=${page}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );

      if (!response.success) break;

      const parsed = await HTTP.parse<{ products: Type[] }>(response);
      if (!parsed.success) break;

      if (parsed.data.products.length === 0) break;

      all.push(...parsed.data.products);

      if (parsed.data.products.length < limit) break;
    }

    const results = await Promise.all(
      all.map((item) => {
        const variant = item.variants[0];

        return Product.create(
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
            status: item.published_at ? "active" : "draft",
            rawData: JSON.stringify(item),
            syncedAt: new Date(),
          },
          options,
        );
      }),
    );

    const imported = results.filter((result) => result.success).length;

    context.span.addBreadcrumb({
      category: "shopify-public.catalog.sync",
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
  "Shopify.syncPublicCatalog",
);

export const connectPublic = withAuthentication(
  async (context, { domain }: { domain: string }) => {
    const host = normalizeDomain(domain);

    const probe = await HTTP.request(`${host}/products.json?limit=1`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!probe.success)
      return {
        success: false,
        error: new RequestError(
          "Could not reach the Shopify store. Check the domain and try again.",
        ),
      };

    if (!probe.data.ok)
      return {
        success: false,
        error: new RequestError(
          probe.data.status === 404
            ? "This store does not expose a public product catalog. Check the domain and try again."
            : `Shopify returned ${probe.data.status}`,
        ),
      };

    context.span.addBreadcrumb({
      category: "shopify-public.probe",
      data: { "store.host": host },
    });

    const storefrontHosts = [normalizeHostname(host)];

    const transaction = await resultify(() =>
      withTransaction(async (tx) => {
        const store = await Store.create(
          Environment.SERVER,
          {
            userId: context.session.user.id,
            platform: "shopify-public",
            name: new URL(host).hostname.replace(".myshopify.com", ""),
            domain: host,
            storefrontHosts,
            status: "connected",
          },
          { tx },
        );

        if (!store.success) throw store.error;
        if (!store.data) throw new Error("Store creation returned no data");

        const sync = await syncPublicCatalog(Environment.SERVER, {
          user: context.session.user.id,
          store: store.data.id,
          tx,
        });

        if (!sync.success) throw sync.error;

        return store.data;
      }),
    );

    if (transaction.success) {
      context.span.addBreadcrumb({
        category: "shopify-public.connect.complete",
        data: { "store.id": transaction.data.id, "store.host": host },
      });
    }

    return transaction;
  },
  "Shopify.connectPublic",
);

export const syncPublicProducts = withAuthentication(
  async (context, { store }: { store: string }) => {
    return syncPublicCatalog(Environment.SERVER, {
      user: context.session.user.id,
      store,
    });
  },
  "Shopify.syncPublicProducts",
);
