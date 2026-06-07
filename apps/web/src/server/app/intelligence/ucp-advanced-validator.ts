import * as z from "zod";

// TODO: Implement UCP Advanced Validator
// write advanced zod schemas for the UCP profile for the best ucp compatibility

const LATEST_UCP_VERSION = "2026-04-08";
const UCP_VERSION_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UCP_NAMESPACE_SEGMENT_REGEX = /^[a-z0-9-]+(\.[a-z0-9-]+){2,}$/;

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
    UCP_NAMESPACE_SEGMENT_REGEX,
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
    UCP_NAMESPACE_SEGMENT_REGEX,
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

export const signalSchema = z.union([
  z.literal("dev.ucp.buyer_ip").describe("Client's IP address (IPv4 or IPv6)."),
  z
    .literal("dev.ucp.user_agent")
    .describe("Client's HTTP User-Agent header or equivalent."),
  z
    .string()
    .regex(
      UCP_NAMESPACE_SEGMENT_REGEX,
      "Signal name must use reverse-domain format {reverse-domain}.{signal}",
    )
    .describe(
      "Signal name must use reverse-domain format {reverse-domain}.{signal}",
    ),
]);

// TODO: suggest businesses to add webhook_url to their config to track ai orders
// config: {
//   webhook_url: "https://platform.example.com/webhooks/ucp/orders";
// }
