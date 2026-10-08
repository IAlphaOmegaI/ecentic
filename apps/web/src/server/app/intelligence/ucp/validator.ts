/** biome-ignore-all lint/complexity/useLiteralKeys: bracket access is required by TS4111 (noPropertyAccessFromIndexSignature) on Record<string, unknown> shapes parsed via zod */
import { z } from "zod";
import {
  isUcpRevision,
  LATEST_UCP_VERSION,
  UCP_REVISIONS,
  type UcpRevision,
} from "@/lib/ucp";

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

// ─── UCP spec validation ────────────────────────────────────────────────────
// Reference: https://ucp.dev — a business serves its profile at
// /.well-known/ucp. A profile is judged by the rules of the revision it
// declares in `ucp.version`, and only by those: the revisions are dated
// snapshots that differ in what they require, so reading a profile against a
// neighbouring one reports faults it does not have. A profile on a revision
// this file has no rules for is listed but not judged.
//
// In every revision the profile is an object with a required `ucp` member; the
// `business_schema` in ucp.json describes the contents of that member, not a
// flat document.

/** The registries keyed by reverse-domain name, as issue categories. */
type Registry = "services" | "capabilities" | "payment_handlers";
/** The URLs an entry of one may declare. */
type EntryUrl = "spec" | "schema";

/**
 * What differs between revisions, within what this validator inspects.
 * Everything else in the file holds for all of them.
 *
 * Read from the schemas and overview each revision published at
 * `https://ucp.dev/{revision}/` as of 2026-10-07 — a dated release can be
 * amended in place, so re-read them when a rule here is questioned. Where
 * 2026-04-08 disagrees with itself (its prose calls a capability's `spec` and
 * `schema` required, its business schema does not), the schema is followed.
 */
type Rules = {
  /** `reverse_domain_name.json` — the pattern every registry key matches. */
  name: RegExp;
  /** The top-level array verifiers read signing keys from. */
  keys: "signing_keys" | "keys";
  /** A business capability entry must declare `schema`. */
  capabilitySchema: boolean;
  /** Every `dev.ucp.*` entry must repeat the profile's `ucp.version`. */
  pinned: boolean;
  /**
   * Authority binding: the registries whose entries must have the listed URLs
   * served by the domain that owns the entry's reverse-domain name, and what a
   * URL that is not is reported as. `bindingFault` holds the derivation.
   */
  binding: {
    registries: readonly Registry[];
    urls: readonly EntryUrl[];
    severity: SpecIssueSeverity;
  };
};

const RULES: Record<UcpRevision, Rules> = {
  "2026-04-08": {
    name: /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/,
    keys: "signing_keys",
    capabilitySchema: false,
    pinned: false,
    // "Spec URL Binding" asks it of capabilities alone, of `spec` as much as
    // `schema`, and has platforms SHOULD reject where the later revision says
    // MUST. It names the "namespace authority" through two examples and no
    // algorithm, so where an authority ends inside a name is left to the
    // reader. A failure is therefore a warning, and only a URL that fails the
    // 2026-08-25 derivation gets one: an origin made of the name's leading
    // labels reversed — two of them or more — passes that derivation, so what
    // it turns down is unbound under every reading of this revision. Services
    // and payment handlers are left alone: the text does not mention them, and
    // its own example profile serves `com.google.pay` from pay.google.com with
    // a `spec` on developers.google.com.
    binding: {
      registries: ["capabilities"],
      urls: ["spec", "schema"],
      severity: "warning",
    },
  },
  "2026-08-25": {
    name: /^[a-z](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_-]*[a-z0-9_])?)+$/,
    keys: "keys",
    capabilitySchema: true,
    pinned: true,
    // "Authority Binding" asks it of every entry that declares a `schema`, and
    // a platform MUST reject one that fails — hence an error. `spec` is
    // documentation there: it has to be https and may sit on any host.
    binding: {
      registries: ["services", "capabilities", "payment_handlers"],
      urls: ["schema"],
      severity: "error",
    },
  },
};

const CORE_NAMESPACE = "dev.ucp.";
const VERSION_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_RE = /^https:\/\//i;
const HTTP_OR_HTTPS_RE = /^https?:\/\//i;

const VALID_TRANSPORTS = ["rest", "mcp", "a2a", "embedded"] as const;
const VALID_STATUSES = ["success", "error"] as const;
// The key-type, curve and algorithm vocabularies are open: these are the
// shapes UCP defines, and a verifier skips a key it cannot use rather than
// rejecting the profile. Maps, because the lookups are keyed by profile text.
const JWK_CURVES = new Map([
  ["P-256", { kty: "EC", alg: "ES256" }],
  ["P-384", { kty: "EC", alg: "ES384" }],
  ["Ed25519", { kty: "OKP", alg: "EdDSA" }],
]);
const JWK_REQUIRED_BY_KTY = new Map<string, readonly string[]>([
  ["EC", ["crv", "x", "y"]],
  ["OKP", ["crv", "x"]],
]);
const JWK_PRIVATE_FIELDS = [
  "d",
  "p",
  "q",
  "dp",
  "dq",
  "qi",
  "oth",
  "k",
] as const;

