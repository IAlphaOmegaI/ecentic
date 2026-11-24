import { beforeEach, describe, expect, mock, test } from "bun:test";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AuthFeedback,
  useAuthFeedback,
} from "@/app/[locale]/(auth)/_components/auth-feedback";
import { authCallbackErrorKey } from "@/lib/auth-errors";
import messages from "../../../../messages/en.json";

type Body = {
  provider: string;
  callbackURL: string;
  errorCallbackURL: string;
  newUserCallbackURL: string;
};
const state = {
  requests: [] as Body[],
  domain: "merchant.myshopify.com" as string | null,
};
const context = {
  auth: {
    signInSocial: async ({ body }: { body: Body }) => {
      state.requests.push(body);
      return { url: "https://provider.example/authorize" };
    },
  },
};
const wrapper =
  (action: (authentication: typeof context, payload: unknown) => unknown) =>
  (payload: unknown) =>
    action(context, payload);

mock.module("server-only", () => ({}));
mock.module("../../database", () => ({ schema: { user: {} } }));
mock.module("../../utils/context", () => ({ withContext: wrapper }));
mock.module("../../utils/authentication", () => ({
  withAuthentication: wrapper,
}));
mock.module("../../app/user", () => ({
  find: () => {
    throw new Error("Unexpected database access");
  },
}));
mock.module("../../app/integration/shopify/domain", () => ({
  resolveAdminHost: async () => state.domain,
}));
mock.module("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ set: () => {}, delete: () => {} }),
}));
mock.module("resend", () => ({
  Resend: class {
    emails = {
      send: () => {
        throw new Error("Unexpected email dispatch");
      },
    };
  },
}));

const Authentication = await import("../../app/authentication");

beforeEach(() => {
  state.requests = [];
  state.domain = "merchant.myshopify.com";
});

const callback = (body: Body | undefined) => {
  expect(body).toBeDefined();
  return new URL(body?.errorCallbackURL ?? "", "https://app.example");
};

describe("OAuth callback destinations", () => {
  test("Google keeps existing and new-user success flows and a localized retry destination", async () => {
    const destination = "/es/dashboard/store?tab=two&view=all";
    expect(
      await Authentication.signInWithGoogle({
        locale: "es",
        callbackURL: destination,
      }),
    ).toEqual({
      success: true,
      data: { url: "https://provider.example/authorize" },
    });
    expect(state.requests[0]).toMatchObject({
      provider: "google",
      callbackURL: destination,
      newUserCallbackURL: "/es/complete-profile",
    });
    expect(callback(state.requests[0]).pathname).toBe("/es/sign-in");
    expect(callback(state.requests[0]).searchParams.get("redirect")).toBe(
      destination,
    );
  });

  test("Shopify keeps the installation flow and uses the caller's locale on failure", async () => {
    await Authentication.signInWithShopify({
      locale: "fr",
      shop: "merchant.example",
      callbackURL: "/fr/dashboard",
    });
    expect(state.requests[0]).toMatchObject({
      provider: "shopify",
      callbackURL: "/fr/dashboard",
      newUserCallbackURL:
        "/api/integrations/shopify/install?shop=merchant.myshopify.com",
    });
    expect(callback(state.requests[0]).pathname).toBe("/fr/sign-in");
    expect(callback(state.requests[0]).searchParams.get("redirect")).toBe(
      "/fr/dashboard",
    );
  });

  test("direct action calls cannot inject an external destination or unsupported locale", async () => {
    for (const action of [
      Authentication.signInWithGoogle,
      Authentication.signInWithShopify,
    ]) {
      await Reflect.apply(action, undefined, [
        {
          shop: "merchant.example",
          callbackURL: "//attacker.example/path?error=private",
          locale: "//attacker.example",
        },
      ]);
    }
    for (const body of state.requests) {
      expect(body.callbackURL).toBe("/dashboard");
      expect(callback(body).origin).toBe("https://app.example");
      expect(callback(body).pathname).toBe("/sign-in");
      expect(callback(body).searchParams.get("redirect")).toBe("/dashboard");
    }
  });

  test("an unresolved Shopify host does not start an OAuth flow", async () => {
    state.domain = null;
    expect(
      await Authentication.signInWithShopify({
        shop: "missing.example",
        callbackURL: "/dashboard",
      }),
    ).toMatchObject({
      success: false,
      error: { name: "validation-error" },
    });
    expect(state.requests).toHaveLength(0);
  });

  test("callback guidance is visible on the first render and hides provider details", () => {
    const Feedback = () => {
      const feedback = useAuthFeedback(
        authCallbackErrorKey("internal_server_error"),
      );
      return <AuthFeedback error={feedback.error} />;
    };
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Feedback />
      </NextIntlClientProvider>,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain(messages.authUX.errors.unavailable);
    expect(html).not.toContain("internal_server_error");
  });
});
