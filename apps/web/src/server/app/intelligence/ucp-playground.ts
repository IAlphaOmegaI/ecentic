"use server";

import type { JSONRPCRequest } from "@ai-sdk/mcp";
import { createStreamableValue } from "@ai-sdk/rsc";
// import { UcpDiscoveryProfileSchema } from "@ucp-js/sdk";
import { merge, resultify } from "@zenncore/utils";
import { isLoopFinished, streamText, tool } from "ai";
import * as z from "zod";
import {
  cancelCartRequestSchema,
  cancelCartResponseSchema,
  createCartRequestSchema,
  createCartResponseSchema,
  discoveryProfileSchema,
  getCartRequestSchema,
  getCartResponseSchema,
  getProductRequestSchema,
  getProductResponseSchema,
  lookupCatalogRequestSchema,
  lookupCatalogResponseSchema,
  messageSchema,
  searchCatalogRequestSchema,
  searchCatalogResponseSchema,
  ucpMCPResponseSchema,
  updateCartRequestSchema,
  updateCartResponseSchema,
} from "./ucp-advanced-validator";

// écentic UCP platform profile
const AGENT_PROFILE = "https://ecentic.ai/ucp/agent-profile";

// Gemini 3 requires thoughtSignature replay on multi-step tool loops; the gateway
// path triggers SDK sentinel injection + warnings. 2.5-flash is sufficient here.
const PLAYGROUND_MODEL = "google/gemini-3-flash";

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
): { success: true; data: T } | { success: false; error: string } => {
  const ucpError = extractUcpToolError(structuredContent);

  if (ucpError) return { success: false, error: ucpError };

  const parsed = successSchema.safeParse(structuredContent);

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  return { success: true, data: parsed.data };
};

// Shopify UCP MCP requires params.arguments.meta["ucp-agent"].profile on every
// JSON-RPC message (initialize, tools/list, tools/call, notifications). The AI
// SDK client does not send this by default, so we inject it at the fetch layer.
// const createUcpMcpFetch =
//   (agentProfileUrl: string): typeof fetch =>
//   async (input, init) => {
//     if (!init?.body || typeof init.body !== "string") {
//       return fetch(input, init);
//     }

//     try {
//       const message = JSON.parse(init.body) as {
//         method?: string;
//         params?: Record<string, unknown>;
//       };

//       if (!message.method) return fetch(input, init);

//       const params = { ...(message.params ?? {}) };
//       // biome-ignore lint/complexity/useLiteralKeys: index signature property
//       const argumentsParams = params["arguments"];

//       const existingArgs =
//         typeof argumentsParams === "object" && argumentsParams !== null
//           ? (argumentsParams as Record<string, unknown>)
//           : {};

//       // biome-ignore lint/complexity/useLiteralKeys: index signature property
//       const metaParams = existingArgs["meta"];

//       const existingMeta =
//         typeof metaParams === "object" && metaParams !== null
//           ? (metaParams as Record<string, unknown>)
//           : {};

//       const nextBody = JSON.stringify({
//         ...message,
//         params: {
//           ...params,
//           arguments: {
//             ...existingArgs,
//             meta: {
//               ...existingMeta,
//               "ucp-agent": { profile: agentProfileUrl },
//             },
//           },
//         },
//       });

//       return fetch(input, { ...init, body: nextBody });
//     } catch {
//       return fetch(input, init);
//     }
//   };

