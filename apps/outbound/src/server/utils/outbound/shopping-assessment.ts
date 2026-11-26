import "server-only";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { type Result, resultify } from "@zenncore/utils";
import { z } from "zod";
import { countWords, type Playbook } from "@/lib/outbound";
import {
  productCaptureUrlMatches,
  type ShoppingResearch,
  shoppingResearchSchema,
  validateShoppingResearch,
} from "@/lib/outbound-shopping-research";
import type { AiCapture, BrowserResearch } from "./live-shopping-contract";
import { validateFactResearch } from "./shopping-fact-assessment";

const selectionOutputSchema = z.object({
  kind: z.enum(["query-comparison", "product-data-gap", "product-observation"]),
  observation: z.string(),
  consequence: z.string(),
  askAbout: z.string(),
  scope: z.string(),
  sourceIds: z.array(z.string()),
  quotes: z.array(z.object({ sourceId: z.string(), quote: z.string() })),
});
export const assessmentOutputSchema = z.object({
  decision: z.enum(["supported", "hold"]),
  reason: z.string(),
  selected: selectionOutputSchema.nullable(),
  competitors: z.array(z.object({ url: z.string(), comparison: z.string() })),
});
type CapturedBrowser = Extract<BrowserResearch, { status: "captured" }>;
export type Evidence = { answer: AiCapture; browser: CapturedBrowser };
export const catalogId = (kind: "quote" | "candidate", value: unknown) =>
  `${kind === "quote" ? "q" : "c"}_${createHash("sha256")
    .update(JSON.stringify([`${kind}-v1`, value]))
    .digest("hex")
    .slice(0, 24)}`;

/** Every excerpt is an unchanged contiguous slice, including its original spacing. */
export const createAssessmentCatalog = ({ answer, browser }: Evidence) => {
  const sources = [answer.source, ...browser.sources];
  if (new Set(sources.map((source) => source.id)).size !== sources.length)
    throw new Error("Captured source IDs must be unique.");
  const quotes = sources.flatMap((source) => {
    const excerpts: {
      id: string;
      sourceId: string;
      start: number;
      end: number;
      quote: string;
    }[] = [];
    for (let start = 0; start < source.content.length; ) {
      let end = Math.min(start + 2000, source.content.length);
      if (end < source.content.length) {
        const tail = source.content.slice(start + 1700, end);
        const boundaries = [...tail.matchAll(/\n[\t ]*\n|[.!?](?:[\t ]+|\n)/g)];
        const last = boundaries.at(-1);
        if (last) end = start + 1700 + last.index + last[0].length;
        // Do not split one UTF-16 surrogate pair across excerpts.
        if (
          /[\uD800-\uDBFF]/.test(source.content[end - 1] ?? "") &&
          /[\uDC00-\uDFFF]/.test(source.content[end] ?? "")
        )
          end -= 1;
      }
      const quote = source.content.slice(start, end);
      if (quote.trim())
        excerpts.push({
          id: catalogId("quote", [
            source.id,
            source.artifact,
            start,
            end,
            quote,
          ]),
          sourceId: source.id,
          start,
          end,
          quote,
        });
      start = end;
    }
    return excerpts;
  });
  if (!quotes.length || quotes.length > 100)
    throw new Error(
      "The captured excerpt catalog is empty or exceeds its limit.",
    );
  const candidates = browser.candidates.map((candidate) => ({
    id: catalogId("candidate", [
      candidate,
      candidate.sourceIds.map((id) => {
        const source = sources.find((source) => source.id === id);
        if (!source) throw new Error("A competitor source is missing.");
        return [source.id, source.artifact];
      }),
    ]),
    ...candidate,
  }));
  const surface =
    answer.job.query.surface === "google_ai_mode"
      ? "Google AI Mode"
      : "ChatGPT";
  const query = answer.job.query.prompt;
  const scope =
    `One captured ${surface} answer at ${answer.executedAt} and rendered product-page evidence. Response market, UI locale and sign-in state were not independently established. Checkout was not tested; no purchase or sales impact was measured. Query${query.length > 500 ? " excerpt" : ""}: ${query.slice(0, 500)}. Product: ${answer.job.query.product.name}. ${browser.limitations.join(" ")}`.slice(
      0,
      1500,
    );
  return {
    quotes,
    candidates,
    scope,
    answerText: answer.answer,
    answerSourceId: answer.source.id,
    productSourceId: browser.sources.find(
      (source) =>
        source.capture === "browser" &&
        source.kind === "product" &&
        productCaptureUrlMatches(answer.job.query.product.url, source.url),
    )?.id,
  };
};
export type AssessmentCatalog = ReturnType<typeof createAssessmentCatalog>;