// Looked up by registry keys taken from the profile, hence Maps: a key such as
// "constructor" is then simply not known.
const KNOWN_SERVICES = new Map<string, string>([
  ["dev.ucp.shopping", "Shopping"],
  ["dev.ucp.identity", "Identity"],
  ["dev.ucp.common", "Common"],
]);

const KNOWN_CAPABILITIES = new Map<string, { label: string }>([
  ["dev.ucp.shopping.checkout", { label: "Checkout" }],
  ["dev.ucp.shopping.cart", { label: "Cart" }],
  ["dev.ucp.shopping.order", { label: "Order" }],
  ["dev.ucp.shopping.catalog.search", { label: "Catalog · Search" }],
  ["dev.ucp.shopping.catalog.lookup", { label: "Catalog · Lookup" }],
  ["dev.ucp.shopping.fulfillment", { label: "Fulfillment" }],
  ["dev.ucp.shopping.discount", { label: "Discount" }],
  ["dev.ucp.shopping.buyer_consent", { label: "Buyer Consent" }],
  ["dev.ucp.shopping.permalink", { label: "Permalink" }],
  ["dev.ucp.shopping.tokenizer", { label: "Payment Tokenizer" }],
  [
    "dev.ucp.common.identity_linking",
    { label: "Identity Linking (OAuth 2.0)" },
  ],
  ["dev.ucp.common.loyalty", { label: "Loyalty" }],
]);

const KNOWN_PAYMENT_HANDLERS = new Map<string, string>([
  ["com.google.pay", "Google Pay"],
  ["com.apple.pay", "Apple Pay"],
  ["com.paypal", "PayPal"],
  ["com.stripe", "Stripe"],
  ["com.braintree", "Braintree"],
  ["com.klarna", "Klarna"],
  ["com.afterpay", "Afterpay"],
  ["com.affirm", "Affirm"],
  ["dev.shopify.shop_pay", "Shop Pay"],
  ["dev.shopify.card", "Shopify Card"],
]);

// ─── Zod-driven validation ──────────────────────────────────────────────────
// Schemas narrow shape (must be an object, must be a string, must be an array).
// Cross-field rules and value-shape rules (HTTPS, YYYY-MM-DD, enum membership)
// run on the parsed shape and push SpecIssues — that channel carries severity
// (error vs. warning), which zod's native issues do not preserve cleanly.

type WithSeverity = { severity?: SpecIssueSeverity };

const issue = (
  category: SpecIssueCategory,
  field: string,
  message: string,
  severity: SpecIssueSeverity,
): SpecIssue => ({ category, field, message, severity });

const joinPath = (prefix: string, path: ReadonlyArray<string | number>) => {
  const tail = path.length === 0 ? "" : path.join(".");
  if (!prefix) return tail;
  if (!tail) return prefix;
  return `${prefix}.${tail}`;
};

const mapZodIssues = (
  error: z.ZodError,
  category: SpecIssueCategory,
  prefix: string,
  defaultSeverity: SpecIssueSeverity = "error",
): SpecIssue[] =>
  error.issues.map((entry) => {
    const params = (entry as { params?: WithSeverity }).params;
    return issue(
      category,
      joinPath(prefix, entry.path as ReadonlyArray<string | number>),
      entry.message,
      params?.severity ?? defaultSeverity,
    );
  });

const RecordSchema = z.record(z.string(), z.unknown());
const ArraySchema = z.array(z.unknown());

const ServiceEntrySchema = z
  .object({
    version: z.string().optional(),
    transport: z.string().optional(),
    endpoint: z.string().optional(),
    schema: z.string().optional(),
  })
  .passthrough();

