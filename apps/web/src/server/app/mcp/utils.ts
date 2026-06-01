"use server";

import { z } from "zod";

const empty = z.object({}).strict();

export const Utils = {
  protocol: {
    version: "2025-03-26",
    server: { name: "ecentic-mcp", version: "0.2.0" },
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
            description: "Shop domain, with or without .myshopify.com.",
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
