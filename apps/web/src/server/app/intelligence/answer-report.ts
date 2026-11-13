import { domainToUnicode } from "node:url";
import { resultify } from "@zenncore/utils";
import {
  type Capture,
  type Citation,
  DEFAULT_COUNTRY,
  isRedirectWrapped,
  isSurface,
  SURFACES,
  type Surface,
} from "@/lib/llm-scraping";
import { normalizeDomain, rootLabel } from "../../utils/domain";
import { proseOf } from "../../utils/scrapellm";

/**
 * Input resolution, store evidence and rendering for the headless
 * `/api/dev/ai-answers` endpoint: one prompt run through real AI surfaces via
 * ScrapeLLM, answered as Markdown (or JSON) with literal evidence of where a
 * given store shows up. Evidence only, never a score — mention/share
 * extraction is the downstream layer in docs/tasks/llm-surface-scraping.md.
 */

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

// What people type for a surface, mapped onto the ScrapeLLM path segment. Only
// names for surfaces that exist — a new `Surface` resolves by its own id via
// `isSurface` with no entry here.
const PROVIDER_ALIASES = new Map<string, Surface>([
  ["openai", "chatgpt"],
  ["gpt", "chatgpt"],
  ["chat_gpt", "chatgpt"],
  ["google", "google_ai_mode"],
  ["ai_mode", "google_ai_mode"],
  ["aimode", "google_ai_mode"],
  ["google_aimode", "google_ai_mode"],
]);

export const resolveProvider = (value: string): Surface | null => {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (isSurface(key)) return key;
  return PROVIDER_ALIASES.get(key) ?? null;
};

// ScrapeLLM routes by ISO 3166-1 alpha-2 only. "UK" is the one non-ISO code
// people reliably reach for, so it is the one translated.
export const resolveCountry = (
  value: string | null | undefined,
): string | null => {
  const code = (value?.trim() || DEFAULT_COUNTRY).toUpperCase();
  const iso = code === "UK" ? "GB" : code;
  return /^[A-Z]{2}$/.test(iso) ? iso : null;
};

export type StoreTarget = {
  // Canonical bare host — lowercase, punycode, no www or trailing dot:
  // "https://www.Allbirds.com/x" → "allbirds.com".
  domain: string;
  // What prose and merchant names are matched on. Defaults to the domain's
  // first label; pass it explicitly when the brand reads differently.
  brand: string;
};

// The URL parser's host form — the same one cited urls get in `hostOf`, so an
// internationalized store ("bücher.de") matches its own citations.
const canonicalHost = (value: string): string | null => {
  const parsed = resultify(() => new URL(`https://${value}`));
  if (!parsed.success) return null;
  return normalizeDomain(parsed.data.hostname.replace(/\.$/, ""));
};

export const resolveStore = (
  store: string,
  brand?: string | null,
): StoreTarget | null => {
  const typed = normalizeDomain(store);
  const domain = canonicalHost(typed);

  // A store is a real host: "com" alone would match every .com citation.
  if (!domain?.includes(".") || domain.split(".").some((label) => !label))
    return null;

  // The brand comes from the typed label, not the punycode one.
  return { domain, brand: brand?.trim() || rootLabel(typed) };
};

// ---------------------------------------------------------------------------
// Store evidence
// ---------------------------------------------------------------------------

// Below this a brand is too ambiguous to search prose for or to find inside a
// longer seller name ("on.com" → "on"); the domain itself is still matched.
const MIN_BRAND_LENGTH = 3;

const EXCERPT_LIMIT = 3;
const EXCERPT_RADIUS = 80;

type CitationMatch = {
  position: number;
  url: string;
  title?: string;
  source?: string;
  // "domain" — the cited url is on the store's domain. "publisher" — a Google
  // `/goto` redirect, whose destination is not recoverable, whose publisher
  // name names the store.
  matchedBy: "domain" | "publisher";
};

type CitationEvidence = {
  matched: CitationMatch[];
  total: number;
  // Google `/goto` redirects in the list — matchable by publisher name only.
  wrapped: number;
};

type CardMatch = {
  position: number;
  productName: string;
  // "seller" — the card's headline merchant. "offer" — one of the competing
  // sellers in the card's offer grid.
  role: "seller" | "offer";
  merchant: string;
  price?: string;
};

export type StoreEvidence = {
  target: StoreTarget;
  brandSearchable: boolean;
  // Prose only — shopping-card text is reported under shoppingCards.
  mentions: { count: number; excerpts: string[] };
  // Links inside the answer pointing at the store's domain.
  links: { matched: { text: string; url: string }[]; total: number };
  citations: CitationEvidence;
  searchResults: CitationEvidence;
  shoppingCards: { matched: CardMatch[]; total: number };
};

