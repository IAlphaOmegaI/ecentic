import { PROMPT_LIMIT, SURFACES, type Surface } from "@/lib/llm-scraping";
import * as Answers from "@/server/app/intelligence/answer-report";
import * as Report from "@/server/app/intelligence/discovery-report";
import * as ScrapeLlm from "@/server/utils/scrapellm";

// A capture holds the connection until the surface finishes answering —
// ChatGPT with browsing routinely runs past a minute, AI Mode near one.
// Surfaces run in parallel, so the ceiling is the slowest one, not the sum.
export const maxDuration = 300;

const STORE_LIMIT = 200;
const BRAND_LIMIT = 100;

const PROVIDERS = Object.keys(SURFACES).join(", ");

const USAGE = `# AI answers endpoint

GET /api/dev/ai-answers?prompt=<prompt>&provider=<provider>&country=<code>&store=<domain>

Runs the prompt through the real AI surface (via ScrapeLLM) and returns its answer, citations, search results and shopping cards — plus, with \`store\`, where that store shows up.

- Authorization: send \`Authorization: Bearer <code>\`, \`x-discovery-code: <code>\`, or \`?code=<code>\` (the \`DEV_DISCOVERY_TOKEN\` access code).
- \`prompt\` (alias \`q\`) — required, up to ${PROMPT_LIMIT} characters.
- \`provider\` (aliases \`providers\`, \`surface\`) — required: ${PROVIDERS}. Comma-separate or repeat to run several in parallel. Each one bills ScrapeLLM credits (3 per fresh answer).
- \`country\` (alias \`region\`) — ISO 3166-1 alpha-2 code the surface is browsed from, default \`US\` (\`UK\` is read as \`GB\`). Country only — no city or language.
- \`store\` (alias \`domain\`) — optional store domain to look for, e.g. \`allbirds.com\`.
- \`brand\` — optional brand name to look for in the answer. Defaults to the domain's first label, so pass it for subdomain stores (\`shop.allbirds.com\` would search "shop") or when the brand reads differently.
- \`fresh=true\` — skip ScrapeLLM's response cache and force a new answer (always bills).
- \`format=json\` — the run as JSON instead of Markdown; add \`raw=true\` for the provider payload and answer markdown.

POST accepts the same run as JSON: \`{ "prompt": "best wool sneakers", "provider": ["chatgpt", "google_ai_mode"], "country": "US", "store": "allbirds.com" }\`.
`;

const text = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

// A JSON body is whatever the caller sent, not the shape it was cast to — a
// number where a string belongs must answer 400, not throw past the handler.
const readString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const readList = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value])
    .filter((entry): entry is string => typeof entry === "string")
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const TEXT_FIELDS = [
  "prompt",
  "q",
  "country",
  "region",
  "store",
  "domain",
  "brand",
  "format",
] as const;
const LIST_FIELDS = ["provider", "providers", "surface"] as const;
const FLAG_FIELDS = ["fresh", "raw"] as const;

const readFlag = (value: unknown): boolean =>
  value === true ||
  (typeof value === "string" &&
    ["1", "true", "yes"].includes(value.trim().toLowerCase()));

type Input = {
  prompt: string;
  providers: string[];
  country: string;
  store: string;
  brand: string;
  fresh: boolean;
  format: string;
  raw: boolean;
};

const resolveSurfaces = (
  providers: string[],
): { surfaces: Surface[] } | { unknown: string } => {
  const resolved = providers.map((provider) => ({
    provider,
    surface: Answers.resolveProvider(provider),
  }));

  const unknown = resolved.find((entry) => entry.surface === null);
  if (unknown) return { unknown: unknown.provider };

  return {
    surfaces: [...new Set(resolved.flatMap((entry) => entry.surface ?? []))],
  };
};

