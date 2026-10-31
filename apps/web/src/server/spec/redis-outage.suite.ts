import {
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  spyOn,
  test,
} from "bun:test";

/**
 * Every Redis-backed limiter with Redis up and with Redis gone. `withContext`
 * runs for real, so a visit goes through the same layers as a beacon does, and
 * only what it would need a request or a database for is replaced. Run by
 * `redis-outage.test.ts`, in a process of its own: see there for why.
 */

const captureException = mock((_error: Error, _context?: unknown) => {});

mock.module("@sentry/nextjs", () => ({
  captureException,
  captureMessage: () => {},
  addBreadcrumb: () => {},
  startInactiveSpan: () => ({
    setAttribute: () => {},
    recordException: () => {},
    setStatus: () => {},
    end: () => {},
  }),
  withServerActionInstrumentation: (
    _name: string,
    _options: unknown,
    run: () => unknown,
  ) => run(),
}));

const outage = new Error(
  "getaddrinfo ENOTFOUND absolute-pony-80073.upstash.io",
);

const counter = { value: 1, down: false, keys: [] as string[] };

const command =
  <T>(answer: () => T) =>
  async () => {
    if (counter.down) throw outage;
    return answer();
  };

const pipeline = () => {
  const commands = {
    incr: (key: string) => {
      counter.keys.push(key);
      return commands;
    },
    expire: () => commands,
    exec: command(() => [counter.value, 1]),
  };
  return commands;
};

mock.module("../utils/durable", () => ({
  redis: {
    incr: command(() => counter.value),
    expire: command(() => 1),
    get: command(() => null),
    set: command(() => "OK"),
    pipeline,
  },
}));

mock.module("@/lib/auth", () => ({ auth: { api: {} } }));
mock.module("../app/product", () => ({}));

const actual = {
  headers: { ...(await import("next/headers")) },
  repository: { ...(await import("../utils/repository")) },
  tracking: { ...(await import("../utils/tracking")) },
};

mock.module("next/headers", () => ({
  ...actual.headers,
  headers: async () => new Headers(),
}));

const TRACKER_KEY = "tracker-key";

const rows: Record<string, unknown>[] = [];

mock.module("../utils/repository", () => ({
  ...actual.repository,
  repository: () => ({
    get: async () => ({
      success: true,
      data: {
        id: "store",
        userId: "merchant",
        domain: "shop.example.com",
        storefrontHosts: [],
        trackerApiKey: TRACKER_KEY,
      },
    }),
    create: async (_environment: unknown, row: Record<string, unknown>) => {
      rows.push(row);
      return { success: true, data: { id: "row", ...row } };
    },
  }),
}));

mock.module("../utils/tracking", () => ({
  ...actual.tracking,
  resolveProductFromPageUrl: async () => ({
    success: true,
    data: { productId: null, externalProductId: null },
  }),
}));

const { Environment } = await import("../utils/environment");
const { reportFailOpen } = await import("../utils/fail-open");
const OfferBudget = await import("../app/intelligence/offer-budget");
const { consumeAnonymousMessage } = await import(
  "../app/intelligence/ucp/playground-limit"
);
const { isRateLimited } = await import("../app/ucp/rate-limit");
const { fetchPlatformProfile } = await import("../app/ucp/negotiation");
const DealRedemption = await import("../app/deal-redemption");
const Tracking = await import("../app/tracking");

const visit = (apiKey = TRACKER_KEY) =>
  Tracking.recordAgentVisit(Environment.SERVER, {
    apiKey,
    origin: null,
    payload: {
      storeId: "store",
      productUrl: "https://shop.example.com/products/thing",
      userAgent: "ChatGPT-User/1.0",
      referrer: null,
      agentType: "chatgpt-user",
      agentCategory: "user-action",
      detectionMethod: "user-agent",
      pageType: "product",
      productExternalId: null,
      timestamp: "2026-10-31T00:00:00Z",
    },
  });

/** Each answers whether the request it guards was let through. */
const limiters: [string, () => Promise<boolean>][] = [
  [
    "offers-budget",
    async () =>
      (
        await OfferBudget.consumeBudget({
          store: "store",
          plan: "compete",
          operation: "operation",
        })
      ).allowed,
  ],
  [
    "offers-trial",
    async () =>
      (
        await OfferBudget.consumeTrialLookup({
          store: "store",
          operation: "operation",
        })
      ).allowed,
  ],
  [
    "ucp-playground-quota",
    async () => (await consumeAnonymousMessage(new Headers())).allowed,
  ],
  [
    "ucp-requests",
    async () => !(await isRateLimited({ store: "s", headers: new Headers() })),
  ],
  [
    "ucp-profile-fetches",
    async () =>
      (await fetchPlatformProfile("https://platform.example.com/profile"))
        .success,
  ],
  [
    "deal-redemption",
    async () =>
      (
        await DealRedemption.record(Environment.SERVER, {
          merchant: "yc",
          client: "203.0.113.7",
          payload: { email: "founder@example.com", contactName: "A Founder" },
        })
      ).success,
  ],
  ["agent-visit", async () => (await visit()).success],
];

