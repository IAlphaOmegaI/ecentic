import { NextResponse } from "next/server";
import { acpDiscoveryDocument, jsonHeaders } from "@/lib/agent-discovery";
import { seo } from "@/lib/seo";

/**
 * ACP API base descriptor. Session endpoints (`/checkout_sessions`, etc.)
 * are negotiated after agents read `/.well-known/acp.json`.
 */
export const GET = () =>
  NextResponse.json(
    {
      ...acpDiscoveryDocument,
      discovery: `${seo.host}/.well-known/acp.json`,
      mcp: `${seo.host}/api/mcp`,
      note: "Create checkout sessions via authenticated MCP create_checkout or future REST /checkout_sessions once enabled for your merchant.",
    },
    { headers: jsonHeaders },
  );

export const OPTIONS = () => new NextResponse(null, { headers: jsonHeaders });
