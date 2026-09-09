import * as News from "@/server/utils/google-news";
import { preflight, refused, served } from "@/server/utils/public-api";
import {
  consume,
  NEWS_POLICY,
  NEWS_RESOLVE_POLICY,
} from "@/server/utils/rate-limit";

/**
 * Parsed Google News search results as JSON — the AI-commerce news wire behind
 * ecentic's own reading of the market, exposed on the public agent surface.
 *
 * The upstream is Google's undocumented RSS feed, so `server/utils/google-news`
 * owns every transformation and this handler owns only the perimeter: bounded
 * parameters, a policy sized to what the request actually costs, and the shared
 * `served` envelope.
 */

const DEFAULT_QUERIES = ["ai shopping", "ai commerce"];

/** Distinct feeds per request. Each one is a separate upstream fetch. */
const MAX_QUERIES = 5;
const MAX_QUERY_LENGTH = 200;

const MAX_LIMIT = News.FEED_ITEM_CAP;
const DEFAULT_LIMIT = 25;

/**
 * URL resolution costs one upstream `GET` per article plus a batched `POST`, so
 * an unauthenticated caller asking for it is asking the origin to make up to 25
 * outbound requests. Capped separately from `limit`, metered on its own far
 * tighter window, and bounded again by a per-instance gate in the client that
 * holds even when the limiter cannot count — the endpoint must not be usable as
 * an amplifier.
 */
const MAX_RESOLVED = 25;

/**
 * Resolution outcomes whose response must not outlive the request.
 *
 * A transient upstream failure lasted minutes; the linkless response it
 * produced was still being served an hour later out of a caller's cache. The
 * transient is not preventable from here — instructing every cache not to keep
 * the wreckage is.
 */
const DEGRADED = new Set<News.ResolveStatus>([
  "failed",
  "rate-limited",
  "diverted",
  "unrecognised",
  "unavailable",
]);

/** Absent means "take the default"; anything else must be exactly true/false. */
const boolean = (raw: string | null, fallback: boolean) => {
  if (raw === null) return fallback;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return null;
};

const terms = (raw: string | null) => {
  if (raw === null) return undefined;

  const parsed = raw
    .split(",")
    .map((term) => term.trim())
    .filter((term) => term.length > 0 && term.length <= 40)
    .slice(0, 40);

  return parsed.length > 0 ? parsed : null;
};

/**
 * Every parameter this endpoint understands. Anything else is refused rather
 * than ignored: `q[]=agentic+payments` is not a spelling of `q` that
 * `getAll("q")` sees, so silently ignoring unknowns answered that request with
 * the defaults — a plausible-looking 200 about entirely different search terms,
 * with nothing to indicate the input was dropped. A typo in a scheduled job
 * fails the same way, and quietly.
 */
const KNOWN_PARAMETERS = new Set([
  "q",
  "when",
  "limit",
  "resolve",
  "dedupe",
  "relevance",
  "aiTerms",
  "commerceTerms",
  "hl",
  "gl",
  "ceid",
]);