const sourceQuoteSchema = (
  catalog: AssessmentCatalog,
  source: string | undefined,
) => {
  const identifiers = catalog.quotes
    .filter((quote) => quote.sourceId === source)
    .map((quote) => quote.id);
  if (!identifiers.length)
    throw new Error(
      "The shopper answer and merchant product both need captured excerpts.",
    );
  return z.enum(identifiers as [string, ...string[]]);
};

// These are exact local offer anchors, not another model-written interpretation.
export const offerSchema = (catalog: AssessmentCatalog) =>
  z
    .object({
      quoteId: z.enum(
        catalog.quotes.map((quote) => quote.id) as [string, ...string[]],
      ),
      offer: z.string().min(1).max(600),
      variant: z.string().min(1).max(100),
      price: z.string().min(1).max(40),
      currency: z.enum(["USD", "CAD", "AUD", "NZD", "GBP", "EUR"]),
      currencyAnchor: z.string().min(1).max(40),
      condition: z.enum(["one-time", "subscription", "member"]),
      conditionAnchor: z.string().min(1).max(80),
      marketAnchor: z.string().min(1).max(80).nullable(),
    })
    .strict();
export type Offer = z.infer<ReturnType<typeof offerSchema>>;
const normalizeVariant = (value: string) =>
  value
    .toLowerCase()
    .replace(/(\d+)\.0+\b/g, "$1")
    .replace(/fluid\s+ounces?|fl\.?\s*oz\.?/g, "floz")
    .replace(/[^\p{L}\p{N}.]+/gu, "");
const amounts = (value: string) =>
  [
    ...value.matchAll(
      /(?:USD|CAD|AUD|NZD|GBP|EUR|US\$|CA\$|AU\$|NZ\$|[$£€])\s*\*{0,2}\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?)\s*(?:USD|CAD|AUD|NZD|GBP|EUR)\b/gi,
    ),
  ].map((match) => Number((match[1] ?? match[2])!.replaceAll(",", "")));
const measurements = (value: string) =>
  [
    ...value.matchAll(
      /\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz\.?|fluid\s+ounces?|oz|ml|kg|mg|g|liters?|litres?|packs?)\b/gi,
    ),
  ].map((match) => normalizeVariant(match[0]));
const currencyAnchors: Record<Offer["currency"], RegExp> = {
  USD: /^(?:USD|US\$|U\.S\. dollars?)$/i,
  CAD: /^(?:CAD|CA\$|Canadian dollars?)$/i,
  AUD: /^(?:AUD|AU\$|Australian dollars?)$/i,
  NZD: /^(?:NZD|NZ\$|New Zealand dollars?)$/i,
  GBP: /^(?:GBP|£|British pounds?)$/i,
  EUR: /^(?:EUR|€|euros?)$/i,
};
const conditionAnchors: Record<Offer["condition"], RegExp> = {
  "one-time":
    /\b(?:one[ -]time(?: purchase)?|single purchase|without (?:a )?subscription)\b/i,
  subscription: /\b(?:subscribe|subscription)\b/i,
  member: /\b(?:member(?:s|ship)?|loyalty)\b/i,
};