const run = async (input: Input): Promise<Response> => {
  if (!input.prompt) return text(`Missing \`prompt\`.\n\n${USAGE}`, 400);
  if (input.prompt.length > PROMPT_LIMIT)
    return text(`\`prompt\` exceeds ${PROMPT_LIMIT} characters.`, 400);

  // No default: every surface bills credits, so which ones run is the
  // caller's explicit choice.
  if (input.providers.length === 0)
    return text(`Missing \`provider\`.\n\n${USAGE}`, 400);

  const selection = resolveSurfaces(input.providers);
  if ("unknown" in selection)
    return text(
      `Unknown provider "${selection.unknown}". Available: ${PROVIDERS}.`,
      400,
    );

  const country = Answers.resolveCountry(input.country);
  if (!country)
    return text("`country` must be an ISO 3166-1 alpha-2 code, e.g. US.", 400);

  if (input.store.length > STORE_LIMIT)
    return text(`\`store\` exceeds ${STORE_LIMIT} characters.`, 400);
  if (input.brand.length > BRAND_LIMIT)
    return text(`\`brand\` exceeds ${BRAND_LIMIT} characters.`, 400);

  const store = input.store
    ? Answers.resolveStore(input.store, input.brand)
    : null;
  if (input.store && !store)
    return text("`store` must be a domain, e.g. allbirds.com.", 400);

  const outcomes = await Promise.all(
    selection.surfaces.map(async (surface): Promise<Answers.AnswerOutcome> => {
      const capture = await ScrapeLlm.execute({
        surface,
        prompt: input.prompt,
        country,
        bypassCache: input.fresh,
        runIndex: 0,
      });

      if (!capture.success)
        return {
          surface,
          status: "failed",
          error: capture.error.message,
          retryable: ScrapeLlm.isRetryable(capture.error),
        };

      return {
        surface,
        status: "completed",
        capture: capture.data,
        store: store ? Answers.assessStore(capture.data, store) : null,
      };
    }),
  );

  const report: Answers.AnswerRun = {
    prompt: input.prompt,
    country,
    store,
    outcomes,
  };

  // The report renders either way so the provider's error is readable; the
  // status only says whether anything answered — 503 when every failure is
  // transient (worth re-running), 502 when one is not.
  const failures = outcomes.flatMap((outcome) =>
    outcome.status === "failed" ? [outcome] : [],
  );
  const status = (() => {
    switch (true) {
      case failures.length < outcomes.length:
        return 200;
      case failures.every((failure) => failure.retryable):
        return 503;
      default:
        return 502;
    }
  })();

  if (input.format === "json")
    return Response.json(Answers.toJson(report, { raw: input.raw }), {
      status,
      headers: { "Cache-Control": "no-store" },
    });

  return text(Answers.toMarkdown(report), status);
};

// The same shared code as /api/dev/discovery: one manual research lane, one
// code to paste. It spends ScrapeLLM credits on arbitrary prompts, so a
// deployed environment without DEV_DISCOVERY_TOKEN refuses every request.
const guard = (request: Request, url: URL): Response | null => {
  if (Report.accessCode() === null)
    return text(
      "DEV_DISCOVERY_TOKEN is not configured — this endpoint has no access code to check against.",
      503,
    );

  const candidates = [
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
    request.headers.get("x-discovery-code"),
    url.searchParams.get("code"),
  ];

  if (!Report.isAuthorized(candidates))
    return text("Unauthorized — pass the access code.", 401);

  return null;
};

/**
 * One prompt through real consumer AI surfaces, headless: the answer each
 * surface gave from a given country, with its citations and shopping cards,
 * and — given a store — literal evidence of where that store shows up.
 * Guarded by the static dev access code rather than a session, because the
 * caller is a script or chat surface with no cookie jar. The session-guarded
 * twin that backs the /dev/llm-scraping sandbox is /api/dev/llm-scraping.
 */
export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const denied = guard(request, url);
  if (denied) return denied;

  const parameters = url.searchParams;

  return run({
    prompt: readString(parameters.get("prompt") ?? parameters.get("q")),
    providers: readList([
      ...parameters.getAll("provider"),
      ...parameters.getAll("providers"),
      ...parameters.getAll("surface"),
    ]),
    country: readString(parameters.get("country") ?? parameters.get("region")),
    store: readString(parameters.get("store") ?? parameters.get("domain")),
    brand: readString(parameters.get("brand")),
    fresh: readFlag(parameters.get("fresh")),
    format: readString(parameters.get("format")),
    raw: readFlag(parameters.get("raw")),
  });
};

export const POST = async (request: Request) => {
  const url = new URL(request.url);
  const denied = guard(request, url);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    prompt?: unknown;
    q?: unknown;
    provider?: unknown;
    providers?: unknown;
    surface?: unknown;
    country?: unknown;
    region?: unknown;
    store?: unknown;
    domain?: unknown;
    brand?: unknown;
    fresh?: unknown;
    format?: unknown;
    raw?: unknown;
  } | null;

  if (!body || typeof body !== "object" || Array.isArray(body))
    return text(`Body must be a JSON object.\n\n${USAGE}`, 400);

  // A field of the wrong type must not quietly fall back to a default — that
  // would bill a capture for a country or store the caller never asked for.
  const isText = (value: unknown) =>
    value === undefined || value === null || typeof value === "string";

  const misTyped = [
    ...TEXT_FIELDS.filter((field) => !isText(body[field])),
    ...LIST_FIELDS.filter((field) => {
      const value = body[field];
      return !(
        isText(value) ||
        (Array.isArray(value) &&
          value.every((entry) => typeof entry === "string"))
      );
    }),
    ...FLAG_FIELDS.filter(
      (field) => !(isText(body[field]) || typeof body[field] === "boolean"),
    ),
  ];

  if (misTyped.length > 0)
    return text(
      `Wrong type for ${misTyped.map((field) => `\`${field}\``).join(", ")} — text fields take a string, provider fields a string or string array, flags a boolean.`,
      400,
    );

  return run({
    prompt: readString(body.prompt ?? body.q),
    providers: readList([
      ...readList(body.provider),
      ...readList(body.providers),
      ...readList(body.surface),
    ]),
    country: readString(body.country ?? body.region),
    store: readString(body.store ?? body.domain),
    brand: readString(body.brand),
    fresh: readFlag(body.fresh),
    format: readString(body.format ?? url.searchParams.get("format")),
    raw: readFlag(body.raw ?? url.searchParams.get("raw")),
  });
};
