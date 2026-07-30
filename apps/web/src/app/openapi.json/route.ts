import { NextResponse } from "next/server";
import { jsonHeaders, openApiDocument } from "@/lib/agent-discovery";

/**
 * Root OpenAPI document with MPP `x-payment-info` payment discovery.
 * @see https://paymentauth.org/draft-payment-discovery-00.txt
 */
export const GET = () =>
  NextResponse.json(openApiDocument, { headers: jsonHeaders });

export const OPTIONS = () => new NextResponse(null, { headers: jsonHeaders });
