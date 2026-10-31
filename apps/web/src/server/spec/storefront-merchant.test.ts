import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type {
  Fix,
  Merchant as MerchantState,
  OfferLine,
  Prepared,
  Product,
} from "../app/storefront/catalog";

/**
 * Hard rule 3 lives here: Google pushes only go into the linked account whose
 * website is claimed. The rows are mocked and the real Merchant API client runs
 * against a stubbed `fetch`, so every call that would reach Google is recorded.
 */

const DEMO = "demo.example";

type Row = Record<string, unknown>;

const rows = {
  stores: [] as Row[],
  accounts: [] as Row[],
};

mock.module("../app/store", () => ({
  find: async () => ({ success: true, data: rows.stores }),
}));
mock.module("../app/google-merchant-account", () => ({
  find: async () => ({ success: true, data: rows.accounts }),
}));

const Merchant = await import("../app/storefront/merchant");

type Call = { method: string; url: string; body: Row | null };

const google = {
  calls: [] as Call[],
  homepage: { uri: `https://www.${DEMO}/`, claimed: true } as Row,
  rule: [{ self: true }] as Row[],
  offers: [] as Row[],
  /** What `products.get` answers, by resource name. */
  processed: new Map<string, Row>(),
  insertStatus: 200,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const answer = ({ method, url }: Call) => {
  const { pathname } = new URL(url);

  switch (true) {
    case pathname === "/token":
      return json({ access_token: "secret-access-token", expires_in: 3600 });
    case pathname.endsWith("/homepage"):
      return json(google.homepage);
    case pathname.endsWith("/dataSources"):
      return json({
        dataSources: [
          {
            name: "accounts/123/dataSources/1",
            primaryProductDataSource: {
              defaultRule: { takeFromDataSources: google.rule },
            },
          },
          {
            name: "accounts/123/dataSources/2",
            supplementalProductDataSource: {},
          },
        ],
      });
    case method === "PATCH":
      return json({});
    case pathname.endsWith("/productInputs:insert"):
      return google.insertStatus === 200
        ? json({ name: "accounts/123/productInputs/abc" })
        : json({ error: { message: "Offer refused" } }, google.insertStatus);
    case pathname.endsWith("/products"):
      return json({ products: google.offers });
    default: {
      const name = pathname.replace("/products/v1/", "");
      return json(google.processed.get(name) ?? {});
    }
  }
};

const realFetch = globalThis.fetch;
const { AGENTS_DEMO_DOMAIN: demoDomain } = process.env;

beforeEach(() => {
  google.calls = [];
  google.homepage = { uri: `https://www.${DEMO}/`, claimed: true };
  google.rule = [{ self: true }];
  google.offers = [];
  google.processed = new Map();
  google.insertStatus = 200;

  rows.stores = [
    {
      id: "store-1",
      domain: "demo-store.myshopify.com",
      storefrontHosts: [DEMO],
    },
  ];
  rows.accounts = [
    {
      storeId: "store-1",
      googleAccountId: "123",
      dataSourceName: "accounts/123/dataSources/2",
      refreshToken: "secret-refresh-token",
    },
  ];

  Object.assign(process.env, {
    AGENTS_DEMO_DOMAIN: DEMO,
    GOOGLE_MERCHANT_CLIENT_ID: "client",
    GOOGLE_MERCHANT_CLIENT_SECRET: "client-secret",
    ECENTIC_MCA_ID: "999",
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      method: init?.method ?? "GET",
      url: String(input),
      body:
        typeof init?.body === "string" && init.body.startsWith("{")
          ? (JSON.parse(init.body) as Row)
          : null,
    };
    google.calls.push(call);
    return answer(call);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  Reflect.deleteProperty(process.env, "AGENTS_DEMO_DOMAIN");
  if (demoDomain) Reflect.set(process.env, "AGENTS_DEMO_DOMAIN", demoDomain);
});

const product = (id: string, title = `Product ${id}`): Product => ({
  id,
  origin: "shopify",
  url: `https://${DEMO}/products/${id}`,
  title,
  description: "As read",
  currency: "USD",
  brand: null,
  mpn: null,
  productType: null,
  images: [],
  variants: [],
});

const fix = (id: string, field: string, after: string): Fix => ({
  product: id,
  field,
  before: "As read",
  after,
  kind: "rewritten",
  reason: "spec",
});

const entry = (id: string, fixes: Fix[] = []): Prepared => ({
  product: product(id),
  original: product(id),
  fixes,
  findings: [],
  policy: null,
  policyChecked: true,
  ready: { google: true, chatgpt: true },
});

const offer = (productId: string, variant = "9") => {
  const offerId = `shopify_ZZ_${productId}_${variant}`;
  return {
    name: `accounts/123/products/en~USD_101~${offerId}`,
    offerId,
    contentLanguage: "en",
    feedLabel: "USD_101",
    productAttributes: { title: "Live title", description: "Live description" },
  };
};

const sent = (suffix: string) =>
  google.calls.filter(({ url }) => new URL(url).pathname.endsWith(suffix));

describe("eligibility", () => {
  const REFUSAL =
    "This store is not linked to ecentic. Connect your Merchant Center to publish.";

  test("with no demo domain set, nothing is eligible and nothing is called", async () => {
    Reflect.deleteProperty(process.env, "AGENTS_DEMO_DOMAIN");

    const merchant = await Merchant.eligibility(DEMO);

    expect(merchant).toEqual({
      eligible: false,
      reason: REFUSAL,
      account: null,
      lines: [],
    });
    expect(google.calls).toEqual([]);
  });

  test.each([[""], ["   "]])(
    "a blank demo domain (%j) is the same as none",
    async (value) => {
      Reflect.set(process.env, "AGENTS_DEMO_DOMAIN", value);

      const merchant = await Merchant.eligibility("demo.com");

      expect(merchant.eligible).toBe(false);
    },
  );

  test("a store that is not the demo store never reaches Google", async () => {
    const merchant = await Merchant.eligibility("someone-else.com");

    expect(merchant.eligible).toBe(false);
    expect(merchant.reason).toBe(REFUSAL);
    expect(google.calls).toEqual([]);
  });

  test("passes the demo store and its other hosts when Google says it is claimed", async () => {
    const custom = await Merchant.eligibility(DEMO);
    const handle = await Merchant.eligibility("demo-store.myshopify.com");

    expect(custom.eligible).toBe(true);
    expect(custom.account).toBe("123");
    expect(handle.eligible).toBe(true);
  });

  test("refuses an unclaimed website", async () => {
    google.homepage = { uri: `https://${DEMO}`, claimed: false };

    const merchant = await Merchant.eligibility(DEMO);

    expect(merchant.eligible).toBe(false);
    expect(merchant.reason).toContain("claimed");
  });

  test("refuses an account claiming some other website", async () => {
    google.homepage = { uri: "https://not-this-store.com", claimed: true };

    expect((await Merchant.eligibility(DEMO)).eligible).toBe(false);
  });

  test("refuses when the homepage cannot be read", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) =>
      String(input).endsWith("/homepage")
        ? json({ error: { message: "Not found" } }, 404)
        : json({
            access_token: "token",
            expires_in: 3600,
          })) as typeof fetch;

    expect((await Merchant.eligibility(DEMO)).eligible).toBe(false);
  });

  test("refuses an account missing any of its three requirements", async () => {
    for (const missing of [
      "googleAccountId",
      "dataSourceName",
      "refreshToken",
    ]) {
      rows.accounts = [
        {
          storeId: "store-1",
          googleAccountId: "123",
          dataSourceName: "accounts/123/dataSources/2",
          refreshToken: "secret-refresh-token",
          [missing]: null,
        },
      ];

      expect((await Merchant.eligibility(DEMO)).eligible).toBe(false);
    }
  });

  test("ignores a look-alike row that merely contains the demo domain", async () => {
    rows.stores = [
      { id: "store-2", domain: `not-${DEMO}`, storefrontHosts: null },
    ];

    expect((await Merchant.eligibility(`not-${DEMO}`)).eligible).toBe(false);
  });

  test("the token never rides the object that goes into the summary", async () => {
    const merchant = await Merchant.eligibility(DEMO);

    expect(JSON.stringify(merchant)).not.toContain("secret");
  });
});

