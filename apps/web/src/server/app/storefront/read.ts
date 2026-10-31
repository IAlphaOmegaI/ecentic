import { createHash } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { eq, ilike, or, sql } from "drizzle-orm";
import { schema } from "../../database";
import { Environment } from "../../utils/environment";
import { RequestError, TimeoutError, ValidationError } from "../../utils/error";
import * as HTTP from "../../utils/http";
import { isSafePublicHttpUrl, resolveOrigin } from "../../utils/ssrf";
import * as Shopify from "../integration/shopify";
import { fetchPublicMeta } from "../integration/shopify/domain";
import * as WooCommerce from "../integration/woocommerce";
import {
  advertisedRestRoot,
  decodeEntities,
  isWooCommercePage,
  restUrl,
  type StoreApiProduct,
  toMajor,
} from "../integration/woocommerce/http";
import {
  classifyPageAccess,
  type PageAccess,
} from "../intelligence/bot-challenge";
import * as ProductRow from "../product";
import * as StoreRow from "../store";
import {
  type Availability,
  type Catalog,
  MAX_PRODUCTS,
  MAX_VARIANTS,
  type Platform,
  type Product,
  type Variant,
} from "./catalog";
import {
  addressOf,
  comparable,
  currencyCode,
  type Facts,
  type Offer,
  type Parsed,
  parsePage,
  samePage,
  sameSite,
} from "./page";

/**
 * Reads a store's catalog from what it serves publicly, inside one time budget.
 *
 * Hard rule: price, currency, availability and identifiers only ever come from
 * the store. Our importers and feed export default currency to USD and
 * availability to in stock; none of that is copied here. Unstated is null, or
 * "unknown".
 */

const BUDGET_MS = 60_000;
const HOME_TIMEOUT_MS = 5000;
const CATALOG_TIMEOUT_MS = 15_000;
const VARIATION_TIMEOUT_MS = 8000;
const ENRICH_TIMEOUT_MS = 5000;
const CANDIDATE_TIMEOUT_MS = 8000;
const POLICY_TIMEOUT_MS = 5000;
const SITEMAP_TIMEOUT_MS = 8000;

const HOME_LIMIT_BYTES = 3 * 1024 * 1024;
const PAGE_LIMIT_BYTES = 5 * 1024 * 1024;
const CATALOG_LIMIT_BYTES = 16 * 1024 * 1024;

const PAGE_CONCURRENCY = 8;
const MAX_CANDIDATES = 80;
const MAX_CHILD_SITEMAPS = 5;
const MAX_POLICY_LINKS = 3;
const MAX_NOTES = 5;
const CATALOG_PAGE_SIZE = 100;
const SHOPIFY_PAGE_SIZE = 250;
const CATALOG_MAX_PAGES = 5;
const PROGRESS_EVERY = 8;
/** Past what any channel takes. A page can state megabytes here, and every later regex pays for it. */
const TITLE_CHARACTERS = 2000;
const DESCRIPTION_CHARACTERS = 50_000;

const FIRECRAWL = "https://api.firecrawl.dev/v2";
const FIRECRAWL_MAP_LIMIT = 500;
const FIRECRAWL_POLL_MS = 2000;
const FIRECRAWL_TIMEOUT_MS = 20_000;
/** Time left for parsing what a slow batch did finish. */
const FIRECRAWL_MARGIN_MS = 3000;

/** One read: the store, the clock, the live log. */
type Run = {
  origin: string;
  host: string;
  deadline: number;
  report: (message: string) => void;
};

type Reading = {
  platform: Platform;
  name: string | null;
  products: Product[];
  discovered: number;
  notes: string[];
};

type Visit = { url: string; access: PageAccess; parsed: Parsed | null };

type Crawl = { visits: Visit[]; total: number };

const json = <T>(body: string) => {
  const parsed = resultify(() => JSON.parse(body) as T);
  return parsed.success ? parsed.data : null;
};

const filled = (value: unknown) => {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return null;

  return value.trim() || null;
};

const fingerprint = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 12);

const blank = (id: string): Variant => ({
  id,
  options: {},
  price: null,
  compareAtPrice: null,
  availability: "unknown",
  sku: null,
  barcode: null,
  image: null,
});

const fetchPage = async (
  run: Run,
  url: string,
  {
    timeout,
    limit = PAGE_LIMIT_BYTES,
    accept,
  }: { timeout: number; limit?: number; accept?: string },
) => {
  const left = run.deadline - Date.now();
  if (left <= 0)
    return {
      success: false as const,
      error: new TimeoutError("Out of time for this read"),
    };

  return HTTP.page(url, { timeout: Math.min(timeout, left), limit, accept });
};

const readJson = async <T>(run: Run, url: string, timeout: number) => {
  const page = await fetchPage(run, url, {
    timeout,
    limit: CATALOG_LIMIT_BYTES,
    accept: "application/json",
  });
  if (!page.success || page.data.status !== 200) return null;

  return { page: page.data, body: json<T>(page.data.body) };
};

/**
 * Runs `worker` over `items`, `limit` at a time, until `stop` says enough. The
 * results are shared and appended in place because `stop` has to see what every
 * worker has finished; they come back in `items` order regardless of who won.
 * A worker must not throw: each one here wraps its fallible work in a `Result`.
 */
const pool = async <Item, Output>(
  items: Item[],
  worker: (item: Item) => Promise<Output>,
  {
    limit = PAGE_CONCURRENCY,
    stop,
    tick,
  }: {
    limit?: number;
    stop?: (gathered: Output[]) => boolean;
    tick?: (done: number) => void;
  } = {},
) => {
  const queue = items.entries();
  const gathered: { index: number; output: Output }[] = [];

  const work = async (): Promise<void> => {
    if (stop?.(gathered.map(({ output }) => output))) return;

    const next = queue.next();
    if (next.done) return;

    const [index, item] = next.value;
    const output = await worker(item);
    gathered.push({ index, output });
    tick?.(gathered.length);

    return work();
  };

  await Promise.all(Array.from({ length: limit }, () => work()));

  return [...gathered]
    .sort((first, second) => first.index - second.index)
    .map(({ output }) => output);
};

const visitPage = async (
  run: Run,
  url: string,
  timeout: number,
): Promise<Visit> => {
  const page = await fetchPage(run, url, { timeout });
  if (!page.success)
    return { url, access: { kind: "unreachable" }, parsed: null };

  const access = classifyPageAccess(page.data);
  if (access.kind !== "ok") return { url, access, parsed: null };

  return {
    url: page.data.url,
    access,
    parsed: parsePage(page.data.body, page.data.url),
  };
};

const blockage = (visits: Visit[]) => {
  const blocked = visits.flatMap(({ access }) =>
    access.kind === "challenged" ? [access] : [],
  );
  if (blocked.length === 0) return null;

  const vendor = blocked.find((access) => access.vendor)?.vendor;
  return {
    count: blocked.length,
    wall: vendor ? `${vendor}'s bot check` : "a bot check",
  };
};

