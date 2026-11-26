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
  const result = await Shopping.generateShopperQuery(input, { generate });
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
