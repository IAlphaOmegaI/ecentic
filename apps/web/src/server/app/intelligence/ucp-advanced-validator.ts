import * as z from "zod";

// TODO: Implement UCP Advanced Validator
// write advanced zod schemas for the UCP profile for the best ucp compatibility

const LATEST_UCP_VERSION = "2026-04-08";
const UCP_VERSION_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UCP_REVERSE_DOMAIN_NAME_REGEX = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;

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
  requires: z.record(z.string(), z.unknown()).optional(),
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

export const signalNameSchema = z.union([
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

export const signalsSchema = z.record(signalNameSchema, z.unknown());

// TODO: suggest businesses to add webhook_url to their config to track ai orders
// config: {
//   webhook_url: "https://platform.example.com/webhooks/ucp/orders";
// }

const priceSchema = z.object({
  amount: z
    .number()
    .describe("Amount in ISO 4217 minor units. Use 0 for free items."),
  currency: z
    .string()
    .describe("ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP')."),
});

const priceRangeSchema = z.object({
  min: z.number().optional().describe("Minimum price in ISO 4217 minor units."),
  max: z.number().optional().describe("Maximum price in ISO 4217 minor units."),
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

const messageSchema = z.discriminatedUnion("type", [
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

export const descriptionSchema = z.object({
  plain: z.string().optional().describe("Plain text content."),
  html: z
    .string()
    .optional()
    .describe(
      "	HTML-formatted content. Security: Platforms MUST sanitize before rendering—strip scripts, event handlers, and untrusted elements. Treat all rich text as untrusted input.",
    ),
  markdown: z.string().describe("Markdown-formatted content."),
});

export const categorySchema = z.object({
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

const catalogContextSchema = z.looseObject({
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

export const catalogSearchRequestSchema = z.object({
  query: z.string().optional().describe("Free-text search query."),
  context: catalogContextSchema
    .optional()
    .describe(
      "Provisional buyer signals for relevance and localization—not authoritative data. Businesses SHOULD use these values when verified inputs (e.g., shipping address) are absent, and MAY ignore or down-rank them if inconsistent with higher-confidence signals (authenticated account, risk detection) or regulatory constraints (export controls). Eligibility and policy enforcement MUST occur at checkout time using binding transaction data. Context SHOULD be non-identifying and can be disclosed progressively—coarse signals early, finer resolution as the session progresses. Higher-resolution data (shipping address, billing address) supersedes context.",
    ),
  signals: signalsSchema
    .optional()
    .describe(
      "Environment data provided by the platform to support authorization and abuse prevention. Values MUST NOT be buyer-asserted claims — platforms provide signals based on direct observation or independently verifiable third-party attestations. All signal keys MUST use reverse-domain naming to ensure provenance and prevent collisions when multiple extensions contribute to the shared namespace.",
    ),
  filters: z
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
    .optional()
    .describe(
      "Filter criteria to narrow search results. All specified filters combine with AND logic.",
    ),
  pagination: catalogPaginationRequestSchema.optional(),
});

const selectedOptionsSchema = z.object({
  name: z.string().describe("Option name (e.g., 'Size')."),
  label: z.string().describe("Selected option label (e.g., 'Large')."),
  id: z
    .string()
    .describe(
      "Optional option value identifier from option_value.id. When present, the server SHOULD use it for matching; name and label remain required for display.",
    ),
});

const mediaSchema = z.object({
  type: z
    .enum(["image", "video", "model_3d"])
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

const ratingSchema = z.object({
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
    .optional()
    .describe("Number of reviews contributing to the rating."),
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
  availability: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Variant availability for purchase."),
  options: z
    .array(selectedOptionsSchema)
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
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe("Variant tags for categorization and search."),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Business-defined custom data extending the standard variant model.",
    ),
  seller: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional seller context for this variant."),
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
    .describe(
      "Purchasable variants of this product. First item is the featured variant for listings.",
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
    .array(selectedOptionsSchema)
    .optional()
    .describe("Product options (Size, Color, etc.)."),
  rating: ratingSchema.optional().describe("Aggregate product rating."),
  tags: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe("Product tags for categorization and search.."),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Business-defined custom data extending the standard product model.",
    ),
});

export const catalogSearchResponseSchema = z.object({
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
