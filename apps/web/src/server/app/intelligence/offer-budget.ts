import { redis } from "@/server/utils/durable";
import { reportFailOpen } from "@/server/utils/fail-open";
import type { OfferLookup } from "@/server/utils/serp";
import type { PlanKey } from "@/server/utils/stripe";

/**
 * Spend controls for paid competitor-offer lookups.
 *
 * Every other external call in this codebase is either free or bounded by the
 * merchant's own catalog size. This one is metered per request against a
 * third-party bill, so it needs a cache, a budget, and an audit trail — none of
 * which existed before (`scrapellm.ts` types `credits_used` and never persists
 * it).
 *
 * Not `"use server"`: these are sync/async helpers, not actions.
 */

/**
 * Monthly lookups per plan.
 *
 * Sized against the worst case — the interactive rail (2 billable searches at
 * ~$0.01375 each, so ~$0.0275 per lookup) with a cold cache — to keep this
 * feature under roughly a fifth of plan revenue:
 *
 *   compete  ($14.90)   100 x $0.0275 = ~$2.75   ~18%
 *   scale    ($44.90)   400 x $0.0275 = ~$11.00  ~24%
 *   dominate ($149)   1,000 x $0.0275 = ~$27.50  ~18%
 *
 * Real spend should land far below this: the cron refresh is meant to run on
 * the batch adapter at roughly a seventh the unit cost, and the shared cache
 * absorbs catalog overlap between merchants. Raise these once the batch rail is
 * carrying the scheduled load — but raise them against measured spend, not
 * against this comment.
 */
const MONTHLY_LOOKUPS: Record<PlanKey, number> = {
  compete: 100,
  scale: 400,
  dominate: 1000,
};

/** Pay-as-you-go has no plan row, so it gets the entry tier's allowance. */
const PAYG_MONTHLY_LOOKUPS = 100;

export const monthlyAllowance = (plan: PlanKey | null) =>
  plan ? MONTHLY_LOOKUPS[plan] : PAYG_MONTHLY_LOOKUPS;

/**
 * Calendar month, matching how the performance fee is billed. Passed in rather
 * than read from the clock so a caller can attribute a late-running job to the
 * period it belongs to.
 */
