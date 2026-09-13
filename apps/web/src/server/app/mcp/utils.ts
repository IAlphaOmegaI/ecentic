import { z } from "zod";

const empty = z.object({}).strict();

export const Utils = {
  protocol: {
    version: "2025-03-26",
    /**
     * Versions this server will echo back on `initialize`. `2025-06-18` dropped
     * JSON-RPC batching; accepting a batch from a client on that version is
     * harmless because it never sends one, so one dispatcher serves both.
     */
    supportedVersions: ["2025-06-18", "2025-03-26", "2024-11-05"],
    server: { name: "ecentic-mcp", version: "0.2.0" },
    instructions:
      "ecentic measures and improves how AI shopping agents rank a merchant's products against competitors. Use these tools to read the public plan catalog, connect a Shopify, WooCommerce, or product-feed store, mint an agent API key, and read onboarding status. `list_plans` needs no credential; everything touching a merchant account needs `Authorization: Bearer ecentic_sk_...`. Full guidance: https://ecentic.ai/.well-known/agent-instructions.md",
  },
  schema: {
    empty,
    createApiKey: z
      .object({
        name: z.string().min(1),
      })
      .strict(),
    createCheckout: z
      .object({
        plan: z.enum(["compete", "dominate"]),
      })
      .strict(),
    connectShopify: z
      .object({
        shop: z.string().min(1),
      })
      .strict(),
    connectWooCommerce: z
      .object({
        domain: z.string().min(1),
        consumerKey: z.string().min(1),
        consumerSecret: z.string().min(1),
      })
      .strict(),
    connectFeed: z
      .object({
        feedUrl: z.string().url(),
      })
      .strict(),
  },
  tools: [
    {
      name: "list_plans",
      description:
        "List available ecentic plans and Stripe price availability.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "create_api_key",
      description:
        "Create a long-lived API key for MCP agent authentication (bearer token).",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Human-readable key label." },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
    {
      name: "create_checkout",
      description:
        "Create a Stripe checkout session for the authenticated ecentic user.",
      inputSchema: {
        type: "object",
        properties: {
          plan: {
            type: "string",
            enum: ["compete", "dominate"],
            description: "Plan key to purchase.",
          },
        },
        required: ["plan"],
        additionalProperties: false,
      },
    },
    {
      name: "connect_shopify",
      description:
        "Get Shopify OAuth authorization URL for store onboarding in ecentic.",
      inputSchema: {
        type: "object",
        properties: {
          shop: {
            type: "string",
            description:
              "Shop domain: custom storefront URL, store handle, or *.myshopify.com.",
          },
        },
        required: ["shop"],
        additionalProperties: false,
      },
    },
    {
      name: "connect_woocommerce",
      description: "Connect a WooCommerce store with REST API credentials.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string" },
          consumerKey: { type: "string" },
          consumerSecret: { type: "string" },
        },
        required: ["domain", "consumerKey", "consumerSecret"],
        additionalProperties: false,
      },
    },
    {
      name: "connect_feed",
      description: "Connect a product feed URL and create a feed-backed store.",
      inputSchema: {
        type: "object",
        properties: {
          feedUrl: { type: "string", format: "uri" },
        },
        required: ["feedUrl"],
        additionalProperties: false,
      },
    },
    {
      name: "get_onboarding_status",
      description:
        "Return current user subscription and connected store summary for onboarding progress.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  ] as const,
};
