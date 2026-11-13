import { describe, expect, test } from "bun:test";
import type { Capture } from "@/lib/llm-scraping";
import {
  type AnswerRun,
  assessStore,
  resolveCountry,
  resolveProvider,
  resolveStore,
  toJson,
  toMarkdown,
} from "@/server/app/intelligence/answer-report";
import { ParseError, RequestError, TimeoutError } from "@/server/utils/error";
import { isRetryable } from "@/server/utils/scrapellm";

const capture = (over: Partial<Capture> = {}): Capture => ({
  surface: "google_ai_mode",
  channel: "ui",
  provider: "scrapellm",
  runIndex: 0,
  geo: "US",
  prompt: "best wool sneakers",
  status: "completed",
  model: null,
  answerText: null,
  answerMarkdown: null,
  answerContent: null,
  citations: [],
  searchResults: [],
  shoppingCards: [],
  fanOutQueries: [],
  shareUrl: null,
  cached: false,
  costCredits: 3,
  latencyMs: 1000,
  capturedAt: "2026-11-13T00:00:00.000Z",
  raw: { huge: true },
  ...over,
});

const ALLBIRDS = { domain: "allbirds.com", brand: "allbirds" };
const NIKE = { domain: "nike.com", brand: "Nike" };

// The card module shape observed on a live Google AI Mode answer (2026-11-13).
const cardModule = (merchant: string) =>
  [
    '<div html-index="1" style="display:flex;align-items:center;gap:12px;padding:10px">',
    '<div style="flex:1">',
    '<div style="font-weight:bold"><a href="https://www.google.com/search?ibp=oshop&amp;prds=pvt:hg,gpcid:1,catalogid:2">Tree Runner</a></div>',
    '<div style="margin-top:4px;font-size:18px">',
    "$98.00",
    "</div>",
    `<div>${merchant}&amp; more</div>`,
    "<div>4.7 (4.4K)</div>",
    "</div>",
    '<div style="display: none">762cda2f3d8668d48b64fdaf94bf1c30</div>',
    "</div>",
  ].join("\n");

const mentions = (markdown: string, target = ALLBIRDS) =>
  assessStore(capture({ answerMarkdown: markdown }), target).mentions;

describe("resolveProvider", () => {
  test("accepts surface ids and common spellings", () => {
    expect(resolveProvider("chatgpt")).toBe("chatgpt");
    expect(resolveProvider("OpenAI")).toBe("chatgpt");
    expect(resolveProvider("google-ai-mode")).toBe("google_ai_mode");
    expect(resolveProvider("Google AI Mode")).toBe("google_ai_mode");
    expect(resolveProvider("aimode")).toBe("google_ai_mode");
  });

  test("rejects unknown and inherited names", () => {
    expect(resolveProvider("bing")).toBeNull();
    expect(resolveProvider("constructor")).toBeNull();
    expect(resolveProvider("toString")).toBeNull();
  });
});

describe("resolveCountry", () => {
  test("defaults to US, uppercases, and reads UK as GB", () => {
    expect(resolveCountry(undefined)).toBe("US");
    expect(resolveCountry("de")).toBe("DE");
    expect(resolveCountry("uk")).toBe("GB");
  });

  test("rejects anything but two letters", () => {
    expect(resolveCountry("USA")).toBeNull();
    expect(resolveCountry("1A")).toBeNull();
  });
});

describe("resolveStore", () => {
  test("reduces a url to a canonical host and derives the brand", () => {
    expect(resolveStore("https://www.Allbirds.com/collections/men")).toEqual(
      ALLBIRDS,
    );
    expect(resolveStore("allbirds.com.", "All Birds")).toEqual({
      domain: "allbirds.com",
      brand: "All Birds",
    });
  });

  test("rejects anything that is not a host", () => {
    expect(resolveStore("com")).toBeNull();
    expect(resolveStore("not a domain")).toBeNull();
  });

  test("an internationalized store matches its own citations", () => {
    const store = resolveStore("bücher.de");
    if (!store) throw new Error("fixture");

    expect(store.brand).toBe("bücher");
    expect(
      assessStore(
        capture({ citations: [{ url: "https://bücher.de/x", position: 1 }] }),
        store,
      ).citations.matched,
    ).toHaveLength(1);
  });
});