const CapabilityEntrySchema = z
  .object({
    version: z.string().optional(),
    spec: z.string().optional(),
    schema: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const PaymentHandlerEntrySchema = z
  .object({
    version: z.string().optional(),
    id: z.string().optional(),
    schema: z.string().optional(),
  })
  .passthrough();

const SigningKeySchema = z
  .object({
    kid: z.string().optional(),
    kty: z.string().optional(),
    use: z.string().optional(),
    alg: z.string().optional(),
    crv: z.string().optional(),
  })
  .passthrough();

const checkVersionFormat = (
  value: string,
  field: string,
  category: SpecIssueCategory,
  issues: SpecIssue[],
) => {
  if (!VERSION_RE.test(value))
    issues.push(
      issue(
        category,
        field,
        `"${field}" must be a YYYY-MM-DD calendar version (got "${value}").`,
        "warning",
      ),
    );
};

const checkHttpsUrl = (
  value: string,
  field: string,
  category: SpecIssueCategory,
  issues: SpecIssue[],
) => {
  if (!HTTP_OR_HTTPS_RE.test(value)) {
    issues.push(
      issue(
        category,
        field,
        `"${field}" must be a URL (got "${value}").`,
        "error",
      ),
    );
    return;
  }
  if (!HTTPS_RE.test(value))
    issues.push(
      issue(
        category,
        field,
        `"${field}" must use HTTPS (got "${value}").`,
        "error",
      ),
    );
};

/** One profile being read: the rules it is held to and where findings go. */
type Reading = {
  rules: Rules;
  /** The profile's own `ucp.version`. */
  version: string;
  issues: SpecIssue[];
};

/**
 * A release is one snapshot: under a pinning revision every `dev.ucp.*`
 * service, capability and extension entry repeats the profile's version, and a
 * platform drops any entry that does not. Third-party names version on their
 * own.
 */
const checkPinnedVersion = (
  name: string,
  version: string,
  field: string,
  category: SpecIssueCategory,
  reading: Reading,
) => {
  if (!reading.rules.pinned) return;
  if (!name.startsWith(CORE_NAMESPACE)) return;
  if (version === reading.version) return;

  reading.issues.push(
    issue(
      category,
      field,
      `"${name}" is a dev.ucp.* entry, so in a ${reading.version} profile it must declare version ${reading.version} (got "${version}"). Platforms treat a mismatched entry as absent; an older release is advertised through "supported_versions" instead.`,
      "error",
    ),
  );
};

const binds = (rules: Rules, registry: Registry, member: EntryUrl) =>
  rules.binding.registries.includes(registry) &&
  rules.binding.urls.includes(member);

/**
 * Why `value` is not served by the owner of `name`, or null when it is — the
 * derivation 2026-08-25 gives (overview → Namespace Governance → Authority
 * Binding). The authority is read off the URL's host, not guessed from the
 * name: the host's labels, reversed, must be the whole name or its leading
 * labels. `pay.example.com` and `example.com` both own `com.example.pay`;
 * `cdn.example.com` does not, and `example.com` does not own
 * `com.examplecorp.pay`.
 *
 * The host is what a WHATWG parser makes of the URL, never a substring of its
 * text: "https://ucp.dev@evil.example/" is served by evil.example. The Public
 * Suffix List is not consulted — the spec's own choice — so a suffix such as
 * "co.uk" stands as an authority like any other host.
 */
const bindingFault = (name: string, value: string) => {
  if (!URL.canParse(value)) return `is not a valid URL (got "${value}")`;

  const url = new URL(value);
  // The parser has already lowercased an https host and written it in A-label
  // form; the trailing dot of a fully-qualified name is left for us to drop.
  const host = url.hostname.replace(/\.$/, "");
  const labels = host.split(".");
  const prefix = [...labels].reverse().join(".");

  switch (true) {
    case url.username !== "" || url.password !== "":
      return `must not put a username or password before its host, which is "${host}"`;
    // Parsed, an IPv6 host is one bracketed label and an IPv4 host ends in a
    // number, so neither is a domain name of two labels or more.
    case labels.length < 2 ||
      labels.includes("") ||
      /^\d+$/.test(labels.at(-1) ?? ""):
      return `is served from "${host}", which is not a domain name of at least two labels: an IP address or a single-label host owns no reverse-domain name`;
    case name === prefix || name.startsWith(`${prefix}.`):
      return null;
    default:
      return `is served from "${host}", which does not own the name "${name}": the host's labels reversed ("${prefix}") must be the whole name or its leading labels`;
  }
};

/**
 * Authority binding, where the declared revision asks for it (see `RULES`): a
 * URL an entry declares must be served by the party that owns the entry's
 * reverse-domain name. It establishes who publishes the entry, not that the
 * entry deserves trust, and it is read off the declared text — nothing is
 * fetched.
 */
const checkAuthorityBinding = (
  name: string,
  member: EntryUrl,
  value: string,
  path: string,
  category: Registry,
  reading: Reading,
) => {
  const { binding } = reading.rules;
  if (!binds(reading.rules, category, member)) return;
  // Not an https URL at all: `checkHttpsUrl` has said so on this field, and
  // one finding per URL is enough.
  if (!HTTPS_RE.test(value)) return;

  const fault = bindingFault(name, value);
  if (fault === null) return;

  const consequence =
    binding.severity === "error"
      ? `A ${reading.version} platform must reject the entry: it never fetches the schema and treats "${name}" as absent.`
      : `${reading.version} has a capability's "spec" and "schema" served from its namespace authority, and platforms should reject one that is not.`;

  reading.issues.push(
    issue(
      category,
      `${path}.${member}`,
      `"${path}.${member}" ${fault}. ${consequence}`,
      binding.severity,
    ),
  );
};

const parseServiceEntries = (
  registry: unknown,
  reading: Reading,
): ParsedService[] => {
  const { rules, issues } = reading;
  const root = RecordSchema.safeParse(registry);
  if (!root.success) {
    issues.push(
      issue("services", "services", '"services" must be an object.', "error"),
    );
    return [];
  }

  const services: ParsedService[] = [];

  for (const [name, entries] of Object.entries(root.data)) {
    if (!rules.name.test(name))
      issues.push(
        issue(
          "services",
          `services.${name}`,
          `Key "${name}" should use reverse-domain format (e.g. dev.ucp.shopping).`,
          "warning",
        ),
      );

    const list = ArraySchema.safeParse(entries);
    if (!list.success) {
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

    if (list.data.length === 0)
      issues.push(
        issue(
          "services",
          `services.${name}`,
          `"services.${name}" must declare at least one entry.`,
          "warning",
        ),
      );

    for (const [index, raw] of list.data.entries()) {
      const path = `services.${name}[${index}]`;
      const shape = RecordSchema.safeParse(raw);
      if (!shape.success) {
        issues.push(
          issue("services", path, "Each entry must be an object.", "error"),
        );
        continue;
      }

      const parsed = ServiceEntrySchema.safeParse(shape.data);
      if (!parsed.success) {
        issues.push(...mapZodIssues(parsed.error, "services", path));
        continue;
      }

      const entry = parsed.data;

      const version = (() => {
        if (entry.version === undefined) {
          issues.push(
            issue(
              "services",
              `${path}.version`,
              'Missing required "version".',
              "error",
            ),
          );
          return null;
        }
        checkVersionFormat(
          entry.version,
          `${path}.version`,
          "services",
          issues,
        );
        checkPinnedVersion(
          name,
          entry.version,
          `${path}.version`,
          "services",
          reading,
        );
        return entry.version;
      })();

      const transport = (() => {
        if (entry.transport === undefined) {
          issues.push(
            issue(
              "transport",
              `${path}.transport`,
              'Missing required "transport".',
              "error",
            ),
          );
          return null;
        }
        if (
          !VALID_TRANSPORTS.includes(
            entry.transport as (typeof VALID_TRANSPORTS)[number],
          )
        )
          issues.push(
            issue(
              "transport",
              `${path}.transport`,
              `"transport" must be one of: ${VALID_TRANSPORTS.join(", ")} (got "${entry.transport}").`,
              "warning",
            ),
          );
        return entry.transport;
      })();

      const endpoint = (() => {
        if (transport === "embedded") return entry.endpoint ?? null;
        if (entry.endpoint === undefined) {
          issues.push(
            issue(
              "services",
              `${path}.endpoint`,
              'Missing required "endpoint".',
              "error",
            ),
          );
          return null;
        }
        checkHttpsUrl(entry.endpoint, `${path}.endpoint`, "services", issues);
        return entry.endpoint;
      })();

      // A business binding need not repeat the transport's schema: the
      // platform profile is where `schema` is required.
      const schemaUrl = (() => {
        if (entry.schema === undefined) return null;
        checkHttpsUrl(entry.schema, `${path}.schema`, "services", issues);
        checkAuthorityBinding(
          name,
          "schema",
          entry.schema,
          path,
          "services",
          reading,
        );
        return entry.schema;
      })();

      services.push({
        name,
        label: KNOWN_SERVICES.get(name) ?? name,
        version,
        transport,
        endpoint,
        schema: schemaUrl,
        recognized: KNOWN_SERVICES.has(name),
      });
    }
  }

  return services;
};

const parseCapabilityEntries = (
  registry: unknown,
  reading: Reading,
): ParsedCapability[] => {
  const { rules, issues } = reading;
  const root = RecordSchema.safeParse(registry);
  if (!root.success) {
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

  for (const [name, entries] of Object.entries(root.data)) {
    if (!rules.name.test(name))
      issues.push(
        issue(
          "capabilities",
          `capabilities.${name}`,
          `Key "${name}" should use reverse-domain format (e.g. dev.ucp.shopping.checkout).`,
          "warning",
        ),
      );

    const list = ArraySchema.safeParse(entries);
    if (!list.success) {
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

    if (list.data.length === 0)
      issues.push(
        issue(
          "capabilities",
          `capabilities.${name}`,
          `"capabilities.${name}" must declare at least one entry.`,
          "warning",
        ),
      );

    const known = KNOWN_CAPABILITIES.get(name);

    for (const [index, raw] of list.data.entries()) {
      const path = `capabilities.${name}[${index}]`;
      const shape = RecordSchema.safeParse(raw);
      if (!shape.success) {
        issues.push(
          issue("capabilities", path, "Each entry must be an object.", "error"),
        );
        continue;
      }

      // Detect non-object config before strict parse (strict parse would reject)
      const configRaw = shape.data["config"];
      if (configRaw !== undefined && !RecordSchema.safeParse(configRaw).success)
        issues.push(
          issue(
            "capabilities",
            `${path}.config`,
            '"config" must be an object when present.',
            "error",
          ),
        );

      const parsed = CapabilityEntrySchema.safeParse(shape.data);
      if (!parsed.success) {
        issues.push(...mapZodIssues(parsed.error, "capabilities", path));
        continue;
      }

      const entry = parsed.data;

      const version = (() => {
        if (entry.version === undefined) {
          issues.push(
            issue(
              "capabilities",
              `${path}.version`,
              'Missing required "version".',
              "error",
            ),
          );
          return null;
        }
        checkVersionFormat(
          entry.version,
          `${path}.version`,
          "capabilities",
          issues,
        );
        checkPinnedVersion(
          name,
          entry.version,
          `${path}.version`,
          "capabilities",
          reading,
        );
        return entry.version;
      })();

      const spec = (() => {
        if (entry.spec === undefined) return null;
        checkHttpsUrl(entry.spec, `${path}.spec`, "capabilities", issues);
        checkAuthorityBinding(
          name,
          "spec",
          entry.spec,
          path,
          "capabilities",
          reading,
        );
        return entry.spec;
      })();

      const schemaUrl = (() => {
        if (entry.schema === undefined) {
          if (rules.capabilitySchema)
            issues.push(
              issue(
                "capabilities",
                `${path}.schema`,
                'Missing required "schema" — platforms fetch it to compose the capability during negotiation.',
                "error",
              ),
            );
          return null;
        }
        checkHttpsUrl(entry.schema, `${path}.schema`, "capabilities", issues);
        checkAuthorityBinding(
          name,
          "schema",
          entry.schema,
          path,
          "capabilities",
          reading,
        );
        return entry.schema;
      })();

      // `config` is the capability's own business. The order capability's
      // `webhook_url` in particular is declared by the platform, in its
      // profile — a business has none to publish.
      const config = entry.config ?? null;

      capabilities.push({
        name,
        label: known?.label ?? name,
        version,
        spec,
        schema: schemaUrl,
        config,
        recognized: Boolean(known),
      });
    }
  }

  return capabilities;
};

const parsePaymentHandlerEntries = (
  registry: unknown,
  reading: Reading,
): ParsedPaymentHandler[] => {
  const { rules, issues } = reading;
  const root = RecordSchema.safeParse(registry);
  if (!root.success) {
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

  for (const [key, entries] of Object.entries(root.data)) {
    if (!rules.name.test(key))
      issues.push(
        issue(
          "payment_handlers",
          `payment_handlers.${key}`,
          `Key "${key}" should use reverse-domain format (e.g. com.stripe).`,
          "warning",
        ),
      );

    const list = ArraySchema.safeParse(entries);
    if (!list.success) {
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

    for (const [index, raw] of list.data.entries()) {
      const path = `payment_handlers.${key}[${index}]`;
      const shape = RecordSchema.safeParse(raw);
      if (!shape.success) {
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

      const parsed = PaymentHandlerEntrySchema.safeParse(shape.data);
      if (!parsed.success) {
        issues.push(...mapZodIssues(parsed.error, "payment_handlers", path));
        continue;
      }

      const entry = parsed.data;

      const version = (() => {
        if (entry.version === undefined) {
          issues.push(
            issue(
              "payment_handlers",
              `${path}.version`,
              'Missing required "version".',
              "error",
            ),
          );
          return null;
        }
        checkVersionFormat(
          entry.version,
          `${path}.version`,
          "payment_handlers",
          issues,
        );
        return entry.version;
      })();

      if (entry.id === undefined)
        issues.push(
          issue(
            "payment_handlers",
            `${path}.id`,
            'Missing required "id".',
            "error",
          ),
        );

      // Nothing else here reads a handler's `schema`, so it is looked at only
      // under a revision that binds it: as an https URL, then for its host.
      if (
        entry.schema !== undefined &&
        binds(rules, "payment_handlers", "schema")
      ) {
        checkHttpsUrl(
          entry.schema,
          `${path}.schema`,
          "payment_handlers",
          issues,
        );
        checkAuthorityBinding(
          key,
          "schema",
          entry.schema,
          path,
          "payment_handlers",
          reading,
        );
      }

      handlers.push({
        registryKey: key,
        label: KNOWN_PAYMENT_HANDLERS.get(key) ?? key,
        id: entry.id ?? null,
        version,
        recognized: KNOWN_PAYMENT_HANDLERS.has(key),
      });
    }
  }

  return handlers;
};

const parseSigningKeyEntries = (
  rawKeys: unknown,
  reading: Reading,
): ParsedSigningKey[] => {
  const { rules, issues } = reading;
  const field = rules.keys;
  const list = ArraySchema.safeParse(rawKeys);
  if (!list.success) {
    issues.push(
      issue(
        "signing_keys",
        field,
        `"${field}" must be an array of JWK entries.`,
        "error",
      ),
    );
    return [];
  }

  const seenKids = new Set<string>();
  const keys: ParsedSigningKey[] = [];

  for (const [index, raw] of list.data.entries()) {
    const path = `${field}[${index}]`;
    const shape = RecordSchema.safeParse(raw);
    if (!shape.success) {
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

    const parsed = SigningKeySchema.safeParse(shape.data);
    if (!parsed.success) {
      issues.push(...mapZodIssues(parsed.error, "signing_keys", path));
      continue;
    }

    const entry = parsed.data;
    const { kid, kty, use, alg, crv } = entry;
    const required = kty ? JWK_REQUIRED_BY_KTY.get(kty) : undefined;
    const curve = crv ? JWK_CURVES.get(crv) : undefined;

    if (!kid)
      issues.push(
        issue(
          "signing_keys",
          `${path}.kid`,
          'JWK is missing required "kid" (Key ID).',
          "error",
        ),
      );
    else if (seenKids.has(kid))
      issues.push(
        issue(
          "signing_keys",
          `${path}.kid`,
          `Duplicate "kid": "${kid}" already used.`,
          "error",
        ),
      );
    else seenKids.add(kid);

    if (!kty)
      issues.push(
        issue(
          "signing_keys",
          `${path}.kty`,
          'JWK is missing required "kty" (Key Type).',
          "error",
        ),
      );
    else if (!required)
      issues.push(
        issue(
          "signing_keys",
          `${path}.kty`,
          `"kty" "${kty}" is not a key type UCP defines (${[...JWK_REQUIRED_BY_KTY.keys()].join(", ")}). It is allowed, but a verifier that does not support it skips this key.`,
          "warning",
        ),
      );

    if (use !== undefined && use !== "sig")
      issues.push(
        issue(
          "signing_keys",
          `${path}.use`,
          `"use" is "${use}", so this key is not offered for signatures and verifiers will not use it for UCP message signing.`,
          "warning",
        ),
      );
    else if (use === undefined)
      issues.push(
        issue(
          "signing_keys",
          `${path}.use`,
          'Recommended: set "use" to "sig" so verifiers know this key signs UCP messages.',
          "warning",
        ),
      );

    for (const member of required ?? []) {
      if (typeof shape.data[member] !== "string")
        issues.push(
          issue(
            "signing_keys",
            `${path}.${member}`,
            `${kty} JWKs must carry "${member}".`,
            "error",
          ),
        );
    }

    // An unfamiliar curve is the open vocabulary at work; a familiar one on
    // the wrong key type is a malformed key.
    if (required && crv && !curve)
      issues.push(
        issue(
          "signing_keys",
          `${path}.crv`,
          `"crv" "${crv}" is not a curve UCP defines (${[...JWK_CURVES.keys()].join(", ")}). It is allowed, but a verifier that does not support it skips this key.`,
          "warning",
        ),
      );
    else if (required && curve && curve.kty !== kty)
      issues.push(
        issue(
          "signing_keys",
          `${path}.crv`,
          `"crv" "${crv}" is a curve for "kty" "${curve.kty}", not "${kty}".`,
          "error",
        ),
      );

    if (!alg)
      issues.push(
        issue(
          "signing_keys",
          `${path}.alg`,
          'Recommended: declare "alg" (e.g. "ES256") so signers and verifiers agree.',
          "warning",
        ),
      );
    else if (curve && alg !== curve.alg)
      issues.push(
        issue(
          "signing_keys",
          `${path}.alg`,
          `"alg" "${alg}" does not match "crv" "${crv}": that curve signs with ${curve.alg}.`,
          "error",
        ),
      );

    const hasPrivateMaterial = JWK_PRIVATE_FIELDS.some(
      (member) => member in shape.data,
    );
    if (hasPrivateMaterial)
      issues.push(
        issue(
          "signing_keys",
          path,
          "JWK appears to contain private key material (d/p/q/k). Only publish public keys at /.well-known/ucp.",
          "error",
        ),
      );

    keys.push({
      kid: kid ?? null,
      kty: kty ?? null,
      use: use ?? null,
      crv: crv ?? null,
      alg: alg ?? null,
      isSigning: use === "sig" || use === undefined,
      hasPrivateMaterial,
    });
  }

  if (keys.length === 0)
    issues.push(
      issue(
        "signing_keys",
        field,
        `"${field}" should declare at least one public key so RFC 9421 message signatures can be verified.`,
        "warning",
      ),
    );

  return keys;
};

const parseSupportedVersions = (
  raw: unknown,
  currentVersion: string | null,
  issues: SpecIssue[],
): ParsedSupportedVersion[] => {
  const root = RecordSchema.safeParse(raw);
  if (!root.success) {
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

  return Object.entries(root.data).map(([key, uri]) => {
    if (!VERSION_RE.test(key))
      issues.push(
        issue(
          "supported_versions",
          `supported_versions.${key}`,
          `Key "${key}" must be a YYYY-MM-DD version string.`,
          "warning",
        ),
      );

    const value = z.string().safeParse(uri);
    if (!value.success) {
      issues.push(
        issue(
          "supported_versions",
          `supported_versions.${key}`,
          "Value must be an HTTPS URI pointing to that version's profile.",
          "error",
        ),
      );
      return {
        version: key,
        uri: "",
        isCurrent: currentVersion !== null && key === currentVersion,
        isHttps: false,
      };
    }

    const isHttps = HTTPS_RE.test(value.data);
    if (!isHttps)
      issues.push(
        issue(
          "supported_versions",
          `supported_versions.${key}`,
          `Profile URI must use HTTPS (got "${value.data}").`,
          "error",
        ),
      );

    return {
      version: key,
      uri: value.data,
      isCurrent: currentVersion !== null && key === currentVersion,
      isHttps,
    };
  });
};

export type ValidationOutput = {
  issues: SpecIssue[];
  ucpVersion: string | null;
  /**
   * The revision whose rules were applied. `null` means the profile was not
   * judged — it declares a revision with no rules here, or no usable version
   * at all — which is a different thing from having passed.
   */
  validatedAgainst: UcpRevision | null;
  isLatestVersion: boolean;
  envelopeKind: "wrapped" | "flat" | null;
  services: ParsedService[];
  capabilities: ParsedCapability[];
  paymentHandlers: ParsedPaymentHandler[];
  signingKeys: ParsedSigningKey[];
  supportedVersions: ParsedSupportedVersion[];
  signingKeysAdvertised: boolean;
};

export const emptyValidation = (): ValidationOutput => ({
  issues: [],
  ucpVersion: null,
  validatedAgainst: null,
  isLatestVersion: false,
  envelopeKind: null,
  services: [],
  capabilities: [],
  paymentHandlers: [],
  signingKeys: [],
  supportedVersions: [],
  signingKeysAdvertised: false,
});

export const validateUcpSpec = (data: unknown): ValidationOutput => {
  const output = emptyValidation();
  const { issues } = output;

  const rootShape = RecordSchema.safeParse(data);
  if (!rootShape.success) {
    issues.push(
      issue("envelope", "(root)", "Root must be a JSON object.", "error"),
    );
    return output;
  }

  const envelope = rootShape.data;
  const wrappedUcp = RecordSchema.safeParse(envelope["ucp"]);
  if (envelope["ucp"] !== undefined && !wrappedUcp.success) {
    issues.push(issue("envelope", "ucp", '"ucp" must be an object.', "error"));
    return output;
  }

  const wrapped = wrappedUcp.success;
  output.envelopeKind = wrapped ? "wrapped" : "flat";
  // A document without the `ucp` member is read as if its root were that
  // member, so one that only lacks the wrapper still gets the rest of its
  // findings in the same pass.
  const root = wrapped ? wrappedUcp.data : envelope;

  // The version comes first because it selects the rules. A profile that does
  // not state one usable version cannot be held to any revision.
  output.ucpVersion = (() => {
    const rawVersion = root["version"];
    if (rawVersion === undefined || rawVersion === null) {
      issues.push(
        issue(
          "version",
          "version",
          'Missing required "version". It selects the revision a profile is validated against, so nothing else was checked.',
          "error",
        ),
      );
      return null;
    }
    const versionString = z.string().safeParse(rawVersion);
    if (!versionString.success) {
      issues.push(
        issue(
          "version",
          "version",
          '"version" must be a string. It selects the revision a profile is validated against, so nothing else was checked.',
          "error",
        ),
      );
      return null;
    }
    if (!VERSION_RE.test(versionString.data))
      issues.push(
        issue(
          "version",
          "version",
          `"version" must be a dated release in YYYY-MM-DD format (got "${versionString.data}"). No revision can be selected from it, so nothing else was checked.`,
          "error",
        ),
      );
    return versionString.data;
  })();
  output.isLatestVersion = output.ucpVersion === LATEST_UCP_VERSION;

  const version = output.ucpVersion;

  if (version === null || !isUcpRevision(version)) {
    if (version !== null && VERSION_RE.test(version))
      issues.push(
        issue(
          "version",
          "version",
          `This profile declares UCP ${version}, a revision this validator does not implement (it implements ${UCP_REVISIONS.join(", ")}). It was not validated against this revision: what could be read of its services, capabilities and payment handlers is listed as declared, without a verdict.`,
          "warning",
        ),
      );

    // Listing only. The entries are read so the page can show what the profile
    // declares; nothing is judged, so whatever the readers report is dropped.
    const listing: Reading = {
      rules: RULES[LATEST_UCP_VERSION],
      version: version ?? LATEST_UCP_VERSION,
      issues: [],
    };
    const listedKeys =
      envelope["keys"] ?? envelope["signing_keys"] ?? root["signing_keys"];

    output.services = parseServiceEntries(root["services"], listing);
    output.capabilities = parseCapabilityEntries(root["capabilities"], listing);
    output.paymentHandlers = parsePaymentHandlerEntries(
      root["payment_handlers"],
      listing,
    );
    output.signingKeysAdvertised = listedKeys !== undefined;
    output.signingKeys = parseSigningKeyEntries(listedKeys ?? [], listing);
    output.supportedVersions = parseSupportedVersions(
      root["supported_versions"] ?? {},
      version,
      listing.issues,
    );

    return output;
  }

  const rules = RULES[version];
  const reading: Reading = { rules, version, issues };
  output.validatedAgainst = version;

  if (!wrapped)
    issues.push(
      issue(
        "envelope",
        "ucp",
        'Missing required "ucp" member. A profile is an object whose "ucp" member holds the version, services, capabilities and payment handlers; agents read them there, not at the document root.',
        "error",
      ),
    );

  if (!output.isLatestVersion)
    issues.push(
      issue(
        "version",
        "version",
        `This profile declares UCP ${version} and was validated against that revision. The latest published revision is ${LATEST_UCP_VERSION}.`,
        "warning",
      ),
    );

  // Only a string is echoed back: the value is whatever the profile holds.
  const status = root["status"];
  if (status !== undefined && !VALID_STATUSES.some((valid) => valid === status))
    issues.push(
      issue(
        "envelope",
        "status",
        typeof status === "string"
          ? `"status" must be "success" or "error" (got "${status}").`
          : '"status" must be "success" or "error".',
        "error",
      ),
    );

  if (!("services" in root))
    issues.push(
      issue(
        "services",
        "services",
        'Missing required "services" registry — agents cannot negotiate a transport without it.',
        "error",
      ),
    );
  else output.services = parseServiceEntries(root["services"], reading);

  if (!("payment_handlers" in root))
    issues.push(
      issue(
        "payment_handlers",
        "payment_handlers",
        'Missing required "payment_handlers" registry.',
        "error",
      ),
    );
  else
    output.paymentHandlers = parsePaymentHandlerEntries(
      root["payment_handlers"],
      reading,
    );

  if ("capabilities" in root)
    output.capabilities = parseCapabilityEntries(root["capabilities"], reading);
  else
    issues.push(
      issue(
        "capabilities",
        "capabilities",
        'Recommended: declare a "capabilities" registry so agents can target the right flows.',
        "warning",
      ),
    );

  if ("supported_versions" in root)
    output.supportedVersions = parseSupportedVersions(
      root["supported_versions"],
      output.ucpVersion,
      issues,
    );

  // Verifiers read signing keys from one top-level array, beside "ucp"; which
  // array is the revision's choice. Presence is what counts — a "keys" that is
  // there but is not an array is a broken publication, not an absent one.
  const stray = rules.keys === "keys" ? "signing_keys" : "keys";
  // A 2026-04-08 profile that nests the array inside "ucp" is still read, as
  // it always was here, but told where it belongs.
  const nested =
    wrapped && rules.keys === "signing_keys" && "signing_keys" in root;
  const misplaced = [
    { field: `ucp.${rules.keys}`, present: wrapped && rules.keys in root },
    { field: stray, present: stray in envelope },
    { field: `ucp.${stray}`, present: wrapped && stray in root },
  ].find((place) => place.present);

  switch (true) {
    case rules.keys in envelope: {
      output.signingKeysAdvertised = true;
      output.signingKeys = parseSigningKeyEntries(
        envelope[rules.keys],
        reading,
      );
      break;
    }
    case nested: {
      issues.push(
        issue(
          "signing_keys",
          `ucp.${rules.keys}`,
          `"${rules.keys}" is nested inside "ucp". The spec places it at the top level of the profile, beside "ucp", and a verifier that follows it looks there.`,
          "warning",
        ),
      );
      output.signingKeysAdvertised = true;
      output.signingKeys = parseSigningKeyEntries(root[rules.keys], reading);
      break;
    }
    case misplaced !== undefined: {
      issues.push(
        issue(
          "signing_keys",
          misplaced.field,
          `Signing keys are published in "${misplaced.field}", but a ${version} verifier reads only the top-level "${rules.keys}" array, so it finds none. Publish them in "${rules.keys}".`,
          "error",
        ),
      );
      break;
    }
    default:
      issues.push(
        issue(
          "security",
          rules.keys,
          `Recommended: publish "${rules.keys}" so platforms can verify RFC 9421 HTTP message signatures without prior secret exchange.`,
          "warning",
        ),
      );
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
