import type { JSONRPCRequest } from "@ai-sdk/mcp";
// import { UcpDiscoveryProfileSchema } from "@ucp-js/sdk";
import { merge, resultify } from "@zenncore/utils";
import { type InferUITools, isToolUIPart, tool, type UIMessage } from "ai";
import * as z from "zod";
import {
  businessProfileSchema,
  cancelCartRequestSchema,
  cancelCartResponseSchema,
  cancelCheckoutRequestSchema,
  checkoutPaymentSchema,
  checkoutResponseSchema,
  checkoutWithFulfillmentResponseSchema,
  completeCheckoutWithFulfillmentResponseSchema,
  createCartRequestSchema,
  createCartResponseSchema,
  createCheckoutWithFulfillmentRequestSchema,
  getCartRequestSchema,
  getCartResponseSchema,
  getCheckoutRequestSchema,
  getOrderRequestSchema,
  getProductRequestSchema,
  getProductResponseSchema,
  lookupCatalogRequestSchema,
  lookupCatalogResponseSchema,
  messageSchema,
  orderResponseSchema,
  searchCatalogRequestSchema,
  searchCatalogResponseSchema,
  ucpMCPResponseSchema,
  updateCartRequestSchema,
  updateCartResponseSchema,
  updateCheckoutWithFulfillmentRequestSchema,
} from "./ucp-advanced-validator";

// écentic UCP platform profile
export const AGENT_PROFILE = "https://ecentic.ai/ucp/agent-profile";

// Gemini 3 attaches a thoughtSignature to each reasoning/tool-call step that must
// be replayed verbatim on follow-up requests. Once tool calls are rebuilt across
// turns via convertToModelMessages and routed through the Vercel gateway, that
// signature gets corrupted → 400 "Corrupted thought signature". 2.5-flash emits no
// thought signatures and handles the UCP tool flow fine.
export const PLAYGROUND_MODEL = "google/gemini-2.5-flash";

// Single source of truth for the tool argument shapes the agent must follow, so
// they never drift from the tool definitions below.
const UCP_ARGUMENT_SHAPES = `CRITICAL ARGUMENT SHAPES — follow these exactly, do not add or remove top-level keys:

search_catalog:
  example parameters: { catalog: { query: "...", pagination: { limit: 5 }, filters: {}, context: {} } } (only define them if the user asks something that could be done by using the catalog properties even tho they might have been defined in the schema).
lookup_catalog:
  { catalog: { ids: ["<product_id_or_variant_id>"] } }
get_product:
  { catalog: { id: "<product_id>" } }
create_cart:
  { cart: { line_items: [{ item: { id: "<variant_id from get_product product.variants[].id>" }, quantity: 1 }] } }
  Only item.id and quantity per line item. Do NOT set line_items[].id.
get_cart:
  { id: "<copy id field exactly from create_cart tool result>" }
update_cart:
  { id: "<cart id>", cart: { line_items: [{ id: "<from get_cart>", item: { id: "<variant_id>" }, quantity: 2 }] } }
  Full replacement under cart. Keep line_items[].id from get_cart.
cancel_cart:
  { id: "<cart id from create_cart>" }
create_checkout:
  If a cart was created, convert it (preferred): { cart_id: "<cart id from create_cart>" } — omit the checkout body; the business uses the cart's line_items/buyer.
  From scratch (no cart): { checkout: { buyer: { email, first_name, last_name }, line_items: [{ item: { id: "<variant_id>" }, quantity: 1 }], currency: "USD", fulfillment: { methods: [...] } } }
  Pass cart_id OR checkout, never both.
get_checkout:
  { id: "<checkout id from create_checkout>" }
update_checkout:
  { id: "<checkout id>", checkout: { buyer: {...}, line_items: [{ id: "li_...", item: { id: "<variant_id>" }, quantity: 1 }], currency: "USD", fulfillment: { methods: [{ id: "...", line_item_ids: [...], groups: [{ id: "...", selected_option_id: "..." }] }] } } }
  id is only at arguments top level — never inside checkout.
complete_checkout:
  { id: "<checkout id>", checkout: { payment: { instruments: [...] } } }
  Only when status is ready_for_complete. Never call for requires_escalation.
cancel_checkout:
  { id: "<checkout id>" }`;

