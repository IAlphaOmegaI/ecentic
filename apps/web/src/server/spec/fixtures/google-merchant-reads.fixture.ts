import { beforeEach, expect, mock, test } from "bun:test";
import { tables as schema } from "../../database/schema";
import { Environment } from "../../utils/environment";
import { DatabaseError } from "../../utils/error";
import type * as GoogleMerchant from "../../utils/google-merchant";

mock.module("server-only", () => ({}));
const success = <Data>(data: Data) => ({ success: true as const, data });
const state = {
  failure: null as Error | null,
  optimizationFailure: null as Error | null,
  currency: "EUR" as string | null,
  empty: false,
  owner: "owner",
  policies: [] as GoogleMerchant.OnlineReturnPolicy[],
};
const context = {
  session: { user: { id: "owner" } },
  span: { addBreadcrumb: () => undefined },
};
const wrap =
  (callback: (context: unknown, input: unknown) => unknown) =>
  (_: unknown, input: unknown) =>
    callback(context, input);
mock.module("../../utils/authentication", () => ({ withAuthentication: wrap }));
mock.module("../../utils/context", () => ({ withContext: wrap }));
// No database client is constructed. Every provider operation below is a mock.
mock.module("../../database", () => ({ schema, db: {} }));
mock.module("../../app/store", () => ({
  get: async () => success({ id: "store", userId: state.owner }),
}));
const products = mock(async () =>
  state.failure
    ? { success: false as const, error: state.failure }
    : success(
        state.empty
          ? []
          : [
              {
                id: "product",
                externalId: "external",
                currency: state.currency,
              },
            ],
      ),
);
mock.module("../../app/product", () => ({ find: products }));
mock.module("../../app/google-merchant-account", () => ({
  find: async () =>
    success([
      {
        id: "account",
        storeId: "store",
        accessToken: "fixture-token",
        accessTokenExpiresAt: new Date(Date.now() + 3600000),
        googleAccountId: "merchant",
        dataSourceName: "source",
      },
    ]),
}));
mock.module("../../app/google-merchant-offer", () => ({
  find: async () => success([{ productId: "product", status: "pending" }]),
}));
mock.module("../../app/google-merchant-ucp", () => ({
  find: async () => success([]),
}));
const optimizations = mock(async () =>
  state.optimizationFailure
    ? { success: false as const, error: state.optimizationFailure }
    : success([]),
);
mock.module("../../app/optimization", () => ({
  findPublishedForProducts: optimizations,
}));
const deletion = mock(async () => success(undefined));
const creation = mock(
  async (
    _token: string,
    _account: string,
    policy: GoogleMerchant.ReturnPolicyInput,
  ) => {
    const created = { ...policy, name: "created-policy" };
    state.policies = [created];
    return success(created);
  },
);
const offers = mock(async () => success([]));
mock.module("../../utils/google-merchant", () => ({
  PRODUCT_CATEGORIES: [],
  listReturnPolicies: async () =>
    success({ onlineReturnPolicies: state.policies }),
  deleteReturnPolicy: deletion,
  createReturnPolicy: creation,
  listProducts: offers,
}));
const Merchant = await import("../../app/integration/google-merchant");
const policy = {
  store: "store",
  countries: ["DE"],
  policyUrl: "https://merchant.test/returns",
  windowDays: 30,
  returnMethods: ["BY_MAIL" as const],
  itemConditions: ["NEW" as const],
  customerPaysShipping: false,
  processRefundDays: 7,
  replace: true,
};

beforeEach(() => {
  Object.assign(state, {
    failure: null,
    optimizationFailure: null,
    currency: "EUR",
    empty: false,
    owner: "owner",
    policies: [{ name: "previous-policy", countries: ["DE"] }],
  });
  for (const operation of [products, optimizations, deletion, creation, offers])
    operation.mockClear();
});

test("preserves the existing policy when its catalog currency cannot be read", async () => {
  state.failure = new DatabaseError("catalog unavailable");
  const result = await Merchant.setReturnPolicy(Environment.SERVER, policy);
  expect(result).toEqual({ success: false, error: state.failure });
  expect(deletion).not.toHaveBeenCalled();
  expect(creation).not.toHaveBeenCalled();
  expect(state.policies[0]?.name).toBe("previous-policy");
});

test.each([
  ["EUR", false, "EUR"],
  [null, false, "USD"],
  [null, true, "USD"],
] as const)(
  "uses currency %s with an empty catalog of %s",
  async (currency, empty, expected) => {
    Object.assign(state, { currency, empty });
    const result = await Merchant.setReturnPolicy(Environment.SERVER, policy);
    expect(result.success).toBe(true);
    expect(creation).toHaveBeenCalledTimes(1);
    expect(creation.mock.calls[0]?.[2].returnShippingFee).toEqual({
      type: "FIXED",
      fixedFee: { amountMicros: "0", currencyCode: expected },
    });
    expect(deletion).toHaveBeenCalledTimes(1);
  },
);

test("rejects a foreign store before catalog reads or policy writes", async () => {
  state.owner = "someone-else";
  const result = await Merchant.setReturnPolicy(Environment.SERVER, policy);
  expect(result.success).toBe(false);
  expect(products).not.toHaveBeenCalled();
  expect(deletion).not.toHaveBeenCalled();
  expect(creation).not.toHaveBeenCalled();
});

test.each(["pushOverrides", "verifyOverrides"] as const)(
  "propagates an optimization read failure from %s before provider work",
  async (action) => {
    state.optimizationFailure = new DatabaseError("optimizations unavailable");
    const result =
      action === "pushOverrides"
        ? await Merchant.pushOverrides(Environment.SERVER, { store: "store" })
        : await Merchant.verifyOverrides(Environment.SERVER, {
            store: "store",
          });
    expect(result).toEqual({
      success: false,
      error: state.optimizationFailure,
    });
    expect(optimizations).toHaveBeenCalledWith(Environment.SERVER, {
      products: ["product"],
    });
    expect(offers).not.toHaveBeenCalled();
  },
);
