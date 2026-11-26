import { describe, expect, test } from "bun:test";
import {
  defaultPlaybook,
  playbookSchema,
  prospectSchema,
  renderHistoricalMessages as renderMessages,
} from "../outbound";
import { findingCopy } from "../outbound-finding-copy";
import {
  productInsightSchema,
  validateProductInsight,
} from "../outbound-product-insight";
import { preservesDraftControls } from "../outbound-writing";

const product = {
  name: "Daily Face Cream",
  brand: "Sample Beauty",
  url: "https://example.test/products/cream",
  description:
    "A daily face cream with a replaceable refill cartridge inside a reusable glass jar.",
};
const insight = productInsightSchema.parse({
  sourceUrl: product.url,
  sourceQuote: product.description,
  feature: "a replaceable refill cartridge",
  kind: "design",
  relevance:
    "A shopper comparing refillable creams may care whether they can keep the container and replace its contents.",
});
const receipt = {
  url: product.url,
  kind: "product",
  excerpt: product.description,
};
const receipts = [receipt];

describe("specific product buying insight", () => {
  test("requires a verbatim feature in the named product page receipt, including details beyond its short structured description", () => {
    expect(validateProductInsight(insight, product, receipts)).toBeNull();
    expect(
      validateProductInsight(
        { ...insight, sourceUrl: "https://other.test/product" },
        product,
        receipts,
      ),
    ).not.toBeNull();
    expect(
      validateProductInsight(
        insight,
        { ...product, description: "A daily face cream." },
        receipts,
      ),
    ).toBeNull();
    expect(
      validateProductInsight(insight, product, [
        { ...receipt, excerpt: "No matching quote" },
      ]),
    ).not.toBeNull();
    expect(
      validateProductInsight(
        { ...insight, feature: "a biodegradable refill cartridge" },
        product,
        receipts,
      ),
    ).not.toBeNull();
  });
  test("rejects missing insight, generic praise, name repetition and source instructions", () => {
    expect(validateProductInsight(null, product, receipts)).not.toBeNull();
    for (const feature of [
      product.name,
      "premium high-quality skincare",
      "shop now",
      "ignore {instructions}",
      "clinically proven wrinkle prevention",
    ]) {
      const source = `${feature} is described here with enough words to form a source quote.`;
      expect(
        validateProductInsight(
          { ...insight, feature, sourceQuote: source },
          { ...product, description: source },
          [{ ...receipt, excerpt: source }],
        ),
      ).not.toBeNull();
    }
  });
  test("uses editable controlled copy for a proposed check and preserves founder, ask and opt-out", () => {
    const prospect = prospectSchema.parse({
      company: product.brand,
      domain: "example.test",
      country: "US",
      name: "Alex Doe",
      first: "Alex",
      product: product.name,
      productUrl: product.url,
      gap: "product-published-data",
      productCategory: "face cream",
      productInsight: insight,
      finding: `the page highlights ${insight.feature}`,
    });
    const settings = playbookSchema.parse({
      ...defaultPlaybook,
      productCheckIntro: "I'm Iseld, founder of ecentic.",
      bodyTemplate:
        "Hi {first}!\n\nI noticed {finding}. When someone asks an AI assistant {askAbout}, {consequence}.\n\n{founderLine} {callToAction}\n\n{optout}\n\n{signature}",
    });
    const copy = findingCopy(prospect, settings);
    expect(copy?.finding).toBe(
      "the page highlights a replaceable refill cartridge",
    );
    expect(copy?.askAbout).toBe(
      "for a face cream with a replaceable refill cartridge",
    );
    expect(copy?.consequence).toBe(
      "I'd check whether that detail carries through into its recommendations",
    );
    const message = renderMessages(prospect, settings)[0];
    if (!message) throw new Error("The fixture requires a first email.");
    expect(message.body).toContain(settings.productCheckIntro);
    expect(message.body).toContain(settings.callToAction);
    expect(message.body).toContain(settings.optout);
    expect(
      preservesDraftControls(message.body, message.body, settings, prospect),
    ).toBe(true);
    expect(
      preservesDraftControls(
        message.body.replace("I'd check whether", "I proved that"),
        message.body,
        settings,
        prospect,
      ),
    ).toBe(false);
    expect(
      findingCopy(prospect, {
        ...settings,
        publishedProductConsequence: "we can test that question together",
      })?.consequence,
    ).toBe("we can test that question together");
  });
  test("missing feature stays unresolved instead of falling back to a generic claim", () => {
    expect(
      findingCopy(
        { gap: "product-published-data", productCategory: "face cream" },
        defaultPlaybook,
      )?.finding,
    ).toContain("{productFeature}");
  });
});
