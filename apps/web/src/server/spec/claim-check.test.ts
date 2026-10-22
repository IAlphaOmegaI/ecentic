import { describe, expect, test } from "bun:test";
import {
  type Availability,
  catalogAvailability,
  catalogSkuAvailability,
  compareAvailability,
  compareBrand,
  compareGtin,
  comparePrice,
  decideVerdict,
  type Evidence,
  excerptsFor,
  extractPageFacts,
  guidanceFor,
  type PageFacts,
  parseResearch,
  partyOf,
  plainText,
  quoteIn,
  selectAssertions,
} from "@/server/app/intelligence/claim-check-rules";

const page = (...jsonLd: unknown[]) =>
  `<html><head>${jsonLd
    .map(
      (block) =>
        `<script type="application/ld+json">${JSON.stringify(block)}</script>`,
    )
    .join("")}</head><body></body></html>`;

const facts = (over: Partial<PageFacts> = {}): PageFacts => ({
  matched: 1,
  ambiguous: false,
  offers: [],
  brands: [],
  gtins: [],
  ...over,
});

const offer = (
  over: Partial<PageFacts["offers"][number]> = {},
): PageFacts["offers"][number] => ({
  price: 10,
  low: null,
  high: null,
  currency: "USD",
  availability: "in_stock" satisfies Availability,
  sku: null,
  ...over,
});

const evidence = (over: Partial<Evidence> = {}): Evidence => ({
  kind: "page",
  url: "https://review.example/a",
  citedUrl: null,
  host: "review.example",
  party: "independent",
  relation: "supports",
  quote: "Battery lasted 12 hours in our test.",
  summary: null,
  retrievedAt: "2026-10-22T00:00:00.000Z",
  ...over,
});

describe("catalogAvailability", () => {
  test("stays unknown without a payload", () => {
    expect(catalogAvailability(null)).toBe("unknown");
    expect(catalogAvailability("not json")).toBe("unknown");
    expect(catalogAvailability(JSON.stringify({ variants: [] }))).toBe(
      "unknown",
    );
  });

  test("an untracked Shopify variant is purchasable", () => {
    const raw = JSON.stringify({
      variants: [{ inventory_management: null, inventory_quantity: 0 }],
    });
    expect(catalogAvailability(raw)).toBe("in_stock");
  });

  test("every variant tracked, empty and denying sale is out of stock", () => {
    const raw = JSON.stringify({
      variants: [
        {
          inventory_management: "shopify",
          inventory_policy: "deny",
          inventory_quantity: 0,
        },
        {
          inventory_management: "shopify",
          inventory_policy: "deny",
          inventory_quantity: -2,
        },
      ],
    });
    expect(catalogAvailability(raw)).toBe("out_of_stock");
  });

  test("a variant missing its inventory fields is not assumed in stock", () => {
    const raw = JSON.stringify({ variants: [{ sku: "A" }] });
    expect(catalogAvailability(raw)).toBe("unknown");
  });

  test("reads WooCommerce stock status", () => {
    expect(
      catalogAvailability(JSON.stringify({ stock_status: "outofstock" })),
    ).toBe("out_of_stock");
    expect(catalogAvailability(JSON.stringify({ is_in_stock: true }))).toBe(
      "in_stock",
    );
  });
});

describe("catalogSkuAvailability", () => {
  test("reads the variant carrying the catalog SKU", () => {
    const raw = JSON.stringify({
      variants: [
        {
          sku: "A",
          inventory_management: "shopify",
          inventory_policy: "deny",
          inventory_quantity: 0,
        },
        { sku: "B", inventory_management: null },
      ],
    });
    expect(catalogSkuAvailability(raw, "A")).toBe("out_of_stock");
    expect(catalogSkuAvailability(raw, "B")).toBe("in_stock");
    expect(catalogSkuAvailability(raw, "C")).toBe("unknown");
    expect(catalogAvailability(raw)).toBe("in_stock");
  });
});

