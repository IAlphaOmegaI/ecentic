import { expect, test } from "bun:test";
import { translationRetryDisposition } from "./retry";

test("Azure capacity limits do not exhaust article translation attempts", () => {
  const state = translationRetryDisposition(
    "Failed after 4 attempts. Last error: AI_APICallError: Your requests have exceeded token rate limit.",
    2,
  );
  expect(state).toEqual({
    rateLimited: true,
    attempts: 2,
    exhausted: false,
    delayMs: 120000,
  });
  expect(
    translationRetryDisposition("HTTP 429 Too Many Requests", 0).attempts,
  ).toBe(0);
});
test("ordinary transport failures retain a finite retry budget", () => {
  expect(translationRetryDisposition("Request timed out", 0)).toEqual({
    rateLimited: false,
    attempts: 1,
    exhausted: false,
    delayMs: 120000,
  });
  expect(translationRetryDisposition("Request timed out", 2).exhausted).toBe(
    true,
  );
});