/** Forty near-identical lines help nobody; the first few and a count do. */
const summarize = (notes: string[]) =>
  notes.length <= MAX_NOTES
    ? notes
    : [
        ...notes.slice(0, MAX_NOTES),
        `And ${notes.length - MAX_NOTES} more like these.`,
      ];

const capped = (over: number) =>
  over > 0
    ? [
        `${over} ${over === 1 ? "product has" : "products have"} more than ${MAX_VARIANTS} variants. We kept the first ${MAX_VARIANTS} of each.`,
      ]
    : [];

/**
 * The offer that states this exact variant, never one picked by position: the
 * `?variant=` in its URL, else a SKU only this variant and this offer share,
 * else the lone offer of a lone variant.
 */
const offerFor = (variant: Variant, variants: Variant[], offers: Offer[]) => {
  const exact = offers.filter((offer) => !offer.from);

  const named = exact.find(({ url: address }) => {
    if (!address) return false;

    const url = resultify(() => new URL(address));
    return url.success && url.data.searchParams.get("variant") === variant.id;
  });
  if (named) return named;

  const shared =
    variants.filter((candidate) => candidate.sku === variant.sku).length > 1;
  const matching = variant.sku
    ? exact.filter((offer) => offer.sku === variant.sku)
    : [];
  if (matching.length === 1 && !shared) return matching[0] ?? null;

  return variants.length === 1 && exact.length === 1
    ? (exact[0] ?? null)
    : null;
};

/**
 * Some themes print the price in minor units (`7999` for `79.99`). That is the
 * markup's slip, not what the shopper sees, so it never overrides the API.
 */
const isMinorUnits = (stated: string, known: string | null) =>
  known !== null && Number(known) > 0 && Number(stated) === Number(known) * 100;

/**
 * Adds what a product's own page states to what the platform API gave us. The
 * page wins a price disagreement, because the page is what a shopper and a judge
 * see. One product has one currency, so a page in another currency replaces the
 * API only when it prices every variant; a partial overlap would mix the two.
 */
const enrich = (product: Product, facts: Facts) => {
  const lone = product.variants.length === 1;

  const matched = product.variants.map((variant) => ({
    variant,
    offer: offerFor(variant, product.variants, facts.offers),
  }));

  const stated = matched.flatMap(({ variant, offer }) =>
    offer?.price && offer.currency && !isMinorUnits(offer.price, variant.price)
      ? [offer]
      : [],
  );
  const currencies = [...new Set(stated.map((offer) => offer.currency))];
  const whole =
    currencies.length === 1 && stated.length === product.variants.length;

  // Never a partial overlap, even with no currency of our own: one variant's offer
  // says nothing about the currency of an API price nobody labelled.
  const currency = whole ? (currencies[0] ?? null) : product.currency;

  /** The price this page states for this variant, in this product's currency. */
  const pagePrice = (offer: Offer | null, variant: Variant) =>
    offer?.price &&
    offer.currency === currency &&
    !isMinorUnits(offer.price, variant.price)
      ? offer.price
      : null;

  const disagreement = matched.find(({ variant, offer }) => {
    const price = pagePrice(offer, variant);
    if (!price || !variant.price) return false;

    return (
      Number(price) !== Number(variant.price) ||
      (product.currency !== null && currency !== product.currency)
    );
  });

  const variants = matched.map(({ variant, offer }) => {
    const price = pagePrice(offer, variant);
    // `50` on the page and `50.00` in the API agree: the string stays as stated.
    const replaces = price !== null && Number(price) !== Number(variant.price);

    return {
      ...variant,
      price: replaces ? price : variant.price,
      compareAtPrice: replaces
        ? (offer?.compareAtPrice ?? null)
        : (variant.compareAtPrice ?? offer?.compareAtPrice ?? null),
      sku: variant.sku ?? offer?.sku ?? (lone ? facts.sku : null),
      barcode: variant.barcode ?? offer?.gtin ?? (lone ? facts.gtin : null),
      // A theme's offer image is often a thumbnail; it only fills a real gap.
      image:
        variant.image ??
        (product.images.length > 0 ? null : (offer?.image ?? null)),
      availability:
        variant.availability === "unknown"
          ? (offer?.availability ?? "unknown")
          : variant.availability,
    };
  });

  const mpns = [
    ...new Set(facts.offers.flatMap(({ mpn }) => (mpn ? [mpn] : []))),
  ];

  return {
    product: {
      ...product,
      currency,
      variants,
      brand: facts.brand ?? product.brand,
      mpn:
        product.mpn ??
        facts.mpn ??
        (mpns.length === 1 ? (mpns[0] ?? null) : null),
      productType: product.productType ?? facts.productType,
      condition: facts.condition ?? product.condition ?? null,
      description: product.description ?? facts.description,
      images: product.images.length > 0 ? product.images : facts.images,
    },
    disagreement: disagreement
      ? `"${product.title}": ${disagreement.offer?.price} ${currency} on the page, ${disagreement.variant.price}${product.currency ? ` ${product.currency}` : ""} in the store's API`
      : null,
    mixed:
      currency !== null && stated.some((offer) => offer.currency !== currency),
  };
};

/** Lowercase letters and digits, so `Whole Brisket` is found inside an SEO title. */
const squashed = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * Whether a link the platform gave us landed on some other product. The API has
 * the current address, so a redirect to another page is the store sending that
 * link elsewhere (a retired product, an SEO rule). A shopper who follows it does
 * not find this product, and that page's price is not this product's.
 */
const landedElsewhere = (product: Product, landed: string, facts: Facts) => {
  if (!product.url || samePage(product.url, landed)) return false;

  const [own, theirs] = [squashed(product.title), squashed(facts.title)];
  return !own.includes(theirs) && !theirs.includes(own);
};

