import { type Result, resultify } from "@zenncore/utils";
import {
  type Capture,
  type CaptureRequest,
  type Citation,
  isRedirectWrapped,
  type ShoppingCard,
  type Surface,
} from "@/lib/llm-scraping";
import { RequestError, TimeoutError } from "./error";
import { parse, request } from "./http";

// ScrapeLLM adapter — the first implementation of the provider interface from
// docs/tasks/llm-surface-scraping.md. Synchronous API: the connection holds
// until the surface finishes answering, no webhooks.

const HOST = "https://api.scrapellm.com/scrapers";

// ChatGPT with browsing routinely runs past a minute; ScrapeLLM's own ceiling
// is 600s with a 300s default.
const TIMEOUT = 180_000;

type Payload = {
  api_version?: string;
  scraper?: string;
  status?: string;
  job_id?: string;
  country?: string;
  result?: string | null;
  result_markdown?: string | null;
  // Both surfaces observed shipping the answer markdown as a hosted .md file
  // here instead of inline result_markdown.
  markdown_url?: string | null;
  url?: string | null;
  created_at?: string | null;
  credits_used?: number;
  elapsed_ms?: number | null;
  cached?: boolean;
  llm_model?: string;
  // chatgpt
  links?: unknown;
  // google_ai_mode
  citations?: unknown;
  search_results?: unknown;
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

// The key spellings seen across surfaces for anything link-shaped. Values stay
// unknown — `text()` decides what survives.
type Linkish = {
  url?: unknown;
  link?: unknown;
  href?: unknown;
  title?: unknown;
  text?: unknown;
  website_name?: unknown;
  snippet?: unknown;
  description?: unknown;
};

// Surfaces stamp tracking params on cited urls — ChatGPT appends
// utm_source=chatgpt.com to every link, Google adds srsltid. Strip them so
// citations join cleanly against merchant domains downstream; the verbatim
// urls survive in `raw`. The base also absolutizes the bare `/goto?url=…`
// relatives Google AI Mode emits into absolute urls — the only surface
// observed citing relative urls, so a Google origin is the right default.
const TRACKING = ["srsltid"];

const canonical = (url: string): string => {
  const parsed = resultify(() => new URL(url, "https://www.google.com"));
  if (!parsed.success) return url;

  for (const key of [...parsed.data.searchParams.keys()])
    if (key.startsWith("utm_") || TRACKING.includes(key))
      parsed.data.searchParams.delete(key);

  return parsed.data.toString();
};

// Two prds formats observed: `pvt:hg` (citation entries) keys the product as
// productid, `pvt:a` (markdown card modules) as productDocid — and mid can be
// absent entirely. gpcid appears in both, so it doubles as the gate.
const IDENTIFIER_KEYS = [
  "productid",
  "productDocid",
  "catalogid",
  "gpcid",
  "mid",
  "headlineOfferDocid",
];

const PRODUCT_MARKER = /(?:productid|gpcid):/;

// Google AI Mode cites its product cards as google.com/search?prds=… shopping-
// panel deep links. Those open blank outside the scrape's session — the durable
// signal is the ids the `prds` param encodes: product/catalog ids plus mid,
// the Merchant Center id that joins to the Google Merchant integration.
const shoppingIdentifiers = (url: string): Record<string, string> | null => {
  const parsed = resultify(() => new URL(url, "https://www.google.com"));
  if (!parsed.success) return null;
  if (!parsed.data.hostname.endsWith("google.com")) return null;

  const encoded = parsed.data.searchParams.get("prds");
  if (!encoded || !PRODUCT_MARKER.test(encoded)) return null;

  const identifiers = encoded.split(",").flatMap((pair) => {
    const divider = pair.indexOf(":");
    if (divider === -1) return [];

    const key = pair.slice(0, divider);
    const value = pair.slice(divider + 1);
    return IDENTIFIER_KEYS.includes(key) && value
      ? [[key, value] as const]
      : [];
  });

  return identifiers.length > 0 ? Object.fromEntries(identifiers) : null;
};

type Extraction = { citations: Citation[]; shoppingCards: ShoppingCard[] };

type Entry = { citation?: Citation; card?: ShoppingCard };

// Provider payload shapes drift and differ per surface (ChatGPT `links`,
// AI Mode `citations`/`search_results`), so extraction is defensive: keep
// anything with a resolvable url, in order, and drop the rest silently — the
// raw payload stays attached for re-parsing once shapes are pinned down.
// Product-entity links become shoppingCards; `position` stays the index in the
// source list for both, so card rank among all cited sources is preserved.
const extract = (value: unknown): Extraction => {
  if (!Array.isArray(value)) return { citations: [], shoppingCards: [] };

  const entries = value.flatMap((entry, index): Entry | Entry[] => {
    const position = index + 1;

    if (typeof entry === "string")
      return { citation: { url: canonical(entry), position } };
    if (typeof entry !== "object" || entry === null) return [];

    const record = entry as Linkish;
    const url = text(record.url) ?? text(record.link) ?? text(record.href);
    if (!url) return [];

    const title = text(record.title) ?? text(record.text);
    const source = text(record.website_name);
    const snippet = text(record.snippet) ?? text(record.description);
    const identifiers = shoppingIdentifiers(url);

    if (identifiers && title)
      return { card: { productName: title, snippet, identifiers, position } };

    return {
      citation: { url: canonical(url), title, snippet, source, position },
    };
  });

  return {
    citations: merge(entries.flatMap((entry) => entry.citation ?? [])),
    shoppingCards: entries.flatMap((entry) => entry.card ?? []),
  };
};

// Google AI Mode payloads interleave two records for many wrapped citations:
// an untitled entry carrying the real destination url (with favicon), directly
// followed by its titled /goto redirect twin from the same publisher. Merging
// the pair recovers the one field the wrapper destroys — the destination —
// while keeping the title and snippet. Unpaired /goto entries stay wrapped;
// their destination is not recoverable, only title/snippet/source are.
const merge = (citations: Citation[]): Citation[] => {
  const merged: Citation[] = [];

  for (const citation of citations) {
    const previous = merged[merged.length - 1];
    const paired =
      previous !== undefined &&
      previous.source !== undefined &&
      previous.source === citation.source &&
      previous.title === undefined &&
      !isRedirectWrapped(previous.url) &&
      isRedirectWrapped(citation.url);

    if (paired && previous)
      merged[merged.length - 1] = {
        ...citation,
        url: previous.url,
        position: previous.position,
      };
    else merged.push(citation);
  }

  return merged;
};

// AI Mode's result_markdown embeds every product card as an HTML module
// (<div html-index="…">): a prds product anchor, the headline price, the
// primary seller, a rating, and a per-merchant offer grid of /goto anchors.
// Cards can appear here that never surface in citations[] — observed 3 modules
// against 1 citation card on the same answer — so the markdown is the
// authoritative card list and citation-derived cards only supplement it.
const PRODUCT_ANCHOR = /<a href="([^"]*[?&]prds=[^"]*)">([^<]+)<\/a>/;
const PLAIN_DIV = /<div>\s*([^<>]+?)\s*<\/div>/g;
const PRICE = /[$€£][\d,]+(?:\.\d{2})?/;
const RATING = /^\d(?:\.\d)? \(/;
const OFFER =
  /<a href="\/goto[^"]*">([^<]+)<\/a>\s*<\/div>\s*<div[^>]*>\s*([$€£][\d,]+(?:\.\d{2})?)\s*<\/div>/g;

const decode = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .trim();

const markdownCards = (markdown: string | null): ShoppingCard[] => {
  if (!markdown) return [];

  const modules = markdown.split(/<div html-index="\d+"/).slice(1);

  return modules.flatMap((module, index) => {
    const anchor = module.match(PRODUCT_ANCHOR);
    const url = anchor?.[1];
    const name = anchor?.[2];
    if (!anchor || !url || !name) return [];

    const identifiers = shoppingIdentifiers(url);
    if (!identifiers) return [];

    const trailing = module.slice((anchor.index ?? 0) + anchor[0].length);
    const texts = [...trailing.matchAll(PLAIN_DIV)]
      .map((plain) => decode(plain[1] ?? ""))
      .filter(Boolean);
    const offers = [...trailing.matchAll(OFFER)].flatMap((offer) =>
      offer[1] ? { merchant: decode(offer[1]), price: offer[2] } : [],
    );

    return {
      productName: decode(name),
      merchant: texts.find((entry) => !RATING.test(entry)),
      price: trailing.match(PRICE)?.[0],
      rating: texts.find((entry) => RATING.test(entry)),
      identifiers,
      offers: offers.length > 0 ? offers : undefined,
      position: index + 1,
    };
  });
};

// The readable answer, extracted like citations are: markdown with embedded
// card HTML stripped down to its inner text, inline citation markers
// (([NYCMode][2])) and the trailing reference-link list removed, and Google's
// accessibility artifacts dropped. Falls back to the plain result text, which
// carries the same artifacts but no HTML.
const CONTENT_NOISE = [
  { pattern: /<[^>]*>/g, replacement: "" },
  { pattern: /\(\[[^\]]*\]\[\d+\]\)/g, replacement: "" },
  { pattern: /^\[\d+\]:\s.*$/gm, replacement: "" },
  { pattern: /Go to product viewer dialog for this item\./g, replacement: "" },
  { pattern: /[ \t]+$/gm, replacement: "" },
  { pattern: /\n{3,}/g, replacement: "\n\n" },
];

