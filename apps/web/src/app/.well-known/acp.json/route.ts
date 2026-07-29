import { NextResponse } from "next/server";
import { acpDiscoveryDocument, jsonHeaders } from "@/lib/agent-discovery";

/**
 * Agentic Commerce Protocol discovery document.
 * @see https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.discovery.md
 */
export const GET = () =>
  NextResponse.json(acpDiscoveryDocument, { headers: jsonHeaders });

export const OPTIONS = () => new NextResponse(null, { headers: jsonHeaders });
