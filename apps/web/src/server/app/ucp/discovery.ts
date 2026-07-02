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
import { storefrontOrigin, ucpEndpointUrl } from "./store-context";

export const buildDiscoveryProfile = (store: {
  id: string;
  domain: string;
}): Record<string, unknown> => {
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

  // Publish the EC P-256 public signing key (JWK, RFC 7517) so platforms can
  // verify our RFC 9421 signatures. crv drives the algorithm (ES256).
  const signingKey = platformSigningKey();
  if (signingKey) {
    ucp["signing_keys"] = [signingKey.publicJwk];
  }

  return { ucp };
};
