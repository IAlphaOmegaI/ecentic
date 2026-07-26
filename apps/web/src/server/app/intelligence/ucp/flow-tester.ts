"use server";

import type { JSONRPCRequest } from "@ai-sdk/mcp";
import { createStreamableValue } from "@ai-sdk/rsc";
// import { UcpDiscoveryProfileSchema } from "@ucp-js/sdk";
import { merge, resultify } from "@zenncore/utils";
import { isLoopFinished, tool } from "ai";
import * as z from "zod";
import * as AI from "../../../utils/ai";
import {
  businessProfileSchema,
  cancelCartRequestSchema,
  cancelCartResponseSchema,
  cancelCheckoutRequestSchema,
  checkoutResponseSchema,
  checkoutWithFulfillmentResponseSchema,
  completeCheckoutWithFulfillmentResponseSchema,
  createCartRequestSchema,
  createCartResponseSchema,
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
} from "./advanced-validator";
import * as Utils from "./utils";

// ecentic UCP platform profile
const AGENT_PROFILE = "https://ecentic.ai/ucp/agent-profile";

// 2.5-flash handles this multi-step tool loop reliably; Gemini 3 needs
// thoughtSignature replay across steps, which is fragile here. Routed direct to
// Google (not the Vercel gateway) via AI.model below.
const FLOW_TESTER_MODEL = "gemini-2.5-flash";

const formatUcpMessage = (message: z.infer<typeof messageSchema>): string => {
  const path = message.path ? ` (${message.path})` : "";
  const code = message.code ? `[${message.code}] ` : "";
  return `${code}${message.content}${path}`;
};

const extractUcpToolError = (
  structuredContent: Record<string, unknown>,
): string | null => {
  const { ucp, messages: rawMessages } = structuredContent;
  const ucpStatus =
    typeof ucp === "object" && ucp !== null && "status" in ucp
      ? ucp.status
      : undefined;

  const messagesResult = z.array(messageSchema).safeParse(rawMessages);
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
): { success: true; data: T } | { success: false; error: string } => {
  const ucpError = extractUcpToolError(structuredContent);

  if (ucpError) return { success: false, error: ucpError };

  const parsed = successSchema.safeParse(structuredContent);

  if (!parsed.success) {
    // parsed.error.message is just "✖ Invalid input" — prettify the issues and
    // attach the received content so the real mismatch is debuggable.
    return {
      success: false,
      error: `UCP response did not match the expected schema:\n${z.prettifyError(
        parsed.error,
      )}\n\nReceived: ${JSON.stringify(structuredContent)}`,
    };
  }

  return { success: true, data: parsed.data };
};

// Shopify UCP MCP requires params.arguments.meta["ucp-agent"].profile on every
// JSON-RPC message (initialize, tools/list, tools/call, notifications). The AI
// SDK client does not send this by default, so we inject it at the fetch layer.
const _createUcpMcpFetch = (agentProfileUrl: string): typeof fetch => {
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

      console.log("message", message);
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

export type UCPTransports = "mcp" | "rest";

export type FlowTesterEvent =
  | {
      kind: "profile";
      transport: UCPTransports;
      endpoint: string;
      profileUrl: string;
      agentProfileUrl: string;
    }
  | { kind: "text"; text: string }
  | { kind: "tool_call"; id: string; tool: string; args: unknown }
  | { kind: "tool_result"; id: string; tool: string; result: unknown }
  | { kind: "done" }
  | { kind: "error"; message: string };

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
        "User-Agent": "UCP-Flow-Tester/1.0 (ecentic; https://ecentic.ai)",
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
    return {
      error: { message: body.error.message },
    };
  }

  return "error" in body.data ? { error: body.data.error } : body.data.result;
};

const parseMcpToolResult = <T>(
  result:
    | { structuredContent: Record<string, unknown> }
    | { error: { message: string } },
  successSchema: z.ZodType<T>,
) => {
  if ("error" in result) {
    return { error: result.error.message };
  }

  const parsed = parseUcpToolContent(result.structuredContent, successSchema);

  return parsed.success ? parsed.data : { error: parsed.error };
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
        "User-Agent": "UCP-Flow-Tester/1.0 (ecentic; https://ecentic.ai)",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    }),
  );

  console.log("response", response);

  if (!response.success) return { error: "Network request failed" };

  // console.log("response.data", response.data.ok, response.data.statusText);

  const textResult = await resultify(() => response.data.text());
  if (!textResult.success) return { error: "Could not read response body" };

  try {
    return JSON.parse(textResult.data);
  } catch {
    return { error: "Response is not valid JSON", raw: textResult.data };
  }
};

