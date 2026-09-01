/**
 * Phase 0 — measures whether product-level competitor discovery is viable at all.
 *
 * Seller-list endpoints answer one question: "who else resells this exact
 * catalog item". For a merchant selling a private-label candle or a handmade
 * bag the honest answer is nobody, and no amount of spend changes that. Every
 * cost model for this feature assumed a 100% hit rate; this script measures the
 * real one before we build on the assumption.
 *
 * Read-only. Issues SELECTs against `product` and nothing else — no writes, no
 * DDL — which matters because a local `.env.local` in this repo points at
 * PRODUCTION.
 *
 * Usage:
 *   SERPAPI_API_KEY='<key>' DATABASE_URL='<url>' \
 *     bun run scripts/measure-offer-coverage.ts --limit 100
 *
 *   --limit <n>    products to sample (default 100)
 *   --store <id>   restrict to one store
 *   --dry          list what would be queried, spend nothing
 *
 * SerpApi's free tier is 250 searches and each product costs 2, so a 100-product
 * run fits inside it with room to repeat once.
 */
import postgres from "postgres";
import { serpApi } from "../src/server/utils/serp";

const argument = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
};

const flag = (name: string) => process.argv.includes(`--${name}`);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const dry = flag("dry");

if (!dry && !serpApi.configured()) {
  console.error("SERPAPI_API_KEY is required (or pass --dry)");
  process.exit(1);
}

const limit = Number(argument("limit") ?? 100);
const store = argument("store");

/** SerpApi Infrastructure tier: $13.75 per 1,000 searches. */
const COST_PER_SEARCH_USD = 0.01375;

const sql = postgres(url, { max: 1 });

type Row = {
  id: string;
  title: string;
  price: string | null;
  currency: string | null;
  storeId: string;
};

const products = store
  ? await sql<Row[]>`
      select id, title, price, currency, "storeId"
      from product
      where "storeId" = ${store} and status = 'active'
      order by random() limit ${limit}
    `
  : await sql<Row[]>`
      select id, title, price, currency, "storeId"
      from product
      where status = 'active'
      order by random() limit ${limit}
    `;

await sql.end();

if (products.length === 0) {
  console.error("No products matched — nothing to measure.");
  process.exit(1);
}

/**
 * A crude proxy for "is this resold elsewhere at all". A title that leads with a
 * recognizable brand token is far likelier to have a Google catalog cluster than
 * one that reads like a craft listing. Not precise — it exists so the final
 * report can separate the two populations, because a blended hit rate hides
 * exactly the thing we are trying to learn.
 */
const looksBranded = (title: string) => {
  const tokens = title.trim().split(/\s+/);
  if (tokens.length === 0) return false;
  const leading = tokens[0] ?? "";
  return (
    /^[A-Z]/.test(leading) &&
    leading.length > 2 &&
    // Model numbers and SKU-ish tokens are a strong catalog signal.
    (tokens.some((token) => /\d/.test(token) && token.length >= 3) ||
      /^[A-Z][a-zA-Z]+$/.test(leading))
  );
};

console.log(
  `Sampling ${products.length} products${store ? ` from store ${store}` : ""}.`,
);

if (dry) {
  for (const product of products)
    console.log(
      `  ${looksBranded(product.title) ? "B" : "·"}  ${product.title}`,
    );
  console.log(
    `\nDry run. A real run would spend up to ${products.length * 2} searches ` +
      `(~$${(products.length * 2 * COST_PER_SEARCH_USD).toFixed(2)}).`,
  );
  process.exit(0);
}

type Outcome = {
  title: string;
  branded: boolean;
  offers: number;
  distinctSellers: number;
  withPrice: number;
  credits: number;
  milliseconds: number;
  error: string | null;
};

const outcomes: Outcome[] = [];

for (const [index, product] of products.entries()) {
  const started = Date.now();
  const lookup = await serpApi.lookup(product.title, { country: "us" });
  const milliseconds = Date.now() - started;

  const outcome: Outcome = lookup.success
    ? {
        title: product.title,
        branded: looksBranded(product.title),
        offers: lookup.data.offers.length,
        distinctSellers: new Set(
          lookup.data.offers
            .map((offer) => offer.sellerDomain)
            .filter((domain): domain is string => Boolean(domain)),
        ).size,
        withPrice: lookup.data.offers.filter((offer) => offer.price !== null)
          .length,
        credits: lookup.data.credits,
        milliseconds,
        error: null,
      }
    : {
        title: product.title,
        branded: looksBranded(product.title),
        offers: 0,
        distinctSellers: 0,
        withPrice: 0,
        // A failed chain still bills for whatever legs completed; assume the
        // seed search landed, so the cost estimate stays honest rather than
        // flattering.
        credits: 1,
        milliseconds,
        error: lookup.error.message,
      };

  outcomes.push(outcome);

  console.log(
    `[${index + 1}/${products.length}] ${outcome.offers} offers ` +
      `(${outcome.distinctSellers} sellers, ${milliseconds}ms)  ${product.title.slice(0, 60)}` +
      (outcome.error ? `  — ${outcome.error}` : ""),
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const percentage = (part: number, whole: number) =>
  whole === 0 ? "0%" : `${Math.round((part / whole) * 100)}%`;

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2)
    : (sorted[middle] ?? 0);
};

const summarize = (label: string, set: Outcome[]) => {
  if (set.length === 0) return;

  // Two or more sellers is the bar that matters. One seller is usually the
  // merchant's own listing echoed back, which teaches the judge nothing.
  const useful = set.filter((outcome) => outcome.distinctSellers >= 2);
  const any = set.filter((outcome) => outcome.offers > 0);

  console.log(`\n${label}  (n=${set.length})`);
  console.log(`  any offer at all    ${percentage(any.length, set.length)}`);
  console.log(
    `  2+ distinct sellers ${percentage(useful.length, set.length)}   <- the number that decides this`,
  );
  console.log(
    `  median sellers/hit  ${median(useful.map((outcome) => outcome.distinctSellers))}`,
  );
  console.log(
    `  offers with a price ${percentage(
      set.reduce((sum, outcome) => sum + outcome.withPrice, 0),
      set.reduce((sum, outcome) => sum + outcome.offers, 0),
    )}`,
  );
};

const credits = outcomes.reduce((sum, outcome) => sum + outcome.credits, 0);
const failed = outcomes.filter((outcome) => outcome.error !== null);

console.log(`\n${"=".repeat(64)}`);
summarize("ALL", outcomes);
summarize(
  "Branded-looking",
  outcomes.filter((outcome) => outcome.branded),
);
summarize(
  "Private-label-looking",
  outcomes.filter((outcome) => !outcome.branded),
);

console.log(
  `\nLatency   median ${median(outcomes.map((o) => o.milliseconds))}ms`,
);
console.log(
  `Spend     ${credits} searches ≈ $${(credits * COST_PER_SEARCH_USD).toFixed(2)} ` +
    `(≈ $${((credits / outcomes.length) * COST_PER_SEARCH_USD).toFixed(4)}/product)`,
);
if (failed.length > 0)
  console.log(`Errors    ${failed.length}/${outcomes.length}`);

const misses = outcomes.filter((outcome) => outcome.distinctSellers < 2);
if (misses.length > 0) {
  console.log(
    `\nMisses (${misses.length}) — read these, the pattern is the finding:`,
  );
  for (const miss of misses.slice(0, 15))
    console.log(`  ${miss.title.slice(0, 72)}`);
}

console.log(
  "\nGate: if 2+ distinct sellers is near zero for private-label-looking products,\n" +
    "this is a feature for resellers and the UI must say so.",
);