export const resolveOffer = (
  catalog: AssessmentCatalog,
  offer: Offer,
  sourceId: string | undefined,
) => {
  const excerpt = catalog.quotes.find((quote) => quote.id === offer.quoteId);
  if (!excerpt || excerpt.sourceId !== sourceId) return null;
  const start = excerpt.quote.indexOf(offer.offer);
  if (start < 0 || excerpt.quote.indexOf(offer.offer, start + 1) >= 0)
    return null;
  const content = catalog.quotes
    .filter((quote) => quote.sourceId === sourceId)
    .map((quote) => quote.quote)
    .join("");
  const offset = excerpt.start + start;
  // Whole local lines prevent selecting a price while clipping its variant/terms.
  const before = content.slice(
    content.lastIndexOf("\n", offset - 1) + 1,
    offset,
  );
  const after = content.slice(offset + offer.offer.length).split("\n", 1)[0]!;
  if (
    before.trim() ||
    after.trim() ||
    offer.offer.split("\n").length > 6 ||
    /\n\s*\n/.test(offer.offer) ||
    /\b(?:coupon|cart|checkout|minimum|bundle)\b|\b(?:promo|discount)\s+code\b|\b(?:buy|spend)\s+\d/i.test(
      offer.offer,
    )
  )
    return null;
  const anchors = [
    offer.variant,
    offer.price,
    offer.currencyAnchor,
    offer.conditionAnchor,
    ...(offer.marketAnchor ? [offer.marketAnchor] : []),
  ];
  if (anchors.some((anchor) => !offer.offer.includes(anchor))) return null;
  if (
    !currencyAnchors[offer.currency].test(offer.currencyAnchor) ||
    !conditionAnchors[offer.condition].test(offer.conditionAnchor)
  )
    return null;
  const currencies = (
    offer.offer.match(
      /\b(?:USD|CAD|AUD|NZD|GBP|EUR)\b|US\$|CA\$|AU\$|NZ\$|[£€]/gi,
    ) ?? []
  ).map((currency) => {
    const normalized = currency.toUpperCase();
    return (
      (
        {
          US$: "USD",
          CA$: "CAD",
          AU$: "AUD",
          NZ$: "NZD",
          "£": "GBP",
          "€": "EUR",
        } as Record<string, string>
      )[normalized] ?? normalized
    );
  });
  if (currencies.some((currency) => currency !== offer.currency)) return null;
  const conditions = Object.entries(conditionAnchors).filter(([, expression]) =>
    expression.test(offer.offer),
  );
  if (conditions.length !== 1 || conditions[0]![0] !== offer.condition)
    return null;
  const variant = normalizeVariant(offer.variant);
  const sizes = [...new Set(measurements(offer.offer))];
  if (sizes.length > 1 || (sizes[0] && !variant.includes(sizes[0])))
    return null;
  const namedSizes = [
    ...new Set(
      (
        offer.offer.match(/\b(?:small|medium|large|mini|jumbo|travel)\b/gi) ??
        []
      ).map((size) => size.toLowerCase()),
    ),
  ];
  if (
    namedSizes.length > 1 ||
    (!sizes.length && namedSizes.some((size) => !variant.includes(size)))
  )
    return null;
  const prices = [...new Set(amounts(offer.offer))];
  const selected = amounts(offer.price);
  if (
    selected.length !== 1 ||
    !prices.includes(selected[0]!) ||
    prices.length > 2
  )
    return null;
  // The nearest label must describe this amount, never an earlier sale price.
  const prefix = offer.offer.slice(0, offer.offer.indexOf(offer.price));
  const label = [
    ...prefix.matchAll(/\b(original|was|regular|from|sale|current|now)\b/gi),
  ].at(-1);
  const tail = label ? prefix.slice(label.index + label[0].length) : "";
  const current =
    label &&
    /^(?:sale|current|now)$/i.test(label[0]) &&
    tail.length <= 35 &&
    amounts(tail).length === 0;
  if (
    (label && tail.length <= 35 && !current) ||
    (prices.length === 2 &&
      (!current || !/\b(?:original|was|regular|from)\b/i.test(offer.offer)))
  )
    return null;
  const markets = [
    ...new Set(
      (
        offer.offer.match(
          /\b(?:United States|United Kingdom|Canada|Australia|New Zealand|US(?!\$)|UK)\b/g,
        ) ?? []
      ).map(
        (market) =>
          ({ "United States": "US", "United Kingdom": "UK" })[market] ?? market,
      ),
    ),
  ];
  if (markets.length > 1) return null;
  return {
    variant,
    price: selected[0]!,
    currency: offer.currency,
    condition: offer.condition,
    market: markets[0] ?? null,
  };
};

