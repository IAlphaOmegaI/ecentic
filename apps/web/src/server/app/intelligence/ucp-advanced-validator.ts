import * as z from "zod";

// TODO: Implement UCP Advanced Validator (for free validator use ucp-js sdk)
// write advanced zod schemas for the UCP profile for the best ucp compatibility

const _LATEST_UCP_VERSION = "2026-04-08";
const UCP_VERSION_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UCP_REVERSE_DOMAIN_NAME_REGEX = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;

// TODO: suggest businesses to add webhook_url to their config to track ai orders
// config: {
//   webhook_url: "https://platform.example.com/webhooks/ucp/orders";
// }

const versionSchema = (error = "Version must be in YYYY-MM-DD format") =>
  z
    .string()
    .regex(UCP_VERSION_REGEX, error)
    .describe("Version in YYYY-MM-DD format.");

const reverseDomainNameSchema = (
  error = "Reverse-domain name must be in reverse-domain format {reverse-domain}.{service} (e.g. dev.ucp.shopping)",
) =>
  z
    .string()
    .regex(UCP_REVERSE_DOMAIN_NAME_REGEX, error)
    .describe(
      "Reverse-domain identifier used for collision-safe namespacing of capabilities, services, handlers, eligibility claims, and extension-contributed keys. Must contain at least two dot-separated segments (e.g., 'dev.ucp.shopping.checkout', 'com.example.loyalty_gold').",
    );

const versionConstraintSchema = z
  .looseObject({
    min: versionSchema(
      "Version constraint min must be in YYYY-MM-DD format",
    ).describe("Minimum required version (inclusive)."),
    max: versionSchema("Version constraint max must be in YYYY-MM-DD format")
      .optional()
      .describe(
        "Maximum compatible version (inclusive). When absent, no upper bound.",
      ),
  })
  .refine(
    (constraint) =>
      constraint.max === undefined || constraint.max >= constraint.min,
    { error: "version constraint max must be >= min", path: ["max"] },
  )
  .describe("Version range requirement with minimum and optional maximum.");

const requiresSchema = z
  .object({
    protocol: versionConstraintSchema
      .optional()
      .describe("Required protocol version."),
    capabilities: z
      .record(reverseDomainNameSchema(), versionConstraintSchema)
      .optional()
      .describe(
        "Required capability versions, keyed by reverse-domain name. Keys must be a subset of the extension's declared capability names.",
      ),
  })
  .describe(
    "Version requirements for extension schemas. Declares minimum (and optionally maximum) protocol and capability versions needed for correct operation.",
  );

export const ucpMCPError = z.object({
  code: z.number().int().describe("The error type that occurred."),
  message: z
    .string()
    .describe(
      "A short description of the error. The message SHOULD be limited to a concise single sentence.",
    ),
  data: z
    .unknown()
    .optional()
    .describe(
      "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).",
    ),
});

// TODO: extend from @ai-sdk/mcp JSONRPCResponseSchema
export const ucpMCPResponseSchema = z
  .union([
    z
      .object({
        jsonrpc: z.literal("2.0"),
        id: z
          .union([z.string(), z.number().int()])
          .describe("A uniquely identifying ID for a request in JSON-RPC."),
        result: z.looseObject({
          structuredContent: z.record(z.string(), z.unknown()),
          content: z.array(z.unknown()).optional(),
          _meta: z.optional(z.object({}).loose()),
        }),
      })
      .describe("A successful (non-error) response to a request."),
    z
      .object({
        jsonrpc: z.literal("2.0"),
        id: z.union([z.string(), z.number().int()]),
        error: ucpMCPError,
      })
      .describe("A response to a request that indicates an error occurred."),
  ])
  .describe("A response to a request, containing either the result or error.");

const httpsUrlSchema = z.url({
  protocol: /^https$/,
  hostname: z.regexes.domain,
  error: "url must be a valid HTTPS URL",
});

const entitySchema = z
  .object({
    version: versionSchema(),
    // TODO: suggest
    spec: httpsUrlSchema
      .optional()
      .describe("URL to human-readable specification document."),
    // TODO: suggest
    schema: httpsUrlSchema
      .optional()
      .describe("URL to JSON Schema for this entity."),
    id: z
      .string()
      .optional()
      .describe(
        "Unique identifier for this entity instance. Used to disambiguate when multiple instances exist.",
      ),
    // TODO: specify
    config: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Entity-specific configuration. Structure defined by each entity's schema.",
      ),
  })
  .describe("Shared foundation for all UCP entities.");

// dev.ucp.* → ucp.dev, com.example.* → example.com, dev.shopify.* → shopify.dev
const namespaceAuthorityHostname = (namespaceName: string) => {
  const segments = namespaceName.split(".");

  if (segments.length < 2) return null;
  return `${segments[1]}.${segments[0]}`;
};

const urlHostname = (value: string) => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const urlOriginMatchesNamespaceAuthority = (
  url: string,
  namespaceName: string,
) => {
  const authority = namespaceAuthorityHostname(namespaceName);
  const hostname = urlHostname(url);

  return authority !== null && hostname === authority;
};

const supportedVersionsSchema = z
  .record(versionSchema(), httpsUrlSchema)
  .describe(
    "Previous protocol versions this business supports, mapped to profile URIs. Businesses that support older protocol versions SHOULD advertise each version and link to its profile. Each URI points to a complete, self-contained profile for that version. When omitted, only version is supported.",
  );

const serviceEndpointSchema = z
  .url({
    protocol: /^https$/,
    hostname: z.regexes.domain,
    error: "Endpoint must be a valid URL with scheme (https)",
  })
  .refine(
    (value) => !value.endsWith("/"),
    "Endpoint should not have a trailing slash",
  )
  .describe("Endpoint URL for this transport binding.");

const embeddedTransportConfigSchema = z
  .looseObject({
    delegate: z
      .array(z.string())
      .describe(
        "Delegations the business allows. At service-level, declares available delegations. In UCP responses, confirms accepted delegations for this session.",
      ),
    color_scheme: z
      .array(z.enum(["light", "dark"]))
      .describe(
        "Color schemes the business supports. Hosts use ec_color_scheme query parameter to request a scheme from this list.",
      ),
  })
  .describe(
    "Per-session configuration for embedded transport binding. Allows businesses to vary EP availability and delegations based on cart contents, agent authorization, or policy.",
  );

const baseServiceSchema = entitySchema.extend({
  // TODO: specify config
  // TODO: suggest specifying for all bindings
  // TODO: suggest specifying for rest, mcp and embedded transport bindings
  endpoint: serviceEndpointSchema,
});

const businessServiceSchema = z
  .discriminatedUnion("transport", [
    baseServiceSchema.extend({
      transport: z.enum(["mcp", "rest"]),
    }),
    baseServiceSchema.extend({
      transport: z.literal("a2a"),
    }),
    baseServiceSchema.extend({
      transport: z.literal("embedded"),
      endpoint: serviceEndpointSchema.optional(),
      config: embeddedTransportConfigSchema.optional(),
    }),
  ])
  .describe(
    "Service binding for a specific transport for business/merchant configuration. Each transport binding is a separate entry in the service array.",
  );

const businessServicesSchema = z
  .record(reverseDomainNameSchema(), z.array(businessServiceSchema))
  .describe("Service registry keyed by reverse-domain name.");
//
//   for (const [namespaceName, entries] of Object.entries(services)) {
//     const authority = namespaceAuthorityHostname(namespaceName);

//     if (!authority) {
//       context.addIssue({
//         code: "custom",
//         path: [namespaceName],
//         message: `Service namespace "${namespaceName}" must include a valid reverse-domain authority`,
//       });
//     }

//     for (const entry of entries) {
//       const urlProperties = (["spec", "schema"] as const).entries();

//       for (const [index, field] of urlProperties) {
//         const value = entry[field];

//         if (
//           typeof value === "string" &&
//           !urlOriginMatchesNamespaceAuthority(value, namespaceName)
//         ) {
//           context.addIssue({
//             code: "custom",
//             path: [namespaceName, index, field],
//             message: `${field} origin must match namespace authority (${authority}) for "${namespaceName}"`,
//           });
//         }
//       }
//     }
//   }
// });

const capabilitySchema = entitySchema
  .extend({
    extends: z
      .union([reverseDomainNameSchema(), z.array(reverseDomainNameSchema())])
      .optional()
      .describe("Parent capability(s) this extends."),
    // TODO: replace with discriminated union ("extends")
    requires: requiresSchema
      .optional()
      .describe(
        "Version requirements declared by this extension. Only meaningful when extends is present.",
      ),
  })
  .describe(
    "Schema for business/merchant level for UCP capabilities and extensions. May include business-specific config overrides.",
  );

const capabilitiesSchema = z
  .record(reverseDomainNameSchema(), z.array(capabilitySchema))
  .describe("Capability registry keyed by reverse-domain name.");
// .superRefine((capabilities, context) => {
//   for (const [namespaceName, entries] of Object.entries(capabilities)) {
//     const authority = namespaceAuthorityHostname(namespaceName);

//     if (!authority) {
//       context.addIssue({
//         code: "custom",
//         path: [namespaceName],
//         message: `Capability namespace "${namespaceName}" must include a valid reverse-domain authority`,
//       });
//       continue;
//     }

//     const urlProperties = (["spec", "schema"] as const).entries();

//     for (const entry of entries) {
//       for (const [index, field] of urlProperties) {
//         const value = entry[field];

//         if (
//           typeof value === "string" &&
//           !urlOriginMatchesNamespaceAuthority(value, namespaceName)
//         ) {
//           context.addIssue({
//             code: "custom",
//             path: [namespaceName, index, field],
//             message: `${field} origin must match namespace authority (${authority}) for "${namespaceName}"`,
//           });
//         }
//       }
//     }
//   }
// });

const paymentHandlerSchema = entitySchema
  .extend({
    id: z.string().describe("Unique payment handler identifier."),
    available_instruments: z
      .array(z.looseObject({ type: z.string() }))
      .min(1)
      .optional()
      .describe(
        "Instrument types this handler supports. When absent, all instruments are available.",
      ),
  })
  .describe(
    "Business declaration for payment handlers. Handlers define how payment instruments are processed. May include partial config state required for discovery.",
  );

const signingKeySchema = z.object({
  kid: z.string(),
  kty: z.string(),
  crv: z.string().optional(),
  x: z.string().optional(),
  y: z.string().optional(),
  use: z.enum(["enc", "sig"]).optional(),
  alg: z.string().optional(),
  n: z.string().optional(),
  e: z.string().optional(),
});

export const businessProfileSchema = z
  .looseObject({
    ucp: z.object({
      // version: versionSchema,
      version: z
        .literal("2026-04-08")
        .describe("UCP version in YYYY-MM-DD format."),
      services: businessServicesSchema,
      payment_handlers: z
        .record(reverseDomainNameSchema(), z.array(paymentHandlerSchema))
        .describe("Payment handler registry keyed by reverse-domain name."),
      supported_versions: supportedVersionsSchema.optional(),
      capabilities: capabilitiesSchema.optional(),
    }),
    signing_keys: z.array(signingKeySchema).optional(),
  })
  .describe(
    "UCP protocol metadata for business/merchant-level configuration for discovery profiles and responses. Uses slim schema pattern with context-specific required fields.",
  );

// .superRefine((value, ctx) => {
//   // TODO: fetch if store has previous versions that are not in the supported_versions list

//   if (
//     value.ucp.version !== LATEST_UCP_VERSION &&
//     value.ucp.supported_versions === undefined
//   ) {
//     ctx.addIssue({
//       code: "custom",
//       message:
//         "Businesses supporting older protocol versions should publish version-specific profiles",
//     });
//   }

//   // TODO: Implement more rules
// });