describe("extractPageFacts", () => {
  const listing = { title: "Trail Runner 5", sku: "TR5-42" };

  test("reads every offer of a lone product node", () => {
    const facts = extractPageFacts(
      page({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Trail Runner 5",
        brand: { "@type": "Brand", name: "Acme" },
        gtin13: "4006381333931",
        offers: [
          {
            "@type": "Offer",
            price: "140.00",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            sku: "TR5-42",
          },
          {
            "@type": "Offer",
            price: "150.00",
            priceCurrency: "USD",
            availability: "https://schema.org/OutOfStock",
          },
        ],
      }),
      listing,
    );
    expect(facts.matched).toBe(1);
    expect(facts.offers.map((entry) => entry.price)).toEqual([140, 150]);
    expect(facts.offers[0]?.sku).toBe("TR5-42");
    expect(facts.brands).toEqual(["Acme"]);
    expect(facts.gtins).toEqual([{ value: "4006381333931", sku: null }]);
  });

  test("a numeric productID is not a GTIN", () => {
    const facts = extractPageFacts(
      page({
        "@type": "Product",
        name: "Trail Runner 5",
        productID: "12345678",
        identifier: "4006381333931",
      }),
      listing,
    );
    expect(facts.gtins).toEqual([]);
  });

  test("ignores related-product markup when one node names the listing", () => {
    const facts = extractPageFacts(
      page(
        {
          "@type": "Product",
          name: "Trail Runner 5",
          offers: { price: 140, priceCurrency: "USD" },
        },
        {
          "@type": "Product",
          name: "Road Racer 2",
          offers: { price: 99, priceCurrency: "USD" },
        },
      ),
      listing,
    );
    expect(facts.matched).toBe(1);
    expect(facts.offers.map((entry) => entry.price)).toEqual([140]);
  });

  test("an exact name beats a loose one", () => {
    const facts = extractPageFacts(
      page(
        { "@type": "Product", name: "Acme One", offers: { price: 100 } },
        { "@type": "Product", name: "Acme One Pro", offers: { price: 200 } },
      ),
      { title: "Acme One", sku: null },
    );
    expect(facts.offers.map((entry) => entry.price)).toEqual([100]);
  });

  test("several loose matches are ambiguous", () => {
    const facts = extractPageFacts(
      page(
        { "@type": "Product", name: "Acme One Pro", offers: { price: 200 } },
        { "@type": "Product", name: "Acme One Max", offers: { price: 300 } },
      ),
      { title: "Acme One", sku: null },
    );
    expect(facts.ambiguous).toBe(true);
  });

  test("a lone node naming another product is not this listing", () => {
    const facts = extractPageFacts(
      page({ "@type": "Product", name: "Hiking Boot", offers: { price: 89 } }),
      listing,
    );
    expect(facts.ambiguous).toBe(true);
    expect(facts.offers).toEqual([]);
  });

  test("several unrelated nodes are ambiguous, not compared", () => {
    const facts = extractPageFacts(
      page(
        { "@type": "Product", name: "Road Racer 2", offers: { price: 99 } },
        { "@type": "Product", name: "Hiking Boot", offers: { price: 89 } },
      ),
      listing,
    );
    expect(facts.ambiguous).toBe(true);
    expect(facts.offers).toEqual([]);
  });
});

