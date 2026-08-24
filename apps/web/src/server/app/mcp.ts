"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { resourceMetadataWwwAuthenticate } from "@/lib/agent-discovery";
import * as Agent from "@/server/app/agent";
import * as Authentication from "@/server/app/authentication";
import * as Feed from "@/server/app/integration/feed";
import * as WooCommerce from "@/server/app/integration/woocommerce";
import * as Store from "@/server/app/store";
import * as Subscription from "@/server/app/subscription";
import { schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import * as JsonRpc2 from "@/server/utils/json-rpc";
import { mcpMethodNotAllowed } from "@/server/utils/mcp-http";
import { PLANS } from "@/server/utils/stripe";
import { Utils } from "./mcp/utils";

type Actor = {
  user: {
    id: string;
    email: string;
  };
  method: "api_key" | "session";
};

const host = process.env.APP_HOST ?? "https://ecentic.ai";
const endpoint = `${host}/api/mcp`;

namespace JsonRpc {
  export type Request = {
    jsonrpc?: string;
    id?: number | string | null;
    method?: string;
    params?: Record<string, unknown>;
  };

  export type Error = {
    code: number;
    message: string;
    data?: unknown;
  };

  export const create = (id: Request["id"], result?: unknown, error?: Error) =>
    Response.json(
      {
        jsonrpc: "2.0",
        id: id ?? null,
        ...(error ? { error } : { result }),
      },
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );

  export const invalidParams = (id: Request["id"], message: string) =>
    create(id, undefined, { code: -32602, message });

  export const methodNotFound = (id: Request["id"], method?: string) =>
    create(id, undefined, {
      code: -32601,
      message: `Method not found: ${method ?? "unknown"}`,
    });

  /**
   * JSON-RPC's rule is that a message without an `id` is a notification and
   * gets no reply; Streamable HTTP binds that to "202 Accepted, empty body".
   *
   * This is what broke the handshake. Every MCP SDK client sends
   * `notifications/initialized` immediately after `initialize`, and answering
   * it with a `-32601` JSON-RPC error — which is what a missing case in the
   * method switch produces — makes the transport treat the session as failed.
   */
  export const accepted = () =>
    new Response(null, {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    });

  export const unauthorized = (id: Request["id"]) =>
    Response.json(
      {
        jsonrpc: "2.0",
        id: id ?? null,
        error: {
          code: -32001,
          message: "Authentication required",
          data: {
            hint: "Use Authorization: Bearer ecentic_sk_... or an authenticated session cookie.",
            resource_metadata: `${host}/.well-known/oauth-protected-resource`,
          },
        },
      },
      {
        status: 401,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "WWW-Authenticate": resourceMetadataWwwAuthenticate,
        },
      },
    );
}

const parse = async (request: Request): Promise<JsonRpc2.ParsedBody> => {
  const text = await resultify(() => request.text());
  if (!text.success) return { success: false, message: "Invalid JSON payload" };
  return JsonRpc2.parseBody(text.data);
};

const parseToolArgs = <T>(schema: z.ZodType<T>, value: unknown) => {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    return {
      success: false as const,
      error: {
        code: -32602,
        message: parsed.error.message,
      },
    };
  return { success: true as const, data: parsed.data };
};

const parseToolCall = (value: unknown) => {
  if (typeof value !== "object" || value === null)
    return { success: false as const, message: "params must be an object" };

  const params = value as Record<string, unknown>;

  const { name, arguments: argumentsValue } = params;

  if (typeof name !== "string" || !name.trim())
    return {
      success: false as const,
      message: "params.name must be a non-empty string",
    };

  if (typeof argumentsValue !== "object" || argumentsValue === null)
    return {
      success: false as const,
      message: "params.arguments must be an object",
    };

  return {
    success: true as const,
    data: {
      name: name.trim(),
      arguments: argumentsValue as Record<string, unknown>,
    },
  };
};