export const negotiationErrorSchema = z.union([
  z.object({
    code: z
      .literal("invalid_profile_url")
      .describe("Profile URL is malformed, missing, or unresolvable."),
    rest: z.literal(400),
    mcp: z.literal(-32001),
  }),
  z.object({
    code: z
      .literal("profile_unreachable")
      .describe("Resolved URL but fetch failed (timeout, non-2xx)."),
    rest: z.literal(424),
    mcp: z.literal(-32001),
  }),
  z.object({
    code: z
      .literal("profile_malformed")
      .describe("Fetched content is not valid JSON or violates schema."),
    rest: z.literal(422),
    mcp: z.literal(-32001),
  }),
  z.object({
    code: z
      .literal("version_unsupported")
      .describe("Platform's protocol version not supported."),
    rest: z.literal(422),
    mcp: z.literal(-32001),
  }),
  z.object({
    code: z
      .literal("capabilities_incompatible")
      .describe("No compatible capabilities in intersection."),
    rest: z.literal(200),
    // TODO: specify
    mcp: z.unknown(),
  }),
]);

export const signatureErrorSchema = z.union([
  z.object({
    code: z
      .literal("signature_missing")
      .describe("Required signature header/field not present."),
    rest: z.literal(401),
    mcp: z.literal(-32000),
  }),
  z.object({
    code: z
      .literal("signature_invalid")
      .describe("Signature verification failed."),
    rest: z.literal(401),
    mcp: z.literal(-32000),
  }),
  z.object({
    code: z
      .literal("key_not_found")
      .describe("Key ID not found in signer's signing_keys."),
    rest: z.literal(401),
    mcp: z.literal(-32000),
  }),
  z.object({
    code: z
      .literal("digest_mismatch")
      .describe("Body digest doesn't match Content-Digest header."),
    rest: z.literal(400),
    mcp: z.literal(-32600),
  }),
  z.object({
    code: z
      .literal("algorithm_unsupported")
      .describe("Signature algorithm not supported."),
    rest: z.literal(400),
    mcp: z.literal(-32600),
  }),
]);

const signalNameSchema = z.union([
  z.literal("dev.ucp.buyer_ip").describe("Client's IP address (IPv4 or IPv6)."),
  z
    .literal("dev.ucp.user_agent")
    .describe("Client's HTTP User-Agent header or equivalent."),
  reverseDomainNameSchema(
    "Signal name must use reverse-domain format {reverse-domain}.{signal}",
  ).describe(
    "Reverse-domain identifier (e.g., dev.ucp.buyer_ip, com.example.device_id).",
  ),
]);

const signalsSchema = z
  .object({
    "dev.ucp.buyer_ip": z
      .string()
      .optional()
      .describe("Client's IP address (IPv4 or IPv6)."),
    "dev.ucp.user_agent": z
      .string()
      .optional()
      .describe("Client's HTTP User-Agent header or equivalent."),
  })
  // TODO: specify entry value
  .and(z.record(signalNameSchema, z.unknown()))
  .describe(
    "Environment data provided by the platform to support authorization and abuse prevention. Values MUST NOT be buyer-asserted claims — platforms provide signals based on direct observation or independently verifiable third-party attestations. All signal keys MUST use reverse-domain naming to ensure provenance and prevent collisions when multiple extensions contribute to the shared namespace.",
  );

// TODO: specify
const attributionSchema = z
  .record(
    z.string(),
    z
      .string()
      .describe(
        "URL-style parameter value, encoded as a string. Numeric or boolean values MUST be string-encoded as they would be in a URL query string.",
      ),
  )
  .describe(
    "Platform-emitted referral and conversion-event context — campaign identifiers, click IDs, source/medium markers, etc. The same parameters platforms communicate via URL query parameters in browser-based flows.",
  );

const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "currency must be a 3-letter ISO 4217 code")
  .describe("ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP').");

export const priceSchema = z
  .object({
    amount: z
      .number()
      .int()
      .nonnegative()
      .describe("Amount in ISO 4217 minor units. Use 0 for free items."),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, "currency must be a 3-letter ISO 4217 code")
      .describe("ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP')."),
  })
  .describe("Price with explicit currency.");

const priceRangeSchema = z
  .object({
    min: priceSchema.describe("Minimum price in ISO 4217 minor units."),
    max: priceSchema.describe("Maximum price in ISO 4217 minor units."),
  })
  .refine((range) => range.min.currency === range.max.currency, {
    error: "price range min and max must share a currency",
    path: ["max", "currency"],
  })
  .refine((range) => range.min.amount <= range.max.amount, {
    error: "price range min must not exceed max",
    path: ["min", "amount"],
  })
  .describe(
    "A price range representing minimum and maximum values (e.g., across product variants).",
  );

const baseMessageSchema = z
  .object({
    content: z.string().describe("Human-readable message."),
    content_type: z
      .enum(["plain", "markdown"])
      // TODO: zod should exclude field frm required array in json schema if default is provided
      .default("plain")
      .optional()
      .describe("Content format."),
    path: z
      .string()
      .optional()
      .describe(
        "RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).",
      ),
  })
  .describe("Container for error, warning, or info messages.");

export const messageSchema = z.discriminatedUnion("type", [
  baseMessageSchema.extend({
    type: z.literal("error").describe("Error message."),
    code: z
      .string()
      .describe(
        "Code identifying the error type. Standard codes are defined in the specification and have standardized semantics; freeform codes are permitted.",
      ),
    severity: z
      .enum([
        "recoverable",
        "requires_buyer_input",
        "requires_buyer_review",
        "unrecoverable",
      ])
      .describe(
        "Reflects the resource state and recommended action. 'recoverable': platform can resolve by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires information their API doesn't support collecting programmatically (checkout incomplete). 'requires_buyer_review': buyer must authorize before order placement due to policy, regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on, retry with new resource or inputs. Errors with 'requires_*' severity contribute to 'status: requires_escalation'.",
      ),
  }),
  baseMessageSchema.extend({
    type: z.literal("warning").describe("Message type discriminator."),
    code: z
      .string()
      .describe(
        "Code identifying the warning type. Standard codes are defined in the specification and have standardized semantics; freeform codes are permitted.",
      ),
    presentation: z
      .enum(["notice", "disclosure"])
      // TODO: zod should exclude field frm required array in json schema if default is provided
      .default("notice")
      .optional()
      .describe(
        "Rendering contract for this warning. 'notice' (default): platform MUST display, MAY dismiss. 'disclosure': platform MUST display in proximity to the path-referenced component, MUST NOT hide or auto-dismiss. See specification for full contract.",
      ),
    image_url: z
      .url()
      .optional()
      .describe(
        "URL to a required visual element (e.g., warning symbol, energy class label).",
      ),
    url: z
      .url()
      .optional()
      .describe(
        "Reference URL for more information (e.g., regulatory site, registry entry, policy page).",
      ),
  }),
  baseMessageSchema.extend({
    type: z.literal("info").describe("Informational message."),
    code: z
      .string()
      .optional()
      .describe(
        "Code identifying the info type. Standard codes are defined in the specification and have standardized semantics; freeform codes are permitted.",
      ),
  }),
]);

// Standardized checkout error codes platforms are expected to handle with
// specific UX. Reference set — message.code stays freeform, so this is not
// enforced on the union; use it where you want strict checkout error handling.
export const checkoutStandardErrorCodeSchema = z
  .enum([
    "out_of_stock",
    "item_unavailable",
    "address_undeliverable",
    "payment_failed",
    "eligibility_invalid",
  ])
  .describe("Standard checkout error codes with standardized platform UX.");

// Well-known eligibility message codes (see Eligibility Verification at
// Completion). Each is paired with a message type: not_accepted→warning,
// accepted→info, invalid→error.
export const eligibilityMessageCodeSchema = z
  .enum([
    "eligibility_not_accepted",
    "eligibility_accepted",
    "eligibility_invalid",
  ])
  .describe("Well-known eligibility message codes.");

const descriptionSchema = z
  .object({
    plain: z.string().optional().describe("Plain text content."),
    html: z
      .string()
      .optional()
      .describe(
        "HTML-formatted content. Security: Platforms MUST sanitize before rendering—strip scripts, event handlers, and untrusted elements. Treat all rich text as untrusted input.",
      ),
    markdown: z.string().optional().describe("Markdown-formatted content."),
  })
  .refine(
    (description) =>
      description.plain !== undefined ||
      description.html !== undefined ||
      description.markdown !== undefined,
    "description must include at least one of: plain, html, markdown",
  );

const categorySchema = z.object({
  value: z
    .string()
    .describe("Category value or path (e.g., 'Apparel > Shirts', '1604')."),
  taxonomy: z
    .string()
    .optional()
    .describe(
      "Source taxonomy. Well-known values: google_product_category, shopify, merchant.",
    ),
});

const contextSchema = z
  .looseObject({
    address_country: z
      .string()
      .optional()
      .describe(
        "The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example 'US'. For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as 'SGP' or a full country name such as 'Singapore' can also be used. Optional hint for market context (currency, availability, pricing)—higher-resolution data (e.g., shipping address) supersedes this value.",
      ),
    address_region: z
      .string()
      .optional()
      .describe(
        "The region in which the locality is, and which is in the country. For example, California or another appropriate first-level Administrative division. Optional hint for progressive localization—higher-resolution data (e.g., shipping address) supersedes this value.",
      ),
    postal_code: z
      .string()
      .optional()
      .describe(
        "The postal code. For example, 94043. Optional hint for regional refinement—higher-resolution data (e.g., shipping address) supersedes this value.",
      ),
    intent: z
      .string()
      .optional()
      .describe(
        "Background context describing buyer's intent (e.g., 'looking for a gift under $50', 'need something durable for outdoor use'). Informs relevance, recommendations, and personalization.",
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Preferred language for content. Use IETF BCP 47 language tags (e.g., 'en', 'fr-CA', 'zh-Hans'). For REST, equivalent to Accept-Language header—platforms SHOULD fall back to Accept-Language when this field is absent; when provided, overrides Accept-Language. Businesses MAY return content in a different language if unavailable.",
      ),
    currency: z
      .string()
      .optional()
      .describe(
        "Preferred currency (ISO 4217, e.g., 'EUR', 'USD'). Businesses determine presentment currency from context and authoritative signals; this hint MAY inform selection in multi-currency markets. Also serves as the denomination for price filter values — platforms SHOULD include this field when sending price filters. Response prices include explicit currency confirming the resolution.",
      ),
    eligibility: z
      .array(
        reverseDomainNameSchema(
          "Buyer claims about eligible benefits such as loyalty membership, payment instrument perks, and similar. Recognized claims MAY inform the Business response (e.g., member-only product availability, adjusted pricing in catalog, provisional discounts at cart or checkout). Businesses MUST ignore unrecognized values without error. Values MUST use reverse-domain naming (e.g., 'com.example.loyalty_gold', 'org.school.student') and MUST be non-identifying.",
        ),
      )
      .refine(
        (values) => new Set(values).size === values.length,
        "eligibility must not contain duplicate values",
      )
      .optional(),
  })
  .describe(
    "Provisional buyer signals for relevance and localization—not authoritative data. Businesses SHOULD use these values when verified inputs (e.g., shipping address) are absent, and MAY ignore or down-rank them if inconsistent with higher-confidence signals (authenticated account, risk detection) or regulatory constraints (export controls). Eligibility and policy enforcement MUST occur at checkout time using binding transaction data. Context SHOULD be non-identifying and can be disclosed progressively—coarse signals early, finer resolution as the session progresses. Higher-resolution data (shipping address, billing address) supersedes context.",
  );

