import type { JSONRPCRequest } from "@ai-sdk/mcp";
import * as Sentry from "@sentry/nextjs";
// import { UcpDiscoveryProfileSchema } from "@ucp-js/sdk";
import { merge, resultify } from "@zenncore/utils";
import {
  type InferUITools,
  isToolUIPart,
  type LanguageModel,
  tool,
  type UIMessage,
} from "ai";
import * as z from "zod";
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
export const AGENT_PROFILE = "https://ecentic.ai/ucp/agent-profile";

// Gemini 3 attaches a thoughtSignature to each reasoning/tool-call step that must
// be replayed verbatim on follow-up requests. Once tool calls are rebuilt across
// turns via convertToModelMessages and routed through the Vercel gateway, that
// signature gets corrupted → 400 "Corrupted thought signature". 2.5-flash emits no
// thought signatures and handles the UCP tool flow fine.
export const PLAYGROUND_MODEL = "google/gemini-3-flash" satisfies LanguageModel;

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
  The argument object has EXACTLY ONE top-level key — either cart_id OR checkout, never both.
  • A cart already exists (whenever you have a cart_id — this is the normal case): { cart_id: "<cart id from create_cart>" }
    Include ONLY cart_id. Do NOT add a "checkout" key — not even an empty {} or one with empty line_items. The business builds the checkout from the cart's line_items/buyer.
  • No cart exists (build from scratch — this is the path when the user asks to check out directly with a product and no cart_id exists): { checkout: { buyer: { email, first_name, last_name }, line_items: [{ item: { id: "<variant_id>" }, quantity: 1 }], currency: "USD", fulfillment: { methods: [...] } } }
    Include ONLY checkout (with a non-empty line_items). Do NOT add a "cart_id" key. Do NOT call create_cart first just to obtain a cart_id — call create_checkout directly with the checkout object.
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

// Debug-only context attached to Sentry reports so a schema mismatch can be
// traced back to the store endpoint and the specific tool that produced it.
// `store` is the merchant domain (set once per request on the Sentry scope by
// the route), so it is not threaded through here.
type UcpCallContext = {
  endpoint: string;
  tool: string;
  transport: "mcp" | "rest";
};

// The single user-facing message for any "the store sent something we can't
// parse" failure. The real Zod detail + raw payload go to Sentry only.
const GENERIC_UCP_PARSE_ERROR =
  "The store returned a response we couldn't process.";

// Tools RETURN this instead of throwing on failure. Throwing from a tool's
// `execute` makes the AI SDK's Sentry integration auto-capture an unhandled
// exception (mechanism auto.vercelai.channel) on every failed call — pure noise
// that duplicates our own reportUcpSchemaMismatch. Returning an error result
// keeps it a normal tool output: no unhandled capture, and the model sees the
// error and can respond instead of blindly retrying.
type UcpToolError = { error: string };

// Report a schema mismatch to Sentry with the prettified Zod issues, the raw
// payload, and the store/tool context — for debugging only, never the UI.
// A bare `.parse()`/`prettifyError` yields just "✖ Invalid input" with no path
// or payload, which is what kept surfacing with no way to see the real cause.
const reportUcpSchemaMismatch = (
  summary: string,
  error: z.ZodError,
  context: UcpCallContext,
): void => {
  Sentry.captureException(
    new Error(
      `${summary}:\n${z.prettifyError(error)}\nValidation tree: ${JSON.stringify(
        z.treeifyError(error),
      )}`,
    ),
    {
      tags: { ucp_tool: context.tool, ucp_transport: context.transport },
      contexts: {
        ucp_tool: {
          tool: context.tool,
          endpoint: context.endpoint,
          transport: context.transport,
        },
      },
    },
  );
};

