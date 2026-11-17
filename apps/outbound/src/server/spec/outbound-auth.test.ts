import { beforeEach, describe, expect, mock, test } from "bun:test";
import { UserRole } from "@/server/database/validators";
import { Environment } from "@/server/utils/environment";

const state = {
  authenticated: false,
  role: null as string | null,
  sessionReads: 0,
  actionCalls: 0,
};

mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
mock.module("next/server", () => ({ connection: async () => undefined }));
mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async ({
        query,
      }: {
        query: { disableCookieCache: boolean };
      }) => {
        expect(query.disableCookieCache).toBe(true);
        state.sessionReads += 1;
        if (!state.authenticated) return null;
        return {
          user: {
            id: "staff-fixture",
            email: "staff@example.com",
            role: state.role,
          },
          session: { id: "session-fixture", userId: "staff-fixture" },
        };
      },
    },
  },
}));

const { withAuthorization } = await import("@/server/utils/authorization");
const { withInstrumentation } = await import("@/server/utils/context");
const { getCurrentUser } = await import("@/server/app/authentication");
const change = withAuthorization(
  [UserRole.STAFF],
  async (context, value: string) => {
    state.actionCalls += 1;
    return {
      success: true as const,
      data: { actor: context.session.user.id, value },
    };
  },
  "Fixture.change",
);

beforeEach(() => {
  Object.assign(state, {
    authenticated: false,
    role: null,
    sessionReads: 0,
    actionCalls: 0,
  });
});

describe("standalone Outbound authorization", () => {
  test("the server environment argument never bypasses session validation", async () => {
    const result = await change(Environment.SERVER, "draft");
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected unauthenticated failure");
    expect(result.error.name).toBe("unauthenticated-error");
    expect(state.actionCalls).toBe(0);
  });

  test.each(["owner", "administrator", "user", "guest", "unknown", null])(
    "an authenticated %s role cannot invoke staff actions",
    async (role) => {
      Object.assign(state, { authenticated: true, role });
      const result = await change("draft");
      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected authorization failure");
      expect(result.error.name).toBe("unauthorized-error");
      expect(result.error).not.toHaveProperty("stack");
      expect(state.actionCalls).toBe(0);
    },
  );

  test("staff actions keep their argument and authenticated actor", async () => {
    Object.assign(state, { authenticated: true, role: "staff" });
    expect(await change(Environment.SERVER, "draft")).toEqual({
      success: true,
      data: { actor: "staff-fixture", value: "draft" },
    });
    expect(state.actionCalls).toBe(1);
  });

  test("a revoked staff role is denied while the UI can identify the signed-in account", async () => {
    Object.assign(state, { authenticated: true, role: "staff" });
    expect((await change("first")).success).toBe(true);
    state.role = "user";
    expect((await change("second")).success).toBe(false);
    const account = await getCurrentUser(Environment.SERVER);
    expect(account.success).toBe(true);
    if (!account.success) throw account.error;
    expect(account.data.role).toBe("user");
    expect(state.actionCalls).toBe(1);
    expect(state.sessionReads).toBe(3);
  });

  test("internal repository wrappers remain free of authentication and headers", async () => {
    const read = withInstrumentation(async () => ({
      success: true as const,
      data: 7,
    }));
    expect(await read(Environment.SERVER)).toEqual({ success: true, data: 7 });
    expect(state.sessionReads).toBe(0);
  });
});