const priceFilterSchema = z
  .object({
    min: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe(
        "Minimum price in ISO 4217 minor units (denominated in context.currency).",
      ),
    max: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe(
        "Maximum price in ISO 4217 minor units (denominated in context.currency).",
      ),
  })
  .refine(
    (filter) =>
      filter.min === undefined ||
      filter.max === undefined ||
      filter.min <= filter.max,
    { error: "price filter min must not exceed max", path: ["min"] },
  )
  .describe(
    "Price range filter denominated in context.currency. When context.currency matches the presentment currency, businesses apply the filter directly. When it differs, businesses SHOULD convert filter values to the presentment currency before applying; if conversion is not supported, businesses MAY ignore the filter and SHOULD indicate this via a message. When context.currency is absent, filter denomination is ambiguous and businesses MAY ignore it.",
  );

const searchFiltersSchema = z
  .looseObject({
    categories: z
      .array(z.string())
      .optional()
      .describe(
        "Filter by product categories (OR logic — matches products in any listed categories). Values match against the value field in product category entries. Valid values can be discovered from the categories field in search results, merchant documentation, or standard taxonomies that businesses may align with.",
      ),
    price: priceFilterSchema.optional(),
  })
  .describe(
    "Filter criteria to narrow search results. All specified filters combine with AND logic.",
  );

const paginationRequestSchema = z
  .object({
    cursor: z
      .string()
      .optional()
      .describe("Opaque cursor from previous response."),
    limit: z
      .number()
      .int()
      .positive()
      // TODO: zod should exclude field frm required array in json schema if default is provided
      .default(10)
      .optional()
      .describe(
        "Requested page size. Implementations MAY clamp to a lower maximum.",
      ),
  })
  .describe("Cursor-based Pagination parameters for list operation requests.");

export const searchCatalogRequestSchema = z
  .object({
    query: z.string().optional().describe("Free-text search query."),
    context: contextSchema.optional(),
    signals: signalsSchema.optional(),
    filters: searchFiltersSchema.optional(),
    pagination: paginationRequestSchema.optional(),
  })
  .refine(
    (request) => {
      const hasQuery =
        request.query !== undefined && request.query.trim().length > 0;
      const hasFilters =
        request.filters !== undefined &&
        Object.keys(request.filters).length > 0;
      return hasQuery || hasFilters;
    },
    {
      error:
        "search request MUST include at least one input: a non-empty query or at least one filter",
    },
  );

const selectedOptionSchema = z
  .object({
    name: z.string().describe("Option name (e.g., 'Size')."),
    label: z.string().describe("Selected option label (e.g., 'Large')."),
    id: z
      .string()
      .optional()
      .describe(
        "Optional option value identifier from option_value.id. When present, the server SHOULD use it for matching; name and label remain required for display.",
      ),
  })
  .describe("A specific option selection on a variant (e.g., Size: Large).");

export const mediaSchema = z.object({
  type: z
    .string()
    .describe("Media type. Well-known values: image, video, model_3d."),
  url: z.url().describe("URL to the media resource."),
  alt_text: z
    .string()
    .optional()
    .describe("Accessibility text describing the media."),
  width: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Width in pixels (for images/video)."),
  height: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Height in pixels (for images/video)."),
});

export const ratingSchema = z
  .object({
    value: z.number().nonnegative().describe("Average rating value."),
    scale_max: z
      .number()
      .min(1) // .positive()
      .describe("Maximum value on the rating scale (e.g., 5 for 5-star)."),
    scale_min: z
      .number()
      .nonnegative()
      // TODO: zod should exclude field frm required array in json schema if default is provided
      .default(1)
      .optional()
      .describe("Minimum value on the rating scale (e.g., 1 for 1-5 stars)."),
    count: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Number of reviews contributing to the rating."),
  })
  .refine(
    (rating) =>
      rating.scale_min === undefined || rating.scale_min < rating.scale_max,
    { error: "scale_min must be less than scale_max", path: ["scale_min"] },
  )
  .refine(
    (rating) =>
      rating.value >= (rating.scale_min ?? 0) &&
      rating.value <= rating.scale_max,
    {
      error: "value must fall within [scale_min ?? 0, scale_max]",
      path: ["value"],
    },
  );

// TODO: écentic Enhancement:
// Spec defines `available`/`exists` semantics for option values; the variant-level
const variantAvailabilitySchema = z
  .looseObject({
    available: z
      .boolean()
      .describe(
        "Whether this variant can be purchased. See status for fulfillment details.",
      ),
    status: z
      .string()
      .optional()
      .describe(
        "Qualifies available with fulfillment state. Well-known values: in_stock, backorder, preorder, out_of_stock, discontinued.",
      ),
    // écentic extension (not in spec):
    quantity: z.number().int().nonnegative().optional(),
    policy: z
      .enum(["in_stock", "out_of_stock", "preorder", "backorder"])
      .optional(),
  })
  .refine((value) => !(value.available === true && value.quantity === 0), {
    error: "available cannot be true when quantity is 0",
    path: ["quantity"],
  });

export const variantSchema = z.looseObject({
  id: z
    .string()
    .describe(
      "Global ID (GID) uniquely identifying this variant. Used as item.id in checkout.",
    ),
  title: z.string().describe("Variant display title (e.g., 'Blue / Large')."),
  description: descriptionSchema.describe(
    "Variant description in one or more formats.",
  ),
  price: priceSchema.describe("Current selling price."),
  sku: z
    .string()
    .optional()
    .describe("Business-assigned identifier for inventory and fulfillment."),
  barcodes: z
    .array(
      z.object({
        type: z
          .string()
          .describe(
            "Barcode standard. Well-known values: UPC, EAN, ISBN, GTIN, JAN.",
          ),
        value: z.string().describe("Barcode value."),
      }),
    )
    .optional()
    .describe(
      "Industry-standard product identifiers for cross-reference and correlation.",
    ),
  handle: z.string().optional().describe("URL-safe variant handle/slug."),
  url: z.url().optional().describe("Canonical variant page URL."),
  categories: z
    .array(categorySchema)
    .optional()
    .describe("Variant categories with optional taxonomy identifiers."),
  list_price: priceSchema.optional().describe("Variant listing price."),
  unit_price: z
    .object({
      amount: z
        .number()
        .int()
        .nonnegative()
        .describe(
          "Unit price in ISO 4217 minor units. Business MUST return precomputed unit price value: (variant.price / measure.value) * reference.value.",
        ),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/, "currency must be a 3-letter ISO 4217 code")
        .describe("ISO 4217 currency code."),
      measure: z
        .object({
          value: z.number().describe("Package quantity."),
          unit: z.string().describe("Unit of measurement."),
        })
        .describe("Product quantity in packaging (e.g., 750ml bottle)."),
      reference: z
        .object({
          value: z.number().int().describe("Reference quantity."),
          unit: z.string().describe("Unit of measurement."),
        })
        .describe(
          "Denominator for unit price display (e.g., per 100ml, per 1kg).",
        ),
    })
    .optional()
    .describe(
      "Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.",
    ),
  availability: variantAvailabilitySchema
    .optional()
    .describe("Variant availability for purchase."),
  options: z
    .array(selectedOptionSchema)
    .optional()
    .describe(
      "Option values that define this variant (e.g., Color: Blue, Size: Large).",
    ),
  media: z
    .array(mediaSchema)
    .optional()
    .describe(
      "Variant media (images, videos, 3D models). First item is the featured media for listings.",
    ),
  rating: ratingSchema.optional().describe("Variant rating."),
  tags: z
    .array(z.string())
    .optional()
    .describe("Variant tags for categorization and search."),
  // TODO: specify
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Business-defined custom data extending the standard variant model.",
    ),
  seller: z
    .object({
      name: z.string().optional().describe("Seller display name."),
      links: z
        .array(
          z.looseObject({
            type: z
              .string()
              .describe(
                "Type of link. Well-known values: `privacy_policy`, `terms_of_service`, `refund_policy`, `shipping_policy`, `faq`. Consumers SHOULD handle unknown values gracefully by displaying them using the `title` field or omitting the link.",
              ),
            url: z
              .url()
              .describe(
                "The actual URL pointing to the content to be displayed.",
              ),
            title: z
              .string()
              .optional()
              .describe(
                "Optional display text for the link. When provided, use this instead of generating from type.",
              ),
          }),
        )
        .optional()
        .describe("Seller policy and information links."),
    })
    .optional()
    .describe("Optional seller context for this variant."),
});

const optionValueSchema = z.object({
  label: z
    .string()
    .describe("Display text for this option value (e.g., 'Small', 'Blue')."),
  id: z
    .string()
    .optional()
    .describe(
      "Optional server-assigned identifier for this option value. When present in a selected_option, the server SHOULD use it for matching instead of label.",
    ),
});

const detailOptionValueSchema = optionValueSchema
  .extend({
    available: z
      .boolean()
      .optional()
      .describe(
        "Whether a variant matching this value and the current option selections is purchasable. UI: selectable.",
      ),
    exists: z
      .boolean()
      .optional()
      .describe(
        "Whether a variant matching this value and the current option selections exists in the catalog. false → no such combination (UI: hidden or visually distinct).",
      ),
  })
  .refine((value) => !(value.available === true && value.exists === false), {
    error:
      "available cannot be true when exists is false — a purchasable value must map to an existing variant",
    path: ["available"],
  });

const productOptionSchema = z.object({
  name: z.string().describe("Option name (e.g., 'Size', 'Color')."),
  values: z
    .array(optionValueSchema)
    .min(1)
    .describe("Available values for this option."),
});

const detailProductOptionSchema = z.object({
  name: z.string().describe("Option name (e.g., 'Size', 'Color')."),
  values: z
    .array(detailOptionValueSchema)
    .min(1)
    .describe(
      "Available values with availability signals relative to the current option selections.",
    ),
});

export const productSchema = z.looseObject({
  id: z.string().describe("Global ID (GID) uniquely identifying this product."),
  title: z.string().describe("Product title."),
  description: descriptionSchema.describe(
    "Product description in one or more formats.",
  ),
  price_range: priceRangeSchema.describe("Price range across all variants."),
  variants: z
    .array(variantSchema)
    .min(1, "product MUST have at least one variant")
    .describe(
      "Purchasable variants of this product. First item is the featured variant for listings.",
    ),
  selected: z
    .array(selectedOptionSchema)
    .optional()
    .describe(
      "Effective option selections after any relaxation. MUST be present when the product has configurable options; reflects the featured variant's defaults otherwise.",
    ),
  handle: z
    .string()
    .optional()
    .describe(
      "URL-safe slug for SEO-friendly URLs (e.g., 'blue-runner-pro'). Use id for stable API references.",
    ),
  url: z.url().optional().describe("Canonical product page URL."),
  categories: z
    .array(categorySchema)
    .optional()
    .describe("Product categories with optional taxonomy identifiers."),
  list_price_range: priceRangeSchema
    .optional()
    .describe("List price range before discounts (for strikethrough display)."),
  media: z
    .array(mediaSchema)
    .optional()
    .describe(
      "Product media (images, videos, 3D models). First item is the featured media for listings.",
    ),
  options: z
    .array(productOptionSchema)
    .optional()
    .describe("Product options (Size, Color, etc.)."),
  rating: ratingSchema.optional().describe("Aggregate product rating."),
  tags: z
    .array(z.string())
    .optional()
    .describe("Product tags for categorization and search.."),
  // TODO: specify
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Business-defined custom data extending the standard product model.",
    ),
});

// écentic Enhancement:
const refineProductIntegrity = (
  product: z.infer<typeof productSchema>,
  context: z.core.$RefinementCtx,
) => {
  const optionNames = new Set(product.options?.map((option) => option.name));
  const selectedNames = new Set<string>();

  for (const [index, selection] of (product.selected ?? []).entries()) {
    // selected option names must be unique
    if (selectedNames.has(selection.name)) {
      context.addIssue({
        code: "custom",
        path: ["selected", index, "name"],
        message: `option "${selection.name}" appears more than once in selected`,
      });
    } else {
      selectedNames.add(selection.name);
    }

    // must reference a declared product option
    if (optionNames.size > 0 && !optionNames.has(selection.name)) {
      context.addIssue({
        code: "custom",
        path: ["selected", index, "name"],
        message: `selected option "${selection.name}" is not a declared product option`,
      });
    }
  }
};

