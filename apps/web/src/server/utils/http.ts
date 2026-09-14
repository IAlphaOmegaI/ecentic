import { type Result, resultify } from "@zenncore/utils";
import {
  ParseError,
  RequestError,
  ResponseTooLargeError,
  TimeoutError,
  ValidationError,
} from "./error";
import { isSafePublicHttpUrl } from "./ssrf";

/**
 * Status for an error class that did not name one itself. Only the codes that
 * are unambiguous from the class alone live here — anything else is a defect
 * until proven otherwise, so the fallback is 500 rather than a guessed 4xx.
 */
const STATUS_BY_ERROR: Record<string, number> = {
  "unauthenticated-error": 401,
  "invalid-credentials": 401,
  "invalid-signature": 401,
  "untrusted-request": 401,
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

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_READ_LIMIT_BYTES = 8 * 1024 * 1024;
const GUARD_USER_AGENT = "EcenticStoreCheck/1.0 (+https://ecentic.ai)";

/**
 * `isSafePublicHttpUrl` vets the host, not the port — a public IP with a
 * non-default port still reaches whatever listens there. Storefronts serve on
 * 443, so anything else is refused outside local development (where test
 * stores run on arbitrary ports).
 */
const isGuardable = async (url: string) => {
  const parsed = resultify(() => new URL(url));
  if (!parsed.success) return false;

  if (process.env.NODE_ENV === "production" && parsed.data.port !== "")
    return false;

  return isSafePublicHttpUrl(url);
};

const isTimeout = (error: Error) =>
  error.name === "AbortError" || error.name === "TimeoutError";

/**
 * Resolves with `fallback` the moment `signal` aborts. The guard's DNS lookup
 * cannot itself be cancelled, but the request must not wait on a nameserver
 * that never answers — the deadline covers the check as well as the fetch.
 */
const within = <T>(
  promise: Promise<T>,
  signal: AbortSignal | null | undefined,
  fallback: T,
) =>
  signal
    ? Promise.race([
        promise,
        new Promise<T>((resolve) => {
          if (signal.aborted) resolve(fallback);
          signal.addEventListener("abort", () => resolve(fallback), {
            once: true,
          });
        }),
      ])
    : promise;

/**
 * One hop of a guarded request, re-running the SSRF check before it leaves the
 * process and following a redirect by hand. `redirect: "follow"` would let a
 * public URL bounce to a private one *after* the check and fetch it anyway.
 */
const hop = async (
  url: string,
  options: RequestInit,
  hops: number,
): Promise<Result<Response, TimeoutError | ValidationError | Error>> => {
  const guarded = await within(isGuardable(url), options.signal, false);

  if (options.signal?.aborted)
    return { success: false, error: new TimeoutError("Request timeout") };

  if (!guarded)
    return {
      success: false,
      error: new ValidationError("Not a reachable public https URL"),
    };

  const result = await resultify(() => fetch(url, options));

  if (!result.success)
    return {
      success: false,
      error: isTimeout(result.error)
        ? new TimeoutError("Request timeout")
        : result.error,
    };

  if (!REDIRECT_STATUSES.has(result.data.status))
    return { success: true, data: result.data };

  // A redirect's body is never read — release the connection instead.
  void result.data.body?.cancel();

  if (hops >= MAX_REDIRECTS)
    return { success: false, error: new RequestError("Too many redirects") };

  const location = result.data.headers.get("location");
  const next = resultify(() => new URL(location ?? "", url).toString());

  if (!location || !next.success)
    return {
      success: false,
      error: new RequestError("Redirect with no readable destination"),
    };

  return hop(next.data, options, hops + 1);
};

/**
 * `guard: true` is for URLs a browser handed us — a storefront typed into the
 * landing hero, a prospect's domain on the call sheet. Every hop goes through
 * the SSRF guard, and one deadline covers every hop *and* the body: the signal
 * outlives the headers, so a body that drips in a byte at a time is cut off
 * too. Stores redirect constantly (apex to www, http to https), so redirects
 * are followed rather than refused; the returned `Response.url` is the hop that
 * answered.
 */
export const request = async (
  url: string,
  options: RequestInit,
  {
    timeout = 60000,
    guard = false,
  }: { timeout?: number; guard?: boolean } = {},
): Promise<Result<Response, TimeoutError | ValidationError | Error>> => {
  if (guard) {
    // Identify honestly. A merchant who greps their logs should find us under
    // our own name, unless the caller already chose one.
    const headers = new Headers(options.headers);
    if (!headers.has("user-agent")) headers.set("User-Agent", GUARD_USER_AGENT);

    return hop(
      url,
      {
        ...options,
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(timeout),
      },
      0,
    );
  }

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

/**
 * Collects a body into `chunks`, giving up past `limit` bytes. The accumulator
 * is appended to in place: copying it per read would make a server that
 * streams one byte at a time quadratic.
 */
const drain = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  limit: number,
  chunks: Uint8Array[] = [],
  received = 0,
): Promise<Uint8Array[] | null> => {
  const { done, value } = await reader.read();
  if (done || !value) return chunks;

  const total = received + value.byteLength;
  if (total > limit) {
    void reader.cancel();
    return null;
  }

  chunks.push(value);
  return drain(reader, limit, chunks, total);
};

/**
 * A response body as text, refused — not truncated — past `limit` bytes. A
 * storefront that streams an endless body must not hold a function instance
 * hostage, and a truncated JSON page would only fail later, less legibly.
 */
export const read = async (
  response: Response,
  { limit = DEFAULT_READ_LIMIT_BYTES }: { limit?: number } = {},
): Promise<Result<string, RequestError | Error>> => {
  const reader = response.body?.getReader();
  if (!reader) return { success: true, data: "" };

  const chunks = await resultify(() => drain(reader, limit));
  if (!chunks.success)
    return {
      success: false,
      error: isTimeout(chunks.error)
        ? new TimeoutError("Response body timeout")
        : chunks.error,
    };

  if (!chunks.data)
    return {
      success: false,
      error: new ResponseTooLargeError("Response too large"),
    };

  return {
    success: true,
    data: new TextDecoder().decode(Buffer.concat(chunks.data)),
  };
};

export type Page = {
  status: number;
  body: string;
  /** The URL that answered — the last hop after redirects. */
  url: string;
  headers: Headers;
};

/**
 * A guarded GET read in full within `limit` bytes — for storefront pages whose
 * headers and markup are both evidence (a platform's fingerprint, the REST root
 * a WordPress site advertises).
 */
export const page = async (
  url: string,
  {
    timeout = 5000,
    limit = DEFAULT_READ_LIMIT_BYTES,
    accept = "text/html,application/xhtml+xml,application/json;q=0.9,*/*",
  }: { timeout?: number; limit?: number; accept?: string } = {},
): Promise<Result<Page, TimeoutError | ValidationError | Error>> => {
  const response = await request(
    url,
    {
      method: "GET",
      headers: { Accept: accept, "Accept-Language": "en-US,en;q=0.9" },
      cache: "no-store",
    },
    { timeout, guard: true },
  );
  if (!response.success) return response;

  const body = await read(response.data, { limit });
  if (!body.success) return body;

  return {
    success: true,
    data: {
      status: response.data.status,
      body: body.data,
      url: response.data.url || url,
      headers: response.data.headers,
    },
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