const pricingClaim = (value: string) =>
  /[$£€]|\b(?:USD|CAD|AUD|NZD|GBP|EUR|price[sd]?|pricing|costs?|sale|discount|promotion|cheaper|expensive)\b/i.test(
    value,
  );
export const priceComparisonProblem = (
  catalog: AssessmentCatalog,
  selected: {
    observation: string;
    consequence: string;
    quoteIds: string[];
    priceComparison: { answer: Offer; page: Offer } | null;
  },
  comparisons: string[],
) => {
  const claim = [
    selected.observation,
    selected.consequence,
    ...comparisons,
  ].join(" ");
  const proof = selected.priceComparison;
  if (!proof)
    return pricingClaim(claim)
      ? "A price claim needs comparable local offer evidence."
      : null;
  if (
    ![proof.answer.quoteId, proof.page.quoteId].every((id) =>
      selected.quoteIds.includes(id),
    )
  )
    return "Price evidence must be among the selected captured excerpts.";
  const answer = resolveOffer(catalog, proof.answer, catalog.answerSourceId);
  const page = resolveOffer(catalog, proof.page, catalog.productSourceId);
  if (!answer || !page)
    return "The exact variant, current price, currency or purchase terms are ambiguous in a local offer.";
  if (
    answer.variant !== page.variant ||
    answer.currency !== page.currency ||
    answer.condition !== page.condition ||
    (answer.market && page.market && answer.market !== page.market)
  )
    return "The prices describe different variants, currencies, purchase terms or markets.";
  if (answer.price === page.price)
    return "The same variant already has the same current price in the answer and on the page.";
  if (
    amounts(claim).some(
      (price) => price !== answer.price && price !== page.price,
    )
  )
    return "The price claim includes an amount outside its compared offers.";
  const answerText = catalog.answerText;
  // Search the whole answer, not just the model's chosen excerpt. A matching offer
  // elsewhere makes an omission/mismatch claim unsafe, even if conditions are unclear.
  const matching = answerText.split(/\n\s*\n/).some((block) => {
    const text = block.replace(/\[[^\]]*\]\([^)]*\)/g, (link) =>
      link.slice(1, link.indexOf("](")),
    );
    return (
      normalizeVariant(text).includes(page.variant) &&
      amounts(text).includes(page.price)
    );
  });
  if (matching)
    return "The complete answer already includes this variant at the page's current price.";
  return null;
};

/** Leave room for the fixed first-email copy; never shorten an evidence qualifier. */
export const assessmentCopyBudget = (playbook: Playbook, product: string) => {
  const variables: Record<string, string> = {
    first: "there",
    name: "recipient",
    company: "company",
    product,
    productFeature: "",
    finding: "",
    consequence: "",
    askAbout: "",
    personalLine: "",
    founderLine: playbook.productCheckIntro,
    callToAction: playbook.callToAction,
    optout: playbook.optout,
    signature: playbook.signature,
  };
  const fixed = playbook.bodyTemplate.replace(
    /\{([^{}]+)\}/g,
    (original, name: string) => variables[name] ?? original,
  );
  const repetitions = Math.max(
    1,
    ...["finding", "consequence"].map(
      (name) => playbook.bodyTemplate.split(`{${name}}`).length - 1,
    ),
  );
  return Math.max(
    0,
    Math.floor((playbook.maxBodyWords - countWords(fixed) - 3) / repetitions),
  );
};