/** Best effort: a page that will not load only costs that product its extras. */
const enrichAll = async (run: Run, products: Product[], timeout: number) => {
  run.report(`Reading ${products.length} product pages for identifiers.`);

  const first = await pool(
    products,
    async (product) => ({
      product,
      visit: product.url ? await visitPage(run, product.url, timeout) : null,
    }),
    {
      tick: (done) => {
        if (done % PROGRESS_EVERY === 0 && done < products.length)
          run.report(`Read ${done} of ${products.length} product pages.`);
      },
    },
  );

  // A few slow pages on a cold store are worth one more try. Most of them failing
  // is a store refusing us, and a bot check will say the same thing twice.
  const missed = first.filter(
    ({ visit }) => visit?.access.kind === "unreachable",
  );
  const visits =
    missed.length > 0 && missed.length <= products.length / 2
      ? await pool(first, async (entry) =>
          entry.product.url && missed.includes(entry)
            ? {
                product: entry.product,
                visit: await visitPage(run, entry.product.url, timeout * 2),
              }
            : entry,
        )
      : first;

  const outcomes = visits.map(({ product, visit }) => {
    const facts = visit?.parsed?.product;
    // Unread says nothing either way: a slow page keeps its link.
    if (!visit?.parsed)
      return { product, disagreement: null, mixed: false, moved: false };

    // A removed product redirects to the homepage, a retired one to a sibling.
    const elsewhere = facts
      ? landedElsewhere(product, visit.url, facts)
      : product.url !== null && !samePage(product.url, visit.url);
    if (elsewhere)
      return {
        product: { ...product, url: null },
        disagreement: null,
        mixed: false,
        moved: true,
      };

    if (!facts)
      return { product, disagreement: null, mixed: false, moved: false };

    return {
      ...enrich(
        // The address a shopper lands on, not the apex we happened to ask.
        { ...product, url: addressOf(visit.url, visit.parsed.canonical) },
        facts,
      ),
      moved: false,
    };
  });

  const unread = visits.filter(({ visit }) => !visit?.parsed).length;
  const wall = blockage(visits.flatMap(({ visit }) => (visit ? [visit] : [])));
  const disagreements = outcomes.flatMap(({ disagreement }) =>
    disagreement ? [disagreement] : [],
  );
  const mixed = outcomes.filter((outcome) => outcome.mixed).length;
  const moved = outcomes.filter((outcome) => outcome.moved).length;

  return {
    products: outcomes.map(({ product }) => product),
    notes: [
      ...(moved > 0
        ? [
            `On ${moved} ${moved === 1 ? "product" : "products"} the store's own link sends shoppers to some other page, so we left ${moved === 1 ? "it" : "them"} out of the feeds.`,
          ]
        : []),
      ...(disagreements.length > 0
        ? [
            `On ${disagreements.length} ${disagreements.length === 1 ? "product" : "products"} the product page states a different price than the store's API. We used the page, because it is what a shopper sees. For example ${disagreements[0]}.`,
          ]
        : []),
      ...(mixed > 0
        ? [
            `On ${mixed} ${mixed === 1 ? "product" : "products"} the page shows some variants in another currency. We kept the store's API price for those, rather than mix currencies.`,
          ]
        : []),
      ...(unread > 0
        ? [
            `We could not read ${unread} of ${products.length} product pages${wall ? ` (${wall.wall} blocked ${wall.count})` : ""}, so any identifiers on those pages are missing.`,
          ]
        : []),
    ],
  };
};

// ---------------------------------------------------------------------------
// Shopify. `/products.json` for the Storefront read, Admin API rows (same shape,
// plus inventory) for the importer path.
// ---------------------------------------------------------------------------

type ShopifyVariant = {
  id: number;
  price?: unknown;
  compare_at_price?: unknown;
  sku?: unknown;
  barcode?: unknown;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  featured_image?: { src?: string } | null;
  image_id?: number | null;
  available?: boolean;
  inventory_quantity?: number;
  inventory_policy?: string;
  inventory_management?: string | null;
};

type ShopifyItem = {
  id: number;
  title?: string;
  handle?: string;
  body_html?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  images?: { id?: number; src?: string }[];
  options?: { name?: string }[];
  variants?: ShopifyVariant[];
};

/** The public catalog says yes or no per variant, or nothing at all. */
const publicAvailability = ({ available }: ShopifyVariant): Availability => {
  if (available === undefined || available === null) return "unknown";
  return available ? "in_stock" : "out_of_stock";
};

/**
 * Admin API inventory. Without a number there is nothing to say, and an untracked
 * variant reports a quantity of 0 that means nothing, so neither is a stock claim.
 */
const inventoryAvailability = ({
  inventory_quantity: quantity,
  inventory_policy: policy,
  inventory_management: management,
}: ShopifyVariant): Availability => {
  if (typeof quantity !== "number" || management === null) return "unknown";
  if (quantity > 0) return "in_stock";

  switch (policy) {
    case "continue":
      return "backorder";
    case "deny":
      return "out_of_stock";
    default:
      return "unknown";
  }
};

const shopifyOptions = (variant: ShopifyVariant, item: ShopifyItem) => {
  const values = [variant.option1, variant.option2, variant.option3];

  const stated = (item.options ?? []).flatMap((option, position) => {
    const value = values[position];
    return option.name && value ? [[option.name, value] as const] : [];
  });

  // Shopify's stand-in on a product with no real options.
  return stated.some(([, value]) => value === "Default Title")
    ? {}
    : Object.fromEntries(stated);
};

const fromShopify = (
  item: ShopifyItem,
  {
    url,
    currency,
    origin,
    availability,
  }: {
    url: string | null;
    currency: string | null;
    origin: Product["origin"];
    availability: (variant: ShopifyVariant) => Availability;
  },
): Product => {
  const images = item.images ?? [];

  const variants = (item.variants ?? []).slice(0, MAX_VARIANTS).map(
    (variant): Variant => ({
      id: String(variant.id),
      options: shopifyOptions(variant, item),
      price: filled(variant.price),
      compareAtPrice: filled(variant.compare_at_price),
      availability: availability(variant),
      sku: filled(variant.sku),
      barcode: filled(variant.barcode),
      image:
        variant.featured_image?.src ??
        images.find((image) => image.id === variant.image_id)?.src ??
        null,
    }),
  );

  return {
    id: String(item.id),
    origin,
    url,
    title: item.title ?? "",
    description: filled(item.body_html),
    currency,
    brand: filled(item.vendor),
    mpn: null,
    productType: filled(item.product_type),
    images: images.flatMap((image) => (image.src ? [image.src] : [])),
    variants: variants.length > 0 ? variants : [blank(String(item.id))],
  };
};

/**
 * `limit=250` covers the cap on a real store. The walk is for one that serves
 * fewer per page; a store that ignores `page` and repeats itself adds nothing
 * new, which ends it.
 */
const walkShopify = async (
  run: Run,
  page = 1,
  gathered: ShopifyItem[] = [],
  base = run.origin,
): Promise<{ items: ShopifyItem[]; base: string }> => {
  const answer = await readJson<{ products?: ShopifyItem[] }>(
    run,
    `${run.origin}/products.json?limit=${SHOPIFY_PAGE_SIZE}&page=${page}`,
    CATALOG_TIMEOUT_MS,
  );
  const items = answer?.body?.products;
  if (!answer || !Array.isArray(items)) return { items: gathered, base };

  const known = new Set(gathered.map((item) => item.id));
  const fresh = items.filter(
    (item) => typeof item.id === "number" && item.title && !known.has(item.id),
  );
  const all = [...gathered, ...fresh];
  // The hop that answered: apex-to-www redirects must not end up in every link.
  const landed = resultify(() => new URL(answer.page.url).origin);
  const resolved = landed.success ? landed.data : base;

  return fresh.length === 0 ||
    all.length >= MAX_PRODUCTS ||
    page >= CATALOG_MAX_PAGES
    ? { items: all, base: resolved }
    : walkShopify(run, page + 1, all, resolved);
};

