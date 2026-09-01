import { and, eq, inArray, isNotNull, max, or, sql } from "drizzle-orm";
import { getDomainLogo } from "@/lib/logo";
import { isPlanKey, type PlanKey } from "@/server/utils/stripe";
import { db, schema } from "../../database";
import { streamable } from "../../utils/ai";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import { repository, resultifyRead } from "../../utils/repository";
import type { Offer } from "../../utils/serp";
import * as Serp from "../../utils/serp";
import * as Competitor from "../competitor";
import * as Product from "../product";
import {
  cachedLookup,
  cacheLookup,
  consumeBudget,
  consumeTrialLookup,
  fingerprint,
} from "./offer-budget";

/**
 * Resolving one product's competing offers — the shared core.
 *
 * Deliberately NOT `"use server"`. Three callers need it — the per-product
 * action and the streaming discovery in `offers.ts`, and the scheduled refresh
 * in `cron.ts`, which is authorized by the cron bearer and holds no session.
 * Putting the core in a `"use server"` module would make the cron entry point a
 * second, unauthenticated door onto the same paid operation — the concern
 * `cron.ts` states in its own header.
 *
 * Ownership and entitlement are therefore the CALLER's responsibility: this
 * function trusts the `userId` / `storeId` it is given, and `trial` decides
 * which allowance the spend is booked against.
 */

const offers = repository(schema.competitorOffer);
const usage = repository(schema.offerUsage);

// ---------------------------------------------------------------------------
// Relevance guard
// ---------------------------------------------------------------------------

/**
 * Google clusters the catalog, so there is no entity-resolution subsystem here
 * — but a free-text search can still resolve to the wrong cluster, and a wrong
 * competitor is worse than none: it is a confident, measured-looking comparison
 * against an unrelated product.
 *
 * Deterministic and free. A guard that cost a model call per offer would cost
 * more than the lookup it guards.
 */

/**
 * The band `judge.ts:104` has always asserted to the detection model ("within
 * ±40% of its price") and that nothing could enforce, because until
 * `priceAmount` there was no numeric price on either side to compare.
 */
const PRICE_BAND = 0.4;

/** Low on purpose: this rejects the unrelated, not the imperfectly worded. */
const TOKEN_OVERLAP = 0.25;

const significantTokens = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );

