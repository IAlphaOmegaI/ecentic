/** biome-ignore-all lint/complexity/useLiteralKeys: third-party XML keys are read as strings so the parser output stays untyped */
import { type Result, resultify } from "@zenncore/utils";
import { XMLParser } from "fast-xml-parser";
import { RequestError, TimeoutError } from "./error";
import * as HTTP from "./http";

/**
 * Google News RSS client — the search feed, parsed into records an agent can
 * read without touching XML.
 *
 * Google publishes no news API. The RSS feed is the only first-party surface
 * and it is undocumented, so every rule encoded here comes from observed
 * responses and can be invalidated by Google without notice. That shapes the
 * whole module: no field is trusted to exist, every step degrades to a partial
 * record rather than a failure, and URL resolution — the one part that leans on
 * an internal RPC — is treated as expected-to-fail rather than as an error.
 *
 * Transport and pure parsing only, deliberately: no `"use server"`, no session,
 * no database, mirroring `utils/serp.ts`. Anything that needs auth or
 * persistence composes this from `server/app`.
 */

const FEED_BASE = "https://news.google.com/rss/search";
const BATCH_BASE = "https://news.google.com/_/DotsSplashUi/data/batchexecute";

/**
 * Google rejects an unfamiliar client on the article pages that URL resolution
 * scrapes. The RSS feed itself does not care, but sending one identity for both
 * keeps the two halves from diverging in the field.
 */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** A feed response is tens of kilobytes; anything past this is not our feed. */
const FEED_BYTE_LIMIT = 4 * 1024 * 1024;

/** An article page is ~600 KB of JavaScript application. Cap it well above. */
const ARTICLE_BYTE_LIMIT = 8 * 1024 * 1024;

/** Deadline for consuming a response body, separate from the header timeout. */
const BODY_TIMEOUT_MS = 20000;

/** The `when:` operator accepts exactly these. Anything else returns nothing. */
export const TIME_WINDOWS = ["1h", "1d", "7d", "30d", "1y"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

export const isTimeWindow = (value: string): value is TimeWindow =>
  (TIME_WINDOWS as readonly string[]).includes(value);

/** The feed caps every response at 100 items and offers no pagination. */
export const FEED_ITEM_CAP = 100;

/**
 * A publisher, named both ways. Google's `<source>` text is a brand name for
 * some outlets and a bare domain for others — "PYMNTS.com" beside
 * "ecommercenews.com.au" — so a list of those strings cannot be grouped or
 * counted without double-counting the same outlet under two spellings. The
 * domain is the stable key; the name is what a human reads.
 */
export type Source = {
  publisher: string | null;
  domain: string | null;
};

export type Article = {
  /** Headline with the ` - Publisher` suffix removed. */
  headline: string;
  publisher: string | null;
  /** Host of the `<source url>` attribute, without a `www.` prefix. */
  publisherDomain: string | null;
  /** ISO 8601, converted from the feed's RFC 822 value. Always GMT. */
  publishedAt: string | null;
  /** The publisher's own URL, or `null` when resolution failed. */
  url: string | null;
  /** The Google redirect. Always works in a browser; the fallback for `url`. */
  googleUrl: string;
  /** Feed `guid` — the identity of an exact repeat. */
  articleId: string;
  /** Publishers that carried the same story, from the syndication merge. */
  alsoIn: Source[];
  /** The feed query this record came from, when several were merged. */
  query?: string;
};

export type FeedOptions = {
  /** Restricts the window via the `when:` operator. Omit for no restriction. */
  when?: TimeWindow;
  /** Interface language — the `hl` parameter. */
  language?: string;
  /** Country bias — the `gl` parameter. */
  country?: string;
  /** Google News edition — the `ceid` parameter. */
  edition?: string;
};

export const DEFAULT_LANGUAGE = "en-US";
export const DEFAULT_COUNTRY = "US";
export const DEFAULT_EDITION = "US:en";

/**
 * `hl`, `gl` and `ceid` are interpolated into a URL built from caller input.
 * They are validated against a closed character class rather than escaped —
 * same reasoning as the locale guards in `utils/serp.ts` — because an
 * inconsistent set does not error, it silently returns an empty or mixed feed,
 * and a malformed one is worth refusing before it costs a request.
 */
const LANGUAGE_PATTERN = /^[a-z]{2}(-[A-Za-z]{2})?$/;
const COUNTRY_PATTERN = /^[A-Za-z]{2}$/;
const EDITION_PATTERN = /^[A-Za-z]{2}:[a-z]{2}(-[A-Za-z]{2})?$/;

export const isLanguage = (value: string) => LANGUAGE_PATTERN.test(value);
export const isCountry = (value: string) => COUNTRY_PATTERN.test(value);
export const isEdition = (value: string) => EDITION_PATTERN.test(value);

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * Builds the feed URL. `hl`, `gl` and `ceid` must describe the same edition;
 * an inconsistent set is answered with an empty or mixed feed rather than an
 * error, so they default together.
 */
export const feedUrl = (query: string, options: FeedOptions = {}) => {
  const search = options.when ? `${query} when:${options.when}` : query;

  const parameters = new URLSearchParams({
    q: search,
    hl: options.language ?? DEFAULT_LANGUAGE,
    gl: options.country ?? DEFAULT_COUNTRY,
    ceid: options.edition ?? DEFAULT_EDITION,
  });

  return `${FEED_BASE}?${parameters.toString()}`;
};

/**
 * Google documents no rate limit for this feed and returned 200 for 30
 * sequential requests in testing — which is precisely why the ladder exists.
 * An undocumented limit is one that can appear without warning, so a 429 is
 * treated as transient rather than as a contract.
 */
const RETRY_DELAYS_MS = [500, 2000, 5000];

const retriable = (result: Result<Response, Error>) =>
  !result.success ||
  result.data.status === 429 ||
  result.data.status >= 500 ||
  // 403 is what Google answers a client it does not recognise; it clears on a
  // retry often enough to be worth the second attempt.
  result.data.status === 403;

const withRetry = async (
  attempt: () => Promise<Result<Response, Error>>,
): Promise<Result<Response, Error>> => {
  const first = await attempt();
  if (!retriable(first)) return first;

  for (const delay of RETRY_DELAYS_MS) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    const retried = await attempt();
    if (!retriable(retried)) return retried;
  }

  return attempt();
};

