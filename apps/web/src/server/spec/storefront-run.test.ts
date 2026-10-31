import { beforeEach, describe, expect, mock, test } from "bun:test";
import type {
  Catalog,
  Merchant,
  OfferLine,
  Prepared,
  Product,
  Store,
  Summary,
} from "../app/storefront/catalog";

/**
 * Run state against the in-memory fallback, which is all anything but a
 * production build uses, so this spec can never reach a real database.
 */

Reflect.deleteProperty(process.env, "AGENTS_DEMO_DOMAIN");

// `utils/ai` pulls `@ai-sdk/rsc`, and `store` reaches the same bundle; neither
// loads under the test runner, and neither is called on these paths.
mock.module("../utils/ai", () => ({}));
mock.module("../app/store", () => ({}));
mock.module("../app/google-merchant-account", () => ({}));
mock.module("@sentry/nextjs", () => ({ captureException: () => {} }));

const Run = await import("../app/storefront/run");
const Prepare = await import("../app/storefront/prepare");

const memory = () =>
  (
    globalThis as unknown as {
      __agentsMemory?: Map<string, { value: string; expires: number }>;
    }
  ).__agentsMemory as Map<string, { value: string; expires: number }>;

const seed = (key: string, value: unknown) =>
  memory().set(key, {
    value: JSON.stringify(value),
    expires: Date.now() + 60_000,
  });

const request = { headers: new Headers({ "x-forwarded-for": "203.0.113.7" }) };

/** Starts a run and answers its id, for specs that are not about `start`. */
const started = async (url: string) => {
  const outcome = await Run.start({ url, request });
  if (outcome.kind !== "started") throw new Error(outcome.kind);
  return outcome.id;
};

const reading = async (id: string) => {
  const run = await Run.summary(id);
  if (!run) throw new Error("No such run");
  return run;
};

const store: Store = {
  origin: "https://acme.com",
  host: "acme.com",
  name: "Acme",
  platform: "shopify",
  returnPolicy: "https://acme.com/policies/refund-policy",
};

const product = (id: string, over: Partial<Product> = {}): Product => ({
  id,
  origin: "shopify",
  url: `https://acme.com/products/${id}`,
  title: `Acme Runner ${id}`,
  description: "A light running shoe with a breathable upper and a firm sole.",
  currency: "USD",
  brand: "Acme",
  mpn: null,
  productType: "Shoes",
  images: [`https://acme.com/images/${id}.jpg`],
  variants: [
    {
      id: `${id}-1`,
      options: {},
      price: "79.99",
      compareAtPrice: null,
      availability: "in_stock",
      sku: `SKU-${id}`,
      barcode: null,
      image: `https://acme.com/images/${id}.jpg`,
    },
  ],
  ...over,
});

const entry = (id: string, over: Partial<Prepared> = {}): Prepared => ({
  product: product(id),
  original: product(id),
  fixes: [],
  findings: [],
  policy: null,
  policyChecked: true,
  ready: { google: true, chatgpt: true },
  ...over,
});

const catalog = (products: Product[] = [product("1")]): Catalog => ({
  store,
  products,
  discovered: products.length,
  notes: ["One note"],
});

const unlinked: Merchant = {
  eligible: false,
  reason: "This store is not linked to ecentic.",
  account: null,
  lines: [],
};

const steps = (over: Record<string, unknown> = {}) =>
  ({
    read: async () => ({ success: true, data: catalog() }),
    prepare: async () => [entry("1")],
    center: {
      eligibility: async () => unlinked,
      push: async () => {
        throw new Error("Must not push");
      },
      confirm: async () => {
        throw new Error("Must not confirm");
      },
    },
    ...over,
  }) as never;

beforeEach(() => {
  memory()?.clear();
});

