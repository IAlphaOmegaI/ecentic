/**
 * The shapes the public agent storefront (`/agents`) passes between its steps:
 * read → prepare → channels. Pure, no server imports, so client components can
 * `import type` it and specs can run it anywhere.
 *
 * Hard rule this file exists to make enforceable: price, currency, availability,
 * GTIN/MPN and stock only ever come from the store's own pages or our importers.
 * Anything ecentic fills in travels as a {@link Fix}, labelled and shown before
 * and after.
 */

export const MAX_PRODUCTS = 40;
export const MAX_VARIANTS = 20;

export type Platform = "shopify" | "woocommerce" | "other";

/** Where a product was read from. `page` covers JSON-LD/meta on a raw page. */
export type Origin = "shopify" | "woocommerce" | "page" | "importer";

export type Availability =
  | "in_stock"
  | "out_of_stock"
  | "pre_order"
  | "backorder"
  | "unknown";

export type Condition = "new" | "used" | "refurbished";

export type Variant = {
  /** Stable and unique across the store: platform variant id, else SKU, else a URL hash. */
  id: string;
  /** Option values by option name, `{ Color: "Black", Size: "10" }`. Empty for a single-variant product. */
  options: Record<string, string>;
  /** Decimal amount exactly as the store states it, `"79.99"`. Never computed. */
  price: string | null;
  /** The pre-discount price when the store states one. */
  compareAtPrice: string | null;
  availability: Availability;
  sku: string | null;
  /** Raw barcode as read, valid GTIN or not. */
  barcode: string | null;
  image: string | null;
};

export type Product = {
  /** Stable within the store: platform product id, else a URL hash. */
  id: string;
  origin: Origin;
  url: string | null;
  title: string;
  /** Plain or HTML, as read. `prepare` cleans it and records the fix. */
  description: string | null;
  /** Uppercase ISO 4217 as the store states it. Never defaulted. */
  currency: string | null;
  brand: string | null;
  mpn: string | null;
  productType: string | null;
  /** Only when the store's structured data states one. Absent says nothing. */
  condition?: Condition | null;
  images: string[];
  /** At least one. Capped at {@link MAX_VARIANTS}; `read` logs what it dropped. */
  variants: Variant[];
};

export type Store = {
  origin: string;
  host: string;
  /** The store's own name (Shopify meta, og:site_name, WebSite JSON-LD), else null. */
  name: string | null;
  platform: Platform;
  /** A real return-policy URL found on the store, else null. Never guessed. */
  returnPolicy: string | null;
};

export type Catalog = {
  store: Store;
  products: Product[];
  /** Product URLs found before the {@link MAX_PRODUCTS} cap. */
  discovered: number;
  /** Plain-English caveats shown to the merchant (capped variants, unread pages). */
  notes: string[];
};

export type FixKind =
  /** ecentic filled a value the store never stated (brand from site name, condition=new). */
  | "inferred"
  /** The model reworded existing copy. */
  | "rewritten"
  /** Mechanical cleanup: HTML stripped, whitespace collapsed, relative URL absolutised. */
  | "cleaned";

export type Fix = {
  product: string;
  field: string;
  before: string | null;
  after: string;
  kind: FixKind;
  reason: string;
};

export type Channel = "google" | "chatgpt";

export type Finding = {
  channel: Channel;
  field: string;
  code: string;
  message: string;
  /** `error` keeps the item out of the feed; `warning` ships with it. */
  severity: "error" | "warning";
};

export type PolicyFlag = {
  /** The policy's own category wording, e.g. "age-restricted products (alcohol)". */
  category: string;
  reason: string;
};

/** One product after fixes, with both channels' verdicts. */
export type Prepared = {
  /** The product as it will be emitted, fixes applied. */
  product: Product;
  /** Exactly as read, for before/after. */
  original: Product;
  fixes: Fix[];
  /** Findings left after fixes. Errors here are the merchant's to resolve. */
  findings: Finding[];
  /** Set when OpenAI's prohibited-products policy matches. Not ready for ChatGPT. */
  policy: PolicyFlag | null;
  /** False when the policy check could not run; the UI says so instead of implying a pass. */
  policyChecked: boolean;
  ready: Record<Channel, boolean>;
};

export type Stage = "reading" | "preparing" | "channels" | "done" | "failed";

/** Google Merchant Center status of one offer on the demo store. */
export type OfferLine = {
  offerId: string;
  title: string;
  /** `accepted` = the insert returned 200. `merged` = the override appeared on `products.get`. */
  status: "pending" | "accepted" | "merged" | "rejected" | "skipped";
  /** The API's response or error, verbatim enough to show on stage. */
  response: string | null;
  mergedTitle: string | null;
  /** `reportingContext: approved|disapproved|pending` per destination. */
  destinations: string[];
  issues: string[];
};

export type Merchant = {
  /** True only when the run's host is the demo store and its account passes every guard. */
  eligible: boolean;
  /** Why not, in plain English, when not eligible. */
  reason: string | null;
  account: string | null;
  lines: OfferLine[];
};

/** Status of the optional OpenAI Ads product-feed upload. Null when it did not run. */
export type Upload = {
  feed: string | null;
  status:
    | "uploading"
    | "received"
    | "processing"
    | "completed"
    | "completed_with_errors"
    | "failed";
  diagnostics: string[];
};

/**
 * What the stage screen and board poll. Small on purpose: `Prepared[]` is stored
 * under its own key and fetched only by the results view and the feed routes.
 */
export type Summary = {
  id: string;
  origin: string;
  host: string;
  name: string | null;
  platform: Platform | null;
  stage: Stage;
  /** Plain-English reason when `stage === "failed"`. */
  error: string | null;
  /** Epoch ms. The stage timer starts here. */
  startedAt: number;
  /** Epoch ms, set when both channels are done. The stage timer stops here. */
  finishedAt: number | null;
  discovered: number;
  read: number;
  issues: number;
  fixes: number;
  /** Findings of any severity left after fixes: the merchant's to resolve. */
  needsMerchant: number;
  google: { ready: number; total: number };
  chatgpt: { ready: number; total: number };
  merchant: Merchant | null;
  upload: Upload | null;
  notes: string[];
  /** Newest last, capped at 40. Live progress lines. */
  log: string[];
};

export type Board = {
  stores: number;
  products: number;
  runs: Summary[];
};
