/**
 * Identity-linking enforcement (`dev.ucp.common.identity_linking`) for the
 * hosted UCP endpoints.
 *
 * The store hosts its own OAuth 2.0 authorization server (users are its
 * WordPress customers — login and consent happen on the business domain, the
 * issuer). This module enforces the scope gates the store declared in
 * `config.scopes`: operations covered by a listed scope require a valid
 * Bearer user identity token, validated through the bridge introspection
 * route and cached briefly.
 *
 * Error semantics per the spec: absent/invalid token → 401 `identity_required`
 * with a `WWW-Authenticate: Bearer` challenge (realm = issuer,
 * `error="invalid_token"` only when a token was presented); valid token
 * missing a required scope → 403 `insufficient_scope` with the FULL required
 * scope set in the challenge's `scope` parameter.
 */

import { createHash } from "node:crypto";
import { redis } from "@/server/utils/durable";
import * as Bridge from "./bridge";
import { errorMessage, type UcpOperation } from "./protocol";
import { storefrontOrigin, type UcpStoreContext } from "./store-context";

/** Introspection cache TTL — short so revocation propagates quickly. */
const INTROSPECTION_CACHE_TTL = 60;

/**
 * Which declared scopes gate which hosted operations. A scope only takes
 * effect when the store lists it in `config.scopes`.
 */
const OPERATION_SCOPES: Record<UcpOperation, string[]> = {
  "catalog.search": ["dev.ucp.shopping.catalog.search:read"],
  "catalog.lookup": ["dev.ucp.shopping.catalog.lookup:read"],
  "catalog.product": ["dev.ucp.shopping.catalog.lookup:read"],
  cart: ["dev.ucp.shopping.cart:manage"],
  checkout: ["dev.ucp.shopping.checkout:manage"],
  order: ["dev.ucp.shopping.order:read"],
};

export type IdentityGateRejection = {
  status: 401 | 403;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

const bearerToken = (headers: Headers): string => {
  const authorization = headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
};

const challenge = (
  realm: string,
  parameters: Record<string, string> = {},
): string =>
  [
    `Bearer realm="${realm}"`,
    ...Object.entries(parameters).map(([key, value]) => `${key}="${value}"`),
  ].join(", ");

const introspect = async (
  context: UcpStoreContext,
  token: string,
): Promise<Bridge.BridgeIntrospection> => {
  if (!context.credentials) return { active: false };

  const cacheKey = `ucp:token:${context.store.id}:${createHash("sha256")
    .update(token)
    .digest("hex")}`;

  const cached = await (async () => {
    try {
      return await redis.get<Bridge.BridgeIntrospection>(cacheKey);
    } catch {
      return null;
    }
  })();
  if (cached) return cached;

  const result = await Bridge.introspectToken(
    {
      domain: context.store.domain,
      consumerKey: context.credentials.consumerKey,
      consumerSecret: context.credentials.consumerSecret,
    },
    token,
  );
  if (!result.success) return { active: false };

  try {
    await redis.set(cacheKey, result.data, { ex: INTROSPECTION_CACHE_TTL });
  } catch {
    // Best-effort cache.
  }

  return result.data;
};

/**
 * Enforces the store's identity-linking scope gates for an operation.
 * Returns null when the request may proceed (no gate, or a valid token with
 * the required scopes), else the 401/403 rejection to serve.
 */
export const enforceIdentityGate = async (
  context: UcpStoreContext,
  operation: UcpOperation,
  headers: Headers,
): Promise<IdentityGateRejection | null> => {
  const declared = context.storefront?.identityScopes ?? {};
  const required = (OPERATION_SCOPES[operation] ?? []).filter(
    (scope) => scope in declared,
  );
  if (required.length === 0) return null;

  const realm = storefrontOrigin(context.store.domain);
  const token = bearerToken(headers);

  if (token === "") {
    // No token presented — `error` omitted per RFC 6750 §3.1.
    return {
      status: 401,
      headers: { "WWW-Authenticate": challenge(realm) },
      body: {
        messages: [
          errorMessage(
            "identity_required",
            "User identity is required for this operation. Link an account via the store's authorization server.",
            "requires_buyer_review",
          ),
        ],
      },
    };
  }

  const grant = await introspect(context, token);
  if (!grant.active) {
    return {
      status: 401,
      headers: {
        "WWW-Authenticate": challenge(realm, {
          error: "invalid_token",
          error_description: "The access token is invalid or expired",
        }),
      },
      body: {
        messages: [
          errorMessage(
            "identity_required",
            "The user identity token is invalid or expired. Re-authenticate to continue.",
            "requires_buyer_review",
          ),
        ],
      },
    };
  }

  const granted = (grant.scope ?? "").split(" ").filter(Boolean);
  const missing = required.filter((scope) => !granted.includes(scope));
  if (missing.length > 0) {
    return {
      status: 403,
      headers: {
        "WWW-Authenticate": challenge(realm, {
          error: "insufficient_scope",
          // The FULL required set — platforms diff against granted scopes and
          // request only what is missing via incremental authorization.
          scope: required.join(" "),
        }),
      },
      body: {
        messages: [
          errorMessage(
            "insufficient_scope",
            `This operation requires scopes: ${required.join(", ")}`,
            "requires_buyer_review",
          ),
        ],
      },
    };
  }

  return null;
};
