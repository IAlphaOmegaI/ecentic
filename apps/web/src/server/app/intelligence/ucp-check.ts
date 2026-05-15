"use server";

import { resultify } from "@zenncore/utils";

export type SpecIssueSeverity = "error" | "warning";

export type SpecIssueCategory =
  | "envelope"
  | "version"
  | "services"
  | "capabilities"
  | "payment_handlers"
  | "signing_keys"
  | "supported_versions"
  | "transport"
  | "security";

export type SpecIssue = {
  field: string;
  message: string;
  severity: SpecIssueSeverity;
  category: SpecIssueCategory;
};

export type RobotBotStatus = {
  botId: string;
  label: string;
  description: string;
  allowed: boolean;
};

export type ParsedService = {
  name: string;
  label: string;
  version: string | null;
  transport: string | null;
  endpoint: string | null;
  schema: string | null;
  recognized: boolean;
};

export type ParsedCapability = {
  name: string;
  label: string;
  version: string | null;
  spec: string | null;
  schema: string | null;
  config: Record<string, unknown> | null;
  recognized: boolean;
};

export type ParsedPaymentHandler = {
  registryKey: string;
  label: string;
  id: string | null;
  version: string | null;
  recognized: boolean;
};

export type ParsedSigningKey = {
  kid: string | null;
  kty: string | null;
  use: string | null;
  crv: string | null;
  alg: string | null;
  isSigning: boolean;
  hasPrivateMaterial: boolean;
};

