import { describe, expect, test } from "bun:test";
import type {
  Catalog,
  Product,
  Store,
  Variant,
} from "../app/storefront/catalog";
import * as ChatGPT from "../app/storefront/chatgpt";
import * as Google from "../app/storefront/google";
import * as Policy from "../app/storefront/policy";
import {
  type Brief,
  clean,
  type Progress,
  prepare,
  vet,
} from "../app/storefront/prepare";

const VALID_GTIN = "012345678905";

const store: Store = {
  origin: "https://shop.example",
  host: "shop.example",
  name: "Acme Goods",
  platform: "other",
  returnPolicy: null,
};

const variant = (overrides: Partial<Variant> = {}): Variant => ({
  id: "v1",
  options: { Size: "10" },
  price: "79.99",
  compareAtPrice: null,
  availability: "in_stock",
  sku: "TEE-10",
  barcode: VALID_GTIN,
  image: "https://shop.example/tee.jpg",
  ...overrides,
});

const product = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  origin: "page",
  url: "https://shop.example/products/tee",
  title: "Organic Cotton Tee",
  description: "A soft tee in 100% organic cotton, cut for everyday wear.",
  currency: "USD",
  brand: "Acme",
  mpn: null,
  productType: "Shirts",
  images: ["https://shop.example/tee.jpg"],
  variants: [variant()],
  ...overrides,
});

const catalog = (products: Product[]): Catalog => ({
  store,
  products,
  discovered: products.length,
  notes: [],
});

const unchecked = async (products: Product[]) =>
  new Map(products.map((item) => [item.id, Policy.UNCHECKED] as const));

const passing = async (products: Product[]) =>
  new Map(
    products.map(
      (item) =>
        [
          item.id,
          { policy: null, policyChecked: true } as Policy.Verdict,
        ] as const,
    ),
  );

const failing = async () => {
  throw new Error("no credentials");
};

