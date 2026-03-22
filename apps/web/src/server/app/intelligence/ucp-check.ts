"use server";

import { resultify } from "@zenncore/utils";

export type SpecIssueSeverity = "error" | "warning";

export type SpecIssue = {
  field: string;
  message: string;
  severity: SpecIssueSeverity;
};

export type UcpCheckResult = {
  domain: string;
  url: string;
  https: boolean;
  httpStatus: number | null;
  found: boolean;
  valid: boolean;
  contentType: string | null;
  data: unknown | null;
  specIssues: SpecIssue[];
  error: string | null;
};

const VERSION_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_RE = /^https:\/\//;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const get = (obj: Record<string, unknown>, key: string) => obj[key];

const validateUcpSpec = (data: unknown): SpecIssue[] => {
  const issues: SpecIssue[] = [];

  if (!isObject(data)) {
    issues.push({
      field: "(root)",
      message: "Root must be a JSON object.",
      severity: "error",
    });
    return issues;
  }

  if (!("ucp" in data)) {
    issues.push({
      field: "ucp",
      message: 'Missing required field "ucp".',
      severity: "error",
    });
    return issues;
  }

  if (!isObject(get(data, "ucp"))) {
    issues.push({
      field: "ucp",
      message: '"ucp" must be an object.',
      severity: "error",
    });
    return issues;
  }

  const ucp = get(data, "ucp") as Record<string, unknown>;

  const version = get(ucp, "version");
  if (version === undefined) {
    issues.push({
      field: "ucp.version",
      message: 'Missing required field "ucp.version".',
      severity: "error",
    });
  } else if (typeof version !== "string") {
    issues.push({
      field: "ucp.version",
      message: '"ucp.version" must be a string.',
      severity: "error",
    });
  } else if (!VERSION_RE.test(version)) {
    issues.push({
      field: "ucp.version",
      message: `"ucp.version" should be in YYYY-MM-DD format (got "${version}").`,
      severity: "warning",
    });
  }

  if ("services" in ucp) {
    const services = get(ucp, "services");
    if (!isObject(services)) {
      issues.push({
        field: "ucp.services",
        message: '"ucp.services" must be an object.',
        severity: "error",
      });
    } else {
      for (const [name, entries] of Object.entries(services)) {
        if (!Array.isArray(entries)) {
          issues.push({
            field: `ucp.services.${name}`,
            message: `Service "${name}" must be an array of service definitions.`,
            severity: "error",
          });
          continue;
        }
        for (const [index, entry] of entries.entries()) {
          const prefix = `ucp.services.${name}[${index}]`;
          if (!isObject(entry)) {
            issues.push({
              field: prefix,
              message: "Each service definition must be an object.",
              severity: "error",
            });
            continue;
          }
          if (!get(entry, "version"))
            issues.push({
              field: `${prefix}.version`,
              message: 'Missing "version" in service definition.',
              severity: "error",
            });
          if (!get(entry, "spec"))
            issues.push({
              field: `${prefix}.spec`,
              message: 'Missing "spec" in service definition.',
              severity: "error",
            });
          const transport = get(entry, "transport");
          if (!transport) {
            issues.push({
              field: `${prefix}.transport`,
              message: 'Missing "transport" in service definition.',
              severity: "error",
            });
          } else if (
            !["rest", "mcp", "a2a", "embedded"].includes(transport as string)
          ) {
            issues.push({
              field: `${prefix}.transport`,
              message: `"transport" must be one of: rest, mcp, a2a, embedded (got "${transport}").`,
              severity: "warning",
            });
          }
          const endpoint = get(entry, "endpoint");
          if (
            transport !== "embedded" &&
            typeof endpoint === "string" &&
            !HTTPS_RE.test(endpoint)
          ) {
            issues.push({
              field: `${prefix}.endpoint`,
              message: `Endpoint URL must use HTTPS (got "${endpoint}").`,
              severity: "error",
            });
          }
        }
      }
    }
  }

  // capabilities
  if ("capabilities" in ucp) {
    const capabilities = get(ucp, "capabilities");
    if (!isObject(capabilities)) {
      issues.push({
        field: "ucp.capabilities",
        message: '"ucp.capabilities" must be an object.',
        severity: "error",
      });
    } else {
      for (const [name, entries] of Object.entries(capabilities)) {
        if (!Array.isArray(entries)) {
          issues.push({
            field: `ucp.capabilities.${name}`,
            message: `Capability "${name}" must be an array of capability definitions.`,
            severity: "error",
          });
          continue;
        }
        for (const [index, entry] of entries.entries()) {
          const prefix = `ucp.capabilities.${name}[${index}]`;
          if (!isObject(entry)) continue;
          if (!get(entry, "spec"))
            issues.push({
              field: `${prefix}.spec`,
              message: 'Missing required "spec" in capability definition.',
              severity: "error",
            });
          if (!get(entry, "schema"))
            issues.push({
              field: `${prefix}.schema`,
              message: 'Missing required "schema" in capability definition.',
              severity: "error",
            });
        }
      }
    }
  }

  // signing_keys
  const signingKeys = get(data, "signing_keys");
  if (signingKeys !== undefined) {
    if (!Array.isArray(signingKeys)) {
      issues.push({
        field: "signing_keys",
        message: '"signing_keys" must be an array.',
        severity: "error",
      });
    } else {
      for (const [index, key] of signingKeys.entries()) {
        if (!isObject(key)) continue;
        if (!get(key, "kty"))
          issues.push({
            field: `signing_keys[${index}].kty`,
            message: 'JWK entry missing required "kty" field.',
            severity: "error",
          });
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

  // The UCP spec (https://ucp.dev) requires agents to identify themselves via
  // the UCP-Agent header. Many CDNs gate on this header to distinguish AI
  // commerce agents from generic bots.
  const result = await resultify(() =>
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
  );

  if (!result.success) {
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus: null,
        found: false,
        valid: false,
        contentType: null,
        data: null,
        specIssues: [],
        error: "Could not reach the domain or /.well-known/ucp endpoint.",
      },
    };
  }

  const response = result.data;
  const httpStatus = response.status;
  const contentType = response.headers.get("content-type");

  const textResult = await resultify(() => response.text());
  if (!textResult.success) {
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus,
        found: false,
        valid: false,
        contentType,
        data: null,
        specIssues: [],
        error: `Endpoint returned HTTP ${httpStatus} and body could not be read.`,
      },
    };
  }

  // Parse regardless of HTTP status — some CDNs (e.g. Akamai + Azure Blob)
  // serve the UCP file with a non-200 status but a valid JSON body.
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(textResult.data);
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
        found: true,
        valid: true,
        contentType,
        data: parsed,
        specIssues: validateUcpSpec(parsed),
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
      found: false,
      valid: false,
      contentType,
      data: null,
      specIssues: [],
      error: response.ok
        ? "Response is not valid JSON."
        : `Endpoint returned HTTP ${httpStatus} with no parseable JSON body.`,
    },
  };
};
