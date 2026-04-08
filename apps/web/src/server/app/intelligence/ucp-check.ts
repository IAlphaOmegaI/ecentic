"use server";

import { resultify } from "@zenncore/utils";

export type SpecIssueSeverity = "error" | "warning";

export type SpecIssue = {
  field: string;
  message: string;
  severity: SpecIssueSeverity;
};

export type RobotBotStatus = {
  botId: string;
  label: string;
  description: string;
  allowed: boolean;
};

export type UcpCheckResult = {
  domain: string;
  url: string;
  https: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  found: boolean;
  valid: boolean;
  contentType: string | null;
  data: unknown | null;
  specIssues: SpecIssue[];
  robots: RobotBotStatus[];
  error: string | null;
};

const AI_BOTS = [
  { botId: "GPTBot", label: "GPTBot", description: "OpenAI / ChatGPT" },
  {
    botId: "Google-Extended",
    label: "Google-Extended",
    description: "Gemini / Google",
  },
  { botId: "ClaudeBot", label: "ClaudeBot", description: "Claude / Anthropic" },
  {
    botId: "AppleBot-Extended",
    label: "AppleBot-Extended",
    description: "Apple Intelligence",
  },
  { botId: "CCBot", label: "CCBot", description: "Common Crawl" },
] as const;

type RobotsBlock = {
  agents: string[];
  disallows: string[];
  allows: string[];
};

const parseRobotsTxt = (text: string): RobotsBlock[] => {
  const blocks: RobotsBlock[] = [];
  let current: RobotsBlock | null = null;

  for (const rawLine of text.split("\n")) {
    const line = (rawLine.split("#")[0] ?? "").trim();
    if (!line) {
      if (current) {
        blocks.push(current);
        current = null;
      }
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === "user-agent") {
      if (!current) {
        current = { agents: [], disallows: [], allows: [] };
      } else if (current.disallows.length > 0 || current.allows.length > 0) {
        blocks.push(current);
        current = { agents: [], disallows: [], allows: [] };
      }
      current.agents.push(value.toLowerCase());
    } else if (directive === "disallow" && current) {
      current.disallows.push(value);
    } else if (directive === "allow" && current) {
      current.allows.push(value);
    }
  }

  if (current) blocks.push(current);
  return blocks;
};

const isBotAllowed = (botId: string, blocks: RobotsBlock[]): boolean => {
  const botLower = botId.toLowerCase();
  const specific = blocks.find((b) => b.agents.includes(botLower));
  const wildcard = blocks.find((b) => b.agents.includes("*"));

  const blocksAll = (block: RobotsBlock) =>
    block.disallows.some((d) => d === "/" || d === "") &&
    !block.allows.some((a) => a === "/");

  if (specific) return !blocksAll(specific);
  if (wildcard) return !blocksAll(wildcard);
  return true;
};

const checkRobots = async (cleaned: string): Promise<RobotBotStatus[]> => {
  const result = await resultify(() =>
    fetch(`https://${cleaned}/robots.txt`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      headers: { "User-Agent": "UCP-Validator/1.0" },
    }),
  );

  if (!result.success) {
    return AI_BOTS.map((bot) => ({ ...bot, allowed: true }));
  }

  const text = await resultify(() => result.data.text());
  if (!text.success || !result.data.ok) {
    return AI_BOTS.map((bot) => ({ ...bot, allowed: true }));
  }

  const blocks = parseRobotsTxt(text.data);
  return AI_BOTS.map((bot) => ({
    ...bot,
    allowed: isBotAllowed(bot.botId, blocks),
  }));
};

// Based on https://ucp.dev/schemas/ucp.json (business_schema variant)
// The /.well-known/ucp profile is a FLAT object — no "ucp" wrapper.
// Required at root: version, services, payment_handlers
// Optional at root: capabilities, supported_versions, status, signing_keys

const VERSION_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_RE = /^https:\/\//;
// Reverse-domain key pattern: e.g. dev.ucp.shopping.checkout
const REVERSE_DOMAIN_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;
const VALID_TRANSPORTS = ["rest", "mcp", "a2a", "embedded"] as const;
const VALID_STATUSES = ["success", "error"] as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const get = (obj: Record<string, unknown>, key: string) => obj[key];

const issue = (
  field: string,
  message: string,
  severity: SpecIssueSeverity,
): SpecIssue => ({ field, message, severity });