const formatUcpMessage = (message: z.infer<typeof messageSchema>): string => {
  const path = message.path ? ` (${message.path})` : "";
  const code = message.code ? `[${message.code}] ` : "";
  return `${code}${message.content}${path}`;
};

const extractUcpToolError = (
  structuredContent: Record<string, unknown>,
): string | null => {
  const ucp = structuredContent["ucp"];
  const ucpStatus =
    typeof ucp === "object" && ucp !== null && "status" in ucp
      ? ucp.status
      : undefined;
  const messagesResult = z
    .array(messageSchema)
    .safeParse(structuredContent["messages"]);

  const messages = messagesResult.success ? messagesResult.data : [];
  const errorMessages = messages.filter((message) => message.type === "error");

  if (ucpStatus === "error" || errorMessages.length > 0) {
    return errorMessages.length > 0
      ? errorMessages.map(formatUcpMessage).join("; ")
      : "UCP tool returned status: error";
  }

  return null;
};

const parseUcpToolContent = <T>(
  structuredContent: Record<string, unknown>,
  successSchema: z.ZodType<T>,
): T => {
  const ucpError = extractUcpToolError(structuredContent);

  if (ucpError) throw new Error(ucpError);

  return successSchema.parse(structuredContent);
};

// Shopify UCP MCP requires params.arguments.meta["ucp-agent"].profile on every
// JSON-RPC message (initialize, tools/list, tools/call, notifications). The AI
// SDK client does not send this by default, so we inject it at the fetch layer.
const createUcpMcpFetch = (agentProfileUrl: string): typeof fetch => {
  const ucpMcpFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    if (!init?.body || typeof init.body !== "string") {
      return fetch(input, init);
    }

    try {
      const message = JSON.parse(init.body) as {
        method?: string;
        params?: Record<string, unknown>;
      };

      if (!message.method) return fetch(input, init);

      const nextBody = JSON.stringify(
        merge(message, {
          params: {
            arguments: {
              meta: {
                "ucp-agent": { profile: agentProfileUrl },
              },
            },
          },
        }),
      );

      return fetch(input, { ...init, body: nextBody });
    } catch {
      return fetch(input, init);
    }
  };

  return Object.assign(ucpMcpFetch, { preconnect: fetch.preconnect });
};

export const gatewayOptions = () => ({
  gateway: {
    byok: {
      azure: [
        {
          apiKey: process.env.AZURE_API_KEY as string,
          resourceName: process.env.AZURE_RESOURCE_NAME as string,
        },
      ],
    },
  },
});

export type PlaygroundTransport = "mcp" | "rest";

// Custom UI message data parts streamed alongside the assistant reply. `profile`
// confirms the resolved transport/endpoint once per session; `error` reports a
// discovery failure before any model turn runs. Shared between the route handler
// and the useChat client so both agree on the part shapes.
export type PlaygroundDataParts = {
  profile: {
    transport: PlaygroundTransport;
    endpoint: string;
    profileUrl: string;
    agentProfileUrl: string;
  };
  error: { message: string };
};

// PlaygroundTools / PlaygroundUIMessage are defined after the tool builders
// below, since they infer the validated tool I/O from buildMcpTools.

export type ResolvedShoppingService =
  | {
      success: true;
      endpoint: string;
      transport: PlaygroundTransport;
      profileUrl: string;
    }
  | { success: false; error: string };

export const normalizePlaygroundStoreDomain = (storeUrl: string): string =>
  storeUrl
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

