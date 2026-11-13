import { expect, test } from "bun:test";
import {
  isTranslationEnvelopeFailure,
  translationRetryDisposition,
} from "./retry";

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

test("only exact malformed response envelopes receive a bounded transport retry", () => {
  expect(
    isTranslationEnvelopeFailure(
      "Translation did not pass review: batch: Draft returned missing, duplicate or unexpected unit IDs.",
    ),
  ).toBe(true);
  expect(
    isTranslationEnvelopeFailure(
      "Translation did not pass review: html.body.1: Nonempty source was omitted.",
    ),
  ).toBe(false);
  expect(
    isTranslationEnvelopeFailure(
      "Translation did not pass review: batch: Draft returned missing, duplicate or unexpected unit IDs.; html.body.1: Numeric facts differ.",
    ),
  ).toBe(false);
  expect(
    translationRetryDisposition(
      "Translation did not pass review: batch: Draft returned missing, duplicate or unexpected unit IDs.",
      2,
    ).exhausted,
  ).toBe(true);
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