/**
 * Reads a body under a byte budget *and* a deadline.
 *
 * `HTTP.request` clears its abort timer the moment response headers arrive, so
 * the timeout it advertises covers the handshake only — a body that trickles in
 * forever is not covered by it. And a length check after `response.text()` has
 * already buffered the whole thing measures UTF-16 code units after paying the
 * full cost anyway. Both matter on a public endpoint pointed at a host we do
 * not own, so bytes are counted as they arrive and the read is cancelled the
 * moment either bound is crossed.
 */
const readBounded = async (
  response: Response,
  limit: number,
  timeout: number,
): Promise<Result<string, Error>> => {
  if (!response.body) return { success: true, data: "" };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  const state = { bytes: 0, expired: false };

  const deadline = setTimeout(() => {
    state.expired = true;
    void reader.cancel();
  }, timeout);

  const drained = await resultify(async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || state.expired) return;

      state.bytes += value.byteLength;
      if (state.bytes > limit) {
        await reader.cancel();
        throw new RequestError("Google News response exceeded the size limit");
      }

      chunks.push(decoder.decode(value, { stream: true }));
    }
  });

  clearTimeout(deadline);

  if (state.expired)
    return {
      success: false,
      error: new TimeoutError("Google News response body timed out"),
    };

  if (!drained.success) return drained;

  chunks.push(decoder.decode());
  return { success: true, data: chunks.join("") };
};

/** Fetches the raw RSS XML for a query. */
export const fetchFeed = async (
  query: string,
  options: FeedOptions = {},
): Promise<Result<string, Error>> => {
  const response = await withRetry(() =>
    HTTP.request(
      feedUrl(query, options),
      {
        method: "GET",
        headers: {
          Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
          "User-Agent": USER_AGENT,
        },
      },
      { timeout: 15000 },
    ),
  );

  if (!response.success)
    return {
      success: false,
      error: new RequestError(
        `Could not reach the Google News feed: ${response.error.message}`,
      ),
    };

  if (!response.data.ok)
    return {
      success: false,
      error: new RequestError(
        `Google News feed returned status ${response.data.status}`,
        { statusCode: response.data.status },
      ),
    };

  return readBounded(response.data, FEED_BYTE_LIMIT, BODY_TIMEOUT_MS);
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Bounded entity decoding, applied *after* parsing with `processEntities:
 * false`, so a DOCTYPE entity expansion ("billion laughs") is never evaluated
 * while ordinary `&amp;` and `&#39;` in headlines still round-trip. Same
 * posture as `server/app/parsers/feed.ts`.
 *
 * `&amp;` is decoded last so `&amp;lt;` does not become `<`.
 */
const NAMED_ENTITIES = new Map([
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
  ["amp", "&"],
]);

/** Surrogate halves are not scalar values; emitting one produces broken text. */
const codePoint = (value: number, original: string) =>
  Number.isFinite(value) &&
  value > 0 &&
  value <= 0x10ffff &&
  !(value >= 0xd800 && value <= 0xdfff)
    ? String.fromCodePoint(value)
    : original;

const REFERENCE = /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]{2,6}));/g;

/**
 * Bounded entity decoding, applied *after* parsing with `processEntities:
 * false`, so a DOCTYPE entity expansion ("billion laughs") is never evaluated
 * while ordinary `&amp;` and `&#39;` in headlines still round-trip. Same
 * posture as `server/app/parsers/feed.ts`.
 *
 * One pass over every reference form, deliberately: sequential passes let an
 * earlier one manufacture a reference a later one then consumes, so `&#38;lt;`
 * — a literal "&lt;" — decoded to "<". A single pass never rescans the text it
 * produced, which is the only ordering that is actually safe.
 */
export const decodeEntities = (value: string) =>
  value.replace(REFERENCE, (match, decimal, hexadecimal, name) => {
    if (decimal !== undefined) return codePoint(Number(decimal), match);
    if (hexadecimal !== undefined)
      return codePoint(Number.parseInt(hexadecimal, 16), match);

    return NAMED_ENTITIES.get(String(name).toLowerCase()) ?? match;
  });

/**
 * `fast-xml-parser` collapses a single `<item>` to an object and omits the key
 * entirely when there are none, so every repeated element is normalized here
 * before anything indexes into it.
 */
const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
};

/**
 * With `ignoreAttributes: false`, an element carrying attributes arrives as
 * `{ "#text": …, "@_attribute": … }` — but an element *without* them stays a
 * bare scalar. Both shapes reach us: `<source>` always has `url`, `<guid>`
 * always has `isPermaLink`, and neither promise is ours to rely on.
 */