describe("clean", () => {
  const messy = product({
    title: "  <b>BIG   SILK &amp; WOOL SCARF FOR USB</b> ",
    description:
      "<p>Soft &amp; warm.</p><script>track(99)</script><ul><li>Silk</li><li>Wool &rsquo;n more</li></ul>",
    brand: null,
    url: "/products/scarf",
    images: [
      "/images/a.jpg",
      "//cdn.example/b.jpg",
      "https://cdn.example/c.jpg",
    ],
    variants: [variant({ barcode: "12345", image: "images/v.jpg" })],
  });
  const result = clean(messy, store);
  const fix = (field: string) =>
    result.fixes.find((entry) => entry.field === field);

  test("tidies the title and records one cleaned fix with before and after", () => {
    expect(result.product.title).toBe("Big Silk & Wool Scarf for USB");
    expect(fix("title")).toMatchObject({
      product: "p1",
      kind: "cleaned",
      before: messy.title,
      after: "Big Silk & Wool Scarf for USB",
    });
  });

  test("strips HTML, drops script bodies and decodes entities in the description", () => {
    expect(result.product.description).toBe("Soft & warm.\nSilk\nWool ’n more");
    expect(fix("description")?.kind).toBe("cleaned");
  });

  test("decodes markup that arrives escaped, as JSON-LD often does", () => {
    const { product: tidied } = clean(
      product({ description: "&lt;p&gt;Soft &amp;amp; warm&lt;/p&gt;" }),
      store,
    );
    expect(tidied.description).toBe("Soft & warm");
  });

  test("keeps angle brackets that are not tags", () => {
    const { product: tidied } = clean(
      product({ description: "Fits sizes under <10 and >5." }),
      store,
    );
    expect(tidied.description).toBe("Fits sizes under <10 and >5.");
  });

  test("title case leaves mixed-case words and sizes glued to numbers alone", () => {
    const { product: tidied } = clean(
      product({ title: "MEN'S iPhone CASE 3XL 10MM T-SHIRT" }),
      store,
    );
    expect(tidied.title).toBe("Men's iPhone Case 3XL 10MM T-Shirt");
  });

  test("does not recase a title that is not shouting", () => {
    const { product: tidied, fixes } = clean(
      product({ title: "LEGO City Fire Truck" }),
      store,
    );
    expect(tidied.title).toBe("LEGO City Fire Truck");
    expect(fixes.some((entry) => entry.field === "title")).toBe(false);
  });

  test("makes relative product and image URLs absolute, leaving absolute ones as they were", () => {
    expect(result.product.url).toBe("https://shop.example/products/scarf");
    expect(result.product.images).toEqual([
      "https://shop.example/images/a.jpg",
      "https://cdn.example/b.jpg",
      "https://cdn.example/c.jpg",
    ]);
    expect(result.product.variants[0]?.image).toBe(
      "https://shop.example/products/images/v.jpg",
    );
    expect(fix("url")).toMatchObject({
      before: "/products/scarf",
      kind: "cleaned",
    });
  });

  test("drops a barcode that fails the check digit and warns on both channels", () => {
    expect(result.product.variants[0]?.barcode).toBeNull();
    expect(fix("barcode")).toMatchObject({ before: "12345", kind: "cleaned" });
    expect(result.findings.map((finding) => finding.channel).sort()).toEqual([
      "chatgpt",
      "google",
    ]);
    expect(result.findings[0]?.severity).toBe("warning");
    expect(result.findings[0]?.message).toContain("12345");
  });

  test("infers brand and seller from the site name and labels them inferred", () => {
    expect(result.product.brand).toBe("Acme Goods");
    expect(fix("brand")).toMatchObject({
      before: null,
      after: "Acme Goods",
      kind: "inferred",
    });
    expect(fix("brand")?.reason).toContain("site name");
    expect(fix("seller_name")).toMatchObject({
      after: "Acme Goods",
      kind: "inferred",
    });
  });

  test("leaves brand missing when the store has no name", () => {
    const { product: tidied, fixes } = clean(product({ brand: null }), {
      ...store,
      name: null,
    });
    expect(tidied.brand).toBeNull();
    expect(
      fixes.some(
        (entry) => entry.field === "brand" || entry.field === "seller_name",
      ),
    ).toBe(false);
  });

  test("records condition and identifier_exists as inferred", () => {
    expect(fix("condition")).toMatchObject({ after: "new", kind: "inferred" });
    expect(fix("identifier_exists")).toMatchObject({
      after: "false",
      kind: "inferred",
    });
  });

  test("a listing that says it is refurbished never gets condition=new", () => {
    const { fixes } = clean(
      product({ title: "Arc Ultra - Certified Refurbished" }),
      store,
    );
    expect(fixes.some((entry) => entry.field === "condition")).toBe(false);
  });

  test("a valid GTIN stays, with no identifier_exists fix and no warning", () => {
    const { product: tidied, fixes, findings } = clean(product(), store);
    expect(tidied.variants[0]?.barcode).toBe(VALID_GTIN);
    expect(fixes.some((entry) => entry.field === "identifier_exists")).toBe(
      false,
    );
    expect(findings).toEqual([]);
  });

  test("never touches price, currency, availability, GTIN digits or stock", () => {
    const source = product({
      title: "SHOUTING WOOL COAT",
      description: "<p>Warm</p>",
      currency: "JPY",
      variants: [
        variant({
          id: "a",
          price: "1,299",
          compareAtPrice: "2000.5",
          availability: "backorder",
          barcode: VALID_GTIN,
        }),
        variant({ id: "b", price: null, availability: "unknown" }),
      ],
    });
    const { product: tidied } = clean(source, store);
    expect(tidied.currency).toBe("JPY");
    expect(tidied.variants).toEqual(source.variants);
  });

  test("states no currency or availability the store did not state", () => {
    const { product: tidied } = clean(
      product({
        currency: null,
        variants: [variant({ price: null, availability: "unknown" })],
      }),
      store,
    );
    expect(tidied.currency).toBeNull();
    expect(tidied.variants[0]?.price).toBeNull();
    expect(tidied.variants[0]?.availability).toBe("unknown");
  });
});