// écentic Enhancement:
// Each variant in a lookup_catalog response carries inputs[] correlating it back
// to the request identifiers that resolved to it. Spec: variants without an
// inputs entry MUST NOT appear in lookup responses.
const variantInputSchema = z
  .object({
    id: z
      .string()
      .describe(
        "The identifier from the lookup request that resolved to this variant.",
      ),
    match: z
      .string()
      .optional()
      .describe(
        "How the request identifier resolved. Well-known: 'exact' (input directly identifies this variant), 'featured' (server selected as representative).",
      ),
  })
  .describe(
    "Maps a request identifier to the variant it resolved to, with match semantics.",
  );

// écentic Enhancement:
// Lookup responses are stricter: every variant MUST carry an inputs[] entry
// correlating it back to the request identifiers that resolved to it.
const lookupVariantSchema = variantSchema.extend({
  inputs: z
    .array(variantInputSchema)
    .min(1, "lookup response variants MUST carry at least one inputs entry")
    .describe(
      "Which request identifiers resolved to this variant, and how. Each entry maps a request ID to its match type.",
    ),
});

export const lookupProductSchema = productSchema
  .extend({
    variants: z
      .array(lookupVariantSchema)
      .min(1, "product MUST have at least one variant"),
  })
  .superRefine(refineProductIntegrity);

export const detailProductSchema = productSchema
  .extend({
    options: z
      .array(detailProductOptionSchema)
      .optional()
      .describe(
        "Product options with availability signals relative to the effective selections.",
      ),
  })
  .superRefine(refineProductIntegrity)
  .superRefine((product, ctx) => {
    // get_product MUST return product.selected when the product has configurable options.
    const hasOptions = (product.options?.length ?? 0) > 0;
    if (hasOptions && product.selected === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["selected"],
        message:
          "product.selected MUST be present when the product has configurable options",
      });
    }
  });

const serviceResponseSchema = z
  .discriminatedUnion("transport", [
    baseServiceSchema.extend({
      transport: z.enum(["mcp", "rest", "a2a"]),
    }),
    baseServiceSchema.extend({
      transport: z.literal("embedded"),
      config: embeddedTransportConfigSchema.optional(),
    }),
  ])
  .describe(
    "Service binding in API responses. Includes per-resource transport configuration via typed config.",
  );

const paymentHandlersResponseSchema = z.record(
  reverseDomainNameSchema(),
  z.array(
    paymentHandlerSchema.describe(
      "Handler reference in responses. May include full config state for runtime usage of the handler.",
    ),
  ),
);

const baseUCPResponseSchema = z.looseObject({
  version: versionSchema(),
  status: z
    .enum(["success", "error"])
    .optional()
    .describe("Application-level status. Defaults to success."),
  services: z
    .record(reverseDomainNameSchema(), z.array(serviceResponseSchema))
    .optional(),
  capabilities: z
    .record(
      reverseDomainNameSchema(),
      z.array(
        capabilitySchema.describe(
          "Capability reference in responses. Only name/version required to confirm active capabilities.",
        ),
      ),
    )
    .optional(),
  payment_handlers: paymentHandlersResponseSchema.optional(),
});

const ucpCatalogResponseSchema = baseUCPResponseSchema.describe(
  "UCP metadata for catalog responses.",
);

const ucpCartResponseSchema = baseUCPResponseSchema.describe(
  "UCP metadata for cart responses. No payment handlers needed pre-checkout.",
);

const ucpCheckoutResponseSchema = baseUCPResponseSchema
  .extend({
    payment_handlers: paymentHandlersResponseSchema.describe(
      "Payment handler registry. Required in checkout responses.",
    ),
  })
  .describe("UCP metadata for checkout responses.");

const ucpOrderResponseSchema = baseUCPResponseSchema.describe(
  "UCP metadata for order responses. No payment handlers needed post-purchase.",
);

const basePaginationResponseSchema = z.object({
  cursor: z
    .string()
    .optional()
    .describe(
      "Cursor to fetch the next page of results. MUST be present when has_next_page is true.",
    ),
  total_count: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Total number of matching items, if available."),
});

const paginationResponseSchema = z.discriminatedUnion("has_next_page", [
  basePaginationResponseSchema.extend({
    has_next_page: z
      .literal(true)
      .describe("Whether more results are available."),
    cursor: z
      .string()
      .describe(
        "Cursor to fetch the next page of results. MUST be present when has_next_page is true.",
      ),
  }),
  basePaginationResponseSchema.extend({
    has_next_page: z
      .literal(false)
      .describe("Whether more results are available."),
  }),
]);

// Spec: "All catalog errors use severity: recoverable" — agents handle them
// programmatically. Enforced on every error message in catalog responses.
const refineCatalogMessages = (
  response: { messages?: z.infer<typeof messageSchema>[] | undefined },
  ctx: z.core.$RefinementCtx,
) => {
  for (const [index, message] of (response.messages ?? []).entries()) {
    if (message.type === "error" && message.severity !== "recoverable") {
      ctx.addIssue({
        code: "custom",
        path: ["messages", index, "severity"],
        message: 'catalog error messages MUST use severity "recoverable"',
      });
    }
  }
};

// Well-known catalog message codes (reference sets — message.code stays freeform,
// so these are not enforced on the union).
export const catalogErrorCodeSchema = z
  .enum(["not_found", "out_of_stock", "region_restricted", "request_too_large"])
  .describe("Well-known catalog error codes.");

export const catalogWarningCodeSchema = z
  .enum(["delayed_fulfillment", "final_sale", "allergens"])
  .describe("Well-known catalog warning codes.");

export const catalogInfoCodeSchema = z
  .enum(["promotional_pricing", "limited_availability", "not_found"])
  .describe("Well-known catalog info codes.");

export const searchCatalogResponseSchema = z
  .object({
    ucp: ucpCatalogResponseSchema,
    products: z.array(productSchema),
    pagination: paginationResponseSchema.optional(),
    messages: z
      .array(messageSchema)
      .optional()
      .describe(
        "Errors, warnings, or informational messages about the search results.",
      ),
  })
  .superRefine(refineCatalogMessages);

export const lookupCatalogRequestSchema = z.object({
  ids: z
    .array(z.string().min(1, "identifiers must be non-empty"))
    .min(1, "at least one identifier is required")
    .describe(
      "Identifiers to lookup. Implementations MUST support product ID and variant ID; MAY support secondary identifiers (SKU, handle, etc.). Duplicates are deduplicated server-side.",
    ),
  filters: searchFiltersSchema
    .optional()
    .describe(
      "Filter criteria to narrow returned variants. All specified filters combine with AND logic.",
    ),
  context: contextSchema
    .optional()
    .describe(
      "Provisional buyer signals for relevance and localization—not authoritative data. Businesses SHOULD use these values when verified inputs (e.g., shipping address) are absent, and MAY ignore or down-rank them if inconsistent with higher-confidence signals (authenticated account, risk detection) or regulatory constraints (export controls). Eligibility and policy enforcement MUST occur at checkout time using binding transaction data. Context SHOULD be non-identifying and can be disclosed progressively—coarse signals early, finer resolution as the session progresses. Higher-resolution data (shipping address, billing address) supersedes context.",
    ),
  signals: signalsSchema.optional(),
  attribution: attributionSchema.optional(),
});

export const lookupCatalogResponseSchema = z
  .object({
    ucp: ucpCatalogResponseSchema,
    products: z
      .array(lookupProductSchema)
      .describe(
        "Products matching the search criteria. May contain fewer items if some identifiers not found, or more if identifiers match multiple products.",
      ),
    messages: z
      .array(messageSchema)
      .optional()
      .describe(
        "Errors, warnings, or informational messages about the requested items.",
      ),
  })
  .superRefine(refineCatalogMessages)
  .superRefine((response, ctx) => {
    // Spec: when multiple identifiers resolve to the same product, it MUST be returned once.
    const seen = new Set<string>();
    for (const [index, product] of response.products.entries()) {
      if (seen.has(product.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["products", index, "id"],
          message: `product "${product.id}" appears more than once; it MUST be returned once`,
        });
      } else {
        seen.add(product.id);
      }
    }
  });

export const getProductRequestSchema = z
  .object({
    id: z
      .string()
      .min(1, "identifier must be non-empty")
      .describe(
        "Product or variant identifier. Implementations MUST support product ID and variant ID.",
      ),
    selected: z
      .array(selectedOptionSchema)
      .refine(
        (selected) =>
          new Set(selected.map((option) => option.name)).size ===
          selected.length,
        "each option name may appear at most once in selected",
      )
      .optional()
      .describe(
        "Partial or full option selections for interactive variant narrowing. When provided, response option values include availability signals (available, exists) relative to these selections.",
      ),
    preferences: z
      .array(z.string())
      .refine(
        (preferences) => new Set(preferences).size === preferences.length,
        "preferences must not contain duplicate option names",
      )
      .optional()
      .describe(
        "Option names in relaxation priority order. When no exact variant matches all selections, the server drops options from the end of this list first. E.g., ['Color', 'Size'] keeps Color and relaxes Size.",
      ),
    filters: searchFiltersSchema
      .optional()
      .describe(
        "Filter criteria to narrow returned variants. All specified filters combine with AND logic.",
      ),
    context: contextSchema
      .optional()
      .describe(
        "Provisional buyer signals for relevance and localization—not authoritative data. Businesses SHOULD use these values when verified inputs (e.g., shipping address) are absent, and MAY ignore or down-rank them if inconsistent with higher-confidence signals (authenticated account, risk detection) or regulatory constraints (export controls). Eligibility and policy enforcement MUST occur at checkout time using binding transaction data. Context SHOULD be non-identifying and can be disclosed progressively—coarse signals early, finer resolution as the session progresses. Higher-resolution data (shipping address, billing address) supersedes context.",
      ),
    signals: signalsSchema.optional(),
    attribution: attributionSchema.optional(),
  })
  .describe(
    "Request body for single-product retrieval. Supports interactive variant narrowing via selected and preferences.",
  );

export const getProductResponseSchema = z
  .object({
    ucp: ucpCatalogResponseSchema,
    product: detailProductSchema.describe(
      "The requested product with full detail. Singular — this is a single-resource operation.",
    ),
    messages: z
      .array(messageSchema)
      .optional()
      .describe(
        "Warnings or informational messages about the product (e.g., price recently changed, limited availability).",
      ),
  })
  .superRefine(refineCatalogMessages);

export const cartItemSchema = z.looseObject({
  id: z
    .string()
    .describe(
      "The product identifier, often the SKU, required to resolve the product details associated with this line item. Should be recognized by both the Platform, and the Business.",
    ),
  title: z.string().describe("Product title."),
  price: z
    .number()
    .int()
    .nonnegative()
    .describe("Unit price in ISO 4217 minor units."),
  image_url: z.url().optional().describe("Product image URI."),
});

const totalLinesSchema = z
  .array(
    z
      .looseObject({
        display_text: z
          .string()
          .describe("Human-readable label for this sub-line."),
        amount: z
          .number()
          .int()
          .describe("Signed amount in ISO 4217 minor units."),
      })
      .describe("Sub-line entry. Additional metadata MAY be included."),
  )
  .optional()
  .describe(
    "Optional itemized breakdown. The parent entry is always rendered; lines are supplementary. Sum of line amounts MUST equal the parent entry amount.",
  );

const totalDisplayTextSchema = z
  .string()
  .optional()
  .describe(
    "Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping', 'Delivery').",
  );

