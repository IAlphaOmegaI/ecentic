import { afterEach, describe, expect, test } from "bun:test";
import {
  type Article,
  cleanPublisher,
  DEFAULT_EDITION,
  decodeEntities,
  dedupe,
  domainMatches,
  feedUrl,
  filterRelevant,
  isArticleUrl,
  isEdition,
  isRetryable,
  isTimeWindow,
  parseFeed,
  resolutionHealth,
  resolveStatusFor,
  resolveUrls,
  sortArticles,
  stripPublisherSuffix,
} from "@/server/utils/google-news";

/**
 * Characterization tests for an undocumented upstream. Every fixture below is
 * the shape Google actually returned; when the feed changes, these are what
 * say so.
 */

const item = ({
  title,
  link = "https://news.google.com/rss/articles/CBMiFIRST?oc=5",
  guid = "CBMiFIRST",
  pubDate = "Tue, 08 Sep 2026 04:58:22 GMT",
  source = "Mastercard",
  sourceUrl = "https://www.mastercard.com",
}: {
  title: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  source?: string;
  sourceUrl?: string;
}) => `
  <item>
    <title>${title}</title>
    <link>${link}</link>
    <guid isPermaLink="false">${guid}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>&lt;a href="${link}"&gt;${title}&lt;/a&gt;&amp;nbsp;&lt;font color="#6f6f6f"&gt;${source}&lt;/font&gt;</description>
    <source url="${sourceUrl}">${source}</source>
  </item>`;

