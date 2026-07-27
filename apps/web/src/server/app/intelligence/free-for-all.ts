"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
import { resultify } from "@zenncore/utils";
import { isLoopFinished, tool } from "ai";
import * as z from "zod";
import * as AI from "../../utils/ai";
import type { StoreDiscovery } from "./product-comparison";
import {
  businessProfileSchema,
  getProductResponseSchema,
  searchCatalogRequestSchema,
  searchCatalogResponseSchema,
} from "./ucp/advanced-validator";

// ecentic UCP platform profile
const AGENT_PROFILE = "https://ecentic.ai/ucp/agent-profile";

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
        "User-Agent": "UCP-Playground/1.0 (ecentic; https://ecentic.ai)",
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

const rankedProductSchema = z.object({
  rank: z
    .number()
    .int()
    .positive()
    .describe(
      "Position in the ranking. 1 is the product you would buy. Strictly increasing, no gaps, no ties.",
    ),
  store_domain: z
    .string()
    .describe("Domain of the store this product comes from."),
  product_id: z.string().describe("Global ID of this product."),
  product_title: z.string().describe("Title of this product."),
  price: z
    .string()
    .optional()
    .describe("Price of this product, formatted as shown in catalog."),
  reason: z
    .string()
    .describe(
      "Why this product sits at this rank — what makes it stronger than the ones below and weaker than the ones above.",
    ),
  data_signal: z
    .string()
    .optional()
    .describe(
      "Fill this ONLY when catalog data completeness genuinely affected this product's rank — never invent it. Name the specific fields: e.g. it specified a field the others left out, had a more detailed or structured property/attribute, declared more variants/options/SKUs, or (conversely) had thinner data that hurt it. Leave empty when data completeness was not a factor in this product's placement.",
    ),
});

const productRankingSchema = z.object({
  rankings: z
    .array(rankedProductSchema)
    .min(1)
    .describe(
      "Every product worth considering, ordered best-first across all stores. Ranks start at 1 with no gaps or ties.",
    ),
});

export type RankedProduct = z.infer<typeof rankedProductSchema>;
export type ProductRanking = z.infer<typeof productRankingSchema>;