export const cartTotalSchema = z
  .union([
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("subtotal"),
        amount: z
          .number()
          .int()
          .nonnegative()
          .describe("Amount in ISO 4217 minor units. Must be non-negative."),
        display_text: totalDisplayTextSchema,
        lines: totalLinesSchema,
      }),
      z.object({
        type: z.literal("items_discount"),
        amount: z
          .number()
          .int()
          .negative()
          .describe("Amount in ISO 4217 minor units. Must be negative."),
        display_text: totalDisplayTextSchema,
        lines: totalLinesSchema,
      }),
      z.object({
        type: z.literal("discount"),
        amount: z
          .number()
          .int()
          .negative()
          .describe("Amount in ISO 4217 minor units. Must be negative."),
        display_text: totalDisplayTextSchema,
        lines: totalLinesSchema,
      }),
      z.object({
        type: z.literal("fulfillment"),
        amount: z
          .number()
          .int()
          .nonnegative()
          .describe("Amount in ISO 4217 minor units. Must be non-negative."),
        display_text: totalDisplayTextSchema,
        lines: totalLinesSchema,
      }),
      z.object({
        type: z.literal("tax"),
        amount: z
          .number()
          .int()
          .nonnegative()
          .describe("Amount in ISO 4217 minor units. Must be non-negative."),
        display_text: totalDisplayTextSchema,
        lines: totalLinesSchema,
      }),
      z.object({
        type: z.literal("fee"),
        amount: z
          .number()
          .int()
          .nonnegative()
          .describe("Amount in ISO 4217 minor units. Must be non-negative."),
        display_text: totalDisplayTextSchema,
        lines: totalLinesSchema,
      }),
      z.object({
        type: z.literal("total"),
        amount: z
          .number()
          .int()
          .describe(
            "Monetary amount in the currency's minor unit as defined by ISO 4217. Refer to the currency's exponent to determine minor-to-major ratio (e.g., 2 for USD, 0 for JPY, 3 for KWD). May be negative — the sign is intrinsic to the value (e.g., discounts are negative, charges are positive).",
          ),
        display_text: totalDisplayTextSchema,
        lines: totalLinesSchema,
      }),
    ]),
    z.object({
      type: z
        .string()
        .describe(
          "Extension cost category. Businesses MAY use additional values beyond the well-known set (subtotal, items_discount, discount, fulfillment, tax, fee, total).",
        ),
      amount: z
        .number()
        .int()
        .describe(
          "Monetary amount in the currency's minor unit as defined by ISO 4217. Refer to the currency's exponent to determine minor-to-major ratio (e.g., 2 for USD, 0 for JPY, 3 for KWD). May be negative — the sign is intrinsic to the value (e.g., discounts are negative, charges are positive).",
        ),
      display_text: z
        .string()
        .describe(
          "Required for extension types. Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping', 'Delivery').",
        ),
      lines: totalLinesSchema,
    }),
  ])
  .superRefine((total, ctx) => {
    if (total.lines !== undefined) {
      const linesSum = total.lines.reduce((sum, line) => sum + line.amount, 0);
      if (linesSum !== total.amount) {
        ctx.addIssue({
          code: "custom",
          path: ["lines"],
          message: `sum of lines amounts (${linesSum}) must equal parent amount (${total.amount})`,
        });
      }
    }
  });

const totalsSchema = z
  .array(cartTotalSchema)
  .superRefine((totals, ctx) => {
    const subtotalCount = totals.filter((t) => t.type === "subtotal").length;
    const totalCount = totals.filter((t) => t.type === "total").length;

    if (subtotalCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: `totals MUST contain exactly one entry with type "subtotal", found ${subtotalCount}`,
      });
    }
    if (totalCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: `totals MUST contain exactly one entry with type "total", found ${totalCount}`,
      });
    }

    // Accounting identity: total.amount equals the sum of every other entry
    // (subtotal + signed adjustments). Only meaningful when exactly one total exists.
    const totalEntry = totals.find((total) => total.type === "total");
    if (totalCount === 1 && totalEntry !== undefined) {
      const componentsSum = totals
        .filter((total) => total.type !== "total")
        .reduce((sum, total) => sum + total.amount, 0);

      if (componentsSum !== totalEntry.amount) {
        ctx.addIssue({
          code: "custom",
          message: `total amount (${totalEntry.amount}) must equal the sum of all other total entries (${componentsSum})`,
        });
      }
    }
  })
  .describe(
    "Pricing breakdown provided by the business. MUST contain exactly one subtotal and one total entry. The total entry's amount MUST equal the sum of all other entries (accounting identity). Detail types (tax, fee, discount, fulfillment) may appear multiple times for itemization. Platforms MUST render all entries in order using display_text and amount.",
  );

const cartItemRequestSchema = z.object({
  id: z
    .string()
    .describe(
      "Product identifier. Should be recognized by both the Platform and the Business.",
    ),
});

const lineItemRequestBaseSchema = z.object({
  item: cartItemRequestSchema,
  quantity: z
    .number()
    .int()
    .positive()
    .describe("Quantity of the item being purchased."),
  parent_id: z
    .string()
    .optional()
    .describe("Parent line item identifier for any nested structures."),
});

export const lineItemCreateRequestSchema = lineItemRequestBaseSchema;
export const lineItemUpdateRequestSchema = lineItemRequestBaseSchema.extend({
  id: z
    .string()
    .optional()
    .describe(
      "Line item identifier. Optional — used to correlate with an existing line item on update.",
    ),
});

export const lineItemSchema = z.looseObject({
  id: z.string().describe("Line item identifier."),
  item: cartItemSchema,
  quantity: z
    .number()
    .int()
    .positive()
    .describe("Quantity of the item being purchased."),
  totals: totalsSchema.describe("Line item totals breakdown."),
  parent_id: z
    .string()
    .optional()
    .describe("Parent line item identifier for any nested structures."),
});

export const buyerSchema = z
  .looseObject({
    first_name: z.string().optional().describe("First name of the buyer."),
    last_name: z.string().optional().describe("Last name of the buyer."),
    email: z.string().optional().describe("Email of the buyer."),
    phone_number: z.string().optional().describe("E.164 standard."),
  })
  .describe("Representation of the buyer.");

export const createCartRequestSchema = z.object({
  line_items: z
    .array(lineItemCreateRequestSchema)
    .min(1)
    .describe(
      "Cart line items for create. Each entry needs item.id and quantity only; line_items[].id must be omitted.",
    ),
  context: contextSchema
    .optional()
    .describe(
      "Buyer signals for localization (country, region, postal_code). Merchant uses for pricing, availability, currency. Falls back to geo-IP if omitted.",
    ),
  signals: signalsSchema.optional(),
  attribution: attributionSchema.optional(),
  buyer: buyerSchema.optional(),
});

const linkSchema = z.object({
  type: z
    .string()
    .describe(
      "Type of link. Well-known values: privacy_policy, terms_of_service, refund_policy, shipping_policy, faq. Consumers SHOULD handle unknown values gracefully by displaying them using the title field or omitting the link.",
    ),
  url: z
    .url()
    .describe("The actual URL pointing to the content to be displayed."),
  title: z
    .string()
    .optional()
    .describe(
      "Optional display text for the link. When provided, use this instead of generating from type.",
    ),
});

// Line-item integrity shared across cart responses: IDs are unique within the
// cart, and each parent_id references another line item in the same cart.
const refineCartLineItems = (
  cart: {
    line_items: { id: string; parent_id?: string | undefined }[];
  },
  ctx: z.core.$RefinementCtx,
) => {
  const ids = new Set<string>();

  for (const [index, lineItem] of cart.line_items.entries()) {
    if (ids.has(lineItem.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["line_items", index, "id"],
        message: `duplicate line item id "${lineItem.id}"`,
      });
    } else {
      ids.add(lineItem.id);
    }
  }

  for (const [index, lineItem] of cart.line_items.entries()) {
    if (lineItem.parent_id !== undefined && !ids.has(lineItem.parent_id)) {
      ctx.addIssue({
        code: "custom",
        path: ["line_items", index, "parent_id"],
        message: `parent_id "${lineItem.parent_id}" does not reference a known line item id`,
      });
    }
  }
};

export const createCartResponseSchema = z
  .object({
    ucp: ucpCartResponseSchema,
    id: z.string().optional().describe("Unique cart identifier."),
    line_items: z.array(lineItemSchema).describe("Cart line items."),
    currency: currencyCodeSchema.describe(
      "ISO 4217 currency code. Determined by merchant based on context or geo-IP.",
    ),
    totals: totalsSchema.describe(
      "Estimated cost breakdown. May be partial if shipping/tax not yet calculable.",
    ),
    context: contextSchema
      .optional()
      .describe(
        "Buyer signals for localization (country, region, postal_code). Merchant uses for pricing, availability, currency. Falls back to geo-IP if omitted.",
      ),
    signals: signalsSchema.optional(),
    attribution: attributionSchema.optional(),
    buyer: buyerSchema
      .optional()
      .describe("Optional buyer information for personalized estimates."),
    messages: z
      .array(messageSchema)
      .optional()
      .describe("Validation messages, warnings, or informational notices."),
    links: z
      .array(linkSchema)
      .optional()
      .describe("Optional merchant links (policies, FAQs)."),
    continue_url: z
      .url()
      .optional()
      .describe(
        "URL for cart handoff and session recovery. Enables sharing and human-in-the-loop flows.",
      ),
    expires_at: z.iso
      .datetime()
      .optional()
      .describe("Cart expiry timestamp (RFC 3339)."),
  })
  .superRefine(refineCartLineItems);

export const getCartRequestSchema = z.object({
  id: z.string().describe("The ID of the cart session."),
});

export const getCartResponseSchema = z
  .object({
    ucp: ucpCartResponseSchema,
    id: z.string().describe("Unique cart identifier."),
    line_items: z.array(lineItemSchema).describe("Cart line items."),
    currency: currencyCodeSchema.describe(
      "ISO 4217 currency code. Determined by merchant based on context or geo-IP.",
    ),
    totals: totalsSchema.describe(
      "Estimated cost breakdown. May be partial if shipping/tax not yet calculable.",
    ),
    context: contextSchema
      .optional()
      .describe(
        "Buyer signals for localization (country, region, postal_code). Merchant uses for pricing, availability, currency. Falls back to geo-IP if omitted.",
      ),
    signals: signalsSchema.optional(),
    attribution: attributionSchema.optional(),
    buyer: buyerSchema
      .optional()
      .describe("Optional buyer information for personalized estimates."),
    messages: z
      .array(messageSchema)
      .optional()
      .describe("Validation messages, warnings, or informational notices."),
    links: z
      .array(linkSchema)
      .optional()
      .describe("Optional merchant links (policies, FAQs)."),
    continue_url: z
      .url()
      .optional()
      .describe(
        "URL for cart handoff and session recovery. Enables sharing and human-in-the-loop flows.",
      ),
    expires_at: z.iso
      .datetime()
      .optional()
      .describe("Cart expiry timestamp (RFC 3339)."),
  })
  .superRefine(refineCartLineItems);

export const updateCartRequestSchema = z.object({
  id: z.string().describe("The ID of the cart session to update."),
  line_items: z
    .array(lineItemUpdateRequestSchema)
    .describe("Cart line items. Full replacement on update."),
  context: contextSchema
    .optional()
    .describe(
      "Buyer signals for localization (country, region, postal_code). Merchant uses for pricing, availability, currency. Falls back to geo-IP if omitted.",
    ),
  signals: signalsSchema.optional(),
  attribution: attributionSchema.optional(),
  buyer: buyerSchema
    .optional()
    .describe("Optional buyer information for personalized estimates."),
});

