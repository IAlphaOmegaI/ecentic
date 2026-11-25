import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Result } from "@zenncore/utils";
import { locales } from "@/i18n/locales";
import * as Profile from "@/lib/profile";
import { DatabaseError } from "../../utils/error";

const state = {
  updates: [] as { user: string; fields: Record<string, unknown> }[],
  refreshes: 0,
  failure: null as DatabaseError | null,
};
const context = {
  session: { user: { id: "merchant" } },
  auth: {
    getSession: async () => {
      state.refreshes += 1;
      return context.session;
    },
  },
};
const update = async (
  _environment: unknown,
  user: string,
  fields: Record<string, unknown>,
): Promise<Result<Record<string, unknown>>> => {
  if (state.failure) return { success: false, error: state.failure };
  state.updates.push({ user, fields });
  return { success: true, data: { id: user, role: "user", ...fields } };
};

mock.module("server-only", () => ({}));
mock.module("../../database", () => ({ schema: { user: {} } }));
mock.module("../../utils/repository", () => ({
  repository: () => ({ update }),
}));
mock.module("../../utils/authentication", () => ({
  withAuthentication:
    (action: (authentication: typeof context, data: unknown) => unknown) =>
    (data: unknown) =>
      action(context, data),
}));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));

const User = await import("../../app/user");

beforeEach(() => {
  state.updates = [];
  state.refreshes = 0;
  state.failure = null;
});

const invoke = (action: typeof User.updateProfile, payload: unknown) =>
  Reflect.apply(action, undefined, [payload]);

describe("profile actions", () => {
  test("saves a stable job title without overwriting authorization roles", async () => {
    const payload = {
      name: "  Yuri  ",
      surname: "  Smith  ",
      email: "yuri@example.com",
      jobTitle: "Marketing Lead",
    };
    expect(await invoke(User.updateProfile, payload)).toEqual({
      success: true,
      data: {
        id: "merchant",
        role: "user",
        name: "Yuri",
        surname: "Smith",
        email: "yuri@example.com",
        jobTitle: "Marketing Lead",
      },
    });
    expect(state.updates).toEqual([
      {
        user: "merchant",
        fields: {
          name: "Yuri",
          surname: "Smith",
          email: "yuri@example.com",
          jobTitle: "Marketing Lead",
        },
      },
    ]);
  });

  test("rejects privilege, identity and verification fields at runtime", async () => {
    for (const fields of [
      { role: "staff" },
      { id: "another-account" },
      { emailVerified: true },
      { createdAt: new Date() },
    ]) {
      const result = await invoke(User.updateProfile, {
        name: "Merchant",
        ...fields,
      });
      expect(result).toMatchObject({
        success: false,
        error: { name: "validation-error" },
      });
    }
    expect(state.updates).toEqual([]);
  });

  test("refuses empty, malformed and localized-value profile patches", async () => {
    for (const payload of [
      {},
      { name: "   " },
      { email: "not-an-email" },
      { jobTitle: "Responsable de marketing" },
      { jobTitle: "staff" },
    ])
      expect(await invoke(User.updateProfile, payload)).toMatchObject({
        success: false,
        error: { name: "validation-error" },
      });
    expect(state.updates).toEqual([]);
  });

  test("completion validates and persists only company, job title and source", async () => {
    const complete = (payload: unknown) =>
      Reflect.apply(User.completeProfile, undefined, [payload]);
    expect(
      await complete({
        company: "  Acme Store  ",
        jobTitle: "Founder / CEO",
        source: "Friend / Colleague",
      }),
    ).toEqual({
      success: true,
      data: {
        id: "merchant",
        role: "user",
        company: "Acme Store",
        jobTitle: "Founder / CEO",
        source: "Friend / Colleague",
      },
    });
    expect(state.refreshes).toBe(1);
    expect(
      await complete({ company: "Acme", jobTitle: "Developer", role: "staff" }),
    ).toMatchObject({ success: false, error: { name: "validation-error" } });
    expect(state.updates).toHaveLength(1);
    expect(state.refreshes).toBe(1);
  });

  test("passes through repository failures without refreshing the session", async () => {
    state.failure = new DatabaseError("unavailable");
    const result = await User.completeProfile({
      company: "Acme",
      jobTitle: "Developer",
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected profile update to fail");
    expect(result.error).toBe(state.failure);
    expect(state.refreshes).toBe(0);
  });

  test("job-title validation uses the same persisted values in every locale", async () => {
    for (const locale of locales) {
      const catalog = await Bun.file(
        new URL(`../../../../messages/${locale}.json`, import.meta.url),
      ).json();
      expect(Object.keys(catalog.signUp.roles)).toEqual([
        ...Profile.profileSchema.shape.jobTitle.values,
      ]);
    }
  });
});