// UCP MCP transport §3A — search_catalog: payload nested under "catalog" key.
// In free-for-all, every store is queried as an equal candidate and the result
// of each store is tagged with its domain so the agent can attribute its pick.
const buildFreeForAllTools = (
  stores: { domain: string; endpoint: string }[],
  agentProfileUrl: string,
) => {
  const domainToEndpoint = new Map(
    stores.map(({ domain, endpoint }) => [domain, endpoint]),
  );

  return {
    search_catalogs: tool({
      description:
        "Search every store's product catalog in parallel. Returns each store's matching products tagged with the store domain. Pass query, context (currency, intent), and filters (price, categories) as top-level fields derived from the buyer request.",
      inputSchema: searchCatalogRequestSchema,
      outputSchema: z.array(
        z.looseObject({
          store: z.string(),
          endpoint: z.string(),
          ok: z.boolean().describe("Whether this store returned a catalog."),
          error: z
            .string()
            .optional()
            .describe("Why this store failed, when ok is false."),
          result: z
            .looseObject({ structuredContent: searchCatalogResponseSchema })
            .optional(),
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

            const hasStructuredContent =
              !!searchCatalogResult &&
              typeof searchCatalogResult === "object" &&
              "structuredContent" in searchCatalogResult;

            if (!hasStructuredContent) {
              const error =
                searchCatalogResult &&
                typeof searchCatalogResult === "object" &&
                "error" in searchCatalogResult
                  ? String((searchCatalogResult as { error?: unknown }).error)
                  : "Store returned no catalog data";

              return { store: domain, endpoint, ok: false as const, error };
            }

            return {
              store: domain,
              endpoint,
              ok: true as const,
              result: searchCatalogResult as {
                structuredContent: z.infer<typeof searchCatalogResponseSchema>;
              },
            };
          }),
        );

        return results;
      },
    }),

    get_product: tool({
      description:
        "Retrieve the authoritative current state of a single product at a specific store: real-time availability, variant-level pricing, and selectable options. Per the UCP spec, get_product is the authoritative source for purchase decisions — use it to verify your genuine top contenders before finalizing the ranking. Pass the store domain and product id exactly as they appeared in search_catalogs results; when the buyer specified a variant (size, color, etc.), pass it as selected to confirm that exact variant is available.",
      inputSchema: z.object({
        store: z
          .string()
          .describe(
            "Store domain the product belongs to, exactly as returned by search_catalogs.",
          ),
        id: z
          .string()
          .describe("Product global ID from search_catalogs results."),
        selected: z
          .array(
            z.object({
              name: z.string().describe("Option name (e.g. 'Size')."),
              label: z
                .string()
                .describe("Selected option label (e.g. 'Large')."),
            }),
          )
          .optional()
          .describe(
            "Option selections to resolve a specific variant and read its real-time availability.",
          ),
        preferences: z
          .array(z.string())
          .optional()
          .describe(
            "Option names in relaxation priority order when no exact variant matches all selections.",
          ),
      }),
      outputSchema: z.looseObject({
        store: z.string(),
        id: z.string(),
        ok: z.boolean(),
        error: z.string().optional(),
        result: z
          .looseObject({ structuredContent: getProductResponseSchema })
          .optional(),
      }),
      execute: async ({ store, id, selected, preferences }) => {
        const endpoint = domainToEndpoint.get(store);

        if (!endpoint) {
          return {
            store,
            id,
            ok: false as const,
            error: `Unknown store "${store}". Use a store domain from search_catalogs results.`,
          };
        }

        const getProductResult = await callMcp(
          endpoint,
          "get_product",
          { catalog: { id, selected, preferences } },
          agentProfileUrl,
        );

        const hasStructuredContent =
          !!getProductResult &&
          typeof getProductResult === "object" &&
          "structuredContent" in getProductResult;

        if (!hasStructuredContent) {
          const error =
            getProductResult &&
            typeof getProductResult === "object" &&
            "error" in getProductResult
              ? String((getProductResult as { error?: unknown }).error)
              : "Store returned no product data";

          return { store, id, ok: false as const, error };
        }

        return {
          store,
          id,
          ok: true as const,
          result: getProductResult as {
            structuredContent: z.infer<typeof getProductResponseSchema>;
          },
        };
      },
    }),

    rank_products: tool({
      description:
        "Record your final ranking after evaluating across all stores. Call this exactly once with every product worth considering, ordered best-first — rank 1 is the product you would actually buy.",
      inputSchema: productRankingSchema,
      execute: async (ranking) => ({ acknowledged: true, ...ranking }),
    }),
  };
};

