import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  spyOn,
  test,
} from "bun:test";

/**
 * `consume` against a counter that answers, one that fails, and one that cannot
 * be built. The module holds a report timestamp, so each test starts past the
 * reporting interval rather than counting on the order they run in.
 */

const captureException = mock((_error: Error, _context: unknown) => {});
mock.module("@sentry/nextjs", () => ({ captureException }));

const counter = {
  exec: async (): Promise<number[]> => [1, 1],
};

const pipeline = () => {
  const commands = {
    incr: () => commands,
    expire: () => commands,
    exec: () => counter.exec(),
  };
  return commands;
};

mock.module("../utils/durable", () => ({ redis: { pipeline } }));

const { consume, NEWS_POLICY, PUBLIC_API_POLICY } = await import(
  "../utils/rate-limit"
);

const caller = {
  headers: new Headers({
    authorization: "Bearer ecentic_sk_abcdefghijklmnop_rest_of_secret",
    "x-forwarded-for": "203.0.113.7",
  }),
};

const MINUTE = 60_000;
const clock = { now: Date.UTC(2026, 9, 30, 12) };

const advance = (milliseconds: number) => {
  clock.now += milliseconds;
  setSystemTime(new Date(clock.now));
};

const logged = spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  advance(MINUTE + 1);
  captureException.mockClear();
  logged.mockClear();
  counter.exec = async () => [1, 1];
});

afterEach(() => {
  setSystemTime();
});

afterAll(() => {
  logged.mockRestore();
});

describe("consume with a working counter", () => {
  test("counts the window and reports nothing", async () => {
    counter.exec = async () => [7, 1];

    const verdict = await consume(caller);

    expect(verdict.allowed).toBe(true);
    expect(verdict.remaining).toBe(PUBLIC_API_POLICY.limit - 7);
    expect(captureException).not.toHaveBeenCalled();
    expect(logged).not.toHaveBeenCalled();
  });

  test("an exhausted window is a refusal, not a failure", async () => {
    counter.exec = async () => [PUBLIC_API_POLICY.limit + 1, 1];

    const verdict = await consume(caller);

    expect(verdict.allowed).toBe(false);
    expect(verdict.remaining).toBe(0);
    expect(captureException).not.toHaveBeenCalled();
  });
});

describe("consume with a failing counter", () => {
  const outage = () => {
    counter.exec = async () => {
      throw new Error("getaddrinfo ENOTFOUND absolute-pony-80073.upstash.io");
    };
  };

  test("lets the request through and claims no count", async () => {
    outage();

    const verdict = await consume(caller);

    expect(verdict.allowed).toBe(true);
    expect(verdict.remaining).toBeNull();
  });

  test("says so in Sentry and the log, with the cause attached", async () => {
    outage();

    await consume(caller, NEWS_POLICY);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(logged).toHaveBeenCalledTimes(1);

    const [error, context] = captureException.mock.calls[0] as [
      Error,
      { fingerprint: string[]; tags: Record<string, string> },
    ];
    expect(error.message).toContain('"news"');
    expect((error.cause as Error).message).toContain("ENOTFOUND");
    expect(context.fingerprint).toEqual(["rate-limit-fail-open"]);
    expect(context.tags).toEqual({ rate_limit_policy: "news" });
  });

  test("adds nothing that names the caller", async () => {
    outage();

    await consume(caller);

    const event = JSON.stringify(captureException.mock.calls[0]?.[1]);
    const error = captureException.mock.calls[0]?.[0] as Error;
    for (const text of [event, error.message]) {
      expect(text).not.toContain("203.0.113.7");
      expect(text).not.toContain("ecentic_sk_");
    }
  });

  test("reports at most once a minute however many requests fail", async () => {
    outage();

    await Promise.all(Array.from({ length: 50 }, () => consume(caller)));
    await consume(caller, NEWS_POLICY);
    expect(captureException).toHaveBeenCalledTimes(1);

    advance(MINUTE - 1);
    await consume(caller);
    expect(captureException).toHaveBeenCalledTimes(1);

    advance(1);
    await consume(caller);
    expect(captureException).toHaveBeenCalledTimes(2);
    expect(logged).toHaveBeenCalledTimes(2);
  });
});

describe("consume without a client", () => {
  // In its own process, because the mocks above replace the module that fails
  // here: a malformed URL makes the real `durable.ts` throw while it loads.
  test("fails open and reports the same way", async () => {
    const child = Bun.spawn(
      [
        process.execPath,
        "-e",
        `const { consume } = await import(${JSON.stringify(`${import.meta.dir}/../utils/rate-limit.ts`)});
         console.log(JSON.stringify(await consume({ headers: new Headers() })));`,
      ],
      {
        env: {
          ...process.env,
          UPSTASH_REDIS_REST_URL: "not-a-url",
          UPSTASH_REDIS_REST_TOKEN: "unused",
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const [stdout, stderr] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);

    const verdict = JSON.parse(stdout);
    expect(verdict.allowed).toBe(true);
    expect(verdict.remaining).toBeNull();
    expect(stderr).toContain("Rate limits are not being enforced");
    expect(stderr).toContain("not-a-url");
  });
});