describe("comparePrice", () => {
  const listing = { price: "140.00", currency: "USD", sku: null, variants: 1 };

  test("consistent when any comparable offer carries the catalog price", () => {
    const result = comparePrice(
      listing,
      facts({ offers: [offer({ price: 150 }), offer({ price: 140 })] }),
    );
    expect(result.consistency).toBe("consistent");
  });

  test("conflicting when the only offer disagrees", () => {
    const result = comparePrice(
      listing,
      facts({ offers: [offer({ price: 120 })] }),
    );
    expect(result.consistency).toBe("conflicting");
    expect(result.note).toBeNull();
  });

  test("one unlabelled offer cannot speak for every variant", () => {
    const result = comparePrice(
      { ...listing, variants: 3 },
      facts({ offers: [offer({ price: 120 })] }),
    );
    expect(result.consistency).toBe("unknown");
    expect(result.note).toBe("variant-not-matched");
  });

  test("another currency is not comparable", () => {
    const result = comparePrice(
      listing,
      facts({ offers: [offer({ price: 130, currency: "EUR" })] }),
    );
    expect(result.consistency).toBe("unknown");
    expect(result.note).toBe("currency-mismatch");
  });

  test("an offer without a currency can confirm but not refute", () => {
    expect(
      comparePrice(
        listing,
        facts({ offers: [offer({ price: 140, currency: null })] }),
      ).consistency,
    ).toBe("consistent");
    const result = comparePrice(
      listing,
      facts({ offers: [offer({ price: 130, currency: null })] }),
    );
    expect(result.consistency).toBe("unknown");
    expect(result.note).toBe("currency-missing");
  });

  test("an offer for the catalog's own SKU is the only one that counts", () => {
    const result = comparePrice(
      { ...listing, sku: "A" },
      facts({
        offers: [
          offer({ price: 140, sku: "B" }),
          offer({ price: 135, sku: "A" }),
        ],
      }),
    );
    expect(result.consistency).toBe("conflicting");
  });

  test("a page without the catalog's SKU does not show this variant", () => {
    const result = comparePrice(
      { ...listing, sku: "A" },
      facts({ offers: [offer({ price: 130, sku: "B" })] }),
    );
    expect(result.consistency).toBe("unknown");
    expect(result.note).toBe("variant-not-matched");
  });

  test("ranges confirm but never refute", () => {
    expect(
      comparePrice(
        listing,
        facts({ offers: [offer({ price: null, low: 120, high: 160 })] }),
      ).consistency,
    ).toBe("consistent");
    expect(
      comparePrice(
        listing,
        facts({ offers: [offer({ price: null, low: 120 })] }),
      ).consistency,
    ).toBe("consistent");
    expect(
      comparePrice(
        listing,
        facts({ offers: [offer({ price: null, low: 150, high: 160 })] }),
      ).consistency,
    ).toBe("unknown");
  });

  test("missing markup is unknown, never a conflict", () => {
    expect(comparePrice(listing, null).consistency).toBe("unknown");
    expect(comparePrice({ ...listing, price: null }, facts()).note).toBe(
      "missing-in-listing",
    );
  });
});

describe("compareAvailability", () => {
  const listing = {
    availability: "in_stock" as Availability,
    skuAvailability: "unknown" as Availability,
    sku: null,
    variants: 1,
  };

  test("conflicts only when both sides are known", () => {
    expect(
      compareAvailability(
        listing,
        facts({ offers: [offer({ availability: "out_of_stock" })] }),
      ).consistency,
    ).toBe("conflicting");
    expect(
      compareAvailability(
        { ...listing, availability: "unknown" },
        facts({ offers: [offer()] }),
      ).consistency,
    ).toBe("unknown");
  });

  test("compares the catalog SKU's variant with that SKU's offers", () => {
    const result = compareAvailability(
      {
        availability: "in_stock",
        skuAvailability: "out_of_stock",
        sku: "A",
        variants: 2,
      },
      facts({ offers: [offer({ sku: "A", availability: "out_of_stock" })] }),
    );
    expect(result.consistency).toBe("consistent");
  });

  test("a page showing some variants sold out does not refute the catalog", () => {
    const result = compareAvailability(
      { ...listing, variants: 3 },
      facts({ offers: [offer({ availability: "out_of_stock" })] }),
    );
    expect(result.consistency).toBe("unknown");
    expect(result.note).toBe("variant-not-matched");
  });

  test("a page in stock where the catalog is sold out always conflicts", () => {
    const result = compareAvailability(
      { ...listing, availability: "out_of_stock", variants: 3 },
      facts({ offers: [offer({ availability: "in_stock" })] }),
    );
    expect(result.consistency).toBe("conflicting");
  });
});