const feed = (items: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Google News</title>${items}</channel></rss>`;

describe("feed URL", () => {
  test("carries the time window as a `when:` operator on the query", () => {
    const url = new URL(feedUrl("ai shopping", { when: "7d" }));
    expect(url.searchParams.get("q")).toBe("ai shopping when:7d");
  });

  test("omits the operator entirely when no window is asked for", () => {
    const url = new URL(feedUrl("ai shopping"));
    expect(url.searchParams.get("q")).toBe("ai shopping");
  });

  test("defaults language, country and edition together", () => {
    // An inconsistent set is answered with an empty or mixed feed rather than
    // an error, so the three must never be defaulted independently.
    const url = new URL(feedUrl("ai commerce"));
    expect(url.searchParams.get("hl")).toBe("en-US");
    expect(url.searchParams.get("gl")).toBe("US");
    expect(url.searchParams.get("ceid")).toBe(DEFAULT_EDITION);
  });

  test("accepts only the five windows the operator understands", () => {
    for (const window of ["1h", "1d", "7d", "30d", "1y"])
      expect(isTimeWindow(window)).toBe(true);

    for (const window of ["2d", "1w", "24h", ""])
      expect(isTimeWindow(window)).toBe(false);
  });

  test("recognises an edition only in the `US:en` shape", () => {
    expect(isEdition("US:en")).toBe(true);
    expect(isEdition("GB:en-GB")).toBe(true);
    expect(isEdition("US")).toBe(false);
    expect(isEdition("US:en; drop")).toBe(false);
  });
});

describe("title suffix", () => {
  test("removes the publisher suffix the feed appends to every headline", () => {
    expect(stripPublisherSuffix("Headline - Reuters", "Reuters")).toBe(
      "Headline",
    );
  });

  test("keeps a headline that contains its own hyphens intact", () => {
    // The reason the suffix is matched against <source> rather than split off
    // at the last hyphen: splitting truncates every headline like this one.
    expect(
      stripPublisherSuffix(
        "Anthropic launches AI agent blueprints - and retailers are listening - Reuters",
        "Reuters",
      ),
    ).toBe(
      "Anthropic launches AI agent blueprints - and retailers are listening",
    );
  });

  test("leaves the headline alone when the suffix is not the publisher", () => {
    expect(stripPublisherSuffix("AI shopping - explained", "Reuters")).toBe(
      "AI shopping - explained",
    );
  });
});

describe("entity decoding", () => {
  test("decodes the predefined entities and numeric references", () => {
    expect(
      decodeEntities("M&amp;S &#39;agentic&#39; push &#x2014; explained"),
    ).toBe("M&S 'agentic' push — explained");
  });

  test("decodes &amp; last, so &amp;lt; does not become a tag", () => {
    expect(decodeEntities("&amp;lt;script&amp;gt;")).toBe("&lt;script&gt;");
  });

  test("leaves an out-of-range numeric reference as written", () => {
    expect(decodeEntities("&#9999999;")).toBe("&#9999999;");
  });
});

describe("parseFeed", () => {
  const parsed = parseFeed(
    feed(
      item({
        title:
          "Mastercard report predicts that one in 10 people will routinely use AI agents to shop and pay by 2030 - Mastercard",
      }),
    ),
    "ai shopping",
  );

  test("returns one record per item", () => {
    expect(parsed).toHaveLength(1);
  });

  test("strips the publisher suffix from the headline", () => {
    expect(parsed[0]?.headline).toBe(
      "Mastercard report predicts that one in 10 people will routinely use AI agents to shop and pay by 2030",
    );
  });

  test("reads the publisher and its domain from the <source> element", () => {
    // The url attribute gives the domain for free — no resolution needed when
    // attribution is all the caller wants.
    expect(parsed[0]?.publisher).toBe("Mastercard");
    expect(parsed[0]?.publisherDomain).toBe("mastercard.com");
  });

  test("converts the RFC 822 date to ISO 8601", () => {
    expect(parsed[0]?.publishedAt).toBe("2026-09-08T04:58:22.000Z");
  });

  test("keeps the Google URL as the fallback and leaves `url` unresolved", () => {
    expect(parsed[0]?.googleUrl).toStartWith("https://news.google.com/rss/");
    expect(parsed[0]?.url).toBeNull();
  });

  test("records the guid as the deduplication key", () => {
    expect(parsed[0]?.articleId).toBe("CBMiFIRST");
  });

  test("carries no field derived from <description>", () => {
    // It holds an anchor wrapping the same headline and a font tag holding the
    // same publisher. No snippet, no summary, nothing worth a field.
    expect(Object.keys(parsed[0] ?? {})).not.toContain("description");
  });

  test("tags the record with the query it came from", () => {
    expect(parsed[0]?.query).toBe("ai shopping");
  });

  test("handles a single <item>, which the parser collapses to an object", () => {
    expect(parseFeed(feed(item({ title: "One - Mastercard" })))).toHaveLength(
      1,
    );
  });

  test("returns nothing for an empty channel or unparseable input", () => {
    expect(parseFeed(feed(""))).toEqual([]);
    expect(parseFeed("")).toEqual([]);
    expect(parseFeed("not xml at all")).toEqual([]);
  });

  test("does not expand a DOCTYPE entity", () => {
    // processEntities:false means "billion laughs" is never evaluated; the
    // reference survives as literal text instead.
    const hostile = `<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY boom "PWNED">]><rss version="2.0"><channel>${item(
      { title: "Safe &boom; - Mastercard" },
    )}</channel></rss>`;

    expect(parseFeed(hostile)[0]?.headline).not.toContain("PWNED");
  });

  test("skips an item with no link rather than emitting a partial record", () => {
    const orphan = feed(
      '<item><title>No link - Mastercard</title><source url="https://www.mastercard.com">Mastercard</source></item>',
    );

    expect(parseFeed(orphan)).toEqual([]);
  });
});

const article = (
  overrides: Partial<Article> & { headline: string },
): Article => ({
  publisher: "Reuters",
  publisherDomain: `${(overrides.publisher ?? "Reuters").toLowerCase().replaceAll(" ", "")}.com`,
  publishedAt: "2026-09-08T12:00:00.000Z",
  url: null,
  googleUrl: "https://news.google.com/rss/articles/CBMi?oc=5",
  articleId: overrides.headline,
  alsoIn: [],
  relevanceRank: 1,
  ...overrides,
});

describe("dedupe", () => {
  test("drops an exact repeat by guid", () => {
    const repeated = article({ headline: "Same story", articleId: "CBMiA" });
    expect(dedupe([repeated, { ...repeated }])).toHaveLength(1);
  });

  test("merges a syndicated copy that carries its own guid and URL", () => {
    // The case guid cannot catch: one press release under two publishers.
    const merged = dedupe([
      article({
        headline: "Mastercard predicts one in 10 will use AI agents to shop",
        articleId: "CBMiA",
        publisher: "Reuters",
        publishedAt: "2026-09-08T04:58:22.000Z",
      }),
      article({
        headline:
          "Mastercard predicts one in 10 people will use AI agents to shop",
        articleId: "CBMiB",
        publisher: "Yahoo Finance",
        publishedAt: "2026-09-08T09:10:00.000Z",
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.publisher).toBe("Reuters");
    expect(merged[0]?.alsoIn).toEqual([
      { publisher: "Yahoo Finance", domain: "yahoofinance.com" },
    ]);
  });

  test("keeps the earliest item, whichever order they arrive in", () => {
    const late = article({
      headline: "Anthropic gives retailers a blueprint for AI shopping agents",
      articleId: "CBMiLATE",
      publisher: "TradingView",
      publishedAt: "2026-09-02T20:50:18.000Z",
    });
    const early = article({
      headline: "Anthropic gives retailers a blueprint for AI shopping agents",
      articleId: "CBMiEARLY",
      publisher: "Reuters",
      publishedAt: "2026-09-02T16:01:43.000Z",
    });

    expect(dedupe([late, early])[0]?.publisher).toBe("Reuters");
    expect(dedupe([early, late])[0]?.publisher).toBe("Reuters");
  });

  test("inherits a URL the duplicate resolved but the winner did not", () => {
    const winner = article({
      headline: "AI agents reshape holiday retail spending this season",
      articleId: "CBMiA",
      publishedAt: "2026-09-01T00:00:00.000Z",
    });
    const mirror = article({
      headline: "AI agents reshape holiday retail spending this season",
      articleId: "CBMiB",
      publisher: "Yahoo Finance",
      publishedAt: "2026-09-02T00:00:00.000Z",
      url: "https://finance.yahoo.com/story",
    });

    expect(dedupe([winner, mirror])[0]?.url).toBe(
      "https://finance.yahoo.com/story",
    );
  });

  test("keeps genuinely different stories apart", () => {
    const stories = [
      article({
        headline: "Shopify adds agentic checkout for merchants",
        articleId: "A",
      }),
      article({
        headline: "FTC urged to investigate AI shopping assistants",
        articleId: "B",
      }),
    ];

    expect(dedupe(stories)).toHaveLength(2);
  });
});

describe("filterRelevant", () => {
  test("keeps an item only when both halves appear in the headline", () => {
    const kept = filterRelevant([
      article({
        headline:
          "Anthropic gives retailers a blueprint for AI shopping agents",
      }),
      // Google matched these on body text, not on the headline.
      article({ headline: "Cinema listings at the Westfield shopping centre" }),
      article({ headline: "OpenAI raises another round" }),
    ]);

    expect(kept.map((item) => item.headline)).toEqual([
      "Anthropic gives retailers a blueprint for AI shopping agents",
    ]);
  });

  test("matches on word boundaries, so `ai` does not match Dubai or chain", () => {
    expect(
      filterRelevant([
        article({ headline: "Dubai retail supply chain expands again" }),
      ]),
    ).toEqual([]);
  });

  test("matches `AI` regardless of case and inside hyphenated words", () => {
    expect(
      filterRelevant([
        article({ headline: "AI-led shopping arrives for the holidays" }),
      ]),
    ).toHaveLength(1);
  });

  test("honours caller-supplied term lists", () => {
    expect(
      filterRelevant(
        [article({ headline: "Gemini ranks products for shoppers" })],
        ["gemini"],
        ["products"],
      ),
    ).toHaveLength(1);
  });
});

/**
 * Regression tests for the defects the post-implementation review reproduced.
 * Each one failed before the fix beside it.
 */
describe("hardening", () => {
  test("a numeric reference cannot manufacture a second entity to decode", () => {
    // Sequential passes turned `&#38;lt;` — a literal "&lt;" — into "<",
    // because the "&" the numeric pass produced was rescanned by the named one.
    expect(decodeEntities("&#38;lt;")).toBe("&lt;");
    expect(decodeEntities("&#x26;lt;")).toBe("&lt;");
    expect(decodeEntities("&#38;#x3c;")).toBe("&#x3c;");
  });

  test("an unpaired surrogate is left as written rather than emitted", () => {
    expect(decodeEntities("&#xD800;")).toBe("&#xD800;");
  });

  test("an unknown named entity survives untouched", () => {
    expect(decodeEntities("caf&eacute; &mdash; open")).toBe(
      "caf&eacute; &mdash; open",
    );
  });

  test("only Google News article URLs are eligible to be fetched", () => {
    expect(
      isArticleUrl("https://news.google.com/rss/articles/CBMiABC?oc=5"),
    ).toBe(true);

    for (const hostile of [
      "http://127.0.0.1/rss/articles/x",
      "http://169.254.169.254/latest/meta-data/",
      "https://news.google.com.evil.test/rss/articles/x",
      "https://news.google.com/search?q=x",
      "file:///etc/passwd",
      "not a url",
    ])
      expect(isArticleUrl(hostile), hostile).toBe(false);
  });

  test("clustering does not depend on the order items arrive in", () => {
    // Re-deriving the cluster's word set after each merge let the
    // representative drift, so these three returned 1 in one order and 2 in
    // the other.
    const build = (headline: string, id: string, publishedAt: string) =>
      article({ headline, articleId: id, publisher: id, publishedAt });

    const first = build(
      "AI shopping platform launch expands",
      "A",
      "2026-09-03T00:00:00.000Z",
    );
    const second = build(
      "AI shopping platform",
      "B",
      "2026-09-01T00:00:00.000Z",
    );
    const third = build(
      "AI shopping platform fraud warning",
      "C",
      "2026-09-05T00:00:00.000Z",
    );

    expect(dedupe([first, second, third])).toHaveLength(
      dedupe([first, third, second]).length,
    );
    expect(dedupe([third, second, first])).toHaveLength(
      dedupe([second, first, third]).length,
    );
  });

  test("an exact guid repeat keeps the earliest copy, not the last one seen", () => {
    const early = article({
      headline: "Same story",
      articleId: "DUP",
      publisher: "Reuters",
      publishedAt: "2026-09-01T00:00:00.000Z",
    });
    const late = article({
      headline: "Same story",
      articleId: "DUP",
      publisher: "Mirror",
      publishedAt: "2026-09-09T00:00:00.000Z",
    });

    expect(dedupe([early, late])[0]?.publisher).toBe("Reuters");
    expect(dedupe([late, early])[0]?.publisher).toBe("Reuters");
  });
});