const hostOf = (url: string): string | null => {
  const parsed = resultify(() => new URL(url));
  return parsed.success
    ? normalizeDomain(parsed.data.hostname.replace(/\.$/, ""))
    : null;
};

const onDomain = (url: string, domain: string): boolean => {
  const host = hostOf(url);
  return host !== null && (host === domain || host.endsWith(`.${domain}`));
};

// Unicode-aware words: "Allbirds Official Store" → [allbirds, official, store].
const words = (value: string): string[] =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const containsRun = (haystack: string[], needle: string[]): boolean =>
  needle.length > 0 &&
  haystack.some((_, start) =>
    needle.every((word, offset) => haystack[start + offset] === word),
  );

// A seller or publisher name names the store when the two read the same once
// spacing and punctuation are ignored ("All Birds" ↔ "Allbirds",
// "Allbirds.com" ↔ allbirds.com), or when its words contain the brand's words
// in order ("REI Co-op" → REI). Whole words, never a substring: "Sniker
// Shoes" is not Nike, "notnike.com" is not nike.com.
const namesStore = (name: string | undefined, target: StoreTarget): boolean => {
  if (!name) return false;

  const nameWords = words(name);
  const brandWords = words(target.brand);
  const joined = nameWords.join("");
  const brand = brandWords.join("");

  return (
    (joined.length > 0 &&
      (joined === brand || joined === words(target.domain).join(""))) ||
    (brand.length >= MIN_BRAND_LENGTH && containsRun(nameWords, brandWords))
  );
};

// A resolvable url is authoritative — only a Google `/goto` redirect, which
// hides its destination, falls back to the publisher name.
const matchCitations = (
  citations: Citation[],
  target: StoreTarget,
): CitationEvidence => ({
  matched: citations.flatMap((citation): CitationMatch[] => {
    const matchedBy = (() => {
      switch (true) {
        case isRedirectWrapped(citation.url):
          return namesStore(citation.source, target)
            ? ("publisher" as const)
            : null;
        case onDomain(citation.url, target.domain):
          return "domain" as const;
        default:
          return null;
      }
    })();

    if (!matchedBy) return [];

    return [
      {
        position: citation.position,
        url: citation.url,
        title: citation.title,
        source: citation.source,
        matchedBy,
      },
    ];
  }),
  total: citations.length,
  wrapped: citations.filter((citation) => isRedirectWrapped(citation.url))
    .length,
});

const escapePattern = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const flatten = (value: string): string =>
  value.replace(/\s+/g, " ").trim() || "—";

// Scripts written without spaces between words (Han, kana, Thai…) have no word
// boundary to check — requiring one would hide 无印良品 inside 无印良品的.
const SPACED_SCRIPT =
  /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{N}]/u;

const brandTerm = (brand: string): string => {
  const trimmed = brand.trim();
  const lead = SPACED_SCRIPT.test(trimmed.at(0) ?? "")
    ? "(?<![\\p{L}\\p{N}])"
    : "";
  const tail = SPACED_SCRIPT.test(trimmed.at(-1) ?? "")
    ? "(?![\\p{L}\\p{N}])"
    : "";
  return `${lead}${escapePattern(trimmed).replace(/\s+/g, "\\s+")}${tail}`;
};

// A domain is bounded as a host: "evil-allbirds.com" and
// "allbirds.com.evil.example" are other hosts. A leading dot stays allowed —
// "shop.allbirds.com" is the store.
const domainTerm = (domain: string): string =>
  `(?<![\\p{L}\\p{N}-])${escapePattern(domain)}(?![\\p{L}\\p{N}-]|\\.[\\p{L}\\p{N}])`;

// Domain alternatives come first so "allbirds.com" counts once, not once for
// the domain and again for the brand inside it. Prose carries an
// internationalized domain in its Unicode form, the target in punycode.
const mentionPattern = (
  target: StoreTarget,
  brandSearchable: boolean,
): RegExp => {
  const domains = [
    ...new Set([target.domain, domainToUnicode(target.domain)]),
  ].filter(Boolean);

  const terms = [
    ...domains.map(domainTerm),
    ...(brandSearchable ? [brandTerm(target.brand)] : []),
  ];

  return new RegExp(terms.join("|"), "giu");
};

