"use server";

import { and, eq, inArray } from "drizzle-orm";
import { MEASURED_COMPETITOR_SOURCE } from "@/lib/competitor-source";
import { getDomainLogo } from "@/lib/logo";
import { schema } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import * as Competitor from "../competitor";
import * as GoogleMerchant from "../integration/google-merchant";

/**
 * Competitors sourced from Google's competitive-visibility report.
 *
 * This is the one discovery path in the product that does not ask a model who
 * the rivals are — Google reports the domains it actually served alongside the
 * merchant's own offers. The trade is a unit mismatch: the report answers in
 * domains while `competitor` rows are product-shaped, so rows created here are
 * brand-level, with the measured position in `description` and no price. Every
 * consumer of `competitor.price` already null-guards (the judge's block prints
 * "Price: MISSING", `formatPrice` renders an em dash), so a priceless row
 * degrades rather than breaks.
 */

/** "https://www.wayfair.com/" → "wayfair.com". */
const hostname = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0] ?? "";

/**
 * Two-part public suffixes common enough to meet in Google's report. Without
 * them the registrable label of "example.co.uk" reads as "co", which would name
 * the brand "Co" and make every UK rival collide with every other.
 *
 * Not the full Public Suffix List: that is a large, churning dataset, and the
 * cost of a miss here is a slightly wrong display name, not a broken import.
 */
const COMPOUND_SUFFIXES = new Set([
  "co.uk",
  "com.au",
  "co.nz",
  "co.jp",
  "com.br",
  "co.za",
  "com.mx",
  "com.tr",
  "co.kr",
  "com.sg",
]);

/** "shop.example.co.uk" → "example". */
const registrableLabel = (domain: string) => {
  const parts = hostname(domain).split(".").filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";

  const suffix = parts.slice(-2).join(".");
  const index = COMPOUND_SUFFIXES.has(suffix)
    ? parts.length - 3
    : parts.length - 2;

  return parts[index] ?? parts[0] ?? "";
};