const resolveActor = async (request: Request): Promise<Actor | null> => {
  const authorization = request.headers.get("authorization");
  const token = (() => {
    if (!authorization) return null;
    if (!authorization.startsWith("Bearer ")) return null;
    const value = authorization.slice(7).trim();
    if (!value) return null;
    return value;
  })();

  if (token) {
    const authenticated = await Agent.authenticate(Environment.SERVER, {
      token,
    });
    if (!authenticated.success || !authenticated.data) return null;

    return {
      user: {
        id: authenticated.data.user.id,
        email: authenticated.data.user.email,
      },
      method: "api_key",
    };
  }

  const user = await Authentication.getCurrentUser(Environment.SERVER);
  if (!user.success) return null;

  return {
    user: {
      id: user.data.id,
      email: user.data.email,
    },
    method: "session",
  };
};

const createText = (payload: unknown) => ({
  content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
});

const listPlans = () => {
  const plans = Object.entries(PLANS).map(([key, plan]) => ({
    key,
    name: plan.name,
    configured: Boolean(plan.priceId()),
  }));

  return createText({
    plans,
    note: "Use create_checkout with plan = compete|dominate.",
  });
};

const createApiKey = async (actor: Actor, raw: unknown) => {
  const parsed = parseToolArgs(Utils.schema.createApiKey, raw);
  if (!parsed.success) return { error: parsed.error };

  const creation = await Agent.createForUser(Environment.SERVER, {
    user: actor.user.id,
    name: parsed.data.name,
  });

  if (!creation.success)
    return {
      error: {
        code: -32000,
        message: creation.error.message,
      },
    };

  return {
    result: createText({
      id: creation.data.id,
      name: creation.data.name,
      key: creation.data.key,
      prefix: creation.data.prefix,
      warning:
        "Store this API key now. It is only shown once and cannot be retrieved later.",
    }),
  };
};

const createCheckout = async (actor: Actor, raw: unknown) => {
  const parsed = parseToolArgs(Utils.schema.createCheckout, raw);
  if (!parsed.success) return { error: parsed.error };

  const checkout = await Subscription.createCheckoutSessionForUser(
    Environment.SERVER,
    {
      user: actor.user.id,
      plan: parsed.data.plan,
    },
  );

  if (!checkout.success)
    return {
      error: {
        code: -32000,
        message: checkout.error.message,
      },
    };

  return {
    result: createText({
      url: checkout.data.url,
      plan: parsed.data.plan,
    }),
  };
};

const connectShopify = (raw: unknown) => {
  const parsed = parseToolArgs(Utils.schema.connectShopify, raw);
  if (!parsed.success) return { error: parsed.error };

  const sanitized = parsed.data.shop.replace(/[^a-zA-Z0-9\-.]/g, "");
  const domain = sanitized.includes(".myshopify.com")
    ? sanitized
    : `${sanitized}.myshopify.com`;

  return {
    result: createText({
      domain,
      authorizationUrl: `${host}/api/integrations/shopify/install?shop=${encodeURIComponent(domain)}`,
      note: "Open the authorization URL in a browser and approve Shopify access to finish connection.",
    }),
  };
};

const connectWooCommerce = async (actor: Actor, raw: unknown) => {
  const parsed = parseToolArgs(Utils.schema.connectWooCommerce, raw);
  if (!parsed.success) return { error: parsed.error };

  const connection = await WooCommerce.connectForUser(Environment.SERVER, {
    user: actor.user.id,
    domain: parsed.data.domain,
    consumerKey: parsed.data.consumerKey,
    consumerSecret: parsed.data.consumerSecret,
  });

  if (!connection.success)
    return {
      error: {
        code: -32000,
        message: connection.error.message,
      },
    };

  return {
    result: createText({
      storeId: connection.data.store.id,
      platform: connection.data.store.platform,
      domain: connection.data.store.domain,
      status: connection.data.store.status,
    }),
  };
};

const connectFeed = async (actor: Actor, raw: unknown) => {
  const parsed = parseToolArgs(Utils.schema.connectFeed, raw);
  if (!parsed.success) return { error: parsed.error };

  const connection = await Feed.connectForUser(Environment.SERVER, {
    user: actor.user.id,
    feedUrl: parsed.data.feedUrl,
  });

  if (!connection.success)
    return {
      error: {
        code: -32000,
        message: connection.error.message,
      },
    };

  return {
    result: createText({
      storeId: connection.data.id,
      platform: connection.data.platform,
      domain: connection.data.domain,
      status: connection.data.status,
    }),
  };
};