describe("publisher names", () => {
  test("cuts a page title Google captured as a source", () => {
    expect(
      cleanPublisher("Euronext Markets: Real-time Stock Market Data | live"),
    ).toBe("Euronext Markets: Real-time Stock Market Data");
  });

  test("caps a name that is really a sentence", () => {
    expect((cleanPublisher("A".repeat(200)) ?? "").length).toBeLessThanOrEqual(
      61,
    );
  });

  test("leaves an ordinary name alone", () => {
    for (const name of ["Reuters", "PYMNTS.com", "ecommercenews.com.au"])
      expect(cleanPublisher(name)).toBe(name);
  });

  test("runs after the suffix match, not before it", () => {
    // The title carries the RAW source string, so cleaning first would stop
    // the suffix matching and leave it on the headline.
    const messy = "Euronext Markets: Data | live";
    const parsed = parseFeed(
      feed(
        item({
          title: `AI agents reshape checkout - ${messy}`,
          source: messy,
          sourceUrl: "https://www.euronext.com",
        }),
      ),
    );

    expect(parsed[0]?.headline).toBe("AI agents reshape checkout");
    expect(parsed[0]?.publisher).toBe("Euronext Markets: Data");
  });
});

describe("resolution health", () => {
  test("counts a resolved URL that belongs to a different publisher", () => {
    const health = resolutionHealth([
      article({
        headline: "Correctly paired",
        publisher: "Reuters",
        url: "https://www.reuters.com/story",
      }),
      article({
        headline: "Mispaired",
        publisher: "Reuters",
        url: "https://example.test/some-other-story",
      }),
      article({ headline: "Unresolved", publisher: "Reuters" }),
    ]);

    expect(health).toEqual({ attempted: 3, succeeded: 2, mismatched: 1 });
  });

  test("treats a subdomain of the named publisher as a match", () => {
    expect(domainMatches("yahoo.com", "https://finance.yahoo.com/story")).toBe(
      true,
    );
    expect(domainMatches("finance.yahoo.com", "https://yahoo.com/story")).toBe(
      true,
    );
  });

  test("does not match two different sites under one public suffix", () => {
    expect(domainMatches("bbc.co.uk", "https://itv.co.uk/story")).toBe(false);
  });
});

