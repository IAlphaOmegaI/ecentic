import * as z from "zod";

// TODO: Implement UCP Advanced Validator
// write advanced zod schemas for the UCP profile for the best ucp compatibility

const _LATEST_UCP_VERSION = "2026-04-08";
const UCP_VERSION_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UCP_REVERSE_DOMAIN_NAME_REGEX = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;

// TODO: suggest businesses to add webhook_url to their config to track ai orders
// config: {
//   webhook_url: "https://platform.example.com/webhooks/ucp/orders";
// }

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

const httpsUrlSchema = z.url({
  protocol: /^https$/,
  hostname: z.regexes.domain,
  error: "url must be a valid HTTPS URL",
});

const supportedVersionsSchema = z.record(
  z
    .string()
    .regex(
      UCP_VERSION_REGEX,
      "supported_versions must be YYYY-MM-DD protocol version strings",
    ),
  httpsUrlSchema,
);

const serviceNameSchema = z
  .string()
  .regex(
    UCP_REVERSE_DOMAIN_NAME_REGEX,
    "Service name must use reverse-domain format {reverse-domain}.{service} (e.g. dev.ucp.shopping)",
  );

const serviceSchemaUrlSchema = z
  .url({
    protocol: /^https$/,
    hostname: z.regexes.domain,
    error: "schema must be a valid HTTPS URL",
  })
  .describe(
    "URL to JSON Schema defining this entity's structure and payloads.",
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

const commonServiceSchema = z.looseObject({
  version: z
    .string()
    .regex(UCP_VERSION_REGEX, "Entity version must be in YYYY-MM-DD format")
    .describe("Entity version in YYYY-MM-DD format."),
  spec: z.string().describe("URL to human-readable specification document."),
  endpoint: serviceEndpointSchema,
  id: z
    .string()
    .optional()
    .describe(
      "Unique identifier for this entity instance. Used to disambiguate when multiple instances exist.",
    ),
  schema: serviceSchemaUrlSchema,
  // TODO: specify
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Entity-specific configuration. Structure defined by each entity's schema.",
    ),
});

const serviceSchema = z.discriminatedUnion("transport", [
  commonServiceSchema.extend({
    transport: z.union([z.literal("mcp"), z.literal("rest")]),
  }),
  commonServiceSchema.extend({
    transport: z.literal("a2a"),
    schema: serviceSchemaUrlSchema.optional(),
  }),
  commonServiceSchema.extend({
    transport: z.literal("embedded"),
    endpoint: serviceEndpointSchema.optional(),
  }),
]);

const servicesSchema = z
  .record(serviceNameSchema, z.array(serviceSchema))
  .superRefine((services, context) => {
    for (const [namespaceName, entries] of Object.entries(services)) {
      const authority = namespaceAuthorityHostname(namespaceName);

      if (!authority) {
        context.addIssue({
          code: "custom",
          path: [namespaceName],
          message: `Service namespace "${namespaceName}" must include a valid reverse-domain authority`,
        });
      }

      for (const entry of entries) {
        const urlProperties = (["spec", "schema"] as const).entries();

        for (const [index, field] of urlProperties) {
          const value = entry[field];

          if (
            typeof value === "string" &&
            !urlOriginMatchesNamespaceAuthority(value, namespaceName)
          ) {
            context.addIssue({
              code: "custom",
              path: [namespaceName, index, field],
              message: `${field} origin must match namespace authority (${authority}) for "${namespaceName}"`,
            });
          }
        }
      }
    }
  });

// there are some capabilities that are with 3 segments (dev.shopify.catalog)
const capabilityNameSchema = z
  .string()
  .regex(
    UCP_REVERSE_DOMAIN_NAME_REGEX,
    "Capability name must use reverse-domain format {reverse-domain}.{service}.{capability}",
  );

