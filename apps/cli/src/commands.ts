/**
 * Everything the CLI decides before it touches the network.
 *
 * Argument parsing, request planning, and output formatting are pure functions
 * here so they can be tested without a server, and so `cli.ts` is left with
 * nothing but I/O.
 */

export const DEFAULT_HOST = "https://ecentic.ai";

export type Command = {
  name: string;
  summary: string;
  /** Path relative to the host, or a builder when the path takes arguments. */
  path: string;
};

export const COMMANDS: readonly Command[] = [
  { name: "api", summary: "Index of the public agent API.", path: "/api/v1" },
  {
    name: "discovery",
    summary: "Every protocol and machine-readable document ecentic publishes.",
    path: "/api/v1/discovery",
  },
  { name: "plans", summary: "Public plan catalog.", path: "/api/v1/plans" },
  {
    name: "skills",
    summary: "Published agent skills.",
    path: "/api/v1/skills",
  },
  {
    name: "onboarding",
    summary: "Zero-auth guarantees, each with a URL that proves it.",
    path: "/api/v1/onboarding",
  },
  {
    name: "sandbox",
    summary: "Zero-auth sandbox: what it offers, its limits, its caveats.",
    path: "/api/v1/sandbox",
  },
  { name: "health", summary: "Service health.", path: "/api/v1/health" },
  {
    name: "openapi",
    summary: "OpenAPI 3.1 document for the public API.",
    path: "/openapi.json",
  },
] as const;

export type Options = {
  host: string;
  apiKey: string | null;
  pretty: boolean;
};

export type Plan =
  | { kind: "help"; text: string }
  | { kind: "version" }
  | { kind: "error"; message: string }
  | {
      kind: "request";
      method: "GET" | "POST";
      url: string;
      headers: Record<string, string>;
      body?: string;
    };

const flagValue = (argv: readonly string[], flag: string) => {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
};

export const parseOptions = (
  argv: readonly string[],
  environment: Record<string, string | undefined> = {},
): Options => ({
  host: (flagValue(argv, "--host") ?? environment.ECENTIC_HOST ?? DEFAULT_HOST)
    // A trailing slash turns every path into a double slash, which some CDNs
    // answer with a redirect the CLI would then have to follow.
    .replace(/\/+$/, ""),
  apiKey: flagValue(argv, "--api-key") ?? environment.ECENTIC_API_KEY ?? null,
  pretty: !argv.includes("--raw"),
});

export const HELP = `ecentic — command line interface for the ecentic agent API

Usage
  ecentic <command> [options]

Commands
${COMMANDS.map((command) => `  ${command.name.padEnd(11)}${command.summary}`).join("\n")}
  simulate <json>      Run a sandbox simulation. No account, no credential.
  mcp <method> [json]  Call the MCP endpoint (JSON-RPC 2.0).
  tools                Shorthand for: mcp tools/list

Options
  --host <url>     Override the API host (default ${DEFAULT_HOST}).
  --api-key <key>  Bearer key for authenticated calls. Defaults to $ECENTIC_API_KEY.
  --raw            Print compact JSON instead of indented JSON.
  --help, -h       Show this help.
  --version, -v    Show the CLI version.

Environment
  ECENTIC_API_KEY  Bearer key used when --api-key is absent.
  ECENTIC_HOST     Host used when --host is absent.

Examples
  ecentic discovery
  ecentic plans | jq '.plans[] | {key, price}'
  ecentic tools
  ecentic simulate '{"product":{"title":"Alpine Down Jacket"},"competitors":[{"title":"Summit Puffer"}]}'
  ecentic mcp tools/call '{"name":"list_plans","arguments":{}}'

Documentation: ${DEFAULT_HOST}/docs
`;

const USER_AGENT = "ecentic-cli";

/**
 * Turns an argv into exactly one of: help, version, an error, or a single HTTP
 * request. Nothing else — a command that needed two round trips would hide a
 * failure between them.
 */