const text = (value: unknown): string | null => {
  if (typeof value === "string") return decodeEntities(value).trim() || null;
  if (typeof value === "number") return String(value);

  if (typeof value === "object" && value !== null) {
    const inner = (value as Record<string, unknown>)["#text"];
    return inner === undefined ? null : text(inner);
  }

  return null;
};

const attribute = (value: unknown, name: string): string | null => {
  if (typeof value !== "object" || value === null) return null;

  const raw = (value as Record<string, unknown>)[`@_${name}`];
  return typeof raw === "string" ? decodeEntities(raw).trim() || null : null;
};

/**
 * Every title ends with ` - ` and the publisher name. Matched against
 * `<source>` and removed — never split on the last hyphen, which truncates the
 * many headlines that contain one of their own.
 */
export const stripPublisherSuffix = (
  headline: string,
  publisher: string | null,
) => {
  if (!publisher) return headline;

  const suffix = ` - ${publisher}`;
  return headline.endsWith(suffix)
    ? headline.slice(0, -suffix.length).trim()
    : headline;
};

/** Longest first, so " | " is not left behind by a shorter separator. */
const TITLE_SEPARATORS = [" | ", " - ", " — ", " · "];
const MAX_PUBLISHER_LENGTH = 60;

/**
 * Google sometimes captures a page's `<title>` as the source name — one feed
 * returned "Euronext Markets: Real-time Stock Market Data | live" as a
 * publisher. Cut at the first separator and cap the length.
 *
 * Applied for output only, never before `stripPublisherSuffix`: the title's
 * suffix carries the *raw* source string, so cleaning first would stop the
 * suffix matching and leave it on every headline.
 */
export const cleanPublisher = (publisher: string | null) => {
  if (!publisher) return null;

  const cut = TITLE_SEPARATORS.reduce(
    (name, separator) => name.split(separator)[0] ?? name,
    publisher,
  ).trim();

  const name = cut || publisher.trim();
  if (!name) return null;

  return name.length > MAX_PUBLISHER_LENGTH
    ? `${name.slice(0, MAX_PUBLISHER_LENGTH).trimEnd()}…`
    : name;
};

const domainOf = (url: string | null) => {
  if (!url) return null;

  const parsed = resultify(() => new URL(url));
  if (!parsed.success) return null;

  return parsed.data.hostname.replace(/^www\./, "") || null;
};

/**
 * `pubDate` is RFC 822, not ISO 8601 — `new Date()` parses it, an ISO-only path
 * does not. An unparseable value yields `null` rather than an `Invalid Date`
 * that would serialize as `null` anyway but sort unpredictably first.
 */
const isoDate = (value: string | null) => {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

/**
 * The article id is also embedded in `<link>`, so a feed that drops `<guid>`
 * still yields a deduplication key.
 */
const articleIdFrom = (googleUrl: string) =>
  googleUrl.match(/\/articles\/([^?/]+)/)?.[1] ?? null;

/**
 * Parses the feed into records with `url` set to `null`. `<description>` is
 * discarded on purpose: unescaped it holds an anchor wrapping the same
 * headline and a font tag holding the same publisher, and carries no snippet.
 */
export const parseFeed = (xml: string, query?: string): Article[] => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    // Entities are decoded by hand above, after parsing.
    processEntities: false,
    // Without this a numeric headline or a digit-only guid becomes a number.
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
  });

  const parsed = resultify(() => parser.parse(xml) as Record<string, unknown>);
  if (!parsed.success) return [];

  const channel = (parsed.data["rss"] as Record<string, unknown> | undefined)?.[
    "channel"
  ] as Record<string, unknown> | undefined;

  return toArray(channel?.["item"]).flatMap((raw): Article[] => {
    if (typeof raw !== "object" || raw === null) return [];

    const item = raw as Record<string, unknown>;
    const googleUrl = text(item["link"]);
    if (!googleUrl) return [];

    const articleId = text(item["guid"]) ?? articleIdFrom(googleUrl);
    if (!articleId) return [];

    const title = text(item["title"]);
    if (!title) return [];

    // Raw for the suffix match, cleaned for the record.
    const publisher = text(item["source"]);

    return [
      {
        headline: stripPublisherSuffix(title, publisher),
        publisher: cleanPublisher(publisher),
        publisherDomain: domainOf(attribute(item["source"], "url")),
        publishedAt: isoDate(text(item["pubDate"])),
        url: null,
        googleUrl,
        articleId,
        alsoIn: [],
        ...(query === undefined ? {} : { query }),
      },
    ];
  });
};

// ---------------------------------------------------------------------------
// URL resolution
// ---------------------------------------------------------------------------

/**
 * The `<link>` identifier is not a decodable URL — Google changed the encoding,
 * so the old base64 method fails — and a `GET` on it returns 200 with a
 * JavaScript application that resolves the target at runtime, no publisher URL
 * in the markup.
 *
 * What the page *does* carry are three attributes that let us call the same
 * internal RPC the page calls. Resolution is therefore two steps: one `GET` per
 * article to lift the attributes, then one batched `POST` to `batchexecute`.
 *
 * `Fbv4je` is an internal RPC name and `garturlreq` an internal payload type.
 * Google can rename either without notice, which is why every failure here is
 * an expected condition that leaves `url` null rather than an error.
 */
const RPC_ID = "Fbv4je";

/** Articles resolved concurrently. Polite, and enough to hide the latency. */
const RESOLVE_CONCURRENCY = 8;

/** Entries per `batchexecute` POST. One POST serves many articles. */
const BATCH_SIZE = 20;

