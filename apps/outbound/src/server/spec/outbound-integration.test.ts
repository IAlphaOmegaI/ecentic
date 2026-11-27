import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { z } from "zod";
import * as HTTP from "@/server/utils/http";
import { productLinks, sitemapLinks } from "@/server/utils/outbound/discovery";
import * as Google from "@/server/utils/outbound/google";
import { request, retryAfter } from "@/server/utils/outbound/http";
import {
  addresses,
  classifyInbound,
  type Mail,
} from "@/server/utils/outbound/inbound";
import * as Providers from "@/server/utils/outbound/providers";
import {
  blockedByRobots,
  inspectProductPage,
} from "@/server/utils/outbound/research";
import { isSafePublicHttpUrl } from "@/server/utils/ssrf";

mock.module("server-only", () => ({}));
const Credentials = await import("@/server/app/outbound/provider-credentials");
const resolveKey = spyOn(Credentials, "resolveKey");
const resolveCredentials = spyOn(Credentials, "resolve");
const metadata = spyOn(Credentials, "metadata");
const keyNames = {
  unipile: "OUTBOUND_UNIPILE_API_KEY",
  warmbly: "OUTBOUND_WARMBLY_API_KEY",
  claude: "OUTBOUND_CLAUDE_API_KEY",
  apollo: "OUTBOUND_APOLLO_API_KEY",
  clay: "OUTBOUND_CLAY_API_KEY",
  google: "OUTBOUND_GOOGLE_CLIENT_SECRET",
  scrapellm: "OUTBOUND_SCRAPELLM_API_KEY",
  firecrawl: "OUTBOUND_FIRECRAWL_API_KEY",
  hubspot: "OUTBOUND_HUBSPOT_API_KEY",
} as const;
beforeEach(() => {
  resolveKey.mockImplementation(async (provider = "unipile") => ({
    success: true,
    data: process.env[keyNames[provider]] ?? null,
  }));
  resolveCredentials.mockImplementation(async (provider = "unipile") => ({
    success: true,
    data: {
      apiKey: process.env[keyNames[provider]] ?? null,
      configuration:
        provider === "google"
          ? { clientId: process.env.OUTBOUND_GOOGLE_CLIENT_ID ?? "" }
          : provider === "clay"
            ? { routineId: process.env.OUTBOUND_CLAY_ROUTINE_ID ?? "" }
            : {},
    },
  }));
  metadata.mockImplementation(async (provider = "unipile") => ({
    success: true,
    data: {
      configured: Boolean(process.env[keyNames[provider]]),
      credentialStatus: "environment",
      configuration:
        provider === "google"
          ? { clientId: process.env.OUTBOUND_GOOGLE_CLIENT_ID ?? "" }
          : provider === "clay"
            ? { routineId: process.env.OUTBOUND_CLAY_ROUTINE_ID ?? "" }
            : {},
    },
  }));
});
afterAll(() => {
  resolveKey.mockRestore();
  resolveCredentials.mockRestore();
  metadata.mockRestore();
});

