import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  CHECKOUT_MARKER,
  verifyCheckoutMarker,
} from "../../app/integration/shopify/checkout-marker";

const state = {
  owner: "owner",
  calls: [] as RequestInit[],
  receipts: [] as { reference: string }[],
  fail: false,
  malformedCatalog: false,
  sellingPlanId: "801" as string | null,
  responseMode: "success" as
    | "success"
    | "graphql-error"
    | "null-cart"
    | "user-error"
    | "invalid-json"
    | "unsafe-url",
};
Object.assign(process.env, { SHOPIFY_API_SECRET: "test-only-checkout-secret" });
mock.module("@/server/app/store", () => ({
  get: async () => ({
    success: true,
    data: {
      id: "store",
      userId: state.owner,
      platform: "shopify",
      status: "connected",
      domain: "https://example.myshopify.com",
    },
  }),
}));
mock.module("@/server/app/product", () => ({
  find: async () => ({
    success: true,
    data: [
      {
        id: "product",
        rawData: state.malformedCatalog
          ? "{bad-json"
          : JSON.stringify({ variants: [{ id: 15 }, { id: 19 }] }),
      },
    ],
  }),
}));
mock.module("@/server/database", () => ({
  schema: { product: { storeId: "storeId" } },
}));
mock.module("../../app/integration/recharge", () => ({
  listOffersForProducts: async () => [
    {
      planId: "plan",
      externalVariantId: "19",
      sellingPlanId: state.sellingPlanId,
    },
  ],
  createCheckoutIntent: async (intent: { reference: string }) => {
    state.receipts.push(intent);
    return intent;
  },
}));
mock.module("@/server/utils/http", () => ({
  request: async (_url: string, options: RequestInit) => {
    state.calls.push(options);
    return {
      success: true,
      data: new Response(null, { status: state.fail ? 500 : 200 }),
    };
  },
  parse: async () =>
    state.responseMode === "invalid-json"
      ? {
          success: false,
          error: new Error("Invalid JSON"),
        }
      : {
          success: true,
          data: {
            data: {
              cartCreate: {
                cart:
                  state.responseMode === "null-cart"
                    ? null
                    : {
                        id: "gid://shopify/Cart/cart",
                        checkoutUrl:
                          state.responseMode === "unsafe-url"
                            ? "http://example.myshopify.com/checkouts/test"
                            : "https://example.myshopify.com/checkouts/test",
                      },
                userErrors:
                  state.responseMode === "user-error"
                    ? [{ message: "This selling plan is unavailable" }]
                    : [],
              },
            },
            ...(state.responseMode === "graphql-error"
              ? { errors: [{ message: "Access denied" }] }
              : {}),
          },
        },
}));
const Checkout = await import("../../app/integration/shopify/checkout");
const input = { store: "store", variant: "19", plan: "plan", quantity: 2 };

beforeEach(() => {
  state.owner = "owner";
  state.calls.length = 0;
  state.receipts.length = 0;
  state.fail = false;
  state.malformedCatalog = false;
  state.sellingPlanId = "801";
  state.responseMode = "success";
});
describe("checkout initiation", () => {
  test("rejects malformed stored Shopify JSON without creating a cart", async () => {
    state.malformedCatalog = true;
    expect((await Checkout.create("owner", input)).success).toBe(false);
    expect(state.calls).toHaveLength(0);
  });
  test("denies other owners before creating carts or receipts", async () => {
    expect((await Checkout.create("attacker", input)).success).toBe(false);
    expect(state.calls).toHaveLength(0);
    expect(state.receipts).toHaveLength(0);
  });
  test("rejects unknown variants and mismatched plan variants", async () => {
    expect(
      (await Checkout.create("owner", { ...input, variant: "99" })).success,
    ).toBe(false);
    expect(
      (await Checkout.create("owner", { ...input, variant: "15" })).success,
    ).toBe(false);
    expect(state.calls).toHaveLength(0);
  });
  test("creates the selected subscription cart with a signed one-time receipt", async () => {
    const checkout = await Checkout.create("owner", input);
    expect(checkout.success).toBe(true);
    expect(state.receipts).toHaveLength(1);
    const payload = JSON.parse(String(state.calls[0]?.body));
    expect(payload.variables.input.lines).toEqual([
      {
        merchandiseId: "gid://shopify/ProductVariant/19",
        quantity: 2,
        sellingPlanId: "gid://shopify/SellingPlan/801",
      },
    ]);
    const attribute = payload.variables.input.attributes[0];
    expect(attribute.key).toBe(CHECKOUT_MARKER);
    expect(
      verifyCheckoutMarker({
        marker: attribute.value,
        store: "store",
        secret: "test-only-checkout-secret",
        at: new Date(),
      })?.reference,
    ).toBe(state.receipts[0]?.reference);
    if (checkout.success)
      expect(checkout.data.status).toBe("awaiting-buyer-payment");
  });
  test("supports one-time first orders without inventing a selling plan", async () => {
    expect(
      (
        await Checkout.create("owner", {
          store: "store",
          variant: "15",
          quantity: 1,
        })
      ).success,
    ).toBe(true);
    expect(
      JSON.parse(String(state.calls[0]?.body)).variables.input.lines[0]
        .sellingPlanId,
    ).toBeUndefined();
  });
  test("does not report checkout creation when Shopify fails", async () => {
    state.fail = true;
    expect((await Checkout.create("owner", input)).success).toBe(false);
  });
  test.each([
    "graphql-error",
    "null-cart",
    "user-error",
    "invalid-json",
    "unsafe-url",
  ] as const)(
    "rejects a Shopify %s response instead of reporting a checkout",
    async (responseMode) => {
      state.responseMode = responseMode;
      expect((await Checkout.create("owner", input)).success).toBe(false);
    },
  );
  test.each(["not-a-plan", "gid://shopify/ProductVariant/801", null])(
    "rejects an invalid cached Shopify selling plan %s before any external call",
    async (sellingPlanId) => {
      state.sellingPlanId = sellingPlanId;
      expect((await Checkout.create("owner", input)).success).toBe(false);
      expect(state.calls).toHaveLength(0);
      expect(state.receipts).toHaveLength(0);
    },
  );
  test("validates transport quantities and rejects arbitrary payload fields", () => {
    expect(
      Checkout.checkoutInput.safeParse({ ...input, quantity: 0 }).success,
    ).toBe(false);
    expect(
      Checkout.checkoutInput.safeParse({
        ...input,
        buyer: { email: "not-collected" },
      }).success,
    ).toBe(false);
  });
});
