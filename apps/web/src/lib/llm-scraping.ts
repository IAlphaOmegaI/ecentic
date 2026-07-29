// Shared contract between the /dev/llm-scraping page and its route handler.
// Client-safe: types plus plain data, no server imports at runtime.
// Full plan: docs/tasks/llm-surface-scraping.md

import { resultify } from "@zenncore/utils";

export const ENDPOINT = "/api/dev/llm-scraping";

// The id doubles as the ScrapeLLM path segment (/scrapers/{surface}), so wiring
// up perplexity/gemini/copilot/grok later is a new entry here, not a refactor.
export type Surface = "chatgpt" | "google_ai_mode";

export const SURFACES = {
  chatgpt: {
    label: "ChatGPT",
    accent: "text-primary",
    note: "inline links + model id",
  },
  google_ai_mode: {
    label: "Google AI Mode",
    accent: "text-success",
    note: "citations + search-results panel",
  },
} as const satisfies Record<
  Surface,
  { label: string; accent: string; note: string }
>;

export const isSurface = (value: string): value is Surface => value in SURFACES;

// ScrapeLLM rejects prompts past this.
export const PROMPT_LIMIT = 4000;

export const MAX_REPEATS = 5;

export const CREDITS_PER_CAPTURE = 3;

export type CaptureRequest = {
  surface: Surface;
  prompt: string;
  // ISO 3166-1 alpha-2 — where the scraping session appears to browse from.
  country: string;
  // Skip ScrapeLLM's response cache. Cached answers still bill full credits.
  bypassCache: boolean;
  // 0..N-1 — which repeat of the same prompt this is. Stochasticity is data:
  // every repeat is its own capture, never averaged at capture time.
  runIndex: number;
};

export type Citation = {
  url: string;
  title?: string;
  snippet?: string;
  // The publisher name the surface reported (website_name). For redirect-
  // wrapped citations this is the only source identity the payload carries.
  source?: string;
  // 1-based order of appearance — position is the signal, keep it explicit.
  position: number;
};

// Google wraps most AI Mode citations in session-bound goto redirects —
// `google.com.xx/goto?url=<opaque token>` or a bare `/goto` relative — whose
// destination is not recoverable from the link. They are kept for their
// title/snippet/source and position, but must never be rendered as links.
export const isRedirectWrapped = (url: string): boolean => {
  const parsed = resultify(() => new URL(url, "https://www.google.com"));
  return parsed.success && parsed.data.pathname === "/goto";
};

export type ShoppingCard = {
  productName: string;
  merchant?: string;
  price?: string;
  rating?: string;
  snippet?: string;
  // AI Mode's card module lists competing sellers with their prices — the
  // "who else has the shelf slot" signal next to the primary merchant.
  offers?: { merchant: string; price?: string }[];
  // Provider-native ids, keyed by the provider's own names — Google AI Mode
  // cards carry productid/catalogid/gpcid/mid (mid = Merchant Center id, the
  // join key to the Google Merchant integration); Amazon Rufus would put an
  // asin here. The card's deep link is session-bound and dies outside the
  // scrape — these ids are the durable signal.
  identifiers?: Record<string, string>;
  // Position in the source citation list the card was extracted from, so card
  // rank among all cited sources stays measurable.
  position: number;
};

// The normalized envelope every provider and channel serializes into. Fields no
// provider fills yet (fanOutQueries on these surfaces) stay as empty slots so
// extraction can fill them later without a schema change.
export type Capture = {
  surface: Surface;
  channel: "ui" | "api";
  provider: string;
  runIndex: number;
  geo: string;
  prompt: string;
  status: "completed" | "failed";
  model: string | null;
  answerText: string | null;
  answerMarkdown: string | null;
  // The readable answer: answerMarkdown stripped of embedded card HTML (tags,
  // base64 images), inline citation markers, and the trailing reference-link
  // list. What downstream extraction (brand mentions, share of
  // recommendation) reads, and what the sandbox renders.
  answerContent: string | null;
  citations: Citation[];
  // Google AI Mode ships a web-results panel separate from the answer's citations.
  searchResults: Citation[];
  shoppingCards: ShoppingCard[];
  fanOutQueries: string[];
  shareUrl: string | null;
  cached: boolean;
  costCredits: number | null;
  latencyMs: number | null;
  capturedAt: string;
  // Full provider payload, verbatim and immutable — extraction improves over
  // time and old raws get re-parsed. Inline for the sandbox; production moves
  // this to file storage and keeps a reference on the row.
  raw: unknown;
};

export const DEFAULT_COUNTRY = "US";

export const DEFAULT_PROMPT =
  "What are the best durable everyday backpacks under $150 right now? Recommend specific products and where to buy them.";
