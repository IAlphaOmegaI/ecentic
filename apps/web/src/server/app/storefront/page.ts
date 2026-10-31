import { resultify } from "@zenncore/utils";
import { type DefaultTreeAdapterMap, parse } from "parse5";
import { decodeEntities } from "../integration/woocommerce/http";
import type { Availability, Condition } from "./catalog";

/**
 * Pure: a store's HTML in, what the page itself states out. JSON-LD first, then
 * microdata, then Open Graph meta. Nothing here is defaulted: a price with no
 * stated currency has a null currency, an offer with no stated availability is
 * "unknown". Never throws, so one malformed page cannot fail a whole read.
 */

type Element = DefaultTreeAdapterMap["element"];
type Tree = DefaultTreeAdapterMap["node"];
type Data = Record<string, unknown> &
  Partial<
    Record<
      | "availability"
      | "brand"
      | "category"
      | "contentUrl"
      | "description"
      | "hasVariant"
      | "highPrice"
      | "image"
      | "itemCondition"
      | "itemOffered"
      | "lowPrice"
      | "mainEntity"
      | "mainEntityOfPage"
      | "mpn"
      | "name"
      | "offerCount"
      | "offers"
      | "price"
      | "priceCurrency"
      | "priceSpecification"
      | "priceType"
      | "sku"
      | "url",
      unknown
    >
  >;
type Scope = { graph: Map<string, Data>; base: string };

/** One thing the page offers for sale. */
export type Offer = {
  /** Absolute. A Shopify theme's `?variant=` here names the exact variant. */
  url: string | null;
  sku: string | null;
  gtin: string | null;
  mpn: string | null;
  options: Record<string, string>;
  price: string | null;
  compareAtPrice: string | null;
  currency: string | null;
  availability: Availability;
  image: string | null;
  /** An AggregateOffer's low price: where the range starts, not one item's price. */
  from: boolean;
};

export type Facts = {
  source: "json-ld" | "microdata" | "meta";
  title: string;
  description: string | null;
  brand: string | null;
  sku: string | null;
  gtin: string | null;
  mpn: string | null;
  productType: string | null;
  /** The worst condition the page states for anything on offer. */
  condition: Condition | null;
  images: string[];
  offers: Offer[];
  /** Plain-English caveats about what this page states. */
  notes: string[];
};

export type Parsed = {
  /** Null when the page does not describe one product. */
  product: Facts | null;
  /** The store's own name: og:site_name, else WebSite, else Organization. */
  name: string | null;
  canonical: string | null;
  /** Links that look like a return policy, best first. Unverified: `read` checks each answers. */
  returnPolicies: string[];
  /** Every link on this site, in page order. */
  links: string[];
};

const EMPTY: Parsed = {
  product: null,
  name: null,
  canonical: null,
  returnPolicies: [],
  links: [],
};

const isData = (value: unknown): value is Data =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const list = (value: unknown): unknown[] => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

/** A `{ "@id": … }` stub stands for the node of that id elsewhere in the graph. */
const follow = (value: unknown, graph: Scope["graph"]) => {
  if (!isData(value) || typeof value["@id"] !== "string") return value;

  const isReference = Object.keys(value).every(
    (key) => key === "@id" || key === "@type",
  );
  return isReference ? (graph.get(value["@id"]) ?? value) : value;
};

const many = (value: unknown, scope: Scope) =>
  list(value).map((entry) => follow(entry, scope.graph));

const records = (value: unknown, scope: Scope) =>
  many(value, scope).filter(isData);

const text = (value: unknown): string | null => {
  if (Array.isArray(value)) return value.map(text).find(Boolean) ?? null;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return decodeEntities(value).trim() || null;
  if (isData(value)) return text(value.name) ?? text(value["@value"]);
  return null;
};

const absolute = (value: string | null | undefined, base: string) => {
  if (!value) return null;

  const url = resultify(() => new URL(value.trim(), base));
  if (!url.success || !/^https?:$/.test(url.data.protocol)) return null;

  url.data.hash = "";
  return url.data.toString();
};

const hostOf = (value: string) => {
  const url = resultify(() => new URL(value));
  return url.success ? url.data.hostname.replace(/^www\./, "") : null;
};

/** The same store: equal once `www.` is gone, or one a subdomain of the other. */
export const sameSite = (first: string, second: string) => {
  const [one, other] = [hostOf(first), hostOf(second)];
  if (!one || !other) return false;

  return (
    one === other || one.endsWith(`.${other}`) || other.endsWith(`.${one}`)
  );
};

