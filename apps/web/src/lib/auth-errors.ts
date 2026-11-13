export type AuthOperation =
  | "signIn"
  | "signUp"
  | "google"
  | "shopify"
  | "forgotPassword"
  | "resetPassword"
  | "completeProfile";

const errorKeys = [
  "invalidCredentials",
  "emailAlreadyUsed",
  "emailUnverified",
  "invalidEmail",
  "passwordTooShort",
  "shopifyStoreNotFound",
  "rateLimited",
  "unavailable",
  "signIn",
  "signUp",
  "google",
  "shopify",
  "forgotPassword",
  "resetPassword",
  "completeProfile",
] as const;

export type AuthErrorKey = (typeof errorKeys)[number];

const property = (value: unknown, key: string): unknown =>
  value !== null && typeof value === "object" && key in value
    ? Reflect.get(value, key)
    : undefined;

/** Only controlled message keys cross into UI; provider/SQL details never do. */
export const authErrorKey = (
  error: unknown,
  operation: AuthOperation,
): AuthErrorKey => {
  const message = property(error, "message");
  const wireKey = errorKeys.find((key) => message === `auth:${key}`);
  if (wireKey) return wireKey;

  const body = property(error, "body");
  const code = property(body, "code") ?? property(error, "code");
  const name = property(error, "name");
  const status = property(error, "status") ?? property(error, "statusCode");

  switch (true) {
    case code === "TOO_MANY_REQUESTS" || status === 429:
      return "rateLimited";
    case code === "EMAIL_NOT_VERIFIED":
      return "emailUnverified";
    case code === "USER_ALREADY_EXISTS" ||
      code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
      message === "User already exists. Use another email.":
      return operation === "signUp" ? "emailAlreadyUsed" : operation;
    case code === "INVALID_EMAIL":
      return "invalidEmail";
    case code === "PASSWORD_TOO_SHORT":
      return "passwordTooShort";
    case code === "INVALID_EMAIL_OR_PASSWORD" ||
      code === "INVALID_PASSWORD" ||
      (operation === "signIn" &&
        name === "invalid-credentials" &&
        message === "Invalid credentials provided"):
      return operation === "signIn" ? "invalidCredentials" : operation;
    case name === "timeout-error" ||
      name === "database-error" ||
      name === "parse-error" ||
      (typeof status === "number" && status >= 500) ||
      (typeof message === "string" &&
        /invalid schema|failed to fetch|network error/i.test(message)):
      return "unavailable";
    case operation === "shopify" && name === "validation-error":
      return "shopifyStoreNotFound";
    default:
      return operation;
  }
};