// Validates each entry in services / capabilities / payment_handlers registries.
// Returns issues for that entry.
const validateEntityArray = (
  entries: unknown,
  prefix: string,
  requiredFields: string[],
): SpecIssue[] => {
  const issues: SpecIssue[] = [];
  if (!Array.isArray(entries)) {
    issues.push(issue(`${prefix}`, `"${prefix}" must be an array.`, "error"));
    return issues;
  }
  for (const [index, entry] of entries.entries()) {
    const p = `${prefix}[${index}]`;
    if (!isObject(entry)) {
      issues.push(issue(p, "Each entry must be an object.", "error"));
      continue;
    }
    // version is required by entity base
    const version = get(entry, "version");
    if (!version) {
      issues.push(
        issue(`${p}.version`, 'Missing required "version".', "error"),
      );
    } else if (typeof version === "string" && !VERSION_RE.test(version)) {
      issues.push(
        issue(
          `${p}.version`,
          `"version" must be YYYY-MM-DD (got "${version}").`,
          "warning",
        ),
      );
    }
    for (const field of requiredFields) {
      if (!get(entry, field))
        issues.push(
          issue(`${p}.${field}`, `Missing required "${field}".`, "error"),
        );
    }
  }
  return issues;
};

// Validates service entries (transport, endpoint rules on top of entity base).
const validateServiceArray = (
  entries: unknown,
  prefix: string,
): SpecIssue[] => {
  const issues = validateEntityArray(entries, prefix, []);
  if (!Array.isArray(entries)) return issues;
  for (const [index, entry] of entries.entries()) {
    if (!isObject(entry)) continue;
    const p = `${prefix}[${index}]`;
    const transport = get(entry, "transport");
    if (!transport) {
      issues.push(
        issue(`${p}.transport`, 'Missing required "transport".', "error"),
      );
    } else if (
      !VALID_TRANSPORTS.includes(transport as (typeof VALID_TRANSPORTS)[number])
    ) {
      issues.push(
        issue(
          `${p}.transport`,
          `"transport" must be one of: ${VALID_TRANSPORTS.join(", ")} (got "${transport}").`,
          "warning",
        ),
      );
    }
    const endpoint = get(entry, "endpoint");
    if (
      transport !== "embedded" &&
      typeof endpoint === "string" &&
      !HTTPS_RE.test(endpoint)
    ) {
      issues.push(
        issue(
          `${p}.endpoint`,
          `Endpoint must use HTTPS (got "${endpoint}").`,
          "error",
        ),
      );
    }
  }
  return issues;
};

const validateRegistry = (
  registry: unknown,
  field: string,
  validateEntries: (entries: unknown, prefix: string) => SpecIssue[],
): SpecIssue[] => {
  const issues: SpecIssue[] = [];
  if (!isObject(registry)) {
    issues.push(issue(field, `"${field}" must be an object.`, "error"));
    return issues;
  }
  for (const [name, entries] of Object.entries(registry)) {
    if (!REVERSE_DOMAIN_RE.test(name)) {
      issues.push(
        issue(
          `${field}.${name}`,
          `Key "${name}" should use reverse-domain format (e.g. dev.ucp.shopping.checkout).`,
          "warning",
        ),
      );
    }
    issues.push(...validateEntries(entries, `${field}.${name}`));
  }
  return issues;
};