export const updateCartResponseSchema = z
  .object({
    ucp: ucpCartResponseSchema,
    id: z.string().describe("Unique cart identifier."),
    line_items: z.array(lineItemSchema).describe("Cart line items."),
    currency: currencyCodeSchema.describe(
      "ISO 4217 currency code. Determined by merchant based on context or geo-IP.",
    ),
    totals: totalsSchema.describe(
      "Estimated cost breakdown. May be partial if shipping/tax not yet calculable.",
    ),
    context: contextSchema
      .optional()
      .describe(
        "Buyer signals for localization (country, region, postal_code). Merchant uses for pricing, availability, currency. Falls back to geo-IP if omitted.",
      ),
    signals: signalsSchema.optional(),
    attribution: attributionSchema.optional(),
    buyer: buyerSchema
      .optional()
      .describe("Optional buyer information for personalized estimates."),
    messages: z
      .array(messageSchema)
      .optional()
      .describe("Validation messages, warnings, or informational notices."),
    links: z
      .array(linkSchema)
      .optional()
      .describe("Optional merchant links (policies, FAQs)."),
    continue_url: z
      .url()
      .optional()
      .describe(
        "URL for cart handoff and session recovery. Enables sharing and human-in-the-loop flows.",
      ),
    expires_at: z.iso
      .datetime()
      .optional()
      .describe("Cart expiry timestamp (RFC 3339)."),
  })
  .superRefine(refineCartLineItems);

export const cancelCartRequestSchema = z.object({
  id: z.string().describe("The ID of the cart session to cancel."),
});

export const cancelCartResponseSchema = z
  .object({
    ucp: ucpCartResponseSchema,
    id: z.string().describe("Unique cart identifier."),
    line_items: z.array(lineItemSchema).describe("Cart line items."),
    currency: currencyCodeSchema.describe(
      "ISO 4217 currency code. Determined by merchant based on context or geo-IP.",
    ),
    totals: totalsSchema.describe(
      "Estimated cost breakdown. May be partial if shipping/tax not yet calculable.",
    ),
    context: contextSchema
      .optional()
      .describe(
        "Buyer signals for localization (country, region, postal_code). Merchant uses for pricing, availability, currency. Falls back to geo-IP if omitted.",
      ),
    signals: signalsSchema.optional(),
    attribution: attributionSchema.optional(),
    buyer: buyerSchema
      .optional()
      .describe("Optional buyer information for personalized estimates."),
    messages: z
      .array(messageSchema)
      .optional()
      .describe("Validation messages, warnings, or informational notices."),
    links: z
      .array(linkSchema)
      .optional()
      .describe("Optional merchant links (policies, FAQs)."),
    continue_url: z
      .url()
      .optional()
      .describe(
        "URL for cart handoff and session recovery. Enables sharing and human-in-the-loop flows.",
      ),
    expires_at: z.iso
      .datetime()
      .optional()
      .describe("Cart expiry timestamp (RFC 3339)."),
  })
  .superRefine(refineCartLineItems);

export const postalAddressSchema = z.looseObject({
  extended_address: z
    .string()
    .optional()
    .describe(
      "An address extension such as an apartment number, C/O or alternative name.",
    ),
  street_address: z.string().optional().describe("The street address."),
  address_locality: z
    .string()
    .optional()
    .describe(
      "The locality in which the street address is, and which is in the region. For example, Mountain View.",
    ),
  address_region: z
    .string()
    .optional()
    .describe(
      "The region in which the locality is, and which is in the country. Required for applicable countries (i.e. state in US, province in CA). For example, California or another appropriate first-level Administrative division.",
    ),
  address_country: z
    .string()
    .optional()
    .describe(
      'The country. Recommended to be in 2-letter ISO 3166-1 alpha-2 format, for example "US". For backward compatibility, a 3-letter ISO 3166-1 alpha-3 country code such as "SGP" or a full country name such as "Singapore" can also be used.',
    ),
  postal_code: z
    .string()
    .optional()
    .describe("The postal code. For example, 94043."),
  first_name: z
    .string()
    .optional()
    .describe("First name of the contact associated with the address."),
  last_name: z
    .string()
    .optional()
    .describe("Last name of the contact associated with the address."),
  phone_number: z
    .string()
    .optional()
    .describe("Phone number of the contact associated with the address."),
});

const paymentCredentialSchema = z.looseObject({
  type: z.string().describe("Credential type discriminator."),
});

const paymentInstrumentSchema = z.looseObject({
  id: z
    .string()
    .describe(
      "Unique instrument instance identifier, assigned by the platform.",
    ),
  handler_id: z
    .string()
    .describe("ID of the payment handler that produced this instrument."),
  type: z
    .string()
    .describe("Broad instrument category (e.g., 'card', 'tokenized_card')."),
  billing_address: postalAddressSchema.optional(),
  credential: paymentCredentialSchema.optional(),
  display: z
    .looseObject({})
    .optional()
    .describe("Handler-defined display info."),
});

const selectedPaymentInstrumentSchema = paymentInstrumentSchema.extend({
  selected: z
    .boolean()
    .optional()
    .describe("Whether this instrument is selected."),
});

export const checkoutPaymentSchema = z.looseObject({
  instruments: z
    .array(selectedPaymentInstrumentSchema)
    .optional()
    .describe(
      "Payment instruments collected by the platform. Each must reference a handler via handler_id.",
    ),
});

const discountAllocationSchema = z
  .object({
    path: z
      .string()
      .describe(
        "JSONPath to the allocation target (e.g., '$.line_items[0]', '$.totals.shipping').",
      ),
    amount: z
      .number()
      .int()
      .nonnegative()
      .describe(
        "Amount allocated to this target in ISO 4217 minor units. Positive magnitude (the negative sign lives in totals[]).",
      ),
  })
  .describe(
    "Breakdown of how a discount amount was allocated to a specific target.",
  );

const appliedDiscountSchema = z
  .object({
    code: z
      .string()
      .optional()
      .describe("The discount code. Omitted for automatic discounts."),
    title: z
      .string()
      .describe("Human-readable discount name (e.g., 'Summer Sale 20% Off')."),
    amount: z
      .number()
      .int()
      .nonnegative()
      .describe(
        "Total discount amount in ISO 4217 minor units. Positive magnitude (the value of the discount); the corresponding totals[] entry is negative.",
      ),
    // TODO: zod should exclude field frm required array in json schema if default is provided
    automatic: z
      .boolean()
      .default(false)
      .optional()
      .describe(
        "True if applied automatically by merchant rules (no code required).",
      ),
    method: z
      .enum(["each", "across"])
      .optional()
      .describe(
        "Allocation method. 'each' = applied independently per item. 'across' = split proportionally by value.",
      ),
    priority: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        "Stacking order for discount calculation. Lower numbers applied first (1 = first).",
      ),
    // TODO: zod should exclude field frm required array in json schema if default is provided
    provisional: z
      .boolean()
      .default(false)
      .optional()
      .describe("True if this discount requires additional verification."),
    eligibility: reverseDomainNameSchema()
      .optional()
      .describe(
        "The eligibility claim accepted by the Business for this discount. Corresponds to a value from context.eligibility. Omitted for code-based and non-eligibility automatic discounts.",
      ),
    allocations: z
      .array(discountAllocationSchema)
      .optional()
      .describe(
        "Breakdown of where this discount was allocated. Sum of allocation amounts equals total amount.",
      ),
  })
  .superRefine((discount, ctx) => {
    // Invariant: sum of allocations[].amount equals applied_discount.amount.
    if (discount.allocations !== undefined) {
      const allocationsSum = discount.allocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0,
      );
      if (allocationsSum !== discount.amount) {
        ctx.addIssue({
          code: "custom",
          path: ["allocations"],
          message: `sum of allocation amounts (${allocationsSum}) must equal discount amount (${discount.amount})`,
        });
      }
    }

    // Automatic discounts carry no code (spec: code "Omitted for automatic discounts").
    if (discount.automatic === true && discount.code !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["code"],
        message:
          "code must be omitted for automatic discounts (automatic: true)",
      });
    }

    // Eligibility-triggered discounts are automatic (spec: automatic true, code omitted).
    if (discount.eligibility !== undefined && discount.automatic !== true) {
      ctx.addIssue({
        code: "custom",
        path: ["automatic"],
        message:
          "automatic must be true for eligibility-triggered discounts (eligibility is set)",
      });
    }
  })
  .describe("A discount that was successfully applied.");

export const discountsObjectSchema = z
  .object({
    codes: z
      .array(z.string())
      .optional()
      .describe(
        "Discount codes to apply. Case-insensitive. Replaces previously submitted codes. Send empty array to clear.",
      ),
    // ucp_request: "omit" — output only, populated by the business in responses.
    applied: z
      .array(appliedDiscountSchema)
      .optional()
      .describe("Discounts successfully applied (code-based and automatic)."),
  })
  .describe("Discount codes input and applied discounts output.");

// Well-known rejection codes for discount codes that could not be applied.
// Surfaced on the top-level messages[] array as type: "warning" with the
// rejected code's path (e.g. "$.discounts.codes[1]"). Businesses MAY also use
// freeform codes, so this is a reference set — not enforced on messageSchema.code.
export const discountRejectionCodeSchema = z
  .enum([
    "discount_code_expired",
    "discount_code_invalid",
    "discount_code_already_applied",
    "discount_code_combination_disallowed",
    "discount_code_user_not_logged_in",
    "discount_code_user_ineligible",
  ])
  .describe("Standard error codes for rejected discount codes.");

const consentSchema = z
  .object({
    analytics: z
      .boolean()
      .optional()
      .describe("Consent for analytics and performance tracking."),
    preferences: z
      .boolean()
      .optional()
      .describe("Consent for storing user preferences."),
    marketing: z
      .boolean()
      .optional()
      .describe("Consent for marketing communications."),
    sale_of_data: z
      .boolean()
      .optional()
      .describe("Consent for selling data to third parties (CCPA)."),
  })
  .describe("User consent states for data processing.");

export const buyerWithConsentSchema = buyerSchema
  .extend({
    consent: consentSchema.optional().describe("Consent tracking fields."),
  })
  .describe("Buyer object extended with consent tracking.");

const fulfillmentOptionSchema = z
  .looseObject({
    id: z.string().describe("Unique fulfillment option identifier."),
    title: z
      .string()
      .describe(
        "Short label (e.g., 'Express Shipping', 'Curbside Pickup'). Must distinguish this option from siblings.",
      ),
    totals: z
      .array(cartTotalSchema)
      .describe("Fulfillment option totals breakdown."),
    description: z
      .string()
      .optional()
      .describe(
        "Complete context for buyer decision (e.g., 'Arrives Dec 12-15 via FedEx').",
      ),
    carrier: z.string().optional().describe("Carrier name (for shipping)."),
    earliest_fulfillment_time: z.iso
      .datetime()
      .optional()
      .describe("Earliest fulfillment date (ISO 8601)."),
    latest_fulfillment_time: z.iso
      .datetime()
      .optional()
      .describe("Latest fulfillment date (ISO 8601)."),
  })
  .refine(
    (opt) =>
      opt.earliest_fulfillment_time === undefined ||
      opt.latest_fulfillment_time === undefined ||
      new Date(opt.latest_fulfillment_time) >=
        new Date(opt.earliest_fulfillment_time),
    {
      error: "latest_fulfillment_time must be >= earliest_fulfillment_time",
      path: ["latest_fulfillment_time"],
    },
  )
  .superRefine((option, ctx) => {
    // Rendering contract: every option must surface a "total" (its price).
    if (!option.totals.some((total) => total.type === "total")) {
      ctx.addIssue({
        code: "custom",
        path: ["totals"],
        message:
          "fulfillment option totals must include a 'total' entry (the option price)",
      });
    }
  });