/**
 * Hard ceiling on resolution passes in flight per server instance.
 *
 * The rate limiter is the first control, but it fails open when Redis is
 * unreachable and counts an unverified bearer token as its own identity — so it
 * cannot be the only thing standing between an unauthenticated caller and a
 * burst of outbound requests. This gate holds regardless of Redis, and refuses
 * rather than queues: a caller gets unresolved articles, never a slot in a
 * growing line of work the origin has already committed to.
 */
const MAX_CONCURRENT_RESOLUTIONS = 2;
const resolutions = { active: 0 };

type Signature = { id: string; timestamp: string; signature: string };

const ATTRIBUTE_NAMES = {
  id: "data-n-a-id",
  timestamp: "data-n-a-ts",
  signature: "data-n-a-sg",
} as const;

/**
 * Read individually rather than as one ordered match: the three attributes are
 * adjacent today, but nothing in the markup guarantees their order tomorrow.
 */
const signatureFrom = (html: string): Signature | null => {
  const read = (name: string) =>
    html.match(new RegExp(`${name}="([^"]+)"`))?.[1] ?? null;

  const id = read(ATTRIBUTE_NAMES.id);
  const timestamp = read(ATTRIBUTE_NAMES.timestamp);
  const signature = read(ATTRIBUTE_NAMES.signature);

  if (!(id && timestamp && signature)) return null;
  return { id, timestamp, signature };
};

/**
 * Every URL fetched here comes out of a third party's XML. Google is the only
 * host this module is entitled to talk to, so the article link is checked
 * against that origin rather than trusted because of where it was found — the
 * difference between "we only ever fetch Google" as a description of today's
 * data and as a property of the code.
 */
const ARTICLE_ORIGIN = "https://news.google.com";
const ARTICLE_PATH = "/rss/articles/";

export const isArticleUrl = (raw: string) => {
  const parsed = resultify(() => new URL(raw));
  if (!parsed.success) return false;

  return (
    parsed.data.origin === ARTICLE_ORIGIN &&
    parsed.data.pathname.startsWith(ARTICLE_PATH)
  );
};

/** Article links redirect once, within news.google.com, before serving. */
const MAX_REDIRECTS = 3;

/**
 * Why a resolution attempt ended the way it did.
 *
 * Resolution runs from wherever the app is deployed, and Google does not treat
 * every origin alike: the same code that resolves every article from a
 * residential address resolved none from Vercel, failing in under two seconds.
 * A bare "0 of 5" cannot tell that apart from a broken RPC or a changed page,
 * so each attempt reports which of the three it was.
 */
type Attempt =
  | { kind: "ok"; signature: Signature }
  /** The article page answered, but with a status we cannot read. */
  | { kind: "refused"; status: number }
  /** No answer at all — network, timeout, or a redirect off-origin. */
  | { kind: "unreachable" }
  /** The page came back but carried no signature: an interstitial, or a
   *  markup change on Google's side. */
  | { kind: "unsigned" };

/**
 * Follows redirects by hand so each hop can be checked against the same origin
 * rule as the first. Letting `fetch` follow them automatically would turn any
 * open redirect on the Google side into a request to an attacker's host, made
 * by our server, with our egress.
 */
const fetchArticle = async (
  url: string,
): Promise<{ response: Response } | { status: number | null }> => {
  const state = { url, hops: 0 };

  for (;;) {
    if (!isArticleUrl(state.url)) return { status: null };

    const response = await HTTP.request(
      state.url,
      {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "text/html",
          // Google serves a consent interstitial to a client it has not seen
          // accept one — carrying no signature, which is indistinguishable
          // downstream from a markup change. This is the value a browser holds
          // after the user accepts, and it is what makes the article page
          // render server-side.
          Cookie: "CONSENT=YES+cb",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": USER_AGENT,
        },
      },
      { timeout: 15000 },
    );

    if (!response.success) return { status: null };
    if (response.data.status < 300 || response.data.status >= 400)
      return response.data.ok
        ? { response: response.data }
        : { status: response.data.status };

    const location = response.data.headers.get("location");
    if (!location || state.hops >= MAX_REDIRECTS)
      return { status: response.data.status };

    const next = resultify(() => new URL(location, state.url).toString());
    if (!next.success) return { status: null };

    state.url = next.data;
    state.hops += 1;
  }
};

const fetchSignature = async (googleUrl: string): Promise<Attempt> => {
  const fetched = await fetchArticle(googleUrl);

  if (!("response" in fetched))
    return fetched.status === null
      ? { kind: "unreachable" }
      : { kind: "refused", status: fetched.status };

  const html = await readBounded(
    fetched.response,
    ARTICLE_BYTE_LIMIT,
    BODY_TIMEOUT_MS,
  );
  if (!html.success) return { kind: "unreachable" };

  const signature = signatureFrom(html.data);
  return signature ? { kind: "ok", signature } : { kind: "unsigned" };
};

/**
 * Bounded-parallelism map. `Promise.all` over every article would open one
 * socket per item against a host that has no published limit — the shape most
 * likely to earn one.
 */
const mapConcurrently = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  const cursor = { next: 0 };

  const run = async () => {
    for (;;) {
      const index = cursor.next++;
      const item = items[index];
      if (index >= items.length || item === undefined) return;

      results[index] = await worker(item, index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));

  return results;
};

/**
 * Slot 4 of the entry is the request id, and **responses arrive out of order** —
 * a five-entry batch came back 0, 2, 3, 1, 4. A shared id makes the pairing
 * unrecoverable and the failure silent, because every URL returned is valid and
 * only the mapping is wrong. Each entry therefore carries its index, read back
 * from slot 6 of the `wrb.fr` envelope.
 */
