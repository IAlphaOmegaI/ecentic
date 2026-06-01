import { NextResponse } from "next/server";

const agentProfile = {
  ucp: {
    version: "2026-04-08",
    services: {
      "dev.ucp.shopping": [
        {
          version: "2026-04-08",
          spec: "https://ucp.dev/2026-04-08/specification/overview",
          transport: "rest",
          schema:
            "https://ucp.dev/2026-04-08/services/shopping/rest.openapi.json",
          endpoint: "https://ecentic.ai/ucp",
        },
        {
          version: "2026-04-08",
          spec: "https://modelcontextprotocol.io/specification/2025-03-26",
          transport: "mcp",
          endpoint: "https://ecentic.ai/api/mcp",
        },
      ],
    },
    capabilities: {
      "dev.ucp.shopping.checkout": [{ version: "2026-04-08" }],
      "dev.ucp.shopping.fulfillment": [
        {
          version: "2026-04-08",
          extends: ["dev.ucp.shopping.checkout", "dev.ucp.shopping.cart"],
        },
      ],
      "dev.ucp.shopping.buyer_consent": [
        {
          version: "2026-04-08",
          extends: "dev.ucp.shopping.checkout",
        },
      ],
      "dev.ucp.shopping.discount": [
        {
          version: "2026-04-08",
          extends: ["dev.ucp.shopping.checkout", "dev.ucp.shopping.cart"],
        },
      ],
      "dev.ucp.shopping.cart": [
        {
          version: "2026-04-08",
          spec: "https://ucp.dev/2026-04-08/specification/cart",
          schema: "https://ucp.dev/2026-04-08/schemas/shopping/cart.json",
        },
      ],
      "dev.ucp.shopping.order": [
        {
          version: "2026-04-08",
          spec: "https://ucp.dev/2026-04-08/specification/order",
          schema: "https://ucp.dev/2026-04-08/schemas/shopping/order.json",
        },
      ],
      "dev.ucp.shopping.catalog.search": [
        {
          version: "2026-04-08",
          spec: "https://ucp.dev/2026-04-08/specification/catalog/search",
          schema:
            "https://ucp.dev/2026-04-08/schemas/shopping/catalog_search.json",
        },
      ],
      "dev.ucp.shopping.catalog.lookup": [
        {
          version: "2026-04-08",
          spec: "https://ucp.dev/2026-04-08/specification/catalog/lookup",
          schema:
            "https://ucp.dev/2026-04-08/schemas/shopping/catalog_lookup.json",
        },
      ],
      "dev.shopify.catalog": [
        {
          version: "2026-04-08",
          spec: "https://shopify.dev/docs/agents/catalog/storefront-catalog",
          schema:
            "https://shopify.dev/ucp/schemas/2026-04-08/shopify_catalog.json",
          extends: [
            "dev.ucp.shopping.catalog.lookup",
            "dev.ucp.shopping.catalog.search",
          ],
        },
      ],
      "dev.shopify.catalog.global": [
        {
          version: "2026-04-08",
          spec: "https://shopify.dev/docs/agents/catalog/global-catalog",
          schema:
            "https://shopify.dev/ucp/schemas/2026-04-08/shopify_catalog_global.json",
          extends: [
            "dev.ucp.shopping.catalog.lookup",
            "dev.ucp.shopping.catalog.search",
          ],
        },
      ],
    },
    payment_handlers: {},
  },
};

export const GET = async () => {
  return NextResponse.json(agentProfile, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control":
        "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
