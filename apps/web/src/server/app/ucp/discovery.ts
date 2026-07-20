/**
 * Per-store UCP discovery profile. The store's plugin serves this JSON at its
 * own `/.well-known/ucp` (proxied with a transient cache), so agents discover
 * the store normally but are pointed at this backend as the UCP REST endpoint.
 */

import {
  discoveryCapabilityDeclarations,
  SHOPPING_SERVICE,
  UCP_VERSION,
} from "./protocol";
import { platformSigningKey } from "./signatures";
import {
  type StorefrontInfo,
  storefrontOrigin,
  ucpEndpointUrl,
} from "./store-context";

export const buildDiscoveryProfile = (
  store: {
    id: string;
    domain: string;
  },
  storefront?: StorefrontInfo | null,
): Record<string, unknown> => {
  const ucp: Record<string, unknown> = {
    version: UCP_VERSION,
    services: {
      "dev.ucp.shopping": [
        {
          version: UCP_VERSION,
          spec: SHOPPING_SERVICE.spec,
          transport: "rest",
          endpoint: ucpEndpointUrl(store.id),
          schema: SHOPPING_SERVICE.schema,
        },
      ],
    },
    capabilities: discoveryCapabilityDeclarations(),
    // Version-specific profile URIs. The store's own well-known URL is the
    // canonical one agents discover.
    supported_versions: {
      [UCP_VERSION]: `${storefrontOrigin(store.domain)}/.well-known/ucp`,
    },
  };

  // Payment handlers the store declared (via its plugin settings) — shared
  // with the checkout `payment.handlers` field so the processing specs a
  // platform discovers here match what checkout returns.
  const handlers = storefront?.paymentHandlers ?? {};
  if (Object.keys(handlers).length > 0) {
    ucp["payment_handlers"] = handlers;
  }

  // Identity linking: the store hosts its own OAuth 2.0 authorization server
  // (RFC 8414 metadata at {store}/.well-known/oauth-authorization-server);
  // config.scopes declares which operations gate behind user authentication.
  const identityScopes = storefront?.identityScopes ?? {};
  if (Object.keys(identityScopes).length > 0) {
    (ucp["capabilities"] as Record<string, unknown>)[
      "dev.ucp.common.identity_linking"
    ] = [
      {
        version: UCP_VERSION,
        spec: "https://ucp.dev/2026-04-08/specification/identity-linking",
        schema:
          "https://ucp.dev/2026-04-08/schemas/common/identity_linking.json",
        config: { scopes: identityScopes },
      },
    ];
  }

  // Publish the EC P-256 public signing key (JWK, RFC 7517) so platforms can
  // verify our RFC 9421 signatures. crv drives the algorithm (ES256).
  const signingKey = platformSigningKey();
  if (signingKey) {
    ucp["signing_keys"] = [signingKey.publicJwk];
  }

  return { ucp };
};