describe("push", () => {
  const noop = () => {};

  test("a hand-written or rehydrated merchant cannot push, whatever it claims", async () => {
    const forged: MerchantState = {
      eligible: true,
      reason: null,
      account: "123",
      lines: [],
    };

    const pushed = await Merchant.push(
      [entry("1", [fix("1", "title", "Better title")])],
      forged,
      noop,
    );

    expect(pushed.success).toBe(false);
    expect(google.calls).toEqual([]);

    const merchant = await Merchant.eligibility(DEMO);
    google.calls = [];
    const rehydrated = await Merchant.push(
      [entry("1", [fix("1", "title", "Better title")])],
      JSON.parse(JSON.stringify(merchant)) as MerchantState,
      noop,
    );

    expect(rehydrated.success).toBe(false);
    expect(google.calls).toEqual([]);
  });

  test("re-checks the claim at push time and inserts nothing when it has gone", async () => {
    const merchant = await Merchant.eligibility(DEMO);
    google.homepage = { uri: `https://${DEMO}`, claimed: false };
    google.offers = [offer("1")];

    const pushed = await Merchant.push(
      [entry("1", [fix("1", "title", "Better title")])],
      merchant,
      noop,
    );

    expect(pushed.success).toBe(false);
    expect(sent("/productInputs:insert")).toEqual([]);
  });

  test("copies the live offer's triplet and sends only accepted title and description", async () => {
    const merchant = await Merchant.eligibility(DEMO);
    google.offers = [offer("1")];

    const pushed = await Merchant.push(
      [
        entry("1", [
          fix("1", "brand", "Inferred brand"),
          fix("1", "title", "First title"),
          fix("1", "title", "Better title"),
          fix("1", "description", "Better description"),
        ]),
      ],
      merchant,
      noop,
    );

    expect(pushed.success).toBe(true);
    const inserts = sent("/productInputs:insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.url).toContain(
      encodeURIComponent("accounts/123/dataSources/2"),
    );
    expect(inserts[0]?.body).toEqual({
      offerId: "shopify_ZZ_1_9",
      contentLanguage: "en",
      feedLabel: "USD_101",
      productAttributes: {
        title: "Better title",
        description: "Better description",
      },
    });
  });

  test("puts our source first and keeps self when the rule is wrong", async () => {
    const merchant = await Merchant.eligibility(DEMO);
    google.rule = [
      { supplementalDataSourceName: "accounts/123/dataSources/8" },
    ];

    await Merchant.push([entry("1")], merchant, noop);

    const patch = google.calls.find(({ method }) => method === "PATCH");
    expect(patch?.url).toContain("accounts/123/dataSources/1");
    expect(patch?.body).toEqual({
      primaryProductDataSource: {
        defaultRule: {
          takeFromDataSources: [
            { supplementalDataSourceName: "accounts/123/dataSources/2" },
            { supplementalDataSourceName: "accounts/123/dataSources/8" },
            { self: true },
          ],
        },
      },
    });
  });

  test("leaves a healthy rule alone", async () => {
    const merchant = await Merchant.eligibility(DEMO);
    google.rule = [
      { supplementalDataSourceName: "accounts/123/dataSources/2" },
      { self: true },
    ];

    await Merchant.push([entry("1")], merchant, noop);

    expect(google.calls.some(({ method }) => method === "PATCH")).toBe(false);
  });

  test("a flagged override is rejected without being sent", async () => {
    const merchant = await Merchant.eligibility(DEMO);
    google.offers = [offer("1")];

    const pushed = await Merchant.push(
      [entry("1", [fix("1", "title", "Great shoes, free shipping")])],
      merchant,
      noop,
    );

    expect(sent("/productInputs:insert")).toEqual([]);
    expect(pushed.success && pushed.data.lines[0]?.status).toBe("rejected");
  });

  test("records Google's refusal on the line and keeps going", async () => {
    const merchant = await Merchant.eligibility(DEMO);
    google.offers = [offer("1")];
    google.insertStatus = 400;

    const pushed = await Merchant.push(
      [entry("1", [fix("1", "title", "Better title")])],
      merchant,
      noop,
    );

    if (!pushed.success) throw pushed.error;
    expect(pushed.data.lines[0]?.status).toBe("rejected");
    expect(pushed.data.lines[0]?.response).toBeTruthy();
  });

  test("reports each line as it lands", async () => {
    const merchant = await Merchant.eligibility(DEMO);
    google.offers = [offer("1"), offer("2")];
    const seen: OfferLine["status"][][] = [];

    await Merchant.push(
      [
        entry("1", [fix("1", "title", "Better one")]),
        entry("2", [fix("2", "title", "Better two")]),
      ],
      merchant,
      (lines) => seen.push(lines.map((line) => line.status)),
    );

    expect(seen).toEqual([
      ["pending", "pending"],
      ["accepted", "pending"],
      ["accepted", "accepted"],
    ]);
  });
});

