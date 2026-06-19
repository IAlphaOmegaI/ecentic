"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
import { resultify } from "@zenncore/utils";
import { isLoopFinished, streamText, tool } from "ai";
import * as z from "zod";
import type { StoreDiscovery } from "./product-comparison";
import {
  businessProfileSchema,
  searchCatalogRequestSchema,
  searchCatalogResponseSchema,
} from "./ucp-advanced-validator";

// écentic UCP platform profile
const AGENT_PROFILE = "https://ecentic.ai/ucp/agent-profile";

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

// Accepts bare domains ("x.com") and full URLs ("https://x.com/"), returning a
// canonical "https://x.com". Idempotent, so client-normalized input is unchanged.
const normalizeStoreUrl = (storeUrl: string) => {
  const trimmed = storeUrl.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, "");
};

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

const winnerSelectionSchema = z.object({
  store_domain: z
    .string()
    .describe("Domain of the store the winning product comes from."),
  product_id: z
    .string()
    .describe("Global ID of the single winning product you picked."),
  product_title: z.string().describe("Title of the winning product."),
  price: z
    .string()
    .optional()
    .describe("Price of the winning product, formatted as shown in catalog."),
  reason: z
    .string()
    .describe(
      "One or two sentences on why this product won over every other option.",
    ),
  runner_up: z
    .string()
    .optional()
    .describe(
      "The closest competing product/store and the decisive reason it lost.",
    ),
});

export type WinnerSelection = z.infer<typeof winnerSelectionSchema>;

// UCP MCP transport §3A — search_catalog: payload nested under "catalog" key.
// In free-for-all, every store is queried as an equal candidate and the result
// of each store is tagged with its domain so the agent can attribute its pick.
const buildFreeForAllTools = (
  stores: { domain: string; endpoint: string }[],
  agentProfileUrl: string,
) => ({
  search_catalogs: tool({
    description:
      "Search every store's product catalog in parallel. Returns each store's matching products tagged with the store domain. Pass query, context (currency, intent), and filters (price, categories) as top-level fields derived from the buyer request.",
    inputSchema: searchCatalogRequestSchema,
    outputSchema: z.array(
      z.object({
        store: z.string(),
        endpoint: z.string(),
        result: z.looseObject({
          structuredContent: searchCatalogResponseSchema,
        }),
      }),
    ),
    execute: async (request) => {
      const results = await Promise.all(
        stores.map(async ({ domain, endpoint }) => {
          const searchCatalogResult = await callMcp(
            endpoint,
            "search_catalog",
            { catalog: request },
            agentProfileUrl,
          );

          return {
            store: domain,
            endpoint,
            result: searchCatalogResult,
          };
        }),
      );

      return results;
    },
  }),

  select_winner: tool({
    description:
      "Record your final, single decision after evaluating and negotiating across all stores. Call this exactly once with the one product you would actually buy and why it beats every other option.",
    inputSchema: winnerSelectionSchema,
    execute: async (selection) => ({ acknowledged: true, ...selection }),
  }),
});

export type FreeForAllEvent =
  | { kind: "search_params"; params: unknown }
  | { kind: "store_profile"; storeUrl: string; discovery: StoreDiscovery }
  | { kind: "store_searching"; storeUrl: string }
  | { kind: "store_result"; storeUrl: string; result: unknown }
  | { kind: "store_error"; storeUrl: string; message: string }
  | { kind: "winner"; winner: WinnerSelection }
  | { kind: "text"; text: string }
  | { kind: "done" }
  | { kind: "error"; message: string };

export type RunFreeForAllInput = {
  storeUrls: string[];
  query?: string;
  agentProfileUrl?: string;
};

