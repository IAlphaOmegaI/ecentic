import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { tables as schema } from "../../database/schema";

const stores = {
  first: {
    id: "first",
    userId: "merchant",
    name: "First Shopify store",
    domain: "first.example",
    platform: "shopify",
  },
  second: {
    id: "second",
    userId: "merchant",
    name: "Second Shopify store",
    domain: "second.example",
    platform: "shopify",
  },
  woo: {
    id: "woo",
    userId: "merchant",
    name: "WooCommerce store",
    domain: "woo.example",
    platform: "woocommerce",
  },
};
const state = { queries: [] as unknown[][], lists: 0 };
const dialect = new PgDialect();

mock.module("../../database", () => ({ schema }));
mock.module("../../app/store", () => ({
  resolveForUser: async (
    _environment: unknown,
    { store }: { store: string },
  ) => ({
    success: true,
    data: Reflect.get(stores, store),
  }),
  getForCurrentUser: async () => {
    state.lists += 1;
    return { success: true, data: Object.values(stores) };
  },
}));
mock.module("../../app/product", () => ({
  find: async (_environment: unknown, { where }: { where: SQL }) => {
    const parameters = dialect.sqlToQuery(where).params;
    state.queries.push(parameters);
    return { success: true, data: [{ id: "product", storeId: parameters[0] }] };
  },
}));
mock.module("../../app/intelligence/ucp/profile", () => ({
  getProfile: async () => ({ success: true, data: null }),
}));
mock.module("../../utils/entitlement", () => ({
  isSubscriptionRequired: () => false,
}));
mock.module(
  "../../../app/[locale]/(main)/dashboard/[store]/channels/_components/summary",
  () => ({
    ChannelLoadError: () => null,
  }),
);
mock.module(
  "../../../app/[locale]/(main)/dashboard/[store]/ucp/_components/shell",
  () => ({
    UcpShell: () => null,
    UcpSectionSkeleton: () => null,
  }),
);
mock.module(
  "../../../app/[locale]/(main)/dashboard/[store]/ucp/_components/ucp-manager",
  () => ({
    UcpManager: () => null,
  }),
);

const { default: Page } = await import(
  "../../../app/[locale]/(main)/dashboard/[store]/ucp/page"
);

beforeEach(() => {
  state.queries = [];
  state.lists = 0;
});

describe("UCP workspace", () => {
  test("a sibling Shopify store cannot become the publish target", async () => {
    const shell = Page({
      params: Promise.resolve({ locale: "en", store: "second" }),
      searchParams: Promise.resolve({}),
    });
    const content = shell.props.children.props.children;
    const manager = await content.type(content.props);
    expect(manager.props).toEqual({
      store: stores.second,
      products: [{ id: "product", storeId: "second" }],
      profile: null,
    });
    expect(state.queries).toEqual([["second", "merchant"]]);
    expect(state.lists).toBe(0);
  });

  test("a WooCommerce workspace never receives another store's Shopify target", async () => {
    const shell = Page({
      params: Promise.resolve({ locale: "es", store: "woo" }),
      searchParams: Promise.resolve({}),
    });
    const content = shell.props.children.props.children;
    const manager = await content.type(content.props);
    expect(manager.props).toEqual({
      store: stores.woo,
      products: [{ id: "product", storeId: "woo" }],
      profile: null,
    });
    expect(state.queries).toEqual([["woo", "merchant"]]);
    expect(state.lists).toBe(0);
  });
});
