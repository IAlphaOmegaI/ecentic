/**
 * The claim check pipeline: the model calls and page reads behind one run.
 * Every decision made from what they return lives in `claim-check-rules.ts`.
 *
 * Kept off the `"use server"` rail — a plain module that `claim-check.ts`
 * wraps in the session, billing and ownership gates.
 *
 * One run, in four stages with a shared deadline:
 * 1. Read the live product page and extract the listing's assertions.
 * 2. Ask ChatGPT, Claude and Gemini what they know (never showing them the
 *    merchant's values) and have Perplexity research each claim.
 * 3. Open the independent pages Perplexity cited, within a cap.
 * 4. One judging pass over page excerpts and assistant answers.
 * A failed model call costs its own stage, never the run.
 */

import { resultify } from "@zenncore/utils";
import { z } from "zod";
import * as AI from "../../utils/ai";
import * as HTTP from "../../utils/http";
import * as JsonLd from "../../utils/json-ld";
import {
  ASSISTANTS,
  type Assertion,
  type AssistantId,
  type AssistantRun,
  type AssistantView,
  CLAIM_KINDS,
  type Claim,
  type Comparison,
  type CoreFact,
  clip,
  compareAvailability,
  compareBrand,
  compareGtin,
  comparePrice,
  decideVerdict,
  type Evidence,
  excerptsFor,
  extractPageFacts,
  formatAmount,
  guidanceFor,
  hostOf,
  type ListingSnapshot,
  messageOf,
  type ProductInput,
  pageGap,
  parseAmount,
  parseResearch,
  partyOf,
  plainText,
  quoteIn,
  REPORT_VERSION,
  type Report,
  type StageStatus,
  selectAssertions,
  snapshotListing,
  summarize,
} from "./claim-check-rules";

const MAX_SOURCES_PER_CLAIM = 2;
const MAX_SOURCE_FETCHES = 8;
const PAGE_TIMEOUT_MS = 8000;
const SOURCE_TIMEOUT_MS = 6000;
const SOURCE_READ_LIMIT_BYTES = 2 * 1024 * 1024;
const MODEL_TIMEOUT_MS = 75_000;
/**
 * The whole run's budget. The action that starts it runs on a route with
 * `maxDuration = 300`, and `after()` lives inside that window — leave room to
 * write the row once the budget is spent.
 */
const RUN_BUDGET_MS = 240_000;

const signalWithin = (deadline: AbortSignal, ms: number) =>
  AbortSignal.any([deadline, AbortSignal.timeout(ms)]);

// ─── Claim extraction ───────────────────────────────────────────────────────

const extractionSchema = z.object({
  assertions: z.array(
    z.object({
      span: z
        .string()
        .describe(
          "The assertion copied VERBATIM from the listing — same words, same qualifiers ('up to', 'about', 'over'), no paraphrase",
        ),
      kind: z.enum(CLAIM_KINDS),
      attribute: z
        .string()
        .describe(
          "What it is about, in 1-4 plain words: 'battery life', 'weight', 'water resistance'",
        ),
      value: z
        .string()
        .nullable()
        .describe(
          "The asserted value without unit or qualifier ('12'), or null when there is none",
        ),
      unit: z
        .string()
        .nullable()
        .describe("Unit as written ('hours', 'oz'), or null"),
      qualifier: z
        .string()
        .nullable()
        .describe(
          "Hedge or bound exactly as written ('up to', 'over', 'about'), or null",
        ),
      checkable: z
        .boolean()
        .describe(
          "true when an outside source could confirm or refute it as written. Superlatives and vague praise ('premium', 'best in class') are false unless they name a measure, a comparison set and a source",
        ),
      relevance: z
        .enum(["high", "medium", "low"])
        .describe("How much this assertion would change a shopper's decision"),
    }),
  ),
});

