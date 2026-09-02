/**
 * Provenance marker written to `competitor.source` for rivals that came out of
 * Google's competitive-visibility report rather than out of a model.
 *
 * `source` is a free-text column and nothing in the app branches on it — it is
 * rendered in the results list, the CSV export (`server/app/report.ts`) and the
 * judge's competitor block (`server/app/intelligence/formating.ts`) — so the
 * value has to stay human-readable rather than become a slug. Both the writer
 * and the "measured" badge import this constant so the two can never drift.
 *
 * This lives outside `server/app` deliberately: those modules carry
 * `"use server"`, where every export must be an async function, so a plain
 * constant cannot be shared from there — and the badge is client-side anyway.
 */
export const MEASURED_COMPETITOR_SOURCE = "Google Merchant Center";

/**
 * Whether a competitor row was measured by Google rather than suggested by a
 * model. Drives the results-list badge, and is the honest distinction the
 * onboarding review step needs: everything else on the roster is a model's
 * best guess at who a rival is, these are rivals Google observed on the same
 * result pages.
 */
export const isMeasuredCompetitor = (source: string | null | undefined) =>
  source === MEASURED_COMPETITOR_SOURCE;

/**
 * How much weight a competitor row's facts carry.
 *
 * Three states, because the roster now mixes genuinely different kinds of
 * claim and blending them into one "competitor" reads as more certain than the
 * data is:
 *
 * - `measured`     — a provider returned this offer: real seller, real price,
 *                    observed at `measuredAt`.
 * - `corroborated` — measured AND confirmed by a second source (a rival Google's
 *                    competitive-visibility report also names).
 * - `inferred`     — a model named it. Nothing checked the price or the url.
 *
 * Null is a real fourth state, not an oversight: a Google Merchant Center row
 * makes no offer-level claim at all. Google measured that the domain competes,
 * never at what price — so calling it `measured` would borrow the word from a
 * stronger claim. Those rows keep their own badge via
 * {@link isMeasuredCompetitor}.
 *
 * Kept as a column rather than derived from `source`, which is free text a model
 * writes and therefore cannot be branched on safely.
 */
export type Confidence = "measured" | "corroborated" | "inferred";

export const CONFIDENCE_ORDER: Confidence[] = [
  "corroborated",
  "measured",
  "inferred",
];

/**
 * Rows whose price is an observation rather than a recollection. This is the
 * distinction the merchant is owed on screen — and, separately, the reason the
 * win rate for these rows means something.
 */
export const isVerifiedCompetitor = (
  confidence: string | null | undefined,
): confidence is "measured" | "corroborated" =>
  confidence === "measured" || confidence === "corroborated";
