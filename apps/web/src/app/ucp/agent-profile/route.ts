import { NextResponse } from "next/server";
import { jsonHeaders, ucpDiscoveryProfile } from "@/lib/agent-discovery";

/**
 * Agent-facing UCP profile (same commerce surface as `/.well-known/ucp`).
 */
export const GET = () =>
  NextResponse.json(ucpDiscoveryProfile, { headers: jsonHeaders });

export const OPTIONS = () => new NextResponse(null, { headers: jsonHeaders });