const contentOf = (markdown: string | null): string | null => {
  if (!markdown) return null;

  const content = decode(
    CONTENT_NOISE.reduce(
      (cleaned, noise) => cleaned.replace(noise.pattern, noise.replacement),
      markdown,
    ),
  );

  return content || null;
};

// The commerce identity of a card — gpcid appears in both prds formats,
// catalogid is the backstop.
const identity = (card: ShoppingCard): string | undefined =>
  Object.entries(card.identifiers ?? {}).find(
    ([key]) => key === "gpcid" || key === "catalogid",
  )?.[1];

// Markdown cards win (they carry price/seller/offers and the full card list);
// citation-derived cards are appended only when they name a product the
// markdown did not. Appended cards keep their citation-list position.
const mergeCards = (
  authoritative: ShoppingCard[],
  cited: ShoppingCard[],
): ShoppingCard[] => {
  if (authoritative.length === 0) return cited;

  const known = new Set(authoritative.map(identity).filter(Boolean));
  return [
    ...authoritative,
    ...cited.filter((card) => !known.has(identity(card))),
  ];
};

const normalize = (
  payload: Payload,
  {
    surface,
    runIndex,
    country,
    prompt,
    latency,
    markdown,
  }: {
    surface: Surface;
    runIndex: number;
    country: string;
    prompt: string;
    latency: number;
    markdown: string | null;
  },
): Capture => {
  const cited = extract(payload.citations ?? payload.links);
  const panel = extract(payload.search_results);

  return {
    surface,
    channel: "ui",
    provider: "scrapellm",
    runIndex,
    geo: payload.country ?? country,
    prompt,
    status: "completed",
    model: payload.llm_model ?? null,
    answerText: payload.result ?? null,
    answerMarkdown: markdown,
    answerContent: contentOf(markdown ?? payload.result ?? null),
    citations: cited.citations,
    searchResults: panel.citations,
    shoppingCards: mergeCards(markdownCards(markdown), [
      ...cited.shoppingCards,
      ...panel.shoppingCards,
    ]),
    fanOutQueries: [],
    shareUrl: payload.url ?? null,
    cached: payload.cached ?? false,
    costCredits: payload.credits_used ?? null,
    latencyMs: payload.elapsed_ms ?? latency,
    capturedAt: new Date().toISOString(),
    raw: payload,
  };
};

