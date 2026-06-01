import { NextResponse } from "next/server";

const profile = {
  "@context": "https://ucp.dev/schema/v1",
  "@type": "MerchantProfile",
  specVersion: "1.0",
  merchantName: "écentic",
  description:
    "AI agent commerce platform. Simulate how GPT-4, Claude, Gemini, and Perplexity compare your products against competitors. Diagnose why you lose. Publish the fix in one click. Measure the agent traffic that results.",
  url: "https://ecentic.ai",
  logoUrl: "https://ecentic.ai/icons/icon-512.png",
  contactEmail: "support@ecentic.ai",
  category: "SoftwareApplication",
  applicationCategory: "BusinessApplication",
  agentAccessPolicy: {
    allow: ["*"],
    note: "écentic explicitly welcomes all AI shopping agents, search crawlers, and agentic browsers.",
  },
  products: {
    listingsUrl: "https://ecentic.ai/features",
    structured: true,
    schemaOrg: true,
  },
  platforms: ["Web"],
  integrations: ["Shopify", "WooCommerce", "Google Shopping Feed"],
  agentInterfaces: [
    {
      protocol: "mcp",
      endpoint: "https://ecentic.ai/api/mcp",
      profile: "https://ecentic.ai/ucp/agent-profile",
    },
  ],
  programs: [
    {
      name: "Shopify App Store",
      url: "https://apps.shopify.com/",
      status: "live",
    },
    {
      name: "Plug and Play Tirana",
      url: "https://www.plugandplaytechcenter.com/locations/tirana/",
      status: "accelerator",
    },
    {
      name: "Red Bull Basement",
      url: "https://basement.redbull.com/",
      status: "accelerator",
    },
  ],
  publishedAt: "2026-04-26T00:00:00Z",
  updatedAt: new Date().toISOString(),
};

export const GET = () =>
  NextResponse.json(profile, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