// A mention is what a reader sees: markdown links reduce to their text, so a
// store domain inside a link destination (already a citation) is not counted
// and excerpts are not swamped by Google's long shopping deep links. Handles
// <bracketed> and one level of (balanced) destinations and all three title
// quotes. Link text excludes `[` so an unmatched bracket cannot make the scan
// quadratic. Groups: 1 text, 2 <bracketed> destination, 3 bare destination.
const MARKDOWN_LINK =
  /\[([^[\]]*)\]\((?:<([^<>\n]*)>|((?:[^()\s]|\([^()\s]*\))*))(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?\)/g;

// Links written into the answer itself — on ChatGPT the "Buy: [Retailer](…)"
// placements live only here, never in `links[]`. Read from the raw markdown:
// `answerContent` strips <bracketed> destinations along with HTML tags.
const findLinks = (
  markdown: string | null,
  target: StoreTarget,
): StoreEvidence["links"] => {
  const links = [...(markdown ?? "").matchAll(MARKDOWN_LINK)].flatMap(
    (match) => {
      const url = match[2] ?? match[3];
      return url ? [{ text: match[1] ?? "", url }] : [];
    },
  );

  return {
    matched: links.filter((link) => onDomain(link.url, target.domain)),
    total: links.length,
  };
};

const findMentions = (
  markdown: string | null,
  target: StoreTarget,
  brandSearchable: boolean,
): StoreEvidence["mentions"] => {
  if (!markdown) return { count: 0, excerpts: [] };

  const content = markdown.replace(MARKDOWN_LINK, "$1");
  const matches = [
    ...content.matchAll(mentionPattern(target, brandSearchable)),
  ];

  const excerpts = matches.slice(0, EXCERPT_LIMIT).map((match) => {
    const start = Math.max(0, (match.index ?? 0) - EXCERPT_RADIUS);
    const end = Math.min(
      content.length,
      (match.index ?? 0) + match[0].length + EXCERPT_RADIUS,
    );
    const lead = start > 0 ? "…" : "";
    const tail = end < content.length ? "…" : "";
    return `${lead}${flatten(content.slice(start, end))}${tail}`;
  });

  return { count: matches.length, excerpts };
};

export const assessStore = (
  capture: Capture,
  target: StoreTarget,
): StoreEvidence => {
  const brandSearchable =
    words(target.brand).join("").length >= MIN_BRAND_LENGTH;

  // Card modules removed: a store named only as a card's seller shows up under
  // shoppingCards, not again as a prose mention.
  const prose =
    capture.answerMarkdown !== null
      ? proseOf(capture.answerMarkdown)
      : (capture.answerContent ?? capture.answerText);

  return {
    target,
    brandSearchable,
    mentions: findMentions(prose, target, brandSearchable),
    links: findLinks(
      capture.answerMarkdown ?? capture.answerContent ?? capture.answerText,
      target,
    ),
    citations: matchCitations(capture.citations, target),
    searchResults: matchCitations(capture.searchResults, target),
    shoppingCards: {
      matched: capture.shoppingCards.flatMap((card): CardMatch[] => [
        ...(card.merchant && namesStore(card.merchant, target)
          ? [
              {
                position: card.position,
                productName: card.productName,
                role: "seller" as const,
                merchant: card.merchant,
                price: card.price,
              },
            ]
          : []),
        ...(card.offers ?? [])
          .filter((offer) => namesStore(offer.merchant, target))
          .map((offer) => ({
            position: card.position,
            productName: card.productName,
            role: "offer" as const,
            merchant: offer.merchant,
            price: offer.price,
          })),
      ]),
      total: capture.shoppingCards.length,
    },
  };
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export type AnswerOutcome =
  | {
      surface: Surface;
      status: "completed";
      capture: Capture;
      store: StoreEvidence | null;
    }
  | {
      surface: Surface;
      status: "failed";
      error: string;
      // Transient (timeout, 429, 5xx) — worth calling again.
      retryable: boolean;
    };

export type AnswerRun = {
  prompt: string;
  country: string;
  store: StoreTarget | null;
  outcomes: AnswerOutcome[];
};

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

// Provider text is data, not markup: one line, and nothing that opens a link,
// autolink or HTML tag. Backslashes first, so an escape in the source cannot
// cancel ours.
const inline = (value: string): string =>
  flatten(value).replace(/[\\[\]<>]/g, "\\$&");

const cell = (value: string): string => inline(value).replace(/\|/g, "\\|");

// Angle-bracket destinations survive parentheses in the url; whitespace and
// brackets are encoded so the destination cannot end early.
const link = (label: string, url: string): string =>
  `[${inline(label)}](<${url.replace(/[<>\s]/g, encodeURIComponent)}>)`;

// Every line break form — a bare \r would otherwise end the blockquote.
const quote = (content: string): string =>
  content
    .trim()
    .split(/\r\n?|\n/)
    .map((line) => (line.trim() ? `> ${line}` : ">"))
    .join("\n");

const label = (surface: Surface): string => SURFACES[surface].label;

const positions = (matches: { position: number }[]): string =>
  [...new Set(matches.map((match) => `#${match.position}`))].join(", ");

// Never a flat "absent": a Google `/goto` redirect hides its destination, so
// a miss among wrapped entries is a miss on publisher name only.
const citationVerdict = (evidence: CitationEvidence, noun: string): string => {
  const caveat =
    evidence.wrapped > 0
      ? ` (${evidence.wrapped} are Google redirects, matchable by publisher name only)`
      : "";

  if (evidence.total === 0) return `no ${noun} returned`;
  if (evidence.matched.length === 0)
    return `no match among ${evidence.total} ${noun}${caveat}`;

  const by = evidence.matched.some((match) => match.matchedBy === "publisher")
    ? " — some matched by publisher name, not url"
    : "";
  return `${positions(evidence.matched)} of ${evidence.total} ${noun}${by}`;
};

const cardVerdict = (evidence: StoreEvidence["shoppingCards"]): string => {
  if (evidence.total === 0) return "no shopping cards returned";
  if (evidence.matched.length === 0)
    return `no match among ${evidence.total} cards`;

  return evidence.matched
    .map(
      (match) =>
        `#${match.position} "${inline(match.productName)}" — ${match.role === "seller" ? "headline seller" : "listed offer"} (${inline(match.merchant)}${match.price ? `, ${inline(match.price)}` : ""})`,
    )
    .join("; ");
};

const mentionVerdict = (evidence: StoreEvidence): string => {
  const scope = evidence.brandSearchable
    ? `"${inline(evidence.target.brand)}" or ${evidence.target.domain}`
    : `${evidence.target.domain} (brand too short to search prose for — pass \`brand\`)`;

  if (evidence.mentions.count === 0) return `not mentioned (searched ${scope})`;

  const times = evidence.mentions.count === 1 ? "time" : "times";
  return `${evidence.mentions.count} ${times} (searched ${scope})`;
};

const linkVerdict = (evidence: StoreEvidence["links"]): string => {
  if (evidence.total === 0) return "no links in the answer";
  if (evidence.matched.length === 0)
    return `no match among ${evidence.total} links`;

  const texts = [
    ...new Set(evidence.matched.map((link) => `"${inline(link.text)}"`)),
  ].join(", ");
  return `${evidence.matched.length} of ${evidence.total} links (${texts})`;
};

const evidenceSection = (evidence: StoreEvidence): string => {
  const excerpts = evidence.mentions.excerpts.map(
    (excerpt) => `  > ${inline(excerpt)}`,
  );

  return [
    `### Store visibility — ${evidence.target.domain}`,
    "",
    `- Mentioned in the answer text: ${mentionVerdict(evidence)}`,
    ...excerpts,
    `- Linked in the answer: ${linkVerdict(evidence.links)}`,
    `- Cited: ${citationVerdict(evidence.citations, "citations")}`,
    `- Search results panel: ${citationVerdict(evidence.searchResults, "results")}`,
    `- Shopping cards: ${cardVerdict(evidence.shoppingCards)}`,
  ].join("\n");
};

const citationLine = (citation: Citation): string => {
  const title = citation.title ?? citation.source ?? citation.url;
  const source =
    citation.source && citation.source !== citation.title
      ? ` — ${inline(citation.source)}`
      : "";

  if (isRedirectWrapped(citation.url))
    return `${citation.position}. ${inline(title)}${source} _(Google redirect — destination not recoverable)_`;

  return `${citation.position}. ${link(title, citation.url)}${source}`;
};

const listSection = (heading: string, lines: string[]): string[] =>
  lines.length > 0
    ? [`### ${heading} (${lines.length})\n\n${lines.join("\n")}`]
    : [];

const seconds = (milliseconds: number | null): string =>
  milliseconds === null ? "n/a" : `${(milliseconds / 1000).toFixed(1)}s`;

const completedSection = (
  outcome: Extract<AnswerOutcome, { status: "completed" }>,
): string => {
  const { capture } = outcome;

  const facts = [
    `- Model: ${capture.model ? inline(capture.model) : "not reported"}`,
    `- Answered from: ${inline(capture.geo)}`,
    `- Cached: ${capture.cached ? "yes" : "no"} · Credits: ${capture.costCredits ?? "n/a"} · Latency: ${seconds(capture.latencyMs)}`,
    ...(capture.shareUrl
      ? [`- Surface link: ${inline(capture.shareUrl)}`]
      : []),
  ].join("\n");

  const answer = capture.answerContent ?? capture.answerText;

  const cards = capture.shoppingCards.map((card) => {
    const details = [card.merchant, card.price, card.rating]
      .flatMap((detail) => (detail ? [inline(detail)] : []))
      .join(" · ");
    const offers = card.offers?.length
      ? ` — offers: ${card.offers.map((offer) => `${inline(offer.merchant)}${offer.price ? ` ${inline(offer.price)}` : ""}`).join(", ")}`
      : "";
    return `${card.position}. **${inline(card.productName)}**${details ? ` — ${details}` : ""}${offers}`;
  });

  return [
    `## ${label(outcome.surface)} — \`${outcome.surface}\``,
    facts,
    ...(outcome.store ? [evidenceSection(outcome.store)] : []),
    `### Answer\n\n${answer ? quote(answer) : "_The surface returned no answer text._"}`,
    ...listSection("Citations", capture.citations.map(citationLine)),
    ...listSection("Search results", capture.searchResults.map(citationLine)),
    ...listSection("Shopping cards", cards),
  ].join("\n\n");
};

const failedSection = (
  outcome: Extract<AnswerOutcome, { status: "failed" }>,
): string =>
  [
    `## ${label(outcome.surface)} — \`${outcome.surface}\``,
    `This surface failed to answer: ${inline(outcome.error)}`,
    outcome.retryable
      ? "Transient — calling again may succeed."
      : "Not transient — calling again with the same input will fail the same way.",
  ].join("\n\n");

const summaryTable = (run: AnswerRun): string[] => {
  if (!run.store) return [];

  const found = (matches: { position: number }[], total: number) =>
    matches.length > 0 ? `${positions(matches)} of ${total}` : `no (${total})`;

  const rows = run.outcomes.map((outcome) => {
    const cells = (() => {
      if (outcome.status === "failed") return ["failed", "—", "—", "—", "—"];

      const evidence = outcome.store;
      if (!evidence) return ["—", "—", "—", "—", "—"];

      return [
        evidence.mentions.count > 0 ? `yes (${evidence.mentions.count})` : "no",
        evidence.links.matched.length > 0
          ? `${evidence.links.matched.length} of ${evidence.links.total}`
          : `no (${evidence.links.total})`,
        found(evidence.citations.matched, evidence.citations.total),
        found(evidence.searchResults.matched, evidence.searchResults.total),
        found(evidence.shoppingCards.matched, evidence.shoppingCards.total),
      ];
    })();

    return `| ${[label(outcome.surface), ...cells].map(cell).join(" | ")} |`;
  });

  return [
    [
      "## Store summary",
      "",
      "| Provider | Mentioned | Linked | Cited | Search results | Shopping cards |",
      "| --- | --- | --- | --- | --- | --- |",
      ...rows,
    ].join("\n"),
  ];
};

/**
 * The run as a self-contained Markdown briefing: what was asked and where,
 * the store's visibility per surface, then each surface's answer verbatim
 * with its citations, search-results panel and shopping cards.
 */
export const toMarkdown = (run: AnswerRun): string => {
  const credits = run.outcomes.reduce(
    (total, outcome) =>
      total +
      (outcome.status === "completed" ? (outcome.capture.costCredits ?? 0) : 0),
    0,
  );

  const headline = [
    "# AI answers",
    "",
    `- Prompt: "${inline(run.prompt)}"`,
    `- Region: ${run.country}`,
    `- Providers: ${run.outcomes.map((outcome) => label(outcome.surface)).join(", ")}`,
    ...(run.store
      ? [
          `- Store: \`${run.store.domain}\` (brand "${inline(run.store.brand)}")`,
        ]
      : []),
    `- Credits used: ${credits}`,
    `- Generated: ${new Date().toISOString()}`,
  ].join("\n");

  return [
    headline,
    ...summaryTable(run),
    ...run.outcomes.map((outcome) =>
      outcome.status === "completed"
        ? completedSection(outcome)
        : failedSection(outcome),
    ),
  ]
    .join("\n\n")
    .concat("\n");
};

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/**
 * The run as JSON. `raw` and `answerMarkdown` stay out unless asked for:
 * AI Mode's markdown embeds every product card as HTML with a base64 image,
 * and the raw payload carries it twice — both dwarf the answer itself.
 */
export const toJson = (run: AnswerRun, { raw }: { raw: boolean }) => ({
  ...run,
  outcomes: run.outcomes.map((outcome) => {
    if (outcome.status === "failed" || raw) return outcome;

    const {
      raw: _raw,
      answerMarkdown: _markdown,
      ...capture
    } = outcome.capture;
    return { ...outcome, capture };
  }),
});