const copyBudgetReason =
  "The finding needs more words than the first-email template allows; do not remove evidence qualifiers to fit.";

/** The model can select captured excerpts and candidates, but cannot rewrite them. */
export const assessmentWireSchema = (
  catalog: AssessmentCatalog,
  options: { allowProductObservations?: boolean; neutralOnly?: boolean } = {},
) =>
  z
    .object({
      decision: z.enum(["supported", "hold"]),
      reason: z.string(),
      selected: z
        .object({
          kind: options.neutralOnly
            ? z.literal("product-observation")
            : z.enum([
                "product-data-gap",
                ...(catalog.candidates.length
                  ? ["query-comparison" as const]
                  : []),
                ...(options.allowProductObservations
                  ? ["product-observation" as const]
                  : []),
              ]),
          observation: z.string(),
          consequence: z.string(),
          askAbout: z.string(),
          priceComparison: options.neutralOnly
            ? z.null()
            : z
                .object({
                  answer: offerSchema(catalog),
                  page: offerSchema(catalog),
                })
                .strict()
                .nullable(),
          answerQuoteId: sourceQuoteSchema(catalog, catalog.answerSourceId),
          productQuoteId: sourceQuoteSchema(catalog, catalog.productSourceId),
          quoteIds: z
            .array(
              z.enum(
                catalog.quotes.map((quote) => quote.id) as [
                  string,
                  ...string[],
                ],
              ),
            )
            .max(10),
        })
        .strict()
        .nullable(),
      competitors: z
        .array(
          z
            .object({
              candidateId: z.enum(
                catalog.candidates.length
                  ? (catalog.candidates.map((candidate) => candidate.id) as [
                      string,
                      ...string[],
                    ])
                  : ["unavailable"],
              ),
              comparison: z.string(),
            })
            .strict(),
        )
        .max(options.neutralOnly ? 0 : catalog.candidates.length),
    })
    .strict();

/** Numeric range punctuation is display copy; source excerpts remain byte-for-byte unchanged. */
export const normalizeNumericRangeCopy = (copy: string) =>
  copy.replace(/(\d)[ \t]*[\u2013\u2014][ \t]*(?=\d)/g, "$1-");