const period = (now: Date) =>
  `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

/** Two months, so the previous period stays readable for reconciliation. */
const BUDGET_TTL_SECONDS = 60 * 60 * 24 * 62;

export type BudgetVerdict =
  | { allowed: true; used: number; allowance: number }
  | { allowed: false; used: number; allowance: number };

/**
 * Books one lookup against the store's monthly allowance.
 *
 * `operation` makes this idempotent, and that is not decorative: a lookup is a
 * two-leg chain with a real partial-success state (seed search billed, offer
 * call failed), and the caller retries. A bare INCR would charge the merchant's
 * budget twice for one attempt. The marker is written first and only a first
 * writer proceeds to increment.
 *
 * Fails OPEN on a redis outage, like every other limiter here — a cache being
 * down should not take competitor discovery down with it. The usage ledger in
 * Postgres is the record that survives; this is the fast gate.
 */
export const consumeBudget = async ({
  store,
  plan,
  operation,
  now = new Date(),
}: {
  store: string;
  plan: PlanKey | null;
  operation: string;
  now?: Date;
}): Promise<BudgetVerdict> => {
  const allowance = monthlyAllowance(plan);
  const key = `offers:budget:${store}:${period(now)}`;
  const marker = `offers:op:${operation}`;

  try {
    // NX = only the first caller for this operation id books anything.
    const first = await redis.set(marker, "1", { nx: true, ex: 3600 });
    if (first === null) {
      const used = Number((await redis.get(key)) ?? 0);
      return { allowed: used <= allowance, used, allowance };
    }

    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, BUDGET_TTL_SECONDS);

    return { allowed: used <= allowance, used, allowance };
  } catch (error) {
    reportFailOpen("offers-budget", error);
    return { allowed: true, used: 0, allowance };
  }
};

/**
 * What an account with no active plan may spend, ever.
 *
 * Onboarding is where this feature has to prove it is not guessing: a merchant
 * comparing their listing against a real rival at a real price is the whole
 * pitch, and showing them a model's recollection instead wastes the one moment
 * they are paying attention. So the free tier gets measured competitors too —
 * the same argument that makes the onboarding scan free.
 *
 * A LIFETIME cap rather than a monthly one, unlike {@link MONTHLY_LOOKUPS}:
 * there is no recurring revenue behind a free account to fund a monthly reset,
 * so this is a one-off cost of acquisition (~$0.28 at the interactive rate) and
 * is budgeted as one. Same shape as the anonymous playground cap.
 */
export const TRIAL_LOOKUP_LIMIT = 10;

/** A year: long enough not to be trivially reset, bounded so the keyspace is. */
const TRIAL_TTL_SECONDS = 60 * 60 * 24 * 365;

/**
 * Books one lookup against a free account's lifetime allowance.
 *
 * Keyed on the store rather than the user because the store is what a lookup is
 * attributed to everywhere else in this file, and a merchant with two catalogs
 * is genuinely evaluating the product twice.
 */
export const consumeTrialLookup = async ({
  store,
  operation,
}: {
  store: string;
  operation: string;
}): Promise<BudgetVerdict> => {
  const key = `offers:trial:${store}`;
  const marker = `offers:op:${operation}`;

  try {
    const first = await redis.set(marker, "1", { nx: true, ex: 3600 });
    if (first === null) {
      const used = Number((await redis.get(key)) ?? 0);
      return {
        allowed: used <= TRIAL_LOOKUP_LIMIT,
        used,
        allowance: TRIAL_LOOKUP_LIMIT,
      };
    }

    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, TRIAL_TTL_SECONDS);

    return {
      allowed: used <= TRIAL_LOOKUP_LIMIT,
      used,
      allowance: TRIAL_LOOKUP_LIMIT,
    };
  } catch (error) {
    // Fails open like every other limiter here — but a free account failing
    // open is unmetered spend, so this one is worth watching if Redis is flaky.
    reportFailOpen("offers-trial", error);
    return { allowed: true, used: 0, allowance: TRIAL_LOOKUP_LIMIT };
  }
};

/**
 * Normalized lookup key.
 *
 * The cache is shared across tenants because catalogs overlap heavily — the
 * same SKU sold by many merchants should be looked up once — and that only pays
 * off if the key survives the variation in merchant-authored titles. So:
 * lowercase, strip punctuation, drop packaging filler, and sort the surviving
 * tokens, which makes "Sony WH-1000XM5 Wireless Headphones" and "Headphones,
 * Sony WH1000XM5" the same key.
 *
 * Sorting is safe here precisely because the tokens are a set, not a phrase —
 * the provider gets the original title, never this.
 *
 * Deliberately NOT GTIN-keyed: no offer provider accepts or returns one, so a
 * barcode cache would never be populated. Expect a lower hit rate than a
 * catalog-identifier cache would give, and size the budget for it.
 */
const FILLER = new Set([
  "the",
  "and",
  "for",
  "with",
  "new",
  "pack",
  "set",
  "size",
  "color",
  "colour",
  "free",
  "shipping",
  "official",
  "genuine",
  "original",
]);

export const fingerprint = (title: string, brand?: string | null) => {
  const tokens = `${brand ?? ""} ${title}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !FILLER.has(token));

  // Cap the key so a 300-character marketing title cannot produce a
  // single-use cache entry that never gets hit again.
  return [...new Set(tokens)].sort().slice(0, 12).join("-");
};

/**
 * Prices move, but not hourly. A day is long enough to absorb a cron sweep plus
 * the interactive traffic around it, short enough that a displayed price is
 * never more than a day stale — and the row records `measuredAt` regardless, so
 * staleness is visible rather than implied.
 */
const CACHE_TTL_SECONDS = 60 * 60 * 24;

const cacheKey = (key: string) => `offers:lookup:${key}`;

export const cachedLookup = async (
  key: string,
): Promise<OfferLookup | null> => {
  try {
    return await redis.get<OfferLookup>(cacheKey(key));
  } catch {
    return null;
  }
};

/**
 * Caches the RESULT rather than the provider's `page_token`.
 *
 * Token caching only saves the first of two legs and stakes correctness on an
 * expiry window no vendor documents — a stale token surfaces as an elevated
 * second-leg failure rate, which is exactly the kind of bug that hides. Caching
 * the offers skips both legs and cannot go silently wrong: worst case the data
 * is up to a day old, which `measuredAt` already discloses.
 */
export const cacheLookup = async (key: string, lookup: OfferLookup) => {
  try {
    await redis.set(cacheKey(key), lookup, { ex: CACHE_TTL_SECONDS });
  } catch {
    // A cache that cannot be written is a cost problem, not a correctness one.
  }
};
