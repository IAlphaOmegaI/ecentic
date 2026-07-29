import { type Result, resultify } from "@zenncore/utils";
import { ParseError, RequestError, TimeoutError } from "./error";

/**
 * Status for an error class that did not name one itself. Only the codes that
 * are unambiguous from the class alone live here — anything else is a defect
 * until proven otherwise, so the fallback is 500 rather than a guessed 4xx.
 */
const STATUS_BY_ERROR: Record<string, number> = {
  "unauthenticated-error": 401,
  "invalid-credentials": 401,
  "unauthorized-error": 403,
  "not-found-error": 404,
  "conflict-error": 409,
  "unique-constraint-error": 409,
  "validation-error": 422,
  "timeout-error": 504,
};

const statusFor = (error: Error & { statusCode?: number }) =>
  error.statusCode ?? STATUS_BY_ERROR[error.name] ?? 500;

/**
 * Turns the `Result` a context-wrapped action returns into the JSON response a
 * route handler owes its caller, so handlers stop hand-rolling the same
 * success/error envelope and status mapping apiece.
 *
 * An error carrying its own `statusCode` wins over the class map — that is how
 * an action pins an exact code (a webhook contract a partner already codes
 * against) without inventing an error class per status.
 */
export const respond = <T>(
  result: Result<T, Error>,
  {
    status,
    headers,
  }: { status?: number; headers?: Record<string, string> } = {},
) =>
  result.success
    ? Response.json(
        { success: true, data: result.data },
        { status: status ?? 200, headers },
      )
    : Response.json(
        { success: false, error: result.error.message },
        { status: statusFor(result.error), headers },
      );

export const request = async (
  url: string,
  options: RequestInit,
  { timeout = 60000 }: { timeout?: number } = {},
): Promise<Result<Response, TimeoutError | Error>> => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const result = await resultify(() =>
    fetch(url, {
      ...options,
      signal: controller.signal,
    }),
  );

  clearTimeout(timeoutId);

  if (!result.success) {
    if (result.error.name === "AbortError")
      return {
        success: false,
        error: new TimeoutError("Request timeout"),
      };

    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.data,
  };
};

// @ts-expect-error - void is not a valid type for Omit
// biome-ignore lint/suspicious/noExplicitAny: any is used to handle type errors when working with empty Results
type Actionable = Omit<any, void>;

const isWrappedInResult = <T>(item: unknown): item is Result<T> => {
  if (typeof item !== "object" || item === null) return false;
  return "success" in item;
};

export const parse = async <T>(
  response: Result<Response> | Response,
): Promise<Result<T, RequestError | ParseError | Error>> => {
  const result: Result<Response> = (() => {
    if (isWrappedInResult(response)) return response;

    return {
      success: true,
      data: response,
    };
  })();

  if (!result.success)
    return {
      success: false,
      error: result.error,
    };

  if (!result.data.ok) {
    const resolved = await resultify(
      () => result.data.json() as Promise<Actionable>,
    );

    if (!resolved.success)
      return {
        success: false,
        error: new ParseError("Failed to parse response", {
          cause: resolved.error,
          statusCode: result.data.status,
        }),
      };

    const message =
      // @ts-expect-error - message is not a valid type for Actionable
      resolved.data?.message ??
      // @ts-expect-error - error is not a valid type for Actionable
      resolved.data?.error?.message ??
      // @ts-expect-error - error is not a valid type for Actionable
      resolved.data?.error ??
      result.data.statusText;

    return {
      success: false,
      error: new RequestError(message, { statusCode: result.data.status }),
    };
  }

  const resolved = await resultify(
    () => result.data.json() as Promise<Actionable>,
  );

  if (!resolved.success)
    return {
      success: false,
      error: resolved.error,
    };

  return {
    success: true,
    data: resolved.data as T,
  } as Result<T, RequestError | ParseError | Error>;
};