// REST body ≈ MCP structuredContent — reuse parseUcpToolContent directly
const parseRestToolResult = <T>(
  result: unknown,
  successSchema: z.ZodType<T>,
) => {
  if (result === null || typeof result !== "object") {
    return { error: "Invalid response" };
  }

  const obj = result as Record<string, unknown>;
  const { error } = obj;

  if ("error" in obj && typeof error === "string") {
    return { error };
  }

  const parsed = parseUcpToolContent(obj, successSchema);
  return parsed.success ? parsed.data : { error: parsed.error };
};

// Checkout argument shapes (create/update/complete) live in ./utils — shared with
// the playground, consumed below as Utils.*

const buildMcpTools = (endpoint: string, agentProfileUrl: string) => ({
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
      "Create a checkout session from scratch. Pass only checkout body nested under checkout — do not use cart_id (not supported by this business endpoint).",
    inputSchema: Utils.createCheckoutMcpInputSchema,
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
    inputSchema: Utils.updateCheckoutMcpInputSchema,
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
    inputSchema: Utils.completeCheckoutMcpInputSchema,
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
const buildRestTools = (endpoint: string, agentProfileUrl: string) => ({
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
      "Create a checkout session from scratch. Pass only checkout body nested under checkout — do not use cart_id.",
    inputSchema: Utils.createCheckoutMcpInputSchema,
    execute: async ({ checkout }) => {
      const result = await callRest(
        endpoint,
        "POST",
        "/checkouts",
        agentProfileUrl,
        checkout,
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
    inputSchema: Utils.updateCheckoutMcpInputSchema,
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
    inputSchema: Utils.completeCheckoutMcpInputSchema,
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

export type RunFlowTesterInput = {
  storeUrl: string;
  query?: string;
  agentProfileUrl?: string;
};

export const runFlowTester = async ({
  storeUrl,
  query,
  agentProfileUrl = AGENT_PROFILE,
}: RunFlowTesterInput) => {
  const streamable = createStreamableValue<FlowTesterEvent>();

  const emit = (event: FlowTesterEvent) => streamable.update(event);

  (async () => {
    try {
      const domain = storeUrl.replace(/\/+$/, "");
      const businessProfileUrl = `${domain}/.well-known/ucp`;

      const businessProfileDiscoveryResult = await resultify(() =>
        fetch(businessProfileUrl, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8_000),
        }),
      );

      if (!businessProfileDiscoveryResult.success) {
        emit({
          kind: "error",
          message: `Could not reach Business UCP profile at ${businessProfileUrl}. Make sure the store serves a valid /.well-known/ucp endpoint.`,
        });
        streamable.done();

        return;
      }

      const businessProfileResult = await resultify(() =>
        businessProfileDiscoveryResult.data.json(),
      );

      if (!businessProfileResult.success) {
        emit({
          kind: "error",
          message: "Could not read business profile response body.",
        });
        streamable.done();

        return;
      }

      const {
        success: businessProfileSuccess,
        data: businessProfile,
        error,
        // TODO: replace with UcpDiscoveryProfileSchema when updated
      } = businessProfileSchema.safeParse(businessProfileResult.data);

      if (!businessProfileSuccess) {
        console.error(error);
        emit({
          kind: "error",
          message: error.message,
        });
        streamable.done();

        return;
      }

      // 2. Discover transport and endpoint
      const shoppingServices = businessProfile.ucp.services["dev.ucp.shopping"];

      const mcpShoppingService = shoppingServices?.find(
        (shoppingService) => shoppingService.transport === "mcp",
      );
      const restShoppingService = shoppingServices?.find(
        (shoppingService) => shoppingService.transport === "rest",
      );
      const shoppingEndpoint =
        mcpShoppingService?.endpoint ?? restShoppingService?.endpoint;
      const shoppingTransport = mcpShoppingService ? "mcp" : "rest";

      if (!shoppingEndpoint || !shoppingTransport) {
        emit({
          kind: "error",
          message:
            "No dev.ucp.shopping service found in the UCP profile. The store does not advertise MCP or REST shopping endpoints.",
        });

        streamable.done();
        return;
      }

      emit({
        kind: "profile",
        transport: shoppingTransport,
        endpoint: shoppingEndpoint,
        profileUrl: businessProfileUrl,
        agentProfileUrl,
      });

      // 3. Build tools for the detected transport
      const tools =
        shoppingTransport === "mcp"
          ? buildMcpTools(shoppingEndpoint, agentProfileUrl)
          : buildRestTools(shoppingEndpoint, agentProfileUrl);

      const searchQuery = query?.trim() || "product";

      // 4. Run the agentic flow
      const agentResult = AI.stream({
        label: "ucp.flow-tester",
        model: FLOW_TESTER_MODEL,
        instructions: `You are a UCP (Universal Commerce Protocol) shopping agent running a live integration test against a ${shoppingTransport.toUpperCase()} endpoint.

CRITICAL ARGUMENT SHAPES — follow these exactly, do not add or remove top-level keys:

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
  { checkout: { buyer: { email, first_name, last_name }, line_items: [{ item: { id: "<variant_id>" }, quantity: 1 }], currency: "USD", fulfillment: { methods: [...] } } }
  Do NOT use cart_id — this business endpoint does not support cart conversion.
get_checkout:
  { id: "<checkout id from create_checkout>" }
update_checkout:
  { id: "<checkout id>", checkout: { buyer: {...}, line_items: [{ id: "li_...", item: { id: "<variant_id>" }, quantity: 1 }], currency: "USD", fulfillment: { methods: [{ id: "...", line_item_ids: [...], groups: [{ id: "...", selected_option_id: "..." }] }] } } }
  id is only at arguments top level — never inside checkout.
complete_checkout:
  { id: "<checkout id>", checkout: { payment: { instruments: [...] } } }
  Only when status is ready_for_complete. Never call for requires_escalation.
cancel_checkout:
  { id: "<checkout id>" }

Work through this flow in order:
1. search_catalog with query "${searchQuery}"
2. lookup_catalog with the product ID (or variant ID) of the first search result
3. get_product with the ID of the first result
4. create_cart with one line item using product.variants[0].id from get_product
5. get_cart — pass the id from create_cart
6. update_cart — same cart id; cart.line_items from get_cart with quantity 2
7. create_checkout — from scratch with checkout payload only (variant id from get_product; no cart_id)
8. get_checkout — id from step 7
9. If checkout status is requires_escalation or incomplete, report continue_url and messages — do NOT call complete_checkout

Call create_checkout once with the checkout body shape above. Use ONLY IDs returned by the tools — never invent them. If any tool returns { error: "..." }, ucp.status is error, or a step otherwise fails, stop immediately — do not call further tools. Summarize what succeeded, which step failed, and the error details. If all steps complete successfully, write 2–3 sentences on checkout status and continue_url when present.
DON'T CALL the same tool again if the first one hasn't finished yet.
`,
        prompt: `Test the UCP ${shoppingTransport.toUpperCase()} endpoint at ${shoppingEndpoint} (store: ${domain}).`,
        tools,
        stopWhen: isLoopFinished(),
      });

      for await (const event of agentResult.stream) {
        switch (event.type) {
          case "text-delta":
            emit({ kind: "text", text: event.text });
            break;
          case "tool-call":
            emit({
              kind: "tool_call",
              id: event.toolCallId,
              tool: event.toolName,
              args: event.input,
            });
            break;
          case "tool-result":
            emit({
              kind: "tool_result",
              id: event.toolCallId,
              tool: event.toolName,
              result: event.output,
            });
            break;
          case "error":
            emit({
              kind: "error",
              message:
                event.error instanceof Error
                  ? event.error.message
                  : "Stream error",
            });
            break;
        }
      }

      emit({ kind: "done" });
    } catch (error) {
      console.error("error", error);

      emit({
        kind: "error",
        message: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      streamable.done();
    }
  })();

  return { stream: streamable.value };
};