describe("compareGtin / compareBrand", () => {
  const listing = { gtin: "012345678905", sku: null, variants: 1 };

  test("GTINs compare as GTIN-14", () => {
    const result = compareGtin(
      listing,
      facts({ gtins: [{ value: "00012345678905", sku: null }] }),
    );
    expect(result.consistency).toBe("consistent");
    expect(result.note).toBeNull();
  });

  test("conflicts only at the catalog SKU, or when every variant is listed", () => {
    expect(
      compareGtin(
        { ...listing, sku: "A" },
        facts({ gtins: [{ value: "4006381333931", sku: "A" }] }),
      ).consistency,
    ).toBe("conflicting");
    expect(
      compareGtin(
        { ...listing, variants: 3 },
        facts({ gtins: [{ value: "4006381333931", sku: null }] }),
      ).note,
    ).toBe("variant-not-matched");
  });

  test("flags an invalid catalog GTIN", () => {
    expect(
      compareGtin({ ...listing, gtin: "012345678900" }, facts()).note,
    ).toBe("invalid-gtin");
  });

  test("brands match through casing and punctuation", () => {
    expect(
      compareBrand("Salomon", facts({ brands: ["SALOMON S.A."] })).consistency,
    ).toBe("consistent");
    expect(
      compareBrand("Salomon", facts({ brands: ["Hoka"] })).consistency,
    ).toBe("conflicting");
  });
});

describe("selectAssertions", () => {
  const source =
    "Trail Runner 5. Up to 12 hours of cushioning comfort. Weighs 10.1 oz. Not waterproof. The best trail shoe ever made.";
  const entry = (span: string, over = {}) => ({
    span,
    kind: "spec" as const,
    attribute: "weight",
    value: null,
    unit: null,
    qualifier: null,
    checkable: true,
    relevance: "medium" as const,
    ...over,
  });

  test("drops spans that are not verbatim in the listing", () => {
    const result = selectAssertions(
      [entry("Weighs 10.1 oz"), entry("Weighs about 10 oz")],
      source,
    );
    expect(result.claims.map((claim) => claim.span)).toEqual([
      "Weighs 10.1 oz",
    ]);
  });

  test("restores a bound the model left off", () => {
    const [claim] = selectAssertions(
      [entry("12 hours of cushioning", { value: "12", unit: "hours" })],
      source,
    ).claims;
    expect(claim?.span).toBe("Up to 12 hours of cushioning");
    expect(claim?.qualifier).toBe("up to");
    expect(claim?.value).toBe("12");
  });

  test("restores a negation the model left off", () => {
    const [claim] = selectAssertions([entry("waterproof")], source).claims;
    expect(claim?.span).toBe("Not waterproof");
  });

  test("drops extracted fields the span does not carry", () => {
    const [claim] = selectAssertions(
      [
        entry("Weighs 10.1 oz", {
          value: "9.8",
          unit: "oz",
          qualifier: "about",
        }),
      ],
      source,
    ).claims;
    expect(claim?.value).toBeNull();
    expect(claim?.unit).toBe("oz");
    expect(claim?.qualifier).toBeNull();
  });

  test("ranks decisive claims first", () => {
    const result = selectAssertions(
      [
        entry("The best trail shoe ever made", {
          kind: "superlative",
          checkable: false,
          relevance: "low",
        }),
        entry("Weighs 10.1 oz", { relevance: "high" }),
      ],
      source,
    );
    expect(result.claims[0]?.span).toBe("Weighs 10.1 oz");
  });

  test("de-duplicates, caps, and keys claims stably", () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      entry(`claim number ${index}`),
    );
    const text = many.map((item) => item.span).join(". ");
    const first = selectAssertions([...many, many[0] ?? entry("x")], text);
    const second = selectAssertions(many, text);
    expect(first.found).toBe(14);
    expect(first.claims).toHaveLength(10);
    expect(first.claims[0]?.key).toBe(second.claims[0]?.key ?? "");
  });
});