describe("vet", () => {
  const source = product({
    description: "A 12.5 oz tee in 100% cotton.",
    variants: [variant({ options: { Size: "10" } })],
  });
  const context = { source, current: source, store };

  test("accepts numbers already in the title, description or options", () => {
    expect(vet("description", "Cotton tee, 12.5 oz, size 10.", context)).toBe(
      null,
    );
    expect(vet("description", "Made of 100% cotton.", context)).toBe(null);
  });

  test("rejects a digit sequence the source does not have", () => {
    expect(vet("description", "Comes in 12 colors.", context)).toBe(
      "new-number",
    );
    expect(vet("description", "Weighs 2000 grams.", context)).toBe(
      "new-number",
    );
    expect(vet("title", "Tee, 3 pack", context)).toBe("new-number");
  });

  test("a number is compared whole, so 12.5 does not vouch for 125 or 12", () => {
    expect(vet("description", "Weighs 125 oz.", context)).toBe("new-number");
    expect(vet("description", "Weighs 5.12 oz.", context)).toBe("new-number");
  });

  test("markup digits in the raw description are not source facts", () => {
    const { product: tidied } = clean(
      product({ description: '<img width="600" src="x.jpg"><p>Soft tee</p>' }),
      store,
    );
    expect(
      vet("description", "Soft tee, 600 thread count.", {
        source: tidied,
        current: tidied,
        store,
      }),
    ).toBe("new-number");
  });

  test("rejects any price or currency mention", () => {
    expect(vet("description", "Priced for everyday wear.", context)).toBe(
      "price-mention",
    );
    expect(vet("description", "Soft cotton, under €.", context)).toBe(
      "price-mention",
    );
    expect(vet("description", "Soft cotton, sold in EUR.", context)).toBe(
      "price-mention",
    );
    expect(vet("description", "Soft cotton on sale now.", context)).toBe(
      "price-mention",
    );
  });

  test("pounds as a weight is not read as a currency", () => {
    expect(vet("description", "Weighs a few pounds.", context)).toBe(null);
  });

  test("rejects what the Merchant Center lint rejects", () => {
    expect(vet("description", "Soft tee with free shipping.", context)).toBe(
      "lint",
    );
    expect(vet("title", "Buy now: cotton tee", context)).toBe("lint");
    expect(vet("title", "ORGANIC COTTON TEE SHIRT", context)).toBe("lint");
  });

  test("rejects a link the model added", () => {
    expect(vet("description", "See https://evil.example/tee", context)).toBe(
      "link",
    );
  });

  test("rejects a rewrite that adds a finding the product did not have", () => {
    expect(vet("description", source.title, context)).toBe("new-finding");
  });
});

