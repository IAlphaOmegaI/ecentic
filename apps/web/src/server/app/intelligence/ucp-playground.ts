"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
// import { UcpDiscoveryProfileSchema } from "@ucp-js/sdk";
import { resultify } from "@zenncore/utils";
import { stepCountIs, streamText, tool } from "ai";
import * as z from "zod";
import { discoveryProfileSchema } from "./ucp-advanced-validator";

// écentic UCP platform profile
const AGENT_PROFILE = "https://ecentic.ai/ucp/agent-profile";

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

const callMcp = async (
  endpoint: string,
  toolName: string,
  args: Record<string, unknown>,
  agentProfileUrl: string,
): Promise<unknown> => {
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
        id: Math.floor(Math.random() * 100_000),
        method: "tools/call",
        params: {
          name: toolName,
          // UCP spec §3B: meta must be injected in every MCP tool invocation
          arguments: {
            meta: {
              "ucp-agent": { profile: agentProfileUrl },
            },
            ...args,
          },
        },
      }),
      signal: AbortSignal.timeout(12_000),
    }),
  );

  if (!response.success) return { error: "Network request failed" };

  const textResult = await resultify(() => response.data.text());
  if (!textResult.success) return { error: "Could not read response body" };

  try {
    const body = JSON.parse(textResult.data) as {
      result?: unknown;
      error?: { code?: number; message?: string; data?: unknown };
    };
    if (body.error) {
      console.log("body.error", body.error);
      return {
        error: body.error.message ?? "MCP error",
        code: body.error.code ?? null,
        data: body.error.data ?? null,
      };
    }

    return body.result ?? null;
  } catch {
    return { error: "Response is not valid JSON", raw: textResult.data };
  }
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

// UCP §4 — line items use variant_id + quantity
// item	Item	Yes
// quantity	integer	Yes	Quantity of the item being purchased.
// totals	Array[Total]	Yes	Line item totals breakdown.
// parent_id	string	No	Parent line item identifier for any nested structures.

const lineItemSchema = z.object({
  variant_id: z.string().describe("Product variant global ID"),
  quantity: z.number().int().positive(),
});

// UCP §4 — catalog search context
const catalogContextSchema = z
  .object({
    address_country: z.string().optional(),
    address_region: z.string().optional(),
    intent: z.string().optional(),
  })
  .optional();

// UCP §4 — catalog filters
const catalogFiltersSchema = z
  .object({
    categories: z.array(z.string()).optional(),
    price: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .optional(),
  })
  .optional();

