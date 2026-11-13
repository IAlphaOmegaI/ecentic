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
