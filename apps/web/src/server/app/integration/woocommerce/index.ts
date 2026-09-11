"use server";

import { resultify } from "@zenncore/utils";
import { type TransactionScope, withTransaction } from "../../../database";
import { withAuthentication } from "../../../utils/authentication";
import { withContext } from "../../../utils/context";
import { Environment } from "../../../utils/environment";
import {
  ConflictError,
  NotFoundError,
  RequestError,
  ValidationError,
} from "../../../utils/error";
import * as HTTP from "../../../utils/http";
import { normalizeHostname } from "../../../utils/tracking";
import * as Product from "../../product";
import * as Store from "../../store";
import * as StoreAccount from "../../store-account";
import {
  advertisedRestRoot,
  authorizedRequest,
  decodeEntities,
  isWooCommercePage,
  normalizeStoreUrl,
  restUrl,
  type StoreApiProduct,
  toMajor,
} from "./http";

type Type = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  status: string;
  images: { id: number; src: string; alt: string }[];
  meta_data?: { id?: number; key: string; value: unknown }[];
};

/**
 * Product meta keys the ecentic WooCommerce bridge reads to render structured
 * data into the storefront `<head>`. Underscore-prefixed so WooCommerce treats
 * them as internal/hidden meta (mirrors Shopify's `ecentic` metafield namespace).
 */
const STRUCTURED_DATA_META_KEY = "_ecentic_structured_data";
const AGENTIC_SUMMARY_META_KEY = "_ecentic_agentic_summary";

// Compact agent-facing summary written alongside the full JSON-LD, matching the
// `agentic_summary` metafield produced for Shopify.
const buildAgenticSummary = (
  structuredJson: string,
  product: {
    title: string;
    sku: string | null;
    price: string | null;
    currency: string | null;
  },
): string => {
  const name = (() => {
    try {
      const parsed = JSON.parse(structuredJson) as { name?: unknown };
      return typeof parsed.name === "string" ? parsed.name : product.title;
    } catch {
      return product.title;
    }
  })();

  return JSON.stringify({
    name,
    sku: product.sku,
    price: product.price,
    currency: product.currency,
  });
};

const fetchStoreCurrency = async (
  domain: string,
  consumerKey: string,
  consumerSecret: string,
): Promise<string | null> => {
  const response = await authorizedRequest(
    `${domain}/wp-json/wc/v3/data/currencies/current`,
    consumerKey,
    consumerSecret,
    { method: "GET" },
  );

  if (!response.success) return null;

  const parsed = await HTTP.parse<{ code: string }>(response);
  if (!parsed.success) return null;

  return parsed.data.code;
};

/**
 * Resolves the WooCommerce consumer key/secret for a store from its
 * {@link StoreAccount}. During {@link connect} the account row is created inside
 * an uncommitted transaction, so callers pass its id (+ `tx`) to read it back;
 * re-syncs omit both and look it up by store.
 */
const resolveCredentials = async (
  storeId: string,
  options: { storeAccount?: string; tx?: TransactionScope },
): Promise<
  | { success: true; consumerKey: string; consumerSecret: string }
  | { success: false; error: Error }
> => {
  const account = options.storeAccount
    ? await StoreAccount.get(
        Environment.SERVER,
        options.storeAccount,
        options.tx ? { tx: options.tx } : undefined,
      )
    : await StoreAccount.getForStore(Environment.SERVER, { store: storeId });

  if (!account.success) return { success: false, error: account.error };

  const consumerKey = account.data?.consumerKey;
  const consumerSecret = account.data?.consumerSecret;

  if (!consumerKey || !consumerSecret)
    return {
      success: false,
      error: new Error("Missing WooCommerce credentials"),
    };

  return { success: true, consumerKey, consumerSecret };
};

/**
 * Imports products from the WooCommerce REST API. Used by {@link connect}
 * (inside a transaction) and by {@link syncProducts} (authenticated).
 */
