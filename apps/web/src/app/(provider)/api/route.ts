import { withX402 } from "@x402/next";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { agentDiscovery, jsonHeaders } from "@/lib/agent-discovery";
import { seo } from "@/lib/seo";
import { x402AgentApiRoute, x402Server } from "@/lib/x402";

const paymentCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, PAYMENT-SIGNATURE, X-PAYMENT",
  "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
} as const;

/**
 * Paid agent API root. Unpaid requests get HTTP 402 with x402 payment
 * requirements (`PAYMENT-REQUIRED`); valid payment proof unlocks the catalog.
 * @see https://x402.org
 * @see https://docs.x402.org
 */
const handler = async (_request: NextRequest) =>
  NextResponse.json(
    {
      name: seo.name,
      description:
        "Agent-facing ecentic surfaces. This root is gated by x402; free discovery lives under /.well-known and /openapi.json.",
      discovery: {
        openapi: `${seo.host}/openapi.json`,
        apiCatalog: `${seo.host}/.well-known/api-catalog`,
        mcp: `${seo.host}/api/mcp`,
        ucp: `${seo.host}/.well-known/ucp`,
        acp: `${seo.host}/.well-known/acp.json`,
        llms: `${seo.host}/llms.txt`,
        health: `${seo.host}/api/health`,
      },
    },
    {
      headers: {
        ...jsonHeaders,
        ...paymentCors,
        "Cache-Control": "no-store",
      },
    },
  );

export const GET = withX402(handler, x402AgentApiRoute(), x402Server);

export const OPTIONS = () =>
  new NextResponse(null, {
    headers: {
      ...agentDiscovery.cors,
      ...paymentCors,
    },
  });
