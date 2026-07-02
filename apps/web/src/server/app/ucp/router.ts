/**
 * Request pipeline + dispatch for the hosted UCP REST surface at
 * `/api/ucp/stores/{store}/...`. Mirrors the reference implementation's
 * pre-dispatch order: rate limit → RFC 9421 verification (verify-when-present)
 * → idempotency replay → capability negotiation → operation, then response
 * signing for checkout/order responses and idempotency result caching.
 */

import type { NextRequest } from "next/server";
import * as Cart from "./cart";
import * as Catalog from "./catalog";
import * as Checkout from "./checkout";
import { buildDiscoveryProfile } from "./discovery";
import {
  idempotencyPrecheck,
  idempotencyStore,
  idempotencyStoreKey,
} from "./idempotency";
import {
  agentProfileUrl,
  fetchPlatformProfile,
  negotiate,
} from "./negotiation";
import * as Orders from "./orders";
import {
  contextualStorefrontUrl,
  type Negotiated,
  type UcpOperation,
} from "./protocol";
import { isRateLimited } from "./rate-limit";
import { signResponse, verifyRequest } from "./signatures";
import { resolveStoreContext, type UcpStoreContext } from "./store-context";

// ─── CORS ────────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-UCP-Key, UCP-Agent, Idempotency-Key, Request-Id, Signature, Signature-Input, Content-Digest",
  "Access-Control-Expose-Headers":
    "Signature, Signature-Input, Content-Digest, Idempotency-Replayed",
  "Access-Control-Max-Age": "86400",
};

const json = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response => {
  const serialized = JSON.stringify(body);
  return new Response(serialized, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...headers,
    },
  });
};

/**
 * Serializes once and signs high-value responses (checkout sessions and order
 * entities) over the exact bytes served, per RFC 9421.
 */
const signedJson = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response => {
  const serialized = JSON.stringify(body);
  const signature =
    status >= 200 && status < 300 ? signResponse(status, serialized) : {};
  return new Response(serialized, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...signature,
      ...headers,
    },
  });
};

// ─── Route matching ──────────────────────────────────────────────────────────

type Route = {
  operation: UcpOperation;
  signResponse: boolean;
  handle: (input: {
    context: UcpStoreContext;
    negotiated: Negotiated | null;
    payload: Record<string, unknown>;
    id: string;
  }) => Promise<{ status: number; body: Record<string, unknown> }>;
};

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const matchRoute = (method: string, segments: string[]): Route | null => {
  const [first, second, third] = segments;

  switch (true) {
    case method === "POST" && first === "catalog" && second === "search":
      return {
        operation: "catalog.search",
        signResponse: false,
        handle: ({ context, negotiated, payload }) =>
          Catalog.search({ store: context.store, negotiated, payload }),
      };
    case method === "POST" && first === "catalog" && second === "lookup":
      return {
        operation: "catalog.lookup",
        signResponse: false,
        handle: ({ context, negotiated, payload }) =>
          Catalog.lookup({ store: context.store, negotiated, payload }),
      };
    case method === "POST" && first === "catalog" && second === "product":
      return {
        operation: "catalog.product",
        signResponse: false,
        handle: ({ context, negotiated, payload }) =>
          Catalog.productDetail({ store: context.store, negotiated, payload }),
      };
    case method === "POST" && first === "carts" && segments.length === 1:
      return {
        operation: "cart",
        signResponse: false,
        handle: ({ context, negotiated, payload }) =>
          Cart.create({ context, negotiated, payload }),
      };
    case method === "GET" &&
      first === "carts" &&
      !!second &&
      ID_PATTERN.test(second) &&
      segments.length === 2:
      return {
        operation: "cart",
        signResponse: false,
        handle: ({ context, negotiated, id }) =>
          Cart.get({ context, negotiated, id }),
      };
    case method === "PUT" &&
      first === "carts" &&
      !!second &&
      ID_PATTERN.test(second) &&
      segments.length === 2:
      return {
        operation: "cart",
        signResponse: false,
        handle: ({ context, negotiated, payload, id }) =>
          Cart.update({ context, negotiated, payload, id }),
      };
    case method === "POST" &&
      first === "carts" &&
      !!second &&
      third === "cancel":
      return {
        operation: "cart",
        signResponse: false,
        handle: ({ context, negotiated, id }) =>
          Cart.cancel({ context, negotiated, id }),
      };
    case method === "POST" &&
      first === "checkout-sessions" &&
      segments.length === 1:
      return {
        operation: "checkout",
        signResponse: true,
        handle: ({ context, negotiated, payload }) =>
          Checkout.create({ context, negotiated, payload }),
      };
    case method === "GET" &&
      first === "checkout-sessions" &&
      !!second &&
      ID_PATTERN.test(second) &&
      segments.length === 2:
      return {
        operation: "checkout",
        signResponse: true,
        handle: ({ context, negotiated, id }) =>
          Checkout.get({ context, negotiated, id }),
      };
    case method === "PUT" &&
      first === "checkout-sessions" &&
      !!second &&
      ID_PATTERN.test(second) &&
      segments.length === 2:
      return {
        operation: "checkout",
        signResponse: true,
        handle: ({ context, negotiated, payload, id }) =>
          Checkout.update({ context, negotiated, payload, id }),
      };
    case method === "POST" &&
      first === "checkout-sessions" &&
      !!second &&
      third === "complete":
      return {
        operation: "checkout",
        signResponse: true,
        handle: ({ context, negotiated, id }) =>
          Checkout.complete({ context, negotiated, id }),
      };
    case method === "POST" &&
      first === "checkout-sessions" &&
      !!second &&
      third === "cancel":
      return {
        operation: "checkout",
        signResponse: true,
        handle: ({ context, negotiated, payload, id }) =>
          Checkout.cancel({ context, negotiated, payload, id }),
      };
    case method === "GET" &&
      first === "orders" &&
      !!second &&
      /^\d+$/.test(second):
      return {
        operation: "order",
        signResponse: true,
        handle: ({ context, negotiated, id }) =>
          Orders.get({ context, negotiated, id }),
      };
    default:
      return null;
  }
};