const originalFetch = globalThis.fetch;
const originalApollo = process.env.OUTBOUND_APOLLO_API_KEY;
const originalClay = process.env.OUTBOUND_CLAY_API_KEY;
const originalRoutine = process.env.OUTBOUND_CLAY_ROUTINE_ID;
const originalGoogle = Object.fromEntries(
  [
    "OUTBOUND_GOOGLE_CLIENT_ID",
    "OUTBOUND_GOOGLE_CLIENT_SECRET",
    "APP_HOST",
    "CREDENTIAL_ENCRYPTION_KEY",
    "OUTBOUND_SCRAPELLM_API_KEY",
    "OUTBOUND_FIRECRAWL_API_KEY",
  ].map((key) => [key, process.env[key]]),
);
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, original] of [
    ["OUTBOUND_APOLLO_API_KEY", originalApollo],
    ["OUTBOUND_CLAY_API_KEY", originalClay],
    ["OUTBOUND_CLAY_ROUTINE_ID", originalRoutine],
  ] as const) {
    if (original === undefined) Reflect.deleteProperty(process.env, key);
    else Object.assign(process.env, { [key]: original });
  }
  for (const [key, value] of Object.entries(originalGoogle)) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else Object.assign(process.env, { [key]: value });
  }
});
const fetched = (
  handler: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>,
) => {
  globalThis.fetch = Object.assign(handler, {
    preconnect: originalFetch.preconnect,
  });
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("bounded provider requests", () => {
  test("shopping research readiness requires both keys and status reads do not call providers", async () => {
    fetched(async () => {
      throw new Error("Integration status must not call a provider");
    });
    for (const connected of [
      [],
      ["scrapellm"],
      ["firecrawl"],
      ["scrapellm", "firecrawl"],
    ]) {
      for (const provider of ["scrapellm", "firecrawl"] as const) {
        Reflect.deleteProperty(process.env, keyNames[provider]);
        if (connected.includes(provider))
          Object.assign(process.env, { [keyNames[provider]]: "synthetic-key" });
      }
      const status = await Providers.getIntegrationStatus();
      expect(status.research.configured).toBe(connected.length === 2);
      expect(status.research.scrapellm.configured).toBe(
        connected.includes("scrapellm"),
      );
      expect(status.research.firecrawl.configured).toBe(
        connected.includes("firecrawl"),
      );
      expect(JSON.stringify(status.research)).not.toContain("synthetic-key");
    }
  });
  test("Apollo key checks use auth health and require both authenticated health flags", async () => {
    const calls: { url: string; options?: RequestInit }[] = [];
    fetched(async (input, options) => {
      calls.push({ url: String(input), options });
      return json({ healthy: true, is_logged_in: true });
    });
    expect(await Providers.validateApolloKey("candidate-test-key")).toEqual({
      success: true,
      data: { valid: true },
    });
    expect(calls[0]?.url).toBe("https://api.apollo.io/api/v1/auth/health");
    expect(calls[0]?.options).toMatchObject({
      method: "GET",
      headers: { "x-api-key": "candidate-test-key" },
    });
    fetched(async () => json({ healthy: true, is_logged_in: false }));
    expect(
      await Providers.validateApolloKey("candidate-test-key"),
    ).toMatchObject({ success: false, error: { code: "access" } });
  });

  test("Clay key checks read the current account without running a routine", async () => {
    const calls: { url: string; options?: RequestInit }[] = [];
    fetched(async (input, options) => {
      calls.push({ url: String(input), options });
      return json({
        user: { id: "user_fixture", name: null },
        workspace: { id: "workspace_fixture" },
      });
    });
    expect(await Providers.validateClayKey("clay-test-key")).toEqual({
      success: true,
      data: { valid: true },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.clay.com/public/v0/me");
    expect(calls[0]?.options).toMatchObject({
      method: "GET",
      headers: { "clay-api-key": "clay-test-key" },
    });
    expect(calls[0]?.options?.body).toBeUndefined();
  });

  test("Google uses saved client settings and derives the callback from APP_HOST", async () => {
    Object.assign(process.env, {
      APP_HOST: "https://outbound.example.com/ignored/path",
    });
    resolveCredentials.mockResolvedValue({
      success: true,
      data: {
        apiKey: "saved-google-secret",
        configuration: { clientId: "123-saved.apps.googleusercontent.com" },
      },
    });
    const authorization = await Google.getAuthorizationUrl({
      state: "a".repeat(43),
    });
    expect(authorization.success).toBe(true);
    if (!authorization.success) throw authorization.error;
    const parameters = new URL(authorization.data).searchParams;
    expect(parameters.get("client_id")).toBe(
      "123-saved.apps.googleusercontent.com",
    );
    expect(parameters.get("redirect_uri")).toBe(
      "https://outbound.example.com/api/integrations/outbound/google/callback",
    );
    expect(authorization.data).not.toContain("saved-google-secret");
    const bodies: string[] = [];
    fetched(async (_, options) => {
      bodies.push(String(options?.body));
      return json({
        access_token: "fixture-access",
        expires_in: 3600,
        token_type: "Bearer",
      });
    });
    expect((await Google.exchangeCode({ code: "fixture-code" })).success).toBe(
      true,
    );
    const body = new URLSearchParams(bodies[0]);
    expect(body.get("client_secret")).toBe("saved-google-secret");
    expect(body.get("redirect_uri")).toBe(parameters.get("redirect_uri"));
  });

  test("Google callback URLs reject insecure public hosts and URL credentials", () => {
    for (const host of [
      "http://public.example.com",
      "https://user:secret@example.com",
      "javascript:alert(1)",
    ]) {
      Object.assign(process.env, { APP_HOST: host });
      expect(Google.getRedirectUri()).toBe("");
    }
    Object.assign(process.env, { APP_HOST: "http://localhost:3001/ignored" });
    expect(Google.getRedirectUri()).toBe(
      "http://localhost:3001/api/integrations/outbound/google/callback",
    );
  });

  test("access failure stays distinct from no data and does not leak a provider body", async () => {
    fetched(async () => json({ secret: "sensitive-provider-debug" }, 403));
    const result = await request(
      "apollo",
      "https://api.apollo.io/api/v1/test",
      { method: "GET" },
      z.object({ people: z.array(z.unknown()) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("access");
      expect(result.error.message).not.toContain("sensitive");
    }
  });
  test("Apollo credit exhaustion is actionable quota failure for search and enrichment", async () => {
    const calls: string[] = [];
    fetched(async (input) => {
      calls.push(String(input));
      return json(
        {
          error:
            "You have insufficient credits! <a href='https://app.apollo.io/#/settings/plans/upgrade?source=api_credit_limit'>Upgrade your plan</a> to increase your number of lead credits.",
          secret: "provider-debug-must-not-be-saved",
        },
        422,
      );
    });
    for (const [path, method] of [
      ["mixed_companies/search", "POST"],
      ["organizations/enrich?domain=example.com", "GET"],
    ]) {
      const response = await request(
        "apollo",
        `https://api.apollo.io/api/v1/${path}`,
        { method },
        z.object({}),
      );
      expect(response).toMatchObject({
        success: false,
        error: {
          code: "quota",
          statusCode: 422,
          providerCode: "insufficient_credits",
          message:
            "Apollo has insufficient credits. Add credits or wait for the account's credit reset.",
          receipt: {
            version: 1,
            provider: "apollo",
            statusCode: 422,
            code: "quota",
            providerCode: "insufficient_credits",
            retryAfterSeconds: null,
          },
        },
      });
      expect(JSON.stringify(response)).not.toContain("<a");
      expect(JSON.stringify(response)).not.toContain("provider-debug");
    }
    expect(calls).toHaveLength(2);
  });
  test("unrelated Apollo validation failures remain input errors", async () => {
    fetched(async () => json({ error: "Invalid page number" }, 422));
    expect(
      await request(
        "apollo",
        "https://api.apollo.io/api/v1/mixed_companies/search",
        { method: "POST" },
        z.object({}),
      ),
    ).toMatchObject({
      success: false,
      error: { code: "input", statusCode: 422, providerCode: null },
    });
  });
  test("interrupted POST is uncertain and is never retried", async () => {
    const calls: unknown[] = [];
    fetched(async (...args) => {
      calls.push(args);
      throw new TypeError("network failure");
    });
    const result = await request(
      "google",
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      { method: "POST" },
      z.object({ id: z.string() }),
    );
    expect(calls).toHaveLength(1);
    if (result.success) throw new Error("Expected uncertain result");
    expect(result.error.code).toBe("uncertain");
  });
  test("invalid successful response is a contract error", async () => {
    fetched(async () => json({ unexpected: true }));
    const result = await request(
      "apollo",
      "https://api.apollo.io/api/v1/test",
      { method: "GET" },
      z.object({ people: z.array(z.unknown()) }),
    );
    if (result.success) throw new Error("Expected contract error");
    expect(result.error.code).toBe("contract");
  });
  test("rate limit retry hint is retained without an automatic retry", async () => {
    fetched(
      async () =>
        new Response("{}", { status: 429, headers: { "Retry-After": "41" } }),
    );
    const result = await request(
      "clay",
      "https://api.clay.com/public/v0/test",
      { method: "GET" },
      z.object({}),
    );
    if (result.success) throw new Error("Expected rate limit");
    expect(result.error.code).toBe("rate-limit");
    expect(result.error.retryAfterSeconds).toBe(41);
    expect(retryAfter("Thu, 01 Jan 1970 00:01:00 GMT", 0)).toBe(60);
  });
  test("strict SSRF mode rejects local and metadata IPs even in development", async () => {
    expect(
      await isSafePublicHttpUrl("https://127.0.0.1", { allowLocal: false }),
    ).toBe(false);
    expect(
      await isSafePublicHttpUrl("https://169.254.169.254", {
        allowLocal: false,
      }),
    ).toBe(false);
    expect(
      await isSafePublicHttpUrl("https://[::1]", { allowLocal: false }),
    ).toBe(false);
    const calls: unknown[] = [];
    fetched(async (...args) => {
      calls.push(args);
      return json({});
    });
    expect(
      (await HTTP.request("https://127.0.0.1", {}, { strictGuard: true }))
        .success,
    ).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("Apollo and Clay contracts", () => {
  test("Apollo accepted rows map results record IDs while preserving submitted email identity", async () => {
    Object.assign(process.env, { OUTBOUND_APOLLO_API_KEY: "test-key" });
    fetched(async () =>
      json(
        {
          request_id: "123",
          status: "partially_accepted",
          results: [
            { status: "accepted", record_id: "accepted-row", errors: null },
            { status: "rejected", record_id: null, errors: ["rejected"] },
          ],
        },
        202,
      ),
    );
    const result = await Providers.verifyApolloEmails({
      emails: ["one@example.com", "two@example.com"],
    });
    expect(result).toMatchObject({
      success: true,
      data: {
        records: [
          { record_id: "accepted-row", input: { email: "one@example.com" } },
        ],
      },
    });
  });

  test("Apollo poll unwraps documented result IDs without inventing a verification date", async () => {
    Object.assign(process.env, { OUTBOUND_APOLLO_API_KEY: "test-key" });
    fetched(async () =>
      json({
        request_id: "123",
        webhook_status: "skipped",
        last_dispatched_at: "2026-11-14T00:00:00Z",
        webhook_result: {
          status: "success",
          results: [
            {
              id: "accepted-row",
              email: "one@example.com",
              validation_status: "validated",
              validator: "provider",
            },
          ],
        },
      }),
    );
    expect(
      await Providers.pollApolloVerification({ requestId: "123" }),
    ).toMatchObject({
      success: true,
      data: {
        results: [
          {
            recordId: "accepted-row",
            email: "one@example.com",
            status: "verified",
            verifiedAt: null,
          },
        ],
      },
    });
  });

  test("Apollo search uses selected domain and negative title filters", async () => {
    Object.assign(process.env, { OUTBOUND_APOLLO_API_KEY: "test-key" });
    fetched(async (url, init) => {
      expect(String(url)).toEndWith("/mixed_people/api_search");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        q_organization_domains_list: ["example.com"],
        person_not_titles: ["Intern"],
        include_similar_titles: false,
      });
      return json({ people: [], total_entries: 0 });
    });
    const result = await Providers.searchApolloPeople({
      domain: "example.com",
      titles: ["Founder"],
      excludedTitles: ["Intern"],
    });
    expect(result).toMatchObject({
      success: true,
      data: { people: [], total: 0 },
    });
  });
  test("missing credentials do not masquerade as an empty search", async () => {
    Reflect.deleteProperty(process.env, "OUTBOUND_APOLLO_API_KEY");
    const result = await Providers.searchApolloPeople({
      domain: "example.com",
      titles: ["Founder"],
    });
    if (result.success) throw new Error("Expected missing configuration");
    expect(result.error.code).toBe("configuration");
  });
  test("cached verification keeps provider timestamp and missing date stays absent", () => {
    const result = Providers.normalizeApolloVerification({
      records: [
        {
          record_id: "old",
          email: "jane@example.com",
          validation_status: "validated",
          verified_at: "2025-01-01T00:00:00Z",
        },
        {
          record_id: "no-date",
          input: { email: "joe@example.com" },
          validation_status: "validated",
        },
      ],
    });
    expect(result[0]?.verifiedAt).toBe("2025-01-01T00:00:00Z");
    expect(result[1]?.verifiedAt).toBeNull();
    expect(Providers.normalizeApolloVerification({ success: true })).toEqual(
      [],
    );
  });
  test("a correlated email-verifier completion supplies its unchanged provider timestamp", async () => {
    const completed = "2026-11-16T11:01:27Z";
    const payload = {
      webhook_result: {
        request_id: "3194005783294490431",
        action: "email_verifier",
        status: "success",
        request_initiated: "2026-11-16T11:01:18Z",
        request_completed: completed,
        results: [
          {
            id: "record",
            email: "one@example.com",
            validation_status: "validated",
          },
        ],
      },
    };
    const normalized = Providers.normalizeApolloVerification(
      payload,
      "3194005783294490431",
    );
    expect(normalized[0]).toMatchObject({
      verifiedAt: completed,
      status: "verified",
      timestampProof: {
        kind: "request-completed",
        requestId: "3194005783294490431",
        action: "email_verifier",
        initiatedAt: "2026-11-16T11:01:18Z",
        completedAt: completed,
      },
    });
    expect(
      Providers.normalizeApolloVerification(payload)[0]?.verifiedAt,
    ).toBeNull();
    expect(
      Providers.normalizeApolloVerification(payload, "wrong")[0]?.verifiedAt,
    ).toBeNull();
    for (const change of [
      { status: "failed" },
      { action: "people_enrichment" },
      { request_initiated: "2026-11-16T11:01:28Z" },
      { request_completed: "invalid" },
      { request_completed: new Date(Date.now() + 60000).toISOString() },
    ]) {
      expect(
        Providers.normalizeApolloVerification(
          { webhook_result: { ...payload.webhook_result, ...change } },
          "3194005783294490431",
        )[0]?.verifiedAt,
      ).toBeNull();
    }
    Object.assign(process.env, { OUTBOUND_APOLLO_API_KEY: "test-key" });
    fetched(async () => json(payload));
    expect(
      await Providers.pollApolloVerification({
        requestId: "3194005783294490431",
      }),
    ).toMatchObject({
      success: true,
      data: { results: [{ verifiedAt: completed }] },
    });
  });
  test("only explicit pending code treats Apollo 404 as pending", async () => {
    Object.assign(process.env, { OUTBOUND_APOLLO_API_KEY: "test-key" });
    fetched(async () => json({ error_code: "result_pending" }, 404));
    expect(
      await Providers.pollApolloVerification({ requestId: "abc" }),
    ).toMatchObject({ success: true, data: { status: "pending" } });
    fetched(async () => json({ error_code: "not_found" }, 404));
    expect(
      (await Providers.pollApolloVerification({ requestId: "abc" })).success,
    ).toBe(false);
  });
  test("Clay key-only credentials cannot run an enrichment routine or inherit an environment routine", async () => {
    Object.assign(process.env, {
      OUTBOUND_CLAY_ROUTINE_ID: "function:t_environment",
    });
    resolveCredentials.mockResolvedValue({
      success: true,
      data: {
        apiKey: "saved-key-only",
        configuration: { routineId: "" },
      },
    });
    const requests = mock(async () => json({ routine_run_id: "must-not-run" }));
    fetched(requests);
    expect(
      await Providers.startClayEnrichment({
        items: [{ id: "person-1", inputs: { domain: "example.com" } }],
      }),
    ).toMatchObject({
      success: false,
      error: { code: "configuration" },
    });
    expect(requests).not.toHaveBeenCalled();
  });

  test("Clay start and cursor page return per-item failures, never implied verification", async () => {
    Object.assign(process.env, {
      OUTBOUND_CLAY_API_KEY: "test-key",
      OUTBOUND_CLAY_ROUTINE_ID: "routine-1",
    });
    fetched(async (url, init) => {
      expect(String(url)).toEndWith("/routines/routine-1/run");
      expect(JSON.parse(String(init?.body))).toEqual({
        items: [{ id: "person-1", inputs: { domain: "example.com" } }],
      });
      return json({ routine_run_id: "run-1", status: "in_progress" }, 202);
    });
    expect(
      await Providers.startClayEnrichment({
        items: [{ id: "person-1", inputs: { domain: "example.com" } }],
      }),
    ).toMatchObject({
      success: true,
      data: { runId: "run-1", status: "pending" },
    });
    fetched(async () =>
      json({
        routine_run_id: "run-1",
        status: "complete",
        total: 2,
        finished: 2,
        cursor: "next",
        data: [
          { id: "person-1", status: "failed", error: { message: "No result" } },
        ],
      }),
    );
    expect(
      await Providers.pollClayEnrichment({ runId: "run-1" }),
    ).toMatchObject({
      success: true,
      data: {
        status: "complete",
        cursor: "next",
        results: [{ id: "person-1", status: "failed" }],
      },
    });
  });
  test("Clay polling rejects a provider response for a different acknowledged run", async () => {
    Object.assign(process.env, { OUTBOUND_CLAY_API_KEY: "test-key" });
    fetched(async () => json({ routine_run_id: "other-run", status: "complete", total: 1, finished: 1, data: [] }));
    expect(await Providers.pollClayEnrichment({ runId: "run-1" })).toMatchObject({
      success: false, error: { provider: "clay", code: "contract" },
    });
  });
});

const page = (product: unknown, extra = "") =>
  `<html><head><script type="application/ld+json">${JSON.stringify(product)}</script>${extra}</head><body><h1>Trail Shoe</h1></body></html>`;
const inspect = (body: string, status = 200) =>
  inspectProductPage({
    url: "https://example.com/products/shoe",
    body,
    status,
  });
describe("scoped product evidence", () => {
  test("discovery keeps observed product links on the same origin and caps at eight", () => {
    const links = productLinks(
      '<a href="/products/a?tracking=1">A</a><a href="https://other.example/products/b">B</a><a href="https://user:pass@example.com/products/c">C</a><a href="/products/a">A again</a>' +
        Array.from(
          { length: 20 },
          (_, index) => `<a href="/product/item-${index}">Item</a>`,
        ).join(""),
      "https://example.com",
    );
    expect(links).toHaveLength(8);
    expect(links[0]).toBe("https://example.com/products/a");
    expect(links.some((link) => /other|user:pass/.test(link))).toBe(false);
  });
  test("gift cards and online services do not exhaust the physical-product link budget", () => {
    const ignored = [
      "gift-card",
      "e-gift-card-volcom-black",
      "venum-gift-card",
      "virtual-consultation",
      "online-appointment",
      "digital-download",
      "e-book",
      "digital-voucher",
      "gift-cards",
    ]
      .map((name) => `<a href="/products/${name}">${name}</a>`)
      .join("");
    expect(
      productLinks(
        `${ignored}<a href="/products/gift-box">Gift box</a><a href="/products/shoe">Shoe</a>`,
        "https://example.com",
      ),
    ).toEqual([
      "https://example.com/products/gift-box",
      "https://example.com/products/shoe",
    ]);
  });
  test("sitemap parsing rejects malformed XML and unrelated domains", () => {
    expect(
      sitemapLinks(
        "<urlset><url><loc>https://example.com/product/a</loc></url><url><loc>https://other.example/product/b</loc></url></urlset>",
        "https://example.com",
      ),
    ).toEqual(["https://example.com/product/a"]);
    expect(
      sitemapLinks(
        "<urlset><url><loc>https://example.com/product/a",
        "https://example.com",
      ),
    ).toEqual([]);
  });
  test("403, challenges and malformed data cannot support missing-field claims", () => {
    expect(inspect("denied", 403).status).toBe("hold");
    expect(
      inspect(
        '<title>Just a moment...</title><script src="/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1"></script>',
      ).status,
    ).toBe("hold");
    expect(
      inspect(
        '<h1>Trail Shoe</h1><script type="application/ld+json">{bad</script>',
      ).status,
    ).toBe("hold");
  });
  test("barcode evidence is tied to the named product", () => {
    const result = inspect(
      page(
        { "@type": "Product", name: "Trail Shoe" },
        '<script type="application/json">{"title":"Trail Shoe","variants":[{"barcode":"4006381333931"}]}</script>',
      ),
    );
    expect(result.status).toBe("hold");
    expect(result.gap).toBe("barcode-missing-from-page-data");
    expect(result.evidence).toContain("4006381333931");
    expect(result.reason).toContain("rendered product page");
  });
  test("recommendation barcode is not attributed to the main product", () => {
    const result = inspect(
      page(
        { "@type": "Product", name: "Trail Shoe" },
        '<script type="application/json">{"title":"Trail Shoe","recommendations":[{"title":"Other Shoe","barcode":"1234567890123"}]}</script>',
      ),
    );
    expect(result.gap).toBe("barcode-not-observed");
    expect(result.evidence).not.toContain("1234567890123");
  });
  test("variant GTIN counts as data on the main product", () => {
    const result = inspect(
      page({
        "@type": "ProductGroup",
        name: "Trail Shoe",
        hasVariant: [
          { "@type": "Product", name: "Small Shoe", gtin13: "1234567890123" },
        ],
      }),
    );
    expect(result.status).toBe("hold");
  });
  test("unmodeled microdata requires review rather than a negative claim", () => {
    expect(
      inspect(
        page(
          { "@type": "Product", name: "Trail Shoe" },
          '<div itemscope itemtype="https://schema.org/Product"></div>',
        ),
      ).status,
    ).toBe("hold");
  });
  test("no product is hold, distinct from a confirmed missing field", () => {
    expect(inspect("<h1>A collection</h1>").status).toBe("hold");
  });
  test("robots rules respect a more specific allow and path boundaries", () => {
    const robots =
      "User-agent: *\nDisallow: /private/\nAllow: /private/public$";
    expect(blockedByRobots(robots, "/private/x")).toBe(true);
    expect(blockedByRobots(robots, "/private/public")).toBe(false);
    expect(blockedByRobots(robots, "/private/public-more")).toBe(true);
    expect(blockedByRobots(robots, "/products/shoe")).toBe(false);
  });
});

describe("Gmail MIME and inbound classification", () => {
  test("history reconciliation processes additions, not deleted or relabeled mail", async () => {
    fetched(async (url) => {
      expect(String(url)).toContain("historyTypes=messageAdded");
      return json({
        historyId: "19",
        history: [
          {
            id: "18",
            messages: [{ id: "deleted" }],
            messagesAdded: [{ message: { id: "reply", threadId: "thread" } }],
          },
        ],
      });
    });
    expect(
      await Google.listHistory({
        accessToken: "test-token",
        startHistoryId: "10",
      }),
    ).toMatchObject({
      success: true,
      data: {
        historyId: "19",
        messages: [{ id: "reply", threadId: "thread" }],
      },
    });
  });
  const base = {
    from: "juri@joinecentic.com",
    fromName: "Juri, ecentic",
    to: "jane@example.com",
    subject: "Trail Shoe check",
    body: "Hello Jane\n\nOne observation.",
    messageId: "<stable@joinecentic.com>",
  };
  test("keeps stable identity, quoted display names and real thread headers", () => {
    const built = Google.buildMessage({
      ...base,
      inReplyTo: "<previous@joinecentic.com>",
      references: ["<previous@joinecentic.com>"],
    });
    if (!built.success) throw built.error;
    const mime = Buffer.from(built.data.raw, "base64url").toString("utf8");
    expect(built.data.messageId).toBe(base.messageId);
    expect(mime).toContain('From: "Juri, ecentic" <juri@joinecentic.com>');
    expect(mime).toContain("In-Reply-To: <previous@joinecentic.com>");
    expect(mime).toContain(
      "List-Unsubscribe: <mailto:juri@joinecentic.com?subject=unsubscribe>",
    );
    expect(mime).not.toContain("text/html");
  });
  test("rejects header injection without sending", () => {
    expect(
      Google.buildMessage({
        ...base,
        fromName: "Juri\r\nBcc: victim@example.com",
      }).success,
    ).toBe(false);
    expect(
      Google.buildMessage({ ...base, subject: "Hi\nBcc: victim@example.com" })
        .success,
    ).toBe(false);
  });
  test("encodes non-ASCII subject and plain-text body correctly", () => {
    const result = Google.buildMessage({
      ...base,
      subject: "Caffè product check",
      body: "Caffè\nThanks",
    });
    if (!result.success) throw result.error;
    const mime = Buffer.from(result.data.raw, "base64url").toString();
    expect(mime).toContain("Subject: =?UTF-8?B?");
    expect(
      Buffer.from(mime.split("\r\n\r\n")[1] ?? "", "base64").toString(),
    ).toBe("Caffè\r\nThanks");
  });
  const mail = (text: string, headers: Record<string, string> = {}): Mail => ({
    id: "m1",
    threadId: "t1",
    internalDate: "1",
    text,
    headers,
  });
  test("opt-out overrides an auto-reply marker and quoted prior message", () => {
    expect(
      classifyInbound(
        mail("No thanks\nOn Monday, Juri wrote:\nHello", {
          "auto-submitted": "auto-replied",
        }),
      ),
    ).toBe("optout");
    expect(classifyInbound(mail("No"))).toBe("optout");
  });
  test("only clear automatic vacation replies continue", () => {
    expect(
      classifyInbound(
        mail("Out of office", { "auto-submitted": "auto-replied" }),
      ),
    ).toBe("ooo");
    expect(classifyInbound(mail("Out of office"))).toBe("reply");
    expect(
      classifyInbound(
        mail("We received your message", {
          "auto-submitted": "auto-generated",
        }),
      ),
    ).toBe("review");
  });
  test("hard mailbox DSN differs from a policy rejection", () => {
    expect(
      classifyInbound(
        mail("Status: 5.1.1", { from: "mailer-daemon@example.com" }),
      ),
    ).toBe("bounce");
    expect(
      classifyInbound(
        mail("Status: 5.7.1", { from: "mailer-daemon@example.com" }),
      ),
    ).toBe("review");
    expect(addresses("Jane <Jane@Example.com>, joe@example.com")).toEqual([
      "jane@example.com",
      "joe@example.com",
    ]);
  });
});
