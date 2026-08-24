import { API_VERSION, API_VERSION_HEADER } from "@/lib/agent-api";
import { seo } from "@/lib/seo";
import { type ProblemCode, problem } from "./problem";
import {
  consume,
  type Policy,
  rateLimitHeaders,
  type Verdict,
} from "./rate-limit";

/**
 * The response envelope every `/api/v1` handler shares: CORS, the version
 * header an agent can pin against, live rate-limit headers, and a `Link` back
 * to the machine-readable description of the surface it is talking to.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
  "Access-Control-Expose-Headers":
    "RateLimit, RateLimit-Policy, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After, API-Version, Deprecation, Sunset, Link",
} as const;

const DESCRIPTION_LINKS = [
  `<${seo.host}/openapi.json>; rel="service-desc"; type="application/json"`,
  `<${seo.host}/docs>; rel="service-doc"; type="text/html"`,
  `<${seo.host}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
].join(", ");

type Options = {
  cacheControl?: string;
  policy?: Policy;
  limiter?: (request: Request, policy?: Policy) => Promise<Verdict>;
};

/**
 * Consumes the caller's rate-limit window once and returns the headers every
 * answer on this surface carries — success and failure alike. A refused request
 * costs the server what an accepted one does, so it spends the window too.
 */
const envelope = async (request: Request, options: Options) => {
  const verdict = await (options.limiter ?? consume)(request, options.policy);

  // Deliberately no `Content-Type` in here. These headers are shared with every
  // problem response, and a problem document is `application/problem+json` —
  // carrying a JSON content type through would silently relabel it as an
  // ordinary response, which is exactly what a generic client uses to tell the
  // two apart.
  return {
    verdict,
    headers: {
      [API_VERSION_HEADER]: API_VERSION,
      Link: DESCRIPTION_LINKS,
      ...CORS,
      ...rateLimitHeaders(verdict),
    },
  };
};

const rateLimited = (
  request: Request,
  verdict: Verdict,
  headers: Record<string, string>,
) =>
  problem(
    "rate-limited",
    `Exceeded ${verdict.policy.limit} requests per ${verdict.policy.window}s on the "${verdict.policy.name}" policy.`,
    {
      instance: new URL(request.url).pathname,
      headers: { ...headers, "Retry-After": String(verdict.reset) },
    },
  );

/**
 * Refuses a public request with an RFC 9457 problem, inside the same envelope
 * `served` uses, so a client parses success and failure the same way.
 */
export const refused = async (
  request: Request,
  code: ProblemCode,
  detail: string,
  { status, ...options }: Options & { status?: number } = {},
) => {
  const { verdict, headers } = await envelope(request, options);
  if (!verdict.allowed) return rateLimited(request, verdict, headers);

  return problem(code, detail, {
    instance: new URL(request.url).pathname,
    headers,
    status,
  });
};

/**
 * Answers a public request. The rate-limit window is consumed first so an
 * exhausted caller gets the RFC 9457 problem — with `Retry-After` — instead of
 * the payload, and so the headers on a successful response describe the window
 * this request actually spent.
 */
export const served = async (
  request: Request,
  payload: unknown,
  {
    // `private`, not `public`: these responses carry the caller's own
    // rate-limit counters, and a shared cache handing one agent's `remaining`
    // to another is worse than not caching at all — the header exists so a
    // client can pace itself, and a borrowed count cannot do that. The payload
    // is a few kilobytes of static discovery data; the origin can serve it.
    cacheControl = "private, max-age=60",
    policy,
    // Seam for tests: the 429 branch is the one an agent depends on to back
    // off, and it should be provable without standing up a Redis instance.
    limiter = consume,
  }: Options = {},
) => {
  const { verdict, headers } = await envelope(request, { policy, limiter });
  if (!verdict.allowed) return rateLimited(request, verdict, headers);

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
};

export const preflight = () =>
  new Response(null, { status: 204, headers: CORS });
