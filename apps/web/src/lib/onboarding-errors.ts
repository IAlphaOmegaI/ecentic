const property = (value: unknown, key: string): unknown =>
  value !== null && typeof value === "object" && key in value
    ? Reflect.get(value, key)
    : undefined;

/** Keep diagnostic details in logs. The interface receives only known message keys. */
export const onboardingErrorKey = (error: unknown) => {
  const name = property(error, "name");
  const status = property(error, "statusCode") ?? property(error, "status");
  const message = property(error, "message");
  const detail = typeof message === "string" ? message : "";

  switch (true) {
    case name === "unauthenticated-error":
      return "session";
    case name === "integration-auth-error" || name === "invalid-credentials":
      return "permissions";
    case name === "subscription-required-error":
      return "plan";
    case status === 429:
      return "rateLimited";
    case name === "timeout-error":
      return "timeout";
    // A provider's schema is not a field the merchant can correct.
    case /invalid schema|response_format|no object generated/i.test(detail):
      return "service";
    case name === "response-too-large-error" || detail === "feed-too-large":
      return "tooLarge";
    case name === "conflict-error" && /store.*(account|owner)/i.test(detail):
      return "conflict";
    case /no products (found|to import)|feed contains no products/i.test(
      detail,
    ):
      return "emptyCatalog";
    case /^Could not read .*The site may block automated requests/.test(
      detail,
    ) || detail.startsWith("No product could be read from those pages."):
      return "sourceUnavailable";
    case /^No competitors found for /.test(detail):
      return "noCompetitors";
    case detail ===
      "Could not reach the feed URL. Check the URL and try again." ||
      /^Feed returned status \d+$/.test(detail) ||
      detail === "Failed to read feed response":
      return "feedUnavailable";
    case detail === "No valid URLs provided" ||
      detail === "Search query is required":
    case name === "validation-error":
      return "validation";
    case name === "unauthorized-error":
      return "permissions";
    default:
      return "unavailable";
  }
};

/** A dropped request follows the same safe UI path as a returned action failure. */
export const callOnboardingAction = async <T>(action: () => Promise<T>) => {
  try {
    return await action();
  } catch (error) {
    return { success: false as const, error };
  }
};
