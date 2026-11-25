import { describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import type * as HTTP from "@/server/utils/http";
import type { AiCapture } from "@/server/utils/outbound/live-shopping-contract";

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
    expect(observed.success).toBe(true);
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