export const syncWooCommerceCatalog = withContext(
  async (
    context,
    {
      user: userId,
      store: storeId,
      storeAccount: storeAccountId,
      tx,
    }: {
      user: string;
      store: string;
      storeAccount?: string;
      tx?: TransactionScope;
    },
  ) => {
    const store = await Store.get(Environment.SERVER, storeId, { tx });
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new NotFoundError("Store not found") };

    if (store.data.platform !== "woocommerce")
      return {
        success: false,
        error: new Error("Store is not a WooCommerce store"),
      };

    const { domain } = store.data;

    const resolved = await resolveCredentials(storeId, {
      storeAccount: storeAccountId,
      tx,
    });
    if (!resolved.success) return resolved;

    const { consumerKey, consumerSecret } = resolved;

    const currency =
      (await fetchStoreCurrency(domain, consumerKey, consumerSecret)) ?? "USD";

    const update = await Store.update(
      Environment.SERVER,
      storeId,
      { status: "syncing" },
      { tx },
    );

    if (!update.success) return update;

    const all: Type[] = [];

    const limit = 100;
    const maximum = 20;

    for (const page of Array.from({ length: maximum }, (_, i) => i + 1)) {
      const response = await authorizedRequest(
        `${domain}/wp-json/wc/v3/products?per_page=${limit}&page=${page}`,
        consumerKey,
        consumerSecret,
        { method: "GET" },
      );

      if (!response.success) break;

      const parsed = await HTTP.parse<Type[]>(response);
      if (!parsed.success) break;

      all.push(...parsed.data);

      const totalPages = Number(
        response.data.headers.get("X-WP-TotalPages") ?? "1",
      );

      if (page >= totalPages) break;
    }

    const results = await Promise.all(
      all.map((item) =>
        Product.sync(
          Environment.SERVER,
          {
            storeId,
            userId,
            externalId: item.id.toString(),
            title: item.name,
            description: item.short_description || item.description,
            price: item.price,
            compareAtPrice:
              item.regular_price !== item.price ? item.regular_price : null,
            currency,
            images: JSON.stringify(item.images.map((image) => image.src)),
            url: item.permalink,
            sku: item.sku || null,
            status: item.status === "publish" ? "active" : "draft",
            rawData: JSON.stringify(item),
            syncedAt: new Date(),
          },
          { tx },
        ),
      ),
    );

    const imported = results.filter((result) => result.success).length;

    context.span.addBreadcrumb({
      category: "woocommerce.catalog.sync",
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
      { tx },
    );

    if (!insertion.success) return insertion;

    return { success: true, data: imported };
  },
  "WooCommerce.syncWooCommerceCatalog",
);

export const connect = withAuthentication(
  async (
    context,
    {
      domain,
      consumerKey,
      consumerSecret,
    }: { domain: string; consumerKey: string; consumerSecret: string },
  ) => {
    return connectForUser(Environment.SERVER, {
      user: context.session.user.id,
      domain,
      consumerKey,
      consumerSecret,
    });
  },
  "WooCommerce.connect",
);

