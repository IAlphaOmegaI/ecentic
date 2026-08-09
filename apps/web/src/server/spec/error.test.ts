import { describe, expect, test } from "bun:test";
import {
  ConflictError,
  DatabaseError,
  InvalidSignatureError,
  isExpected,
  UnauthenticatedError,
  UntrustedRequestError,
  ValidationError,
} from "../utils/error";

describe("isExpected", () => {
  test.each([
    [new ValidationError("nope"), true],
    [new ConflictError("nope"), true],
    [new InvalidSignatureError("nope"), true],
    [new UntrustedRequestError("nope"), true],
    [new UnauthenticatedError("nope"), false],
    [new DatabaseError("nope"), false],
  ])("classifies %s", (error, expected) => {
    expect(isExpected(error)).toBe(expected);
  });

  test("the two public-endpoint guards stay expected, session auth does not", () => {
    // Both guards front URLs anyone can POST and record their own rejections at
    // `warning`, so `withContext` must not also raise them as exceptions —
    // flipping either one turns every scanner into a Sentry issue. A failed
    // session auth is a different thing and stays reportable. Pinned here
    // rather than in cron.ts / inbound.ts because importing those pulls the
    // postgres and redis clients in at module scope.
    expect(isExpected(new UntrustedRequestError("Unauthorized"))).toBe(true);
    expect(
      isExpected(new InvalidSignatureError("Invalid HMAC signature")),
    ).toBe(true);
    expect(isExpected(new UnauthenticatedError("Unauthorized"))).toBe(false);
  });
});