export const execute = async ({
  surface,
  prompt,
  country,
  bypassCache,
  runIndex,
}: CaptureRequest): Promise<Result<Capture, Error>> => {
  const key = process.env.SCRAPELLM_API_KEY;
  if (!key)
    return {
      success: false,
      error: new Error("SCRAPELLM_API_KEY is not configured"),
    };

  const parameters = new URLSearchParams({ prompt, country });
  if (bypassCache) parameters.set("bypass_cache", "true");

  const started = performance.now();

  const response = await request(
    `${HOST}/${surface}?${parameters}`,
    { headers: { "X-API-Key": key } },
    { timeout: TIMEOUT },
  );

  const payload = await parse<Payload>(response);
  if (!payload.success) return payload;

  return {
    success: true,
    data: normalize(payload.data, {
      surface,
      runIndex,
      country,
      prompt,
      latency: Math.round(performance.now() - started),
      markdown: await hostedMarkdown(payload.data),
    }),
  };
};

// Both surfaces were observed shipping their markdown as a hosted .md file
// (markdown_url) rather than inline result_markdown. Fetching it costs no
// credits and failure is non-fatal — answerText still carries the result.
const hostedMarkdown = async (payload: Payload): Promise<string | null> => {
  if (payload.result_markdown) return payload.result_markdown;
  if (!payload.markdown_url) return null;

  const hosted = await request(payload.markdown_url, {}, { timeout: 15_000 });
  if (!hosted.success || !hosted.data.ok) return null;

  const body = await resultify(() => hosted.data.text());
  return body.success ? body.data : null;
};

const RETRYABLE = [408, 429, 500, 502, 503, 504];

// Splits provider failures so the future queue retries transient ones and never
// burns credits re-sending a prompt the platform already rejected (401/422).
export const isRetryable = (error: Error): boolean => {
  switch (true) {
    case error instanceof TimeoutError:
      return true;
    case error instanceof RequestError:
      return RETRYABLE.includes(error.statusCode ?? 0);
    default:
      return false;
  }
};
