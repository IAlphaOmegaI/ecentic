import { describe, expect, test } from "bun:test";
import { callOnboardingAction, onboardingErrorKey } from "../onboarding-errors";

describe("onboarding error presentation", () => {
  test("provider schema failures never blame the merchant's input", () => {
    expect(
      onboardingErrorKey({
        name: "validation-error",
        message:
          "Invalid schema for response_format 'response': required is missing",
      }),
    ).toBe("service");
  });
  test("serialized business errors retain actionable recovery", () => {
    expect(onboardingErrorKey({ name: "unauthenticated-error" })).toBe(
      "session",
    );
    expect(onboardingErrorKey({ name: "integration-auth-error" })).toBe(
      "permissions",
    );
    expect(onboardingErrorKey({ name: "subscription-required-error" })).toBe(
      "plan",
    );
    expect(onboardingErrorKey({ name: "timeout-error" })).toBe("timeout");
    expect(onboardingErrorKey({ name: "validation-error" })).toBe("validation");
  });
  test("known import and discovery failures keep their recovery advice", () => {
    expect(onboardingErrorKey({ message: "feed-too-large" })).toBe("tooLarge");
    expect(
      onboardingErrorKey({
        message:
          "No competitors found for headset. Try a broader brand or category.",
      }),
    ).toBe("noCompetitors");
    expect(
      onboardingErrorKey({
        message:
          "Could not read store.example. The site may block automated requests — try the product's own store page",
      }),
    ).toBe("sourceUnavailable");
    expect(onboardingErrorKey({ message: "Feed returned status 403" })).toBe(
      "feedUnavailable",
    );
  });
  test("untrusted diagnostics cannot become visible copy", () => {
    for (const error of [
      null,
      "database password=secret",
      { message: "SQL error: token=secret" },
      { message: "<script>bad()</script>" },
    ]) {
      expect(onboardingErrorKey(error)).toBe("unavailable");
    }
  });
  test("a transport rejection follows the failed-action path", async () => {
    const error = new TypeError("Failed to fetch");
    const result = await callOnboardingAction(async () => {
      throw error;
    });
    expect(result).toEqual({ success: false, error });
    const successful = { success: true as const, data: { id: "catalog" } };
    expect(await callOnboardingAction(async () => successful)).toBe(successful);
  });
});