describe("query parameter contract", () => {
  test("the allowlist names every parameter the OpenAPI document declares", async () => {
    // The endpoint refuses unknown parameters, so the allowlist and the
    // published spec drifting apart would 422 a request the spec says is
    // valid. Checked here rather than trusted.
    const { openApiDocument } = await import("@/lib/agent-discovery");
    const operation = (
      openApiDocument as unknown as {
        paths: Record<
          string,
          { get: { parameters: { name: string; in: string }[] } }
        >;
      }
    ).paths["/api/v1/news"]?.get;

    const documented = (operation?.parameters ?? [])
      .filter((parameter) => parameter.in === "query")
      .map((parameter) => parameter.name);

    expect(documented.length).toBeGreaterThan(0);
    expect(documented).toContain("q");
    expect(documented).not.toContain("q[]");
  });
});

/**
 * The resolver's failure paths, proved against a stubbed upstream.
 *
 * These exist because the one production failure — 9 articles, every `url`
 * null, nothing in the payload saying why — could not be reproduced on demand,
 * and waiting to catch it live is not a test strategy. `fetch` is stubbed at
 * the network boundary and restored after each case, rather than mocking the
 * module, so nothing leaks into the rest of the run.
 */
describe("resolution failure diagnosis", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const SIGNED_PAGE =
    '<html><body><c-wiz data-n-a-id="ID-1" data-n-a-ts="1757000000" data-n-a-sg="SIG-1"></c-wiz></body></html>';

  /**
   * Anything that is not a Google News article page — the Upstash cache probe,
   * the batchexecute POST — is answered by `elsewhere`, so a test never depends
   * on Redis being reachable.
   */
  const stub = (
    article: (url: string) => Response | Promise<Response>,
    elsewhere: () => Response | Promise<Response> = () => {
      throw new Error("unavailable");
    },
  ) => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      return url.includes("/rss/articles/") ? article(url) : elsewhere();
    }) as typeof fetch;
  };

  const items = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      article({
        headline: `Story ${index}`,
        articleId: `CBMi${index}`,
        publisher: `Publisher ${index}`,
        // Distinct per item, so a stub can answer one article differently.
        googleUrl: `https://news.google.com/rss/articles/CBMi${index}?oc=5`,
      }),
    );

  test("a refused article page is counted by status, not silently dropped", async () => {
    stub(() => new Response("", { status: 429 }));

    const { articles, diagnosis } = await resolveUrls(items(3));

    expect(diagnosis.succeeded).toBe(0);
    expect(diagnosis.refused).toEqual({ "429": 3 });
    expect(diagnosis.unsigned).toBe(0);
    expect(articles.every((item) => item.url === null)).toBe(true);
  });

  test("a page with no signature reports `unsigned`, not a generic failure", async () => {
    // What a consent interstitial looks like: 200, real HTML, no signature.
    stub(
      () => new Response("<html>Before you continue</html>", { status: 200 }),
    );

    const { diagnosis } = await resolveUrls(items(2));

    expect(diagnosis).toMatchObject({
      succeeded: 0,
      unsigned: 2,
      unreachable: 0,
    });
    expect(diagnosis.refused).toEqual({});
  });

  test("an unreachable upstream is distinguished from one that answered", async () => {
    stub(() => {
      throw new Error("ECONNREFUSED");
    });

    const { diagnosis } = await resolveUrls(items(2));

    expect(diagnosis).toMatchObject({
      succeeded: 0,
      unreachable: 2,
      unsigned: 0,
    });
  });

  test("a signed page whose RPC returns nothing reports `unpaired`", async () => {
    // This is the shape that means Google changed the RPC — as opposed to
    // blocking us, which is `refused`. Telling them apart is the whole point.
    stub(
      () => new Response(SIGNED_PAGE, { status: 200 }),
      () => new Response(')]}\'\n\n[["di",4]]', { status: 200 }),
    );

    const { diagnosis } = await resolveUrls(items(2));

    expect(diagnosis).toMatchObject({ succeeded: 0, unpaired: 2, unsigned: 0 });
  });

  test("one failing article does not sink the others", async () => {
    // The report guessed a `Promise.all` rejecting the whole batch. It does not:
    // failures are per-article, so a partial result is a real outcome.
    stub(
      (url) =>
        url.includes("CBMi1")
          ? new Response("", { status: 500 })
          : new Response(SIGNED_PAGE, { status: 200 }),
      () =>
        new Response(
          `)]}'\n\n[["wrb.fr","Fbv4je","[null,\\"https://publisher0.example/story\\"]",null,null,null,"0"]]`,
          { status: 200 },
        ),
    );

    const { articles, diagnosis } = await resolveUrls(items(3));

    expect(diagnosis.refused).toEqual({ "500": 1 });
    expect(diagnosis.succeeded).toBe(1);
    expect(articles[0]?.url).toBe("https://publisher0.example/story");
    expect(articles[1]?.url).toBeNull();
  });
});