const validateUcpSpec = (data: unknown): SpecIssue[] => {
  const issues: SpecIssue[] = [];

  if (!isObject(data)) {
    issues.push(issue("(root)", "Root must be a JSON object.", "error"));
    return issues;
  }

  // Support both flat { version, ... } and wrapped { ucp: { version, ... } }
  const root: Record<string, unknown> = isObject(get(data, "ucp"))
    ? (get(data, "ucp") as Record<string, unknown>)
    : data;

  // ── version (required) ──────────────────────────────────────────────────────
  const version = get(root, "version");
  if (!version) {
    issues.push(issue("version", 'Missing required field "version".', "error"));
  } else if (typeof version !== "string") {
    issues.push(issue("version", '"version" must be a string.', "error"));
  } else if (!VERSION_RE.test(version)) {
    issues.push(
      issue(
        "version",
        `"version" must be YYYY-MM-DD (got "${version}").`,
        "warning",
      ),
    );
  }

  // ── status (optional) ───────────────────────────────────────────────────────
  const status = get(root, "status");
  if (
    status !== undefined &&
    !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
  ) {
    issues.push(
      issue(
        "status",
        `"status" must be "success" or "error" (got "${status}").`,
        "error",
      ),
    );
  }

  // ── services (required) ─────────────────────────────────────────────────────
  if (!("services" in root)) {
    issues.push(
      issue("services", 'Missing required field "services".', "error"),
    );
  } else {
    issues.push(
      ...validateRegistry(
        get(root, "services"),
        "services",
        validateServiceArray,
      ),
    );
  }

  // ── payment_handlers (required) ─────────────────────────────────────────────
  if (!("payment_handlers" in root)) {
    issues.push(
      issue(
        "payment_handlers",
        'Missing required field "payment_handlers".',
        "error",
      ),
    );
  } else {
    issues.push(
      ...validateRegistry(
        get(root, "payment_handlers"),
        "payment_handlers",
        (entries, prefix) => validateEntityArray(entries, prefix, []),
      ),
    );
  }

  // ── capabilities (optional) ─────────────────────────────────────────────────
  if ("capabilities" in root) {
    issues.push(
      ...validateRegistry(
        get(root, "capabilities"),
        "capabilities",
        // business_schema requires spec + schema on each capability entry
        (entries, prefix) =>
          validateEntityArray(entries, prefix, ["spec", "schema"]),
      ),
    );
  }

  // ── supported_versions (optional) ───────────────────────────────────────────
  const supportedVersions = get(root, "supported_versions");
  if (supportedVersions !== undefined) {
    if (!isObject(supportedVersions)) {
      issues.push(
        issue(
          "supported_versions",
          '"supported_versions" must be an object.',
          "error",
        ),
      );
    } else {
      for (const [key, uri] of Object.entries(supportedVersions)) {
        if (!VERSION_RE.test(key)) {
          issues.push(
            issue(
              `supported_versions.${key}`,
              `Key "${key}" must be a YYYY-MM-DD version string.`,
              "warning",
            ),
          );
        }
        if (typeof uri !== "string" || !HTTPS_RE.test(uri)) {
          issues.push(
            issue(
              `supported_versions.${key}`,
              "Value must be an HTTPS URI pointing to that version's profile.",
              "error",
            ),
          );
        }
      }
    }
  }

  // ── signing_keys (optional) ─────────────────────────────────────────────────
  const signingKeys = get(root, "signing_keys");
  if (signingKeys !== undefined) {
    if (!Array.isArray(signingKeys)) {
      issues.push(
        issue("signing_keys", '"signing_keys" must be an array.', "error"),
      );
    } else {
      for (const [index, key] of signingKeys.entries()) {
        if (!isObject(key)) continue;
        if (!get(key, "kty"))
          issues.push(
            issue(
              `signing_keys[${index}].kty`,
              'JWK entry missing required "kty".',
              "error",
            ),
          );
      }
    }
  }

  return issues;
};

export const checkUCP = async (
  domain: string,
): Promise<
  { success: true; data: UcpCheckResult } | { success: false; error: string }
> => {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!cleaned) return { success: false, error: "Please enter a domain." };

  const url = `https://${cleaned}/.well-known/ucp`;
  const startedAt = performance.now();

  // The UCP spec (https://ucp.dev) requires agents to identify themselves via
  // the UCP-Agent header. Many CDNs gate on this header to distinguish AI
  // commerce agents from generic bots.
  const [result, robots] = await Promise.all([
    resultify(() =>
      fetch(url, {
        headers: {
          Accept: "application/json, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "UCP-Agent": 'profile="https://ecentic.com/ucp-validator"',
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      }),
    ),
    checkRobots(cleaned),
  ]);

  if (!result.success) {
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus: null,
        latencyMs: null,
        found: false,
        valid: false,
        contentType: null,
        data: null,
        specIssues: [],
        robots,
        error: "Could not reach the domain or /.well-known/ucp endpoint.",
      },
    };
  }

  const response = result.data;
  const latencyMs = Math.round(performance.now() - startedAt);
  const httpStatus = response.status;
  const contentType = response.headers.get("content-type");

  const text = await resultify(() => response.text());
  if (!text.success) {
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus,
        latencyMs,
        found: false,
        valid: false,
        contentType,
        data: null,
        specIssues: [],
        robots,
        error: `Endpoint returned HTTP ${httpStatus} and body could not be read.`,
      },
    };
  }

  // Parse regardless of HTTP status — some CDNs (e.g. Akamai + Azure Blob)
  // serve the UCP file with a non-200 status but a valid JSON body.
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text.data);
  } catch {
    // not valid JSON
  }

  if (parsed !== null) {
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus,
        latencyMs,
        found: true,
        valid: true,
        contentType,
        data: parsed,
        specIssues: validateUcpSpec(parsed),
        robots,
        error: null,
      },
    };
  }

  return {
    success: true,
    data: {
      domain: cleaned,
      url,
      https: true,
      httpStatus,
      latencyMs,
      found: false,
      valid: false,
      contentType,
      data: null,
      specIssues: [],
      robots,
      error: response.ok
        ? "Response is not valid JSON."
        : `Endpoint returned HTTP ${httpStatus} with no parseable JSON body.`,
    },
  };
};