const readShopify = async (run: Run): Promise<Result<Reading>> => {
  run.report("Reading the Shopify catalog.");

  const [answer, listing] = await Promise.all([
    fetchPublicMeta(run.origin),
    walkShopify(run),
  ]);
  // The one place a store states its currency without a product page, and a cold
  // store can miss the first read's deadline.
  const meta = answer ?? (await fetchPublicMeta(run.origin));

  if (listing.items.length === 0)
    return {
      success: false,
      error: new RequestError(
        `${run.host} is not sharing a public product list.`,
      ),
    };

  const chosen = listing.items.slice(0, MAX_PRODUCTS);
  const products = chosen.map((item) =>
    fromShopify(item, {
      url: item.handle ? `${listing.base}/products/${item.handle}` : null,
      currency: currencyCode(meta?.currency),
      origin: "shopify",
      availability: publicAvailability,
    }),
  );

  run.report(`Found ${products.length} products on Shopify.`);

  const enriched = await enrichAll(run, products, ENRICH_TIMEOUT_MS);

  return {
    success: true,
    data: {
      platform: "shopify",
      name: meta?.name ?? null,
      products: enriched.products,
      discovered: meta?.published_products_count ?? listing.items.length,
      notes: [
        ...capped(
          chosen.filter((item) => (item.variants?.length ?? 0) > MAX_VARIANTS)
            .length,
        ),
        ...enriched.notes,
      ],
    },
  };
};

// ---------------------------------------------------------------------------
// WooCommerce public Store API.
// ---------------------------------------------------------------------------

type WooCommerceItem = StoreApiProduct & {
  type?: string;
  is_on_backorder?: boolean;
  attributes?: {
    name?: string;
    terms?: { name?: string; slug?: string }[];
  }[];
  variations?: {
    id: number;
    attributes?: { name?: string; value?: string | null }[];
  }[];
};

const wooCommerceAvailability = ({
  is_in_stock: stocked,
  is_on_backorder: backordered,
}: WooCommerceItem): Availability => {
  switch (true) {
    case backordered === true:
      return "backorder";
    case stocked === true:
      return "in_stock";
    case stocked === false:
      return "out_of_stock";
    default:
      return "unknown";
  }
};

/** Minor units by string, with the unit the store reports. No reported unit, no price. */
const wooCommercePrice = ({ prices }: WooCommerceItem) => {
  const digits = prices?.currency_minor_unit;
  if (typeof digits !== "number") return { price: null, compareAtPrice: null };

  const price = toMajor(prices?.price, digits);
  const regular = toMajor(prices?.regular_price, digits);

  return {
    price,
    compareAtPrice:
      price && regular && Number(regular) > Number(price) ? regular : null,
  };
};

const wooCommerceOptions = (parent: WooCommerceItem, id: number) => {
  const attributes =
    parent.variations?.find((variation) => variation.id === id)?.attributes ??
    [];

  return Object.fromEntries(
    attributes.flatMap(({ name, value }) => {
      if (!name || !value) return [];

      // A variation names its term by slug; the parent knows the display name.
      const term = parent.attributes
        ?.find((attribute) => attribute.name === name)
        ?.terms?.find((candidate) => candidate.slug === value);

      return [[decodeEntities(name), decodeEntities(term?.name ?? value)]];
    }),
  );
};

const fromWooCommerce = (
  item: WooCommerceItem,
  variations: WooCommerceItem[],
): Product => {
  const own: Variant = {
    ...blank(String(item.id)),
    ...wooCommercePrice(item),
    availability: wooCommerceAvailability(item),
    sku: filled(item.sku),
    image: item.images?.[0]?.src ?? null,
  };

  return {
    id: String(item.id),
    origin: "woocommerce",
    url: filled(item.permalink),
    title: decodeEntities(item.name ?? ""),
    description: filled(item.description) ?? filled(item.short_description),
    currency: currencyCode(item.prices?.currency_code),
    brand: filled(item.brands?.[0]?.name),
    mpn: null,
    productType: filled(item.categories?.[0]?.name),
    images: (item.images ?? []).flatMap((image) =>
      image.src ? [image.src] : [],
    ),
    variants:
      variations.length > 0
        ? variations.map((variation) => ({
            ...blank(String(variation.id)),
            ...wooCommercePrice(variation),
            options: wooCommerceOptions(item, variation.id),
            availability: wooCommerceAvailability(variation),
            sku: filled(variation.sku),
            image: variation.images?.[0]?.src ?? null,
          }))
        : [own],
  };
};

const walkWooCommerce = async (
  run: Run,
  root: string,
  page = 1,
  gathered: WooCommerceItem[] = [],
  total: number | null = null,
): Promise<{ items: WooCommerceItem[]; total: number | null }> => {
  const answer = await readJson<WooCommerceItem[]>(
    run,
    restUrl(root, "wc/store/v1/products", {
      per_page: String(CATALOG_PAGE_SIZE),
      page: String(page),
    }),
    CATALOG_TIMEOUT_MS,
  );
  if (!answer || !Array.isArray(answer.body)) return { items: gathered, total };

  const known = new Set(gathered.map((item) => item.id));
  const fresh = answer.body.filter(
    (item) => typeof item.id === "number" && item.name && !known.has(item.id),
  );
  const all = [...gathered, ...fresh];
  const stated = Number.parseInt(
    answer.page.headers.get("x-wp-total") ?? "",
    10,
  );
  const counted = Number.isInteger(stated) ? stated : total;

  return fresh.length === 0 ||
    all.length >= MAX_PRODUCTS ||
    page >= CATALOG_MAX_PAGES
    ? { items: all, total: counted }
    : walkWooCommerce(run, root, page + 1, all, counted);
};

/**
 * Real per-variant price and stock. One request per product where the store
 * answers a filtered list, one per variation where it does not.
 */
const readVariations = async (
  run: Run,
  root: string,
  item: WooCommerceItem,
) => {
  const ids = (item.variations ?? [])
    .slice(0, MAX_VARIANTS)
    .map(({ id }) => id);
  if (ids.length === 0) return [];

  const batch = await readJson<WooCommerceItem[]>(
    run,
    restUrl(root, "wc/store/v1/products", {
      type: "variation",
      include: ids.join(","),
      per_page: String(CATALOG_PAGE_SIZE),
    }),
    VARIATION_TIMEOUT_MS,
  );

  if (Array.isArray(batch?.body) && batch.body.length > 0)
    return ids.flatMap((id) => {
      const found = batch.body?.find((row) => row.id === id);
      return found ? [found] : [];
    });

  const single = await pool(ids, async (id) => {
    const answer = await readJson<WooCommerceItem>(
      run,
      restUrl(root, `wc/store/v1/products/${id}`),
      VARIATION_TIMEOUT_MS,
    );
    return answer?.body && typeof answer.body.id === "number"
      ? answer.body
      : null;
  });

  return single.flatMap((row) => (row ? [row] : []));
};

