import { describe, expect, test } from "bun:test";
import {
  inspectProductPage,
  isValidBarcode,
  PRODUCT_CHECKER_VERSION,
} from "@/server/utils/outbound/research";

const product = {
  "@type": "Product",
  name: "Chili Crisp",
  category: "packaged food",
};
const data = (value: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
const embedded = (value: unknown) =>
  `<script type="application/json">${JSON.stringify(value)}</script>`;
const page = (markup = data(product), extra = "", name = product.name) =>
  `<html><head><meta property="og:type" content="product">${markup}</head><body><h1>${name}</h1>${extra}</body></html>`;
const inspect = (
  body: string,
  capture: { renderedBody?: string; renderedReviewText?: string } = {},
) =>
  inspectProductPage({
    url: "https://example.com/products/chili-crisp",
    status: 200,
    checkedAt: "2026-11-14T18:00:00.000Z",
    body,
    ...capture,
  });
const barcodePage = (barcode = "4006381333931") =>
  page(
    data(product),
    embedded({ title: product.name, variants: [{ barcode }] }),
  );
const ratingPage = (extra = "", count = 123) =>
  page(
    data({ ...product, gtin13: "4006381333931" }) + extra,
    embedded({ title: product.name, id: 42 }) +
      `<div data-product-id="42" data-number-of-reviews="${count}">${count} reviews</div>`,
  );

describe("finding evidence contract", () => {
  test("GTINs require a supported length and the correct check digit", () => {
    for (const value of [
      "96385074",
      "012345678905",
      "4006381333931",
      "10012345000017",
    ])
      expect(isValidBarcode(value)).toBe(true);
    for (const value of [
      "123456789",
      "12345678901",
      "4006381333932",
      "00000000",
      "01234567890A",
    ])
      expect(isValidBarcode(value)).toBe(false);
  });

  test("raw candidates retain source evidence without claiming rendered verification", () => {
    const result = inspect(barcodePage());
    expect(result.status).toBe("hold");
    expect(result.gap).toBe("barcode-missing-from-page-data");
    expect(result.evidence).toContain("4006381333931");
    expect(result.evidence).toContain(PRODUCT_CHECKER_VERSION);
    expect(result.evidence).toContain("rendered verification: missing");
    expect(result.findingReviewed).toBe(false);
    expect(result.productCategory).toBe("packaged food");
  });

  test("invalid embedded codes cannot become barcode or no-barcode findings", () => {
    for (const barcode of ["1234567890123", "123456789", "00000000"])
      expect(inspect(barcodePage(barcode))).toMatchObject({
        status: "hold",
        gap: "",
        finding: "",
      });
  });

  test("cross-store consequence still needs actual distribution evidence after rendering", () => {
    const result = inspect(barcodePage(), { renderedBody: barcodePage() });
    expect(result.status).toBe("hold");
    expect(result.reason).toContain("another retailer");
  });

  test("any published GTIN invalidates an absence claim, including deduplicated Product nodes", () => {
    const body = page(
      data({ ...product, gtin13: "4006381333931" }) +
        data({ ...product, "@type": "ProductGroup" }),
      embedded({ title: product.name, barcode: "4006381333931" }),
    );
    expect(inspect(body).gap).toBe("");
    expect(inspect(page(data({ ...product, gtin: "invalid-value" }))).gap).toBe(
      "",
    );
  });

  test("a GTIN injected after rendering invalidates the raw candidate", () => {
    const result = inspect(barcodePage(), {
      renderedBody: page(data({ ...product, gtin13: "4006381333931" })),
    });
    expect(result.status).toBe("hold");
    expect(result.gap).toBe("");
  });

  test("a barcode in rendered store data prevents a no-barcode claim", () => {
    const result = inspect(page(), { renderedBody: barcodePage() });
    expect(result.gap).toBe("barcode-missing-from-page-data");
    expect(result.evidence).toContain("4006381333931");
    expect(result.status).toBe("hold");
  });

  test("review attributes alone do not prove visible same-product reviews", () => {
    expect(inspect(ratingPage()).status).toBe("hold");
    const result = inspect(ratingPage(), { renderedBody: ratingPage() });
    expect(result.status).toBe("hold");
    expect(result.reason).toContain("visible review count");
    expect(result.reviewCount).toBe("123");
  });

  test("visible linked reviews and checked raw/rendered data can establish a page finding", () => {
    const result = inspect(ratingPage(), {
      renderedBody: ratingPage(),
      renderedReviewText: "123 reviews",
    });
    expect(result.status).toBe("verified");
    expect(result.gap).toBe("rating-missing-from-page-data");
    expect(result.finding).toContain("123 reviews");
    expect(result.findingReviewed).toBe(false);
  });

  test("a rating present only after JavaScript is a hold, not a finding", () => {
    const result = inspect(ratingPage(), {
      renderedBody: ratingPage(
        data({
          ...product,
          aggregateRating: { ratingValue: 4.9, reviewCount: 123 },
        }),
      ),
      renderedReviewText: "123 reviews",
    });
    expect(result.status).toBe("hold");
    expect(result.gap).toBe("");
  });

  test("a different product's widget cannot supply the review count", () => {
    const body = ratingPage().replace(
      'data-product-id="42"',
      'data-product-id="91"',
    );
    expect(
      inspect(body, { renderedBody: body, renderedReviewText: "123 reviews" })
        .gap,
    ).toBe("");
  });

  test("reviews outrank a no-barcode candidate", () => {
    const body = ratingPage().replace(',"gtin13":"4006381333931"', "");
    expect(inspect(body).gap).toBe("rating-missing-from-page-data");
  });

  test("excluded product types never become no-barcode findings", () => {
    for (const name of [
      "Gift Card",
      "Custom-made candle",
      "Handmade cup",
      "Personalised pouch",
      "Bundle box",
      "Digital print",
      "Made to order desk",
      "Sample sachet",
    ])
      expect(inspect(page(data({ ...product, name }), "", name)).gap).toBe("");
  });

  test("no-barcode remains a review case even after the page is rendered", () => {
    const body = page();
    const result = inspect(body, { renderedBody: body });
    expect(result.gap).toBe("barcode-not-observed");
    expect(result.status).toBe("hold");
    expect(result.reason).toContain("complete product data");
  });

  test("no-product-data needs both raw and rendered checks", () => {
    const body = page("");
    expect(inspect(body)).toMatchObject({
      status: "hold",
      gap: "product-data-not-observed",
    });
    expect(inspect(body, { renderedBody: body })).toMatchObject({
      status: "verified",
      gap: "product-data-not-observed",
      findingReviewed: false,
    });
    expect(inspect(body, { renderedBody: page() })).toMatchObject({
      status: "hold",
      gap: "",
    });
  });

  test("rendered malformed data, microdata, and a changed product fail closed", () => {
    const body = barcodePage();
    for (const renderedBody of [
      page('<script type="application/ld+json">{bad</script>'),
      page(
        data(product),
        '<div itemscope itemtype="https://schema.org/Thing https://schema.org/Product/"></div>',
      ),
      page(data(product), "", "Different product"),
    ])
      expect(inspect(body, { renderedBody })).toMatchObject({
        status: "hold",
        gap: "",
      });
  });
});
