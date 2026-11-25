import { type Result, resultify } from "@zenncore/utils";
import { z } from "zod";
import * as HTTP from "@/server/utils/http";

export type Provider =
  | "azure"
  | "apollo"
  | "clay"
  | "google"
  | "unipile"
  | "warmbly"
  | "claude";

export class IntegrationError extends Error {
  override name = "outbound-integration-error";

  constructor(
    readonly provider: Provider,
    readonly code:
      | "configuration"
      | "input"
      | "access"
      | "quota"
      | "rate-limit"
      | "unavailable"
      | "contract"
      | "uncertain",
    message: string,
    readonly statusCode = 502,
    readonly retryAfterSeconds: number | null = null,
    readonly providerCode: string | null = null,
    readonly receipt: Record<string, unknown> | null = null,
  ) {
    super(message);
  }
}

export const retryAfter = (header: string | null, now = Date.now()) => {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(header);
  return Number.isFinite(date)
    ? Math.max(0, Math.ceil((date - now) / 1000))
    : null;
};

export const configurationError = (provider: Provider) => ({
  success: false as const,
  error: new IntegrationError(
    provider,
    "configuration",
    `${provider} is not configured.`,
    409,
  ),
});

export const inputError = (
  provider: Provider,
  message = "Check the integration inputs.",
) => ({
  success: false as const,
  error: new IntegrationError(provider, "input", message, 422),
});

/** No automatic retries: a disconnected POST may already have incurred cost or sent mail. */
export const request = async <Schema extends z.ZodType>(
  provider: Provider,
  url: string,
  options: RequestInit,
  schema: Schema,
): Promise<
  Result<
    {
      value: z.infer<Schema>;
      status: number;
      retryAfterSeconds: number | null;
    },
    IntegrationError
  >
> => {
  const response = await HTTP.request(
    url,
    {
      ...options,
      redirect: "error",
      cache: "no-store",
      // HTTP.request's header timeout does not cover reading an unguarded body.
      signal: AbortSignal.timeout(20000),
    },
    { timeout: 20000 },
  );

  if (!response.success)
    return {
      success: false,
      error: new IntegrationError(
        provider,
        options.method === "POST" ? "uncertain" : "unavailable",
        "The provider response was interrupted. Reconcile the operation before retrying.",
      ),
    };

  const delay = retryAfter(response.data.headers.get("retry-after"));
  if (!response.data.ok) {
    const status = response.data.status;
    const code = (() => {
      switch (true) {
        case status === 401 || status === 403:
          return "access";
        case status === 402:
          return "quota";
        case status === 429:
          return "rate-limit";
        case status >= 500 && options.method === "POST":
          return "uncertain";
        case status >= 500:
          return "unavailable";
        default:
          return "input";
      }
    })();
    const failure = await resultify(async () => {
      const body = await HTTP.read(response.data, { limit: 10000 });
      if (!body.success) return null;
      const parsed = z
        .object({
          error_code: z.string().optional(),
          code: z.string().optional(),
          type: z.string().optional(),
          message: z.string().optional(),
          error: z
            .union([z.object({ code: z.string() }), z.string()])
            .optional(),
        })
        .safeParse(JSON.parse(body.data));
      if (!parsed.success) return null;
      if (
        provider === "clay" &&
        status === 403 &&
        /advanced filters.*require a paid plan/i.test(parsed.data.message ?? "")
      )
        return "advanced_filters_require_plan";
      if (
        provider === "apollo" &&
        status === 422 &&
        typeof parsed.data.error === "string" &&
        /cannot access advanced filters\b/i.test(parsed.data.error) &&
        /\bfree plan\b/i.test(parsed.data.error)
      )
        return "advanced_filters_require_plan";
      const code =
        (provider === "unipile" ? parsed.data.type : undefined) ??
        parsed.data.error_code ??
        parsed.data.code ??
        (typeof parsed.data.error === "object"
          ? parsed.data.error.code
          : undefined);
      const format =
        provider === "unipile"
          ? /^(?:api|provider)\/[a-z0-9_]{1,80}$/
          : /^[a-zA-Z0-9_-]{1,80}$/;
      return code && format.test(code) ? code : null;
    });
    return {
      success: false,
      error: new IntegrationError(
        provider,
        failure.success && failure.data === "advanced_filters_require_plan"
          ? "access"
          : code,
        failure.success && failure.data === "advanced_filters_require_plan"
          ? provider === "apollo"
            ? "Apollo requires a trial or paid plan for these company filters."
            : "Clay requires a paid plan for these company filters."
          : `${provider} returned HTTP ${status}.`,
        status,
        // Only Unipile's own limiter supplies a reliable retry window.
        provider === "unipile" &&
          status === 429 &&
          (!failure.success || failure.data !== "api/too_many_requests")
          ? null
          : delay,
        failure.success ? failure.data : null,
      ),
    };
  }

  const body = await resultify(() =>
    HTTP.read(response.data, { limit: 2_000_000 }),
  );
  if (!body.success || !body.data.success)
    return {
      success: false,
      error: new IntegrationError(
        provider,
        options.method === "POST" ? "uncertain" : "unavailable",
        "The provider response could not be read completely.",
      ),
    };
  const content = body.data.data;
  const parsed = resultify(() => JSON.parse(content) as unknown);
  const validated = parsed.success ? schema.safeParse(parsed.data) : null;
  if (!validated?.success)
    return {
      success: false,
      error: new IntegrationError(
        provider,
        "contract",
        "The provider returned an unexpected response. No result was accepted.",
      ),
    };

  return {
    success: true,
    data: {
      value: validated.data,
      status: response.data.status,
      retryAfterSeconds: delay,
    },
  };
};

export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/);
export const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9_:.-]+$/);