describe("resolve status", () => {
  const health = (
    attempted: number,
    succeeded: number,
    refused: Record<string, number> = {},
    consent = 0,
    batch: {
      requests: number;
      statuses: Record<string, number>;
      unrecognised: number;
    } = { requests: 1, statuses: { "200": 1 }, unrecognised: 0 },
  ) => ({ attempted, succeeded, refused, consent, unreachable: 0, batch });

  test("names an outcome for every shape a resolution can end in", () => {
    expect(resolveStatusFor(false, null)).toBe("skipped");
    expect(resolveStatusFor(true, null)).toBe("unavailable");
    expect(resolveStatusFor(true, health(0, 0))).toBe("ok");
    expect(resolveStatusFor(true, health(5, 5))).toBe("ok");
    expect(resolveStatusFor(true, health(5, 3))).toBe("partial");
    expect(resolveStatusFor(true, health(5, 0))).toBe("failed");
  });

  test("distinguishes being rate limited from being broken", () => {
    // "back off and retry" and "something changed" call for different client
    // behaviour, so they are not both reported as `failed`.
    expect(resolveStatusFor(true, health(5, 0, { "429": 5 }))).toBe(
      "rate-limited",
    );

    // The failure actually observed in production: Google routes the article
    // fetches into its consent flow. Transient, and not the same advice to a
    // caller as "something changed".
    expect(resolveStatusFor(true, health(5, 0, {}, 5))).toBe("diverted");

    expect(resolveStatusFor(true, health(5, 0, { "503": 5 }))).toBe("failed");
  });
});