const fulfillmentGroupSchema = z
  .looseObject({
    id: z
      .string()
      .describe(
        "Group identifier. Required on update to reference merchant-generated groups.",
      ),
    line_item_ids: z
      .array(z.string())
      .describe("Line item IDs included in this group."),
    options: z
      .array(fulfillmentOptionSchema)
      .optional()
      .describe("Available fulfillment options for this group."),
    selected_option_id: z
      .string()
      .nullable()
      .optional()
      .describe(
        "ID of the selected option. Must reference an options[] entry.",
      ),
  })
  .superRefine((group, ctx) => {
    // Option IDs must be unique within the group (so selected_option_id is unambiguous).
    const seenOptionIds = new Set<string>();

    for (const [index, option] of (group.options ?? []).entries()) {
      if (seenOptionIds.has(option.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["options", index, "id"],
          message: `duplicate option id "${option.id}" within group`,
        });
      } else {
        seenOptionIds.add(option.id);
      }
    }

    if (
      group.selected_option_id !== null &&
      group.selected_option_id !== undefined &&
      !seenOptionIds.has(group.selected_option_id)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["selected_option_id"],
        message: `selected_option_id "${group.selected_option_id}" does not reference a known option id`,
      });
    }
  });

const shippingDestinationSchema = postalAddressSchema.extend({
  id: z.string().describe("ID specific to this shipping destination."),
});

const retailLocationSchema = z
  .looseObject({
    id: z.string().describe("Unique location identifier."),
    name: z.string().describe("Location name (e.g., store name)."),
    address: postalAddressSchema.optional().describe("Physical address."),
  })
  .describe("A pickup location (retail store, locker, etc.).");

const fulfillmentDestinationSchema = z.union([
  shippingDestinationSchema,
  retailLocationSchema,
]);

const fulfillmentMethodSchema = z
  .looseObject({
    id: z.string().describe("Unique fulfillment method identifier."),
    type: z.enum(["shipping", "pickup"]).describe("Fulfillment method type."),
    line_item_ids: z
      .array(z.string())
      .describe("Line item IDs fulfilled via this method."),
    destinations: z
      .array(fulfillmentDestinationSchema)
      .optional()
      .describe(
        "Available destinations. For shipping: addresses. For pickup: retail locations.",
      ),
    selected_destination_id: z
      .string()
      .nullable()
      .optional()
      .describe(
        "ID of the selected destination. Must reference a destinations[] entry.",
      ),
    groups: z
      .array(fulfillmentGroupSchema)
      .optional()
      .describe(
        "Fulfillment groups for selecting options. Agent sets selected_option_id on groups.",
      ),
  })
  .superRefine((method, ctx) => {
    // Destination IDs must be unique within the method.
    const seenDestinationIds = new Set<string>();

    for (const [index, destination] of (method.destinations ?? []).entries()) {
      const destinationId = (destination as { id: string }).id;
      if (seenDestinationIds.has(destinationId)) {
        ctx.addIssue({
          code: "custom",
          path: ["destinations", index, "id"],
          message: `duplicate destination id "${destinationId}" within method`,
        });
      } else {
        seenDestinationIds.add(destinationId);
      }
    }

    if (
      method.selected_destination_id !== null &&
      method.selected_destination_id !== undefined &&
      !seenDestinationIds.has(method.selected_destination_id)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["selected_destination_id"],
        message: `selected_destination_id "${method.selected_destination_id}" does not reference a known destination id`,
      });
    }

    // Group IDs must be unique within the method, and each group's items must
    // belong to the method's line_item_ids.
    const methodLineItemIds = new Set(method.line_item_ids);
    const seenGroupIds = new Set<string>();

    for (const [groupIndex, group] of (method.groups ?? []).entries()) {
      if (seenGroupIds.has(group.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["groups", groupIndex, "id"],
          message: `duplicate group id "${group.id}" within method`,
        });
      } else {
        seenGroupIds.add(group.id);
      }

      for (const lineItemId of group.line_item_ids) {
        if (!methodLineItemIds.has(lineItemId)) {
          ctx.addIssue({
            code: "custom",
            path: ["groups", groupIndex, "line_item_ids"],
            message: `group line item "${lineItemId}" is not in the method's line_item_ids`,
          });
        }
      }
    }
  });

const fulfillmentAvailableMethodSchema = z.looseObject({
  type: z
    .enum(["shipping", "pickup"])
    .describe("Fulfillment method type this availability applies to."),
  line_item_ids: z
    .array(z.string())
    .describe("Line items available for this method."),
  fulfillable_on: z
    .union([z.literal("now"), z.iso.datetime(), z.iso.date()])
    .nullable()
    .optional()
    .describe(
      "'now' for immediate availability, or ISO 8601 date/datetime for future (preorders, transfers).",
    ),
  description: z
    .string()
    .optional()
    .describe(
      "Human-readable availability info (e.g., 'Available for pickup at Downtown Store today').",
    ),
});

export const fulfillmentSchema = z.looseObject({
  methods: z
    .array(fulfillmentMethodSchema)
    .optional()
    .describe("Fulfillment methods for cart items."),
  available_methods: z
    .array(fulfillmentAvailableMethodSchema)
    .optional()
    .describe("Inventory availability hints (response only)."),
});

const checkoutStatusSchema = z
  .enum([
    "incomplete",
    "requires_escalation",
    "ready_for_complete",
    "complete_in_progress",
    "completed",
    "canceled",
  ])
  .describe(
    "Checkout state indicating the current phase and required action. Flow: incomplete ↔ requires_escalation → ready_for_complete → complete_in_progress → completed. canceled reachable from any non-terminal state.",
  );

const checkoutOrderSchema = z.looseObject({
  id: z.string().describe("Unique order identifier."),
  permalink_url: z
    .url()
    .optional()
    .describe("Permalink to access the order on merchant site."),
});

const checkoutResponseBaseSchema = z.looseObject({
  ucp: ucpCheckoutResponseSchema,
  id: z.string().describe("Unique identifier of the checkout session."),
  status: checkoutStatusSchema,
  line_items: z
    .array(lineItemSchema)
    .describe("List of line items being checked out."),
  currency: currencyCodeSchema.describe(
    "ISO 4217 currency code reflecting the merchant's market determination. Derived from address, context, and geo IP—buyers provide signals, merchants determine currency.",
  ),
  totals: totalsSchema.describe(
    "Different cart totals. Checkout cost breakdown.",
  ),
  links: z
    .array(linkSchema)
    .describe(
      "Links to be displayed by the platform (Privacy Policy, TOS). Mandatory for legal compliance.",
    ),
  buyer: buyerSchema.optional(),
  context: contextSchema.optional(),
  signals: signalsSchema.optional(),
  attribution: attributionSchema.optional(),
  payment: checkoutPaymentSchema.optional(),
  messages: z.array(messageSchema).optional(),
  continue_url: httpsUrlSchema
    .optional()
    .describe(
      "URL for checkout handoff and session recovery. MUST be present when status is requires_escalation. MUST be an absolute HTTPS URL. SHOULD be omitted for terminal states (completed, canceled).",
    ),
  expires_at: z.iso
    .datetime()
    .optional()
    .describe(
      "RFC 3339 expiry timestamp. Default TTL is 6 hours from creation if not sent.",
    ),
  order: checkoutOrderSchema
    .optional()
    .describe("Order details. Present after successful completion."),
});

const refineCheckoutConstraints = (
  checkout: z.infer<typeof checkoutResponseBaseSchema>,
  ctx: z.core.$RefinementCtx,
) => {
  if (
    checkout.status === "requires_escalation" &&
    checkout.continue_url === undefined
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["continue_url"],
      message:
        "continue_url MUST be present when status is requires_escalation",
    });
  }

  if (checkout.status === "requires_escalation") {
    const escalationMessages = (checkout.messages ?? []).filter((message) => {
      if (message.type !== "error") return false;
      return (
        message.severity === "requires_buyer_input" ||
        message.severity === "requires_buyer_review"
      );
    });
    if (escalationMessages.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["messages"],
        message:
          'status requires_escalation MUST include at least one error message with severity "requires_buyer_input" or "requires_buyer_review"',
      });
    }
  }

  // "completed" means the order was placed — the order field must be present.
  if (checkout.status === "completed" && checkout.order === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["order"],
      message: "order MUST be present when status is completed",
    });
  }

  // Eligibility message-code contract (see Eligibility Verification at Completion).
  for (const [index, message] of (checkout.messages ?? []).entries()) {
    const requiredType = (() => {
      switch (message.code) {
        case "eligibility_invalid":
          return "error";
        case "eligibility_not_accepted":
          return "warning";
        case "eligibility_accepted":
          return "info";
        default:
          return undefined;
      }
    })();

    if (requiredType !== undefined && message.type !== requiredType) {
      ctx.addIssue({
        code: "custom",
        path: ["messages", index, "type"],
        message: `message code "${message.code}" must be used with type "${requiredType}"`,
      });
    }

    if (
      message.type === "error" &&
      message.code === "eligibility_invalid" &&
      message.severity !== "recoverable"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["messages", index, "severity"],
        message: 'eligibility_invalid errors MUST use severity "recoverable"',
      });
    }
  }
};

export const createCheckoutRequestSchema = z.object({
  line_items: z
    .array(lineItemCreateRequestSchema)
    .min(1)
    .describe(
      "Items being checked out. line_items[].id must be omitted on create.",
    ),
  buyer: buyerSchema.optional(),
  context: contextSchema.optional(),
  signals: signalsSchema.optional(),
  attribution: attributionSchema.optional(),
  payment: checkoutPaymentSchema
    .optional()
    .describe(
      "The payment instruments available for this payment. Each instrument is associated with a specific handler via the handler_id field. Handlers can extend the base payment_instrument schema to add handler-specific fields.",
    ),
});

export const updateCheckoutRequestSchema = z.object({
  id: z.string().describe("Unique identifier of the checkout session."),
  line_items: z
    .array(lineItemUpdateRequestSchema)
    .min(1)
    .describe(
      "List of line items being checked out. Full replacement of line items on update.",
    ),
  buyer: buyerSchema.optional(),
  context: contextSchema.optional(),
  signals: signalsSchema.optional(),
  attribution: attributionSchema.optional(),
  payment: checkoutPaymentSchema.optional(),
});

export const completeCheckoutRequestSchema = z.object({
  id: z.string().describe("Unique identifier of the checkout session."),
  payment: checkoutPaymentSchema,
});

export const getCheckoutRequestSchema = z.object({
  id: z.string().describe("Unique identifier of the checkout session."),
});

export const cancelCheckoutRequestSchema = z.object({
  id: z.string().describe("Unique identifier of the checkout session."),
});

export const checkoutResponseSchema = checkoutResponseBaseSchema.superRefine(
  refineCheckoutConstraints,
);

export const completeCheckoutResponseSchema = checkoutResponseBaseSchema
  .extend({
    order: checkoutOrderSchema.describe(
      "Order details. Required in the complete checkout response.",
    ),
  })
  .superRefine(refineCheckoutConstraints);

export const createCheckoutWithFulfillmentRequestSchema =
  createCheckoutRequestSchema.extend({
    fulfillment: fulfillmentSchema
      .optional()
      .describe("Fulfillment details for this checkout. Optional on create."),
  });

export const updateCheckoutWithFulfillmentRequestSchema =
  updateCheckoutRequestSchema.extend({
    fulfillment: fulfillmentSchema
      .optional()
      .describe("Fulfillment details for this checkout. Optional on update."),
  });

const checkoutWithFulfillmentResponseBaseSchema =
  checkoutResponseBaseSchema.extend({
    fulfillment: fulfillmentSchema
      .optional()
      .describe(
        "Fulfillment details. Present when the fulfillment capability is active.",
      ),
  });

export const checkoutWithFulfillmentResponseSchema =
  checkoutWithFulfillmentResponseBaseSchema.superRefine(
    refineCheckoutConstraints,
  );

