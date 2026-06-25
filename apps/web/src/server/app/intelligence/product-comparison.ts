"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
// import { UcpDiscoveryProfileSchema } from "@ucp-js/sdk";
import { resultify } from "@zenncore/utils";
import { isLoopFinished, streamText, tool } from "ai";
import * as z from "zod";
import {
  businessProfileSchema,
  searchCatalogRequestSchema,
  searchCatalogResponseSchema,
} from "./ucp-advanced-validator";

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
        params: {
          name: toolName,
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

const _lineItemSchema = z.object({
  variant_id: z.string().describe("Product variant global ID"),
  quantity: z.number().int().positive(),
});

// UCP §4 — catalog search context
const _catalogContextSchema = z
  .object({
    address_country: z.string().optional(),
    address_region: z.string().optional(),
    intent: z.string().optional(),
  })
  .optional();

// UCP §4 — catalog filters
const _catalogFiltersSchema = z
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
const buildMcpTools = (endpoints: string[], agentProfileUrl: string) => ({
  search_catalogs: tool({
    description:
      "Search the stores product catalog. Returns matching products with IDs, titles, prices, and variant IDs. Pass query, context (currency, intent), and filters (price, categories) as top-level fields derived from the buyer request.",
    inputSchema: searchCatalogRequestSchema,
    outputSchema: z.array(
      z.object({
        endpoint: z.string(),
        result: z.looseObject({
          structuredContent: searchCatalogResponseSchema,
        }),
      }),
    ),
    execute: async (request) => {
      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          const searchCatalogResult = await callMcp(
            endpoint,
            "search_catalog",
            { catalog: request },
            agentProfileUrl,
          );

          return {
            endpoint,
            result: searchCatalogResult,
          };
        }),
      );

      return results;
    },
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
  // get_product: tool({
  //   description:
  //     "Get full product details (variants, pricing, images) for a product by its global ID.",
  //   inputSchema: z.object({
  //     catalog: z.object({
  //       id: z.string().describe("Product global ID from search results"),
  //       selected: z
  //         .array(z.object({ name: z.string(), label: z.string() }))
  //         .optional(),
  //       preferences: z.array(z.string()).optional(),
  //       context: catalogContextSchema,
  //       filters: catalogFiltersSchema,
  //     }),
  //   }),
  //   execute: async ({ catalog }) =>
  //     callMcp(endpoint, "get_product", { catalog }, agentProfileUrl),
  // }),

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
  // update_cart: tool({
  //   description:
  //     "Replace all line items in a cart (full replacement per UCP spec). id at top level, items under 'cart'.",
  //   inputSchema: z.object({
  //     id: z.string().describe("Cart ID"),
  //     cart: z.object({
  //       line_items: z
  //         .array(lineItemSchema)
  //         .describe("Complete new list (replaces all existing)"),
  //     }),
  //   }),
  //   execute: async ({ id, cart }) =>
  //     callMcp(endpoint, "update_cart", { id, cart }, agentProfileUrl),
  // }),

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

export type StoreDiscovery = {
  domain: string;
  profileUrl: string;
  transport: PlaygroundTransport;
  endpoint: string;
};

export type ComparisonEvent =
  | { kind: "search_params"; params: unknown }
  | { kind: "store_profile"; storeUrl: string; discovery: StoreDiscovery }
  | { kind: "store_searching"; storeUrl: string }
  | { kind: "store_result"; storeUrl: string; result: unknown }
  | { kind: "store_error"; storeUrl: string; message: string }
  | { kind: "text"; text: string }
  | { kind: "done" }
  | { kind: "error"; message: string };

export type RunStoreComparisonInput = {
  sourceStoreUrl: string;
  competitorStoreUrls: string[];
  query?: string;
  agentProfileUrl?: string;
};

const normalizeStoreUrl = (storeUrl: string) => storeUrl.replace(/\/+$/, "");

const discoverStore = async (
  storeUrl: string,
): Promise<
  { success: true; data: StoreDiscovery } | { success: false; error: string }
> => {
  const domain = normalizeStoreUrl(storeUrl);
  const profileUrl = `${domain}/.well-known/ucp`;

  const businessProfileResponse = await resultify(() =>
    fetch(profileUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    }),
  );

  if (!businessProfileResponse.success) {
    return {
      success: false,
      error: `Could not reach UCP profile at ${profileUrl}`,
    };
  }

  const businessProfileText = await resultify(() =>
    businessProfileResponse.data.text(),
  );

  if (!businessProfileText.success) {
    return {
      success: false,
      error: "Could not read business profile response body",
    };
  }

  const parsed = businessProfileSchema.safeParse(
    JSON.parse(businessProfileText.data),
  );

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
    };
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
  const transport = mcpShoppingService ? "mcp" : "rest";

  if (!endpoint || !transport) {
    return {
      success: false,
      error:
        "No dev.ucp.shopping service found — store does not advertise MCP or REST shopping endpoints",
    };
  }

  return {
    success: true,
    data: { domain, profileUrl, transport, endpoint },
  };
};

