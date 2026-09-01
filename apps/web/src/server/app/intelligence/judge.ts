import type * as Competitor from "../competitor";
import type * as Product from "../product";
import * as Formating from "./formating";

/**
 * The capture-gap exception, shared by every prompt that renders a rival through
 * `Formating.formatCompetitor` — the A/B and legacy judges here, and the UCP
 * lift judge in `ucp/simulation.ts`.
 *
 * All of those rubrics tell the model to punish missing data, which is right for
 * the merchant's own catalog and wrong for a third party we simply never
 * measured: it scores our blind spot as the rival's defect and hands the
 * merchant a free win. The formatter names what it did not observe
 * (lib/competitor-evidence.ts); this teaches the model what that line means.
 *
 * It lives in one constant because a prompt that renders the line without
 * carrying this rule is strictly worse than one that renders neither — the
 * model reads an unexplained gap list and penalizes it anyway.
 */
export const CAPTURE_GAP_RULE = `CAPTURE GAPS: a listing may end with a line beginning "Not captured about this listing:". Those attributes were never observed by the tool that collected the listing — they are UNKNOWN, not confirmed absent — so do NOT score them for or against that listing, and do not cite them among the deciding factors. Decide the comparison on the attributes recorded for BOTH listings. If too little was captured on one side to compare on this category's decisive attributes, say so explicitly in your reasoning and score only what is comparable. Anything NOT named on that line is confirmed absent and is penalized normally.`;

// Framing-agnostic scoring rubric shared by both judge prompts below. STEP 1-4
// never name which listing is the merchant's, so the same rubric composes into
// the legacy product/competitor prompt AND the position-swap A/B prompt without
// drifting apart. Encodes the evidence-backed debiasing from docs/context:
// anchored absolute scoring, category-first evaluation, evidence-before-verdict,
// penalize-unverifiable (not short), and winner derived from scores.
const RUBRIC_CORE = `STEP 1 — CATEGORY: Infer the product category and list the 4-7 attributes that actually decide a purchase in THAT category (laptop -> CPU, RAM, storage, battery, display, weight; mattress -> firmness, dimensions, materials, trial period; supplement -> active ingredients, dosage, certifications, third-party testing; apparel -> sizing, material, fit).

STEP 2 — EVIDENCE (write this in the 'reasoning' field BEFORE you score): For each listing, record which decisive attributes are present and verifiable vs missing or unverifiable, plus data completeness (description, price, images, SKU/identifiers, structured data) and social proof. Reward verifiable specifics. Treat marketing adjectives with no backing ("premium", "best-in-class") as ABSENT. Judge SUBSTANCE, not length: a long, repetitive, or vague listing is NOT better than a short, specific one.

STEP 3 — SCORE each listing independently 0-100 using these anchors:
- 0-30: critical data missing or unverifiable
- 31-55: typical real listing with several gaps (MOST real listings land here)
- 56-69: solid, most key attributes verifiable
- 70-84: excellent, near-complete and specific
- 85-100: exceptional and category-leading (rare)
70+ is rare — do not inflate. Penalize each decisive attribute that is missing or unverifiable; do NOT neutral-rate gaps.

STEP 4 — WINNER: set 'winner' to whichever listing has the HIGHER score. If the scores tie, pick the one with more verifiable decisive attributes. Provide 3-6 'keyFactors', each naming a SPECIFIC present or absent attribute (never a marketing adjective).

${CAPTURE_GAP_RULE}

(That is the ONLY exception to STEP 3's penalize-gaps rule.)`;

// Legacy single-pass judge prompt (product/competitor labels). Still used by the
// dead streaming path in simulate.ts. The LIVE engine (background-scan.ts) uses
// the position-swap A/B prompt below instead.
export const JUDGE_SYSTEM = `You are a deliberately skeptical e-commerce listing auditor simulating how an AI shopping agent evaluates a product before recommending it. You are given two listings labelled PRODUCT and COMPETITOR. THE LABELS ARE ARBITRARY and must not influence your judgment.

${RUBRIC_CORE}

AGENT-READABILITY (UCP): The PRODUCT includes a "UCP / Agent-Readability Score" (0-100) measuring how parseable its structured data (schema.org JSON-LD / UCP) is. This is ONE capped, SECONDARY dimension — it must not dominate the verdict. Absence of structured data on a side is an asymmetry of OBSERVABILITY, not necessarily of product quality, and major-retailer competitors are assumed already agent-readable. Do not double-count it: the same gap cannot be both a "spec completeness" loss and a "structured-data" loss. A low score lowers the agent-readability factor; a high score only means the listing meets the bar — no bonus.

Output ONLY the JSON object {winner, productScore, competitorScore, reasoning, keyFactors}. Do not add fields or any prose outside it.`;

export const buildJudgePrompt = (
  product: Product.Type,
  competitor: Competitor.Type,
) => `Audit these two listings and decide which an AI shopping agent would recommend.

--- PRODUCT ---
${Formating.formatProduct(product)}
UCP / Agent-Readability Score: ${Formating.computeUcpScore(product)}/100

--- COMPETITOR ---
${Formating.formatCompetitor(competitor)}

Infer the category, record per-listing evidence in 'reasoning' first, then score each listing 0-100 against this category's decisive attributes and set 'winner' to the higher score.`;

