import { problem } from "@/server/utils/problem";

/**
 * Terminal 404 for `/api/*` paths no concrete route handles.
 *
 * Without this, an unmatched API path fell through to the HTML 404 page: an
 * agent asking for JSON got a Next.js document back and had to guess whether
 * the endpoint was wrong, the payload was wrong, or the service was down. It
 * now gets an RFC 9457 problem naming the path and pointing at the OpenAPI
 * document.
 *
 * Concrete routes always win — App Router resolves static and dynamic segments
 * before a catch-all — so this only ever answers for paths that genuinely do
 * not exist. A path that exists but does not implement the method still gets
 * the framework's own 405, which is the correct answer and not ours to
 * override.
 */
const notFound = (request: Request) => {
  const { pathname } = new URL(request.url);

  return problem(
    "not-found",
    `No ecentic API endpoint at ${request.method} ${pathname}.`,
    {
      instance: pathname,
      headers: {
        Link: '</openapi.json>; rel="service-desc"; type="application/json", </docs>; rel="service-doc"; type="text/html"',
      },
    },
  );
};

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;

export const OPTIONS = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    },
  });