// UCP MCP transport §3A — search_catalog: payload nested under "catalog" key
// Example per spec:
//   arguments: { meta: {...}, catalog: { query, context, filters, pagination } }
const buildMcpTools = (endpoint: string, agentProfileUrl: string) => ({
  search_catalog: tool({
    description:
      "Search the store product catalog. Returns matching products with IDs, titles, prices, and variant IDs. Arguments go under the 'catalog' key per UCP spec (only define them if the user asks something that could be done by using the catalog properties).",
    inputSchema: z.object({
      catalog: z.object({
        query: z.string().optional().describe("Free-text search query."),
        context: catalogContextSchema
          .optional()
          .describe(
            "Provisional buyer signals for relevance and localization—not authoritative data. Businesses SHOULD use these values when verified inputs (e.g., shipping address) are absent, and MAY ignore or down-rank them if inconsistent with higher-confidence signals (authenticated account, risk detection) or regulatory constraints (export controls). Eligibility and policy enforcement MUST occur at checkout time using binding transaction data. Context SHOULD be non-identifying and can be disclosed progressively—coarse signals early, finer resolution as the session progresses. Higher-resolution data (shipping address, billing address) supersedes context.",
          ),
        filters: catalogFiltersSchema.optional(),
        pagination: z
          .object({ limit: z.number().int().positive().optional() })
          .optional(),
      }),
    }),
    execute: async ({ catalog }) =>
      callMcp(endpoint, "search_catalog", { catalog }, agentProfileUrl),
  }),

  // // UCP MCP binding — lookup identifiers under "catalog" key
  // lookup_catalog: tool({
  //   description:
  //     "Lookup products or variants by identifiers. Use this when you already have IDs.",
  //   inputSchema: z.object({
  //     catalog: z.object({
  //       ids: z
  //         .array(z.string())
  //         .describe("Product/variant identifiers to resolve"),
  //       context: catalogContextSchema,
  //       filters: catalogFiltersSchema,
  //     }),
  //   }),
  //   execute: async ({ catalog }) =>
  //     callMcp(endpoint, "lookup_catalog", { catalog }, agentProfileUrl),
  // }),

  // UCP MCP binding — get_product input nested under "catalog"
  get_product: tool({
    description:
      "Get full product details (variants, pricing, images) for a product by its global ID.",
    inputSchema: z.object({
      catalog: z.object({
        id: z.string().describe("Product global ID from search results"),
        selected: z
          .array(z.object({ name: z.string(), label: z.string() }))
          .optional(),
        preferences: z.array(z.string()).optional(),
        context: catalogContextSchema,
        filters: catalogFiltersSchema,
      }),
    }),
    execute: async ({ catalog }) => {
      const result = await callMcp(
        endpoint,
        "get_product",
        { catalog },
        agentProfileUrl,
      );

      console.log("result", result.structuredContent.product);

      return result;
    },
  }),

  // // UCP §5 — cart creation: payload nested under "cart" key
  // create_cart: tool({
  //   description:
  //     "Create a new cart. Items and context go under the 'cart' key.",
  //   inputSchema: z.object({
  //     cart: z.object({
  //       line_items: z.array(lineItemSchema),
  //       context: z.object({ country: z.string().optional() }).optional(),
  //     }),
  //   }),
  //   execute: async ({ cart }) =>
  //     callMcp(endpoint, "create_cart", { cart }, agentProfileUrl),
  // }),

  // UCP §5 — cart update: id at top level, replacement payload under "cart" key
  update_cart: tool({
    description:
      "Replace all line items in a cart (full replacement per UCP spec). id at top level, items under 'cart'.",
    inputSchema: z.object({
      id: z.string().describe("Cart ID"),
      cart: z.object({
        line_items: z
          .array(lineItemSchema)
          .describe("Complete new list (replaces all existing)"),
      }),
    }),
    execute: async ({ id, cart }) =>
      callMcp(endpoint, "update_cart", { id, cart }, agentProfileUrl),
  }),

  // // UCP §5 — cart lookup: id at top level
  // get_cart: tool({
  //   description:
  //     "Get current cart state (line items, totals). Use this to confirm cart contents after create/update.",
  //   inputSchema: z.object({
  //     id: z.string().describe("Cart ID returned by create_cart"),
  //   }),
  //   execute: async ({ id }) =>
  //     callMcp(endpoint, "get_cart", { id }, agentProfileUrl),
  // }),
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
      const profileUrl = `${domain}/.well-known/ucp`;

      const businessProfileResponse = await resultify(() =>
        fetch(profileUrl, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8_000),
        }),
      );

      if (!businessProfileResponse.success) {
        emit({
          kind: "error",
          message: `Could not reach Business UCP profile at ${profileUrl}. Make sure the store serves a valid /.well-known/ucp endpoint.`,
        });
        streamable.done();
        return;
      }

      const businessProfileText = await resultify(() =>
        businessProfileResponse.data.text(),
      );

      if (!businessProfileText.success) {
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
      } = discoveryProfileSchema.safeParse(
        JSON.parse(businessProfileText.data),
      );

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
        profileUrl,
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
        model: "google/gemini-3-flash",
        system: `You are a UCP (Universal Commerce Protocol) shopping agent running a live integration test against a ${shoppingTransport.toUpperCase()} endpoint.

      CRITICAL ARGUMENT SHAPES — follow these exactly, do not add or remove top-level keys:

      search_catalog:
        { catalog: { query: "...", pagination: { limit: 5 }, filters: {}, context: {} } } (only define them if the user asks something that could be done by using the catalog properties even tho they might have been defined in the schema).
      get_product:
        { catalog: { id: "<product_id>" } }
      update_cart:
        { id: "<cart_id>", cart: { line_items: [{ variant_id: "...", item: { id: "<variant_id>", title: "...", price: { amount, currency } }, quantity: 1 }] } }

      Work through this flow in order:
      1. search_catalog with query "${searchQuery}"
      2. get_product with the ID of the first result

      Use ONLY IDs returned by the tools — never invent them. After all steps, write 2–3 sentences summarizing what you found.
      DON'T CALL the same tool again if the first one hasn't finished yet.
      `,
        prompt: `Test the UCP ${shoppingTransport} endpoint at ${shoppingEndpoint} (store: ${domain}).`,
        tools,
        stopWhen: stepCountIs(12),
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