describe("prepare", () => {
  const draftOf =
    (reply: { title?: string | null; description?: string | null }) =>
    async (_brief: Brief) => ({
      title: reply.title ?? null,
      description: reply.description ?? null,
    });

  test("accepts a clean rewrite as kind rewritten, with before and after", async () => {
    const source = product();
    const [result] = await prepare(catalog([source]), {
      rewriteAll: true,
      screen: unchecked,
      draft: draftOf({
        description: "An everyday tee in 100% organic cotton.",
      }),
    });
    expect(result?.product.description).toBe(
      "An everyday tee in 100% organic cotton.",
    );
    expect(
      result?.fixes.find((entry) => entry.field === "description"),
    ).toMatchObject({
      kind: "rewritten",
      before: source.description,
      after: "An everyday tee in 100% organic cotton.",
    });
    expect(result?.original).toEqual(source);
  });

  test("a description written from nothing is labelled inferred", async () => {
    const [result] = await prepare(catalog([product({ description: null })]), {
      screen: unchecked,
      draft: draftOf({ description: "An organic cotton tee." }),
    });
    expect(result?.product.description).toBe("An organic cotton tee.");
    expect(
      result?.fixes.find((entry) => entry.field === "description"),
    ).toMatchObject({ kind: "inferred", before: null });
  });

  test("digit guard: a rewrite with an invented number is dropped and the original kept", async () => {
    const source = product();
    const [result] = await prepare(catalog([source]), {
      rewriteAll: true,
      screen: unchecked,
      draft: draftOf({ description: "A soft 200 gsm tee in organic cotton." }),
    });
    expect(result?.product.description).toBe(source.description);
    expect(result?.fixes.some((entry) => entry.kind === "rewritten")).toBe(
      false,
    );
  });

  test("a rewrite failing lint is dropped and the original kept", async () => {
    const source = product();
    const [result] = await prepare(catalog([source]), {
      rewriteAll: true,
      screen: unchecked,
      draft: draftOf({ description: "Soft tee with free shipping!!" }),
    });
    expect(result?.product.description).toBe(source.description);
    expect(result?.fixes.some((entry) => entry.kind === "rewritten")).toBe(
      false,
    );
  });

  test("each field is judged alone: a bad description does not cost a good title", async () => {
    const source = product({ title: "Buy now!! Organic Cotton Tee" });
    const [result] = await prepare(catalog([source]), {
      rewriteAll: true,
      screen: unchecked,
      draft: draftOf({
        title: "Organic Cotton Tee",
        description: "Soft tee, now only 20 USD.",
      }),
    });
    expect(result?.product.title).toBe("Organic Cotton Tee");
    expect(result?.product.description).toBe(source.description);
  });

  test("HTML from the model comes out as plain text", async () => {
    const [result] = await prepare(catalog([product()]), {
      rewriteAll: true,
      screen: unchecked,
      draft: draftOf({ description: "<p>An <b>organic</b> cotton tee.</p>" }),
    });
    expect(result?.product.description).toBe("An organic cotton tee.");
  });

  test("price, currency, availability and GTIN survive a rewrite untouched", async () => {
    const source = product({
      currency: "GBP",
      variants: [
        variant({ price: "12.00", availability: "pre_order" }),
        variant({
          id: "v2",
          price: null,
          availability: "unknown",
          barcode: null,
        }),
      ],
    });
    const [result] = await prepare(catalog([source]), {
      rewriteAll: true,
      screen: unchecked,
      draft: draftOf({ description: "An everyday organic cotton tee." }),
    });
    expect(result?.product.currency).toBe("GBP");
    expect(result?.product.variants[0]?.price).toBe("12.00");
    expect(result?.product.variants[0]?.availability).toBe("pre_order");
    expect(result?.product.variants[0]?.barcode).toBe(VALID_GTIN);
    expect(result?.product.variants[1]?.price).toBeNull();
    expect(result?.product.variants[1]?.availability).toBe("unknown");
  });

  test("without a model it completes with deterministic fixes only", async () => {
    const [result] = await prepare(
      catalog([product({ title: "SHOUTING COTTON TEE", description: null })]),
      { rewriteAll: true, screen: unchecked, draft: failing },
    );
    expect(result?.product.title).toBe("Shouting Cotton Tee");
    expect(result?.product.description).toBeNull();
    expect(result?.policyChecked).toBe(false);
    expect(result?.fixes.some((entry) => entry.kind === "rewritten")).toBe(
      false,
    );
  });

  test("the deadline stops a model that never answers", async () => {
    const started = Date.now();
    const [result] = await prepare(catalog([product()]), {
      rewriteAll: true,
      deadline: 40,
      screen: () => new Promise(() => {}),
      draft: () => new Promise(() => {}),
    });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(result?.product.title).toBe("Organic Cotton Tee");
    expect(result?.policyChecked).toBe(false);
  });

  test("runs at most 6 rewrites at once, and rewriteAll covers the first 10 only", async () => {
    const products = Array.from({ length: 14 }, (_, index) =>
      product({ id: `p${index}`, url: `https://shop.example/p/${index}` }),
    );
    const running = new Set<string>();
    const peaks: number[] = [];
    const seen: string[] = [];

    await prepare(catalog(products), {
      rewriteAll: true,
      screen: unchecked,
      draft: async ({ product: item }) => {
        running.add(item.id);
        peaks.push(running.size);
        seen.push(item.id);
        await Bun.sleep(1);
        running.delete(item.id);
        return { title: null, description: null };
      },
    });

    expect(Math.max(...peaks)).toBeLessThanOrEqual(6);
    expect(seen.sort()).toEqual(
      products
        .slice(0, 10)
        .map((item) => item.id)
        .sort(),
    );
  });

  test("a policy match takes ChatGPT readiness away and leaves Google alone", async () => {
    const source = product({ title: "Barrel Aged Red Wine" });
    const flag = {
      category: "age-restricted products (for example, alcohol)",
      reason: "This product is a wine.",
    };
    const [result] = await prepare(catalog([source]), {
      draft: failing,
      screen: async () =>
        new Map([[source.id, { policy: flag, policyChecked: true }]]),
    });
    expect(result?.policy).toEqual(flag);
    expect(result?.policyChecked).toBe(true);
    expect(result?.ready.chatgpt).toBe(false);
    expect(
      result?.findings.some(
        (finding) =>
          finding.channel === "google" && finding.severity === "error",
      ),
    ).toBe(result?.ready.google === false);
  });

  test("ready follows the error findings on each channel", async () => {
    const [result] = await prepare(
      catalog([
        product({
          currency: null,
          variants: [variant({ price: null, availability: "unknown" })],
        }),
      ]),
      { draft: failing, screen: passing },
    );
    const blocked = (channel: string) =>
      result?.findings.some(
        (finding) =>
          finding.channel === channel && finding.severity === "error",
      );
    expect(blocked("google")).toBe(true);
    expect(blocked("chatgpt")).toBe(true);
    expect(result?.ready).toEqual({ google: false, chatgpt: false });
  });

  test("a dropped barcode's warning reaches the final findings", async () => {
    const [result] = await prepare(
      catalog([product({ variants: [variant({ barcode: "12345" })] })]),
      { draft: failing, screen: passing },
    );
    expect(
      result?.findings.filter(
        (finding) => finding.code === "gtin-invalid-dropped",
      ).length,
    ).toBe(2);
  });

  test("reports counts as it goes, and a throwing listener does not fail the run", async () => {
    const lines: Progress[] = [];
    const prepared = await prepare(
      catalog([product(), product({ id: "p2" })]),
      {
        rewriteAll: true,
        screen: passing,
        draft: draftOf({ description: "An everyday organic cotton tee." }),
        onProgress: (progress) => {
          lines.push(progress);
          throw new Error("redis is down");
        },
      },
    );
    const last = lines.at(-1);
    expect(prepared).toHaveLength(2);
    expect(last?.message).toBe("Prepared 2 products.");
    expect(lines[0]?.cleaned).toBe(2);
    expect(last?.total).toBe(2);
    expect(last?.rewrites).toEqual({
      total: 2,
      settled: 2,
      accepted: 2,
      rejected: 0,
    });
    expect(last?.policy).toEqual({ checked: 2, flagged: 0 });
    expect(last?.fixes).toBe(prepared.flatMap((entry) => entry.fixes).length);
  });
});