const entryFor = (signature: Signature, edition: string, index: number) => {
  const inner = JSON.stringify([
    "garturlreq",
    [
      [
        "X",
        "X",
        ["X", "X"],
        null,
        null,
        1,
        1,
        edition,
        null,
        1,
        null,
        null,
        null,
        null,
        null,
        0,
        1,
      ],
      "X",
      "X",
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    signature.id,
    signature.timestamp,
    signature.signature,
  ]);

  return [RPC_ID, inner, null, String(index)];
};

/**
 * The response is a chunked stream: an anti-JSON-hijacking prefix, then
 * alternating byte-length lines and JSON payloads.
 *
 * The lengths are byte counts and cannot be applied to a JavaScript string once
 * the payload holds non-ASCII, so frames are split on those marker lines and
 * each frame is parsed exactly once. Accumulating lines until one parses would
 * do the same job on well-formed input, but it re-parses a growing prefix — a
 * 48 KB unterminated array cost 735 ms locally, and the poisoned buffer then
 * swallowed every valid frame behind it.
 */
const FRAME_MARKER = /^\d+$/;

const frames = (body: string): string[] => {
  const collected: string[] = [];
  const current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    collected.push(current.join("\n"));
    current.length = 0;
  };

  for (const line of body.split("\n")) {
    if (FRAME_MARKER.test(line.trim())) {
      flush();
      continue;
    }
    current.push(line);
  }

  flush();
  return collected;
};

const envelopes = (body: string): unknown[][] => {
  const parts: unknown[][] = [];

  for (const frame of frames(body)) {
    const trimmed = frame.trim();
    if (!trimmed.startsWith("[")) continue;

    const parsed = resultify(() => JSON.parse(trimmed) as unknown);
    if (!parsed.success || !Array.isArray(parsed.data)) continue;

    parts.push(...(parsed.data.filter(Array.isArray) as unknown[][]));
  }

  return parts;
};

/** `[[null, "https://publisher.example/story", …]]` — the URL sits at index 1. */
const urlFrom = (payload: unknown): string | null => {
  if (typeof payload !== "string") return null;

  const parsed = resultify(() => JSON.parse(payload) as unknown);
  if (!parsed.success || !Array.isArray(parsed.data)) return null;

  const candidate = parsed.data[1];
  if (typeof candidate !== "string") return null;

  // Parsed rather than prefix-matched: `startsWith("http")` accepts the string
  // "httpNOT-A-URL", which would be handed to a client as a link.
  const url = resultify(() => new URL(candidate));
  if (!url.success) return null;

  return url.data.protocol === "https:" || url.data.protocol === "http:"
    ? candidate
    : null;
};