/** Sentry also hears from `withContext`, so only count this signal. */
const reports = () =>
  captureException.mock.calls.filter(
    ([, context]) =>
      (context as { fingerprint?: string[] } | undefined)?.fingerprint?.[0] ===
      "rate-limit-fail-open",
  ) as [Error, { tags: Record<string, string> }][];

const MINUTE = 60_000;
const clock = { now: Date.UTC(2026, 9, 31, 12) };

const advance = (milliseconds: number) => {
  clock.now += milliseconds;
  setSystemTime(new Date(clock.now));
};

const logged = spyOn(console, "error").mockImplementation(() => {});
const fetched = spyOn(globalThis, "fetch").mockImplementation(
  (async () =>
    new Response(JSON.stringify({ ucp: {} }))) as unknown as typeof fetch,
);

beforeEach(() => {
  advance(MINUTE + 1);
  captureException.mockClear();
  logged.mockClear();
  fetched.mockClear();
  rows.length = 0;
  counter.value = 1;
  counter.down = false;
  counter.keys.length = 0;
});

describe.each(limiters)("%s", (name, request) => {
  test("lets the request through and reports nothing while Redis answers", async () => {
    expect(await request()).toBe(true);
    expect(reports()).toEqual([]);
  });

  test("still refuses a request over its limit", async () => {
    counter.value = Number.MAX_SAFE_INTEGER;

    expect(await request()).toBe(false);
    expect(reports()).toEqual([]);
  });

  test("lets the request through and says so when Redis is down", async () => {
    counter.down = true;

    expect(await request()).toBe(true);

    expect(reports()).toHaveLength(1);
    const [error, context] = reports()[0] as [
      Error,
      { tags: Record<string, string> },
    ];
    expect(error.message).toContain(`"${name}"`);
    expect(error.cause).toBe(outage);
    expect(context.tags).toEqual({ rate_limit_policy: name });
    expect(logged).toHaveBeenCalledTimes(1);
  });
});

describe("an agent visit", () => {
  test("is recorded when the counter fails", async () => {
    counter.down = true;

    const recorded = await visit();

    expect(recorded.success).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      storeId: "store",
      userId: "merchant",
      agentType: "chatgpt-user",
      pageUrl: "https://shop.example.com/products/thing",
    });
  });

  test("is not recorded over the cap while the counter works", async () => {
    counter.value = 1001;

    const recorded = await visit();

    expect(recorded.success).toBe(false);
    expect(rows).toEqual([]);
  });

  test("is still refused for a wrong tracker key during an outage", async () => {
    counter.down = true;

    const recorded = await visit("not-the-key");

    expect(recorded.success).toBe(false);
    expect(rows).toEqual([]);
    expect(reports()).toEqual([]);
  });

  test("counts in a window of its own, so a lost EXPIRE cannot close it for good", async () => {
    await visit();
    await visit();
    advance(60 * MINUTE);
    await visit();

    const [first, second, third] = counter.keys;
    expect(first).toBe(second as string);
    expect(third).not.toBe(first as string);
  });
});

describe("the offer budget", () => {
  const book = () =>
    OfferBudget.consumeBudget({
      store: "store",
      plan: "compete",
      operation: "operation",
    });

  const allowance = OfferBudget.monthlyAllowance("compete");

  test("allows up to the plan's allowance and no further", async () => {
    counter.value = allowance;
    expect(await book()).toEqual({ allowed: true, used: allowance, allowance });

    counter.value = allowance + 1;
    expect(await book()).toEqual({
      allowed: false,
      used: allowance + 1,
      allowance,
    });
  });

  test("claims no usage when it could not count", async () => {
    counter.down = true;

    expect(await book()).toEqual({ allowed: true, used: 0, allowance });
  });

  test("stays silent when only its cache is down, which is not a limit", async () => {
    counter.down = true;

    expect(await OfferBudget.cachedLookup("lookup")).toBeNull();
    await OfferBudget.cacheLookup(
      "lookup",
      {} as Parameters<typeof OfferBudget.cacheLookup>[1],
    );

    expect(reports()).toEqual([]);
    expect(logged).not.toHaveBeenCalled();
  });
});

describe("the report", () => {
  test("goes out once a minute however many limiters fail", async () => {
    counter.down = true;

    await Promise.all(limiters.map(([, request]) => request()));
    expect(reports()).toHaveLength(1);

    advance(MINUTE);
    await limiters[0]?.[1]();
    expect(reports()).toHaveLength(2);
  });

  test("is not silenced by a clock stepping back", () => {
    reportFailOpen("first", outage);
    advance(-60 * MINUTE);
    reportFailOpen("second", outage);

    expect(captureException).toHaveBeenCalledTimes(2);
  });
});