export const connectForUser = withContext(
  async (
    context,
    {
      user: id,
      domain,
      consumerKey,
      consumerSecret,
    }: {
      user: string;
      domain: string;
      consumerKey: string;
      consumerSecret: string;
    },
  ) => {
    const host = normalizeStoreUrl(domain);

    const probe = await authorizedRequest(
      `${host}/wp-json/wc/v3/products?per_page=1`,
      consumerKey,
      consumerSecret,
      { method: "GET" },
    );

    if (!probe.success)
      return {
        success: false,
        error: new RequestError(
          "Could not reach the WooCommerce store. Check the URL and try again.",
        ),
      };

    if (!probe.data.ok) {
      console.log(probe.data);
      return {
        success: false,
        error: new RequestError(
          probe.data.status === 401
            ? "Invalid API credentials. Double-check your consumer key and secret."
            : `WooCommerce returned ${probe.data.status}`,
        ),
      };
    }

    // A 200 alone is not a WooCommerce store accepting these keys — some sites
    // answer 200 to any path. This connect counts as verified ownership (it
    // outranks other accounts' public imports), so the listing must be real.
    const listing = await HTTP.parse<unknown>(probe.data);
    if (!listing.success || !Array.isArray(listing.data))
      return {
        success: false,
        error: new RequestError(
          "That URL did not answer like a WooCommerce REST API. Check the URL and try again.",
        ),
      };

    context.span.addBreadcrumb({
      category: "woocommerce.probe",
      data: { "store.host": host },
    });

    // REST keys prove ownership: another account's public import of this
    // domain must not block the merchant, and their own is upgraded in place.
    const reconciliation = await Store.reconcileConnection(Environment.SERVER, {
      userId: id,
      domain: host,
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

    const transaction = await resultify(() =>
      withTransaction(async (tx) => {
        const store = existing
          ? await Store.update(
              Environment.SERVER,
              existing.id,
              {
                platform: "woocommerce",
                name: new URL(host).hostname,
                domain: host,
                status: "connected",
              },
              { tx },
            )
          : await Store.create(
              Environment.SERVER,
              {
                userId: id,
                platform: "woocommerce",
                name: new URL(host).hostname,
                domain: host,
                status: "connected",
              },
              { tx },
            );

        if (!store.success) throw store.error;
        if (!store.data) throw new Error("Store creation returned no data");

        const storeAccount = await StoreAccount.sync(
          Environment.SERVER,
          {
            storeId: store.data.id,
            consumerKey,
            consumerSecret,
            // TODO: also add scope
          },
          { tx },
        );

        if (!storeAccount.success) throw storeAccount.error;
        if (!storeAccount.data)
          throw new Error("Store account creation returned no data");

        const sync = await syncWooCommerceCatalog(Environment.SERVER, {
          user: id,
          store: store.data.id,
          storeAccount: storeAccount.data.id,
          tx,
        });

        if (!sync.success) throw sync.error;

        return store.data;
      }),
    );

    if (!transaction.success) return transaction;

    context.span.addBreadcrumb({
      category: "woocommerce.connect.complete",
      data: { "store.id": transaction.data.id, "store.host": host },
    });

    // `reconnected` marks a credential refresh for a store this user already
    // onboarded. Callers use it to skip the onboarding product picker, which
    // would otherwise let them select past their plan's product limit.
    return {
      success: true as const,
      data: { store: transaction.data, reconnected: Boolean(existing) },
    };
  },
  "WooCommerce.connectForUser",
);

export const syncProducts = withAuthentication(
  async (context, { store: id }: { store: string }) => {
    return syncWooCommerceCatalog(Environment.SERVER, {
      user: context.session.user.id,
      store: id,
    });
  },
  "WooCommerce.syncProducts",
);

// ---------------------------------------------------------------------------
// Public catalog — the Store API every WooCommerce store serves without keys.
// Read-only (`woocommerce-public`): no credentials, no write-back, upgraded in
// place when the merchant connects with keys or the plugin. Every request goes
// through `HTTP.request`'s SSRF guard — the domain was typed by a visitor.
// ---------------------------------------------------------------------------

const PROBE_TIMEOUT_MS = 5000;
const CATALOG_TIMEOUT_MS = 20000;
const HOMEPAGE_LIMIT_BYTES = 3 * 1024 * 1024;
// A page of 100 Store API products is well under a megabyte in practice; the
// cap bounds what a hostile "store" can make one import hold in memory.
const CATALOG_LIMIT_BYTES = 8 * 1024 * 1024;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
// Beyond this, a product's raw payload is stored as the fields catalog facts
// read — a single listing must not be able to write megabytes into the row.
const RAW_LIMIT_BYTES = 64 * 1024;

/**
 * Whether a Store API root is readable. `closed` is an answer (401/403/404, a
 * non-JSON body); `unreachable` is the absence of one (timeout, 429, 5xx) and
 * is worth a retry, so the two must never be merged.
 */
type CatalogState = "open" | "closed" | "unreachable";

const json = <T>(body: string) => {
  const parsed = resultify(() => JSON.parse(body) as T);
  return parsed.success ? parsed.data : null;
};

/** Whether a Store API root answers, and with how many products. */
const countCatalog = async (
  root: string,
): Promise<{ state: CatalogState; products: number | null }> => {
  const page = await HTTP.page(
    restUrl(root, "wc/store/v1/products", { per_page: "1" }),
    {
      timeout: PROBE_TIMEOUT_MS,
      limit: 1024 * 1024,
      accept: "application/json",
    },
  );

  if (!page.success)
    return {
      state: page.error.name === "validation-error" ? "closed" : "unreachable",
      products: null,
    };

  const { status } = page.data;
  if (status === 429 || status >= 500)
    return { state: "unreachable", products: null };
  if (status !== 200 || !Array.isArray(json<unknown>(page.data.body)))
    return { state: "closed", products: null };

  const total = Number.parseInt(page.data.headers.get("x-wp-total") ?? "", 10);
  return {
    state: "open",
    products: Number.isInteger(total) && total >= 0 ? total : null,
  };
};

/**
 * Finds the Store API for `domain`. The conventional `/wp-json/` root answers
 * on most stores in one request; only when it does not is the homepage read
 * for the root the site advertises (an install in a subfolder, a site without
 * pretty permalinks). The homepage comes back too, for the caller's markers —
 * pass it in when it has already been read.
 *
 * `unreachable` only when nothing answered at all; one clear refusal makes the
 * catalog `closed`.
 */
const locateCatalog = async (domain: string, known?: HTTP.Page | null) => {
  const conventional = `${domain}/wp-json/`;

  const direct = await countCatalog(conventional);
  if (direct.state === "open")
    return {
      state: "open" as const,
      root: conventional,
      products: direct.products,
      home: null,
    };

  const home = await (async () => {
    if (known !== undefined) return known;

    const fetched = await HTTP.page(domain, {
      timeout: PROBE_TIMEOUT_MS,
      limit: HOMEPAGE_LIMIT_BYTES,
    });
    return fetched.success ? fetched.data : null;
  })();

  const advertised = home ? advertisedRestRoot(home) : null;
  const found =
    advertised && advertised !== conventional
      ? await countCatalog(advertised)
      : null;

  if (found?.state === "open")
    return {
      state: "open" as const,
      root: advertised,
      products: found.products,
      home,
    };

  const silent =
    direct.state === "unreachable" &&
    (found === null || found.state === "unreachable");

  return {
    state: silent ? ("unreachable" as const) : ("closed" as const),
    root: null,
    products: null,
    home,
  };
};

/**
 * The public catalog's verdict as the error a connect or sync returns:
 * silence is retryable, a refusal is not.
 */
const unavailable = (state: CatalogState) =>
  state === "unreachable"
    ? new RequestError(
        "Could not reach the WooCommerce store. Check the URL and try again.",
      )
    : new ValidationError(
        "This store's public catalog is closed. Connect it with the ecentic plugin or REST API keys instead.",
      );

/**
 * Every published product the Store API lists, page by page. A failure past
 * the first page ends the walk with what was gathered — the keyed importer's
 * tolerance — but a first page that fails is a catalog we cannot read at all.
 */
const collect = async (
  root: string,
  page = 1,
  gathered: StoreApiProduct[] = [],
): Promise<
  { success: true; data: StoreApiProduct[] } | { success: false; error: Error }
> => {
  const response = await HTTP.page(
    restUrl(root, "wc/store/v1/products", {
      per_page: String(PAGE_SIZE),
      page: String(page),
    }),
    {
      timeout: CATALOG_TIMEOUT_MS,
      limit: CATALOG_LIMIT_BYTES,
      accept: "application/json",
    },
  );

  const items =
    response.success && response.data.status === 200
      ? json<StoreApiProduct[]>(response.data.body)
      : null;

  if (!response.success || !Array.isArray(items))
    return page === 1
      ? {
          success: false,
          error: new RequestError(
            "Could not read this store's public catalog. Try again, or connect it with the ecentic plugin.",
          ),
        }
      : { success: true, data: gathered };

  const all = [...gathered, ...items];
  const pages = Number.parseInt(
    response.data.headers.get("x-wp-totalpages") ?? "",
    10,
  );

  const done =
    items.length < PAGE_SIZE ||
    (Number.isFinite(pages) && page >= pages) ||
    page >= MAX_PAGES;

  return done ? { success: true, data: all } : collect(root, page + 1, all);
};

/**
 * A Store API product as a catalog row. Titles are entity-decoded (the Store
 * API HTML-escapes them), prices converted from minor units by string, and the
 * short description preferred exactly as the keyed importer does, so upgrading
 * to a keyed connection rewrites the same rows without changing their copy.
 */
const toProduct = (
  item: StoreApiProduct,
  { store, user }: { store: string; user: string },
) => {
  const digits = item.prices?.currency_minor_unit ?? 2;
  const price = toMajor(item.prices?.price, digits);
  const regular = toMajor(item.prices?.regular_price, digits);

  const {
    price_html: _html,
    add_to_cart: _cart,
    extensions: _extensions,
    ...raw
  } = item;

  return {
    storeId: store,
    userId: user,
    externalId: String(item.id),
    title: decodeEntities(item.name),
    description: item.short_description || item.description,
    price,
    compareAtPrice:
      price && regular && Number(regular) > Number(price) ? regular : null,
    currency: item.prices?.currency_code || "USD",
    images: JSON.stringify((item.images ?? []).map((image) => image.src)),
    url: item.permalink,
    sku: item.sku || null,
    // The Store API only lists published, visible products.
    status: "active",
    rawData: (() => {
      const full = JSON.stringify({
        ...raw,
        images: (item.images ?? []).map(
          ({
            srcset: _srcset,
            sizes: _sizes,
            thumbnail: _thumbnail,
            ...image
          }) => image,
        ),
      });
      if (full.length <= RAW_LIMIT_BYTES) return full;

      return JSON.stringify({
        id: item.id,
        name: item.name,
        sku: item.sku,
        permalink: item.permalink,
        prices: item.prices,
        is_in_stock: item.is_in_stock,
        categories: item.categories,
        brands: item.brands,
      });
    })(),
    syncedAt: new Date(),
  };
};

const importCatalog = async ({
  store,
  user,
  items,
  tx,
}: {
  store: string;
  user: string;
  items: StoreApiProduct[];
  tx?: TransactionScope;
}) => {
  const results = await Promise.all(
    items.map((item) =>
      Product.sync(Environment.SERVER, toProduct(item, { store, user }), {
        tx,
      }),
    ),
  );

  const update = await Store.update(
    Environment.SERVER,
    store,
    { status: "connected", lastSyncedAt: new Date() },
    { tx },
  );
  if (!update.success) return update;

  return {
    success: true as const,
    data: results.filter((result) => result.success).length,
  };
};

/**
 * Whether `domain` is a WooCommerce storefront and whether its Store API
 * answers — `null` when it is not WooCommerce at all. A site whose REST API is
 * locked (a security plugin, a WAF) still shows WooCommerce's markup: known,
 * just not importable without the plugin or keys. `home` is the homepage when
 * the caller already read it.
 */
export const probe = withContext(
  async (_, { domain, home }: { domain: string; home?: HTTP.Page | null }) => {
    const catalog = await locateCatalog(normalizeStoreUrl(domain), home);

    if (catalog.state === "open")
      return {
        success: true as const,
        data: { importable: true, name: null, products: catalog.products },
      };

    if (!catalog.home || !isWooCommercePage(catalog.home))
      return { success: true as const, data: null };

    return {
      success: true as const,
      data: { importable: false, name: null, products: null },
    };
  },
  "WooCommerce.probe",
);

/**
 * Imports a WooCommerce store from its public catalog, no keys required. The
 * whole catalog is fetched *before* the transaction opens, so no database
 * connection is held across a stranger's network latency.
 */
export const connectPublic = withAuthentication(
  async (context, { domain }: { domain: string }) => {
    const host = normalizeStoreUrl(domain);
    const user = context.session.user.id;

    const catalog = await locateCatalog(host);
    if (!catalog.root)
      return { success: false, error: unavailable(catalog.state) };

    const items = await collect(catalog.root);
    if (!items.success) return items;

    const reconciliation = await Store.reconcileConnection(Environment.SERVER, {
      userId: user,
      domain: host,
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

    // Never downgrade a keyed connection — it keeps its credentials and its
    // own sync; the caller just lands on that store.
    if (existing && existing.platform !== "woocommerce-public")
      return {
        success: true as const,
        data: { store: existing, reconnected: true },
      };

    const name = new URL(host).hostname;
    const storefrontHosts = [normalizeHostname(host)];

    const transaction = await resultify(() =>
      withTransaction(async (tx) => {
        const store = existing
          ? await Store.update(
              Environment.SERVER,
              existing.id,
              {
                platform: "woocommerce-public",
                name,
                domain: host,
                storefrontHosts,
                status: "syncing",
              },
              { tx },
            )
          : await Store.create(
              Environment.SERVER,
              {
                userId: user,
                platform: "woocommerce-public",
                name,
                domain: host,
                storefrontHosts,
                status: "syncing",
              },
              { tx },
            );

        if (!store.success) throw store.error;
        if (!store.data) throw new Error("Store creation returned no data");

        const imported = await importCatalog({
          store: store.data.id,
          user,
          items: items.data,
          tx,
        });
        if (!imported.success) throw imported.error;

        return store.data;
      }),
    );

    if (!transaction.success) return transaction;

    context.span.addBreadcrumb({
      category: "woocommerce-public.connect.complete",
      data: {
        "store.id": transaction.data.id,
        "store.host": host,
        "products.fetched": items.data.length,
      },
    });

    // `reconnected` marks a re-import of a store this user already onboarded.
    // Callers use it to skip the onboarding product picker, which would
    // otherwise let them select past their plan's product limit.
    return {
      success: true as const,
      data: { store: transaction.data, reconnected: Boolean(existing) },
    };
  },
  "WooCommerce.connectPublic",
);

export const syncPublicProducts = withAuthentication(
  async (context, { store: id }: { store: string }) => {
    const store = await Store.get(Environment.SERVER, id);
    if (!store.success) return store;

    if (!store.data || store.data.userId !== context.session.user.id)
      return { success: false, error: new NotFoundError("Store") };

    if (store.data.platform !== "woocommerce-public")
      return {
        success: false,
        error: new Error("Store is not a public WooCommerce store"),
      };

    const catalog = await locateCatalog(store.data.domain);
    if (!catalog.root)
      return { success: false, error: unavailable(catalog.state) };

    const items = await collect(catalog.root);
    if (!items.success) return items;

    const syncing = await Store.update(Environment.SERVER, id, {
      status: "syncing",
    });
    if (!syncing.success) return syncing;

    return importCatalog({
      store: id,
      user: context.session.user.id,
      items: items.data,
    });
  },
  "WooCommerce.syncPublicProducts",
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

    if (store.data.platform !== "woocommerce")
      return {
        success: false,
        error: new Error("Store is not a WooCommerce store"),
      };

    const { domain } = store.data;

    const resolved = await resolveCredentials(store.data.id, {});
    if (!resolved.success) return resolved;

    const { consumerKey, consumerSecret } = resolved;

    if (!product.data.externalId)
      return { success: false, error: new Error("Product has no external ID") };

    const body: { name?: string; description?: string } = {};
    if (data.title !== undefined) body.name = data.title;
    if (data.body_html !== undefined) body.description = data.body_html;

    if (Object.keys(body).length === 0)
      return {
        success: false,
        error: new ValidationError("No fields to update"),
      };

    const url = `${domain}/wp-json/wc/v3/products/${product.data.externalId}`;

    const response = await authorizedRequest(url, consumerKey, consumerSecret, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.success) return response;

    const parsed = await HTTP.parse<Type>(response);
    if (!parsed.success) return parsed;

    const updated = parsed.data;

    await Product.update(Environment.SERVER, id, {
      title: updated.name,
      description: updated.short_description || updated.description,
      rawData: JSON.stringify(updated),
      syncedAt: new Date(),
    });

    return { success: true, data: updated };
  },
  "WooCommerce.updateProduct",
);

/**
 * Writes schema.org Product JSON-LD to a WooCommerce product as protected
 * `meta_data`, so the ecentic bridge can render it into the storefront for AI
 * shopping agents. Parallels {@link Shopify.pushProductUcpMetafields}.
 */
export const pushProductStructuredData = withContext(
  async (
    context,
    {
      product: id,
      structuredJson,
    }: { product: string; structuredJson: string },
  ) => {
    const product = await Product.get(Environment.SERVER, id);
    if (!product.success) return product;
    if (!product.data)
      return { success: false as const, error: new NotFoundError("Product") };
    if (!product.data.externalId)
      return {
        success: false as const,
        error: new RequestError("Product has no external ID"),
      };

    const store = await Store.get(Environment.SERVER, product.data.storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false as const, error: new NotFoundError("Store") };
    if (store.data.platform !== "woocommerce")
      return {
        success: false as const,
        error: new RequestError("Store is not a WooCommerce store"),
      };

    const resolved = await resolveCredentials(store.data.id, {});
    if (!resolved.success) return resolved;

    const { consumerKey, consumerSecret } = resolved;
    const { domain } = store.data;

    const summary = buildAgenticSummary(structuredJson, {
      title: product.data.title,
      sku: product.data.sku,
      price: product.data.price,
      currency: product.data.currency,
    });

    const body = {
      meta_data: [
        { key: STRUCTURED_DATA_META_KEY, value: structuredJson },
        { key: AGENTIC_SUMMARY_META_KEY, value: summary },
      ],
    };

    const url = `${domain}/wp-json/wc/v3/products/${product.data.externalId}`;

    const response = await authorizedRequest(url, consumerKey, consumerSecret, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.success) return response;

    const parsed = await HTTP.parse<Type>(response);
    if (!parsed.success) return parsed;

    await Product.update(Environment.SERVER, id, {
      structuredData: structuredJson,
      syncedAt: new Date(),
    });

    context.span.addBreadcrumb({
      category: "woocommerce.ucp.product.meta",
      data: { "product.id": id, "store.id": store.data.id },
    });

    return { success: true as const, data: { written: 2 } };
  },
  "WooCommerce.pushProductStructuredData",
);