const parseUcpToolContent = <T>(
  structuredContent: Record<string, unknown>,
  successSchema: z.ZodType<T>,
  context: UcpCallContext,
): T | UcpToolError => {
  // A UCP-level error (out of stock, rate limit, etc.) is a legitimate result
  // the model should see and act on — return it, don't throw.
  const ucpError = extractUcpToolError(structuredContent);

  if (ucpError) return { error: ucpError };

  const parsed = successSchema.safeParse(structuredContent);

  if (!parsed.success) {
    reportUcpSchemaMismatch(
      "UCP tool result did not match the expected schema",
      parsed.error,
      context,
    );

    return { error: GENERIC_UCP_PARSE_ERROR };
  }

  return parsed.data;
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

// MCP signals a tool execution error as result.isError === true with the message
// in result.content[].text and no structuredContent — so it matches neither branch
// of ucpMCPResponseSchema. Pull that text out before the envelope parse.
const mcpToolErrorSchema = z.object({
  result: z.looseObject({
    isError: z.literal(true),
    content: z.array(z.looseObject({ text: z.string().optional() })).optional(),
  }),
});

const extractMcpToolError = (data: unknown): string | null => {
  const parsed = mcpToolErrorSchema.safeParse(data);

  if (!parsed.success) return null;

  const text = (parsed.data.result.content ?? [])
    .map((item) => item.text)
    .filter((value): value is string => Boolean(value))
    .join("; ");

  return text || "Tool call failed";
};

// UCP error envelope shared by REST error bodies and JSON-RPC error.data:
// { code, content, continue_url, retry_after }. Builds the best human message.
const ucpErrorEnvelopeSchema = z.looseObject({
  code: z.string().optional(),
  content: z.string().optional(),
  retry_after: z.number().optional(),
});

const formatUcpErrorEnvelope = (
  envelope: unknown,
  fallback: string,
): string => {
  const parsed = ucpErrorEnvelopeSchema.safeParse(envelope);

  if (!parsed.success) return fallback;

  const { code, content, retry_after } = parsed.data;
  const prefix = code ? `[${code}] ` : "";
  const retry =
    retry_after === undefined ? "" : ` — retry after ${retry_after}s`;

  return `${prefix}${content ?? fallback}${retry}`;
};

// Non-2xx REST responses: 424/422 carry a UCP error body; 429/401 may be header-only.
const formatRestHttpError = (response: Response, body: unknown): string => {
  const parsed = ucpErrorEnvelopeSchema.safeParse(body);
  const envelope = parsed.success ? parsed.data : {};
  const { status } = response;

  if (status === 401) return envelope.content ?? "Unauthorized";

  if (status === 429) {
    const retryAfter = response.headers.get("retry-after");
    return (
      envelope.content ??
      `Rate limit exceeded${retryAfter ? ` — retry after ${retryAfter}s` : ""}`
    );
  }

  const prefix = envelope.code ? `[${envelope.code}] ` : "";
  return `${prefix}${envelope.content ?? `Request failed (HTTP ${status})`}`;
};

const callMCP = async (
  endpoint: string,
  toolName: string,
  args: Record<string, unknown>,
  agentProfileUrl: string,
) => {
  // Carry the endpoint + tool alongside the payload so the parse layer can
  // attach them to Sentry without threading extra args through every tool.
  const context: UcpCallContext = {
    endpoint,
    tool: toolName,
    transport: "mcp",
  };
  const wrap = <D>(data: D) => ({ data, context });

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

  if (!response.success)
    return wrap({ error: { message: "Tool call failed" } });

  const dataResult = await resultify(() => response.data.json());

  if (!dataResult.success) {
    return wrap({ error: { message: "Tool call response is not valid JSON" } });
  }

  const mcpToolError = extractMcpToolError(dataResult.data);

  if (mcpToolError) return wrap({ error: { message: mcpToolError } });

  const body = ucpMCPResponseSchema.safeParse(dataResult.data);

  if (!body.success) {
    // The store's JSON-RPC envelope didn't match ucpMCPResponseSchema. Previously
    // this returned `prettifyError(body.error)` — just "✖ Invalid input" — which
    // parseMcpToolResult then threw and the AI SDK reported to Sentry with no
    // detail. Send the full mismatch + raw envelope to Sentry, surface generic.
    reportUcpSchemaMismatch(
      "UCP MCP envelope did not match the expected schema",
      body.error,
      context,
    );
    return wrap({ error: { message: GENERIC_UCP_PARSE_ERROR } });
  }

  if ("error" in body.data) {
    const { error } = body.data;
    // Prefer the richer error.data.content / retry_after over the terse message.
    return wrap({
      error: { message: formatUcpErrorEnvelope(error.data, error.message) },
    });
  }

  return wrap(body.data.result);
};

const parseMcpToolResult = <T>(
  result: {
    data:
      | { structuredContent: Record<string, unknown> }
      | { error: { message: string } };
    context: UcpCallContext;
  },
  successSchema: z.ZodType<T>,
): T | UcpToolError => {
  const { data, context } = result;

  if ("error" in data) {
    return { error: data.error.message };
  }

  return parseUcpToolContent(data.structuredContent, successSchema, context);
};

const callRest = async (
  baseEndpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  agentProfileUrl: string,
  body?: unknown,
): Promise<{ data: unknown; context: UcpCallContext }> => {
  const url = `${baseEndpoint.replace(/\/+$/, "")}${path}`;
  // REST has no MCP-style tool name; label the call by its HTTP operation so
  // Sentry still shows which endpoint/path produced a schema mismatch.
  const context: UcpCallContext = {
    endpoint: baseEndpoint,
    tool: `${method} ${path}`,
    transport: "rest",
  };
  const wrap = <D>(data: D) => ({ data, context });

  const response = await resultify(() =>
    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "UCP-Agent": `profile="${agentProfileUrl}"`,
        "User-Agent": "UCP-Playground/1.0 (ecentic; https://ecentic.ai)",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    }),
  );

  if (!response.success) return wrap({ error: "Network request failed" });

  const textResult = await resultify(() => response.data.text());
  const rawBody = textResult.success ? textResult.data : "";

  const responseBody = ((): unknown => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return undefined;
    }
  })();

  // Protocol/transport errors are signalled by the HTTP status (424 discovery
  // failure, 422 version unsupported, 429 rate limit, 401 unauthorized). The body
  // is optional, so format from status + headers + whatever UCP error body exists.
  if (!response.data.ok) {
    return wrap({ error: formatRestHttpError(response.data, responseBody) });
  }

  if (!textResult.success)
    return wrap({ error: "Could not read response body" });

  if (responseBody === undefined) {
    return wrap({ error: "Response is not valid JSON", raw: rawBody });
  }

  return wrap(responseBody);
};

