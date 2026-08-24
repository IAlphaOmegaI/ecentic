import { seo } from "@/lib/seo";

/**
 * RFC 9457 "Problem Details for HTTP APIs" responses.
 *
 * Agents cannot parse an HTML error page, and a bare `{ error: "..." }` string
 * gives them nothing to branch on. Every machine-facing failure answers with
 * `application/problem+json` carrying a stable `code`, a human `detail`, and a
 * `resolution` hint that says what to do next.
 *
 * @see https://www.rfc-editor.org/rfc/rfc9457
 */

/** Documentation anchor a problem `type` URI points at. */
const documentation = `${seo.host}/docs/errors`;

/**
 * The catalogue. `code` is the machine-readable contract — it is what an agent
 * switches on, so these strings are frozen once published. `title` and
 * `resolution` are prose and may be reworded.
 */
export const PROBLEMS = {
  "not-found": {
    status: 404,
    title: "Resource not found",
    resolution:
      "Check the path against the OpenAPI document at /openapi.json or the API catalog at /.well-known/api-catalog.",
  },
  "method-not-allowed": {
    status: 405,
    title: "Method not allowed",
    resolution:
      "Re-read the operation in /openapi.json; the `Allow` header lists the methods this path accepts.",
  },
  unauthenticated: {
    status: 401,
    title: "Authentication required",
    resolution:
      "Send `Authorization: Bearer ecentic_sk_…`. Registration and key minting are documented at /auth.md.",
  },
  unauthorized: {
    status: 403,
    title: "Not permitted",
    resolution:
      "The credential is valid but lacks the scope for this operation. Scopes are listed at /.well-known/oauth-protected-resource.",
  },
  "payment-required": {
    status: 402,
    title: "Payment required",
    resolution:
      "Settle the x402 challenge in the `PAYMENT-REQUIRED` header, or use the free discovery surfaces under /.well-known and /api/v1.",
  },
  "subscription-required": {
    status: 402,
    title: "Subscription required",
    resolution:
      "This operation needs an active ecentic plan. Plans are listed at /api/v1/plans and purchasable at /pricing.",
  },
  "invalid-request": {
    status: 400,
    title: "Invalid request",
    resolution:
      "Compare the request body against the operation's request schema in /openapi.json.",
  },
  "validation-failed": {
    status: 422,
    title: "Request failed validation",
    resolution:
      "Fix the fields named in `errors` and retry. Field schemas live in /openapi.json.",
  },
  conflict: {
    status: 409,
    title: "Conflicting state",
    resolution:
      "The resource already exists or has changed. Re-read it and retry with the current state.",
  },
  "rate-limited": {
    status: 429,
    title: "Rate limit exceeded",
    resolution:
      "Wait for the number of seconds in `Retry-After`, then retry. The active policy is in the `RateLimit-Policy` header and documented at /docs/rate-limits.",
  },
  "upstream-timeout": {
    status: 504,
    title: "Upstream timed out",
    resolution: "Retry with exponential backoff; the failure is transient.",
  },
  "internal-error": {
    status: 500,
    title: "Internal error",
    resolution:
      "Retry with exponential backoff. If it persists, report it at /support with the `instance` value from this response.",
  },
} as const;

export type ProblemCode = keyof typeof PROBLEMS;

export type ProblemBody = {
  type: string;
  title: string;
  status: number;
  code: ProblemCode;
  detail: string;
  resolution: string;
  documentation: string;
  instance?: string;
};

/**
 * Maps the app's error classes onto problem codes so a `Result` failure keeps
 * the same wire contract as a hand-written problem. Names, not `instanceof` —
 * `error()` re-points instances at their parent prototype.
 */
const CODE_BY_ERROR: Record<string, ProblemCode> = {
  "unauthenticated-error": "unauthenticated",
  "invalid-credentials": "unauthenticated",
  "invalid-signature": "unauthenticated",
  "untrusted-request": "unauthenticated",
  "unauthorized-error": "unauthorized",
  "subscription-required-error": "subscription-required",
  "not-found-error": "not-found",
  "conflict-error": "conflict",
  "unique-constraint-error": "conflict",
  "validation-error": "validation-failed",
  "timeout-error": "upstream-timeout",
};

export const problemCodeFor = (error: Error): ProblemCode =>
  CODE_BY_ERROR[error.name] ?? "internal-error";

export const problemBody = (
  code: ProblemCode,
  detail: string,
  instance?: string,
): ProblemBody => {
  const problem = PROBLEMS[code];

  return {
    type: `${documentation}#${code}`,
    title: problem.title,
    status: problem.status,
    code,
    detail,
    resolution: problem.resolution,
    documentation,
    ...(instance ? { instance } : {}),
  };
};

export const PROBLEM_CONTENT_TYPE = "application/problem+json; charset=utf-8";

/**
 * The response itself. `Content-Type` is `application/problem+json` per RFC
 * 9457 — deliberately not `application/json`, because the media type is how a
 * generic client knows the body is a problem and not the resource it asked for.
 */
export const problem = (
  code: ProblemCode,
  detail: string,
  {
    instance,
    headers,
    status,
  }: {
    instance?: string;
    headers?: Record<string, string>;
    status?: number;
  } = {},
) =>
  new Response(JSON.stringify(problemBody(code, detail, instance), null, 2), {
    status: status ?? PROBLEMS[code].status,
    headers: {
      "Content-Type": PROBLEM_CONTENT_TYPE,
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      ...headers,
    },
  });
