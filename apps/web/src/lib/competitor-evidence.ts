/**
 * What we actually observed about a competitor listing, and what we merely
 * failed to capture — the distinction the judge rubric cannot make on its own.
 *
 * `RUBRIC_CORE` (judge.ts) instructs the model to "penalize each decisive
 * attribute that is missing or unverifiable". For the merchant's OWN product
 * that is correct: those fields come from their catalog, so a blank one is a
 * real listing defect they can go and fix. For a competitor it is not. Those
 * fields come from OUR capture of a third-party listing, and a blank one means
 * we never looked, not that the rival left it empty. Printing it as a gap hands
 * the merchant a win over a listing nobody measured.
 *
 * Lives in `lib/` rather than beside the formatter because the scan estimators
 * in the dashboard and onboarding must agree with the engine on which rows will
 * be judged — the same reason `scan-estimate.ts` is here.
 */

/**
 * The observable fields the rubric scores a listing on. Structural rather than
 * `Competitor.Type` so the trimmed `Competitor.Candidate` the client roster
 * carries satisfies it too: the fields Candidate drops are the optional ones.
 */
export type CompetitorEvidence = {
  title: string;
  price: string | null;
  brand: string | null;
  image: string | null;
  description?: string | null;
  url?: string | null;
};

const present = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Hosts that serve a brand mark, never a photograph of the product. Both are
 * present in stored rows: `getBrandLogo` (lib/logo.ts) mints Google favicons
 * today and minted Clearbit logos before HubSpot shut that service down, and
 * the older URLs were never rewritten — every competitor image in the database
 * as of 2026-09-01 is in fact a dead `logo.clearbit.com` link.
 */
const LOGO_HOSTS = ["google.com/s2/favicons", "logo.clearbit.com"];

/**
 * A brand mark standing in for a product photo. Every AI ingestion path fills
 * `image` with a guessed brand logo, so a non-null `image` is not evidence of
 * product photography, and reporting it as one inflates the rival.
 */
export const isBrandLogo = (image: string | null | undefined) =>
  !!image && LOGO_HOSTS.some((host) => image.includes(host));

export const hasProductImage = (competitor: CompetitorEvidence) =>
  present(competitor.image) && !isBrandLogo(competitor.image);

/**
 * The floor for entering a scan: a competitor without a price cannot be
 * compared, only guessed at.
 *
 * Price is the one attribute decisive in every category and the one the rubric
 * punishes hardest, so a priceless row scores in the 0-30 "critical data
 * missing" band no matter what else it carries — the merchant beats a strawman
 * and the inflated win rate propagates into the competitors table, product
 * detail, the CSV export and `listingOptimization`'s lift figures.
 *
 * Every other absence is a capture gap the prompt can frame (see
 * {@link captureGaps}); this one is not recoverable, so the row is kept out of
 * the judged path entirely.
 *
 * Paired with the SQL in `Competitor.countForCurrentUser` — change both.
 */
export const isJudgeable = (competitor: CompetitorEvidence) =>
  present(competitor.price);

/**
 * Decisive attributes we never captured for this listing, named for the judge
 * so it can exclude them from the comparison instead of scoring them as
 * defects. Price is never among them: a row missing one never gets this far.
 */
export const captureGaps = (competitor: CompetitorEvidence) =>
  [
    present(competitor.description) ? null : "description",
    present(competitor.brand) ? null : "brand",
    hasProductImage(competitor) ? null : "product imagery",
    present(competitor.url) ? null : "listing URL",
  ].filter((gap) => gap !== null);
