"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import * as Agent from "@/server/app/agent";
import * as Authentication from "@/server/app/authentication";
import * as Feed from "@/server/app/integration/feed";
import * as WooCommerce from "@/server/app/integration/woocommerce";
import * as Store from "@/server/app/store";
import * as Subscription from "@/server/app/subscription";
import { schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { PLANS } from "@/server/utils/stripe";
import { Utils } from "./mcp/utils";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
};

type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

type Actor = {
  user: {
    id: string;
    email: string;
  };
  method: "api_key" | "session";
};

const host = process.env.APP_HOST ?? "https://ecentic.ai";
const endpoint = `${host}/api/mcp`;

const response = (
  id: JsonRpcRequest["id"],
  result?: unknown,
  error?: JsonRpcError,
) =>
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

const invalidParams = (id: JsonRpcRequest["id"], message: string) =>
  response(id, undefined, { code: -32602, message });

const methodNotFound = (id: JsonRpcRequest["id"], method?: string) =>
  response(id, undefined, {
    code: -32601,
    message: `Method not found: ${method ?? "unknown"}`,
  });

const unauthorized = (id: JsonRpcRequest["id"]) =>
  response(id, undefined, {
    code: -32001,
    message: "Authentication required",
    data: {
      hint: "Use Authorization: Bearer ecentic_sk_... or an authenticated session cookie.",
    },
  });

const parse = async (
  request: Request,
): Promise<
  { success: true; data: JsonRpcRequest } | { success: false; message: string }
> => {
  const text = await resultify(() => request.text());
  if (!text.success) return { success: false, message: "Invalid JSON payload" };

  const json = resultify(() => JSON.parse(text.data) as unknown);
  if (!json.success) return { success: false, message: "Invalid JSON payload" };

  if (typeof json.data !== "object" || json.data === null)
    return { success: false, message: "JSON-RPC body must be an object" };

  return { success: true, data: json.data as JsonRpcRequest };
};

const parseToolArgs = <T>(
  schema: z.ZodType<T>,
  value: unknown,
) => {
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

  const name = params["name"];
  const argumentsValue = params["arguments"];

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
    const authenticated = await Agent.authenticate(Environment.SERVER, { token });
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
      storeId: connection.data.id,
      platform: connection.data.platform,
      domain: connection.data.domain,
      status: connection.data.status,
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

export const getRoute = () =>
  Response.json(
    {
      name: Utils.protocol.server.name,
      protocol: "json-rpc-2.0",
      endpoint,
      methods: ["initialize", "tools/list", "tools/call"],
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    },
  );

export const handleRequest = async (request: Request) => {
  const payload = await parse(request);
  if (!payload.success)
    return response(null, undefined, { code: -32700, message: payload.message });

  const body = payload.data;

  if (body.jsonrpc !== "2.0")
    return invalidParams(body.id, 'jsonrpc must be exactly "2.0"');

  switch (body.method) {
    case "initialize":
      return response(body.id, {
        protocolVersion: Utils.protocol.version,
        serverInfo: Utils.protocol.server,
        capabilities: { tools: {} },
      });
    case "tools/list":
      return response(body.id, { tools: Utils.tools });
    case "tools/call": {
      const call = parseToolCall(body.params);
      if (!call.success) return invalidParams(body.id, call.message);

      const actor = await resolveActor(request);

      switch (call.data.name) {
        case "list_plans":
          return response(body.id, listPlans());
        case "create_api_key": {
          if (!actor) return unauthorized(body.id);
          const creation = await createApiKey(actor, call.data.arguments);
          if ("error" in creation)
            return response(body.id, undefined, creation.error);
          return response(body.id, creation.result);
        }
        case "create_checkout": {
          if (!actor) return unauthorized(body.id);
          const checkout = await createCheckout(actor, call.data.arguments);
          if ("error" in checkout)
            return response(body.id, undefined, checkout.error);
          return response(body.id, checkout.result);
        }
        case "connect_shopify": {
          const connection = connectShopify(call.data.arguments);
          if ("error" in connection)
            return response(body.id, undefined, connection.error);
          return response(body.id, connection.result);
        }
        case "connect_woocommerce": {
          if (!actor) return unauthorized(body.id);
          const connection = await connectWooCommerce(actor, call.data.arguments);
          if ("error" in connection)
            return response(body.id, undefined, connection.error);
          return response(body.id, connection.result);
        }
        case "connect_feed": {
          if (!actor) return unauthorized(body.id);
          const connection = await connectFeed(actor, call.data.arguments);
          if ("error" in connection)
            return response(body.id, undefined, connection.error);
          return response(body.id, connection.result);
        }
        case "get_onboarding_status": {
          if (!actor) return unauthorized(body.id);
          const status = await getOnboardingStatus(actor, call.data.arguments);
          if ("error" in status) return response(body.id, undefined, status.error);
          return response(body.id, status.result);
        }
        default:
          return response(body.id, undefined, {
            code: -32601,
            message: `Tool not found: ${call.data.name}`,
          });
      }
    }
    default:
      return methodNotFound(body.id, body.method);
  }
};