export const GET = async (request: Request) => {
  const parameters = new URL(request.url).searchParams;

  // `resolve` is read first because it decides which policy this request is
  // metered against, and the window has to be spent before the work rather than
  // after it: `served` consumes at response time, so a caller already over the
  // limit was still costing 5 feed fetches and 25 article fetches before being
  // told 429. One verdict is taken here and handed to every exit below, so the
  // request is counted exactly once whichever way it ends.
  const resolve = boolean(parameters.get("resolve"), false);
  const policy = resolve === true ? NEWS_RESOLVE_POLICY : NEWS_POLICY;

  const verdict = await consume(request, policy);
  const limiter = async () => verdict;

  if (!verdict.allowed)
    return refused(request, "rate-limited", "Rate limit exceeded.", {
      limiter,
      policy,
    });

  const unknown = [...new Set(parameters.keys())].filter(
    (name) => !KNOWN_PARAMETERS.has(name),
  );

  if (unknown.length > 0)
    return refused(
      request,
      "validation-failed",
      [
        `Unknown query parameter${unknown.length > 1 ? "s" : ""}: ${unknown.map((name) => `"${name}"`).join(", ")}.`,
        // Only when they actually reached for the array spelling; an unrelated
        // typo does not need advice about brackets.
        unknown.some((name) => name.startsWith("q["))
          ? 'Repeat "q" itself for several queries — bracket syntax is not accepted.'
          : "",
        "Every parameter this endpoint accepts is listed in /openapi.json.",
      ]
        .filter(Boolean)
        .join(" "),
      { limiter, policy },
    );

  // An absent `q` takes the defaults; a `q` that is present but empty is a
  // caller passing an unset variable, and is refused like any other malformed
  // parameter. Silently substituting defaults there answers a question nobody
  // asked, and it is the one case where that is most likely to go unnoticed.
  const supplied = parameters.getAll("q");
  if (
    supplied.length > 0 &&
    supplied.some((query) => query.trim().length === 0)
  )
    return refused(
      request,
      "validation-failed",
      'Every "q" must be a non-empty search query. Omit the parameter entirely to use the defaults.',
      { limiter, policy },
    );

  const queries =
    supplied.length > 0
      ? supplied.map((query) => query.trim())
      : DEFAULT_QUERIES;

  if (queries.length > MAX_QUERIES)
    return refused(
      request,
      "validation-failed",
      `At most ${MAX_QUERIES} "q" parameters per request; ${queries.length} were sent.`,
      { limiter, policy },
    );

  const oversized = queries.find((query) => query.length > MAX_QUERY_LENGTH);
  if (oversized !== undefined)
    return refused(
      request,
      "validation-failed",
      `Each "q" is limited to ${MAX_QUERY_LENGTH} characters.`,
      { limiter, policy },
    );

  const when = parameters.get("when");
  if (when !== null && !News.isTimeWindow(when))
    return refused(
      request,
      "validation-failed",
      `Unknown time window "${when}". Use one of ${News.TIME_WINDOWS.join(", ")}, or omit it.`,
      { limiter, policy },
    );

  const language = parameters.get("hl");
  if (language !== null && !News.isLanguage(language))
    return refused(
      request,
      "validation-failed",
      `"hl" must look like "${News.DEFAULT_LANGUAGE}".`,
      { limiter, policy },
    );

  const country = parameters.get("gl");
  if (country !== null && !News.isCountry(country))
    return refused(
      request,
      "validation-failed",
      `"gl" must be a two-letter country code, like "${News.DEFAULT_COUNTRY}".`,
      { limiter, policy },
    );

  const edition = parameters.get("ceid");
  if (edition !== null && !News.isEdition(edition))
    return refused(
      request,
      "validation-failed",
      `"ceid" must look like "${News.DEFAULT_EDITION}".`,
      { limiter, policy },
    );

  const merge = boolean(parameters.get("dedupe"), true);
  if (resolve === null || merge === null)
    return refused(
      request,
      "validation-failed",
      '"resolve" and "dedupe" accept only "true" or "false".',
      { limiter, policy },
    );

  const relevance = parameters.get("relevance") ?? "off";
  if (relevance !== "ai-commerce" && relevance !== "off")
    return refused(
      request,
      "validation-failed",
      `Unknown relevance mode "${relevance}". Use "ai-commerce" or "off".`,
      { limiter, policy },
    );

  const aiTerms = terms(parameters.get("aiTerms"));
  const commerceTerms = terms(parameters.get("commerceTerms"));
  if (aiTerms === null || commerceTerms === null)
    return refused(
      request,
      "validation-failed",
      '"aiTerms" and "commerceTerms" take a comma-separated list of terms.',
      { limiter, policy },
    );

  const limit = (() => {
    const raw = parameters.get("limit");
    if (raw === null) return DEFAULT_LIMIT;

    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_LIMIT
      ? parsed
      : null;
  })();

  if (limit === null)
    return refused(
      request,
      "validation-failed",
      `"limit" must be a whole number between 1 and ${MAX_LIMIT}.`,
      { limiter, policy },
    );

  const {
    articles,
    failures,
    resolved,
    resolveStatus,
    retryable,
    resolution,
    total,
  } = await News.collectAll(queries, {
    when: when ?? undefined,
    language: language ?? undefined,
    country: country ?? undefined,
    edition: edition ?? undefined,
    resolve,
    dedupe: merge,
    limit: resolve ? Math.min(limit, MAX_RESOLVED) : limit,
    // `off` last, so it cannot be quietly re-enabled by a term list sent
    // alongside it — which reported `"relevance": "off"` while still filtering.
    ...(aiTerms ? { aiTerms } : {}),
    ...(commerceTerms ? { commerceTerms } : {}),
    ...(relevance === "off" ? { aiTerms: null, commerceTerms: null } : {}),
  });

  // Every feed failing is an upstream outage, not an empty result set — saying
  // "0 articles" there would read as "no such news" to an agent that cannot
  // tell the difference.
  if (failures.length === queries.length)
    return refused(
      request,
      "upstream-timeout",
      `Google News did not answer: ${failures[0]?.error ?? "unknown error"}.`,
      { limiter, policy },
    );

  return served(
    request,
    {
      source: "Google News RSS",
      retrievedAt: new Date().toISOString(),
      queries,
      window: when,
      locale: {
        language: language ?? News.DEFAULT_LANGUAGE,
        country: country ?? News.DEFAULT_COUNTRY,
        edition: edition ?? News.DEFAULT_EDITION,
      },
      relevance,
      deduplicated: merge,
      // States plainly whether `url` was even attempted, so a client reading a
      // null `url` knows whether it means "not asked for" or "resolution
      // failed" and can decide whether to retry.
      resolved,
      // The categorical answer, so a consumer never has to compare two
      // counters to notice that resolution failed.
      resolveStatus,
      // The one bit a client can act on. `unrecognised` is a code fix on our
      // side, so a consumer retrying it just burns its own budget.
      retryable,
      // Only present when resolution ran. `mismatched` counts articles whose
      // resolved host disagrees with the publisher the feed named — the tell
      // that the internal RPC's contract has shifted, which otherwise shows up
      // as plausible URLs on the wrong stories.
      ...(resolution ? { resolution } : {}),
      count: articles.length,
      // `count === limit` is indistinguishable from "there were exactly that
      // many" without these.
      total,
      truncated: total > articles.length,
      articles,
      failures,
    },
    {
      limiter,
      policy,
      // Headlines move in minutes, not seconds, and the window is per-caller
      // for the same reason every other public response is: these carry the
      // caller's own rate-limit counters.
      //
      // A degraded body is never cached, at any layer. Origin caching was not
      // what served an hour-old linkless response — that was a client's own
      // cache — but `no-store` is the instruction that stops it there too, and
      // a stale failure outlives the transient that caused it by an order of
      // magnitude.
      cacheControl: DEGRADED.has(resolveStatus)
        ? "no-store"
        : "private, max-age=300",
    },
  );
};

export const OPTIONS = preflight;