const readWooCommerce = async (
  run: Run,
  home: HTTP.Page | null,
): Promise<Result<Reading>> => {
  run.report("Reading the WooCommerce catalog.");

  const conventional = `${run.origin}/wp-json/`;
  const stated = home ? advertisedRestRoot(home) : null;
  // A page can name any host here, and that host's catalog is not this store's.
  const advertised = stated && sameSite(stated, run.origin) ? stated : null;

  const direct = await walkWooCommerce(run, conventional);
  const { root, listing } =
    direct.items.length === 0 && advertised && advertised !== conventional
      ? { root: advertised, listing: await walkWooCommerce(run, advertised) }
      : { root: conventional, listing: direct };

  if (listing.items.length === 0)
    return {
      success: false,
      error: new RequestError(
        `${run.host} is not sharing a public product list.`,
      ),
    };

  const chosen = listing.items.slice(0, MAX_PRODUCTS);
  run.report(`Found ${chosen.length} products on WooCommerce.`);

  const products = await pool(chosen, async (item) => {
    const product = fromWooCommerce(
      item,
      await readVariations(run, root, item),
    );
    // A permalink is the store's say-so, and it can name any host at all.
    return product.url && !sameSite(product.url, run.origin)
      ? { ...product, url: null }
      : product;
  });

  // WordPress renders each page on demand, so give it longer than Shopify's CDN.
  const enriched = await enrichAll(run, products, CANDIDATE_TIMEOUT_MS);

  const unpriced = chosen.filter(
    (item, index) =>
      item.type === "variable" &&
      (products[index]?.variants.length ?? 0) === 1 &&
      products[index]?.variants[0]?.id === String(item.id),
  ).length;

  return {
    success: true,
    data: {
      platform: "woocommerce",
      name: null,
      products: enriched.products,
      discovered: listing.total ?? listing.items.length,
      notes: [
        ...capped(
          chosen.filter((item) => (item.variations?.length ?? 0) > MAX_VARIANTS)
            .length,
        ),
        ...(unpriced > 0
          ? [
              `We could not read the variants of ${unpriced} ${unpriced === 1 ? "product" : "products"}, so those show the store's starting price.`,
            ]
          : []),
        ...enriched.notes,
      ],
    },
  };
};

// ---------------------------------------------------------------------------
// Anything else: find product pages, read each one.
// ---------------------------------------------------------------------------

const isProductPath = (url: string) => {
  const parsed = resultify(() => new URL(url).pathname);
  if (!parsed.success) return false;

  return (
    /\/(?:products?|p|shop|item|dp)\/[^/]+/i.test(parsed.data) &&
    !/\/product-(?:category|tag)\b/i.test(parsed.data)
  );
};

/**
 * Split, not a regex over the whole file: this body is a stranger's, and one
 * `<loc>` followed by 20KB of spaces held a backtracking regex for minutes on the
 * event loop, where no deadline can interrupt it.
 */
const locations = (xml: string) =>
  xml
    .split(/<loc>/i)
    .slice(1)
    .flatMap((part) => {
      const end = part.search(/<\/loc>/i);
      if (end === -1) return [];

      const value = part
        .slice(0, end)
        .trim()
        .replace(/^<!\[CDATA\[/, "")
        .replace(/\]\]>$/, "")
        .trim();
      return value ? [decodeEntities(value)] : [];
    });

const isIndex = (xml: string) => /<sitemapindex[\s>]/i.test(xml);

const isNamedProduct = (url: string) => {
  const parsed = resultify(() => new URL(url).pathname);
  return parsed.success && /product/i.test(parsed.data);
};

const MARKET = /^\/([a-z]{2}(?:[-_][a-z]{2})?)(?:\/|$)/i;

/** The market a multi-market store puts first in its paths: `/en-us/`, `/de/`. */
const marketOf = (url: string) => {
  const parsed = resultify(() => new URL(url).pathname);
  if (!parsed.success) return null;
  return MARKET.exec(parsed.data)?.[1]?.toLowerCase().replace("_", "-") ?? null;
};

/**
 * A multi-market sitemap lists every market's copy of every product in whatever
 * order it likes, so the first pages can all be Norwegian on a store that opened
 * in English. The market its homepage served comes first, then the same language
 * elsewhere, then paths with no market in them. Only an order: nothing is dropped.
 */
const homeMarketFirst = (urls: string[], home: HTTP.Page | null) => {
  const market = home ? marketOf(home.url) : null;
  const language = market?.split("-")[0];

  const rank = (url: string) => {
    const own = marketOf(url);
    switch (true) {
      case own === market:
        return 0;
      case own !== null && own.split("-")[0] === language:
        return 1;
      case own === null:
        return 2;
      default:
        return 3;
    }
  };

  return urls
    .map((url) => ({ url, rank: rank(url) }))
    .sort((first, second) => first.rank - second.rank)
    .map(({ url }) => url);
};

const readSitemap = async (run: Run, url: string) => {
  const page = await fetchPage(run, url, {
    timeout: SITEMAP_TIMEOUT_MS,
    limit: CATALOG_LIMIT_BYTES,
    accept: "application/xml,text/xml,*/*",
  });
  if (!page.success || page.data.status !== 200) return [];

  return [{ url, xml: page.data.body }];
};

/**
 * Product URLs from robots.txt's sitemaps, /sitemap.xml and /sitemap_index.xml,
 * children named for products first. Every URL in a child named for products
 * counts; elsewhere only product-looking paths do. Never leaves the store.
 */
const fromSitemaps = async (run: Run, home: HTTP.Page | null) => {
  const robots = await fetchPage(run, `${run.origin}/robots.txt`, {
    timeout: SITEMAP_TIMEOUT_MS,
    limit: 512 * 1024,
    accept: "text/plain,*/*",
  });

  const declared =
    robots.success && robots.data.status === 200
      ? robots.data.body.split("\n").flatMap((line) => {
          const url = /^\s*sitemap:\s*(\S+)/i.exec(line)?.[1];
          return url ? [url] : [];
        })
      : [];

  const roots = [
    ...new Set([
      ...declared.filter((url) => sameSite(url, run.origin)),
      `${run.origin}/sitemap.xml`,
      `${run.origin}/sitemap_index.xml`,
    ]),
  ].slice(0, MAX_CHILD_SITEMAPS);

  const top = (
    await Promise.all(roots.map((url) => readSitemap(run, url)))
  ).flat();

  const children = [
    ...new Set(
      top
        .filter(({ xml }) => isIndex(xml))
        .flatMap(({ xml }) => locations(xml)),
    ),
  ].filter((url) => !/\.gz(?:$|\?)/i.test(url) && sameSite(url, run.origin));

  const chosen = homeMarketFirst(
    [
      ...children.filter(isNamedProduct),
      ...children.filter((url) => !isNamedProduct(url)),
    ],
    home,
  ).slice(0, MAX_CHILD_SITEMAPS);

  const nested = (
    await Promise.all(chosen.map((url) => readSitemap(run, url)))
  ).flat();

  const sets = [...top, ...nested].filter(({ xml }) => !isIndex(xml));
  const named = sets.filter(({ url }) => isNamedProduct(url));
  const others = sets.filter(({ url }) => !isNamedProduct(url));

  return [
    ...new Set(
      [
        ...named.flatMap(({ xml }) => locations(xml)),
        ...others.flatMap(({ xml }) => locations(xml)).filter(isProductPath),
      ].filter((url) => sameSite(url, run.origin)),
    ),
  ];
};