describe("parseResearch", () => {
  const sources = ["https://a.example/1", "https://b.example/2", null];

  test("resolves markers inside each labelled section", () => {
    const findings = parseResearch(
      "### C1\nSTATUS: supported\nNOTE: Reviews confirm 12 hours [2].\n### C2\nSTATUS: contradicted\nNOTE: Tested at 11.4 oz [1][3][4].",
      ["C1", "C2"],
      sources,
    );
    expect(findings.get("C1")).toEqual({
      status: "supported",
      note: "Reviews confirm 12 hours [2].",
      urls: ["https://b.example/2"],
    });
    expect(findings.get("C2")?.status).toBe("contradicted");
    // [3] is a non-URL hole and [4] has no source; both are dropped.
    expect(findings.get("C2")?.urls).toEqual(["https://a.example/1"]);
  });

  test("reads bold labels, bold STATUS, list and full-width markers", () => {
    const findings = parseResearch(
      "### **C1**\n**STATUS**: supported\nSee [1, 2] and 【2】.",
      ["C1"],
      sources,
    );
    expect(findings.get("C1")?.status).toBe("supported");
    expect(findings.get("C1")?.urls).toEqual([
      "https://a.example/1",
      "https://b.example/2",
    ]);
  });

  test("an unknown heading ends the claim before it", () => {
    const findings = parseResearch(
      "### C1\nSTATUS: no evidence\n## Sources\nEverything [1]",
      ["C1"],
      sources,
    );
    expect(findings.get("C1")?.urls).toEqual([]);
  });

  test("a label with no section is absent, so it reads as unresearched", () => {
    const findings = parseResearch(
      "### C9\nSTATUS: supported [1]\n**C1**\nSTATUS: no evidence\nNOTE: Nothing found.",
      ["C1", "C2"],
      sources,
    );
    expect(findings.has("C9")).toBe(false);
    expect(findings.has("C2")).toBe(false);
    expect(findings.get("C1")?.status).toBe("none");
    expect(findings.get("C1")?.urls).toEqual([]);
  });
});

describe("partyOf", () => {
  const merchant = ["acme-store.com", "acme-store.myshopify.com"];

  test("the merchant's own hosts, subdomains included", () => {
    expect(partyOf("https://www.acme-store.com/p", merchant, "Acme")).toBe(
      "merchant",
    );
    expect(partyOf("https://blog.acme-store.com/p", merchant, "Acme")).toBe(
      "merchant",
    );
  });

  test("a host named after the brand is the manufacturer", () => {
    expect(partyOf("https://salomon.com/en-us/x", merchant, "Salomon")).toBe(
      "manufacturer",
    );
  });

  test("anything else is independent", () => {
    expect(partyOf("https://runrepeat.com/x", merchant, "Salomon")).toBe(
      "independent",
    );
  });
});