/** Host and path only, so two spellings of one page compare and hash alike. */
export const comparable = (value: string) => {
  const url = resultify(() => new URL(value));
  if (!url.success) return value;

  return `${url.data.hostname.replace(/^www\./, "")}${url.data.pathname.replace(/\/+$/, "")}`;
};

/** The last step of a URL's path, which a page keeps however its address is spelled. */
const slug = (value: string) => {
  const url = resultify(() => new URL(value));
  if (!url.success) return null;

  return (
    url.data.pathname.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? ""
  );
};

/** Whether two addresses end in the same page: apex or www, locale, a collection prefix. */
export const samePage = (first: string, second: string) =>
  sameSite(first, second) && slug(first) === slug(second);

/**
 * The address to send a shopper to, given the one that answered. A canonical is
 * only a better spelling of that page. A store can point it anywhere (one here
 * points four different products at the same SEO page), and the shopper would land
 * on the wrong product with the wrong price.
 */
export const addressOf = (url: string, canonical: string | null) =>
  canonical && samePage(canonical, url) ? canonical : url;

const NUMBER =
  /\d{1,3}(?:[\s'\u2019\u00a0\u202f]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*/g;

/** `1.299` is 1299 in much of Europe and 1.299 elsewhere. A leading 0 settles it. */
const AMBIGUOUS = /^[1-9]\d{0,2}\.\d{3}$/;

/**
 * schema.org asks for a plain decimal, stores write what they display. Only
 * formats with one reading pass; anything else is null rather than a guess. Two
 * numbers in one cell (`10 - 20`, `2 for 10`, `5.99 / 100g`) is not a price, and
 * stripping what stands between them would glue them into a third.
 */
const amount = (value: unknown) => {
  if (typeof value === "number")
    return Number.isFinite(value) && value >= 0 ? String(value) : null;
  if (typeof value !== "string" || value.trim().startsWith("-")) return null;

  const numbers = value.match(NUMBER) ?? [];
  const [number] = numbers;
  if (numbers.length !== 1 || !number) return null;

  const digits = number.replace(/[^\d.,]/g, "");

  switch (true) {
    case AMBIGUOUS.test(digits):
      return null;
    case /^\d+(?:\.\d+)?$/.test(digits):
      return digits;
    case /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(digits):
      return digits.replaceAll(",", "");
    case /^\d{1,3}(?:\.\d{3})+,\d+$/.test(digits):
    case /^\d{1,3}(?:\.\d{3}){2,}$/.test(digits):
      return digits.replaceAll(".", "").replace(",", ".");
    case /^\d+,\d{1,2}$/.test(digits):
      return digits.replace(",", ".");
    default:
      return null;
  }
};

/** An uppercase ISO 4217 code as stated, or null. A `$` names no currency. */
export const currencyCode = (value: unknown) => {
  const stated = text(value);
  return stated && /^[a-z]{3}$/i.test(stated) ? stated.toUpperCase() : null;
};

const AVAILABILITY: Record<string, Availability> = {
  instock: "in_stock",
  onlineonly: "in_stock",
  limitedavailability: "in_stock",
  outofstock: "out_of_stock",
  oos: "out_of_stock",
  soldout: "out_of_stock",
  discontinued: "out_of_stock",
  preorder: "pre_order",
  presale: "pre_order",
  backorder: "backorder",
};

/** Schema.org URLs, bare names and og spellings. Anything else stays unknown. */
const availabilityOf = (value: unknown): Availability => {
  const stated = text(value);
  if (!stated) return "unknown";

  const name = (stated.split(/[/#:]/).pop() ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  return AVAILABILITY[name] ?? "unknown";
};

const GTIN_KEYS = ["gtin", "gtin13", "gtin12", "gtin14", "gtin8"] as const;

const gtinOf = (node: Data) =>
  GTIN_KEYS.map((key) => text(node[key])).find(Boolean) ?? null;

const OPTION_KEYS = {
  color: "Color",
  size: "Size",
  material: "Material",
  pattern: "Pattern",
} as const;

const optionsOf = (node: Data) =>
  Object.fromEntries(
    Object.entries(OPTION_KEYS).flatMap(([key, label]) => {
      const value = text(node[key]);
      return value ? [[label, value]] : [];
    }),
  );

const imagesOf = (value: unknown, scope: Scope) => [
  ...new Set(
    many(value, scope).flatMap((entry) => {
      const source = isData(entry)
        ? (text(entry.url) ?? text(entry.contentUrl))
        : text(entry);
      const image = absolute(source, scope.base);
      return image ? [image] : [];
    }),
  ),
];

const kinds = (node: Data) =>
  list(node["@type"]).flatMap((kind) =>
    typeof kind === "string"
      ? [(kind.split(/[/#:]/).pop() ?? "").toLowerCase()]
      : [],
  );

const isKind = (node: Data, ...names: string[]) =>
  kinds(node).some((kind) => names.includes(kind));

const isProduct = (node: Data) =>
  isKind(node, "product", "productgroup", "individualproduct", "someproducts");

const BLANK_OFFER: Offer = {
  url: null,
  sku: null,
  gtin: null,
  mpn: null,
  options: {},
  price: null,
  compareAtPrice: null,
  currency: null,
  availability: "unknown",
  image: null,
  from: false,
};

const exactOffer = (offer: Data, scope: Scope): Offer => {
  const item = follow(offer.itemOffered, scope.graph);
  const sources = isData(item) ? [offer, item] : [offer];

  const specifications = records(offer.priceSpecification, scope);
  const isRegular = (specification: Data) =>
    /listprice|strikethrough|msrp|srp/i.test(
      text(specification.priceType) ?? "",
    );
  const current = specifications.find(
    (specification) => !isRegular(specification),
  );
  const regular = specifications.find(isRegular);

  const price = amount(offer.price) ?? amount(current?.price);
  const before = amount(regular?.price);

  return {
    ...BLANK_OFFER,
    url: absolute(text(offer.url), scope.base),
    sku: sources.map((source) => text(source.sku)).find(Boolean) ?? null,
    gtin: sources.map(gtinOf).find(Boolean) ?? null,
    mpn: sources.map((source) => text(source.mpn)).find(Boolean) ?? null,
    price,
    compareAtPrice:
      price && before && Number(before) > Number(price) ? before : null,
    currency:
      currencyCode(offer.priceCurrency) ??
      currencyCode(current?.priceCurrency) ??
      currencyCode(regular?.priceCurrency),
    availability: availabilityOf(offer.availability),
    image: imagesOf(offer.image, scope)[0] ?? null,
  };
};

const rangeOffer = (offer: Data): Offer => {
  const low = amount(offer.lowPrice) ?? amount(offer.price);
  const high = amount(offer.highPrice);

  return {
    ...BLANK_OFFER,
    price: low,
    currency: currencyCode(offer.priceCurrency),
    availability: availabilityOf(offer.availability),
    // A range of one price, or of one offer, is that price.
    from:
      Number(offer.offerCount) !== 1 &&
      !(low && high && Number(low) === Number(high)),
  };
};

const CONDITION: Record<string, Condition> = {
  newcondition: "new",
  usedcondition: "used",
  damagedcondition: "used",
  refurbishedcondition: "refurbished",
  new: "new",
  used: "used",
  refurbished: "refurbished",
};

const conditionNamed = (value: unknown) => {
  const stated = text(value);
  return stated
    ? (CONDITION[(stated.split(/[/#:]/).pop() ?? "").toLowerCase()] ?? null)
    : null;
};

/** Every condition stated on the product, its offers and its variants. */
const conditionsIn = (node: Data, scope: Scope): Condition[] => [
  ...list(node.itemCondition).flatMap((value) => {
    const condition = conditionNamed(value);
    return condition ? [condition] : [];
  }),
  ...records(node.offers, scope).flatMap((offer) => conditionsIn(offer, scope)),
  ...records(node.hasVariant, scope).flatMap((variant) =>
    conditionsIn(variant, scope),
  ),
];

/** A page offering one used item among new ones cannot go out claiming new. */
const worst = (conditions: Condition[]) =>
  conditions.find((condition) => condition !== "new") ?? conditions[0] ?? null;

const offersOf = (node: Data, scope: Scope): Offer[] =>
  records(node.offers, scope).flatMap((offer) => {
    if (!isKind(offer, "aggregateoffer")) return [exactOffer(offer, scope)];

    const nested = offersOf(offer, scope);
    return nested.length > 0 ? nested : [rangeOffer(offer)];
  });

/**
 * A product's offers with the product's own identifiers filled in. Those fill
 * only a lone offer: a product-level SKU says nothing about which of many
 * offers it belongs to.
 */
const offeredBy = (node: Data, scope: Scope) => {
  const stated = offersOf(node, scope);
  const lone = stated.length === 1;

  return stated.map((offer) => ({
    ...offer,
    url: offer.url ?? absolute(text(node.url), scope.base),
    sku: offer.sku ?? (lone ? text(node.sku) : null),
    gtin: offer.gtin ?? (lone ? gtinOf(node) : null),
    mpn: offer.mpn ?? (lone ? text(node.mpn) : null),
    options: optionsOf(node),
    image: offer.image ?? imagesOf(node.image, scope)[0] ?? null,
  }));
};

/** Each `hasVariant` entry as offers; one with no offer still carries identifiers. */
const variantOffers = (node: Data, scope: Scope) =>
  records(node.hasVariant, scope).flatMap((variant) => {
    const stated = offeredBy(variant, scope);
    if (stated.length > 0) return stated;

    return [
      {
        ...BLANK_OFFER,
        url: absolute(text(variant.url), scope.base),
        sku: text(variant.sku),
        gtin: gtinOf(variant),
        mpn: text(variant.mpn),
        options: optionsOf(variant),
        image: imagesOf(variant.image, scope)[0] ?? null,
      },
    ];
  });

const distinct = (offers: Offer[]) => [
  ...new Map(offers.map((offer) => [JSON.stringify(offer), offer])).values(),
];

const describe = (
  node: Data,
  source: Facts["source"],
  scope: Scope,
): Facts | null => {
  const title = text(node.name);
  if (!title) return null;

  const children = variantOffers(node, scope);
  const own = offeredBy(node, scope);
  const stated = (() => {
    switch (true) {
      case children.some((offer) => offer.price !== null):
        return children;
      case own.length > 0:
        return own;
      default:
        return children;
    }
  })();

  // AggregateOffer's low price is only worth carrying when nothing exact exists.
  const offers = distinct(
    stated.some((offer) => !offer.from)
      ? stated.filter((offer) => !offer.from)
      : stated,
  );

  const range = offers.find((offer) => offer.from);

  return {
    source,
    title,
    description: text(node.description),
    brand: text(many(node.brand, scope)),
    sku: text(node.sku),
    gtin: gtinOf(node),
    mpn: text(node.mpn),
    productType: (() => {
      const category = text(node.category);
      return category && !/^https?:/i.test(category) ? category : null;
    })(),
    condition: worst(conditionsIn(node, scope)),
    images: imagesOf(node.image, scope),
    offers,
    notes: range
      ? [
          `"${title}" only states a starting price of ${range.price ?? "an unreadable amount"}, not a price for each variant.`,
        ]
      : [],
  };
};

/**
 * The one product this page is about. Several top-level products mean either a
 * page that sells one and lists others (its own URL picks it), a theme writing
 * one per variant (same name, so they merge), or a listing, which is not ours.
 */
const main = (nodes: Data[], addresses: string[], scope: Scope) => {
  const products = nodes.filter(isProduct);
  const [first] = products;
  if (!first || products.length === 1) return first ?? null;

  const own = products.find((node) => {
    const stated = absolute(text(node.url) ?? text(node["@id"]), scope.base);
    return stated !== null && addresses.includes(comparable(stated));
  });
  if (own) return own;

  const group = products.find((node) => isKind(node, "productgroup"));
  if (group) return group;

  const names = new Set(products.map((node) => text(node.name)));
  return names.size === 1 ? { ...first, hasVariant: products } : null;
};

/** Appended in place: copying per node would make a large page quadratic. */
const collect = (node: Tree, gathered: Element[] = []) => {
  if ("tagName" in node) gathered.push(node);
  if ("childNodes" in node)
    for (const child of node.childNodes) collect(child, gathered);

  return gathered;
};

const attribute = (element: Element, name: string) =>
  element.attrs.find((entry) => entry.name === name)?.value ?? null;

const textOf = (element: Element): string =>
  element.childNodes
    .map((child) => {
      if ("tagName" in child) return textOf(child);
      return "value" in child ? child.value : "";
    })
    .join("");

const squeezed = (element: Element) =>
  textOf(element).replace(/\s+/g, " ").trim();

/** Tolerates what themes really emit: comments, CDATA, raw newlines, trailing commas. */
const decode = (raw: string): unknown => {
  const stripped = raw
    .replace(/^\s*(?:<!--|(?:\/\/\s*)?<!\[CDATA\[)/, "")
    .replace(/(?:-->|(?:\/\/\s*)?\]\]>)\s*$/, "")
    .trim();

  const strict = resultify(() => JSON.parse(stripped) as unknown);
  if (strict.success) return strict.data;

  const lenient = resultify(
    () =>
      JSON.parse(
        stripped.replace(/[\n\r\t]+/g, " ").replace(/,\s*([}\]])/g, "$1"),
      ) as unknown,
  );
  return lenient.success ? lenient.data : null;
};

/** Top-level nodes, without entering ItemList or related products on purpose. */
const flatten = (value: unknown): Data[] => {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (!isData(value)) return [];

  return [
    value,
    ...flatten(value["@graph"]),
    ...flatten(value.mainEntity),
    ...flatten(value.mainEntityOfPage),
  ];
};

const literal = (element: Element) => {
  const content = attribute(element, "content");
  if (content !== null) return content;

  switch (element.tagName) {
    case "a":
    case "area":
    case "link":
      return attribute(element, "href");
    case "img":
    case "source":
    case "video":
      return attribute(element, "src") ?? attribute(element, "data-src");
    case "data":
    case "meter":
      return attribute(element, "value");
    case "time":
      return attribute(element, "datetime") ?? squeezed(element);
    default:
      return squeezed(element);
  }
};

const properties = (element: Element): [string, unknown][] =>
  element.childNodes.flatMap((child) => {
    if (!("tagName" in child)) return [];

    const names = attribute(child, "itemprop")?.trim().split(/\s+/) ?? [];
    const isItem = attribute(child, "itemscope") !== null;
    const own = names.map((name): [string, unknown] => [
      name,
      isItem ? item(child) : literal(child),
    ]);

    return isItem ? own : [...own, ...properties(child)];
  });

/** A microdata item in JSON-LD's shape, so one reader covers both. */
const item = (element: Element): Data => {
  const entries = properties(element);
  const names = [...new Set(entries.map(([name]) => name))];

  return {
    "@type": attribute(element, "itemtype")?.trim().split(/\s+/)[0] ?? null,
    ...Object.fromEntries(
      names.map((name) => {
        const values = entries
          .filter(([candidate]) => candidate === name)
          .map(([, value]) => value);
        return [name, values.length === 1 ? values[0] : values];
      }),
    ),
  };
};

const fromMeta = (
  meta: (...names: string[]) => string[],
  titled: string | null,
  scope: Scope,
): Facts | null => {
  const price = amount(
    meta(
      "product:price:amount",
      "og:price:amount",
      "product:sale_price:amount",
    )[0],
  );
  // `product.group` is what a category page declares itself as: not one product.
  const declared = /^(?:og:)?product(?:\.item)?$/i.test(
    meta("og:type")[0] ?? "",
  );
  if (!declared && price === null) return null;

  const title = text(meta("og:title", "twitter:title")[0]) ?? titled;
  if (!title) return null;

  const images = imagesOf(meta("og:image:secure_url", "og:image"), scope);

  return {
    source: "meta",
    title,
    description: text(meta("og:description", "description")[0]),
    brand: text(meta("product:brand", "og:brand")[0]),
    sku: text(meta("product:retailer_item_id")[0]),
    gtin: null,
    mpn: null,
    productType: null,
    condition: conditionNamed(meta("product:condition", "og:condition")[0]),
    images,
    offers: [
      {
        ...BLANK_OFFER,
        url: scope.base,
        sku: text(meta("product:retailer_item_id")[0]),
        price,
        currency: currencyCode(
          meta("product:price:currency", "og:price:currency")[0],
        ),
        availability: availabilityOf(
          meta("product:availability", "og:availability")[0],
        ),
      },
    ],
    notes: [],
  };
};

/** Earlier sources win field by field; offers come whole from the first that prices. */
const merge = (sources: Facts[]): Facts | null => {
  const [first] = sources;
  if (!first) return null;

  const pick = (field: "description" | "brand" | "sku" | "gtin" | "mpn") =>
    sources.map((source) => source[field]).find(Boolean) ?? null;

  const priced = sources.find((source) =>
    source.offers.some((offer) => offer.price !== null),
  );

  return {
    ...first,
    description: pick("description"),
    brand: pick("brand"),
    sku: pick("sku"),
    gtin: pick("gtin"),
    mpn: pick("mpn"),
    productType:
      sources.map((source) => source.productType).find(Boolean) ?? null,
    condition: worst(sources.flatMap(({ condition }) => condition ?? [])),
    images: sources.find((source) => source.images.length > 0)?.images ?? [],
    offers: (priced ?? first).offers,
    notes: (priced ?? first).notes,
  };
};

const TRACKING = /^(?:_gl|_ga|gclid|fbclid|utm_.+)$/i;

/** The policy page itself, without the campaign that happened to link to it. */
const untracked = (href: string) => {
  const url = new URL(href);
  for (const name of [...url.searchParams.keys()])
    if (TRACKING.test(name)) url.searchParams.delete(name);

  return url.toString();
};

const POLICY = /\b(?:returns?|refunds?)\b/i;
const CLOSED = /\/(?:account|login|cart|checkout|customer)s?(?:\/|$)/i;
/** A product called "no-return bag" or a blog post about returns is not the policy. */
const NOT_POLICY = /\/(?:products?|collections?|shop|p|blogs?|news)\//i;

const policies = (anchors: { href: string; label: string }[], base: string) => {
  const found = anchors.filter(({ href, label }) => {
    if (!sameSite(href, base)) return false;

    const path = new URL(href).pathname.replace(/[_+]/g, "-");
    if (CLOSED.test(path) || NOT_POLICY.test(path)) return false;
    if (/^return to\b/i.test(label)) return false;

    return POLICY.test(path) || POLICY.test(label);
  });

  const isPolicy = ({ href, label }: { href: string; label: string }) =>
    /polic|refund/i.test(`${href} ${label}`);

  return [
    ...new Set(
      [
        ...found.filter(isPolicy),
        ...found.filter((link) => !isPolicy(link)),
      ].map(({ href }) => untracked(href)),
    ),
  ];
};

const scan = (html: string, url: string): Parsed => {
  const elements = collect(parse(html));

  const tags = elements.flatMap((element) => {
    if (element.tagName !== "meta") return [];

    const name = attribute(element, "property") ?? attribute(element, "name");
    const content = attribute(element, "content")?.trim();
    return name && content ? [{ name: name.toLowerCase(), content }] : [];
  });
  const meta = (...names: string[]) =>
    names.flatMap((name) =>
      tags
        .filter((tag) => tag.name === name)
        .map(({ content }) => decodeEntities(content)),
    );

  const structured = elements
    .filter(
      (element) =>
        element.tagName === "script" &&
        /ld\+json/i.test(attribute(element, "type") ?? ""),
    )
    .flatMap((element) => flatten(decode(textOf(element))));

  const micro = elements
    .filter(
      (element) =>
        attribute(element, "itemscope") !== null &&
        attribute(element, "itemprop") === null,
    )
    .flatMap((element) => flatten(item(element)));

  const nodes = [...structured, ...micro];

  const scope: Scope = {
    base: url,
    graph: new Map(
      nodes.flatMap((node) =>
        typeof node["@id"] === "string" ? [[node["@id"], node]] : [],
      ),
    ),
  };

  const canonical = (() => {
    const link = elements.find(
      (element) =>
        element.tagName === "link" &&
        /\bcanonical\b/i.test(attribute(element, "rel") ?? ""),
    );
    return link ? absolute(attribute(link, "href"), url) : null;
  })();

  const addresses = [url, ...(canonical ? [canonical] : [])].map(comparable);

  const read = (from: Data[], source: Facts["source"]) => {
    const node = main(from, addresses, scope);
    return node ? describe(node, source, scope) : null;
  };

  const anchors = elements.flatMap((element) => {
    if (element.tagName !== "a") return [];

    const href = absolute(attribute(element, "href"), url);
    return href ? [{ href, label: squeezed(element) }] : [];
  });

  const titled = (() => {
    const title = elements.find((element) => element.tagName === "title");
    return title ? text(textOf(title)) : null;
  })();

  return {
    product: merge(
      [
        read(structured, "json-ld"),
        read(micro, "microdata"),
        fromMeta(meta, titled, scope),
      ].filter((facts) => facts !== null),
    ),
    name:
      text(meta("og:site_name")[0]) ??
      text(nodes.find((node) => isKind(node, "website"))?.name) ??
      text(
        nodes.find((node) =>
          isKind(
            node,
            "organization",
            "corporation",
            "onlinestore",
            "store",
            "localbusiness",
          ),
        )?.name,
      ),
    canonical,
    returnPolicies: policies(anchors, url),
    links: [
      ...new Set(
        anchors.map(({ href }) => href).filter((href) => sameSite(href, url)),
      ),
    ],
  };
};

export const parsePage = (html: string, url: string): Parsed => {
  const parsed = resultify(() => scan(html, url));
  return parsed.success ? parsed.data : EMPTY;
};