describe("start", () => {
  test("a bad address is an outcome, not an error", async () => {
    expect((await Run.start({ url: "not a store", request })).kind).toBe(
      "invalid",
    );
    expect((await Run.start({ url: "", request })).kind).toBe("invalid");
    expect((await Run.start({ url: "ftp://acme.com", request })).kind).toBe(
      "invalid",
    );
  });

  test("creates the summary with the timer running", async () => {
    const before = Date.now();
    const run = await reading(await started("https://www.Acme.com/products/x"));

    expect(run.host).toBe("acme.com");
    expect(run.stage).toBe("reading");
    expect(run.startedAt).toBeGreaterThanOrEqual(before);
    expect(run.finishedAt).toBeNull();
    expect(run.upload).toBeNull();
  });

  test("the same host within the window returns the same run, and it must not be executed again", async () => {
    const first = await Run.start({ url: "acme.com", request });
    const second = await Run.start({ url: "https://www.acme.com/", request });
    const other = await Run.start({ url: "other.com", request });

    if (first.kind !== "started" || second.kind !== "started")
      throw new Error("Expected runs");
    expect(first.fresh).toBe(true);
    expect(second.fresh).toBe(false);
    expect(second.id).toBe(first.id);
    expect(other.kind === "started" && other.id).not.toBe(first.id);
  });

  test("a failed run can be retried at once", async () => {
    const id = await started("acme.com");
    await Run.execute(
      id,
      steps({
        read: async () => ({ success: false, error: new Error("No luck") }),
      }),
    );

    const retry = await Run.start({ url: "acme.com", request });

    expect(retry.kind === "started" && retry.fresh).toBe(true);
    expect(retry.kind === "started" && retry.id).not.toBe(id);
  });

  test("the day's cap answers with capacity, and a duplicate does not spend it", async () => {
    const day = `agents:day:${new Date().toISOString().slice(0, 10)}`;
    seed(day, 299);

    await started("acme.com");
    await started("acme.com");
    const full = await Run.start({ url: "other.com", request });

    expect(full.kind).toBe("capacity");
    expect("message" in full && full.message).toContain("tomorrow");
  });

  test("keeps the newest 300 ids", async () => {
    seed(
      "agents:runs",
      Array.from({ length: 300 }, (_, index) => `old-${index}`),
    );

    const id = await started("acme.com");
    const ids = JSON.parse(
      memory().get("agents:runs")?.value ?? "[]",
    ) as string[];

    expect(ids).toHaveLength(300);
    expect(ids[0]).toBe(id);
    expect(ids).not.toContain("old-299");
  });
});

describe("summary", () => {
  test("unknown and malformed ids are null, and cannot read other keys", async () => {
    const id = await started("acme.com");
    await Run.execute(id, steps());

    expect(await Run.summary(crypto.randomUUID())).toBeNull();
    expect(await Run.summary(`${id}:prepared`)).toBeNull();
    expect(await Run.prepared(`${id}:store`)).toBeNull();
  });

  test("an old unfinished run reads as failed, wherever it stopped", () => {
    const old = {
      stage: "reading",
      startedAt: 0,
      error: null,
    } as unknown as Summary;
    const sevenMinutes = 7 * 60 * 1000;

    expect(Run.settle(old, sevenMinutes).stage).toBe("failed");
    expect(Run.settle(old, sevenMinutes).error).toBeTruthy();
    expect(Run.settle({ ...old, stage: "channels" }, sevenMinutes).stage).toBe(
      "failed",
    );
    expect(Run.settle(old, 60_000).stage).toBe("reading");
    expect(Run.settle({ ...old, stage: "done" }, sevenMinutes).stage).toBe(
      "done",
    );
  });
});