const extractAssertions = async (
  listing: ListingSnapshot,
  signal: AbortSignal,
) => {
  const source = [listing.title, listing.description ?? ""].join("\n");
  const result = await AI.generate({
    label: "claim-check.extract",
    model: "gpt",
    output: extractionSchema,
    abortSignal: signal,
    maxRetries: 1,
    instructions: `You list the factual assertions a product listing makes, so each can be checked against outside sources.

Rules:
- Copy each assertion's span VERBATIM from the listing. Keep its qualifiers exactly: "up to 12 hours" must stay "up to 12 hours", never "12 hours".
- One assertion per span; split compound sentences into separate checkable statements only when each part is verbatim text.
- Include specifications, performance figures, certifications and test results, materials and origin, comparisons ("lighter than"), superlatives ("the best"), and policies (warranty, returns).
- Do not list price, stock status, brand name or barcode — those are checked separately.
- Never infer, translate or invent an assertion the text does not make.`,
    prompt: `LISTING TITLE: ${listing.title}
LISTING DESCRIPTION: ${listing.description ?? "(none)"}`,
  });
  return selectAssertions(result.assertions, source);
};

// ─── What the assistants say, asked neutrally ───────────────────────────────

const assistantSchema = z.object({
  recognized: z
    .boolean()
    .describe(
      "true only if you know this specific product, not just its brand or category",
    ),
  price: z
    .number()
    .nullable()
    .describe("Typical price you know for it, or null"),
  currency: z
    .string()
    .nullable()
    .describe("ISO currency of that price, or null"),
  availability: z.enum(["in_stock", "out_of_stock", "discontinued", "unknown"]),
  attributes: z.array(
    z.object({
      id: z.string().describe("The attribute id exactly as given"),
      value: z
        .string()
        .nullable()
        .describe(
          "What you know about it for THIS product, or null if you do not know",
        ),
    }),
  ),
});

type AssistantAnswer = z.infer<typeof assistantSchema>;

/**
 * The assistant is asked what it knows about each attribute — never shown the
 * merchant's value — so an answer that matches is the assistant's knowledge,
 * not agreement with a prompt. These are API model responses sampled during the
 * check, not captures of the consumer apps.
 */
const askAssistant = async (
  assistant: (typeof ASSISTANTS)[number],
  listing: ListingSnapshot,
  attributes: { id: string; attribute: string }[],
  storeHost: string | null,
  signal: AbortSignal,
) =>
  AI.generate({
    label: "claim-check.assistant",
    model: assistant.model,
    output: assistantSchema,
    abortSignal: signal,
    maxRetries: 1,
    instructions: `You are a shopping assistant answering from your own knowledge about one specific product.

Rules:
- Report only what you actually know about THIS product. If you do not know, use null or "unknown" — never estimate, and never derive a value from the product's name.
- Return one entry per attribute id given, in the same order.`,
    prompt: `PRODUCT: ${listing.title}
BRAND: ${listing.brand ?? "(unknown)"}
SKU: ${listing.sku ?? "(unknown)"}
GTIN: ${listing.gtin ?? "(unknown)"}
SOLD AT: ${storeHost ?? "(unknown store)"}

What do you know about this product's price, whether it is currently sold, and these attributes?
${attributes.map((entry) => `${entry.id}: ${entry.attribute}`).join("\n") || "(no attributes)"}`,
  });

/**
 * An assistant that says it does not know this exact product is guessing from
 * its name or category; nothing it states about the product counts, for or
 * against.
 */
const UNKNOWN_VIEW = { stance: "unknown", value: null } as const;

const corePriceView = (
  answer: AssistantAnswer,
  listing: ListingSnapshot,
): Omit<AssistantView, "assistant"> => {
  const amount = parseAmount(listing.price);
  if (!answer.recognized || answer.price === null) return UNKNOWN_VIEW;
  const value = formatAmount(answer.price, answer.currency);
  const comparable =
    !answer.currency ||
    !listing.currency ||
    answer.currency.toUpperCase() === listing.currency.toUpperCase();
  if (amount === null || !comparable) return { stance: "unknown", value };
  // Within 10%: an assistant quoting a typical price is not wrong over a sale.
  const close = Math.abs(answer.price - amount) <= amount * 0.1;
  return { stance: close ? "agrees" : "diverges", value };
};

const coreAvailabilityView = (
  answer: AssistantAnswer,
  listing: ListingSnapshot,
): Omit<AssistantView, "assistant"> => {
  if (!answer.recognized || answer.availability === "unknown")
    return UNKNOWN_VIEW;
  const said = answer.availability === "in_stock" ? "in_stock" : "out_of_stock";
  if (listing.availability === "unknown")
    return { stance: "unknown", value: answer.availability };
  return {
    stance: said === listing.availability ? "agrees" : "diverges",
    value: answer.availability,
  };
};