// Position-swap judge prompt (Job A, live engine). LLM judges carry a primacy
// bias toward whichever listing they read first; the harness cancels it by
// running every comparison in BOTH orderings and averaging the scores. To make
// that swap meaningful the listings are labelled by POSITION only (A / B) — the
// rubric never learns which side is the merchant's. (The UCP score line is still
// merchant-only telemetry, so it remains a soft identity tell; the UCP paragraph
// below neutralizes it verbally rather than hiding it.)
export const JUDGE_SYSTEM_AB = `You are a deliberately skeptical e-commerce listing auditor simulating how an AI shopping agent evaluates a product before recommending it. You are given two listings labelled LISTING A and LISTING B. THE LABELS ARE ARBITRARY POSITIONS — they carry no meaning and must not influence your judgment.

${RUBRIC_CORE}

AGENT-READABILITY (UCP): One of the listings may carry a "UCP / Agent-Readability Score" (0-100) measuring how parseable its structured data (schema.org JSON-LD / UCP) is. This is ONE capped, SECONDARY dimension — it must not dominate the verdict. Absence of an explicit score on a listing is an asymmetry of OBSERVABILITY, not of product quality — a listing without one (e.g. a major-retailer competitor) is assumed already agent-readable. Do not double-count it: the same gap cannot be both a "spec completeness" loss and a "structured-data" loss. A low score lowers the agent-readability factor; a high score only means the listing meets the bar — no bonus.

Output ONLY the JSON object {winner, scoreA, scoreB, reasoning, keyFactors}. Do not add fields or any prose outside it.`;

// One side of an A/B comparison. The product slot carries its merchant-only UCP
// score; the competitor slot does not.
export type Slot =
  | { kind: "product"; product: Product.Type }
  | { kind: "competitor"; competitor: Competitor.Type };

const renderSlot = (slot: Slot): string => {
  switch (slot.kind) {
    case "product":
      return `${Formating.formatProduct(slot.product)}\nUCP / Agent-Readability Score: ${Formating.computeUcpScore(slot.product)}/100`;
    case "competitor":
      return Formating.formatCompetitor(slot.competitor);
  }
};

export const buildJudgePromptAB = (
  slotA: Slot,
  slotB: Slot,
) => `Audit these two listings and decide which an AI shopping agent would recommend.

--- LISTING A ---
${renderSlot(slotA)}

--- LISTING B ---
${renderSlot(slotB)}

Infer the category, record per-listing evidence in 'reasoning' first, then score each listing 0-100 against this category's decisive attributes and set 'winner' to the higher-scoring listing.`;

// Competitor detection (Job B). Parametric generation hallucinates products and
// especially URLs, so the prompt pushes for a CHECKABLE best-guess url rather
// than abstaining to null.
//
// The paragraph that used to sit here told the model "Every product you return
// is INDEPENDENTLY VERIFIED against the live web before it is saved… A product
// that fails verification is discarded." That was true once and is not now —
// detect.ts documents the removal of URL grounding at its head. Claiming a
// verification step that does not run is a lie told to elicit caution, and it
// stops being harmless the moment a real measured path exists beside this one:
// a merchant comparing a "verified" model-named rival against a genuinely
// measured offer would be reading the same word for two different things.
//
// Detected rows now carry `confidence: "inferred"`; measured offers from
// `offer-resolve.ts` are the ones with a checked price and seller.
export const DETECTION_SYSTEM = `You identify real, currently-purchasable competitor products for a given merchant product. Output ONLY products you are highly confident exist and are sold by mainstream retailers — products from brands that demonstrably rank on Amazon, Walmart, or Target.

Your output is NOT verified against the live web. Nothing downstream will catch an invented product, a wrong price, or a url that does not resolve — it will be shown to the merchant as a competitor. Abstaining costs nothing; a fabricated entry costs the merchant's trust in every other row.

Rules:
1. Return the brand + a specific model/line, and your single best-guess canonical 'url' for THAT exact product — its Amazon/Walmart/Target product page or the brand's own product page. Give a genuine best guess at a real product page; never a random, placeholder, search, or category url. Use null only if you truly cannot name a likely page.
2. Same subcategory as the merchant product, and within ±40% of its price.
3. No near-duplicate brands across the results.
4. Abstain rather than guess at the PRODUCT: it is better to return 2 products you are sure exist than 4 with one invented. Returning fewer than 4 is correct when uncertain.
5. Never invent a brand, model, or price. The url is a best guess to be verified; the brand, model, and price must be ones you are confident are real.`;

export const buildDetectionPrompt = (summaries: string) =>
  `Here are the merchant's products:\n${summaries}\n\nFor each product, identify up to 4 REAL competitor products an AI shopping agent would surface in the same subcategory and price range (±40%). Prefer well-known brands that rank on Amazon, Walmart, or Target. Return brand, a specific model/line, price, currency, primary retailer, your best-guess canonical product url (a real product page, not a search or category url), and a one-line description of why it competes. Omit anything you are not confident is a real, purchasable product — do not pad to reach 4.`;
