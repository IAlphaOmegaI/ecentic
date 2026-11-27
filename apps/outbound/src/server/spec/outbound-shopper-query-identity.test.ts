import { expect, mock, test } from "bun:test";
import { buildSyntheticShoppingCapture } from "./helpers/outbound-shopping-fixture";

mock.module("server-only", () => ({}));
const Shopping = await import("@/server/utils/outbound/live-shopping");

const context = async (
  name = "Acme Goods",
  pageText = "Acme Goods makes large linen bags.",
) => {
  const capture = await buildSyntheticShoppingCapture({
    prospect: {
      company: name,
      domain: "acme-store.test",
      product: "Marlow Tote",
      productUrl: "https://acme-store.test/products/tote",
    },
    pageText,
  });
  return {
    product: capture.evidence.answer.job.query.product,
    merchant: { name, domain: "acme-store.test", aliases: [] as string[] },
    category: "linen bags",
    country: "US",
    browser: capture.evidence.browser,
    deadline: Date.now() + 45000,
  };
};
const generated = async (
  input: Awaited<ReturnType<typeof context>>,
  question: string,
  attribute: string,
) => {
  const generate = mock(async ({ prompt }: { prompt: string }) => ({
    question,
    category: "bag",
    attribute,
    excerptIds: [JSON.parse(prompt).excerpts[0].id],
  }));
  const result = await Shopping.generateLegacyShopperQuery(input, { generate });
  if (!result.success) throw result.error;
  return { result: result.data, generate };
};

test("a distinctive merchant fragment cannot become a grounded query attribute", async () => {
  const { result, generate } = await generated(
    await context(),
    "acme linen bags",
    "acme",
  );
  expect(result.status).toBe("held");
  if (result.status === "held") expect(result.reason).toContain("brand");
  expect(generate).toHaveBeenCalledTimes(2);
});

test("distinctive alias and domain fragments remain forbidden even when rendered", async () => {
  const input = await context(
    "Sample Goods",
    "Sample Goods by Aurora Outfitters makes large linen bags at acme store.",
  );
  input.merchant.aliases = ["Aurora Outfitters"];
  for (const token of ["aurora", "acme"]) {
    const { result, generate } = await generated(
      input,
      `${token} linen bags`,
      token,
    );
    expect(result.status).toBe("held");
    expect(generate).toHaveBeenCalledTimes(2);
  }
});

test("a generic category shared with the merchant remains usable with independent page support", async () => {
  const input = await context(
    "Linen Works",
    "Linen Works makes large linen bags.",
  );
  const { result, generate } = await generated(
    input,
    "large linen bags",
    "large",
  );
  expect(result.status).toBe("prepared");
  expect(generate).toHaveBeenCalledTimes(1);
});

test("an ordinary attribute appearing only inside an alias is not product evidence", async () => {
  const input = await context(
    "Acme Goods",
    "Acme Goods makes linen bags. Large Life is our storefront name.",
  );
  input.merchant.aliases = ["Large Life"];
  const { result, generate } = await generated(
    input,
    "large linen bags",
    "large",
  );
  expect(result.status).toBe("held");
  if (result.status === "held")
    expect(result.reason).toContain("exact support");
  expect(generate).toHaveBeenCalledTimes(2);
});

test("a standalone navigation label beside campaign banners cannot ground an attribute", async () => {
  const input = await context(
    "Acme Goods",
    "Large linen bags.\n\n            Travel\n          \nBLACK FRIDAY IS HERE!\nSHOP NOW\nHSA/FSA NOW ACCEPTED\nLearn More",
  );
  const originalBrowser = structuredClone(input.browser);
  const originalExcerpts = Shopping.shopperQueryExcerpts(input);
  const { result, generate } = await generated(
    input,
    "travel linen bags",
    "travel",
  );
  expect(result.status).toBe("held");
  if (result.status === "held") {
    expect(result.reason).toContain("outside navigation");
  }
  expect(generate).toHaveBeenCalledTimes(2);
  expect(input.browser).toEqual(originalBrowser);
  expect(Shopping.shopperQueryExcerpts(input)).toEqual(originalExcerpts);
  expect(originalExcerpts?.[0]?.quote).toContain("Travel");
  const saved = Shopping.preparedQuerySchema.parse({
    product: input.product,
    merchant: input.merchant,
    category: input.category,
    country: input.country,
    surface: "google_ai_mode",
    intent: "unbranded-specific",
    prompt: "travel linen bags",
    basis: {
      category: "bag",
      attribute: "travel",
      excerpts: originalExcerpts,
      promptHash: "a".repeat(64),
    },
  });
  const originalSaved = structuredClone(saved);
  expect(Shopping.validateShopperQuery({ ...input, query: saved })).toContain(
    "outside navigation",
  );
  expect(saved).toEqual(originalSaved);
});

test("independent product support survives the same word in navigation", async () => {
  const input = await context(
    "Acme Goods",
    "Large linen bags.\nTravel\nCYBER MONDAY SALE\nSHOP NOW\nProduct details\nThese linen bags are made for travel.",
  );
  const { result, generate } = await generated(
    input,
    "travel linen bags",
    "travel",
  );
  expect(result.status).toBe("prepared");
  expect(generate).toHaveBeenCalledTimes(1);
});

test("product category and supported attribute can remain on separate lines", async () => {
  const input = await context(
    "Acme Goods",
    "Linen bags\nProduct details\nLarge\nTravel\nA roomy main compartment.",
  );
  const { result, generate } = await generated(
    input,
    "travel linen bags",
    "travel",
  );
  expect(result.status).toBe("prepared");
  expect(generate).toHaveBeenCalledTimes(1);
});

test("banner context is checked across exact excerpt boundaries", async () => {
  const titlePrefix = "Marlow Tote\nMarlow Tote\n";
  const productPrefix = "Large linen bags.\n";
  const navigation = "\nTravel\n";
  const input = await context(
    "Acme Goods",
    `${productPrefix}${"x".repeat(1600 - titlePrefix.length - productPrefix.length - navigation.length)}${navigation}BLACK FRIDAY IS HERE!\nSHOP NOW`,
  );
  const excerpts = Shopping.shopperQueryExcerpts(input);
  expect(excerpts?.[0]?.quote).toEndWith("Travel\n");
  expect(excerpts?.[1]?.quote).toStartWith("BLACK FRIDAY");
  const { result, generate } = await generated(
    input,
    "travel linen bags",
    "travel",
  );
  expect(result.status).toBe("held");
  if (result.status === "held")
    expect(result.reason).toContain("outside navigation");
  expect(generate).toHaveBeenCalledTimes(2);
});
