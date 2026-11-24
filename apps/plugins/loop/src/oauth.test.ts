import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  authorizationUrl,
  createOAuthState,
  createPkce,
  exchangeOAuthCode,
  refreshOAuthToken,
} from "./oauth";

const store = "merchant-a";
const credentials = {
  enabled: true,
  clientId: "client",
  clientSecret: "secret",
  beforeRequest: async () => {},
  now: () => 1000,
};

test("builds a scoped organization-bound OAuth request with state and S256 behind the flag", () => {
  const { verifier, challenge } = createPkce(store);
  expect(challenge).toBe(
    createHash("sha256").update(verifier).digest("base64url"),
  );
  const state = createOAuthState(store);
  const options = {
    enabled: true,
    clientId: "client",
    redirectUri: "https://ecentic.example/api/loop/callback",
    organization: "org-1",
    state,
    challenge,
    scopes: ["developer_tools"],
  };
  const url = new URL(authorizationUrl(store, options));
  expect(url.origin).toBe("https://oauth.loopreturns.com");
  expect(url.searchParams.get("organization")).toBe("org-1");
  expect(url.searchParams.get("state")).toBe(state);
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(url.searchParams.get("scope")).toBe("developer_tools offline_access");
  expect(() => authorizationUrl(store, { ...options, enabled: false })).toThrow(
    "not enabled",
  );
  expect(() => authorizationUrl(store, { ...options, scopes: [] })).toThrow(
    "incomplete",
  );
  expect(() => createPkce("")).toThrow("merchant");
  expect(() => createOAuthState("")).toThrow("merchant");
});

test("exchanges codes server-side and retains refresh tokens when a refresh response omits rotation", async () => {
  const { verifier } = createPkce(store);
  const authorization = await exchangeOAuthCode(store, {
    ...credentials,
    code: "code",
    verifier,
    redirectUri: "https://ecentic.example/callback",
    fetch: async (input, options) => {
      expect(String(input)).toBe("https://oauth.loopreturns.com/oauth/token");
      expect(options?.redirect).toBe("error");
      const body = new URLSearchParams(String(options?.body));
      expect(body.get("client_secret")).toBe("secret");
      expect(body.get("code_verifier")).toBe(verifier);
      return Response.json({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 3600,
        scope: "developer_tools offline_access",
        private_field: "never retained",
      });
    },
  });
  expect(authorization.expiresAt).toBe(3_601_000);
  expect(authorization.refreshToken).toBe("refresh");
  expect(JSON.stringify(authorization)).not.toContain("private_field");
  const renewed = await refreshOAuthToken(store, {
    ...credentials,
    refreshToken: "refresh",
    fetch: async () => Response.json({ access_token: "new", expires_in: 3600 }),
  });
  expect(renewed.refreshToken).toBe("refresh");
});

test("does not expose upstream OAuth bodies or tokens in errors", async () => {
  await expect(
    refreshOAuthToken(store, {
      ...credentials,
      refreshToken: "private",
      fetch: async () =>
        Response.json({ error: "private customer/token" }, { status: 401 }),
    }),
  ).rejects.toThrow("Loop authorization failed");
  expect(() =>
    refreshOAuthToken("", { ...credentials, refreshToken: "private" }),
  ).toThrow("merchant");
});