const parseRestToolResult = <T>(
  result: { data: unknown; context: UcpCallContext },
  successSchema: z.ZodType<T>,
): T | UcpToolError => {
  const { data, context } = result;

  if (data === null || typeof data !== "object") {
    return { error: "Invalid response" };
  }

  const obj = data as Record<string, unknown>;
  const { error } = obj;

  if ("error" in obj && typeof error === "string") {
    return { error };
  }

  return parseUcpToolContent(obj, successSchema, context);
};

// Checkout argument shapes (create/update/complete) live in ./utils — shared with
// the flow-tester, consumed below as Utils.*

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
      console.log("create_cart input", input);
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
      console.log("update_cart input", input);
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
    inputSchema: Utils.createCheckoutMcpInputSchema,
    execute: async (input) => {
      console.log("create_checkout input", input);
      const result = await callMCP(
        endpoint,
        "create_checkout",
        Utils.normalizeCreateCheckoutArgs(input),
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
    inputSchema: Utils.createCheckoutMcpInputSchema,
    execute: async (input) => {
      const result = await callRest(
        endpoint,
        "POST",
        "/checkouts",
        agentProfileUrl,
        Utils.normalizeCreateCheckoutArgs(input),
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
- When the user wants to check out (e.g. "checkout with the X", "buy X now", "check out with that product"), go straight to create_checkout — do NOT call create_cart first. If a cart already exists for what they want, pass its cart_id. Otherwise build the checkout from scratch by passing the checkout object with line_items (the variant id + quantity). Only call create_cart when the user explicitly asks to add something to a cart or to build/view a cart.
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
