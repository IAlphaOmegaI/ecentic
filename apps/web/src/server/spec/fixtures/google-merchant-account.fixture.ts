import { beforeEach, expect, mock, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { tables as schema } from "../../database/schema";
import { Environment } from "../../utils/environment";
import { DatabaseError } from "../../utils/error";

mock.module("server-only", () => ({}));
const state = {
  owner: "owner",
  storeFailure: null as DatabaseError | null,
  accountFailure: null as DatabaseError | null,
};
const stored = {
  id: "account",
  storeId: "store",
  accessToken: "private-access",
  refreshToken: "private-refresh",
};
const find = mock(
  async (_: unknown, _options: { where: SQL; limit: number }) =>
    state.accountFailure
      ? { success: false, error: state.accountFailure }
      : { success: true, data: [stored] },
);
mock.module("../../database", () => ({ schema }));
mock.module("../../utils/repository", () => ({
  repository: () => ({ find }),
}));
mock.module("../../utils/authentication", () => ({
  withAuthentication:
    (callback: (context: unknown, input: unknown) => unknown) =>
    (_: unknown, input: unknown) =>
      callback({ session: { user: { id: "owner" } } }, input),
}));
mock.module("../../app/store", () => ({
  get: async () =>
    state.storeFailure
      ? { success: false, error: state.storeFailure }
      : { success: true, data: { id: "store", userId: state.owner } },
}));
const Account = await import("../../app/google-merchant-account");
beforeEach(() => {
  Object.assign(state, {
    owner: "owner",
    storeFailure: null,
    accountFailure: null,
  });
  find.mockClear();
});

test("reads only the owned store account and strips both OAuth tokens", async () => {
  const result = await Account.getForStore(Environment.SERVER, {
    store: "store",
  });
  expect(result).toMatchObject({
    success: true,
    data: { ...stored, accessToken: null, refreshToken: null },
  });
  const options = find.mock.calls[0]?.[1];
  expect(options?.limit).toBe(1);
  expect(options && new PgDialect().sqlToQuery(options.where)).toMatchObject({
    params: ["store"],
  });
  expect(stored.accessToken).toBe("private-access");
});

test("does not read the account when the store belongs to another user", async () => {
  state.owner = "other";
  const result = await Account.getForStore(Environment.SERVER, {
    store: "store",
  });
  expect(result.success).toBe(false);
  expect(find).not.toHaveBeenCalled();
});

test.each(["storeFailure", "accountFailure"] as const)(
  "propagates %s",
  async (failure) => {
    state[failure] = new DatabaseError("read unavailable");
    const result = await Account.getForStore(Environment.SERVER, {
      store: "store",
    });
    expect(result).toEqual({ success: false, error: state[failure] });
  },
);