describe("execute", () => {
  test("carries a store that cannot publish through to done", async () => {
    const id = await started("acme.com");

    await Run.execute(
      id,
      steps({
        prepare: async () => [
          entry("1", {
            fixes: [
              {
                product: "1",
                field: "title",
                before: null,
                after: "Better",
                kind: "rewritten",
                reason: "spec",
              },
            ],
            findings: [
              {
                channel: "google",
                field: "gtin",
                code: "missing",
                message: "No GTIN",
                severity: "warning",
              },
            ],
          }),
        ],
      }),
    );

    const run = await reading(id);

    expect(run.stage).toBe("done");
    expect(run.finishedAt).toBeNumber();
    expect(run.name).toBe("Acme");
    expect(run.platform).toBe("shopify");
    expect(run.read).toBe(1);
    expect(run.fixes).toBe(1);
    expect(run.needsMerchant).toBe(1);
    expect(run.notes).toEqual(["One note"]);
    expect(run.merchant?.eligible).toBe(false);
    expect(run.upload).toBeNull();
    expect(await Run.prepared(id)).toHaveLength(1);
  });

  test("a step that fails writes a plain reason", async () => {
    const id = await started("acme.com");

    await Run.execute(
      id,
      steps({
        read: async () => ({
          success: false,
          error: new Error("We could not reach this store."),
        }),
      }),
    );

    const run = await reading(id);

    expect(run.stage).toBe("failed");
    expect(run.error).toBe("We could not reach this store.");
    expect(run.finishedAt).toBeNull();
  });

  test("a store with no products fails rather than preparing nothing", async () => {
    const id = await started("acme.com");

    await Run.execute(
      id,
      steps({
        read: async () => ({ success: true, data: catalog([]) }),
      }),
    );

    expect((await reading(id)).stage).toBe("failed");
  });

  test("a step that throws cannot leave the run stuck, or leak what it threw", async () => {
    const id = await started("acme.com");

    await Run.execute(
      id,
      steps({
        prepare: async () => {
          throw new Error("connect ECONNREFUSED 10.0.0.1 secret-internal");
        },
      }),
    );

    const run = await reading(id);

    expect(run.stage).toBe("failed");
    expect(run.error).not.toContain("secret-internal");
  });

  test("a burst of progress is throttled, and the last of it is still written", async () => {
    const id = await started("acme.com");
    const key = `agents:run:${id}`;
    const slots = memory();
    const write = slots.set.bind(slots);
    const writes = { count: 0 };
    slots.set = (name, slot) => {
      if (name === key) writes.count += 1;
      return write(name, slot);
    };

    await Run.execute(
      id,
      steps({
        prepare: async (
          _: Catalog,
          {
            onProgress,
          }: {
            onProgress: (progress: {
              message: string;
              issues: number;
              fixes: number;
            }) => void;
          },
        ) => {
          for (const index of Array.from({ length: 200 }, (_, at) => at))
            onProgress({ message: `Step ${index}`, issues: index, fixes: 0 });
          return [entry("1")];
        },
      }),
    );
    slots.set = write;

    const run = await reading(id);

    expect(writes.count).toBeLessThan(10);
    expect(run.stage).toBe("done");
    expect(run.issues).toBe(199);
    expect(run.log).toHaveLength(40);
    expect(run.log).toContain("Step 199");
  });

  test("a run that does not exist is a no-op", async () => {
    await Run.execute(crypto.randomUUID(), steps());
  });

  test("only a store that can publish earns the full rewrite", async () => {
    const asked: boolean[] = [];
    const prepare = async (
      _: Catalog,
      { rewriteAll }: { rewriteAll: boolean },
    ) => {
      asked.push(rewriteAll);
      return [entry("1")];
    };

    const id = await started("acme.com");
    await Run.execute(id, steps({ prepare }));

    const eligible = { ...unlinked, eligible: true, reason: null };
    const demo = await started("demo.example");
    await Run.execute(
      demo,
      steps({
        prepare,
        center: {
          eligibility: async () => eligible,
          push: async () => ({
            success: true,
            data: { landings: [], lines: [] },
          }),
          confirm: async () => [],
        },
      }),
    );

    expect(asked).toEqual([false, true]);
  });

  test("the clock stops when inserts return, and merge lines arrive after without moving it", async () => {
    const id = await started("demo.example");
    const eligible = {
      ...unlinked,
      eligible: true,
      reason: null,
      account: "123",
    };
    const line: OfferLine = {
      offerId: "shopify_ZZ_1_9",
      title: "Better",
      status: "accepted",
      response: "Accepted by Google",
      mergedTitle: null,
      destinations: [],
      issues: [],
    };
    const during = { stage: "", finishedAt: null as number | null };

    await Run.execute(
      id,
      steps({
        center: {
          eligibility: async () => eligible,
          push: async (
            _: Prepared[],
            __: Merchant,
            onLines: (lines: OfferLine[]) => void,
          ) => {
            onLines([line]);
            return { success: true, data: { landings: [], lines: [line] } };
          },
          confirm: async (
            _: unknown,
            __: Merchant,
            onLines: (lines: OfferLine[]) => void,
          ) => {
            const run = await reading(id);
            during.stage = run.stage;
            during.finishedAt = run.finishedAt;
            await new Promise((resolve) => setTimeout(resolve, 20));
            onLines([{ ...line, status: "merged", mergedTitle: "Better" }]);
            return [];
          },
        },
      }),
    );

    const run = await reading(id);

    expect(during.stage).toBe("done");
    expect(during.finishedAt).toBeNumber();
    expect(run.finishedAt).toBe(during.finishedAt);
    expect(run.merchant?.lines[0]?.status).toBe("merged");
  });

  test("a push that fails names Merchant Center but keeps the feeds", async () => {
    const id = await started("demo.example");
    const eligible = { ...unlinked, eligible: true, reason: null };

    await Run.execute(
      id,
      steps({
        center: {
          eligibility: async () => eligible,
          push: async () => ({
            success: false,
            error: new Error("Google said no."),
          }),
          confirm: async () => [],
        },
      }),
    );

    const run = await reading(id);

    expect(run.stage).toBe("failed");
    expect(run.error).toContain("Merchant Center");
    expect(await Run.prepared(id)).toHaveLength(1);
  });

  test("a merge watch that blows up does not undo a finished run", async () => {
    const id = await started("demo.example");
    const eligible = { ...unlinked, eligible: true, reason: null };

    await Run.execute(
      id,
      steps({
        center: {
          eligibility: async () => eligible,
          push: async () => ({
            success: true,
            data: { landings: [], lines: [] },
          }),
          confirm: async () => {
            throw new Error("Watch failed");
          },
        },
      }),
    );

    expect((await reading(id)).stage).toBe("done");
  });
});