const capabilitySchema = z.looseObject({
  version: z
    .string()
    .regex(UCP_VERSION_REGEX, "Capability version must be in YYYY-MM-DD format")
    .describe("Entity version in YYYY-MM-DD format."),
  spec: httpsUrlSchema.describe(
    "URL to human-readable specification document.",
  ),
  schema: httpsUrlSchema.describe(
    "URL to JSON Schema defining this entity's structure and payloads.",
  ),
  id: z
    .string()
    .optional()
    .describe(
      "Unique identifier for this entity instance. Used to disambiguate when multiple instances exist.",
    ),
  extends: z
    .union([capabilityNameSchema, z.array(capabilityNameSchema)])
    .optional()
    .describe(
      "Parent capability(s) this extends. Present for extensions, absent for root capabilities. Use array for multi-parent extensions.",
    ),
  // TODO: specify
  requires: z.record(z.string(), z.unknown()).optional(),
  // TODO: specify
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Entity-specific configuration. Structure defined by each entity's schema.",
    ),
});

const capabilitiesSchema = z
  .record(capabilityNameSchema, z.array(capabilitySchema))
  .superRefine((capabilities, context) => {
    for (const [namespaceName, entries] of Object.entries(capabilities)) {
      const authority = namespaceAuthorityHostname(namespaceName);

      if (!authority) {
        context.addIssue({
          code: "custom",
          path: [namespaceName],
          message: `Capability namespace "${namespaceName}" must include a valid reverse-domain authority`,
        });
        continue;
      }

      const urlProperties = (["spec", "schema"] as const).entries();

      for (const entry of entries) {
        for (const [index, field] of urlProperties) {
          const value = entry[field];

          if (
            typeof value === "string" &&
            !urlOriginMatchesNamespaceAuthority(value, namespaceName)
          ) {
            context.addIssue({
              code: "custom",
              path: [namespaceName, index, field],
              message: `${field} origin must match namespace authority (${authority}) for "${namespaceName}"`,
            });
          }
        }
      }
    }
  });

const paymentHandlerSchema = z.looseObject({
  id: z.string(),
  version: z
    .string()
    .regex(UCP_VERSION_REGEX, "UCP version must be in YYYY-MM-DD format"),
  spec: z.url({
    protocol: /^https$/,
    hostname: z.regexes.domain,
    error: "spec must be a valid HTTPS URL",
  }),
  schema: z.url({
    protocol: /^https$/,
    hostname: z.regexes.domain,
    error: "schema must be a valid HTTPS URL",
  }),
  available_instruments: z
    .array(
      z.looseObject({
        type: z.string(),
        constraints: z.record(z.string(), z.array(z.string())),
      }),
    )
    .optional(),
  // TODO: specify
  config: z.record(z.string(), z.unknown()),
});

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

export const discoveryProfileSchema = z.looseObject({
  ucp: z
    .object({
      // version: z.regex(
      //   UCP_VERSION_REGEX,
      //   "UCP version must be in YYYY-MM-DD format",
      // ),
      version: z
        .literal("2026-04-08")
        .describe("UCP version in YYYY-MM-DD format."),
      services: servicesSchema.describe(
        "Service registry keyed by reverse-domain name.",
      ),
      payment_handlers: z.record(z.string(), z.array(paymentHandlerSchema)),
      supported_versions: supportedVersionsSchema
        .optional()
        .describe(
          "Previous protocol versions this business supports, mapped to profile URIs. Businesses that support older protocol versions SHOULD advertise each version and link to its profile. Each URI points to a complete, self-contained profile for that version. When omitted, only version is supported.",
        ),
      capabilities: capabilitiesSchema
        .optional()
        .describe("Capability registry keyed by reverse-domain name."),
    })
    .describe("Payment handler registry keyed by reverse-domain name."),
  signing_keys: z.array(signingKeySchema).optional(),
});

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
  z
    .string()
    .regex(
      UCP_REVERSE_DOMAIN_NAME_REGEX,
      "Signal name must use reverse-domain format {reverse-domain}.{signal}",
    )
    .describe(
      "Signal name must use reverse-domain format {reverse-domain}.{signal}",
    ),
]);

const signalsSchema = z
  // TODO: specify entry value
  .record(signalNameSchema, z.unknown())
  .describe(
    "Environment data provided by the platform to support authorization and abuse prevention. Values MUST NOT be buyer-asserted claims — platforms provide signals based on direct observation or independently verifiable third-party attestations. All signal keys MUST use reverse-domain naming to ensure provenance and prevent collisions when multiple extensions contribute to the shared namespace.",
  );

// TODO: specify
const attributionSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe(
    "Platform-emitted referral and conversion-event context — campaign identifiers, click IDs, source/medium markers, etc. The same parameters platforms communicate via URL query parameters in browser-based flows.",
  );

