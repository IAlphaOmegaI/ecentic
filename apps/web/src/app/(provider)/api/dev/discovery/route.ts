import * as Report from "@/server/app/intelligence/discovery-report";
import { executeDiscovery } from "@/server/app/intelligence/discovery-run";
import { Environment } from "@/server/utils/environment";
import { ValidationError } from "@/server/utils/error";

// Four agents per query, batched eight at a time — a multi-query run routinely
// outlives the default budget. This only raises the platform's ceiling; a chat
// surface may still give up on the fetch long before the run finishes.
export const maxDuration = 300;

// Every character here is billed four times per query, and the strings go
// straight into a model prompt — bound them so a stray paste cannot turn one
// request into a token bill.
const STORE_LIMIT = 200;
const QUERY_LIMIT = 300;

const USAGE = `# AI Discovery endpoint

GET /api/dev/discovery?store=<domain>&q=<shopping query>&q=<another query>

- Authorization: send \`Authorization: Bearer <code>\`, \`x-discovery-code: <code>\`, or \`?code=<code>\`.
- \`store\` (aliases \`domain\`, \`target\`) — the store domain being evaluated, e.g. \`allbirds.com\`, up to ${STORE_LIMIT} characters.
- \`q\` (alias \`query\`) — a shopper request, up to ${QUERY_LIMIT} characters. Repeat the parameter, or separate queries with a newline or \`|\`. Up to 8 are run; the rest are ignored.
- \`format=json\` returns the raw run instead of Markdown.

POST accepts the same run as JSON: \`{ "store": "allbirds.com", "queries": ["best wool sneakers"] }\`.
`;

const text = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

// Queries arrive however the caller found easiest to type: repeated parameters,
// one newline-separated blob, or pipe-separated. Commas are left alone — they
// belong inside shopper phrasing ("running shoes, wide fit").
const splitQueries = (values: string[]): string[] =>
  values
    .flatMap((value) => value.split(/[\n|]+/))
    .map((query) => query.trim())
    .filter((query) => query.length > 0);

// A JSON body is whatever the caller sent, not the shape it was cast to — a
// number where a string belongs must answer 400, not throw past the handler.
const readString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const readQueries = (value: unknown): string[] =>
  splitQueries(
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string")
      : typeof value === "string"
        ? [value]
        : [],
  );

const codeCandidates = (request: Request, url: URL) => [
  request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
  request.headers.get("x-discovery-code"),
  url.searchParams.get("code"),
];

const run = async (
  url: URL,
  input: { store: string; queries: string[] },
): Promise<Response> => {
  if (!input.store) return text(`Missing \`store\`.\n\n${USAGE}`, 400);
  if (input.queries.length === 0)
    return text(`Missing \`q\`.\n\n${USAGE}`, 400);
  if (input.store.length > STORE_LIMIT)
    return text(`\`store\` exceeds ${STORE_LIMIT} characters.`, 400);

  const oversized = input.queries.find((query) => query.length > QUERY_LIMIT);
  if (oversized) return text(`A query exceeds ${QUERY_LIMIT} characters.`, 400);

  const result = await executeDiscovery(Environment.SERVER, {
    targetStore: input.store,
    queries: input.queries,
  });

  // The engine rejects bad input with a ValidationError; anything else reaching
  // here is the run itself failing, which is ours to own, not the caller's.
  if (!result.success)
    return text(
      result.error.message,
      result.error instanceof ValidationError ? 400 : 500,
    );

  if (url.searchParams.get("format") === "json")
    return Response.json(result.data, {
      headers: { "Cache-Control": "no-store" },
    });

  return text(Report.toMarkdown(result.data), 200);
};

const guard = (request: Request, url: URL): Response | null => {
  if (Report.accessCode() === null)
    return text(
      "DEV_DISCOVERY_TOKEN is not configured — this endpoint has no access code to check against.",
      503,
    );

  if (!Report.isAuthorized(codeCandidates(request, url)))
    return text("Unauthorized — pass the access code.", 401);

  return null;
};

/**
 * The `/dev/discovery` run as a headless Markdown report, so an AI platform that
 * can only fetch a URL gets the same answer the page shows. Guarded by a single
 * static access code (see `discovery-report.ts`) rather than a session, because
 * the caller is a chat surface with no cookie jar.
 */
export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const denied = guard(request, url);
  if (denied) return denied; 

  return run(url, {
    store: readString(
      url.searchParams.get("store") ??
        url.searchParams.get("domain") ??
        url.searchParams.get("target"),
    ),
    queries: splitQueries([
      ...url.searchParams.getAll("q"),
      ...url.searchParams.getAll("query"),
    ]),
  });
};

export const POST = async (request: Request) => {
  const url = new URL(request.url);
  const denied = guard(request, url);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    store?: unknown;
    domain?: unknown;
    target?: unknown;
    queries?: unknown;
    query?: unknown;
  } | null;

  if (!body || typeof body !== "object")
    return text(`Body must be a JSON object.\n\n${USAGE}`, 400);

  return run(url, {
    store: readString(body.store ?? body.domain ?? body.target),
    queries: readQueries(body.queries ?? body.query),
  });
};