export const runFreeForAll = async ({
  storeUrls,
  query,
  agentProfileUrl = AGENT_PROFILE,
}: RunFreeForAllInput) => {
  const streamable = createStreamableValue<FreeForAllEvent>();
  const emit = (event: FreeForAllEvent) => streamable.update(event);

  (async () => {
    try {
      const domains = [
        ...new Set(
          storeUrls
            .map((url) => normalizeStoreUrl(url.trim()))
            .filter(Boolean),
        ),
      ];

      if (domains.length < 2) {
        emit({
          kind: "error",
          message: "Add at least two stores to run a free-for-all.",
        });
        streamable.done();
        return;
      }

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
            return { storeUrl, discovery: null, error: discoveryResult.error };
          }

          const { data: discovery } = discoveryResult;
          emit({ kind: "store_profile", storeUrl, discovery });

          if (discovery.transport !== "mcp") {
            const message =
              "Free-for-all currently supports MCP transport only.";
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

      if (mcpStores.length < 2) {
        emit({
          kind: "error",
          message:
            "At least two stores must expose MCP shopping endpoints. Check store URLs and UCP profiles.",
        });
        streamable.done();
        return;
      }

      const storeCatalog = mcpStores.map(({ discovery }) => ({
        domain: discovery.domain,
        endpoint: discovery.endpoint,
      }));

      const endpointToStoreUrl = new Map(
        mcpStores.map(({ storeUrl, discovery }) => [
          discovery.endpoint,
          storeUrl,
        ]),
      );

      const tools = buildFreeForAllTools(storeCatalog, agentProfileUrl);

      const agentResult = streamText({
        model: "google/gemini-3-flash",
        system: `You are an autonomous AI shopping agent running a "free-for-all" buy decision. Every store below is an equal candidate — there is no home store and no competitors. Your job is to evaluate all of them on a level playing field, negotiate the trade-offs, and pick exactly ONE product to buy.

AI shopping agents ignore branding and ads. They evaluate structured catalog signals in milliseconds. Weigh every factor across all stores at once:

- **Query relevance** — how well a product matches the buyer's intent and keywords
- **Title clarity** — specific, searchable, unambiguous titles
- **Description quality** — completeness and spec detail an agent can extract
- **Structured attributes** — variants, options, SKUs, categories, metadata
- **Price fit** — fits the buyer's budget and represents the best value
- **Price transparency** — clear pricing, sale/compare-at signals, no ambiguity
- **Variant availability** — the right size/color/model exists and is buyable
- **Catalog confidence** — data complete enough to recommend without guessing
- **Defensibility** — which single product gives the strongest, clearest reason to tell the buyer "buy this one"

## Flow — follow in order

1. Parse the buyer request into search_catalogs tool parameters.
2. Call search_catalogs exactly once. It queries every store's catalog in parallel and tags each result with its store domain.
3. Compare every returned product across every store as one combined pool. Negotiate the trade-offs (price vs. relevance vs. data quality vs. availability).
4. Call select_winner exactly once with the single product you would buy. Reference the store domain and product id from the search results — never invent ids.
5. Write 3–5 short paragraphs explaining your decision:
   - State the winning product and store, and the decisive reasons it beat the field
   - Walk through how the strongest runner-up products from other stores compared and why each fell short
   - Note any close calls or trade-offs you had to negotiate
   - Be concrete: cite titles, prices, and data-quality differences, not generic praise

## Parse buyer request into search_catalogs parameters

- query — product keywords only (e.g. "wireless mouse"). Strip price, currency, and constraint phrases.
- context.currency — ISO 4217 when mentioned ("200lek(ALL)" → "ALL", "$50" → "USD"). Required when filters.price is set.
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

Stores in this free-for-all:
${storeCatalog.map((store) => `${store.domain}`).join("\n")}

Reference store domains, not internal endpoints. Pick exactly one winning product — never rank a podium, never hedge across multiple winners.`,
        prompt: `Buyer request: "${buyerRequest}"

Call search_catalogs with parameters derived from this request. Then evaluate and negotiate across every store's products, call select_winner with the single product you would buy, and explain why it won over the rest of the field.`,
        tools,
        stopWhen: isLoopFinished(),
        providerOptions: gatewayOptions(),
      });

      for await (const event of agentResult.fullStream) {
        switch (event.type) {
          case "tool-call": {
            switch (event.toolName) {
              case "search_catalogs": {
                const args = "input" in event ? event.input : undefined;
                emit({ kind: "search_params", params: args });
                for (const { storeUrl } of mcpStores) {
                  emit({ kind: "store_searching", storeUrl });
                }
                break;
              }
              case "select_winner": {
                const input = "input" in event ? event.input : undefined;
                const parsed = winnerSelectionSchema.safeParse(input);
                if (parsed.success) {
                  emit({ kind: "winner", winner: parsed.data });
                }
                break;
              }
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