const priceSchema = z.object({
  amount: z
    .number()
    .int()
    .nonnegative()
    .describe("Amount in ISO 4217 minor units. Use 0 for free items."),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, "currency must be a 3-letter ISO 4217 code")
    .describe("ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP')."),
});

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
  });

const commonMessageSchema = z.object({
  content: z.string().describe("Human-readable message."),
  content_type: z
    .enum(["plain", "markdown"])
    .default("plain")
    .describe("Content format."),
  path: z
    .string()
    .optional()
    .describe(
      "RFC 9535 JSONPath to the component the message refers to (e.g., $.items[1]).",
    ),
  code: z
    .string()
    .optional()
    .describe(
      "Code identifying the type of message. Standard errors/warnings/infos are defined in specification, and have standardized semantics; freeform codes are permitted.",
    ),
});

export const messageSchema = z.discriminatedUnion("type", [
  commonMessageSchema.extend({
    type: z.literal("error").describe("Error message."),
    severity: z
      .enum([
        "recoverable",
        "requires_buyer_input",
        "requires_buyer_review",
        "unrecoverable",
      ])
      .describe(
        "Reflects the resource state and recommended action. 'recoverable': platform can resolve by modifying inputs and retrying via API. 'requires_buyer_input': merchant requires information their API doesn't support collecting programmatically (checkout incomplete). 'requires_buyer_review': buyer must authorize before order placement due to policy, regulatory, or entitlement rules. 'unrecoverable': no valid resource exists to act on, retry with new resource or inputs. Errors with 'requires_' severity contribute to 'status: requires_escalation'. Enum:* recoverable, requires_buyer_input, requires_buyer_review, unrecoverable",
      ),
  }),
  commonMessageSchema.extend({
    type: z.literal("warning").describe("Message type discriminator."),
    presentation: z
      .string()
      .optional()
      .describe(
        "Rendering contract for this warning. 'notice' (default): platform MUST display, MAY dismiss. 'disclosure': platform MUST display in proximity to the path-referenced component, MUST NOT hide or auto-dismiss. See specification for full contract.",
      ),
    image_url: z
      .string()
      .optional()
      .describe(
        "URL to a required visual element (e.g., warning symbol, energy class label).",
      ),
    url: z
      .string()
      .optional()
      .describe(
        "Reference URL for more information (e.g., regulatory site, registry entry, policy page).",
      ),
  }),
  commonMessageSchema.extend({
    type: z.literal("info").describe("Informational message."),
  }),
]);

const descriptionSchema = z.object({
  plain: z.string().optional().describe("Plain text content."),
  html: z
    .string()
    .optional()
    .describe(
      "	HTML-formatted content. Security: Platforms MUST sanitize before rendering—strip scripts, event handlers, and untrusted elements. Treat all rich text as untrusted input.",
    ),
  markdown: z.string().optional().describe("Markdown-formatted content."),
});

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

const contextSchema = z.looseObject({
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
  eligibility: z.array(
    z
      .string()
      .regex(
        UCP_REVERSE_DOMAIN_NAME_REGEX,
        "Buyer claims about eligible benefits such as loyalty membership, payment instrument perks, and similar. Recognized claims MAY inform the Business response (e.g., member-only product availability, adjusted pricing in catalog, provisional discounts at cart or checkout). Businesses MUST ignore unrecognized values without error. Values MUST use reverse-domain naming (e.g., 'com.example.loyalty_gold', 'org.school.student') and MUST be non-identifying.",
      )
      .optional(),
  ),
});

const searchFiltersSchema = z
  .looseObject({
    categories: z
      .array(z.string())
      .optional()
      .describe(
        "Filter by product categories (OR logic — matches products in any listed categories). Values match against the value field in product category entries. Valid values can be discovered from the categories field in search results, merchant documentation, or standard taxonomies that businesses may align with.",
      ),
    price: priceRangeSchema
      .optional()
      .describe(
        "Price range filter denominated in context.currency. When context.currency matches the presentment currency, businesses apply the filter directly. When it differs, businesses SHOULD convert filter values to the presentment currency before applying; if conversion is not supported, businesses MAY ignore the filter and SHOULD indicate this via a message. When context.currency is absent, filter denomination is ambiguous and businesses MAY ignore it.",
      ),
  })
  .describe("Filter criteria for narrowing search results.");