/** "www.wayfair.com" → "Wayfair". */
const brandFromDomain = (domain: string) => {
  const label = registrableLabel(domain);
  if (!label) return domain;
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const percent = (ratio: number | null) =>
  ratio === null ? null : `${Math.round(ratio * 100)}%`;

/**
 * The measured position, written out as the row's description.
 *
 * Deliberately every clause is a reported number rather than a characterization
 * — this is the text the judge reads in place of a product description, and the
 * whole value of this source is that nothing in it was invented.
 */
const measuredPosition = (
  rival: GoogleMerchant.MeasuredRival,
  {
    category,
    country,
    trafficSource,
  }: {
    category: string | null;
    country: string;
    trafficSource: string;
  },
) => {
  const traffic = trafficSource.toLowerCase();
  const scope = category
    ? `${category} (${country}, ${traffic})`
    : `${country} (${traffic})`;

  const clauses = [`Ranked #${rival.rank} by Google in ${scope}`];

  const overlap = percent(rival.pageOverlapRate);
  if (overlap) clauses.push(`appears on ${overlap} of the same result pages`);

  const higher = percent(rival.higherPositionRate);
  if (higher) clauses.push(`placed above this store ${higher} of the time`);

  return `${clauses.join("; ")}.`;
};

/**
 * Creates roster rows for measured rivals the merchant picked.
 *
 * The report is re-read server-side rather than trusting the domains and
 * metrics the client posts back: these rows assert "Google measured this", and
 * that claim has to come from Google on this request, not from a form body.
 */
export const importMeasuredCompetitors = withAuthentication(
  async (
    context,
    {
      store,
      domains,
      categoryId,
      country,
      trafficSource,
    }: {
      store: string;
      domains: string[];
      categoryId?: number;
      country?: string;
      trafficSource?: "ADS" | "ORGANIC";
    },
  ) => {
    const wanted = new Set(domains.map((domain) => domain.toLowerCase()));

    if (wanted.size === 0)
      return {
        success: false as const,
        error: new RequestError("Select at least one competitor to add"),
      };

    const report = await GoogleMerchant.getCompetitiveVisibility(
      Environment.SERVER,
      { store, categoryId, country, trafficSource },
    );
    if (!report.success) return report;

    const measured = report.data.rivals.filter((rival) =>
      wanted.has(rival.domain.toLowerCase()),
    );

    if (measured.length === 0)
      return {
        success: false as const,
        error: new RequestError(
          "Google no longer reports those domains for this category. Refresh the list and try again.",
        ),
      };

    // A rival already on the roster — added by an earlier import, or named by
    // one of the model-driven tabs — must not become a second row.
    const existing = await Competitor.find(Environment.SERVER, {
      where: and(
        eq(schema.competitor.userId, context.session.user.id),
        eq(schema.competitor.storeId, store),
      ),
    });
    if (!existing.success) return existing;

    // Matched on three keys. The stored URL's host is the exact one — a row this
    // action wrote keeps the measured domain in `url`, so a re-import of the
    // same rival is idempotent regardless of how the brand was prettified. The
    // brand/title key is the fuzzy one, and catches the same rival arriving
    // first from one of the model-driven tabs.
    //
    // `sellerDomain` is the one that matters most now: a seller we already hold
    // as a measured OFFER is strictly better than the brand row this import
    // would add — it carries a product, a price and a real listing URL, where
    // this would add a priceless duplicate that `isJudgeable` drops from every
    // scan. So the offer wins and the domain is corroborated instead.
    const taken = new Set(
      existing.data.flatMap((competitor) =>
        [
          competitor.brand?.toLowerCase(),
          competitor.title.toLowerCase(),
          competitor.url ? hostname(competitor.url) : null,
          competitor.sellerDomain,
        ].filter((value): value is string => Boolean(value)),
      ),
    );

    // Before the early return below, not after: when every reported rival is
    // already held as a measured offer there is nothing left to import — which
    // is precisely the case where corroboration has the most to say. Running it
    // after the return would skip it exactly then.
    //
    // Every rival Google reports, not only the ones the merchant ticked: a
    // seller we already measured is confirmed by Google's data whether or not
    // the merchant chose to add that domain to the roster.
    await corroborate({
      store,
      domains: report.data.rivals.map((rival) => hostname(rival.domain)),
    });

    const fresh = measured.filter(
      (rival) =>
        !taken.has(brandFromDomain(rival.domain).toLowerCase()) &&
        !taken.has(hostname(rival.domain)),
    );

    if (fresh.length === 0)
      return {
        success: false as const,
        error: new RequestError(
          "Those competitors are already on your roster.",
        ),
      };

    const created = await Promise.all(
      fresh.map((rival) => {
        const brand = brandFromDomain(rival.domain);

        return Competitor.create(Environment.SERVER, {
          title: brand,
          brand,
          description: measuredPosition(rival, {
            category: report.data.categoryName,
            country: report.data.country,
            trafficSource: report.data.trafficSource,
          }),
          // Google reports who competes, never at what price; leaving these
          // null is the honest answer and keeps the row out of price maths.
          price: null,
          currency: null,
          image: getDomainLogo(rival.domain),
          // Normalized through the same helper the dedupe reads back with, so
          // the next import recognizes this row.
          url: `https://${hostname(rival.domain)}`,
          // The join key. `serp.ts` normalizes seller hosts the same way
          // (lowercase, no `www.`), so a rival Google names here and a seller an
          // offer lookup returns land on the same string — which is what makes
          // corroboration below possible at all.
          sellerDomain: hostname(rival.domain),
          source: MEASURED_COMPETITOR_SOURCE,
          userId: context.session.user.id,
          storeId: store,
          selected: true,
        });
      }),
    );

    const successful = created
      .filter((record) => record.success)
      .map((record) => record.data);

    if (successful.length === 0)
      return {
        success: false as const,
        error: new RequestError("Could not save the competitors we found."),
      };

    return { success: true as const, data: successful };
  },
  "Intelligence.importMeasuredCompetitors",
);

/**
 * Promotes measured offers that Google independently names as rivals.
 *
 * `measured` means one source observed the seller carrying this product.
 * `corroborated` means a second, unrelated source — Google's
 * competitive-visibility report — also puts that seller in front of the same
 * shoppers. That is a stronger claim about the rival mattering, not just about
 * the price being real, and `competitor-source.ts` has defined the state since
 * the beginning with nothing to write it.
 *
 * One-way on purpose: it never demotes. A rival dropping out of one month's
 * report is a change in Google's sample, not evidence that a price we watched
 * a seller charge was never charged.
 */
const corroborate = async ({
  store,
  domains,
}: {
  store: string;
  domains: string[];
}) => {
  const reported = domains.filter(Boolean);
  if (reported.length === 0) return 0;

  const measured = await Competitor.find(Environment.SERVER, {
    where: and(
      eq(schema.competitor.storeId, store),
      eq(schema.competitor.confidence, "measured"),
      inArray(schema.competitor.sellerDomain, reported),
    ),
  });
  if (!measured.success) return 0;

  const promoted = await Promise.all(
    measured.data.map((competitor) =>
      Competitor.update(Environment.SERVER, competitor.id, {
        confidence: "corroborated" as const,
        updatedAt: new Date(),
      }),
    ),
  );

  return promoted.filter((record) => record.success).length;
};

export type CompetitorVerdict = {
  id: string;
  title: string;
  brand: string | null;
  /** The measured rank when Google reports this rival, null when it doesn't. */
  rank: number | null;
  confirmed: boolean;
};

/**
 * Cross-checks the roster against what Google measured.
 *
 * The model-driven tabs guess who a store competes with; this says which of
 * those guesses Google actually observed on the same result pages, and at what
 * rank. Read-only on purpose — an unconfirmed rival is not necessarily wrong
 * (Google reports one surface, and only above an impression threshold), so the
 * call is the merchant's, not ours.
 */
export const validateAgainstGoogle = withAuthentication(
  async (
    context,
    {
      store,
      categoryId,
      country,
      trafficSource,
    }: {
      store: string;
      categoryId?: number;
      country?: string;
      trafficSource?: "ADS" | "ORGANIC";
    },
  ) => {
    const report = await GoogleMerchant.getCompetitiveVisibility(
      Environment.SERVER,
      { store, categoryId, country, trafficSource },
    );
    if (!report.success) return report;

    const competitors = await Competitor.find(Environment.SERVER, {
      where: and(
        eq(schema.competitor.userId, context.session.user.id),
        eq(schema.competitor.storeId, store),
      ),
    });
    if (!competitors.success) return competitors;

    // Keyed on both the registrable label and the bare host, so a roster row
    // stored as "Wayfair" and one stored with a wayfair.com URL both line up
    // with a measured "www.wayfair.com".
    const ranks = new Map<string, number>();
    for (const rival of report.data.rivals) {
      ranks.set(brandFromDomain(rival.domain).toLowerCase(), rival.rank);
      ranks.set(hostname(rival.domain), rival.rank);
    }

    const verdicts = competitors.data.map((competitor): CompetitorVerdict => {
      const keys = [
        competitor.brand?.toLowerCase(),
        competitor.title.toLowerCase(),
        competitor.url ? hostname(competitor.url) : null,
      ].filter((value): value is string => Boolean(value));

      const rank = keys.map((key) => ranks.get(key)).find(Boolean) ?? null;

      return {
        id: competitor.id,
        title: competitor.title,
        brand: competitor.brand,
        rank,
        confirmed: rank !== null,
      };
    });

    return {
      success: true as const,
      data: {
        // Measured rivals first, then by rank, so the roster reads in the order
        // Google would put it.
        verdicts: verdicts.sort(
          (a, b) =>
            (a.rank ?? Number.MAX_SAFE_INTEGER) -
            (b.rank ?? Number.MAX_SAFE_INTEGER),
        ),
        confirmed: verdicts.filter((verdict) => verdict.confirmed).length,
        measured: report.data.rivals.length,
        reason: report.data.reason,
      },
    };
  },
  "Intelligence.validateAgainstGoogle",
);
