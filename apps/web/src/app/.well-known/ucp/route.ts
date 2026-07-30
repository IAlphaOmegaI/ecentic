import { NextResponse } from "next/server";
import { jsonHeaders, ucpDiscoveryProfile } from "@/lib/agent-discovery";

/**
 * Universal Commerce Protocol business discovery profile.
 * @see https://ucp.dev/specification/overview/
 */
export const GET = () =>
  NextResponse.json(ucpDiscoveryProfile, { headers: jsonHeaders });

export const OPTIONS = () => new NextResponse(null, { headers: jsonHeaders });