describe("consent diversion", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const consentRedirect = () =>
    new Response("", {
      status: 302,
      headers: {
        location:
          "https://consent.google.com/m?continue=https://news.google.com/rss/articles/CBMi0",
      },
    });

  const item = () => [
    article({
      headline: "Diverted",
      articleId: "CBMi0",
      googleUrl: "https://news.google.com/rss/articles/CBMi0?oc=5",
    }),
  ];

  test("is reported as `consent`, not as a generic network failure", async () => {
    // The origin check refuses the hop — correctly, it leaves news.google.com —
    // and calling that `unreachable` hides the only cause an operator can act on.
    globalThis.fetch = (async (input: RequestInfo | URL) =>
      String(input instanceof Request ? input.url : input).includes(
        "/rss/articles/",
      )
        ? consentRedirect()
        : (() => {
            throw new Error("unavailable");
          })()) as typeof fetch;

    const { diagnosis } = await resolveUrls(item());

    expect(diagnosis.consent).toBe(1);
    expect(diagnosis.unreachable).toBe(0);
    expect(diagnosis.succeeded).toBe(0);
  });

  test("a diversion that clears on retry resolves normally", async () => {
    const calls = { articles: 0 };
    const signed =
      '<html><c-wiz data-n-a-id="ID" data-n-a-ts="1" data-n-a-sg="SIG"></c-wiz></html>';

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!url.includes("/rss/articles/"))
        return new Response(
          `)]}'\n\n[["wrb.fr","Fbv4je","[null,\\"https://publisher.example/story\\"]",null,null,null,"0"]]`,
          { status: 200 },
        );

      calls.articles += 1;
      return calls.articles === 1
        ? consentRedirect()
        : new Response(signed, { status: 200 });
    }) as typeof fetch;

    const { articles, diagnosis } = await resolveUrls(item());

    expect(calls.articles).toBe(2);
    expect(diagnosis.succeeded).toBe(1);
    expect(articles[0]?.url).toBe("https://publisher.example/story");
  });

  test("a page with no signature is not retried", async () => {
    // Retrying it cannot help, and 25 articles retrying in lockstep turns a bad
    // minute into a bad quarter-hour.
    const calls = { articles: 0 };

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!url.includes("/rss/articles/")) throw new Error("unavailable");

      calls.articles += 1;
      return new Response("<html>no signature here</html>", { status: 200 });
    }) as typeof fetch;

    const { diagnosis } = await resolveUrls(item());

    expect(calls.articles).toBe(1);
    expect(diagnosis.unsigned).toBe(1);
  });
});

/**
 * The two steps report separately.
 *
 * Step A is a cheap page fetch; step B is the metered RPC. Everything below
 * distinguishes a failure of one from a failure of the other, because the four
 * causes that used to share the reading "signed N, paired 0" call for three
 * different reactions.
 */
describe("two-step resolution diagnosis", () => {
  const batch = (
    statuses: Record<string, number>,
    unrecognised = 0,
    requests = 1,
  ) => ({ requests, statuses, unrecognised });

  const health = (
    over: Partial<{
      attempted: number;
      succeeded: number;
      refused: Record<string, number>;
      consent: number;
      unreachable: number;
      batch: ReturnType<typeof batch>;
    }> = {},
  ) => ({
    attempted: 5,
    succeeded: 0,
    refused: {},
    consent: 0,
    unreachable: 0,
    batch: batch({ "200": 1 }),
    ...over,
  });

  test("a throttled POST reports `rate-limited`, not `failed`", () => {
    // The case the status exists for, and the one it could not previously see:
    // every page fetch succeeds and only the metered RPC is limited.
    expect(resolveStatusFor(true, health({ batch: batch({ "429": 1 }) }))).toBe(
      "rate-limited",
    );
  });

  test("a throttled GET still reports `rate-limited`", () => {
    expect(resolveStatusFor(true, health({ refused: { "429": 5 } }))).toBe(
      "rate-limited",
    );
  });

  test("a 2xx the parser cannot read is `unrecognised`, not a throttle", () => {
    expect(
      resolveStatusFor(true, health({ batch: batch({ "200": 1 }, 1) })),
    ).toBe("unrecognised");
  });

  test("a throttle outranks an unreadable envelope", () => {
    // A 429 never carries an envelope, so counting it as unrecognised would
    // send a client to read code when it should have waited sixty seconds.
    expect(
      resolveStatusFor(
        true,
        health({ batch: batch({ "429": 1, "200": 1 }, 1, 2) }),
      ),
    ).toBe("rate-limited");
  });

  test("a signature the RPC understood but rejected is not `unrecognised`", () => {
    // Envelope recognised, no URL for our ids: clock skew, a shortened validity
    // window, a signing change. A code or config fix — never a backoff.
    const status = resolveStatusFor(true, health());

    expect(status).toBe("failed");
    expect(isRetryable(status, health())).toBe(false);
  });
});