export const plan = (
  argv: readonly string[],
  environment: Record<string, string | undefined> = {},
  version = "0.0.0",
): Plan => {
  if (argv.includes("--help") || argv.includes("-h"))
    return { kind: "help", text: HELP };

  if (argv.includes("--version") || argv.includes("-v"))
    return { kind: "version" };

  const [name, ...rest] = argv.filter((argument) => !argument.startsWith("-"));

  if (!name) return { kind: "help", text: HELP };

  const options = parseOptions(argv, environment);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": `${USER_AGENT}/${version}`,
    ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
  };

  if (name === "simulate") {
    const [rawPayload] = rest;
    if (!rawPayload)
      return {
        kind: "error",
        message:
          'simulate needs a JSON payload, e.g. `ecentic simulate \'{"product":{"title":"A"},"competitors":[{"title":"B"}]}\'`.',
      };

    const payload = (() => {
      try {
        return JSON.parse(rawPayload) as unknown;
      } catch {
        return null;
      }
    })();

    if (payload === null)
      return {
        kind: "error",
        message: `Could not parse payload as JSON: ${rawPayload}`,
      };

    return {
      kind: "request",
      method: "POST",
      url: `${options.host}/api/v1/sandbox/simulation`,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  }

  if (name === "mcp" || name === "tools") {
    const method = name === "tools" ? "tools/list" : rest[0];
    if (!method)
      return {
        kind: "error",
        message: "mcp needs a JSON-RPC method, e.g. `ecentic mcp tools/list`.",
      };

    const rawParams = name === "tools" ? undefined : rest[1];
    const params = (() => {
      if (!rawParams) return {};
      try {
        return JSON.parse(rawParams) as unknown;
      } catch {
        return null;
      }
    })();

    if (params === null)
      return {
        kind: "error",
        message: `Could not parse params as JSON: ${rawParams}`,
      };

    return {
      kind: "request",
      method: "POST",
      url: `${options.host}/api/mcp`,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    };
  }

  const command = COMMANDS.find((entry) => entry.name === name);

  if (!command)
    return {
      kind: "error",
      message: `Unknown command: ${name}\n\nRun \`ecentic --help\` for the list.`,
    };

  return {
    kind: "request",
    method: "GET",
    url: `${options.host}${command.path}`,
    headers,
  };
};

/** Longest non-problem body worth echoing before it is just noise. */
const FAILURE_EXCERPT = 400;

/**
 * A failed call is printed as the problem document it is, with the resolution
 * hint the API sent — an agent shelling out to this CLI gets the same guidance
 * an HTTP client would.
 *
 * A body that is not a problem document gets an excerpt, not the whole thing.
 * Pointing the CLI at a host that answers HTML would otherwise dump a full
 * error page into the terminal, burying the status line that actually matters.
 */
export const formatFailure = (status: number, payload: unknown) => {
  const problem = payload as
    | { code?: string; detail?: string; resolution?: string; title?: string }
    | undefined;

  if (!problem?.code) {
    const rendered =
      typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    const excerpt =
      rendered.length > FAILURE_EXCERPT
        ? `${rendered.slice(0, FAILURE_EXCERPT)}… (${rendered.length - FAILURE_EXCERPT} more characters)`
        : rendered;

    return `Request failed with HTTP ${status}\n${excerpt}`;
  }

  return [
    `HTTP ${status} — ${problem.title ?? problem.code}`,
    `  code:       ${problem.code}`,
    problem.detail ? `  detail:     ${problem.detail}` : null,
    problem.resolution ? `  resolution: ${problem.resolution}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
};

export const formatBody = (payload: unknown, pretty: boolean) =>
  pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);

/**
 * Rate-limit state, restated on stderr so a script can see it without parsing
 * headers and without it polluting the JSON on stdout.
 */
export const formatRateLimit = (headers: Headers) => {
  const remaining = headers.get("ratelimit-remaining");
  const reset = headers.get("ratelimit-reset");
  if (remaining === null) return null;
  return `rate limit: ${remaining} remaining, resets in ${reset ?? "?"}s`;
};