// ─── Web research: Perplexity, citations only ───────────────────────────────

const research = async (
  listing: ListingSnapshot,
  claims: { label: string; claim: Assertion }[],
  storeHost: string | null,
  signal: AbortSignal,
) => {
  const result = await AI.generate({
    label: "claim-check.research",
    model: "sonar",
    abortSignal: signal,
    maxRetries: 1,
    prompt: `Find independent evidence about specific claims made for this product. Use sources OTHER than ${storeHost ?? "the seller's own store"} and other than the brand's own website: reviews, retailer listings, test reports, certification registries, forums.

PRODUCT: ${listing.title}
BRAND: ${listing.brand ?? "(unknown)"}
${listing.sku ? `SKU: ${listing.sku}\n` : ""}${listing.gtin ? `GTIN: ${listing.gtin}\n` : ""}
CLAIMS:
${claims.map(({ label, claim }) => `${label}: ${claim.span}`).join("\n")}

Answer every claim in exactly this format, one section per claim, citing sources with [n] markers:
### C1
STATUS: supported | contradicted | no evidence
NOTE: one sentence on what the sources say about THIS product, with citations.`,
  });

  // Position-preserving: marker [n] means position n of what the provider
  // returned, so a source that is not an http(s) URL becomes a hole rather than
  // being removed (which would shift every later marker onto the wrong link).
  const sources = result.sources.map((source) =>
    source.sourceType === "url" && /^https?:\/\//i.test(source.url)
      ? source.url
      : null,
  );
  return {
    sources: sources.filter((url) => url !== null).length,
    findings: parseResearch(
      result.text,
      claims.map(({ label }) => label),
      sources,
    ),
  };
};

/**
 * Reads a cited page. Returns the URL that actually answered: a citation can
 * redirect anywhere — including back to the merchant's own store — so who
 * stands behind the text is judged from where it came from, not where the
 * citation pointed.
 */
const readSource = async (url: string) => {
  const page = await HTTP.page(url, {
    timeout: SOURCE_TIMEOUT_MS,
    limit: SOURCE_READ_LIMIT_BYTES,
  });
  if (!page.success || page.data.status < 200 || page.data.status >= 300)
    return null;
  const type = page.data.headers.get("content-type") ?? "";
  if (!/html|text\/plain/i.test(type)) return null;
  return { url: page.data.url || url, text: plainText(page.data.body) };
};

// ─── Judging excerpts and assistant answers against each claim ──────────────

const judgeSchema = z.object({
  excerpts: z.array(
    z.object({
      id: z.string(),
      relation: z.enum(["supports", "contradicts", "unrelated"]),
      quote: z
        .string()
        .nullable()
        .describe(
          "The shortest sentence copied VERBATIM from the excerpt that supports or contradicts; null when unrelated",
        ),
    }),
  ),
  assistants: z.array(
    z.object({
      id: z.string(),
      stance: z.enum(["agrees", "diverges", "unclear"]),
    }),
  ),
});

type ExcerptItem = { id: string; claim: Assertion; excerpt: string };
type AnswerItem = { id: string; claim: Assertion; answer: string };

const describeClaim = (claim: Assertion) =>
  `"${claim.span}" (attribute: ${claim.attribute}${claim.value ? `; value: ${[claim.qualifier, claim.value, claim.unit].filter(Boolean).join(" ")}` : ""})`;

const judge = async (
  listing: ListingSnapshot,
  excerpts: ExcerptItem[],
  answers: AnswerItem[],
  signal: AbortSignal,
) =>
  AI.generate({
    label: "claim-check.judge",
    model: "gpt",
    output: judgeSchema,
    abortSignal: signal,
    maxRetries: 1,
    instructions: `You compare a product listing's claims against two kinds of input, item by item. You add no knowledge of your own.

EXCERPTS (E items) are text from web pages. For each:
- "supports" only if the excerpt states the same attribute for THIS product with a compatible value. Respect qualifiers: "up to 12 hours" is supported by "12 hours", not by "15 hours".
- "contradicts" only if it states a different value for this same product.
- "unrelated" for anything else: other products, general category facts, the claim merely repeated as an ad.
- For supports/contradicts, copy the shortest sentence VERBATIM from the excerpt into quote.

ANSWERS (A items) are what an AI assistant said about one attribute. "agrees" when its value is compatible with the claim, "diverges" when it states a different value, "unclear" when it cannot be compared.

Return one entry per item id. Never invent ids.`,
    prompt: `PRODUCT: ${listing.title}

${excerpts.map((item) => `${item.id} — claim ${describeClaim(item.claim)}\nexcerpt: ${item.excerpt}`).join("\n\n") || "(no excerpts)"}

${answers.map((item) => `${item.id} — claim ${describeClaim(item.claim)}\nassistant said: ${item.answer}`).join("\n\n") || "(no answers)"}`,
  });