const gatewayOptions = () => ({
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

export type PlaygroundEvent =
  | {
      kind: "profile";
      transport: PlaygroundTransport;
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

// const callRest = async (
//   baseEndpoint: string,
//   method: "GET" | "POST" | "PUT",
//   path: string,
//   agentProfileUrl: string,
//   body?: unknown,
// ): Promise<unknown> => {
//   const url = `${baseEndpoint.replace(/\/$/, "")}${path}`;
//   const response = await resultify(() =>
//     fetch(url, {
//       method,
//       headers: {
//         "Content-Type": "application/json",
//         Accept: "application/json",
//         "UCP-Agent": `profile="${agentProfileUrl}"`,
//         "User-Agent": "UCP-Playground/1.0 (Ecentic; https://ecentic.ai)",
//       },
//       body: body !== undefined ? JSON.stringify(body) : undefined,
//       signal: AbortSignal.timeout(12_000),
//       cache: "no-store",
//     }),
//   );

//   if (!response.success) return { error: "Network request failed" };

//   const textResult = await resultify(() => response.data.text());
//   if (!textResult.success) return { error: "Could not read response body" };

//   try {
//     return JSON.parse(textResult.data);
//   } catch {
//     return { error: "Response is not valid JSON", raw: textResult.data };
//   }
// };

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
});

// // REST transport: standard HTTP body shapes per UCP §2A
// const buildRestTools = (endpoint: string, agentProfileUrl: string) => ({
//   search_catalog: tool({
//     description: "Search the store product catalog via REST.",
//     inputSchema: z.object({
//       query: z.string().describe("Text search query"),
//       context: catalogContextSchema,
//       filters: catalogFiltersSchema,
//       pagination: z
//         .object({ limit: z.number().int().positive().optional() })
//         .optional(),
//     }),
//     execute: async (args) =>
//       callRest(endpoint, "POST", "/catalog/search", agentProfileUrl, args),
//   }),

//   get_product: tool({
//     description: "Get full product details by global ID via REST.",
//     inputSchema: z.object({
//       id: z.string().describe("Product global ID"),
//     }),
//     execute: async ({ id }) =>
//       callRest(endpoint, "POST", "/catalog/product", agentProfileUrl, { id }),
//   }),

//   create_cart: tool({
//     description: "Create a new cart via REST.",
//     inputSchema: z.object({
//       line_items: z.array(lineItemSchema),
//       context: z.object({ country: z.string().optional() }).optional(),
//     }),
//     execute: async (args) =>
//       callRest(endpoint, "POST", "/carts", agentProfileUrl, args),
//   }),

//   update_cart: tool({
//     description: "Replace all cart line items via REST (full replacement).",
//     inputSchema: z.object({
//       id: z.string().describe("Cart ID"),
//       line_items: z.array(lineItemSchema),
//     }),
//     execute: async ({ id, line_items }) =>
//       callRest(endpoint, "PUT", `/carts/${id}`, agentProfileUrl, {
//         line_items,
//       }),
//   }),

//   get_cart: tool({
//     description: "Get current cart state via REST.",
//     inputSchema: z.object({
//       id: z.string().describe("Cart ID"),
//     }),
//     execute: async ({ id }) =>
//       callRest(endpoint, "GET", `/carts/${id}`, agentProfileUrl),
//   }),
// });

export type RunPlaygroundInput = {
  storeUrl: string;
  query?: string;
  agentProfileUrl?: string;
};

export const runPlayground = async ({
  storeUrl,
  query,
  agentProfileUrl = AGENT_PROFILE,
}: RunPlaygroundInput) => {
  const streamable = createStreamableValue<PlaygroundEvent>();

  const emit = (event: PlaygroundEvent) => streamable.update(event);

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
      } = discoveryProfileSchema.safeParse(businessProfileResult.data);

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

      // const mcpClient = await createMCPClient({
      //   transport: {
      //     type: "http",
      //     url: endpoint,
      //     headers: {
      //       "Content-Type": "application/json",
      //       Accept: "application/json",
      //       "User-Agent": "UCP-Playground/1.0 (écentic; https://ecentic.ai)",
      //     },

      //     // optional: provide an OAuth client provider for automatic authorization
      //     // authProvider: myOAuthClientProvider,

      //     // optional: reject redirect responses to prevent SSRF
      //     // redirect: "error",

      //     fetch: createUcpMcpFetch(agentProfileUrl),
      //   },
      // });

      // const toolNames = await mcpClient.tools();
      // console.log("toolNames", toolNames);

      emit({
        kind: "profile",
        transport: shoppingTransport,
        endpoint: shoppingEndpoint,
        profileUrl: businessProfileUrl,
        agentProfileUrl,
      });

      // 3. Build tools for the detected transport
      // const tools =
      //   transport === "mcp"
      //     ? buildMcpTools(endpoint, AGENT_PROFILE)
      //     : buildRestTools(endpoint, AGENT_PROFILE);

      // TODO: Add REST tools
      const tools = buildMcpTools(shoppingEndpoint, AGENT_PROFILE);

      const searchQuery = query?.trim() || "product";

      // 4. Run the agentic flow
      const agentResult = streamText({
        model: PLAYGROUND_MODEL,
        system: `You are a UCP (Universal Commerce Protocol) shopping agent running a live integration test against a ${shoppingTransport.toUpperCase()} endpoint.

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
        { id: "<cart id from create_cart>", line_items: [<line items from get_cart with quantity set to 2>] }
        Full replacement. Keep line_items[].id from get_cart — only change quantity or items as needed.
      cancel_cart:
        { id: "<cart id from create_cart>" }

      Work through this flow in order:
      1. search_catalog with query "${searchQuery}"
      2. lookup_catalog with the product ID (or variant ID) of the first search result
      3. get_product with the ID of the first result
      4. create_cart with one line item using product.variants[0].id from get_product
      5. get_cart — pass the id from create_cart
      6. update_cart — pass the same cart id and line_items from get_cart with quantity 2
      7. cancel_cart — pass the same cart id

      Use ONLY IDs returned by the tools — never invent them. If a tool returns { error: "..." } or ucp.status is error, report the failure and stop — do not retry with made-up values. After all steps, write 2–3 sentences summarizing what you found.
      DON'T CALL the same tool again if the first one hasn't finished yet.
      `,
        prompt: `Test the UCP ${shoppingTransport} endpoint at ${shoppingEndpoint} (store: ${domain}).`,
        tools,
        stopWhen: isLoopFinished(),
        providerOptions: gatewayOptions(),
      });

      for await (const event of agentResult.fullStream) {
        switch (event.type) {
          case "text-delta":
            emit({ kind: "text", text: event.text });
            break;
          case "tool-call":
            emit({
              kind: "tool_call",
              id: event.toolCallId,
              tool: event.toolName,
              args: "input" in event ? event.input : undefined,
            });
            break;
          case "tool-result":
            emit({
              kind: "tool_result",
              id: event.toolCallId,
              tool: event.toolName,
              result: "output" in event ? event.output : undefined,
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
