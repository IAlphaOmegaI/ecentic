import { NextResponse } from "next/server";
import { jsonHeaders, mcpServerCard } from "@/lib/agent-discovery";

export const GET = () =>
  NextResponse.json(mcpServerCard, { headers: jsonHeaders });

export const OPTIONS = () => new NextResponse(null, { headers: jsonHeaders });