export type FreeForAllEvent =
  | { kind: "search_params"; params: unknown }
  | { kind: "store_profile"; storeUrl: string; discovery: StoreDiscovery }
  | { kind: "store_searching"; storeUrl: string }
  | { kind: "store_result"; storeUrl: string; result: unknown }
  | { kind: "store_error"; storeUrl: string; message: string }
  | { kind: "product_lookup"; store: string; productId: string }
  | {
      kind: "product_checked";
      store: string;
      productId: string;
      ok: boolean;
      title?: string;
      error?: string;
    }
  | { kind: "ranking"; rankings: RankedProduct[] }
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
          storeUrls.map((url) => normalizeStoreUrl(url.trim())).filter(Boolean),
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

      const agentResult = AI.stream({
        label: "free-for-all",
        model: "claude-sonnet-4-6",
        instructions: `You are an autonomous AI shopping agent running a "free-for-all" buy decision. Every store below is an equal candidate — there is no home store and no competitors. A buyer has asked for something, and your job is to look at what every store actually offers and pick exactly ONE product you would buy.

Decide however you genuinely would. There is no supplied rubric, scorecard, or list of factors to apply — use your own judgement about what matters for this specific request and these specific products.

## Flow — follow in order

1. Parse the buyer request into search_catalogs tool parameters.
2. Call search_catalogs exactly once. It queries every store's catalog in parallel and tags each result with its store domain. Some stores may fail to respond — their entry has "ok": false and an "error". Ignore failed stores entirely and decide only among the stores that returned products.
3. Identify your top contenders from the search results. For each one, call get_product (passing its store domain and product id) to pull the authoritative current state — real-time availability, variant-level pricing, and selectable options etc. Per the UCP spec, get_product is the authoritative source for purchase decisions, so base the top of your ranking on it, not on search results alone. When the buyer specified a variant (size, color, model, etc.), pass it as selected to confirm that exact variant is in stock.
4. Look at everything together — search results plus the authoritative get_product state — and rank the products from best to worst for this buyer.
5. Call rank_products exactly once with every product worth considering, ordered best-first (rank 1 is the product you would buy). Reference the store domain and product id from the search results — never invent ids. Whenever a product's placement was actually influenced by how complete its catalog data was — it specified a field another product omitted, carried a more detailed or structured property/attribute, declared more variants/options, or had thinner data that hurt it — record that in its data_signal. Do not manufacture a data_signal when data completeness genuinely played no part.
6. Write a few short paragraphs explaining, in your own words, how you actually reached this ranking — what you looked at, what the get_product checks confirmed or changed, what separates the top pick from the rest, and where the close calls were. Where your decision turned on one product having richer or more specific catalog data than another (more fields filled in, a more detailed property field), say so plainly and name the field. Describe your real reasoning, not a generic checklist.

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

Reference store domains, not internal endpoints. Produce one ordered ranking across all stores — rank 1 is the product you would actually buy.`,
        prompt: `Buyer request: "${buyerRequest}"

Call search_catalogs with parameters derived from this request. Verify your top contenders with get_product (the authoritative source for purchase decisions), then rank every product worth considering best-first across all stores, call rank_products with that ranking, and explain in your own words how you really decided.`,
        tools,
        stopWhen: isLoopFinished(),
      });

      for await (const event of agentResult.stream) {
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
              case "get_product": {
                const input = "input" in event ? event.input : undefined;
                const record =
                  input && typeof input === "object"
                    ? (input as { store?: string; id?: string })
                    : undefined;
                if (record?.store && record?.id) {
                  emit({
                    kind: "product_lookup",
                    store: record.store,
                    productId: record.id,
                  });
                }
                break;
              }
              case "rank_products": {
                const input = "input" in event ? event.input : undefined;
                const parsed = productRankingSchema.safeParse(input);
                if (parsed.success) {
                  emit({ kind: "ranking", rankings: parsed.data.rankings });
                }
                break;
              }
            }
            break;
          }
          case "tool-result": {
            switch (event.toolName) {
              case "search_catalogs": {
                const output = "output" in event ? event.output : undefined;
                if (!Array.isArray(output)) break;

                for (const entry of output) {
                  if (!entry || typeof entry !== "object") continue;
                  const record = entry as {
                    endpoint?: string;
                    ok?: boolean;
                    error?: string;
                    result?: {
                      structuredContent?: z.infer<
                        typeof searchCatalogResponseSchema
                      >;
                    };
                  };
                  if (!record.endpoint) continue;

                  const storeUrl =
                    endpointToStoreUrl.get(record.endpoint) ?? record.endpoint;

                  const structuredContent = record.result?.structuredContent;

                  if (record.ok === false || !structuredContent) {
                    emit({
                      kind: "store_error",
                      storeUrl,
                      message: record.error ?? "Store returned no catalog data",
                    });
                    continue;
                  }

                  emit({
                    kind: "store_result",
                    storeUrl,
                    result: structuredContent.products ?? null,
                  });
                }
                break;
              }
              case "get_product": {
                const output = "output" in event ? event.output : undefined;
                if (!output || typeof output !== "object") break;

                const record = output as {
                  store?: string;
                  id?: string;
                  ok?: boolean;
                  error?: string;
                  result?: {
                    structuredContent?: z.infer<
                      typeof getProductResponseSchema
                    >;
                  };
                };

                const store = record.store ?? "";
                const productId = record.id ?? "";
                const product = record.result?.structuredContent?.product;

                if (record.ok === false || !product) {
                  emit({
                    kind: "product_checked",
                    store,
                    productId,
                    ok: false,
                    error: record.error ?? "Store returned no product data",
                  });
                  break;
                }

                emit({
                  kind: "product_checked",
                  store,
                  productId,
                  ok: true,
                  title: product.title,
                });
                break;
              }
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