describe("retryable", () => {
  const health = (
    over: Partial<Parameters<typeof isRetryable>[1] & object> = {},
  ) =>
    ({
      attempted: 5,
      succeeded: 0,
      refused: {},
      consent: 0,
      unreachable: 0,
      batch: { requests: 1, statuses: { "200": 1 }, unrecognised: 0 },
      ...over,
    }) as NonNullable<Parameters<typeof isRetryable>[1]>;

  test("tells a client to wait on the transient outcomes", () => {
    for (const status of [
      "rate-limited",
      "diverted",
      "unavailable",
      "partial",
    ] as const)
      expect(isRetryable(status, health()), status).toBe(true);
  });

  test("tells a client to stop when retrying cannot help", () => {
    // `unrecognised` is our parser, not their budget — a consumer cannot fix it.
    for (const status of ["ok", "skipped", "unrecognised"] as const)
      expect(isRetryable(status, health()), status).toBe(false);
  });

  test("decides `failed` on what actually contributed, not on the label", () => {
    expect(isRetryable("failed", health({ unreachable: 3 }))).toBe(true);
    expect(isRetryable("failed", health({ refused: { "503": 3 } }))).toBe(true);
    expect(
      isRetryable(
        "failed",
        health({
          batch: { requests: 1, statuses: { none: 1 }, unrecognised: 0 },
        }),
      ),
    ).toBe(true);

    // A page that rendered without a signature will render without one again.
    expect(isRetryable("failed", health({ unsigned: 5 } as never))).toBe(false);
  });
});

describe("step B failures reach the diagnosis", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const SIGNED =
    '<html><c-wiz data-n-a-id="ID" data-n-a-ts="1" data-n-a-sg="SIG"></c-wiz></html>';

  /** Page fetches always succeed; only the metered POST varies. */
  const stub = (post: () => Response) => {
    globalThis.fetch = (async (input: RequestInfo | URL) =>
      String(input instanceof Request ? input.url : input).includes(
        "/rss/articles/",
      )
        ? new Response(SIGNED, { status: 200 })
        : post()) as typeof fetch;
  };

  const items = () =>
    Array.from({ length: 2 }, (_, index) =>
      article({
        headline: `Story ${index}`,
        articleId: `CBMi${index}`,
        googleUrl: `https://news.google.com/rss/articles/CBMi${index}?oc=5`,
      }),
    );

  test("a throttled POST is recorded as a 429, not as an empty result", async () => {
    stub(() => new Response("", { status: 429 }));

    const { diagnosis } = await resolveUrls(items());

    expect(diagnosis.batch.statuses).toEqual({ "429": 1 });
    expect(diagnosis.batch.unrecognised).toBe(0);
    expect(resolveStatusFor(true, { ...diagnosis, attempted: 2 })).toBe(
      "rate-limited",
    );
  });

  test("a 2xx with an envelope we do not know is recorded as unrecognised", async () => {
    // Renamed key, new nesting, different rpcids — permanent until a parser fix.
    stub(() => new Response(')]}\'\n\n3\n[["di",4]]', { status: 200 }));

    const { diagnosis } = await resolveUrls(items());

    expect(diagnosis.batch.unrecognised).toBe(1);
    expect(diagnosis.batch.statuses).toEqual({ "200": 1 });

    const status = resolveStatusFor(true, { ...diagnosis, attempted: 2 });
    expect(status).toBe("unrecognised");
    expect(isRetryable(status, { ...diagnosis, attempted: 2 })).toBe(false);
  });

  test("a recognised envelope that pairs nothing is not called unrecognised", async () => {
    // Our RPC answered for an id we did not issue: the protocol still holds,
    // the signatures were rejected. Reading code is right; backing off is not.
    stub(
      () =>
        new Response(
          `)]}'\n\n3\n[["wrb.fr","Fbv4je","[null,\\"https://elsewhere.example/x\\"]",null,null,null,"99"]]`,
          { status: 200 }, 
        ),
    );

    const { diagnosis } = await resolveUrls(items());

    expect(diagnosis.batch.unrecognised).toBe(0);
    expect(diagnosis.unpaired).toBe(2);
    expect(diagnosis.succeeded).toBe(0);
    expect(resolveStatusFor(true, { ...diagnosis, attempted: 2 })).toBe(
      "failed",
    );
  });

  test("a POST that never answers is recorded, and is retryable", async () => {
    stub(() => {
      throw new Error("ETIMEDOUT");
    });

    const { diagnosis } = await resolveUrls(items());

    expect(diagnosis.batch.statuses).toEqual({ none: 1 });

    const health = { ...diagnosis, attempted: 2 };
    expect(isRetryable(resolveStatusFor(true, health), health)).toBe(true);
  });
});

