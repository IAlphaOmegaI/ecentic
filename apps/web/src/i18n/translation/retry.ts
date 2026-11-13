/** No usable reviewed artifact exists after a malformed response envelope. */
export const isTranslationEnvelopeFailure = (message: string) =>
  message === "Translation response contains unsupported Unicode text." ||
  /^Translation did not pass review: batch: (?:Draft|Review|Correction) returned missing, duplicate or unexpected unit IDs\.$/.test(
    message,
  );

/** Provider capacity is not a failed translation or a reason to discard reviewed work. */
export const translationRetryDisposition = (
  message: string,
  previousAttempts: number,
) => {
  const rateLimited =
    /\b429\b|token rate limit|rate.?limit|too many requests/i.test(message);
  const attempts = rateLimited ? previousAttempts : previousAttempts + 1;
  return {
    rateLimited,
    attempts,
    exhausted: !rateLimited && attempts >= 3,
    delayMs: rateLimited
      ? 120_000
      : Math.min(86_400_000, 60_000 * 2 ** attempts),
  };
};