// Resolve a store's UCP business profile and pick its dev.ucp.shopping endpoint,
// preferring the MCP transport over REST. Stateless — safe to call per request.
export const resolveShoppingService = async (
  storeUrl: string,
): Promise<ResolvedShoppingService> => {
  const domain = normalizePlaygroundStoreDomain(storeUrl);

  if (!domain) {
    return { success: false, error: "Please enter a store domain." };
  }

  const businessProfileUrl = `https://${domain}/.well-known/ucp`;

  const discoveryResult = await resultify(() =>
    fetch(businessProfileUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    }),
  );

  if (!discoveryResult.success) {
    return {
      success: false,
      error: `Could not reach Business UCP profile at ${businessProfileUrl}. Make sure the store serves a valid /.well-known/ucp endpoint.`,
    };
  }

  const bodyResult = await resultify(() => discoveryResult.data.json());

  if (!bodyResult.success) {
    return {
      success: false,
      error: "Could not read business profile response body.",
    };
  }

  // TODO: replace with UcpDiscoveryProfileSchema when updated
  const parsed = businessProfileSchema.safeParse(bodyResult.data);

  if (!parsed.success) {
    console.error(parsed.error);
    return { success: false, error: parsed.error.message };
  }

  const shoppingServices = parsed.data.ucp.services["dev.ucp.shopping"];
  const mcpShoppingService = shoppingServices?.find(
    (shoppingService) => shoppingService.transport === "mcp",
  );
  const restShoppingService = shoppingServices?.find(
    (shoppingService) => shoppingService.transport === "rest",
  );
  const endpoint =
    mcpShoppingService?.endpoint ?? restShoppingService?.endpoint;

  if (!endpoint) {
    return {
      success: false,
      error:
        "No dev.ucp.shopping service found in the UCP profile. The store does not advertise MCP or REST shopping endpoints.",
    };
  }

  return {
    success: true,
    endpoint,
    transport: mcpShoppingService ? "mcp" : "rest",
    profileUrl: businessProfileUrl,
  };
};

const callMCP = async (
  endpoint: string,
  toolName: string,
  args: Record<string, unknown>,
  agentProfileUrl: string,
) => {
  const response = await resultify(() =>
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "UCP-Playground/1.0 (écentic; https://ecentic.ai)",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: merge(
          {
            name: toolName,
            arguments: {
              meta: {
                "ucp-agent": { profile: agentProfileUrl },
              },
            },
          },
          {
            arguments: args,
          },
        ),
      } satisfies JSONRPCRequest),
      signal: AbortSignal.timeout(12_000),
    }),
  );

  if (!response.success) return { error: { message: "Tool call failed" } };

  const dataResult = await resultify(() => response.data.json());

  if (!dataResult.success) {
    return { error: { message: "Tool call response is not valid JSON" } };
  }

  const body = ucpMCPResponseSchema.safeParse(dataResult.data);

  if (!body.success) {
    // TODO: for advanced(paid) version show the error and redirect user to fix it
    return {
      error: { message: z.prettifyError(body.error) },
    };
  }

  return "error" in body.data ? { error: body.data.error } : body.data.result;
};

const parseMcpToolResult = <T>(
  result:
    | { structuredContent: Record<string, unknown> }
    | { error: { message: string } },
  successSchema: z.ZodType<T>,
): T => {
  if ("error" in result) {
    throw new Error(result.error.message);
  }

  return parseUcpToolContent(result.structuredContent, successSchema);
};

const callRest = async (
  baseEndpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  agentProfileUrl: string,
  body?: unknown,
): Promise<unknown> => {
  const url = `${baseEndpoint.replace(/\/+$/, "")}${path}`;
  const response = await resultify(() =>
    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "UCP-Agent": `profile="${agentProfileUrl}"`,
        "User-Agent": "UCP-Playground/1.0 (écentic; https://ecentic.ai)",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    }),
  );

  console.log("response", response);

  if (!response.success) return { error: "Network request failed" };

  const textResult = await resultify(() => response.data.text());
  if (!textResult.success) return { error: "Could not read response body" };

  try {
    return JSON.parse(textResult.data);
  } catch {
    return { error: "Response is not valid JSON", raw: textResult.data };
  }
};

const parseRestToolResult = <T>(
  result: unknown,
  successSchema: z.ZodType<T>,
): T => {
  if (result === null || typeof result !== "object") {
    throw new Error("Invalid response");
  }

  const obj = result as Record<string, unknown>;

  if ("error" in obj && typeof obj["error"] === "string") {
    throw new Error(obj["error"]);
  }

  return parseUcpToolContent(obj, successSchema);
};

// MCP §3A — checkout arguments: session id at top level; body nested under checkout
const checkoutCurrencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "currency must be a 3-letter ISO 4217 code")
  .describe("ISO 4217 currency code (e.g., USD).");

const checkoutMcpPayloadSchema =
  createCheckoutWithFulfillmentRequestSchema.extend({
    currency: checkoutCurrencySchema.optional(),
  });