const resolveBatch = async (
  signatures: { index: number; signature: Signature }[],
  edition: string,
): Promise<Map<number, string>> => {
  const entries = signatures.map(({ index, signature }) =>
    entryFor(signature, edition, index),
  );

  const parameters = new URLSearchParams({
    rpcids: RPC_ID,
    "source-path": "/",
    hl: DEFAULT_LANGUAGE,
    rt: "c",
  });

  const response = await HTTP.request(
    `${BATCH_BASE}?${parameters.toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": USER_AGENT,
      },
      body: new URLSearchParams({
        "f.req": JSON.stringify([entries]),
      }).toString(),
    },
    { timeout: 20000 },
  );

  if (!response.success || !response.data.ok) return new Map();

  const body = await readBounded(
    response.data,
    ARTICLE_BYTE_LIMIT,
    BODY_TIMEOUT_MS,
  );
  if (!body.success) return new Map();

  // Only ids this batch actually issued are accepted. `Number(part[6])` alone
  // coerces a null id to 0 and silently hands article zero somebody else's URL —
  // the same class of mispairing the unique ids exist to prevent, arriving from
  // the other direction.
  const issued = new Set(signatures.map(({ index }) => String(index)));

  return envelopes(body.data).reduce((resolved, part) => {
    if (part[0] !== "wrb.fr" || part[1] !== RPC_ID) return resolved;

    const id = part[6];
    if (typeof id !== "string" || !issued.has(id)) return resolved;

    const url = urlFrom(part[2]);
    return url ? resolved.set(Number(id), url) : resolved;
  }, new Map<number, string>());
};

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );

/**
 * Resolution cache, keyed on `articleId`.
 *
 * The id is stable and the publisher URL behind it never changes, so resolving
 * the same article twice is pure waste — and resolution is the expensive half
 * of this module, at one upstream GET per article. It also buys a fallback for
 * the failure that is coming: `Fbv4je` is an internal RPC with no stability
 * contract, and when Google changes it, cached ids keep answering while live
 * resolution returns nothing.
 *
 * Resolved from the same lazy client `rate-limit.ts` uses, and degrades the
 * same way: no Redis simply means no cache, never a failed request.
 */
const RESOLUTION_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

const cache = async () => {
  const module = await resultify(() => import("./durable"));
  if (!module.success) return null;

  const resolved = resultify(() => module.data.redis);
  return resolved.success ? resolved.data : null;
};

const cacheKey = (articleId: string) => `gnews:url:${articleId}`;

const readCache = async (items: Article[]): Promise<Map<string, string>> => {
  if (items.length === 0) return new Map();

  const client = await cache();
  if (!client) return new Map();

  const stored = await resultify(() =>
    client.mget<(string | null)[]>(
      ...items.map((item) => cacheKey(item.articleId)),
    ),
  );
  if (!stored.success) return new Map();

  return items.reduce((hits, item, index) => {
    const url = stored.data[index];
    return typeof url === "string" && url.length > 0
      ? hits.set(item.articleId, url)
      : hits;
  }, new Map<string, string>());
};

const writeCache = async (entries: [string, string][]) => {
  if (entries.length === 0) return;

  const client = await cache();
  if (!client) return;

  await resultify(() => {
    const pipeline = client.pipeline();
    for (const [articleId, url] of entries)
      pipeline.set(cacheKey(articleId), url, {
        ex: RESOLUTION_CACHE_TTL_SECONDS,
      });

    return pipeline.exec();
  });
};

/**
 * Fills in `url` where resolution succeeds. Never rejects: an article whose
 * signature or RPC answer is missing keeps `url: null`, and the caller falls
 * back to `googleUrl`, which always works in a browser.
 *
 * Cost is one `GET` per article plus one `POST` per batch, so this is the
 * expensive half of the pipeline and opt-in everywhere it is exposed.
 */
export type ResolutionDiagnosis = {
  /**
   * Articles whose publisher URL we now hold, cache hits included.
   *
   * Named `succeeded`, not `resolved`: the response already carries a boolean
   * `resolved` saying whether resolution ran at all, and a sibling integer of
   * the same name was misread as the boolean's true type in a bug report. Two
   * fields one word apart, one a flag and one a count, is a defect in the
   * contract even when both are correct.
   */
  succeeded: number;
  /** Served straight from cache, costing no upstream request. */
  cached: number;
  /** Page fetched and signed, but the RPC returned no URL for it. */
  unpaired: number;
  /** Page answered with a status we cannot read, by status code. */
  refused: Record<string, number>;
  /** No answer at all: network, timeout, or an off-origin redirect. */
  unreachable: number;
  /** Page returned, carrying no signature — an interstitial, or a page change. */
  unsigned: number;
};

/**
 * Fills in `url` where resolution succeeds, and reports why it did not
 * elsewhere.
 *
 * Returns the diagnosis alongside the articles rather than only the articles —
 * a divergence from the reference spec, and a deliberate one. Resolution
 * depends on a host that answers our datacenter differently from a laptop, so
 * "0 of 5" without a reason is the one result this function must never give.
 *
 * Never rejects: an article whose signature or RPC answer is missing keeps
 * `url: null`, and the caller falls back to `googleUrl`.
 */
export const resolveUrls = async (
  items: Article[],
  { edition = DEFAULT_EDITION }: { edition?: string } = {},
): Promise<{ articles: Article[]; diagnosis: ResolutionDiagnosis }> => {
  const cached = await readCache(items);

  // Only the misses cost an upstream request.
  const pending = items.flatMap((item, index) =>
    cached.has(item.articleId) ? [] : [{ item, index }],
  );

  const attempts = await mapConcurrently(
    pending,
    RESOLVE_CONCURRENCY,
    ({ item }) => fetchSignature(item.googleUrl),
  );

  // Positions are within this batch, not within `items`, so the mapping back
  // is explicit rather than positional.
  const signed = attempts.flatMap((attempt, position) =>
    attempt.kind === "ok"
      ? [{ index: position, signature: attempt.signature }]
      : [],
  );

  const batches = await Promise.all(
    chunk(signed, BATCH_SIZE).map((batch) => resolveBatch(batch, edition)),
  );

  const resolved = new Map(batches.flatMap((batch) => [...batch]));

  const fresh = [...resolved].flatMap(([position, url]): [string, string][] => {
    const entry = pending[position];
    return entry ? [[entry.item.articleId, url]] : [];
  });

  await writeCache(fresh);

  const urls = new Map([...cached, ...fresh]);

  const refused = attempts.reduce<Record<string, number>>((counts, attempt) => {
    if (attempt.kind !== "refused") return counts;

    const key = String(attempt.status);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  return {
    articles: items.map((item) => ({
      ...item,
      url: urls.get(item.articleId) ?? item.url,
    })),
    diagnosis: {
      succeeded: urls.size,
      cached: cached.size,
      unpaired: signed.length - fresh.length,
      refused,
      unreachable: attempts.filter((a) => a.kind === "unreachable").length,
      unsigned: attempts.filter((a) => a.kind === "unsigned").length,
    },
  };
};

/**
 * A resolution that returns a URL belonging to a different publisher than the
 * feed named is the signature of the RPC contract shifting underneath us — the
 * failure mode that looks like success, because every URL is valid and only the
 * pairing is wrong. Counted on every response so a break is visible as a number
 * rather than as plausible links on the wrong stories.
 */
export const resolutionHealth = (articles: Article[]) => {
  const attempted = articles.length;
  const resolved = articles.filter((article) => article.url !== null);

  const mismatched = resolved.filter(
    (article) =>
      article.publisherDomain !== null &&
      article.url !== null &&
      !domainMatches(article.publisherDomain, article.url),
  );

  return {
    attempted,
    succeeded: resolved.length,
    mismatched: mismatched.length,
  };
};

/** Suffix match on label boundaries, so `bbc.co.uk` never matches `itv.co.uk`. */
export const domainMatches = (publisherDomain: string, url: string) => {
  const parsed = resultify(() => new URL(url));
  if (!parsed.success) return false;

  const host = parsed.data.hostname.replace(/^www\./, "").toLowerCase();
  const feed = publisherDomain.replace(/^www\./, "").toLowerCase();

  return (
    host === feed || host.endsWith(`.${feed}`) || feed.endsWith(`.${host}`)
  );
};

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Syndication puts one story under many publishers: in a 55-item sample a
 * single press release appeared four times and Yahoo Finance mirrored Reuters
 * twice. `guid` catches exact repeats only — a syndicated copy has its own id
 * and its own URL, so it survives that check and has to be caught on the
 * headline.
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "what",
  "when",
  "which",
  "will",
  "with",
  "you",
  "your",
]);

const wordSet = (headline: string) =>
  new Set(
    headline
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 0 && !STOP_WORDS.has(word)),
  );

/** Jaccard similarity — shared words over total distinct words. */
const similarity = (left: Set<string>, right: Set<string>) => {
  if (left.size === 0 || right.size === 0) return 0;

  const shared = [...left].filter((word) => right.has(word)).length;
  return shared / (left.size + right.size - shared);
};

/**
 * Raised from 0.6 after that merged independently written coverage of one
 * announcement into the press release's cluster. On a live 81-item feed the
 * change costs a single merge and keeps every cluster, so the trade is close to
 * free in the direction of not inventing syndication that is not there.
 */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.75;

const earliest = (left: Article, right: Article) => {
  if (!left.publishedAt) return right;
  if (!right.publishedAt) return left;
  return left.publishedAt <= right.publishedAt ? left : right;
};

/**
 * Merges syndicated copies, keeping the earliest item and recording the other
 * publishers on it — the fact that many outlets carried a story is signal, not
 * noise, so it is preserved rather than discarded with the duplicate.
 */
const sourceOf = (article: Article): Source => ({
  publisher: article.publisher,
  domain: article.publisherDomain,
});

const sourceKey = (source: Source) =>
  (source.domain ?? source.publisher ?? "").toLowerCase();

const chronologically = (left: Article, right: Article) => {
  if (left.publishedAt === right.publishedAt) return 0;
  if (!left.publishedAt) return 1;
  if (!right.publishedAt) return -1;
  return left.publishedAt.localeCompare(right.publishedAt);
};

/**
 * Merges syndicated copies, keeping the earliest item and recording the other
 * publishers on it — the fact that many outlets carried a story is signal, not
 * noise, so it is preserved rather than discarded with the duplicate.
 *
 * Clustering is inherently order-dependent: every merge changes what later
 * items are compared against. Two things make the outcome deterministic rather
 * than a function of how the feeds happened to interleave. The input is sorted
 * oldest-first, which also makes "earliest wins" fall out of the traversal
 * instead of needing a swap. And a cluster keeps the word set of the headline
 * that opened it — re-deriving it after each merge let the representative drift,
 * so the same three articles in a different order returned a different count.
 */
export const dedupe = (
  items: Article[],
  threshold = DEFAULT_SIMILARITY_THRESHOLD,
): Article[] => {
  // Exact repeats by guid settle the easy half — keeping the earliest, since a
  // plain Map keeps whichever copy arrived last.
  const unique = new Map<string, Article>();
  for (const item of items) {
    const seen = unique.get(item.articleId);
    unique.set(item.articleId, seen ? earliest(seen, item) : item);
  }

  const kept: { article: Article; words: Set<string> }[] = [];

  for (const item of [...unique.values()].sort(chronologically)) {
    const words = wordSet(item.headline);
    const match = kept.find(
      (candidate) => similarity(candidate.words, words) >= threshold,
    );

    if (!match) {
      kept.push({ article: item, words });
      continue;
    }

    // Keyed on domain first: the same outlet arrives as "PYMNTS.com" from one
    // feed and "pymnts.com" from another, and a name-keyed set would list it
    // twice.
    const own = sourceKey(sourceOf(match.article));
    const carried = new Map(
      [...match.article.alsoIn, ...item.alsoIn, sourceOf(item)]
        .filter((source) => {
          const key = sourceKey(source);
          return key.length > 0 && key !== own;
        })
        .map((source) => [sourceKey(source), source]),
    );

    // The cluster keeps its own identity but the union of what either copy
    // managed to resolve — a mirror that resolved is still the best URL we have
    // for the story.
    match.article = {
      ...match.article,
      url: match.article.url ?? item.url,
      alsoIn: [...carried.values()],
    };
  }

  return kept.map(({ article }) => article);
};

// ---------------------------------------------------------------------------
// Relevance
// ---------------------------------------------------------------------------

/**
 * Google matches the query across the whole document, not the headline, so a
 * cinema listing at a shopping mall, a Labor Day deal roundup and liquor store
 * hours all came back for "ai shopping". Requiring one term from each of two
 * lists *in the headline* cut a 55-item sample to 26.
 */
export const DEFAULT_AI_TERMS = [
  "ai",
  "a.i.",
  "agent",
  "agents",
  "agentic",
  "chatgpt",
  "openai",
  "llm",
  "claude",
  "anthropic",
  "gemini",
  "copilot",
  "perplexity",
  "assistant",
  "chatbot",
] as const;

export const DEFAULT_COMMERCE_TERMS = [
  "shop",
  "shopping",
  "shopper",
  "shoppers",
  "retail",
  "retailer",
  "retailers",
  "commerce",
  "ecommerce",
  "e-commerce",
  "checkout",
  "merchant",
  "merchants",
  "storefront",
  "marketplace",
  "brand",
  "brands",
  "product",
  "products",
  "cart",
  "purchase",
  "buy",
] as const;

const escapeForPattern = (term: string) =>
  term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Word-boundary matching, not substring: `ai` as a substring matches `Dubai`
 * and `chain`, which is exactly the noise this filter exists to remove.
 */
const matchesAny = (headline: string, terms: readonly string[]) =>
  terms.some((term) =>
    new RegExp(
      `(^|[^\\p{L}\\p{N}])${escapeForPattern(term)}($|[^\\p{L}\\p{N}])`,
      "iu",
    ).test(headline),
  );

export const filterRelevant = (
  items: Article[],
  aiTerms: readonly string[] = DEFAULT_AI_TERMS,
  commerceTerms: readonly string[] = DEFAULT_COMMERCE_TERMS,
): Article[] =>
  items.filter(
    (item) =>
      matchesAny(item.headline, aiTerms) &&
      matchesAny(item.headline, commerceTerms),
  );

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export type CollectOptions = FeedOptions & {
  /** Resolve publisher URLs. Costs one extra GET per article, so opt-in. */
  resolve?: boolean;
  /** Merge syndicated copies. */
  dedupe?: boolean;
  /** Similarity above which two headlines are the same story. */
  threshold?: number;
  /** Headline filter. Pass `null` to keep everything the feed returned. */
  aiTerms?: readonly string[] | null;
  commerceTerms?: readonly string[] | null;
  /** Hard cap applied after filtering, before resolution. */
  limit?: number;
};

/**
 * Results are not ordered by date — a query with no `when:` returned April
 * items beside same-morning ones — and `when:1d` is a rolling 24 hours rather
 * than a calendar day. Both are the caller's problem to fix, so sorting happens
 * here and a calendar-day filter is left to `publishedAt`.
 *
 * Undated items sort last rather than first: an absent date is unknown, not old.
 */
const byRecency = (left: Article, right: Article) =>
  -chronologically(left, right);

type Outcome = {
  articles: Article[];
  /** Whether resolution actually ran, so a null `url` is never ambiguous. */
  resolved: boolean;
  /** Present only when resolution ran. */
  resolution?: ReturnType<typeof resolutionHealth> & ResolutionDiagnosis;
};

const pipeline = async (
  items: Article[],
  options: CollectOptions,
): Promise<Outcome> => {
  const relevant =
    options.aiTerms === null || options.commerceTerms === null
      ? items
      : filterRelevant(
          items,
          options.aiTerms ?? DEFAULT_AI_TERMS,
          options.commerceTerms ?? DEFAULT_COMMERCE_TERMS,
        );

  const merged =
    options.dedupe === false
      ? relevant
      : dedupe(relevant, options.threshold ?? DEFAULT_SIMILARITY_THRESHOLD);

  const sorted = [...merged].sort(byRecency);
  const articles =
    options.limit === undefined ? sorted : sorted.slice(0, options.limit);

  if (!options.resolve) return { articles, resolved: false };

  // Checked and claimed together, with no await in between, so two concurrent
  // requests cannot both read the same free slot.
  if (resolutions.active >= MAX_CONCURRENT_RESOLUTIONS)
    return { articles, resolved: false };

  resolutions.active += 1;

  try {
    const outcome = await resolveUrls(articles, {
      edition: options.edition ?? DEFAULT_EDITION,
    });

    return {
      articles: outcome.articles,
      resolved: true,
      resolution: {
        ...resolutionHealth(outcome.articles),
        ...outcome.diagnosis,
      },
    };
  } finally {
    resolutions.active -= 1;
  }
};

/**
 * A 200 is not proof of a feed. Google answers a consent interstitial, a
 * block page or an error page with the same status, and every one of them
 * parses to zero items — which reads downstream as "no news matched", cached
 * for five minutes, indistinguishable from a genuinely empty search.
 */
const looksLikeFeed = (xml: string) =>
  /<rss[\s>]/i.test(xml) || /<channel[\s>]/i.test(xml);

const readFeed = async (
  query: string,
  options: CollectOptions,
): Promise<Result<string, Error>> => {
  const xml = await fetchFeed(query, options);
  if (!xml.success) return xml;

  if (!looksLikeFeed(xml.data))
    return {
      success: false,
      error: new RequestError(
        "Google News answered with a document that is not an RSS feed",
      ),
    };

  return xml;
};

/** Fetch → parse → filter → dedupe → sort → (optionally) resolve. */
export const collect = async (
  query: string,
  options: CollectOptions = {},
): Promise<Result<Article[], Error>> => {
  const xml = await readFeed(query, options);
  if (!xml.success) return xml;

  const { articles } = await pipeline(parseFeed(xml.data, query), options);
  return { success: true, data: articles };
};

/**
 * Several queries merged into one result set. The feed caps a single response
 * at 100 items with no pagination, so breadth comes from more queries — or the
 * same query at different `when:` windows — rather than from paging.
 *
 * A query that fails does not sink the others; it is reported in `failures` and
 * the rest are returned, because a partial answer beats none for a surface
 * whose upstream can change without notice.
 */
export const collectAll = async (
  queries: string[],
  options: CollectOptions = {},
): Promise<Outcome & { failures: { query: string; error: string }[] }> => {
  const feeds = await Promise.all(
    queries.map(async (query) => ({
      query,
      result: await readFeed(query, options),
    })),
  );

  const failures = feeds.flatMap(({ query, result }) =>
    result.success ? [] : [{ query, error: result.error.message }],
  );

  const items = feeds.flatMap(({ query, result }) =>
    result.success ? parseFeed(result.data, query) : [],
  );

  return { ...(await pipeline(items, options)), failures };
};
