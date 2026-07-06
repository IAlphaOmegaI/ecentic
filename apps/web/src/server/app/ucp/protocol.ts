/**
 * UCP protocol constants, capability declarations, and response envelope
 * builders for the hosted UCP service Ecentic serves on behalf of connected
 * stores. Ported from the woo-ucp reference implementation so wire shapes stay
 * identical; the store plugin now only advertises this backend as its UCP
 * endpoint.
 *
 * Spec: https://ucp.dev/2026-04-08/specification/overview/
 */

export const UCP_VERSION = "2026-04-08";

const SPEC_BASE = `https://ucp.dev/${UCP_VERSION}`;

export const CAPABILITY = {
  CATALOG_SEARCH: "dev.ucp.shopping.catalog.search",
  CATALOG_LOOKUP: "dev.ucp.shopping.catalog.lookup",
  CART: "dev.ucp.shopping.cart",
  CHECKOUT: "dev.ucp.shopping.checkout",
  FULFILLMENT: "dev.ucp.shopping.fulfillment",
  DISCOUNT: "dev.ucp.shopping.discount",
  ORDER: "dev.ucp.shopping.order",
} as const;

export type CapabilityName = (typeof CAPABILITY)[keyof typeof CAPABILITY];

export type CapabilityEntry = {
  version: string;
  spec?: string;
  schema?: string;
  extends?: string[];
  config?: Record<string, unknown>;
};

export type CapabilityMap = Record<string, CapabilityEntry[]>;

/**
 * Structured capability declarations this business supports — the single
 * source of truth for negotiation (name → [ {version, extends?}, … ]).
 * Mirrors the discovery profile so the intersection algorithm can do version
 * selection and extension pruning.
 */
export const businessCapabilityDefinitions = (): CapabilityMap => ({
  [CAPABILITY.CATALOG_SEARCH]: [{ version: UCP_VERSION }],
  [CAPABILITY.CATALOG_LOOKUP]: [{ version: UCP_VERSION }],
  [CAPABILITY.CART]: [{ version: UCP_VERSION }],
  [CAPABILITY.CHECKOUT]: [{ version: UCP_VERSION }],
  // Fulfillment extends checkout only — cart-stage shipping isn't implemented.
  // Discount extends both checkout and cart.
  [CAPABILITY.FULFILLMENT]: [
    { version: UCP_VERSION, extends: [CAPABILITY.CHECKOUT] },
  ],
  [CAPABILITY.DISCOUNT]: [
    { version: UCP_VERSION, extends: [CAPABILITY.CHECKOUT, CAPABILITY.CART] },
  ],
  [CAPABILITY.ORDER]: [{ version: UCP_VERSION }],
});

/** Capability declarations as advertised in the discovery profile. */
export const discoveryCapabilityDeclarations = (): CapabilityMap => ({
  [CAPABILITY.CATALOG_SEARCH]: [
    {
      version: UCP_VERSION,
      spec: `${SPEC_BASE}/specification/catalog/search`,
      schema: `${SPEC_BASE}/schemas/shopping/catalog_search.json`,
    },
  ],
  [CAPABILITY.CATALOG_LOOKUP]: [
    {
      version: UCP_VERSION,
      spec: `${SPEC_BASE}/specification/catalog/lookup`,
      schema: `${SPEC_BASE}/schemas/shopping/catalog_lookup.json`,
    },
  ],
  [CAPABILITY.CART]: [
    {
      version: UCP_VERSION,
      spec: `${SPEC_BASE}/specification/cart`,
      schema: `${SPEC_BASE}/schemas/shopping/cart.json`,
    },
  ],
  [CAPABILITY.CHECKOUT]: [
    {
      version: UCP_VERSION,
      spec: `${SPEC_BASE}/specification/checkout`,
      schema: `${SPEC_BASE}/schemas/shopping/checkout.json`,
    },
  ],
  [CAPABILITY.FULFILLMENT]: [
    {
      version: UCP_VERSION,
      spec: `${SPEC_BASE}/specification/fulfillment`,
      schema: `${SPEC_BASE}/schemas/shopping/fulfillment.json`,
      extends: [CAPABILITY.CHECKOUT],
    },
  ],
  [CAPABILITY.DISCOUNT]: [
    {
      version: UCP_VERSION,
      spec: `${SPEC_BASE}/specification/discount`,
      schema: `${SPEC_BASE}/schemas/shopping/discount.json`,
      extends: [CAPABILITY.CHECKOUT, CAPABILITY.CART],
    },
  ],
  [CAPABILITY.ORDER]: [
    {
      version: UCP_VERSION,
      spec: `${SPEC_BASE}/specification/order`,
      schema: `${SPEC_BASE}/schemas/shopping/order.json`,
    },
  ],
});

export const SHOPPING_SERVICE = {
  spec: `${SPEC_BASE}/specification/overview`,
  schema: `${SPEC_BASE}/services/shopping/rest.openapi.json`,
} as const;

// ─── Messages ────────────────────────────────────────────────────────────────

export type UcpMessageSeverity =
  | "recoverable"
  | "unrecoverable"
  | "requires_buyer_input"
  | "requires_buyer_review";

export type UcpMessage = {
  type: "error" | "warning" | "info";
  content_type: "plain";
  code?: string;
  content: string;
  severity?: UcpMessageSeverity;
  path?: string;
};

export const errorMessage = (
  code: string,
  content: string,
  severity: UcpMessageSeverity = "recoverable",
  path?: string,
): UcpMessage => ({
  type: "error",
  content_type: "plain",
  code,
  content,
  severity,
  ...(path ? { path } : {}),
});

