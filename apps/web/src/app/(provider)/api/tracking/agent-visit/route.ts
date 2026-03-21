import { resultify } from "@zenncore/utils";
import type { NextRequest } from "next/server";
import * as Tracking from "@/server/app/tracking";
import { Environment } from "@/server/utils/environment";

export const dynamic = "force-dynamic";

const corsHeaders = (allowOrigin: string | null): Record<string, string> => ({
  "Access-Control-Allow-Origin": allowOrigin ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

export const OPTIONS = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin && origin !== "null" ? origin : "*"),
  });
};

export const POST = async (request: NextRequest) => {
  const requestOrigin = request.headers.get("origin");
  const allowCorsOrigin =
    requestOrigin && requestOrigin !== "null" ? requestOrigin : null;

  const noContent = (headers?: Record<string, string>) =>
    new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(allowCorsOrigin),
        ...headers,
      },
    });

  const apiKey =
    request.headers.get("authorization")?.replace("Bearer ", "") ?? null;

  const body = await resultify(() => request.json() as Promise<unknown>);
  if (!body.success) return noContent();

  const parsed = await Tracking.parse(Environment.SERVER, {
    payload: body.data,
  });

  if (!parsed.success) return noContent();

  const result = await Tracking.recordAgentVisit(Environment.SERVER, {
    payload: parsed.data,
    apiKey,
    origin: requestOrigin,
  });

  if (!result.success) return noContent();

  return noContent();
};