describe("relevance ordering", () => {
  const feed = (titles: string[]) =>
    `<?xml version="1.0"?><rss version="2.0"><channel>${titles
      .map((title, index) =>
        item({
          title: `${title} - Publisher${index}`,
          source: `Publisher${index}`,
          guid: `CBMi${index}`,
          link: `https://news.google.com/rss/articles/CBMi${index}?oc=5`,
          pubDate: `Tue, 0${index + 1} Sep 2026 04:00:00 GMT`,
        }),
      )
      .join("")}</channel></rss>`;

  test("records the feed position Google returned each item in", () => {
    // The only relevance signal the feed carries, and unrecoverable once the
    // list is reordered — so it is captured before anything reorders it.
    const parsed = parseFeed(feed(["First", "Second", "Third"]));

    expect(parsed.map((entry) => entry.relevanceRank)).toEqual([1, 2, 3]);
  });

  test("the rank survives the headline filter as a gap, not a renumbering", () => {
    // A jump from 1 to 3 says "Google ranked something between these and we
    // dropped it", which renumbering would erase.
    const parsed = parseFeed(
      feed([
        "AI shopping agents arrive",
        "Local bakery opens",
        "Retail checkout gets an AI agent",
      ]),
    );

    expect(filterRelevant(parsed).map((entry) => entry.relevanceRank)).toEqual([
      1, 3,
    ]);
  });

  test("a merged cluster keeps the best rank of its copies", () => {
    // Ranked 1st for one query and 40th for another, it is a 1st-place story;
    // burying it at the loser's rank would be the merge losing information.
    const merged = dedupe([
      article({
        headline: "Mastercard predicts one in 10 will use AI agents to shop",
        articleId: "A",
        publisher: "Reuters",
        publishedAt: "2026-09-08T04:00:00.000Z",
        relevanceRank: 40,
      }),
      article({
        headline:
          "Mastercard predicts one in 10 people will use AI agents to shop",
        articleId: "B",
        publisher: "Yahoo Finance",
        publishedAt: "2026-09-08T09:00:00.000Z",
        relevanceRank: 1,
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.relevanceRank).toBe(1);
  });
});

describe("default ordering", () => {
  const items = [
    article({
      headline: "Aggregator republishes the story",
      articleId: "LATE",
      publishedAt: "2026-09-09T09:00:00.000Z",
      relevanceRank: 96,
    }),
    article({
      headline: "Reuters breaks the story",
      articleId: "TOP",
      publishedAt: "2026-09-02T16:00:00.000Z",
      relevanceRank: 1,
    }),
  ];

  const headlines = ({
    sort,
    limit,
  }: {
    sort?: "relevance" | "date";
    limit?: number;
  }) =>
    sortArticles(items, sort)
      .slice(0, limit)
      .map((entry) => entry.headline);

  test("an omitted sort keeps Google's order, not the newest first", () => {
    // The default decides which articles `limit` keeps. On a live feed the
    // newest items in a window were ranks 96, 94, 82, 97 — aggregators that
    // republish constantly — while ranks 1-8 were the originals.
    expect(headlines({})).toEqual([
      "Reuters breaks the story",
      "Aggregator republishes the story",
    ]);
  });

  test("sort=date is still available and still sorts by date", () => {
    expect(headlines({ sort: "date" })).toEqual([
      "Aggregator republishes the story",
      "Reuters breaks the story",
    ]);
  });

  test("limit selects on the chosen order, not merely displays it", () => {
    expect(headlines({ limit: 1 })).toEqual(["Reuters breaks the story"]);
    expect(headlines({ limit: 1, sort: "date" })).toEqual([
      "Aggregator republishes the story",
    ]);
  });
});
