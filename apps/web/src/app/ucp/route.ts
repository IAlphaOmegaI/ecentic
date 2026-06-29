import { NextResponse } from "next/server";

const methodNotImplemented = (method: string) =>
  NextResponse.json(
    {
      error: "not_implemented",
      message: `${method} is not implemented yet for the ecentic UCP REST service.`,
      docs: "/ucp/agent-profile",
      expectedEndpoints: [
        "/ucp/catalog/search",
        "/ucp/catalog/product",
        "/ucp/carts",
        "/ucp/carts/{id}",
      ],
    },
    { status: 501 },
  );

export const GET = () => {
  return NextResponse.json(
    {
      service: "dev.ucp.shopping",
      version: "2026-04-08",
      transport: "rest",
      endpoint: "https://ecentic.ai/ucp",
      status: "placeholder",
      note: "ecentic UCP REST root route is available.",
      docs: "https://ecentic.ai/ucp/agent-profile",
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
};

export const POST = () => methodNotImplemented("POST");
export const PUT = () => methodNotImplemented("PUT");