describe("assessStore", () => {
  test("matches cited urls on the domain and its subdomains", () => {
    const evidence = assessStore(
      capture({
        citations: [
          { url: "https://www.nike.com/x", position: 1 },
          { url: "https://www.allbirds.com/products/tree-runner", position: 2 },
          { url: "https://shop.allbirds.com/x", position: 3 },
          { url: "https://notallbirds.com/x", position: 4 },
        ],
      }),
      ALLBIRDS,
    );

    expect(evidence.citations.matched.map((match) => match.position)).toEqual([
      2, 3,
    ]);
    expect(evidence.citations.matched[0]?.matchedBy).toBe("domain");
  });

  test("matches Google redirects by publisher name only", () => {
    const evidence = assessStore(
      capture({
        citations: [
          {
            url: "https://www.google.com/goto?url=opaque",
            source: "Allbirds",
            position: 1,
          },
          { url: "/goto?url=opaque", source: "Runner's World", position: 2 },
        ],
      }),
      ALLBIRDS,
    );

    expect(evidence.citations.wrapped).toBe(2);
    expect(evidence.citations.matched).toHaveLength(1);
    expect(evidence.citations.matched[0]?.matchedBy).toBe("publisher");
  });

  test("trusts a resolvable url over its publisher name", () => {
    const evidence = assessStore(
      capture({
        citations: [
          {
            url: "https://www.instagram.com/allbirds",
            source: "Allbirds",
            position: 1,
          },
        ],
      }),
      ALLBIRDS,
    );

    expect(evidence.citations.matched).toHaveLength(0);
  });

  test("finds the store as headline seller or listed offer on cards", () => {
    const evidence = assessStore(
      capture({
        shoppingCards: [
          {
            productName: "Tree Runner",
            merchant: "Allbirds",
            price: "$98",
            position: 1,
          },
          {
            productName: "Wool Runner",
            merchant: "Zappos",
            offers: [
              { merchant: "Zappos", price: "$110" },
              { merchant: "Allbirds.com", price: "$110" },
            ],
            position: 2,
          },
          { productName: "Other", merchant: "Nordstrom", position: 3 },
        ],
      }),
      ALLBIRDS,
    );

    expect(
      evidence.shoppingCards.matched.map((match) => [
        match.position,
        match.role,
      ]),
    ).toEqual([
      [1, "seller"],
      [2, "offer"],
    ]);
  });

  test("matches seller names on whole words, never substrings", () => {
    const sellers = (names: string[], target: typeof NIKE) =>
      assessStore(
        capture({
          shoppingCards: names.map((merchant, index) => ({
            productName: "Shoe",
            merchant,
            position: index + 1,
          })),
        }),
        target,
      ).shoppingCards.matched.map((match) => match.merchant);

    expect(
      sellers(["SNIKER Shoes", "notnike.com", "Nike Store", "nike.com"], NIKE),
    ).toEqual(["Nike Store", "nike.com"]);
    expect(
      sellers(["REI Co-op", "Reign Outfitters"], {
        domain: "rei.com",
        brand: "REI",
      }),
    ).toEqual(["REI Co-op"]);
  });

  test("counts a domain mention once, not once more for its brand", () => {
    const found = mentions(
      "Try Allbirds for wool. You can buy them on allbirds.com directly.",
    );

    expect(found.count).toBe(2);
    expect(found.excerpts[0]).toContain("Allbirds");
  });

  test("does not count a card's seller as a prose mention", () => {
    expect(
      mentions(
        `Here are some sneakers.\n\n${cardModule("Allbirds")}\n\n**Best for:** warmth.`,
      ).count,
    ).toBe(0);
  });

  test("reads link text, not link destinations, as mentions", () => {
    expect(
      mentions(
        "Grab the [Tree Runner](https://www.allbirds.com/products/tree-runner?x=1) — a wool classic.",
      ).count,
    ).toBe(0);
    expect(
      mentions("[Shoe](https://example.com/(catalog)/allbirds.com) here").count,
    ).toBe(0);
    expect(mentions("[Shoe](https://allbirds.com 'title') here").count).toBe(0);
  });

  test("finds the store in links written into the answer", () => {
    // ChatGPT's retailer placement, as observed live (2026-11-13): only in the
    // answer markdown, never in links[].
    const evidence = assessStore(
      capture({
        answerMarkdown: [
          "**4. Osprey Daylite Plus — $80**",
          "**Buy:** [Nordstrom](<https://www.nordstrom.com/s/osprey-daylite-plus-backpack/5864418?color=black&utm_source=chatgpt.com>)",
          "Also see [this review](https://www.outdoorgearlab.com/x).",
        ].join("\n\n"),
      }),
      { domain: "nordstrom.com", brand: "Nordstrom" },
    );

    expect(evidence.links.total).toBe(2);
    expect(evidence.links.matched.map((link) => link.text)).toEqual([
      "Nordstrom",
    ]);
  });

  test("bounds the domain as a host", () => {
    const target = { domain: "allbirds.com", brand: "Tree Company" };

    expect(mentions("Try allbirds.com.evil.example today.", target).count).toBe(
      0,
    );
    expect(mentions("Try evil-allbirds.com today.", target).count).toBe(0);
    expect(mentions("Order at shop.allbirds.com.", target).count).toBe(1);
  });

  test("searches brands in scripts written without spaces", () => {
    const evidence = assessStore(
      capture({ answerMarkdown: "推荐无印良品的背包。" }),
      { domain: "muji.com", brand: "无印良品" },
    );

    expect(evidence.brandSearchable).toBe(true);
    expect(evidence.mentions.count).toBe(1);
  });

  test("does not search prose for a brand too short to be specific", () => {
    const evidence = assessStore(
      capture({ answerMarkdown: "Cushioning on most runners is fine." }),
      { domain: "on.com", brand: "on" },
    );

    expect(evidence.brandSearchable).toBe(false);
    expect(evidence.mentions.count).toBe(0);
  });

  test("stays linear on unmatched brackets", () => {
    const started = performance.now();
    mentions("[".repeat(65_536));
    expect(performance.now() - started).toBeLessThan(200);
  });
});