describe("plan", () => {
  test("skips a product with no fix and one with no live offer", () => {
    const landings = Merchant.plan(
      [entry("1"), entry("2", [fix("2", "title", "Better title")])],
      [],
    );

    expect(landings.map(({ line }) => line.status)).toEqual([
      "skipped",
      "skipped",
    ]);
    expect(landings.every(({ offer }) => offer === null)).toBe(true);
  });

  test("a fix that is neither title nor description has nothing to send", () => {
    const [landing] = Merchant.plan(
      [entry("1", [fix("1", "brand", "Inferred brand")])],
      [offer("1") as never],
    );

    expect(landing?.line.status).toBe("skipped");
  });

  test("caps at 10 products and gives the slots to those with something to send", () => {
    const entries = [
      ...Array.from({ length: 5 }, (_, index) => entry(`bare${index}`)),
      ...Array.from({ length: 12 }, (_, index) =>
        entry(`fixed${index}`, [fix(`fixed${index}`, "title", "Better title")]),
      ),
    ];
    const offers = Array.from({ length: 12 }, (_, index) =>
      offer(`fixed${index}`),
    );

    const landings = Merchant.plan(entries, offers as never);

    expect(landings).toHaveLength(10);
    expect(landings.every(({ line }) => line.status === "pending")).toBe(true);
  });

  test("one product lands on every one of its live offers, and only its own", () => {
    const landings = Merchant.plan(
      [entry("1", [fix("1", "title", "Better title")])],
      [offer("1", "8"), offer("1", "9"), offer("11", "9")] as never,
    );

    expect(landings.map(({ line }) => line.offerId)).toEqual([
      "shopify_ZZ_1_8",
      "shopify_ZZ_1_9",
    ]);
  });
});