const viaSitemaps = async (
  run: Run,
  home: HTTP.Page | null,
): Promise<Crawl> => {
  run.report("Looking for product pages in the sitemap.");

  const mapped = homeMarketFirst(await fromSitemaps(run, home), home);

  // Homepage links are the last resort, one level deep, and a page that is not a
  // product simply parses to nothing, so an unsure link costs a request, no more.
  const links =
    mapped.length === 0 && home
      ? parsePage(home.body, home.url).links.filter(
          (link) => comparable(link) !== comparable(home.url),
        )
      : [];
  const linked = links.filter(isProductPath);

  const urls = [mapped, linked, links].find((set) => set.length > 0) ?? [];
  const candidates = urls.slice(0, MAX_CANDIDATES);

  run.report(`Checking ${candidates.length} pages for product data.`);

  const visits = await pool(
    candidates,
    (url) => visitPage(run, url, CANDIDATE_TIMEOUT_MS),
    {
      stop: (gathered) =>
        gathered.filter((visit) => visit.parsed?.product).length >=
        MAX_PRODUCTS,
      tick: (done) => {
        if (done % PROGRESS_EVERY === 0)
          run.report(`Checked ${done} of ${candidates.length} pages.`);
      },
    },
  );

  return {
    visits,
    // Unsure homepage links say nothing about how many products exist.
    total: urls === links ? 0 : urls.length,
  };
};

type FirecrawlDocument = {
  rawHtml?: string;
  metadata?: { sourceURL?: string; url?: string; statusCode?: number };
};

type FirecrawlBatch = {
  status?: string;
  next?: string;
  data?: FirecrawlDocument[];
};