export const warningMessage = (
  code: string,
  content: string,
  path?: string,
): UcpMessage => ({
  type: "warning",
  content_type: "plain",
  code,
  content,
  ...(path ? { path } : {}),
});

export const infoMessage = (code: string, content: string): UcpMessage => ({
  type: "info",
  content_type: "plain",
  code,
  content,
});

// ─── Negotiated state ────────────────────────────────────────────────────────

/**
 * Result of a successful capability negotiation for one request: the selected
 * capability set (name → version) and the validated platform profile. Carried
 * on the request context rather than in module state — route handlers run
 * concurrently.
 */
export type Negotiated = {
  active: Record<string, string>;
  profile: Record<string, unknown>;
  profileUrl: string;
};

/** Platform-declared order webhook URL from the negotiated profile, if any. */
export const orderWebhookUrl = (negotiated: Negotiated | null): string => {
  const capabilities = (
    negotiated?.profile as
      | { ucp?: { capabilities?: Record<string, unknown> } }
      | undefined
  )?.ucp?.capabilities;
  const entries = capabilities?.[CAPABILITY.ORDER];
  if (!Array.isArray(entries)) return "";
  for (const entry of entries) {
    const url = (entry as { config?: { webhook_url?: unknown } })?.config
      ?.webhook_url;
    if (typeof url === "string" && url !== "") return url;
  }
  return "";
};

// ─── Response envelope ───────────────────────────────────────────────────────

/**
 * Builds the `ucp` metadata block with capabilities keyed by reverse-domain
 * name, narrowed to the negotiated set.
 */
export const ucpBlock = (
  relevantCapabilities: string[],
  negotiated: Negotiated | null,
  status?: "success" | "error",
): Record<string, unknown> => {
  const active = negotiated
    ? relevantCapabilities.filter((name) => negotiated.active[name])
    : relevantCapabilities;

  const capabilities = Object.fromEntries(
    active.map((name) => [
      name,
      [{ version: negotiated?.active[name] ?? UCP_VERSION }],
    ]),
  );

  return {
    version: UCP_VERSION,
    ...(status ? { status } : {}),
    capabilities,
  };
};

/** Wraps response data with the mandatory UCP envelope. */
export const ucpEnvelope = (
  data: Record<string, unknown>,
  relevantCapabilities: string[],
  negotiated: Negotiated | null,
): Record<string, unknown> => ({
  ucp: ucpBlock(relevantCapabilities, negotiated),
  ...data,
});

// ─── Transport errors ────────────────────────────────────────────────────────

/**
 * Bare transport-error body per the overview's REST binding, paired with the
 * HTTP status the router should serve it with.
 */
export type TransportError = {
  status: number;
  body: { code: string; content: string; continue_url?: string };
  headers?: Record<string, string>;
};

export const transportError = (
  code: string,
  content: string,
  status: number,
  continueUrl?: string,
): TransportError => ({
  status,
  body: {
    code,
    content,
    ...(continueUrl ? { continue_url: continueUrl } : {}),
  },
  headers: {
    ...(status === 429 || status === 503 ? { "Retry-After": "60" } : {}),
    ...(status === 401 ? { "WWW-Authenticate": 'Bearer realm="ucp"' } : {}),
  },
});

/** Capability-mismatch business outcome: HTTP 200 with a UCP error envelope. */
export const capabilitiesIncompatibleBody = (
  continueUrl: string,
  content?: string,
): Record<string, unknown> => ({
  ucp: {
    version: UCP_VERSION,
    status: "error",
    capabilities: {},
  },
  messages: [
    errorMessage(
      "capabilities_incompatible",
      content ??
        "No compatible UCP capabilities between the platform and this store.",
      "unrecoverable",
    ),
  ],
  continue_url: continueUrl,
});

// ─── Storefront fallback URLs ────────────────────────────────────────────────

export type UcpOperation =
  | "catalog.search"
  | "catalog.lookup"
  | "catalog.product"
  | "cart"
  | "checkout"
  | "order";

/** Root capability required to invoke an operation. */
export const operationCapability = (operation: UcpOperation): string => {
  switch (operation) {
    case "catalog.search":
      return CAPABILITY.CATALOG_SEARCH;
    case "catalog.lookup":
    case "catalog.product":
      return CAPABILITY.CATALOG_LOOKUP;
    case "cart":
      return CAPABILITY.CART;
    case "checkout":
      return CAPABILITY.CHECKOUT;
    case "order":
      return CAPABILITY.ORDER;
  }
};

/**
 * Fallback web URL for a failed UCP operation — the most contextually relevant
 * storefront URL so an agent can hand the buyer off to the store. Uses the
 * store's real configured page URLs when the bridge has provided them (see
 * store-info.ts); otherwise derives WooCommerce default permalinks.
 */
export const contextualStorefrontUrl = (
  storeDomain: string,
  operation?: UcpOperation,
  urls?: { home: string; cart: string; checkout: string; shop: string } | null,
): string => {
  // Preserve an explicit scheme (http is used by local dev stores); default
  // bare domains to https.
  const trimmed = storeDomain.replace(/\/+$/, "");
  const origin = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const home = urls?.home || `${origin}/`;
  switch (operation) {
    case "checkout":
      return urls?.checkout || `${origin}/checkout/`;
    case "cart":
      return urls?.cart || `${origin}/cart/`;
    case "catalog.search":
    case "catalog.lookup":
    case "catalog.product":
      return urls?.shop || `${origin}/shop/`;
    default:
      return home;
  }
};
