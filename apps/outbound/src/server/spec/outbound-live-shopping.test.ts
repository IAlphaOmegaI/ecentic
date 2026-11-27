import { describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import { z } from "zod";
import type * as HTTP from "@/server/utils/http";
import type {
  AiCapture,
  RawCapture,
} from "@/server/utils/outbound/live-shopping-contract";

mock.module("server-only", () => ({}));
const Shopping = await import("@/server/utils/outbound/live-shopping");
const { browserInspectionCode, projectBrowserExecution } = await import(
  "@/server/utils/outbound/live-shopping-browser"
);

const time = Date.parse("2026-11-19T18:00:00Z");
const now = () => time;
const identifier = "ce1da6e5-1249-4bd4-8463-1937688c63d3";
const session = "cce23dc1-ff37-49c3-a2a0-3c2c8c8a6ad0";
const product = {
  name: "Trail Tote",
  url: "https://merchant.example/products/trail-tote",
};
const competitor = "https://comparison.example/products/carry-tote";
const apiKey = "fixture-only-key";
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const query = () =>
  value(
    Shopping.prepareQuery({
      product,
      category: "reusable totes",
      country: "US",
    }),
  );
const job = () => ({
  id: identifier,
  query: query(),
  submittedAt: new Date(time).toISOString(),
});
const provider = (
  body: unknown,
  status = 200,
): Awaited<ReturnType<typeof HTTP.request>> => ({
  success: true,
  data: Response.json(body, { status }),
});
const digest = (body: string) =>
  createHash("sha256").update(body).digest("hex");
const completed = () => ({
  job_id: identifier,
  status: "done",
  scraper: "google_ai_mode",
  prompt: query().prompt,
  country: "US",
  completed_at: new Date(time).toISOString(),
  result: {
    scraper: "google_ai_mode",
    status: "done",
    cached: false,
    result_markdown:
      "Trail Tote is $40. [Carry Tote](https://comparison.example/products/carry-tote) is $35.",
    citations: [{ url: competitor, title: "Carry Tote" }],
    search_results: [
      { url: "https://organic.example/only", title: "Organic only" },
    ],
  },
});
const savedResponse = (body: unknown = completed()): RawCapture => {
  const text = JSON.stringify(body);
  return {
    url: `https://api.scrapellm.com/jobs/${identifier}`,
    status: 200,
    receivedAt: new Date(time).toISOString(),
    body: text,
    sha256: digest(text),
  };
};
const capture = async (): Promise<AiCapture> => {
  const checked = value(
    await Shopping.pollQuery(
      { apiKey, job: job() },
      { now, request: async () => provider(completed()) },
    ),
  );
  if (checked.status !== "captured")
    throw new Error("Expected captured fixture");
  return checked.capture;
};

describe("server presence from complete original captures", () => {
  const merchant = {
    name: "Café Merchant",
    domain: "merchant.example",
    aliases: ["The Merchant Store"],
  };
  const observed = async (
    text: string,
    fields: Record<string, unknown> = {},
  ) => {
    const result = value(
      await Shopping.pollQuery(
        { apiKey, job: job() },
        {
          now,
          request: async () =>
            provider({
              ...completed(),
              result: {
                ...completed().result,
                result_markdown: text,
                citations: [],
                ...fields,
              },
            }),
        },
      ),
    );
    if (result.status !== "captured")
      throw new Error("Expected complete fixture");
    return result.capture;
  };
  const presence = (answer: AiCapture) =>
    Shopping.computeDiscoveryBase({ answer, merchant }, time);

  test("checks beyond the assessor's 18000 characters without changing the answer", async () => {
    const text = `${"Other choices. ".repeat(1500)}The Merchant Store has another option.`;
    const answer = await observed(text);
    expect(answer.source.content).not.toContain("The Merchant Store");
    expect(answer.answer).toBe(text);
    expect(answer.completeness).toEqual({ status: "complete", reason: null });
    expect(presence(answer).merchantPresent).toBe(true);
    expect(presence(answer).matchedAliases).toContain("The Merchant Store");
    expect(Shopping.replayShoppingCapture(answer, time).answerText).toBe(text);
  });

  test("checks the 51st citation and full title/snippet, including duplicate URLs", async () => {
    const citations = Array.from({ length: 50 }, (_, index) => ({
      url: `https://other.example/item/${index}`,
      title: "Another option",
      snippet: "",
    }));
    const answer = await observed("Here are the available options.", {
      citations: [
        ...citations,
        {
          url: "https://retailer.example/product",
          title: `${"Unrelated ".repeat(200)}Café Merchant`,
          snippet: `${"Details ".repeat(700)}The Merchant Store`,
        },
      ],
    });
    expect(answer.links).toHaveLength(50);
    const proof = presence(answer);
    expect(proof.merchantPresent).toBe(true);
    expect(proof.matchedAliases).toContain("Café Merchant");
    expect(proof.matchedAliases).toContain("The Merchant Store");
    const duplicate = await observed("Two cited options.", {
      citations: [
        { url: "https://other.example/same", title: "Café Merchant" },
        { url: "https://other.example/same", title: "Another brand" },
      ],
    });
    expect(duplicate.links[0]?.title).toBe("Another brand");
    expect(presence(duplicate).merchantPresent).toBe(true);
    expect(presence(duplicate).linksHash).not.toBe(proof.linksHash);
  });

  test("matches encoded domains, accents and explicit product aliases with boundaries", async () => {
    const answer = await observed("Here is a cited retailer.", {
      links: [
        {
          url: "https://redirect.example/link?url=https%3A%2F%2Fshop.merchant.example%2Fproduct",
          title: "A product",
        },
      ],
    });
    expect(presence(answer).matchedAliases).toContain("merchant.example");
    expect(
      Shopping.matchMerchantText("CAFE MERCHANT", merchant, product),
    ).toContain("Café Merchant");
    expect(
      Shopping.matchMerchantText("The carryall", merchant, {
        ...product,
        aliases: ["carryall"],
      }),
    ).toContain("carryall");
    expect(
      Shopping.matchMerchantText(
        "notmerchant.example Cafe Merchantman",
        merchant,
        product,
      ),
    ).toEqual([]);
    expect(
      presence(await observed("A Trail Tote is also listed.")).merchantPresent,
    ).toBe(true);
  });

  test("scans top-level cited links and compact whole-name spacing variants", async () => {
    const result = value(
      await Shopping.pollQuery(
        { apiKey, job: job() },
        {
          now,
          request: async () =>
            provider({
              ...completed(),
              citations: [
                {
                  url: "https://retailer.example/item",
                  title: "Café Merchant",
                },
              ],
              result: {
                ...completed().result,
                result_markdown: "Only other products were named.",
                citations: [],
              },
            }),
        },
      ),
    );
    if (result.status !== "captured")
      throw new Error("Expected complete fixture");
    expect(result.capture.links).toEqual([]);
    expect(presence(result.capture).merchantPresent).toBe(true);
    const identity = { ...merchant, name: "KenzKustomz" };
    expect(
      Shopping.matchMerchantText("Kenz Kustomz is listed.", identity, product),
    ).toContain("KenzKustomz");
    expect(
      Shopping.matchMerchantText(
        "kenzkustomz is listed.",
        { ...identity, name: "Kenz Kustomz" },
        product,
      ),
    ).toContain("Kenz Kustomz");
    expect(
      Shopping.matchMerchantText("notkenzkustomzpost", identity, product),
    ).toEqual([]);
    expect(
      Shopping.computeDiscoveryBase(
        {
          answer: await observed("Kenz Kustomz is listed."),
          merchant: identity,
        },
        time,
      ).merchantPresent,
    ).toBe(true);
  });

  test("ignores organic cards and query echoes, but scans the alternate raw answer representation", async () => {
    const answer = await observed("Only other products were named.", {
      search_results: [{ url: product.url, title: "Café Merchant" }],
    });
    expect(job().query.prompt).toContain("Trail Tote");
    expect(presence(answer).merchantPresent).toBe(false);
    const alternative = await observed("Only other products were named.", {
      result: "The raw plain answer also names Café Merchant.",
    });
    expect(presence(alternative).merchantPresent).toBe(true);
  });

  test("preserves leading and trailing raw whitespace and supports verified hosted answers", async () => {
    const text = "\n  Other products were listed.  \n";
    const answer = await observed(text);
    expect(answer.answer).toBe(text);
    expect(presence(answer).answerHash).toBe(digest(text));
    const result = value(
      await Shopping.pollQuery(
        { apiKey, job: job() },
        {
          now,
          request: async () =>
            provider({
              ...completed(),
              result: {
                ...completed().result,
                result_markdown: null,
                markdown_url: "https://scrapellm.com/md/fixture.md",
              },
            }),
          page: async (url) => ({
            success: true,
            data: { url, status: 200, body: text, headers: new Headers() },
          }),
        },
      ),
    );
    if (result.status !== "captured") throw new Error("Expected hosted answer");
    expect(presence(result.capture).completeness.status).toBe("complete");
    expect(result.capture.answer).toBe(text);
  });

  test("historical missing proof and declared uncertainty never become absence", async () => {
    const answer = await observed("Other products were named.");
    const historical = structuredClone(answer);
    delete historical.completeness;
    const before = JSON.stringify(historical);
    expect(presence(historical).merchantPresent).toBeNull();
    expect(presence(historical).completeness.status).toBe("uncertain");
    expect(JSON.stringify(historical)).toBe(before);
    for (const status of [
      "truncated",
      "blocked",
      "empty",
      "uncertain",
    ] as const) {
      expect(
        presence({
          ...answer,
          completeness: { status, reason: "Known incomplete answer." },
        }).merchantPresent,
      ).toBeNull();
    }
    expect(
      Shopping.computeDiscoveryBase({ answer }, time).merchantPresent,
    ).toBeNull();
  });

  test("independently rejects tampered body, query, dates, projections and merchant identity", async () => {
    const answer = await observed("Other products were named.");
    const mutations: ((value: AiCapture) => void)[] = [
      (value) => {
        value.answer += " edited";
      },
      (value) => {
        value.job.query.prompt = "changed shopper prompt";
      },
      (value) => {
        value.job.id = session;
      },
      (value) => {
        value.executedAt = new Date(time + 1000).toISOString();
      },
      (value) => {
        value.source.content = "edited projection";
      },
      (value) => {
        if (value.raw[0]) value.raw[0].body += " ";
      },
      (value) => {
        value.links.push({ url: product.url, title: "added", snippet: "" });
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(answer);
      mutate(changed);
      expect(presence(changed).merchantPresent).toBeNull();
      expect(presence(changed).completeness.status).not.toBe("complete");
    }
    const bound = {
      ...answer,
      job: { ...answer.job, query: { ...answer.job.query, merchant } },
    };
    expect(
      Shopping.computeDiscoveryBase(
        { answer: bound, merchant: { ...merchant, name: "Changed identity" } },
        time,
      ).merchantPresent,
    ).toBeNull();
  });

  test.each([
    ["Other products were named.", { truncated: true }],
    ["Other products were named.", { metadata: { finish_reason: "length" } }],
    ["Other products were named.", { blocked: true }],
    ["Other products were named...", {}],
    [`${"Other choices. ".repeat(1500)}...`, {}],
    ["Other products were named.", { metadata: { status: "partial" } }],
    ["Access denied. Verify you are human.", {}],
  ])(
    "does not accept blocked or partial provider answers",
    async (text, flags) => {
      const result = await Shopping.pollQuery(
        { apiKey, job: job() },
        {
          now,
          request: async () =>
            provider({
              ...completed(),
              result: {
                ...completed().result,
                result_markdown: text,
                ...flags,
              },
            }),
        },
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        const { capture: savedCapture } = result.error.receipt ?? {};
        const recorded = savedCapture as AiCapture | undefined;
        expect(recorded).toBeDefined();
        if (recorded) expect(presence(recorded).merchantPresent).toBeNull();
      }
    },
  );
});

describe("live shopper query adapters", () => {
  test("persists Retry-After with the exact rejected provider capture", async () => {
    const body = { error: "Rate limit exceeded: max 5 request(s) per minute" };
    const result = await Shopping.startQuery(
      { apiKey, query: query() },
      {
        now,
        request: async () => ({
          success: true,
          data: Response.json(body, {
            status: 429,
            headers: { "Retry-After": "90" },
          }),
        }),
      },
    );
    expect(result.success).toBe(false);
    if (result.success)
      throw new Error("Expected a captured throttle response");
    expect(result.error.retryAfterSeconds).toBe(90);
    expect(result.error.receipt).toMatchObject({
      retryAfterSeconds: 90,
      response: {
        status: 429,
        body: JSON.stringify(body),
        sha256: digest(JSON.stringify(body)),
      },
    });
  });
  test("prepares a concrete question without pretending it was executed", () => {
    expect(query().prompt).toContain("Where can I buy Trail Tote");
    expect(query().prompt).toContain("price");
    expect(
      Shopping.prepareQuery({ product, category: "totes", country: "JP" })
        .success,
    ).toBe(false);
    expect(
      Shopping.prepareQuery({
        product: { ...product, url: "http://localhost/item" },
        category: "totes",
        country: "US",
      }).success,
    ).toBe(false);
  });

  test("credential checks never submit research or start a browser", async () => {
    expect(
      value(await Shopping.validateScrapellmCredentials({ apiKey })).verified,
    ).toBe(false);
    const calls: string[] = [];
    const account = await Shopping.validateFirecrawlCredentials(
      { apiKey },
      {
        now,
        request: async (url, options) => {
          calls.push(url);
          expect(options.method).toBeUndefined();
          return provider({ success: true, data: { remainingCredits: 0 } });
        },
      },
    );
    expect(value(account)).toEqual({ verified: true, remainingCredits: 0 });
    expect(calls).toEqual(["https://api.firecrawl.dev/v2/team/credit-usage"]);
  });

  test("submits once with the key only in a header and fresh capture requested", async () => {
    const calls: string[] = [];
    const started = await Shopping.startQuery(
      { apiKey, query: query() },
      {
        now,
        request: async (url, options) => {
          calls.push(url);
          expect(new URL(url).pathname).toBe("/scrapers/google_ai_mode/jobs");
          expect(new URL(url).searchParams.get("bypass_cache")).toBe("true");
          expect(options.method).toBe("POST");
          expect(new Headers(options.headers).get("X-API-Key")).toBe(apiKey);
          expect(url).not.toContain(apiKey);
          return provider({ job_id: identifier, status: "pending" }, 202);
        },
      },
    );
    expect(value(started)).toEqual(job());
    expect(calls).toHaveLength(1);
  });

  test("a lost or malformed submission stays uncertain and is not retried", async () => {
    const calls: string[] = [];
    const response = await Shopping.startQuery(
      { apiKey, query: query() },
      {
        now,
        request: async (url) => {
          calls.push(url);
          return { success: false, error: new Error("socket closed") };
        },
      },
    );
    expect(response.success).toBe(false);
    if (!response.success) expect(response.error.code).toBe("uncertain");
    expect(calls).toHaveLength(1);
    const malformed = await Shopping.startQuery(
      { apiKey, query: query() },
      { now, request: async () => provider({ status: "pending" }, 202) },
    );
    if (!malformed.success) expect(malformed.error.code).toBe("uncertain");
    else throw new Error("Expected uncertain submission");
  });

  test("expired budgets make no request and oversized submitted responses stay uncertain", async () => {
    const expired = await Shopping.startQuery(
      { apiKey, query: query(), deadline: time - 1 },
      {
        now,
        request: async () => {
          throw new Error("Must not request");
        },
      },
    );
    expect(expired.success).toBe(false);
    const oversized = await Shopping.startQuery(
      { apiKey, query: query() },
      {
        now,
        request: async () => ({
          success: true,
          data: new Response("{}", {
            status: 202,
            headers: { "content-length": "3000000" },
          }),
        }),
      },
    );
    if (!oversized.success) expect(oversized.error.code).toBe("uncertain");
    else throw new Error("Expected a bounded-response failure");
  });

  test("accepts only matching fresh completed captures and keeps exact raw evidence", async () => {
    const observed = await capture();
    expect(observed.source.capture).toBe("provider");
    expect(observed.executedAt).toBe(new Date(time).toISOString());
    expect(observed.links.map((entry) => entry.url)).toEqual([competitor]);
    expect(observed.raw[0]?.sha256).toBe(digest(observed.raw[0]?.body ?? ""));
    expect(observed.source.artifact).toBe(`sha256:${observed.raw[0]?.sha256}`);
    expect(
      value(
        await Shopping.pollQuery(
          { apiKey, job: job() },
          {
            now,
            request: async () =>
              provider({
                job_id: identifier,
                status: "pending",
                scraper: "google_ai_mode",
              }),
          },
        ),
      ),
    ).toEqual({ status: "pending" });
    for (const payload of [
      { ...completed(), prompt: "different question" },
      { ...completed(), completed_at: new Date(time + 600_000).toISOString() },
      { ...completed(), result: { ...completed().result, cached: true } },
      { ...completed(), result: { ...completed().result, cached: undefined } },
      {
        ...completed(),
        result: { ...completed().result, result_markdown: "" },
      },
    ])
      expect(
        (
          await Shopping.pollQuery(
            { apiKey, job: job() },
            { now, request: async () => provider(payload) },
          )
        ).success,
      ).toBe(false);
  });

  test("provider artifact URLs never receive keys or trigger arbitrary requests", async () => {
    const pages: string[] = [];
    const payload = {
      ...completed(),
      result: {
        ...completed().result,
        result_markdown: null,
        result: "Trail Tote was mentioned.",
        markdown_url: "https://127.0.0.1/private.md",
      },
    };
    const observed = await Shopping.pollQuery(
      { apiKey, job: job() },
      {
        now,
        request: async () => provider(payload),
        page: async (url) => {
          pages.push(url);
          throw new Error("Should not fetch");
        },
      },
    );
    expect(observed.success).toBe(false);
    if (!observed.success)
      expect(observed.error.message).toContain("full hosted answer");
    expect(pages).toEqual([]);
  });

  test("embedded image bytes stay in raw capture without crowding out quoted answer text", async () => {
    const markdown = `Trail Tote $40. <img src="data:image/png;base64,${"a".repeat(18000)}" /> Carry Tote $35.`;
    const checked = value(
      await Shopping.pollQuery(
        { apiKey, job: job() },
        {
          now,
          request: async () =>
            provider({
              ...completed(),
              result: { ...completed().result, result_markdown: markdown },
            }),
        },
      ),
    );
    if (checked.status !== "captured") throw new Error("Expected capture");
    expect(checked.capture.answer).toBe(markdown);
    expect(checked.capture.raw[0]?.body).toContain("data:image/png;base64");
    expect(checked.capture.source.content).toContain("Carry Tote $35.");
    expect(checked.capture.source.content).not.toContain("data:image");
  });

  test("restores a full image-heavy answer offline without replacing text, dates or raw evidence", () => {
    // Synthetic image-heavy provider shape; no real response or image is embedded.
    const markdown = `Other choices. <img src="data:image/png;base64,${"a".repeat(470_000)}" />\nLast recommendation with [saved link](https://tail.example/product).`;
    const raw = savedResponse({
      ...completed(),
      result: {
        ...completed().result,
        result_markdown: markdown,
        result: "A shorter alternative without its link.",
      },
    });
    const restored = value(
      Shopping.restoreCompletedQueryResponse(
        job(),
        raw,
        undefined,
        time + 86_400_000,
      ),
    );
    expect(restored.answer).toBe(markdown);
    expect(restored.raw).toEqual([raw]);
    expect(restored.receivedAt).toBe(raw.receivedAt);
    expect(restored.executedAt).toBe(new Date(time).toISOString());
    expect(restored.source.checkedAt).toBe(restored.executedAt);
    expect(restored.source.artifact).toBe(`sha256:${raw.sha256}`);
    expect(restored.source.content).toContain("Last recommendation");
    expect(restored.source.content).not.toContain("data:image");
    expect(restored.completeness?.status).toBe("complete");
    const replay = Shopping.replayShoppingCapture(restored, time + 86_400_000);
    expect(replay.answerText).toBe(markdown);
    expect(replay.citationText).toContain("https://tail.example/product");
    expect(replay.answerVariants).toContain(
      "A shorter alternative without its link.",
    );
  });

  test("a restored answer scans merchant text beyond200k and citations beyond the display limit", () => {
    const merchant = { name: "Merchant Goods", domain: "merchant.example" };
    for (const viaCitation of [false, true]) {
      const markdown = `${"Other choices. ".repeat(20_000)}${viaCitation ? "Final result." : "Merchant Goods was also listed."}`;
      const citations = Array.from({ length: 61 }, (_, index) => ({
        url: `https://source${index}.example/product`,
        title: `Source ${index}`,
      }));
      if (viaCitation)
        citations.push({
          url: "https://merchant.example/product",
          title: "Merchant Goods",
        });
      const raw = savedResponse({
        ...completed(),
        result: { ...completed().result, result_markdown: markdown, citations },
      });
      const restored = value(
        Shopping.restoreCompletedQueryResponse(job(), raw, undefined, time),
      );
      expect(restored.answer.length).toBeGreaterThan(200_000);
      expect(restored.source.content).not.toContain("Merchant Goods");
      expect(restored.links).toHaveLength(50);
      const presence = Shopping.computeDiscoveryBase(
        { answer: restored, merchant },
        time,
      );
      expect(presence.completeness.status).toBe("complete");
      expect(presence.merchantPresent).toBe(true);
      if (viaCitation)
        expect(
          Shopping.replayShoppingCapture(restored, time).citationText,
        ).toContain("https://merchant.example/product");
    }
  });

  test("polling and offline restore share the same bounded full-answer decoder", async () => {
    const markdown = `Other choices. <img src="data:image/png;base64,${"b".repeat(310_000)}" /> Final result.`;
    const body = {
      ...completed(),
      result: { ...completed().result, result_markdown: markdown },
    };
    const polled = value(
      await Shopping.pollQuery(
        { apiKey, job: job() },
        { now, request: async () => provider(body) },
      ),
    );
    if (polled.status !== "captured") throw new Error("Expected full capture");
    const raw = polled.capture.raw[0];
    if (!raw) throw new Error("Missing original response");
    expect(
      Shopping.restoreCompletedQueryResponse(job(), raw, undefined, time),
    ).toEqual({ success: true, data: polled.capture });
  });

  test("offline restoration rejects tampered bindings, cache, dates, incomplete and oversized responses", () => {
    const valid = savedResponse();
    const variants = [
      { ...valid, body: `${valid.body} ` },
      { ...valid, url: `${valid.url}/different` },
      { ...valid, status: 202 },
      { ...valid, receivedAt: new Date(time + 1000).toISOString() },
      savedResponse({ ...completed(), job_id: session }),
      savedResponse({ ...completed(), prompt: "Different query" }),
      savedResponse({ ...completed(), country: "GB" }),
      savedResponse({ ...completed(), scraper: "chatgpt" }),
      savedResponse({ ...completed(), status: "pending" }),
      savedResponse({
        ...completed(),
        created_at: new Date(time - 120000).toISOString(),
      }),
      savedResponse({
        ...completed(),
        completed_at: new Date(time + 1000).toISOString(),
      }),
      savedResponse({
        ...completed(),
        result: { ...completed().result, cached: true },
      }),
      savedResponse({
        ...completed(),
        result: { ...completed().result, prompt: "Changed nested query" },
      }),
      savedResponse({
        ...completed(),
        result: { ...completed().result, country: "GB" },
      }),
      savedResponse({
        ...completed(),
        result: {
          ...completed().result,
          result_markdown: `${"Other choices. ".repeat(20_000)}[truncated]`,
        },
      }),
      savedResponse({
        ...completed(),
        result: {
          ...completed().result,
          result_markdown: "a".repeat(2_000_001),
        },
      }),
    ];
    for (const raw of variants)
      expect(
        Shopping.restoreCompletedQueryResponse(job(), raw, undefined, time)
          .success,
      ).toBe(false);
  });

  test("hosted answers use the same2M ceiling and require an exact saved hosted response for offline restore", async () => {
    const url = "https://scrapellm.com/md/synthetic-completed-result.md";
    const text = `Other choices. <img src="data:image/png;base64,${"c".repeat(310_000)}" /> Final result.`;
    const body = {
      ...completed(),
      result: {
        ...completed().result,
        result_markdown: null,
        result: "A short alternative",
        markdown_url: url,
      },
    };
    const raw = savedResponse(body);
    const hosted: RawCapture = {
      url,
      status: 200,
      receivedAt: new Date(time).toISOString(),
      body: text,
      sha256: digest(text),
    };
    expect(
      Shopping.restoreCompletedQueryResponse(job(), raw, undefined, time)
        .success,
    ).toBe(false);
    const restored = value(
      Shopping.restoreCompletedQueryResponse(job(), raw, hosted, time),
    );
    expect(restored.answer).toBe(text);
    expect(restored.raw).toEqual([raw, hosted]);
    expect(restored.source.artifact).toBe(`sha256:${hosted.sha256}`);
    for (const changed of [
      { ...hosted, body: `${text} ` },
      { ...hosted, url: "https://scrapellm.com/md/other.md" },
      { ...hosted, status: 404 },
    ])
      expect(
        Shopping.restoreCompletedQueryResponse(job(), raw, changed, time)
          .success,
      ).toBe(false);
    const polled = value(
      await Shopping.pollQuery(
        { apiKey, job: job() },
        {
          now,
          request: async () => provider(body),
          page: async (target, options) => {
            expect(target).toBe(url);
            expect(options?.limit).toBe(2_000_000);
            return {
              success: true,
              data: { url, status: 200, body: text, headers: new Headers() },
            };
          },
        },
      ),
    );
    if (polled.status !== "captured")
      throw new Error("Expected full hosted capture");
    expect(polled.capture).toEqual(restored);
  });
});

const rendered = (url: string) => ({
  url,
  status: 200,
  checkedAt: new Date(time).toISOString(),
  title: url === product.url ? "Trail Tote" : "Carry Tote",
  headings: [url === product.url ? "Trail Tote" : "Carry Tote"],
  text:
    url === product.url
      ? "Trail Tote Large $40.00 USD"
      : "Carry Tote Large $35.00 USD",
  structured: ['{"@type":"Product","name":"Trail Tote"}'],
  selected: ["Large"],
  locale: "en-US",
  screenshot: "ZmFrZS1maXh0dXJl",
});
const page = async (
  url: string,
): Promise<Awaited<ReturnType<typeof HTTP.page>>> => ({
  success: true,
  data: {
    url,
    status: url.endsWith("robots.txt") ? 404 : 200,
    body: url.endsWith("robots.txt")
      ? ""
      : '{"ucp":{"capabilities":{"dev.ucp.shopping.checkout":[{}]}}}',
    headers: new Headers(),
  },
});
const browserRequest =
  (
    calls: { url: string; options: RequestInit }[],
    transform?: (url: string, body: ReturnType<typeof rendered>) => unknown,
  ): typeof HTTP.request =>
  async (url, options) => {
    calls.push({ url, options });
    if (options.method === "DELETE") return provider({ success: true });
    if (url.endsWith("/interact")) {
      const body = JSON.parse(String(options.body));
      expect(body.ttl).toBe(120);
      expect(body.blockAds).toBe(false);
      expect(body.profile).toBeUndefined();
      return provider({ success: true, id: session });
    }
    const body = JSON.parse(String(options.body));
    const target = body.code.includes(JSON.stringify(product.url))
      ? product.url
      : competitor;
    return provider(
      transform
        ? transform(target, rendered(target))
        : {
            success: true,
            stdout: JSON.stringify(rendered(target)),
            exitCode: 0,
          },
    );
  };

const capturedProduct = async (options?: { name: string; text: string }) => {
  const captured = value(
    await Shopping.inspectProduct(
      {
        apiKey,
        product: options ? { ...product, name: options.name } : product,
        country: "US",
      },
      {
        now,
        safeUrl: async () => true,
        page,
        request: browserRequest([], (_url, body) => ({
          success: true,
          stdout: JSON.stringify({
            ...body,
            ...(options
              ? { title: options.name, headings: [options.name] }
              : {}),
            text:
              options?.text ??
              "Trail Tote is a large linen tote. Reusable shopping tote bags for everyday errands.",
          }),
        })),
      },
    ),
  );
  if (captured.status !== "captured") throw new Error(captured.reason);
  return captured;
};

describe("unbranded questions before search spend", () => {
  const context = async () => ({
    product,
    category: "linen totes",
    country: "US",
    merchant: { name: "Merchant Goods", domain: "merchant.example" },
    browser: await capturedProduct(),
    deadline: time + 45_000,
  });
  const selection = (prompt: string) => ({
    question: "large linen tote",
    category: "tote",
    attribute: "large",
    excerptIds: [JSON.parse(prompt).excerpts[0].id],
  });
  const categoryContext = async (
    category: string,
    name: string,
    text: string,
  ) => ({
    ...(await context()),
    category,
    product: { ...product, name },
    browser: await capturedProduct({ name, text }),
  });
  const driftedTop = async () => {
    const input = await categoryContext(
      "top",
      "V-Front Extended Sleeves Top - Limited Edition",
      "This top is made from sheer stretch mesh fabric.",
    );
    const excerpts = Shopping.shopperQueryExcerpts(input, time);
    const excerpt = excerpts?.[0];
    if (!excerpt) throw new Error("Missing rendered query basis");
    const previousQuery = Shopping.preparedQuerySchema.parse({
      product: input.product,
      category: input.category,
      country: "US",
      surface: "google_ai_mode",
      merchant: { ...input.merchant, aliases: [] },
      intent: "unbranded-specific",
      prompt: "sheer stretch mesh fabric",
      basis: {
        category: "fabric",
        attribute: "sheer stretch mesh",
        excerpts: [excerpt],
        promptHash: "f".repeat(64),
      },
    });
    return { ...input, previousQuery };
  };

  test("rejects a material query that drops the saved garment category", async () => {
    const input = await driftedTop();
    expect(
      Shopping.validateShopperQuery(
        { ...input, query: input.previousQuery },
        time,
      ),
    ).toContain('saved product category "top"');
    const calls: string[] = [];
    const result = value(
      await Shopping.generateLegacyShopperQuery(input, {
        now,
        generate: async ({ prompt }) => {
          calls.push(prompt);
          return {
            ...selection(prompt),
            question: "sheer stretch mesh fabric",
            category: "fabric",
            attribute: "sheer stretch mesh",
          };
        },
      }),
    );
    expect(result.status).toBe("held");
    if (result.status !== "held") throw new Error("Expected category hold");
    expect(result.reason).toContain('selected category "fabric"');
    expect(calls).toHaveLength(2);
    expect(JSON.parse(calls[1] ?? "{}").validationFailure).toBe(result.reason);
  });

  test.each([
    ["top", "Marlow Top", "stretch mesh top", "stretch mesh"],
    ["jeans", "Marlow Jeans", "black denim jeans", "black denim"],
    ["putter", "Marlow Putter", "steel golf putter", "steel golf"],
  ])(
    "keeps grounded generic category %s out of distinctive title words",
    async (category, name, question, attribute) => {
      const input = await categoryContext(
        category,
        name,
        `The product is a ${question}.`,
      );
      const result = value(
        await Shopping.generateLegacyShopperQuery(input, {
          now,
          generate: async ({ prompt }) => ({
            ...selection(prompt),
            question,
            category,
            attribute,
          }),
        }),
      );
      expect(result.status).toBe("prepared");
      expect(result.generation.attempts).toBe(1);
    },
  );

  // Saved title/category shapes; the attribute sentences below are synthetic
  // test evidence, never observations about these real products.
  test.each([
    [
      "folding knife",
      "Manix® 2 Lightweight",
      "lightweight folding knife",
      "lightweight",
    ],
    [
      "nightstand",
      "BROOKLYN NIGHTSTAND | Bleached Walnut",
      "natural walnut nightstand",
      "natural walnut",
    ],
    [
      "sunglasses",
      "Center Stage",
      "polarized reading sunglasses",
      "polarized reading",
    ],
    [
      "leave-in conditioner",
      "Palo Santo Leave-In Conditioner",
      "moisturizing leave-in conditioner",
      "moisturizing",
    ],
    [
      "beef jerky",
      "Tender Angus Reserve Beef Jerky | Original",
      "smoked beef jerky",
      "smoked",
    ],
    [
      "diamond painting kit",
      "A SpongeBob Sunday Afternoon",
      "round diamond painting kit",
      "round",
    ],
    ["custom putter", "MEZZ.2i CUSTOM PUTTER", "steel custom putter", "steel"],
    ["bacon jam", "Hot Pepper Bacon Jam", "smoky bacon jam", "smoky"],
    [
      "home gym",
      "Multifunctional Strength Training Home Gym",
      "compact home gym",
      "compact",
    ],
    [
      "lip gloss",
      "Glosswork 4D Ultra Shine Plumping Gloss",
      "clear lip gloss",
      "clear",
    ],
    [
      "upper control arm kit",
      "ICON 2005-2023 Toyota Tacoma, Tubular Front Upper Control Arm w/ Delta Joint Kit",
      "tubular upper control arm kit",
      "tubular",
    ],
    [
      "bootcut jeans",
      "ALWAYS FITS PATCH POCKET GOOD CLASSIC BOOTCUT JEANS | DENETHICBLUE04",
      "stretch bootcut jeans",
      "stretch",
    ],
    [
      "sanding bands",
      "120 Grit Sanding Bands (100pcs)",
      "fine sanding bands",
      "fine",
    ],
    [
      "hair ties",
      "Beary Christmas Mix Pack Hair Ties",
      "soft hair ties",
      "soft",
    ],
    ["ski", "Pisteworks 89", "lightweight alpine ski", "lightweight alpine"],
    [
      "dual-acid peel",
      "BLUE RESURFACE® DUAL-ACID PEEL",
      "gentle dual-acid peel",
      "gentle",
    ],
    [
      "concealer",
      "PRO.conceal HD Corrector",
      "liquid matte concealer",
      "liquid matte",
    ],
  ])(
    "allows generic cohort category %s without copying its distinctive name",
    async (category, name, question, attribute) => {
      const input = await categoryContext(
        category,
        name,
        `The product is a ${question}.`,
      );
      const result = value(
        await Shopping.generateLegacyShopperQuery(input, {
          now,
          generate: async ({ prompt }) => ({
            ...selection(prompt),
            question,
            category,
            attribute,
          }),
        }),
      );
      expect(result.status).toBe("prepared");
      expect(result.generation.attempts).toBe(1);
      if (result.status !== "prepared") throw new Error(result.reason);
      expect(
        Shopping.validateShopperQuery({ ...input, query: result.query }, time),
      ).toBeNull();
    },
  );

  test("generic diamond grounding cannot admit the merchant name or its distinctive fragment", async () => {
    const input = {
      ...(await categoryContext(
        "diamond painting kit",
        "A SpongeBob Sunday Afternoon",
        "Diamond Dotz sells a round diamond painting kit.",
      )),
      merchant: { name: "Diamond Dotz", domain: "merchant.example" },
    };
    for (const question of [
      "round diamond painting kit",
      "diamond dotz painting kit",
      "round dotz painting kit",
    ]) {
      const result = value(
        await Shopping.generateLegacyShopperQuery(input, {
          now,
          generate: async ({ prompt }) => ({
            ...selection(prompt),
            question,
            category: "diamond painting kit",
            attribute: "round",
          }),
        }),
      );
      expect(result.status).toBe(
        question === "round diamond painting kit" ? "prepared" : "held",
      );
      if (result.status === "held") expect(result.reason).toContain("brand");
    }
  });

  test("new generic category words still need rendered support outside the merchant name", async () => {
    const input = {
      ...(await categoryContext(
        "beef jerky",
        "Original Reserve",
        "Beef Jerky Works sells smoked snacks.",
      )),
      merchant: { name: "Beef Jerky Works", domain: "merchant.example" },
    };
    const result = value(
      await Shopping.generateLegacyShopperQuery(input, {
        now,
        generate: async ({ prompt }) => ({
          ...selection(prompt),
          question: "smoked beef jerky",
          category: "beef jerky",
          attribute: "smoked",
        }),
      }),
    );
    expect(result.status).toBe("held");
    if (result.status === "held")
      expect(result.reason).toContain("exact support");
  });

  test("retains a grounded four-word category and rejects a generic kit suffix", async () => {
    const input = await categoryContext(
      "upper control arm kit",
      "Marlow Upper Control Arm Kit",
      "This adjustable upper control arm kit fits the vehicle.",
    );
    for (const category of [
      "kit",
      "control arm kit",
      "upper control arm kit",
    ]) {
      const result = value(
        await Shopping.generateLegacyShopperQuery(input, {
          now,
          generate: async ({ prompt }) => ({
            ...selection(prompt),
            question: `adjustable ${category}`,
            category,
            attribute: "adjustable",
          }),
        }),
      );
      expect(result.status).toBe(
        category === "upper control arm kit" ? "prepared" : "held",
      );
      if (category === "control arm kit" && result.status === "held")
        expect(result.reason).toContain("full saved category");
    }
  });

  test.each([
    "kit",
    "set",
    "pack",
    "box",
    "boxes",
    "bundle",
    "mix",
    "mixes",
    "system",
    "collection",
    "assortment",
  ])("does not collapse a saved category to generic %s", async (head) => {
    const input = await categoryContext(
      `linen ${head}`,
      "Marlow Product",
      `A large linen ${head}.`,
    );
    const result = value(
      await Shopping.generateLegacyShopperQuery(input, {
        now,
        generate: async ({ prompt }) => ({
          ...selection(prompt),
          question: `large linen ${head}`,
          category: head,
          attribute: "large",
        }),
      }),
    );
    expect(result.status).toBe("held");
    if (result.status === "held")
      expect(result.reason).toContain("full saved category");
  });

  test("does not invent category aliases or allow category metadata to exempt a distinctive title", async () => {
    for (const item of [
      {
        saved: "jeans",
        name: "Marlow Jeans",
        question: "black denim trousers",
        category: "trouser",
        attribute: "black denim",
        reason: "saved product category",
      },
      {
        saved: "marlow",
        name: "Marlow Product",
        question: "large linen marlow",
        category: "marlow",
        attribute: "large",
        reason: "distinctive word",
      },
    ]) {
      const input = await categoryContext(
        item.saved,
        item.name,
        `The product is ${item.question}.`,
      );
      const result = value(
        await Shopping.generateLegacyShopperQuery(input, {
          now,
          generate: async ({ prompt }) => ({
            ...selection(prompt),
            question: item.question,
            category: item.category,
            attribute: item.attribute,
          }),
        }),
      );
      expect(result.status).toBe("held");
      if (result.status === "held")
        expect(result.reason).toContain(item.reason);
    }
  });

  test("a category found only inside the merchant identity is still ungrounded", async () => {
    const input = {
      ...(await categoryContext(
        "top",
        "Marlow Product",
        "Top Studio makes stretch mesh garments.",
      )),
      merchant: { name: "Top Studio", domain: "merchant.example" },
    };
    const result = value(
      await Shopping.generateLegacyShopperQuery(input, {
        now,
        generate: async ({ prompt }) => ({
          ...selection(prompt),
          question: "stretch mesh top",
          category: "top",
          attribute: "stretch mesh",
        }),
      }),
    );
    expect(result.status).toBe("held");
    if (result.status === "held")
      expect(result.reason).toContain("exact support");
  });

  test("repairs an intact completed first category selection with exactly one model call", async () => {
    const input = await driftedTop();
    const original = structuredClone(input.previousQuery);
    const calls: string[] = [];
    const result = value(
      await Shopping.repairShopperQuery(input, {
        now,
        generate: async ({ prompt }) => {
          calls.push(prompt);
          expect(JSON.parse(prompt).previousInvalidSelection).toMatchObject({
            question: "sheer stretch mesh fabric",
            category: "fabric",
          });
          return {
            ...selection(prompt),
            question: "stretch mesh top",
            category: "top",
            attribute: "stretch mesh",
          };
        },
      }),
    );
    expect(result.status).toBe("prepared");
    expect(result.generation.attempts).toBe(2);
    expect(calls).toHaveLength(1);
    expect(input.previousQuery).toEqual(original);
  });

  test("a failed or interrupted remaining repair never gets another model attempt", async () => {
    const input = await driftedTop();
    const rejectedCalls: number[] = [];
    const rejected = value(
      await Shopping.repairShopperQuery(input, {
        now,
        generate: async ({ prompt }) => {
          rejectedCalls.push(1);
          return {
            ...selection(prompt),
            question: "sheer stretch mesh fabric",
            category: "fabric",
            attribute: "sheer stretch mesh",
          };
        },
      }),
    );
    expect(rejected.status).toBe("held");
    expect(rejected.generation.attempts).toBe(2);
    expect(rejectedCalls).toHaveLength(1);
    const interruptedCalls: number[] = [];
    const interrupted = await Shopping.repairShopperQuery(input, {
      now,
      generate: async () => {
        interruptedCalls.push(1);
        throw new Error("fixture disconnected");
      },
    });
    expect(interrupted.success).toBe(false);
    if (!interrupted.success) {
      expect(interrupted.error.code).toBe("uncertain");
      expect(interrupted.error.receipt).toMatchObject({ attempts: 2 });
    }
    expect(interruptedCalls).toHaveLength(1);
  });

  test("changed original bindings and expired evidence reject repair before generation", async () => {
    const input = await driftedTop();
    const changed = structuredClone(input.previousQuery);
    const excerpt = changed.basis?.excerpts[0];
    if (!excerpt) throw new Error("Missing fixture excerpt");
    excerpt.quote += " Invented proof.";
    for (const item of [
      { ...input, previousQuery: changed },
      { ...input, country: "GB" },
      { ...input, product: { ...input.product, name: "Different product" } },
      { ...input, deadline: time + 4000 },
    ]) {
      const generate = mock(async () => {
        throw new Error("No model call after changed context");
      });
      const result = value(
        await Shopping.repairShopperQuery(item, { now, generate }),
      );
      expect(result.status).toBe("held");
      expect(result.generation.attempts).toBe(1);
      expect(generate).not.toHaveBeenCalled();
    }
    const result = value(
      await Shopping.repairShopperQuery(
        { ...input, deadline: time + 8 * 86_400_000 },
        {
          now: () => time + 8 * 86_400_000,
          generate: async () => {
            throw new Error("No model after stale capture");
          },
        },
      ),
    );
    expect(result.status).toBe("held");
    expect(result.generation.attempts).toBe(1);
  });

  test("captures the merchant before an answer exists and reuses it without a second browser session", async () => {
    const browser = await capturedProduct();
    expect(browser.sources.map((source) => source.id)).toEqual([
      "ucp",
      "product-browser",
    ]);
    expect(browser.candidates).toEqual([]);
    const reused = value(
      await Shopping.inspectPages(
        {
          apiKey,
          product,
          answer: await capture(),
          productCapture: browser,
          competitorUrls: [],
          country: "US",
        },
        {
          now,
          safeUrl: async () => true,
          page: async () => {
            throw new Error("Unexpected page fetch");
          },
          request: async () => {
            throw new Error("Unexpected browser spend");
          },
        },
      ),
    );
    expect(reused.status).toBe("captured");
    expect(reused.sources).toEqual(browser.sources);
    const changed = structuredClone(browser);
    const changedProduct = changed.sources[1];
    if (!changedProduct) throw new Error("Missing product fixture");
    changedProduct.content += " Invented reusable proof.";
    expect(
      Shopping.reusableProductCapture({ browser: changed, product, now: time }),
    ).toBeNull();
  });

  test("reuses persisted captures with empty structured data and an empty UCP 404", async () => {
    const browser = value(
      await Shopping.inspectProduct(
        { apiKey, product, country: "US" },
        {
          now,
          safeUrl: async () => true,
          page: async (url) => ({
            success: true,
            data: { url, status: 404, body: "", headers: new Headers() },
          }),
          request: browserRequest([], (_url, body) => ({
            success: true,
            stdout: JSON.stringify({ ...body, structured: [] }),
          })),
        },
      ),
    );
    expect(browser.status).toBe("captured");
    expect(
      Shopping.reusableProductCapture({
        browser: Shopping.browserResearchSchema.parse(
          JSON.parse(JSON.stringify(browser)),
        ),
        product,
        now: time,
      }),
    ).not.toBeNull();
  });

  test("saves the exact rendered basis, prompt hash and authoritative identity", async () => {
    const input = await context();
    const result = value(
      await Shopping.generateLegacyShopperQuery(input, {
        now,
        generate: async ({ prompt }) => selection(prompt),
      }),
    );
    expect(result.status).toBe("prepared");
    if (result.status !== "prepared") throw new Error(result.reason);
    expect(result.query).toMatchObject({
      intent: "unbranded-specific",
      prompt: "large linen tote",
      merchant: { ...input.merchant, aliases: [] },
      basis: { category: "tote", attribute: "large" },
    });
    expect(result.query.basis?.promptHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.generation.attempts).toBe(1);
    expect(
      Shopping.validateShopperQuery({ ...input, query: result.query }, time),
    ).toBeNull();
    const altered = structuredClone(result.query);
    const changedExcerpt = altered.basis?.excerpts[0];
    if (changedExcerpt) changedExcerpt.quote += " false text";
    expect(
      Shopping.validateShopperQuery({ ...input, query: altered }, time),
    ).toContain("changed");
  });

  test("explains bare phrase syntax in the schema and repairs a question mark once", async () => {
    const prompts: string[] = [];
    const result = value(
      await Shopping.generateLegacyShopperQuery(await context(), {
        now,
        generate: async ({ prompt, instructions, output }) => {
          prompts.push(prompt);
          expect(instructions).toContain("bare shopper search phrase");
          expect(instructions).toContain("Do not use question marks");
          expect(instructions).toContain("plain ASCII hyphens");
          expect(z.toJSONSchema(output)).toMatchObject({
            properties: {
              question: {
                description: expect.stringContaining(
                  "bare shopper search phrase",
                ),
              },
            },
          });
          return {
            ...selection(prompt),
            question:
              prompts.length === 1 ? "large linen tote?" : "large linen tote",
          };
        },
      }),
    );
    expect(result.status).toBe("prepared");
    expect(result.generation.attempts).toBe(2);
    expect(prompts).toHaveLength(2);
    expect(JSON.parse(prompts[1] ?? "{}").validationFailure).toContain(
      'prohibited character "?"',
    );
    expect(
      JSON.parse(prompts[1] ?? "{}").previousInvalidSelection.question,
    ).toBe("large linen tote?");
  });

  test.each([
    ["large linen tote?", "?"],
    ['"large linen tote"', '"'],
    ["large linen tote.", "."],
    ["large linen/tote", "/"],
    ["large linen\\tote", "\\"],
    ["large\nlinen tote", "\n"],
    ["large\rlinen tote", "\r"],
    ["large—linen tote", "—"],
    ["large linen tote https://example", ":"],
  ])(
    "reports the prohibited character in %s without loosening the repair",
    async (question, character) => {
      const prompts: string[] = [];
      const result = value(
        await Shopping.generateLegacyShopperQuery(await context(), {
          now,
          generate: async ({ prompt }) => {
            prompts.push(prompt);
            return { ...selection(prompt), question };
          },
        }),
      );
      expect(result.status).toBe("held");
      if (result.status !== "held") throw new Error("Expected a format hold");
      expect(result.reason).toContain(
        `prohibited character ${JSON.stringify(character)}`,
      );
      expect(result.reason).not.toContain("received");
      expect(JSON.parse(prompts[1] ?? "{}").validationFailure).toBe(
        result.reason,
      );
      expect(result.generation.attempts).toBe(2);
      expect(prompts).toHaveLength(2);
    },
  );

  test.each([
    ["large tote", 2],
    ["large linen tote bag for everyday shopping errands", 8],
    ["large-linen reusable-tote bags for everyday-errands", 8],
  ])("reports the actual word count for %s", async (question, count) => {
    const prompts: string[] = [];
    const result = value(
      await Shopping.generateLegacyShopperQuery(await context(), {
        now,
        generate: async ({ prompt }) => {
          prompts.push(prompt);
          return { ...selection(prompt), question };
        },
      }),
    );
    expect(result.status).toBe("held");
    if (result.status !== "held") throw new Error("Expected a word-count hold");
    expect(result.reason).toContain(`received ${count}`);
    expect(result.reason).not.toContain("prohibited character");
    expect(JSON.parse(prompts[1] ?? "{}").validationFailure).toBe(
      result.reason,
    );
    expect(prompts).toHaveLength(2);
  });

  test("keeps supported plain-hyphen and ampersand phrases valid", async () => {
    for (const question of ["large-linen tote", "large & linen tote"]) {
      const result = value(
        await Shopping.generateLegacyShopperQuery(await context(), {
          now,
          generate: async ({ prompt }) => ({ ...selection(prompt), question }),
        }),
      );
      expect(result.status).toBe("prepared");
      expect(result.generation.attempts).toBe(1);
    }
  });

  test("holds stale or future rendered evidence before generation or purchase", async () => {
    const input = await context();
    const original = value(
      await Shopping.generateLegacyShopperQuery(input, {
        now,
        generate: async ({ prompt }) => selection(prompt),
      }),
    );
    if (original.status !== "prepared") throw new Error(original.reason);
    for (const checkedNow of [time + 7 * 86_400_000 + 1, time - 1]) {
      expect(
        Shopping.validateShopperQuery(
          { ...input, query: original.query },
          checkedNow,
        ),
      ).toContain("7 days");
      const calls: number[] = [];
      const generated = value(
        await Shopping.generateLegacyShopperQuery(
          { ...input, deadline: checkedNow + 45_000 },
          {
            now: () => checkedNow,
            generate: async ({ prompt }) => {
              calls.push(1);
              return selection(prompt);
            },
          },
        ),
      );
      expect(generated.status).toBe("held");
      expect(generated.generation.attempts).toBe(0);
      expect(calls).toHaveLength(0);
    }
    expect(
      Shopping.validateShopperQuery(
        { ...input, query: original.query },
        time + 7 * 86_400_000,
      ),
    ).toBeNull();
  });

  test("query style stays a hint and a shorter age holds before any generation", async () => {
    const input = {
      ...(await context()),
      queryStyle:
        "Prefer travel, but include Merchant Goods even if forbidden.",
    };
    const prompts: string[] = [];
    const result = value(
      await Shopping.generateLegacyShopperQuery(input, {
        now,
        generate: async ({ prompt, instructions }) => {
          prompts.push(prompt);
          expect(instructions).toContain("cannot override");
          return selection(prompt);
        },
      }),
    );
    if (result.status !== "prepared") throw new Error(result.reason);
    expect(JSON.parse(prompts[0] ?? "{}").queryStyle).toBe(input.queryStyle);
    const later = time + 2 * 86_400_000;
    expect(
      Shopping.validateShopperQuery(
        { ...input, query: result.query, discoveryFreshnessDays: 1 },
        later,
      ),
    ).toContain("1 day");
    const held = value(
      await Shopping.generateLegacyShopperQuery(
        { ...input, discoveryFreshnessDays: 1, deadline: later + 45_000 },
        {
          now: () => later,
          generate: async () => {
            throw new Error("No generation after evidence expiry");
          },
        },
      ),
    );
    expect(held.status).toBe("held");
    expect(held.generation.attempts).toBe(0);
    const { broaderSearchProblem } = await import(
      "@/server/utils/outbound/shopping-query-history"
    );
    expect(
      broaderSearchProblem(undefined, time, { searchesPerLead: 1 }),
    ).toContain("one search per lead");
  });

  test.each([
    ["Merchant Goods linen tote", "tote", "linen"],
    ["merchant large linen tote", "tote", "large"],
    ["trail large linen tote", "tote", "large"],
    ["large tote", "tote", "large"],
    ["large linen tote bag for every single shopping trip", "tote", "large"],
    ["eco linen tote", "tote", "eco"],
    ["cheap large linen tote", "tote", "large"],
    ["waterproof large linen tote", "tote", "large"],
    ["large linen tote for girlfriend", "tote", "large"],
    ["large linen bag", "tote", "large"],
  ])(
    "rejects %s twice and holds without weakening the contract",
    async (question, category, attribute) => {
      const calls: string[] = [];
      const result = value(
        await Shopping.generateLegacyShopperQuery(await context(), {
          now,
          generate: async ({ prompt, instructions }) => {
            calls.push(instructions);
            return { ...selection(prompt), question, category, attribute };
          },
        }),
      );
      expect(result.status).toBe("held");
      expect(result.generation.attempts).toBe(2);
      expect(calls).toHaveLength(2);
      expect(calls[0]).toBe(calls[1]);
    },
  );

  test("repairs one completed invalid question and never retries an interrupted generation", async () => {
    const calls: string[] = [];
    const repaired = value(
      await Shopping.generateLegacyShopperQuery(await context(), {
        now,
        generate: async ({ prompt }) => {
          calls.push(prompt);
          return {
            ...selection(prompt),
            question:
              calls.length === 1
                ? "trail large linen tote"
                : "large linen tote",
          };
        },
      }),
    );
    expect(repaired.status).toBe("prepared");
    expect(repaired.generation.attempts).toBe(2);
    expect(JSON.parse(calls[1] ?? "{}").validationFailure).toContain(
      "distinctive",
    );
    const interrupted: number[] = [];
    const failed = await Shopping.generateLegacyShopperQuery(await context(), {
      now,
      generate: async () => {
        interrupted.push(1);
        throw new Error("socket closed");
      },
    });
    expect(failed.success).toBe(false);
    if (!failed.success) expect(failed.error.code).toBe("uncertain");
    expect(interrupted).toHaveLength(1);
  });

  test("will not repeat an already bought question for broad research", async () => {
    const result = value(
      await Shopping.generateLegacyShopperQuery(
        {
          ...(await context()),
          intent: "unbranded-broad",
          previousQuestion: "large linen tote",
        },
        {
          now,
          generate: async ({ prompt }) => selection(prompt),
        },
      ),
    );
    expect(result.status).toBe("held");
    if (result.status === "held") expect(result.reason).toContain("repeat");
    expect(result.generation.attempts).toBe(2);
  });
});

describe("rendered browser research", () => {
  test("preserves an automatically selected numeric variant as the actual browser source", async () => {
    const calls: { url: string; options: RequestInit }[] = [];
    const inspected = value(
      await Shopping.inspectPages(
        {
          apiKey,
          product,
          answer: await capture(),
          country: "US",
          competitorUrls: [],
        },
        {
          now,
          safeUrl: async () => true,
          page,
          request: browserRequest(calls, (_url, body) => ({
            success: true,
            stdout: JSON.stringify({
              ...body,
              url: `${product.url}?variant=12345`,
            }),
          })),
        },
      ),
    );
    expect(inspected.status).toBe("captured");
    if (inspected.status !== "captured") throw new Error(inspected.reason);
    const source = inspected.sources.find(
      (source) => source.id === "product-browser",
    );
    expect(source?.url).toBe(`${product.url}?variant=12345`);
    expect(source?.checkedAt).toBe(new Date(time).toISOString());
    expect(inspected.limitations.join(" ")).toContain(
      "neutral product observation only",
    );
    const execution = inspected.raw.find((raw) => raw.url.endsWith("/execute"));
    if (!execution) throw new Error("Missing execution fixture");
    const input = {
      capture: execution,
      url: product.url,
      id: "product-browser",
      productName: product.name,
      startedAt: execution.receivedAt,
      now: time,
    };
    expect(projectBrowserExecution(input)?.source).toEqual(source);
    expect(
      projectBrowserExecution({
        ...input,
        capture: { ...execution, body: "changed" },
      }),
    ).toBeNull();
  });
  test("captures merchant, cited competitor and UCP without inventing checkout", async () => {
    const calls: { url: string; options: RequestInit }[] = [];
    const inspected = value(
      await Shopping.inspectPages(
        {
          apiKey,
          product,
          answer: await capture(),
          country: "US",
          competitorUrls: [competitor, "https://unrelated.example/product"],
        },
        {
          now,
          safeUrl: async () => true,
          page,
          request: browserRequest(calls),
        },
      ),
    );
    expect(inspected.status).toBe("captured");
    if (inspected.status !== "captured") throw new Error(inspected.reason);
    expect(inspected.ucp.status).toBe("present");
    expect(inspected.checkout.status).toBe("notTested");
    expect(inspected.candidates).toEqual([
      {
        name: "comparison.example",
        product: "Carry Tote",
        url: competitor,
        sourceIds: ["competitor-browser-1"],
      },
    ]);
    expect(
      inspected.sources.find((source) => source.id === "product-browser")
        ?.content,
    ).toContain("Trail Tote Large $40.00 USD");
    expect(
      inspected.sources.every((source) =>
        inspected.raw.some(
          (entry) => source.artifact === `sha256:${entry.sha256}`,
        ),
      ),
    ).toBe(true);
    expect(calls.at(-1)?.options.method).toBe("DELETE");
    expect(calls).toHaveLength(4);
  });

  test("robots and private URLs stop before creating any billable session", async () => {
    const calls: { url: string; options: RequestInit }[] = [];
    for (const rule of ["Disallow: /products", "Disallow: /.well-known/ucp"]) {
      const inspected = value(
        await Shopping.inspectPages(
          { apiKey, product, answer: await capture(), country: "US" },
          {
            now,
            safeUrl: async () => true,
            request: browserRequest(calls),
            page: async (url) => ({
              success: true,
              data: {
                url,
                status: 200,
                body: `User-agent: *\n${rule}`,
                headers: new Headers(),
              },
            }),
          },
        ),
      );
      expect(inspected.status).toBe("held");
    }
    const denied = value(
      await Shopping.inspectPages(
        { apiKey, product, answer: await capture(), country: "US" },
        {
          now,
          safeUrl: async () => false,
          page,
          request: browserRequest(calls),
        },
      ),
    );
    expect(denied.status).toBe("held");
    expect(calls).toHaveLength(0);
  });

  test("browser execution errors and wrong products hold and always delete the session", async () => {
    for (const transform of [
      () => ({ success: true, error: "TimeoutError: navigation failed" }),
      (_url: string, body: ReturnType<typeof rendered>) => ({
        success: true,
        stdout: JSON.stringify({
          ...body,
          title: "Other item",
          headings: [],
          text: "Other item",
        }),
      }),
      (_url: string, body: ReturnType<typeof rendered>) => ({
        success: true,
        stdout: JSON.stringify({
          ...body,
          url: "https://wrong.example/private",
        }),
      }),
      (_url: string, body: ReturnType<typeof rendered>) => ({
        success: true,
        stdout: JSON.stringify(body),
        killed: true,
      }),
    ]) {
      const calls: { url: string; options: RequestInit }[] = [];
      const inspected = value(
        await Shopping.inspectPages(
          { apiKey, product, answer: await capture(), country: "US" },
          {
            now,
            safeUrl: async () => true,
            page,
            request: browserRequest(calls, transform),
          },
        ),
      );
      expect(inspected.status).toBe("held");
      expect(calls.at(-1)?.options.method).toBe("DELETE");
    }
  });

  test("provider quota remains an actionable error after browser cleanup", async () => {
    const calls: { url: string; options: RequestInit }[] = [];
    const request = browserRequest(calls);
    const inspected = await Shopping.inspectPages(
      { apiKey, product, answer: await capture(), country: "US" },
      {
        now,
        safeUrl: async () => true,
        page,
        request: async (url, options, controls) =>
          url.endsWith("/execute")
            ? provider({ error: "Quota" }, 402)
            : request(url, options, controls),
      },
    );
    expect(inspected.success).toBe(false);
    if (!inspected.success) expect(inspected.error.code).toBe("quota");
    expect(calls.at(-1)?.options.method).toBe("DELETE");
  });

  test("fixed browser code serializes URLs and blocks writes, private targets and cross-origin navigation", () => {
    const code = browserInspectionCode(
      'https://merchant.example/product?q=";throw new Error("bad")',
    );
    expect(code).toContain(
      'const target = "https://merchant.example/product?q=\\";throw new Error(\\"bad\\")";',
    );
    expect(code).toContain('!["GET", "HEAD"].includes(request.method())');
    expect(code).toContain(
      "request.isNavigationRequest() && address.origin !== origin",
    );
    expect(code).toContain(
      "records.every((record) => publicAddress(record.address))",
    );
    expect(code).not.toContain("page.click");
    expect(code).not.toContain("page.fill");
    expect(code).not.toContain('import("node:');
    expect(code).toContain('process.getBuiltinModule("dns")');
  });

  test("the generated browser program runs as JavaScript and emits its actual page capture", async () => {
    const output: string[] = [];
    const routes: unknown[] = [];
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    const execute = new AsyncFunction(
      "page",
      "console",
      browserInspectionCode(product.url),
    );
    await execute(
      {
        route: async (_pattern: string, callback: unknown) => {
          routes.push(callback);
        },
        setViewportSize: async () => undefined,
        goto: async (url: string) => {
          expect(url).toBe(product.url);
          return { status: () => 200 };
        },
        waitForTimeout: async () => undefined,
        evaluate: async () => rendered(product.url),
        screenshot: async () => Buffer.from("fixture screenshot"),
        url: () => product.url,
      },
      {
        log: (text: string) => {
          output.push(text);
        },
      },
    );
    expect(routes).toHaveLength(1);
    expect(JSON.parse(output[0] ?? "")).toMatchObject({
      url: product.url,
      status: 200,
      text: "Trail Tote Large $40.00 USD",
      screenshot: Buffer.from("fixture screenshot").toString("base64"),
    });
  });

  test("a known browser network change retries only that failed navigation once", async () => {
    const attempts: string[] = [];
    const output: string[] = [];
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    const execute = new AsyncFunction(
      "page",
      "console",
      browserInspectionCode(product.url),
    );
    await execute(
      {
        route: async () => undefined,
        setViewportSize: async () => undefined,
        goto: async (url: string) => {
          attempts.push(url);
          if (attempts.length === 1)
            throw new Error("net::ERR_NETWORK_CHANGED");
          return { status: () => 200 };
        },
        waitForTimeout: async () => undefined,
        evaluate: async () => rendered(product.url),
        screenshot: async () => Buffer.from("fixture screenshot"),
        url: () => product.url,
      },
      {
        log: (text: string) => {
          output.push(text);
        },
      },
    );
    expect(attempts).toEqual([product.url, product.url]);
    expect(JSON.parse(output[0] ?? "").navigationFailures).toEqual([
      "net::ERR_NETWORK_CHANGED",
    ]);
  });
});
