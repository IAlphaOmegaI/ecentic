import { describe, expect, test } from "bun:test";
import { authCallbackErrorKey, authErrorKey } from "./auth-errors";

describe("actionable authentication errors", () => {
  test("callback failures use safe localized guidance without raw provider text", () => {
    expect(authCallbackErrorKey(null)).toBeNull();
    expect(authCallbackErrorKey("")).toBeNull();
    expect(authCallbackErrorKey("email_not_verified")).toBe("emailUnverified");
    expect(authCallbackErrorKey("too_many_requests")).toBe("rateLimited");
    for (const code of [
      "internal_server_error",
      "unable_to_create_user",
      "unable_to_create_session",
      "unable_to_link_account",
      "unable_to_update_account",
      "oauth_provider_not_found",
    ])
      expect(authCallbackErrorKey(code)).toBe("unavailable");

    for (const code of [
      "account_not_linked",
      "access_denied",
      "state_mismatch",
      "<script>private provider response</script>",
      "auth:invalidCredentials",
    ])
      expect(authCallbackErrorKey(code)).toBe("signIn");
  });

  test("recognizes stable provider codes without exposing their detail", () => {
    expect(
      authErrorKey({ body: { code: "INVALID_EMAIL_OR_PASSWORD" } }, "signIn"),
    ).toBe("invalidCredentials");
    expect(
      authErrorKey({ body: { code: "EMAIL_NOT_VERIFIED" } }, "signIn"),
    ).toBe("emailUnverified");
    expect(
      authErrorKey(
        { body: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" } },
        "signUp",
      ),
    ).toBe("emailAlreadyUsed");
    expect(authErrorKey({ body: { code: "INVALID_EMAIL" } }, "signUp")).toBe(
      "invalidEmail",
    );
    expect(
      authErrorKey({ body: { code: "PASSWORD_TOO_SHORT" } }, "signUp"),
    ).toBe("passwordTooShort");
    expect(
      authErrorKey(
        { statusCode: 429, message: "Internal provider log" },
        "signIn",
      ),
    ).toBe("rateLimited");
  });

  test("preserves classification through the serialized action boundary", () => {
    const original = {
      body: { code: "EMAIL_NOT_VERIFIED" },
      message: "Internal details",
    };
    const serialized = {
      name: "invalid-credentials",
      message: `auth:${authErrorKey(original, "signIn")}`,
    };
    expect(authErrorKey(serialized, "signIn")).toBe("emailUnverified");
    expect(
      authErrorKey({ message: "auth:some-provider-secret" }, "google"),
    ).toBe("google");
  });

  test("does not label a provider outage or implementation error as a bad password", () => {
    expect(authErrorKey({ statusCode: 503 }, "signIn")).toBe("unavailable");
    expect(
      authErrorKey(
        new Error("Invalid schema for response_format: Missing 'field'"),
        "signUp",
      ),
    ).toBe("unavailable");
    expect(authErrorKey(new TypeError("Failed to fetch"), "google")).toBe(
      "unavailable",
    );
    expect(
      authErrorKey(
        { name: "database-error", message: "postgres://private-host" },
        "completeProfile",
      ),
    ).toBe("unavailable");
    expect(
      authErrorKey(
        { name: "invalid-credentials", message: "Google sign-in failed" },
        "google",
      ),
    ).toBe("google");
  });

  test("keeps recovery private and chooses guidance for the actual operation", () => {
    expect(
      authErrorKey({ body: { code: "USER_ALREADY_EXISTS" } }, "forgotPassword"),
    ).toBe("forgotPassword");
    expect(
      authErrorKey(
        { name: "validation-error", message: "Store host could not resolve" },
        "shopify",
      ),
    ).toBe("shopifyStoreNotFound");
    expect(
      authErrorKey(
        { name: "validation-error", message: "Invalid schema" },
        "signUp",
      ),
    ).toBe("unavailable");
    expect(
      authErrorKey(
        { name: "validation-error", message: "Invalid schema" },
        "shopify",
      ),
    ).toBe("unavailable");
    expect(authErrorKey(null, "completeProfile")).toBe("completeProfile");
    expect(authErrorKey("<script>private response</script>", "signIn")).toBe(
      "signIn",
    );
  });
});