const checkoutMcpUpdatePayloadSchema =
  updateCheckoutWithFulfillmentRequestSchema.omit({ id: true }).extend({
    currency: checkoutCurrencySchema.optional(),
  });

const createCheckoutMcpInputSchema = z
  .object({
    cart_id: z
      .string()
      .optional()
      .describe(
        "Cart ID to convert to checkout. Business MUST use cart contents (line_items, context, buyer) and MUST ignore overlapping fields in checkout payload.",
      ),
    checkout: checkoutMcpPayloadSchema
      .optional()
      .describe(
        "Checkout body under arguments.checkout. Use alone for from-scratch create — omit cart_id.",
      ),
  })
  .superRefine((input, context) => {
    if (!input.cart_id && !input.checkout) {
      context.addIssue({
        code: "custom",
        message: "Provide cart_id or checkout",
      });
    }
    if (input.cart_id && input.checkout) {
      context.addIssue({
        code: "custom",
        message: "Use cart_id alone OR checkout alone, not both",
      });
    }
  });

const updateCheckoutMcpInputSchema = z.object({
  id: z.string().describe("Checkout session ID at arguments top level."),
  checkout: checkoutMcpUpdatePayloadSchema.describe(
    "Full replacement checkout body under arguments.checkout. Must not contain a session id.",
  ),
});

const completeCheckoutMcpInputSchema = z.object({
  id: z.string().describe("Checkout session ID at arguments top level."),
  checkout: z
    .object({
      payment: checkoutPaymentSchema.describe(
        "Payment instruments nested under arguments.checkout.payment.",
      ),
    })
    .describe("Finalization payload under arguments.checkout."),
});

export const buildMcpTools = (endpoint: string, agentProfileUrl: string) => ({
  search_catalog: tool({
    description:
      "Search the store product catalog. Returns matching products with IDs, titles, prices, and variant IDs. Arguments go under the 'catalog' key per UCP spec (only define them if the user asks something that could be done by using the catalog properties).",
    inputSchema: z.object({ catalog: searchCatalogRequestSchema }),
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "search_catalog",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, searchCatalogResponseSchema);
    },
  }),

  lookup_catalog: tool({
    description:
      "Lookup products or variants by identifiers. Use this when you already have IDs.",
    inputSchema: z.object({
      catalog: lookupCatalogRequestSchema,
    }),
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "lookup_catalog",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, lookupCatalogResponseSchema);
    },
  }),

  get_product: tool({
    description:
      "Get full product details (variants, pricing, images) for a product by its global ID.",
    inputSchema: z.object({ catalog: getProductRequestSchema }),
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "get_product",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, getProductResponseSchema);
    },
  }),

  create_cart: tool({
    description:
      "Create a new cart. Payload goes under the 'cart' key. Each line item needs only item.id (variant ID from catalog tools) and quantity. Optional cart.context for localization. Do not set line_items[].id.",
    inputSchema: z.object({
      cart: createCartRequestSchema,
    }),
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "create_cart",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, createCartResponseSchema);
    },
  }),

  get_cart: tool({
    description:
      "Get current cart state. Pass the cart id from the create_cart response.",
    inputSchema: getCartRequestSchema,
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "get_cart",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, getCartResponseSchema);
    },
  }),

  update_cart: tool({
    description:
      "Replace all cart line items (full replacement). Pass cart id at top level plus the complete new line_items array. Copy line_items from get_cart and modify — keep line_items[].id from get_cart.",
    inputSchema: z.object({
      id: updateCartRequestSchema.shape.id,
      cart: updateCartRequestSchema.omit({ id: true }),
    }),
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "update_cart",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, updateCartResponseSchema);
    },
  }),

  cancel_cart: tool({
    description:
      "Cancel a cart session. Pass the cart id from create_cart at the top level.",
    inputSchema: cancelCartRequestSchema,
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "cancel_cart",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, cancelCartResponseSchema);
    },
  }),

  create_checkout: tool({
    description:
      "Create a checkout session. To convert an existing cart, pass cart_id (the cart id from create_cart) and omit checkout — the business uses the cart's line_items/buyer. Otherwise pass the checkout body to create from scratch. Provide cart_id OR checkout, never both.",
    inputSchema: createCheckoutMcpInputSchema,
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "create_checkout",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, checkoutWithFulfillmentResponseSchema);
    },
  }),

  get_checkout: tool({
    description:
      "Get checkout session state. Pass checkout id at top level (from create_checkout).",
    inputSchema: getCheckoutRequestSchema,
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "get_checkout",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, checkoutWithFulfillmentResponseSchema);
    },
  }),

  update_checkout: tool({
    description:
      "Replace checkout session state (full PUT). MCP shape: id at top level; full checkout body nested under checkout (no session id inside checkout).",
    inputSchema: updateCheckoutMcpInputSchema,
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "update_checkout",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, checkoutWithFulfillmentResponseSchema);
    },
  }),

  complete_checkout: tool({
    description:
      "Place the order when status is ready_for_complete. MCP shape: id at top level; payment nested under checkout.payment. Do not use when status is requires_escalation.",
    inputSchema: completeCheckoutMcpInputSchema,
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "complete_checkout",
        {
          ...input,
          meta: { "idempotency-key": crypto.randomUUID() },
        },
        agentProfileUrl,
      );

      return parseMcpToolResult(
        result,
        completeCheckoutWithFulfillmentResponseSchema,
      );
    },
  }),

  cancel_checkout: tool({
    description: "Cancel a checkout session. Pass checkout id at top level.",
    inputSchema: cancelCheckoutRequestSchema,
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "cancel_checkout",
        {
          ...input,
          meta: { "idempotency-key": crypto.randomUUID() },
        },
        agentProfileUrl,
      );

      return parseMcpToolResult(result, checkoutResponseSchema);
    },
  }),

  get_order: tool({
    description: "Get order details. Pass order id at top level.",
    inputSchema: getOrderRequestSchema,
    execute: async (input) => {
      const result = await callMCP(
        endpoint,
        "get_order",
        input,
        agentProfileUrl,
      );

      return parseMcpToolResult(result, orderResponseSchema);
    },
  }),
});