const amount = (value: string | null) => {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

export type Rejection = "price-band" | "unrelated";

export const assess = (
  offer: Offer,
  product: { title: string; price: string | null },
): Rejection | null => {
  const ours = amount(product.price);

  if (ours !== null && ours > 0 && offer.price !== null) {
    const ratio = offer.price / ours;
    if (ratio < 1 - PRICE_BAND || ratio > 1 + PRICE_BAND) return "price-band";
  }

  // An offer with no title cannot be checked for relatedness; the price band is
  // the only guard it gets, which is why it is not rejected outright.
  if (!offer.title) return null;

  const ourTokens = significantTokens(product.title);
  if (ourTokens.size === 0) return null;

  const theirTokens = significantTokens(offer.title);
  const shared = [...ourTokens].filter((token) =>
    theirTokens.has(token),
  ).length;

  return shared / ourTokens.size >= TOKEN_OVERLAP ? null : "unrelated";
};

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Why a lookup produced nothing. Carried on a SUCCESSFUL result rather than as
 * an error: none of these are failures, they are states the merchant can act
 * on. Same reasoning as `getCompetitiveVisibility`'s `reason`.
 */
export type Reason =
  | "not-configured"
  | "no-match"
  | "low-relevance"
  | "budget-exhausted";

export type Resolution = {
  productId: string;
  created: number;
  updated: number;
  offers: number;
  rejected: number;
  credits: number;
  cached: boolean;
  reason: Reason | null;
  /**
   * The roster rows this resolution wrote, so a streaming caller can push them
   * to the UI as they land instead of re-reading the table per product. Empty
   * on every outcome that wrote nothing.
   */
  competitors: Competitor.Type[];
};

const empty = (
  productId: string,
  reason: Reason,
  extra: Partial<Resolution> = {},
): Resolution => ({
  productId,
  created: 0,
  updated: 0,
  offers: 0,
  rejected: 0,
  credits: 0,
  cached: false,
  reason,
  competitors: [],
  ...extra,
});

export const resolveOffers = async ({
  userId,
  storeId,
  productId,
  plan,
  trial = false,
}: {
  userId: string;
  storeId: string;
  productId: string;
  plan: PlanKey | null;
  /**
   * Bill against the free lifetime allowance instead of a plan's monthly one.
   * Set by the onboarding path, where the merchant has no billing row yet.
   */
  trial?: boolean;
}) => {
  if (!Serp.serpApi.configured())
    return {
      success: true as const,
      data: empty(productId, "not-configured"),
    };

  const found = await Product.get(Environment.SERVER, productId);
  if (!found.success) return found;

  // Bound to a local so the null check survives into the closures below.
  const product = found.data;
  if (!product || product.storeId !== storeId)
    return {
      success: false as const,
      error: new RequestError("Product not found"),
    };

  const started = Date.now();

  // `product` carries no brand column, so the cache key is title-derived. The
  // provider always receives the raw title; this only affects how widely the
  // key is shared between merchants selling the same item.
  const key = fingerprint(product.title);

  const record = (outcome: string, resolution: Resolution) =>
    usage.create(Environment.SERVER, {
      userId,
      storeId,
      productId,
      provider: Serp.serpApi.name,
      credits: resolution.credits,
      cached: resolution.cached,
      outcome,
      offerCount: resolution.offers,
      milliseconds: Date.now() - started,
    });

  // Cache first, budget second: a cache hit costs nothing, so charging the
  // merchant's allowance for one would meter our storage rather than the
  // vendor's bill.
  const hit = await cachedLookup(key);

  const lookup = await (async () => {
    if (hit) return { success: true as const, data: hit, fresh: false };

    // Keyed on the product and fingerprint so retrying THIS attempt is free
    // while a genuinely new lookup is not. The chain has a real
    // partial-success state, so a bare increment would double-charge.
    const operation = `${storeId}:${productId}:${key}`;

    const budget = trial
      ? await consumeTrialLookup({ store: storeId, operation })
      : await consumeBudget({ store: storeId, plan, operation });
    if (!budget.allowed) return { success: false as const, budget };

    const fetched = await Serp.serpApi.lookup(product.title, {
      country: "us",
    });
    if (!fetched.success)
      return { success: false as const, error: fetched.error };

    await cacheLookup(key, fetched.data);
    return { success: true as const, data: fetched.data, fresh: true };
  })();

  if (!lookup.success) {
    if ("budget" in lookup) {
      const resolution = empty(productId, "budget-exhausted");
      await record("budget-exhausted", resolution);
      return { success: true as const, data: resolution };
    }

    await record("error", empty(productId, "no-match"));
    return { success: false as const, error: lookup.error };
  }

  const credits = lookup.fresh ? lookup.data.credits : 0;
  const cached = !lookup.fresh;

  if (lookup.data.offers.length === 0) {
    const resolution = empty(productId, "no-match", { credits, cached });
    await record("no-match", resolution);
    return { success: true as const, data: resolution };
  }

  const accepted = lookup.data.offers.filter(
    (offer) => offer.sellerDomain !== null && assess(offer, product) === null,
  );
  const rejected = lookup.data.offers.length - accepted.length;

  if (accepted.length === 0) {
    const resolution = empty(productId, "low-relevance", {
      credits,
      cached,
      rejected,
    });
    await record("low-relevance", resolution);
    return { success: true as const, data: resolution };
  }

  // Existing rows for this product, so a refresh updates prices in place rather
  // than growing a duplicate roster on every cron tick.
  const existing = await Competitor.find(Environment.SERVER, {
    where: and(
      eq(schema.competitor.storeId, storeId),
      eq(schema.competitor.productId, productId),
    ),
  });
  if (!existing.success) return existing;

  const bySeller = new Map(
    existing.data
      .filter((row) => row.sellerDomain !== null)
      .map((row) => [row.sellerDomain as string, row]),
  );

  const measuredAt = new Date();

  const written = await Promise.all(
    accepted.map(async (offer) => {
      const domain = offer.sellerDomain as string;

      // Both price representations are written here and nowhere else, so they
      // cannot drift: `priceAmount` is authoritative, `price` is its display
      // form for the existing UI.
      const price = offer.price === null ? null : String(offer.price);

      const fields = {
        title: offer.title ?? lookup.data.matched?.title ?? product.title,
        brand: lookup.data.matched?.brand ?? null,
        price,
        priceAmount: price,
        currency: offer.currency,
        image: offer.image ?? getDomainLogo(domain),
        url: offer.url,
        source: offer.seller,
        sellerDomain: domain,
        measuredAt,
        confidence: "measured" as const,
      };

      const previous = bySeller.get(domain);

      const row = previous
        ? await Competitor.update(Environment.SERVER, previous.id, {
            ...fields,
            updatedAt: measuredAt,
          })
        : await Competitor.create(Environment.SERVER, {
            ...fields,
            userId,
            storeId,
            productId,
            selected: true,
          });

      if (row.success)
        await offers.create(Environment.SERVER, {
          userId,
          storeId,
          productId,
          competitorId: row.data?.id ?? null,
          sellerDomain: domain,
          seller: offer.seller,
          title: offer.title,
          priceAmount: price,
          currency: offer.currency,
          shipping: offer.shipping === null ? null : String(offer.shipping),
          total: offer.total === null ? null : String(offer.total),
          offerUrl: offer.url,
          imageUrl: offer.image,
          rating: offer.rating === null ? null : String(offer.rating),
          reviews: offer.reviews,
          position: offer.position,
          provider: Serp.serpApi.name,
          measuredAt,
        });

      return {
        created: !previous,
        ok: row.success,
        competitor: row.success ? row.data : null,
      };
    }),
  );

  const resolution: Resolution = {
    productId,
    created: written.filter((entry) => entry.ok && entry.created).length,
    updated: written.filter((entry) => entry.ok && !entry.created).length,
    offers: accepted.length,
    rejected,
    credits,
    cached,
    reason: null,
    competitors: written
      .map((entry) => entry.competitor)
      .filter((competitor) => competitor !== null),
  };

  await record("offers", resolution);

  return { success: true as const, data: resolution };
};

// ---------------------------------------------------------------------------
// Interactive discovery
// ---------------------------------------------------------------------------

/**
 * Streamed back as discovery runs, so the roster fills in per product rather
 * than after the whole catalog. Mirrors `DetectionEvent` — the tabs share a log
 * component and a mental model.
 */
export type DiscoveryEvent =
  | { kind: "status"; message: string }
  | { kind: "competitor"; competitor: Competitor.Type }
  | {
      kind: "product";
      title: string;
      offers: number;
      reason: Reason | null;
    }
  | { kind: "done"; total: number; credits: number; unmatched: number }
  | { kind: "error"; message: string };

/**
 * How many products one interactive run will resolve.
 *
 * The chain is ~2.7s and runs sequentially (the provider meters concurrency by
 * plan, so parallelism buys rate-limit retries rather than speed), which puts a
 * 12-product run near a minute. That is already at the edge of what someone
 * will watch; more than this belongs to the cron.
 */
const INTERACTIVE_LIMIT = 12;

/**
 * Resolves offers for a set of products, streaming each rival as it lands.
 *
 * This is the path the competitor screens call. It is deliberately the same
 * engine the cron uses — a merchant should never see a different competitor set
 * depending on whether a schedule or a button produced it.
 */
export const discoverOffers = ({
  userId,
  storeId,
  productIds,
  plan,
  trial,
}: {
  userId: string;
  storeId: string;
  productIds: string[];
  plan: PlanKey | null;
  trial: boolean;
}) =>
  streamable<DiscoveryEvent>(async (update) => {
    if (!Serp.serpApi.configured()) {
      update({
        kind: "error",
        message: "Offer discovery is not configured on this environment.",
      });
      return;
    }

    const targets = productIds.slice(0, INTERACTIVE_LIMIT);

    const products = await Product.find(Environment.SERVER, {
      where: and(
        eq(schema.product.userId, userId),
        eq(schema.product.storeId, storeId),
        inArray(schema.product.id, targets),
      ),
    });
    if (!products.success) {
      update({ kind: "error", message: "Could not read your catalog." });
      return;
    }

    const summary = { total: 0, credits: 0, unmatched: 0 };

    for (const product of products.data) {
      update({
        kind: "status",
        message: `Looking up who else sells ${product.title}`,
      });

      const resolution = await resolveOffers({
        userId,
        storeId,
        productId: product.id,
        plan,
        trial,
      });

      if (!resolution.success) {
        // One product failing is not the run failing — the merchant still gets
        // the rivals for everything else in their catalog.
        summary.unmatched += 1;
        update({
          kind: "product",
          title: product.title,
          offers: 0,
          reason: null,
        });
        continue;
      }

      summary.credits += resolution.data.credits;
      if (resolution.data.offers === 0) summary.unmatched += 1;

      for (const competitor of resolution.data.competitors) {
        summary.total += 1;
        update({ kind: "competitor", competitor });
      }

      update({
        kind: "product",
        title: product.title,
        offers: resolution.data.offers,
        reason: resolution.data.reason,
      });

      // Nothing further will succeed this period; stop rather than walk the
      // rest of the catalog collecting the same verdict.
      if (resolution.data.reason === "budget-exhausted") break;
    }

    update({ kind: "done", ...summary });
  });

// ---------------------------------------------------------------------------
// Scheduled refresh
// ---------------------------------------------------------------------------

/**
 * Stripe statuses that keep a flat plan's features unlocked. Mirrors
 * `ENTITLED_SUBSCRIPTION_STATUSES` in `utils/entitlement.ts` — the two must
 * agree, or the cron spends on stores the interactive path would refuse.
 */
const ENTITLED_STATUSES = ["active", "trialing", "past_due"];

/**
 * The products most in need of a fresh price, across entitled accounts only.
 *
 * Entitlement is applied HERE, at scheduling time, not only at the point of
 * spend: selecting work for an unentitled store and rejecting it later burns a
 * tick's capacity on nothing and hides real work behind it.
 *
 * Ordered by oldest observation, nulls first, so products never resolved go
 * before products with a merely stale price, and nothing starves behind a large
 * catalog.
 */
const dueProducts = (limit: number) =>
  resultifyRead(() =>
    db
      .select({
        productId: schema.product.id,
        storeId: schema.product.storeId,
        userId: schema.product.userId,
        plan: schema.subscription.plan,
        measured: max(schema.competitor.measuredAt),
      })
      .from(schema.product)
      .innerJoin(
        schema.subscription,
        eq(schema.subscription.userId, schema.product.userId),
      )
      .leftJoin(
        schema.competitor,
        eq(schema.competitor.productId, schema.product.id),
      )
      .where(
        and(
          eq(schema.product.status, "active"),
          or(
            and(
              eq(schema.subscription.billingMode, "payg"),
              eq(schema.subscription.status, "active"),
            ),
            and(
              eq(schema.subscription.billingMode, "subscription"),
              isNotNull(schema.subscription.plan),
              inArray(schema.subscription.status, ENTITLED_STATUSES),
            ),
          ),
        ),
      )
      .groupBy(
        schema.product.id,
        schema.product.storeId,
        schema.product.userId,
        schema.subscription.plan,
      )
      .orderBy(sql`max(${schema.competitor.measuredAt}) asc nulls first`)
      .limit(limit),
  );

export type RefreshSummary = {
  considered: number;
  resolved: number;
  credits: number;
  cached: number;
  failed: number;
};

/**
 * One tick of the scheduled refresh.
 *
 * Sequential rather than parallel: every call spends money and the provider
 * meters concurrency by plan, so a burst buys nothing but rate-limit retries.
 * The per-tick `limit` is the throttle — raise the schedule frequency rather
 * than the batch size.
 */
export const refreshDueOffers = async ({
  limit = 25,
}: {
  limit?: number;
} = {}) => {
  const due = await dueProducts(limit);
  if (!due.success) return due;

  const summary: RefreshSummary = {
    considered: due.data.length,
    resolved: 0,
    credits: 0,
    cached: 0,
    failed: 0,
  };

  for (const entry of due.data) {
    const plan = entry.plan ?? "";
    const resolution = await resolveOffers({
      userId: entry.userId,
      storeId: entry.storeId,
      productId: entry.productId,
      plan: isPlanKey(plan) ? plan : null,
    });

    if (!resolution.success) {
      summary.failed += 1;
      continue;
    }

    summary.credits += resolution.data.credits;
    if (resolution.data.cached) summary.cached += 1;
    if (resolution.data.offers > 0) summary.resolved += 1;

    // A store out of allowance returns the same verdict for every remaining
    // product this month; stop the tick rather than walk its whole catalog to
    // learn that repeatedly.
    if (resolution.data.reason === "budget-exhausted") break;
  }

  return { success: true as const, data: summary };
};