// ─── Entry point ─────────────────────────────────────────────────────────────

export const handleUcpRequest = async (
  request: NextRequest,
  storeId: string,
  segments: string[],
): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const context = await resolveStoreContext(storeId);
  if (!context) {
    return json(404, { code: "not_found", content: "Unknown store." });
  }

  // Discovery profile: public, unnegotiated, cacheable.
  if (
    request.method === "GET" &&
    (segments.length === 0 ||
      (segments.length === 1 && segments[0] === "profile"))
  ) {
    return json(200, buildDiscoveryProfile(context.store), {
      "Cache-Control": "public, max-age=300",
    });
  }

  if (await isRateLimited({ store: storeId, headers: request.headers })) {
    return json(
      429,
      { code: "rate_limited", content: "Too many requests." },
      { "Retry-After": "60" },
    );
  }

  const route = matchRoute(request.method, segments);
  if (!route) {
    return json(404, { code: "not_found", content: "Unknown UCP operation." });
  }

  const rawBody = await request.text();
  const payload = (() => {
    if (rawBody === "") return {} as Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    } catch {
      return null;
    }
  })();

  if (payload === null) {
    return json(400, {
      code: "invalid_request",
      content: "Request body is not valid JSON.",
    });
  }

  const continueUrl = contextualStorefrontUrl(
    context.store.domain,
    route.operation,
  );

  // RFC 9421 signature verification — verify-when-present.
  const url = request.nextUrl;
  const verification = await verifyRequest(
    {
      method: request.method,
      authority:
        request.headers.get("x-forwarded-host") ??
        request.headers.get("host") ??
        url.host,
      path: url.pathname,
      query: url.searchParams.toString(),
      headers: request.headers,
      body: rawBody,
    },
    agentProfileUrl(request.headers),
    fetchPlatformProfile,
  );
  if (verification.status === "error") {
    return json(
      verification.http,
      { code: verification.code, content: verification.content },
      verification.http === 401 ? { "WWW-Authenticate": "Signature" } : {},
    );
  }

  // Replay protection: duplicate Idempotency-Keys replay the cached response.
  const idempotencyKey = idempotencyStoreKey({
    store: storeId,
    method: request.method,
    path: url.pathname,
    headers: request.headers,
  });
  const precheck = await idempotencyPrecheck(idempotencyKey);
  switch (precheck.outcome) {
    case "replay":
      return json(precheck.status, precheck.data, {
        "Idempotency-Replayed": "true",
      });
    case "conflict":
      return json(409, {
        code: "idempotency_conflict",
        content: "A request with this Idempotency-Key is already in progress.",
      });
    case "unavailable":
      return json(
        503,
        {
          code: "idempotency_unavailable",
          content: "Idempotency storage is unavailable. Retry shortly.",
        },
        { "Retry-After": "5" },
      );
    default:
      break;
  }

  const negotiation = await negotiate({
    headers: request.headers,
    operation: route.operation,
    continueUrl,
  });
  if (negotiation.outcome === "transport_error") {
    return json(
      negotiation.error.status,
      negotiation.error.body,
      negotiation.error.headers,
    );
  }
  if (negotiation.outcome === "business_error") {
    return json(200, negotiation.body);
  }

  const result = await route.handle({
    context,
    negotiated: negotiation.negotiated,
    payload,
    id: segments[1] ?? "",
  });

  await idempotencyStore(idempotencyKey, result.status, result.body);

  return route.signResponse
    ? signedJson(result.status, result.body)
    : json(result.status, result.body);
};