/** Our own API call with a key in env, never a user-supplied URL: no SSRF guard. */
const firecrawl = async <T>(
  run: Run,
  key: string,
  path: string,
  body?: unknown,
) => {
  const left = Math.max(run.deadline - Date.now(), 1);
  const response = await HTTP.request(
    path.startsWith(FIRECRAWL) ? path : `${FIRECRAWL}${path}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    { timeout: Math.min(FIRECRAWL_TIMEOUT_MS, left) },
  );

  return HTTP.parse<T>(response);
};

const settle = async (
  run: Run,
  key: string,
  id: string,
): Promise<Result<FirecrawlBatch>> => {
  const batch = await firecrawl<FirecrawlBatch>(
    run,
    key,
    `/batch/scrape/${id}`,
  );
  if (!batch.success) return batch;

  const finished = batch.data.status !== "scraping";
  const late =
    Date.now() + FIRECRAWL_POLL_MS > run.deadline - FIRECRAWL_MARGIN_MS;
  if (finished || late) return batch;

  await new Promise((resolve) => setTimeout(resolve, FIRECRAWL_POLL_MS));
  return settle(run, key, id);
};

/** Raw HTML overflows one response quickly, so the documents arrive across `next`. */
const documents = async (
  run: Run,
  key: string,
  batch: FirecrawlBatch,
  gathered: FirecrawlDocument[] = [],
): Promise<FirecrawlDocument[]> => {
  const all = [...gathered, ...(batch.data ?? [])];

  // The bearer key only ever goes back to Firecrawl.
  if (!batch.next?.startsWith(FIRECRAWL) || Date.now() >= run.deadline)
    return all;

  const next = await firecrawl<FirecrawlBatch>(run, key, batch.next);
  return next.success ? documents(run, key, next.data, all) : all;
};

const viaFirecrawl = async (
  run: Run,
  key: string,
  home: HTTP.Page | null,
): Promise<Result<Crawl>> => {
  if (!(await isSafePublicHttpUrl(run.origin)))
    return {
      success: false,
      error: new ValidationError("Not a reachable public https URL"),
    };

  run.report("Mapping the store's pages.");

  const map = await firecrawl<{ links?: { url?: string }[] }>(
    run,
    key,
    "/map",
    { url: run.origin, limit: FIRECRAWL_MAP_LIMIT },
  );
  if (!map.success) return map;

  const links = (map.data.links ?? []).flatMap(({ url }) =>
    url && sameSite(url, run.origin) ? [url] : [],
  );
  const looking = links.filter(isProductPath);
  const urls = homeMarketFirst(looking.length > 0 ? looking : links, home);
  const candidates = urls.slice(0, MAX_CANDIDATES);

  if (candidates.length === 0)
    return {
      success: false,
      error: new RequestError("No pages to read"),
    };

  run.report(`Checking ${candidates.length} pages for product data.`);

  const job = await firecrawl<{ id?: string }>(run, key, "/batch/scrape", {
    urls: candidates,
    formats: ["rawHtml"],
  });
  if (!job.success) return job;
  if (!job.data.id)
    return {
      success: false,
      error: new RequestError("The crawl did not start"),
    };

  const batch = await settle(run, key, job.data.id);
  if (!batch.success) return batch;

  const pages = await documents(run, key, batch.data);

  return {
    success: true,
    data: {
      total: looking.length,
      visits: pages.flatMap((document) => {
        const url = document.metadata?.sourceURL ?? document.metadata?.url;
        if (!url || !sameSite(url, run.origin)) return [];

        const body = document.rawHtml ?? "";
        const access = classifyPageAccess({
          status: document.metadata?.statusCode ?? 200,
          headers: new Headers(),
          body,
        });

        return [
          {
            url,
            access,
            parsed: access.kind === "ok" && body ? parsePage(body, url) : null,
          },
        ];
      }),
    },
  };
};

/**
 * A product from a page's own statements. One product carries one currency, so
 * a page pricing the same item in several keeps the first it states.
 */
const fromFacts = (facts: Facts, url: string): Product => {
  const address = comparable(url);
  const hash = fingerprint(address);
  // A SKU before the URL: some stores put a session token in every path.
  const id = facts.sku ?? facts.offers.find((offer) => offer.sku)?.sku ?? hash;

  const currency =
    facts.offers.find((offer) => offer.currency)?.currency ?? null;
  const offers = facts.offers
    .filter((offer) => offer.currency === null || offer.currency === currency)
    .slice(0, MAX_VARIANTS);

  return {
    id,
    origin: "page",
    url,
    title: facts.title,
    description: facts.description,
    currency,
    brand: facts.brand,
    mpn: facts.mpn,
    productType: facts.productType,
    condition: facts.condition,
    images: facts.images,
    variants:
      offers.length > 0
        ? offers.map((offer, index) => ({
            id:
              offer.sku ??
              (offers.length === 1
                ? hash
                : fingerprint(
                    `${address}|${offer.url}|${JSON.stringify(offer.options)}|${index}`,
                  )),
            options: offer.options,
            // A starting price is not this item's price, and an amount with no
            // currency of its own does not borrow one from the offer beside it.
            ...(offer.from || offer.currency !== currency
              ? { price: null, compareAtPrice: null }
              : { price: offer.price, compareAtPrice: offer.compareAtPrice }),
            availability: offer.availability,
            sku: offer.sku,
            barcode: offer.gtin,
            image: offer.image ?? facts.images[0] ?? null,
          }))
        : [{ ...blank(id), sku: facts.sku, barcode: facts.gtin }],
  };
};

const readPages = async (
  run: Run,
  home: HTTP.Page | null,
  platform: Platform,
): Promise<Result<Reading>> => {
  const { visits, total } = await (async () => {
    const { FIRECRAWL_API_KEY: key } = process.env;
    if (!key) return viaSitemaps(run, home);

    const scraped = await viaFirecrawl(run, key, home);
    if (
      scraped.success &&
      scraped.data.visits.some((visit) => visit.parsed?.product)
    )
      return scraped.data;

    return viaSitemaps(run, home);
  })();

  const found = visits.flatMap(({ url, parsed }) => {
    if (!parsed?.product) return [];

    return [
      {
        product: fromFacts(parsed.product, addressOf(url, parsed.canonical)),
        parsed,
      },
    ];
  });

  // A product reached by two spellings of one URL is one product.
  const products = [
    ...new Map(
      found.map((entry) => [comparable(entry.product.url ?? ""), entry]),
    ).values(),
  ];

  const wall = blockage(visits);

  if (products.length === 0)
    return {
      success: false,
      error: new ValidationError(
        (() => {
          switch (true) {
            case wall !== null && wall.count === visits.length:
              return `${run.host} blocks automated visitors with ${wall?.wall}, so we could not read its pages.`;
            case visits.length > 0:
              return `We checked ${visits.length} ${visits.length === 1 ? "page" : "pages"} on ${run.host}, but none of them has product data we can read.`;
            default:
              return `We could not find any product pages on ${run.host}.`;
          }
        })(),
      ),
    };

  const chosen = products.slice(0, MAX_PRODUCTS);

  return {
    success: true,
    data: {
      platform,
      name: found.map(({ parsed }) => parsed.name).find(Boolean) ?? null,
      products: chosen.map(({ product }) => product),
      discovered: Math.max(total, products.length),
      notes: [
        ...capped(
          chosen.filter(
            ({ parsed }) => (parsed.product?.offers.length ?? 0) > MAX_VARIANTS,
          ).length,
        ),
        ...chosen.flatMap(({ parsed }) => parsed.product?.notes ?? []),
        ...(wall
          ? [
              `${wall.count} of ${visits.length} pages were blocked by ${wall.wall}, so we could not read them.`,
            ]
          : []),
      ],
    },
  };
};

// ---------------------------------------------------------------------------
// The demo store: a password-protected dev store whose public pages answer
// nothing, read from the rows its Admin API sync already wrote.
// ---------------------------------------------------------------------------

const fromRow = (row: ProductRow.Type): Product => {
  const raw = json<ShopifyItem>(row.rawData ?? "");
  const images = json<string[]>(row.images ?? "[]") ?? [];
  const currency = currencyCode(row.currency);

  if (raw && Array.isArray(raw.variants) && raw.variants.length > 0) {
    const product = fromShopify(raw, {
      url: row.url,
      currency,
      origin: "importer",
      availability: inventoryAvailability,
    });

    return {
      ...product,
      id: row.externalId ?? product.id,
      title: product.title || row.title,
      images: product.images.length > 0 ? product.images : images,
      mpn: row.mpn,
    };
  }

  const id = row.externalId ?? row.id;

  return {
    id,
    origin: "importer",
    url: row.url,
    title: row.title,
    description: row.description,
    currency,
    brand: null,
    mpn: row.mpn,
    productType: null,
    images,
    variants: [
      {
        ...blank(id),
        price: row.price,
        compareAtPrice: row.compareAtPrice,
        sku: row.sku,
        barcode: row.gtin,
      },
    ],
  };
};

/**
 * Null unless this host is the configured demo store. Only a verified `shopify`
 * row counts: it was written by the Admin API with the shop's own currency,
 * whereas a `shopify-public` row can carry the importer's USD default and proves
 * nothing about who owns the store.
 */
const readImporter = async (run: Run): Promise<Result<Reading> | null> => {
  const { AGENTS_DEMO_DOMAIN: configured } = process.env;
  const demo = resolveOrigin(configured ?? "")?.host;
  if (!demo) return null;

  const stores = await StoreRow.find(Environment.SERVER, {
    // Narrows the rows; the exact match on normalized hosts happens below.
    where: or(
      ilike(schema.store.domain, `%${demo}%`),
      ilike(sql`${schema.store.storefrontHosts}::text`, `%${demo}%`),
    ),
  });
  if (!stores.success) return null;

  const hostsOf = (store: (typeof stores.data)[number]) =>
    [store.domain, ...(store.storefrontHosts ?? [])].flatMap((value) => {
      const resolved = resolveOrigin(value)?.host;
      return resolved ? [resolved] : [];
    });

  const store = stores.data.find((candidate) => {
    const hosts = hostsOf(candidate);

    return (
      candidate.platform === "shopify" &&
      hosts.includes(demo) &&
      (run.host === demo || hosts.includes(run.host))
    );
  });
  if (!store) return null;

  run.report("Reading the connected catalog for this store.");

  const rows = await ProductRow.find(Environment.SERVER, {
    where: eq(schema.product.storeId, store.id),
    limit: MAX_PRODUCTS * 5,
  });
  if (!rows.success || rows.data.length === 0) return null;

  const chosen = rows.data.slice(0, MAX_PRODUCTS);

  const over = chosen.filter((row) => {
    const raw = json<ShopifyItem>(row.rawData ?? "");
    return (raw?.variants?.length ?? 0) > MAX_VARIANTS;
  }).length;

  return {
    success: true,
    data: {
      platform: "shopify",
      name: store.name,
      products: chosen.map(fromRow),
      discovered: rows.data.length,
      notes: [
        "This store is password protected, so we read its connected catalog instead of its public pages.",
        ...capped(over),
      ],
    },
  };
};

// ---------------------------------------------------------------------------

/**
 * Both probes open a request-scoped Sentry shell, so off a request (a script, a
 * queue) they throw. That is no verdict on the store: null means "not asked",
 * and the readers then try each platform's public endpoints in turn.
 */
const detect = async (run: Run, home: HTTP.Page | null) => {
  const [shopify, woocommerce] = await Promise.all([
    resultify(() =>
      Shopify.probe(Environment.SERVER, { domain: run.origin, home }),
    ),
    resultify(() =>
      WooCommerce.probe(Environment.SERVER, { domain: run.origin, home }),
    ),
  ]);

  if (!shopify.success || !woocommerce.success) return null;

  const found = {
    shopify: shopify.data.success ? shopify.data.data : null,
    woocommerce: woocommerce.data.success ? woocommerce.data.data : null,
  };

  // Mirrors `Entry.begin`: an importable catalog outranks a locked one, because a
  // WordPress store embedding a Shopify Buy Button carries Shopify markup too.
  switch (true) {
    case found.shopify?.importable === true:
      return "shopify" as const;
    case found.woocommerce?.importable === true:
      return "woocommerce" as const;
    case found.shopify !== null:
      return "shopify" as const;
    case found.woocommerce !== null:
      return "woocommerce" as const;
    default:
      return "other" as const;
  }
};

const firstOf = async (
  readers: (() => Promise<Result<Reading>>)[],
  last: Error | null = null,
): Promise<Result<Reading>> => {
  const [reader, ...rest] = readers;
  if (!reader)
    return {
      success: false,
      error: last ?? new ValidationError("We could not read this store."),
    };

  const reading = await reader();
  return reading.success ? reading : firstOf(rest, reading.error);
};

/** The first link that really answers. A redirect home is a dead policy link. */
const findPolicy = async (run: Run, front: Parsed | null) => {
  const answers = await Promise.all(
    (front?.returnPolicies ?? [])
      .slice(0, MAX_POLICY_LINKS)
      .map(async (url) => {
        const page = await fetchPage(run, url, {
          timeout: POLICY_TIMEOUT_MS,
          limit: HOME_LIMIT_BYTES,
        });
        if (!page.success || page.data.status !== 200) return null;
        if (classifyPageAccess(page.data).kind !== "ok") return null;

        const path = resultify(() => new URL(page.data.url).pathname);
        return path.success && path.data !== "/" ? page.data.url : null;
      }),
  );

  return answers.find(Boolean) ?? null;
};

const tally = (ids: string[]) =>
  ids.reduce(
    (seen, id) => seen.set(id, (seen.get(id) ?? 0) + 1),
    new Map<string, number>(),
  );

const bounded = (product: Product): Product => ({
  ...product,
  title: product.title.slice(0, TITLE_CHARACTERS),
  description: product.description?.slice(0, DESCRIPTION_CHARACTERS) ?? null,
});

/** Ids must be unique across the store; a SKU repeated across pages is not. */
const uniquely = (products: Product[]) => {
  const owned = tally(products.map(({ id }) => id));
  const sold = tally(
    products.flatMap(({ variants }) => variants.map(({ id }) => id)),
  );

  return products.map((product) => ({
    ...product,
    id:
      (owned.get(product.id) ?? 0) > 1
        ? fingerprint(comparable(product.url ?? product.title))
        : product.id,
    variants: product.variants.map((variant, index) =>
      (sold.get(variant.id) ?? 0) > 1
        ? {
            ...variant,
            id: fingerprint(`${product.url}|${variant.id}|${index}`),
          }
        : variant,
    ),
  }));
};

const attempt = async (run: Run): Promise<Result<Catalog>> => {
  run.report(`Opening ${run.host}.`);

  const front = await fetchPage(run, run.origin, {
    timeout: HOME_TIMEOUT_MS,
    limit: HOME_LIMIT_BYTES,
  });

  // The guard said no. That never gets better by asking other pages of it.
  if (!front.success && front.error.name === "validation-error")
    return {
      success: false,
      error: new ValidationError(
        "That address is not a public store we can read. Check it and try again.",
      ),
    };

  const home = front.success ? front.data : null;
  const access = home ? classifyPageAccess(home) : null;
  const parsed =
    home && access?.kind === "ok" ? parsePage(home.body, home.url) : null;

  const isLocked = (() => {
    if (!home) return false;

    const path = resultify(() => new URL(home.url).pathname);
    return path.success && path.data === "/password";
  })();

  const detected = await detect(run, home);

  const pages = () => {
    const platform: Platform =
      detected ?? (home && isWooCommercePage(home) ? "woocommerce" : "other");
    return readPages(run, home, platform);
  };

  const readers = (() => {
    switch (detected) {
      case "shopify":
        return isLocked ? [] : [() => readShopify(run), pages];
      case "woocommerce":
        return [() => readWooCommerce(run, home), pages];
      case "other":
        return [pages];
      default:
        return isLocked
          ? []
          : [() => readShopify(run), () => readWooCommerce(run, home), pages];
    }
  })();

  const [served, returnPolicy] = await Promise.all([
    firstOf(readers),
    findPolicy(run, parsed),
  ]);

  const imported = served.success
    ? null
    : await resultify(() => readImporter(run));

  const reading = imported?.success && imported.data ? imported.data : served;

  if (!reading.success)
    return {
      success: false,
      error: (() => {
        switch (true) {
          case isLocked:
            return new ValidationError(
              `${run.host} is password protected, so its products are not public.`,
            );
          case access?.kind === "challenged":
            return new ValidationError(
              `${run.host} blocks automated visitors${access.vendor ? ` with ${access.vendor}` : ""}, so we could not read its pages.`,
            );
          case home === null:
            return new RequestError(
              `We could not reach ${run.host}. Check the address and try again.`,
            );
          default:
            return reading.error;
        }
      })(),
    };

  return {
    success: true,
    data: {
      store: {
        origin: run.origin,
        host: run.host,
        name: reading.data.name ?? parsed?.name ?? null,
        platform: reading.data.platform,
        returnPolicy,
      },
      products: uniquely(reading.data.products).map(bounded),
      discovered: Math.max(
        reading.data.discovered,
        reading.data.products.length,
      ),
      notes: summarize(reading.data.notes),
    },
  };
};

/**
 * The store's catalog, or a plain-English reason it could not be read, which the
 * page shows as written. Never throws.
 */
export const read = async (
  { origin, host }: { origin: string; host: string },
  { onProgress }: { onProgress?: (message: string) => void } = {},
): Promise<Result<Catalog>> => {
  const outcome = await resultify(() =>
    attempt({
      origin,
      host,
      deadline: Date.now() + BUDGET_MS,
      // A failed progress write must never fail the read, sync or async.
      report: (message) => {
        void resultify(async () => onProgress?.(message));
      },
    }),
  );

  return outcome.success
    ? outcome.data
    : {
        success: false,
        error: new RequestError(
          `Something went wrong while reading ${host}. Try again.`,
          { cause: outcome.error },
        ),
      };
};
