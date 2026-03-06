import { type Result, resultify } from "@zenncore/utils";
import { ParseError, RequestError, TimeoutError } from "./error";

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
      resolved.data?.message ??
      resolved.data?.error?.message ??
      resolved.data?.error ??
      (await result.data.text()) ??
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