const catalogPaginationRequestSchema = z
  .object({
    cursor: z
      .string()
      .optional()
      .describe("Opaque cursor from previous response."),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Requested page size. Implementations MAY clamp to a lower maximum.",
      ),
  })
  .describe("Pagination parameters for requests.");

const catalogPaginationResponseSchema = z
  .object({
    has_next_page: z.boolean().describe("Whether more results are available."),
    cursor: z
      .string()
      .optional()
      .describe(
        "Cursor to fetch the next page of results. MUST be present when has_next_page is true.",
      ),
    total_count: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Total number of matching items, if available."),
  })
  .describe("Pagination information in responses.");

export const searchCatalogRequestSchema = z.object({
  query: z.string().optional().describe("Free-text search query."),
  context: contextSchema
    .optional()
    .describe(
      "Provisional buyer signals for relevance and localization—not authoritative data. Businesses SHOULD use these values when verified inputs (e.g., shipping address) are absent, and MAY ignore or down-rank them if inconsistent with higher-confidence signals (authenticated account, risk detection) or regulatory constraints (export controls). Eligibility and policy enforcement MUST occur at checkout time using binding transaction data. Context SHOULD be non-identifying and can be disclosed progressively—coarse signals early, finer resolution as the session progresses. Higher-resolution data (shipping address, billing address) supersedes context.",
    ),
  signals: signalsSchema
    .optional()
    .describe(
      "Environment data provided by the platform to support authorization and abuse prevention. Values MUST NOT be buyer-asserted claims — platforms provide signals based on direct observation or independently verifiable third-party attestations. All signal keys MUST use reverse-domain naming to ensure provenance and prevent collisions when multiple extensions contribute to the shared namespace.",
    ),
  filters: searchFiltersSchema
    .optional()
    .describe(
      "Filter criteria to narrow search results. All specified filters combine with AND logic.",
    ),
  pagination: catalogPaginationRequestSchema.optional(),
});

const selectedOptionSchema = z.object({
  name: z.string().describe("Option name (e.g., 'Size')."),
  label: z.string().describe("Selected option label (e.g., 'Large')."),
  id: z
    .string()
    .optional()
    .describe(
      "Optional option value identifier from option_value.id. When present, the server SHOULD use it for matching; name and label remain required for display.",
    ),
});

export const mediaSchema = z.object({
  type: z
    .enum(["image", "video", "model_3d"])
    .or(z.string())
    .describe("Media type. Well-known values: image, video, model_3d."),
  url: z.string().describe("URL to the media resource."),
  alt_text: z
    .string()
    .optional()
    .describe("Accessibility text describing the media."),
  width: z.number().optional().describe("Width in pixels (for images/video)."),
  height: z
    .number()
    .optional()
    .describe("Height in pixels (for images/video)."),
});