export const completeCheckoutWithFulfillmentResponseSchema =
  checkoutWithFulfillmentResponseBaseSchema
    .extend({
      order: checkoutOrderSchema.describe(
        "Order details. Required in the complete checkout response.",
      ),
    })
    .superRefine(refineCheckoutConstraints);

export const cartWithDiscountSchema = getCartResponseSchema
  .extend({
    discounts: discountsObjectSchema
      .optional()
      .describe(
        "Discount codes input and applied discounts output. Optional on cart create and update.",
      ),
  })
  .describe("Cart extended with discount capability.");

export const checkoutWithDiscountSchema = checkoutResponseBaseSchema
  .extend({
    discounts: discountsObjectSchema
      .optional()
      .describe(
        "Discount codes input and applied discounts output. Optional on checkout create and update; omitted on complete.",
      ),
  })
  .superRefine(refineCheckoutConstraints)
  .describe("Checkout extended with discount capability.");

export const checkoutWithBuyerConsentSchema = checkoutResponseBaseSchema
  .extend({
    buyer: buyerWithConsentSchema
      .optional()
      .describe(
        "Buyer with consent tracking. Optional on checkout create and update; omitted on complete.",
      ),
  })
  .superRefine(refineCheckoutConstraints)
  .describe("Checkout extended with consent tracking via buyer object.");

const orderLineItemRefSchema = z.object({
  id: z.string().describe("Line item ID reference."),
  quantity: z
    .number()
    .int()
    .min(1)
    .describe("Quantity of this item in this group."),
});

const adjustmentLineItemRefSchema = z.object({
  id: z.string().describe("Line item ID reference."),
  quantity: z
    .number()
    .int()
    .describe(
      "Signed quantity. Negative for reductions (returns), positive for additions (exchanges).",
    ),
});

const orderLineItemQuantitySchema = z.object({
  total: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Current total active quantity. May differ from original due to post-order modifications.",
    ),
  fulfilled: z
    .number()
    .int()
    .nonnegative()
    .describe("Quantity fulfilled so far."),
  original: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Quantity from the original checkout."),
});

const orderLineItemStatusSchema = z.enum([
  "processing",
  "partial",
  "fulfilled",
  "removed",
]);

const orderLineItemSchema = z
  .looseObject({
    id: z.string().describe("Line item identifier."),
    item: cartItemSchema.describe(
      "Product data (id, title, price, image_url).",
    ),
    quantity: orderLineItemQuantitySchema.describe(
      "Quantity tracking for the line item.",
    ),
    totals: totalsSchema.describe("Line item totals breakdown."),
    status: orderLineItemStatusSchema.describe(
      "Derived status: removed if quantity.total == 0, fulfilled if total > 0 and fulfilled == total, partial if fulfilled > 0, otherwise processing.",
    ),
    parent_id: z
      .string()
      .optional()
      .describe("Parent line item identifier for nested structures."),
  })
  .superRefine((item, ctx) => {
    const { total, fulfilled } = item.quantity;

    const expectedStatus = (() => {
      if (total === 0) return "removed";
      if (fulfilled === total) return "fulfilled";
      if (fulfilled > 0) return "partial";
      return "processing";
    })();

    if (item.status !== expectedStatus) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: `status must be "${expectedStatus}" given quantity.total=${total} and quantity.fulfilled=${fulfilled}`,
      });
    }

    if (fulfilled > total) {
      ctx.addIssue({
        code: "custom",
        path: ["quantity", "fulfilled"],
        message: `quantity.fulfilled (${fulfilled}) cannot exceed quantity.total (${total})`,
      });
    }
  });

const expectationSchema = z.looseObject({
  id: z.string().describe("Expectation identifier."),
  line_items: z
    .array(orderLineItemRefSchema)
    .describe("Which line items and quantities are in this expectation."),
  method_type: z
    .enum(["shipping", "pickup", "digital"])
    .describe("Delivery method type."),
  destination: postalAddressSchema.describe("Delivery destination address."),
  description: z
    .string()
    .optional()
    .describe(
      "Human-readable delivery description (e.g., 'Arrives in 5-8 business days').",
    ),
  fulfillable_on: z
    .union([z.literal("now"), z.iso.datetime(), z.iso.date()])
    .optional()
    .describe(
      "'now' for immediate availability, or ISO 8601 timestamp for future (backorder, pre-order).",
    ),
});

const fulfillmentEventSchema = z
  .looseObject({
    id: z.string().describe("Fulfillment event identifier."),
    occurred_at: z.iso
      .datetime()
      .describe("RFC 3339 timestamp when this fulfillment event occurred."),
    type: z
      .string()
      .describe(
        "Fulfillment event type. Common values: processing, shipped, in_transit, delivered, failed_attempt, canceled, undeliverable, returned_to_sender.",
      ),
    line_items: z
      .array(orderLineItemRefSchema)
      .describe("Which line items and quantities are fulfilled in this event."),
    tracking_number: z
      .string()
      .optional()
      .describe("Carrier tracking number. Required if type is not processing."),
    tracking_url: z
      .url()
      .optional()
      .describe(
        "URL to track this shipment. Required if type is not processing.",
      ),
    carrier: z
      .string()
      .optional()
      .describe("Carrier name (e.g., 'FedEx', 'USPS')."),
    description: z
      .string()
      .optional()
      .describe(
        "Human-readable description of the shipment status (e.g., 'Delivered to front door').",
      ),
  })
  .superRefine((event, ctx) => {
    if (event.type !== "processing") {
      if (event.tracking_number === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["tracking_number"],
          message: "tracking_number is required when type is not processing",
        });
      }
      if (event.tracking_url === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["tracking_url"],
          message: "tracking_url is required when type is not processing",
        });
      }
    }
  });

const adjustmentTotalSchema = z.looseObject({
  type: z.string().describe("Total type label."),
  amount: z
    .number()
    .int()
    .describe(
      "Signed amount in smallest currency unit. Negative for money returned to buyer (refunds, credits), positive for additional charges.",
    ),
  display_text: z
    .string()
    .optional()
    .describe("Human-readable display label for this total line."),
});

const adjustmentSchema = z
  .looseObject({
    id: z.string().describe("Adjustment event identifier."),
    type: z
      .string()
      .describe(
        "Type of adjustment (open string). Typical values: refund, return, credit, price_adjustment, dispute, cancellation.",
      ),
    occurred_at: z.iso
      .datetime()
      .describe("RFC 3339 timestamp when this adjustment occurred."),
    status: z
      .enum(["pending", "completed", "failed"])
      .describe("Adjustment status."),
    line_items: z
      .array(adjustmentLineItemRefSchema)
      .optional()
      .describe("Which line items and quantities are affected."),
    totals: z
      .array(adjustmentTotalSchema)
      .optional()
      .describe(
        "Adjustment totals breakdown. Signed: negative for money returned to buyer, positive for additional charges.",
      ),
    description: z
      .string()
      .optional()
      .describe(
        "Human-readable reason or description (e.g., 'Defective item', 'Customer requested').",
      ),
  })
  .describe(
    "Post-order event that exists independently of fulfillment. Typically represents money movements but can be any post-order change. Polymorphic type that can optionally reference line items.",
  );

const orderFulfillmentSchema = z.looseObject({
  expectations: z
    .array(expectationSchema)
    .optional()
    .describe(
      "Buyer-facing groups representing when/how items will be delivered. Can be split, merged, or adjusted post-order.",
    ),
  events: z
    .array(fulfillmentEventSchema)
    .optional()
    .describe(
      "Append-only event log of actual shipments. Each event references line items by ID.",
    ),
});

export const getOrderRequestSchema = z.object({
  id: z.string().describe("Unique order identifier."),
});

export const listOrdersRequestSchema = z.object({
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor from a previous response."),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Maximum number of orders to return per page."),
});

// Standard error codes returned by Get Order. Reference set — message.code stays
// freeform, so this is not enforced on the union.
export const orderErrorCodeSchema = z
  .enum(["not_found", "unauthorized"])
  .describe("Standard error codes for order retrieval failures.");

// Referential integrity for orders: line-item IDs are unique, each parent_id and
// every id referenced by expectations / events / adjustments resolves to an order
// line item. Spec: these components "reference line items by ID."
const refineOrderLineItems = (
  order: {
    line_items: { id: string; parent_id?: string | undefined }[];
    fulfillment?: {
      expectations?: { line_items: { id: string }[] }[] | undefined;
      events?: { line_items: { id: string }[] }[] | undefined;
    };
    adjustments?: { line_items?: { id: string }[] | undefined }[] | undefined;
  },
  ctx: z.core.$RefinementCtx,
) => {
  const ids = new Set<string>();
  for (const [index, lineItem] of order.line_items.entries()) {
    if (ids.has(lineItem.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["line_items", index, "id"],
        message: `duplicate line item id "${lineItem.id}"`,
      });
    } else {
      ids.add(lineItem.id);
    }
  }

  for (const [index, lineItem] of order.line_items.entries()) {
    if (lineItem.parent_id !== undefined && !ids.has(lineItem.parent_id)) {
      ctx.addIssue({
        code: "custom",
        path: ["line_items", index, "parent_id"],
        message: `parent_id "${lineItem.parent_id}" does not reference a known line item id`,
      });
    }
  }

  const checkRefs = (refs: { id: string }[], path: (string | number)[]) => {
    for (const [index, ref] of refs.entries()) {
      if (!ids.has(ref.id)) {
        ctx.addIssue({
          code: "custom",
          path: [...path, index, "id"],
          message: `references unknown line item id "${ref.id}"`,
        });
      }
    }
  };

  for (const [index, expectation] of (
    order.fulfillment?.expectations ?? []
  ).entries()) {
    checkRefs(expectation.line_items, [
      "fulfillment",
      "expectations",
      index,
      "line_items",
    ]);
  }
  for (const [index, event] of (order.fulfillment?.events ?? []).entries()) {
    checkRefs(event.line_items, ["fulfillment", "events", index, "line_items"]);
  }
  for (const [index, adjustment] of (order.adjustments ?? []).entries()) {
    if (adjustment.line_items !== undefined) {
      checkRefs(adjustment.line_items, ["adjustments", index, "line_items"]);
    }
  }
};

export const orderResponseSchema = z
  .looseObject({
    ucp: ucpOrderResponseSchema,
    id: z.string().describe("Unique order identifier."),
    checkout_id: z
      .string()
      .describe("Associated checkout ID for reconciliation."),
    permalink_url: z
      .url()
      .describe("Permalink to access the order on the merchant site."),
    label: z
      .string()
      .optional()
      .describe(
        "Human-readable label for identifying the order. MUST only be provided by the business.",
      ),
    line_items: z
      .array(orderLineItemSchema)
      .describe(
        "Line items representing what was purchased. Can change post-order via edits or exchanges.",
      ),
    fulfillment: orderFulfillmentSchema.describe(
      "Fulfillment data: buyer expectations and what actually happened.",
    ),
    adjustments: z
      .array(adjustmentSchema)
      .optional()
      .describe(
        "Post-order events (refunds, returns, credits, disputes, cancellations) that exist independently of fulfillment.",
      ),
    currency: currencyCodeSchema.describe(
      "ISO 4217 currency code. MUST match the currency from the originating checkout session.",
    ),
    totals: totalsSchema.describe("Different totals for the order."),
    messages: z
      .array(messageSchema)
      .optional()
      .describe(
        "Business outcome messages. Present when the business needs to communicate status or issues to the platform.",
      ),
    attribution: attributionSchema
      .optional()
      .describe(
        "Snapshot of the attribution from the originating checkout. Read-only.",
      ),
  })
  .superRefine(refineOrderLineItems);

export const listOrdersResponseSchema = z.looseObject({
  ucp: ucpOrderResponseSchema,
  orders: z.array(orderResponseSchema).describe("List of orders."),
  pagination: paginationResponseSchema
    .optional()
    .describe("Pagination metadata."),
});