// REST transport: same input shapes as MCP tools; IDs move to URL path per HTTP conventions
export const buildRestTools = (endpoint: string, agentProfileUrl: string) => ({
  search_catalog: tool({
    description:
      "Search the store product catalog. Returns matching products with IDs, titles, prices, and variant IDs. Arguments go under the 'catalog' key per UCP spec.",
    inputSchema: searchCatalogRequestSchema,
    execute: async (input) => {
      const result = await callRest(
        endpoint,
        "POST",
        "/catalog/search",
        agentProfileUrl,
        input,
      );

      console.log("result", result);

      return parseRestToolResult(result, searchCatalogResponseSchema);
    },
  }),

  lookup_catalog: tool({
    description:
      "Lookup products or variants by identifiers. Use this when you already have IDs.",
    inputSchema: z.object({ catalog: lookupCatalogRequestSchema }),
    execute: async ({ catalog }) => {
      const result = await callRest(
        endpoint,
        "POST",
        "/catalog/lookup",
        agentProfileUrl,
        catalog,
      );
      return parseRestToolResult(result, lookupCatalogResponseSchema);
    },
  }),

  get_product: tool({
    description:
      "Get full product details (variants, pricing, images) for a product by its global ID.",
    inputSchema: z.object({ catalog: getProductRequestSchema }),
    execute: async ({ catalog }) => {
      const result = await callRest(
        endpoint,
        "POST",
        "/catalog/products",
        agentProfileUrl,
        catalog,
      );
      return parseRestToolResult(result, getProductResponseSchema);
    },
  }),

  create_cart: tool({
    description:
      "Create a new cart. Payload goes under the 'cart' key. Each line item needs only item.id (variant ID from catalog tools) and quantity. Do not set line_items[].id.",
    inputSchema: z.object({ cart: createCartRequestSchema }),
    execute: async ({ cart }) => {
      const result = await callRest(
        endpoint,
        "POST",
        "/carts",
        agentProfileUrl,
        cart,
      );
      return parseRestToolResult(result, createCartResponseSchema);
    },
  }),

  get_cart: tool({
    description:
      "Get current cart state. Pass the cart id from the create_cart response.",
    inputSchema: getCartRequestSchema,
    execute: async ({ id }) => {
      const result = await callRest(
        endpoint,
        "GET",
        `/carts/${id}`,
        agentProfileUrl,
      );
      return parseRestToolResult(result, getCartResponseSchema);
    },
  }),

  update_cart: tool({
    description:
      "Replace all cart line items (full replacement). Pass cart id at top level plus the complete new line_items array. Copy line_items from get_cart and modify — keep line_items[].id from get_cart.",
    inputSchema: z.object({
      id: updateCartRequestSchema.shape.id,
      cart: updateCartRequestSchema.omit({ id: true }),
    }),
    execute: async ({ id, cart }) => {
      const result = await callRest(
        endpoint,
        "PUT",
        `/carts/${id}`,
        agentProfileUrl,
        cart,
      );
      return parseRestToolResult(result, updateCartResponseSchema);
    },
  }),

  cancel_cart: tool({
    description:
      "Cancel a cart session. Pass the cart id from create_cart at the top level.",
    inputSchema: cancelCartRequestSchema,
    execute: async ({ id }) => {
      const result = await callRest(
        endpoint,
        "DELETE",
        `/carts/${id}`,
        agentProfileUrl,
      );
      return parseRestToolResult(result, cancelCartResponseSchema);
    },
  }),

  create_checkout: tool({
    description:
      "Create a checkout session. To convert an existing cart, pass cart_id (the cart id from create_cart) and omit checkout — the business uses the cart's line_items/buyer. Otherwise pass the checkout body to create from scratch. Provide cart_id OR checkout, never both.",
    inputSchema: createCheckoutMcpInputSchema,
    execute: async ({ cart_id, checkout }) => {
      const result = await callRest(
        endpoint,
        "POST",
        "/checkouts",
        agentProfileUrl,
        cart_id ? { cart_id } : checkout,
      );
      return parseRestToolResult(result, checkoutWithFulfillmentResponseSchema);
    },
  }),

  get_checkout: tool({
    description:
      "Get checkout session state. Pass checkout id at top level (from create_checkout).",
    inputSchema: getCheckoutRequestSchema,
    execute: async ({ id }) => {
      const result = await callRest(
        endpoint,
        "GET",
        `/checkouts/${id}`,
        agentProfileUrl,
      );
      return parseRestToolResult(result, checkoutWithFulfillmentResponseSchema);
    },
  }),

  update_checkout: tool({
    description:
      "Replace checkout session state (full PUT). id at top level; full checkout body nested under checkout (no session id inside checkout).",
    inputSchema: updateCheckoutMcpInputSchema,
    execute: async ({ id, checkout }) => {
      const result = await callRest(
        endpoint,
        "PUT",
        `/checkouts/${id}`,
        agentProfileUrl,
        checkout,
      );
      return parseRestToolResult(result, checkoutWithFulfillmentResponseSchema);
    },
  }),

  complete_checkout: tool({
    description:
      "Place the order when status is ready_for_complete. id at top level; payment nested under checkout.payment. Do not use when status is requires_escalation.",
    inputSchema: completeCheckoutMcpInputSchema,
    execute: async ({ id, checkout }) => {
      const result = await callRest(
        endpoint,
        "POST",
        `/checkouts/${id}/complete`,
        agentProfileUrl,
        { ...checkout, meta: { "idempotency-key": crypto.randomUUID() } },
      );
      return parseRestToolResult(
        result,
        completeCheckoutWithFulfillmentResponseSchema,
      );
    },
  }),

  cancel_checkout: tool({
    description: "Cancel a checkout session. Pass checkout id at top level.",
    inputSchema: cancelCheckoutRequestSchema,
    execute: async ({ id }) => {
      const result = await callRest(
        endpoint,
        "DELETE",
        `/checkouts/${id}`,
        agentProfileUrl,
      );
      return parseRestToolResult(result, checkoutResponseSchema);
    },
  }),

  get_order: tool({
    description: "Get order details. Pass order id at top level.",
    inputSchema: getOrderRequestSchema,
    execute: async ({ id }) => {
      const result = await callRest(
        endpoint,
        "GET",
        `/orders/${id}`,
        agentProfileUrl,
      );
      return parseRestToolResult(result, orderResponseSchema);
    },
  }),
});