describe("policy", () => {
  const markdown = `# Get Started

## Integration path

Upload a feed.

## Prohibited products policy

Prohibited products include adult content, age-restricted products (for example, alcohol).

### Enforcement

Sub-sections stay with the policy.

## Best practices

Keep feeds fresh.
`;

  test("section takes the policy body up to the next heading of its level", () => {
    const body = Policy.section(markdown);
    expect(body).toContain("alcohol");
    expect(body).toContain("Sub-sections");
    expect(body).not.toContain("Prohibited products policy");
    expect(body).not.toContain("Keep feeds fresh");
  });

  test("section is null when the heading is gone", () => {
    expect(Policy.section("# Get Started\n\nNothing here.")).toBeNull();
  });

  test("the model is given the policy text, and matches carry its wording", async () => {
    const wine = product({ id: "wine", title: "Red Wine" });
    const tee = product({ id: "tee" });
    const received: string[] = [];

    const verdicts = await Policy.flag([wine, tee], {
      policy: async () => "age-restricted products (for example, alcohol)",
      classify: async (text) => {
        received.push(text);
        return {
          matches: [
            {
              product: "wine",
              category: "age-restricted products",
              reason: "It is a wine.",
            },
            { product: "ghost", category: "weapons", reason: "Not in batch." },
          ],
        };
      },
    });

    expect(received[0]).toContain("alcohol");
    expect(verdicts.get("wine")).toEqual({
      policyChecked: true,
      policy: {
        category: "age-restricted products",
        reason: "It is a wine.",
      },
    });
    expect(verdicts.get("tee")).toEqual({ policyChecked: true, policy: null });
    expect(verdicts.has("ghost")).toBe(false);
  });

  test("when the policy cannot be read, nothing is claimed as checked", async () => {
    const verdicts = await Policy.flag([product()], {
      policy: async () => null,
      classify: async () => ({ matches: [] }),
    });
    expect(verdicts.get("p1")).toEqual(Policy.UNCHECKED);
  });

  test("a failed batch leaves only its own products unchecked", async () => {
    const products = Array.from({ length: 20 }, (_, index) =>
      product({ id: `p${index}` }),
    );
    const verdicts = await Policy.flag(products, {
      policy: async () => "policy text",
      classify: async (_text, batch) => {
        if (batch.some((item) => item.id === "p19"))
          throw new Error("model down");
        return { matches: [] };
      },
    });
    const values = [...verdicts.values()];
    expect(values).toHaveLength(20);
    expect(values.filter((verdict) => verdict.policyChecked)).toHaveLength(15);
    expect(verdicts.get("p19")?.policyChecked).toBe(false);
  });

  test("a model that never answers leaves products unchecked at the timeout", async () => {
    const verdicts = await Policy.flag([product()], {
      timeout: 20,
      policy: async () => "policy text",
      classify: () => new Promise(() => {}),
    });
    expect(verdicts.get("p1")?.policyChecked).toBe(false);
  });
});