const getOnboardingStatus = async (actor: Actor, raw: unknown) => {
  const parsed = parseToolArgs(Utils.schema.empty, raw);
  if (!parsed.success) return { error: parsed.error };

  const [stores, subscriptions, keys] = await Promise.all([
    Store.find(Environment.SERVER, {
      where: eq(schema.store.userId, actor.user.id),
    }),
    Subscription.find(Environment.SERVER, {
      where: eq(schema.subscription.userId, actor.user.id),
      limit: 1,
    }),
    Agent.find(Environment.SERVER, {
      where: eq(schema.agentApiKey.userId, actor.user.id),
    }),
  ]);

  if (!stores.success)
    return {
      error: {
        code: -32000,
        message: stores.error.message,
      },
    };

  if (!subscriptions.success)
    return {
      error: {
        code: -32000,
        message: subscriptions.error.message,
      },
    };

  if (!keys.success)
    return {
      error: {
        code: -32000,
        message: keys.error.message,
      },
    };

  return {
    result: createText({
      user: actor.user,
      authMethod: actor.method,
      stores: {
        total: stores.data.length,
        platforms: stores.data.map((store) => store.platform),
      },
      apiKeys: {
        total: keys.data.length,
      },
      subscription: subscriptions.data[0]
        ? {
            plan: subscriptions.data[0].plan,
            status: subscriptions.data[0].status,
            currentPeriodEnd: subscriptions.data[0].currentPeriodEnd,
          }
        : null,
    }),
  };
};

/**
 * MCP Streamable HTTP reserves GET for the server-initiated SSE stream: the
 * spec says a server that does not offer one MUST answer `405`. ecentic answers
 * every request on the POST channel, so an MCP client asking for
 * `text/event-stream` gets exactly that 405 — anything else would leave the
 * client waiting on a stream that never arrives.
 *
 * Non-SSE callers still get the informational document that has always been
 * here; discovery tools read it, and it is not the channel the spec governs.
 *
 * @see https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
 */
export const getRoute = async (accept?: string | null) => {
  if (accept != null && /\btext\/event-stream\b/i.test(accept))
    return methodNotAllowed();

  return Response.json(
    {
      name: Utils.protocol.server.name,
      protocol: "json-rpc-2.0",
      protocolVersion: Utils.protocol.version,
      transport: "streamable-http",
      endpoint,
      methods: ["initialize", "tools/list", "tools/call"],
      manifest: `${host}/.well-known/mcp.json`,
      serverCard: `${host}/.well-known/mcp/server-card.json`,
      documentation: `${host}/auth.md`,
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // This GET answers differently for `Accept: text/event-stream` (405,
        // per Streamable HTTP). It was served from the shared CDN cache with no
        // `Vary`, so an SSE probe got the cached 200 JSON back and the client's
        // stream open failed — the whole reason the handshake scored broken.
        // A negotiated response that is never stored cannot be mismatched;
        // `Vary: Accept` is declared alongside it in `next.config.ts`, because
        // the App Router overwrites a `Vary` set inside a route handler.
        "Cache-Control": "no-store",
      },
    },
  );
};

/**
 * Streamable HTTP's session-termination verb. ecentic is stateless — there is
 * no `Mcp-Session-Id` to terminate — so the spec's answer is `405`.
 *
 * Deliberately not exported: this module carries a file-level `"use server"`,
 * which makes every export addressable as a server action. The route handlers
 * that answer `DELETE` call the same shared helper instead.
 */
const methodNotAllowed = async () => mcpMethodNotAllowed();

const negotiateProtocolVersion = (params?: JsonRpc2.JsonRpcMessage["params"]) =>
  JsonRpc2.negotiateProtocolVersion(
    params?.protocolVersion,
    Utils.protocol.supportedVersions,
    Utils.protocol.version,
  );