describe("feed", () => {
  const seeded = async (entries: Prepared[]) => {
    const id = crypto.randomUUID();
    seed(`agents:run:${id}:prepared`, Run.pack(entries));
    seed(`agents:run:${id}:store`, store);
    return id;
  };

  const entries = () => [
    entry("good"),
    entry("nogoogle", { ready: { google: false, chatgpt: true } }),
    entry("nochatgpt", { ready: { google: true, chatgpt: false } }),
    // Marked ready, but nothing states a price, so its validator must refuse it.
    entry("unpriced", {
      product: product("unpriced", {
        variants: [
          {
            id: "unpriced-1",
            options: {},
            price: null,
            compareAtPrice: null,
            availability: "in_stock",
            sku: "SKU-unpriced",
            barcode: null,
            image: "https://acme.com/images/unpriced.jpg",
          },
        ],
      }),
    }),
  ];

  test("the ChatGPT file holds only ready products whose rows validate", async () => {
    const file = await Run.feed(await seeded(entries()), "chatgpt");

    expect(file?.type).toContain("text/csv");
    expect(file?.filename).toBe("acme.com-chatgpt.csv");
    expect(file?.body).toContain("good");
    expect(file?.body).toContain("nogoogle");
    expect(file?.body).not.toContain("nochatgpt");
    expect(file?.body).not.toContain("unpriced");
  });

  test("the Google file holds only ready products whose items validate", async () => {
    const file = await Run.feed(await seeded(entries()), "google");

    expect(file?.type).toContain("application/xml");
    expect(file?.filename).toBe("acme.com-google.xml");
    expect(file?.body).toContain("good");
    expect(file?.body).toContain("nochatgpt");
    expect(file?.body).not.toContain("nogoogle");
    expect(file?.body).not.toContain("unpriced");
  });

  test("the stage's counts are the file's contents", async () => {
    const id = await started("acme.com");

    await Run.execute(id, steps({ prepare: async () => entries() }));

    const run = await reading(id);

    expect(run.google).toEqual({ ready: 2, total: 4 });
    expect(run.chatgpt).toEqual({ ready: 2, total: 4 });
  });

  test("an unknown channel or an unprepared run has no file", async () => {
    const id = await seeded(entries());

    expect(await Run.feed(id, "bing")).toBeNull();
    expect(await Run.feed(crypto.randomUUID(), "google")).toBeNull();
    expect(await Run.feed("not-a-uuid", "google")).toBeNull();
  });
});

describe("board", () => {
  test("counts each store once at its newest run, and failed runs not at all", async () => {
    const summaryOf = (over: Partial<Summary>) =>
      ({
        id: crypto.randomUUID(),
        host: "acme.com",
        stage: "done",
        startedAt: Date.now(),
        read: 0,
        ...over,
      }) as Summary;

    const runs = [
      summaryOf({ host: "acme.com", read: 12 }),
      summaryOf({ host: "acme.com", read: 40 }),
      summaryOf({ host: "other.com", read: 5 }),
      summaryOf({ host: "broken.com", read: 9, stage: "failed" }),
    ];

    for (const run of runs) seed(`agents:run:${run.id}`, run);
    seed("agents:runs", [...runs.map((run) => run.id), "expired-id"]);

    const board = await Run.board();

    expect(board.stores).toBe(2);
    expect(board.products).toBe(17);
    expect(board.runs.map(({ id }) => id)).toEqual([
      runs[0]?.id as string,
      runs[2]?.id as string,
      runs[3]?.id as string,
    ]);
  });

  test("a store that failed and then worked shows the run that worked", async () => {
    const failed = crypto.randomUUID();
    const worked = crypto.randomUUID();
    const summaryOf = (id: string, stage: Summary["stage"]) =>
      ({
        id,
        host: "acme.com",
        stage,
        startedAt: Date.now(),
        read: 40,
      }) as Summary;

    seed(`agents:run:${failed}`, summaryOf(failed, "failed"));
    seed(`agents:run:${worked}`, summaryOf(worked, "done"));
    seed("agents:runs", [failed, worked]);

    const board = await Run.board();

    expect(board.runs.map(({ id }) => id)).toEqual([worked]);
  });

  test("shows the newest 30", async () => {
    const runs = Array.from({ length: 35 }, () => {
      const id = crypto.randomUUID();
      seed(`agents:run:${id}`, {
        id,
        host: `${id}.com`,
        stage: "done",
        startedAt: Date.now(),
        read: 1,
      });
      return id;
    });
    seed("agents:runs", runs);

    const board = await Run.board();

    expect(board.runs).toHaveLength(30);
    expect(board.stores).toBe(35);
  });

  test("is empty, not broken, before anything has run", async () => {
    expect(await Run.board()).toEqual({ stores: 0, products: 0, runs: [] });
  });
});