describe("hard rules: rewrites and fixes", () => {
  const source = product({
    description: "A 12.5 oz tee in 100% cotton, sold as a dozen.",
    variants: [variant({ options: { Size: "10" } })],
  });
  const context = { source, current: source, store };

  test.each([
    ["Comes in a pack of twelve."],
    ["Twice as soft as the rest."],
    ["Double stitched at every seam."],
    ["Over ten thousand made."],
    ["Comes in １２ colors."],
  ])("%s writes a number the store never stated", (text) => {
    expect(vet("description", text, context)).toBe("new-number");
  });

  test("a number word the store did write can stay", () => {
    expect(vet("description", "Sold as a dozen.", context)).toBeNull();
  });

  test("one is a pronoun in store copy, not a claim", () => {
    expect(vet("description", "One soft cotton tee.", context)).toBeNull();
  });

  test.each([
    ["In stock and ready for you."],
    ["Sold out everywhere else."],
    ["Available now in cotton."],
    ["Ships from our own warehouse."],
    ["Pre-order this cotton tee."],
    ["Fast delivery on cotton tees."],
  ])("%s says something about stock or delivery", (text) => {
    expect(vet("description", text, context)).toBe("stock-mention");
  });

  test("a hidden digit does not slip past the number check", async () => {
    const [entry] = await prepare(catalog([source]), {
      draft: async () => ({
        title: null,
        description: "Comes in &#49;&#50; colors.",
      }),
      screen: passing,
    });

    expect(entry?.product.description).toBe(source.description);
    expect(entry?.fixes.filter((fix) => fix.kind === "rewritten")).toEqual([]);
  });

  test("the JPEG asked for on Shopify's CDN is recorded", () => {
    const webp = "https://cdn.shopify.com/s/files/1/tee.webp";
    const { fixes } = clean(
      product({ images: [webp], variants: [variant({ image: webp })] }),
      store,
    );

    expect(fixes.filter((fix) => fix.field === "image_url")).toEqual([
      expect.objectContaining({
        before: webp,
        after: `${webp}?format=jpg`,
        kind: "cleaned",
      }),
    ]);
  });

  test("a store that states used is never recorded as new", () => {
    const { fixes } = clean(product({ condition: "used" }), store);

    expect(fixes.filter((fix) => fix.field === "condition")).toEqual([]);
  });

  test("hostile markup in a description stays cheap", () => {
    const started = performance.now();
    const { product: cleaned } = clean(
      product({ description: "<a".repeat(25_000) }),
      store,
    );
    ChatGPT.assess(cleaned, store);
    Google.assess(cleaned, store);

    expect(performance.now() - started).toBeLessThan(500);
  });
});
