import { API_VERSION, API_VERSION_HEADER } from "@/lib/agent-api";
import { seo } from "@/lib/seo";
import { problem } from "./problem";
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
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
  "Access-Control-Expose-Headers":
    "RateLimit, RateLimit-Policy, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After, API-Version, Deprecation, Sunset, Link",
} as const;

const DESCRIPTION_LINKS = [
  `<${seo.host}/openapi.json>; rel="service-desc"; type="application/json"`,
  `<${seo.host}/docs>; rel="service-doc"; type="text/html"`,
  `<${seo.host}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
].join(", ");

/**
 * Answers a public GET. The rate-limit window is consumed first so an
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
  }: {
    cacheControl?: string;
    policy?: Policy;
    limiter?: (request: Request, policy?: Policy) => Promise<Verdict>;
  } = {},
) => {
  const verdict = await limiter(request, policy);

  // Deliberately no `Content-Type` in here. These headers are shared with the
  // 429, and a problem document is `application/problem+json` — carrying a
  // JSON content type through would silently relabel it as an ordinary
  // response, which is exactly what a generic client uses to tell the two
  // apart.
  const headers = {
    [API_VERSION_HEADER]: API_VERSION,
    Link: DESCRIPTION_LINKS,
    ...CORS,
    ...rateLimitHeaders(verdict),
  };

  if (!verdict.allowed)
    return problem(
      "rate-limited",
      `Exceeded ${verdict.policy.limit} requests per ${verdict.policy.window}s on the "${verdict.policy.name}" policy.`,
      {
        instance: new URL(request.url).pathname,
        headers: { ...headers, "Retry-After": String(verdict.reset) },
      },
    );

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