export type PlaygroundTools = InferUITools<ReturnType<typeof buildMcpTools>>;

export type PlaygroundUIMessage = UIMessage<
  never,
  PlaygroundDataParts,
  PlaygroundTools
>;

// ─── Conversational system prompt ─────────────────────────────────────────────
// Frames the agent to act one user-directed turn at a time rather than walking a
// fixed search→cart→checkout sequence.

export const buildChatSystemPrompt = (
  transport: PlaygroundTransport,
  endpoint: string,
  domain: string,
): string => `You are a UCP (Universal Commerce Protocol) shopping agent in an interactive test console, connected to a live ${transport.toUpperCase()} endpoint at ${endpoint} (store: ${domain}). You act on the user's instructions, calling UCP tools to search the catalog, inspect products, build carts, and run checkout.

${UCP_ARGUMENT_SHAPES}

How to behave in this console:
- Do exactly what the user asks in their latest message — one action (or a small set of directly related actions) at a time. Do NOT run the whole search→cart→checkout flow unless the user explicitly asks you to.
- Use ONLY IDs returned by earlier tool calls — never invent them. Previous tool calls and their results are included in the conversation; reuse their IDs (variant id, cart id, checkout id) when the user refers to "it", "that", or "the cart".
- If you need an ID you don't have yet (e.g. the user says "add it to a cart" but nothing was looked up), search or look it up first, or ask the user to clarify.
- If a tool call fails or ucp.status is error, stop and report the error details and which step failed — do not retry blindly.
- The UI renders catalog results (search/lookup/product) and carts as rich visual cards the user can already see, so do NOT re-list products, variants, prices, or cart line items in your reply. After those tools, answer with a single short sentence (e.g. "Found a few carry-on options below." or "Added the Carry-On to your cart."). The card already shows images, prices, totals, and the cart link.
- For results without a card (checkout, order), give a short plain-language summary: status, key IDs, and continue_url when present.
- Do not call the same tool again while a previous call to it is still pending.`;