describe("confirm", () => {
  test("flips to merged only when the pushed value appears, with destinations and issues", async () => {
    const merchant = await Merchant.eligibility(DEMO);
    const live = offer("1");
    google.offers = [live];

    const pushed = await Merchant.push(
      [entry("1", [fix("1", "title", "Better title")])],
      merchant,
      () => {},
    );
    if (!pushed.success) throw pushed.error;

    google.processed.set(live.name, {
      ...live,
      productAttributes: { title: "Better   title" },
      productStatus: {
        destinationStatuses: [
          { reportingContext: "SHOPPING_ADS", approvedCountries: ["US"] },
          { reportingContext: "FREE_LISTINGS", disapprovedCountries: ["US"] },
          { reportingContext: "YOUTUBE_SHOPPING" },
        ],
        itemLevelIssues: [{ description: "Image too small", code: "image" }],
      },
    });

    const lines = await Merchant.confirm(pushed.data, merchant, () => {}, {
      window: 200,
      interval: 5,
    });

    expect(lines[0]).toMatchObject({
      status: "merged",
      mergedTitle: "Better   title",
      destinations: [
        "SHOPPING_ADS: approved",
        "FREE_LISTINGS: disapproved",
        "YOUTUBE_SHOPPING: pending",
      ],
      issues: ["Image too small"],
    });
  });

  test("stays accepted when Google has not merged it by the end of the window", async () => {
    const merchant = await Merchant.eligibility(DEMO);
    const live = offer("1");
    google.offers = [live];

    const pushed = await Merchant.push(
      [entry("1", [fix("1", "title", "Better title")])],
      merchant,
      () => {},
    );
    if (!pushed.success) throw pushed.error;

    google.processed.set(live.name, live);

    const lines = await Merchant.confirm(pushed.data, merchant, () => {}, {
      window: 30,
      interval: 5,
    });

    expect(lines[0]?.status).toBe("accepted");
  });

  test("a value the offer already said before the insert proves nothing", () => {
    const baseline = offer("1");
    const attributes = {
      title: "Better title",
      description: "Live description",
    };

    expect(Merchant.hasMerged(attributes, baseline, baseline)).toBe(false);
    expect(
      Merchant.hasMerged(attributes, baseline, {
        ...baseline,
        productAttributes: {
          title: "Better title",
          description: "Live description",
        },
      }),
    ).toBe(true);
  });
});