export type ParsedSupportedVersion = {
  version: string;
  uri: string;
  isCurrent: boolean;
  isHttps: boolean;
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
  ucpVersion: string | null;
  isLatestVersion: boolean;
  envelopeKind: "wrapped" | "flat" | null;
  services: ParsedService[];
  capabilities: ParsedCapability[];
  paymentHandlers: ParsedPaymentHandler[];
  signingKeys: ParsedSigningKey[];
  supportedVersions: ParsedSupportedVersion[];
  signingKeysAdvertised: boolean;
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

// ─── UCP spec validation (2026-04-08) ───────────────────────────────────────
// Reference: https://ucp.dev — UCP profile is served at /.well-known/ucp.
// We support both the flat shape ({ version, services, ... }) and the wrapped
// envelope ({ ucp: { ... }, signing_keys: [...] }) because the spec uses the
// wrapped form in canonical examples while business_schema.json defines a flat
// shape. Real-world stores ship both today.

const LATEST_UCP_VERSION = "2026-04-08";
const VERSION_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_RE = /^https:\/\//i;
const HTTP_OR_HTTPS_RE = /^https?:\/\//i;
const REVERSE_DOMAIN_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;

const VALID_TRANSPORTS = ["rest", "mcp", "a2a", "embedded"] as const;
const VALID_STATUSES = ["success", "error"] as const;
const VALID_JWK_KTY = ["EC", "RSA", "OKP", "oct"] as const;
const VALID_EC_CURVES = ["P-256", "P-384", "P-521"] as const;
const VALID_JWS_ALG_BY_KTY: Record<string, readonly string[]> = {
  EC: ["ES256", "ES384", "ES512"],
  RSA: ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512"],
  OKP: ["EdDSA"],
  oct: ["HS256", "HS384", "HS512"],
};
const JWK_PRIVATE_FIELDS = ["d", "p", "q", "dp", "dq", "qi", "k"] as const;

const KNOWN_SERVICES: Record<string, string> = {
  "dev.ucp.shopping": "Shopping",
  "dev.ucp.identity": "Identity",
  "dev.ucp.common": "Common",
};

const KNOWN_CAPABILITIES: Record<
  string,
  { label: string; requiresConfig?: string[] }
> = {
  "dev.ucp.shopping.checkout": { label: "Checkout" },
  "dev.ucp.shopping.cart": { label: "Cart" },
  "dev.ucp.shopping.order": {
    label: "Order",
    requiresConfig: ["webhook_url"],
  },
  "dev.ucp.shopping.catalog.search": { label: "Catalog · Search" },
  "dev.ucp.shopping.catalog.lookup": { label: "Catalog · Lookup" },
  "dev.ucp.shopping.tokenizer": { label: "Payment Tokenizer" },
  "dev.ucp.common.identity_linking": { label: "Identity Linking (OAuth 2.0)" },
};

const KNOWN_PAYMENT_HANDLERS: Record<string, string> = {
  "com.google.pay": "Google Pay",
  "com.apple.pay": "Apple Pay",
  "com.paypal": "PayPal",
  "com.stripe": "Stripe",
  "com.braintree": "Braintree",
  "com.klarna": "Klarna",
  "com.afterpay": "Afterpay",
  "com.affirm": "Affirm",
  "dev.shopify.shop_pay": "Shop Pay",
  "dev.shopify.card": "Shopify Card",
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const get = (object: Record<string, unknown>, key: string): unknown =>
  object[key];

const issue = (
  category: SpecIssueCategory,
  field: string,
  message: string,
  severity: SpecIssueSeverity,
): SpecIssue => ({ category, field, message, severity });

const validateVersionField = (
  value: unknown,
  field: string,
  category: SpecIssueCategory,
  issues: SpecIssue[],
): string | null => {
  if (value === undefined || value === null) {
    issues.push(
      issue(category, field, `Missing required "${field}".`, "error"),
    );
    return null;
  }
  if (typeof value !== "string") {
    issues.push(
      issue(category, field, `"${field}" must be a string.`, "error"),
    );
    return null;
  }
  if (!VERSION_RE.test(value)) {
    issues.push(
      issue(
        category,
        field,
        `"${field}" must be a YYYY-MM-DD calendar version (got "${value}").`,
        "warning",
      ),
    );
  }
  return value;
};

const validateHttpsField = (
  value: unknown,
  field: string,
  category: SpecIssueCategory,
  issues: SpecIssue[],
  required: boolean,
): string | null => {
  if (value === undefined || value === null) {
    if (required) {
      issues.push(
        issue(category, field, `Missing required "${field}".`, "error"),
      );
    }
    return null;
  }
  if (typeof value !== "string") {
    issues.push(
      issue(category, field, `"${field}" must be a string.`, "error"),
    );
    return null;
  }
  if (!HTTP_OR_HTTPS_RE.test(value)) {
    issues.push(
      issue(
        category,
        field,
        `"${field}" must be a URL (got "${value}").`,
        "error",
      ),
    );
    return value;
  }
  if (!HTTPS_RE.test(value)) {
    issues.push(
      issue(
        category,
        field,
        `"${field}" must use HTTPS (got "${value}").`,
        "error",
      ),
    );
  }
  return value;
};

const parseServiceEntries = (
  registry: unknown,
  issues: SpecIssue[],
): ParsedService[] => {
  if (!isObject(registry)) {
    issues.push(
      issue("services", "services", '"services" must be an object.', "error"),
    );
    return [];
  }

  const services: ParsedService[] = [];

  for (const [name, entries] of Object.entries(registry)) {
    if (!REVERSE_DOMAIN_RE.test(name)) {
      issues.push(
        issue(
          "services",
          `services.${name}`,
          `Key "${name}" should use reverse-domain format (e.g. dev.ucp.shopping).`,
          "warning",
        ),
      );
    }

    if (!Array.isArray(entries)) {
      issues.push(
        issue(
          "services",
          `services.${name}`,
          `"services.${name}" must be an array of service entries.`,
          "error",
        ),
      );
      continue;
    }

    if (entries.length === 0) {
      issues.push(
        issue(
          "services",
          `services.${name}`,
          `"services.${name}" must declare at least one entry.`,
          "warning",
        ),
      );
    }

    for (const [index, entry] of entries.entries()) {
      const path = `services.${name}[${index}]`;
      if (!isObject(entry)) {
        issues.push(
          issue("services", path, "Each entry must be an object.", "error"),
        );
        continue;
      }

      const version = validateVersionField(
        get(entry, "version"),
        `${path}.version`,
        "services",
        issues,
      );

      const rawTransport = get(entry, "transport");
      let transport: string | null = null;
      if (rawTransport === undefined || rawTransport === null) {
        issues.push(
          issue(
            "transport",
            `${path}.transport`,
            'Missing required "transport".',
            "error",
          ),
        );
      } else if (typeof rawTransport !== "string") {
        issues.push(
          issue(
            "transport",
            `${path}.transport`,
            '"transport" must be a string.',
            "error",
          ),
        );
      } else {
        transport = rawTransport;
        if (
          !VALID_TRANSPORTS.includes(
            rawTransport as (typeof VALID_TRANSPORTS)[number],
          )
        ) {
          issues.push(
            issue(
              "transport",
              `${path}.transport`,
              `"transport" must be one of: ${VALID_TRANSPORTS.join(", ")} (got "${rawTransport}").`,
              "warning",
            ),
          );
        }
      }

      const endpoint = (() => {
        const rawEndpoint = get(entry, "endpoint");
        if (transport === "embedded") {
          return typeof rawEndpoint === "string" ? rawEndpoint : null;
        }
        return validateHttpsField(
          rawEndpoint,
          `${path}.endpoint`,
          "services",
          issues,
          true,
        );
      })();

      const schema = validateHttpsField(
        get(entry, "schema"),
        `${path}.schema`,
        "services",
        issues,
        true,
      );

      services.push({
        name,
        label: KNOWN_SERVICES[name] ?? name,
        version,
        transport,
        endpoint,
        schema,
        recognized: name in KNOWN_SERVICES,
      });
    }
  }

  return services;
};

const parseCapabilityEntries = (
  registry: unknown,
  issues: SpecIssue[],
): ParsedCapability[] => {
  if (!isObject(registry)) {
    issues.push(
      issue(
        "capabilities",
        "capabilities",
        '"capabilities" must be an object.',
        "error",
      ),
    );
    return [];
  }

  const capabilities: ParsedCapability[] = [];

  for (const [name, entries] of Object.entries(registry)) {
    if (!REVERSE_DOMAIN_RE.test(name)) {
      issues.push(
        issue(
          "capabilities",
          `capabilities.${name}`,
          `Key "${name}" should use reverse-domain format (e.g. dev.ucp.shopping.checkout).`,
          "warning",
        ),
      );
    }

    if (!Array.isArray(entries)) {
      issues.push(
        issue(
          "capabilities",
          `capabilities.${name}`,
          `"capabilities.${name}" must be an array.`,
          "error",
        ),
      );
      continue;
    }

    if (entries.length === 0) {
      issues.push(
        issue(
          "capabilities",
          `capabilities.${name}`,
          `"capabilities.${name}" must declare at least one entry.`,
          "warning",
        ),
      );
    }

    const known = KNOWN_CAPABILITIES[name];

    for (const [index, entry] of entries.entries()) {
      const path = `capabilities.${name}[${index}]`;
      if (!isObject(entry)) {
        issues.push(
          issue("capabilities", path, "Each entry must be an object.", "error"),
        );
        continue;
      }

      const version = validateVersionField(
        get(entry, "version"),
        `${path}.version`,
        "capabilities",
        issues,
      );

      const spec =
        get(entry, "spec") === undefined
          ? null
          : validateHttpsField(
              get(entry, "spec"),
              `${path}.spec`,
              "capabilities",
              issues,
              false,
            );

      const schema =
        get(entry, "schema") === undefined
          ? null
          : validateHttpsField(
              get(entry, "schema"),
              `${path}.schema`,
              "capabilities",
              issues,
              false,
            );

      const rawConfig = get(entry, "config");
      const config = isObject(rawConfig) ? rawConfig : null;
      if (rawConfig !== undefined && !isObject(rawConfig)) {
        issues.push(
          issue(
            "capabilities",
            `${path}.config`,
            '"config" must be an object when present.',
            "error",
          ),
        );
      }

      if (known?.requiresConfig) {
        for (const requiredKey of known.requiresConfig) {
          const value = config?.[requiredKey];
          if (typeof value !== "string" || !HTTPS_RE.test(value)) {
            issues.push(
              issue(
                "capabilities",
                `${path}.config.${requiredKey}`,
                `Capability "${name}" requires "config.${requiredKey}" to be an HTTPS URL.`,
                "error",
              ),
            );
          }
        }
      }

      capabilities.push({
        name,
        label: known?.label ?? name,
        version,
        spec,
        schema,
        config,
        recognized: Boolean(known),
      });
    }
  }

  return capabilities;
};

const parsePaymentHandlerEntries = (
  registry: unknown,
  issues: SpecIssue[],
): ParsedPaymentHandler[] => {
  if (!isObject(registry)) {
    issues.push(
      issue(
        "payment_handlers",
        "payment_handlers",
        '"payment_handlers" must be an object.',
        "error",
      ),
    );
    return [];
  }

  const handlers: ParsedPaymentHandler[] = [];

  for (const [key, entries] of Object.entries(registry)) {
    if (!REVERSE_DOMAIN_RE.test(key)) {
      issues.push(
        issue(
          "payment_handlers",
          `payment_handlers.${key}`,
          `Key "${key}" should use reverse-domain format (e.g. com.stripe).`,
          "warning",
        ),
      );
    }

    if (!Array.isArray(entries)) {
      issues.push(
        issue(
          "payment_handlers",
          `payment_handlers.${key}`,
          `"payment_handlers.${key}" must be an array.`,
          "error",
        ),
      );
      continue;
    }

    for (const [index, entry] of entries.entries()) {
      const path = `payment_handlers.${key}[${index}]`;
      if (!isObject(entry)) {
        issues.push(
          issue(
            "payment_handlers",
            path,
            "Each entry must be an object.",
            "error",
          ),
        );
        continue;
      }

      const version = validateVersionField(
        get(entry, "version"),
        `${path}.version`,
        "payment_handlers",
        issues,
      );

      const idRaw = get(entry, "id");
      if (idRaw !== undefined && typeof idRaw !== "string") {
        issues.push(
          issue(
            "payment_handlers",
            `${path}.id`,
            '"id" must be a string.',
            "error",
          ),
        );
      }

      handlers.push({
        registryKey: key,
        label: KNOWN_PAYMENT_HANDLERS[key] ?? key,
        id: typeof idRaw === "string" ? idRaw : null,
        version,
        recognized: key in KNOWN_PAYMENT_HANDLERS,
      });
    }
  }

  return handlers;
};

const parseSigningKeyEntries = (
  rawKeys: unknown,
  issues: SpecIssue[],
): ParsedSigningKey[] => {
  if (!Array.isArray(rawKeys)) {
    issues.push(
      issue(
        "signing_keys",
        "signing_keys",
        '"signing_keys" must be an array of JWK entries.',
        "error",
      ),
    );
    return [];
  }

  const seenKids = new Set<string>();
  const keys: ParsedSigningKey[] = [];

  for (const [index, entry] of rawKeys.entries()) {
    const path = `signing_keys[${index}]`;
    if (!isObject(entry)) {
      issues.push(
        issue(
          "signing_keys",
          path,
          "Each entry must be a JWK object.",
          "error",
        ),
      );
      continue;
    }

    const rawKid = get(entry, "kid");
    const kid = typeof rawKid === "string" ? rawKid : null;
    if (!kid) {
      issues.push(
        issue(
          "signing_keys",
          `${path}.kid`,
          'JWK is missing required "kid" (Key ID).',
          "error",
        ),
      );
    } else if (seenKids.has(kid)) {
      issues.push(
        issue(
          "signing_keys",
          `${path}.kid`,
          `Duplicate "kid": "${kid}" already used.`,
          "error",
        ),
      );
    } else {
      seenKids.add(kid);
    }

    const rawKty = get(entry, "kty");
    const kty = typeof rawKty === "string" ? rawKty : null;
    if (!kty) {
      issues.push(
        issue(
          "signing_keys",
          `${path}.kty`,
          'JWK is missing required "kty" (Key Type).',
          "error",
        ),
      );
    } else if (!VALID_JWK_KTY.includes(kty as (typeof VALID_JWK_KTY)[number])) {
      issues.push(
        issue(
          "signing_keys",
          `${path}.kty`,
          `"kty" must be one of: ${VALID_JWK_KTY.join(", ")} (got "${kty}").`,
          "error",
        ),
      );
    }

    const rawUse = get(entry, "use");
    const use = typeof rawUse === "string" ? rawUse : null;
    if (use !== null && use !== "sig") {
      issues.push(
        issue(
          "signing_keys",
          `${path}.use`,
          `"use" must be "sig" for UCP message signing (got "${use}").`,
          "error",
        ),
      );
    } else if (use === null) {
      issues.push(
        issue(
          "signing_keys",
          `${path}.use`,
          'Recommended: set "use" to "sig" so verifiers know this key signs UCP messages.',
          "warning",
        ),
      );
    }

    const rawAlg = get(entry, "alg");
    const alg = typeof rawAlg === "string" ? rawAlg : null;
    if (!alg) {
      issues.push(
        issue(
          "signing_keys",
          `${path}.alg`,
          'Recommended: declare "alg" (e.g. "ES256") so signers and verifiers agree.',
          "warning",
        ),
      );
    } else if (kty) {
      const allowed = VALID_JWS_ALG_BY_KTY[kty];
      if (allowed && !allowed.includes(alg)) {
        issues.push(
          issue(
            "signing_keys",
            `${path}.alg`,
            `"alg" "${alg}" is not a JWS algorithm for "kty" "${kty}". Expected one of: ${allowed.join(", ")}.`,
            "error",
          ),
        );
      }
    }

    const rawCrv = get(entry, "crv");
    const crv = typeof rawCrv === "string" ? rawCrv : null;
    if (kty === "EC") {
      if (!crv) {
        issues.push(
          issue(
            "signing_keys",
            `${path}.crv`,
            'EC JWKs must declare "crv" (P-256, P-384, or P-521).',
            "error",
          ),
        );
      } else if (
        !VALID_EC_CURVES.includes(crv as (typeof VALID_EC_CURVES)[number])
      ) {
        issues.push(
          issue(
            "signing_keys",
            `${path}.crv`,
            `"crv" must be one of: ${VALID_EC_CURVES.join(", ")} (got "${crv}").`,
            "error",
          ),
        );
      }
    }

    const hasPrivateMaterial = JWK_PRIVATE_FIELDS.some(
      (field) => field in entry,
    );
    if (hasPrivateMaterial) {
      issues.push(
        issue(
          "signing_keys",
          path,
          "JWK appears to contain private key material (d/p/q/k). Only publish public keys at /.well-known/ucp.",
          "error",
        ),
      );
    }

    keys.push({
      kid,
      kty,
      use,
      crv,
      alg,
      isSigning: use === "sig" || use === null,
      hasPrivateMaterial,
    });
  }

  if (keys.length === 0) {
    issues.push(
      issue(
        "signing_keys",
        "signing_keys",
        '"signing_keys" should declare at least one public key so RFC 9421 message signatures can be verified.',
        "warning",
      ),
    );
  }

  return keys;
};

const parseSupportedVersions = (
  raw: unknown,
  currentVersion: string | null,
  issues: SpecIssue[],
): ParsedSupportedVersion[] => {
  if (!isObject(raw)) {
    issues.push(
      issue(
        "supported_versions",
        "supported_versions",
        '"supported_versions" must be an object mapping YYYY-MM-DD versions to HTTPS profile URIs.',
        "error",
      ),
    );
    return [];
  }

  const versions: ParsedSupportedVersion[] = [];

  for (const [key, uri] of Object.entries(raw)) {
    const validKey = VERSION_RE.test(key);
    if (!validKey) {
      issues.push(
        issue(
          "supported_versions",
          `supported_versions.${key}`,
          `Key "${key}" must be a YYYY-MM-DD version string.`,
          "warning",
        ),
      );
    }

    const isString = typeof uri === "string";
    const isHttps = isString && HTTPS_RE.test(uri);
    if (!isString) {
      issues.push(
        issue(
          "supported_versions",
          `supported_versions.${key}`,
          "Value must be an HTTPS URI pointing to that version's profile.",
          "error",
        ),
      );
    } else if (!isHttps) {
      issues.push(
        issue(
          "supported_versions",
          `supported_versions.${key}`,
          `Profile URI must use HTTPS (got "${uri}").`,
          "error",
        ),
      );
    }

    versions.push({
      version: key,
      uri: isString ? uri : "",
      isCurrent: currentVersion !== null && key === currentVersion,
      isHttps,
    });
  }

  return versions;
};

type ValidationOutput = {
  issues: SpecIssue[];
  ucpVersion: string | null;
  isLatestVersion: boolean;
  envelopeKind: "wrapped" | "flat" | null;
  services: ParsedService[];
  capabilities: ParsedCapability[];
  paymentHandlers: ParsedPaymentHandler[];
  signingKeys: ParsedSigningKey[];
  supportedVersions: ParsedSupportedVersion[];
  signingKeysAdvertised: boolean;
};

const emptyValidation = (): ValidationOutput => ({
  issues: [],
  ucpVersion: null,
  isLatestVersion: false,
  envelopeKind: null,
  services: [],
  capabilities: [],
  paymentHandlers: [],
  signingKeys: [],
  supportedVersions: [],
  signingKeysAdvertised: false,
});

const validateUcpSpec = (data: unknown): ValidationOutput => {
  const output = emptyValidation();
  const { issues } = output;

  if (!isObject(data)) {
    issues.push(
      issue("envelope", "(root)", "Root must be a JSON object.", "error"),
    );
    return output;
  }

  const wrapped = isObject(get(data, "ucp"));
  output.envelopeKind = wrapped ? "wrapped" : "flat";
  const root = wrapped ? (get(data, "ucp") as Record<string, unknown>) : data;

  if (wrapped) {
    issues.push(
      issue(
        "envelope",
        "ucp",
        'Using the wrapped "ucp" envelope. The 2026-04-08 business_schema is flat — agents that strictly follow the JSON Schema may not unwrap it.',
        "warning",
      ),
    );
  }

  output.ucpVersion = validateVersionField(
    get(root, "version"),
    "version",
    "version",
    issues,
  );
  output.isLatestVersion = output.ucpVersion === LATEST_UCP_VERSION;

  if (output.ucpVersion && !output.isLatestVersion) {
    issues.push(
      issue(
        "version",
        "version",
        `Latest published UCP version is ${LATEST_UCP_VERSION}; this profile declares ${output.ucpVersion}.`,
        "warning",
      ),
    );
  }

  const status = get(root, "status");
  if (
    status !== undefined &&
    !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
  ) {
    issues.push(
      issue(
        "envelope",
        "status",
        `"status" must be "success" or "error" (got "${String(status)}").`,
        "error",
      ),
    );
  }

  if (!("services" in root)) {
    issues.push(
      issue(
        "services",
        "services",
        'Missing required "services" registry — agents cannot negotiate a transport without it.',
        "error",
      ),
    );
  } else {
    output.services = parseServiceEntries(get(root, "services"), issues);
  }

  if (!("payment_handlers" in root)) {
    issues.push(
      issue(
        "payment_handlers",
        "payment_handlers",
        'Missing required "payment_handlers" registry.',
        "error",
      ),
    );
  } else {
    output.paymentHandlers = parsePaymentHandlerEntries(
      get(root, "payment_handlers"),
      issues,
    );
  }

  if ("capabilities" in root) {
    output.capabilities = parseCapabilityEntries(
      get(root, "capabilities"),
      issues,
    );
  } else {
    issues.push(
      issue(
        "capabilities",
        "capabilities",
        'Recommended: declare a "capabilities" registry so agents can target the right flows.',
        "warning",
      ),
    );
  }

  if ("supported_versions" in root) {
    output.supportedVersions = parseSupportedVersions(
      get(root, "supported_versions"),
      output.ucpVersion,
      issues,
    );
  }

  // signing_keys may live at the root of the wrapped envelope (alongside "ucp")
  // or inside the flat document. Honor both.
  const signingKeysRaw = wrapped
    ? (get(data, "signing_keys") ?? get(root, "signing_keys"))
    : get(root, "signing_keys");

  if (signingKeysRaw === undefined) {
    issues.push(
      issue(
        "security",
        "signing_keys",
        'Recommended: publish "signing_keys" so platforms can verify RFC 9421 HTTP message signatures without prior secret exchange.',
        "warning",
      ),
    );
  } else {
    output.signingKeysAdvertised = true;
    output.signingKeys = parseSigningKeyEntries(signingKeysRaw, issues);
  }

  // Recognize critical capability gaps for the shopping service.
  if (output.services.some((service) => service.name === "dev.ucp.shopping")) {
    const declaredCapabilityNames = new Set(
      output.capabilities.map((capability) => capability.name),
    );
    const critical = [
      "dev.ucp.shopping.checkout",
      "dev.ucp.shopping.cart",
      "dev.ucp.shopping.order",
    ];
    for (const name of critical) {
      if (!declaredCapabilityNames.has(name)) {
        issues.push(
          issue(
            "capabilities",
            `capabilities.${name}`,
            `Shopping service advertised but capability "${name}" is missing — agents cannot complete a transaction without it.`,
            "warning",
          ),
        );
      }
    }
  }

  return output;
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
          "UCP-Agent": 'profile="https://ecentic.ai/ucp-validator"',
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

  const emptyParsed = emptyValidation();

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
        ucpVersion: emptyParsed.ucpVersion,
        isLatestVersion: emptyParsed.isLatestVersion,
        envelopeKind: emptyParsed.envelopeKind,
        services: emptyParsed.services,
        capabilities: emptyParsed.capabilities,
        paymentHandlers: emptyParsed.paymentHandlers,
        signingKeys: emptyParsed.signingKeys,
        supportedVersions: emptyParsed.supportedVersions,
        signingKeysAdvertised: emptyParsed.signingKeysAdvertised,
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
        ucpVersion: emptyParsed.ucpVersion,
        isLatestVersion: emptyParsed.isLatestVersion,
        envelopeKind: emptyParsed.envelopeKind,
        services: emptyParsed.services,
        capabilities: emptyParsed.capabilities,
        paymentHandlers: emptyParsed.paymentHandlers,
        signingKeys: emptyParsed.signingKeys,
        supportedVersions: emptyParsed.supportedVersions,
        signingKeysAdvertised: emptyParsed.signingKeysAdvertised,
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
    const validation = validateUcpSpec(parsed);
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
        specIssues: validation.issues,
        robots,
        error: null,
        ucpVersion: validation.ucpVersion,
        isLatestVersion: validation.isLatestVersion,
        envelopeKind: validation.envelopeKind,
        services: validation.services,
        capabilities: validation.capabilities,
        paymentHandlers: validation.paymentHandlers,
        signingKeys: validation.signingKeys,
        supportedVersions: validation.supportedVersions,
        signingKeysAdvertised: validation.signingKeysAdvertised,
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
      ucpVersion: emptyParsed.ucpVersion,
      isLatestVersion: emptyParsed.isLatestVersion,
      envelopeKind: emptyParsed.envelopeKind,
      services: emptyParsed.services,
      capabilities: emptyParsed.capabilities,
      paymentHandlers: emptyParsed.paymentHandlers,
      signingKeys: emptyParsed.signingKeys,
      supportedVersions: emptyParsed.supportedVersions,
      signingKeysAdvertised: emptyParsed.signingKeysAdvertised,
    },
  };
};