// ─── History compaction ───────────────────────────────────────────────────────
// Every turn re-sends the whole conversation as input tokens, and UCP tool results
// (catalog pages, product detail, cart/checkout bodies) are the heavy part. We
// shrink tool outputs from *previous* assistant turns — capping arrays/strings/depth
// while leaving structure and IDs intact — so repeat turns stay cheap. The most
// recent assistant turn is kept at full fidelity, since the next action builds on it.

const MAX_HISTORY_STRING = 200;
const MAX_HISTORY_ARRAY = 5;
const MAX_HISTORY_DEPTH = 6;

const compactValue = (value: unknown, depth = 0): unknown => {
  if (typeof value === "string") {
    return value.length > MAX_HISTORY_STRING
      ? `${value.slice(0, MAX_HISTORY_STRING)}…+${value.length - MAX_HISTORY_STRING}chars`
      : value;
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_HISTORY_DEPTH) return `[${value.length} items]`;
    const head = value
      .slice(0, MAX_HISTORY_ARRAY)
      .map((item) => compactValue(item, depth + 1));
    return value.length > MAX_HISTORY_ARRAY
      ? [...head, `…+${value.length - MAX_HISTORY_ARRAY} more`]
      : head;
  }

  if (value !== null && typeof value === "object") {
    if (depth >= MAX_HISTORY_DEPTH) return "{…}";
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        compactValue(item, depth + 1),
      ]),
    );
  }

  return value;
};

// Compact tool outputs in every assistant turn except the most recent one. IDs
// (cart/variant/checkout) live near the top of each payload, so they survive; only
// the verbose long tail (extra variants, media, long descriptions) is trimmed.
export const compactToolHistory = (
  messages: PlaygroundUIMessage[],
): PlaygroundUIMessage[] => {
  const lastAssistantIndex = messages.reduce(
    (latest, message, index) => (message.role === "assistant" ? index : latest),
    -1,
  );

  return messages.map((message, index) => {
    if (message.role !== "assistant" || index === lastAssistantIndex) {
      return message;
    }

    return {
      ...message,
      // compactValue trims output to unknown JSON, so cast back to the part type —
      // compaction is intentionally lossy and the result is only fed to the model.
      parts: message.parts.map((part) =>
        isToolUIPart(part) && part.state === "output-available"
          ? { ...part, output: compactValue(part.output) }
          : part,
      ) as PlaygroundUIMessage["parts"],
    };
  });
};