describe("excerpts, quotes and text", () => {
  const filler = "Filler text about other products. ".repeat(30);

  test("finds the window around the asserted value", () => {
    const text = `${filler}In our lab test the battery life reached 12 hours at medium volume. ${filler}`;
    const [excerpt] = excerptsFor(text, {
      attribute: "battery life",
      value: "12",
      unit: "hours",
    });
    expect(excerpt).toContain("battery life reached 12 hours");
  });

  test("a conflicting value reaches the judge too", () => {
    const text = `${filler}Battery life is 8 hours in our testing. ${filler}`;
    const [excerpt] = excerptsFor(text, {
      attribute: "battery life",
      value: "12",
      unit: "hours",
    });
    expect(excerpt).toContain("Battery life is 8 hours");
  });

  test("a single-word attribute matches its inflections", () => {
    const text = `${filler}The shoe weighs 11.2 oz on our scale. ${filler}`;
    const [excerpt] = excerptsFor(text, {
      attribute: "weight",
      value: null,
      unit: null,
    });
    expect(excerpt).toContain("weighs 11.2 oz");
  });

  test("returns nothing when the page never mentions the claim", () => {
    expect(
      excerptsFor(`${filler}`, {
        attribute: "water resistance",
        value: "50",
        unit: "m",
      }),
    ).toEqual([]);
  });

  test("a quote must be verbatim from its excerpt", () => {
    const excerpt = "In our lab test the battery life reached 12 hours.";
    expect(quoteIn("the battery life reached 12 hours", excerpt)).toBe(
      "the battery life reached 12 hours",
    );
    expect(quoteIn("battery life is 12 hours", excerpt)).toBeNull();
    expect(quoteIn(null, excerpt)).toBeNull();
  });

  test("plainText drops scripts and tags and decodes entities exactly", () => {
    expect(
      plainText("<p>Up to <b>12&nbsp;hours</b></p><script>var x = 1;</script>"),
    ).toBe("Up to 12 hours .");
    expect(plainText("Battery life is 12&#48; hours")).toBe(
      "Battery life is 120 hours",
    );
    expect(plainText("Size &unknownentity; M")).toBe("Size &unknownentity; M");
  });
});

describe("decideVerdict", () => {
  const base = {
    checkable: true,
    researched: true,
    evidence: [] as Evidence[],
    cited: null,
  };

  test("marketing as written is not checkable, whatever else is known", () => {
    expect(
      decideVerdict({ ...base, checkable: false, evidence: [evidence()] })
        .verdict,
    ).toBe("not-checkable");
  });

  test("an opened independent page with a quote verifies", () => {
    const result = decideVerdict({ ...base, evidence: [evidence()] });
    expect(result.verdict).toBe("verified");
    expect(result.confidence).toBe("medium");
  });

  test("two independent hosts raise confidence", () => {
    const result = decideVerdict({
      ...base,
      evidence: [
        evidence(),
        evidence({ host: "lab.example", url: "https://lab.example" }),
      ],
    });
    expect(result.confidence).toBe("high");
  });

  test("contradiction outranks support", () => {
    const result = decideVerdict({
      ...base,
      evidence: [
        evidence(),
        evidence({ host: "lab.example", relation: "contradicts" }),
      ],
    });
    expect(result.verdict).toBe("contradicted");
  });

  test("the merchant's or brand's own page never verifies", () => {
    expect(
      decideVerdict({
        ...base,
        evidence: [evidence({ party: "manufacturer" })],
      }).verdict,
    ).toBe("merchant-only");
    expect(
      decideVerdict({ ...base, evidence: [evidence({ quote: null })] }).verdict,
    ).toBe("merchant-only");
  });

  test("a citation alone is only 'cited'", () => {
    const result = decideVerdict({
      ...base,
      evidence: [evidence({ kind: "citation", quote: null })],
      cited: { status: "contradicted", note: null, urls: [] },
    });
    expect(result.verdict).toBe("cited");
    expect(result.citedStance).toBe("contradicts");
  });

  test("unresearched when no research ran, rather than merchant-only", () => {
    expect(decideVerdict({ ...base, researched: false }).verdict).toBe(
      "unresearched",
    );
  });
});

describe("guidanceFor", () => {
  test("merchant-only guidance follows the claim's kind", () => {
    expect(guidanceFor("merchant-only", "certification")).toBe(
      "merchantOnlyCertification",
    );
    expect(guidanceFor("merchant-only", "performance")).toBe(
      "merchantOnlySpec",
    );
    expect(guidanceFor("contradicted", "spec")).toBe("contradicted");
  });
});