export const unwrapMcpCatalogResult = async (
  result: unknown,
): Promise<unknown> => {
  if (!result || typeof result !== "object") return result;

  const record = result as Record<string, unknown>;
  if ("error" in record) return record;

  const content = record["content"];
  if (!Array.isArray(content)) return result;

  for (const part of content) {
    if (
      part &&
      typeof part === "object" &&
      "text" in part &&
      typeof (part as { text: unknown }).text === "string"
    ) {
      const text = (part as { text: string }).text;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }

  return result;
};

export const runStoreComparison = async ({
  sourceStoreUrl,
  competitorStoreUrls,
  query,
  agentProfileUrl = AGENT_PROFILE,
}: RunStoreComparisonInput) => {
  const streamable = createStreamableValue<ComparisonEvent>();
  const emit = (event: ComparisonEvent) => streamable.update(event);

  (async () => {
    try {
      const source = normalizeStoreUrl(sourceStoreUrl.trim());
      const competitors = [
        ...new Set(
          competitorStoreUrls
            .map((url) => normalizeStoreUrl(url.trim()))
            .filter(Boolean),
        ),
      ].filter((url) => url !== source);

      if (!source) {
        emit({
          kind: "error",
          message: "Add your store URL to compare.",
        });
        streamable.done();
        return;
      }

      if (competitors.length < 1) {
        emit({
          kind: "error",
          message: "Add at least one competitor store URL to compare against.",
        });
        streamable.done();
        return;
      }

      const domains = [source, ...competitors];

      const buyerRequest = query?.trim() || "product";

      const storeOutcomes = await Promise.all(
        domains.map(async (storeUrl) => {
          const discoveryResult = await discoverStore(storeUrl);

          if (!discoveryResult.success) {
            emit({
              kind: "store_error",
              storeUrl,
              message: discoveryResult.error,
            });
            return {
              storeUrl,
              discovery: null,
              error: discoveryResult.error,
            };
          }

          const { data: discovery } = discoveryResult;
          emit({ kind: "store_profile", storeUrl, discovery });

          if (discovery.transport !== "mcp") {
            const message =
              "Store comparison currently supports MCP transport only.";
            emit({ kind: "store_error", storeUrl, message });
            return { storeUrl, discovery, error: message };
          }

          return { storeUrl, discovery, error: null };
        }),
      );

      const mcpStores = storeOutcomes.filter(
        (
          storeOutcome,
        ): storeOutcome is {
          storeUrl: string;
          discovery: StoreDiscovery;
          error: null;
        } => storeOutcome.discovery !== null && storeOutcome.error === null,
      );

      const sourceStore = mcpStores.find(
        (storeOutcome) => storeOutcome.storeUrl === source,
      );
      const competitorStores = mcpStores.filter(
        (storeOutcome) => storeOutcome.storeUrl !== source,
      );

      if (!sourceStore || competitorStores.length < 1) {
        emit({
          kind: "error",
          message:
            "Your store and at least one competitor must expose MCP shopping endpoints. Check store URLs and UCP profiles.",
        });
        streamable.done();
        return;
      }

      const endpoints = mcpStores.map(({ discovery }) => discovery.endpoint);
      const storeCatalog = mcpStores.map(({ storeUrl, discovery }) => ({
        domain: discovery.domain,
        endpoint: discovery.endpoint,
        storeUrl,
        role:
          storeUrl === source ? ("source" as const) : ("competitor" as const),
      }));

      const tools = buildMcpTools(endpoints, agentProfileUrl);

      const agentResult = streamText({
        model: "google/gemini-3-flash",
        system: `You are an AI shopping agent evaluator. Simulate how autonomous shopping agents (GPT-4, Claude, Gemini, Perplexity, and similar) decide where to buy when a buyer asks for something — then explain whether the source merchant would win or lose against competitors as a group.

This is not a store-by-store ranking. Frame everything as **my store vs competitors**: one side (the source store) against the combined competitor set. Do not rank competitors against each other or assign first/second/third place to individual stores.

AI shopping agents ignore branding and ads. They evaluate structured catalog signals in milliseconds. When writing your summary, explicitly walk through every factor an agent weighs and how each factor applies to the source store vs competitors:

- **Query relevance** — how well returned products match the buyer's intent and keywords
- **Title clarity** — whether titles are specific, searchable, and unambiguous
- **Description quality** — completeness, spec detail, and whether an agent can extract key attributes
- **Structured attributes** — variants, options, SKUs, categories, and any metadata an agent can parse
- **Price fit** — whether listed prices fall within the buyer's budget and represent good value
- **Price transparency** — clear pricing, compare-at or sale signals, no missing or ambiguous amounts
- **Variant availability** — whether the right size/color/model exists and is selectable
- **Selection breadth** — enough matching products vs competitors offering more or better fits
- **Catalog confidence** — whether data is complete enough for an agent to recommend without guessing
- **Recommendation defensibility** — which side gives an agent stronger, clearer reasons to tell the buyer "buy here"

## Flow — follow in order

1. Parse the buyer request into search_catalogs tool parameters.
2. Call search_catalogs exactly once with those parameters. It queries every store endpoint in parallel.
3. Write 4–6 short paragraphs as a **my store vs competitors** verdict:
   - State clearly whether an AI shopping agent would buy from the source store or from a competitor for this query, and why
   - Go through each evaluation factor above: what the source store shows, what competitors show collectively, and which side wins on that factor
   - Summarize the decisive signals — the factors that most likely tip the agent's purchase decision
   - If the source store loses, list concrete listing and catalog improvements to flip the outcome

## Parse buyer request into search_catalogs parameters

- query — product keywords only (e.g. "wireless mouse"). Strip price, currency, and constraint phrases.
- context.currency — ISO 4217 when mentioned (e.g. "200lek(ALL)" → "ALL", "$50" → "USD"). Required when filters.price is set.
- context.intent — the full buyer request as background context.
- filters.price.min / filters.price.max — bounds in ISO 4217 minor units (200 ALL → 20000; $50 USD → 5000).
- filters.categories — when the buyer names a category.

Only include fields inferable from the request. Do not invent categories or IDs.

## search_catalogs argument shape

Pass a flat object (top-level fields, not nested under "catalog"):

{
  "query": "<product keywords>",
  "context": { "currency": "<ISO 4217>", "intent": "<optional full request>" },
  "filters": { "price": { "max": <minor units> } }
}

Example for "wireless mouse under price 200lek(ALL)":
{
  "query": "wireless mouse",
  "context": { "currency": "ALL", "intent": "wireless mouse under price 200lek(ALL)" },
  "filters": { "price": { "max": 20000 } }
}

Source store (the merchant being evaluated):
${storeCatalog
  .filter((store) => store.role === "source")
  .map((store) => `${store.domain} (${store.storeUrl})`)
  .join("\n")}

Competitor stores:
${storeCatalog
  .filter((store) => store.role === "competitor")
  .map((store) => `${store.domain} (${store.storeUrl})`)
  .join("\n")}

Write for a merchant asking: "Would an AI shopping agent buy from my store or from a competitor for this query?" Reference store domains, not internal IDs. Never rank individual competitors against each other — only my store vs competitors.`,
        prompt: `Buyer request: "${buyerRequest}"

Call search_catalogs with parameters derived from this request, then evaluate my store vs competitors: list every factor an AI shopping agent would weigh, say which side wins on each, and give a clear verdict on where the agent would buy and why.`,
        tools,
        stopWhen: isLoopFinished(),
        providerOptions: gatewayOptions(),
      });

      for await (const event of agentResult.fullStream) {
        switch (event.type) {
          case "tool-call": {
            if (event.toolName !== "search_catalogs") break;

            const args = "input" in event ? event.input : undefined;
            emit({ kind: "search_params", params: args });
            for (const { storeUrl } of mcpStores) {
              emit({ kind: "store_searching", storeUrl });
            }
            break;
          }
          case "tool-result": {
            if (event.toolName !== "search_catalogs") break;

            const output = "output" in event ? event.output : undefined;
            if (!Array.isArray(output)) break;

            for (const entry of output) {
              if (!entry || typeof entry !== "object") continue;
              const record = entry as {
                endpoint?: string;
                result?: {
                  structuredContent: z.infer<
                    typeof searchCatalogResponseSchema
                  >;
                };
              };
              if (!record.endpoint) continue;

              const endpointToStoreUrl = new Map(
                mcpStores.map(({ storeUrl, discovery }) => [
                  discovery.endpoint,
                  storeUrl,
                ]),
              );

              const storeUrl =
                endpointToStoreUrl.get(record.endpoint) ?? record.endpoint;
              emit({
                kind: "store_result",
                storeUrl,
                result: record.result?.structuredContent.products ?? null,
              });
            }
            break;
          }
          case "text-delta":
            emit({ kind: "text", text: event.text });
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
