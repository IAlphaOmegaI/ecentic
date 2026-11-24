import { describe, expect, test } from "bun:test";
import { exchangeCode, installUrl, refreshToken } from "./oauth";

describe("Recharge OAuth", () => {
  test("exchanges form-encoded codes without inventing expiry or adding a secret", async () => {
    const calls: RequestInit[] = [];
    const tokens = await exchangeCode({
      code: "one+time/code",
      clientId: "partner-app",
      redirectUri: "https://ecentic.ai/callback",
      fetch: async (url, options) => {
        expect(String(url)).toBe(
          "https://www.admin.rechargeapps.com/oauth/token",
        );
        calls.push(options ?? {});
        return Response.json({
          access_token: "access",
          refresh_token: "refresh",
          scope: "read_orders read_plans read_orders",
        });
      },
    });
    const parameters = new URLSearchParams(String(calls[0]?.body));
    expect(parameters.get("code")).toBe("one+time/code");
    expect(parameters.get("grant_type")).toBe("authorization_code");
    expect(parameters.get("redirect_uri")).toBe("https://ecentic.ai/callback");
    expect(parameters.has("client_secret")).toBe(false);
    expect(calls[0]?.redirect).toBe("error");
    expect(tokens).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      scopes: ["read_orders", "read_plans"],
      expiresAt: null,
    });
  });

  test("refreshes and respects an explicit provider expiry", async () => {
    const tokens = await refreshToken({
      clientId: "app",
      refreshToken: "old",
      now: 0,
      fetch: async (_url, options) => {
        const body = new URLSearchParams(String(options?.body));
        expect(body.get("grant_type")).toBe("refresh_token");
        expect(body.get("refresh_token")).toBe("old");
        return Response.json({
          access_token: "new",
          refresh_token: "rotated",
          expires_in: 3600,
        });
      },
    });
    expect(tokens.refreshToken).toBe("rotated");
    expect(tokens.expiresAt).toBe("1970-01-01T01:00:00.000Z");
  });

  test("does not leak provider credentials or responses on a failed exchange", async () => {
    await expect(
      exchangeCode({
        code: "sensitive-code",
        clientId: "app",
        redirectUri: "https://ecentic.ai/callback",
        fetch: async () =>
          Response.json({ error: "sensitive-code" }, { status: 400 }),
      }),
    ).rejects.toThrow("Recharge authorization failed. Reconnect the store.");
  });

  test("builds a Shopify-prefix install URL and rejects injected domains", () => {
    expect(installUrl("app", "ecentic.myshopify.com")).toBe(
      "https://admin.rechargeapps.com/partners/app/app/install?myshopify_domain=ecentic",
    );
    expect(() =>
      installUrl("app", "ecentic.myshopify.com.evil.test"),
    ).toThrow();
  });
});