export const ratingSchema = z
  .object({
    value: z.number().describe("Average rating value."),
    scale_max: z
      .number()
      .describe("Maximum value on the rating scale (e.g., 5 for 5-star)."),
    scale_min: z
      .number()
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

// écentic Enhancement:
// Each variant in a lookup_catalog response carries inputs[] correlating it back
// to the request identifiers that resolved to it. Spec: variants without an
// inputs entry MUST NOT appear in lookup responses.
const variantInputSchema = z.object({
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
});

// TODO: écentic Enhancement:
// Spec defines `available`/`exists` semantics for option values; the variant-level
const variantAvailabilitySchema = z
  .looseObject({
    available: z.boolean(),
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
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe(
      "Industry-standard product identifiers for cross-reference and correlation.",
    ),
  handle: z.string().optional().describe("URL-safe variant handle/slug."),
  url: z.string().optional().describe("Canonical variant page URL."),
  categories: z
    .array(categorySchema)
    .optional()
    .describe("Variant categories with optional taxonomy identifiers."),
  list_price: priceSchema.optional().describe("Variant listing price."),
  unit_price: z
    .record(z.string(), priceSchema)
    .optional()
    .describe(
      "Price per standard unit of measurement. MAY be omitted when unit pricing does not apply.",
    ),
  availability: variantAvailabilitySchema
    .optional()
    .describe("Variant availability for purchase."),
  inputs: z
    .array(variantInputSchema)
    .optional()
    .describe(
      "Request identifiers that resolved to this variant. Required in lookup_catalog responses.",
    ),
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
  // TODO: specify
  seller: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional seller context for this variant."),
});

const optionValueSchema = z
  .object({
    label: z
      .string()
      .describe("Display text for this option value (e.g., 'Small', 'Blue')."),
    id: z
      .string()
      .optional()
      .describe(
        "Optional server-assigned identifier for this option value. When present in a selected_option, the server SHOULD use it for matching instead of label.",
      ),
    available: z
      .boolean()
      .optional()
      .describe(
        "In stock and purchasable relative to product.selected. UI: selectable.",
      ),
    exists: z
      .boolean()
      .optional()
      .describe(
        "A variant exists for this value combined with product.selected. false → no such combination (UI: hidden or visually distinct).",
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
    .describe("Available values for this option."),
});

const productSchema = z.looseObject({
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
  url: z.string().optional().describe("Canonical product page URL."),
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
  const hasOptions = (product.options?.length ?? 0) > 0;

  // écentic Enhancement:
  // Spec: response MUST include product.selected when the product has options.
  // if (hasOptions && product.selected === undefined) {
  //   context.addIssue({
  //     code: "custom",
  //     path: ["selected"],
  //     message:
  //       "product.selected MUST be present when the product has configurable options",
  //   });
  // }

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
// Lookup responses are stricter: every variant MUST carry an inputs[] entry
// correlating it back to the request identifiers that resolved to it.
const lookupVariantSchema = variantSchema.extend({
  inputs: z
    .array(variantInputSchema)
    .min(1, "lookup response variants MUST carry at least one inputs entry"),
});

const lookupProductSchema = productSchema
  .extend({
    variants: z
      .array(lookupVariantSchema)
      .min(1, "product MUST have at least one variant"),
  })
  .superRefine(refineProductIntegrity);

export const searchCatalogResponseSchema = z.object({
  ucp: z.any().describe("UCP metadata for catalog responses."),
  products: z.array(productSchema),
  pagination: catalogPaginationResponseSchema.optional(),
  messages: z
    .array(messageSchema)
    .optional()
    .describe(
      "Errors, warnings, or informational messages about the search results.",
    ),
});

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

export const lookupCatalogResponseSchema = z.object({
  ucp: z.any().describe("UCP metadata for catalog responses."),
  products: z
    .array(lookupProductSchema)
    .describe(
      "Products matching the requested identifiers. May contain fewer items if some identifiers not found, or more if identifiers match multiple products.",
    ),
  messages: z
    .array(messageSchema)
    .optional()
    .describe(
      "Errors, warnings, or informational messages about the requested items.",
    ),
});

export const getProductRequestSchema = z.object({
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
        new Set(selected.map((option) => option.name)).size === selected.length,
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
});

export const getProductResponseSchema = z.object({
  ucp: z.any().describe("UCP metadata for catalog responses."),
  product: productSchema.describe(
    "The requested product with full detail. Singular — this is a single-resource operation.",
  ),
  messages: z
    .array(messageSchema)
    .optional()
    .describe(
      "Warnings or informational messages about the product (e.g., price recently changed, limited availability).",
    ),
});

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
  image_url: z.string().optional().describe("Product image URI."),
});

export const cartTotalSchema = z.object({
  // TODO: specify
  type: z
    .string()
    .describe(
      "Cost category. Well-known values: subtotal, items_discount, discount, fulfillment, tax, fee, total. Businesses MAY use additional values",
    ),
  amount: z
    .number()
    .int()
    .describe(
      "Monetary amount in the currency's minor unit as defined by ISO 4217. Refer to the currency's exponent to determine minor-to-major ratio (e.g., 2 for USD, 0 for JPY, 3 for KWD). May be negative — the sign is intrinsic to the value (e.g., discounts are negative, charges are positive).",
    ),
  display_text: z
    .string()
    .optional()
    .describe(
      "Text to display against the amount. Should reflect appropriate method (e.g., 'Shipping', 'Delivery').",
    ),
});

export const lineItemSchema = z.looseObject({
  id: z.string().optional().describe("Line item identifier"),
  item: cartItemSchema,
  quantity: z
    .number()
    .int()
    .positive()
    .describe("Quantity of the item being purchased."),
  totals: z.array(cartTotalSchema).describe("Line item totals breakdown."),
  parent_id: z
    .string()
    .optional()
    .describe("Parent line item identifier for any nested structures."),
});

export const buyerSchema = z.looseObject({
  first_name: z.string().optional().describe("First name of the buyer."),
  last_name: z.string().optional().describe("Last name of the buyer."),
  email: z.string().optional().describe("Email of the buyer."),
  phone_number: z.string().optional().describe("E.164 standard."),
});

export const createCartRequestSchema = z.object({
  line_items: z
    .array(lineItemSchema)
    .min(1)
    .describe(
      "Cart line items for create. Each entry needs item.id and quantity only; do not set line_items[].id.",
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
    .string()
    .describe("The actual URL pointing to the content to be displayed."),
  title: z
    .string()
    .optional()
    .describe(
      "Optional display text for the link. When provided, use this instead of generating from type.",
    ),
});

export const createCartResponseSchema = z.object({
  ucp: z.any().describe("UCP metadata for cart responses."),
  id: z.string().optional().describe("Unique cart identifier."),
  line_items: z.array(lineItemSchema).describe("Cart line items."),
  currency: z
    .string()
    .describe(
      "ISO 4217 currency code. Determined by merchant based on context or geo-IP.",
    ),
  totals: z
    .array(cartTotalSchema)
    .describe(
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
    .string()
    .optional()
    .describe(
      "URL for cart handoff and session recovery. Enables sharing and human-in-the-loop flows.",
    ),
  expires_at: z
    .string()
    .optional()
    .describe("Cart expiry timestamp (RFC 3339)."),
});

export const getCartRequestSchema = z.object({
  id: z.string().describe("The ID of the cart session."),
});

export const getCartResponseSchema = z.object({
  ucp: z.any().describe("UCP metadata for cart responses."),
  id: z.string().describe("Unique cart identifier."),
  line_items: z.array(lineItemSchema).describe("Cart line items."),
  currency: z
    .string()
    .describe(
      "ISO 4217 currency code. Determined by merchant based on context or geo-IP.",
    ),
  totals: z
    .array(cartTotalSchema)
    .describe(
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
    .string()
    .optional()
    .describe(
      "URL for cart handoff and session recovery. Enables sharing and human-in-the-loop flows.",
    ),
  expires_at: z
    .string()
    .optional()
    .describe("Cart expiry timestamp (RFC 3339)."),
});

export const updateCartRequestSchema = z.object({
  id: z.string().describe("The ID of the cart session to update."),
  line_items: z.array(lineItemSchema).describe("Cart line items."),
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

export const updateCartResponseSchema = z.object({
  ucp: z.any().describe("UCP metadata for cart responses."),
  id: z.string().describe("Unique cart identifier."),
  line_items: z.array(lineItemSchema).describe("Cart line items."),
  currency: z
    .string()
    .describe(
      "ISO 4217 currency code. Determined by merchant based on context or geo-IP.",
    ),
  totals: z
    .array(cartTotalSchema)
    .describe(
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
    .string()
    .optional()
    .describe(
      "URL for cart handoff and session recovery. Enables sharing and human-in-the-loop flows.",
    ),
  expires_at: z
    .string()
    .optional()
    .describe("Cart expiry timestamp (RFC 3339)."),
});

export const cancelCartRequestSchema = z.object({
  id: z.string().describe("The ID of the cart session to cancel."),
});

export const cancelCartResponseSchema = z.object({
  ucp: z.any().describe("UCP metadata for cart responses."),
  id: z.string().describe("Unique cart identifier."),
  line_items: z.array(lineItemSchema).describe("Cart line items."),
  currency: z
    .string()
    .describe(
      "ISO 4217 currency code. Determined by merchant based on context or geo-IP.",
    ),
  totals: z
    .array(cartTotalSchema)
    .describe(
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
    .string()
    .optional()
    .describe(
      "URL for cart handoff and session recovery. Enables sharing and human-in-the-loop flows.",
    ),
  expires_at: z
    .string()
    .optional()
    .describe("Cart expiry timestamp (RFC 3339)."),
});
