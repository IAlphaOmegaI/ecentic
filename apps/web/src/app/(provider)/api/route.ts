import { NextResponse } from "next/server";
import {
  agentDiscovery,
  resolveX402PayTo,
  x402PaymentRequired,
} from "@/lib/agent-discovery";

/**
 * Agent API root — returns HTTP 402 with an x402 payment requirements body
 * so agents can discover payable access without a prior session.
 * @see https://x402.org
 */
export const GET = () => {
  const body = x402PaymentRequired(resolveX402PayTo());

  return NextResponse.json(body, {
    status: 402,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, PAYMENT-SIGNATURE, X-PAYMENT",
      "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
    },
  });
};

export const OPTIONS = () =>
  new NextResponse(null, {
    headers: {
      ...agentDiscovery.cors,
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, PAYMENT-SIGNATURE, X-PAYMENT",
      "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
    },
  });