// ─── The run ────────────────────────────────────────────────────────────────

export type RunInput = {
  product: ProductInput;
  store: { domain: string; storefrontHosts: string[] | null };
  startedAt: Date;
};

// Product URLs come from whatever the catalog said, so the read is guarded —
// every redirect hop SSRF-checked, the body size-capped.
const readProductPage = async (url: string | null) => {
  if (!url) return { status: "no-url" as const, html: null, retrievedAt: null };
  const page = await HTTP.page(url, { timeout: PAGE_TIMEOUT_MS });
  const retrievedAt = new Date().toISOString();
  if (!page.success || page.data.status < 200 || page.data.status >= 300)
    return { status: "unreachable" as const, html: null, retrievedAt };
  return { status: "fetched" as const, html: page.data.body, retrievedAt };
};

export const runClaimCheck = async ({
  product,
  store,
  startedAt,
}: RunInput): Promise<Report> => {
  const deadline = AbortSignal.timeout(RUN_BUDGET_MS);
  const listing = snapshotListing(product);
  const storeHost = hostOf(
    store.domain.startsWith("http") ? store.domain : `https://${store.domain}`,
  );
  const merchantHosts = [
    ...new Set(
      [
        storeHost,
        listing.url ? hostOf(listing.url) : null,
        ...(store.storefrontHosts ?? []).map((host) =>
          host.toLowerCase().replace(/^www\./, ""),
        ),
      ].filter((host): host is string => !!host),
    ),
  ];

  // Stage 1 — the live page and the listing's assertions, side by side.
  const [pageRead, extraction] = await Promise.all([
    readProductPage(listing.url),
    resultify(() =>
      extractAssertions(listing, signalWithin(deadline, MODEL_TIMEOUT_MS)),
    ),
  ]);

  const pageFacts =
    pageRead.html !== null ? extractPageFacts(pageRead.html, listing) : null;
  const pageStatus: Report["page"]["status"] = (() => {
    switch (true) {
      case pageRead.status !== "fetched":
        return pageRead.status;
      case JsonLd.jsonLdBlocks(pageRead.html ?? "").length === 0 ||
        ((pageFacts?.matched ?? 0) === 0 && !pageFacts?.ambiguous):
        return "missing";
      default:
        return "found";
    }
  })();
  const comparablePage =
    pageStatus === "found" && pageFacts && !pageFacts.ambiguous
      ? pageFacts
      : null;

  const assertions = extraction.success ? extraction.data.claims : [];
  const checkable = assertions.filter((claim) => claim.checkable);
  const labelled = checkable.map((claim, index) => ({
    label: `C${index + 1}`,
    claim,
  }));

  // Stage 2 — the assistants and the web research, all in parallel.
  const attributes = labelled.map(({ label, claim }) => ({
    id: label,
    attribute: claim.attribute,
  }));
  const [answers, researched] = await Promise.all([
    Promise.all(
      ASSISTANTS.map(async (assistant) => ({
        assistant,
        result: await resultify(() =>
          askAssistant(
            assistant,
            listing,
            attributes,
            storeHost,
            signalWithin(deadline, MODEL_TIMEOUT_MS),
          ),
        ),
      })),
    ),
    labelled.length > 0
      ? resultify(() =>
          research(
            listing,
            labelled,
            storeHost,
            signalWithin(deadline, MODEL_TIMEOUT_MS),
          ),
        )
      : Promise.resolve(null),
  ]);

  const findings = researched?.success ? researched.data.findings : null;

  // Stage 3 — open the independent pages Perplexity cited, within a cap.
  const retrievedAt = new Date().toISOString();
  const candidates = labelled.flatMap(({ label, claim }) =>
    (findings?.get(label)?.urls ?? [])
      .filter(
        (url) => partyOf(url, merchantHosts, listing.brand) === "independent",
      )
      .slice(0, MAX_SOURCES_PER_CLAIM)
      .map((url) => ({ label, claim, url })),
  );
  const urls = [...new Set(candidates.map((entry) => entry.url))].slice(
    0,
    MAX_SOURCE_FETCHES,
  );
  const pages = new Map(
    await Promise.all(
      urls.map(async (url) => [url, await readSource(url)] as const),
    ),
  );
  // Independence is re-judged on where the text actually came from: a
  // citation that redirected into the merchant's store is the merchant's word.
  const independentPage = (url: string) => {
    const page = pages.get(url);
    return page &&
      partyOf(page.url, merchantHosts, listing.brand) === "independent"
      ? page
      : null;
  };

  const excerptItems: (ExcerptItem & {
    url: string;
    citedUrl: string;
    label: string;
  })[] = candidates.flatMap(({ label, claim, url }) => {
    const page = independentPage(url);
    if (!page) return [];
    return excerptsFor(page.text, claim).map((excerpt, index) => ({
      id: `E${label.slice(1)}-${urls.indexOf(url) + 1}-${index + 1}`,
      claim,
      excerpt,
      url: page.url,
      citedUrl: url,
      label,
    }));
  });

  // First answer per attribute id: a model repeating an id must not get two
  // judged answers for one claim.
  const knownAnswers = new Map(
    answers.map(({ assistant, result }) => [
      assistant.id,
      result.success && result.data.recognized
        ? new Map(
            [...result.data.attributes]
              .reverse()
              .map((entry) => [entry.id, entry.value] as const),
          )
        : null,
    ]),
  );

  const answerItems: (AnswerItem & {
    assistant: AssistantId;
    label: string;
  })[] = ASSISTANTS.flatMap((assistant) =>
    labelled.flatMap(({ label, claim }) => {
      const value = knownAnswers.get(assistant.id)?.get(label) ?? null;
      if (!value) return [];
      return [
        {
          id: `A-${assistant.id}-${label}`,
          claim,
          answer: clip(value, 300),
          assistant: assistant.id,
          label,
        },
      ];
    }),
  );

  // Stage 4 — one judging pass over everything gathered.
  const judged =
    excerptItems.length + answerItems.length > 0
      ? await resultify(() =>
          judge(
            listing,
            excerptItems,
            answerItems,
            signalWithin(deadline, MODEL_TIMEOUT_MS),
          ),
        )
      : null;
  const excerptVerdicts = new Map(
    (judged?.success ? judged.data.excerpts : []).map((entry) => [
      entry.id,
      entry,
    ]),
  );
  const answerVerdicts = new Map(
    (judged?.success ? judged.data.assistants : []).map((entry) => [
      entry.id,
      entry.stance,
    ]),
  );

  const claims = assertions.map((claim): Claim => {
    const label =
      labelled.find((entry) => entry.claim === claim)?.label ?? null;
    const finding = label ? (findings?.get(label) ?? null) : null;

    const pageEvidence = excerptItems
      .filter((item) => item.label === label)
      .flatMap((item): Evidence[] => {
        const verdict = excerptVerdicts.get(item.id);
        const quote = quoteIn(verdict?.quote ?? null, item.excerpt);
        if (!verdict || verdict.relation === "unrelated" || !quote) return [];
        return [
          {
            kind: "page",
            url: item.url,
            citedUrl: item.citedUrl === item.url ? null : item.citedUrl,
            host: hostOf(item.url) ?? item.url,
            party: "independent",
            relation: verdict.relation,
            quote,
            summary: null,
            retrievedAt,
          },
        ];
      })
      // One entry per page and direction: two windows of the same page
      // agreeing are one source, not two.
      .filter(
        (entry, index, all) =>
          all.findIndex(
            (other) =>
              other.url === entry.url && other.relation === entry.relation,
          ) === index,
      );
    const confirmed = new Set(
      pageEvidence.map((entry) => entry.citedUrl ?? entry.url),
    );
    const citationEvidence = (finding?.urls ?? [])
      .filter((url) => !confirmed.has(url))
      .map(
        (url): Evidence => ({
          kind: "citation",
          url,
          citedUrl: null,
          host: hostOf(url) ?? url,
          party: partyOf(url, merchantHosts, listing.brand),
          relation:
            finding?.status === "supported"
              ? "supports"
              : finding?.status === "contradicted"
                ? "contradicts"
                : "unrelated",
          quote: null,
          summary: finding?.note ?? null,
          retrievedAt,
        }),
      );
    const evidence = [...pageEvidence, ...citationEvidence];

    const decided = decideVerdict({
      checkable: claim.checkable,
      // Researched means a section for THIS claim came back, not merely that
      // the call succeeded: a claim the answer skipped was never looked up.
      researched: finding !== null,
      evidence,
      cited: finding,
    });

    const views = answers.flatMap(({ assistant, result }): AssistantView[] => {
      if (!result.success || !label) return [];
      const known = knownAnswers.get(assistant.id);
      const value = known?.get(label) ?? null;
      const stance = answerVerdicts.get(`A-${assistant.id}-${label}`);
      return [
        {
          assistant: assistant.id,
          stance: value && stance && stance !== "unclear" ? stance : "unknown",
          value,
        },
      ];
    });

    return {
      ...claim,
      ...decided,
      evidence,
      assistants: views,
      guidance: guidanceFor(decided.verdict, claim.kind),
    };
  });

  const gap = pageGap(pageStatus, pageFacts);
  const withGap = (comparison: Comparison): Comparison =>
    gap &&
    comparison.consistency === "unknown" &&
    comparison.note !== "missing-in-listing"
      ? { ...comparison, note: gap }
      : comparison;
  const assistantViews = (
    view: (
      answer: AssistantAnswer,
      listing: ListingSnapshot,
    ) => Omit<AssistantView, "assistant">,
  ) =>
    answers.flatMap(({ assistant, result }): AssistantView[] =>
      result.success
        ? [{ assistant: assistant.id, ...view(result.data, listing) }]
        : [],
    );

  const coreFacts: CoreFact[] = [
    {
      key: "price",
      ...withGap(comparePrice(listing, comparablePage)),
      assistants: assistantViews(corePriceView),
    },
    {
      key: "availability",
      ...withGap(compareAvailability(listing, comparablePage)),
      assistants: assistantViews(coreAvailabilityView),
    },
    {
      key: "gtin",
      ...withGap(compareGtin(listing, comparablePage)),
      assistants: [],
    },
    {
      key: "brand",
      ...withGap(compareBrand(listing.brand, comparablePage)),
      assistants: [],
    },
  ];

  // Coverage per claim, not per call: an answer that parsed for some claims
  // only is partial, one that parsed for none is as good as no answer.
  const researchStatus = ((): StageStatus => {
    if (researched === null) return "skipped";
    if (!researched.success) return "failed";
    const covered = labelled.filter(({ label }) => findings?.has(label)).length;
    if (covered === labelled.length) return "ok";
    return covered > 0 ? "partial" : "failed";
  })();

  const assistantRuns = answers.map(
    ({ assistant, result }): AssistantRun => ({
      assistant: assistant.id,
      label: assistant.label,
      model: assistant.model,
      status: result.success ? "ok" : "failed",
      error: result.success ? null : messageOf(result.error),
      recognized: result.success ? result.data.recognized : null,
    }),
  );

  return {
    version: REPORT_VERSION,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    listing,
    page: {
      status: pageStatus,
      url: listing.url,
      retrievedAt: pageRead.retrievedAt,
    },
    coreFacts,
    claims,
    extraction: {
      status: extraction.success ? "ok" : "failed",
      error: extraction.success ? null : messageOf(extraction.error),
      found: extraction.success ? extraction.data.found : 0,
    },
    assistants: assistantRuns,
    research: {
      status: researchStatus,
      error:
        researched && !researched.success
          ? messageOf(researched.error)
          : researchStatus === "failed"
            ? "The research answer had no readable section for any claim."
            : null,
      sources: researched?.success ? researched.data.sources : 0,
    },
    sources: {
      attempted: urls.length,
      read: [...pages.values()].filter((page) => page !== null).length,
    },
    judge: {
      status: judged === null ? "skipped" : judged.success ? "ok" : "failed",
      error: judged && !judged.success ? messageOf(judged.error) : null,
    },
    summary: summarize(claims, coreFacts),
  };
};