export const projectAssessment = (
  catalog: AssessmentCatalog,
  output: unknown,
  copyBudget = 45,
  options: { allowProductObservations?: boolean } = {},
): z.infer<typeof assessmentOutputSchema> => {
  const held = (reason: string): z.infer<typeof assessmentOutputSchema> => ({
    decision: "hold",
    reason,
    selected: null,
    competitors: [],
  });
  const parsed = assessmentWireSchema(catalog, options).safeParse(output);
  if (!parsed.success)
    return held(
      "The selected excerpt or competitor is not in the captured catalog.",
    );
  const assessment = parsed.data;
  if (assessment.decision === "hold" || !assessment.selected)
    return held(assessment.reason || "No material difference was supported.");
  const selection = assessment.selected;
  if (
    new Set(selection.quoteIds).size !== selection.quoteIds.length ||
    new Set(assessment.competitors.map((candidate) => candidate.candidateId))
      .size !== assessment.competitors.length
  )
    return held("Select each captured excerpt and competitor only once.");
  const selected = {
    ...selection,
    observation: normalizeNumericRangeCopy(selection.observation),
    consequence: normalizeNumericRangeCopy(selection.consequence),
    quoteIds: [
      ...new Set([
        selection.answerQuoteId,
        selection.productQuoteId,
        ...selection.quoteIds,
      ]),
    ],
  };
  if (selected.kind === "query-comparison" && !assessment.competitors.length)
    return held("A comparison needs an inspected competing product.");
  if (
    /\b(?:captured|rendered|receipt|source ids?)\b/i.test(
      `${selected.observation} ${selected.consequence}`,
    )
  )
    return held(
      "The finding includes internal research terms instead of recipient-facing wording.",
    );
  if (
    /\d[\d.,]*\s*(?:%|percent\b)/i.test(
      `${selected.observation} ${selected.consequence} ${selected.askAbout}`,
    )
  )
    return held(
      "The finding includes percentages that are not allowed in email copy.",
    );
  if (
    selected.kind === "product-observation" &&
    (selected.priceComparison || assessment.competitors.length)
  )
    return held(
      "A neutral product observation cannot claim a price discrepancy or competitor comparison.",
    );
  const priceProblem = priceComparisonProblem(
    catalog,
    selected,
    assessment.competitors.map((candidate) => candidate.comparison),
  );
  if (priceProblem) return held(priceProblem);
  if (
    countWords(`${selected.observation} ${selected.consequence}`) > copyBudget
  )
    return held(copyBudgetReason);
  const quotes = selected.quoteIds.map((id) => {
    const quote = catalog.quotes.find((quote) => quote.id === id)!;
    return { sourceId: quote.sourceId, quote: quote.quote };
  });
  return {
    decision: "supported",
    reason: assessment.reason,
    selected: {
      kind: selected.kind,
      observation: selected.observation,
      consequence: selected.consequence,
      askAbout: selected.askAbout,
      scope: catalog.scope,
      sourceIds: [...new Set(quotes.map((quote) => quote.sourceId))],
      quotes,
    },
    competitors: assessment.competitors.map((selected) => ({
      url: catalog.candidates.find(
        (candidate) => candidate.id === selected.candidateId,
      )!.url,
      comparison: selected.comparison,
    })),
  };
};
export const observedQuery = ({ answer, browser }: Evidence) => ({
  query: answer.job.query.prompt,
  surface:
    answer.job.query.surface === "google_ai_mode"
      ? "Google AI Mode"
      : "ChatGPT",
  market: "unknown",
  interfaceLocale: "unknown",
  signedOut: null,
  executedAt: answer.executedAt,
  status: "observed" as const,
  sourceIds: [answer.source.id],
  coverage:
    `Live provider capture; requested country ${answer.job.query.country}. UI locale, signed-in state and response market were not independently established. Only the returned answer and cited links were inspected. ${browser.limitations.join(" ")}`
      .slice(0, 1500)
      .trim(),
});

/** A model selects prose and exact quotes; it cannot manufacture sources, queries or browser steps. */
export const assembleResearch = (
  evidence: Evidence,
  assessment: z.infer<typeof assessmentOutputSchema>,
  days: number,
  options: {
    allowStaleEvidence?: boolean;
    allowProductObservations?: boolean;
    discoveryFreshnessDays?: number;
  } = {},
) =>
  resultify(() => {
    if (assessment.decision !== "supported" || !assessment.selected)
      return {
        status: "held" as const,
        reason:
          assessment.reason.slice(0, 1500) ||
          "No material difference was supported.",
      };
    const { answer, browser } = evidence;
    const competitors = assessment.competitors.map((item) => {
      const candidate = browser.candidates.find(
        (candidate) => candidate.url === item.url,
      );
      if (!candidate)
        throw new Error(
          "A selected competitor was not inspected in the browser.",
        );
      return { ...candidate, comparison: item.comparison };
    });
    const receipt = shoppingResearchSchema.parse({
      product: answer.job.query.product,
      sources: [answer.source, ...browser.sources],
      queries: [observedQuery(evidence)],
      ucp: browser.ucp,
      checkout: browser.checkout,
      competitors,
      selected: { ...assessment.selected, queryIndex: 0 },
    });
    const problem = validateAutomaticResearch(evidence, receipt, days, options);
    return problem
      ? { status: "held" as const, reason: problem }
      : { status: "researched" as const, receipt };
  });

