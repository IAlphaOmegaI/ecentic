import { describe, expect, mock, test } from "bun:test";
import type { CompanyEvidence } from "@/server/utils/outbound/automation-qualification";

mock.module("server-only", () => ({}));
const {
  createQualificationCatalog,
  qualificationWireSchema,
  projectQualification,
  validateAssessment,
} = await import("@/server/utils/outbound/automation-qualification");
const evidence = (): CompanyEvidence => ({
  platform: "shopify",
  product: {
    name: "Ceramic Cup",
    brand: "Example",
    url: "https://example.test/products/cup",
    description: "A handmade ceramic cup with a removable cork sleeve.",
    price: 25,
    currency: "USD",
  },
  receipts: [
    {
      url: "https://example.test/about",
      kind: "company",
      checkedAt: "2026-11-01T10:00:00.000Z",
      sha256: "a".repeat(64),
      excerpt:
        "We make our own ceramic cups. Our three-person team supplies local retailers.\nThe company’s workshop keeps original records. 🍵",
    },
    {
      url: "https://example.test/products/cup",
      kind: "product",
      checkedAt: "2026-11-02T10:00:00.000Z",
      sha256: "b".repeat(64),
      excerpt:
        "Ceramic Cup. A handmade ceramic cup with a removable cork sleeve.",
    },
  ],
});
const wire = (catalog: ReturnType<typeof createQualificationCatalog>) => {
  const company = catalog.quotes.find((quote) => quote.kind === "company");
  const product = catalog.quotes.find((quote) => quote.kind === "product");
  if (!company || !product) throw new Error("Expected fixture excerpts");
  return {
    decision: "qualified",
    reason: "Own physical products and an observed established team.",
    productCategory: "ceramic cup",
    ownBrandEvidence: company.id,
    physicalProductEvidence: product.id,
    establishedEvidence: company.id,
    criteriaEvidence: [company.id, product.id],
    criteriaSatisfied: true,
    productInsight: {
      quoteId: product.id,
      feature: "a removable cork sleeve",
      kind: "design",
      relevance:
        "A shopper can compare whether the removable sleeve suits their preferred handling and cleaning.",
    },
  };
};

describe("company qualification selects immutable source excerpts", () => {
  test("projects exact original words and URLs without changing source facts or dates", () => {
    const sources = evidence();
    const original = structuredClone(sources);
    const catalog = createQualificationCatalog(sources);
    const company = sources.receipts[0];
    if (!company) throw new Error("Expected the original company receipt");
    const projected = projectQualification(catalog, wire(catalog));
    expect(projected.success).toBe(true);
    if (!projected.success) throw projected.error;
    expect(projected.data.establishedEvidence).toEqual({
      url: company.url,
      quote: company.excerpt,
    });
    expect(projected.data.productInsight?.sourceQuote).toBe(
      sources.receipts[1]?.excerpt,
    );
    expect(validateAssessment(projected.data, sources)).toBeNull();
    expect(sources).toEqual(original);
    expect(catalog.quotes[0]?.checkedAt).toBe("2026-11-01T10:00:00.000Z");
  });
  test("rejects unknown IDs and model-written quote objects", () => {
    const catalog = createQualificationCatalog(evidence());
    expect(
      projectQualification(catalog, {
        ...wire(catalog),
        criteriaEvidence: ["q_fabricated"],
      }).success,
    ).toBe(false);
    expect(
      projectQualification(catalog, {
        ...wire(catalog),
        ownBrandEvidence: {
          url: "https://example.test/about",
          quote: "Founded in 2016",
        },
      }).success,
    ).toBe(false);
    expect(
      projectQualification(catalog, {
        ...wire(catalog),
        productInsight: {
          ...wire(catalog).productInsight,
          quoteId: "q_foreign_product",
        },
      }).success,
    ).toBe(false);
  });
  test("binds excerpt IDs to original content, URL, date and body hash", () => {
    const sources = evidence();
    const original = createQualificationCatalog(sources);
    for (const changed of [
      { ...sources.receipts[0], checkedAt: "2026-11-03T10:00:00.000Z" },
      { ...sources.receipts[0], url: "https://different.test/about" },
      { ...sources.receipts[0], sha256: "c".repeat(64) },
      {
        ...sources.receipts[0],
        excerpt: "A different company makes a different product.",
      },
    ]) {
      const next = createQualificationCatalog({
        ...sources,
        receipts: [
          changed as CompanyEvidence["receipts"][number],
          ...sources.receipts.slice(1),
        ],
      });
      expect(projectQualification(next, wire(original)).success).toBe(false);
    }
  });
  test("keeps long source excerpts bounded, contiguous and Unicode-safe", () => {
    const sources = evidence();
    const text =
      "The workshop makes physical cups with its established team. 🍵 ".repeat(
        270,
      );
    const receipt = sources.receipts[0];
    if (!receipt) throw new Error("Missing fixture receipt");
    const catalog = createQualificationCatalog({
      ...sources,
      receipts: [{ ...receipt, excerpt: text }],
    });
    expect(catalog.quotes.length).toBeGreaterThan(1);
    expect(
      catalog.quotes.every(
        (quote) =>
          quote.quote.length <= 1000 &&
          quote.quote === text.slice(quote.start, quote.end),
      ),
    ).toBe(true);
    expect(catalog.quotes.map((quote) => quote.quote).join("")).toBe(text);
    expect(
      catalog.quotes.some((quote) =>
        /^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(quote.quote),
      ),
    ).toBe(false);
  });
  test("wire format contains only required ID choices and Azure-supported primitives", () => {
    const catalog = createQualificationCatalog(evidence());
    const schema = qualificationWireSchema(catalog).toJSONSchema();
    const serialized = JSON.stringify(schema);
    expect(serialized).not.toContain('"format"');
    expect(serialized).not.toContain('"minLength"');
    expect(serialized).not.toContain('"sourceUrl"');
    expect(schema.required).toHaveLength(9);
  });
});