describe("hard rules: start", () => {
  test("spoofing x-forwarded-for buys no more than the burst limit", async () => {
    const outcomes = await Promise.all(
      Array.from({ length: 70 }, (_, index) =>
        Run.start({
          url: `store${index}.com`,
          request: {
            headers: new Headers({ "x-forwarded-for": `198.51.100.${index}` }),
          },
        }),
      ),
    );

    const started = outcomes.filter(({ kind }) => kind === "started");
    const limited = outcomes.filter(({ kind }) => kind === "limited");

    expect(started.length).toBe(60);
    expect(limited.length).toBe(10);
  });

  test("refusals spend neither the day's cap nor the burst", async () => {
    await Promise.all(
      Array.from({ length: 70 }, () =>
        Run.start({ url: "https://not a url", request }),
      ),
    );
    await Run.start({ url: "acme.com", request });

    const count = [...memory().keys()].filter((key) =>
      key.startsWith("agents:run:"),
    ).length;
    expect(count).toBe(1);
  });

  test.each([
    ["http://127.0.0.1"],
    ["https://2130706433"],
    ["https://0x7f.0.0.1"],
    ["https://169.254.169.254/latest/meta-data"],
    ["http://[::1]"],
    ["https://user:secret@acme.com"],
    ["file:///etc/passwd"],
    ["localhost"],
  ])("%s is refused before anything is fetched", async (url) => {
    expect((await Run.start({ url, request })).kind).toBe("invalid");
  });
});

describe("hard rules: what reaches a feed", () => {
  const offer = (over: Partial<Product["variants"][number]> = {}) => ({
    id: "v",
    options: {},
    price: "79.99",
    compareAtPrice: null,
    availability: "in_stock" as const,
    sku: null,
    barcode: null,
    image: "https://acme.com/images/x.jpg",
    ...over,
  });

  const shaped = (id: string, over: Partial<Product> = {}, sold = {}) =>
    product(id, { variants: [offer({ id, ...sold })], ...over });

  const stocked = [
    shaped("good"),
    shaped("nocurrency", { currency: null }),
    shaped("unknownstock", {}, { availability: "unknown" }),
    shaped("preorder", {}, { availability: "pre_order" }),
    shaped("free", {}, { price: "0.00" }),
    shaped("misread", { currency: "EUR" }, { price: "1.299" }),
    shaped("unpriced", {}, { price: null }),
    shaped("nolink", { url: null }),
    shaped("used", { condition: "used" }),
    shaped("refurbished", { title: "Refurbished Acme Runner" }),
  ];

  const prepareFor = (catalog: Catalog) =>
    Prepare.prepare(catalog, {
      draft: async () => ({ title: null, description: null }),
      screen: async (products) =>
        new Map(
          products.map((item) => [
            item.id,
            { policy: null, policyChecked: true },
          ]),
        ),
    });

  const run = async () => {
    const id = await started("acme.com");
    await Run.execute(
      id,
      steps({
        read: async () => ({ success: true, data: catalog(stocked) }),
        prepare: prepareFor,
      }),
    );
    return id;
  };

  const ids = (body: string | undefined, pattern: RegExp) =>
    [...(body ?? "").matchAll(pattern)].map((match) => match[1]);

  test("Google gets only what it can accept", async () => {
    const file = await Run.feed(await run(), "google");

    expect(ids(file?.body, /<g:id>([^<]+)<\/g:id>/g)).toEqual(["good"]);
  });

  test("the ChatGPT file gets only what its spec allows, unknown stock included", async () => {
    const file = await Run.feed(await run(), "chatgpt");

    expect(ids(file?.body, /^([a-z]+),Acme|^([a-z]+),Refurb/gm).sort()).toEqual(
      ["good", "preorder", "unknownstock"],
    );
    expect(file?.body).not.toContain(",US,");
  });

  test("the stage counts what is in the file", async () => {
    const summary = await reading(await run());

    expect(summary.google).toEqual({ ready: 1, total: stocked.length });
    expect(summary.chatgpt).toEqual({ ready: 3, total: stocked.length });
  });
});