const dispatch = async (request: Request, body: JsonRpc2.JsonRpcMessage) => {
  if (body.jsonrpc !== "2.0")
    return JsonRpc.invalidParams(body.id, 'jsonrpc must be exactly "2.0"');

  switch (body.method) {
    case "initialize":
      return JsonRpc.create(body.id, {
        protocolVersion: negotiateProtocolVersion(body.params),
        serverInfo: Utils.protocol.server,
        capabilities: { tools: {} },
        instructions: Utils.protocol.instructions,
      });
    // Liveness probe from the shared MCP utilities. An empty result is the
    // whole contract; answering `-32601` reads to a client as a dead server.
    case "ping":
      return JsonRpc.create(body.id, {});
    case "tools/list":
      return JsonRpc.create(body.id, { tools: Utils.tools });
    case "tools/call": {
      const call = parseToolCall(body.params);
      if (!call.success) return JsonRpc.invalidParams(body.id, call.message);

      const actor = await resolveActor(request);

      switch (call.data.name) {
        case "list_plans":
          return JsonRpc.create(body.id, listPlans());
        case "create_api_key": {
          if (!actor) return JsonRpc.unauthorized(body.id);
          const creation = await createApiKey(actor, call.data.arguments);
          if ("error" in creation)
            return JsonRpc.create(body.id, undefined, creation.error);
          return JsonRpc.create(body.id, creation.result);
        }
        case "create_checkout": {
          if (!actor) return JsonRpc.unauthorized(body.id);
          const checkout = await createCheckout(actor, call.data.arguments);
          if ("error" in checkout)
            return JsonRpc.create(body.id, undefined, checkout.error);
          return JsonRpc.create(body.id, checkout.result);
        }
        case "connect_shopify": {
          const connection = connectShopify(call.data.arguments);
          if ("error" in connection)
            return JsonRpc.create(body.id, undefined, connection.error);
          return JsonRpc.create(body.id, connection.result);
        }
        case "connect_woocommerce": {
          if (!actor) return JsonRpc.unauthorized(body.id);
          const connection = await connectWooCommerce(
            actor,
            call.data.arguments,
          );
          if ("error" in connection)
            return JsonRpc.create(body.id, undefined, connection.error);
          return JsonRpc.create(body.id, connection.result);
        }
        case "connect_feed": {
          if (!actor) return JsonRpc.unauthorized(body.id);
          const connection = await connectFeed(actor, call.data.arguments);
          if ("error" in connection)
            return JsonRpc.create(body.id, undefined, connection.error);
          return JsonRpc.create(body.id, connection.result);
        }
        case "get_onboarding_status": {
          if (!actor) return JsonRpc.unauthorized(body.id);
          const status = await getOnboardingStatus(actor, call.data.arguments);
          if ("error" in status)
            return JsonRpc.create(body.id, undefined, status.error);
          return JsonRpc.create(body.id, status.result);
        }
        default:
          return JsonRpc.create(body.id, undefined, {
            code: -32601,
            message: `Tool not found: ${call.data.name}`,
          });
      }
    }
    default:
      return JsonRpc.methodNotFound(body.id, body.method);
  }
};

export const handleRequest = async (request: Request) => {
  const payload = await parse(request);
  if (!payload.success)
    return JsonRpc.create(null, undefined, {
      code: -32700,
      message: payload.message,
    });

  const { batch, messages } = payload;

  const answerable = messages.filter(JsonRpc2.isAnswerable);

  if (answerable.length === 0) return JsonRpc.accepted();

  const [single] = answerable;
  if (!batch && single) return dispatch(request, single);

  const settled = await Promise.all(
    answerable.map(async (message) => {
      const response = await dispatch(request, message);
      const parsed = await resultify(() => response.json() as Promise<unknown>);
      return {
        unauthorized: response.status === 401,
        // An answer that is not JSON would otherwise vanish from the array,
        // leaving the client with fewer replies than requests and no way to
        // tell which one lost its answer. Synthesise one that keeps the id, so
        // the batch stays correlatable however a dispatch fails.
        body: parsed.success
          ? parsed.data
          : {
              jsonrpc: "2.0",
              id: message.id ?? null,
              error: {
                code: -32603,
                message: "Internal error: the response could not be encoded.",
              },
            },
      };
    }),
  );

  return new Response(JSON.stringify(settled.map((entry) => entry.body)), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(settled.some((entry) => entry.unauthorized)
        ? { "WWW-Authenticate": resourceMetadataWwwAuthenticate }
        : {}),
    },
  });
};
