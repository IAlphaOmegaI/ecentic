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
