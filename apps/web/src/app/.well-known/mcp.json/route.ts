import { NextResponse } from "next/server";
import { jsonHeaders, mcpServerCard } from "@/lib/agent-discovery";

/**
 * `/.well-known/mcp.json` — the path MCP scanners probe by convention.
 *
 * The same server card already served at `/.well-known/mcp/server-card.json`
 * (SEP-1649). Readiness audits looking only for the conventional filename
 * reported "MCP mentioned but no standard manifest endpoint found", so the
 * document is published under both names rather than moved.
 */
export const GET = () =>
  NextResponse.json(mcpServerCard, { headers: jsonHeaders });

export const OPTIONS = () => new NextResponse(null, { headers: jsonHeaders });
