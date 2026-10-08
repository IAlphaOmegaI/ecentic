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
import { type StorefrontInfo, ucpEndpointUrl } from "./store-context";

export const buildDiscoveryProfile = (
  store: { id: string },
  storefront?: StorefrontInfo | null,
): Record<string, unknown> => {
  // No `supported_versions`: it maps *older* revisions to their own leaf
  // profiles, and this service speaks UCP_VERSION alone.
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
    // Payment handlers the store declared (via its plugin settings) — shared
    // with the checkout `payment.handlers` field so the processing specs a
    // platform discovers here match what checkout returns. The registry is
    // required, so a store with none declared publishes it empty.
    payment_handlers: storefront?.paymentHandlers ?? {},
  };

  // Identity linking: the store hosts its own OAuth 2.0 authorization server
  // (RFC 8414 metadata at {store}/.well-known/oauth-authorization-server);
  // config.scopes declares which operations gate behind user authentication.
  const identityScopes = storefront?.identityScopes ?? {};
  if (Object.keys(identityScopes).length > 0) {
    (ucp.capabilities as Record<string, unknown>)[
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
  // verify our RFC 9421 signatures. crv drives the algorithm (ES256). The
  // array sits at the top level of the profile, beside `ucp` — the one place
  // a verifier looks.
  const signingKey = platformSigningKey();
  if (!signingKey) return { ucp };

  return { ucp, signing_keys: [signingKey.publicJwk] };
};