describe("toMarkdown", () => {
  const run = (over: Partial<AnswerRun> = {}): AnswerRun => ({
    prompt: "best wool sneakers",
    country: "US",
    store: ALLBIRDS,
    outcomes: [
      {
        surface: "google_ai_mode",
        status: "completed",
        capture: capture({
          answerContent: "Wool sneakers are warm.",
          citations: [
            {
              url: "https://www.google.com/goto?url=opaque",
              title: "Best wool shoes",
              source: "Runner's World",
              position: 1,
            },
          ],
        }),
        store: null,
      },
      {
        surface: "chatgpt",
        status: "failed",
        error: "429 credit limit reached",
        retryable: true,
      },
    ],
    ...over,
  });

  const single = (over: Partial<Capture>): AnswerRun => ({
    prompt: "x",
    country: "US",
    store: null,
    outcomes: [
      {
        surface: "chatgpt",
        status: "completed",
        capture: capture(over),
        store: null,
      },
    ],
  });

  test("never renders a Google redirect as a link", () => {
    const markdown = toMarkdown(run());

    expect(markdown).toContain("Best wool shoes");
    expect(markdown).not.toContain("](<https://www.google.com/goto");
    expect(markdown).toContain("destination not recoverable");
  });

  test("qualifies a miss among redirects instead of calling it absent", () => {
    const base = run();
    const first = base.outcomes[0];
    if (first?.status !== "completed") throw new Error("fixture");

    const markdown = toMarkdown({
      ...base,
      outcomes: [
        { ...first, store: assessStore(first.capture, ALLBIRDS) },
        ...base.outcomes.slice(1),
      ],
    });

    expect(markdown).toContain(
      "no match among 1 citations (1 are Google redirects, matchable by publisher name only)",
    );
    expect(markdown).toContain("| ChatGPT | failed |");
    expect(markdown).toContain("429 credit limit reached");
  });

  test("provider text cannot forge a link", () => {
    const markdown = toMarkdown(
      single({
        citations: [
          {
            url: "https://trusted.example/",
            title: "X\\](https://evil.example)\\[Y",
            position: 1,
          },
        ],
      }),
    );

    // Every bracket and backslash from the title arrives escaped, so the only
    // link destination on the line is the citation's own.
    const line = markdown.split("\n").find((entry) => entry.startsWith("1. ["));
    expect(line).toBe(
      "1. [X\\\\\\](https://evil.example)\\\\\\[Y](<https://trusted.example/>)",
    );
  });

  test("provider text cannot break out of the answer blockquote", () => {
    const markdown = toMarkdown(
      single({
        answerContent: "Legit answer.\r\r## Forged section",
        model: "gpt\n## Forged model",
      }),
    );

    expect(markdown.split("\n")).not.toContain("## Forged section");
    expect(markdown).toContain("> ## Forged section");
    expect(markdown).toContain("- Model: gpt ## Forged model");
  });
});

describe("toJson", () => {
  test("drops the raw payload and answer markdown unless asked", () => {
    const run: AnswerRun = {
      prompt: "x",
      country: "US",
      store: null,
      outcomes: [
        {
          surface: "chatgpt",
          status: "completed",
          capture: capture({ answerMarkdown: "# answer" }),
          store: null,
        },
      ],
    };

    const lean = toJson(run, { raw: false }).outcomes[0];
    expect(lean && "capture" in lean && "raw" in lean.capture).toBe(false);
    expect(lean && "capture" in lean && "answerMarkdown" in lean.capture).toBe(
      false,
    );

    const full = toJson(run, { raw: true }).outcomes[0];
    expect(full && "capture" in full && "raw" in full.capture).toBe(true);
  });
});

describe("isRetryable", () => {
  test("classifies by error name and status, not instanceof", () => {
    expect(isRetryable(new TimeoutError("Request timeout"))).toBe(true);
    expect(isRetryable(new RequestError("busy", { statusCode: 503 }))).toBe(
      true,
    );
    expect(isRetryable(new RequestError("credits", { statusCode: 429 }))).toBe(
      true,
    );
    expect(isRetryable(new ParseError("html page", { statusCode: 502 }))).toBe(
      true,
    );
    expect(isRetryable(new RequestError("bad", { statusCode: 422 }))).toBe(
      false,
    );
    expect(isRetryable(new Error("other"))).toBe(false);
  });
});