export const validateAutomaticResearch = (
  { answer, browser }: Evidence,
  receipt: ShoppingResearch,
  days: number,
  options: {
    allowStaleEvidence?: boolean;
    allowProductObservations?: boolean;
    discoveryFreshnessDays?: number;
  } = {},
) => {
  const problem = validateShoppingResearch(receipt, days, Date.now(), options);
  if (problem) return problem;
  const sources = [answer.source, ...browser.sources];
  if (
    !isDeepStrictEqual(receipt.sources, sources) ||
    receipt.product.url !== answer.job.query.product.url ||
    receipt.product.name !== answer.job.query.product.name ||
    !isDeepStrictEqual(receipt.queries, [
      {
        ...observedQuery({ answer, browser }),
        ...(receipt.claims && answer.job.query.intent
          ? { intent: answer.job.query.intent }
          : {}),
        ...(receipt.claims && answer.job.query.basis
          ? { basis: answer.job.query.basis }
          : {}),
      },
    ]) ||
    !isDeepStrictEqual(receipt.ucp, browser.ucp) ||
    !isDeepStrictEqual(receipt.checkout, browser.checkout)
  )
    return "The finding no longer matches the original captures.";
  const raw = [...answer.raw, ...browser.raw];
  if (
    raw.some(
      (capture) =>
        createHash("sha256").update(capture.body).digest("hex") !==
        capture.sha256,
    ) ||
    sources.some(
      (source) =>
        !raw.some((capture) => source.artifact === `sha256:${capture.sha256}`),
    )
  )
    return "An original provider capture is missing or changed.";
  const product = sources.find(
    (source) =>
      source.kind === "product" &&
      source.capture === "browser" &&
      productCaptureUrlMatches(receipt.product.url, source.url),
  );
  if (
    !product ||
    !receipt.selected.sourceIds.includes(product.id) ||
    !receipt.selected.sourceIds.includes(answer.source.id)
  )
    return "The finding needs exact quotes from both the live answer and the rendered product.";
  if (
    receipt.checkout.status !== "notTested" ||
    ![
      "query-comparison",
      "product-data-gap",
      "product-observation",
      "discovery-absence",
      "discovery-outranked",
      "no-gap",
    ].includes(receipt.selected.kind)
  )
    return "This capture did not establish a checkout transition or a UCP-related shopping failure.";
  if (
    receipt.competitors.some(
      (competitor) =>
        !browser.candidates.some(
          (candidate) =>
            candidate.url === competitor.url &&
            candidate.product === competitor.product &&
            candidate.name === competitor.name &&
            JSON.stringify(candidate.sourceIds) ===
              JSON.stringify(competitor.sourceIds),
        ),
    ) ||
    receipt.competitors.some(
      (competitor) =>
        !competitor.sourceIds.some(
          (id) =>
            receipt.selected.sourceIds.includes(id) &&
            sources.some(
              (source) => source.id === id && source.capture === "browser",
            ),
        ),
    )
  )
    return "A compared product needs its rendered page and an exact selected quote.";
  return receipt.claims
    ? validateFactResearch({ answer, browser }, receipt)
    : null;
};

export type AssessmentResult = (
  | { status: "held"; reason: string; attempts?: number }
  | { status: "researched"; receipt: ShoppingResearch; attempts?: number }
) & {
  // Historical assessment records may retain this metadata; new calls never create a neutral fallback.
  usage?: { inputTokens: number | null; outputTokens: number | null };
  providerRequestId?: string | null;
  providerRequestIds?: string[];
  neutralFallback?: {
    attemptedAt: string;
    outcome: "researched" | "held" | "uncertain";
    originalOutput: unknown;
    originalAssessment: z.infer<typeof assessmentOutputSchema>;
    originalReason: string;
  };
};

/** New runtime assessment records facts. Legacy projector functions remain for old receipts. */
export const assess = async (
  input: Evidence & { playbook: Playbook; deadline: number },
  dependencies: import("./shopping-fact-assessment").FactAssessmentDependencies = {},
): Promise<Result<AssessmentResult, Error>> => {
  const { assessFacts } = await import("./shopping-fact-assessment");
  return assessFacts(input, dependencies);
};
